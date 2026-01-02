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
      case "abc":
        return renderMultipleChoice(["A", "B", "C"]);
      case "abcd":
        return renderMultipleChoice(["A", "B", "C", "D"]);
      case "matching":
        return renderMatchingQuestion();
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
