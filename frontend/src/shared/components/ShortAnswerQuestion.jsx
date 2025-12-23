import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Short Answer Question Component
 * 
 * Dạng câu hỏi trong IELTS Reading/Listening:
 * - Học sinh trả lời ngắn gọn (thường 1-3 từ)
 * - Có giới hạn số từ tối đa
 * - Hỗ trợ nhiều đáp án đúng (variations)
 */

const ShortAnswerQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentPurple = '#6f42c1';

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f5f0ff',
      borderRadius: '12px',
      border: `2px solid ${accentPurple}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentPurple}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentPurple,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentPurple,
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
    inputGroup: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap'
    },
    inputWrapper: {
      flex: '1',
      minWidth: '200px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: 'bold',
      fontSize: '12px',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: `2px solid ${accentPurple}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: `2px solid ${accentPurple}`,
      fontSize: '14px',
      minHeight: '80px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      resize: 'vertical'
    },
    wordLimitBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 15px',
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#ede7f6',
      borderRadius: '8px',
      border: '1px solid #9575cd'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: accentPurple,
      fontSize: '14px',
      fontWeight: 'bold'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      fontSize: '13px',
      lineHeight: '1.6'
    },
    answerVariants: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '10px'
    },
    variantBadge: {
      padding: '6px 12px',
      backgroundColor: '#28a745',
      color: 'white',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    tip: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#ede7f6',
      borderRadius: '6px',
      fontSize: '12px',
      color: accentPurple,
      borderLeft: `4px solid ${accentPurple}`
    }
  };

  // Parse answer variants
  const answerVariants = (question.correctAnswer || '').split('|').filter(a => a.trim());

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>✍️</span>
        <h4 style={styles.headerTitle}>Short Answer Question</h4>
        <span style={styles.headerBadge}>IELTS Reading/Listening</span>
      </div>

      {/* Question */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>📝</span> Câu hỏi:
        </h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Nhập câu hỏi yêu cầu trả lời ngắn..."
        />
      </div>

      {/* Word Limit & Answer */}
      <div style={styles.section}>
        <div style={styles.inputGroup}>
          {/* Word Limit */}
          <div style={styles.inputWrapper}>
            <h5 style={styles.sectionTitle}>
              <span>🔢</span> Giới hạn từ:
            </h5>
            <div style={styles.wordLimitBadge}>
              <span>No more than</span>
              <input
                type="number"
                value={question.maxWords || 3}
                onChange={(e) => handleChange('maxWords', Number(e.target.value) || 1)}
                min="1"
                max="10"
                style={{
                  width: '50px',
                  padding: '5px',
                  border: '2px solid #ffc107',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              />
              <span>words</span>
            </div>
          </div>

          {/* Answer */}
          <div style={{ ...styles.inputWrapper, flex: 2 }}>
            <h5 style={styles.sectionTitle}>
              <span>✅</span> Đáp án đúng:
            </h5>
            <textarea
              value={question.correctAnswer || ''}
              onChange={(e) => handleChange('correctAnswer', e.target.value)}
              placeholder="Nhập đáp án. Nếu có nhiều biến thể đúng, cách nhau bằng dấu |&#10;Ví dụ: willow tree|willow bark|the willow"
              style={styles.textarea}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {(question.questionText || question.correctAnswer) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>👁 Preview</h5>
          <div style={styles.previewContent}>
            <div style={{ marginBottom: '15px' }}>
              <strong>Question:</strong>
              <div dangerouslySetInnerHTML={{ __html: question.questionText || '<em>(Chưa nhập)</em>' }} />
            </div>
            
            <div style={{ 
              padding: '10px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              <strong>📏 Word Limit:</strong> No more than <strong>{question.maxWords || 3}</strong> words
            </div>

            <div>
              <strong>✅ Accepted Answers:</strong>
              <div style={styles.answerVariants}>
                {answerVariants.length > 0 ? (
                  answerVariants.map((variant, idx) => (
                    <span key={idx} style={styles.variantBadge}>
                      {variant.trim()}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#999' }}>(Chưa nhập đáp án)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={styles.tip}>
        <strong>💡 Hướng dẫn:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Nếu có nhiều đáp án đúng (biến thể), dùng dấu <strong>|</strong> để tách</li>
          <li>Ví dụ: <code>willow tree|willow bark</code> (cả 2 đều đúng)</li>
          <li>Hệ thống sẽ chấm đúng nếu học sinh nhập bất kỳ biến thể nào</li>
        </ul>
      </div>
    </div>
  );
};

export default ShortAnswerQuestion;
