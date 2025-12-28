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

// New test: short-answer accepts one-of variants
test('Short answer: accepts one-of variants separated by | or /', () => {
  const sample = { passages: [{ questions: [{ questionType: 'short-answer', questionNumber: 9, questionText: 'Fill in: water is atomised into ______', correctAnswer: 'tiny | droplets' }] }] };
  const answers = { q_9: 'tiny' };
  const details = getDetailedScoring(sample, answers);
  expect(details.length).toBe(1);
  expect(details[0].student).toBe('tiny');
  expect(details[0].studentLabel).toBe('tiny');
  expect(details[0].expectedLabel).toContain('tiny');
  expect(details[0].isCorrect).toBe(true);
});

// New test: cloze/blank shouldn't pick up object mappings from other keys
test('Cloze: does not treat object mapping values as blank answers', () => {
  const sample = { passages: [{ questions: [ { questionType: 'ielts-matching-headings', questionNumber: 1, paragraphs: [{ id: 'A' }, { id: 'B' }], headings: [{ label: 'i' }, { label: 'ii' }], answers: { A: 'i', B: 'ii' } }, { questionType: 'cloze-test', questionNumber: 12, paragraphText: '... [BLANK] ...', blanks: [{ correctAnswer: 'insulation' }] } ] }] };
  // answers contains only a mapping object under q_1 (should not be used for question 12 blank)
  const answers = { q_1: { A: 'i', B: 'ii' } };
  const details = getDetailedScoring(sample, answers);
  const cloze = details.find(d => d.questionNumber === 12);
  expect(cloze.student).toBe('');
  expect(cloze.isCorrect).toBe(false);
});

// Regression test: a later blank (q 38) should NOT pick q_11_0 value (e.g., q_11_0='energy')
test('Blank matching should not pick answers from other question blanks with same _<index> suffix', () => {
  const sample = { passages: [{ questions: [
    { questionType: 'short-answer', questionNumber: 11, paragraphText: '... [BLANK] ...', blanks: [{ correctAnswer: 'energy' }] },
    { questionType: 'short-answer', questionNumber: 38, paragraphText: '... [BLANK] ...', blanks: [{ correctAnswer: 'E' }] }
  ] }] };

  const answers = { q_11_0: 'energy' };
  const details = getDetailedScoring(sample, answers);
  const blank38 = details.find(d => d.questionNumber === 38);
  expect(blank38.student).toBe('');
  expect(blank38.isCorrect).toBe(false);
});

// Grouped question numbers (e.g., '11,12,130') should map to q_<base>_<i> keys (e.g., q_11_0)
test('Grouped questionNumber uses base numeric and maps blanks to q_<base>_<i>', () => {
  const sample = { passages: [{ questions: [
    {
      questionType: 'cloze-test',
      questionNumber: '11,12,130',
      paragraphText: '[BLANK] [BLANK] [BLANK]',
      blanks: [ { correctAnswer: 'energy' }, { correctAnswer: 'insulation' }, { correctAnswer: 'aircraft' } ]
    }
  ] }] };

  const answers = { q_11_0: 'energy', q_11_1: 'insulation', q_11_2: 'aircraft' };
  const details = getDetailedScoring(sample, answers);
  // find the three blanks (they should have the same displayed questionNumber)
  const blanks = details.filter(d => String(d.questionNumber).includes('11'));
  expect(blanks.length).toBe(3);
  expect(blanks[0].student).toBe('energy');
  expect(blanks[0].studentLabel).toBe('energy');
  expect(blanks[0].isCorrect).toBe(true);
  expect(blanks[1].student).toBe('insulation');
  expect(blanks[2].student).toBe('aircraft');
});