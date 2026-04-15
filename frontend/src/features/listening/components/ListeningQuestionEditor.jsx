import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import MapLabelingQuestion from '../../../shared/components/MapLabelingQuestion';
import LineIcon from '../../../shared/components/LineIcon.jsx';
import { colors, compactInputStyle, deleteButtonSmallStyle } from "../utils/styles";
import TableCompletionEditor from "../../../shared/components/questions/editors/TableCompletionEditor.jsx";
import {
  createListeningClozeQuestion,
  LISTENING_CLOZE_TYPE,
  LISTENING_TABLE_LEGACY_TYPE,
} from "../utils/clozeTableSchema";
import {
  countFlowchartQuestionSlots,
  getFlowchartBlankEntries,
  getFlowchartOptionEntries,
  resolveFlowchartChoiceValue,
  splitFlowchartStepText,
} from "../utils/flowchart";

/**
 * ListeningQuestionEditor - Editor cho từng câu hỏi Listening
 * Hỗ trợ nhiều loại: fill, abc, abcd, matching, map-labeling, flowchart
 */
const ListeningQuestionEditor = ({
  question,
  questionIndex,
  questionType,
  onChange,
  onDelete,
  onCopy,
  canDelete = true,
  globalQuestionNumber = null, // Số câu hỏi toàn cục (1-40)
  sectionStartingNumber = null, // Số câu bắt đầu của section (cho matching)
  questionsBeforeInSection = 0, // Số câu hỏi của các questions trước đó trong cùng section (cho multi-select)
}) => {
  const [isExpanded, setIsExpanded] = useState(true);


  // IMPORTANT: Prioritize section's questionType prop over question's own type
  // This ensures form-completion section shows correctly even if question has questionType: "fill"
  const type = questionType || question.questionType || "fill";

  // Render based on question type
  const renderQuestionContent = () => {
    switch (type) {
      case "fill":
        return renderFillQuestion();
      case "form-completion":
        return renderFormCompletionQuestion();
      case LISTENING_CLOZE_TYPE:
      case "table-completion":
        return renderTableCompletionQuestion();
      case "notes-completion":
        return renderNotesCompletionQuestion();
      case "abc":
        return renderMultipleChoice(["A", "B", "C"]);
      case "abcd":
        return renderMultipleChoice(["A", "B", "C", "D"]);
      case "matching":
        return renderMatchingQuestion();
      case "multi-select":
        return renderMultiSelectQuestion();
      case "map-labeling":
        return renderMapLabelingQuestion();
      case "flowchart":
        return renderFlowchartQuestion();
      default:
        return renderFillQuestion();
    }
  };

  // Fill in the blank
  const renderFillQuestion = () => (
    <div>
      <label style={labelStyle}>Câu hỏi / Nội dung</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: The library opens at _____ every morning."
        style={compactInputStyle}
      />
      <label style={labelStyle}>Đáp án đúng</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="VD: 8:30 / nine o'clock"
        style={compactInputStyle}
      />
    </div>
  );

  // Form/Table Completion - Visual Form Builder với 4 cột (IELTS format)
  const renderFormCompletionQuestion = () => {
    // Initialize rows with new 4-column structure
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
      // Auto-assign blank number
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
      let blankNum = 1;
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
          <strong style={{ color: "#1d4ed8" }}>Form Builder - Format IELTS</strong>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#1e40af" }}>
            Tạo form theo format đề IELTS với: <b>Label</b> + <b>Prefix</b> + <b>[Blank/Value]</b> + <b>Suffix</b>
          </p>
        </div>

        {/* Form Title */}
        <label style={labelStyle}>Tiêu đề form</label>
        <input
          type="text"
          value={question.formTitle || ""}
          onChange={(e) => onChange("formTitle", e.target.value)}
          placeholder="VD: Office Rental"
          style={{ ...compactInputStyle, fontWeight: 600 }}
        />

        {/* Question Range */}
        <label style={labelStyle}>Phạm vi câu hỏi</label>
        <input
          type="text"
          value={question.questionRange || ""}
          onChange={(e) => onChange("questionRange", e.target.value)}
          placeholder="VD: Questions 1-10"
          style={compactInputStyle}
        />

        {/* Visual Form Builder - 4 columns */}
        <label style={labelStyle}>Các dòng trong form</label>
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
                  ...compactInputStyle, 
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
                style={{ ...compactInputStyle, marginBottom: 0, fontSize: "12px" }}
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
                  ...compactInputStyle, 
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
                    X
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
              Thêm dòng
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
              Thêm dòng con (blank)
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
          <strong>Ví dụ cách nhập:</strong>
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
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>Có</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(trống)</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred size: <b>[4]___</b> ft²</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Preferred size:</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(trống)</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>Có</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>ft²</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>&nbsp;&nbsp;&nbsp;&nbsp;a <b>[7]___</b> for employees</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(dòng con - trống)</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>a</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>Có</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>for employees</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Full name: Jonathan Smith</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>– Full name:</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>(trống)</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>Không</td>
                <td style={{ padding: "4px 6px", border: "1px solid #e2e8f0" }}>Jonathan Smith</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Answers for each blank */}
        {blankNumbers.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Đáp án cho từng câu <span style={{ fontWeight: "normal", color: "#6b7280", fontSize: "12px" }}>(dùng | để phân cách nhiều đáp án đúng)</span></label>
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
                    {/* Input row */}
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
                        style={{ ...compactInputStyle, flex: 1, marginBottom: 0, fontSize: "12px" }}
                      />
                    </div>
                    
                    {/* Multiple answers preview */}
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
            
            {/* Hint */}
            <div style={{
              marginTop: "8px",
              padding: "8px 12px",
              backgroundColor: "#fef3c7",
              borderRadius: "6px",
              border: "1px solid #fcd34d",
              fontSize: "11px",
              color: "#92400e",
            }}>
              <strong>Mẹo:</strong> Dùng dấu <code style={{ background: "#fde68a", padding: "1px 4px", borderRadius: "3px" }}>|</code> để nhập nhiều đáp án đúng.
              VD: <code style={{ background: "#fde68a", padding: "1px 4px", borderRadius: "3px" }}>10,000 | 10 thousand | ten thousand</code>
            </div>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>Xem trước - Học sinh sẽ thấy:</label>
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

  // Table Completion - use a dedicated editor component that supports columns/rows
  const renderTableCompletionQuestion = () => {
    const tableQuestion = createListeningClozeQuestion({
      ...question,
      questionType:
        type === LISTENING_TABLE_LEGACY_TYPE ? LISTENING_CLOZE_TYPE : type,
    });

    return (
      <div>
        <TableCompletionEditor
          question={tableQuestion}
          onChange={(field, value) => onChange(field, value)}
          startingNumber={sectionStartingNumber || globalQuestionNumber || 1}
        />
      </div>
    );
  };

  // Notes Completion - Paste text với ___ hoặc số câu, hệ thống tự tách
  const renderNotesCompletionQuestion = () => {
    const notesText = question.notesText || '';
    const notesTitle = question.notesTitle || '';
    const wordLimit = question.wordLimit || 'ONE WORD ONLY';
    const answers = question.answers || {};

    const stripHtml = (html) => {
      if (!html) return '';
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };
    
    // Parse blanks from text - matches "31 ___" or "___" or "………"
    const parseBlankPattern = /(\d+)\s*[_…]+|[_…]{2,}/g;
    const startQ = sectionStartingNumber || globalQuestionNumber || 1;

    const plainText = stripHtml(notesText);
    const blanks = [];
    let match;
    let blankIndex = 0;
    while ((match = parseBlankPattern.exec(plainText)) !== null) {
      const questionNum = match[1] ? parseInt(match[1], 10) : startQ + blankIndex;
      blanks.push({
        questionNum,
        fullMatch: match[0],
      });
      blankIndex++;
    }
    
    // Generate preview with highlighted blanks
    const generatePreview = () => {
      if (!notesText) return null;
      let idx = 0;
      const previewHtml = notesText.replace(parseBlankPattern, () => {
        const blank = blanks[idx++];
        const qNum = blank?.questionNum ?? '';
        const answer = answers[qNum] || '';
        return `<span style="background:#fef3c7;padding:2px 8px;border-radius:4px;font-weight:bold;border:1px dashed #f59e0b;">${qNum}. ${answer || '________'}</span>`;
      });
      return previewHtml;
    };

    const quillModules = {
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    };

    return (
      <div>
        {/* Question Range Badge */}
        <div style={{
          padding: "10px 12px",
          backgroundColor: "#e0f2fe",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #7dd3fc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontWeight: 600, color: "#0369a1" }}>
            Notes Completion: {blanks.length > 0 ? `Questions ${startQ} - ${startQ + blanks.length - 1}` : 'Chưa có câu hỏi'}
          </span>
          <span style={{
            padding: "4px 10px",
            backgroundColor: "#0ea5e9",
            color: "white",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}>
            {blanks.length} câu
          </span>
        </div>

        {/* Instructions */}
        <div style={{
          padding: "10px 12px",
          backgroundColor: "#dcfce7",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #86efac",
          fontSize: "13px",
        }}>
          <strong>Hướng dẫn:</strong> Paste notes vào ô bên dưới. Dùng <code>___</code> hoặc <code>31 ___</code> để đánh dấu chỗ trống.
          <br/>
          VD: <code>People moved to cities to work in the 31 ___</code>
        </div>

        {/* Title */}
        <label style={labelStyle}>Tiêu đề Notes</label>
        <input
          type="text"
          value={notesTitle}
          onChange={(e) => onChange("notesTitle", e.target.value)}
          placeholder="VD: History of Music in Britain"
          style={compactInputStyle}
        />

        {/* Word Limit */}
        <label style={labelStyle}>Giới hạn từ</label>
        <select
          value={wordLimit}
          onChange={(e) => onChange("wordLimit", e.target.value)}
          style={{ ...compactInputStyle, width: "250px" }}
        >
          <option value="ONE WORD ONLY">ONE WORD ONLY</option>
          <option value="NO MORE THAN TWO WORDS">NO MORE THAN TWO WORDS</option>
          <option value="NO MORE THAN THREE WORDS">NO MORE THAN THREE WORDS</option>
          <option value="ONE WORD AND/OR A NUMBER">ONE WORD AND/OR A NUMBER</option>
          <option value="NO MORE THAN TWO WORDS AND/OR A NUMBER">NO MORE THAN TWO WORDS AND/OR A NUMBER</option>
        </select>

        {/* Notes Text Input */}
        <label style={labelStyle}>Nội dung Notes (paste từ đề)</label>
        <ReactQuill
          theme="snow"
          value={notesText}
          onChange={(value) => onChange("notesText", value)}
          modules={quillModules}
          placeholder={`Paste nội dung notes ở đây. Dùng ___ để đánh dấu chỗ trống.

VD:
– During the Industrial Revolution people moved to cities to work in the 31 ___
– In the 1850s, the 32 ___ was also influenced greatly by immigration.
– Originally music reflected the work life of different 33 ___ in those days.`}
          style={{
            background: "white",
            borderRadius: "8px",
          }}
        />

        {/* Quick Parse Button */}
        {plainText && blanks.length === 0 && (
          <div style={{
            padding: "10px",
            backgroundColor: "#fef2f2",
            borderRadius: "8px",
            marginTop: "8px",
            border: "1px solid #fecaca",
            fontSize: "13px",
          }}>
            Không tìm thấy chỗ trống. Hãy thêm <code>___</code> hoặc <code>31 ___</code> vào text.
          </div>
        )}

        {/* Answers Section */}
        {blanks.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Đáp án ({blanks.length} câu)</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}>
              {blanks.map((blank, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}>
                  <span style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    minWidth: "40px",
                    textAlign: "center",
                  }}>
                    {blank.questionNum}
                  </span>
                  <input
                    type="text"
                    value={answers[blank.questionNum] || ""}
                    onChange={(e) => {
                      const newAnswers = { ...answers, [blank.questionNum]: e.target.value };
                      onChange("answers", newAnswers);
                    }}
                    placeholder="Đáp án"
                    style={{
                      ...compactInputStyle,
                      flex: 1,
                      marginBottom: 0,
                      fontSize: "13px",
                    }}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>
              Tip: Dùng <code>|</code> để có nhiều đáp án đúng. VD: <code>factories|factory</code>
            </p>
          </div>
        )}

        {/* Preview */}
        {plainText && blanks.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Xem trước (như học sinh nhìn thấy)</label>
            <div style={{
              padding: "16px",
              backgroundColor: "#fffbeb",
              borderRadius: "8px",
              border: "1px solid #fcd34d",
            }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#92400e" }}>
                {notesTitle || "Notes"}
              </h4>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#b45309", fontStyle: "italic" }}>
                Write {wordLimit} for each answer.
              </p>
              <div 
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.8",
                  fontSize: "14px",
                }}
                dangerouslySetInnerHTML={{ __html: generatePreview() }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Multiple choice (ABC / ABCD)
  const renderMultipleChoice = (options) => (
    <div>
      <label style={labelStyle}>Câu hỏi</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="Nhập câu hỏi..."
        style={compactInputStyle}
      />
      
      <label style={labelStyle}>Các lựa chọn</label>
      {options.map((opt, idx) => (
        <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <span style={optionLabelStyle}>{opt}</span>
          <input
            type="text"
            value={(() => {
              const raw = question.options?.[idx] || "";
              return raw.replace(new RegExp(`^${opt}\\.\\s?`), "");
            })()}
            onChange={(e) => {
              const newOptions = [...(question.options || options.map(o => `${o}.`))];
              newOptions[idx] = `${opt}. ${e.target.value}`;
              onChange("options", newOptions);
            }}
            placeholder={`Nội dung lựa chọn ${opt}`}
            style={{ ...compactInputStyle, flex: 1 }}
          />
          <input
            type="radio"
            name={`correct_${questionIndex}`}
            checked={question.correctAnswer === opt}
            onChange={() => onChange("correctAnswer", opt)}
            title="Đánh dấu là đáp án đúng"
          />
        </div>
      ))}
      <small style={{ color: colors.gray }}>
        Đáp án đúng: <strong>{question.correctAnswer || "(Chưa chọn)"}</strong>
      </small>
    </div>
  );

  // Matching question - với số câu global
  const renderMatchingQuestion = () => {
    const leftItems = question.leftItems || [""];
    const startNum = sectionStartingNumber || globalQuestionNumber || 1;
    const leftTitle = question.leftTitle || "Items";
    const rightTitle = question.rightTitle || "Options";
    
    return (
      <div>
        {/* Info banner */}
        <div style={{
          padding: "10px 12px",
          backgroundColor: "#dbeafe",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #3b82f6",
          fontSize: "12px",
        }}>
          <strong style={{ color: "#1d4ed8" }}>Matching Question</strong>
          <p style={{ margin: "4px 0 0", color: "#1e40af" }}>
            Mỗi item bên trái = 1 câu hỏi. Số câu sẽ tự động đánh từ <strong>{startNum}</strong> đến <strong>{startNum + leftItems.length - 1}</strong>.
          </p>
        </div>
        
        <label style={labelStyle}>Câu hỏi / Mô tả</label>
        <input
          type="text"
          value={question.questionText || ""}
          onChange={(e) => onChange("questionText", e.target.value)}
          placeholder="VD: What characteristics have been offered for each facility?"
          style={compactInputStyle}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
          <div>
            <label style={labelStyle}>Tiêu đề cột trái</label>
            <input
              type="text"
              value={leftTitle}
              onChange={(e) => onChange("leftTitle", e.target.value)}
              placeholder="VD: Items"
              style={compactInputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Tiêu đề cột phải</label>
            <input
              type="text"
              value={rightTitle}
              onChange={(e) => onChange("rightTitle", e.target.value)}
              placeholder="VD: Opinions"
              style={compactInputStyle}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
          {/* Left items (global numbered) */}
          <div>
            <label style={labelStyle}>
              {leftTitle} (Câu {startNum}-{startNum + leftItems.length - 1})
            </label>
            {leftItems.map((item, idx) => {
              const questionNum = startNum + idx;
              return (
                <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <span style={{
                    ...optionLabelStyle,
                    backgroundColor: "#3b82f6",
                    color: "white",
                    minWidth: "32px",
                  }}>
                    {questionNum}
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newItems = [...leftItems];
                      newItems[idx] = e.target.value;
                      onChange("leftItems", newItems);
                    }}
                    placeholder={`Facility/Item ${idx + 1}`}
                    style={{ ...compactInputStyle, flex: 1, marginBottom: 0 }}
                  />
                  {leftItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = leftItems.filter((_, i) => i !== idx);
                        onChange("leftItems", newItems);
                      }}
                      style={deleteButtonSmallStyle}
                    >
                        X
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => onChange("leftItems", [...leftItems, ""])}
              style={addItemButtonStyle}
            >
              + Thêm Item (Câu {startNum + leftItems.length})
            </button>
          </div>

          {/* Right items (lettered options) */}
          <div>
            <label style={labelStyle}>{rightTitle} (A, B, C...)</label>
            {(question.rightItems || ["A.", "B.", "C."]).map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <span style={optionLabelStyle}>{String.fromCharCode(65 + idx)}</span>
                <input
                  type="text"
                  value={item.replace(/^[A-Z]\.\s*/, "")}
                  onChange={(e) => {
                    const newItems = [...(question.rightItems || [])];
                    newItems[idx] = `${String.fromCharCode(65 + idx)}. ${e.target.value}`;
                    onChange("rightItems", newItems);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  style={{ ...compactInputStyle, flex: 1, marginBottom: 0 }}
                />
                {(question.rightItems?.length || 3) > 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = (question.rightItems || []).filter((_, i) => i !== idx);
                      onChange("rightItems", newItems);
                    }}
                    style={deleteButtonSmallStyle}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newLetter = String.fromCharCode(65 + (question.rightItems?.length || 3));
                onChange("rightItems", [...(question.rightItems || []), `${newLetter}.`]);
              }}
              style={addItemButtonStyle}
            >
              + Thêm Option
            </button>
          </div>
        </div>

        {/* Answers section */}
        <div style={{ marginTop: "16px" }}>
          <label style={labelStyle}>Đáp án</label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "8px",
          }}>
            {leftItems.map((item, idx) => {
              const questionNum = startNum + idx;
              const answers = question.answers || {};
              return (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 8px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "6px",
                  border: "1px solid #86efac",
                }}>
                  <span style={{
                    background: "#22c55e",
                    color: "white",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}>
                    {questionNum}
                  </span>
                  <select
                    value={answers[questionNum] || ""}
                    onChange={(e) => {
                      const newAnswers = { ...answers, [questionNum]: e.target.value };
                      onChange("answers", newAnswers);
                    }}
                    style={{ 
                      ...compactInputStyle, 
                      flex: 1, 
                      marginBottom: 0, 
                      fontSize: "12px",
                      padding: "4px 8px",
                    }}
                  >
                    <option value="">--</option>
                    {(question.rightItems || ["A.", "B.", "C."]).map((_, optIdx) => (
                      <option key={optIdx} value={String.fromCharCode(65 + optIdx)}>
                        {String.fromCharCode(65 + optIdx)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Alternative text input for answers */}
        <div style={{ marginTop: "12px" }}>
          <label style={{ ...labelStyle, fontSize: "11px", color: "#6b7280" }}>
            Hoặc nhập đáp án dạng text (VD: 15-B, 16-A, 17-C)
          </label>
          <input
            type="text"
            value={question.correctAnswer || ""}
            onChange={(e) => onChange("correctAnswer", e.target.value)}
            placeholder={`${startNum}-B, ${startNum + 1}-A, ${startNum + 2}-C...`}
            style={{ ...compactInputStyle, fontSize: "12px" }}
          />
        </div>
      </div>
    );
  };

  // Multi-select question (Choose 2+ letters) - e.g., Questions 25 and 26
  const renderMultiSelectQuestion = () => {
    const options = question.options || ["A. ", "B. ", "C. ", "D. ", "E. "];
    const requiredAnswers = question.requiredAnswers || 2;
    const correctAnswers = question.correctAnswer ? question.correctAnswer.split(',') : [];

    // Calculate question range - add offset from previous questions in this section
    const baseStartQ = sectionStartingNumber || globalQuestionNumber || 1;
    const startQ = baseStartQ + questionsBeforeInSection;
    const endQ = startQ + requiredAnswers - 1;

    const toggleAnswer = (letter) => {
      let newAnswers = [...correctAnswers];
      if (newAnswers.includes(letter)) {
        newAnswers = newAnswers.filter(a => a !== letter);
      } else {
        newAnswers.push(letter);
        newAnswers.sort();
      }
      onChange("correctAnswer", newAnswers.join(','));
    };

    return (
      <div>
        {/* Question Range Badge - like matching */}
        <div style={{
          padding: "10px 12px",
          backgroundColor: "#e0f2fe",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #7dd3fc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontWeight: 600, color: "#0369a1" }}>
            Questions {startQ} and {endQ}
          </span>
          <span style={{
            padding: "4px 10px",
            backgroundColor: "#0ea5e9",
            color: "white",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}>
            Q{startQ}-{endQ}
          </span>
        </div>

        <div style={{
          padding: "10px 12px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #fcd34d",
          fontSize: "13px",
        }}>
          <strong>Choose {requiredAnswers === 2 ? 'TWO' : requiredAnswers === 3 ? 'THREE' : requiredAnswers} letters:</strong> Học sinh chọn <strong>{requiredAnswers}</strong> đáp án đúng = <strong>{requiredAnswers} câu hỏi</strong>
        </div>

        <label style={labelStyle}>Câu hỏi</label>
        <textarea
          value={question.questionText || ""}
          onChange={(e) => onChange("questionText", e.target.value)}
          placeholder="VD: What are the speakers' opinions about the literature lectures?"
          style={{ ...compactInputStyle, minHeight: "60px", resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: "12px", marginTop: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Số đáp án cần chọn</label>
            <select
              value={requiredAnswers}
              onChange={(e) => onChange("requiredAnswers", parseInt(e.target.value))}
              style={{ ...compactInputStyle, width: "100px" }}
            >
              <option value={2}>2 đáp án (TWO)</option>
              <option value={3}>3 đáp án (THREE)</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Các lựa chọn A-E (click vào nút để đánh dấu đáp án đúng)</label>
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = correctAnswers.includes(letter);
          
          return (
            <div key={idx} style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
              alignItems: "center",
              padding: "8px",
              backgroundColor: isCorrect ? "#dcfce7" : "#f8fafc",
              borderRadius: "8px",
              border: isCorrect ? "2px solid #22c55e" : "1px solid #e5e7eb",
            }}>
              <button
                type="button"
                onClick={() => toggleAnswer(letter)}
                style={{
                  ...optionLabelStyle,
                  backgroundColor: isCorrect ? "#22c55e" : colors.primaryPurple + "15",
                  color: isCorrect ? "white" : colors.primaryPurple,
                  cursor: "pointer",
                  border: "none",
                }}
                title={isCorrect ? "Bỏ chọn đáp án" : "Chọn là đáp án đúng"}
              >
                {letter}
              </button>
              <input
                type="text"
                value={opt.replace(/^[A-Z]\.\s*/, "")}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[idx] = `${letter}. ${e.target.value}`;
                  onChange("options", newOptions);
                }}
                placeholder={`Lựa chọn ${letter}`}
                style={{ ...compactInputStyle, flex: 1, marginBottom: 0 }}
              />
              {options.length > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = options.filter((_, i) => i !== idx);
                    onChange("options", newOptions);
                    // Remove from correct answers if selected
                    if (isCorrect) {
                      onChange("correctAnswer", correctAnswers.filter(a => a !== letter).join(','));
                    }
                  }}
                  style={deleteButtonSmallStyle}
                >
                  X
                </button>
              )}
            </div>
          );
        })}

        {options.length < 7 && (
          <button
            type="button"
            onClick={() => {
              const newLetter = String.fromCharCode(65 + options.length);
              onChange("options", [...options, `${newLetter}. `]);
            }}
            style={addItemButtonStyle}
          >
            + Thêm lựa chọn
          </button>
        )}

        {/* Answer Preview */}
        <div style={{
          marginTop: "12px",
          padding: "10px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #86efac",
        }}>
          <strong style={{ color: "#15803d" }}>Đáp án đúng: </strong>
          {correctAnswers.length > 0 ? (
            <span style={{ color: "#15803d", fontWeight: 600 }}>
              {correctAnswers.join(', ')}
            </span>
          ) : (
            <span style={{ color: "#9ca3af" }}>(Chưa chọn)</span>
          )}
          {correctAnswers.length !== requiredAnswers && correctAnswers.length > 0 && (
            <span style={{ color: "#dc2626", marginLeft: "10px", fontSize: "12px" }}>
              Cần chọn đúng {requiredAnswers} đáp án
            </span>
          )}
        </div>
      </div>
    );
  };

  // Map labeling question
  const renderMapLabelingQuestion = () => (
    <div>
      <MapLabelingQuestion
        question={question}
        onChange={(field, value) => onChange(field, value)}
        mode="edit"
        questionNumber={globalQuestionNumber}
      />
    </div>
  );


  // Flowchart question
  const renderFlowchartQuestion = () => {
    const questionStart = sectionStartingNumber || globalQuestionNumber || 1;
    const minOptionCount = 6;
    const steps = Array.isArray(question.steps) && question.steps.length > 0
      ? question.steps
      : [{ text: "", hasBlank: false }];
    const sourceOptions = Array.isArray(question.options) ? question.options : [];
    const maxOptionCount = Math.max(12, sourceOptions.length || 0);
    const options = Array.from(
      { length: Math.max(sourceOptions.length, minOptionCount) },
      (_, index) => sourceOptions[index] || `${String.fromCharCode(65 + index)}.`
    );
    const optionEntries = getFlowchartOptionEntries(options);
    const optionColumnLength = Math.ceil(optionEntries.length / 2);
    const optionRows = Array.from({ length: optionColumnLength }, (_, rowIndex) => [
      optionEntries[rowIndex] || null,
      optionEntries[rowIndex + optionColumnLength] || null,
    ]);
    const blankEntries = getFlowchartBlankEntries(question, questionStart);
    const entryByStepIndex = new Map(blankEntries.map((entry) => [entry.stepIndex, entry]));
    const computedRange = blankEntries.length
      ? `${questionStart}-${questionStart + blankEntries.length - 1}`
      : "";
    const configuredOptionCount = optionEntries.filter((option) => option.label).length;
    const optionRangeLabel = optionEntries.length
      ? `${optionEntries[0].value}-${optionEntries[optionEntries.length - 1].value}`
      : "A-F";
    const lastOptionEntry = optionEntries[optionEntries.length - 1] || null;
    const lastOptionLetter = lastOptionEntry?.value || "";
    const isLastOptionFilled = Boolean(lastOptionEntry?.label);
    const isLastOptionUsed = Boolean(lastOptionLetter) && steps.some((step) => (
      Boolean(step?.hasBlank) && resolveFlowchartChoiceValue(step?.correctAnswer, options) === lastOptionLetter
    ));
    const canAddOption = options.length < maxOptionCount;
    const canRemoveOption = options.length > minOptionCount && !isLastOptionFilled && !isLastOptionUsed;
    const removeOptionHint = options.length <= minOptionCount
      ? "Minimum answer bank is A-F."
      : isLastOptionUsed
      ? `Option ${lastOptionLetter} is still used by a blank step.`
      : isLastOptionFilled
      ? `Clear option ${lastOptionLetter} before removing it.`
      : `You can reduce back to ${String.fromCharCode(65 + options.length - 2)}.`;

    const composeBlankStepText = (beforeText, afterText) => {
      const beforeValue = String(beforeText ?? "");
      const afterValue = String(afterText ?? "");
      const leftSide = beforeValue && !/\s$/.test(beforeValue) ? `${beforeValue} ` : beforeValue;
      const rightSide = afterValue && !/^\s/.test(afterValue) ? ` ${afterValue}` : afterValue;
      return `${leftSide}[BLANK]${rightSide}`.trim();
    };

    const composeInfoStepText = (beforeText, afterText) => {
      const beforeValue = String(beforeText ?? "").trim();
      const afterValue = String(afterText ?? "").trim();
      if (!beforeValue) return afterValue;
      if (!afterValue) return beforeValue;
      return `${beforeValue} ${afterValue}`;
    };

    const buildNextFlowchartQuestion = (nextSteps, nextOptions = options) => {
      let nextQuestionNumber = questionStart;
      const nextAnswers = {};
      const nextSummary = [];

      const normalizedSteps = nextSteps.map((step, stepIndex) => {
        const hasPlaceholder = splitFlowchartStepText(step?.text || "").hasPlaceholder;
        const isBlankStep = Boolean(step?.hasBlank) || hasPlaceholder;
        const fallbackAnswer = step?.correctAnswer || entryByStepIndex.get(stepIndex)?.expected || "";
        const resolvedAnswer = isBlankStep
          ? resolveFlowchartChoiceValue(fallbackAnswer, nextOptions)
          : "";

        if (isBlankStep) {
          if (resolvedAnswer) {
            nextAnswers[String(nextQuestionNumber)] = resolvedAnswer;
            nextSummary.push(`${nextQuestionNumber}-${resolvedAnswer}`);
          }
          nextQuestionNumber += 1;
        }

        return {
          ...step,
          hasBlank: isBlankStep,
          correctAnswer: isBlankStep ? resolvedAnswer : "",
        };
      });

      return {
        ...question,
        options: nextOptions,
        steps: normalizedSteps,
        answers: nextAnswers,
        correctAnswer: nextSummary.join(", "),
      };
    };

    const commitFlowchartQuestion = (nextSteps, nextOptions = options) => {
      onChange("full", buildNextFlowchartQuestion(nextSteps, nextOptions));
    };

    const updateStep = (stepIndex, patch) => {
      const nextSteps = [...steps];
      nextSteps[stepIndex] = {
        ...nextSteps[stepIndex],
        ...patch,
      };
      if (patch.hasBlank === false) {
        const currentParts = splitFlowchartStepText(nextSteps[stepIndex]?.text || "");
        if (currentParts.hasPlaceholder) {
          nextSteps[stepIndex].text = composeInfoStepText(currentParts.before, currentParts.after);
        }
        nextSteps[stepIndex].correctAnswer = "";
      }
      commitFlowchartQuestion(nextSteps);
    };

    const updateBlankStepTextPart = (stepIndex, part, nextValue) => {
      const currentStep = steps[stepIndex] || {};
      const currentParts = splitFlowchartStepText(currentStep?.text || "");
      const beforeText = part === "before"
        ? nextValue
        : (currentParts.hasPlaceholder ? currentParts.before : String(currentStep?.text || ""));
      const afterText = part === "after"
        ? nextValue
        : (currentParts.hasPlaceholder ? currentParts.after : "");

      updateStep(stepIndex, {
        hasBlank: true,
        text: composeBlankStepText(beforeText, afterText),
      });
    };

    const addStep = (hasBlank) => {
      commitFlowchartQuestion([
        ...steps,
        {
          text: "",
          hasBlank,
          correctAnswer: "",
        },
      ]);
    };

    const updateOptionText = (optionIndex, nextText) => {
      const nextOptions = [...options];
      const letter = String.fromCharCode(65 + optionIndex);
      const cleaned = String(nextText || "").trim();
      nextOptions[optionIndex] = cleaned ? `${letter}. ${cleaned}` : `${letter}.`;
      commitFlowchartQuestion(steps, nextOptions);
    };

    const addOption = () => {
      if (!canAddOption) return;
      const nextLetter = String.fromCharCode(65 + options.length);
      commitFlowchartQuestion(steps, [...options, `${nextLetter}.`]);
    };

    const removeOption = () => {
      if (!canRemoveOption) return;
      commitFlowchartQuestion(steps, options.slice(0, -1));
    };

    const generatedSummary = blankEntries
      .map(({ num, expected }) => `${num}-${expected || "?"}`)
      .join(", ");

    return (
      <div>
        <div style={{
          padding: "14px 16px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
          border: "1px solid #fcd34d",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontWeight: 700, color: "#9a3412" }}>
            <LineIcon name="flowchart" size={18} />
            <span>Flowchart Builder</span>
          </div>
          <div style={{ fontSize: "12px", color: "#7c2d12", lineHeight: 1.7 }}>
            Tạo các bước theo đúng thứ tự đi xuống. Với bước có đáp án, bật <strong>Blank step</strong> rồi nhập phần trước và sau chỗ trống để gap nằm đúng giữa câu như đề thật.
          </div>
        </div>

        <label style={labelStyle}>Flowchart Title</label>
        <input
          type="text"
          value={question.questionText || ""}
          onChange={(e) => onChange("questionText", e.target.value)}
          placeholder="Example: Sustainability Timeline"
          style={{ ...compactInputStyle, fontWeight: 600 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(260px, 0.65fr)", gap: "16px", alignItems: "start", marginBottom: "16px" }}>
          <div>
            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#fff",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f8fafc",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#1f2937" }}>
                  <LineIcon name="selector" size={16} />
                  <span>Answer Bank</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Exam-style {optionRangeLabel} box</span>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={removeOption}
                      disabled={!canRemoveOption}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "999px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: canRemoveOption ? "#fff" : "#f8fafc",
                        color: canRemoveOption ? "#334155" : "#94a3b8",
                        fontWeight: 700,
                        cursor: canRemoveOption ? "pointer" : "not-allowed",
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: "48px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                      {optionRangeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={addOption}
                      disabled={!canAddOption}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "999px",
                        border: "1px solid #fdba74",
                        backgroundColor: canAddOption ? "#fff7ed" : "#fef2f2",
                        color: canAddOption ? "#9a3412" : "#fca5a5",
                        fontWeight: 700,
                        cursor: canAddOption ? "pointer" : "not-allowed",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: "14px" }}>
                <div style={{ border: "1px solid #94a3b8", borderRadius: "10px", overflow: "hidden" }}>
                  {optionRows.map((row, rowIndex) => (
                    <div
                      key={`flowchart-option-row-${rowIndex}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px minmax(0, 1fr) 56px minmax(0, 1fr)",
                        borderTop: rowIndex === 0 ? "none" : "1px solid #cbd5e1",
                      }}
                    >
                      {row.map((option, columnIndex) => {
                        if (!option) {
                          return (
                            <React.Fragment key={`flowchart-option-empty-${rowIndex}-${columnIndex}`}>
                              <div style={{ borderLeft: columnIndex === 1 ? "1px solid #cbd5e1" : "none", backgroundColor: "#f8fafc" }}></div>
                              <div style={{ borderLeft: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}></div>
                            </React.Fragment>
                          );
                        }

                        const optionIndex = option.value.charCodeAt(0) - 65;
                        return (
                          <React.Fragment key={`flowchart-option-${option.value}`}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              backgroundColor: "#fff7ed",
                              color: "#9a3412",
                              borderLeft: columnIndex === 1 ? "1px solid #cbd5e1" : "none",
                              borderRight: "1px solid #cbd5e1",
                              minHeight: "52px",
                            }}>
                              {option.value}
                            </div>
                            <div style={{ padding: "8px 10px", minHeight: "52px", display: "flex", alignItems: "center" }}>
                              <input
                                type="text"
                                value={option.label || ""}
                                onChange={(e) => updateOptionText(optionIndex, e.target.value)}
                                placeholder={`Option ${option.value}`}
                                style={{ ...compactInputStyle, marginBottom: 0 }}
                              />
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Increase or decrease the bank to switch between A-F, A-G, A-H and more.
                  </span>
                  <span style={{ fontSize: "11px", color: canRemoveOption ? "#64748b" : "#b45309", fontWeight: canRemoveOption ? 500 : 600 }}>
                    {removeOptionHint}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Question Range</label>
            <input
              type="text"
              value={question.questionRange || ""}
              onChange={(e) => onChange("questionRange", e.target.value)}
              placeholder={computedRange ? `Auto: ${computedRange}` : "Example: 28-30"}
              style={compactInputStyle}
            />
            {computedRange && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "-6px", marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>Detected from blank steps: Questions {computedRange}</span>
                <button
                  type="button"
                  onClick={() => onChange("questionRange", computedRange)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use auto range
                </button>
              </div>
            )}

            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              backgroundColor: "#fff",
              padding: "14px",
              marginBottom: "14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontWeight: 700, color: "#111827" }}>
                <LineIcon name="review" size={16} />
                <span>Auto-generated Answers</span>
              </div>
              <div style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: blankEntries.length ? "#f0fdf4" : "#f8fafc",
                border: `1px solid ${blankEntries.length ? "#86efac" : "#e5e7eb"}`,
                color: blankEntries.length ? "#166534" : "#64748b",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.7,
              }}>
                {generatedSummary || "No blank steps yet. Add blank steps to generate the answer key."}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px", lineHeight: 1.6 }}>
                Chuỗi này được đồng bộ tự động từ từng step blank và sẽ dùng để chấm điểm sau khi lưu đề.
              </div>
            </div>

            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              backgroundColor: "#fff",
              padding: "14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontWeight: 700, color: "#111827" }}>
                <LineIcon name="eye" size={16} />
                <span>Build Checklist</span>
              </div>
              <div style={{ display: "grid", gap: "8px", fontSize: "12px", color: "#475569" }}>
                <div>• Title: {question.questionText ? "Ready" : "Missing"}</div>
                <div>• Blank steps: {blankEntries.length}</div>
                <div>• Answer bank options: {configuredOptionCount}/{optionEntries.length} filled</div>
                <div>• Answer key: {generatedSummary ? "Ready" : "Waiting for blank answers"}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Flowchart Steps</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {steps.map((step, idx) => {
              const blankEntry = entryByStepIndex.get(idx);
              const textParts = splitFlowchartStepText(step?.text || "");
              const previewBefore = textParts.hasPlaceholder ? textParts.before : String(step?.text || "");
              const previewAfter = textParts.hasPlaceholder ? textParts.after : "";
              const answerValue = step.correctAnswer || blankEntry?.expected || "";
              const selectedOption = optionEntries.find((option) => option.value === answerValue);

              return (
                <React.Fragment key={`flowchart-edit-step-${idx}`}>
                  <div style={{
                    border: `1px solid ${step.hasBlank ? "#fdba74" : "#dbeafe"}`,
                    borderRadius: "14px",
                    backgroundColor: "#fff",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "10px 12px",
                      backgroundColor: step.hasBlank ? "#fff7ed" : "#f8fafc",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "999px",
                          backgroundColor: step.hasBlank ? "#ea580c" : "#cbd5e1",
                          color: step.hasBlank ? "#fff" : "#334155",
                          fontWeight: 700,
                          fontSize: "12px",
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: "#111827" }}>Step {idx + 1}</span>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          backgroundColor: step.hasBlank ? "#ffedd5" : "#e2e8f0",
                          color: step.hasBlank ? "#9a3412" : "#475569",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}>
                          {step.hasBlank ? `Blank step${blankEntry ? ` • Q${blankEntry.num}` : ""}` : "Info step"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => updateStep(idx, { hasBlank: !step.hasBlank })}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            border: `1px solid ${step.hasBlank ? "#fdba74" : "#cbd5e1"}`,
                            backgroundColor: step.hasBlank ? "#fff7ed" : "#fff",
                            color: step.hasBlank ? "#9a3412" : "#475569",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {step.hasBlank ? "Blank step" : "Convert to blank"}
                        </button>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => commitFlowchartQuestion(steps.filter((_, stepIndex) => stepIndex !== idx))}
                            style={{ ...deleteButtonSmallStyle, padding: "5px 8px" }}
                          >
                            <LineIcon name="close" size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: "12px" }}>
                      {step.hasBlank ? (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
                            <div>
                              <label style={labelStyle}>Text Before Blank</label>
                              <textarea
                                value={previewBefore}
                                onChange={(e) => updateBlankStepTextPart(idx, "before", e.target.value)}
                                placeholder="Example: Established a university"
                                style={{
                                  ...compactInputStyle,
                                  minHeight: "72px",
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                }}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Text After Blank</label>
                              <textarea
                                value={previewAfter}
                                onChange={(e) => updateBlankStepTextPart(idx, "after", e.target.value)}
                                placeholder="Example: to develop a sustainability plan."
                                style={{
                                  ...compactInputStyle,
                                  minHeight: "72px",
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280", lineHeight: 1.6 }}>
                            Mẹo: nhập phần đầu câu ở ô trái và phần sau chỗ trống ở ô phải. Hệ thống sẽ tự lưu thành một gap inline trong đề học sinh.
                          </div>
                        </>
                      ) : (
                        <>
                          <label style={labelStyle}>Step Text</label>
                          <textarea
                            value={step.text || ""}
                            onChange={(e) => updateStep(idx, { text: e.target.value })}
                            placeholder="Example: Revised guidelines for construction of new buildings."
                            style={{
                              ...compactInputStyle,
                              minHeight: "72px",
                              resize: "vertical",
                              fontFamily: "inherit",
                            }}
                          />
                        </>
                      )}

                      {step.hasBlank && (
                        <div style={{ marginTop: "12px" }}>
                          <label style={labelStyle}>Correct Option</label>
                          <div style={{ position: "relative", maxWidth: "240px" }}>
                            <select
                              value={answerValue}
                              onChange={(e) => updateStep(idx, { hasBlank: true, correctAnswer: e.target.value })}
                              style={{
                                ...compactInputStyle,
                                marginBottom: 0,
                                paddingRight: "34px",
                                appearance: "none",
                                WebkitAppearance: "none",
                                MozAppearance: "none",
                                fontWeight: 600,
                              }}
                            >
                              <option value="">Select answer</option>
                              {optionEntries.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.value}. {option.label || option.raw}
                                </option>
                              ))}
                            </select>
                            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
                              <LineIcon name="chevron-down" size={14} />
                            </span>
                          </div>
                        </div>
                      )}

                      <div style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1px dashed #cbd5e1",
                        backgroundColor: "#fcfcfd",
                      }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                          Live Preview
                        </div>
                        <div style={{ lineHeight: 1.9, color: "#0f172a", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          {step.hasBlank ? (
                            <>
                              <span>{previewBefore || "..."}</span>
                              <span style={{ fontWeight: 700, color: "#111827" }}>{blankEntry?.num || "?"}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", margin: "0 2px" }}>
                                <span style={{ color: "#ef4444", fontWeight: 700 }}>(</span>
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: "96px",
                                  padding: "4px 12px",
                                  borderRadius: "4px",
                                  border: "1px dashed #eab308",
                                  backgroundColor: "#fefce8",
                                  color: answerValue ? "#92400e" : "#a16207",
                                  fontWeight: 700,
                                  letterSpacing: answerValue ? "normal" : "0.08em",
                                }}>
                                  {answerValue ? answerValue : "........."}
                                </span>
                                <span style={{ color: "#ef4444", fontWeight: 700 }}>)</span>
                              </span>
                              <span>{previewAfter || "..."}</span>
                            </>
                          ) : (
                            <span>{step.text || "Add step text"}</span>
                          )}
                        </div>
                        {step.hasBlank && (
                          <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                            {selectedOption
                              ? `Correct option: ${selectedOption.value}. ${selectedOption.label || selectedOption.raw}`
                              : "Choose the correct option for this gap."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {idx < steps.length - 1 && (
                    <div style={{ display: "flex", justifyContent: "center", color: "#94a3b8" }}>
                      <LineIcon name="chevron-down" size={18} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => addStep(false)}
              style={{
                ...addItemButtonStyle,
                marginTop: 0,
                backgroundColor: "#f8fafc",
              }}
            >
              + Add Info Step
            </button>
            <button
              type="button"
              onClick={() => addStep(true)}
              style={{
                ...addItemButtonStyle,
                marginTop: 0,
                backgroundColor: "#fff7ed",
                borderColor: "#fdba74",
                color: "#9a3412",
              }}
            >
              + Add Blank Step
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Check if this is a matching type (shows differently)
  const isMatchingType = type === "matching";
  // Check if this is form-completion type (also shows range like matching)
  const isFormCompletionType = type === "form-completion";
  const isFlowchartType = type === "flowchart";
  const leftItemsCount = question.leftItems?.length || 0;
  const startNum = sectionStartingNumber || globalQuestionNumber || 1;
  
  // For form-completion, get blank count from formRows
  const formBlankCount = isFormCompletionType 
    ? (question.formRows?.filter(r => r.isBlank)?.length || 0)
    : 0;
  const flowchartBlankCount = isFlowchartType
    ? countFlowchartQuestionSlots(question)
    : 0;

  return (
    <div style={questionCardStyle}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={questionHeaderStyle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", color: "#6b7280" }}>
            <LineIcon name={isExpanded ? "chevron-down" : "chevron-right"} size={12} strokeWidth={2.2} />
          </span>
          
          {/* Different display for matching and form-completion vs other types */}
          {isMatchingType ? (
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "white",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "bold",
              }}>
                Q{startNum}-{startNum + leftItemsCount - 1}
              </span>
              <span style={{ color: "#6b7280", fontSize: "12px" }}>
                ({leftItemsCount} items)
              </span>
            </strong>
          ) : isFormCompletionType ? (
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "bold",
              }}>
                Q{startNum}-{startNum + formBlankCount - 1}
              </span>
              <span style={{ color: "#6b7280", fontSize: "12px" }}>
                ({formBlankCount} blanks)
              </span>
            </strong>
          ) : isFlowchartType ? (
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                background: "linear-gradient(135deg, #ea580c, #f59e0b)",
                color: "white",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "bold",
              }}>
                Q{startNum}-{startNum + Math.max(flowchartBlankCount - 1, 0)}
              </span>
              <span style={{ color: "#6b7280", fontSize: "12px" }}>
                ({flowchartBlankCount} blanks)
              </span>
            </strong>
          ) : globalQuestionNumber ? (
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                background: "#3b82f6",
                color: "white",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: "bold",
              }}>
                {globalQuestionNumber}
              </span>
              <span style={{ color: "#6b7280", fontSize: "11px" }}>
                (#{questionIndex + 1} trong section)
              </span>
            </strong>
          ) : (
            <strong>Câu {questionIndex + 1}</strong>
          )}
          <span style={typeBadgeStyle}>{type}</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            style={iconButtonStyle}
            title="Copy câu hỏi"
          >
            Copy
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ ...iconButtonStyle, color: colors.dangerRed }}
              title="Xóa câu hỏi"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: "12px" }}>
          {renderQuestionContent()}
        </div>
      )}
    </div>
  );
};

// Styles
const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "12px",
  color: colors.gray,
};

const optionLabelStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  backgroundColor: colors.primaryPurple + "15",
  color: colors.primaryPurple,
  borderRadius: "6px",
  fontWeight: 700,
  fontSize: "12px",
};

const addItemButtonStyle = {
  padding: "6px 12px",
  backgroundColor: "#f3f4f6",
  border: "1px dashed #d1d5db",
  borderRadius: "6px",
  color: colors.gray,
  cursor: "pointer",
  fontSize: "12px",
  width: "100%",
  marginTop: "4px",
};

const questionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  marginBottom: "12px",
  backgroundColor: "#fff",
  overflow: "hidden",
  transition: "all 0.2s ease",
};

const questionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  backgroundColor: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

const typeBadgeStyle = {
  padding: "2px 8px",
  backgroundColor: colors.questionYellow + "20",
  color: colors.questionYellow,
  borderRadius: "10px",
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
};

const iconButtonStyle = {
  padding: "4px 8px",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.2s",
};

export default ListeningQuestionEditor;
