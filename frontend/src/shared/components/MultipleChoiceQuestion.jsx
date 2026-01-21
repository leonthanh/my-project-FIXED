import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Multiple Choice Question Component
 * 
 * Dạng chọn một hoặc nhiều đáp án đúng:
 * - Single choice: Chọn 1 đáp án đúng
 * - Multiple choice: Chọn nhiều đáp án đúng
 * - Thường có 4 lựa chọn (A, B, C, D)
 */

const MultipleChoiceQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Initialize options if empty
  const options = question.options || ['', '', '', ''];

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const addOption = () => {
    handleChange('options', [...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return; // Minimum 2 options
    const newOptions = options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  const toggleCorrectAnswer = (index) => {
    const letter = String.fromCharCode(65 + index); // A, B, C, D...
    if (question.multiSelect) {
      // Multiple selection mode
      let currentAnswers = question.correctAnswer ? question.correctAnswer.split(',') : [];
      if (currentAnswers.includes(letter)) {
        currentAnswers = currentAnswers.filter(a => a !== letter);
      } else {
        currentAnswers.push(letter);
        currentAnswers.sort();
      }
      handleChange('correctAnswer', currentAnswers.join(','));
    } else {
      // Single selection mode
      handleChange('correctAnswer', letter);
    }
  };

  const isCorrect = (index) => {
    const letter = String.fromCharCode(65 + index);
    if (!question.correctAnswer) return false;
    return question.correctAnswer.includes(letter);
  };

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentGreen = '#28a745';

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#e8f5e9',
      borderRadius: '12px',
      border: `2px solid ${accentGreen}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentGreen}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentGreen,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentGreen,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      marginLeft: 'auto'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 10px 0',
      color: primaryBlue,
      fontSize: '14px',
      fontWeight: 'bold'
    },
    modeSwitch: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px'
    },
    modeButton: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'all 0.3s'
    },
    optionCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 15px',
      backgroundColor: 'white',
      border: '2px solid #ddd',
      borderRadius: '8px',
      marginBottom: '10px',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    optionCardCorrect: {
      backgroundColor: '#d4edda',
      borderColor: accentGreen
    },
    optionLetter: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      flexShrink: 0
    },
    optionInput: {
      flex: 1,
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px'
    },
    removeBtn: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#dc3545',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px'
    },
    addBtn: {
      width: '100%',
      padding: '12px',
      border: '2px dashed #28a745',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      color: '#28a745',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#d4edda',
      borderRadius: '8px',
      border: '1px solid #c3e6cb'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#155724',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      fontSize: '14px'
    },
    tip: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#d4edda',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#155724',
      borderLeft: `4px solid ${accentGreen}`
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📋</span>
        <h4 style={styles.headerTitle}>Multiple Choice</h4>
        <span style={styles.headerBadge}>IELTS Reading</span>
      </div>

      {/* Mode Switch */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>🔄</span> Chế độ chọn đáp án:
        </h5>
        <div style={styles.modeSwitch}>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              backgroundColor: !question.multiSelect ? accentGreen : '#e9ecef',
              color: !question.multiSelect ? 'white' : '#495057'
            }}
            onClick={(e) => {
              e.preventDefault();
              handleChange('multiSelect', false);
            }}
          >
            ◉ Single Choice (1 đáp án)
          </button>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              backgroundColor: question.multiSelect ? accentGreen : '#e9ecef',
              color: question.multiSelect ? 'white' : '#495057'
            }}
            onClick={(e) => {
              e.preventDefault();
              handleChange('multiSelect', true);
            }}
          >
            ☑️ Multiple Choice (nhiều đáp án)
          </button>
        </div>
      </div>

      {/* Question */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>❓</span> Câu hỏi:
        </h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Nhập câu hỏi..."
        />
      </div>

      {/* Options */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>📝</span> Các lựa chọn (click để đánh dấu đáp án đúng):
        </h5>
        
        {options.map((option, index) => {
          const isCorrectOption = isCorrect(index);
          const letter = String.fromCharCode(65 + index);
          
          return (
            <div
              key={index}
              style={{
                ...styles.optionCard,
                ...(isCorrectOption ? styles.optionCardCorrect : {})
              }}
            >
              {/* Option Letter - Click to mark correct */}
              <div
                onClick={() => toggleCorrectAnswer(index)}
                style={{
                  ...styles.optionLetter,
                  backgroundColor: isCorrectOption ? accentGreen : '#e9ecef',
                  color: isCorrectOption ? 'white' : '#495057',
                  cursor: 'pointer'
                }}
                title={isCorrectOption ? 'Đáp án đúng' : 'Click để chọn là đáp án đúng'}
              >
                {isCorrectOption ? '✓' : letter}
              </div>

              {/* Option Label */}
              <span style={{ fontWeight: 'bold', color: '#495057' }}>{letter}.</span>

              {/* Option Input */}
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Nhập lựa chọn ${letter}...`}
                style={styles.optionInput}
              />

              {/* Remove Button */}
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  style={styles.removeBtn}
                  title="Xóa lựa chọn này"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Add Option Button */}
        {options.length < 8 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              addOption();
            }}
            style={styles.addBtn}
          >
            + Thêm lựa chọn
          </button>
        )}
      </div>

      {/* Preview */}
      {question.questionText && options.some(o => o) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>👁 Preview - Học sinh sẽ thấy:</h5>
          <div style={styles.previewContent}>
            {/* Question */}
            <div 
              style={{ marginBottom: '15px' }}
              dangerouslySetInnerHTML={{ __html: question.questionText }}
            />

            {/* Options */}
            <div style={{ marginBottom: '15px' }}>
              {options.map((option, index) => option && (
                <div
                  key={index}
                  style={{
                    padding: '10px 15px',
                    marginBottom: '8px',
                    backgroundColor: isCorrect(index) ? '#d4edda' : '#f8f9fa',
                    borderRadius: '6px',
                    border: isCorrect(index) ? `2px solid ${accentGreen}` : '1px solid #ddd'
                  }}
                >
                  <strong style={{ marginRight: '8px' }}>
                    {String.fromCharCode(65 + index)}.
                  </strong>
                  {option}
                  {isCorrect(index) && <span style={{ marginLeft: '10px', color: accentGreen }}>✓</span>}
                </div>
              ))}
            </div>

            {/* Correct Answer Summary */}
            <div style={{ paddingTop: '15px', borderTop: '1px solid #ddd' }}>
              <strong>✅ Đáp án đúng:</strong>{' '}
              {question.correctAnswer ? (
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: accentGreen,
                  color: 'white',
                  borderRadius: '20px',
                  fontWeight: 'bold'
                }}>
                  {question.correctAnswer}
                </span>
              ) : (
                <span style={{ color: '#999' }}>(Chưa chọn)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={styles.tip}>
        <strong>💡 Hướng dẫn:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Click vào chữ cái (A, B, C...) để đánh dấu đáp án đúng</li>
          <li>Ở chế độ Multiple Choice, có thể chọn nhiều đáp án đúng</li>
          <li>Nên có ít nhất 4 lựa chọn (A-D) cho câu hỏi IELTS chuẩn</li>
          <li>Đáp án đúng sẽ được highlight màu xanh</li>
        </ul>
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;
