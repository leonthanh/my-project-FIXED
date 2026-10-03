const SERVER_RATE_LIMIT_COOLDOWN_FALLBACK_MS = 15000;
const SERVER_RATE_LIMIT_COOLDOWN_MAX_MS = 120000;
const RUNTIME_SYNC_METRICS_KEY = "runtimeSync:clientMetrics:v1";
const RUNTIME_SYNC_METRICS_RETENTION_MS = 6 * 60 * 60 * 1000;

function getServerCooldownMs(response, payload = {}) {
  const retryAfterHeader = response?.headers?.get?.("Retry-After");
  const retryAfterSeconds = Number.parseInt(
    retryAfterHeader || payload?.retryAfterSeconds,
    10
  );

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(
      retryAfterSeconds * 1000,
      SERVER_RATE_LIMIT_COOLDOWN_MAX_MS
    );
  }

  return SERVER_RATE_LIMIT_COOLDOWN_FALLBACK_MS;
}

function readMetricsStore() {
  if (typeof window === "undefined") return { buckets: {} };
  try {
    const raw = localStorage.getItem(RUNTIME_SYNC_METRICS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { buckets: {} };
    if (!parsed.buckets || typeof parsed.buckets !== "object") {
      return { buckets: {} };
    }
    return parsed;
  } catch (_err) {
    return { buckets: {} };
  }
}

function writeMetricsStore(store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RUNTIME_SYNC_METRICS_KEY, JSON.stringify(store));
  } catch (_err) {
    // ignore quota/storage write errors
  }
}

function recordRuntimeSyncRequestMetric({
  scope = "unknown",
  endpoint = "unknown",
  status = "unknown",
}) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const minuteTs = Math.floor(now / 60000) * 60000;
  const normalizedStatus = Number.isFinite(Number(status))
    ? String(Number(status))
    : String(status || "unknown");
  const key = `${minuteTs}|${String(scope)}|${String(endpoint)}|${normalizedStatus}`;

  const store = readMetricsStore();
  const buckets = store.buckets || {};
  buckets[key] = Number(buckets[key] || 0) + 1;

  const cutoff = now - RUNTIME_SYNC_METRICS_RETENTION_MS;
  Object.keys(buckets).forEach((bucketKey) => {
    const sepIdx = bucketKey.indexOf("|");
    const ts = sepIdx > 0 ? Number(bucketKey.slice(0, sepIdx)) : 0;
    if (!Number.isFinite(ts) || ts < cutoff) {
      delete buckets[bucketKey];
    }
  });

  const nextStore = {
    updatedAt: now,
    buckets,
  };
  writeMetricsStore(nextStore);

  try {
    window.dispatchEvent(
      new CustomEvent("runtime-sync:metric", {
        detail: {
          ts: now,
          minuteTs,
          scope: String(scope),
          endpoint: String(endpoint),
          status: normalizedStatus,
        },
      })
    );
  } catch (_err) {
    // ignore CustomEvent errors
  }
}

function getRuntimeSyncMetricsSnapshot() {
  const store = readMetricsStore();
  const buckets = store?.buckets || {};
  const summary = {};

  Object.entries(buckets).forEach(([key, count]) => {
    const [, scope, endpoint, status] = String(key).split("|");
    const summaryKey = `${scope}|${endpoint}|${status}`;
    summary[summaryKey] = Number(summary[summaryKey] || 0) + Number(count || 0);
  });

  return {
    updatedAt: Number(store?.updatedAt || 0),
    bucketCount: Object.keys(buckets).length,
    summary,
    buckets,
  };
}

function clearRuntimeSyncMetrics() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RUNTIME_SYNC_METRICS_KEY);
  } catch (_err) {
    // ignore storage errors
  }
}

export {
  getServerCooldownMs,
  recordRuntimeSyncRequestMetric,
  getRuntimeSyncMetricsSnapshot,
  clearRuntimeSyncMetrics,
};
