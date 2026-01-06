import React from "react";

/**
 * SentenceTransformationEditor - Editor cho dạng biến đổi câu
 * Dùng cho: KET Reading & Writing Part 7, PET Writing
 * 
 * Format: Câu gốc + từ gợi ý + đáp án (cần điền vào chỗ trống)
 * VD: 
 *   Original: "I started learning English two years ago."
 *   Keyword: BEEN
 *   Target: "I have ___________ English for two years."
 *   Answer: "been learning"
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu
 */
const SentenceTransformationEditor = ({
  question,
  onChange,
  startingNumber = 1,
}) => {
  const originalSentence = question.originalSentence || '';
  const keyword = question.keyword || '';
  const targetSentence = question.targetSentence || '';
  const correctAnswer = question.correctAnswer || '';
  const wordLimit = question.wordLimit || '1-3';
  const hint = question.hint || '';

  return (
    <div>
      {/* Question Number Badge */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#fef3c7",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #fcd34d",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, color: "#92400e" }}>
          ✏️ Sentence Transformation - Question {startingNumber}
        </span>
        <span style={{
          padding: "4px 10px",
          backgroundColor: "#f59e0b",
          color: "white",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
        }}>
          {wordLimit} words
        </span>
      </div>

      {/* Original Sentence */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Câu gốc (Original Sentence) *</label>
        <input
          type="text"
          value={originalSentence}
          onChange={(e) => onChange("originalSentence", e.target.value)}
          placeholder="VD: I started learning English two years ago."
          style={styles.input}
        />
      </div>

      {/* Keyword */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Từ khóa (Keyword) *</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => onChange("keyword", e.target.value.toUpperCase())}
          placeholder="VD: BEEN"
          style={{
            ...styles.input,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1px",
            maxWidth: "200px",
          }}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Từ khóa phải được dùng trong câu trả lời, không được thay đổi
        </p>
      </div>

      {/* Target Sentence (with blank) */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>
          Câu cần hoàn thành (dùng ___ cho chỗ trống) *
        </label>
        <input
          type="text"
          value={targetSentence}
          onChange={(e) => onChange("targetSentence", e.target.value)}
          placeholder="VD: I have ___________ English for two years."
          style={styles.input}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Dùng ___ hoặc nhiều gạch dưới để đánh dấu chỗ cần điền
        </p>
      </div>

      {/* Word Limit */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Giới hạn từ</label>
        <select
          value={wordLimit}
          onChange={(e) => onChange("wordLimit", e.target.value)}
          style={{
            ...styles.input,
            maxWidth: "200px",
          }}
        >
          <option value="1">1 word only</option>
          <option value="1-2">1-2 words</option>
          <option value="1-3">1-3 words</option>
          <option value="2-5">2-5 words</option>
        </select>
      </div>

      {/* Correct Answer */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Đáp án đúng *</label>
        <input
          type="text"
          value={correctAnswer}
          onChange={(e) => onChange("correctAnswer", e.target.value)}
          placeholder="VD: been learning"
          style={{
            ...styles.input,
            backgroundColor: "#dcfce7",
            borderColor: "#22c55e",
          }}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Dùng <code>/</code> cho nhiều đáp án đúng. VD: <code>been learning/been studying</code>
        </p>
      </div>

      {/* Optional Hint */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Gợi ý (tùy chọn)</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => onChange("hint", e.target.value)}
          placeholder="VD: Use present perfect continuous"
          style={styles.input}
        />
      </div>

      {/* Preview */}
      {(originalSentence || targetSentence) && (
        <div style={{
          backgroundColor: "#f0fdf4",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
          marginTop: "16px",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
            👁️ Preview (Student View):
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}>
            {/* Question number */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "12px",
            }}>
              <span style={{
                minWidth: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0e276f",
                color: "white",
                borderRadius: "50%",
                fontSize: "14px",
                fontWeight: 600,
              }}>
                {startingNumber}
              </span>
              <div style={{ flex: 1 }}>
                {/* Original sentence */}
                <p style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "14px",
                  color: "#1e293b",
                }}>
                  {originalSentence || '(Câu gốc)'}
                </p>
                
                {/* Keyword highlight */}
                {keyword && (
                  <p style={{ 
                    margin: "0 0 8px 0",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#dc2626",
                    letterSpacing: "2px",
                  }}>
                    {keyword}
                  </p>
                )}
                
                {/* Target sentence with blank */}
                <p style={{ 
                  margin: "0",
                  fontSize: "14px",
                  color: "#1e293b",
                }}>
                  {targetSentence 
                    ? targetSentence.replace(/[_…]+/g, 
                        `<span style="border-bottom:2px solid #3b82f6;padding:0 20px;color:#3b82f6;font-weight:500;">${correctAnswer || '________'}</span>`)
                        .split('<span').map((part, i) => 
                          i === 0 ? part : <span key={i} dangerouslySetInnerHTML={{__html: '<span' + part}} />
                        )
                    : '(Câu cần hoàn thành)'
                  }
                </p>
              </div>
            </div>

            {/* Word limit note */}
            <p style={{
              margin: "12px 0 0 40px",
              fontSize: "12px",
              color: "#64748b",
              fontStyle: "italic",
            }}>
              (Write {wordLimit} word{wordLimit !== '1' ? 's' : ''} only)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px",
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

export default SentenceTransformationEditor;
