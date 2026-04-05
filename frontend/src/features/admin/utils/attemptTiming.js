import {
  DEFAULT_TEACHER_EXTENSION_MINUTES,
  formatClock,
  getGraceRemainingSeconds,
  getRemainingSeconds,
} from "../../../shared/utils/testTiming";

export { DEFAULT_TEACHER_EXTENSION_MINUTES };

export const QUICK_EXTENSION_OPTIONS = [5, 10, 15];

export function getAttemptTimingMeta(expiresAtValue) {
  const remaining = getRemainingSeconds(expiresAtValue);
  const graceRemaining = getGraceRemainingSeconds(expiresAtValue);

  if (!Number.isFinite(remaining)) {
    return null;
  }

  if (remaining > 0) {
    return {
      label: `Còn ${formatClock(remaining)}`,
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
    label: "Đã hết giờ",
    color: "#b91c1c",
  };
}

export function formatAttemptTimestamp(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
}