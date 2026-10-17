const { scoreQuestion, scoreTest } = require("../modules/cambridge/shared/scoring");

describe("Cambridge fill-answer scoring", () => {
  test("treats straight and typographic apostrophes as equivalent", () => {
    expect(scoreQuestion("'re making", "’re making | are making", "fill")).toBe(true);
    expect(scoreQuestion("’re making", "'re making | are making", "fill")).toBe(true);
  });

  test("scores Gateway open-cloze answers by question number and skips the zero example", () => {
    const correctAnswers = {
      36: "how",
      37: "on",
      38: "only",
      39: "them",
      40: "unless",
    };
    const blanks = [
      { questionNum: 0, fullMatch: "(0)" },
      ...Object.keys(correctAnswers).map((questionNum) => ({
        questionNum: Number(questionNum),
        fullMatch: `(${questionNum})`,
      })),
    ];
    const answers = Object.values(correctAnswers).reduce((result, answer, index) => {
      result[`0-0-0-${index}`] = answer;
      return result;
    }, {});

    const result = scoreTest(
      {
        testType: "gateway-reading-writing",
        parts: [
          {
            sections: [
              {
                questionType: "cloze-test",
                questions: [
                  {
                    passageText: "Example (0), then (36), (37), (38), (39), and (40).",
                    answers: correctAnswers,
                    blanks,
                  },
                ],
              },
            ],
          },
        ],
      },
      answers
    );

    expect(result).toMatchObject({ score: 5, total: 5 });
    expect(Object.values(result.detailedResults).map(({ correctAnswer }) => correctAnswer)).toEqual(
      Object.values(correctAnswers)
    );
    expect(Object.values(result.detailedResults).every(({ isCorrect }) => isCorrect)).toBe(true);
  });

  test("scores Gateway parts that were double-encoded in a SQL backup", () => {
    const parts = [
      {
        sections: [
          {
            questionType: "cloze-test",
            questions: [
              {
                passageText: "The answer is (1).",
                answers: { 1: "correct" },
                blanks: [{ questionNum: 1, fullMatch: "(1)" }],
              },
            ],
          },
        ],
      },
    ];

    const result = scoreTest(
      {
        testType: "gateway-reading-writing",
        parts: JSON.stringify(JSON.stringify(parts)),
      },
      { "0-0-0-0": "correct" }
    );

    expect(result).toMatchObject({ score: 1, total: 1 });
    expect(Object.values(result.detailedResults)[0].isCorrect).toBe(true);
  });
});
