import React, { useMemo, useRef, useState } from "react";
import { GapMatchSectionDisplay } from "../../../../domains/cambridge/shared/components/CambridgeSectionDisplays";

const EMPTY_FLAGGED_QUESTIONS = new Set();

const getOptionLabel = (index) => {
  let nextIndex = Number(index) || 0;
  let label = "";

  do {
    label = String.fromCharCode(65 + (nextIndex % 26)) + label;
    nextIndex = Math.floor(nextIndex / 26) - 1;
  } while (nextIndex >= 0);

  return label;
};

const getOptionDisplayText = (option, index) => {
  const label = getOptionLabel(index);
  const value = String(option || "").trim();
  return `${label}. ${value || `Option ${index + 1}`}`;
};

const previewRuntimeStyles = {
  correctAnswer: {
    marginTop: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    border: "1px solid #86efac",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },
};

const GapMatchEditor = ({ question = {}, onChange, startingNumber = 21, partIndex = 4 }) => {
  const leftTitle = question.leftTitle || "People";
  const rightTitle = question.rightTitle || "Food";
  const studentTitle = question.studentTitle || "";
  const exampleText = question.exampleText || "";
  const exampleAnswer = question.exampleAnswer || "";
  const leftItems = Array.isArray(question.leftItems) && question.leftItems.length
    ? question.leftItems
    : ["Barbara", "Simon", "Anita", "Peter", "Michael"];
  const options = Array.isArray(question.options) && question.options.length
    ? question.options
    : ["bread", "cheese", "chicken", "fish", "fruit", "ice cream", "salad"];
  const correctAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
  const [previewAnswers, setPreviewAnswers] = useState({});
  const previewQuestionRefs = useRef({});

  const previewSection = useMemo(() => ({
    questionType: "gap-match",
    questions: [
      {
        ...question,
        leftTitle,
        rightTitle,
        studentTitle,
        exampleText,
        exampleAnswer,
        leftItems,
        options,
        correctAnswers,
      },
    ],
  }), [question, leftTitle, rightTitle, studentTitle, exampleText, exampleAnswer, leftItems, options, correctAnswers]);

  const syncPreviewAnswers = (fromValue, toValue) => {
    if (!fromValue || fromValue === toValue) return;

    setPreviewAnswers((prev) => {
      const nextEntries = Object.entries(prev).map(([key, currentValue]) => [
        key,
        currentValue === fromValue ? toValue : currentValue,
      ]);
      return Object.fromEntries(nextEntries);
    });
  };

  const updateLeftItem = (idx, value) => {
    const next = [...leftItems];
    next[idx] = value;
    onChange("leftItems", next);
  };

  const updateOption = (idx, value) => {
    const next = [...options];
    const previousValue = next[idx];
    next[idx] = value;
    onChange("options", next);

    if (exampleAnswer === previousValue) {
      onChange("exampleAnswer", value);
    }

    if (previousValue && previousValue !== value && correctAnswers.some((answer) => answer === previousValue)) {
      onChange(
        "correctAnswers",
        correctAnswers.map((answer) => (answer === previousValue ? value : answer))
      );
    }

    syncPreviewAnswers(previousValue, value);
  };

  const addLeftItem = () => {
    setPreviewAnswers({});
    onChange("leftItems", [...leftItems, ""]);
  };

  const removeLeftItem = (idx) => {
    if (leftItems.length <= 1) return;
    setPreviewAnswers({});
    onChange("leftItems", leftItems.filter((_, i) => i !== idx));
    onChange("correctAnswers", correctAnswers.filter((_, i) => i !== idx));
  };

  const addOption = () => {
    setPreviewAnswers({});
    onChange("options", [...options, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;

    setPreviewAnswers({});
    const removedValue = options[idx];
    onChange("options", options.filter((_, i) => i !== idx));

    if (exampleAnswer === removedValue) {
      onChange("exampleAnswer", "");
    }

    if (correctAnswers.some((answer) => answer === removedValue)) {
      onChange(
        "correctAnswers",
        correctAnswers.map((answer) => (answer === removedValue ? "" : answer))
      );
    }
  };

  const updateCorrect = (idx, value) => {
    const next = [...correctAnswers];
    next[idx] = value;
    onChange("correctAnswers", next);
  };

  return (
    <div>
      <div style={styles.heroCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={styles.partChip}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Gap Match (Drag & Drop)</span>
          <span style={styles.questionRange}>Questions {startingNumber}-{startingNumber + leftItems.length - 1}</span>
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

      <div style={styles.exampleCard}>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Title hiển thị cho học sinh</label>
          <input
            value={studentTitle}
            onChange={(e) => onChange("studentTitle", e.target.value)}
            style={styles.input}
            placeholder="VD: What sport does each friend do now?"
          />
          <div style={styles.exampleHelp}>
            Title này sẽ hiển thị riêng ở UI học sinh, chữ to và canh giữa. Không ảnh hưởng đến nội dung ReactQuill của hướng dẫn Part.
          </div>
        </div>

        <div style={styles.exampleTitle}>Câu ví dụ cho UI học sinh</div>
        <div style={styles.exampleHelp}>
          Nhập ví dụ riêng tại đây để giao diện làm bài hiển thị gọn trong khối kéo thả. Không cần đặt ví dụ trong phần hướng dẫn của Part nữa.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(180px, 1fr)", gap: "12px", alignItems: "end" }}>
          <div>
            <label style={styles.label}>Nội dung ví dụ</label>
            <input
              value={exampleText}
              onChange={(e) => onChange("exampleText", e.target.value)}
              style={styles.input}
              placeholder="VD: 0 Adam"
            />
          </div>
          <div>
            <label style={styles.label}>Đáp án ví dụ</label>
            <select
              value={exampleAnswer}
              onChange={(e) => onChange("exampleAnswer", e.target.value)}
              style={{ ...styles.input, padding: "8px 10px" }}
            >
              <option value="">-- Chọn đáp án ví dụ --</option>
              {options.map((opt, idx) => (
                <option key={`${opt}-${idx}`} value={opt}>
                  {getOptionDisplayText(opt, idx)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(studentTitle || exampleText || exampleAnswer) ? (
          <div style={styles.examplePreview}>
            {studentTitle ? <div style={styles.previewDisplayTitle}>{studentTitle}</div> : null}
            <span style={styles.examplePreviewLabel}>Example</span>
            <span style={styles.examplePreviewText}>{exampleText || "0 Adam"}</span>
            {exampleAnswer ? <span style={styles.examplePreviewAnswer}>{exampleAnswer}</span> : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <h4 style={styles.sectionTitle}>Danh sách bên trái</h4>
          {leftItems.map((item, idx) => (
            <div key={idx} style={styles.row}>
              <span style={styles.indexBadge}>{startingNumber + idx}</span>
              <input
                value={item}
                onChange={(e) => updateLeftItem(idx, e.target.value)}
                style={styles.input}
                placeholder={`Câu ${startingNumber + idx}`}
              />
              <button type="button" onClick={() => removeLeftItem(idx)} style={styles.removeBtn}>X</button>
            </div>
          ))}
          <button type="button" onClick={addLeftItem} style={styles.addBtn}>+ Thêm item</button>
        </div>

        <div>
          <h4 style={styles.sectionTitle}>Lựa chọn (kéo thả)</h4>
          {options.map((opt, idx) => (
            <div key={idx} style={styles.row}>
              <span style={{ ...styles.indexBadge, ...styles.optionBadge }}>{getOptionLabel(idx)}</span>
              <input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                style={styles.input}
                placeholder={`Lựa chọn ${getOptionLabel(idx)}`}
              />
              <button type="button" onClick={() => removeOption(idx)} style={styles.removeBtn}>X</button>
            </div>
          ))}
          <button type="button" onClick={addOption} style={styles.addBtn}>+ Thêm lựa chọn</button>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <h4 style={styles.sectionTitle}>Đáp án đúng</h4>
        {leftItems.map((item, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: 14, color: "#334155" }}>
              {startingNumber + idx}. {item || `Item ${idx + 1}`}
            </div>
            <select
              value={correctAnswers[idx] || ""}
              onChange={(e) => updateCorrect(idx, e.target.value)}
              style={{ ...styles.input, padding: "8px 10px" }}
            >
              <option value="">-</option>
              {options.map((opt, optionIdx) => (
                <option key={`${opt}-${optionIdx}`} value={opt}>
                  {getOptionDisplayText(opt, optionIdx)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          <div>
            <h4 style={{ ...styles.sectionTitle, marginBottom: 4 }}>Review giao diện học sinh</h4>
            <div style={styles.previewHelp}>
              Preview dùng layout gap-match của học sinh. Thay đổi bên trên sẽ phản chiếu ngay ở đây.
            </div>
          </div>
          <button type="button" onClick={() => setPreviewAnswers({})} style={styles.secondaryBtn}>
            Làm mới preview
          </button>
        </div>

        <div style={styles.previewShell}>
          <GapMatchSectionDisplay
            section={previewSection}
            secIdx={0}
            sectionStartNum={startingNumber}
            currentPartIndex={partIndex}
            answers={previewAnswers}
            setAnswers={setPreviewAnswers}
            submitted={false}
            isDarkMode={false}
            flaggedQuestions={EMPTY_FLAGGED_QUESTIONS}
            toggleFlag={() => {}}
            questionRefs={previewQuestionRefs}
            activeQuestion=""
            styles={previewRuntimeStyles}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  heroCard: {
    padding: "12px 16px",
    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    borderRadius: "8px",
    marginBottom: "16px",
    color: "white",
  },
  partChip: {
    backgroundColor: "white",
    color: "#1d4ed8",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 700,
  },
  questionRange: {
    marginLeft: "auto",
    fontSize: "13px",
    opacity: 0.9,
  },
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
  row: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr) auto",
    gap: "8px",
    marginBottom: "8px",
    alignItems: "center",
  },
  indexBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 10px",
    borderRadius: 10,
    background: "#e2e8f0",
    color: "#1e293b",
    fontSize: 13,
    fontWeight: 800,
  },
  optionBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  exampleCard: {
    marginBottom: "16px",
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
  },
  exampleTitle: {
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  exampleHelp: {
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 1.5,
    color: "#475569",
  },
  examplePreview: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px dashed #93c5fd",
    background: "#ffffff",
  },
  previewDisplayTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.25,
    color: "#7c3aed",
    marginBottom: 2,
  },
  examplePreviewLabel: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 700,
  },
  examplePreviewText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
  },
  examplePreviewAnswer: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid #86efac",
  },
  previewCard: {
    marginTop: "20px",
    padding: "16px",
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
  },
  previewHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  previewHelp: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "#475569",
  },
  previewShell: {
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  secondaryBtn: {
    padding: "8px 12px",
    background: "#ffffff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
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
