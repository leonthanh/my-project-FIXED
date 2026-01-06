import React from "react";

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
}) => {
  const passageTitle = question?.passageTitle || '';
  const passage = question?.passage || '';
  const blanks = question?.blanks || [
    { number: 16, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { number: 17, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { number: 18, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { number: 19, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { number: 20, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
  ];

  const handleBlankChange = (index, field, value) => {
    const newBlanks = [...blanks];
    newBlanks[index] = { ...newBlanks[index], [field]: value };
    onChange("blanks", newBlanks);
  };

  const handleOptionChange = (blankIdx, optIdx, value) => {
    const newBlanks = [...blanks];
    const opt = ['A', 'B', 'C'][optIdx];
    newBlanks[blankIdx].options[optIdx] = `${opt}. ${value}`;
    onChange("blanks", newBlanks);
  };

  const addBlank = () => {
    const lastNum = blanks.length > 0 ? blanks[blanks.length - 1].number : startingNumber - 1;
    onChange("blanks", [...blanks, {
      number: lastNum + 1,
      options: ['A. ', 'B. ', 'C. '],
      correctAnswer: '',
    }]);
  };

  const removeBlank = (index) => {
    if (blanks.length <= 3) return;
    const newBlanks = blanks.filter((_, i) => i !== index);
    onChange("blanks", newBlanks);
  };

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
          }}>Part 4</span>
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
          đánh dấu chỗ trống. Sau đó nhập 3 options A/B/C cho mỗi chỗ trống.
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
      <div style={{ marginBottom: "20px" }}>
        <label style={styles.label}>📝 Đoạn văn với chỗ trống *</label>
        <textarea
          value={passage}
          onChange={(e) => onChange("passage", e.target.value)}
          placeholder={`VD: Last summer, I (${startingNumber}) to Italy with my family. We (${startingNumber + 1}) in a beautiful hotel near the beach. Every day, we (${startingNumber + 2}) swimming and...`}
          style={{
            ...styles.input,
            minHeight: "150px",
            lineHeight: "1.8",
          }}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Dùng (16), (17)... để đánh dấu chỗ trống
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

              {/* Options A/B/C */}
              {['A', 'B', 'C'].map((opt, optIdx) => (
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

export default ClozeMCEditor;
