const {
  formatChoiceList,
  isAnswerMatch,
  normalizeChoiceIndices,
} = require('../utils/listeningAnswerMatching');

describe('listening answer matching', () => {
  test('accepts answer variants and equivalent spoken or numeric values', () => {
    expect(isAnswerMatch('  TWELVE ', '11|12')).toBe(true);
    expect(isAnswerMatch('21', 'twenty-one')).toBe(true);
    expect(isAnswerMatch('main hall', 'main  hall')).toBe(true);
  });

  test('normalizes multiple-choice labels to zero-based answer indices', () => {
    const indices = normalizeChoiceIndices('A, C');

    expect(indices).toEqual([0, 2]);
    expect(formatChoiceList(indices)).toBe('A, C');
  });
});
