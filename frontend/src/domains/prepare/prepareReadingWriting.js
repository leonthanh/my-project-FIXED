import { getDefaultQuestionData, getPrepareReadingWritingQuestionTypes } from "../../shared/config/questionTypes";
import PREPARE_WRITING_RUBRIC from "../../shared/config/prepareWritingRubric";
import { getQuestionCountForSection } from "../exam-engine/shared/utils/examQuestionNumbering";

export const PREPARE_READING_WRITING_FORMAT = "prepare-reading-writing-v1";
export const PREPARE_FLEXIBLE_READING_WRITING_FORMAT = "prepare-reading-writing-v2";

export { PREPARE_WRITING_RUBRIC };

export const PREPARE_WRITING_PROMPT = `<p><strong>Read part of a letter from your English friend Katie. Then write a reply to Katie's letter answering her questions. Write about 80 words.</strong></p><p><em>I don't know what to do this weekend. All my friends are going away. What kinds of things do you like doing in your free time? Have you done anything amazing lately? Have you got plans for next weekend? If you were me, what would you do?</em></p>`;

export const createPrepareWritingQuestionData = () => ({
  ...getDefaultQuestionData("short-message"),
  prepareWritingMode: true,
  situation: PREPARE_WRITING_PROMPT,
  messageType: "letter",
  wordLimit: { min: 80, max: 80 },
  writingRubric: PREPARE_WRITING_RUBRIC,
});

const EXERCISES = [
  { title: "Vocabulary - Exercise 1", mode: "two-blanks", banks: 2 },
  { title: "Vocabulary - Exercise 2", mode: "single" },
  { title: "Vocabulary - Exercise 3", mode: "single", banks: 1 },
  { title: "Grammar - Exercise 4", mode: "two-blanks" },
  { title: "Grammar - Exercise 5", mode: "two-blanks" },
  { title: "Grammar - Exercise 6", mode: "rewrite" },
  { title: "Grammar - Exercise 7", mode: "rewrite" },
  { title: "Grammar - Exercise 8", mode: "rewrite" },
  { title: "Grammar - Exercise 9", mode: "choice" },
];

export const isPrepareReadingWriting = (parts) =>
  Array.isArray(parts) && parts[0]?.examFormat === PREPARE_READING_WRITING_FORMAT;

export const isFlexiblePrepareReadingWriting = (parts) =>
  Array.isArray(parts) && parts[0]?.examFormat === PREPARE_FLEXIBLE_READING_WRITING_FORMAT;

export const isAnyPrepareReadingWritingFormat = (parts) =>
  isPrepareReadingWriting(parts) || isFlexiblePrepareReadingWriting(parts);

export const countPrepareScoringUnitsForSection = (section) =>
  (section?.questions || []).reduce((total, question) => {
    const singleQuestionSection = { ...section, questions: [question] };
    const count = getQuestionCountForSection(singleQuestionSection);
    if (["word-bank-completion", "conditional-sentence-completion"].includes(section.questionType)) {
      return total + count * 2;
    }
    if (["reported-command-completion", "reported-speech-transformation", "past-simple-passive-transformation", "reported-speech-verb-choice", "definition-completion", "word-bank-adjective-formation"].includes(section.questionType)) {
      return total + count;
    }
    return total + (section.questionType === "reading-open-questions" && question?.exerciseMode === "two-blanks"
      ? count * 2
      : count);
  }, 0);

export const getPrepareSectionPoints = (section) => {
  if (["short-message", "story-writing"].includes(section?.questionType)) return 0;
  return countPrepareScoringUnitsForSection(section) * Number(section?.preparePointsPerAnswer || 0);
};

export const getPrepareTotalPoints = (parts) =>
  (parts || []).reduce(
    (partTotal, part) => partTotal + (part.sections || []).reduce(
      (sectionTotal, section) => sectionTotal + getPrepareSectionPoints(section),
      0
    ),
    0
  );

