import React from "react";
import GatewayQuestionMetadataFields from "./GatewayQuestionMetadataFields";

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
  startingNumber = 1,
  testType = "",
  sectionTitle = "",
  sectionQuestionCount = 1,
  styles = {},
}) => {
  const isGatewayVocabularyB = String(testType).trim().toLowerCase() === "gateway-reading-writing"
    && String(sectionTitle).trim().toLowerCase() === "vocabulary - b";
  const showGatewayMetadata = isGatewayVocabularyB && questionIndex === 0;
  const showGatewayScoreNote = isGatewayVocabularyB && questionIndex === sectionQuestionCount - 1;

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
      {showGatewayMetadata && (
        <GatewayQuestionMetadataFields question={question} onChange={onChange} />
      )}
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
      {isGatewayVocabularyB && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          backgroundColor: "#f0fdf4",
        }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#166534" }}>
            Xem trước{` câu ${startingNumber}`}:
          </h4>
          {showGatewayMetadata && question.passageTitle && (
            <h3 style={{ margin: "0 0 10px", fontSize: "16px", color: "#1f2937" }}>
              {question.passageTitle}
            </h3>
          )}
          {showGatewayMetadata && question.instruction && (
            <p style={{ margin: "0 0 10px", fontSize: "13px", lineHeight: 1.6, color: "#374151" }}>
              {question.instruction}
            </p>
          )}
          <div style={{ marginBottom: "10px", whiteSpace: "pre-line", lineHeight: 1.7, color: "#1f2937" }}>
            <strong>{startingNumber}.</strong> {question.questionText || "Nội dung mini-dialogue"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
            {optionLabels.map((optionLabel, index) => {
              const optionText = (question.options?.[index] || "").replace(new RegExp(`^${optionLabel}\\.\\s?`), "");
              return (
                <div
                  key={optionLabel}
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${question.correctAnswer === optionLabel ? "#86efac" : "#d1d5db"}`,
                    borderRadius: "6px",
                    backgroundColor: question.correctAnswer === optionLabel ? "#dcfce7" : "#fff",
                    color: "#1f2937",
                    fontSize: "13px",
                  }}
                >
                  <strong>{optionLabel}.</strong> {optionText}
                </div>
              );
            })}
          </div>
          {showGatewayScoreNote && question.scoreNote && (
            <div style={{ marginTop: "12px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
              {question.scoreNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultipleChoiceEditor;
