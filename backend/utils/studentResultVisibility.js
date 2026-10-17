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

const redactStudentResultForConfirmation = (submission) => {
  const result = { ...submission };
  [
    "score",
    "total",
    "totalQuestions",
    "correct",
    "incorrect",
    "percentage",
    "scorePercentage",
    "band",
    "analysisBreakdown",
    "answers",
    "details",
    "detailedResults",
  ].forEach((field) => {
    delete result[field];
  });
  return result;
};

module.exports = {
  normalizeStudentResultVisibility,
  redactStudentResultForConfirmation,
  STUDENT_RESULT_VISIBILITY_MODES,
};
