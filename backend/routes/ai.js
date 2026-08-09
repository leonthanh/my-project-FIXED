const crypto = require("crypto");
const express = require("express");
require("dotenv").config();

const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.use(requireAuth, requireRole("teacher", "admin"));

const feedbackCache = new Map();
const inFlightRequests = new Map();
const SUCCESS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCacheKey(task1, task2) {
  return crypto
    .createHash("sha256")
    .update(`${stripHtml(task1)}\n---\n${stripHtml(task2)}`)
    .digest("hex");
}

function getCachedFeedback(cacheKey) {
  const cached = feedbackCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    feedbackCache.delete(cacheKey);
    return null;
  }

  return cached;
}

function setCachedFeedback(cacheKey, payload, ttlMs) {
  feedbackCache.set(cacheKey, {
    ...payload,
    expiresAt: Date.now() + ttlMs,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUpstreamError(detailText = "") {
  try {
    return JSON.parse(detailText);
  } catch {
    return null;
  }
}

function isOpenAiQuotaExhausted(result = {}) {
  if (result?.status !== 429) return false;

  const parsed = parseUpstreamError(result?.detail || "");
  const code = String(parsed?.error?.code || "").toLowerCase();
  const type = String(parsed?.error?.type || "").toLowerCase();
  const message = String(parsed?.error?.message || "").toLowerCase();

  return (
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    type === "insufficient_quota" ||
    message.includes("no credits remaining") ||
    message.includes("insufficient_quota")
  );
}

function isOpenAiScopePermissionError(result = {}) {
  if (result?.status !== 401 && result?.status !== 403) return false;

  const parsed = parseUpstreamError(result?.detail || "");
  const message = String(parsed?.error?.message || result?.detail || "").toLowerCase();

  return message.includes("missing scopes") || message.includes("api.responses.write");
}

function getCacheTtlMsForResult(result = {}) {
  return result?.ok ? SUCCESS_CACHE_TTL_MS : 0;
}

function buildOpenAiFallbackWarning(openAiResult, language = "vi") {
  if (!process.env.OPENAI_API_KEY) {
    return language === "en"
      ? "OpenAI is not configured on the server."
      : "OpenAI chưa được cấu hình trên server.";
  }

  if (isOpenAiScopePermissionError(openAiResult)) {
    return language === "en"
      ? "OpenAI key is missing required scope api.responses.write. Update key/project permissions, then retry."
      : "OpenAI key đang thiếu quyền api.responses.write. Vui lòng cấp quyền cho key/project rồi thử lại.";
  }

  if (isOpenAiQuotaExhausted(openAiResult)) {
    return language === "en"
      ? "OpenAI credit/quota is exhausted."
      : "OpenAI đang hết credit/quota.";
  }

  if (openAiResult?.status) {
    return language === "en"
      ? `OpenAI is currently unavailable (status ${openAiResult.status}).`
      : `OpenAI tạm thời chưa sẵn sàng (status ${openAiResult.status}).`;
  }

  return language === "en"
    ? "OpenAI is currently unavailable."
    : "OpenAI tạm thời chưa sẵn sàng.";
}

function buildOpenAiFailureResult(openAiResult, language = "vi") {
  const message = buildOpenAiFallbackWarning(openAiResult, language);
  const status = Number(openAiResult?.status || 0);

  const normalizedStatus = status
    ? status
    : isOpenAiScopePermissionError(openAiResult)
    ? 403
    : isOpenAiQuotaExhausted(openAiResult)
    ? 429
    : 503;

  return {
    ok: false,
    status: normalizedStatus,
    error: message,
    message,
    detail: openAiResult?.detail || null,
    source: "openai",
    fallback: false,
    upstreamStatus: openAiResult?.status || null,
    upstreamDetail: openAiResult?.detail || null,
    upstreamProvider: process.env.OPENAI_API_KEY ? "openai" : null,
  };
}

function shouldRetryOpenAI(status, detailText = "") {
  if (status >= 500) return true;
  if (status !== 429) return false;

  const parsed = parseUpstreamError(detailText);
  const code = String(parsed?.error?.code || "").toLowerCase();
  const type = String(parsed?.error?.type || "").toLowerCase();

  if (
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    type === "insufficient_quota"
  ) {
    return false;
  }

  return true;
}

function extractOpenAiSuggestion(payload = {}) {
  const directOutputText =
    typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
  if (directOutputText) return directOutputText;

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const suggestionFromOutput = outputItems
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((item) =>
      typeof item?.text === "string"
        ? item.text.trim()
        : typeof item?.output_text === "string"
        ? item.output_text.trim()
        : ""
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (suggestionFromOutput) return suggestionFromOutput;

  // Backward-safe extraction for chat-completions-like payloads.
  return String(payload?.choices?.[0]?.message?.content || "").trim();
}

function getUpstreamRateLimitSource(result = {}) {
  return result?.upstreamStatus === 429 && result?.upstreamProvider
    ? `upstream:${result.upstreamProvider}`
    : null;
}

function buildPrompt(task1, task2) {
  return `Bạn là giáo viên IELTS Writing. Hãy chấm NGẮN GỌN bằng tiếng Việt theo tiêu chí IDP IELTS.

Task 1:
${task1}

Task 2:
${task2}

Yêu cầu bắt buộc:
- Rất ngắn gọn, thực dụng, không giải thích dài.
- Mỗi task chỉ 2 dòng:
  1) Band 4 tiêu chí theo mẫu TA/CC/LR/GRA: x.x/x.x/x.x/x.x
  2) Nhận xét tối đa 20 từ.
- LỖI CHÍNH: tối đa 3 gạch đầu dòng, mỗi dòng tối đa 12 từ.
- GỢI Ý: tối đa 3 gạch đầu dòng, mỗi dòng tối đa 12 từ.
- OVERALL: 1 dòng duy nhất (Overall: x.x).
- Toàn bộ phản hồi tối đa 140 từ.

Định dạng bắt buộc:
TASK 1
Band:
Nhận xét:
TASK 2
Band:
Nhận xét:
LỖI CHÍNH
GỢI Ý CẢI THIỆN
OVERALL`;
}

async function callOpenAIWithRetry(prompt) {
  const retries = [
    { attempt: 1, delayMs: 0 },
    { attempt: 2, delayMs: 1200 },
    { attempt: 3, delayMs: 2500 },
  ];
  const model = process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini";

  let lastFailure = null;

  for (const { attempt, delayMs } of retries) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          instructions: "Bạn là giáo viên IELTS Writing chuyên nghiệp.",
          input: prompt,
          max_output_tokens: 420,
          store: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const suggestion = extractOpenAiSuggestion(data);

        if (!suggestion) {
          throw new Error("OpenAI returned an empty suggestion");
        }

        return { ok: true, suggestion };
      }

      const detailText = await response.text();
      const retryable = shouldRetryOpenAI(response.status, detailText);
      lastFailure = {
        status: response.status,
        detail: detailText,
        retryable,
      };

      console.error(
        `[AI feedback] OpenAI attempt ${attempt} failed with ${response.status}: ${detailText}`
      );

      if (!retryable) {
        break;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      lastFailure = {
        status: 500,
        detail: error?.message || String(error),
        retryable: true,
      };

      console.error(
        `[AI feedback] OpenAI attempt ${attempt} threw:`,
        error?.message || error
      );
    }
  }

  return { ok: false, ...lastFailure };
}

async function checkOpenAiHealth() {
  const model = process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini";
  const apiKey = process.env.OPENAI_API_KEY;
  const startedAt = Date.now();

  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      status: null,
      reason: "missing_openai_api_key",
      message: "OPENAI_API_KEY is missing on server.",
      latencyMs: Date.now() - startedAt,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: "Health check: reply with OK.",
        max_output_tokens: 24,
        store: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const payload = await response.json();
      const text = extractOpenAiSuggestion(payload);
      return {
        ok: true,
        configured: true,
        status: response.status,
        reason: null,
        message: text || "OK",
        latencyMs: Date.now() - startedAt,
      };
    }

    const detailText = await response.text();
    const failure = { status: response.status, detail: detailText };

    let reason = "openai_error";
    if (isOpenAiScopePermissionError(failure)) {
      reason = "missing_scope_api.responses.write";
    } else if (isOpenAiQuotaExhausted(failure)) {
      reason = "quota_exhausted";
    } else if (response.status === 401 || response.status === 403) {
      reason = "auth_or_permission_error";
    }

    return {
      ok: false,
      configured: true,
      status: response.status,
      reason,
      message: buildOpenAiFallbackWarning(failure, "en"),
      detail: detailText.slice(0, 600),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout = error?.name === "AbortError";
    return {
      ok: false,
      configured: true,
      status: isTimeout ? 504 : 500,
      reason: isTimeout ? "timeout" : "network_error",
      message: isTimeout
        ? "OpenAI health check timed out."
        : "OpenAI health check failed.",
      detail: error?.message || String(error),
      latencyMs: Date.now() - startedAt,
    };
  }
}

async function generateFeedback(task1, task2) {
  const prompt = buildPrompt(task1, task2);

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  let openAiResult = null;

  if (!hasOpenAi) {
    return buildOpenAiFailureResult(null, "vi");
  }

  openAiResult = await callOpenAIWithRetry(prompt);

  if (openAiResult?.ok) {
    return {
      ok: true,
      suggestion: openAiResult.suggestion,
      source: "openai",
      fallback: false,
    };
  }

  return buildOpenAiFailureResult(openAiResult, "vi");
}

function normalizeCambridgeResponses(responses = []) {
  if (!Array.isArray(responses)) return [];

  return responses
    .map((item, index) => ({
      label:
        typeof item?.label === "string" && item.label.trim()
          ? item.label.trim()
          : `Response ${index + 1}`,
      prompt:
        typeof item?.prompt === "string" && item.prompt.trim()
          ? item.prompt.trim()
          : "",
      answer:
        typeof item?.answer === "string" && item.answer.trim()
          ? item.answer.trim()
          : "",
      questionType:
        typeof item?.questionType === "string" && item.questionType.trim()
          ? item.questionType.trim()
          : "",
    }))
    .filter((item) => item.answer);
}

function buildCambridgePrompt({
  studentName = "",
  testType = "",
  classCode = "",
  responses = [],
}) {
  const responseText = responses
    .map(
      (item) =>
        `${item.label}
Question type: ${item.questionType || "manual review"}
Prompt: ${item.prompt || "No prompt provided"}
Student answer:
${item.answer}`
    )
    .join("\n\n");

  return `You are an experienced Cambridge English teacher helping another teacher review short written responses.

Submission details:
- Student: ${studentName || "Unknown"}
- Test type: ${testType || "Cambridge"}
- Class code: ${classCode || "N/A"}

Responses to review:
${responseText}

Write the feedback in English.
- Start with a short overall impression.
- Then give 3 to 5 concrete improvement points.
- Mention grammar, vocabulary, and task completion where relevant.
- End with a short teacher-ready comment that can be sent to the student.
- Keep the tone supportive and practical.`;
}

async function generateCambridgeFeedback({
  studentName = "",
  testType = "",
  classCode = "",
  responses = [],
}) {
  const normalizedResponses = normalizeCambridgeResponses(responses);

  if (!normalizedResponses.length) {
    return {
      ok: false,
      status: 400,
      error: "Missing Cambridge open-ended responses.",
      message: "Missing Cambridge open-ended responses.",
      detail: null,
      source: "openai",
      fallback: false,
      upstreamStatus: null,
      upstreamDetail: null,
      upstreamProvider: null,
    };
  }

  const prompt = buildCambridgePrompt({
    studentName,
    testType,
    classCode,
    responses: normalizedResponses,
  });

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  let openAiResult = null;

  if (!hasOpenAi) {
    return buildOpenAiFailureResult(null, "en");
  }

  openAiResult = await callOpenAIWithRetry(prompt);

  if (openAiResult?.ok) {
    return {
      ok: true,
      suggestion: openAiResult.suggestion,
      source: "openai",
      fallback: false,
    };
  }

  return buildOpenAiFailureResult(openAiResult, "en");
}

router.post("/generate-feedback", async (req, res) => {
  const { task1, task2 } = req.body || {};

  if (!task1 || !task2) {
    return res.status(400).json({
      error: "Thiếu nội dung Task 1 hoặc Task 2.",
    });
  }

  const cacheKey = buildCacheKey(task1, task2);
  const cached = getCachedFeedback(cacheKey);
  if (cached && cached?.ok && cached?.suggestion) {
    return res.json({
      suggestion: cached.suggestion,
      source: cached.source,
      warning: cached.warning || null,
      fallback: Boolean(cached.fallback),
      upstreamStatus: cached.upstreamStatus || null,
      upstreamDetail: cached.upstreamDetail || null,
      upstreamProvider: cached.upstreamProvider || null,
      rateLimitSource: getUpstreamRateLimitSource(cached),
      cached: true,
    });
  } else if (cached) {
    feedbackCache.delete(cacheKey);
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const sharedResult = await inFlightRequests.get(cacheKey);
      if (!sharedResult?.ok) {
        return res.status(sharedResult?.status || 503).json({
          error: sharedResult?.error || sharedResult?.message || "OpenAI is unavailable.",
          message: sharedResult?.message || sharedResult?.error || "OpenAI is unavailable.",
          detail: sharedResult?.detail || null,
          source: sharedResult?.source || "openai",
          fallback: false,
          upstreamStatus: sharedResult?.upstreamStatus || null,
          upstreamDetail: sharedResult?.upstreamDetail || null,
          upstreamProvider: sharedResult?.upstreamProvider || null,
          rateLimitSource: getUpstreamRateLimitSource(sharedResult),
          cached: false,
          shared: true,
        });
      }

      return res.json({
        suggestion: sharedResult.suggestion,
        source: sharedResult.source,
        warning: sharedResult.warning || null,
        fallback: Boolean(sharedResult.fallback),
        upstreamStatus: sharedResult.upstreamStatus || null,
        upstreamDetail: sharedResult.upstreamDetail || null,
        upstreamProvider: sharedResult.upstreamProvider || null,
        rateLimitSource: getUpstreamRateLimitSource(sharedResult),
        cached: false,
        shared: true,
      });
    } catch (error) {
      console.error("[AI feedback] Shared request failed:", error);
    }
  }

  const requestPromise = generateFeedback(task1, task2);
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    if (!result?.ok) {
      return res.status(result?.status || 503).json({
        error: result?.error || result?.message || "OpenAI is unavailable.",
        message: result?.message || result?.error || "OpenAI is unavailable.",
        detail: result?.detail || null,
        source: result?.source || "openai",
        fallback: false,
        upstreamStatus: result?.upstreamStatus || null,
        upstreamDetail: result?.upstreamDetail || null,
        upstreamProvider: result?.upstreamProvider || null,
        rateLimitSource: getUpstreamRateLimitSource(result),
        cached: false,
      });
    }

    const ttlMs = getCacheTtlMsForResult(result);
    if (ttlMs > 0) {
      setCachedFeedback(cacheKey, result, ttlMs);
    }

    return res.json({
      suggestion: result.suggestion,
      source: result.source,
      warning: result.warning || null,
      fallback: Boolean(result.fallback),
      upstreamStatus: result.upstreamStatus || null,
      upstreamDetail: result.upstreamDetail || null,
      upstreamProvider: result.upstreamProvider || null,
      rateLimitSource: getUpstreamRateLimitSource(result),
      cached: false,
    });
  } catch (error) {
    console.error("[AI feedback] Route error:", error);
    return res.status(500).json({
      error: "Không thể tạo nhận xét AI lúc này.",
      detail: error?.message || String(error),
    });
  } finally {
    inFlightRequests.delete(cacheKey);
  }
});

