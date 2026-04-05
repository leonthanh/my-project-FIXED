const TIMER_GRACE_SECONDS = Math.max(
  0,
  Number(process.env.TEST_TIMER_GRACE_SECONDS) || 180
);

const DEFAULT_EXTENSION_MINUTES = Math.max(
  1,
  Number(process.env.TEST_TIMER_DEFAULT_EXTENSION_MINUTES) || 5
);

const MIN_EXTENSION_MINUTES = 1;
const MAX_EXTENSION_MINUTES = 120;

function toTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeExtensionMinutes(value, fallback = DEFAULT_EXTENSION_MINUTES) {
  const raw = Number(value);
  const base = Number.isFinite(raw) ? raw : fallback;
  return Math.min(MAX_EXTENSION_MINUTES, Math.max(MIN_EXTENSION_MINUTES, Math.round(base)));
}

function getRemainingSeconds(expiresAtValue, nowMs = Date.now()) {
  const expiresAtMs = toTimestamp(expiresAtValue);
  if (!Number.isFinite(expiresAtMs)) return null;
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

function getHardExpiryTimestamp(expiresAtValue, graceSeconds = TIMER_GRACE_SECONDS) {
  const expiresAtMs = toTimestamp(expiresAtValue);
  if (!Number.isFinite(expiresAtMs)) return null;
  return expiresAtMs + Math.max(0, Number(graceSeconds) || 0) * 1000;
}

function getGraceRemainingSeconds(expiresAtValue, nowMs = Date.now(), graceSeconds = TIMER_GRACE_SECONDS) {
  const hardExpiresAtMs = getHardExpiryTimestamp(expiresAtValue, graceSeconds);
  if (!Number.isFinite(hardExpiresAtMs)) return null;
  return Math.max(0, Math.ceil((hardExpiresAtMs - nowMs) / 1000));
}

function buildTimingPayload(expiresAtValue, nowMs = Date.now(), graceSeconds = TIMER_GRACE_SECONDS) {
  const expiresAtMs = toTimestamp(expiresAtValue);
  if (!Number.isFinite(expiresAtMs)) {
    return {
      graceSeconds: Math.max(0, Number(graceSeconds) || 0),
      expiresAt: null,
      hardExpiresAt: null,
      remainingSeconds: null,
      graceRemainingSeconds: null,
      isInGrace: false,
    };
  }

  const remainingSeconds = getRemainingSeconds(expiresAtMs, nowMs);
  const hardExpiresAtMs = getHardExpiryTimestamp(expiresAtMs, graceSeconds);
  const graceRemainingSeconds = getGraceRemainingSeconds(expiresAtMs, nowMs, graceSeconds);

  return {
    graceSeconds: Math.max(0, Number(graceSeconds) || 0),
    expiresAt: new Date(expiresAtMs).toISOString(),
    hardExpiresAt: Number.isFinite(hardExpiresAtMs)
      ? new Date(hardExpiresAtMs).toISOString()
      : null,
    remainingSeconds,
    graceRemainingSeconds,
    isInGrace: remainingSeconds === 0 && graceRemainingSeconds > 0,
  };
}

function extendDeadline(expiresAtValue, extraMinutes, nowMs = Date.now()) {
  const extensionMinutes = normalizeExtensionMinutes(extraMinutes);
  const currentExpiresAtMs = toTimestamp(expiresAtValue);
  const baseMs = Number.isFinite(currentExpiresAtMs)
    ? Math.max(currentExpiresAtMs, nowMs)
    : nowMs;

  return {
    extensionMinutes,
    expiresAtMs: baseMs + extensionMinutes * 60 * 1000,
  };
}

module.exports = {
  TIMER_GRACE_SECONDS,
  DEFAULT_EXTENSION_MINUTES,
  normalizeExtensionMinutes,
  getRemainingSeconds,
  getHardExpiryTimestamp,
  getGraceRemainingSeconds,
  buildTimingPayload,
  extendDeadline,
  toTimestamp,
};