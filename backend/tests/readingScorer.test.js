const { scoreReadingTest, bandFromCorrect } = require('../utils/readingScorer');

// Simple unit tests
const sampleTest = {
  passages: [
    {
      index: 1,
      passageTitle: 'Passage 1',
      questions: [
        { type: 'multiple-choice', questionText: 'Q1', correctAnswer: 'A' },
        { type: 'multiple-choice', questionText: 'Q2', correctAnswer: 'B' },
        { type: 'multiple-choice', questionText: 'Q3', correctAnswer: 'C' }
      ]
    },
    {
      index: 2,
      passageTitle: 'Passage 2',
      questions: [
        { type: 'multiple-choice', questionText: 'Q4', correctAnswer: 'D' },
        { type: 'multiple-choice', questionText: 'Q5', correctAnswer: 'A' }
      ]
    }
  ]
};

const answersAllCorrect = { q_1: 'A', q_2: 'B', q_3: 'C', q_4: 'D', q_5: 'A' };
const answersSome = { q_1: 'A', q_2: 'X', q_3: 'C', q_4: 'D', q_5: '' };

test('scoreReadingTest: counts total and correct (all correct)', () => {
  const r = scoreReadingTest(sampleTest, answersAllCorrect);
  expect(r.total).toBe(5);
  expect(r.correct).toBe(5);
});

test('scoreReadingTest: counts total and correct (some correct)', () => {
  const r = scoreReadingTest(sampleTest, answersSome);
  expect(r.total).toBe(5);
  expect(r.correct).toBe(3);
});

test('bandFromCorrect: returns expected band thresholds', () => {
  expect(bandFromCorrect(39)).toBe(9);
  expect(bandFromCorrect(20)).toBe(5.5);
  expect(bandFromCorrect(10)).toBe(4);
});
