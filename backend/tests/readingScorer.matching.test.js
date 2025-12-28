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

// New test: student answers stored as OBJECT (not stringified JSON)
test('IELTS matching-headings: accepts object-form student answers (not stringified) and counts correct', () => {
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

  // Student answers provided as an object under q_1
  const answers = {
    q_1: { A: 'v', B: 'iii' }
  };

  const r = scoreReadingTest(sample, answers);
  expect(r.total).toBe(2);
  expect(r.correct).toBe(2);

  const details = getDetailedScoring(sample, answers);
  expect(details.every(d => d.isCorrect)).toBe(true);
});

// New test: handles mismatch where student stored under q_1 but the scorer's qCounter for the block is larger
test('IELTS matching-headings: finds matching-headings answers stored under q_<questionNumber> or in other keys when qCounter differs', () => {
  // create 69 dummy questions so the matching block starts at qCounter=70
  const dummyQ = () => ({ questionType: 'multiple-choice', correctAnswer: '' });
  const sample = { passages: [{ questions: Array.from({length:69}, () => dummyQ()).concat([{
    questionType: 'ielts-matching-headings',
    questionNumber: 1,
    paragraphs: [{ id: 'A' }, { id: 'B' }],
    headings: [{ label: 'i' }, { label: 'ii' }, { label: 'iii' }, { label: 'iv' }, { label: 'v' }],
    answers: { A: 'v', B: 'iii' }
  }]) }] };

  // Student saved under q_1 (editor-local numbering) while scorer qCounter for block is 70
  const answers = { q_1: JSON.stringify({ A: 'v', B: 'iii' }) };

  const details = getDetailedScoring(sample, answers);
  expect(details.filter(d => d.isCorrect).length).toBe(2);
});

// Handles top-level JSON-string owned submissions where values themselves are stringified JSON
test('IELTS matching-headings: accepts top-level stringified answers and nested stringified student mapping', () => {
  const sample = {
    passages: [
      {
        title: 'Passage Title Sample',
        questions: [
          {
            questionType: 'ielts-matching-headings',
            questionText: 'Match the headings below',
            paragraphs: [{ id: 'A' }, { id: 'B' }],
            headings: [{ label: 'i' }, { label: 'ii' }, { label: 'iii' }, { label: 'iv' }, { label: 'v' }],
            answers: { A: 'v', B: 'iii' }
          }
        ]
      }
    ]
  };

  // Submission stored as a JSON string with q_1 value being a JSON-string
  const answers = JSON.stringify({ q_1: JSON.stringify({ A: 'v', B: 'iii' }) });

  const details = getDetailedScoring(sample, answers);
  expect(details.length).toBe(2);
  expect(details.every(d => d.isCorrect)).toBe(true);
  expect(details[0].questionText).toBe('Match the headings below');
  expect(Array.isArray(details[0].headings)).toBe(true);
  expect(details[0].passageSnippet).toContain('Passage Title Sample');
});