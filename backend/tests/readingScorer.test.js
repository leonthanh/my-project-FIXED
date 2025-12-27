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

if (require.main === module) {
  // Simple run assertions
  const r1 = scoreReadingTest(sampleTest, answersAllCorrect);
  console.log('All correct =>', r1);
  const r2 = scoreReadingTest(sampleTest, answersSome);
  console.log('Some correct =>', r2);
}

module.exports = { sampleTest, answersAllCorrect, answersSome };
