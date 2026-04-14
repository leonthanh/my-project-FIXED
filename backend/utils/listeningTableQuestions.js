const LISTENING_CLOZE_TYPE = 'cloze-test';
const LISTENING_TABLE_LEGACY_TYPE = 'table-completion';
const DEFAULT_LISTENING_TABLE_COLUMNS = ['Vehicles', 'Cost', 'Comments'];
const DEFAULT_LISTENING_TABLE_INSTRUCTION =
  'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.';
const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/g;

const safeParseJson = (value) => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const normalizeType = (value) => String(value || '').trim().toLowerCase();

const getParsedClozeTable = (question = {}) => {
  const parsed = safeParseJson(question?.clozeTable);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const normalizeTableRows = (rows, columns = []) => {
  if (!Array.isArray(rows)) return [];

  const columnCount = Array.isArray(columns) ? columns.length : 0;

  return rows.map((row) => {
    const rawRow = row && typeof row === 'object' ? row : {};
    const rawCells = Array.isArray(rawRow.cells) ? rawRow.cells : [];
    const cells =
      columnCount > 0
        ? [
            ...rawCells.slice(0, columnCount),
            ...Array.from({ length: Math.max(0, columnCount - rawCells.length) }, () => ''),
          ]
        : rawCells.slice();

    return {
      ...rawRow,
      cells,
      comments: Array.isArray(rawRow.comments) ? rawRow.comments : rawRow.comments,
    };
  });
};

const getListeningTableQuestionData = (question = {}) => {
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
    rows: normalizeTableRows(rawRows, columns),
  };
};

const getClozeTableBlankMatches = (value) => String(value || '').match(BLANK_REGEX) || [];

const isListeningTableQuestion = (question = {}, section = null) => {
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

  const table = getListeningTableQuestionData(question);
  return table.columns.length > 0 || table.rows.length > 0;
};

const createListeningClozeQuestion = (question = {}) => {
  const merged = {
    ...question,
    questionType: LISTENING_CLOZE_TYPE,
    tableMode: true,
  };
  const table = getListeningTableQuestionData(merged);
  const columns = table.columns.length ? table.columns : DEFAULT_LISTENING_TABLE_COLUMNS;
  const rows = table.rows.length
    ? table.rows
    : normalizeTableRows([{ cells: columns.map(() => '') }], columns);
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

const normalizeListeningQuestion = (question = {}, section = null) => {
  if (isListeningTableQuestion(question, section)) {
    return createListeningClozeQuestion(question);
  }

  return {
    ...question,
    questionType: normalizeType(question?.questionType || section?.questionType || 'fill') || 'fill',
  };
};

const normalizeListeningSection = (section = {}) => {
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

const normalizeListeningPassages = (passages = []) => {
  if (!Array.isArray(passages)) return [];

  return passages.map((part) => ({
    ...part,
    sections: Array.isArray(part?.sections) ? part.sections.map(normalizeListeningSection) : [],
  }));
};

const getListeningSectionType = (section, firstQuestion) => {
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
    } else if (Array.isArray(firstQuestion?.steps) && firstQuestion.steps.length > 0) {
      type = 'flowchart';
    } else if (Array.isArray(firstQuestion?.items) && firstQuestion.items.length > 0) {
      type = 'map-labeling';
    }
  }

  return type;
};

const countListeningTableBlanks = (question = {}) => {
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

const getListeningTableBlankEntries = (question, sectionStart) => {
  const normalizedQuestion = createListeningClozeQuestion(question);
  const answerMap =
    normalizedQuestion.answers &&
    typeof normalizedQuestion.answers === 'object' &&
    !Array.isArray(normalizedQuestion.answers)
      ? normalizedQuestion.answers
      : null;
  let questionNumber = Number.isFinite(sectionStart) ? sectionStart : 1;
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

module.exports = {
  BLANK_REGEX,
  LISTENING_CLOZE_TYPE,
  LISTENING_TABLE_LEGACY_TYPE,
  countListeningTableBlanks,
  createListeningClozeQuestion,
  getListeningSectionType,
  getListeningTableBlankEntries,
  getListeningTableQuestionData,
  isListeningTableQuestion,
  normalizeListeningPassages,
  normalizeListeningQuestion,
  normalizeListeningSection,
};