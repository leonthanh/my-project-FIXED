import React from "react";
import InlineIcon from "../../InlineIcon.jsx";

/**
 * OddOneOutEditor - FCE Part 3: Circle the word that is not in the same group
 *
 * Format mẫu:
 * - Nhiều dãy từ, mỗi dãy 4 từ
 * - Học sinh chọn từ không cùng nhóm
 *
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu
 */
const OddOneOutEditor = ({
  question = {},
  onChange,
  startingNumber = 18,
  partIndex = 2,
}) => {
  const instruction = question?.instruction || "Circle the word that is not in the same group.";
  const groups = Array.isArray(question?.groups) ? question.groups : [];

  const setField = (field, value) => onChange(field, value);

  const handleGroupChange = (idx, field, value) => {
    const next = [...groups];
    next[idx] = { ...next[idx], [field]: value };
    setField("groups", next);
  };

  const handleWordChange = (groupIdx, wordIdx, value) => {
    const next = [...groups];
    const words = [...(next[groupIdx].words || [])];
    words[wordIdx] = value;
    next[groupIdx] = { ...next[groupIdx], words };
    setField("groups", next);
  };

  const addGroup = () => {
    setField("groups", [
      ...groups,
      { words: ["", "", "", ""], correctAnswer: "", explanation: "" },
    ]);
  };

  const removeGroup = (idx) => {
    if (groups.length <= 2) return;
    setField("groups", groups.filter((_, i) => i !== idx));
  };

  const ensureFourWords = (group) => {
    const words = Array.isArray(group.words) ? [...group.words] : [];
    while (words.length < 4) words.push("");
    return words.slice(0, 4);
  };

  return (
    <div>
      {/* Part Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
          borderRadius: "8px",
          marginBottom: "16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              backgroundColor: "white",
              color: "#059669",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Part {partIndex + 1}
          </span>
          <span style={{ fontWeight: 600 }}>Odd One Out</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "13px",
              opacity: 0.9,
            }}
          >
            Questions {startingNumber}-{startingNumber + groups.length - 1}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#ecfdf5",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #a7f3d0",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "#065f46" }}>
          <strong>Hướng dẫn:</strong> Mỗi dãy gồm 4 từ, chọn 1 từ không cùng nhóm. Có thể thêm giải thích (explanation) cho đáp án.
        </p>
      </div>

      {/* Instruction */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>Hướng dẫn cho học sinh</label>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setField("instruction", e.target.value)}
          placeholder="VD: Circle the word that is not in the same group."
          style={styles.input}
        />
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {groups.map((group, idx) => {
          const words = ensureFourWords(group);
          const groupNumber = startingNumber + idx;
          return (
            <div
              key={idx}
              style={{
                padding: "16px",
                backgroundColor: "#ecfdf5",
                borderRadius: "8px",
                border: "1px solid #a7f3d0",
                position: "relative",
              }}
            >
              {groups.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeGroup(idx)}
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
                  }}
                >
                  <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    backgroundColor: "#059669",
                    color: "white",
                    borderRadius: "50%",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  {groupNumber}
                </span>
                <span style={{ fontSize: "13px", color: "#065f46", fontWeight: 500 }}>
                  Question {groupNumber}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
                {words.map((word, wordIdx) => (
                  <div key={wordIdx}>
                    <label style={{ ...styles.label, fontSize: "12px" }}>
                      Từ {String.fromCharCode(65 + wordIdx)}
                    </label>
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => handleWordChange(idx, wordIdx, e.target.value)}
                      placeholder={`Từ ${String.fromCharCode(65 + wordIdx)}`}
                      style={{ ...styles.input, marginBottom: 0 }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>Đáp án đúng</label>
                  <select
                    value={group.correctAnswer || ""}
                    onChange={(e) => handleGroupChange(idx, "correctAnswer", e.target.value)}
                    style={styles.input}
                  >
                    <option value="">-- Chọn từ khác loại --</option>
                    {words.map((word, wordIdx) =>
                      word ? (
                        <option key={wordIdx} value={word}>
                          {String.fromCharCode(65 + wordIdx)}. {word}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Giải thích (tùy chọn)</label>
                  <input
                    type="text"
                    value={group.explanation || ""}
                    onChange={(e) => handleGroupChange(idx, "explanation", e.target.value)}
                    placeholder="VD: busy does not describe an experience"
                    style={styles.input}
                  />
                </div>
              </div>

              {words.every(Boolean) && group.correctAnswer && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "white",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", display: "block" }}>
                    Preview:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {words.map((word, wordIdx) => {
                      const isCorrect = word === group.correctAnswer;
                      return (
                        <span
                          key={wordIdx}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            border: `2px solid ${isCorrect ? "#22c55e" : "#d1d5db"}`,
                            backgroundColor: isCorrect ? "#dcfce7" : "white",
                            color: isCorrect ? "#166534" : "#374151",
                            fontWeight: isCorrect ? 700 : 500,
                            fontSize: "14px",
                          }}
                        >
                          {String.fromCharCode(65 + wordIdx)}. {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addGroup}
        style={{
          width: "100%",
          marginTop: "14px",
          padding: "12px",
          backgroundColor: "#ecfdf5",
          color: "#059669",
          border: "2px dashed #6ee7b7",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        + Thêm nhóm từ
      </button>

      {/* Answer Summary */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
        }}
      >
        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
          Tổng hợp đáp án:
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {groups.map((group, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-block",
                padding: "4px 10px",
                backgroundColor: group.correctAnswer ? "#dcfce7" : "#fee2e2",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {startingNumber + idx}: {group.correctAnswer || "?"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
};

export default OddOneOutEditor;
