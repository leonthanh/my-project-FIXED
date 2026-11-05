import {
  buildPrepareReadingWritingParts,
  countPrepareScoringUnitsForSection,
  createFlexiblePrepareParts,
  getFlexiblePrepareDraftParts,
  getPrepareTotalPoints,
  isPrepareReadingWriting,
  isFlexiblePrepareReadingWriting,
  markFlexiblePrepareParts,
  PREPARE_WRITING_RUBRIC,
  validateFlexiblePrepareReadingWritingParts,
  validatePrepareReadingWritingParts,
} from "./prepareReadingWriting";
import { getPrepareReadingWritingQuestionTypes } from "../../../shared/config/questionTypes";
import { getQuestionCountForSection } from "../../exam-core/shared/utils/examQuestionNumbering";

test("Prepare blueprint has 50 numbered questions and a separate W rubric", () => {
  const parts = buildPrepareReadingWritingParts();
  expect(isPrepareReadingWriting(parts)).toBe(true);
  const sections = parts[0].sections;
  expect(sections).toHaveLength(11);
  expect(sections.map(getQuestionCountForSection)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0]);
  expect(sections[10].questions[0].writingRubric).toEqual(PREPARE_WRITING_RUBRIC);
  expect(PREPARE_WRITING_RUBRIC.reduce((sum, item) => sum + item.points, 0)).toBe(10);
  expect(validatePrepareReadingWritingParts(parts)).toMatch(/nhập nội dung/i);
});

test("legacy gateway is not classified as Prepare", () => {
  expect(isPrepareReadingWriting([{ sections: [] }])).toBe(false);
});

test("flexible Prepare weights answer units to 50 and keeps writing separate", () => {
  const parts = createFlexiblePrepareParts();
  parts[0].sections[0].questions = Array.from({ length: 50 }, () => ({
    questionText: "Question",
    correctAnswer: "answer",
  }));
  parts[0].sections.push({
    sectionTitle: "Writing",
    questionType: "short-message",
    questions: [{ situation: "Write a message" }],
  });
  const markedParts = markFlexiblePrepareParts(parts);
  expect(isFlexiblePrepareReadingWriting(markedParts)).toBe(true);
  expect(countPrepareScoringUnitsForSection({
    questionType: "reading-open-questions",
    questions: [{ exerciseMode: "two-blanks", items: [{}, {}] }],
  })).toBe(4);
  expect(getPrepareTotalPoints(markedParts)).toBe(50);
  expect(markedParts[0].sections[1].questions[0].writingRubric).toEqual(PREPARE_WRITING_RUBRIC);
  expect(validateFlexiblePrepareReadingWritingParts(markedParts)).toBe("");
  markedParts[0].sections[0].preparePointsPerAnswer = 0.5;
  expect(validateFlexiblePrepareReadingWritingParts(markedParts)).toMatch(/50/);
});

test("two-word-bank completion is reusable and counts each blank as a scoring unit", () => {
  const wordBankType = getPrepareReadingWritingQuestionTypes().find((type) => type.id === "word-bank-completion");
  expect(wordBankType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = wordBankType.id;
  section.preparePointsPerAnswer = 0.5;
  section.questions = [JSON.parse(JSON.stringify(wordBankType.defaultData))];
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/50/);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(10);
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].items[0].questionText = "Now {1} these numbers.";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/hai danh sách từ/i);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toMatch(/hai danh sách từ/i);
});

test("definition completion counts each given-first-letter word as one scoring unit", () => {
  const definitionType = getPrepareReadingWritingQuestionTypes().find((type) => type.id === "definition-completion");
  expect(definitionType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = definitionType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [{
    ...JSON.parse(JSON.stringify(definitionType.defaultData)),
    items: [
      { questionText: "a piece of art made from stone or wood", correctAnswer: "sculpture" },
      { questionText: "a book about imaginary people", correctAnswer: "novel" },
      { questionText: "a building for showing works of art", correctAnswer: "gallery" },
      { questionText: "a room where an artist works", correctAnswer: "studio" },
      { questionText: "people who watch a performance", correctAnswer: "audience" },
    ],
  }];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/50/);

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");
});

test("adjective formation uses one extra word and scores each item once", () => {
  const adjectiveType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "word-bank-adjective-formation"
  );
  expect(adjectiveType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = adjectiveType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(adjectiveType.defaultData))];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  section.questions[0].wordBank.pop();
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toMatch(/từ thừa/i);
});

test("new Prepare drafts replace the abandoned fixed template with a clean flexible Part", () => {
  const legacyDraft = buildPrepareReadingWritingParts();
  const previouslyAutosavedDraft = markFlexiblePrepareParts(legacyDraft);
  [legacyDraft, previouslyAutosavedDraft].forEach((parts) => {
    const draftParts = getFlexiblePrepareDraftParts(parts);
    expect(isFlexiblePrepareReadingWriting(draftParts)).toBe(true);
    expect(draftParts).toHaveLength(1);
    expect(draftParts[0].sections).toHaveLength(1);
    expect(draftParts[0].sections[0].sectionTitle).toBe("Section 1");
  });
});

test("a completed Prepare blueprint validates and rejects missing blank markers", () => {
  const parts = buildPrepareReadingWritingParts();
  const sections = parts[0].sections;
  sections.slice(0, 9).forEach(({ questions }) => {
    const question = questions[0];
    question.items.forEach((item) => {
      item.questionText = question.exerciseMode === "two-blanks" ? "{1} {2}" : "Question";
      if (question.exerciseMode === "two-blanks") item.blankAnswers = ["one", "two"];
      else if (question.exerciseMode === "choice") {
        item.options = ["yes", "no"];
        item.correctAnswer = "yes";
      } else item.correctAnswer = "answer";
    });
  });
  const reading = sections[9].questions[0];
  reading.passage = "Passage";
  reading.questions.forEach((question) => {
    question.questionText = "Question";
    question.options = ["A. one", "B. two", "C. three", "D. four"];
    question.correctAnswer = "A";
  });
  sections[10].questions[0].situation = "Write a message";
  expect(validatePrepareReadingWritingParts(parts)).toBe("");
  sections[0].questions[0].items[0].questionText = "{1}";
  expect(validatePrepareReadingWritingParts(parts)).toMatch(/\{2\}/);
});
