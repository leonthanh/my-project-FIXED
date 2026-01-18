import React from "react";

const GapMatchEditor = ({ question = {}, onChange, startingNumber = 21, partIndex = 4 }) => {
  const leftTitle = question.leftTitle || "People";
  const rightTitle = question.rightTitle || "Food";
  const leftItems = Array.isArray(question.leftItems) && question.leftItems.length
    ? question.leftItems
    : ["Barbara", "Simon", "Anita", "Peter", "Michael"];
  const options = Array.isArray(question.options) && question.options.length
    ? question.options
    : ["bread", "cheese", "chicken", "fish", "fruit", "ice cream", "salad"];
  const correctAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers : [];

  const updateLeftItem = (idx, value) => {
    const next = [...leftItems];
    next[idx] = value;
    onChange("leftItems", next);
  };

  const updateOption = (idx, value) => {
    const next = [...options];
    next[idx] = value;
    onChange("options", next);
  };

  const addLeftItem = () => {
    onChange("leftItems", [...leftItems, ""]);
  };

  const removeLeftItem = (idx) => {
    if (leftItems.length <= 1) return;
    const next = leftItems.filter((_, i) => i !== idx);
    onChange("leftItems", next);
  };

  const addOption = () => {
    onChange("options", [...options, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    onChange("options", next);
  };

  const updateCorrect = (idx, value) => {
    const next = [...correctAnswers];
    next[idx] = value;
    onChange("correctAnswers", next);
  };

  return (
    <div>
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#1d4ed8",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Gap Match (Drag & Drop)</span>
          <span style={{ marginLeft: "auto", fontSize: "13px", opacity: 0.9 }}>
            Questions {startingNumber}–{startingNumber + leftItems.length - 1}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={styles.label}>Tiêu đề cột trái</label>
          <input
            value={leftTitle}
            onChange={(e) => onChange("leftTitle", e.target.value)}
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>Tiêu đề cột phải</label>
          <input
            value={rightTitle}
            onChange={(e) => onChange("rightTitle", e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <h4 style={styles.sectionTitle}>Danh sách bên trái</h4>
          {leftItems.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                value={item}
                onChange={(e) => updateLeftItem(idx, e.target.value)}
                style={styles.input}
                placeholder={`Item ${idx + 1}`}
              />
              <button type="button" onClick={() => removeLeftItem(idx)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addLeftItem} style={styles.addBtn}>+ Thêm item</button>
        </div>

        <div>
          <h4 style={styles.sectionTitle}>Lựa chọn (kéo thả)</h4>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                style={styles.input}
                placeholder={`Option ${idx + 1}`}
              />
              <button type="button" onClick={() => removeOption(idx)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addOption} style={styles.addBtn}>+ Thêm lựa chọn</button>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <h4 style={styles.sectionTitle}>Đáp án đúng</h4>
        {leftItems.map((item, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: 14, color: "#334155" }}>
              {startingNumber + idx}. {item || `Item ${idx + 1}`}
            </div>
            <select
              value={correctAnswers[idx] || ""}
              onChange={(e) => updateCorrect(idx, e.target.value)}
              style={{ ...styles.input, padding: "8px 10px" }}
            >
              <option value="">—</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
  },
  sectionTitle: {
    margin: "0 0 10px 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
  },
  addBtn: {
    padding: "8px 12px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  removeBtn: {
    padding: "8px 10px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
};

export default GapMatchEditor;
