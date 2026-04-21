const { processTestParts } = require('../../../utils/clozParser');

const shouldIncludeAllVisibility = (source) => {
  const visibility =
    source && typeof source === 'object' && !Array.isArray(source)
      ? source.query?.visibility ?? source.visibility
      : source;

  return String(visibility || '').trim().toLowerCase() === 'all';
};

const buildVisibleCambridgeWhere = (source, baseWhere = {}) =>
  shouldIncludeAllVisibility(source)
    ? baseWhere
    : { ...baseWhere, status: 'published' };

const safeParseParts = (rawParts) => {
  if (!rawParts) return [];
  if (Array.isArray(rawParts)) return rawParts;
  if (typeof rawParts === 'string') {
    try {
      const parsed = JSON.parse(rawParts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const countTotalQuestionsFromParts = (rawParts = []) => {
  const parts = safeParseParts(rawParts);
  const processedParts = processTestParts(parts);

  let total = 0;

  processedParts.forEach((part) => {
    (part.sections || []).forEach((section) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      const questions = section.questions || [];

      questions.forEach((question) => {
        if (sectionType === 'long-text-mc' && Array.isArray(question.questions)) {
          total += question.questions.length;
          return;
        }

        if (sectionType === 'people-matching' && Array.isArray(question.people)) {
          total += question.people.length > 0 ? question.people.length : 1;
          return;
        }

        if (sectionType === 'gap-match' && Array.isArray(question.leftItems)) {
          total += question.leftItems.length > 0 ? question.leftItems.length : 1;
          return;
        }

        if (sectionType === 'word-form' && Array.isArray(question.sentences)) {
          total += question.sentences.length > 0 ? question.sentences.length : 1;
          return;
        }

        if (sectionType === 'short-message') {
          total += 1;
          return;
        }

        if (sectionType === 'cloze-mc' && Array.isArray(question.blanks)) {
          total += question.blanks.length > 0 ? question.blanks.length : 1;
          return;
        }

        if (sectionType === 'cloze-test') {
          if (Array.isArray(question.blanks) && question.blanks.length > 0) {
            total += question.blanks.length;
            return;
          }
          if (question.answers && typeof question.answers === 'object' && !Array.isArray(question.answers)) {
            const answerCount = Object.keys(question.answers).length;
            total += answerCount > 0 ? answerCount : 1;
            return;
          }
          total += 1;
          return;
        }

        if (sectionType === 'inline-choice' && Array.isArray(question.blanks)) {
          total += question.blanks.length > 0 ? question.blanks.length : 1;
          return;
        }

        total += 1;
      });
    });
  });

  return total;
};

const stripDataUrls = (value) => {
  const dataUrlRegex = /data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g;
  const allowDataUrlKeys = new Set(['imageUrl', 'mapImageUrl']);

  const walk = (input) => {
    if (typeof input === 'string') {
      return dataUrlRegex.test(input) ? input.replace(dataUrlRegex, '') : input;
    }
    if (Array.isArray(input)) {
      return input.map(walk);
    }
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input).map(([key, val]) => {
          if (allowDataUrlKeys.has(key)) {
            return [key, val];
          }
          return [key, walk(val)];
        })
      );
    }
    return input;
  };

  return walk(value);
};

module.exports = {
  buildVisibleCambridgeWhere,
  countTotalQuestionsFromParts,
  safeParseParts,
  shouldIncludeAllVisibility,
  stripDataUrls,
};