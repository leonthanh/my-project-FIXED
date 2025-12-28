const { getDetailedScoring, scoreReadingTest } = require('../utils/readingScorer');

const sample = {
  passages: [
    {
      questions: [
        { questionType: 'paragraph-matching', questionNumber: 14, questionText: '... a rejected explanation ...', correctAnswer: 'C' },
        { questionType: 'multiple-choice', questionNumber: 24, options: ['They have learned','They realise','They do not think people in cars are living creatures','They do not want to'], correctAnswer: 'C' },
        { questionType: 'sentence-completion', questionNumber: 27, options: ['A','B','C','D','E','F','G','H'], correctAnswer: 'the medical uses of a particular tree' }
      ]
    }
  ]
};

const answers = {
  q_14_0: 'C',
  q_24: 'They do not think people in cars are living creatures.',
  q_27: 'E'
};

const details = getDetailedScoring(sample, answers);
console.log('Details:', JSON.stringify(details, null, 2));
const s = scoreReadingTest(sample, answers);
console.log('Score summary:', s);
