import React from "react";

/**
 * MultiSelectEditor - Choose 2+ letters (A-E)
 * Dùng cho: IELTS Listening/Reading Multi-select
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (default: 1)
 * @param {Object} props.styles - Custom styles (optional)
 */
const MultiSelectEditor = ({
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

  const options = question.options || ["A. ", "B. ", "C. ", "D. ", "E. "];
  const requiredAnswers = question.requiredAnswers || 2;
  const correctAnswers = question.correctAnswer ? question.correctAnswer.split(',') : [];

  // Calculate question range
  const startQ = startingNumber;
  const endQ = startQ + requiredAnswers - 1;

  const toggleAnswer = (letter) => {
    let newAnswers = [...correctAnswers];
    if (newAnswers.includes(letter)) {
      newAnswers = newAnswers.filter(a => a !== letter);
    } else {
      newAnswers.push(letter);
      newAnswers.sort();
    }
    onChange("correctAnswer", newAnswers.join(','));
  };

  return (
    <div>
      {/* Question Range Badge */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#e0f2fe",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #7dd3fc",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, color: "#0369a1" }}>
          ✅ Questions {startQ} and {endQ}
        </span>
        <span style={{
          padding: "4px 10px",
          backgroundColor: "#0ea5e9",
          color: "white",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "bold",
        }}>
          Q{startQ}-{endQ}
        </span>
      </div>

      <div style={{
        padding: "10px 12px",
        backgroundColor: "#fef3c7",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #fcd34d",
        fontSize: "13px",
      }}>
        <strong>Choose {requiredAnswers === 2 ? 'TWO' : requiredAnswers === 3 ? 'THREE' : requiredAnswers} letters:</strong> Học sinh chọn <strong>{requiredAnswers}</strong> đáp án đúng = <strong>{requiredAnswers} câu hỏi</strong>
      </div>

      <label style={defaultStyles.label}>Câu hỏi</label>
      <textarea
        value={question.questionText || ""}
        onChange={(e) => onChange("questionText", e.target.value)}
        placeholder="VD: What are the speakers' opinions about the literature lectures?"
        style={{ ...defaultStyles.input, minHeight: "60px", resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: "12px", marginTop: "12px", marginBottom: "12px" }}>
        <div>
          <label style={defaultStyles.label}>Số đáp án cần chọn</label>
          <select
            value={requiredAnswers}
            onChange={(e) => onChange("requiredAnswers", parseInt(e.target.value))}
            style={{ ...defaultStyles.input, width: "150px" }}
          >
            <option value={2}>2 đáp án (TWO)</option>
            <option value={3}>3 đáp án (THREE)</option>
          </select>
        </div>
      </div>

      <label style={defaultStyles.label}>Các lựa chọn A-E (Click ✓ để đánh dấu đáp án đúng)</label>
      {options.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isCorrect = correctAnswers.includes(letter);
        
        return (
          <div key={idx} style={{
            display: "flex",
            gap: "8px",
            marginBottom: "8px",
            alignItems: "center",
            padding: "8px",
            backgroundColor: isCorrect ? "#dcfce7" : "#f8fafc",
            borderRadius: "8px",
            border: isCorrect ? "2px solid #22c55e" : "1px solid #e5e7eb",
          }}>
            <button
              type="button"
              onClick={() => toggleAnswer(letter)}
              style={{
                ...defaultStyles.optionLabel,
                backgroundColor: isCorrect ? "#22c55e" : "#6366f115",
                color: isCorrect ? "white" : "#6366f1",
                cursor: "pointer",
                border: "none",
              }}
              title={isCorrect ? "Bỏ chọn đáp án" : "Chọn là đáp án đúng"}
            >
              {isCorrect ? "✓" : letter}
            </button>
            <input
              type="text"
              value={opt.replace(/^[A-Z]\.\s*/, "")}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[idx] = `${letter}. ${e.target.value}`;
                onChange("options", newOptions);
              }}
              placeholder={`Lựa chọn ${letter}`}
              style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
            />
            {options.length > 3 && (
              <button
                type="button"
                onClick={() => {
                  const newOptions = options.filter((_, i) => i !== idx);
                  onChange("options", newOptions);
                  // Remove from correct answers if selected
                  if (isCorrect) {
                    onChange("correctAnswer", correctAnswers.filter(a => a !== letter).join(','));
                  }
                }}
                style={defaultStyles.deleteButton}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {options.length < 7 && (
        <button
          type="button"
          onClick={() => {
            const newLetter = String.fromCharCode(65 + options.length);
            onChange("options", [...options, `${newLetter}. `]);
          }}
          style={defaultStyles.addButton}
        >
          + Thêm lựa chọn
        </button>
      )}

      {/* Answer Preview */}
      <div style={{
        marginTop: "12px",
        padding: "10px",
        backgroundColor: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #86efac",
      }}>
        <strong style={{ color: "#15803d" }}>✅ Đáp án đúng: </strong>
        {correctAnswers.length > 0 ? (
          <span style={{ color: "#15803d", fontWeight: 600 }}>
            {correctAnswers.join(', ')}
          </span>
        ) : (
          <span style={{ color: "#9ca3af" }}>(Chưa chọn)</span>
        )}
        {correctAnswers.length !== requiredAnswers && correctAnswers.length > 0 && (
          <span style={{ color: "#dc2626", marginLeft: "10px", fontSize: "12px" }}>
            ⚠️ Cần chọn đúng {requiredAnswers} đáp án
          </span>
        )}
      </div>
    </div>
  );
};

export default MultiSelectEditor;
