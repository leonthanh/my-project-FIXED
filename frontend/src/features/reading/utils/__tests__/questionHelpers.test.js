import {
  countClozeBlanks,
  createDefaultQuestionByType,
  getQuestionCount,
  getActiveClozeTable,
  getQuestionStart,
  getImpliedQuestionCount,
  getClozeText,
  getNextQuestionNumber,
  calculateTotalQuestions,
  formatQuestionNumber,
  normalizeQuestionType,
  renumberQuestionsFrom,
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

    it("uses the larger structural count for summary completion blanks", () => {
      expect(
        getImpliedQuestionCount({
          questionNumber: "14",
          questionType: "summary-completion",
          blanks: [{ id: 1 }, { id: 2 }, { id: 3 }],
        })
      ).toBe(3);
    });

    it("counts active cloze table blanks when table mode is enabled", () => {
      expect(
        getImpliedQuestionCount({
          questionType: "cloze-test",
          tableMode: true,
          clozeTable: {
            columns: ["Test", "Findings"],
            rows: [{ cells: ["A [BLANK]", "B [BLANK] [BLANK]"] }],
          },
        })
      ).toBe(3);
    });
  });

  describe("cloze helpers", () => {
    it("ignores stale clozeTable data when the question is in paragraph mode", () => {
      const question = {
        questionType: "cloze-test",
        tableMode: false,
        paragraphText: "Fresh [BLANK] content [BLANK] here",
        clozeTable: {
          columns: ["Test", "Findings"],
          rows: [{ cells: ["Old [BLANK] row", "Another [BLANK] [BLANK]"] }],
        },
      };

      expect(getActiveClozeTable(question)).toBeNull();
      expect(getClozeText(question)).toBe("Fresh [BLANK] content [BLANK] here");
      expect(countClozeBlanks(question)).toBe(2);
    });

    it("starts new cloze questions without sample table payload", () => {
      const question = createDefaultQuestionByType("cloze-test");

      expect(question.tableMode).toBe(false);
      expect(question.clozeTable).toBeNull();
      expect(question.tableRows).toEqual([{ cells: ["", ""] }]);
    });

    it("normalizes table rows to the active column count", () => {
      const question = {
        questionType: "cloze-test",
        tableMode: true,
        clozeTable: {
          title: "Lab results",
          instruction: "Write ONE WORD ONLY.",
          columns: ["Test", "Findings"],
          rows: [
            { cells: ["A [BLANK]", "B", "Hidden [BLANK]"] },
            { cells: ["Only first column"] },
          ],
        },
      };

      expect(getActiveClozeTable(question)).toEqual({
        title: "Lab results",
        instruction: "Write ONE WORD ONLY.",
        columns: ["Test", "Findings"],
        rows: [
          { cells: ["A [BLANK]", "B"] },
          { cells: ["Only first column", ""] },
        ],
      });
      expect(countClozeBlanks(question)).toBe(1);
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

    it("counts summary completion blanks even when the stored questionNumber is a single number", () => {
      const passages = [
        {
          sections: [
            {
              questions: [
                {
                  questionNumber: "14",
                  questionType: "summary-completion",
                  blanks: [{ id: 1 }, { id: 2 }, { id: 3 }],
                },
              ],
            },
          ],
        },
      ];

      expect(calculateTotalQuestions(passages)).toBe(3);
    });
  });

  describe("formatQuestionNumber", () => {
    it("returns a single number when the question count is one", () => {
      expect(formatQuestionNumber(15, 1)).toBe("15");
    });

    it("formats a range for multi-question blocks", () => {
      expect(formatQuestionNumber(15, 3)).toBe("15-17");
    });

    it("preserves comma-style numbering when the template used commas", () => {
      expect(formatQuestionNumber(15, 3, "1, 2, 3")).toBe("15, 16, 17");
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

    it("continues numbering into later passages instead of resetting to 1", () => {
      const passages = [
        {
          sections: [
            { questions: [{ questionNumber: "1-10" }] },
            { questions: [{ questionNumber: "11-14" }] },
          ],
        },
        {
          sections: [
            { questions: [] },
          ],
        },
      ];

      expect(getNextQuestionNumber(passages, 1, 0)).toBe(15);
    });
  });

  describe("renumberQuestionsFrom", () => {
    it("renumbers a copied question and shifts later questions forward", () => {
      const passages = [
        {
          sections: [
            {
              questions: [
                { questionNumber: "1", questionType: "multiple-choice" },
                { questionNumber: "2", questionType: "multiple-choice" },
                { questionNumber: "3", questionType: "multiple-choice" },
              ],
            },
          ],
        },
      ];

      passages[0].sections[0].questions.splice(2, 0, {
        questionNumber: "2",
        questionType: "multiple-choice",
      });

      renumberQuestionsFrom(passages, 0, 0, 2, 3);

      expect(passages[0].sections[0].questions.map((question) => question.questionNumber)).toEqual([
        "1",
        "2",
        "3",
        "4",
      ]);
    });
  });
});
