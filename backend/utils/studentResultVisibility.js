const STUDENT_RESULT_VISIBILITY_MODES = new Set(["confirmation", "score", "details"]);

const normalizeStudentResultVisibility = (value, legacyShowResultModal) => {
  if (legacyShowResultModal === false || legacyShowResultModal === "false") {
    return "confirmation";
  }

  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (STUDENT_RESULT_VISIBILITY_MODES.has(normalizedValue)) {
    return normalizedValue;
  }

  return "score";
};

module.exports = {
  normalizeStudentResultVisibility,
  STUDENT_RESULT_VISIBILITY_MODES,
};
