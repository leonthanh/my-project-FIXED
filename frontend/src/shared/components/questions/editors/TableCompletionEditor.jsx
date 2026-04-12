import React from 'react';
import TableCompletion from './TableCompletion';
import { compactInputStyle } from '../../../../features/listening/utils/styles';
import InlineIcon from '../../InlineIcon.jsx';

const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/gi;

const normalizeMultilineText = (value) => String(value || '').replace(/\r\n?/g, '\n');

const buildCommentBlankAnswers = (lines, existingAnswers = []) =>
  lines.map((line, lineIndex) => {
    const blanks = normalizeMultilineText(line).match(BLANK_REGEX) || [];
    const previous = existingAnswers[lineIndex] || [];
    return blanks.map((_, blankIndex) => previous[blankIndex] || '');
  });

const cellTextareaStyle = {
  ...compactInputStyle,
  width: '100%',
  minWidth: 160,
  minHeight: 64,
  resize: 'vertical',
  lineHeight: 1.5,
  fontFamily: 'inherit',
};

/**
 * TableCompletionEditor - Admin editor for Table Completion questions
 * Props:
 * - question: the question object with { title, instruction, columns: [], rows: [{ vehicle, cost, comments: [] }] }
 * - onChange: function(field, value)
 * - startingNumber
 */
