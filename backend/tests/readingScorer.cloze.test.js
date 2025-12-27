const { scoreReadingTest, getDetailedScoring } = require('../utils/readingScorer');

test('Cloze: accepts answers keyed by q_<base>_<i>', () => {
  const sample = {
    passages: [{
      questions: [{
        questionType: 'cloze-test',
        questionNumber: 11,
        paragraphText: '... 11 [BLANK] 12 [BLANK] 13 [BLANK] ...',
        blanks: [ { correctAnswer: 'air' }, { correctAnswer: 'tiny droplets' }, { correctAnswer: 'ice crystals' } ]
      }]
    }]
  };

  const answers = {
    q_11_0: 'air',
    q_11_1: 'tiny droplets',
    q_11_2: 'ice crystals'
  };

  const r = scoreReadingTest(sample, answers);
  expect(r.total).toBe(3);
  expect(r.correct).toBe(3);

  const details = getDetailedScoring(sample, answers);
  expect(details.length).toBe(3);
  expect(details.every(d => d.isCorrect)).toBe(true);
});

test('Cloze: accepts answers keyed by <pIndex>_<qIndex>_<i> (frontend DoReadingTest style)', () => {
  const sample = {
    passages: [{
      questions: [{ questionType: 'cloze-test', questionNumber: 11, paragraphText: '...[BLANK]...[BLANK]...[BLANK]...', blanks:[{correctAnswer:'air'},{correctAnswer:'tiny droplets'},{correctAnswer:'ice crystals'}] }]
    }]
  };

  // Simulate frontend key like "0_0_0", which includes question number hint in UI
  const answers = {
    '0_0_0': 'air',
    '0_0_1': 'tiny droplets',
    '0_0_2': 'ice crystals',
    // Also include some other keys that mention the question number to simulate mismatch
    'q_11_0': '',
  };

  const r = scoreReadingTest(sample, answers);
  expect(r.total).toBe(3);
  expect(r.correct).toBe(3);

  const details = getDetailedScoring(sample, answers);
  expect(details.length).toBe(3);
  expect(details.every(d => d.isCorrect)).toBe(true);
});