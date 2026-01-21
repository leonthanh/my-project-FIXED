import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";

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
  question = {},
  onChange,
  startingNumber = 1,
  partIndex = 4, // Default to Part 5 (index 4)
}) => {
  const passageText = typeof question?.passageText === 'string' ? question.passageText : '';
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
    // Strip HTML tags for parsing (but keep original passageText for rendering)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = passageText;
    let text = tempDiv.textContent || tempDiv.innerText || passageText;
    
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

  const { quillRef, modules } = useQuillImageUpload();

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

  // Generate preview with highlighted blanks
  const generatePreview = () => {
    if (!passageText) return null;
    
    let previewHtml = passageText;
    
    // Strip HTML tags to get plain text for finding blank positions
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = passageText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Find blanks in plain text
    const blankMatches = [];
    blanks.forEach(blank => {
      const regex = new RegExp(`\\(${blank.questionNum}\\)|\\[${blank.questionNum}\\]`, 'g');
      let match;
      while ((match = regex.exec(plainText)) !== null) {
        blankMatches.push({
          questionNum: blank.questionNum,
          text: match[0],
          plainTextIndex: match.index
        });
      }
    });
    
    // Replace in HTML using regex to find the patterns
    blankMatches.forEach(match => {
      const answer = answers[match.questionNum] || '';
      const regex = new RegExp(`\\(${match.questionNum}\\)|\\[${match.questionNum}\\]`, 'g');
      previewHtml = previewHtml.replace(regex, 
        `<span style="background:#dbeafe;padding:2px 8px;border-radius:4px;font-weight:bold;border:1px solid #3b82f6;color:#1e40af;">(${match.questionNum}) ${answer || '______'}</span>`
      );
    });
    
    return previewHtml;
  };

  return (
    <div>
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#3b82f6",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Open Cloze</span>
          {blanks.length > 0 && (
            <span style={{
              marginLeft: "auto",
              fontSize: "13px",
              opacity: 0.9,
            }}>Questions {Math.min(...blanks.map(b => b.questionNum))}-{Math.max(...blanks.map(b => b.questionNum))}</span>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#eff6ff",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #bfdbfe",
      }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#1e40af" }}>
          💡 <strong>Hướng dẫn:</strong> Paste đoạn văn có chỗ trống đánh số (1), (2)... hoặc dùng ___. 
          Có thể nhập nhiều đáp án cách nhau bằng <code style={{
            backgroundColor: "#dbeafe",
            padding: "2px 6px",
            borderRadius: "3px",
            fontWeight: 600
          }}>|</code> (VD: but | though | however)
        </p>
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
      <div style={{ marginBottom: "12px" }} className="cloze-test-editor">
        <label style={styles.label}>
          Đoạn văn (dùng (1), (2)... hoặc ___ cho chỗ trống)
        </label>
        <div style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          backgroundColor: "white",
        }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={passageText}
            onChange={(content) => onChange("passageText", content || '')}
            placeholder={`VD: Last summer, I (1) _______ to the beach with my family. We (2) _______ there for two weeks. The weather (3) _______ very hot and sunny.

Hoặc:

Last summer, I ___ to the beach with my family. We ___ there for two weeks.`}
            modules={modules}
            formats={formats}
            style={{
              minHeight: "200px",
              backgroundColor: "white",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Tip: Copy đoạn văn từ đề, dùng (1), (2), (3)... hoặc ___ để đánh dấu chỗ trống. Có thể thêm hình, định dạng text...
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
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "12px" 
          }}>
            <h4 style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
              📝 Nhập đáp án cho từng chỗ trống:
            </h4>
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
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}>
            {blanks.map((blank) => {
              const hasMultipleAnswers = answers[blank.questionNum]?.includes('|');
              return (
                <div key={blank.questionNum} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    minWidth: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hasMultipleAnswers ? "#10b981" : "#3b82f6",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: "13px",
                    fontWeight: 600,
                    position: "relative",
                  }}>
                    {blank.questionNum}
                    {hasMultipleAnswers && (
                      <span style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        width: "16px",
                        height: "16px",
                        backgroundColor: "#fbbf24",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        border: "2px solid white",
                      }} title="Có nhiều đáp án đúng">
                        ✓
                      </span>
                    )}
                  </span>
                  <input
                    type="text"
                    value={answers[blank.questionNum] || ''}
                    onChange={(e) => handleAnswerChange(blank.questionNum, e.target.value)}
                    placeholder="VD: but | though | however"
                    style={{
                      ...styles.input,
                      marginBottom: 0,
                      flex: 1,
                      borderColor: hasMultipleAnswers ? "#10b981" : "#d1d5db",
                      backgroundColor: hasMultipleAnswers ? "#f0fdf4" : "white",
                    }}
                  />
                </div>
              );
            })}
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

// Custom styles for ReactQuill in this editor
const quillStyles = `
  .cloze-test-editor .ql-container {
    min-height: 200px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .cloze-test-editor .ql-editor {
    min-height: 200px;
    background-color: #ffffff;
  }
  .cloze-test-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .cloze-test-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .cloze-test-editor .ql-container.ql-snow:focus-within {
    background-color: #eff6ff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .cloze-test-editor .ql-editor:focus {
    background-color: #eff6ff;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .cloze-test-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .cloze-test-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #dbeafe;
    border-color: #3b82f6;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'cloze-test-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default ClozeTestEditor;
