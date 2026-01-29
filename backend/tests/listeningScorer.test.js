const { scoreListening, bandFromCorrect } = require('../utils/listeningScorer');

test('bandFromCorrect returns expected thresholds', () => {
  expect(bandFromCorrect(39)).toBe(9);
  expect(bandFromCorrect(20)).toBe(5.5);
  expect(bandFromCorrect(10)).toBe(4);
});

test('scoreListening counts correct and total for simple flat questions', () => {
  const testDef = {
    questions: [
      { globalNumber: 1, correctAnswer: 'A' },
      { globalNumber: 2, correctAnswer: 'B' },
    ],
  };

  const answers = { q1: 'A', q2: 'C' };
  const res = scoreListening({ test: testDef, answers });
  expect(res.totalCount).toBe(2);
  expect(res.correctCount).toBe(1);
  expect(res.details).toHaveLength(2);
  expect(res.details[0].isCorrect).toBe(true);
  expect(res.details[1].isCorrect).toBe(false);
});
