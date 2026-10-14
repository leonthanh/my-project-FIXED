import React, { useEffect, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";
import InlineIcon from "../../InlineIcon.jsx";

/**
 * LongTextMCEditor - KET Part 3: Long Text + Multiple Choice
 * 
 * Format mẫu Cambridge:
 * - 1 đoạn văn dài
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
  testType,
  sectionTitle = "",
  onSectionTitleChange = () => {},
}) => {
  const { quillRef, modules } = useQuillImageUpload();
  const safeQuestion = question && typeof question === 'object' && !Array.isArray(question) ? question : {};
  const passageTitle = safeQuestion?.passageTitle || '';
  const passage = safeQuestion?.passage || '';
  const passageValue = typeof passage === 'string' ? passage : '';
  const isGatewayReading = String(testType || '').trim().toLowerCase() === 'gateway-reading-writing'
    && (safeQuestion.gatewayReadingMode || String(sectionTitle || '').trim().toLowerCase() === 'reading');
  const isPet = String(testType || '').toLowerCase().includes('pet');
  const defaultOptionCount = isPet ? 4 : 3;
  const buildDefaultOptions = (count) => Array.from({ length: count }, (_, idx) => `${String.fromCharCode(65 + idx)}. `);
  const questions = useMemo(() => {
    if (Array.isArray(safeQuestion?.questions)) return safeQuestion.questions;
    const createBlankQuestion = () => ({
      questionText: '',
      options: Array.from({ length: defaultOptionCount }, (_, index) => `${String.fromCharCode(65 + index)}. `),
      correctAnswer: '',
    });
    return Array.from({ length: 7 }, createBlankQuestion);
  }, [safeQuestion?.questions, defaultOptionCount]);
  const maxOptionLength = Math.max(
    defaultOptionCount,
    ...questions.map((q) => (Array.isArray(q?.options) ? q.options.length : 0))
  );
  const optionLabels = ['A', 'B', 'C', 'D'].slice(0, maxOptionLength);

  useEffect(() => {
    const needsNormalize = questions.some((q) => (
      q?.answerType !== 'true-false'
      && (Array.isArray(q?.options) ? q.options.length : 0) < maxOptionLength
    ));
    if (!needsNormalize) return;

    const normalized = questions.map((q) => {
      if (q?.answerType === 'true-false') return q;
      const prevOptions = Array.isArray(q?.options) ? [...q.options] : [];
      while (prevOptions.length < maxOptionLength) {
        const label = String.fromCharCode(65 + prevOptions.length);
        prevOptions.push(`${label}. `);
      }
      return { ...q, options: prevOptions };
    });

    onChange("questions", normalized);
  }, [questions, maxOptionLength, onChange]);

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange("questions", newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const opt = optionLabels[optIndex];
    const nextQuestions = questions.map((q, idx) => {
      if (idx !== qIndex) return q;
      const prevOptions = Array.isArray(q?.options) ? q.options : buildDefaultOptions(maxOptionLength);
      const nextOptions = prevOptions.map((o, i) => (i === optIndex ? `${opt}. ${value}` : o));
      return { ...q, options: nextOptions };
    });
    onChange("questions", nextQuestions);
  };

  // Thêm câu hỏi mới
  const handleAddQuestion = () => {
    const newQuestions = [...questions, {
      questionText: '',
      options: buildDefaultOptions(maxOptionLength),
      correctAnswer: ''
    }];
    onChange("questions", newQuestions);
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (qIndex) => {
    if (questions.length <= 1) {
      alert('Phải có ít nhất 1 câu hỏi!');
      return;
    }
    const newQuestions = questions.filter((_, idx) => idx !== qIndex);
    onChange("questions", newQuestions);
  };

  const handleAddGatewayQuestion = (answerType) => {
    const question = answerType === 'true-false'
      ? { questionText: '', correctAnswer: '', answerType }
      : { questionText: '', options: buildDefaultOptions(3), correctAnswer: '', answerType: 'multiple-choice' };
    const nextQuestions = [...questions];
    if (answerType === 'true-false') {
      nextQuestions.push(question);
    } else {
      const firstTrueFalseIndex = nextQuestions.findIndex((item) => item?.answerType === 'true-false');
      nextQuestions.splice(firstTrueFalseIndex < 0 ? nextQuestions.length : firstTrueFalseIndex, 0, question);
    }
    onChange('questions', nextQuestions);
  };

  const handleDeleteGatewayQuestion = (questionIndex) => {
    const question = questions[questionIndex];
    const questionGroupCount = questions.filter((item) => (
      (item?.answerType === 'true-false') === (question?.answerType === 'true-false')
    )).length;
    if (questionGroupCount <= 1) return;
    onChange('questions', questions.filter((_, index) => index !== questionIndex));
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

  if (isGatewayReading) {
    const multipleChoiceQuestions = questions
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.answerType !== 'true-false');
    const trueFalseQuestions = questions
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.answerType === 'true-false');
    const inputStyle = { ...styles.input, marginBottom: 0 };
    const renderReadingQuestions = (groupQuestions, answerType) => groupQuestions.map(({ item, index }) => (
      <div
        key={`${answerType}-${index}`}
        style={{
          padding: '14px',
          marginBottom: '10px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ minWidth: '34px', padding: '6px', textAlign: 'center', borderRadius: '50%', background: '#059669', color: '#fff', fontWeight: 700 }}>
            {startingNumber + index}
          </span>
          <input
            type="text"
            value={item.questionText || ''}
            onChange={(event) => handleQuestionChange(index, 'questionText', event.target.value)}
            placeholder={`Câu hỏi ${startingNumber + index}`}
            aria-label={`Nội dung câu hỏi ${startingNumber + index}`}
            style={{ ...inputStyle, flex: 1 }}
          />
          {groupQuestions.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteGatewayQuestion(index)}
              aria-label={`Xóa câu hỏi ${startingNumber + index}`}
              style={{ border: '1px solid #fecaca', borderRadius: '6px', background: '#fff', color: '#b91c1c', padding: '7px 10px', cursor: 'pointer' }}
            >
              ×
            </button>
          )}
        </div>

        {answerType === 'true-false' ? (
          <div style={{ display: 'flex', gap: '10px', marginLeft: '44px' }}>
            {['T', 'F'].map((answer) => (
              <label key={answer} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', background: item.correctAnswer === answer ? '#dcfce7' : '#f8fafc', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`gateway-reading-answer-${index}`}
                  checked={item.correctAnswer === answer}
                  onChange={() => handleQuestionChange(index, 'correctAnswer', answer)}
                />
                {answer === 'T' ? 'True (T)' : 'False (F)'}
              </label>
            ))}
          </div>
        ) : (
          <div style={{ marginLeft: '44px' }}>
            {['A', 'B', 'C'].map((optionLabel, optionIndex) => (
              <div key={optionLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <span style={{ minWidth: '24px', fontWeight: 700, color: item.correctAnswer === optionLabel ? '#15803d' : '#475569' }}>
                  {optionLabel}.
                </span>
                <input
                  type="text"
                  value={item.options?.[optionIndex]
                    ? item.options[optionIndex].replace(/^[A-C]\.\s*/, '')
                    : ''}
                  onChange={(event) => handleOptionChange(index, optionIndex, event.target.value)}
                  placeholder={`Lựa chọn ${optionLabel}`}
                  aria-label={`Lựa chọn ${optionLabel} cho câu ${startingNumber + index}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`gateway-reading-answer-${index}`}
                    checked={item.correctAnswer === optionLabel}
                    onChange={() => handleQuestionChange(index, 'correctAnswer', optionLabel)}
                  />
                  Đúng
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    ));

    return (
      <div>
        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', borderRadius: '8px', marginBottom: '16px', color: '#fff' }}>
          <strong>Gateway Reading</strong>
          <span style={{ float: 'right' }}>Questions {startingNumber}-{startingNumber + questions.length - 1}</span>
        </div>

        <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <label style={styles.label}>Tiêu đề mục</label>
          <input
            type="text"
            value={sectionTitle}
            onChange={(event) => onSectionTitleChange(event.target.value)}
            style={{ ...styles.input, marginBottom: '14px' }}
          />
          <label style={styles.label}>Hướng dẫn ngắn – Reading A</label>
          <input
            type="text"
            value={safeQuestion.readingAInstruction || ''}
            onChange={(event) => onChange('readingAInstruction', event.target.value)}
            style={{ ...styles.input, marginBottom: '10px' }}
          />
          <label style={styles.label}>Ghi chú điểm – Reading A</label>
          <input
            type="text"
            value={safeQuestion.readingAScoreNote || ''}
            onChange={(event) => onChange('readingAScoreNote', event.target.value)}
            style={{ ...styles.input, marginBottom: '14px' }}
          />
          <label style={styles.label}>Hướng dẫn ngắn – Reading B</label>
          <input
            type="text"
            value={safeQuestion.readingBInstruction || ''}
            onChange={(event) => onChange('readingBInstruction', event.target.value)}
            style={{ ...styles.input, marginBottom: '10px' }}
          />
          <label style={styles.label}>Ghi chú điểm – Reading B</label>
          <input
            type="text"
            value={safeQuestion.readingBScoreNote || ''}
            onChange={(event) => onChange('readingBScoreNote', event.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={styles.label}>Tiêu đề bài đọc (tùy chọn)</label>
          <input
            type="text"
            value={passageTitle}
            onChange={(event) => onChange('passageTitle', event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ marginBottom: '20px' }} className="long-text-mc-editor">
          <label style={styles.label}>Bài đọc dùng chung cho Reading A và Reading B</label>
          <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff' }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              key={`gateway-reading-${partIndex}-${startingNumber}`}
              value={passageValue}
              onChange={(content) => onChange('passage', content || '')}
              placeholder="Nhập nội dung bài đọc..."
              modules={modules}
              formats={formats}
              style={{ minHeight: '240px', background: '#fff' }}
            />
          </div>
        </div>

        <section style={{ marginBottom: '20px', padding: '16px', border: '1px solid #d1fae5', borderRadius: '8px', background: '#f0fdf4' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#166534' }}>Reading A · Multiple Choice</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Questions {startingNumber}-{startingNumber + multipleChoiceQuestions.length - 1}</span>
            <button type="button" onClick={() => handleAddGatewayQuestion('multiple-choice')} style={{ padding: '7px 11px', border: 0, borderRadius: '6px', color: '#fff', background: '#059669', cursor: 'pointer' }}>+ Thêm câu A</button>
          </div>
          {renderReadingQuestions(multipleChoiceQuestions, 'multiple-choice')}
        </section>

        <section style={{ marginBottom: '20px', padding: '16px', border: '1px solid #bae6fd', borderRadius: '8px', background: '#f0f9ff' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#075985' }}>Reading B · True / False</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Questions {startingNumber + multipleChoiceQuestions.length}-{startingNumber + questions.length - 1}</span>
            <button type="button" onClick={() => handleAddGatewayQuestion('true-false')} style={{ padding: '7px 11px', border: 0, borderRadius: '6px', color: '#fff', background: '#0284c7', cursor: 'pointer' }}>+ Thêm câu B</button>
          </div>
          {renderReadingQuestions(trueFalseQuestions, 'true-false')}
        </section>

        <div style={{ padding: '16px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4' }}>
          <h3 style={{ margin: '0 0 12px', color: '#166534', fontSize: '14px' }}>Xem trước</h3>
          {passageTitle && <h4 style={{ margin: '0 0 10px', textAlign: 'center' }}>{passageTitle}</h4>}
          <div className="gateway-reading-preview" style={{ padding: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: passageValue }} />
          <h4 style={{ margin: '16px 0 8px' }}>{safeQuestion.readingAInstruction}</h4>
          {multipleChoiceQuestions.map(({ item, index }) => (
            <div key={`preview-a-${index}`} style={{ margin: '0 0 10px' }}>
              <strong>{startingNumber + index}. {item.questionText}</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginLeft: '18px' }}>
                {(item.options || []).map((option, optionIndex) => <span key={optionIndex}>{option}</span>)}
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'right', fontWeight: 600 }}>{safeQuestion.readingAScoreNote}</div>
          <h4 style={{ margin: '16px 0 8px' }}>{safeQuestion.readingBInstruction}</h4>
          {trueFalseQuestions.map(({ item, index }) => (
            <div key={`preview-b-${index}`} style={{ margin: '0 0 8px' }}>
              <strong>{startingNumber + index}. {item.questionText}</strong>
              <span style={{ marginLeft: '12px' }}>T / F</span>
            </div>
          ))}
          <div style={{ textAlign: 'right', fontWeight: 600 }}>{safeQuestion.readingBScoreNote}</div>
          <div style={{ marginTop: '12px', color: '#475569', fontSize: '12px' }}>
            Đáp án: {questions.map((item, index) => `${startingNumber + index}. ${item.correctAnswer || '?'}`).join(' · ')}
          </div>
        </div>
      </div>
    );
  }

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

      {/* Passage Title */}
      <div style={{ marginBottom: "12px" }}>
        <label style={styles.label}>Tiêu đề đoạn văn (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange("passageTitle", e.target.value)}
          placeholder="VD: Jack Calder"
          className="long-text-mc-question-input"
          style={styles.input}
        />
      </div>

      {/* Passage Text */}
      <div style={{ marginBottom: "20px" }} className="long-text-mc-editor">
        <label style={styles.label}>Nội dung đoạn văn *</label>
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
            placeholder="Nhập nội dung đoạn văn ở đây..."
            modules={modules}
            formats={formats}
            style={{
              minHeight: "200px",
              backgroundColor: "white",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          Có thể định dạng text, thêm link, list, hình ảnh. Nếu muốn trình bày hội thoại, nhập theo dạng "Tên: lời nói".
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
            {questions.length} Câu hỏi Multiple Choice
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
            Thêm câu hỏi
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
                <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
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
              {optionLabels.map((opt, optIdx) => (
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
                          : q.options[optIdx].replace(/^[A-D]\. /, "")
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
                    Đúng
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
          Đáp án:
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
