import React, { useState, useEffect, useRef } from "react";

/**
 * IELTS Matching Headings Question Component
 *
 * Dạng câu hỏi phổ biến trong IELTS Reading:
 * - Có danh sách các Paragraphs (A, B, C, D, E, F, G)
 * - Có danh sách các Headings (i, ii, iii, iv, v...)
 * - Học sinh ghép mỗi Paragraph với 1 Heading phù hợp
 *
 * Props:
 * - question: Object chứa dữ liệu câu hỏi
 * - onChange: Callback khi dữ liệu thay đổi
 * - questionNumbers: Range câu hỏi (e.g., "1-7")
 */

const IELTSMatchingHeadingsQuestion = ({
  question,
  onChange,
  questionNumbers,
}) => {
  // State cho danh sách paragraphs và headings
  const [paragraphs, setParagraphs] = useState(
    question.paragraphs || [{ id: "A", label: "A", text: "" }]
  );

  const [headings, setHeadings] = useState(
    question.headings || [{ id: 1, label: "i", text: "" }]
  );

  // State cho đáp án - mỗi paragraph match với heading nào
  const [answers, setAnswers] = useState(question.answers || {});

  // State cho extra headings (headings không dùng)
  const [hasExtraHeadings, setHasExtraHeadings] = useState(
    question.hasExtraHeadings ?? true
  );

  // Keep refs to latest props to avoid stale closures without listing them as deps
  const onChangeRef = useRef(onChange);
  const questionRef = useRef(question);
  onChangeRef.current = onChange;
  questionRef.current = question;

  // Roman numerals helper
  const toRoman = (num) => {
    const romans = [
      "i",
      "ii",
      "iii",
      "iv",
      "v",
      "vi",
      "vii",
      "viii",
      "ix",
      "x",
      "xi",
      "xii",
      "xiii",
      "xiv",
      "xv",
    ];
    return romans[num - 1] || num.toString();
  };

  // Update parent component when local state changes.
  // Use refs for onChange/question so they are always fresh without being deps
  // (inline arrow functions passed as onChange would cause infinite re-render if listed).
  useEffect(() => {
    onChangeRef.current({
      ...questionRef.current,
      questionType: "ielts-matching-headings",
      paragraphs,
      headings,
      answers,
      hasExtraHeadings,
      // Tạo blanks array để tương thích với hệ thống chấm điểm
      blanks: paragraphs.map((p, idx) => ({
        id: `blank_${idx}`,
        blankNumber: idx + 1,
        paragraphLabel: p.label,
        correctAnswer: answers[p.id] || "",
      })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphs, headings, answers, hasExtraHeadings]);

  // ===== PARAGRAPH HANDLERS =====
  const addParagraph = () => {
    const nextLabel = String.fromCharCode(65 + paragraphs.length); // A, B, C, D...
    setParagraphs([
      ...paragraphs,
      {
        id: nextLabel,
        label: nextLabel,
        text: `Paragraph ${nextLabel}`,
      },
    ]);
  };

  const removeParagraph = (index) => {
    if (paragraphs.length > 1) {
      const removed = paragraphs[index];
      const newParagraphs = paragraphs.filter((_, i) => i !== index);
      setParagraphs(newParagraphs);

      // Remove answer for this paragraph
      const newAnswers = { ...answers };
      delete newAnswers[removed.id];
      setAnswers(newAnswers);
    }
  };

  const updateParagraph = (index, field, value) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = { ...newParagraphs[index], [field]: value };
    setParagraphs(newParagraphs);
  };

  // ===== HEADING HANDLERS =====
  const addHeading = () => {
    const nextNum = headings.length + 1;
    setHeadings([
      ...headings,
      {
        id: nextNum,
        label: toRoman(nextNum),
        text: "",
      },
    ]);
  };

  const removeHeading = (index) => {
    if (headings.length > 1) {
      const removed = headings[index];
      const newHeadings = headings.filter((_, i) => i !== index);

      // Re-number headings
      const renumbered = newHeadings.map((h, i) => ({
        ...h,
        id: i + 1,
        label: toRoman(i + 1),
      }));
      setHeadings(renumbered);

      // Update answers - remove references to deleted heading
      const newAnswers = { ...answers };
      Object.keys(newAnswers).forEach((key) => {
        if (newAnswers[key] === removed.label) {
          newAnswers[key] = "";
        }
      });
      setAnswers(newAnswers);
    }
  };

  const updateHeading = (index, text) => {
    const newHeadings = [...headings];
    newHeadings[index] = { ...newHeadings[index], text };
    setHeadings(newHeadings);
  };

  // ===== ANSWER HANDLERS =====
  const updateAnswer = (paragraphId, headingLabel) => {
    setAnswers({
      ...answers,
      [paragraphId]: headingLabel,
    });
  };

  // ===== QUICK FILL HELPERS =====
  const addMultipleParagraphs = (count) => {
    const newParagraphs = [];
    for (let i = 0; i < count; i++) {
      const label = String.fromCharCode(65 + paragraphs.length + i);
      newParagraphs.push({ id: label, label, text: `Paragraph ${label}` });
    }
    setParagraphs([...paragraphs, ...newParagraphs]);
  };

  const addMultipleHeadings = (count) => {
    const newHeadings = [];
    for (let i = 0; i < count; i++) {
      const num = headings.length + i + 1;
      newHeadings.push({ id: num, label: toRoman(num), text: "" });
    }
    setHeadings([...headings, ...newHeadings]);
  };

  // ===== STYLES =====
  const styles = {
    container: {
      padding: "5px",
      backgroundColor: "#f0f7ff",
      borderRadius: "12px",
      border: "2px solid #0e276f",
      marginTop: "15px",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
      paddingBottom: "15px",
      borderBottom: "2px solid #0e276f",
    },
    headerIcon: {
      fontSize: "28px",
    },
    headerTitle: {
      margin: 0,
      color: "#0e276f",
      fontSize: "18px",
    },
    headerBadge: {
      backgroundColor: "#0e276f",
      color: "white",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
    },
    section: {
      marginBottom: "20px",
      overflow: "hidden",
      minWidth: 0,
    },
    sectionHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
    },
    sectionTitle: {
      margin: 0,
      color: "#0e276f",
      fontSize: "14px",
      fontWeight: "bold",
    },
    quickButtons: {
      display: "flex",
      gap: "5px",
    },
    quickBtn: {
      padding: "4px 10px",
      fontSize: "11px",
      border: "1px solid #0e276f",
      backgroundColor: "white",
      color: "#0e276f",
      borderRadius: "4px",
      cursor: "pointer",
    },
    itemRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
      padding: "8px",
      backgroundColor: "white",
      borderRadius: "6px",
      border: "1px solid #ddd",
      overflow: "hidden",
      minWidth: 0,
    },
    labelBadge: {
      minWidth: "32px",
      width: "32px",
      padding: "6px",
      backgroundColor: "#0e276f",
      color: "white",
      borderRadius: "4px",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: "13px",
      flexShrink: 0,
    },
    headingBadge: {
      minWidth: "32px",
      width: "32px",
      padding: "6px",
      backgroundColor: "#6f42c1",
      color: "white",
      borderRadius: "4px",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: "13px",
      flexShrink: 0,
    },
    input: {
      flex: 1,
      minWidth: 0,
      padding: "8px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      fontSize: "12px",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    deleteBtn: {
      padding: "6px 10px",
      backgroundColor: "#dc3545",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      flexShrink: 0,
    },
    addBtn: {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      padding: "10px 16px",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      marginTop: "10px",
    },
    answersSection: {
      backgroundColor: "#e8f5e9",
      padding: "15px",
      borderRadius: "8px",
      border: "1px solid #4caf50",
    },
    answerRow: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      marginBottom: "10px",
      padding: "10px",
      backgroundColor: "white",
      borderRadius: "6px",
    },
    answerLabel: {
      minWidth: "100px",
      fontWeight: "bold",
      color: "#0e276f",
    },
    select: {
      flex: 1,
      padding: "10px",
      border: "2px solid #4caf50",
      borderRadius: "6px",
      fontSize: "13px",
      backgroundColor: "white",
      maxWidth: "200px",
    },
    previewSection: {
      marginTop: "20px",
      padding: "15px",
      backgroundColor: "#fff3e0",
      borderRadius: "8px",
      border: "1px solid #ff9800",
    },
    previewTitle: {
      margin: "0 0 15px 0",
      color: "#e65100",
      fontSize: "14px",
      fontWeight: "bold",
    },
    previewTable: {
      width: "100%",
      borderCollapse: "collapse",
    },
    previewTh: {
      padding: "10px",
      backgroundColor: "#ff9800",
      color: "white",
      textAlign: "left",
      fontSize: "12px",
    },
    previewTd: {
      padding: "10px",
      borderBottom: "1px solid #ddd",
      fontSize: "12px",
    },
    tip: {
      marginTop: "15px",
      padding: "12px",
      backgroundColor: "#e3f2fd",
      borderRadius: "6px",
      fontSize: "12px",
      color: "#1565c0",
      borderLeft: "4px solid #1565c0",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🔗</span>
        <h4 style={styles.headerTitle}>IX Matching Headings</h4>
        <span style={styles.headerBadge}>
          {paragraphs.length} paragraphs • {headings.length} headings
        </span>
      </div>

      {/* Checkbox for extra headings */}
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hasExtraHeadings}
            onChange={(e) => setHasExtraHeadings(e.target.checked)}
            style={{ width: "18px", height: "18px" }}
          />
          <span style={{ fontSize: "13px" }}>
            📌 Có headings dư (NB: There are more headings than paragraphs)
          </span>
        </label>
      </div>

      {/* Two columns layout */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* LEFT: Paragraphs */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h5 style={styles.sectionTitle}>📄 Paragraphs (Các đoạn văn)</h5>
            <div style={styles.quickButtons}>
              <button
                type="button"
                style={styles.quickBtn}
                onClick={() => addMultipleParagraphs(3)}
              >
                +3
              </button>
              <button
                type="button"
                style={styles.quickBtn}
                onClick={() => addMultipleParagraphs(5)}
              >
                +5
              </button>
            </div>
          </div>

          {paragraphs.map((p, idx) => (
            <div key={p.id} style={styles.itemRow}>
              <span style={styles.labelBadge}>{p.label}</span>
              <input
                type="text"
                value={p.text}
                onChange={(e) => updateParagraph(idx, "text", e.target.value)}
                placeholder={`Mô tả Paragraph ${p.label} (optional)`}
                style={styles.input}
              />
              <button
                type="button"
                style={styles.deleteBtn}
                onClick={() => removeParagraph(idx)}
                disabled={paragraphs.length <= 1}
                title="Xóa paragraph"
              >
                ✕
              </button>
            </div>
          ))}

          <button type="button" style={styles.addBtn} onClick={addParagraph}>
            ➕ Thêm Paragraph
          </button>
        </div>

        {/* RIGHT: Headings */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h5 style={styles.sectionTitle}>📋 Headings (Các tiêu đề)</h5>
            <div style={styles.quickButtons}>
              <button
                type="button"
                style={styles.quickBtn}
                onClick={() => addMultipleHeadings(3)}
              >
                +3
              </button>
              <button
                type="button"
                style={styles.quickBtn}
                onClick={() => addMultipleHeadings(5)}
              >
                +5
              </button>
            </div>
          </div>

          {headings.map((h, idx) => (
            <div key={h.id} style={styles.itemRow}>
              <span style={styles.headingBadge}>{h.label}</span>
              <input
                type="text"
                value={h.text}
                onChange={(e) => updateHeading(idx, e.target.value)}
                placeholder={`Nhập nội dung heading ${h.label}`}
                style={styles.input}
              />
              <button
                type="button"
                style={styles.deleteBtn}
                onClick={() => removeHeading(idx)}
                disabled={headings.length <= 1}
                title="Xóa heading"
              >
                ✕
              </button>
            </div>
          ))}

          <button type="button" style={styles.addBtn} onClick={addHeading}>
            ➕ Thêm Heading
          </button>
        </div>
      </div>

      {/* ANSWERS Section - Compact Grid Layout */}
      <div style={styles.answersSection}>
        <h5
          style={{ margin: "0 0 15px 0", color: "#2e7d32", fontSize: "14px" }}
        >
          ✅ Đáp án - Ghép mỗi Paragraph với Heading
        </h5>

        {/* Compact 2-column or 4-column grid based on screen */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "8px",
          }}
        >
          {paragraphs.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                backgroundColor: "white",
                borderRadius: "6px",
                border: answers[p.id] ? "2px solid #4caf50" : "1px solid #ddd",
              }}
            >
              {/* Question number badge */}
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: "45px",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#0e276f",
                    color: "white",
                    borderRadius: "50%",
                    textAlign: "center",
                    lineHeight: "24px",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}
                >
                  Para {p.label}
                </span>
              </span>

              {/* Arrow */}
              <span style={{ color: "#999", fontSize: "12px" }}>→</span>

              {/* Compact Select */}
              <select
                value={answers[p.id] || ""}
                onChange={(e) => updateAnswer(p.id, e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "2px solid #4caf50",
                  borderRadius: "4px",
                  fontSize: "12px",
                  backgroundColor: "white",
                  minWidth: "0", // Allow shrinking
                  maxWidth: "100%",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Chọn --</option>
                {headings.map((h) => (
                  <option key={h.id} value={h.label}>
                    {h.label}. {h.text.substring(0, 20)}
                    {h.text.length > 20 ? "..." : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* PREVIEW Section */}
      <div style={styles.previewSection}>
        <h5 style={styles.previewTitle}>👁 Preview - Xem trước đáp án</h5>

        <table style={styles.previewTable}>
          <thead>
            <tr>
              <th style={styles.previewTh}>Câu</th>
              <th style={styles.previewTh}>Paragraph</th>
              <th style={styles.previewTh}>Đáp án</th>
              <th style={styles.previewTh}>Heading</th>
            </tr>
          </thead>
          <tbody>
            {paragraphs.map((p, idx) => {
              const answer = answers[p.id];
              const heading = headings.find((h) => h.label === answer);
              return (
                <tr key={p.id}>
                  <td style={styles.previewTd}>
                    <strong>Q{idx + 1}</strong>
                  </td>
                  <td style={styles.previewTd}>
                    <span
                      style={{
                        backgroundColor: "#0e276f",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        marginRight: "8px",
                      }}
                    >
                      {p.label}
                    </span>
                    {p.text}
                  </td>
                  <td style={styles.previewTd}>
                    {answer ? (
                      <span
                        style={{
                          backgroundColor: "#4caf50",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {answer}
                      </span>
                    ) : (
                      <span style={{ color: "#999" }}>--</span>
                    )}
                  </td>
                  <td style={styles.previewTd}>
                    {heading ? (
                      heading.text
                    ) : (
                      <span style={{ color: "#999" }}>Chưa chọn</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tips */}
      <div style={styles.tip}>
        <strong>💡 Hướng dẫn sử dụng:</strong>
        <ol style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
          <li>
            Thêm các <strong>Paragraph</strong> (A, B, C...) tương ứng với bài
            đọc
          </li>
          <li>
            Thêm các <strong>Heading</strong> (i, ii, iii...) - có thể thêm dư
            để tăng độ khó
          </li>
          <li>
            Chọn <strong>đáp án</strong> cho mỗi paragraph bên dưới
          </li>
          <li>
            Xem <strong>Preview</strong> để kiểm tra trước khi lưu
          </li>
        </ol>
      </div>
    </div>
  );
};

export default IELTSMatchingHeadingsQuestion;
