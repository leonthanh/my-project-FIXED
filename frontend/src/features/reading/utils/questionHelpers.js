/**
 * Question Helper Functions for Reading Test
 * Các hàm xử lý câu hỏi
 */

import {
  getClozeTableBlankMatches,
  normalizeClozeTableRows,
} from '../../../shared/utils/clozeTable';

/**
 * Tính số câu hỏi thực tế từ questionNumber
 * Xử lý các format: "38-40" (3 câu), "38" (1 câu), "38,39,40" (3 câu)
 * @param {string|number} questionNumber
 * @returns {number} Số câu hỏi
 */
export const getQuestionCount = (questionNumber) => {
  if (!questionNumber) return 1;

  const qNum = String(questionNumber).trim();

  // Handle range format: "38-40"
  if (qNum.includes("-") && !qNum.includes(",")) {
    const parts = qNum.split("-").map((p) => p.trim());
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        return end - start + 1;
      }
    }
  }

  // Handle comma-separated format: "38,39,40"
  if (qNum.includes(",")) {
    const parts = qNum
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    return parts.length;
  }

  // Single number: "38"
  return 1;
};

/**
 * Lấy số câu bắt đầu từ questionNumber.
 * Hỗ trợ các format: "38-40", "38,39,40", "38"
 * @param {string|number} questionNumber
 * @returns {number|null}
 */
