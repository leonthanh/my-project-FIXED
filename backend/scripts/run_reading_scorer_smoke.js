const { scoreReadingTest, getDetailedScoring } = require('../utils/readingScorer');

function run() {
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

  const cases = [
    { name: 'stringified', answers: { q_1: JSON.stringify({ A: 'v', B: 'iii' }) } },
    { name: 'object', answers: { q_1: { A: 'v', B: 'iii' } } },
    { name: 'numeric-index', answers: { q_1: JSON.stringify({ A: '4', B: '2' }) } }
  ];

  for (const c of cases) {
    const r = scoreReadingTest(sample, c.answers);
    const details = getDetailedScoring(sample, c.answers);
    console.log('Case:', c.name, '-> total:', r.total, 'correct:', r.correct);
    console.log('Details:', details);
  }

  // cloze single-blank q_8
  const clozeSample = {
    passages: [{ questions: [{ questionType: 'cloze-test', questionNumber: 8, paragraphText: '... [BLANK] ...', blanks: [{ correctAnswer: 'compressed' }] }] }]
  };
  const r2 = scoreReadingTest(clozeSample, { q_8: 'compressed' });
  console.log('Cloze q_8 -> total:', r2.total, 'correct:', r2.correct);
  console.log('Cloze details:', getDetailedScoring(clozeSample, { q_8: 'compressed' }));
}

run();
