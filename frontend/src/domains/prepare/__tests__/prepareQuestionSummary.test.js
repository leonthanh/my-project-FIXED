import {
  getPrepareQuestionSummaryStatuses,
  summarizePrepareQuestionResults,
} from '../prepareQuestionSummary';

const parts = [{
  sections: [
    {
      questionType: 'conditional-sentence-completion',
      questions: [{
        items: [{ blankAnswers: ["won't come|will not come", 'is'] }],
      }],
    },
    {
      questionType: 'reported-speech-transformation',
      questions: [{
        items: [
          { correctAnswer: "don't want to go cycling" },
          { correctAnswer: 'looks great' },
        ],
      }],
    },
  ],
}];

test('uses current Prepare answers for grouped question summary statuses', () => {
  const statuses = getPrepareQuestionSummaryStatuses(
    parts,
    {
      '0-0-0-0-0': 'won’t come',
      '0-0-0-0-1': 'is',
      '0-1-0-0': 'don’t want to go cycling',
      '0-1-0-1': 'looks great',
    },
    {
      '0-0-0-0-0': { questionNumber: 16, isCorrect: false },
      '0-0-0-0-1': { questionNumber: 16, isCorrect: true },
      '0-1-0-0': { questionNumber: 33, isCorrect: false },
      '0-1-0-1': { questionNumber: 35, isCorrect: false },
    }
  );

  expect(statuses.get(16)).toBe(true);
  expect(statuses.get(33)).toBe(true);
  expect(statuses.get(35)).toBe(true);
});

test('marks a grouped Prepare question wrong when one blank is incorrect', () => {
  const statuses = getPrepareQuestionSummaryStatuses(
    parts,
    {
      '0-0-0-0-0': 'won’t come',
      '0-0-0-0-1': 'was',
    },
    {
      '0-0-0-0-0': { questionNumber: 16 },
      '0-0-0-0-1': { questionNumber: 16 },
    }
  );

  expect(statuses.get(16)).toBe(false);
});

test('scores mapped Prepare questions once and excludes pending writing from the total', () => {
  const questionResults = Array.from({ length: 50 }, (_, index) => ({
    questionNum: index + 1,
    result: { isCorrect: true, userAnswer: 'answer' },
  }));
  questionResults.push({
    questionNum: 51,
    result: { questionType: 'short-message', isCorrect: null, userAnswer: 'essay' },
  });

  expect(summarizePrepareQuestionResults(questionResults)).toEqual({
    score: 50,
    total: 50,
    percentage: 100,
    correct: 50,
    wrong: 0,
    unanswered: 0,
  });
});