export const getQuestionStart = (questionNumber) => {
  if (questionNumber === undefined || questionNumber === null) return null;

  const raw = String(questionNumber).trim();
  if (!raw) return null;

  const match = raw.match(/\d+/);
  if (!match) return null;

  const parsed = parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const resolveQuestionStartNumber = (question, fallback = null) => {
  const explicitStart = getQuestionStart(question?.questionNumber);
  if (explicitStart !== null) {
    return explicitStart;
  }

  const legacyStart = getQuestionStart(question?.startQuestion);
  if (legacyStart !== null) {
    return legacyStart;
  }

  return getQuestionStart(fallback);
};

const stripHtml = (value) => String(value || '').replace(/<[^>]+>/g, ' ');

export const getClozeText = (question) => {
  if (!question || typeof question !== 'object') return null;

  return (
    question.paragraphText ||
    question.passageText ||
    question.text ||
    question.paragraph ||
    (question.questionText && question.questionText.includes('[BLANK]')
      ? question.questionText
      : null)
  );
};

export const getActiveClozeTable = (question) => {
  if (!question || typeof question !== 'object' || !question.tableMode) {
    return null;
  }

  const table = question.clozeTable;
  if (!table || !Array.isArray(table.rows)) {
    return null;
  }

  const columns = Array.isArray(table.columns) ? table.columns : [];

  return {
    title: typeof table.title === 'string' ? table.title : question.tableTitle || '',
    instruction:
      typeof table.instruction === 'string'
        ? table.instruction
        : question.tableInstruction || '',
    columns,
    rows: normalizeClozeTableRows(table.rows, columns),
  };
};

export const countClozeBlanks = (question) => {
  const table = getActiveClozeTable(question);
  if (table) {
    return table.rows.reduce((total, row) => {
      const rowCount = (Array.isArray(row?.cells) ? row.cells : []).reduce(
        (cellTotal, cell) => cellTotal + getClozeTableBlankMatches(cell).length,
        0
      );
      return total + rowCount;
    }, 0);
  }

  const clozeText = getClozeText(question);
  if (clozeText) {
    return (clozeText.match(/\[BLANK\]/gi) || []).length;
  }

  return Array.isArray(question?.blanks) ? question.blanks.length : 0;
};

const getStructuralQuestionCount = (question) => {
  if (!question || typeof question !== 'object') return 1;

  const normalizedType = String(question.questionType || question.type || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase();

  if (normalizedType === 'cloze-test' || normalizedType === 'summary-completion') {
    const clozeBlankCount = countClozeBlanks(question);
    if (clozeBlankCount > 0) {
      return clozeBlankCount;
    }
  }

  if (
    (normalizedType === 'cloze-test' || normalizedType === 'summary-completion') &&
    Array.isArray(question.blanks) &&
    question.blanks.length > 0
  ) {
    return question.blanks.length;
  }

  if (normalizedType === 'multi-select') {
    const requiredAnswers = Number(question.requiredAnswers || question.maxSelection || 0);
    if (Number.isFinite(requiredAnswers) && requiredAnswers > 0) {
      return requiredAnswers;
    }
  }

  if (
    (normalizedType === 'paragraph-matching' || normalizedType === 'ielts-matching-headings') &&
    Array.isArray(question.paragraphs) &&
    question.paragraphs.length > 0
  ) {
    return question.paragraphs.length;
  }

  if (Array.isArray(question.blanks) && question.blanks.length > 0) {
    return question.blanks.length;
  }

  const plainText = stripHtml(question.questionText || question.paragraphText || '');
  const blankCount = (plainText.match(/\[BLANK\]/g) || []).length;

  return blankCount || 1;
};

/**
 * Tính số lượng câu ngầm định của một question khi chưa có questionNumber rõ ràng.
 * @param {Object} question
 * @returns {number}
 */
export const getImpliedQuestionCount = (question) => {
  if (!question || typeof question !== 'object') return 1;

  const structuralCount = getStructuralQuestionCount(question);

  if (question.questionNumber) {
    return Math.max(getQuestionCount(question.questionNumber), structuralCount);
  }

  return structuralCount;
};

export const formatQuestionNumber = (startNumber, questionCount = 1, template = '') => {
  const start = parseInt(startNumber, 10);
  const count = Math.max(1, Number(questionCount) || 1);

  if (!Number.isFinite(start)) {
    return '1';
  }

  if (count === 1) {
    return String(start);
  }

  if (String(template || '').includes(',')) {
    return Array.from({ length: count }, (_, index) => start + index).join(', ');
  }

  return `${start}-${start + count - 1}`;
};

export const renumberQuestionsFrom = (
  passages,
  startPassageIndex,
  startSectionIndex,
  startQuestionIndex,
  startingNumber
) => {
  if (!Array.isArray(passages)) return passages;

  let nextNumber = parseInt(startingNumber, 10);
  if (!Number.isFinite(nextNumber)) return passages;

  for (let passageIndex = startPassageIndex; passageIndex < passages.length; passageIndex++) {
    const sections = Array.isArray(passages[passageIndex]?.sections)
      ? passages[passageIndex].sections
      : [];

    for (
      let sectionIndex = passageIndex === startPassageIndex ? startSectionIndex : 0;
      sectionIndex < sections.length;
      sectionIndex++
    ) {
      const questions = Array.isArray(sections[sectionIndex]?.questions)
        ? sections[sectionIndex].questions
        : [];

      for (
        let questionIndex =
          passageIndex === startPassageIndex && sectionIndex === startSectionIndex
            ? startQuestionIndex
            : 0;
        questionIndex < questions.length;
        questionIndex++
      ) {
        const question = questions[questionIndex];
        if (!question || typeof question !== 'object') continue;

        const questionCount = Math.max(1, getImpliedQuestionCount(question));
        question.questionNumber = formatQuestionNumber(
          nextNumber,
          questionCount,
          question.questionNumber
        );
        question.startQuestion = nextNumber;
        nextNumber += questionCount;
      }
    }
  }

  return passages;
};

/**
 * Tính questionNumber tiếp theo cho section đang thêm câu hỏi.
 * Duyệt theo thứ tự passage/section/question để giữ numbering liên tục toàn bài.
 * @param {Array} passages
 * @param {number} targetPassageIndex
 * @param {number} targetSectionIndex
 * @returns {number}
 */
export const getNextQuestionNumber = (passages, targetPassageIndex, targetSectionIndex) => {
  if (!Array.isArray(passages)) return 1;

  let nextNumber = 1;

  for (let passageIndex = 0; passageIndex < passages.length; passageIndex++) {
    const sections = Array.isArray(passages[passageIndex]?.sections)
      ? passages[passageIndex].sections
      : [];

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const questions = Array.isArray(sections[sectionIndex]?.questions)
        ? sections[sectionIndex].questions
        : [];

      questions.forEach((question) => {
        const start = resolveQuestionStartNumber(question, null);
        const count = Math.max(1, getImpliedQuestionCount(question));

        if (start !== null) {
          nextNumber = Math.max(nextNumber, start + count);
          return;
        }

        nextNumber += count;
      });

      if (passageIndex === targetPassageIndex && sectionIndex === targetSectionIndex) {
        return nextNumber;
      }
    }
  }

  return nextNumber;
};

/**
 * Tính tổng số câu hỏi trong tất cả passages
 * @param {Array} passages - Mảng passages
 * @returns {number} Tổng số câu hỏi
 */
export const calculateTotalQuestions = (passages) => {
  if (!passages || !Array.isArray(passages)) return 0;

  let total = 0;

  passages.forEach((p) => {
    p.sections?.forEach((sec) => {
      sec.questions?.forEach((q) => {
        total += getImpliedQuestionCount(q);
      });
    });
  });

  return total;
};

/**
 * Tạo câu hỏi mặc định theo loại
 * @param {string} type - Loại câu hỏi
 * @returns {Object} Câu hỏi mặc định
 */
export const createDefaultQuestionByType = (type) => {
  const baseQuestion = {
    questionNumber: 1,
    questionType: type,
    questionText: "",
    correctAnswer: "",
    options: [],
  };

  switch (type) {
    case "multiple-choice":
      return { ...baseQuestion, options: ["", "", "", ""] };

    case "multi-select":
      return {
        ...baseQuestion,
        options: ["", "", "", "", ""],
        maxSelection: 2,
      };

    case "fill-in-the-blanks":
      return { ...baseQuestion, maxWords: 3 };

    case "matching":
      return {
        ...baseQuestion,
        questionText: "Match the items:",
        leftItems: ["Item A", "Item B", "Item C"],
        rightItems: ["Item 1", "Item 2", "Item 3"],
        matches: ["1", "2", "3"],
      };

    case "true-false-not-given":
      return { ...baseQuestion, correctAnswer: "TRUE" };

    case "yes-no-not-given":
      return { ...baseQuestion, correctAnswer: "YES" };

    case "cloze-test":
      return {
        ...baseQuestion,
        paragraphText:
          "Another example of cheap technology helping poor people in the countryside is [BLANK]. Kerosene lamps and conventional bulbs give off less [BLANK] than GSBF lamps.",
        maxWords: 3,
        blanks: [
          { id: "blank_0", blankNumber: 1, correctAnswer: "" },
          { id: "blank_1", blankNumber: 2, correctAnswer: "" },
        ],
        tableMode: false,
        tableColumns: ["Test", "Findings"],
        tableRows: [{ cells: ["", ""] }],
        clozeTable: null,
      };

    case "summary-completion":
      return {
        ...baseQuestion,
        questionText: "Complete the summary using the list of words A-L below. Write the correct letter next to each blank. Example: [BLANK] ...",
        options: ["", "", "", "", "", "", "", "", "", "", "", ""], // A-L (12 empty slots)
        blanks: [],
      };

    case "paragraph-matching":
      return { ...baseQuestion, correctAnswer: "A" };

    case "sentence-completion":
      return { ...baseQuestion, options: ["", "", "", ""], correctAnswer: "A" };



    case "short-answer":
      return { ...baseQuestion, maxWords: 3 };

    default:
      return { ...baseQuestion, options: ["", "", "", ""] };
  }
};

/**
 * Tạo passage mới với section mặc định
 * @returns {Object} Passage mới
 */
export const createNewPassage = () => ({
  passageTitle: "",
  passageText: "",
  sections: [
    {
      sectionTitle: "",
      sectionInstruction: "",
      sectionImage: null,
      questions: [
        {
          questionNumber: 1,
          questionType: "multiple-choice",
          questionText: "",
          options: [""],
          correctAnswer: "",
        },
      ],
    },
  ],
});

/**
 * Tạo section mới
 * @param {number} sectionNumber - Số thứ tự section
 * @returns {Object} Section mới
 */
export const createNewSection = (sectionNumber = 1) => ({
  sectionTitle: `Section ${sectionNumber}`,
  sectionInstruction: "",
  sectionImage: null,
  questions: [],
});

/**
 * Tạo câu hỏi mới mặc định
 * @param {number} questionNumber - Số thứ tự câu hỏi
 * @returns {Object} Câu hỏi mới
 */
export const createNewQuestion = (questionNumber = 1) => ({
  questionNumber,
  questionType: "multiple-choice",
  questionText: "",
  options: [""],
  correctAnswer: "",
});

/**
 * Normalize question type string to canonical form used across the codebase.
 * Accepts variants like 'true-false-notgiven' and returns 'true-false-not-given'.
 * @param {string} type
 * @returns {string}
 */
export const normalizeQuestionType = (type) => {
  if (!type) return "multiple-choice";
  const raw = String(type).trim();
  // Normalize separators to single hyphen and lowercase
  const normalized = raw
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .toLowerCase();

  // Map common variants to canonical types
  if (
    normalized === "true-false-notgiven" ||
    normalized === "true-false-not-given" ||
    normalized === "true-false-not-givn"
  ) {
    return "true-false-not-given";
  }
  if (normalized === "yes-no-notgiven" || normalized === "yes-no-not-given") {
    return "yes-no-not-given";
  }

  // Normalize matching headings variants to canonical form used across the app
  if (normalized === "matching-headings" || normalized === "ielts-matching-headings") {
    return "ielts-matching-headings";
  }

  // Return normalized or original if not in mapping
  return normalized;
};
