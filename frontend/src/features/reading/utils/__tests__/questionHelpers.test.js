import {
  getQuestionCount,
  getQuestionStart,
  getImpliedQuestionCount,
  getNextQuestionNumber,
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

  describe("getQuestionStart", () => {
    it("extracts the first question number from supported formats", () => {
      expect(getQuestionStart("38-40")).toBe(38);
      expect(getQuestionStart("38, 39, 40")).toBe(38);
      expect(getQuestionStart(12)).toBe(12);
      expect(getQuestionStart("")).toBeNull();
    });
  });

  describe("getImpliedQuestionCount", () => {
    it("uses blanks array when questionNumber is missing", () => {
      expect(
        getImpliedQuestionCount({ blanks: [{ id: 1 }, { id: 2 }, { id: 3 }] })
      ).toBe(3);
    });

    it("falls back to counting [BLANK] tokens from text", () => {
      expect(
        getImpliedQuestionCount({ questionText: "A [BLANK] B [BLANK]" })
      ).toBe(2);
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

  describe("getNextQuestionNumber", () => {
    it("continues numbering from previous sections when adding the first question to a new section", () => {
      const passages = [
        {
          sections: [
            { questions: [{ questionNumber: "1-10" }] },
            { questions: [] },
          ],
        },
      ];

      expect(getNextQuestionNumber(passages, 0, 1)).toBe(11);
    });

    it("continues numbering inside the same section", () => {
      const passages = [
        {
          sections: [
            { questions: [{ questionNumber: "1-10" }, { questionNumber: "11" }] },
          ],
        },
      ];

      expect(getNextQuestionNumber(passages, 0, 0)).toBe(12);
    });

    it("does not move backwards when existing data has duplicate legacy numbers", () => {
      const passages = [
        {
          sections: [
            { questions: [{ questionNumber: "1-10" }, { questionNumber: "1" }] },
            { questions: [] },
          ],
        },
      ];

      expect(getNextQuestionNumber(passages, 0, 1)).toBe(11);
    });
  });
});
