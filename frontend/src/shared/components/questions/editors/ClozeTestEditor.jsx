import React, { useState, useEffect } from "react";

/**
 * ClozeTestEditor - Editor cho dạng Cloze Test (điền vào chỗ trống trong đoạn văn)
 * Dùng cho: KET Reading Part 5, PET Reading
 * 
 * Giáo viên paste đoạn văn có chỗ trống, hệ thống tự nhận diện và tạo form nhập đáp án
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (default: 1)
 */
const ClozeTestEditor = ({
  question,
  onChange,
  startingNumber = 1,
}) => {
  const passageText = question.passageText || '';
  const passageTitle = question.passageTitle || '';
  const answers = question.answers || {};
  const [blanks, setBlanks] = useState([]);

  // Parse blanks from passage - matches patterns like (1), (2), ___, ______, (31), etc.
  useEffect(() => {
    const patterns = [
      /\((\d+)\)/g,           // (1), (2), (31)
      /\[(\d+)\]/g,           // [1], [2]
      /(\d+)\s*[_…]+/g,       // 31 ___ or 31……
      /[_…]{3,}/g,            // ___ or ………
    ];
    
    const foundBlanks = [];
    let text = passageText;
    
    // Try numbered patterns first
    let match;
    const numberedPattern = /\((\d+)\)|\[(\d+)\]/g;
    while ((match = numberedPattern.exec(text)) !== null) {
      const num = parseInt(match[1] || match[2]);
      foundBlanks.push({
        questionNum: num,
        fullMatch: match[0],
        index: match.index,
        type: 'numbered'
      });
    }
    
    // If no numbered blanks found, look for underscores
    if (foundBlanks.length === 0) {
      const underscorePattern = /[_…]{3,}/g;
      let blankIndex = 0;
      while ((match = underscorePattern.exec(text)) !== null) {
        foundBlanks.push({
          questionNum: startingNumber + blankIndex,
          fullMatch: match[0],
          index: match.index,
          type: 'underscore'
        });
        blankIndex++;
      }
    }
    
    // Sort by question number
    foundBlanks.sort((a, b) => a.questionNum - b.questionNum);
    setBlanks(foundBlanks);
  }, [passageText, startingNumber]);

  // Handle answer change
  const handleAnswerChange = (questionNum, value) => {
    const newAnswers = { ...answers, [questionNum]: value };
    onChange("answers", newAnswers);
  };

  // Generate preview with highlighted blanks
  const generatePreview = () => {
    if (!passageText) return null;
    
    let previewHtml = passageText;
    
    // Replace blanks with styled spans (reverse order to preserve indices)
    [...blanks].reverse().forEach((blank) => {
      const before = previewHtml.slice(0, blank.index);
      const after = previewHtml.slice(blank.index + blank.fullMatch.length);
      const answer = answers[blank.questionNum] || '';
      previewHtml = before + 
        `<span style="background:#dbeafe;padding:2px 8px;border-radius:4px;font-weight:bold;border:1px solid #3b82f6;color:#1e40af;">(${blank.questionNum}) ${answer || '______'}</span>` + 
        after;
    });
    
    // Convert newlines to <br>
    previewHtml = previewHtml.replace(/\n/g, '<br>');
    
    return previewHtml;
  };

  return (
    <div>
      {/* Question Range Badge */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#dbeafe",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #93c5fd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, color: "#1e40af" }}>
          📝 Cloze Test: {blanks.length > 0 
            ? `Questions ${Math.min(...blanks.map(b => b.questionNum))} - ${Math.max(...blanks.map(b => b.questionNum))}` 
            : 'Chưa có câu hỏi'}
        </span>
        <span style={{
          padding: "4px 10px",
          backgroundColor: "#3b82f6",
          color: "white",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
        }}>
          {blanks.length} blanks
        </span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Tiêu đề đoạn văn (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange("passageTitle", e.target.value)}
          placeholder="VD: My First Day at School"
          style={styles.input}
        />
      </div>

      {/* Passage Text */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>
          Đoạn văn (dùng (1), (2)... hoặc ___ cho chỗ trống)
        </label>
        <textarea
          value={passageText}
          onChange={(e) => onChange("passageText", e.target.value)}
          placeholder={`VD: Last summer, I (1) _______ to the beach with my family. We (2) _______ there for two weeks. The weather (3) _______ very hot and sunny.

Hoặc:

Last summer, I ___ to the beach with my family. We ___ there for two weeks.`}
          style={{
            ...styles.input,
            minHeight: "200px",
            fontFamily: "monospace",
            lineHeight: 1.6,
          }}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Tip: Copy đoạn văn từ đề, dùng (1), (2), (3)... hoặc ___ để đánh dấu chỗ trống
        </p>
      </div>

      {/* Answers Section */}
      {blanks.length > 0 && (
        <div style={{
          backgroundColor: "#f8fafc",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#475569" }}>
            📝 Nhập đáp án cho từng chỗ trống:
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}>
            {blanks.map((blank) => (
              <div key={blank.questionNum} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  minWidth: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: "13px",
                  fontWeight: 600,
                }}>
                  {blank.questionNum}
                </span>
                <input
                  type="text"
                  value={answers[blank.questionNum] || ''}
                  onChange={(e) => handleAnswerChange(blank.questionNum, e.target.value)}
                  placeholder="Đáp án..."
                  style={{
                    ...styles.input,
                    marginBottom: 0,
                    flex: 1,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {passageText && (
        <div style={{
          backgroundColor: "#f0fdf4",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
            👁️ Preview:
          </h4>
          {passageTitle && (
            <h3 style={{ 
              margin: "0 0 12px 0", 
              fontSize: "16px", 
              fontWeight: 600,
              color: "#1e293b",
              textAlign: "center"
            }}>
              {passageTitle}
            </h3>
          )}
          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "#374151",
            }}
            dangerouslySetInnerHTML={{ __html: generatePreview() }}
          />
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

export default ClozeTestEditor;
