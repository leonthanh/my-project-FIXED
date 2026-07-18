import React from "react";

const createEmptyItem = () => ({ sentence: "", correctAnswer: "", explanation: "" });

/**
 * SentenceCorrectionEditor - FCE sentence error correction editor.
 * Teachers enter incorrect sentences and the expected corrected sentence.
 */
const SentenceCorrectionEditor = ({
  question = {},
  onChange,
  startingNumber = 1,
}) => {
  const instruction = question.instruction || "Correct the sentences.";
  const items = Array.isArray(question.items) && question.items.length > 0
    ? question.items
    : Array.from({ length: 10 }, createEmptyItem);

  const updateItem = (index, field, value) => {
    const nextItems = items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    ));
    onChange("items", nextItems);
  };

  const addItem = () => {
    onChange("items", [...items, createEmptyItem()]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange("items", items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Sửa lỗi câu</div>
          <div style={styles.headerMeta}>Questions {startingNumber}-{startingNumber + items.length - 1}</div>
        </div>
        <span style={styles.countBadge}>{items.length} câu</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Hướng dẫn</label>
        <input
          type="text"
          value={instruction}
          onChange={(e) => onChange("instruction", e.target.value)}
          placeholder="Correct the sentences."
          style={styles.input}
        />
      </div>

      <div style={styles.itemsList}>
        {items.map((item, index) => {
          const questionNumber = startingNumber + index;
          return (
            <div key={index} style={styles.itemCard}>
              <div style={styles.itemHeader}>
                <span style={styles.questionNumber}>{questionNumber}</span>
                <strong style={{ color: "#1f2937" }}>Câu {index + 1}</strong>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  style={{
                    ...styles.removeButton,
                    opacity: items.length <= 1 ? 0.45 : 1,
                    cursor: items.length <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Xóa
                </button>
              </div>

              <label style={styles.label}>Câu sai</label>
              <textarea
                value={item.sentence || ""}
                onChange={(e) => updateItem(index, "sentence", e.target.value)}
                placeholder="VD: She doesn't used to eat meat, but she does now."
                rows={2}
                style={styles.textarea}
              />

              <label style={styles.label}>Đáp án đúng</label>
              <textarea
                value={item.correctAnswer || ""}
                onChange={(e) => updateItem(index, "correctAnswer", e.target.value)}
                placeholder="VD: She didn't use to eat meat, but she does now."
                rows={2}
                style={{ ...styles.textarea, backgroundColor: "#f0fdf4", borderColor: "#86efac" }}
              />
              <p style={styles.helpText}>
                Có thể nhập nhiều đáp án đúng bằng dấu <strong>|</strong>. VD: didn&apos;t use to | did not use to
              </p>

              <label style={styles.label}>Giải thích (tùy chọn)</label>
              <input
                type="text"
                value={item.explanation || ""}
                onChange={(e) => updateItem(index, "explanation", e.target.value)}
                placeholder="VD: Sau auxiliary 'did', động từ chính dùng dạng nguyên mẫu."
                style={styles.input}
              />
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>
        + Thêm câu sửa lỗi
      </button>
    </div>
  );
};

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    color: "white",
    borderRadius: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
  },
  headerMeta: {
    marginTop: 3,
    fontSize: 12,
    opacity: 0.9,
  },
  countBadge: {
    padding: "5px 10px",
    backgroundColor: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  itemCard: {
    padding: 16,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  questionNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: "#0f766e",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 12,
    color: "#475569",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    lineHeight: 1.6,
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: 10,
  },
  helpText: {
    margin: "-4px 0 10px",
    color: "#64748b",
    fontSize: 11,
  },
  removeButton: {
    marginLeft: "auto",
    padding: "6px 10px",
    border: "1px solid #fecaca",
    borderRadius: 6,
    backgroundColor: "#fff1f2",
    color: "#be123c",
    fontWeight: 700,
    fontSize: 12,
  },
  addButton: {
    width: "100%",
    marginTop: 16,
    padding: "12px 16px",
    border: 0,
    borderRadius: 8,
    backgroundColor: "#10b981",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default SentenceCorrectionEditor;
