const { scoreReadingTest, getDetailedScoring } = require('../utils/readingScorer');

test('IELTS matching-headings: scores correctly when stored as labels', () => {
  const sample = {
    passages: [
      {
        questions: [
          {
            questionType: 'ielts-matching-headings',
            paragraphs: [{ id: 'A' }, { id: 'B' }],
            headings: [{ label: 'i' }, { label: 'ii' }, { label: 'iii' }, { label: 'iv' }, { label: 'v' }],
            answers: { A: 'v', B: 'iii' }
          }
        ]
      }
    ]
  };

  const answers = {
    // student answers stored as JSON with paragraphId -> headingLabel (same format as editor)
    q_1: JSON.stringify({ A: 'v', B: 'iii' })
  };

  const r = scoreReadingTest(sample, answers);
  expect(r.total).toBe(2);
  expect(r.correct).toBe(2);

  const details = getDetailedScoring(sample, answers);
  expect(details.every(d => d.isCorrect)).toBe(true);
});

test('IELTS matching-headings: accepts numeric index student answers (0-based) and counts correct', () => {
  const sample = {
    passages: [
      {
        questions: [
          {
            questionType: 'ielts-matching-headings',
            paragraphs: [{ id: 'A' }, { id: 'B' }],
            headings: [{ label: 'i' }, { label: 'ii' }, { label: 'iii' }, { label: 'iv' }, { label: 'v' }],
            answers: { A: 'v', B: 'iii' }
          }
        ]
      }
    ]
  };

  // Student used numeric indices (0 => i, 2 => iii, 4 => v). We'll provide 4 for A (index 4 -> 'v') and 2 for B (index 2 -> 'iii').
  const answers = {
    q_1: JSON.stringify({ A: '4', B: '2' })
  };

  const r = scoreReadingTest(sample, answers);
  expect(r.total).toBe(2);
  expect(r.correct).toBe(2);
});