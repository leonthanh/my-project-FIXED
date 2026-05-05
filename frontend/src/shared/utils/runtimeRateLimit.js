function getRuntimeSyncRateLimitMessage(status, payload = {}) {
  if (status !== 429) return "";

  const source = String(payload?.rateLimitSource || "").trim().toLowerCase();
  if (source !== "backend:runtime-sync") return "";

  const retryAfterSeconds = Number(payload?.retryAfterSeconds);
  const retryHint = Number.isFinite(retryAfterSeconds)
    ? ` Retrying in about ${Math.max(1, Math.ceil(retryAfterSeconds))}s.`
    : " Retrying shortly.";

  return "Autosave is temporarily busy. Your answers are still saved on this machine." + retryHint;
}

export { getRuntimeSyncRateLimitMessage };