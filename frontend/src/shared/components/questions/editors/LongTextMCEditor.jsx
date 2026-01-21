import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";

/**
 * LongTextMCEditor - KET Part 3: Long Text + Multiple Choice
 * 
 * Format mẫu Cambridge:
 * - 1 đoạn văn dài (conversation/article/story)
 * - 5 câu hỏi multiple choice (A/B/C) về nội dung
 * 
 * VD:
 * Passage: [Cuộc hội thoại/bài viết dài]
 * Q11: What does Sarah want to do this weekend?
 *   A. Go shopping  B. Visit her grandmother  C. Stay at home ← Correct
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (thường 7)
 */
const LongTextMCEditor = ({
  question = {},
  onChange,
  startingNumber = 7,
  partIndex = 2, // Default to Part 3 (index 2)
}) => {
  const { quillRef, modules } = useQuillImageUpload();
  const safeQuestion = question && typeof question === 'object' && !Array.isArray(question) ? question : {};
  const passageTitle = safeQuestion?.passageTitle || '';
  const passage = safeQuestion?.passage || '';
  const passageValue = typeof passage === 'string' ? passage : '';
  const passageType = safeQuestion?.passageType || 'conversation'; // conversation, article, email, story
  const questions = Array.isArray(safeQuestion?.questions) ? safeQuestion.questions : [ 
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
    { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
  ];

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange("questions", newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const opt = ['A', 'B', 'C'][optIndex];
    const nextQuestions = questions.map((q, idx) => {
      if (idx !== qIndex) return q;
      const prevOptions = Array.isArray(q?.options) ? q.options : ['A. ', 'B. ', 'C. '];
      const nextOptions = prevOptions.map((o, i) => (i === optIndex ? `${opt}. ${value}` : o));
      return { ...q, options: nextOptions };
    });
    onChange("questions", nextQuestions);
  };

  // Thêm câu hỏi mới
  const handleAddQuestion = () => {
    const newQuestions = [...questions, {
      questionText: '',
      options: ['A. ', 'B. ', 'C. '],
      correctAnswer: ''
    }];
    onChange("questions", newQuestions);
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (qIndex) => {
    if (questions.length <= 1) {
      alert('⚠️ Phải có ít nhất 1 câu hỏi!');
      return;
    }
    const newQuestions = questions.filter((_, idx) => idx !== qIndex);
    onChange("questions", newQuestions);
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

  return (
    <div>
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#059669",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Long Text - Multiple Choice</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Questions {startingNumber}-{startingNumber + questions.length - 1}</span>
        </div>
      </div>

      {/* Passage Type Selector */}
      <div style={{ marginBottom: "16px" }}>
        <label style={styles.label}>📚 Loại văn bản</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { value: 'conversation', label: '💬 Hội thoại', color: '#8b5cf6' },
            { value: 'article', label: '📰 Bài báo', color: '#3b82f6' },
            { value: 'email', label: '📧 Email', color: '#06b6d4' },
            { value: 'story', label: '📖 Truyện', color: '#f59e0b' },
          ].map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange('passageType', type.value)}
              style={{
                padding: "6px 14px",
                borderRadius: "16px",
                border: passageType === type.value ? "none" : "1px solid #d1d5db",
                backgroundColor: passageType === type.value ? type.color : "white",
                color: passageType === type.value ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: passageType === type.value ? 600 : 400,
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Passage Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>📌 Tiêu đề đoạn văn (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange("passageTitle", e.target.value)}
          placeholder="VD: A conversation between Sarah and Tom"
          className="long-text-mc-question-input"
          style={styles.input}
        />
      </div>

      {/* Passage Text */}
      <div style={{ marginBottom: "20px" }} className="long-text-mc-editor">
        <label style={styles.label}>📝 Nội dung đoạn văn *</label>
        <div style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          backgroundColor: "white",
        }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            key={`long-text-mc-${partIndex}-${startingNumber}`}
            value={passageValue}
            onChange={(content) => onChange("passage", content || '')}
            placeholder={
              passageType === 'conversation' 
                ? "VD: Sarah: Hi Tom! What are you doing this weekend?\nTom: I'm not sure yet. Maybe visiting my grandmother..."
                : "Nhập nội dung đoạn văn ở đây..."
            }
            modules={modules}
            formats={formats}
            style={{
              minHeight: "200px",
              backgroundColor: "white",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Với hội thoại: Dùng format "Tên: Lời nói". Có thể định dạng text, thêm link, list...
        </p>
      </div>

      {/* Questions Section */}
      <div style={{
        padding: "16px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "16px" 
        }}>
          <h3 style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            ❓ {questions.length} Câu hỏi Multiple Choice
          </h3>
          <button
            type="button"
            onClick={handleAddQuestion}
            style={{
              padding: "6px 12px",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ➕ Thêm câu hỏi
          </button>
        </div>

        {questions.map((q, qIdx) => (
          <div key={qIdx} style={{
            padding: "16px",
            backgroundColor: "white",
            borderRadius: "8px",
            marginBottom: "12px",
            border: "1px solid #e5e7eb",
            position: "relative",
          }}>
            {/* Delete button */}
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteQuestion(qIdx)}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  padding: "4px 8px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                title="Xóa câu hỏi này"
              >
                ✕
              </button>
            )}
            
            {/* Question number & text */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "32px",
                height: "32px",
                backgroundColor: "#059669",
                color: "white",
                borderRadius: "50%",
                fontWeight: 700,
                fontSize: "14px",
              }}>
                {startingNumber + qIdx}
              </span>
              <input
                type="text"
                value={q.questionText}
                onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                placeholder={`Câu hỏi ${startingNumber + qIdx}...`}
                className="long-text-mc-question-input"
                style={{ ...styles.input, flex: 1, marginBottom: 0, fontWeight: 500 }}
              />
            </div>

            {/* Options */}
            <div style={{ marginLeft: "42px" }}>
              {['A', 'B', 'C'].map((opt, optIdx) => (
                <div key={opt} style={{ 
                  display: "flex", 
                  gap: "8px", 
                  marginBottom: "6px",
                  alignItems: "center",
                }}>
                  <span style={{
                    minWidth: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: q.correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
                    color: q.correctAnswer === opt ? "#16a34a" : "#6366f1",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}>
                    {opt}
                  </span>
                  <input
                    type="text"
                    value={
                      q.options?.[optIdx]
                        ? q.options[optIdx].startsWith(`${opt}. `)
                          ? q.options[optIdx].substring(3)
                          : q.options[optIdx].replace(/^[A-C]\. /, "")
                        : ""
                    }
                    onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                    placeholder={`Lựa chọn ${opt}`}
                    className="long-text-mc-option-input"
                    style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: "12px" }}
                  />
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    padding: "4px 8px",
                    backgroundColor: q.correctAnswer === opt ? "#dcfce7" : "#f3f4f6",
                    borderRadius: "4px",
                    fontSize: "11px",
                  }}>
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctAnswer === opt}
                      onChange={() => handleQuestionChange(qIdx, 'correctAnswer', opt)}
                      style={{ accentColor: "#22c55e" }}
                    />
                    ✓
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
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
        {questions.map((q, idx) => (
          <span key={idx} style={{
            display: "inline-block",
            padding: "4px 10px",
            backgroundColor: q.correctAnswer ? "#dcfce7" : "#fee2e2",
            borderRadius: "4px",
            marginRight: "8px",
            fontSize: "13px",
            fontWeight: 500,
          }}>
            {startingNumber + idx}: {q.correctAnswer || '?'}
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
  .long-text-mc-editor .ql-container {
    min-height: 200px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .long-text-mc-editor .ql-editor {
    min-height: 200px;
    background-color: #ffffff;
  }
  .long-text-mc-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .long-text-mc-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .long-text-mc-editor .ql-container.ql-snow:focus-within {
    background-color: #fffbeb;
    border-color: #fbbf24;
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
  }
  .long-text-mc-editor .ql-editor:focus {
    background-color: #fffbeb;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .long-text-mc-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .long-text-mc-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #fef3c7;
    border-color: #fbbf24;
  }
  
  /* Styles cho input fields */
  .long-text-mc-question-input:focus {
    background-color: #eff6ff !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    outline: none !important;
  }
  
  .long-text-mc-option-input:focus {
    background-color: #f0fdf4 !important;
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    outline: none !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'long-text-mc-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default LongTextMCEditor;
