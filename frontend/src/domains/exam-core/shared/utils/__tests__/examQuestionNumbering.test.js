import { computeQuestionStarts } from "../examQuestionNumbering";

const makeQuestions = (count) => Array.from({ length: count }, () => ({}));

describe("computeQuestionStarts for Gateway Reading-Writing", () => {
  it("numbers all sections continuously without treating local cloze numbers as global", () => {
    const parts = [{
      sections: [
        {
          questionType: "reading-open-questions",
          questions: [{ items: makeQuestions(5) }],
        },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(1) ____ (2) ____ (3) ____ (4) ____ (5) ____</p>",
            answers: { 1: "", 2: "", 3: "", 4: "", 5: "" },
          }],
        },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(1) (go) (2) (love) (3) (learn) (4) (make) (5) (have)</p>",
            answers: { 1: "", 2: "", 3: "", 4: "", 5: "" },
          }],
        },
        { questionType: "fill", questions: makeQuestions(5) },
        { questionType: "abc", questions: makeQuestions(5) },
        { questionType: "fill", questions: makeQuestions(5) },
        { questionType: "sentence-transformation", questions: makeQuestions(5) },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(1) ____ (2) ____ (3) ____ (4) ____ (5) ____</p>",
            answers: { 1: "", 2: "", 3: "", 4: "", 5: "" },
          }],
        },
        {
          questionType: "long-text-mc",
          questions: [{ questions: makeQuestions(5) }],
        },
        {
          questionType: "true-false-not-given",
          questions: [{ statements: makeQuestions(5) }],
        },
        { questionType: "short-message", questions: makeQuestions(1) },
      ],
    }];

    const starts = computeQuestionStarts(parts, "gateway-reading-writing");

    expect(parts[0].sections.map((_, index) => starts.sectionStart[`0-${index}`])).toEqual([
      1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51,
    ]);
    expect(starts.questionStart["0-1-0"]).toBe(6);
    expect(starts.questionStart["0-7-0"]).toBe(36);
    expect(starts.questionStart["0-9-0"]).toBe(46);
  });
});
