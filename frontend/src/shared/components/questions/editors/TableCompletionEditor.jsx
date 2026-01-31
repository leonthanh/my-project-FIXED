import React from 'react';
import TableCompletion from './TableCompletion';
import { compactInputStyle } from '../../../../features/listening/utils/styles';

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
      const comments = Array.isArray(r.comments) ? r.comments : (nextCells[2] ? String(nextCells[2]).split('\n') : []);
      return { ...r, cells: nextCells, cellBlankAnswers: r.cellBlankAnswers || [], comments };
    }
    // legacy mapping: vehicle, cost, comments -> cells + comments array
    const legacy = [];
    legacy[0] = r.vehicle || '';
    legacy[1] = r.cost || '';
    legacy[2] = Array.isArray(r.comments) ? r.comments.join('\n') : (r.comments || '');
    while (legacy.length < c) legacy.push('');
    const comments = Array.isArray(r.comments) ? r.comments : (legacy[2] ? String(legacy[2]).split('\n') : []);
    return { ...r, cells: legacy, cellBlankAnswers: r.cellBlankAnswers || [], comments };
  };

  const addRow = () => setRows([...rows, ensureRowCells({})]);
  const deleteRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const updateCellValue = (rowIdx, colIdx, value) => {
    const next = [...rows];
    const r = ensureRowCells(next[rowIdx]);
    const cells = [...(r.cells || [])];
    cells[colIdx] = value;

    // update per-cell blank answers to align with number of blanks
    const BLANK_DETECT = /\[BLANK\]|_{2,}|[\u2026]+/gi;
    const matches = (String(value || '').match(BLANK_DETECT) || []);
    const existing = (r.cellBlankAnswers && r.cellBlankAnswers[colIdx]) || [];
    const newAnswers = matches.map((_, i) => existing[i] || '');

    const nextCellBlankAnswers = [...(r.cellBlankAnswers || [])];
    nextCellBlankAnswers[colIdx] = newAnswers;

    next[rowIdx] = { ...r, cells, cellBlankAnswers: nextCellBlankAnswers };
    setRows(next);

    // If this is column 1 (cost) and no blanks but non-empty, treat as correct
    if (colIdx === 1) {
      const hasBlank = matches.length > 0;
      if (!hasBlank && String(value || '').trim() !== '') {
        next[rowIdx] = { ...next[rowIdx], correct: String(value).trim() };
        setRows(next);
      }
    }
  };

  const insertBlank = (rowIdx, colIdx) => {
    const next = [...rows];
    const r = ensureRowCells(next[rowIdx]);
    const text = String((r.cells && r.cells[colIdx]) || '');
    const updated = text + (text && !text.endsWith(' ') ? ' ' : '') + '[BLANK]';
    updateCellValue(rowIdx, colIdx, updated);
  };
  const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/gi;  // accept [BLANK] token



  return (
    <div>
      <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>📌 Tiêu đề bảng</label>
        <input
          type="text"
          value={question.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="VD: Island Transport"
          style={{ ...compactInputStyle, fontWeight: 700 }}
        />

        <label style={{ display: 'block', fontWeight: 700, margin: '12px 0 6px' }}>📋 Hướng dẫn</label>
        <input
          type="text"
          value={question.instruction || ''}
          onChange={(e) => onChange('instruction', e.target.value)}
          placeholder="VD: Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer."
          style={compactInputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>🧭 Columns</h4>
          {columns.map((col, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                value={col}
                onChange={(e) => updateColumn(idx, e.target.value)}
                style={{ ...compactInputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => deleteColumn(idx)} style={{ padding: '6px 8px' }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addColumn} style={{ padding: '8px 10px', fontWeight: 700 }}>➕ Thêm cột</button>
            <button type="button" onClick={() => setColumns(['Vehicles', 'Cost', 'Comments'])} style={{ padding: '8px 10px' }}>Reset</button>
          </div>
        </div>

        <div style={{ flex: 2, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>🧾 Rows</h4>
          {rows.map((row, idx) => (
            <div key={idx} style={{ border: '1px solid #f1f5f9', padding: 10, borderRadius: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                {columns.map((col, cIdx) => {
                  const thisCell = (row.cells && row.cells[cIdx]) ?? '';
                  const isCommentsCol = /comment/i.test(col);

                  // Comments column: show per-line editor like old UI
                  if (isCommentsCol) {
                    const commentLines = Array.isArray(row.comments) ? row.comments : (String(thisCell || '').split('\n'));
                    const answersByLine = row.commentBlankAnswers || []; // legacy

                    return (
                      <div key={cIdx} style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ border: '1px solid #eef2f6', borderRadius: 8, padding: 8, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: '#333', fontWeight: 700 }}>{col}</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" onClick={() => insertBlank(idx, cIdx)} style={{ padding: '4px 8px', fontSize: 12 }}>[BLANK]</button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {commentLines.map((line, li) => {
                              const blanks = String(line || '').match(BLANK_REGEX) || [];
                              return (
                                <div key={li} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                      type="text"
                                      value={line}
                                      onChange={(e) => {
                                        const next = [...rows];
                                        const r = ensureRowCells(next[idx]);
                                        const comments = [...(r.comments || [])];
                                        comments[li] = e.target.value;
                                        // keep cells[commentsCol] in sync for preview
                                        const cells = [...(r.cells || [])];
                                        cells[cIdx] = comments.join('\n');
                                        next[idx] = { ...r, comments, cells };
                                        setRows(next);
                                      }}
                                      placeholder="- comment line"
                                      style={{ ...compactInputStyle, flex: 1 }}
                                    />
                                    <button type="button" onClick={() => {
                                      const next = [...rows];
                                      const r = ensureRowCells(next[idx]);
                                      const comments = (r.comments || []).filter((_, i) => i !== li);
                                      const cb = (r.commentBlankAnswers || []).filter((_, i) => i !== li);
                                      const cells = [...(r.cells || [])];
                                      cells[cIdx] = comments.join('\n');
                                      next[idx] = { ...r, comments, commentBlankAnswers: cb, cells };
                                      setRows(next);
                                    }} style={{ padding: '6px 8px' }}>✕</button>
                                  </div>

                                  {/* Per-blank inputs for this comment line */}
                                  {blanks.length > 0 && (
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
                                              const cells = [...(r.cells || [])];
                                              cells[cIdx] = (r.comments || []).join('\n');
                                              next[idx] = { ...r, commentBlankAnswers: cb, cells };
                                              setRows(next);
                                            }}
                                            placeholder="Answer"
                                            style={{ ...compactInputStyle, width: 140 }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <div>
                              <button type="button" onClick={() => {
                                const next = [...rows];
                                const r = ensureRowCells(next[idx]);
                                const comments = [...(r.comments || []), ''];
                                const cb = [...(r.commentBlankAnswers || []), []];
                                const cells = [...(r.cells || [])];
                                cells[cIdx] = comments.join('\n');
                                next[idx] = { ...r, comments, commentBlankAnswers: cb, cells };
                                setRows(next);
                              }} style={{ padding: '6px 10px' }}>➕ Thêm comment</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default: regular cell editor
                  const blanks = String(thisCell || '').match(BLANK_REGEX) || [];
                  return (
                    <div key={cIdx} style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ border: '1px solid #eef2f6', borderRadius: 8, padding: 8, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: 12, color: '#333', fontWeight: 700 }}>{col}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => insertBlank(idx, cIdx)} style={{ padding: '4px 8px', fontSize: 12 }}>[BLANK]</button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={thisCell}
                            onChange={(e) => updateCellValue(idx, cIdx, e.target.value)}
                            placeholder={col}
                            style={{ ...compactInputStyle, flex: 1, minWidth: 80 }}
                          />
                        </div>

                        {/* Per-blank answer inputs for this cell (compact numbered badges) */}
                        {blanks.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {blanks.map((_, bi) => (
                              <div key={bi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ background: '#f1f5f9', padding: '4px 6px', borderRadius: 6, fontSize: 12 }}>#{bi + 1}</span>
                                <input
                                  type="text"
                                  value={(row.cellBlankAnswers && row.cellBlankAnswers[cIdx] && row.cellBlankAnswers[cIdx][bi]) || ''}
                                  onChange={(e) => {
                                    const next = [...rows];
                                    const cb = [...(next[idx].cellBlankAnswers || [])];
                                    cb[cIdx] = cb[cIdx] || [];
                                    cb[cIdx][bi] = e.target.value;
                                    next[idx] = { ...ensureRowCells(next[idx]), cellBlankAnswers: cb };
                                    setRows(next);
                                  }}
                                  placeholder="Answer"
                                  style={{ ...compactInputStyle, width: 140 }}
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
                  <button type="button" onClick={() => deleteRow(idx)} style={{ padding: '6px 8px' }}>✕</button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addRow} style={{ padding: '8px 12px', fontWeight: 700 }}>➕ Thêm hàng</button>
            <button type="button" onClick={() => setRows([ensureRowCells({})])} style={{ padding: '8px 12px' }}>Reset</button>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>👁 Preview</h4>
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
  );
}
