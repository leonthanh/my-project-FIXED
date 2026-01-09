import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * ShortMessageEditor - Editor cho KET/PET Part 7 Writing Task
 * Giáo viên tạo đề yêu cầu học sinh viết tin nhắn ngắn/email
 * 
 * KET Part 7: 25-35 words
 * PET Part 7: 35-45 words hoặc 100 words (story)
 * 
 * Format:
 * - Situation: Mô tả tình huống
 * - Recipient: Người nhận (friend Sam, teacher, etc.)
 * - 3 bullet points: Những điều cần viết
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 */
const ShortMessageEditor = ({
  question,
  onChange,
  partIndex = 6, // Default to Part 7 (index 6)
  startingNumber = 31, // Default starting number
}) => {
  const situation = question.situation || '';
  const recipient = question.recipient || '';
  const messageType = question.messageType || 'email';
  const bulletPoints = question.bulletPoints || ['', '', ''];
  const wordLimit = question.wordLimit || { min: 25, max: 35 };
  const sampleAnswer = question.sampleAnswer || '';

  const handleBulletChange = (index, value) => {
    const newBullets = [...bulletPoints];
    newBullets[index] = value;
    onChange('bulletPoints', newBullets);
  };

  const addBulletPoint = () => {
    onChange('bulletPoints', [...bulletPoints, '']);
  };

  const removeBulletPoint = (index) => {
    if (bulletPoints.length <= 2) return; // Min 2 bullet points
    const newBullets = bulletPoints.filter((_, i) => i !== index);
    onChange('bulletPoints', newBullets);
  };

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link", "image"],
      ["clean"],
    ],
  };

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
          <span style={{ fontSize: "24px" }}>✉️</span>
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

      {/* Message Type */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>Loại tin nhắn</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { value: 'email', label: '📧 Email', color: '#3b82f6' },
            { value: 'note', label: '📝 Note', color: '#10b981' },
            { value: 'postcard', label: '🏝️ Postcard', color: '#f59e0b' },
            { value: 'message', label: '💬 Message', color: '#8b5cf6' },
          ].map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange('messageType', type.value)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: messageType === type.value ? "none" : "1px solid #d1d5db",
                backgroundColor: messageType === type.value ? type.color : "white",
                color: messageType === type.value ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: messageType === type.value ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {type.label}
            </button>
          ))}
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

      {/* Recipient */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>Người nhận</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => onChange('recipient', e.target.value)}
          placeholder="VD: your English friend Sam / your teacher"
          style={styles.input}
        />
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
            theme="snow"
            value={situation}
            onChange={(content) => onChange('situation', content)}
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
          💡 Mô tả tình huống học sinh cần viết. Có thể thêm hình, định dạng text...
        </p>
      </div>

      {/* Bullet Points */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>
          Yêu cầu (Bullet Points) *
        </label>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
          Những điều học sinh cần đề cập trong bài viết
        </p>
        
        {bulletPoints.map((bullet, index) => (
          <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <span style={{
              minWidth: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f3f4f6",
              borderRadius: "50%",
              fontSize: "12px",
              fontWeight: 600,
              color: "#6b7280",
            }}>
              •
            </span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => handleBulletChange(index, e.target.value)}
              placeholder={`VD: ${index === 0 ? 'say which film you want to see' : index === 1 ? 'suggest a day' : 'ask Sam to buy the tickets'}`}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
            {bulletPoints.length > 2 && (
              <button
                type="button"
                onClick={() => removeBulletPoint(index)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={addBulletPoint}
          style={{
            padding: "6px 12px",
            backgroundColor: "#f0fdf4",
            color: "#16a34a",
            border: "1px dashed #86efac",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            marginTop: "4px",
          }}
        >
          + Thêm bullet point
        </button>
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
            📊 Sample: {sampleAnswer.trim().split(/\s+/).length} words
          </p>
        )}
      </div>

      {/* Preview */}
      {(situation || bulletPoints.some(b => b)) && (
        <div style={{
          backgroundColor: "#f0f9ff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
          marginTop: "16px",
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#0369a1" }}>
            👁️ Preview (Student View):
          </h4>
          
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}>
            {/* Part Header */}
            <div style={{
              backgroundColor: "#0e276f",
              color: "white",
              padding: "8px 12px",
              borderRadius: "4px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: 600,
            }}>
              Part {partIndex + 1}
            </div>

            {/* Task Description */}
            <div 
              style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b" }}
              dangerouslySetInnerHTML={{ __html: situation || '<em style="color: #9ca3af;">(Tình huống sẽ hiển thị ở đây)</em>' }}
            />

            {/* Write instruction */}
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b" }}>
              Write {messageType === 'email' ? 'an email' : `a ${messageType}`} to {recipient || '...'}.
              In your {messageType}:
            </p>

            {/* Bullet points */}
            <ul style={{ 
              margin: "0 0 16px 0", 
              paddingLeft: "20px",
              color: "#1e293b",
              fontSize: "14px",
            }}>
              {bulletPoints.filter(b => b).map((bullet, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {bullet}
                </li>
              ))}
            </ul>

            {/* Word limit instruction */}
            <p style={{
              margin: 0,
              fontSize: "13px",
              color: "#64748b",
              fontWeight: 600,
            }}>
              Write {wordLimit.min}-{wordLimit.max} words.
            </p>

            {/* Writing Area Preview */}
            <div style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              border: "1px dashed #cbd5e1",
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: "12px", 
                color: "#94a3b8",
                fontStyle: "italic",
              }}>
                [Vùng viết của học sinh sẽ hiện ở đây]
              </p>
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
