import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Fill in the Blank Question Component
 * 
 * Dạng điền vào chỗ trống trong câu:
 * - Học sinh điền từ/cụm từ vào chỗ trống (_____)
 * - Có giới hạn số từ tối đa
 * - Preview hiển thị chỗ trống được highlight
 */

const FillBlankQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentTeal = '#17a2b8';

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#e8f4fc',
      borderRadius: '12px',
      border: `2px solid ${accentTeal}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentTeal}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentTeal,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentTeal,
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
    inputRow: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap'
    },
    inputGroup: {
      flex: 1,
      minWidth: '200px'
    },
    input: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: `2px solid ${accentTeal}`,
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    wordLimitBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      fontSize: '14px'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#d1ecf1',
      borderRadius: '8px',
      border: '1px solid #bee5eb'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#0c5460',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      fontSize: '14px',
      lineHeight: '1.8'
    },
    blankHighlight: {
      display: 'inline-block',
      padding: '2px 15px',
      backgroundColor: '#fff3cd',
      border: '2px dashed #ffc107',
      borderRadius: '4px',
      fontWeight: 'bold',
      margin: '0 4px'
    },
    answerBadge: {
      display: 'inline-block',
      padding: '6px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      borderRadius: '20px',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    tip: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#d1ecf1',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#0c5460',
      borderLeft: `4px solid ${accentTeal}`
    }
  };

  // Highlight blanks in preview
  const highlightBlanks = (text) => {
    if (!text) return '';
    return text.replace(/_{3,}/g, '<span style="display:inline-block;padding:2px 20px;background:#fff3cd;border:2px dashed #ffc107;border-radius:4px;font-weight:bold;">______</span>');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📝</span>
        <h4 style={styles.headerTitle}>Fill in the Blank</h4>
        <span style={styles.headerBadge}>IELTS Reading/Listening</span>
      </div>

      {/* Question with blank */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>✏️</span> Câu hỏi (dùng _____ để đánh dấu chỗ trống):
        </h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Ví dụ: The ancient Egyptians used _____ as a painkiller."
          showBlankButton={true}
        />
      </div>

      {/* Word Limit & Answer */}
      <div style={styles.section}>
        <div style={styles.inputRow}>
          {/* Word Limit */}
          <div style={styles.inputGroup}>
            <h5 style={styles.sectionTitle}>
              <span>🔢</span> Giới hạn từ:
            </h5>
            <div style={styles.wordLimitBox}>
              <span>No more than</span>
              <input
                type="number"
                value={question.maxWords || 3}
                onChange={(e) => handleChange('maxWords', Number(e.target.value) || 1)}
                min="1"
                max="10"
                style={{
                  width: '60px',
                  padding: '8px',
                  border: '2px solid #ffc107',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              />
              <span>words</span>
            </div>
          </div>

          {/* Correct Answer */}
          <div style={{ ...styles.inputGroup, flex: 2 }}>
            <h5 style={styles.sectionTitle}>
              <span>✅</span> Đáp án đúng:
            </h5>
            <input
              type="text"
              value={question.correctAnswer || ''}
              onChange={(e) => handleChange('correctAnswer', e.target.value)}
              placeholder="Nhập đáp án đúng (dùng | để tách nhiều biến thể)"
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {(question.questionText || question.correctAnswer) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>👁 Preview - Học sinh sẽ thấy:</h5>
          <div style={styles.previewContent}>
            {/* Question with highlighted blank */}
            <div style={{ marginBottom: '15px' }}>
              <div dangerouslySetInnerHTML={{ __html: highlightBlanks(question.questionText || '') }} />
            </div>

            {/* Word limit notice */}
            {question.maxWords && (
              <p style={{ 
                color: '#856404', 
                backgroundColor: '#fff3cd',
                padding: '8px 12px',
                borderRadius: '4px',
                margin: '10px 0',
                fontSize: '13px'
              }}>
                📏 Write <strong>NO MORE THAN {question.maxWords} WORDS</strong> for your answer.
              </p>
            )}

            {/* Answer */}
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
              <strong>✅ Đáp án:</strong>{' '}
              {question.correctAnswer ? (
                <span style={styles.answerBadge}>{question.correctAnswer}</span>
              ) : (
                <span style={{ color: '#999' }}>(Chưa nhập)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={styles.tip}>
        <strong>💡 Hướng dẫn:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Dùng dấu gạch dưới liên tục <strong>_____</strong> để tạo chỗ trống trong câu hỏi</li>
          <li>Nếu có nhiều đáp án đúng, dùng dấu <strong>|</strong> để tách (VD: willow|willow tree)</li>
          <li>Đặt giới hạn từ phù hợp với độ dài đáp án mong đợi</li>
        </ul>
      </div>
    </div>
  );
};

export default FillBlankQuestion;
