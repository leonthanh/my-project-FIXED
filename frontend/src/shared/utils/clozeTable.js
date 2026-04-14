const TABLE_CLOZE_BLANK_PATTERN = /\[BLANK\]|_{2,}|[\u2026]+/gi;
const COMMENT_COLUMN_PATTERN = /comment/i;

const createBlankRegex = () => new RegExp(TABLE_CLOZE_BLANK_PATTERN);

export const normalizeClozeTableText = (value) => String(value || '').replace(/\r\n?/g, '\n');

export const isClozeCommentsColumn = (label) =>
  COMMENT_COLUMN_PATTERN.test(String(label || ''));

export const stripClozeCommentPrefix = (line) =>
  String(line || '')
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
    .trimEnd();

export const normalizeClozeTableRows = (rows, columns = []) => {
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
      comments: Array.isArray(rawRow.comments)
        ? rawRow.comments.map((line) => normalizeClozeTableText(line))
        : rawRow.comments,
    };
  });
};

export const getClozeTableBlankMatches = (value) =>
  normalizeClozeTableText(value).match(createBlankRegex()) || [];

export const splitClozeTableLine = (value) => {
  const text = normalizeClozeTableText(value);
  const regex = createBlankRegex();
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'blank', raw: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
};

export const getClozeTableCellLines = (value, columnLabel) => {
  const normalized = normalizeClozeTableText(value);
  const rawLines = normalized.split('\n');

  if (isClozeCommentsColumn(columnLabel)) {
    return rawLines
      .map((line) => stripClozeCommentPrefix(line))
      .filter((line) => line.trim() !== '')
      .map((line) => splitClozeTableLine(line));
  }

  return rawLines.map((line) => splitClozeTableLine(line));
};

export const hydrateClozeTableRowsFromBlanks = (rows, columns = [], blanks = []) => {
  const normalizedRows = normalizeClozeTableRows(rows, columns);
  const legacyAnswers = Array.isArray(blanks)
    ? blanks.map((blank) => (blank && typeof blank === 'object' ? blank.correctAnswer || '' : ''))
    : [];
  let blankIndex = 0;

  return normalizedRows.map((row) => {
    const nextRow = {
      ...row,
      cellBlankAnswers: Array.isArray(row.cellBlankAnswers)
        ? row.cellBlankAnswers.map((answers) =>
            Array.isArray(answers) ? [...answers] : []
          )
        : [],
      commentBlankAnswers: Array.isArray(row.commentBlankAnswers)
        ? row.commentBlankAnswers.map((answers) =>
            Array.isArray(answers) ? [...answers] : []
          )
        : [],
    };

    columns.forEach((columnLabel, columnIndex) => {
      const cellValue = nextRow.cells?.[columnIndex] || '';

      if (isClozeCommentsColumn(columnLabel)) {
        const lines = Array.isArray(nextRow.comments)
          ? nextRow.comments.map((line) => normalizeClozeTableText(line))
          : normalizeClozeTableText(cellValue).split('\n');

        const existingAnswersByLine = Array.isArray(nextRow.commentBlankAnswers)
          ? nextRow.commentBlankAnswers
          : [];

        nextRow.comments = lines;
        nextRow.commentBlankAnswers = lines.map((line, lineIndex) => {
          const lineBlanks = getClozeTableBlankMatches(line);
          const existingLineAnswers = Array.isArray(existingAnswersByLine[lineIndex])
            ? existingAnswersByLine[lineIndex]
            : [];

          return lineBlanks.map((_, lineBlankIndex) => {
            const existingValue = existingLineAnswers[lineBlankIndex];
            const fallbackValue = legacyAnswers[blankIndex];
            blankIndex += 1;
            return existingValue !== undefined ? existingValue : fallbackValue || '';
          });
        });

        return;
      }

      const cellBlanks = getClozeTableBlankMatches(cellValue);
      const existingCellAnswers = Array.isArray(nextRow.cellBlankAnswers[columnIndex])
        ? nextRow.cellBlankAnswers[columnIndex]
        : [];

      nextRow.cellBlankAnswers[columnIndex] = cellBlanks.map((_, cellBlankIndex) => {
        const existingValue = existingCellAnswers[cellBlankIndex];
        const fallbackValue = legacyAnswers[blankIndex];
        blankIndex += 1;
        return existingValue !== undefined ? existingValue : fallbackValue || '';
      });
    });

    return nextRow;
  });
};

export const extractClozeTableBlanks = (rows, columns = []) => {
  const normalizedRows = normalizeClozeTableRows(rows, columns);
  const blanks = [];

  normalizedRows.forEach((row) => {
    columns.forEach((columnLabel, columnIndex) => {
      const cellValue = row.cells?.[columnIndex] || '';

      if (isClozeCommentsColumn(columnLabel)) {
        const lines = Array.isArray(row.comments)
          ? row.comments.map((line) => normalizeClozeTableText(line))
          : normalizeClozeTableText(cellValue).split('\n');
        const answersByLine = Array.isArray(row.commentBlankAnswers)
          ? row.commentBlankAnswers
          : [];

        lines.forEach((line, lineIndex) => {
          const lineBlanks = getClozeTableBlankMatches(line);

          lineBlanks.forEach((_, lineBlankIndex) => {
            blanks.push({
              id: `blank_${blanks.length}`,
              blankNumber: blanks.length + 1,
              correctAnswer: answersByLine?.[lineIndex]?.[lineBlankIndex] || '',
            });
          });
        });

        return;
      }

      const cellBlanks = getClozeTableBlankMatches(cellValue);
      const answersByCell = Array.isArray(row.cellBlankAnswers?.[columnIndex])
        ? row.cellBlankAnswers[columnIndex]
        : [];

      cellBlanks.forEach((_, cellBlankIndex) => {
        blanks.push({
          id: `blank_${blanks.length}`,
          blankNumber: blanks.length + 1,
          correctAnswer: answersByCell[cellBlankIndex] || '',
        });
      });
    });
  });

  return blanks;
};
