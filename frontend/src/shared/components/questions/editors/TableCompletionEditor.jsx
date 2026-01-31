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

  // Rows handlers
  const setRows = (newRows) => onChange('rows', newRows);

  const addRow = () => setRows([...rows, { vehicle: '', cost: '', comments: [''] }]);
  const deleteRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
  const updateRowField = (idx, field, value) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: value };
    setRows(next);
  };

  const updateCommentLine = (rowIdx, lineIdx, value) => {
    const next = [...rows];
    const comments = [...(next[rowIdx].comments || [])];
    comments[lineIdx] = value;
    next[rowIdx] = { ...next[rowIdx], comments };
    setRows(next);
  };

  const addCommentLine = (rowIdx) => {
    const next = [...rows];
    const comments = [...(next[rowIdx].comments || []), ''];
    next[rowIdx] = { ...next[rowIdx], comments };
    setRows(next);
  };

  const deleteCommentLine = (rowIdx, lineIdx) => {
    const next = [...rows];
    const comments = (next[rowIdx].comments || []).filter((_, i) => i !== lineIdx);
    next[rowIdx] = { ...next[rowIdx], comments };
    setRows(next);
  };

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
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={row.vehicle || ''}
                  onChange={(e) => updateRowField(idx, 'vehicle', e.target.value)}
                  placeholder="Vehicle"
                  style={{ ...compactInputStyle, flex: 1 }}
                />
                <input
                  type="text"
                  value={row.cost || ''}
                  onChange={(e) => updateRowField(idx, 'cost', e.target.value)}
                  placeholder="Cost (use ___ for blanks)"
                  style={{ ...compactInputStyle, flex: 1 }}
                />
                <button type="button" onClick={() => deleteRow(idx)} style={{ padding: '6px 8px' }}>✕</button>
              </div>

              <div style={{ marginTop: 6 }}>
                <strong>Comments</strong>
                {(row.comments || []).map((line, li) => (
                  <div key={li} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      type="text"
                      value={line}
                      onChange={(e) => updateCommentLine(idx, li, e.target.value)}
                      placeholder="- comment line"
                      style={{ ...compactInputStyle, flex: 1 }}
                    />
                    <button type="button" onClick={() => deleteCommentLine(idx, li)} style={{ padding: '6px 8px' }}>✕</button>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => addCommentLine(idx)} style={{ padding: '6px 10px' }}>➕ Thêm comment</button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addRow} style={{ padding: '8px 12px', fontWeight: 700 }}>➕ Thêm hàng</button>
            <button type="button" onClick={() => setRows([{ vehicle: '', cost: '', comments: [''] }])} style={{ padding: '8px 12px' }}>Reset</button>
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