export default function TableCompletionEditor({ question = {}, onChange = () => {}, startingNumber = 1 }) {
  const columns = question.columns || ['Vehicles', 'Cost', 'Comments'];
  const rows = question.rows || [];

  // Columns handlers
  const setColumns = (newCols) => onChange('columns', newCols);
  const updateColumn = (idx, value) => {
    const next = [...columns];
    next[idx] = value;
    setColumns(next);
  };
  const addColumn = () => setColumns([...columns, `Column ${columns.length + 1}`]);
  const deleteColumn = (idx) => setColumns(columns.filter((_, i) => i !== idx));

  // Rows handlers (now generic cells per column)
  const setRows = (newRows) => onChange('rows', newRows);

  const ensureRowCells = (r) => {
    const c = columns.length || 3;
    // if no row, create blank cells + blank answers
    if (!r) return { cells: Array.from({ length: c }).map(() => ''), cellBlankAnswers: [], comments: [] };
    // already modern shape
    if (Array.isArray(r.cells)) {
      const nextCells = r.cells.slice(0, c);
      while (nextCells.length < c) nextCells.push('');
      // ensure comments array kept in sync for column named 'comments'
      const comments = Array.isArray(r.comments)
        ? r.comments.map((line) => normalizeMultilineText(line))
        : (nextCells[2] ? normalizeMultilineText(nextCells[2]).split('\n') : []);
      return { ...r, cells: nextCells, cellBlankAnswers: r.cellBlankAnswers || [], comments };
    }
    // legacy mapping: vehicle, cost, comments -> cells + comments array
    const legacy = [];
    legacy[0] = r.vehicle || '';
    legacy[1] = r.cost || '';
    legacy[2] = Array.isArray(r.comments) ? r.comments.join('\n') : normalizeMultilineText(r.comments || '');
    while (legacy.length < c) legacy.push('');
    const comments = Array.isArray(r.comments)
      ? r.comments.map((line) => normalizeMultilineText(line))
      : (legacy[2] ? normalizeMultilineText(legacy[2]).split('\n') : []);
    return { ...r, cells: legacy, cellBlankAnswers: r.cellBlankAnswers || [], comments };
  };

  const addRow = () => setRows([...rows, ensureRowCells({})]);
  const deleteRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const updateCellValue = (rowIdx, colIdx, value) => {
    const next = [...rows];
    const r = ensureRowCells(next[rowIdx]);
    const cells = [...(r.cells || [])];
    const normalizedValue = normalizeMultilineText(value);
    cells[colIdx] = normalizedValue;

    // update per-cell blank answers to align with number of blanks
    const matches = normalizedValue.match(BLANK_REGEX) || [];
    const existing = (r.cellBlankAnswers && r.cellBlankAnswers[colIdx]) || [];
    const newAnswers = matches.map((_, i) => existing[i] || '');

    const nextCellBlankAnswers = [...(r.cellBlankAnswers || [])];
    nextCellBlankAnswers[colIdx] = newAnswers;

    next[rowIdx] = { ...r, cells, cellBlankAnswers: nextCellBlankAnswers };
    setRows(next);

    // If this is column 1 (cost) and no blanks but non-empty, treat as correct
    if (colIdx === 1) {
      const hasBlank = matches.length > 0;
      if (!hasBlank && normalizedValue.trim() !== '') {
        next[rowIdx] = { ...next[rowIdx], correct: normalizedValue.trim() };
        setRows(next);
      }
    }
  };

  const updateCommentsValue = (rowIdx, colIdx, value) => {
    const next = [...rows];
    const r = ensureRowCells(next[rowIdx]);
    const normalizedValue = normalizeMultilineText(value);
    const commentLines = normalizedValue.split('\n');
    const cells = [...(r.cells || [])];
    cells[colIdx] = normalizedValue;

    next[rowIdx] = {
      ...r,
      cells,
      comments: commentLines,
      commentBlankAnswers: buildCommentBlankAnswers(commentLines, r.commentBlankAnswers || []),
    };

    setRows(next);
  };

  const appendCommentBlank = (rowIdx, colIdx, currentValue) => {
    const base = normalizeMultilineText(currentValue);
    const nextValue = `${base}${base && !/[\s\n]$/.test(base) ? ' ' : ''}[BLANK]`;
    updateCommentsValue(rowIdx, colIdx, nextValue);
  };

  const insertBlank = (rowIdx, colIdx) => {
    const next = [...rows];
    const r = ensureRowCells(next[rowIdx]);
    const text = String((r.cells && r.cells[colIdx]) || '');
    const updated = text + (text && !text.endsWith(' ') ? ' ' : '') + '[BLANK]';
    updateCellValue(rowIdx, colIdx, updated);
  };
  return (
    <div>
      <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Tiêu đề bảng</label>
        <input
          type="text"
          value={question.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="VD: Island Transport"
          style={{ ...compactInputStyle, fontWeight: 700 }}
        />

        <label style={{ display: 'block', fontWeight: 700, margin: '12px 0 6px' }}>Hướng dẫn</label>
        <input
          type="text"
          value={question.instruction || ''}
          onChange={(e) => onChange('instruction', e.target.value)}
          placeholder="VD: Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer."
          style={compactInputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Columns - horizontal above rows */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Columns</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {columns.map((col, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 200, flex: '1 1 220px' }}>
                <input
                  type="text"
                  value={col}
                  onChange={(e) => updateColumn(idx, e.target.value)}
                  style={{ ...compactInputStyle, flex: 1, minWidth: 160 }}
                />
                <button type="button" onClick={() => deleteColumn(idx)} style={{ padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><InlineIcon name="close" size={12} style={{ color: 'currentColor' }} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addColumn} style={{ padding: '8px 10px', fontWeight: 700 }}>Thêm cột</button>
            <button type="button" onClick={() => setColumns(['Vehicles', 'Cost', 'Comments'])} style={{ padding: '8px 10px' }}>Reset</button>
          </div>
        </div>

        {/* Rows - full width */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Rows</h4>
          {rows.map((row, idx) => {
            const normalizedRow = ensureRowCells(row);

            return (
            <div
              key={idx}
              style={{
                border: '1px solid #f1f5f9',
                padding: 10,
                borderRadius: 6,
                marginBottom: 8,
                background: 'white',
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                {columns.map((col, cIdx) => {
                  const thisCell = (normalizedRow.cells && normalizedRow.cells[cIdx]) ?? '';
                  const isCommentsCol = /comment/i.test(col);

                  // Comments column: each line in the textarea becomes one list item.
                  if (isCommentsCol) {
                    const commentValue = Array.isArray(normalizedRow.comments)
                      ? normalizeMultilineText(normalizedRow.comments.join('\n'))
                      : normalizeMultilineText(thisCell || '');
                    const commentLines = commentValue.split('\n');
                    const answersByLine = normalizedRow.commentBlankAnswers || []; // legacy

                    return (
                      <div key={cIdx} style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ border: '1px solid #eef2f6', borderRadius: 8, padding: 8, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: '#333', fontWeight: 700 }}>{col}</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" onClick={() => appendCommentBlank(idx, cIdx, commentValue)} style={{ padding: '2px 6px', fontSize: 10 }}>[BLANK]</button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea
                              value={commentValue}
                              onChange={(e) => updateCommentsValue(idx, cIdx, e.target.value)}
                              placeholder="Moi dong se tro thanh mot muc trong list comments. Khong can go -, • hay 1."
                              rows={Math.max(4, commentLines.length || 1)}
                              style={{ ...cellTextareaStyle, minHeight: 120 }}
                            />

                            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                              Enter = them mot dong moi trong list. Tren giao dien hoc sinh, moi dong se tu hien thanh dau bullet.
                            </div>

                            {commentLines.map((line, li) => {
                              const blanks = normalizeMultilineText(line).match(BLANK_REGEX) || [];
                              if (blanks.length === 0) return null;

                              return (
                                <div key={li} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>
                                    Dong {li + 1}
                                  </div>

                                  {/* Per-blank inputs for this comment line */}
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {blanks.map((_, bi) => (
                                      <div key={bi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ background: '#f1f5f9', padding: '4px 6px', borderRadius: 6, fontSize: 12 }}>#{bi + 1}</span>
                                        <input
                                          type="text"
                                          value={(answersByLine[li] && answersByLine[li][bi]) || ''}
                                          onChange={(e) => {
                                            const next = [...rows];
                                            const r = ensureRowCells(next[idx]);
                                            const cb = [...(r.commentBlankAnswers || [])];
                                            cb[li] = cb[li] || [];
                                            cb[li][bi] = e.target.value;
                                            next[idx] = { ...r, commentBlankAnswers: cb };
                                            setRows(next);
                                          }}
                                          placeholder="Answer"
                                          style={{ ...compactInputStyle, width: 160 }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default: regular cell editor
                  const blanks = String(thisCell || '').match(BLANK_REGEX) || [];
                  return (
                    <div key={cIdx} style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ border: '1px solid #eef2f6', borderRadius: 8, padding: 8, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: 12, color: '#333', fontWeight: 700 }}>{col}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => insertBlank(idx, cIdx)} style={{ padding: '2px 6px', fontSize: 10 }}>[BLANK]</button>
                          </div>
                        </div>

                        <textarea
                          value={thisCell}
                          onChange={(e) => updateCellValue(idx, cIdx, e.target.value)}
                          placeholder={col}
                          rows={Math.max(2, normalizeMultilineText(thisCell).split('\n').length || 1)}
                          style={cellTextareaStyle}
                        />

                        {/* Per-blank answer inputs for this cell (compact numbered badges) */}
                        {blanks.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {blanks.map((_, bi) => (
                              <div key={bi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ background: '#f1f5f9', padding: '4px 6px', borderRadius: 6, fontSize: 12 }}>#{bi + 1}</span>
                                <input
                                  type="text"
                                  value={(normalizedRow.cellBlankAnswers && normalizedRow.cellBlankAnswers[cIdx] && normalizedRow.cellBlankAnswers[cIdx][bi]) || ''}
                                  onChange={(e) => {
                                    const next = [...rows];
                                    const cb = [...(next[idx].cellBlankAnswers || [])];
                                    cb[cIdx] = cb[cIdx] || [];
                                    cb[cIdx][bi] = e.target.value;
                                    next[idx] = { ...ensureRowCells(next[idx]), cellBlankAnswers: cb };
                                    setRows(next);
                                  }}
                                  placeholder="Answer"
                                  style={{ ...compactInputStyle, width: 160 }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" onClick={() => deleteRow(idx)} style={{ padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><InlineIcon name="close" size={12} style={{ color: 'currentColor' }} /></button>
                </div>
              </div>
            </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addRow} style={{ padding: '8px 12px', fontWeight: 700 }}>Thêm hàng</button>
            <button type="button" onClick={() => setRows([ensureRowCells({})])} style={{ padding: '8px 12px' }}>Reset</button>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Preview</h4>
          <TableCompletion data={{
            part: 1,
            title: question.title || '',
            instruction: question.instruction || '',
            columns: columns,
            rows: rows,
            rangeStart: question.rangeStart,
            rangeEnd: question.rangeEnd,
          }} startingQuestionNumber={startingNumber} />
        </div>
      </div>
    </div>
  );
}
