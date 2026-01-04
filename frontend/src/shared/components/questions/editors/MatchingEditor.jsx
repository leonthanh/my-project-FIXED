import React from "react";

/**
 * MatchingEditor - Matching question với 2 cột (Items & Options)
 * Dùng cho: IELTS Listening/Reading Matching, KET, PET
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (default: 1)
 * @param {Object} props.styles - Custom styles (optional)
 */
const MatchingEditor = ({
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
    optionLabel: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px",
      height: "28px",
      backgroundColor: "#6366f115",
      color: "#6366f1",
      borderRadius: "6px",
      fontWeight: 700,
      fontSize: "12px",
    },
    deleteButton: {
      padding: "4px 8px",
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
    },
    addButton: {
      padding: "6px 12px",
      backgroundColor: "#f3f4f6",
      border: "1px dashed #d1d5db",
      borderRadius: "6px",
      color: "#6b7280",
      cursor: "pointer",
      fontSize: "12px",
      width: "100%",
      marginTop: "4px",
    },
    ...styles,
  };

  const leftItems = question.leftItems || [""];
  const startNum = startingNumber;
  
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
        <strong style={{ color: "#1d4ed8" }}>📋 Matching Question</strong>
        <p style={{ margin: "4px 0 0", color: "#1e40af" }}>
          Mỗi item bên trái = 1 câu hỏi. Số câu sẽ tự động đánh từ <strong>{startNum}</strong> đến <strong>{startNum + leftItems.length - 1}</strong>.
        </p>
      </div>
      
      <label style={defaultStyles.label}>Câu hỏi / Mô tả</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: What characteristics have been offered for each facility?"
        style={defaultStyles.input}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
        {/* Left items (global numbered) */}
        <div>
          <label style={defaultStyles.label}>
            Items (Câu {startNum}-{startNum + leftItems.length - 1})
          </label>
          {leftItems.map((item, idx) => {
            const questionNum = startNum + idx;
            return (
              <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <span style={{
                  ...defaultStyles.optionLabel,
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
                  style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
                />
                {leftItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = leftItems.filter((_, i) => i !== idx);
                      onChange("leftItems", newItems);
                    }}
                    style={defaultStyles.deleteButton}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onChange("leftItems", [...leftItems, ""])}
            style={defaultStyles.addButton}
          >
            + Thêm Item (Câu {startNum + leftItems.length})
          </button>
        </div>

        {/* Right items (lettered options) */}
        <div>
          <label style={defaultStyles.label}>Options (A, B, C...)</label>
          {(question.rightItems || ["A.", "B.", "C."]).map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
              <span style={defaultStyles.optionLabel}>{String.fromCharCode(65 + idx)}</span>
              <input
                type="text"
                value={item.replace(/^[A-Z]\.\s*/, "")}
                onChange={(e) => {
                  const newItems = [...(question.rightItems || [])];
                  newItems[idx] = `${String.fromCharCode(65 + idx)}. ${e.target.value}`;
                  onChange("rightItems", newItems);
                }}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
              />
              {(question.rightItems?.length || 3) > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const newItems = (question.rightItems || []).filter((_, i) => i !== idx);
                    onChange("rightItems", newItems);
                  }}
                  style={defaultStyles.deleteButton}
                >
                  ✕
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
            style={defaultStyles.addButton}
          >
            + Thêm Option
          </button>
        </div>
      </div>

      {/* Answers section */}
      <div style={{ marginTop: "16px" }}>
        <label style={defaultStyles.label}>✅ Đáp án</label>
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
                    ...defaultStyles.input, 
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
        <label style={{ ...defaultStyles.label, fontSize: "11px", color: "#6b7280" }}>
          Hoặc nhập đáp án dạng text (VD: 15-B, 16-A, 17-C)
        </label>
        <input
          type="text"
          value={question.correctAnswer || ""}
          onChange={(e) => onChange("correctAnswer", e.target.value)}
          placeholder={`${startNum}-B, ${startNum + 1}-A, ${startNum + 2}-C...`}
          style={{ ...defaultStyles.input, fontSize: "12px" }}
        />
      </div>
    </div>
  );
};

export default MatchingEditor;