export const getPrepareQuestionResultCounts = (detailedResults, questionCount) => {
  const resultsByQuestion = new Map();
  Object.entries(detailedResults || {}).forEach(([key, result]) => {
    if (result?.isCorrect !== true && result?.isCorrect !== false) return;
    const number = Number(result.questionNumber);
    const questionKey = Number.isInteger(number) && number > 0
      ? `question-${number}`
      : `answer-${key}`;
    if (!resultsByQuestion.has(questionKey)) resultsByQuestion.set(questionKey, []);
    resultsByQuestion.get(questionKey).push(result.isCorrect);
  });

  const total = Number.isInteger(Number(questionCount)) && Number(questionCount) >= 0
    ? Number(questionCount)
    : resultsByQuestion.size;
  const correct = Math.min(
    total,
    [...resultsByQuestion.values()].filter((answers) => answers.every(Boolean)).length
  );
  return { correct, incorrect: Math.max(total - correct, 0) };
};

export const createFlexiblePrepareParts = () => {
  const defaultQuestionType = getPrepareReadingWritingQuestionTypes()[0]?.id || "fill";
  return [{
    partNumber: 1,
    title: "Part 1",
    instruction: "",
    audioUrl: "",
    imageUrl: "",
    examFormat: PREPARE_FLEXIBLE_READING_WRITING_FORMAT,
    sections: [{
      sectionTitle: "Section 1",
      questionType: defaultQuestionType,
      preparePointsPerAnswer: 1,
      questions: [getDefaultQuestionData(defaultQuestionType)],
    }],
  }];
};

export const markFlexiblePrepareParts = (parts) => {
  if (!Array.isArray(parts) || parts.length === 0) return createFlexiblePrepareParts();
  return parts.map((part, partIndex) => ({
    ...part,
    ...(partIndex === 0 ? { examFormat: PREPARE_FLEXIBLE_READING_WRITING_FORMAT } : {}),
    sections: (part.sections || []).map((section, sectionIndex) => ({
      ...section,
      sectionTitle: section.sectionTitle || `Section ${sectionIndex + 1}`,
      preparePointsPerAnswer: Number.isFinite(Number(section.preparePointsPerAnswer))
        ? Number(section.preparePointsPerAnswer)
        : 1,
      questions: (section.questions || []).map((question) => {
        if (!["short-message", "story-writing"].includes(section.questionType)) return question;
        const defaultWordLimit = Number(question?.wordLimit?.min) === 25 &&
          Number(question?.wordLimit?.max) === 35;
        return {
          ...question,
          prepareWritingMode: true,
          ...(section.questionType === "short-message" && (!question?.wordLimit || defaultWordLimit)
            ? { wordLimit: { min: 80, max: 80 } }
            : {}),
          writingRubric: Array.isArray(question.writingRubric) && question.writingRubric.length
            ? question.writingRubric
            : PREPARE_WRITING_RUBRIC,
        };
      }),
    })),
  }));
};

const isAbandonedPrepareStarterTemplate = (parts) => {
  const sections = parts?.[0]?.sections;
  return parts?.length === 1 && sections?.length === 11 &&
    sections.slice(0, 9).every((section) => (
      section.questionType === "reading-open-questions" &&
      section.questions?.[0]?.layoutMode === "prepare"
    )) &&
    sections[9]?.questionType === "long-text-mc" &&
    sections[10]?.questionType === "short-message";
};

export const getFlexiblePrepareDraftParts = (parts) =>
  isPrepareReadingWriting(parts) || isAbandonedPrepareStarterTemplate(parts)
    ? createFlexiblePrepareParts()
    : markFlexiblePrepareParts(parts);

export const buildPrepareReadingWritingParts = () => [{
  partNumber: 1,
  title: "Prepare Reading & Writing",
  examFormat: PREPARE_READING_WRITING_FORMAT,
  instruction: "",
  sections: [
    ...EXERCISES.map(({ title, mode, banks }) => ({
      sectionTitle: title,
      questionType: "reading-open-questions",
      questions: [{
        layoutMode: "prepare",
        exerciseMode: mode,
        instruction: "",
        wordBanks: Array.from({ length: banks || 0 }, () => ""),
        items: Array.from({ length: 5 }, () => ({
          questionText: "",
          answerPrefix: "",
          answerSuffix: "",
          correctAnswer: "",
          ...(mode === "two-blanks" ? { blankAnswers: ["", ""] } : {}),
          ...(mode === "choice" ? { options: ["", ""] } : {}),
        })),
      }],
    })),
    {
      sectionTitle: "Reading",
      questionType: "long-text-mc",
      questions: [{
        ...getDefaultQuestionData("long-text-mc"),
        prepareReadingMode: true,
        questions: Array.from({ length: 5 }, () => ({
          questionText: "",
          options: ["A. ", "B. ", "C. ", "D. "],
          correctAnswer: "",
        })),
      }],
    },
    {
      sectionTitle: "Writing",
      questionType: "short-message",
      questions: [{
        ...createPrepareWritingQuestionData(),
        gatewayWritingMode: true,
      }],
    },
  ],
}];

