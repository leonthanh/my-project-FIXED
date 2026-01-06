import React from "react";

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
 * @param {number} props.startingNumber - Số câu bắt đầu (thường 11)
 */
const LongTextMCEditor = ({
  question,
  onChange,
  startingNumber = 11,
}) => {
  const passageTitle = question.passageTitle || '';
  const passage = question.passage || '';
  const passageType = question.passageType || 'conversation'; // conversation, article, email, story
  const questions = question.questions || [
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
    const newQuestions = [...questions];
    const opt = ['A', 'B', 'C'][optIndex];
    newQuestions[qIndex].options[optIndex] = `${opt}. ${value}`;
    onChange("questions", newQuestions);
  };

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
          }}>Part 3</span>
          <span style={{ fontWeight: 600 }}>Long Text - Multiple Choice</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Questions {startingNumber}-{startingNumber + 4}</span>
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
          style={styles.input}
        />
      </div>

      {/* Passage Text */}
      <div style={{ marginBottom: "20px" }}>
        <label style={styles.label}>📝 Nội dung đoạn văn *</label>
        <textarea
          value={passage}
          onChange={(e) => onChange("passage", e.target.value)}
          placeholder={
            passageType === 'conversation' 
              ? "Sarah: Hi Tom! What are you doing this weekend?\nTom: I'm not sure yet. Maybe visiting my grandmother.\nSarah: Oh, that sounds nice..."
              : "Paste nội dung đoạn văn ở đây..."
          }
          style={{
            ...styles.input,
            minHeight: "200px",
            fontFamily: passageType === 'conversation' ? "'Courier New', monospace" : "inherit",
            lineHeight: "1.8",
          }}
        />
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          💡 Với hội thoại: Dùng format "Tên: Lời nói" mỗi dòng
        </p>
      </div>

      {/* Questions Section */}
      <div style={{
        padding: "16px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#374151" }}>
          ❓ 5 Câu hỏi Multiple Choice
        </h3>

        {questions.map((q, qIdx) => (
          <div key={qIdx} style={{
            padding: "16px",
            backgroundColor: "white",
            borderRadius: "8px",
            marginBottom: "12px",
            border: "1px solid #e5e7eb",
          }}>
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
                    value={q.options?.[optIdx]?.replace(`${opt}.`, "").replace(`${opt}`, "").trim() || ""}
                    onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                    placeholder={`Lựa chọn ${opt}`}
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

export default LongTextMCEditor;
