import {
  getQuestionCount,
  calculateTotalQuestions,
  normalizeQuestionType,
} from "../questionHelpers";

describe("questionHelpers", () => {
  describe("getQuestionCount", () => {
    it("returns 1 for a single number or falsy input", () => {
      expect(getQuestionCount(38)).toBe(1);
      expect(getQuestionCount("38")).toBe(1);
      expect(getQuestionCount(null)).toBe(1);
    });

    it("parses range format '38-40' as 3 questions", () => {
      expect(getQuestionCount("38-40")).toBe(3);
    });

    it("parses comma-separated '38,39,40' as 3 questions", () => {
      expect(getQuestionCount("38,39,40")).toBe(3);
    });
  });

  describe("normalizeQuestionType", () => {
    it("normalizes matching-headings variants to 'ielts-matching-headings'", () => {
      expect(normalizeQuestionType("matching-headings")).toBe(
        "ielts-matching-headings"
      );
      expect(normalizeQuestionType("IELTS-Matching-Headings")).toBe(
        "ielts-matching-headings"
      );
    });

    it("normalizes yes/no and true/false variants", () => {
      expect(normalizeQuestionType("yes-no-notgiven")).toBe("yes-no-not-given");
      expect(normalizeQuestionType("true-false-notgiven")).toBe(
        "true-false-not-given"
      );
    });
  });

  describe("calculateTotalQuestions", () => {
    it("calculates total from a variety of questionNumber formats", () => {
      const passages = [
        {
          sections: [
            {
              questions: [
                { questionNumber: 1 },
                { questionNumber: "2-3" },
                { questionNumber: "4,5,6" },
              ],
            },
          ],
        },
      ];

      expect(calculateTotalQuestions(passages)).toBe(1 + 2 + 3);
    });
  });
});
