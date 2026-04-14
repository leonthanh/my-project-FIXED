const { scoreListening, bandFromCorrect } = require('../utils/listeningScorer');

test('bandFromCorrect returns expected thresholds', () => {
  expect(bandFromCorrect(39)).toBe(9);
  expect(bandFromCorrect(20)).toBe(5.5);
  expect(bandFromCorrect(10)).toBe(4);
});

test('scoreListening counts correct and total for simple flat questions', () => {
  const testDef = {
    questions: [
      { globalNumber: 1, correctAnswer: 'A' },
      { globalNumber: 2, correctAnswer: 'B' },
    ],
  };

  const answers = { q1: 'A', q2: 'C' };
  const res = scoreListening({ test: testDef, answers });
  expect(res.totalCount).toBe(2);
  expect(res.correctCount).toBe(1);
  expect(res.details).toHaveLength(2);
  expect(res.details[0].isCorrect).toBe(true);
  expect(res.details[1].isCorrect).toBe(false);
});

test('scoreListening supports canonical cloze-test table sections', () => {
  const testDef = {
    partInstructions: [
      {
        sections: [
          { questionType: 'cloze-test', startingQuestionNumber: 11 },
        ],
      },
    ],
    questions: [
      {
        partIndex: 0,
        sectionIndex: 0,
        questionIndex: 0,
        questionType: 'cloze-test',
        tableMode: true,
        title: 'Travel options',
        instruction: 'Write NO MORE THAN TWO WORDS.',
        clozeTable: {
          title: 'Travel options',
          instruction: 'Write NO MORE THAN TWO WORDS.',
          columns: ['Type', 'Cost', 'Comments'],
          rows: [
            {
              cells: ['Bus', '[BLANK] dollars', 'bring [BLANK]'],
              cellBlankAnswers: [[], ['12'], ['water']],
            },
          ],
        },
      },
    ],
  };

  const answers = { q11: '12', q12: 'water' };
  const res = scoreListening({ test: testDef, answers });

  expect(res.totalCount).toBe(2);
  expect(res.correctCount).toBe(2);
  expect(res.details).toHaveLength(2);
  expect(res.details.every((detail) => detail.questionType === 'cloze-test')).toBe(true);
});
