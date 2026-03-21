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
  // draw-lines: đếm số tên không rỗng từ index 1 trở đi (index 0 = example, không tính điểm)
  const q0 = section.questions?.[0] || {};
  if (
    section.questionType === 'draw-lines' ||
    (q0.anchors && Object.keys(q0.anchors || {}).length > 0)
  ) {
    const leftItems = Array.isArray(q0.leftItems) ? q0.leftItems : [];
    return leftItems.slice(1).filter((n) => String(n || '').trim()).length;
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
  if (section.questionType === 'short-message' || section.questionType === 'story-writing') {
    return 0; // Writing tasks are not numbered questions
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
  if (section.questionType === 'matching-pictures' && section.questions[0]?.prompts) {
    return section.questions[0].prompts.length;
  }
  if (section.questionType === 'image-cloze') {
    const q0 = section.questions?.[0] || {};
    const blanks = [...(q0.passageText || '').matchAll(/\(\s*\d+\s*\)/g)].length;
    return blanks + (q0.titleQuestion?.enabled ? 1 : 0);
  }
  if (section.questionType === 'word-drag-cloze') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.blanks) ? q0.blanks.length : 0;
  }
  if (section.questionType === 'story-completion') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.items) ? q0.items.length : 0;
  }
  if (section.questionType === 'look-read-write') {
    const q0 = section.questions?.[0] || {};
    return (q0.groups || []).reduce((sum, g) => sum + (g.items?.length || 0), 0);
  }
  return section.questions.length;
};

const parseClozeBlanksFromText = (passageText, startingNum = 1) => {
  if (!passageText) return [];
  let plainText = passageText;
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = passageText;
    plainText = temp.textContent || temp.innerText || '';
  } else {
    plainText = String(passageText).replace(/<[^>]*>/g, ' ');
  }

  const blanks = [];
  const regex = /\((\d+)\)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(plainText)) !== null) {
    blanks.push({
      questionNum: parseInt(match[1] || match[2], 10),
      fullMatch: match[0],
      index: match.index,
    });
  }

  if (blanks.length === 0) {
    const underscorePattern = /[_\u2026]{3,}/g;
    let blankIndex = 0;
    while ((match = underscorePattern.exec(plainText)) !== null) {
      blanks.push({
        questionNum: startingNum + blankIndex,
        fullMatch: match[0],
        index: match.index,
      });
      blankIndex++;
    }
  }

  return blanks.sort((a, b) => a.questionNum - b.questionNum);
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
    'matching-pictures',
    'image-cloze',
    'word-drag-cloze',
    'story-completion',
    'look-read-write',
    'draw-lines', // MOVERS Part 1: expand per leftItem name
  ]);
  let count = 1;

  (passages || []).forEach((part, partIdx) => {
    (part?.sections || []).forEach((section, sectionIdx) => {
      sectionStart[`${partIdx}-${sectionIdx}`] = count;

      const sectionCount = getQuestionCountForSection(section);
      // detect draw-lines: check question-level data FIRST because section.questionType
      // may be 'matching' instead of 'draw-lines' (inconsistent DB data)
      const q0data = section?.questions?.[0] || {};
      const questionType =
        (q0data.questionType === 'draw-lines' || (q0data.anchors && Object.keys(q0data.anchors || {}).length > 0))
          ? 'draw-lines'
          : (section?.questionType || '');
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

export { countClozeBlanksFromText, getQuestionCountForSection, parseClozeBlanksFromText, computeQuestionStarts };
