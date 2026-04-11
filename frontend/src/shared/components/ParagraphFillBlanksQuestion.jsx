import React from "react";
import QuillEditor from "./QuillEditor";

const ParagraphFillBlanksQuestion = ({ question, onChange }) => {
  if (!question) {
    return (
      <div style={{ color: "red", padding: "10px" }}>
        Error: Question object missing
      </div>
    );
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const handleBlanksChange = (blankId, value) => {
    const newBlanks = question.blanks.map((b) =>
      b.id === blankId ? { ...b, correctAnswer: value } : b
    );
    handleChange("blanks", newBlanks);
  };

  const handleAddBlank = () => {
    const blankId = `blank${question.blanks.length + 1}`;
    const newBlanks = [...question.blanks, { id: blankId, correctAnswer: "" }];
    handleChange("blanks", newBlanks);
  };

  const handleRemoveBlank = (index) => {
    const newBlanks = question.blanks.filter((_, i) => i !== index);
    handleChange("blanks", newBlanks);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    handleChange("options", newOptions);
  };

  const handleAddOption = () => {
    const newOptions = [...question.options, ""];
    handleChange("options", newOptions);
  };

  const handleRemoveOption = (index) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    handleChange("options", newOptions);
  };

  const styles = {
    container: {
      padding: "15px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      marginBottom: "15px",
    },
    label: { fontWeight: "bold", marginBottom: "6px", display: "block" },
    input: {
      width: "100%",
      padding: "8px",
      marginBottom: "8px",
      borderRadius: "4px",
      border: "2px solid #0e276f",
      backgroundColor: "#fff",
      fontSize: "14px",
    },
    section: {
      marginBottom: "15px",
      paddingBottom: "15px",
      borderBottom: "1px solid #ddd",
    },
  };

  return (
    <div style={styles.container}>
      {/* Paragraph Text */}
      <div style={styles.section}>
        <label style={styles.label}>Đoạn văn (Paragraph):</label>
        <p style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
          Hướng dẫn: Dùng [blank1], [blank2], [blank3]... để đánh dấu chỗ
          trống
        </p>
        <QuillEditor
          value={question.paragraphText}
          onChange={(value) => handleChange("paragraphText", value)}
          placeholder="Ví dụ: Jeffreys argues that the reason why [blank1] did not find out about..."
        />
      </div>

      {/* Blanks Configuration */}
      <div style={styles.section}>
        <label style={styles.label}>Các chỗ trống:</label>
        {question.blanks &&
          question.blanks.map((blank, index) => (
            <div
              key={index}
              style={{
                marginBottom: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span style={{ minWidth: "80px", fontWeight: "bold" }}>
                {blank.id}
              </span>
              <select
                value={blank.correctAnswer}
                onChange={(e) => handleBlanksChange(blank.id, e.target.value)}
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              >
                <option value="">Chọn đáp án</option>
                {question.options &&
                  question.options.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemoveBlank(index)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#e03",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Xoa
              </button>
            </div>
          ))}
        <button
          type="button"
          onClick={handleAddBlank}
          style={{
            padding: "8px 16px",
            backgroundColor: "#0e276f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "10px",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Thêm chỗ trống
        </button>
      </div>

      {/* Options */}
      <div style={styles.section}>
        <label style={styles.label}>Danh sách lựa chọn (Options):</label>
        {question.options &&
          question.options.map((option, index) => (
            <div
              key={index}
              style={{ marginBottom: "10px", display: "flex", gap: "10px" }}
            >
              <span style={{ minWidth: "30px", fontWeight: "bold" }}>
                {String.fromCharCode(65 + index)}
              </span>
              <input
                type="text"
                placeholder={`Lựa chọn ${String.fromCharCode(65 + index)}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleRemoveOption(index)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#e03",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Xoa
              </button>
            </div>
          ))}
        <button
          type="button"
          onClick={handleAddOption}
          style={{
            padding: "8px 16px",
            backgroundColor: "#0e276f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Thêm lựa chọn
        </button>
      </div>

      {/* Preview */}
      <div style={{ marginTop: "15px" }}>
        <label style={styles.label}>Xem trước:</label>
        <div
          style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: question.paragraphText?.replace(
                /\[blank\d+\]/g,
                '<span style="background-color: #ffff00; padding: 2px 5px;">_____</span>'
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ParagraphFillBlanksQuestion;
