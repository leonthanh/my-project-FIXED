const FLOWCHART_BLANK_REGEX = /\[BLANK\]|\[[\s_]+\]|\{[\s_]+\}|_{2,}|[\u2026]+/;

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getFlowchartOptionEntries = (options = []) => {
  const safeOptions = Array.isArray(options) ? options : [];

  return safeOptions.map((option, index) => {
    const raw = String(option ?? '').trim();
    const explicitMatch = raw.match(/^([A-Z])(?:\s*[.)-]\s*|\s+)(.*)$/i) || raw.match(/^([A-Z])\.?$/i);
    const letter = explicitMatch?.[1]?.toUpperCase() || String.fromCharCode(65 + index);
    const label = explicitMatch ? String(explicitMatch[2] || '').trim() : raw;
    const display = label ? `${letter}. ${label}` : `${letter}`;

    return {
      value: letter,
      letter,
      label,
      raw,
      display,
      normalizedCandidates: [raw, label, display, letter, `${letter}.`, `${letter})`]
        .map(normalizeText)
        .filter(Boolean),
    };
  });
};

const resolveFlowchartChoiceValue = (rawValue, options = []) => {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return '';

  const directLetterMatch = raw.match(/^([A-Z])(?:\s*[.)-]\s*.*)?$/i);
  if (directLetterMatch) {
    return directLetterMatch[1].toUpperCase();
  }

  const normalizedRaw = normalizeText(raw);
  const optionMatch = getFlowchartOptionEntries(options).find((entry) =>
    entry.normalizedCandidates.includes(normalizedRaw)
  );

  return optionMatch ? optionMatch.value : raw;
};

const parseNumericAnswerMap = (question, options = []) => {
  const map = {};
  const rawAnswers = question?.answers;
  const answerObject = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers) ? rawAnswers : null;
  if (!answerObject) return map;

  Object.entries(answerObject).forEach(([key, value]) => {
    const num = parseInt(key, 10);
    if (!Number.isFinite(num)) return;
    map[num] = resolveFlowchartChoiceValue(value, options);
  });

  return map;
};

const isFlowchartBlankStep = (step) => {
  const text = String(step?.text ?? '');
  return Boolean(step?.hasBlank) || FLOWCHART_BLANK_REGEX.test(text) || String(step?.correctAnswer ?? '').trim() !== '';
};

const parseFlowchartAnswerMap = (question, sectionStart = 1) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const map = { ...parseNumericAnswerMap(question, options) };

  String(question?.correctAnswer ?? '')
    .split(/[;,\n]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      const match = token.match(/^(\d+)\s*[-:.]?\s*(.+)$/);
      if (!match) return;
      const num = parseInt(match[1], 10);
      if (!Number.isFinite(num)) return;
      map[num] = resolveFlowchartChoiceValue(match[2], options);
    });

  const steps = Array.isArray(question?.steps) ? question.steps : [];
  if (!Object.keys(map).length) {
    let nextNumber = Number.isFinite(sectionStart) ? sectionStart : 1;
    steps.forEach((step) => {
      if (!isFlowchartBlankStep(step)) return;
      map[nextNumber] = resolveFlowchartChoiceValue(step?.correctAnswer, options);
      nextNumber += 1;
    });
  }

  return map;
};

const getFlowchartBlankEntries = (question, sectionStart = 1) => {
  const steps = Array.isArray(question?.steps) ? question.steps : [];
  const answerMap = parseFlowchartAnswerMap(question, sectionStart);
  const mappedNumbers = Object.keys(answerMap)
    .map((key) => parseInt(key, 10))
    .filter((num) => Number.isFinite(num))
    .sort((left, right) => left - right);

  const blankSteps = steps
    .map((step, stepIndex) => ({ step, stepIndex }))
    .filter(({ step }) => isFlowchartBlankStep(step));

  let nextSequentialNumber = Number.isFinite(sectionStart) ? sectionStart : 1;

  if (blankSteps.length > 0) {
    return blankSteps.map(({ step, stepIndex }, blankIndex) => {
      const explicitNumber = mappedNumbers[blankIndex];
      const number = Number.isFinite(explicitNumber) ? explicitNumber : nextSequentialNumber++;
      if (Number.isFinite(explicitNumber)) {
        nextSequentialNumber = Math.max(nextSequentialNumber, explicitNumber + 1);
      }

      return {
        num: number,
        stepIndex,
        step,
        expected: answerMap[number] ?? resolveFlowchartChoiceValue(step?.correctAnswer, question?.options),
      };
    });
  }

  if (mappedNumbers.length > 0) {
    return mappedNumbers.map((num, index) => ({
      num,
      stepIndex: index,
      step: steps[index] || {},
      expected: answerMap[num] ?? '',
    }));
  }

  return [];
};

const countFlowchartQuestionSlots = (question) => getFlowchartBlankEntries(question).length;

module.exports = {
  FLOWCHART_BLANK_REGEX,
  countFlowchartQuestionSlots,
  getFlowchartBlankEntries,
  getFlowchartOptionEntries,
  isFlowchartBlankStep,
  parseFlowchartAnswerMap,
  resolveFlowchartChoiceValue,
};