export const validatePrepareReadingWritingParts = (parts) => {
  const sections = parts?.[0]?.sections;
  if (!isPrepareReadingWriting(parts) || !Array.isArray(sections) || sections.length !== 11) {
    return "Mẫu Prepare phải có đủ 9 bài, Reading và Writing.";
  }
  for (let index = 0; index < EXERCISES.length; index += 1) {
    const section = sections[index];
    const question = section?.questions?.[0];
    const exercise = EXERCISES[index];
    if (section?.questionType !== "reading-open-questions" || section.questions?.length !== 1 || question?.exerciseMode !== exercise.mode ||
        !Array.isArray(question.items) || question.items.length !== 5) {
      return `${exercise.title} phải có đúng 5 câu theo mẫu.`;
    }
    for (const [itemIndex, item] of question.items.entries()) {
      if (!String(item.questionText || "").trim()) return `${exercise.title}: nhập nội dung câu ${itemIndex + 1}.`;
      if (exercise.mode === "two-blanks") {
        if ((String(item.questionText).match(/\{1\}/g) || []).length !== 1 ||
            (String(item.questionText).match(/\{2\}/g) || []).length !== 1) {
          return `${exercise.title}: câu ${itemIndex + 1} cần đúng một {1} và một {2}.`;
        }
        if (!Array.isArray(item.blankAnswers) || item.blankAnswers.length !== 2 ||
            item.blankAnswers.some((answer) => !String(answer || "").trim())) {
          return `${exercise.title}: nhập đủ hai đáp án cho câu ${itemIndex + 1}.`;
        }
      } else if (!String(item.correctAnswer || "").trim()) {
        return `${exercise.title}: nhập đáp án câu ${itemIndex + 1}.`;
      }
      if (exercise.mode === "choice" && (
        !Array.isArray(item.options) || item.options.length !== 2 ||
        item.options.some((option) => !String(option || "").trim()) ||
        String(item.options[0]).trim().toLowerCase() === String(item.options[1]).trim().toLowerCase() ||
        !item.options.includes(item.correctAnswer)
      )) return `${exercise.title}: nhập hai lựa chọn và chọn đáp án đúng cho câu ${itemIndex + 1}.`;
    }
  }
  const reading = sections[9]?.questions?.[0];
  if (sections[9]?.questionType !== "long-text-mc" || sections[9]?.questions?.length !== 1 ||
      !String(reading?.passage || "").replace(/<[^>]*>/g, "").trim() ||
      !Array.isArray(reading?.questions) || reading.questions.length !== 5 ||
      reading.questions.some((item) => !String(item.questionText || "").trim() ||
        !Array.isArray(item.options) || item.options.length !== 4 ||
        item.options.some((option) => !String(option || "").replace(/^[A-D]\.\s*/, "").trim()) ||
        !["A", "B", "C", "D"].includes(item.correctAnswer))) {
    return "Reading cần đoạn đọc và 5 câu trắc nghiệm, mỗi câu có 4 lựa chọn và đáp án.";
  }
  const writing = sections[10]?.questions?.[0];
  if (sections[10]?.questionType !== "short-message" || sections[10]?.questions?.length !== 1 ||
      !String(writing?.situation || "").replace(/<[^>]*>/g, "").trim()) {
    return "Nhập nội dung yêu cầu Writing.";
  }
  return "";
};

