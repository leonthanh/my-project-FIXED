import React, { useState } from "react";
import { colors, compactInputStyle, deleteButtonSmallStyle } from "../utils/styles";

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
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const type = questionType || question.questionType || "fill";

  // Render based on question type
  const renderQuestionContent = () => {
    switch (type) {
      case "fill":
        return renderFillQuestion();
      case "form-completion":
        return renderFormCompletionQuestion();
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

  // Form/Table Completion - Visual Form Builder (không cần biết HTML)
  const renderFormCompletionQuestion = () => {
    // Initialize rows if empty
    const rows = question.formRows || [
      { label: "First name", value: "", isBlank: true, blankNumber: 1 },
      { label: "Family name", value: "Smith", isBlank: false, blankNumber: null },
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
      const nextBlankNum = Math.max(0, ...rows.map(r => r.blankNumber || 0)) + 1;
      const newRows = [...rows, { label: "", value: "", isBlank: false, blankNumber: null }];
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
          newRows[index].value = ""; // Clear value when it's a blank
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

    // Render preview table
    const renderPreviewTable = () => {
      return (
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #d1d5db",
        }}>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={{
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f9fafb",
                  fontWeight: 600,
                  width: "40%",
                }}>
                  {row.label}
                </td>
                <td style={{
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                }}>
                  {row.isBlank ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        background: "#3b82f6",
                        color: "white",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}>
                        {row.blankNumber}
                      </span>
                      <input
                        type="text"
                        disabled
                        placeholder="..............."
                        style={{
                          width: "150px",
                          padding: "8px 12px",
                          border: "2px solid #3b82f6",
                          borderRadius: "6px",
                          background: "#eff6ff",
                        }}
                      />
                    </span>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <strong style={{ color: "#1d4ed8" }}>📋 Form Builder - Tạo bảng trực quan</strong>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#1e40af" }}>
            Thêm từng dòng vào form. Tick ☑️ "Blank" nếu đó là chỗ trống học sinh cần điền.
          </p>
        </div>

        {/* Form Title */}
        <label style={labelStyle}>📌 Tiêu đề Form</label>
        <input
          type="text"
          value={question.formTitle || ""}
          onChange={(e) => onChange("formTitle", e.target.value)}
          placeholder="VD: PERSONAL DETAILS FOR HOMESTAY APPLICATION"
          style={{ ...compactInputStyle, fontWeight: 600 }}
        />

        {/* Question Range */}
        <label style={labelStyle}>📊 Phạm vi câu hỏi</label>
        <input
          type="text"
          value={question.questionRange || ""}
          onChange={(e) => onChange("questionRange", e.target.value)}
          placeholder="VD: Questions 1-10"
          style={compactInputStyle}
        />

        {/* Visual Form Builder */}
        <label style={labelStyle}>📝 Các dòng trong Form</label>
        <div style={{
          border: "2px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 1fr 80px 60px 80px",
            gap: "8px",
            padding: "10px 12px",
            backgroundColor: "#f1f5f9",
            borderBottom: "2px solid #e5e7eb",
            fontWeight: 600,
            fontSize: "12px",
            color: "#475569",
          }}>
            <span>#</span>
            <span>Nhãn (Label)</span>
            <span>Giá trị / Nội dung</span>
            <span style={{ textAlign: "center" }}>☑️ Blank?</span>
            <span style={{ textAlign: "center" }}>Câu số</span>
            <span></span>
          </div>

          {/* Rows */}
          {rows.map((row, idx) => (
            <div key={idx} style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 1fr 80px 60px 80px",
              gap: "8px",
              padding: "10px 12px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: row.isBlank ? "#eff6ff" : "#fff",
              alignItems: "center",
            }}>
              {/* Row number */}
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>{idx + 1}</span>
              
              {/* Label */}
              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(idx, "label", e.target.value)}
                placeholder="VD: First name"
                style={{ ...compactInputStyle, marginBottom: 0 }}
              />
              
              {/* Value (disabled if blank) */}
              <input
                type="text"
                value={row.isBlank ? "(Học sinh điền)" : row.value}
                onChange={(e) => updateRow(idx, "value", e.target.value)}
                placeholder={row.isBlank ? "Học sinh sẽ điền" : "VD: Smith"}
                disabled={row.isBlank}
                style={{
                  ...compactInputStyle,
                  marginBottom: 0,
                  backgroundColor: row.isBlank ? "#e0e7ff" : "#fff",
                  color: row.isBlank ? "#6366f1" : "#1f2937",
                  fontStyle: row.isBlank ? "italic" : "normal",
                }}
              />
              
              {/* Is Blank checkbox */}
              <div style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={row.isBlank}
                  onChange={(e) => updateRow(idx, "isBlank", e.target.checked)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
              </div>
              
              {/* Blank number */}
              <div style={{ textAlign: "center" }}>
                {row.isBlank && (
                  <span style={{
                    background: "#3b82f6",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}>
                    {row.blankNumber}
                  </span>
                )}
              </div>
              
              {/* Actions */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => moveRow(idx, -1)}
                  disabled={idx === 0}
                  style={{
                    padding: "4px 8px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: idx === 0 ? "not-allowed" : "pointer",
                    backgroundColor: "#f1f5f9",
                    opacity: idx === 0 ? 0.5 : 1,
                  }}
                  title="Di chuyển lên"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(idx, 1)}
                  disabled={idx === rows.length - 1}
                  style={{
                    padding: "4px 8px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: idx === rows.length - 1 ? "not-allowed" : "pointer",
                    backgroundColor: "#f1f5f9",
                    opacity: idx === rows.length - 1 ? 0.5 : 1,
                  }}
                  title="Di chuyển xuống"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => deleteRow(idx)}
                  disabled={rows.length <= 1}
                  style={{
                    padding: "4px 8px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: rows.length <= 1 ? "not-allowed" : "pointer",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    opacity: rows.length <= 1 ? 0.5 : 1,
                  }}
                  title="Xóa dòng"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addRow}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ➕ Thêm dòng mới
          </button>
        </div>

        {/* Answers for each blank */}
        {blankNumbers.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>✅ Đáp án cho từng câu</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
            }}>
              {blankNumbers.map(num => (
                <div key={num} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                }}>
                  <span style={{
                    background: "#22c55e",
                    color: "white",
                    width: "26px",
                    height: "26px",
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
                    value={answers[num] || ""}
                    onChange={(e) => {
                      const newAnswers = { ...answers, [num]: e.target.value };
                      onChange("answers", newAnswers);
                    }}
                    placeholder={`Đáp án câu ${num}`}
                    style={{ ...compactInputStyle, flex: 1, marginBottom: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>👁 Preview - Học sinh sẽ thấy:</label>
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
                  padding: "12px",
                  backgroundColor: "#1f2937",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "16px",
                }}>
                  {question.formTitle}
                </h3>
              )}
              {question.questionRange && (
                <p style={{
                  color: "#dc2626",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}>
                  {question.questionRange}
                </p>
              )}
              {renderPreviewTable()}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div style={{
          marginTop: "16px",
          padding: "12px",
          backgroundColor: "#ecfdf5",
          borderRadius: "8px",
          border: "1px solid #6ee7b7",
          fontSize: "12px",
        }}>
          <strong>💡 Hướng dẫn nhanh:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>Tick ☑️ <strong>Blank</strong> nếu ô đó là chỗ học sinh cần điền</li>
            <li>Số câu hỏi sẽ tự động đánh số theo thứ tự</li>
            <li>Dùng ↑↓ để sắp xếp lại thứ tự các dòng</li>
            <li>Preview sẽ hiện đúng như giao diện học sinh sẽ thấy</li>
          </ul>
        </div>
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
            value={question.options?.[idx]?.replace(`${opt}.`, "").trim() || ""}
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

  // Matching question
  const renderMatchingQuestion = () => (
    <div>
      <label style={labelStyle}>Câu hỏi / Mô tả</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: Match each speaker with their opinion"
        style={compactInputStyle}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
        {/* Left items (numbered) */}
        <div>
          <label style={labelStyle}>Items (Số thứ tự)</label>
          {(question.leftItems || [""]).map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <span style={optionLabelStyle}>{idx + 1}</span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...(question.leftItems || [""])];
                  newItems[idx] = e.target.value;
                  onChange("leftItems", newItems);
                }}
                placeholder={`Item ${idx + 1}`}
                style={{ ...compactInputStyle, flex: 1 }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange("leftItems", [...(question.leftItems || []), ""])}
            style={addItemButtonStyle}
          >
            + Item
          </button>
        </div>

        {/* Right items (lettered options) */}
        <div>
          <label style={labelStyle}>Options (A, B, C...)</label>
          {(question.rightItems || ["A.", "B.", "C."]).map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
                style={{ ...compactInputStyle, flex: 1 }}
              />
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
            + Option
          </button>
        </div>
      </div>

      <label style={{ ...labelStyle, marginTop: "12px" }}>Đáp án (VD: 1-B, 2-A, 3-C)</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="1-B, 2-A, 3-C, 4-D"
        style={compactInputStyle}
      />
    </div>
  );

  // Multi-select question (Choose 2 letters)
  const renderMultiSelectQuestion = () => {
    const options = question.options || ["A. ", "B. ", "C. ", "D. ", "E. "];
    const requiredAnswers = question.requiredAnswers || 2;
    const correctAnswers = question.correctAnswer ? question.correctAnswer.split(',') : [];

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
        <div style={{
          padding: "10px 12px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
          marginBottom: "12px",
          border: "1px solid #fcd34d",
          fontSize: "13px",
        }}>
          <strong>✅ Multi-Select:</strong> Học sinh chọn <strong>{requiredAnswers}</strong> đáp án đúng
        </div>

        <label style={labelStyle}>Câu hỏi</label>
        <textarea
          value={question.questionText || ""}
          onChange={(e) => onChange("questionText", e.target.value)}
          placeholder="VD: Which TWO features does the speaker mention about the course?"
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
              <option value={2}>2 đáp án</option>
              <option value={3}>3 đáp án</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Các lựa chọn (Click ✓ để đánh dấu đáp án đúng)</label>
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
                {isCorrect ? "✓" : letter}
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
                  ✕
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
          <strong style={{ color: "#15803d" }}>✅ Đáp án đúng: </strong>
          {correctAnswers.length > 0 ? (
            <span style={{ color: "#15803d", fontWeight: 600 }}>
              {correctAnswers.join(', ')}
            </span>
          ) : (
            <span style={{ color: "#9ca3af" }}>(Chưa chọn)</span>
          )}
          {correctAnswers.length !== requiredAnswers && correctAnswers.length > 0 && (
            <span style={{ color: "#dc2626", marginLeft: "10px", fontSize: "12px" }}>
              ⚠️ Cần chọn đúng {requiredAnswers} đáp án
            </span>
          )}
        </div>
      </div>
    );
  };

  // Map labeling question
  const renderMapLabelingQuestion = () => (
    <div>
      <label style={labelStyle}>Hướng dẫn</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: Label the map below. Write the correct letter, A-H."
        style={compactInputStyle}
      />

      <label style={labelStyle}>URL hình ảnh bản đồ</label>
      <input
        type="text"
        value={question.imageUrl || ""}
        onChange={(e) => onChange("imageUrl", e.target.value)}
        placeholder="https://example.com/map.png hoặc /uploads/images/map.png"
        style={compactInputStyle}
      />
      {question.imageUrl && (
        <img
          src={question.imageUrl}
          alt="Map preview"
          style={{ maxWidth: "100%", maxHeight: "200px", marginBottom: "12px", borderRadius: "8px" }}
        />
      )}

      <label style={labelStyle}>Phạm vi câu hỏi</label>
      <input
        type="text"
        value={question.questionRange || ""}
        onChange={(e) => onChange("questionRange", e.target.value)}
        placeholder="VD: 11-15"
        style={compactInputStyle}
      />

      <label style={labelStyle}>Các vị trí cần gắn nhãn</label>
      {(question.items || [{ label: "A", text: "" }]).map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <input
            type="text"
            value={item.label}
            onChange={(e) => {
              const newItems = [...question.items];
              newItems[idx] = { ...newItems[idx], label: e.target.value };
              onChange("items", newItems);
            }}
            placeholder="A"
            style={{ ...compactInputStyle, width: "50px" }}
          />
          <input
            type="text"
            value={item.text}
            onChange={(e) => {
              const newItems = [...question.items];
              newItems[idx] = { ...newItems[idx], text: e.target.value };
              onChange("items", newItems);
            }}
            placeholder="Mô tả vị trí (VD: Reception desk)"
            style={{ ...compactInputStyle, flex: 1 }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const nextLabel = String.fromCharCode(65 + (question.items?.length || 0));
          onChange("items", [...(question.items || []), { label: nextLabel, text: "" }]);
        }}
        style={addItemButtonStyle}
      >
        + Thêm vị trí
      </button>

      <label style={{ ...labelStyle, marginTop: "12px" }}>Đáp án (VD: 11-E, 12-A, 13-H)</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="11-E, 12-A, 13-H, 14-B, 15-G"
        style={compactInputStyle}
      />
    </div>
  );

  // Flowchart question
  const renderFlowchartQuestion = () => (
    <div>
      <label style={labelStyle}>Tiêu đề Flowchart</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: The process of making chocolate"
        style={compactInputStyle}
      />

      <label style={labelStyle}>Phạm vi câu hỏi</label>
      <input
        type="text"
        value={question.questionRange || ""}
        onChange={(e) => onChange("questionRange", e.target.value)}
        placeholder="VD: 26-30"
        style={compactInputStyle}
      />

      <label style={labelStyle}>Các bước trong Flowchart</label>
      {(question.steps || [{ text: "", hasBlank: false }]).map((step, idx) => (
        <div key={idx} style={{
          display: "flex",
          gap: "8px",
          marginBottom: "8px",
          alignItems: "center",
          padding: "8px",
          backgroundColor: step.hasBlank ? "#fef3c7" : "#f8fafc",
          borderRadius: "6px",
          border: "1px solid #e5e7eb",
        }}>
          <span style={{ fontWeight: 600, color: colors.gray }}>{idx + 1}</span>
          <input
            type="text"
            value={step.text}
            onChange={(e) => {
              const newSteps = [...question.steps];
              newSteps[idx] = { ...newSteps[idx], text: e.target.value };
              onChange("steps", newSteps);
            }}
            placeholder={step.hasBlank ? "Bước có chỗ trống (dùng ___ để đánh dấu)" : "Nội dung bước"}
            style={{ ...compactInputStyle, flex: 1 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={step.hasBlank}
              onChange={(e) => {
                const newSteps = [...question.steps];
                newSteps[idx] = { ...newSteps[idx], hasBlank: e.target.checked };
                onChange("steps", newSteps);
              }}
            />
            Có blank
          </label>
          {question.steps?.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const newSteps = question.steps.filter((_, i) => i !== idx);
                onChange("steps", newSteps);
              }}
              style={{ ...deleteButtonSmallStyle, padding: "2px 6px" }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange("steps", [...(question.steps || []), { text: "", hasBlank: false }])}
        style={addItemButtonStyle}
      >
        + Thêm bước
      </button>

      <label style={{ ...labelStyle, marginTop: "12px" }}>Options (A-G)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {(question.options || ["A.", "B.", "C.", "D.", "E.", "F.", "G."]).map((opt, idx) => (
          <input
            key={idx}
            type="text"
            value={opt}
            onChange={(e) => {
              const newOpts = [...question.options];
              newOpts[idx] = e.target.value;
              onChange("options", newOpts);
            }}
            style={{ ...compactInputStyle, width: "calc(50% - 4px)" }}
          />
        ))}
      </div>

      <label style={{ ...labelStyle, marginTop: "12px" }}>Đáp án (VD: 26-B, 27-E, 28-A)</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="26-B, 27-E, 28-A, 29-G, 30-C"
        style={compactInputStyle}
      />
    </div>
  );

  return (
    <div style={questionCardStyle}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={questionHeaderStyle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px" }}>{isExpanded ? "▼" : "▶"}</span>
          <strong>Câu {questionIndex + 1}</strong>
          <span style={typeBadgeStyle}>{type}</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            style={iconButtonStyle}
            title="Copy câu hỏi"
          >
            📋
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ ...iconButtonStyle, color: colors.dangerRed }}
              title="Xóa câu hỏi"
            >
              🗑️
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
