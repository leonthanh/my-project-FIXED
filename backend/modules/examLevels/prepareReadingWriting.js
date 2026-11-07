const { countTotalQuestionsFromParts } = require("../cambridge/shared/readingTestUtils");

const LEGACY_FORMAT = "prepare-reading-writing-v1";
const FLEXIBLE_FORMAT = "prepare-reading-writing-v2";
const LEGACY_MODES = ["two-blanks", "single", "single", "two-blanks", "two-blanks", "rewrite", "rewrite", "rewrite", "choice"];
const WRITING_RUBRIC = ["Content", "Communicative Achievement", "Organisation", "Language"];
const QUESTION_TYPE_IDS = new Set([
  "sign-message",
  "people-matching",
  "long-text-mc",
  "prepare-reading-comprehension",
  "cloze-mc",
  "cloze-test",
  "word-form",
  "short-message",
  "abc",
  "fill",
  "matching",
  "gap-match",
  "inline-choice",
  "sentence-transformation",
  "sentence-correction",
  "true-false-not-given",
  "reading-open-questions",
  "story-writing",
  "word-bank-completion",
  "conditional-sentence-completion",
  "reported-command-completion",
  "reported-speech-transformation",
  "past-simple-passive-transformation",
  "reported-speech-verb-choice",
  "definition-completion",
  "word-bank-adjective-formation",
]);

const isLegacyPrepareFormat = (parts) => Array.isArray(parts) && parts[0]?.examFormat === LEGACY_FORMAT;
const isFlexiblePrepareFormat = (parts) => Array.isArray(parts) && parts[0]?.examFormat === FLEXIBLE_FORMAT;
const isPrepareFormat = (parts) => isLegacyPrepareFormat(parts) || isFlexiblePrepareFormat(parts);
const hasText = (value) => Boolean(String(value || "").replace(/<[^>]*>/g, "").trim());
const hasTwoBlankMarkers = (value) =>
  (String(value || "").match(/\{1\}/g) || []).length === 1 &&
  (String(value || "").match(/\{2\}/g) || []).length === 1;

const validateLegacyPrepareParts = (parts) => {
  const sections = parts?.[0]?.sections;
  if (parts.length !== 1 || !Array.isArray(sections) || sections.length !== 11) return false;
  for (let index = 0; index < LEGACY_MODES.length; index += 1) {
    const section = sections[index];
    if (section?.questionType !== "reading-open-questions" || section.questions?.length !== 1) return false;
    const question = section.questions[0];
    if (question.layoutMode !== "prepare" || question.exerciseMode !== LEGACY_MODES[index] ||
        !Array.isArray(question.items) || question.items.length !== 5) return false;
    for (const item of question.items) {
      if (!item || typeof item !== "object" || !hasText(item.questionText)) return false;
      if (LEGACY_MODES[index] === "two-blanks") {
        if ((String(item.questionText).match(/\{1\}/g) || []).length !== 1 ||
            (String(item.questionText).match(/\{2\}/g) || []).length !== 1 ||
            !Array.isArray(item.blankAnswers) || item.blankAnswers.length !== 2 ||
            item.blankAnswers.some((answer) => !hasText(answer))) return false;
      } else if (!hasText(item.correctAnswer)) return false;
      if (LEGACY_MODES[index] === "choice" && (
        !Array.isArray(item.options) || item.options.length !== 2 ||
        item.options.some((option) => !hasText(option)) ||
        String(item.options[0]).trim().toLowerCase() === String(item.options[1]).trim().toLowerCase() ||
        !item.options.includes(item.correctAnswer)
      )) return false;
    }
  }
  const reading = sections[9]?.questions?.[0];
  if (sections[9]?.questionType !== "long-text-mc" || sections[9]?.questions?.length !== 1 ||
      !hasText(reading?.passage) || !Array.isArray(reading?.questions) || reading.questions.length !== 5 ||
      reading.questions.some((item) => !item || !hasText(item.questionText) || !Array.isArray(item.options) ||
        item.options.length !== 4 || item.options.some((option) => !hasText(String(option).replace(/^[A-D]\.\s*/, ""))) ||
        !["A", "B", "C", "D"].includes(item.correctAnswer))) return false;
  const writing = sections[10]?.questions?.[0];
  if (sections[10]?.questionType !== "short-message" || sections[10]?.questions?.length !== 1 ||
      !hasText(writing?.situation) || writing.gatewayWritingMode !== true ||
      !Array.isArray(writing.writingRubric) || writing.writingRubric.length !== 4 ||
      writing.writingRubric.some((item, index) => !item || item.criterion !== WRITING_RUBRIC[index] || Number(item.points) !== 2.5)) return false;
  return true;
};