export const validateFlexiblePrepareReadingWritingParts = (
  parts,
  { allowIncompleteScoring = false, allowIncompleteContent = false } = {}
) => {
  if (!isFlexiblePrepareReadingWriting(parts) || !parts.length ||
      parts.some((part) => !Array.isArray(part.sections) || !part.sections.length)) {
    return "Prepare cần có ít nhất một Part và một Section trong mỗi Part.";
  }
  const availableTypeIds = new Set(getPrepareReadingWritingQuestionTypes().map((type) => type.id));
  for (const [partIndex, part] of parts.entries()) {
    if (!String(part.title || "").trim()) return `Nhập tiêu đề cho Part ${partIndex + 1}.`;
    for (const [sectionIndex, section] of part.sections.entries()) {
      const label = section.sectionTitle || `Part ${partIndex + 1}, Section ${sectionIndex + 1}`;
      if (!availableTypeIds.has(section.questionType) || !Array.isArray(section.questions) || !section.questions.length) {
        return `${label}: chọn dạng câu hỏi hợp lệ.`;
      }
      if (section.questionType === "short-message" && !section.questions.every((question) =>
        String(question?.situation || "").replace(/<[^>]*>/g, "").trim() ||
        [question?.mediaUrl, ...(Array.isArray(question?.mediaUrls) ? question.mediaUrls : [])]
          .some((url) => String(url || "").trim())
      )) return `${label}: nhập yêu cầu Writing hoặc thêm hình minh họa.`;
      if (section.questionType === "story-writing" && !section.questions.every((question) => (
        String(question?.openingSentence || "").replace(/<[^>]*>/g, "").trim() ||
        String(question?.prompt || "").replace(/<[^>]*>/g, "").trim() ||
        String(question?.instructions || "").replace(/<[^>]*>/g, "").trim() ||
        String(question?.story || "").replace(/<[^>]*>/g, "").trim()
      ))) return `${label}: nhập hướng dẫn hoặc nội dung cho đề Writing.`;
      if (section.questionType === "word-bank-completion" && section.questions.some((question) => (
        !Array.isArray(question?.wordBanks) ||
        question.wordBanks.length !== 2 ||
        question.wordBanks.some((bank) => !Array.isArray(bank?.words) || !bank.words.some((word) => String(word || "").trim())) ||
        !question.example ||
        !hasTwoBlankMarkers(question.example.questionText) ||
        !Array.isArray(question.example.blankAnswers) ||
        question.example.blankAnswers.length !== 2 ||
        question.example.blankAnswers.some((answer) => !String(answer || "").trim()) ||
        !Array.isArray(question.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasTwoBlankMarkers(item?.questionText) ||
          !Array.isArray(item.blankAnswers) ||
          item.blankAnswers.length !== 2 ||
          item.blankAnswers.some((answer) => !String(answer || "").trim())
        ))
      ))) return `${label}: cần hai danh sách từ, một ví dụ và câu hỏi có đủ {1}, {2} cùng đáp án.`;
      if (section.questionType === "conditional-sentence-completion" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !hasTwoBlankMarkers(item?.questionText) ||
          !Array.isArray(item.blankAnswers) ||
          item.blankAnswers.length !== 2 ||
          item.blankAnswers.some((answer) => !String(answer || "").trim())
        ))
      ))) return `${label}: cần câu hỏi có đủ {1}, {2} và đáp án cho cả hai chỗ trống.`;
      if (section.questionType === "reported-command-completion" && section.questions.some((question) => (
        !question?.example ||
        !String(question.example.sourceText || "").trim() ||
        !String(question.example.sentenceStarter || "").trim() ||
        !String(question.example.reportingVerb || "").trim() ||
        !String(question.example.correctAnswer || "").trim() ||
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !String(item?.sourceText || "").trim() ||
          !String(item?.sentenceStarter || "").trim() ||
          !String(item?.reportingVerb || "").trim() ||
          !String(item?.correctAnswer || "").split(/[|/]/).some((answer) => answer.trim())
        ))
      ))) return `${label}: cần câu gốc, phần đầu câu, reporting verb và đáp án cho ví dụ cùng mỗi câu hỏi.`;
      if (section.questionType === "reported-speech-transformation" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !String(item?.sourceText || "").replace(/<[^>]*>/g, "").trim() ||
          (!String(item?.targetPrefix || "").trim() && !String(item?.targetSuffix || "").trim()) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some((answer) => answer.trim())
        ))
      ))) return `${label}: cần câu gốc, khung câu trả lời và đáp án cho từng câu.`;
      if (section.questionType === "past-simple-passive-transformation" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => (
          !String(item?.sourceText || "").replace(/<[^>]*>/g, "").trim() ||
          (!String(item?.targetPrefix || "").trim() && !String(item?.targetSuffix || "").trim()) ||
          !String(item?.correctAnswer || "").split(/[|/]/).some((answer) => answer.trim())
        ))
      ))) return `${label}: cần câu chủ động, khung câu bị động và đáp án cho từng câu.`;
      if (section.questionType === "reported-speech-verb-choice" && section.questions.some((question) => {
        const options = Array.isArray(question?.options) ? question.options : [];
        const isValidAnswer = (answer) => options.some((option) => (
          String(option || "").trim().toLowerCase() === String(answer || "").trim().toLowerCase()
        ));
        return options.length !== 2 ||
          options.some((option) => !String(option || "").trim()) ||
          String(options[0] || "").trim().toLowerCase() === String(options[1] || "").trim().toLowerCase() ||
          !question.example ||
          (!String(question.example.sentencePrefix || "").trim() && !String(question.example.sentenceSuffix || "").trim()) ||
          !isValidAnswer(question.example.correctAnswer) ||
          !Array.isArray(question.items) ||
          !question.items.length ||
          question.items.some((item) => (
            (!String(item?.sentencePrefix || "").trim() && !String(item?.sentenceSuffix || "").trim()) ||
            !isValidAnswer(item?.correctAnswer)
          ));
      })) return `${label}: nhập hai lựa chọn khác nhau, câu ví dụ, nội dung từng câu và đáp án hợp lệ.`;
      if (section.questionType === "prepare-reading-comprehension") {
        if (section.questions.some((question) => (
          !Array.isArray(question?.questions) || !question.questions.length
        ))) return `${label}: cần có danh sách câu hỏi trắc nghiệm.`;
        if (!allowIncompleteContent && section.questions.some((question) => (
          !String(question?.passage || "").replace(/<[^>]*>/g, "").trim() ||
          question.questions.some((item) => (
            !String(item?.questionText || "").replace(/<[^>]*>/g, "").trim() ||
            !Array.isArray(item?.options) ||
            item.options.length !== 4 ||
            item.options.some((option) => !String(option || "").replace(/^[A-D]\.\s*/i, "").trim()) ||
            !["A", "B", "C", "D"].includes(String(item?.correctAnswer || "").trim().toUpperCase())
          ))
        ))) return `${label}: cần bài đọc và câu hỏi trắc nghiệm có đủ 4 lựa chọn cùng đáp án A-D.`;
      }
      if (section.questionType === "definition-completion" && section.questions.some((question) => (
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.items.some((item) => {
          const answers = String(item?.correctAnswer || "").split(/[|/]/).map((answer) => answer.trim()).filter(Boolean);
          return !String(item?.questionText || "").replace(/<[^>]*>/g, "").trim() ||
            !answers.length ||
            answers.some((answer) => answer[0].toLowerCase() !== answers[0][0].toLowerCase());
        })
      ))) return `${label}: nhập định nghĩa và đáp án có cùng chữ cái đầu cho từng câu.`;
      if (section.questionType === "word-bank-adjective-formation" && section.questions.some((question) => (
        !Array.isArray(question?.wordBank) ||
        !Array.isArray(question?.items) ||
        !question.items.length ||
        question.wordBank.length !== question.items.length + 1 ||
        question.wordBank.some((word) => !String(word || "").trim()) ||
        question.items.some((item) => (
          (String(item?.questionText || "").match(/\{1\}/g) || []).length !== 1 ||
          !String(item?.questionText || "").replace(/<[^>]*>/g, "").trim() ||
          !String(item?.correctAnswer || "").split(/[|/]/).some((answer) => answer.trim())
        ))
      ))) return `${label}: cần word bank có một từ thừa và mỗi câu có đúng một {1} cùng đáp án.`;
      if (["short-message", "story-writing"].includes(section.questionType)) continue;
      const pointsPerAnswer = Number(section.preparePointsPerAnswer);
      if (!Number.isFinite(pointsPerAnswer) || pointsPerAnswer <= 0) {
        return `${label}: điểm mỗi câu trả lời phải lớn hơn 0.`;
      }
    }
  }
  if (!allowIncompleteScoring && Math.abs(getPrepareTotalPoints(parts) - 50) > 0.001) {
    return `Tổng điểm các câu tự chấm phải bằng 50 (hiện tại ${getPrepareTotalPoints(parts)} điểm).`;
  }
  return "";
};

const hasTwoBlankMarkers = (value) =>
  (String(value || "").match(/\{1\}/g) || []).length === 1 &&
  (String(value || "").match(/\{2\}/g) || []).length === 1;
