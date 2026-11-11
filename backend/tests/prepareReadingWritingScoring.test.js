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

test("flexible Prepare scores both word-bank blanks independently and excludes the example", () => {
  const wordBankQuestion = {
    instruction: "Complete each sentence with a word from list A and a word from list B.",
    wordBanks: [
      { label: "A", words: ["add", "blow", "carry", "cut", "take", "work"] },
      { label: "B", words: ["away", "out", "up"] },
    ],
    example: {
      questionText: "We can't {1} {2} how to do it.",
      blankAnswers: ["work", "out"],
    },
    items: [
      { questionText: "Now {1} {2} these numbers.", blankAnswers: ["add", "up"] },
      { questionText: "Can you {1} {2} this?", blankAnswers: ["take", "away"] },
      { questionText: "We need to {1} {2} the paper.", blankAnswers: ["cut", "up"] },
      { questionText: "How do you {1} {2} the experiment?", blankAnswers: ["carry", "out"] },
      { questionText: "It might {1} {2}.", blankAnswers: ["blow", "up"] },
    ],
  };
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Vocabulary",
    sections: [
      {
        questionType: "word-bank-completion",
        preparePointsPerAnswer: 0.5,
        questions: [wordBankQuestion],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  wordBankQuestion.items.forEach((item, itemIndex) => {
    item.blankAnswers.forEach((answer, blankIndex) => {
      answers[`0-0-0-${itemIndex}-${blankIndex}`] = answer;
    });
  });
  answers["0-0-0-0-1"] = "wrong";
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(55);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49.5);
  expect(result.detailedResults["0-0-0-0-0"].earnedPoints).toBe(0.5);
  expect(result.detailedResults["0-0-0-0-1"].earnedPoints).toBe(0);
  expect(Object.keys(result.detailedResults)).toHaveLength(55);
});

test("flexible Prepare scores first-letter definition answers individually", () => {
  const definitionItems = [
    { questionText: "a piece of art made from stone or wood", correctAnswer: "sculpture" },
    { questionText: "a book about imaginary people", correctAnswer: "novel" },
    { questionText: "a building for showing works of art", correctAnswer: "gallery" },
    { questionText: "a room where an artist works", correctAnswer: "studio" },
    { questionText: "people who watch a performance", correctAnswer: "audience" },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Vocabulary",
    sections: [
      {
        questionType: "definition-completion",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Read the phrases and write the words. The first letter is given.",
          items: definitionItems,
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  definitionItems.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-0"] = "statue";
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-0"].correctAnswer).toBe("sculpture");
  expect(result.detailedResults["0-0-0-0"].earnedPoints).toBe(0);

  parts[0].sections[0].questions[0].items[0].correctAnswer = "sculpture|animal";
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores adjective formation and requires one extra word", () => {
  const adjectiveItems = [
    { questionText: "Doing exams every day for a month is very {1}.", correctAnswer: "stressful" },
    { questionText: "I like finding out about {1} events.", correctAnswer: "historical" },
    { questionText: "I couldn't think of an {1} idea.", correctAnswer: "original" },
    { questionText: "He isn't a {1} performer.", correctAnswer: "natural" },
    { questionText: "It's still quite {1}.", correctAnswer: "painful" },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Vocabulary",
    sections: [
      {
        questionType: "word-bank-adjective-formation",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Complete each sentence with the correct adjective form. There is one extra word.",
          wordBank: ["history", "stress", "colour", "pain", "origin", "nature"],
          items: adjectiveItems,
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  adjectiveItems.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-0"] = "stressfull";
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-0"].correctAnswer).toBe("stressful");
  expect(result.detailedResults["0-0-0-0"].questionNumber).toBe(1);
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);

  parts[0].sections[0].questions[0].wordBank.pop();
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores two conditional sections at half a point per blank", () => {
  const firstItems = [
    { questionText: "My friends {1} (not come) to the party if the music {2} (be) bad.", blankAnswers: ["won't come|will not come", "is"] },
    { questionText: "If you {1} (go) to Peru, you {2} (see) Machu Picchu.", blankAnswers: ["go", "will see"] },
    { questionText: "If you {1} (step) on an egg, you {2} (break) it.", blankAnswers: ["step", "will break"] },
    { questionText: "I {1} (not study) maths if I {2} (go) to university.", blankAnswers: ["won't study|will not study", "go"] },
    { questionText: "If you {1} (not tell) her, she {2} (not know) the truth.", blankAnswers: ["don't tell|do not tell", "won't know|will not know"] },
  ];
  const secondItems = [
    { questionText: "If it {1} (be) my birthday tomorrow, I {2} (ask) for a new computer.", blankAnswers: ["were", "would ask"] },
    { questionText: "I {1} (be) disappointed if I {2} (fail) my exams.", blankAnswers: ["would be", "failed"] },
    { questionText: "If I {1} (have) a pet, I {2} (not have) a parrot.", blankAnswers: ["had", "wouldn't have|would not have"] },
    { questionText: "If we {1} (get) a virus on this computer, it {2} (take) a long time to clean it.", blankAnswers: ["got", "would take"] },
    { questionText: "If you {1} (eat) more fresh fruit and vegetables, you {2} (feel) healthier.", blankAnswers: ["ate", "would feel"] },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Part 2",
    sections: [
      ...[firstItems, secondItems].map((items, index) => ({
        sectionTitle: index === 0 ? "First Conditional" : "Second Conditional",
        questionType: "conditional-sentence-completion",
        preparePointsPerAnswer: 0.5,
        questions: [{ instruction: "Complete the conditional sentences.", items }],
      })),
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 40 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  [firstItems, secondItems].forEach((items, sectionIndex) => {
    items.forEach((item, itemIndex) => {
      item.blankAnswers.forEach((answer, blankIndex) => {
        answers[`0-${sectionIndex}-0-${itemIndex}-${blankIndex}`] = answer.split("|")[0];
      });
    });
  });
  answers["0-0-0-0-0"] = "wrong";
  for (let index = 0; index < 40; index += 1) answers[`0-2-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(60);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49.5);
  expect(result.detailedResults["0-0-0-0-0"].questionNumber).toBe(1);
  expect(result.detailedResults["0-1-0-0-0"].questionNumber).toBe(6);
  expect(result.detailedResults["0-1-0-4-1"].questionNumber).toBe(10);
  expect(result.detailedResults["0-0-0-0-0"].maxPoints).toBe(0.5);

  parts[0].sections[0].questions[0].items[0].blankAnswers.pop();
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores reported commands one point each and excludes the example", () => {
  const commandItems = [
    { sourceText: "Dad said to us, 'You mustn't open that email. It's got a virus.'", sentenceStarter: "Dad", reportingVerb: "warn", correctAnswer: "warned us not to open that email" },
    { sourceText: "My friends said to me, 'Don't stop! You can finish the race. Not far now.'", sentenceStarter: "They", reportingVerb: "encourage", correctAnswer: "encouraged me to finish the race" },
    { sourceText: "The teacher said to the class, 'Everybody turn to page 34.'", sentenceStarter: "The teacher", reportingVerb: "tell", correctAnswer: "told the class to turn to page 34" },
    { sourceText: "He said to his friend, 'Please go shopping with me. You'll enjoy it.'", sentenceStarter: "He", reportingVerb: "persuade", correctAnswer: "persuaded his friend to go shopping with him" },
    { sourceText: "His mum said to him, 'Don't forget to pack your sunglasses.'", sentenceStarter: "His mum", reportingVerb: "remind", correctAnswer: "reminded him to pack his sunglasses" },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Part 2",
    sections: [
      {
        sectionTitle: "Grammar - Exercise 6",
        questionType: "reported-command-completion",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Complete the reported commands. Use the reporting verbs in brackets.",
          example: {
            sourceText: "My sister said to me, 'Can you do me a favour?'",
            sentenceStarter: "My sister",
            reportingVerb: "ask",
            correctAnswer: "asked me to do her a favour",
          },
          items: commandItems,
        }],
      },
      {
        questionType: "definition-completion",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Complete the definition.",
          items: [{ questionText: "people who watch a performance", correctAnswer: "audience" }],
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 44 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  commandItems.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-0"] = "warned us to open that email";
  answers["0-1-0-0"] = "audience";
  for (let index = 0; index < 44; index += 1) answers[`0-2-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-0"].correctAnswer).toBe("warned us not to open that email");
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);
  expect(result.detailedResults["0-1-0-0"].questionNumber).toBe(6);

  parts[0].sections[0].questions[0].items[0].sentenceStarter = "";
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores direct and reported speech transformations", () => {
  const items = [
    {
      sourceText: 'Alice said, “I love reading fashion magazines.”',
      targetPrefix: 'Alice said ',
      targetSuffix: '.',
      correctAnswer: 'she loved reading fashion magazines',
    },
    {
      sourceText: 'Billy said to me that “My sister can write really well.”',
      targetPrefix: 'Billy said to me that ',
      targetSuffix: '.',
      correctAnswer: 'his sister could write really well',
    },
    {
      sourceText: 'Tom said he didn’t want to go cycling.',
      targetPrefix: '“',
      targetSuffix: ',” said Tom.',
      correctAnswer: 'I don’t want to go cycling',
    },
    {
      sourceText: '“We won’t be late,” said the children.',
      targetPrefix: 'The children said ',
      targetSuffix: '.',
      correctAnswer: 'they wouldn’t be late',
    },
    {
      sourceText: 'We said that that new soap opera looked great.',
      targetPrefix: '“',
      targetSuffix: ',” said we.',
      correctAnswer: 'That new soap opera looks great',
    },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Part 2",
    sections: [
      {
        sectionTitle: "Grammar - Exercise 7",
        questionType: "reported-speech-transformation",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Complete the second sentence in reported speech or direct speech.",
          items,
        }],
      },
      {
        questionType: "definition-completion",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Complete the definition.",
          items: [{ questionText: "people who watch a performance", correctAnswer: "audience" }],
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 44 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  items.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-1"] = "his sister can write really well";
  answers["0-0-0-2"] = "I don't want to go cycling";
  answers["0-1-0-0"] = "audience";
  for (let index = 0; index < 44; index += 1) answers[`0-2-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-0"].correctAnswer).toBe("she loved reading fashion magazines");
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);
  expect(result.detailedResults["0-1-0-0"].questionNumber).toBe(6);

  parts[0].sections[0].questions[0].items[0].targetPrefix = "";
  parts[0].sections[0].questions[0].items[0].targetSuffix = "";
  expect(validatePrepareParts(parts)).toBe(false);
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

test("flexible Prepare rejects malformed word-bank question data", () => {
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Vocabulary",
    sections: [{
      questionType: "word-bank-completion",
      preparePointsPerAnswer: 1,
      questions: [{
        wordBanks: [{ label: "A", words: ["add"] }, { label: "B", words: ["up"] }],
        example: { questionText: "work {1} {2}", blankAnswers: ["work", "out"] },
        items: [{ questionText: "Complete {1}", blankAnswers: ["add", "up"] }],
      }],
    }],
  }];
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

test("flexible Prepare scores past simple passive rewrites and counts their question numbers", () => {
  const items = [
    { sourceText: "They built our school in 1985.", targetPrefix: "Our school ", targetSuffix: ".", correctAnswer: "was built in 1985" },
    { sourceText: "Vincent Van Gogh painted Sunflowers.", targetPrefix: "Sunflowers ", targetSuffix: ".", correctAnswer: "was painted by Vincent Van Gogh" },
    { sourceText: "Mary Quant designed mini-skirts in the 1960s.", targetPrefix: "Mini-skirts ", targetSuffix: ".", correctAnswer: "were designed by Mary Quant in the 1960s" },
    { sourceText: "People didn’t use the internet until the 1990s.", targetPrefix: "The internet ", targetSuffix: ".", correctAnswer: "wasn’t used until the 1990s" },
    { sourceText: "Did they make your shoes in Spain?", targetPrefix: "Were ", targetSuffix: "?", correctAnswer: "your shoes made in Spain" },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Grammar",
    sections: [
      {
        sectionTitle: "Exercise 8",
        questionType: "past-simple-passive-transformation",
        preparePointsPerAnswer: 1,
        questions: [{ instruction: "Rewrite the sentences in the past simple passive.", items }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  items.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-0"] = "wrong";
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);
  expect(result.detailedResults["0-0-0-4"].questionText).toBe(items[4].sourceText);

  parts[0].sections[0].questions[0].items[0].targetPrefix = "";
  parts[0].sections[0].questions[0].items[0].targetSuffix = "";
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores reported speech verb choices and excludes the example", () => {
  const options = ["said", "told"];
  const items = [
    { sentencePrefix: "The headmaster ", sentenceSuffix: " we would have 2 weeks off for Christmas.", correctAnswer: "said" },
    { sentencePrefix: "She ", sentenceSuffix: " she was doing a Science project.", correctAnswer: "said" },
    { sentencePrefix: "I ", sentenceSuffix: " my parents that I wanted to study in Scotland.", correctAnswer: "told" },
    { sentencePrefix: "The notice ", sentenceSuffix: " that they would cancel the football match because of the rain.", correctAnswer: "said" },
    { sentencePrefix: "Alice ", sentenceSuffix: " Maria that she could not meet her before the party.", correctAnswer: "told" },
  ];
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Grammar",
    sections: [
      {
        sectionTitle: "Exercise 9",
        questionType: "reported-speech-verb-choice",
        preparePointsPerAnswer: 1,
        questions: [{
          instruction: "Choose the correct word to complete the sentences.",
          options,
          example: {
            sentencePrefix: "He ",
            sentenceSuffix: " us we could open the window if we felt hot.",
            correctAnswer: "told",
          },
          items,
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  items.forEach((item, index) => {
    answers[`0-0-0-${index}`] = item.correctAnswer;
  });
  answers["0-0-0-3"] = "told";
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(49);
  expect(result.detailedResults["0-0-0-0"].questionNumber).toBe(1);
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);
  expect(result.detailedResults["0-0-0-4"].questionText).toBe(
    `${items[4].sentencePrefix}${items[4].sentenceSuffix}`
  );

  parts[0].sections[0].questions[0].items[0].correctAnswer = "wrong";
  expect(validatePrepareParts(parts)).toBe(false);
});

test("flexible Prepare scores reading comprehension with four choices at one point each", () => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    questionText: `Question ${index + 1}`,
    options: ["A. first choice", "B. second choice", "C. third choice", "D. fourth choice"],
    correctAnswer: ["B", "A", "D", "B", "C"][index],
  }));
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Reading",
    sections: [
      {
        sectionTitle: "Reading",
        questionType: "prepare-reading-comprehension",
        preparePointsPerAnswer: 1,
        questions: [{
          passage: "A reading passage about a space mission.",
          prepareReadingMode: true,
          gatewayReadingMode: true,
          questions,
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];
  const answers = {};
  questions.forEach((question, index) => {
    answers[`0-0-0-${index}`] = question.correctAnswer;
  });
  for (let index = 0; index < 45; index += 1) answers[`0-1-${index}`] = "yes";

  expect(validatePrepareParts(parts)).toBe(true);
  expect(countTotalQuestionsFromParts(parts)).toBe(50);
  const result = scoreTest({ testType: "gateway-reading-writing", parts }, answers);
  expect(result.total).toBe(50);
  expect(result.score).toBe(50);
  expect(result.detailedResults["0-0-0-4"].questionNumber).toBe(5);
  expect(result.detailedResults["0-0-0-4"].correctAnswer).toBe("C");

  parts[0].sections[0].questions[0].questions[0].correctAnswer = "E";
  expect(validatePrepareParts(parts)).toBe(false);
});

test("Prepare Reading permits incomplete question content only for drafts", () => {
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Reading",
    sections: [
      {
        sectionTitle: "Reading",
        questionType: "prepare-reading-comprehension",
        preparePointsPerAnswer: 1,
        questions: [{
          passage: "A passage in progress.",
          questions: [
            {
              questionText: "Question 46",
              options: ["A. first", "B. second", "C. third", "D. fourth"],
              correctAnswer: "B",
            },
            ...Array.from({ length: 4 }, () => ({
              questionText: "",
              options: ["A. ", "B. ", "C. ", "D. "],
              correctAnswer: "",
            })),
          ],
        }],
      },
      {
        questionType: "fill",
        preparePointsPerAnswer: 1,
        questions: Array.from({ length: 45 }, () => ({ questionText: "Question", correctAnswer: "yes" })),
      },
    ],
  }];

  expect(validatePrepareParts(parts)).toBe(false);
  expect(validatePrepareParts(parts, { allowIncompleteScoring: true })).toBe(false);
  expect(validatePrepareParts(parts, {
    allowIncompleteScoring: true,
    allowIncompleteContent: true,
  })).toBe(true);

  parts[0].sections[0].questions[0].questions = [];
  expect(validatePrepareParts(parts, {
    allowIncompleteScoring: true,
    allowIncompleteContent: true,
  })).toBe(false);
});

test("Prepare story-writing validates editor prompt fields", () => {
  const parts = [{
    examFormat: "prepare-reading-writing-v2",
    title: "Part 4",
    sections: [{
      sectionTitle: "Writing",
      questionType: "story-writing",
      preparePointsPerAnswer: 1,
      questions: [{
        prepareWritingMode: true,
        title: "Katie's letter",
        instructions: "Write a reply to Katie's letter. Write about 80 words.",
        story: "I don't know what to do this weekend.",
        questions: [],
      }],
    }],
  }];

  expect(validatePrepareParts(parts, { allowIncompleteScoring: true })).toBe(true);
  parts[0].sections[0].questions[0].instructions = "";
  parts[0].sections[0].questions[0].story = "";
  expect(validatePrepareParts(parts, { allowIncompleteScoring: true })).toBe(false);
});
