import React, { useEffect, useMemo } from "react";
import InlineIcon from "../../InlineIcon.jsx";

/**
 * PrepositionGapFillEditor - FCE Part 2: Prepositions & Phrasal Verbs Gap Fill
 *
 * Format mẫu:
 * - Bảng từ / cụm từ cho sẵn (word bank) với số lần xuất hiện
 * - Các câu riêng lẻ có chỗ trống, học sinh điền từ phù hợp
 *
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu
 */
const PrepositionGapFillEditor = ({
  question = {},
  onChange,
  startingNumber = 6,
  partIndex = 1,
}) => {
  const passageTitle = question?.passageTitle || "";
  const instruction = question?.instruction || "Fill in the appropriate prepositions in the blanks.";
  const options = Array.isArray(question?.options) ? question.options : [];
  const items = Array.isArray(question?.items) ? question.items : [];
  const normalizedItems = useMemo(
    () =>
      items.map((item, idx) => ({
        ...item,
        number: startingNumber + idx,
      })),
    [items, startingNumber]
  );

  const setField = (field, value) => onChange(field, value);

  const handleOptionChange = (idx, field, value) => {
    const next = [...options];
    next[idx] = { ...next[idx], [field]: value };
    setField("options", next);
  };

  const addOption = () => {
    setField("options", [...options, { word: "", count: 1 }]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setField("options", options.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setField("items", next);
  };

  const renumberItems = (nextItems) =>
    nextItems.map((item, idx) => ({
      ...item,
      number: startingNumber + idx,
    }));

  useEffect(() => {
    const hasMismatch = items.some((item, idx) => Number(item?.number) !== startingNumber + idx);
    if (!hasMismatch) return;
    setField("items", renumberItems(items));
  }, [items, startingNumber]);

  const addItem = () => {
    const next = [
      ...items,
      { number: startingNumber + items.length, sentence: "", correctAnswer: "" },
    ];
    setField("items", renumberItems(next));
  };

  const removeItem = (idx) => {
    if (items.length <= 3) return;
    setField("items", renumberItems(items.filter((_, i) => i !== idx)));
  };

  const getHighlightedSentence = (sentence, answer) => {
    if (!sentence) return null;
    const parts = sentence.split(/_{2,}|\[BLANK\]/gi);
    if (parts.length < 2) return <span>{sentence}</span>;
    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span
                style={{
                  borderBottom: "2px solid #3b82f6",
                  padding: "0 8px",
                  color: "#1d4ed8",
                  fontWeight: 600,
                }}
              >
                {answer || "___"}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div>
      {/* Part Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
          borderRadius: "8px",
          marginBottom: "16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              backgroundColor: "white",
              color: "#7c3aed",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Part {partIndex + 1}
          </span>
          <span style={{ fontWeight: 600 }}>Prepositions & Phrasal Verbs Gap Fill</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "13px",
              opacity: 0.9,
            }}
          >
            Questions {startingNumber}-{startingNumber + normalizedItems.length - 1}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#f3e8ff",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #d8b4fe",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "#5b21b6" }}>
          <strong>Hướng dẫn:</strong> Tạo bảng từ cho sẵn và các câu có chỗ trống. Học sinh điền từ/cụm từ phù hợp vào chỗ trống.
        </p>
      </div>

      {/* Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Tiêu đề Part (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => setField("passageTitle", e.target.value)}
          placeholder="VD: Part 2 Fill the appropriate prepositions in the blanks."
          style={styles.input}
        />
      </div>

      {/* Instruction */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>Hướng dẫn cho học sinh</label>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setField("instruction", e.target.value)}
          placeholder="VD: Fill in the appropriate prepositions in the blanks."
          style={styles.input}
        />
      </div>

      {/* Word Bank */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#faf5ff",
          borderRadius: "8px",
          border: "1px solid #e9d5ff",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "14px", color: "#6b21a8" }}>Bảng từ cho sẵn (Word Bank)</h3>
          <button
            type="button"
            onClick={addOption}
            style={{
              padding: "4px 10px",
              backgroundColor: "#f3e8ff",
              color: "#7c3aed",
              border: "1px solid #d8b4fe",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            + Thêm từ
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #e9d5ff",
              }}
            >
              <input
                type="text"
                value={opt.word || ""}
                onChange={(e) => handleOptionChange(idx, "word", e.target.value)}
                placeholder="Từ / cụm từ"
                style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: "13px" }}
              />
              <input
                type="number"
                min={1}
                value={opt.count || 1}
                onChange={(e) =>
                  handleOptionChange(idx, "count", parseInt(e.target.value, 10) || 1)
                }
                title="Số lần xuất hiện"
                style={{
                  width: "50px",
                  padding: "6px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "13px",
                  textAlign: "center",
                }}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  style={{
                    padding: "4px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {normalizedItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "16px",
              backgroundColor: "#f5f3ff",
              borderRadius: "8px",
              border: "1px solid #ddd6fe",
              position: "relative",
            }}
          >
            {items.length > 3 && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
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
                  backgroundColor: "#7c3aed",
                  color: "white",
                  borderRadius: "50%",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                {item.number}
              </span>
              <span style={{ fontSize: "13px", color: "#5b21b6", fontWeight: 500 }}>
                Question {item.number}
              </span>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={styles.label}>Câu có chỗ trống (dùng ___ hoặc [BLANK])</label>
              <input
                type="text"
                value={item.sentence || ""}
                onChange={(e) => handleItemChange(idx, "sentence", e.target.value)}
                placeholder="VD: find _______ the truth"
                style={styles.input}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={styles.label}>Đáp án đúng</label>
                <input
                  type="text"
                  value={item.correctAnswer || ""}
                  onChange={(e) => handleItemChange(idx, "correctAnswer", e.target.value)}
                  placeholder="VD: out"
                  style={{
                    ...styles.input,
                    backgroundColor: "#dcfce7",
                    borderColor: "#22c55e",
                  }}
                />
              </div>
              <div>
                <label style={styles.label}>Chọn từ Word Bank</label>
                <select
                  value={item.correctAnswer || ""}
                  onChange={(e) => handleItemChange(idx, "correctAnswer", e.target.value)}
                  style={styles.input}
                >
                  <option value="">-- Chọn --</option>
                  {options.map((opt, optIdx) =>
                    opt.word ? (
                      <option key={optIdx} value={opt.word}>
                        {opt.word}
                      </option>
                    ) : null
                  )}
                </select>
              </div>
            </div>

            {item.sentence && (
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
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7 }}>
                  {getHighlightedSentence(item.sentence, item.correctAnswer)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        style={{
          width: "100%",
          marginTop: "12px",
          padding: "12px",
          backgroundColor: "#f5f3ff",
          color: "#7c3aed",
          border: "2px dashed #c4b5fd",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        + Thêm câu hỏi
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
          {normalizedItems.map((item) => (
            <span
              key={item.number}
              style={{
                display: "inline-block",
                padding: "4px 10px",
                backgroundColor: item.correctAnswer ? "#dcfce7" : "#fee2e2",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {item.number}: {item.correctAnswer || "?"}
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

export default PrepositionGapFillEditor;
