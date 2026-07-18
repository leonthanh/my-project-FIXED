import React from "react";
import ReactQuill from "react-quill";

const createEmptyItem = () => ({ questionText: "", correctAnswer: "", explanation: "" });

const normalizeItems = (items) => (
  Array.isArray(items) && items.length > 0
    ? items
    : Array.from({ length: 10 }, createEmptyItem)
);

const ReadingOpenQuestionsEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const passageTitle = question.passageTitle || "Part 6 Read the message.";
  const passage = question.passage || question.passageText || "";
  const instruction = question.instruction || "Answer the questions.";
  const items = normalizeItems(question.items);

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

  const handlePassageChange = (value) => {
    onChange("passage", value);
    onChange("passageText", value);
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Đọc hiểu + trả lời câu hỏi</div>
          <div style={styles.headerMeta}>Questions {startingNumber}-{startingNumber + items.length - 1}</div>
        </div>
        <span style={styles.countBadge}>{items.length} câu</span>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Tiêu đề / yêu cầu đoạn đọc</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(event) => onChange("passageTitle", event.target.value)}
          placeholder="Part 6 Read the message."
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup} className="reading-open-questions-editor">
        <label style={styles.label}>Nội dung message / đoạn đọc</label>
        <ReactQuill
          theme="snow"
          value={passage}
          onChange={handlePassageChange}
          placeholder="Dán nội dung message ở đây..."
          modules={quillModules}
          formats={quillFormats}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Hướng dẫn câu hỏi</label>
        <input
          type="text"
          value={instruction}
          onChange={(event) => onChange("instruction", event.target.value)}
          placeholder="Answer the questions. (10 points)"
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

              <label style={styles.label}>Câu hỏi</label>
              <textarea
                value={item.questionText || ""}
                onChange={(event) => updateItem(index, "questionText", event.target.value)}
                placeholder="VD: Why does Hannah apologise at the start of her message?"
                rows={2}
                style={styles.textarea}
              />

              <label style={styles.label}>Đáp án mẫu / đáp án đúng</label>
              <textarea
                value={item.correctAnswer || ""}
                onChange={(event) => updateItem(index, "correctAnswer", event.target.value)}
                placeholder="VD: She apologises because she has not been in touch for a long time."
                rows={2}
                style={{ ...styles.textarea, backgroundColor: "#f0fdf4", borderColor: "#86efac" }}
              />
              <p style={styles.helpText}>
                Có thể nhập nhiều đáp án được chấp nhận bằng dấu <strong>|</strong> hoặc <strong>/</strong>.
              </p>

              <label style={styles.label}>Ghi chú chấm bài (tùy chọn)</label>
              <input
                type="text"
                value={item.explanation || ""}
                onChange={(event) => updateItem(index, "explanation", event.target.value)}
                placeholder="VD: Chấp nhận câu trả lời cùng ý."
                style={styles.input}
              />
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>
        + Thêm câu hỏi đọc hiểu
      </button>

      <style>{`
        .reading-open-questions-editor .ql-container {
          min-height: 220px;
          font-size: 14px;
          background: #fff;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .reading-open-questions-editor .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f8fafc;
        }
        .reading-open-questions-editor .ql-editor {
          min-height: 220px;
          line-height: 1.7;
        }
      `}</style>
    </div>
  );
};

const quillModules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = ["bold", "italic", "underline", "list", "bullet", "link"];

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
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
  fieldGroup: {
    marginBottom: 16,
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
    backgroundColor: "#2563eb",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
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
    backgroundColor: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default ReadingOpenQuestionsEditor;