const getScorableUnitCount = (section) =>
  countTotalQuestionsFromParts([{
    examFormat: FLEXIBLE_FORMAT,
    sections: [section],
  }]);

const getFlexiblePrepareTotalPoints = (parts) =>
  parts.reduce((total, part) => total + (part.sections || []).reduce((sectionTotal, section) => {
    if (["short-message", "story-writing"].includes(section.questionType)) return sectionTotal;
    return sectionTotal + getScorableUnitCount(section) * Number(section.preparePointsPerAnswer || 0);
  }, 0), 0);

const validateFlexiblePrepareParts = (
  parts,
  { allowIncompleteScoring = false, allowIncompleteContent = false } = {}
) => {
  if (!Array.isArray(parts) || parts.length === 0 || !isFlexiblePrepareFormat(parts) ||
      parts.some((part) => !Array.isArray(part.sections) || part.sections.length === 0)) return false;
  for (const part of parts) {
    if (!hasText(part.title)) return false;
    for (const section of part.sections) {
      if (!QUESTION_TYPE_IDS.has(section.questionType) || !Array.isArray(section.questions) || !section.questions.length) return false;
      if (section.questionType === "short-message" && section.questions.some((question) => (
        !hasText(question?.situation) &&
        ![question?.mediaUrl, ...(Array.isArray(question?.mediaUrls) ? question.mediaUrls : [])].some(hasText)
      ))) return false;
      if (section.questionType === "story-writing" && section.questions.some((question) => (
        !hasText(question?.openingSentence) && !hasText(question?.prompt)
      ))) return false;
      if (section.questionType === "word-bank-completion" && section.questions.some((question) => (
        !Array.isArray(question?.wordBanks) ||
        question.wordBanks.length !== 2 ||
        question.wordBanks.some((bank) => !Array.isArray(bank?.words) || !bank.words.some(hasText)) ||
        !question.example ||
        !hasTwoBlankMarkers(question.example.questionText) ||
        !Array.isArray(question.example.blankAnswers) ||
        question.example.blankAnswers.length !== 2 ||
        question.example.blankAnswers.some((answer) => !hasText(answer)) ||
        !Array.isArray(question.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasTwoBlankMarkers(item?.questionText) ||
          !Array.isArray(item.blankAnswers) ||
          item.blankAnswers.length !== 2 ||
          item.blankAnswers.some((answer) => !hasText(answer))
        ))
      ))) return false;
      if (section.questionType === "conditional-sentence-completion" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasTwoBlankMarkers(item?.questionText) ||
          !Array.isArray(item.blankAnswers) ||
          item.blankAnswers.length !== 2 ||
          item.blankAnswers.some((answer) => !hasText(answer))
        ))
      ))) return false;
      if (section.questionType === "reported-command-completion" && section.questions.some((question) => (
        !question?.example ||
        !hasText(question.example.sourceText) ||
        !hasText(question.example.sentenceStarter) ||
        !hasText(question.example.reportingVerb) ||
        !hasText(question.example.correctAnswer) ||
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasText(item?.sourceText) ||
          !hasText(item?.sentenceStarter) ||
          !hasText(item?.reportingVerb) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some(hasText)
        ))
      ))) return false;
      if (section.questionType === "reported-speech-transformation" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasText(item?.sourceText) ||
          (!hasText(item?.targetPrefix) && !hasText(item?.targetSuffix)) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some(hasText)
        ))
      ))) return false;
      if (section.questionType === "past-simple-passive-transformation" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasText(item?.sourceText) ||
          (!hasText(item?.targetPrefix) && !hasText(item?.targetSuffix)) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some(hasText)
        ))
      ))) return false;
      if (section.questionType === "reported-speech-verb-choice" && section.questions.some((question) => {
        const options = Array.isArray(question?.options) ? question.options : [];
        const isValidAnswer = (answer) => options.some((option) => (
          String(option || "").trim().toLowerCase() === String(answer || "").trim().toLowerCase()
        ));
        return options.length !== 2 ||
          options.some((option) => !hasText(option)) ||
          String(options[0] || "").trim().toLowerCase() === String(options[1] || "").trim().toLowerCase() ||
          !question.example ||
          (!hasText(question.example.sentencePrefix) && !hasText(question.example.sentenceSuffix)) ||
          !isValidAnswer(question.example.correctAnswer) ||
          !Array.isArray(question.items) ||
          !question.items.length ||
          question.items.some((item) => (
            (!hasText(item?.sentencePrefix) && !hasText(item?.sentenceSuffix)) ||
            !isValidAnswer(item?.correctAnswer)
          ));
      })) return false;
      if (section.questionType === "prepare-reading-comprehension") {
        if (section.questions.some((question) => (
          !Array.isArray(question?.questions) || !question.questions.length
        ))) return false;
        if (!allowIncompleteContent && section.questions.some((question) => (
          !hasText(question?.passage) ||
          question.questions.some((item) => (
            !hasText(item?.questionText) ||
            !Array.isArray(item?.options) ||
            item.options.length !== 4 ||
            item.options.some((option) => !hasText(String(option || "").replace(/^[A-D]\.\s*/i, ""))) ||
            !["A", "B", "C", "D"].includes(String(item?.correctAnswer || "").trim().toUpperCase())
          ))
        ))) return false;
      }
      if (section.questionType === "definition-completion" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => {
          const answers = String(item?.correctAnswer || "").split(/[|/]/).map((answer) => answer.trim()).filter(Boolean);
          return !hasText(item?.questionText) ||
            !answers.length ||
            answers.some((answer) => answer[0].toLowerCase() !== answers[0][0].toLowerCase());
        })
      ))) return false;
      if (section.questionType === "word-bank-adjective-formation" && section.questions.some((question) => (
        !Array.isArray(question?.wordBank) ||
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.wordBank.length !== question.items.length + 1 ||
        question.wordBank.some((word) => !hasText(word)) ||
        question.items.some((item) => (
          (String(item?.questionText || "").match(/\{1\}/g) || []).length !== 1 ||
          !hasText(item?.questionText) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some((answer) => hasText(answer))
        ))
      ))) return false;
      if (["short-message", "story-writing"].includes(section.questionType)) continue;
      const pointsPerAnswer = Number(section.preparePointsPerAnswer);
      if (!Number.isFinite(pointsPerAnswer) || pointsPerAnswer <= 0) return false;
    }
  }
  return allowIncompleteScoring || Math.abs(getFlexiblePrepareTotalPoints(parts) - 50) <= 0.001;
};

const validatePrepareParts = (parts, options) => {
  if (isLegacyPrepareFormat(parts)) return validateLegacyPrepareParts(parts);
  if (isFlexiblePrepareFormat(parts)) return validateFlexiblePrepareParts(parts, options);
  return false;
};

module.exports = {
  isFlexiblePrepareFormat,
  isLegacyPrepareFormat,
  isPrepareFormat,
  validatePrepareParts,
};
