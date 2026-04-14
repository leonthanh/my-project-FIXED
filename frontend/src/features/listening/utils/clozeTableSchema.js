import { countFlowchartQuestionSlots } from './flowchart';
import {
  getClozeTableBlankMatches,
  normalizeClozeTableRows,
} from '../../../shared/utils/clozeTable';

export const LISTENING_CLOZE_TYPE = 'cloze-test';
export const LISTENING_TABLE_LEGACY_TYPE = 'table-completion';
export const DEFAULT_LISTENING_TABLE_COLUMNS = ['Vehicles', 'Cost', 'Comments'];
export const DEFAULT_LISTENING_TABLE_INSTRUCTION =
  'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.';

const safeParseJson = (value) => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const normalizeType = (value) => String(value || '').trim().toLowerCase();

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ');

const getParsedClozeTable = (question = {}) => {
  const parsed = safeParseJson(question?.clozeTable);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

export const getListeningTableQuestionData = (question = {}) => {
  const clozeTable = getParsedClozeTable(question);
  const questionColumns = safeParseJson(question?.columns);
  const tableColumns = safeParseJson(clozeTable?.columns);
  const questionRows = safeParseJson(question?.rows);
  const tableRows = safeParseJson(clozeTable?.rows);

  const columns = Array.isArray(questionColumns)
    ? questionColumns
    : Array.isArray(tableColumns)
      ? tableColumns
      : [];
  const rawRows = Array.isArray(questionRows)
    ? questionRows
    : Array.isArray(tableRows)
      ? tableRows
      : [];
  const rows = normalizeClozeTableRows(rawRows, columns);

  return {
    title:
      typeof question?.title === 'string'
        ? question.title
        : typeof clozeTable?.title === 'string'
          ? clozeTable.title
          : '',
    instruction:
      typeof question?.instruction === 'string'
        ? question.instruction
        : typeof clozeTable?.instruction === 'string'
          ? clozeTable.instruction
          : '',
    columns,
    rows,
  };
};

export const isListeningTableQuestion = (question = {}, section = null) => {
  const questionType = normalizeType(question?.questionType);
  const sectionType = normalizeType(section?.questionType);

  if (
    questionType === LISTENING_CLOZE_TYPE ||
    questionType === LISTENING_TABLE_LEGACY_TYPE ||
    sectionType === LISTENING_CLOZE_TYPE ||
    sectionType === LISTENING_TABLE_LEGACY_TYPE
  ) {
    return true;
  }

  const { columns, rows } = getListeningTableQuestionData(question);
  return columns.length > 0 || rows.length > 0;
};

export const createListeningClozeQuestion = (overrides = {}) => {
  const merged = {
    ...overrides,
    questionType: LISTENING_CLOZE_TYPE,
    tableMode: true,
  };
  const table = getListeningTableQuestionData(merged);
  const columns = table.columns.length ? table.columns : DEFAULT_LISTENING_TABLE_COLUMNS;
  const rows = table.rows.length
    ? table.rows
    : normalizeClozeTableRows([{ cells: columns.map(() => '') }], columns);
  const title = table.title || '';
  const instruction = table.instruction || DEFAULT_LISTENING_TABLE_INSTRUCTION;

  return {
    ...merged,
    questionType: LISTENING_CLOZE_TYPE,
    tableMode: true,
    title,
    instruction,
    columns,
    rows,
    answers:
      merged.answers && typeof merged.answers === 'object' && !Array.isArray(merged.answers)
        ? merged.answers
        : {},
    clozeTable: {
      title,
      instruction,
      columns,
      rows,
    },
  };
};

export const normalizeListeningQuestion = (question = {}, section = null) => {
  if (isListeningTableQuestion(question, section)) {
    return createListeningClozeQuestion(question);
  }

  const nextType = normalizeType(question?.questionType || section?.questionType || 'fill') || 'fill';
  return {
    ...question,
    questionType: nextType,
  };
};

export const normalizeListeningSection = (section = {}) => {
  const questions = Array.isArray(section?.questions) ? section.questions : [];
  const shouldUseClozeTable =
    normalizeType(section?.questionType) === LISTENING_CLOZE_TYPE ||
    normalizeType(section?.questionType) === LISTENING_TABLE_LEGACY_TYPE ||
    questions.some((question) => isListeningTableQuestion(question, section));

  return {
    ...section,
    questionType: shouldUseClozeTable
      ? LISTENING_CLOZE_TYPE
      : normalizeType(section?.questionType) || 'fill',
    questions: questions.map((question) =>
      shouldUseClozeTable
        ? createListeningClozeQuestion(question)
        : normalizeListeningQuestion(question, section)
    ),
  };
};

export const normalizeListeningParts = (parts = []) => {
  if (!Array.isArray(parts)) return [];

  return parts.map((part) => ({
    ...part,
    sections: Array.isArray(part?.sections) ? part.sections.map(normalizeListeningSection) : [],
  }));
};

export const getListeningSectionType = (section, firstQuestion) => {
  if (isListeningTableQuestion(firstQuestion, section)) {
    return LISTENING_CLOZE_TYPE;
  }

  let type = normalizeType(section?.questionType || firstQuestion?.questionType || 'fill') || 'fill';

  if (type === 'fill') {
    if (firstQuestion?.formRows?.length) {
      type = 'form-completion';
    } else if (firstQuestion?.notesText) {
      type = 'notes-completion';
    } else if (firstQuestion?.leftItems?.length) {
      type = 'matching';
    } else if (firstQuestion?.steps?.length) {
      type = 'flowchart';
    } else if (firstQuestion?.items?.length) {
      type = 'map-labeling';
    } else if (firstQuestion?.options?.length) {
      type = firstQuestion.options.length === 3 ? 'abc' : 'abcd';
    }
  }

  return type;
};

export const countListeningTableBlanks = (question = {}) => {
  const table = getListeningTableQuestionData(question);
  let blanksCount = 0;

  table.rows.forEach((row) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    const maxCols = table.columns.length ? table.columns.length : cells.length;

    for (let columnIndex = 0; columnIndex < maxCols; columnIndex += 1) {
      blanksCount += getClozeTableBlankMatches(cells[columnIndex]).length;
    }
  });

  return blanksCount === 0 ? table.rows.length || 0 : blanksCount;
};

