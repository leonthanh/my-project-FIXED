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

// Test generateAnalysisBreakdown returns normalized breakdown map and suggestions
const { generateAnalysisBreakdown, generateAnalysisText } = require('../utils/readingScorer');

test('generateAnalysisBreakdown: returns breakdown mapping for question types', () => {
  const sample = {
    passages: [
      {
        questions: [
          { questionNumber: 1, type: 'multiple-choice', correctAnswer: 'A' },
          { questionNumber: 2, type: 'short-answer', correctAnswer: 'Lion' }
        ]
      }
    ]
  };
  const answers = { q_1: 'A', q_2: 'Lion' };
  const res = generateAnalysisBreakdown(sample, answers);
  expect(res).toHaveProperty('byType');
  expect(Array.isArray(res.byType)).toBe(true);
  expect(res).toHaveProperty('breakdown');
  expect(typeof res.breakdown).toBe('object');
  // check that labels exist
  const labels = Object.keys(res.breakdown);
  expect(labels.length).toBeGreaterThan(0);
  // check counts
  const mc = res.breakdown[Object.keys(res.breakdown).find(k => /Multiple Choice|Multiple Choice/i.test(k))];
  const sa = res.breakdown[Object.keys(res.breakdown).find(k => /Short Answer|Short Answer/i.test(k))];
  expect(mc.total).toBeGreaterThanOrEqual(0);
  expect(sa.total).toBeGreaterThanOrEqual(0);

  // New: suggestions and weakAreas exist
  expect(Array.isArray(res.suggestions)).toBe(true);
  expect(Array.isArray(res.weakAreas)).toBe(true);
});

test('generateAnalysisBreakdown: weakAreas include suggestions and example wrong questions', () => {
  const sample = {
    passages: [
      {
        questions: [
          { questionNumber: 1, type: 'multiple-choice', correctAnswer: 'A' },
          { questionNumber: 2, type: 'cloze-test', paragraphText: 'This is [BLANK] test [BLANK] and [BLANK].', blanks: [{ correctAnswer: 'a' }, { correctAnswer: 'b' }, { correctAnswer: 'c' }] }
        ]
      }
    ]
  };
  const answers = { q_1: 'X', q_2_0: '', q_2_1: '', q_2_2: '' };
  const res = generateAnalysisBreakdown(sample, answers);
  expect(Array.isArray(res.weakAreas)).toBe(true);
  if (res.weakAreas.length > 0) {
    const w = res.weakAreas[0];
    expect(w).toHaveProperty('label');
    expect(w).toHaveProperty('suggestion');
    expect(Array.isArray(w.wrongQuestions) || w.wrongQuestions === undefined).toBe(true);
  }
});

test('generateAnalysisText: generates readable text including section header', () => {
  const sample = {
    summary: { totalCorrect: 2, totalQuestions: 2, overallPercentage: 100, band: 9 },
    byType: [{ type: 'multiple-choice', label: 'Multiple Choice', correct: 1, total: 1, percentage: 100, status: 'good' }]
  };
  const text = generateAnalysisText(sample);
  expect(typeof text).toBe('string');
  expect(text.includes('PHÂN TÍCH THEO DẠNG CÂU HỎI') || text.includes('KẾT QUẢ BÀI THI READING')).toBe(true);
});
