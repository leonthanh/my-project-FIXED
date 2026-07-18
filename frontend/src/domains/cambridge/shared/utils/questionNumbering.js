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

const getExplicitQuestionNumbersFromText = (text) => {
  if (!text) return [];
  let plainText = text;
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = text;
    plainText = temp.textContent || temp.innerText || '';
  } else {
    plainText = String(text).replace(/<[^>]*>/g, ' ');
  }

  const numbers = [];
  const seen = new Set();
  const regex = /\((\d+)\)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(plainText)) !== null) {
    const questionNum = Number(match[1] || match[2]);
    if (Number.isFinite(questionNum) && questionNum > 0 && !seen.has(questionNum)) {
      seen.add(questionNum);
      numbers.push(questionNum);
    }
  }

  return numbers.sort((a, b) => a - b);
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
  // letter-matching (MOVERS Part 3): count people skipping index 0 (example)
  if (section.questionType === 'letter-matching' || q0.questionType === 'letter-matching') {
    const people = Array.isArray(q0.people) ? q0.people : [];
    return people.slice(1).filter((p) => String(p?.name || '').trim()).length;
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
  if (section.questionType === 'matching' && section.questions[0]?.leftItems) {
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
  if (section.questionType === 'preposition-gap-fill') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.items) ? q0.items.length : 0;
  }
  if (section.questionType === 'odd-one-out') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.groups) ? q0.groups.length : 0;
  }
  if (section.questionType === 'sentence-correction') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.items) ? q0.items.length : 0;
  }
  if (section.questionType === 'reading-open-questions') {
    const q0 = section.questions?.[0] || {};
    return Array.isArray(q0.items) ? q0.items.length : 0;
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
    'matching',
    'inline-choice',
    'matching-pictures',
    'image-cloze',
    'word-drag-cloze',
    'story-completion',
    'look-read-write',
    'draw-lines', // MOVERS Part 1: expand per leftItem name
    'letter-matching', // MOVERS Part 3: expand per person name
    'preposition-gap-fill',
    'odd-one-out',
    'sentence-correction',
    'reading-open-questions',
  ]);
  let count = 1;

  (passages || []).forEach((part, partIdx) => {
    (part?.sections || []).forEach((section, sectionIdx) => {
      const sectionCount = getQuestionCountForSection(section);
      // detect draw-lines: check question-level data FIRST because section.questionType
      // may be 'matching' instead of 'draw-lines' (inconsistent DB data)
      const q0data = section?.questions?.[0] || {};
      const questionType =
        (q0data.questionType === 'draw-lines' || (q0data.anchors && Object.keys(q0data.anchors || {}).length > 0))
          ? 'draw-lines'
          : q0data.questionType === 'letter-matching'
            ? 'letter-matching'
            : (section?.questionType || '');
      const explicitNumbers = questionType === 'cloze-test'
        ? getExplicitQuestionNumbersFromText(q0data.passageText || q0data.passage || q0data.clozeText || '')
        : [];
      const explicitMin = explicitNumbers[0];
      const explicitMax = explicitNumbers[explicitNumbers.length - 1];
      const sectionFirstNumber = Number.isFinite(explicitMin) && explicitMin >= count ? explicitMin : count;

      sectionStart[`${partIdx}-${sectionIdx}`] = sectionFirstNumber;

      if (!multiQuestionTypes.has(questionType)) {
        const questions = Array.isArray(section?.questions) ? section.questions : [];
        questions.forEach((_, qIdx) => {
          questionStart[`${partIdx}-${sectionIdx}-${qIdx}`] = sectionFirstNumber + qIdx;
        });
        count = Math.max(sectionFirstNumber + questions.length, Number.isFinite(explicitMax) ? explicitMax + 1 : 0);
      } else {
        count = Math.max(sectionFirstNumber + sectionCount, Number.isFinite(explicitMax) ? explicitMax + 1 : 0);
      }
    });
  });

  return { sectionStart, questionStart };
};

export { countClozeBlanksFromText, getQuestionCountForSection, parseClozeBlanksFromText, computeQuestionStarts };
