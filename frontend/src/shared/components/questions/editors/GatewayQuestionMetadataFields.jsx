import React from "react";

const fieldStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "12px",
  color: "#6b7280",
};

const GatewayQuestionMetadataFields = ({ question = {}, onChange }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ marginBottom: "12px" }}>
      <label style={labelStyle}>Tiêu đề mục</label>
      <input
        type="text"
        value={question.passageTitle || ""}
        onChange={(event) => onChange("passageTitle", event.target.value)}
        placeholder="VD: B. Complete the text with the correct form..."
        style={fieldStyle}
      />
    </div>

    <div style={{ marginBottom: "12px" }}>
      <label style={labelStyle}>Hướng dẫn ngắn</label>
      <input
        type="text"
        value={question.instruction || ""}
        onChange={(event) => onChange("instruction", event.target.value)}
        placeholder="VD: Complete each sentence."
        style={fieldStyle}
      />
    </div>

    <div>
      <label style={labelStyle}>Ghi chú điểm (footer)</label>
      <input
        type="text"
        value={question.scoreNote || ""}
        onChange={(event) => onChange("scoreNote", event.target.value)}
        placeholder="VD: ____/5 (1 mark per answer)"
        style={fieldStyle}
      />
    </div>
  </div>
);

export default GatewayQuestionMetadataFields;
