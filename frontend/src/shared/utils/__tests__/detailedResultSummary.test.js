import { summarizeDetailedResults } from "../detailedResultSummary";

describe("summarizeDetailedResults", () => {
  test("counts scored outcomes and excludes pending manual results", () => {
    expect(
      summarizeDetailedResults([
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true },
        { isCorrect: null },
      ])
    ).toEqual({ correct: 2, wrong: 1, total: 3, percentage: 67 });
  });

  test("accepts keyed and JSON-encoded detailed results", () => {
    const results = {
      first: { isCorrect: true },
      second: { isCorrect: false },
    };

    expect(summarizeDetailedResults(results)).toEqual({
      correct: 1,
      wrong: 1,
      total: 2,
      percentage: 50,
    });
    expect(summarizeDetailedResults(JSON.stringify(results))).toEqual({
      correct: 1,
      wrong: 1,
      total: 2,
      percentage: 50,
    });
  });

  test("returns null when there are no scored details", () => {
    expect(summarizeDetailedResults([{ isCorrect: null }])).toBeNull();
  });
});
