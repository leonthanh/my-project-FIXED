import React from "react";
import InlineIcon from "../../InlineIcon.jsx";

const THEME = {
  inputBg: "var(--builder-input-bg, #ffffff)",
  border: "var(--builder-border, #d1d5db)",
  text: "var(--builder-text, #111827)",
  subtext: "var(--builder-subtext, #6b7280)",
  surfaceAlt: "var(--builder-surface-alt, rgba(99, 102, 241, 0.08))",
  accent: "var(--builder-accent-text, #6366f1)",
};

const defaultStyles = {
  input: {
    width: "100%",
    padding: "10px 12px",
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
    padding: "10px 12px",
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
};

const normalizeStatements = (statements) => {
  if (Array.isArray(statements) && statements.length > 0) {
    return statements.map((s, idx) => ({
      id: s?.id || `stmt-${idx}`,
      text: s?.text || "",
      correctAnswer: s?.correctAnswer || "",
    }));
  }
  return Array.from({ length: 5 }, (_, idx) => ({
    id: `stmt-${idx}`,
    text: "",
    correctAnswer: "",
  }));
};

/**
 * TrueFalseNotGivenEditor - Editor cho dạng True/False/Not Given
 * Dùng cho: IELTS Reading, FCE Listening
 */
const TrueFalseNotGivenEditor = ({
  question = {},
  onChange,
  startingNumber = 1,
  partIndex = 0,
}) => {
  const statements = normalizeStatements(question?.statements);
  const passageTitle = question?.passageTitle || "";
  const passage = question?.passage || "";

  const handleStatementChange = (index, field, value) => {
    const next = statements.map((s, idx) =>
      idx === index ? { ...s, [field]: value } : s
    );
    onChange("statements", next);
  };

  const addStatement = () => {
    onChange("statements", [
      ...statements,
      { id: `stmt-${statements.length}`, text: "", correctAnswer: "" },
    ]);
  };

  const removeStatement = (index) => {
    if (statements.length <= 1) return;
    onChange(
      "statements",
      statements.filter((_, idx) => idx !== index)
    );
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
          borderRadius: "8px",
          marginBottom: "16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <InlineIcon name="correct" size={20} style={{ color: "white" }} />
          <span style={{ fontWeight: 600 }}>True / False / Not Given</span>
          <span style={{ marginLeft: "auto", fontSize: "13px", opacity: 0.9 }}>
            Questions {startingNumber}-{startingNumber + statements.length - 1}
          </span>
        </div>
      </div>

      {/* Passage Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={defaultStyles.label}>Tiêu đề đoạn văn / tình huống (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange("passageTitle", e.target.value)}
          placeholder="VD: Listen to the conversation and decide..."
          style={defaultStyles.input}
        />
      </div>

      {/* Passage / Prompt */}
      <div style={{ marginBottom: "16px" }}>
        <label style={defaultStyles.label}>Nội dung đoạn văn / transcript (tùy chọn)</label>
        <textarea
          value={passage}
          onChange={(e) => onChange("passage", e.target.value)}
          placeholder="Dán nội dung đoạn văn hoặc transcript ở đây..."
          style={defaultStyles.textarea}
          rows={5}
        />
      </div>

      {/* Statements */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            {statements.length} statements
          </h3>
          <button
            type="button"
            onClick={addStatement}
            style={{
              padding: "6px 12px",
              backgroundColor: "#0ea5e9",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            + Thêm câu
          </button>
        </div>

        {statements.map((stmt, idx) => (
          <div
            key={stmt.id}
            style={{
              padding: "14px",
              backgroundColor: "white",
              borderRadius: "8px",
              marginBottom: "10px",
              border: "1px solid #e5e7eb",
              position: "relative",
            }}
          >
            {statements.length > 1 && (
              <button
                type="button"
                onClick={() => removeStatement(idx)}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  padding: "4px 8px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
              </button>
            )}

            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "32px",
                  height: "32px",
                  backgroundColor: "#0ea5e9",
                  color: "white",
                  borderRadius: "50%",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                {startingNumber + idx}
              </span>
              <input
                type="text"
                value={stmt.text}
                onChange={(e) => handleStatementChange(idx, "text", e.target.value)}
                placeholder={`Statement ${startingNumber + idx}...`}
                style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
              />
            </div>

            <div style={{ marginLeft: "42px" }}>
              <label style={{ ...defaultStyles.label, marginBottom: "6px" }}>Đáp án đúng</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {["TRUE", "FALSE", "NOT GIVEN"].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: `1px solid ${stmt.correctAnswer === option ? "#0ea5e9" : "#d1d5db"}`,
                      backgroundColor: stmt.correctAnswer === option ? "#e0f2fe" : "white",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: stmt.correctAnswer === option ? 700 : 500,
                    }}
                  >
                    <input
                      type="radio"
                      name={`tfng-correct-${stmt.id}`}
                      value={option}
                      checked={stmt.correctAnswer === option}
                      onChange={() => handleStatementChange(idx, "correctAnswer", option)}
                      style={{ accentColor: "#0ea5e9" }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Answer Summary */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 16px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
        }}
      >
        <span style={{ fontWeight: 600, color: "#166534", marginRight: "12px" }}>
          Đáp án:
        </span>
        {statements.map((stmt, idx) => (
          <span
            key={stmt.id}
            style={{
              display: "inline-block",
              padding: "4px 10px",
              backgroundColor: stmt.correctAnswer ? "#dcfce7" : "#fee2e2",
              borderRadius: "4px",
              marginRight: "8px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {startingNumber + idx}: {stmt.correctAnswer || "?"}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TrueFalseNotGivenEditor;
