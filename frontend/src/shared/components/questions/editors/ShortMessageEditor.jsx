import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";
import InlineIcon from "../../InlineIcon.jsx";

const normalizeSituationHtml = (source = '') => {
  const html = String(source || '').trim();
  if (!html) return '';

  const fallbackCleanup = (value) => {
    let cleaned = String(value || '');
    cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
    cleaned = cleaned.replace(/<p><\/p>/gi, '');
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
    cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
    return cleaned.trim();
  };

  if (typeof DOMParser === 'undefined') {
    return fallbackCleanup(html);
  }

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
      const src = String(img.getAttribute('src') || '').trim();
      if (!src) {
        img.remove();
      }
    });

    doc.querySelectorAll('p').forEach((paragraph) => {
      const text = String(paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasMedia = paragraph.querySelector('img, video, audio');
      const brCount = paragraph.querySelectorAll('br').length;

      if (!text && !hasMedia && (brCount > 0 || paragraph.children.length === 0)) {
        paragraph.remove();
      }
    });

    return fallbackCleanup(doc.body.innerHTML);
  } catch {
    return fallbackCleanup(html);
  }
};

/**
 * ShortMessageEditor - Editor cho KET/PET Part 7 Writing Task
 * Giáo viên tạo đề yêu cầu học sinh viết tin nhắn ngắn/email
 * 
 * KET Part 7: 25-35 words
 * PET Part 7: 35-45 words hoặc 100 words (story)
 * 
 * Format:
 * - Situation: Mô tả tình huống
 * - Preview student view: Situation bên trái, vùng viết bên phải
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 */
const ShortMessageEditor = ({
  question = {},
  onChange,
  partIndex = 6, // Default to Part 7 (index 6)
  startingNumber = 31, // Default starting number
}) => {
  const situation = question.situation || '';
  const situationValue = typeof situation === 'string' ? situation : '';
  const normalizedSituationValue = normalizeSituationHtml(situationValue);
  const messageType = typeof question.messageType === 'string' && question.messageType.trim()
    ? question.messageType.trim()
    : 'email';
  const wordLimit = question.wordLimit || { min: 25, max: 35 };
  const sampleAnswer = question.sampleAnswer || '';

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

  const handleSituationChange = (content) => {
    const normalizedContent = normalizeSituationHtml(content || '');
    if (normalizedContent !== situationValue) {
      onChange('situation', normalizedContent);
    }
  };

  return (
    <div>
      {/* Header Badge */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <InlineIcon name="mail" size={22} style={{ color: "white" }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
              Part {partIndex + 1} - Writing Task
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.9 }}>
              Short Message / Email ({wordLimit.min}-{wordLimit.max} words)
            </p>
          </div>
          <span style={{
            fontSize: "13px",
            opacity: 0.9,
            fontWeight: 600,
          }}>
            Question {startingNumber}
          </span>
        </div>
      </div>

      {/* Word Limit */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>Giới hạn số từ</label>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="number"
            value={wordLimit.min}
            onChange={(e) => onChange('wordLimit', { ...wordLimit, min: parseInt(e.target.value) || 25 })}
            style={{ ...styles.input, width: "80px" }}
            min="10"
            max="200"
          />
          <span style={{ color: "#6b7280" }}>đến</span>
          <input
            type="number"
            value={wordLimit.max}
            onChange={(e) => onChange('wordLimit', { ...wordLimit, max: parseInt(e.target.value) || 35 })}
            style={{ ...styles.input, width: "80px" }}
            min="15"
            max="250"
          />
          <span style={{ color: "#6b7280" }}>từ</span>
        </div>
      </div>

      {/* Situation */}
      <div style={{ marginBottom: "16px" }} className="short-message-editor">
        <label style={styles.label}>Tình huống (Situation) *</label>
        <div style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          backgroundColor: "white",
        }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={normalizedSituationValue}
            onChange={handleSituationChange}
            placeholder="VD: You want to go to the cinema with your English friend Sam."
            modules={modules}
            formats={formats}
            style={{
              minHeight: "80px",
              backgroundColor: "white",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          Mô tả tình huống học sinh cần viết. Có thể thêm hình, định dạng text...
        </p>
      </div>

      {/* Sample Answer (for teacher reference) */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>
          Đáp án mẫu (Sample Answer) 
          <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "8px" }}>
            - tùy chọn, chỉ giáo viên xem
          </span>
        </label>
        <textarea
          value={sampleAnswer}
          onChange={(e) => onChange('sampleAnswer', e.target.value)}
          placeholder="VD: Hi Sam, Would you like to go and see the new Spider-Man film? Are you free on Saturday afternoon? Can you get the tickets? See you soon!"
          style={{
            ...styles.input,
            minHeight: "100px",
            resize: "vertical",
            backgroundColor: "#fef3c7",
            borderColor: "#fcd34d",
          }}
        />
        {sampleAnswer && (
          <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
            Sample: {sampleAnswer.trim().split(/\s+/).length} words
          </p>
        )}
      </div>

      {/* Preview */}
      {normalizedSituationValue && (
        <div style={{
          backgroundColor: "#f0f9ff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
          marginTop: "16px",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#0369a1" }}>
            Preview (Student View):
          </h4>
          
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}>
            {/* Part Header */}
            <div style={{
              backgroundColor: "#0e276f",
              color: "white",
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: 600,
            }}>
              Part {partIndex + 1}
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
            }}>
              <div style={{
                flex: "1 1 320px",
                padding: "20px",
                minWidth: 0,
              }}>
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{
                    margin: "0 0 12px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1f2937",
                  }}>
                    Situation:
                  </h4>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: "#374151",
                    }}
                    dangerouslySetInnerHTML={{ __html: normalizedSituationValue || '<em style="color: #9ca3af;">(Tình huống sẽ hiển thị ở đây)</em>' }}
                  />
                </div>
              </div>

              <div style={{
                flex: "1 1 280px",
                minWidth: 0,
                padding: "20px",
                borderLeft: "1px solid #e2e8f0",
                backgroundColor: "#f8fbff",
              }}>
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{
                    margin: "0 0 8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0c4a6e",
                  }}>
                    Write your {messageType}:
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#6b7280",
                  }}>
                    {wordLimit.min} words or more
                  </p>
                </div>

                <div style={{
                  minHeight: "220px",
                  padding: "16px",
                  border: "2px solid #0284c7",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  color: "#94a3b8",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  fontStyle: "italic",
                }}>
                  Write your {messageType} here ({wordLimit.min}-{wordLimit.max} words)...
                </div>

                <div style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "flex-end",
                  fontSize: "13px",
                  color: "#64748b",
                }}>
                  <div>
                    Words: <strong style={{ color: "#dc2626" }}>0</strong>
                  </div>
                </div>
              </div>
            </div>
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
    padding: "10px 12px",
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
    fontSize: "13px",
    color: "#374151",
  },
};

// Custom styles for ReactQuill in this editor
const quillStyles = `
  .short-message-editor .ql-container {
    min-height: 80px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .short-message-editor .ql-editor {
    min-height: 80px;
    background-color: #ffffff;
  }
  .short-message-editor .ql-editor p {
    margin: 0 0 6px;
    line-height: 1.6;
  }
  .short-message-editor .ql-editor p:last-child {
    margin-bottom: 0;
  }
  .short-message-editor .ql-editor p:empty,
  .short-message-editor .ql-editor p:has(> br:only-child) {
    display: none;
  }
  .short-message-editor .ql-editor ul,
  .short-message-editor .ql-editor ol {
    margin: 0 0 6px;
    padding-left: 1.5em;
  }
  .short-message-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .short-message-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .short-message-editor .ql-container.ql-snow:focus-within {
    background-color: #f5f3ff;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
  .short-message-editor .ql-editor:focus {
    background-color: #f5f3ff;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .short-message-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .short-message-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #ede9fe;
    border-color: #8b5cf6;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'short-message-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default ShortMessageEditor;
