import React from "react";

/**
 * MultipleChoiceEditor - Multiple choice (A/B/C hoặc A/B/C/D)
 * Dùng cho: IELTS, KET, PET, Cambridge tests
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.questionIndex - Index của câu hỏi trong section
 * @param {Array} props.optionLabels - Labels cho options (default: ['A', 'B', 'C'])
 * @param {Object} props.styles - Custom styles (optional)
 */
const MultipleChoiceEditor = ({
  question,
  onChange,
  questionIndex = 0,
  optionLabels = ['A', 'B', 'C'],
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
    ...styles,
  };

  return (
    <div>
      <label style={defaultStyles.label}>Câu hỏi</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="Nhập câu hỏi..."
        style={defaultStyles.input}
      />
      
      <label style={defaultStyles.label}>Các lựa chọn</label>
      {optionLabels.map((opt, idx) => (
        <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <span style={defaultStyles.optionLabel}>{opt}</span>
          <input
            type="text"
            value={question.options?.[idx]?.replace(`${opt}.`, "").trim() || ""}
            onChange={(e) => {
              const newOptions = [...(question.options || optionLabels.map(o => `${o}.`))];
              newOptions[idx] = `${opt}. ${e.target.value}`;
              onChange("options", newOptions);
            }}
            placeholder={`Nội dung lựa chọn ${opt}`}
            style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
          />
          <input
            type="radio"
            name={`correct_${questionIndex}`}
            checked={question.correctAnswer === opt}
            onChange={() => onChange("correctAnswer", opt)}
            title="Đánh dấu là đáp án đúng"
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
        </div>
      ))}
      <small style={{ color: "#6b7280" }}>
        Đáp án đúng: <strong>{question.correctAnswer || "(Chưa chọn)"}</strong>
      </small>
    </div>
  );
};

export default MultipleChoiceEditor;
