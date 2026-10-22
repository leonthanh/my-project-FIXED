import getClozeReviewCorrectAnswer from "../clozeReviewAnswers";

describe("getClozeReviewCorrectAnswer", () => {
  test("uses global question numbers before local answer keys", () => {
    const result = getClozeReviewCorrectAnswer({
      question: { answers: { 1: "legacy", 6: "global" } },
      blank: { questionNum: 6 },
      blankIdx: 0,
      blankCount: 5,
    });

    expect(result).toBe("global");
  });

  test("falls back to one-based local keys for a globally numbered passage", () => {
    const result = getClozeReviewCorrectAnswer({
      question: { answers: { 1: "went", 2: "travelled", 3: "was", 4: "hoped", 5: "left" } },
      blank: { questionNum: 6 },
      blankIdx: 0,
      blankCount: 5,
    });

    expect(result).toBe("went");
  });

  test("supports the legacy two-based answer keys used by Vocabulary-C", () => {
    const result = getClozeReviewCorrectAnswer({
      question: { answers: { 2: "outgoing", 3: "happy", 4: "smart", 5: "attractive", 6: "childish" } },
      blank: { questionNum: 27 },
      blankIdx: 1,
      blankCount: 5,
    });

    expect(result).toBe("happy");
  });
});
