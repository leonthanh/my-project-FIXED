import React, { useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";

/**
 * ClozeMCEditor - KET Part 4: Multiple Choice Cloze
 * 
 * Format mẫu Cambridge:
 * - Đoạn văn với các chỗ trống được đánh số (16), (17), (18)...
 * - Mỗi chỗ trống có 3 options A/B/C để chọn
 * 
 * VD:
 * "Last summer, I (16)_____ to Italy with my family."
 * 16: A. go  B. went  C. going  → Đáp án: B
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (thường 16)
 */
const ClozeMCEditor = ({
  question = {},
  onChange,
  startingNumber = 16,
  partIndex = 3, // Default to Part 4 (index 3)
  testType,
}) => {
  const { quillRef, modules } = useQuillImageUpload();
  const passageTitle = question?.passageTitle || '';
  const passage = question?.passage || '';
  const passageValue = typeof passage === 'string' ? passage : '';
  const isPet = String(testType || '').toLowerCase().includes('pet');
  const defaultOptionCount = isPet ? 8 : 3;
  const buildDefaultOptions = (count) => Array.from({ length: count }, (_, idx) => `${String.fromCharCode(65 + idx)}. `);
  const initialSharedOptions = Array.isArray(question?.sharedOptions) && question.sharedOptions.length > 0
    ? question.sharedOptions
    : buildDefaultOptions(defaultOptionCount);
  const blanks = question?.blanks || [ 
    { number: 16, options: buildDefaultOptions(defaultOptionCount), correctAnswer: '' },
    { number: 17, options: buildDefaultOptions(defaultOptionCount), correctAnswer: '' },
    { number: 18, options: buildDefaultOptions(defaultOptionCount), correctAnswer: '' },
    { number: 19, options: buildDefaultOptions(defaultOptionCount), correctAnswer: '' },
    { number: 20, options: buildDefaultOptions(defaultOptionCount), correctAnswer: '' },
  ];
  const maxOptionLength = Math.max(
    defaultOptionCount,
    ...blanks.map((b) => (Array.isArray(b?.options) ? b.options.length : 0))
  );
  const optionLabels = Array.from({ length: maxOptionLength }, (_, idx) => String.fromCharCode(65 + idx));

  useEffect(() => {
    const needsNormalize = blanks.some((b) => (Array.isArray(b?.options) ? b.options.length : 0) < maxOptionLength);
    if (!needsNormalize) return;

    const normalized = blanks.map((b) => {
      const prevOptions = Array.isArray(b?.options) ? [...b.options] : [];
      while (prevOptions.length < maxOptionLength) {
        const label = String.fromCharCode(65 + prevOptions.length);
        prevOptions.push(`${label}. `);
      }
      return { ...b, options: prevOptions };
    });

    onChange("blanks", normalized);
  }, [blanks, maxOptionLength, onChange]);

  const handleBlankChange = (index, field, value) => {
    const newBlanks = [...blanks];
    newBlanks[index] = { ...newBlanks[index], [field]: value };
    onChange("blanks", newBlanks);
  };

  const handleOptionChange = (blankIdx, optIdx, value) => {
    const newBlanks = [...blanks];
    const opt = optionLabels[optIdx];
    const prevOptions = Array.isArray(newBlanks[blankIdx]?.options)
      ? [...newBlanks[blankIdx].options]
      : buildDefaultOptions(maxOptionLength);
    prevOptions[optIdx] = `${opt}. ${value}`;
    newBlanks[blankIdx].options = prevOptions;
    onChange("blanks", newBlanks);
  };

  const handleSharedOptionChange = (optIdx, value) => {
    const opt = optionLabels[optIdx];
    const nextShared = [...initialSharedOptions];
    while (nextShared.length < maxOptionLength) {
      const label = String.fromCharCode(65 + nextShared.length);
      nextShared.push(`${label}. `);
    }
    nextShared[optIdx] = `${opt}. ${value}`;
    onChange('sharedOptions', nextShared);

    const nextBlanks = blanks.map((blank) => ({
      ...blank,
      options: nextShared,
    }));
    onChange('blanks', nextBlanks);
  };

  const addBlank = () => {
    const lastNum = blanks.length > 0 ? blanks[blanks.length - 1].number : startingNumber - 1;
    onChange("blanks", [...blanks, {
      number: lastNum + 1,
      options: buildDefaultOptions(maxOptionLength),
      correctAnswer: '',
    }]);
  };

  const removeBlank = (index) => {
    if (blanks.length <= 3) return;
    const newBlanks = blanks.filter((_, i) => i !== index);
    onChange("blanks", newBlanks);
  };

  // modules provided by useQuillImageUpload

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "color",
    "background",
    "list",
    "bullet",
    "align",
    "link",
    "image",
  ];

  // Parse passage to highlight blanks
  const getHighlightedPassage = () => {
    if (!passage) return null;
    let html = passage;
    
    // Replace (16), (17) etc with styled spans
    blanks.forEach((blank) => {
      const pattern = new RegExp(`\\(${blank.number}\\)|\\[${blank.number}\\]|${blank.number}[_…]+`, 'g');
      const answer = blank.correctAnswer ? 
        blank.options.find(o => o.startsWith(blank.correctAnswer))?.replace(`${blank.correctAnswer}.`, '').trim() || '' 
        : '';
      html = html.replace(pattern, 
        `<span style="background:#dbeafe;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid #3b82f6;color:#1e40af;">(${blank.number}) ${answer || '___'}</span>`
      );
    });
    
    return html.replace(/\n/g, '<br>');
  };

  return (
    <div>
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#dc2626",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Multiple Choice Cloze</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Questions {startingNumber}-{startingNumber + blanks.length - 1}</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#fef2f2",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #fecaca",
      }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#991b1b" }}>
          💡 <strong>Hướng dẫn:</strong> Paste đoạn văn có các số trong ngoặc như (16), (17)... 
          đánh dấu chỗ trống. Sau đó nhập {isPet ? 'options A-H' : '3 options A/B/C'} cho mỗi chỗ trống.
        </p>
      </div>

      {/* Passage Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>📌 Tiêu đề (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange("passageTitle", e.target.value)}
          placeholder="VD: A letter from Sarah"
          style={styles.input}
        />
      </div>

      {/* Passage Text */}
      <div style={{ marginBottom: "20px" }} className="cloze-mc-editor">
        <label style={styles.label}>📝 Đoạn văn với chỗ trống *</label>
        <div style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          backgroundColor: "white",
        }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={passageValue}
            onChange={(content) => onChange("passage", content || '')}
            placeholder={`VD: Last summer, I (${startingNumber}) to Italy with my family. We (${startingNumber + 1}) in a beautiful hotel near the beach...`}
            modules={modules}
            formats={formats}
            style={{
              minHeight: "150px",
              backgroundColor: "white",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Dùng (16), (17)... để đánh dấu chỗ trống. Có thể thêm hình, định dạng text...
        </p>
      </div>

      {/* Preview Passage */}
      {passage && (
        <div style={{
          marginBottom: "20px",
          padding: "16px",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b" }}>
            👁️ Preview đoạn văn:
          </h4>
          <div 
            style={{ fontSize: "14px", lineHeight: "1.8" }}
            dangerouslySetInnerHTML={{ __html: getHighlightedPassage() }}
          />
        </div>
      )}

      {/* Blanks & Options */}
      <div style={{
        padding: "16px",
        backgroundColor: "#fff1f2",
        borderRadius: "8px",
        border: "1px solid #fecaca",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", color: "#991b1b" }}>
            📋 Options cho từng chỗ trống
          </h3>
          <button
            type="button"
            onClick={addBlank}
            style={{
              padding: "4px 10px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            + Thêm blank
          </button>
        </div>

        {isPet && (
          <div style={{
            padding: "12px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            marginBottom: "12px",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#991b1b", marginBottom: "10px" }}>
              🧩 Danh sách lựa chọn A–H (dùng chung cho tất cả chỗ trống)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
              {optionLabels.map((opt, optIdx) => (
                <div key={opt} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{
                    minWidth: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f3f4f6",
                    color: "#6366f1",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}>
                    {opt}
                  </span>
                  <input
                    type="text"
                    value={initialSharedOptions?.[optIdx]?.replace(`${opt}.`, "").replace(`${opt}`, "").trim() || ""}
                    onChange={(e) => handleSharedOptionChange(optIdx, e.target.value)}
                    placeholder={`Option ${opt}`}
                    style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: "12px", padding: "6px 10px" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid of blanks */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
          {blanks.map((blank, blankIdx) => (
            <div key={blankIdx} style={{
              padding: "12px",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              position: "relative",
            }}>
              {/* Remove button */}
              {blanks.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeBlank(blankIdx)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    padding: "2px 6px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  ✕
                </button>
              )}

              {/* Blank number */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 12px",
                backgroundColor: "#dc2626",
                color: "white",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "13px",
                marginBottom: "10px",
              }}>
                Question {blank.number}
              </div>

              {!isPet && optionLabels.map((opt, optIdx) => (
                <div key={opt} style={{ 
                  display: "flex", 
                  gap: "6px", 
                  marginBottom: "6px",
                  alignItems: "center",
                }}>
                  <span style={{
                    minWidth: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: blank.correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
                    color: blank.correctAnswer === opt ? "#16a34a" : "#6366f1",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "11px",
                  }}>
                    {opt}
                  </span>
                  <input
                    type="text"
                    value={blank.options?.[optIdx]?.replace(`${opt}.`, "").replace(`${opt}`, "").trim() || ""}
                    onChange={(e) => handleOptionChange(blankIdx, optIdx, e.target.value)}
                    placeholder={`Option ${opt}`}
                    style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: "12px", padding: "6px 10px" }}
                  />
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "4px 6px",
                    backgroundColor: blank.correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}>
                    <input
                      type="radio"
                      name={`correct-${blankIdx}`}
                      checked={blank.correctAnswer === opt}
                      onChange={() => handleBlankChange(blankIdx, 'correctAnswer', opt)}
                      style={{ accentColor: "#22c55e", marginRight: "2px" }}
                    />
                    ✓
                  </label>
                </div>
              ))}

              {isPet && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Đáp án:</span>
                  <select
                    value={blank.correctAnswer || ''}
                    onChange={(e) => handleBlankChange(blankIdx, 'correctAnswer', e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #d1d5db",
                      fontSize: "12px",
                      backgroundColor: blank.correctAnswer ? "#dcfce7" : "white",
                    }}
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {optionLabels.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Answer Summary */}
      <div style={{
        marginTop: "16px",
        padding: "12px 16px",
        backgroundColor: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #bbf7d0",
      }}>
        <span style={{ fontWeight: 600, color: "#166534", marginRight: "12px" }}>
          ✅ Đáp án:
        </span>
        {blanks.map((blank) => (
          <span key={blank.number} style={{
            display: "inline-block",
            padding: "4px 10px",
            backgroundColor: blank.correctAnswer ? "#dcfce7" : "#fee2e2",
            borderRadius: "4px",
            marginRight: "8px",
            fontSize: "13px",
            fontWeight: 500,
          }}>
            {blank.number}: {blank.correctAnswer || '?'}
          </span>
        ))}
      </div>
    </div>
  );
};

const styles = {
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "13px",
    color: "#374151",
  },
};

// Custom styles for ReactQuill in this editor
const quillStyles = `
  .cloze-mc-editor .ql-container {
    min-height: 150px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .cloze-mc-editor .ql-editor {
    min-height: 150px;
    background-color: #ffffff;
  }
  .cloze-mc-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .cloze-mc-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .cloze-mc-editor .ql-container.ql-snow:focus-within {
    background-color: #fef2f2;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }
  .cloze-mc-editor .ql-editor:focus {
    background-color: #fef2f2;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .cloze-mc-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .cloze-mc-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #fee2e2;
    border-color: #dc2626;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'cloze-mc-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default ClozeMCEditor;
