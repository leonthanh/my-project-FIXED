import {
  extractClozeTableBlanks,
  getClozeTableCellLines,
  hydrateClozeTableRowsFromBlanks,
} from '../clozeTable';

describe('clozeTable helpers', () => {
  it('hydrates legacy reading blanks into per-cell and per-line table answers', () => {
    const rows = [
      {
        cells: ['A [BLANK]\nB [BLANK]', '1. first [BLANK]\n- second [BLANK]'],
      },
    ];

    const hydrated = hydrateClozeTableRowsFromBlanks(rows, ['Findings', 'Comments'], [
      { correctAnswer: 'alpha' },
      { correctAnswer: 'beta' },
      { correctAnswer: 'gamma' },
      { correctAnswer: 'delta' },
    ]);

    expect(hydrated[0].cellBlankAnswers[0]).toEqual(['alpha', 'beta']);
    expect(hydrated[0].commentBlankAnswers).toEqual([['gamma'], ['delta']]);
  });

  it('extracts table blanks in the same row-major order used by the renderer', () => {
    const blanks = extractClozeTableBlanks(
      [
        {
          cells: ['A [BLANK]', 'first [BLANK]\nsecond [BLANK]'],
          cellBlankAnswers: [['alpha']],
          commentBlankAnswers: [['beta'], ['gamma']],
        },
      ],
      ['Findings', 'Comments']
    );

    expect(blanks.map((blank) => blank.correctAnswer)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('parses comment lines as list items and keeps multiline text cells separated', () => {
    const commentLines = getClozeTableCellLines('- bring cash\n2. seats fill up fast', 'Comments');
    const textLines = getClozeTableCellLines('Line one\nLine two [BLANK]', 'Findings');

    expect(commentLines).toHaveLength(2);
    expect(commentLines[0]).toEqual([{ type: 'text', value: 'bring cash' }]);
    expect(commentLines[1]).toEqual([{ type: 'text', value: 'seats fill up fast' }]);

    expect(textLines).toHaveLength(2);
    expect(textLines[0]).toEqual([{ type: 'text', value: 'Line one' }]);
    expect(textLines[1]).toEqual([
      { type: 'text', value: 'Line two ' },
      { type: 'blank', raw: '[BLANK]' },
    ]);
  });
});