const getFlatCellBlankAnswer = (row, columnIndex, flatBlankIndex) =>
  row?.cellBlankAnswers?.[columnIndex]?.[flatBlankIndex];

export const getListeningTableBlankEntries = (question = {}, startingNumber = 1) => {
  const normalizedQuestion = createListeningClozeQuestion(question);
  const answerMap =
    normalizedQuestion.answers &&
    typeof normalizedQuestion.answers === 'object' &&
    !Array.isArray(normalizedQuestion.answers)
      ? normalizedQuestion.answers
      : null;
  let questionNumber = Number.isFinite(startingNumber) ? startingNumber : 1;
  const entries = [];

  normalizedQuestion.rows.forEach((row) => {
    normalizedQuestion.columns.forEach((columnLabel, columnIndex) => {
      const text = String(row?.cells?.[columnIndex] || '');

      if (/comment/i.test(columnLabel)) {
        let commentFlatBlankIndex = 0;
        text.split('\n').forEach((line, lineIndex) => {
          const blanks = getClozeTableBlankMatches(line);
          blanks.forEach((_, blankIndex) => {
            const currentNumber = questionNumber++;
            const flatBlankIndex = commentFlatBlankIndex++;
            entries.push({
              num: currentNumber,
              expected:
                (answerMap ? answerMap[String(currentNumber)] : undefined) ??
                row?.commentBlankAnswers?.[lineIndex]?.[blankIndex] ??
                getFlatCellBlankAnswer(row, columnIndex, flatBlankIndex) ??
                '',
            });
          });
        });
        return;
      }

      const blanks = getClozeTableBlankMatches(text);
      blanks.forEach((_, blankIndex) => {
        const currentNumber = questionNumber++;
        entries.push({
          num: currentNumber,
          expected:
            (answerMap ? answerMap[String(currentNumber)] : undefined) ??
            row?.cellBlankAnswers?.[columnIndex]?.[blankIndex] ??
            '',
        });
      });
    });
  });

  if (entries.length === 0) {
    normalizedQuestion.rows.forEach((row) => {
      const currentNumber = questionNumber++;
      entries.push({
        num: currentNumber,
        expected:
          (answerMap ? answerMap[String(currentNumber)] : undefined) ??
          row?.correct ??
          row?.cells?.[1] ??
          '',
      });
    });
  }

  return entries;
};

export const countListeningSectionQuestions = (section) => {
  if (!section?.questions) return 0;

  const firstQuestion = section.questions[0] || {};
  const questionType = getListeningSectionType(section, firstQuestion);

  if (questionType === 'matching') {
    return firstQuestion.leftItems?.length || 0;
  }

  if (questionType === 'form-completion') {
    return firstQuestion.formRows?.filter((row) => row.isBlank)?.length || 0;
  }

  if (questionType === 'notes-completion') {
    const notesText = stripHtml(firstQuestion.notesText || '');
    const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
    return blanks.length;
  }

  if (questionType === LISTENING_CLOZE_TYPE) {
    return countListeningTableBlanks(firstQuestion);
  }

  if (questionType === 'map-labeling') {
    return firstQuestion.items?.length || 0;
  }

  if (questionType === 'flowchart') {
    return countFlowchartQuestionSlots(firstQuestion || {});
  }

  if (questionType === 'multi-select') {
    return section.questions.reduce((sum, question) => sum + (question.requiredAnswers || 2), 0);
  }

  return section.questions.length;
};

