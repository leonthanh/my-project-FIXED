import { normalizeAnswer, isAnswerCorrect, levenshtein } from '../answerUtils';

test('normalize removes diacritics and punctuation and lowercases', () => {
  expect(normalizeAnswer('Ánh, Đây!')).toBe('anh day');
  expect(normalizeAnswer('  Hello---World  ')).toBe('hello world');
});

test('levenshtein basic', () => {
  expect(levenshtein('kitten','sitting')).toBe(3);
  expect(levenshtein('abc','abc')).toBe(0);
});

test('isAnswerCorrect exact and fuzzy', () => {
  expect(isAnswerCorrect('compressed', 'compressed')).toBe(true);
  expect(isAnswerCorrect('ice crystals', 'ice crystals')).toBe(true);
  // allow case and diacritics
  expect(isAnswerCorrect('tiny droplets', 'Tiny | Droplets')).toBe(true);
  // small typo allowed
  expect(isAnswerCorrect('compress', 'comprees')).toBe(true);
  // not correct
  expect(isAnswerCorrect('apple', 'banana')).toBe(false);
});
