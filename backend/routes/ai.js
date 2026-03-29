const crypto = require("crypto");
const express = require("express");
require("dotenv").config();

const router = express.Router();

const feedbackCache = new Map();
const inFlightRequests = new Map();
const SUCCESS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 30 * 60 * 1000;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value = "") {
  const normalized = stripHtml(value);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function countParagraphs(value = "") {
  const raw = String(value || "");
  const htmlParagraphs = raw.match(/<p\b[^>]*>/gi);
  if (htmlParagraphs?.length) return htmlParagraphs.length;
  return raw
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean).length;
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

function shouldRetryOpenAI(status, detailText = "") {
  if (status >= 500) return true;
  if (status !== 429) return false;

  const parsed = parseUpstreamError(detailText);
  const code = parsed?.error?.code;
  const type = parsed?.error?.type;

  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return false;
  }

  return true;
}

function estimateBand(words, minWords, paragraphs) {
  let score = 5.0;

  if (words >= minWords) score += 0.5;
  if (words >= minWords + 40) score += 0.5;
  if (words < Math.max(40, minWords - 40)) score -= 1.0;
  if (paragraphs >= 2) score += 0.5;
  if (paragraphs <= 1) score -= 0.5;

  return Math.max(4.0, Math.min(7.0, Math.round(score * 2) / 2));
}

function buildFallbackSuggestion(task1, task2, reason = "") {
  const task1Words = countWords(task1);
  const task2Words = countWords(task2);
  const task1Paragraphs = countParagraphs(task1);
  const task2Paragraphs = countParagraphs(task2);
  const task1Band = estimateBand(task1Words, 150, task1Paragraphs);
  const task2Band = estimateBand(task2Words, 250, task2Paragraphs);
  const overall = Math.round(((task1Band + task2Band) / 2) * 2) / 2;

  const task1LengthComment =
    task1Words < 150
      ? `Task 1 hiện mới khoảng ${task1Words} từ, dưới mức tối thiểu 150 từ nên dễ mất điểm Task Achievement.`
      : `Task 1 có khoảng ${task1Words} từ, nhìn chung đã đạt yêu cầu độ dài tối thiểu.`;

  const task2LengthComment =
    task2Words < 250
      ? `Task 2 hiện mới khoảng ${task2Words} từ, dưới mức tối thiểu 250 từ nên cần phát triển ý sâu hơn.`
      : `Task 2 có khoảng ${task2Words} từ, cơ bản đáp ứng yêu cầu độ dài.`;

  const task1ParagraphComment =
    task1Paragraphs <= 1
      ? "Task 1 nên chia ý rõ hơn thành 2-3 đoạn để người đọc theo dõi dễ hơn."
      : `Task 1 đang có khoảng ${task1Paragraphs} đoạn, bố cục tương đối rõ.`;

  const task2ParagraphComment =
    task2Paragraphs <= 2
      ? "Task 2 nên có mở bài, 2 đoạn thân bài và kết luận rõ ràng để tăng Coherence & Cohesion."
      : `Task 2 đang có khoảng ${task2Paragraphs} đoạn, bố cục tương đối ổn.`;

  const warningLine = reason
    ? `Lưu ý: OpenAI đang bận hoặc bị giới hạn tạm thời (${reason}), nên hệ thống trả về nhận xét dự phòng để giáo viên tiếp tục làm việc.`
    : "Lưu ý: hệ thống đang dùng nhận xét dự phòng để tránh gián đoạn thao tác chấm bài.";

  return `${warningLine}

TASK 1:
- Task Achievement: khoảng band ${task1Band}. ${task1LengthComment}
- Coherence & Cohesion: ${task1ParagraphComment}
- Lexical Resource: nên kiểm tra lại cách dùng từ học thuật, tránh lặp lại một nhóm từ quá nhiều lần.
- Grammatical Range & Accuracy: nên rà soát câu dài, chia mệnh đề rõ hơn để giảm lỗi ngữ pháp và dấu câu.

TASK 2:
- Task Response: khoảng band ${task2Band}. ${task2LengthComment}
- Coherence & Cohesion: ${task2ParagraphComment}
- Lexical Resource: nên bổ sung từ nối học thuật như "moreover", "however", "in contrast", "as a result" ở đúng ngữ cảnh.
- Grammatical Range & Accuracy: ưu tiên dùng xen kẽ câu đơn, câu phức và kiểm tra lỗi chia động từ/chủ ngữ số ít số nhiều.

LỖI CẦN ƯU TIÊN SOÁT:
1. Kiểm tra đủ số từ cho từng task, nhất là Task 2.
2. Làm rõ topic sentence ở đầu mỗi đoạn thân bài.
3. Hạn chế lặp từ; thay bằng từ đồng nghĩa/cụm diễn đạt tương đương.
4. Rà soát lỗi ngữ pháp cơ bản trước khi gửi nhận xét cho học sinh.

GỢI Ý NHẬN XÉT NHANH CHO GIÁO VIÊN:
"Bài viết có ý chính tương đối rõ nhưng cần cải thiện thêm về độ phát triển ý, cách chia đoạn và độ chính xác ngữ pháp. Em nên mở rộng lập luận ở Task 2, dùng từ nối đa dạng hơn và rà soát lỗi ngữ pháp/collocation trước khi nộp lại."

ƯỚC LƯỢNG TỔNG QUAN:
- Task 1: khoảng band ${task1Band}
- Task 2: khoảng band ${task2Band}
- Overall tham khảo: khoảng band ${overall}`;
}

