export const TIMER_GRACE_SECONDS = Math.max(
  0,
  Number(import.meta.env.VITE_TEST_TIMER_GRACE_SECONDS) || 0
);

export const DEFAULT_TEACHER_EXTENSION_MINUTES = Math.max(
  1,
  Number(import.meta.env.VITE_TEST_TIMER_DEFAULT_EXTENSION_MINUTES) || 5
);

export function toTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function getRemainingSeconds(expiresAtValue, nowMs = Date.now()) {
  const expiresAtMs = toTimestamp(expiresAtValue);
  if (!Number.isFinite(expiresAtMs)) return null;
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

export function getHardExpiryTimestamp(
  expiresAtValue,
  graceSeconds = TIMER_GRACE_SECONDS
) {
  const expiresAtMs = toTimestamp(expiresAtValue);
  if (!Number.isFinite(expiresAtMs)) return null;
  return expiresAtMs + Math.max(0, Number(graceSeconds) || 0) * 1000;
}

export function getGraceRemainingSeconds(
  expiresAtValue,
  nowMs = Date.now(),
  graceSeconds = TIMER_GRACE_SECONDS
) {
  const hardExpiresAtMs = getHardExpiryTimestamp(expiresAtValue, graceSeconds);
  if (!Number.isFinite(hardExpiresAtMs)) return null;
  return Math.max(0, Math.ceil((hardExpiresAtMs - nowMs) / 1000));
}

export function formatClock(seconds) {
  if (!Number.isFinite(Number(seconds))) return "--:--";
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getExtensionMinutesDelta(prevExpiresAtValue, nextExpiresAtValue) {
  const previousMs = toTimestamp(prevExpiresAtValue);
  const nextMs = toTimestamp(nextExpiresAtValue);
  if (!Number.isFinite(previousMs) || !Number.isFinite(nextMs)) return null;
  if (nextMs <= previousMs + 1000) return null;

  const deltaSeconds = Math.round((nextMs - previousMs) / 1000);
  return Math.max(1, Math.round(deltaSeconds / 60));
}

export function getExtensionToastMessage(prevExpiresAtValue, nextExpiresAtValue) {
  const minutes = getExtensionMinutesDelta(prevExpiresAtValue, nextExpiresAtValue);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  return `Your test time has been extended by ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}