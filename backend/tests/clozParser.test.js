const { normalizeQuestion, processTestParts } = require('../utils/clozParser');

test("normalizeQuestion: renames 'answer' to 'correctAnswer'", () => {
  const q = {
    index: 1,
    questionText: 'What is the answer?',
    answer: 'C',
    options: ['A', 'B', 'C'],
  };

  const normalized = normalizeQuestion(q);
  expect(normalized.answer).toBeUndefined();
  expect(normalized.correctAnswer).toBe('C');
});

test('normalizeQuestion: preserves existing correctAnswer', () => {
  const q = {
    index: 2,
    questionText: 'What is the correct answer?',
    correctAnswer: 'B',
    options: ['A', 'B', 'C'],
  };

  const normalized = normalizeQuestion(q);
  expect(normalized.correctAnswer).toBe('B');
});

test('processTestParts: normalizes questions across parts', () => {
  const parts = [
    {
      partIndex: 0,
      sections: [
        {
          questionType: 'long-text-mc',
          questions: [
            { questionText: 'Q1', answer: 'A' },
            { questionText: 'Q2', answer: 'B' },
          ],
        },
      ],
    },
    {
      partIndex: 1,
      sections: [
        {
          questionType: 'cloze-test',
          questions: [
            { questionText: 'Q3', answer: 'about', passageText: 'Test (3) passage' },
          ],
        },
      ],
    },
  ];

  const processed = processTestParts(parts);

  expect(processed[0].sections[0].questions[0].answer).toBeUndefined();
  expect(processed[0].sections[0].questions[0].correctAnswer).toBe('A');

  expect(processed[1].sections[0].questions[0].answer).toBeUndefined();
  expect(processed[1].sections[0].questions[0].correctAnswer).toBe('about');
});