function buildPrompt(task1, task2) {
  return `Bạn là giáo viên IELTS Writing chuyên nghiệp. Hãy đánh giá bài làm của học sinh theo tiêu chí chấm điểm chính thức của IDP IELTS.

Task 1:
${task1}

Task 2:
${task2}

TIÊU CHÍ CHẤM ĐIỂM IELTS WRITING:
1. Task Achievement / Task Response
2. Coherence & Cohesion
3. Lexical Resource
4. Grammatical Range & Accuracy

Yêu cầu trả lời bằng tiếng Việt, súc tích nhưng cụ thể.
- Chấm điểm từng tiêu chí theo band 0-9
- Nhận xét riêng cho Task 1 và Task 2
- Chỉ ra 3-5 lỗi quan trọng nhất
- Đưa ra gợi ý cải thiện rõ ràng
- Kết thúc bằng Overall band ước lượng

Định dạng mong muốn:
TASK 1
TASK 2
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

  let lastFailure = null;

  for (const { attempt, delayMs } of retries) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Bạn là giáo viên IELTS Writing chuyên nghiệp.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const suggestion = data?.choices?.[0]?.message?.content?.trim();

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

async function generateFeedback(task1, task2) {
  const prompt = buildPrompt(task1, task2);

  if (!process.env.OPENAI_API_KEY) {
    return {
      suggestion: buildFallbackSuggestion(task1, task2, "thiếu OPENAI_API_KEY"),
      source: "fallback",
      warning:
        "OpenAI chưa được cấu hình trên server, hệ thống đã tạo nhận xét dự phòng.",
      fallback: true,
    };
  }

  const openAiResult = await callOpenAIWithRetry(prompt);
  if (openAiResult.ok) {
    return {
      suggestion: openAiResult.suggestion,
      source: "openai",
      fallback: false,
    };
  }

  const reason =
    openAiResult?.status === 429
      ? "OpenAI trả về 429"
      : openAiResult?.status
      ? `OpenAI lỗi ${openAiResult.status}`
      : "lỗi kết nối AI";

  return {
    suggestion: buildFallbackSuggestion(task1, task2, reason),
    source: "fallback",
    warning:
      "OpenAI đang bận hoặc bị giới hạn tạm thời. Hệ thống đã tạo nhận xét dự phòng để không gián đoạn việc chấm bài.",
    fallback: true,
    upstreamStatus: openAiResult?.status || null,
    upstreamDetail: openAiResult?.detail || null,
  };
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

function buildCambridgeFallback(responses = [], reason = "") {
  const responseCount = responses.length;
  const warningLine = reason
    ? `Note: OpenAI is temporarily unavailable (${reason}), so the system generated fallback feedback.`
    : "Note: The system generated fallback feedback to avoid interrupting marking.";

  return `${warningLine}

Overall impression:
The student has attempted ${responseCount} open-ended response${responseCount === 1 ? "" : "s"} and shows a basic understanding of the task, but the answers still need clearer development and cleaner language control.

Priority checks:
1. Answer the question more directly and make sure each response fully addresses the prompt.
2. Add one or two supporting details or examples instead of keeping the answer too general.
3. Check sentence structure, verb forms, and punctuation before submitting.
4. Replace repeated simple words with more precise vocabulary where possible.

Teacher-ready comment:
"Your response shows the right general idea, but it needs clearer development and more accurate grammar. Try to answer the prompt more directly, add supporting detail, and check sentence accuracy before submitting again."`;
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
      suggestion: buildCambridgeFallback([], "missing open-ended responses"),
      source: "fallback",
      warning:
        "No Cambridge open-ended responses were provided, so the system generated fallback feedback.",
      fallback: true,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      suggestion: buildCambridgeFallback(
        normalizedResponses,
        "missing OPENAI_API_KEY"
      ),
      source: "fallback",
      warning:
        "OpenAI is not configured on the server, so the system generated fallback feedback.",
      fallback: true,
    };
  }

  const prompt = buildCambridgePrompt({
    studentName,
    testType,
    classCode,
    responses: normalizedResponses,
  });

  const openAiResult = await callOpenAIWithRetry(prompt);
  if (openAiResult.ok) {
    return {
      suggestion: openAiResult.suggestion,
      source: "openai",
      fallback: false,
    };
  }

  const reason =
    openAiResult?.status === 429
      ? "OpenAI returned 429"
      : openAiResult?.status
      ? `OpenAI error ${openAiResult.status}`
      : "AI connection error";

  return {
    suggestion: buildCambridgeFallback(normalizedResponses, reason),
    source: "fallback",
    warning:
      "OpenAI is temporarily busy or quota-limited. The system generated fallback feedback so marking can continue.",
    fallback: true,
    upstreamStatus: openAiResult?.status || null,
    upstreamDetail: openAiResult?.detail || null,
  };
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
  if (cached) {
    return res.json({
      suggestion: cached.suggestion,
      source: cached.source,
      warning: cached.warning || null,
      fallback: Boolean(cached.fallback),
      cached: true,
    });
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const sharedResult = await inFlightRequests.get(cacheKey);
      return res.json({
        suggestion: sharedResult.suggestion,
        source: sharedResult.source,
        warning: sharedResult.warning || null,
        fallback: Boolean(sharedResult.fallback),
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
    setCachedFeedback(
      cacheKey,
      result,
      result.fallback ? FALLBACK_CACHE_TTL_MS : SUCCESS_CACHE_TTL_MS
    );

    return res.json({
      suggestion: result.suggestion,
      source: result.source,
      warning: result.warning || null,
      fallback: Boolean(result.fallback),
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
  if (cached) {
    return res.json({
      suggestion: cached.suggestion,
      source: cached.source,
      warning: cached.warning || null,
      fallback: Boolean(cached.fallback),
      cached: true,
    });
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const sharedResult = await inFlightRequests.get(cacheKey);
      return res.json({
        suggestion: sharedResult.suggestion,
        source: sharedResult.source,
        warning: sharedResult.warning || null,
        fallback: Boolean(sharedResult.fallback),
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
    setCachedFeedback(
      cacheKey,
      result,
      result.fallback ? FALLBACK_CACHE_TTL_MS : SUCCESS_CACHE_TTL_MS
    );

    return res.json({
      suggestion: result.suggestion,
      source: result.source,
      warning: result.warning || null,
      fallback: Boolean(result.fallback),
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

module.exports = router;
