function getRuntimeSyncRateLimitMessage(status, payload = {}) {
  if (status !== 429) return "";

  const source = String(payload?.rateLimitSource || "").trim().toLowerCase();
  if (source !== "backend:runtime-sync") return "";

  const retryAfterSeconds = Number(payload?.retryAfterSeconds);
  const retryHint = Number.isFinite(retryAfterSeconds)
    ? ` The app will retry automatically in about ${Math.max(1, Math.ceil(retryAfterSeconds))}s.`
    : " The app will retry automatically in a moment.";

  return "Server autosave is temporarily rate-limited by the backend. Your answers are still saved on this machine, so your work is not lost." + retryHint;
}

export { getRuntimeSyncRateLimitMessage };