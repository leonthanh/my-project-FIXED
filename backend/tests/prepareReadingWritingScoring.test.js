const { scoreTest } = require("../modules/cambridge/shared/scoring");
const { countTotalQuestionsFromParts } = require("../modules/cambridge/shared/readingTestUtils");
const { validatePrepareParts } = require("../modules/examLevels/prepareReadingWriting");

const makeTest = (prepare = true) => ({
  testType: "gateway-reading-writing",
  parts: [{
    ...(prepare ? { examFormat: "prepare-reading-writing-v1" } : {}),
    sections: [
      ...Array.from({ length: 9 }, (_, sectionIndex) => ({
        questionType: "reading-open-questions",
        questions: [{
          exerciseMode: [0, 3, 4].includes(sectionIndex) ? "two-blanks" : "single",
          items: Array.from({ length: 5 }, () => ({
            questionText: "Question",
            correctAnswer: "yes|y",
            blankAnswers: ["first|one", "second"],
          })),
        }],
      })),
      {
        questionType: "long-text-mc",
        questions: [{ questions: Array.from({ length: 5 }, () => ({ questionText: "Reading", correctAnswer: "A" })) }],
      },
      { questionType: "short-message", questions: [{ situation: "Write" }] },
    ],
  }],
});

const allAnswers = () => {
  const answers = {};
  for (let section = 0; section < 9; section += 1) {
    for (let item = 0; item < 5; item += 1) {
      if ([0, 3, 4].includes(section)) {
        answers[`0-${section}-${item}-0`] = "one";
        answers[`0-${section}-${item}-1`] = "second";
      } else {
        answers[`0-${section}-${item}`] = "yes";
      }
    }
  }
  for (let item = 0; item < 5; item += 1) answers[`0-9-0-${item}`] = "A";
  answers["0-10-0"] = "Writing";
  return answers;
};

test("Prepare scores 50 questions and leaves W for manual grading", () => {
  expect(countTotalQuestionsFromParts(makeTest().parts)).toBe(50);
  const result = scoreTest(makeTest(), allAnswers());
  expect(result.total).toBe(50);
  expect(result.score).toBe(50);
  expect(Object.values(result.detailedResults).filter((entry) => entry.isCorrect !== null)).toHaveLength(50);
  expect(result.detailedResults["0-10-0"].isCorrect).toBeNull();
  expect(result.detailedResults["0-0-0-0"].questionNumber).toBe(1);
  expect(result.detailedResults["0-8-0-4"].questionNumber).toBe(45);
  expect(result.detailedResults["0-9-0-4"].questionNumber).toBe(50);
});

test.each([
  [null, null, 0],
  ["one", null, 0.5],
  ["one", "second", 1],
])("each blank is worth half a point", (first, second, earned) => {
  const answers = allAnswers();
  answers["0-0-0-0"] = first;
  answers["0-0-0-1"] = second;
  const result = scoreTest(makeTest(), answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49 + earned);
  expect(result.detailedResults["0-0-0-0"].earnedPoints).toBe(earned);
});

test("legacy gateway format remains scored using legacy answers", () => {
  expect(countTotalQuestionsFromParts(makeTest(false).parts)).toBe(51);
  const result = scoreTest(makeTest(false), { "0-0-0": "yes" });
  expect(result.total).toBe(50);
  expect(result.score).toBe(1);
});

test("flexible Prepare applies section weights and partial blank points", () => {
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Part 1",
    sections: [
      {
        questionType: "fill",
        preparePointsPerAnswer: 10,
        questions: Array.from({ length: 4 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
      {
        questionType: "reading-open-questions",
        preparePointsPerAnswer: 1,
        questions: [{
          exerciseMode: "two-blanks",
          items: Array.from({ length: 5 }, () => ({
            questionText: "{1} {2}",
            blankAnswers: ["first", "second"],
          })),
        }],
      },
      {
        questionType: "short-message",
        questions: [{ situation: "Write a message", gatewayWritingMode: true }],
      },
    ],
  }];
  const answers = {};
  for (let index = 0; index < 4; index += 1) answers[`0-0-${index}`] = "yes";
  for (let index = 0; index < 5; index += 1) {
    answers[`0-1-${index}-0`] = "first";
    answers[`0-1-${index}-1`] = "second";
  }
  answers["0-1-0-1"] = "wrong";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(14);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-1-0-0"].earnedPoints).toBe(1);
  expect(result.detailedResults["0-1-0-0"].maxPoints).toBe(2);
  expect(result.detailedResults["0-2-0"].isCorrect).toBeNull();
});

test("flexible Prepare rejects a weighted total other than 50 and empty writing prompts", () => {
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Vocabulary",
    sections: [{
      questionType: "fill",
      preparePointsPerAnswer: 1,
      questions: [{ questionText: "Question", correctAnswer: "answer" }],
    }],
  }];
  expect(validatePrepareParts(parts)).toBe(false);
  parts[0].sections.push({
    questionType: "short-message",
    questions: [{ situation: "" }],
  });
  expect(validatePrepareParts(parts)).toBe(false);
});

test("malformed Prepare test structures are rejected", () => {
  expect(validatePrepareParts(makeTest().parts)).toBe(false);
  expect(validatePrepareParts([{ sections: [] }])).toBe(false);
});

test("valid Prepare structure is accepted and missing blank markers are rejected", () => {
  const parts = makeTest().parts;
  const modes = ["two-blanks", "single", "single", "two-blanks", "two-blanks", "rewrite", "rewrite", "rewrite", "choice"];
  parts[0].sections.slice(0, 9).forEach((section, index) => {
    const question = section.questions[0];
    question.layoutMode = "prepare";
    question.exerciseMode = modes[index];
    question.items.forEach((item) => {
      item.questionText = modes[index] === "two-blanks" ? "{1} {2}" : "Question";
      if (modes[index] === "choice") {
        item.options = ["yes", "no"];
        item.correctAnswer = "yes";
      }
    });
  });
  const reading = parts[0].sections[9].questions[0];
  reading.passage = "Passage";
  reading.questions.forEach((item) => { item.options = ["A. a", "B. b", "C. c", "D. d"]; });
  const writing = parts[0].sections[10].questions[0];
  writing.gatewayWritingMode = true;
  writing.writingRubric = ["Content", "Communicative Achievement", "Organisation", "Language"].map((criterion) => ({ criterion, points: 2.5 }));
  expect(validatePrepareParts(parts)).toBe(true);
  parts[0].sections[0].questions[0].items[0].questionText = "{1}";
  expect(validatePrepareParts(parts)).toBe(false);
});
