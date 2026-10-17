import {
  computeQuestionStarts,
  countClozeBlanksFromText,
  getQuestionCountForSection,
  isZeroNumberedClozeExample,
  parseClozeBlanksFromText,
} from "../examQuestionNumbering";

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
            passageText: "<p>(0) used (36) how (37) on (38) only (39) them (40) unless</p>",
            answers: { 36: "how", 37: "on", 38: "only", 39: "them", 40: "unless" },
          }],
        },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(1) (go) (2) (love) (3) (learn) (4) (make) (5) (have)</p>",
            answers: { 1: "", 2: "", 3: "", 4: "", 5: "" },
          }],
        },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>screen (1), delay (2), platform (3), luggage (4), taxi rank (5)</p>",
            wordBank: ["arrivals", "delay", "information", "luggage", "platform", "service", "station", "taxi rank"],
            answers: { 1: "information", 2: "delay", 3: "platform", 4: "luggage", 5: "taxi rank" },
          }],
        },
        { questionType: "abc", questions: makeQuestions(5) },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(2) (sociable) (3) (happy) (4) (intelligent) (5) (handsome) (6) (immature)</p>",
            answers: {
              2: "outgoing",
              3: "glad | pleased",
              4: "clever | smart",
              5: "good-looking | attractive | gorgeous",
              6: "childish",
            },
          }],
        },
        {
          questionType: "reading-open-questions",
          questions: [{ items: makeQuestions(5), layoutMode: "reorder-words" }],
        },
        {
          questionType: "cloze-test",
          questions: [{
            passageText: "<p>(0) used (36) how (37) on (38) only (39) them (40) unless</p>",
            blanks: [
              { questionNum: 0, answerKey: 0, sourceQuestionNum: 0 },
              { questionNum: 36, answerKey: 36, sourceQuestionNum: 36 },
              { questionNum: 37, answerKey: 37, sourceQuestionNum: 37 },
              { questionNum: 38, answerKey: 38, sourceQuestionNum: 38 },
              { questionNum: 39, answerKey: 39, sourceQuestionNum: 39 },
              { questionNum: 40, answerKey: 40, sourceQuestionNum: 40 },
            ],
            answers: { 0: "used", 36: "how", 37: "on", 38: "only", 39: "them", 40: "unless" },
          }],
        },
        {
          questionType: "long-text-mc",
          questions: [{
            gatewayReadingMode: true,
            questions: makeQuestions(10),
          }],
        },
        { questionType: "short-message", questions: makeQuestions(1) },
      ],
    }];

    const starts = computeQuestionStarts(parts, "gateway-reading-writing");

    expect(parts[0].sections.map((_, index) => starts.sectionStart[`0-${index}`])).toEqual([
      1, 6, 11, 16, 21, 26, 31, 36, 41, 51,
    ]);
    expect(starts.questionStart["0-1-0"]).toBe(6);
    expect(starts.questionStart["0-3-0"]).toBe(16);
    expect(starts.questionStart["0-4-0"]).toBe(21);
    expect(starts.questionStart["0-4-4"]).toBe(25);
    expect(starts.questionStart["0-5-0"]).toBe(26);
    expect(starts.questionStart["0-6-0"]).toBe(31);
    expect(getQuestionCountForSection(parts[0].sections[6])).toBe(5);
    expect(starts.questionStart["0-7-0"]).toBe(36);
    expect(getQuestionCountForSection(parts[0].sections[7])).toBe(5);
    expect(starts.questionStart["0-8-0"]).toBe(41);
    expect(getQuestionCountForSection(parts[0].sections[8])).toBe(10);
    expect(starts.questionStart["0-9-0"]).toBe(51);
  });

  it("does not count the zero-numbered example as a cloze question", () => {
    const passage = "<p>(0) used (36) how (37) on (38) only (39) them (40) unless</p>";

    expect(countClozeBlanksFromText(passage)).toBe(5);
    expect(parseClozeBlanksFromText(passage, 36).map(({ questionNum }) => questionNum)).toEqual([
      36, 37, 38, 39, 40,
    ]);
  });

  it("excludes stored zero-numbered examples from fallback cloze counts", () => {
    const section = {
      questionType: "cloze-test",
      questions: [{
        blanks: [
          { questionNum: 0, answerKey: 0 },
          { questionNum: 36, answerKey: 36 },
          { questionNum: 37, answerKey: 37 },
          { questionNum: 38, answerKey: 38 },
          { questionNum: 39, answerKey: 39 },
          { questionNum: 40, answerKey: 40 },
        ],
      }],
    };

    expect(isZeroNumberedClozeExample(section.questions[0].blanks[0])).toBe(true);
    expect(getQuestionCountForSection(section)).toBe(5);
  });
});
