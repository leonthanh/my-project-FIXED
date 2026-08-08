function getAiRequestErrorMessage(status, payload = {}) {
  const rateLimitSource = String(payload?.rateLimitSource || "").trim().toLowerCase();
  const limiter = String(payload?.limiter || "api").trim();
  const retryAfterSeconds = Number(payload?.retryAfterSeconds);

  if (status === 429) {
    if (rateLimitSource.startsWith("backend:")) {
      const retryHint = Number.isFinite(retryAfterSeconds)
        ? ` Please try again in about ${Math.max(1, Math.ceil(retryAfterSeconds))}s.`
        : "";

      return (
        payload?.error ||
        payload?.message ||
        `The backend ${limiter} rate limiter blocked this request.${retryHint}`
      );
    }

    if (rateLimitSource.startsWith("upstream:")) {
      const provider = rateLimitSource.replace("upstream:", "") || "ai-provider";
      const label = provider.charAt(0).toUpperCase() + provider.slice(1);
      return `${label} returned 429 Too Many Requests.`;
    }

    return payload?.error || payload?.message || "AI requests are temporarily rate-limited.";
  }

  return payload?.error || payload?.message || payload?.detail || "AI could not generate feedback.";
}

function getAiFallbackRateLimitMessage(payload = {}) {
  if (!payload?.fallback) return "";

  if (payload?.rateLimitSource === "upstream:gemini") {
    return "Gemini returned 429 Too Many Requests. The system generated fallback feedback instead.";
  }

  if (payload?.rateLimitSource === "upstream:openai") {
    return "OpenAI returned 429 Too Many Requests. The system generated fallback feedback instead.";
  }

  return "";
}

const AI_STATUS_STYLES = {
  success: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#166534",
  },
  warning: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
  },
  info: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  },
};

const AI_SOURCE_META = {
  openai: {
    sourceKey: "openai",
    sourceLabel: "OpenAI",
    sourceStyle: {
      background: "#e0f2fe",
      border: "1px solid #bae6fd",
      color: "#075985",
    },
  },
  gemini: {
    sourceKey: "gemini",
    sourceLabel: "Gemini",
    sourceStyle: {
      background: "#ede9fe",
      border: "1px solid #ddd6fe",
      color: "#5b21b6",
    },
  },
  fallback: {
    sourceKey: "fallback",
    sourceLabel: "Fallback",
    sourceStyle: {
      background: "#fef3c7",
      border: "1px solid #fde68a",
      color: "#92400e",
    },
  },
};

const AI_DRAFT_STORAGE_PREFIX = "admin-writing-feedback-draft";

function getAiSourceMeta(payload = {}) {
  const normalizedSource = String(payload?.source || "").trim().toLowerCase();
  const sourceKey = payload?.fallback
    ? "fallback"
    : normalizedSource === "gemini"
    ? "gemini"
    : normalizedSource === "openai"
    ? "openai"
    : "openai";

  return AI_SOURCE_META[sourceKey] || AI_SOURCE_META.openai;
}

function withAiSourceMeta(payload, status) {
  return {
    ...status,
    ...getAiSourceMeta(payload),
  };
}

function getAiStatusStyle(tone = "info") {
  return AI_STATUS_STYLES[tone] || AI_STATUS_STYLES.info;
}

function mergeAiSuggestionText(existingValue = "", suggestionValue = "", appendMode = false) {
  const suggestion = String(suggestionValue || "").trim();
  if (!suggestion) {
    return String(existingValue || "");
  }

  const current = String(existingValue || "").trim();
  if (!appendMode || !current) {
    return suggestion;
  }

  return `${current}\n\n---\n${suggestion}`;
}

function buildAiDraftStorageKey(submissionId) {
  return `${AI_DRAFT_STORAGE_PREFIX}:${submissionId}`;
}

