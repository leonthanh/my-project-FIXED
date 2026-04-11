import React, { useState, useEffect, useRef } from 'react';
import QuillEditor from './QuillEditor';

const DEFAULT_TABLE_COLUMNS = ['Test', 'Findings'];

const getTableColumnsFromQuestion = (question) => {
  if (Array.isArray(question?.tableColumns)) {
    return question.tableColumns;
  }

  if (question?.tableMode && Array.isArray(question?.clozeTable?.columns)) {
    return question.clozeTable.columns;
  }

  return DEFAULT_TABLE_COLUMNS;
};

const getTableRowsFromQuestion = (question, tableColumns) => {
  if (Array.isArray(question?.tableRows)) {
    return question.tableRows;
  }

  if (question?.tableMode && Array.isArray(question?.clozeTable?.rows)) {
    return question.clozeTable.rows;
  }

  return [{ cells: tableColumns.map(() => '') }];
};

const normalizeTableRows = (rows, tableColumns) => {
  const columnCount = Array.isArray(tableColumns) ? tableColumns.length : 0;
  const sourceRows = Array.isArray(rows) && rows.length > 0 ? rows : [{ cells: [] }];

  return sourceRows.map((row) => {
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

const areTableRowsEqual = (leftRows, rightRows) => {
  if (leftRows === rightRows) return true;
  if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) return false;
  if (leftRows.length !== rightRows.length) return false;

  return leftRows.every((leftRow, rowIndex) => {
    const rightRow = rightRows[rowIndex];
    const leftCells = Array.isArray(leftRow?.cells) ? leftRow.cells : [];
    const rightCells = Array.isArray(rightRow?.cells) ? rightRow.cells : [];

    if (leftCells.length !== rightCells.length) return false;

    return leftCells.every((cell, cellIndex) => cell === rightCells[cellIndex]);
  });
};

/**
 * IELTS Cloze Test Question Component
 * 
 * Dạng điền chỗ trống trong đoạn văn:
 * - Học sinh đọc đoạn văn có các chỗ trống
 * - Điền từ/cụm từ phù hợp vào mỗi chỗ trống
 * - Thường có giới hạn số từ
 */

const ClozeTestQuestion = ({ question, onChange }) => {
  const initialTableColumns = getTableColumnsFromQuestion(question);
  const initialTableRows = normalizeTableRows(
    getTableRowsFromQuestion(question, initialTableColumns),
    initialTableColumns
  );
  const [paragraphText, setParagraphText] = useState(question?.paragraphText || '');
  const [tableMode, setTableMode] = useState(question?.tableMode || false);
  const [tableColumns, setTableColumns] = useState(initialTableColumns);
  const [tableRows, setTableRows] = useState(initialTableRows);
  const [maxWords, setMaxWords] = useState(question?.maxWords || 3);
  const [blanks, setBlanks] = useState(question?.blanks || []);
  const quillRef = useRef(null);

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentCyan = '#0891b2';

  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  useEffect(() => {
    setTableRows((prevRows) => {
      const normalizedRows = normalizeTableRows(prevRows, tableColumns);
      return areTableRowsEqual(prevRows, normalizedRows) ? prevRows : normalizedRows;
    });
  }, [tableColumns]);

  // Phát hiện [BLANK] và tạo blanks array (hỗ trợ paragraph + table)
  useEffect(() => {
    const rawText = tableMode
      ? tableRows
          .map((row) => row.cells.join(' '))
          .join(' ')
      : paragraphText;

    const plainText = tableMode ? rawText : stripHtml(rawText);
    const blankMatches = (plainText.match(/\[BLANK\]/gi) || []);
    const newBlanks = blankMatches.map((_, idx) => ({
      id: `blank_${idx}`,
      blankNumber: idx + 1,
      correctAnswer: blanks[idx]?.correctAnswer || ''
    }));
    setBlanks(newBlanks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphText, tableMode, tableColumns, tableRows]);

  // Cập nhật question object
  useEffect(() => {
    if (onChange) {
      onChange({
        ...question,
        paragraphText,
        maxWords,
        blanks,
        tableMode,
        tableColumns,
        tableRows,
        clozeTable: tableMode
          ? {
              columns: tableColumns,
              rows: tableRows,
            }
          : null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphText, maxWords, blanks, tableMode, tableColumns, tableRows]);

  const handleBlankChange = (idx, value) => {
    const newBlanks = [...blanks];
    newBlanks[idx].correctAnswer = value;
    setBlanks(newBlanks);
  };

  // Insert [BLANK] at cursor position
  const insertBlank = () => {
    const editor = quillRef.current?.getEditor?.();
    if (editor) {
      const cursorPosition = editor.getSelection()?.index ?? editor.getLength();
      editor.insertText(cursorPosition, '[BLANK]');
      editor.setSelection(cursorPosition + '[BLANK]'.length);
      return;
    }
    setParagraphText((prev) => `${prev || ''} [BLANK]`);
  };

  // Hiển thị preview bảng khi ở table mode
  const renderTablePreview = () => {
    if (!tableRows || tableRows.length === 0) return null;

    return (
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tableColumns.map((col, ci) => (
                <th key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px', background: '#e0f2fe' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                    {cell.split(/\[BLANK\]/gi).reduce((parts, part, idx, arr) => {
                      if (idx === arr.length - 1) {
                        return [...parts, <span key={`${ri}-${ci}-${idx}`}>{part}</span>];
                      }
                      return [
                        ...parts,
                        <span key={`${ri}-${ci}-${idx}`}>{part}</span>,
                        <strong key={`${ri}-${ci}-blank-${idx}`} style={{ backgroundColor: '#dbeafe', padding: '2px 4px', borderRadius: '4px' }}>[BLANK]</strong>,
                      ];
                    }, [])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Hiển thị preview đoạn văn với input fields
  const renderPreview = () => {
    if (tableMode) return renderTablePreview();
    if (!paragraphText) return null;

    let questionNum = parseInt(question?.questionNumber) || 1;
    let blankIndex = 0;
    const blankStyle = `display:inline-block;min-width:130px;padding:6px 12px;border:2px solid ${accentCyan};border-radius:6px;background:#f0fdfa;text-align:center;font-size:14px;color:${accentCyan};font-weight:bold;`;
    const htmlWithBlanks = (paragraphText || '').replace(/\[BLANK\]/g, () => {
      const label = questionNum + blankIndex;
      blankIndex += 1;
      return `<span style="${blankStyle}">${label}</span>`;
    });
    
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        lineHeight: '2.2',
        fontSize: '15px',
        border: '1px solid #e0e0e0'
      }}>
        <div dangerouslySetInnerHTML={{ __html: htmlWithBlanks }} />
      </div>
    );
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#ecfeff',
      borderRadius: '12px',
      border: `2px solid ${accentCyan}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: `2px solid ${accentCyan}`
    },
    headerTitle: {
      margin: 0,
      color: accentCyan,
      fontSize: '16px'
    },
    headerBadge: {
      backgroundColor: accentCyan,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      marginLeft: 'auto'
    },
    section: {
      marginBottom: '16px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 10px 0',
      color: primaryBlue,
      fontSize: '13px',
      fontWeight: 'bold'
    },
    textarea: {
      width: '100%',
      minHeight: '140px',
      padding: '15px',
      border: `2px solid ${accentCyan}`,
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      lineHeight: '1.6',
      resize: 'vertical'
    },
    tip: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '10px',
      padding: '10px 15px',
      backgroundColor: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#c2410c'
    },
    insertButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: accentCyan,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      marginTop: '10px'
    },
    wordLimitBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '15px 20px',
      backgroundColor: '#fef3c7',
      border: '2px solid #fbbf24',
      borderRadius: '8px',
      fontSize: '14px'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#cffafe',
      borderRadius: '8px',
      border: '1px solid #a5f3fc'
    },
    previewTitle: {
      margin: '0 0 15px 0',
      color: '#0e7490',
      fontSize: '13px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    answersSection: {
      marginTop: '20px',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: `2px solid ${accentCyan}`
    },
    answerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '12px',
      padding: '12px 15px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    blankBadge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '80px',
      padding: '8px 12px',
      backgroundColor: accentCyan,
      color: 'white',
      borderRadius: '6px',
      fontWeight: 'bold',
      fontSize: '13px',
      flexShrink: 0
    },
    answerInput: {
      flex: 1,
      padding: '10px 15px',
      border: '2px solid #e2e8f0',
      borderRadius: '6px',
      fontSize: '14px',
      transition: 'border-color 0.3s'
    },
    helpSection: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#f0fdfa',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#0f766e',
      borderLeft: `4px solid ${accentCyan}`
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h4 style={styles.headerTitle}>Cloze Test (Điền chỗ trống trong đoạn văn)</h4>
        <span style={styles.headerBadge}>IX Reading/Listening</span>
      </div>

      {/* Input Mode */}
      <div style={{ ...styles.section, backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbeafe', marginBottom: '16px' }}>
        <strong>Chọn kiểu câu hỏi Cloze:</strong>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTableMode(false)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #0ea5e9',
              backgroundColor: tableMode ? 'white' : '#0ea5e9',
              color: tableMode ? '#0ea5e9' : 'white',
              cursor: 'pointer',
            }}
          >
            Văn bản (paragraph)
          </button>
          <button
            type="button"
            onClick={() => setTableMode(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #0ea5e9',
              backgroundColor: tableMode ? '#0ea5e9' : 'white',
              color: tableMode ? 'white' : '#0ea5e9',
              cursor: 'pointer',
            }}
          >
            Bảng (table)
          </button>
        </div>
      </div>

      {/* Paragraph Input */}
      {!tableMode && (
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          Nhập đoạn văn (đánh dấu chỗ trống bằng [BLANK]):
        </h5>
        <QuillEditor
          editorRef={quillRef}
          value={paragraphText}
          onChange={(value) => setParagraphText(value)}
          placeholder="VD: The machinery used in the process of making the snow consumes a lot of 11 [BLANK] which is damaging to the environment. Artificial snow is used in agriculture as a type of 12 [BLANK] for plants in cold conditions."
          insertBlankText="[BLANK]"
        />
        
        {/* Insert BLANK button */}
        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            insertBlank();
          }}
          style={styles.insertButton}
        >
          Chèn [BLANK]
        </button>

        {/* Tip */}
        <div style={styles.tip}>
          <span><strong>Gợi ý:</strong> Sử dụng <code style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>[BLANK]</code> để đánh dấu mỗi chỗ trống trong đoạn văn</span>
        </div>
      </div>
      )}

      {tableMode && (
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          Nhập bảng Cloze (chèn [BLANK] trong mỗi ô):
        </h5>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {tableColumns.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={col}
                  onChange={(e) => {
                    const next = [...tableColumns];
                    next[ci] = e.target.value;
                    setTableColumns(next);
                  }}
                  style={{ ...styles.answerInput, minWidth: '160px' }}
                />
                {tableColumns.length > 1 && (
                  <button type="button" onClick={() => setTableColumns(tableColumns.filter((_, i) => i !== ci))} style={{ padding: '6px 8px' }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setTableColumns([...tableColumns, `Cột ${tableColumns.length + 1}`])} style={{ padding: '8px 12px', fontWeight: 700 }}>Thêm cột</button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          {tableRows.map((row, ri) => (
            <div key={ri} style={{ marginBottom: '10px', border: '1px solid #dbeafe', borderRadius: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Hàng {ri + 1}</strong>
                <button type="button" onClick={() => setTableRows(tableRows.filter((_, i) => i !== ri))} style={{ padding: '6px 8px' }}>Xóa hàng</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tableColumns.map((col, ci) => (
                  <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ minWidth: '70px', fontSize: '13px', color: '#0e276f' }}>{col}:</span>
                    <input
                      type="text"
                      value={row.cells?.[ci] || ''}
                      onChange={(e) => {
                        const next = [...tableRows];
                        const targetRow = { ...next[ri] };
                        const cells = [...(targetRow.cells || [])];
                        cells[ci] = e.target.value;
                        targetRow.cells = cells;
                        next[ri] = targetRow;
                        setTableRows(next);
                      }}
                      style={{ ...styles.answerInput, flex: 1 }}
                      placeholder="Nhập nội dung, dùng [BLANK] cho chỗ trống"
                    />
                    <button type="button" onClick={() => {
                      const next = [...tableRows];
                      const targetRow = { ...next[ri] };
                      const cells = [...(targetRow.cells || [])];
                      cells[ci] = `${cells[ci] || ''} [BLANK]`;
                      targetRow.cells = cells;
                      next[ri] = targetRow;
                      setTableRows(next);
                    }} style={{ padding: '6px 10px' }}>[BLANK]</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setTableRows([...tableRows, { cells: tableColumns.map(() => '') }])} style={{ padding: '8px 12px', fontWeight: 700 }}>Thêm hàng</button>
        </div>

        <div style={styles.helpSection}>
          Xem trước bảng:
        </div>

        <div style={{ overflowX: 'auto', marginTop: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {tableColumns.map((col, ci) => (
                  <th key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px', background: '#e0f2fe' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px', verticalAlign: 'top' }}>
                      {cell.split(/\[BLANK\]/gi).reduce((parts, part, idx, arr) => {
                        if (idx === arr.length - 1) {
                          return [...parts, <span key={`${ri}-${ci}-${idx}`}>{part}</span>];
                        }
                        return [
                          ...parts,
                          <span key={`${ri}-${ci}-${idx}`}>{part}</span>,
                          <strong key={`${ri}-${ci}-blank-${idx}`} style={{ backgroundColor: '#dbeafe', padding: '2px 4px', borderRadius: '4px' }}>[BLANK]</strong>,
                        ];
                      }, [])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Max Words */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          Số từ tối đa cho mỗi chỗ trống:
        </h5>
        <div style={styles.wordLimitBox}>
          <span>Write <strong>NO MORE THAN</strong></span>
          <input
            type="number"
            value={maxWords}
            onChange={(e) => setMaxWords(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            style={{
              width: '60px',
              padding: '8px',
              border: '2px solid #fbbf24',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '15px'
            }}
          />
          <span><strong>WORDS</strong> for each answer</span>
        </div>
      </div>

      {/* Preview */}
      {(tableMode || paragraphText) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>
            Xem trước - Học sinh sẽ thấy:
          </h5>
          {renderPreview()}
        </div>
      )}

      {/* Blank Answers */}
      {blanks.length > 0 && (
        <div style={styles.answersSection}>
          <h5 style={styles.sectionTitle}>
            Đáp án cho mỗi chỗ trống:
          </h5>
          
          {blanks.map((blank, idx) => {
            const questionNum = parseInt(question?.questionNumber) || 1;
            const variants = (blank.correctAnswer || '').split('|').map(v => v.trim()).filter(Boolean);
            return (
              <div key={idx} style={styles.answerRow}>
                <div style={styles.blankBadge}>
                  Câu {questionNum + idx}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={blank.correctAnswer}
                    onChange={(e) => handleBlankChange(idx, e.target.value)}
                    placeholder={`Nhập đáp án (tối đa ${maxWords} từ). Nếu có nhiều biến thể, tách bằng | (ví dụ: willow tree|willow bark)`}
                    style={styles.answerInput}
                  />
                  {variants.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {variants.map((v, i) => (
                        <span key={i} style={{ background: '#e6fffa', color: '#065f46', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {blank.correctAnswer && (
                  <span style={{ color: '#0f766e', fontSize: '12px', fontWeight: 700 }}>Đã nhập</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <div style={styles.helpSection}>
        <strong>Hướng dẫn sử dụng:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Nhập/paste đoạn văn gốc vào ô text</li>
          <li>Đặt con trỏ vào vị trí cần tạo chỗ trống, nhấn nút <strong>"Chèn [BLANK]"</strong></li>
          <li>Hệ thống sẽ tự động tạo các ô nhập đáp án bên dưới</li>
          <li>Số câu hỏi sẽ nối tiếp từ số câu hỏi hiện tại (VD: câu 11 → 11, 12, 13...)</li>
          <li>Nếu có nhiều đáp án đúng (biến thể), dùng dấu <strong>|</strong> để tách. Ví dụ: <code>willow tree|willow bark</code></li>
        </ul>
      </div>
    </div>
  );
};

export default ClozeTestQuestion;
