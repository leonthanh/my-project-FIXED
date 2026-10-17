const parseIfJsonString = (value) => {
  let parsed = value;
  let attempts = 0;

  while (typeof parsed === 'string' && attempts < 2) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
    attempts += 1;
  }

  return parsed;
};

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const parseEnglishNumber = (raw) => {
  const normalized = normalizeText(raw)
    .replace(/-/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  const small = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
  };
  const tens = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };
  const scales = {
    thousand: 1000,
    million: 1000000,
    billion: 1000000000,
  };

  const tokens = normalized.split(' ').filter(Boolean);
  let total = 0;
  let current = 0;
  let seenAny = false;

  for (const token of tokens) {
    if (small[token] != null) {
      current += small[token];
      seenAny = true;
      continue;
    }
    if (tens[token] != null) {
      current += tens[token];
      seenAny = true;
      continue;
    }
    if (token === 'hundred') {
      if (!seenAny) return null;
      current *= 100;
      continue;
    }
    if (scales[token] != null) {
      if (!seenAny) return null;
      total += current * scales[token];
      current = 0;
      continue;
    }
    return null;
  }

  if (!seenAny) return null;
  return total + current;
};

const tryParseNumber = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

  const normalized = normalizeText(raw);
  if (!normalized) return null;

  const compactDigits = normalized
    .replace(/,/g, '')
    .replace(/(?<=\d)\s+(?=\d)/g, '');

  if (/^\d+(\.\d+)?$/.test(compactDigits)) {
    const number = Number(compactDigits);
    return Number.isFinite(number) ? number : null;
  }

  const unitMatch = compactDigits.match(/^(\d+(?:\.\d+)?)\s*(thousand|million|billion)$/);
  if (unitMatch) {
    const base = Number(unitMatch[1]);
    if (!Number.isFinite(base)) return null;
    const multiplier =
      unitMatch[2] === 'thousand'
        ? 1000
        : unitMatch[2] === 'million'
          ? 1000000
          : 1000000000;
    return base * multiplier;
  }

  return parseEnglishNumber(compactDigits);
};

const explodeAccepted = (raw) => {
  if (raw == null) return [];
  const parsed = parseIfJsonString(raw);
  if (Array.isArray(parsed)) return parsed.flatMap((entry) => explodeAccepted(entry));
  if (typeof parsed === 'string') {
    const value = parsed.trim();
    if (!value) return [];
    if (value.includes('|')) return value.split('|').map((entry) => entry.trim()).filter(Boolean);
    return [value];
  }
  return [parsed];
};

const candidateKeys = (raw) => {
  const normalized = normalizeText(raw);
  const keys = normalized ? [normalized] : [];
  const number = tryParseNumber(raw);
  if (number != null) keys.push(`#num:${number}`);
  return keys;
};

const isAnswerMatch = (student, expectedRaw) => {
  const studentKeys = new Set(candidateKeys(student));
  return explodeAccepted(expectedRaw).some((expected) =>
    candidateKeys(expected).some((key) => studentKeys.has(key))
  );
};

const explodeChoiceList = (raw) => {
  if (raw == null) return [];
  const parsed = parseIfJsonString(raw);
  if (Array.isArray(parsed)) return parsed.flatMap((entry) => explodeChoiceList(entry));
  const value = String(parsed).trim();
  if (!value) return [];
  return value.split(/[^0-9A-Za-z]+/).map((entry) => entry.trim()).filter(Boolean);
};

const toChoiceIndex = (value) => {
  const token = String(value ?? '').trim();
  if (!token) return null;
  if (/^[A-Z]$/i.test(token)) return token.toUpperCase().charCodeAt(0) - 65;
  const parsed = Number(token);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeChoiceIndices = (value) => {
  const source = Array.isArray(value) ? value : explodeChoiceList(value);
  return source.map(toChoiceIndex).filter((index) => index != null);
};

const formatChoiceList = (indices) =>
  Array.isArray(indices)
    ? indices
        .map((index) => Number(index))
        .filter((index) => Number.isFinite(index) && index >= 0)
        .sort((left, right) => left - right)
        .map((index) => String.fromCharCode(65 + index))
        .join(', ')
    : '';

module.exports = {
  formatChoiceList,
  isAnswerMatch,
  normalizeChoiceIndices,
};