export const mergeListeningTableAnswers = (question = {}, startingNumber = 1) => {
  const normalizedQuestion = createListeningClozeQuestion(question);
  const answers =
    normalizedQuestion.answers &&
    typeof normalizedQuestion.answers === 'object' &&
    !Array.isArray(normalizedQuestion.answers)
      ? { ...normalizedQuestion.answers }
      : {};
  let nextQuestionNumber = startingNumber;

  normalizedQuestion.rows.forEach((row) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    const maxCols = normalizedQuestion.columns.length
      ? normalizedQuestion.columns.length
      : cells.length;

    for (let columnIndex = 0; columnIndex < maxCols; columnIndex += 1) {
      const columnLabel = normalizedQuestion.columns[columnIndex] || '';
      const text = String(cells[columnIndex] || '');

      if (/comment/i.test(columnLabel)) {
        const lines = text.split('\n');
        let commentFlatBlankIndex = 0;
        lines.forEach((line, lineIndex) => {
          const blanks = getClozeTableBlankMatches(line);
          blanks.forEach((_, blankIndex) => {
            const answerKey = String(nextQuestionNumber++);
            const flatBlankIndex = commentFlatBlankIndex++;
            const expected =
              row?.commentBlankAnswers?.[lineIndex]?.[blankIndex] ||
              getFlatCellBlankAnswer(row, columnIndex, flatBlankIndex) ||
              '';
            if (!answers[answerKey] && expected) {
              answers[answerKey] = expected;
            }
          });
        });
        continue;
      }

      const blanks = getClozeTableBlankMatches(text);
      blanks.forEach((_, blankIndex) => {
        const answerKey = String(nextQuestionNumber++);
        const expected =
          row?.cellBlankAnswers?.[columnIndex]?.[blankIndex] ||
          (columnIndex === 1 ? row?.correct || '' : '');
        if (!answers[answerKey] && expected) {
          answers[answerKey] = expected;
        }
      });
    }
  });

  if (nextQuestionNumber === startingNumber) {
    normalizedQuestion.rows.forEach((row) => {
      const answerKey = String(nextQuestionNumber++);
      const fallbackAnswer = row?.correct || row?.cells?.[1] || '';
      if (!answers[answerKey] && fallbackAnswer) {
        answers[answerKey] = fallbackAnswer;
      }
    });
  }

  return {
    question: {
      ...normalizedQuestion,
      answers,
    },
    nextQuestionNumber,
  };
};

export const prepareListeningPartsForSubmit = (parts = [], stripHtml = (value) => value) => {
  const normalizedParts = normalizeListeningParts(parts);
  let globalQuestionNumber = 1;

  return normalizedParts.map((part) => ({
    ...part,
    instruction: stripHtml(part.instruction || ''),
    sections: (part.sections || []).map((section) => ({
      ...section,
      sectionInstruction: stripHtml(section.sectionInstruction || ''),
      questionType: section.questionType || 'fill',
      questions: (section.questions || []).map((question) => {
        const normalizedQuestion = {
          ...question,
          questionText: stripHtml(question.questionText || ''),
          options: question.options
            ? question.options.map((option) => (typeof option === 'string' ? option : option))
            : undefined,
        };
        const questionType = section.questionType || normalizedQuestion.questionType || 'fill';

        if (questionType === LISTENING_CLOZE_TYPE) {
          const merged = mergeListeningTableAnswers(normalizedQuestion, globalQuestionNumber);
          globalQuestionNumber = merged.nextQuestionNumber;
          return merged.question;
        }

        if (questionType === 'form-completion') {
          const rows = Array.isArray(normalizedQuestion.formRows) ? normalizedQuestion.formRows : [];
          const blankCount = rows.filter((row) => row && row.isBlank).length || 1;
          globalQuestionNumber += blankCount;
          return normalizedQuestion;
        }

        if (questionType === 'matching') {
          globalQuestionNumber += normalizedQuestion.leftItems?.length || 1;
          return normalizedQuestion;
        }

        if (questionType === 'flowchart') {
          globalQuestionNumber += countFlowchartQuestionSlots(normalizedQuestion) || 1;
          return normalizedQuestion;
        }

        if (questionType === 'notes-completion') {
          const notesText = normalizedQuestion.notesText || '';
          const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
          globalQuestionNumber += blanks.length || 1;
          return normalizedQuestion;
        }

        if (questionType === 'multi-select') {
          globalQuestionNumber += normalizedQuestion.requiredAnswers || 2;
          return normalizedQuestion;
        }

        globalQuestionNumber += 1;
        return normalizedQuestion;
      }),
    })),
  }));
};