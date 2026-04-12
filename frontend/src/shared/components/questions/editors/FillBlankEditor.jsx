import React from "react";

const THEME = {
  inputBg: "var(--builder-input-bg, #ffffff)",
  border: "var(--builder-border, #d1d5db)",
  text: "var(--builder-text, #111827)",
  subtext: "var(--builder-subtext, #6b7280)",
};

/**
 * FillBlankEditor - Fill in the blank question
 * Dùng cho: IELTS, KET, PET, Cambridge tests
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {Object} props.styles - Custom styles (optional)
 */
const FillBlankEditor = ({
  question,
  onChange,
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
    label: {
      display: "block",
      marginBottom: "6px",
      fontWeight: 600,
      fontSize: "12px",
      color: THEME.subtext,
    },
    ...styles,
  };

  return (
    <div>
      <label style={defaultStyles.label}>Câu hỏi / Nội dung</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: The library opens at _____ every morning."
        style={defaultStyles.input}
      />
      <label style={defaultStyles.label}>Đáp án đúng</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => onChange("correctAnswer", e.target.value)}
        placeholder="VD: 8:30 / nine o'clock (dùng | cho nhiều đáp án)"
        style={defaultStyles.input}
      />
      <p style={{ fontSize: "11px", color: THEME.subtext, marginTop: "4px" }}>
        Tip: Dùng <code>|</code> để có nhiều đáp án đúng. VD: <code>8:30 | eight thirty</code>
      </p>
    </div>
  );
};

export default FillBlankEditor;
