import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS True/False/Not Given Question Component
 * 
 * Dạng câu hỏi phổ biến trong IELTS Reading:
 * - Học sinh đọc phát biểu và chọn TRUE, FALSE, hoặc NOT GIVEN
 * - TRUE: Phát biểu khớp với thông tin trong bài đọc
 * - FALSE: Phát biểu trái ngược với thông tin trong bài đọc
 * - NOT GIVEN: Không có thông tin để xác nhận hoặc phủ nhận
 */

const TrueFalseNotGivenQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Theme colors
  const primaryBlue = '#0e276f';
  const successGreen = '#28a745';
  const dangerRed = '#dc3545';
  const warningOrange = '#fd7e14';

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f0f7ff',
      borderRadius: '12px',
      border: `2px solid ${primaryBlue}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${primaryBlue}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: primaryBlue,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: primaryBlue,
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
    answerOptions: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#e8f5e9',
      borderRadius: '8px',
      border: '1px solid #4caf50'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#2e7d32',
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
    tip: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#e3f2fd',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#1565c0',
      borderLeft: '4px solid #1565c0'
    }
  };

  const getAnswerOptionStyle = (isSelected, type) => ({
    flex: '1',
    minWidth: '120px',
    padding: '15px 20px',
    borderRadius: '8px',
    border: `3px solid ${isSelected 
      ? type === 'TRUE' ? successGreen 
      : type === 'FALSE' ? dangerRed 
      : warningOrange
      : '#ddd'}`,
    backgroundColor: isSelected 
      ? type === 'TRUE' ? '#d4edda' 
      : type === 'FALSE' ? '#f8d7da' 
      : '#fff3cd'
      : 'white',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  });

  const answerTypes = [
    { value: 'TRUE', label: 'TRUE', desc: 'Đúng với bài đọc' },
    { value: 'FALSE', label: 'FALSE', desc: 'Sai với bài đọc' },
    { value: 'NOT GIVEN', label: 'NOT GIVEN', desc: 'Không có thông tin' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h4 style={styles.headerTitle}>True / False / Not Given</h4>
        <span style={styles.headerBadge}>IELTS Reading</span>
      </div>

      {/* Question/Statement */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>Phát biểu (Statement):</h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Nhập phát biểu cần đánh giá True/False/Not Given..."
        />
      </div>

      {/* Answer Selection */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>Chọn đáp án đúng:</h5>
        <div style={styles.answerOptions}>
          {answerTypes.map((type) => (
            <div
              key={type.value}
              style={getAnswerOptionStyle(question.correctAnswer === type.value, type.value)}
              onClick={() => handleChange('correctAnswer', type.value)}
            >
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{type.label}</span>
              <span style={{ fontSize: '11px', color: '#666' }}>{type.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {(question.questionText || question.correctAnswer) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>Xem trước</h5>
          <div style={styles.previewContent}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Statement:</strong>
              <div dangerouslySetInnerHTML={{ __html: question.questionText || '<em>(Chưa nhập)</em>' }} />
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '10px',
              backgroundColor: question.correctAnswer === 'TRUE' ? '#d4edda' 
                : question.correctAnswer === 'FALSE' ? '#f8d7da' 
                : question.correctAnswer === 'NOT GIVEN' ? '#fff3cd' 
                : '#f8f9fa',
              borderRadius: '6px'
            }}>
              <strong>Answer:</strong>
              {question.correctAnswer ? (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  backgroundColor: question.correctAnswer === 'TRUE' ? successGreen 
                    : question.correctAnswer === 'FALSE' ? dangerRed 
                    : warningOrange,
                  color: 'white'
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
        <strong>Hướng dẫn IELTS:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li><strong>TRUE</strong>: Thông tin trong bài đọc khẳng định phát biểu là đúng</li>
          <li><strong>FALSE</strong>: Thông tin trong bài đọc khẳng định phát biểu là sai</li>
          <li><strong>NOT GIVEN</strong>: Không có thông tin trong bài để xác nhận hay phủ nhận</li>
        </ul>
      </div>
    </div>
  );
};

export default TrueFalseNotGivenQuestion;
