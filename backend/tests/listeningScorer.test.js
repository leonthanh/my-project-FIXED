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

test('scoreListening keeps slash answers literal and only accepts pipe-separated variants', () => {
  const testDef = {
    partInstructions: [
      {
        sections: [
          { questionType: 'cloze-test', startingQuestionNumber: 1 },
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
        clozeTable: {
          columns: ['Field', 'Value'],
          rows: [
            {
              cells: ['Date of birth', '[BLANK]'],
              cellBlankAnswers: [[], ['23/07/1970']],
            },
            {
              cells: ['Port', '[BLANK]'],
              cellBlankAnswers: [[], ['harbour|harbor']],
            },
            {
              cells: ['Legacy format', '[BLANK]'],
              cellBlankAnswers: [[], ['centre/center']],
            },
          ],
        },
      },
    ],
  };

  const answers = { q1: '23/07/1970', q2: 'harbor', q3: 'center' };
  const res = scoreListening({ test: testDef, answers });

  expect(res.totalCount).toBe(3);
  expect(res.correctCount).toBe(2);
  expect(res.details.map((detail) => detail.isCorrect)).toEqual([true, true, false]);
});

test('scoreListening ignores stale answer keys for notes-completion', () => {
  const testDef = {
    partInstructions: [
      {
        sections: [
          { sectionTitle: 'Questions 31-40', questionType: 'notes-completion', startingQuestionNumber: 31 },
        ],
      },
    ],
    questions: [
      {
        partIndex: 0,
        sectionIndex: 0,
        questionIndex: 0,
        questionType: 'notes-completion',
        notesText: '- one ___\n- two ___\n- three ___\n- four ___\n- five ___\n- six ___\n- seven ___\n- eight ___\n- nine ___\n- ten ___',
        answers: { 28: 'stale', 31: 'a', 32: 'b', 33: 'c', 34: 'd', 35: 'e', 36: 'f', 37: 'g', 38: 'h', 39: 'i', 40: 'j' },
      },
    ],
  };

  const answers = {
    q31: 'a', q32: 'b', q33: 'c', q34: 'd', q35: 'e', q36: 'f', q37: 'g', q38: 'h', q39: 'i', q40: 'j',
  };
  const res = scoreListening({ test: testDef, answers });

  expect(res.totalCount).toBe(10);
  expect(res.correctCount).toBe(10);
  expect(res.details.map((d) => d.questionNumber)).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40]);
});
