import React from "react";

const THEME = {
  inputBg: "var(--builder-input-bg, #ffffff)",
  border: "var(--builder-border, #d1d5db)",
  text: "var(--builder-text, #111827)",
  subtext: "var(--builder-subtext, #6b7280)",
  surfaceAlt: "var(--builder-surface-alt, rgba(99, 102, 241, 0.08))",
  accent: "var(--builder-accent-text, #6366f1)",
};

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
      border: `1px solid ${THEME.border}`,
      borderRadius: "6px",
      fontSize: "13px",
      marginBottom: "8px",
      boxSizing: "border-box",
      background: THEME.inputBg,
      color: THEME.text,
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      border: `1px solid ${THEME.border}`,
      borderRadius: "6px",
      fontSize: "13px",
      marginBottom: "8px",
      boxSizing: "border-box",
      resize: "vertical",
      lineHeight: 1.5,
      minHeight: "72px",
      fontFamily: "inherit",
      background: THEME.inputBg,
      color: THEME.text,
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontWeight: 600,
      fontSize: "12px",
      color: THEME.subtext,
    },
    optionLabel: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px",
      height: "28px",
      backgroundColor: THEME.surfaceAlt,
      color: THEME.accent,
      borderRadius: "6px",
      fontWeight: 700,
      fontSize: "12px",
    },
    ...styles,
  };

  return (
    <div>
      <label style={defaultStyles.label}>Câu hỏi</label>
      <textarea
        rows={3}
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="Nhập câu hỏi... (có thể Enter xuống dòng)"
        style={defaultStyles.textarea}
      />
      
      <label style={defaultStyles.label}>Các lựa chọn</label>
      {optionLabels.map((opt, idx) => (
        <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <span style={defaultStyles.optionLabel}>{opt}</span>
          <input
            type="text"
            value={(() => {
              const raw = question.options?.[idx] || "";
              return raw.replace(new RegExp(`^${opt}\\.\\s?`), "");
            })()}
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
      <small style={{ color: THEME.subtext }}>
        Đáp án đúng: <strong>{question.correctAnswer || "(Chưa chọn)"}</strong>
      </small>
    </div>
  );
};

export default MultipleChoiceEditor;
