import React, { useRef, useState } from "react";
import InlineIcon from "../../InlineIcon.jsx";

/**
 * MapLabelingEditor - Map/Plan Labeling question
 * Dùng cho: IELTS Listening Map Labeling
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {Object} props.styles - Custom styles (optional)
 */
const MapLabelingEditor = ({
  question,
  onChange,
  styles = {},
}) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(question?.imageUrl || '');

  const safeOnChange = (field, value) => {
    if (!onChange) return;
    if (typeof onChange === 'function' && onChange.length >= 2) {
      onChange(field, value);
    } else {
      onChange({ ...(question || {}), [field]: value });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        safeOnChange('imageUrl', reader.result);
        safeOnChange('imageFile', file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Default styles
  const defaultStyles = {
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
    deleteButton: {
      padding: "4px 8px",
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
    },
    addButton: {
      padding: "6px 12px",
      backgroundColor: "#f3f4f6",
      border: "1px dashed #d1d5db",
      borderRadius: "6px",
      color: "#6b7280",
      cursor: "pointer",
      fontSize: "12px",
      width: "100%",
      marginTop: "4px",
    },
    ...styles,
  };

  return (
    <div>
      {/* Info banner */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#dbeafe",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #3b82f6",
        fontSize: "12px",
      }}>
        <strong style={{ color: "#1d4ed8" }}>Map/Plan Labeling</strong>
        <p style={{ margin: "4px 0 0", color: "#1e40af" }}>
          Học sinh nhìn bản đồ và chọn vị trí đúng (A-H) cho mỗi địa điểm.
        </p>
      </div>

      <label style={defaultStyles.label}>Hướng dẫn</label>
      <input
        type="text"
        value={question.questionText || ""}
        onChange={(e) => safeOnChange("questionText", e.target.value)}
        placeholder="VD: Label the map below. Write the correct letter, A-H."
        style={defaultStyles.input}
      />

      <label style={defaultStyles.label}>URL hình ảnh bản đồ</label>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '8px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Tải lên hình
        </button>
        <span style={{ color: '#64748b', alignSelf: 'center' }}>hoặc</span>
        <input
          type="text"
          value={question.imageUrl || ''}
          onChange={(e) => { setPreviewUrl(e.target.value); safeOnChange('imageUrl', e.target.value); }}
          placeholder="https://example.com/map.png hoặc /uploads/images/map.png"
          style={{ ...defaultStyles.input, marginBottom: 0 }}
        />
      </div>

      {(previewUrl || question.imageUrl) && (
        <img
          src={previewUrl || question.imageUrl}
          alt="Map preview"
          style={{ maxWidth: "100%", maxHeight: "200px", marginBottom: "12px", borderRadius: "8px" }}
        />
      )} 

      <label style={defaultStyles.label}>Phạm vi câu hỏi</label>
      <input
        type="text"
        value={question.questionRange || ""}
        onChange={(e) => safeOnChange("questionRange", e.target.value)}
        placeholder="VD: 11-15"
        style={defaultStyles.input}
      />

      <label style={defaultStyles.label}>Các vị trí cần gắn nhãn</label>
      {(question.items || [{ label: "A", text: "" }]).map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <input
            type="text"
            value={item.label}
            onChange={(e) => {
              const newItems = [...(question.items || [])];
              newItems[idx] = { ...newItems[idx], label: e.target.value };
              safeOnChange("items", newItems);
            }}
            placeholder="A"
            style={{ ...defaultStyles.input, width: "50px", marginBottom: 0 }}
          />
          <input
            type="text"
            value={item.text}
            onChange={(e) => {
              const newItems = [...(question.items || [])];
              newItems[idx] = { ...newItems[idx], text: e.target.value };
              safeOnChange("items", newItems);
            }}
            placeholder="Mô tả vị trí (VD: Reception desk)"
            style={{ ...defaultStyles.input, flex: 1, marginBottom: 0 }}
          />
          {(question.items?.length || 1) > 1 && (
            <button
              type="button"
              onClick={() => {
                const newItems = (question.items || []).filter((_, i) => i !== idx);
                safeOnChange("items", newItems);
              }}
              style={defaultStyles.deleteButton}
            >
              <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const nextLabel = String.fromCharCode(65 + (question.items?.length || 0));
          safeOnChange("items", [...(question.items || []), { label: nextLabel, text: "" }]);
        }}
        style={defaultStyles.addButton}
      >
        + Thêm vị trí
      </button>

      <label style={{ ...defaultStyles.label, marginTop: "12px" }}>Đáp án (VD: 11-E, 12-A, 13-H)</label>
      <input
        type="text"
        value={question.correctAnswer || ""}
        onChange={(e) => safeOnChange("correctAnswer", e.target.value)}
        placeholder="11-E, 12-A, 13-H, 14-B, 15-G"
        style={defaultStyles.input}
      />
    </div>
  );
};

export default MapLabelingEditor;
