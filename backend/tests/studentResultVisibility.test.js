const {
  normalizeStudentResultVisibility,
  redactStudentResultForConfirmation,
} = require("../utils/studentResultVisibility");

describe("student result visibility", () => {
  test("removes numeric and answer details from confirmation-only results", () => {
    const result = redactStudentResultForConfirmation({
      id: 12,
      score: 43,
      total: 50,
      totalQuestions: 50,
      correct: 43,
      incorrect: 7,
      percentage: 86,
      scorePercentage: 86,
      band: 7,
      answers: { q1: "A" },
      details: [{ questionNumber: 1 }],
      detailedResults: { q1: { isCorrect: true } },
      analysisBreakdown: { multipleChoice: 4 },
      feedback: "Good work",
    });

    expect(result).toEqual({ id: 12, feedback: "Good work" });
  });

  test("keeps legacy confirmation settings compatible", () => {
    expect(normalizeStudentResultVisibility("score", false)).toBe("confirmation");
  });
});
