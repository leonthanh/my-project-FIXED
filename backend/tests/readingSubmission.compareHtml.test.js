const ReadingSubmissionRoutes = require('../routes/reading-submission');
const { getDetailedScoring } = require('../utils/readingScorer');

test('buildCompareHtml includes question context and student/expected values', () => {
  const sample = {
    passages: [
      {
        title: 'SnippetTitle',
        questions: [
          {
            questionType: 'ielts-matching-headings',
            questionNumber: 1,
            questionText: 'Match the headings below',
            paragraphs: [{ id: 'A' }, { id: 'B' }],
            headings: [{ label: 'i' }, { label: 'ii' }, { label: 'iii' }],
            answers: { A: 'iii', B: 'i' }
          }
        ]
      }
    ]
  };

  const answers = JSON.stringify({ q_1: JSON.stringify({ A: 'iii', B: 'i' }) });
  const details = getDetailedScoring(sample, answers);
  expect(details.length).toBe(2);

  // call the helper attached to router
  const fakeSubmission = { id: 999, testId: '1', userName: 'tester', correct: 2, total: 2, scorePercentage: 100 };
  const html = ReadingSubmissionRoutes.buildCompareHtml(fakeSubmission, details);
  expect(html).toContain('Match the headings below');
  expect(html).toContain('SnippetTitle');
  // should display student raw value and normalized label
  expect(html).toContain('iii');
});