import {
  DEFAULT_TEACHER_EXTENSION_MINUTES,
  formatClock,
  getGraceRemainingSeconds,
  getRemainingSeconds,
} from "../../../shared/utils/testTiming";

export { DEFAULT_TEACHER_EXTENSION_MINUTES };

export const QUICK_EXTENSION_OPTIONS = [5, 10, 15];
export const MIN_EXTENSION_MINUTES = 1;
export const MAX_EXTENSION_MINUTES = 120;

export function normalizeCustomExtensionMinutes(value) {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const rounded = Math.round(numeric);
  if (rounded < MIN_EXTENSION_MINUTES || rounded > MAX_EXTENSION_MINUTES) {
    return null;
  }

  return rounded;
}

export function getAttemptTimingMeta(expiresAtValue) {
  const remaining = getRemainingSeconds(expiresAtValue);
  const graceRemaining = getGraceRemainingSeconds(expiresAtValue);

  if (!Number.isFinite(remaining)) {
    return null;
  }

  if (remaining > 0) {
    return {
      label: `${formatClock(remaining)} left`,
      color: "#1d4ed8",
    };
  }

  if (Number.isFinite(graceRemaining) && graceRemaining > 0) {
    return {
      label: `Grace ${formatClock(graceRemaining)}`,
      color: "#c2410c",
    };
  }

  return {
    label: "Time expired",
    color: "#b91c1c",
  };
}

export function formatAttemptTimestamp(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-GB");
}
