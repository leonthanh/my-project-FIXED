import React from "react";

/**
 * FormCompletionEditor - Visual Form Builder với 4 cột (IELTS format)
 * Dùng cho: IELTS Listening/Reading Form/Table Completion
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (default: 1)
 * @param {Object} props.styles - Custom styles (optional)
 */
const FormCompletionEditor = ({
  question,
  onChange,
  startingNumber = 1,
  styles = {},
}) => {
  // Default styles
  const defaultStyles = {
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      marginBottom: "8px",
      boxSizing: "border-box",
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontWeight: 600,
      fontSize: "12px",
      color: "#6b7280",
    },
    ...styles,
  };

  // Initialize rows with 4-column structure
  const rows = question.formRows || [
    { label: "– Type of company:", prefix: "", isBlank: true, blankNumber: 1, suffix: "" },
    { label: "– Full name:", prefix: "", isBlank: false, blankNumber: null, suffix: "Jonathan Smith" },
  ];
  const answers = question.answers || {};

  // Get all blank numbers from rows
  const blankNumbers = rows
    .filter(r => r.isBlank)
    .map(r => r.blankNumber)
    .filter(n => n)
    .sort((a, b) => a - b);

  // Add new row
  const addRow = () => {
    const newRows = [...rows, { label: "", prefix: "", isBlank: false, blankNumber: null, suffix: "" }];
    onChange("formRows", newRows);
  };

  // Add sub-row (indented, no label)
  const addSubRow = () => {
    const newRows = [...rows, { label: "", prefix: "", isBlank: true, blankNumber: null, suffix: "", isSubRow: true }];
    const maxBlank = Math.max(0, ...rows.map(r => r.blankNumber || 0));
    newRows[newRows.length - 1].blankNumber = maxBlank + 1;
    onChange("formRows", newRows);
  };

  // Update row
  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    
    // Auto-assign blank number when toggling isBlank
    if (field === "isBlank") {
      if (value) {
        const maxBlank = Math.max(0, ...rows.map(r => r.blankNumber || 0));
        newRows[index].blankNumber = maxBlank + 1;
      } else {
        newRows[index].blankNumber = null;
      }
    }
    
    onChange("formRows", newRows);
  };

  // Delete row
  const deleteRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    // Re-number blanks
    let blankNum = startingNumber;
    newRows.forEach(row => {
      if (row.isBlank) {
        row.blankNumber = blankNum++;
      }
    });
    onChange("formRows", newRows);
  };

  // Move row up/down
  const moveRow = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;
    const newRows = [...rows];
    [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
    onChange("formRows", newRows);
  };

  // Render preview - IELTS style list format
  const renderPreviewList = () => {
    return (
      <div style={{ lineHeight: "2.2", fontSize: "14px" }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{
            display: "flex",
            alignItems: "baseline",
            gap: "6px",
            paddingLeft: row.isSubRow ? "140px" : "0",
            marginBottom: "4px",
          }}>
            {/* Label */}
            {row.label && (
              <span style={{ 
                fontWeight: 500, 
                minWidth: row.isSubRow ? "0" : "140px",
                flexShrink: 0,
              }}>
                {row.label}
              </span>
            )}
            
            {/* Prefix text */}
            {row.prefix && <span>{row.prefix}</span>}
            
            {/* Blank or Value */}
            {row.isBlank ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{
                  background: "#3b82f6",
                  color: "white",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}>
                  {row.blankNumber}
                </span>
                <span style={{
                  display: "inline-block",
                  width: "120px",
                  borderBottom: "2px solid #3b82f6",
                  height: "20px",
                  background: "linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)",
                  borderRadius: "4px",
                }}></span>
              </span>
            ) : (
              <span>{row.suffix}</span>
            )}
            
            {/* Suffix text (only for blanks) */}
            {row.isBlank && row.suffix && <span>{row.suffix}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Info Banner */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#dbeafe",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #3b82f6",
      }}>
        <strong style={{ color: "#1d4ed8" }}>📋 Form Builder - Format IELTS</strong>
        <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#1e40af" }}>
          Tạo form theo format đề IELTS với: <b>Label</b> + <b>Prefix</b> + <b>[Blank/Value]</b> + <b>Suffix</b>
        </p>
      </div>

      {/* Form Title */}
      <label style={defaultStyles.label}>📌 Tiêu đề Form</label>
      <input
        type="text"
        value={question.formTitle || ""}
        onChange={(e) => onChange("formTitle", e.target.value)}
        placeholder="VD: Office Rental"
        style={{ ...defaultStyles.input, fontWeight: 600 }}
      />

      {/* Question Range */}
      <label style={defaultStyles.label}>📊 Phạm vi câu hỏi</label>
      <input
        type="text"
        value={question.questionRange || ""}
        onChange={(e) => onChange("questionRange", e.target.value)}
        placeholder="VD: Questions 1-10"
        style={defaultStyles.input}
      />

      {/* Visual Form Builder - 4 columns */}
      <label style={defaultStyles.label}>📝 Các dòng trong Form</label>
      <div style={{
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "30px 1fr 0.8fr 60px 50px 0.8fr 70px",
          gap: "6px",
          padding: "10px 8px",
          backgroundColor: "#f1f5f9",
          borderBottom: "2px solid #e5e7eb",
          fontWeight: 600,
          fontSize: "11px",
          color: "#475569",
        }}>
          <span>#</span>
          <span>Label (nhãn)</span>
          <span>Prefix (trước)</span>
          <span style={{ textAlign: "center" }}>Blank?</span>
          <span style={{ textAlign: "center" }}>Số</span>
          <span>Suffix (sau) / Value</span>
          <span></span>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => (
          <div key={idx} style={{
            display: "grid",
            gridTemplateColumns: "30px 1fr 0.8fr 60px 50px 0.8fr 70px",
            gap: "6px",
            padding: "8px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: row.isBlank ? "#eff6ff" : (row.isSubRow ? "#fefce8" : "#fff"),
            alignItems: "center",
          }}>
            {/* Row number */}
            <span style={{ color: "#9ca3af", fontSize: "11px" }}>{idx + 1}</span>
            
            {/* Label */}
            <input
              type="text"
              value={row.label || ""}
              onChange={(e) => updateRow(idx, "label", e.target.value)}
              placeholder={row.isSubRow ? "(dòng con)" : "– Label:"}
              style={{ 
                ...defaultStyles.input, 
                marginBottom: 0, 
                fontSize: "12px",
                backgroundColor: row.isSubRow ? "#fef9c3" : "#fff",
              }}
            />
            
            {/* Prefix */}
            <input
              type="text"
              value={row.prefix || ""}
              onChange={(e) => updateRow(idx, "prefix", e.target.value)}
              placeholder="near the / a"
              style={{ ...defaultStyles.input, marginBottom: 0, fontSize: "12px" }}
            />
            
            {/* Is Blank checkbox */}
            <div style={{ textAlign: "center" }}>
              <input
                type="checkbox"
                checked={row.isBlank}
                onChange={(e) => updateRow(idx, "isBlank", e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </div>
            
            {/* Blank number */}
            <div style={{ textAlign: "center" }}>
              {row.isBlank && (
                <span style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}>
                  {row.blankNumber}
                </span>
              )}
            </div>
            
            {/* Suffix / Value */}
            <input
              type="text"
              value={row.suffix || ""}
              onChange={(e) => updateRow(idx, "suffix", e.target.value)}
              placeholder={row.isBlank ? "ft² / for employees" : "Jonathan Smith"}
              style={{ 
                ...defaultStyles.input, 
                marginBottom: 0, 
                fontSize: "12px",
                backgroundColor: row.isBlank ? "#dbeafe" : "#f0fdf4",
              }}
            />
            
            {/* Actions */}
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                type="button"
                onClick={() => moveRow(idx, -1)}
                disabled={idx === 0}
                style={{
                  padding: "2px 6px",
                  border: "none",
                  borderRadius: "3px",
                  cursor: idx === 0 ? "not-allowed" : "pointer",
                  backgroundColor: "#f1f5f9",
                  opacity: idx === 0 ? 0.5 : 1,
                  fontSize: "12px",
                }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveRow(idx, 1)}
                disabled={idx === rows.length - 1}
                style={{
                  padding: "2px 6px",
                  border: "none",
                  borderRadius: "3px",
                  cursor: idx === rows.length - 1 ? "not-allowed" : "pointer",
                  backgroundColor: "#f1f5f9",
                  opacity: idx === rows.length - 1 ? 0.5 : 1,
                  fontSize: "12px",
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => deleteRow(idx)}
                disabled={rows.length <= 1}
                style={{
                  padding: "2px 6px",
                  border: "none",
                  borderRadius: "3px",
                  cursor: rows.length <= 1 ? "not-allowed" : "pointer",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  opacity: rows.length <= 1 ? 0.5 : 1,
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Add Row Buttons */}
        <div style={{ display: "flex", borderTop: "1px solid #e5e7eb" }}>
          <button
            type="button"
            onClick={addRow}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRight: "1px solid #e5e7eb",
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ➕ Thêm dòng
          </button>
          <button
            type="button"
            onClick={addSubRow}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              backgroundColor: "#fefce8",
              color: "#ca8a04",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ↳ Thêm dòng con (blank)
          </button>
        </div>
      </div>

      {/* Example guide */}
      <div style={{
        marginTop: "12px",
        padding: "10px 12px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        fontSize: "12px",
      }}>
        <strong>📖 Ví dụ cách nhập:</strong>
        <table style={{ width: "100%", marginTop: "8px", fontSize: "11px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>Đề gốc</th>
              <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>Label</th>
              <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>Prefix</th>
              <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>Blank?</th>
              <th style={{ padding: "4px 6px", textAlign: "left", border: "1px solid #e2e8f0" }}>Suffix/Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred location: near the <b>[3]___</b></td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred location:</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>near the</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>☑️</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(trống)</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred size: <b>[4]___</b> ft²</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred size:</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(trống)</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>☑️</td>
              <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>ft²</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Answers for each blank */}
      {blankNumbers.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <label style={defaultStyles.label}>
            ✅ Đáp án cho từng câu 
            <span style={{ fontWeight: "normal", color: "#6b7280", fontSize: "12px" }}>
              (dùng | để phân cách nhiều đáp án đúng)
            </span>
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "10px",
          }}>
            {blankNumbers.map(num => {
              const answerValue = answers[num] || "";
              const multipleAnswers = answerValue.split("|").map(a => a.trim()).filter(a => a);
              const hasMultiple = multipleAnswers.length > 1;
              
              return (
                <div key={num} style={{
                  padding: "8px 10px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      background: "#22c55e",
                      color: "white",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}>
                      {num}
                    </span>
                    <input
                      type="text"
                      value={answerValue}
                      onChange={(e) => {
                        const newAnswers = { ...answers, [num]: e.target.value };
                        onChange("answers", newAnswers);
                      }}
                      placeholder="VD: 10,000 | 10 thousand"
                      style={{ ...defaultStyles.input, flex: 1, marginBottom: 0, fontSize: "12px" }}
                    />
                  </div>
                  
                  {hasMultiple && (
                    <div style={{
                      marginTop: "6px",
                      paddingTop: "6px",
                      borderTop: "1px dashed #86efac",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}>
                      <span style={{ fontSize: "10px", color: "#16a34a", marginRight: "4px" }}>Chấp nhận:</span>
                      {multipleAnswers.map((ans, i) => (
                        <span key={i} style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          backgroundColor: "#dcfce7",
                          borderRadius: "4px",
                          color: "#15803d",
                        }}>
                          {ans}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div style={{
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "#fef3c7",
            borderRadius: "6px",
            border: "1px solid #fcd34d",
            fontSize: "11px",
            color: "#92400e",
          }}>
            💡 <strong>Mẹo:</strong> Dùng dấu <code style={{ background: "#fde68a", padding: "1px 4px", borderRadius: "3px" }}>|</code> để nhập nhiều đáp án đúng. 
            VD: <code style={{ background: "#fde68a", padding: "1px 4px", borderRadius: "3px" }}>10,000 | 10 thousand | ten thousand</code>
          </div>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <label style={defaultStyles.label}>👁 Preview - Học sinh sẽ thấy:</label>
          <div style={{
            padding: "20px",
            backgroundColor: "#fff",
            border: "2px solid #e5e7eb",
            borderRadius: "12px",
          }}>
            {question.formTitle && (
              <h3 style={{
                textAlign: "center",
                margin: "0 0 16px",
                padding: "12px 20px",
                backgroundColor: "#1f2937",
                color: "white",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
              }}>
                {question.formTitle}
              </h3>
            )}
            {question.questionRange && (
              <p style={{
                color: "#dc2626",
                fontWeight: 600,
                marginBottom: "16px",
                fontSize: "14px",
              }}>
                {question.questionRange}
              </p>
            )}
            {renderPreviewList()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormCompletionEditor;
