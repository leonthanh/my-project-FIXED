import React from "react";

/**
 * FlowchartEditor - Flowchart completion question
 * Dùng cho: IELTS Listening Flowchart Completion
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {Object} props.styles - Custom styles (optional)
 */
const FlowchartEditor = ({
  question,
  onChange,
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
        <strong style={{ color: "#1d4ed8" }}>📊 Flowchart Completion</strong>
        <p style={{ margin: "4px 0 0", color: "#1e40af" }}>
          Tạo sơ đồ với các bước, đánh dấu bước nào có chỗ trống.
        </p>
      </div>

      <label style={defaultStyles.label}>Tiêu đề Flowchart</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: The process of making chocolate"
        style={defaultStyles.input}
      />

      <label style={defaultStyles.label}>Phạm vi câu hỏi</label>
      <input
        type="text"
        value={question.questionRange || ""}
        onChange={(e) => onChange("questionRange", e.target.value)}
        placeholder="VD: 26-30"
        style={defaultStyles.input}
      />

      <label style={defaultStyles.label}>Các bước trong Flowchart</label>
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
          <span style={{ fontWeight: 600, color: "#6b7280", minWidth: "24px" }}>{idx + 1}</span>
          <input
            type="text"
            value={step.text}
            onChange={(e) => {
              const newSteps = [...(question.steps || [])];
              newSteps[idx] = { ...newSteps[idx], text: e.target.value };
              onChange("steps", newSteps);
            }}
            placeholder={step.hasBlank ? "Bước có chỗ trống (dùng ___ để đánh dấu)" : "Nội dung bước"}
            style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={step.hasBlank}
              onChange={(e) => {
                const newSteps = [...(question.steps || [])];
                newSteps[idx] = { ...newSteps[idx], hasBlank: e.target.checked };
                onChange("steps", newSteps);
              }}
              style={{ width: "16px", height: "16px" }}
            />
            Có blank
          </label>
          {(question.steps?.length || 1) > 1 && (
            <button
              type="button"
              onClick={() => {
                const newSteps = (question.steps || []).filter((_, i) => i !== idx);
                onChange("steps", newSteps);
              }}
              style={{ ...defaultStyles.deleteButton, padding: "2px 6px" }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange("steps", [...(question.steps || []), { text: "", hasBlank: false }])}
        style={defaultStyles.addButton}
      >
        + Thêm bước
      </button>

      <label style={{ ...defaultStyles.label, marginTop: "12px" }}>Options (A-G)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {(question.options || ["A.", "B.", "C.", "D.", "E.", "F.", "G."]).map((opt, idx) => (
          <input
            key={idx}
            type="text"
            value={opt}
            onChange={(e) => {
              const newOpts = [...(question.options || [])];
              newOpts[idx] = e.target.value;
              onChange("options", newOpts);
            }}
            style={{ ...defaultStyles.input, width: "calc(50% - 4px)", marginBottom: "4px" }}
          />
        ))}
      </div>

      <label style={{ ...defaultStyles.label, marginTop: "12px" }}>Đáp án (VD: 26-B, 27-E, 28-A)</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="26-B, 27-E, 28-A, 29-G, 30-C"
        style={defaultStyles.input}
      />
    </div>
  );
};

export default FlowchartEditor;
