const getNormalizedQuestionType = (question = {}) =>
  String(question.questionType || question.type || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase();

const getClozeText = (question) => {
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

const normalizeTableRows = (rows, columns) => {
  if (!Array.isArray(rows)) return [];

  const columnCount = Array.isArray(columns) ? columns.length : 0;

  return rows.map((row) => {
    const rawCells = Array.isArray(row?.cells) ? row.cells : [];
    const cells =
      columnCount > 0
        ? [
            ...rawCells.slice(0, columnCount),
            ...Array.from({ length: Math.max(0, columnCount - rawCells.length) }, () => ''),
          ]
        : rawCells;

    return {
      ...(row && typeof row === 'object' ? row : {}),
      cells,
    };
  });
};

const getActiveClozeTable = (question) => {
  if (!question || typeof question !== 'object' || !question.tableMode) {
    return null;
  }

  const table = question.clozeTable;
  if (!table || !Array.isArray(table.rows)) {
    return null;
  }

  const columns = Array.isArray(table.columns) ? table.columns : [];

  return {
    columns,
    rows: normalizeTableRows(table.rows, columns),
  };
};

const countClozeBlanks = (question) => {
  const table = getActiveClozeTable(question);
  if (table) {
    return table.rows.reduce((total, row) => {
      const rowCount = (Array.isArray(row?.cells) ? row.cells : []).reduce(
        (cellTotal, cell) => cellTotal + ((String(cell || '').match(/\[BLANK\]/gi) || []).length),
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

module.exports = {
  countClozeBlanks,
  getActiveClozeTable,
  getClozeText,
  getNormalizedQuestionType,
  normalizeTableRows,
};