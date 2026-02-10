const countClozeBlanksFromText = (passageText) => {
  if (!passageText) return 0;
  let plainText = passageText;
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = passageText;
    plainText = temp.textContent || temp.innerText || passageText;
  } else {
    plainText = String(passageText).replace(/<[^>]*>/g, ' ');
  }

  const numbered = plainText.match(/\((\d+)\)|\[(\d+)\]/g);
  if (numbered && numbered.length) return numbered.length;

  const underscores = plainText.match(/[_\u2026]{3,}/g);
  return underscores ? underscores.length : 0;
};

const getQuestionCountForSection = (section) => {
  if (section.questionType === 'long-text-mc' && section.questions[0]?.questions) {
    return section.questions[0].questions.length;
  }
  if (section.questionType === 'cloze-mc' && section.questions[0]?.blanks) {
    return section.questions[0].blanks.length;
  }
  if (section.questionType === 'inline-choice' && section.questions[0]?.blanks) {
    return section.questions[0].blanks.length;
  }
  if (section.questionType === 'cloze-test') {
    const q0 = section.questions?.[0] || {};
    const blanksCount = Array.isArray(q0?.blanks) && q0.blanks.length
      ? q0.blanks.length
      : (q0?.answers && typeof q0.answers === 'object'
        ? Object.keys(q0.answers).length
        : 0);
    if (blanksCount > 0) return blanksCount;
    return countClozeBlanksFromText(q0?.passageText || q0?.passage || q0?.clozeText || '');
  }
  if (section.questionType === 'short-message') {
    return 1;
  }
  if (section.questionType === 'people-matching' && section.questions[0]?.people) {
    return section.questions[0].people.length;
  }
  if (section.questionType === 'gap-match' && section.questions[0]?.leftItems) {
    return section.questions[0].leftItems.length;
  }
  if (section.questionType === 'word-form' && section.questions[0]?.sentences) {
    return section.questions[0].sentences.length;
  }
  return section.questions.length;
};

const computeQuestionStarts = (passages) => {
  const sectionStart = {};
  const questionStart = {};
  const multiQuestionTypes = new Set([
    'long-text-mc',
    'cloze-mc',
    'cloze-test',
    'short-message',
    'people-matching',
    'word-form',
    'gap-match',
    'inline-choice',
  ]);
  let count = 1;

  (passages || []).forEach((part, partIdx) => {
    (part?.sections || []).forEach((section, sectionIdx) => {
      sectionStart[`${partIdx}-${sectionIdx}`] = count;

      const sectionCount = getQuestionCountForSection(section);
      const questionType = section?.questionType || '';
      if (!multiQuestionTypes.has(questionType)) {
        const questions = Array.isArray(section?.questions) ? section.questions : [];
        questions.forEach((_, qIdx) => {
          questionStart[`${partIdx}-${sectionIdx}-${qIdx}`] = count + qIdx;
        });
        count += questions.length;
      } else {
        count += sectionCount;
      }
    });
  });

  return { sectionStart, questionStart };
};

export { countClozeBlanksFromText, getQuestionCountForSection, computeQuestionStarts };