router.post("/generate-cambridge-feedback", async (req, res) => {
  const {
    studentName = "",
    testType = "",
    classCode = "",
    responses = [],
  } = req.body || {};

  const normalizedResponses = normalizeCambridgeResponses(responses);
  if (!normalizedResponses.length) {
    return res.status(400).json({
      error: "Missing Cambridge open-ended responses.",
    });
  }

  const cacheKey = buildCacheKey(
    JSON.stringify({ studentName, testType, classCode }),
    JSON.stringify(normalizedResponses)
  );
  const cached = getCachedFeedback(cacheKey);
  if (cached && cached?.ok && cached?.suggestion) {
    return res.json({
      suggestion: cached.suggestion,
      source: cached.source,
      warning: cached.warning || null,
      fallback: Boolean(cached.fallback),
      upstreamStatus: cached.upstreamStatus || null,
      upstreamDetail: cached.upstreamDetail || null,
      upstreamProvider: cached.upstreamProvider || null,
      rateLimitSource: getUpstreamRateLimitSource(cached),
      cached: true,
    });
  } else if (cached) {
    feedbackCache.delete(cacheKey);
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const sharedResult = await inFlightRequests.get(cacheKey);
      if (!sharedResult?.ok) {
        return res.status(sharedResult?.status || 503).json({
          error: sharedResult?.error || sharedResult?.message || "OpenAI is unavailable.",
          message: sharedResult?.message || sharedResult?.error || "OpenAI is unavailable.",
          detail: sharedResult?.detail || null,
          source: sharedResult?.source || "openai",
          fallback: false,
          upstreamStatus: sharedResult?.upstreamStatus || null,
          upstreamDetail: sharedResult?.upstreamDetail || null,
          upstreamProvider: sharedResult?.upstreamProvider || null,
          rateLimitSource: getUpstreamRateLimitSource(sharedResult),
          cached: false,
          shared: true,
        });
      }

      return res.json({
        suggestion: sharedResult.suggestion,
        source: sharedResult.source,
        warning: sharedResult.warning || null,
        fallback: Boolean(sharedResult.fallback),
        upstreamStatus: sharedResult.upstreamStatus || null,
        upstreamDetail: sharedResult.upstreamDetail || null,
        upstreamProvider: sharedResult.upstreamProvider || null,
        rateLimitSource: getUpstreamRateLimitSource(sharedResult),
        cached: false,
        shared: true,
      });
    } catch (error) {
      console.error("[AI feedback] Shared Cambridge request failed:", error);
    }
  }

  const requestPromise = generateCambridgeFeedback({
    studentName,
    testType,
    classCode,
    responses: normalizedResponses,
  });
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    if (!result?.ok) {
      return res.status(result?.status || 503).json({
        error: result?.error || result?.message || "OpenAI is unavailable.",
        message: result?.message || result?.error || "OpenAI is unavailable.",
        detail: result?.detail || null,
        source: result?.source || "openai",
        fallback: false,
        upstreamStatus: result?.upstreamStatus || null,
        upstreamDetail: result?.upstreamDetail || null,
        upstreamProvider: result?.upstreamProvider || null,
        rateLimitSource: getUpstreamRateLimitSource(result),
        cached: false,
      });
    }

    const ttlMs = getCacheTtlMsForResult(result);
    if (ttlMs > 0) {
      setCachedFeedback(cacheKey, result, ttlMs);
    }

    return res.json({
      suggestion: result.suggestion,
      source: result.source,
      warning: result.warning || null,
      fallback: Boolean(result.fallback),
      upstreamStatus: result.upstreamStatus || null,
      upstreamDetail: result.upstreamDetail || null,
      upstreamProvider: result.upstreamProvider || null,
      rateLimitSource: getUpstreamRateLimitSource(result),
      cached: false,
    });
  } catch (error) {
    console.error("[AI feedback] Cambridge route error:", error);
    return res.status(500).json({
      error: "Could not generate Cambridge AI feedback right now.",
      detail: error?.message || String(error),
    });
  } finally {
    inFlightRequests.delete(cacheKey);
  }
});

router.get("/health/openai", async (req, res) => {
  const result = await checkOpenAiHealth();

  return res.json({
    provider: "openai",
    model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
    timestamp: new Date().toISOString(),
    ...result,
    hint:
      result.reason === "missing_scope_api.responses.write"
        ? "OpenAI dashboard -> API keys -> edit key -> enable Responses API write scope."
        : null,
  });
});

module.exports = router;
