import {
  buildPrepareReadingWritingParts,
  countPrepareScoringUnitsForSection,
  createFlexiblePrepareParts,
  createPrepareWritingQuestionData,
  getFlexiblePrepareDraftParts,
  getPrepareTotalPoints,
  isPrepareReadingWriting,
  isFlexiblePrepareReadingWriting,
  markFlexiblePrepareParts,
  PREPARE_WRITING_RUBRIC,
  validateFlexiblePrepareReadingWritingParts,
  validatePrepareReadingWritingParts,
} from "./prepareReadingWriting";
import { getPrepareReadingWritingQuestionTypes } from "../../shared/config/questionTypes";
import { getQuestionCountForSection } from "../exam-engine/shared/utils/examQuestionNumbering";

test("Prepare blueprint has 50 numbered questions and a separate W rubric", () => {
  const parts = buildPrepareReadingWritingParts();
  expect(isPrepareReadingWriting(parts)).toBe(true);
  const sections = parts[0].sections;
  expect(sections).toHaveLength(11);
  expect(sections.map(getQuestionCountForSection)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0]);
  expect(sections[10].questions[0].writingRubric).toEqual(PREPARE_WRITING_RUBRIC);
  expect(sections[10].questions[0].messageType).toBe("letter");
  expect(sections[10].questions[0].wordLimit).toEqual({ min: 80, max: 80 });
  expect(PREPARE_WRITING_RUBRIC.reduce((sum, item) => sum + item.points, 0)).toBe(10);
  expect(validatePrepareReadingWritingParts(parts)).toMatch(/nhập nội dung/i);
});

test("legacy gateway is not classified as Prepare", () => {
  expect(isPrepareReadingWriting([{ sections: [] }])).toBe(false);
});

test("Prepare marks the reusable PET story-writing option with a PP scope label", () => {
  const storyWriting = getPrepareReadingWritingQuestionTypes().find((type) => type.id === "story-writing");

  expect(storyWriting.scopeLabel).toBe("PET/General/PP");
});

test("Prepare story-writing accepts the title, instructions, and source text from its editor", () => {
  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = "story-writing";
  section.questions = [{
    prepareWritingMode: true,
    title: "Katie's letter",
    instructions: "Write a reply to Katie's letter. Write about 80 words.",
    story: "I don't know what to do this weekend.",
    questions: [],
  }];

  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");
  section.questions[0].instructions = "";
  section.questions[0].story = "";
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true }))
    .toMatch(/hướng dẫn hoặc nội dung/i);
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
  expect(markedParts[0].sections[1].questions[0].prepareWritingMode).toBe(true);
  expect(markedParts[0].sections[1].questions[0].gatewayWritingMode).toBeUndefined();
  expect(markedParts[0].sections[1].questions[0].wordLimit).toEqual({ min: 80, max: 80 });
  expect(validateFlexiblePrepareReadingWritingParts(markedParts)).toBe("");
  markedParts[0].sections[0].preparePointsPerAnswer = 0.5;
  expect(validateFlexiblePrepareReadingWritingParts(markedParts)).toMatch(/50/);
});

test("Prepare Writing starts with the editable letter prompt and its separate 10-point rubric", () => {
  const question = createPrepareWritingQuestionData();

  expect(question.situation).toContain("Katie");
  expect(question.situation).toContain("about 80 words");
  expect(question.messageType).toBe("letter");
  expect(question.wordLimit).toEqual({ min: 80, max: 80 });
  expect(question.writingRubric).toEqual([
    { criterion: "Content", points: 2.5 },
    { criterion: "Communicative Achievement", points: 2.5 },
    { criterion: "Organisation", points: 2.5 },
    { criterion: "Language", points: 2.5 },
  ]);
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

test("conditional grammar completion counts two scoring blanks for each numbered sentence", () => {
  const grammarType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "conditional-sentence-completion"
  );
  expect(grammarType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const firstSection = parts[0].sections[0];
  firstSection.questionType = grammarType.id;
  firstSection.preparePointsPerAnswer = 0.5;
  firstSection.questions = [JSON.parse(JSON.stringify(grammarType.defaultData))];

  expect(getQuestionCountForSection(firstSection)).toBe(5);
  expect(countPrepareScoringUnitsForSection(firstSection)).toBe(10);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push(
    {
      sectionTitle: "Second Conditional",
      questionType: grammarType.id,
      preparePointsPerAnswer: 0.5,
      questions: [JSON.parse(JSON.stringify(grammarType.defaultData))],
    },
    {
      sectionTitle: "Other questions",
      questionType: "fill",
      preparePointsPerAnswer: 1,
      questions: Array.from({ length: 40 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
    }
  );
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  firstSection.questions[0].items[0].questionText = "If you {1} (go) to Peru.";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/\{1\}, \{2\}/);
});

test("reported-command completion scores only the five transformed sentences, not the example", () => {
  const reportedType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "reported-command-completion"
  );
  expect(reportedType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = reportedType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(reportedType.defaultData))];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].items[0].reportingVerb = "";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/reporting verb/i);
});