function loadAiDraftFromStorage(submissionId) {
  if (submissionId == null) return null;

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    const raw = window.localStorage.getItem(buildAiDraftStorageKey(submissionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveAiDraftToStorage(submissionId, draft = {}) {
  if (submissionId == null) return false;

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    const payload = {
      feedback: String(draft?.feedback || ""),
      teacherName: String(draft?.teacherName || ""),
      bandTask1: draft?.bandTask1 ?? "",
      bandTask2: draft?.bandTask2 ?? "",
      appendAiMode: Boolean(draft?.appendAiMode),
      updatedAt: draft?.updatedAt || new Date().toISOString(),
    };

    const hasMeaningfulDraft =
      Boolean(payload.feedback.trim()) ||
      Boolean(String(payload.teacherName || "").trim()) ||
      payload.bandTask1 !== "" ||
      payload.bandTask2 !== "";

    const storageKey = buildAiDraftStorageKey(submissionId);
    if (!hasMeaningfulDraft) {
      window.localStorage.removeItem(storageKey);
      return true;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function clearAiDraftFromStorage(submissionId) {
  if (submissionId == null) return false;

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    window.localStorage.removeItem(buildAiDraftStorageKey(submissionId));
    return true;
  } catch {
    return false;
  }
}

function buildAiFeedbackStatus(payload = {}) {
  if (payload?.cached && payload?.fallback && payload?.warning) {
    return withAiSourceMeta(payload, {
      tone: "warning",
      text: `Loaded a cached fallback draft. ${payload.warning}`,
    });
  }

  if (payload?.cached && payload?.fallback && payload?.upstreamStatus === 429) {
    return withAiSourceMeta(payload, {
      tone: "warning",
      text:
        payload?.upstreamProvider === "gemini"
          ? "Loaded a cached fallback draft. Gemini previously returned 429 Too Many Requests for this submission."
          : "Loaded a cached fallback draft. OpenAI previously returned 429 Too Many Requests for this submission.",
    });
  }

  if (payload?.cached && payload?.source === "gemini") {
    return withAiSourceMeta(payload, {
      tone: "info",
      text:
        payload?.upstreamProvider === "openai"
          ? "Loaded a cached Gemini draft. OpenAI was unavailable when this draft was generated."
          : "Loaded a cached Gemini draft for this submission.",
    });
  }

  if (payload?.cached) {
    return withAiSourceMeta(payload, {
      tone: "info",
      text: "Loaded cached AI draft for this submission.",
    });
  }

  if (payload?.fallback && payload?.upstreamStatus === 429) {
    if (payload?.warning) {
      return withAiSourceMeta(payload, {
        tone: "warning",
        text: payload.warning,
      });
    }

    return withAiSourceMeta(payload, {
      tone: "warning",
      text:
        payload?.upstreamProvider === "gemini"
          ? "Gemini returned 429 Too Many Requests. The system inserted a fallback draft so marking can continue."
          : "OpenAI returned 429 Too Many Requests. The system inserted a fallback draft so marking can continue.",
    });
  }

  if (payload?.source === "gemini" && payload?.shared) {
    return withAiSourceMeta(payload, {
      tone: "info",
      text:
        payload?.upstreamProvider === "openai" && payload?.upstreamStatus === 429
          ? "OpenAI returned 429 Too Many Requests. Gemini generated the draft from a shared request instead."
          : payload?.upstreamProvider === "openai"
          ? "OpenAI was unavailable for this request. Gemini generated the draft from a shared request instead."
          : "Gemini generated the draft from a shared request.",
    });
  }

  if (payload?.source === "gemini") {
    return withAiSourceMeta(payload, {
      tone: "info",
      text:
        payload?.upstreamProvider === "openai" && payload?.upstreamStatus === 429
          ? "OpenAI returned 429 Too Many Requests. Gemini generated the draft instead."
          : payload?.upstreamProvider === "openai"
          ? "OpenAI was unavailable for this request. Gemini generated the draft instead."
          : "Gemini generated the AI draft successfully.",
    });
  }

  if (payload?.fallback) {
    return withAiSourceMeta(payload, {
      tone: "warning",
      text:
        payload?.warning ||
        "The AI provider is temporarily unavailable, so the system inserted a fallback draft.",
    });
  }

  if (payload?.shared) {
    return withAiSourceMeta(payload, {
      tone: "success",
      text: "AI draft generated from a shared request.",
    });
  }

  return withAiSourceMeta(payload, {
    tone: "success",
    text: "AI draft generated successfully.",
  });
}

export {
  buildAiDraftStorageKey,
  buildAiFeedbackStatus,
  clearAiDraftFromStorage,
  getAiFallbackRateLimitMessage,
  getAiRequestErrorMessage,
  getAiSourceMeta,
  getAiStatusStyle,
  loadAiDraftFromStorage,
  mergeAiSuggestionText,
  saveAiDraftToStorage,
};