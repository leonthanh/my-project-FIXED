const GATEWAY_CLOZE_NUMBERING = {
  "grammar - b": { startNumber: 6, legacyStarts: [1] },
  "grammar - c": { startNumber: 11, legacyStarts: [1] },
  "vocabulary - a": { startNumber: 16, legacyStarts: [1] },
  "vocabulary - c": { startNumber: 26, legacyStarts: [1, 2] },
};

const renumberGatewayClozeQuestion = (sectionTitle, question) => {
  const sectionKey = String(sectionTitle || "").trim().toLowerCase();
  const numbering = GATEWAY_CLOZE_NUMBERING[sectionKey];
  if (!numbering || !question || typeof question !== "object") return question;

  const passageText = typeof question.passageText === "string"
    ? question.passageText
    : typeof question.passage === "string"
      ? question.passage
      : "";
  const removesExtraBlankUnderscores = ["grammar - b", "grammar - c"].includes(sectionKey);
  const cleanedPassageText = removesExtraBlankUnderscores
    ? passageText.replace(/((?:\(\s*\d+\s*\)|\[\s*\d+\s*\])(?:<\/[a-z][^>]*>)?)\s*_{3,}\s*/gi, "$1 ")
    : passageText;
  const numberedBlankPattern = /(\(|\[)\s*(\d+)\s*(\)|\])/g;
  const matches = [...cleanedPassageText.matchAll(numberedBlankPattern)];
  if (matches.length !== 5) {
    return cleanedPassageText === passageText ? question : { ...question, passageText: cleanedPassageText };
  }

  const targetNumbers = Array.from(
    { length: matches.length },
    (_, index) => numbering.startNumber + index
  );
  const sourceNumbers = matches.map((match) => Number(match[2]));
  const allowedSequences = [
    targetNumbers,
    ...numbering.legacyStarts.map((start) => (
      Array.from({ length: matches.length }, (_, index) => start + index)
    )),
  ];
  const hasSupportedNumbering = allowedSequences.some(
    (sequence) => sequence.every((number, index) => number === sourceNumbers[index])
  );
  if (!hasSupportedNumbering) {
    return cleanedPassageText === passageText ? question : { ...question, passageText: cleanedPassageText };
  }

  let blankIndex = 0;
  const nextPassageText = cleanedPassageText.replace(
    numberedBlankPattern,
    (_, openingBracket, _sourceNumber, closingBracket) => {
      const nextNumber = targetNumbers[blankIndex];
      blankIndex += 1;
      return `${openingBracket}${nextNumber}${closingBracket}`;
    }
  );

  const answers = question.answers && typeof question.answers === "object" && !Array.isArray(question.answers)
    ? question.answers
    : null;
  let nextAnswers = answers;
  if (answers) {
    const answerNumberMap = new Map();
    sourceNumbers.forEach((sourceNumber, index) => {
      answerNumberMap.set(String(sourceNumber), String(targetNumbers[index]));
    });
    numbering.legacyStarts.forEach((start) => {
      targetNumbers.forEach((targetNumber, index) => {
        answerNumberMap.set(String(start + index), String(targetNumber));
      });
    });

    const targetAnswerKeys = new Set(targetNumbers.map(String));
    let normalizedAnswers = answers;
    Object.entries(answers).forEach(([sourceKey, answer]) => {
      const targetKey = answerNumberMap.get(sourceKey);
      if (!targetKey || targetKey === sourceKey || targetAnswerKeys.has(sourceKey)) return;
      if (normalizedAnswers === answers) normalizedAnswers = { ...answers };
      if (!Object.prototype.hasOwnProperty.call(normalizedAnswers, targetKey)) {
        normalizedAnswers[targetKey] = answer;
      }
      delete normalizedAnswers[sourceKey];
    });
    nextAnswers = normalizedAnswers;
  }

  if (nextPassageText === passageText && nextAnswers === answers) return question;
  return {
    ...question,
    passageText: nextPassageText,
    ...(answers ? { answers: nextAnswers } : {}),
  };
};

export default renumberGatewayClozeQuestion;
