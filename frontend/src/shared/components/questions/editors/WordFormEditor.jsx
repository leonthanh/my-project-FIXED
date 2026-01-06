import React from "react";

/**
 * WordFormEditor - KET Part 6: Word Formation/Completion
 * 
 * Format mẫu Cambridge:
 * - Câu có chỗ trống + từ gốc (ROOT WORD) cho sẵn
 * - Học sinh biến đổi từ gốc để điền vào chỗ trống
 * 
 * VD:
 * "The weather was very __________ yesterday." (SUN)
 * → Đáp án: sunny
 * 
 * Khác với Sentence Transformation:
 * - Sentence Transformation: viết lại cả câu giữ nguyên nghĩa
 * - Word Formation: chỉ biến đổi 1 từ để điền vào blank
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (thường 27)
 */
const WordFormEditor = ({
  question = {},
  onChange,
  startingNumber = 27,
}) => {
  const sentences = question?.sentences || [ 
    { sentence: '', rootWord: '', correctAnswer: '' },
    { sentence: '', rootWord: '', correctAnswer: '' },
    { sentence: '', rootWord: '', correctAnswer: '' },
    { sentence: '', rootWord: '', correctAnswer: '' },
    { sentence: '', rootWord: '', correctAnswer: '' },
    { sentence: '', rootWord: '', correctAnswer: '' },
  ];

  const handleSentenceChange = (index, field, value) => {
    const newSentences = [...sentences];
    newSentences[index] = { ...newSentences[index], [field]: value };
    onChange("sentences", newSentences);
  };

  const addSentence = () => {
    onChange("sentences", [...sentences, { sentence: '', rootWord: '', correctAnswer: '' }]);
  };

  const removeSentence = (index) => {
    if (sentences.length <= 3) return;
    const newSentences = sentences.filter((_, i) => i !== index);
    onChange("sentences", newSentences);
  };

  return (
    <div>
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#ea580c",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part 6</span>
          <span style={{ fontWeight: 600 }}>Word Formation</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Questions {startingNumber}-{startingNumber + sentences.length - 1}</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#fff7ed",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #fed7aa",
      }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#9a3412" }}>
          💡 <strong>Hướng dẫn:</strong> Nhập câu có chỗ trống (dùng ___) và từ gốc. 
          Học sinh sẽ biến đổi từ gốc để điền vào chỗ trống.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#c2410c" }}>
          VD: "The weather was very ___ yesterday." + từ gốc (SUN) → sunny
        </p>
      </div>

      {/* Sentences List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sentences.map((item, idx) => (
          <div key={idx} style={{
            padding: "16px",
            backgroundColor: "#fffbeb",
            borderRadius: "8px",
            border: "1px solid #fde68a",
            position: "relative",
          }}>
            {/* Remove button */}
            {sentences.length > 3 && (
              <button
                type="button"
                onClick={() => removeSentence(idx)}
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
                ✕
              </button>
            )}

            {/* Question number */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                backgroundColor: "#ea580c",
                color: "white",
                borderRadius: "50%",
                fontWeight: 700,
                fontSize: "14px",
              }}>
                {startingNumber + idx}
              </span>
              <span style={{ fontSize: "13px", color: "#9a3412", fontWeight: 500 }}>
                Question {startingNumber + idx}
              </span>
            </div>

            {/* Sentence with blank */}
            <div style={{ marginBottom: "12px" }}>
              <label style={styles.label}>📝 Câu có chỗ trống (dùng ___ cho blank)</label>
              <input
                type="text"
                value={item.sentence}
                onChange={(e) => handleSentenceChange(idx, 'sentence', e.target.value)}
                placeholder="VD: The weather was very ___ yesterday."
                style={styles.input}
              />
            </div>

            {/* Root Word & Correct Answer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={styles.label}>
                  🔤 Từ gốc (ROOT WORD)
                </label>
                <input
                  type="text"
                  value={item.rootWord}
                  onChange={(e) => handleSentenceChange(idx, 'rootWord', e.target.value.toUpperCase())}
                  placeholder="VD: SUN"
                  style={{
                    ...styles.input,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    backgroundColor: "#fef3c7",
                    borderColor: "#f59e0b",
                    textAlign: "center",
                  }}
                />
              </div>
              <div>
                <label style={styles.label}>
                  ✅ Đáp án đúng
                </label>
                <input
                  type="text"
                  value={item.correctAnswer}
                  onChange={(e) => handleSentenceChange(idx, 'correctAnswer', e.target.value.toLowerCase())}
                  placeholder="VD: sunny"
                  style={{
                    ...styles.input,
                    backgroundColor: "#dcfce7",
                    borderColor: "#22c55e",
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            {item.sentence && (
              <div style={{
                marginTop: "12px",
                padding: "12px",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}>
                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", display: "block" }}>
                  👁️ Preview:
                </span>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {item.sentence.includes('___') 
                    ? item.sentence.replace(/[_]+/g, 
                        `<span style="border-bottom:2px solid #3b82f6;padding:0 8px;color:#1d4ed8;font-weight:500;">${item.correctAnswer || '______'}</span>`)
                        .split('<span').map((part, i) => 
                          i === 0 ? part : <span key={i} dangerouslySetInnerHTML={{__html: '<span' + part}} />
                        )
                    : item.sentence
                  }
                  {item.rootWord && (
                    <span style={{
                      marginLeft: "12px",
                      padding: "2px 8px",
                      backgroundColor: "#fef3c7",
                      borderRadius: "4px",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#92400e",
                    }}>
                      ({item.rootWord})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addSentence}
        style={{
          width: "100%",
          marginTop: "12px",
          padding: "12px",
          backgroundColor: "#fff7ed",
          color: "#ea580c",
          border: "2px dashed #fed7aa",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        + Thêm câu hỏi
      </button>

      {/* Answer Summary */}
      <div style={{
        marginTop: "20px",
        padding: "16px",
        backgroundColor: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #bbf7d0",
      }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
          ✅ Tổng hợp đáp án:
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {sentences.map((item, idx) => (
            <div key={idx} style={{
              padding: "8px 12px",
              backgroundColor: item.correctAnswer ? "#dcfce7" : "#fee2e2",
              borderRadius: "6px",
              fontSize: "12px",
            }}>
              <strong>{startingNumber + idx}:</strong>{' '}
              <span style={{ color: "#6b7280" }}>({item.rootWord || '?'})</span> →{' '}
              <span style={{ color: "#16a34a", fontWeight: 600 }}>{item.correctAnswer || '?'}</span>
            </div>
          ))}
        </div>
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
    marginBottom: "0",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: 600,
    fontSize: "12px",
    color: "#6b7280",
  },
};

export default WordFormEditor;
