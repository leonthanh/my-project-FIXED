import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * SignMessageEditor - KET Part 1: Signs & Messages
 * Mỗi câu có 1 hình ảnh (biển báo/thông báo) + 3 options giải thích ý nghĩa
 * 
 * Format mẫu Cambridge:
 * - Hình: Biển báo "CAMPSITE: Groups of 4+ please call ahead"
 * - A. All campers must reserve a place in advance.
 * - B. Groups bigger than four are not allowed on this site.
 * - C. Groups of more than three should contact the campsite before arriving. ← Correct
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu hỏi (hiển thị)
 */
const SignMessageEditor = ({
  question = {},
  onChange,
  startingNumber = 1,
  partIndex = 0, // Default to Part 1 (index 0)
}) => {
  const imageUrl = question?.imageUrl || '';
  const imageAlt = question?.imageAlt || '';
  const signText = question?.signText || ''; // Optional: text on the sign
  const signTextValue = typeof signText === 'string' ? signText : '';
  const options = question?.options || ['A. ', 'B. ', 'C. '];
  const correctAnswer = question?.correctAnswer || ''; 

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
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #0e276f 0%, #1a3a8f 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "#e03",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Signs & Messages</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Question {startingNumber}</span>
        </div>
      </div>

      {/* Image Upload Section */}
      <div style={{
        padding: "16px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "2px dashed #cbd5e1",
      }}>
        <label style={styles.label}>
          🖼️ Hình ảnh biển báo/thông báo
        </label>
        
        {/* Image URL input */}
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onChange("imageUrl", e.target.value)}
          placeholder="Paste URL hình ảnh hoặc upload..."
          style={styles.input}
        />
        
        {/* Image preview */}
        {imageUrl && (
          <div style={{
            marginTop: "12px",
            padding: "8px",
            backgroundColor: "white",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}>
            <img
              src={imageUrl}
              alt={imageAlt || "Sign preview"}
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "4px",
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Sign text (optional - for reference) */}
        <div style={{ marginTop: "12px" }}>
          <label style={{ ...styles.label, color: "#64748b" }}>
            📝 Text trên biển (tùy chọn - để tham khảo)
          </label>
          <div className="sign-text-editor">
            <ReactQuill
              value={signTextValue}
              onChange={(value) => onChange("signText", value || '')}
              placeholder="VD: CAMPSITE - Groups of 4+ please call ahead"
              modules={modules}
              formats={formats}
              style={{ backgroundColor: "white", borderRadius: "6px", minHeight: "120px" }}
            />
          </div>
        </div>
      </div>

      {/* Options Section */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>
          📋 3 lựa chọn (giải thích ý nghĩa của biển báo)
        </label>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
          💡 Học sinh cần chọn câu diễn giải ĐÚNG ý nghĩa của biển báo/thông báo
        </p>

        {['A', 'B', 'C'].map((opt, idx) => (
          <div key={opt} style={{ 
            display: "flex", 
            gap: "8px", 
            marginBottom: "8px",
            alignItems: "center",
          }}>
            {/* Option Label */}
            <span style={{
              ...styles.optionLabel,
              backgroundColor: correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
              color: correctAnswer === opt ? "#16a34a" : "#6366f1",
              border: correctAnswer === opt ? "2px solid #22c55e" : "none",
            }}>
              {opt}
            </span>
            
            {/* Option Text */}
            <input
              type="text"
              value={options[idx]?.replace(`${opt}.`, "").replace(`${opt}`, "").trim() || ""}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[idx] = `${opt}. ${e.target.value}`;
                onChange("options", newOptions);
              }}
              placeholder={`Lựa chọn ${opt}...`}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
            
            {/* Correct Answer Radio */}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              padding: "6px 10px",
              backgroundColor: correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
              borderRadius: "6px",
              fontSize: "12px",
              color: correctAnswer === opt ? "#16a34a" : "#6b7280",
              border: correctAnswer === opt ? "1px solid #22c55e" : "1px solid #e5e7eb",
            }}>
              <input
                type="radio"
                name={`correct-${startingNumber}`}
                value={opt}
                checked={correctAnswer === opt}
                onChange={(e) => onChange("correctAnswer", e.target.value)}
                style={{ accentColor: "#22c55e" }}
              />
              ✓ Đúng
            </label>
          </div>
        ))}
      </div>

      {/* Preview */}
      {(imageUrl || options.some(o => o.length > 3)) && (
        <div style={{
          backgroundColor: "#f0fdf4",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              backgroundColor: "#0e276f",
              color: "white",
              borderRadius: "50%",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "12px",
            }}>
              {startingNumber}
            </div>

            {/* Image */}
            {imageUrl && (
              <div style={{ marginBottom: "16px" }}>
                <img
                  src={imageUrl}
                  alt="Sign"
                  style={{
                    maxWidth: "300px",
                    maxHeight: "180px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                  }}
                />
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {options.map((option, idx) => (
                <label 
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <input type="radio" name={`preview-${startingNumber}`} disabled />
                  <span style={{ fontSize: "14px" }}>{option || `${['A', 'B', 'C'][idx]}.`}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
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
  optionLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "32px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "14px",
  },
};

// CSS for sign text editor - minimal styling, let ReactQuill handle alignment
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .sign-text-editor .ql-editor {
    padding: 12px 15px;
    min-height: 80px;
  }
`;
if (!document.head.querySelector('style[data-sign-text-editor]')) {
  styleSheet.setAttribute('data-sign-text-editor', 'true');
  document.head.appendChild(styleSheet);
}

export default SignMessageEditor;
