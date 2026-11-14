const normalizeAnswer = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/[\u2018\u2019\u201B\u02BC]/g, "'")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/[.]+$/, '');

export const getAcceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalizeAnswer).filter(Boolean)
    : String(value ?? '').split(/[|/]/).map(normalizeAnswer).filter(Boolean)
);

export const isAnswerAccepted = (answer, expected) => (
  getAcceptedAnswers(expected).includes(normalizeAnswer(answer))
);

export const getPrimaryAnswer = (value) => (
  Array.isArray(value)
    ? String(value[0] ?? '').trim()
    : String(value ?? '').split(/[|/]/)[0].trim()
);
