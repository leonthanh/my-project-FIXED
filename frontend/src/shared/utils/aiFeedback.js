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

export { getAiRequestErrorMessage, getAiFallbackRateLimitMessage };