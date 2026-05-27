import {
  getListeningTableBlankEntries,
  mergeListeningTableAnswers,
} from '../clozeTableSchema';

describe('clozeTableSchema', () => {
  test('reads blank entries from clozeTable when top-level rows and columns are empty', () => {
    const question = {
      questionType: 'cloze-test',
      answers: {
        '8': 'Julie Bennett|Julie Bennet',
        '9': '17th July|17 July',
      },
      columns: [],
      rows: [],
      clozeTable: {
        title: 'Contacts',
        instruction: 'Write NO MORE THAN TWO WORDS for each answer.',
        columns: ['Field', 'Value'],
        rows: [
          {
            cells: ['Name(s)', '[BLANK]'],
            cellBlankAnswers: [[], ['Legacy value']],
          },
          {
            cells: ['Date of departure', '[BLANK]'],
            cellBlankAnswers: [[], ['Another legacy value']],
          },
        ],
      },
    };

    expect(getListeningTableBlankEntries(question, 8)).toEqual([
      {
        num: 8,
        expected: 'Julie Bennett|Julie Bennet',
      },
      {
        num: 9,
        expected: '17th July|17 July',
      },
    ]);
  });

  test('merges answers from clozeTable row blank data when answer map is missing', () => {
    const question = {
      questionType: 'cloze-test',
      columns: [],
      rows: [],
      clozeTable: {
        title: 'Travel details',
        instruction: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        columns: ['Field', 'Value'],
        rows: [
          {
            cells: ['Emergency contact number', '[BLANK]'],
            cellBlankAnswers: [[], ['0793245098|07 9324 5098']],
          },
        ],
      },
    };

    const merged = mergeListeningTableAnswers(question, 7);

    expect(merged.question.answers).toEqual({
      '7': '0793245098|07 9324 5098',
    });
    expect(merged.nextQuestionNumber).toBe(8);
  });
});