test("reported speech transformation counts five answers and validates both speech frames", () => {
  const speechType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "reported-speech-transformation"
  );
  expect(speechType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.questionType = speechType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(speechType.defaultData))];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].items[0].targetPrefix = "";
  section.questions[0].items[0].targetSuffix = "";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/khung câu trả lời/i);
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

test("past simple passive transformation is reusable and counts each rewrite once", () => {
  const passiveType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "past-simple-passive-transformation"
  );
  expect(passiveType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.sectionTitle = "Grammar - Exercise 8";
  section.questionType = passiveType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(passiveType.defaultData))];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(section.questions[0].items[4]).toMatchObject({
    targetPrefix: "Were ",
    targetSuffix: "?",
    correctAnswer: "your shoes made in Spain",
  });
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].items[0].sourceText = "";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/câu chủ động/i);
});

test("reported speech verb choice is reusable and scores five selected words", () => {
  const choiceType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "reported-speech-verb-choice"
  );
  expect(choiceType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.sectionTitle = "Grammar - Exercise 9";
  section.questionType = choiceType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(choiceType.defaultData))];

  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].items[0].correctAnswer = "wrong";
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/hai lựa chọn khác nhau/i);
});

test("Prepare reading comprehension reuses the 4-option long-text structure at one point per answer", () => {
  const readingType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "prepare-reading-comprehension"
  );
  expect(readingType).toBeTruthy();

  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.sectionTitle = "Reading";
  section.questionType = readingType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(readingType.defaultData))];
  section.questions[0].passage = "A reading passage about a space mission.";
  section.questions[0].questions = Array.from({ length: 5 }, (_, index) => ({
    questionText: `Question ${index + 1}`,
    options: ["A. first choice", "B. second choice", "C. third choice", "D. fourth choice"],
    correctAnswer: ["B", "A", "D", "B", "C"][index],
  }));

  expect(readingType.defaultData.questions).toHaveLength(5);
  expect(readingType.defaultData.questions[0].options).toHaveLength(4);
  expect(getQuestionCountForSection(section)).toBe(5);
  expect(countPrepareScoringUnitsForSection(section)).toBe(5);
  expect(getPrepareTotalPoints(parts)).toBe(5);
  expect(validateFlexiblePrepareReadingWritingParts(parts, { allowIncompleteScoring: true })).toBe("");

  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });
  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toBe("");

  section.questions[0].questions[0].options.pop();
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/4 lựa chọn/i);
});

test("incomplete Prepare Reading can be saved as a draft while empty numbered questions remain", () => {
  const readingType = getPrepareReadingWritingQuestionTypes().find(
    (type) => type.id === "prepare-reading-comprehension"
  );
  const parts = createFlexiblePrepareParts();
  const section = parts[0].sections[0];
  section.sectionTitle = "Reading";
  section.questionType = readingType.id;
  section.preparePointsPerAnswer = 1;
  section.questions = [JSON.parse(JSON.stringify(readingType.defaultData))];
  section.questions[0].passage = "A passage in progress.";
  section.questions[0].questions[0] = {
    questionText: "Question 46",
    options: ["A. first", "B. second", "C. third", "D. fourth"],
    correctAnswer: "B",
  };
  parts[0].sections.push({
    sectionTitle: "Other questions",
    questionType: "fill",
    preparePointsPerAnswer: 1,
    questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
  });

  expect(getPrepareTotalPoints(parts)).toBe(50);
  expect(validateFlexiblePrepareReadingWritingParts(parts)).toMatch(/4 lựa chọn/i);
  expect(validateFlexiblePrepareReadingWritingParts(parts, {
    allowIncompleteScoring: true,
    allowIncompleteContent: true,
  })).toBe("");
  expect(validateFlexiblePrepareReadingWritingParts(parts, {
    allowIncompleteScoring: true,
  })).toMatch(/4 lựa chọn/i);
});
