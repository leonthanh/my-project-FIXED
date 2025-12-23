import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Yes/No/Not Given Question Component
 * 
 * Tương tự True/False/Not Given nhưng dùng cho:
 * - Quan điểm của tác giả (writer's views/claims)
 * - YES: Tác giả đồng ý với phát biểu
 * - NO: Tác giả không đồng ý với phát biểu
 * - NOT GIVEN: Không rõ quan điểm của tác giả
 */

const YesNoNotGivenQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
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
      backgroundColor: '#fff8f0',
      borderRadius: '12px',
      border: `2px solid ${warningOrange}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${warningOrange}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: warningOrange,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: warningOrange,
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
      backgroundColor: '#fff3e0',
      borderRadius: '8px',
      border: '1px solid #ff9800'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#e65100',
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
      backgroundColor: '#fff3e0',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#e65100',
      borderLeft: '4px solid #ff9800'
    }
  };

  const getAnswerOptionStyle = (isSelected, type) => ({
    flex: '1',
    minWidth: '120px',
    padding: '15px 20px',
    borderRadius: '8px',
    border: `3px solid ${isSelected 
      ? type === 'YES' ? successGreen 
      : type === 'NO' ? dangerRed 
      : warningOrange
      : '#ddd'}`,
    backgroundColor: isSelected 
      ? type === 'YES' ? '#d4edda' 
      : type === 'NO' ? '#f8d7da' 
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
    { value: 'YES', icon: '👍', label: 'YES', desc: 'Tác giả đồng ý' },
    { value: 'NO', icon: '👎', label: 'NO', desc: 'Tác giả không đồng ý' },
    { value: 'NOT GIVEN', icon: '🤷', label: 'NOT GIVEN', desc: 'Không rõ quan điểm' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>👍👎🤷</span>
        <h4 style={styles.headerTitle}>Yes / No / Not Given</h4>
        <span style={styles.headerBadge}>IELTS Reading</span>
      </div>

      {/* Question/Statement */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>📝</span> Phát biểu về quan điểm tác giả:
        </h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Nhập phát biểu về quan điểm/claims của tác giả..."
        />
      </div>

      {/* Answer Selection */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>✅</span> Chọn đáp án đúng:
        </h5>
        <div style={styles.answerOptions}>
          {answerTypes.map((type) => (
            <div
              key={type.value}
              style={getAnswerOptionStyle(question.correctAnswer === type.value, type.value)}
              onClick={() => handleChange('correctAnswer', type.value)}
            >
              <span style={{ fontSize: '24px' }}>{type.icon}</span>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{type.label}</span>
              <span style={{ fontSize: '11px', color: '#666' }}>{type.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {(question.questionText || question.correctAnswer) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>👁 Preview</h5>
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
              backgroundColor: question.correctAnswer === 'YES' ? '#d4edda' 
                : question.correctAnswer === 'NO' ? '#f8d7da' 
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
                  backgroundColor: question.correctAnswer === 'YES' ? successGreen 
                    : question.correctAnswer === 'NO' ? dangerRed 
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
        <strong>💡 Hướng dẫn IELTS:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li><strong>YES</strong>: Tác giả/người viết đồng ý với phát biểu (writer's views)</li>
          <li><strong>NO</strong>: Tác giả/người viết không đồng ý với phát biểu</li>
          <li><strong>NOT GIVEN</strong>: Không rõ quan điểm của tác giả về vấn đề này</li>
        </ul>
        <p style={{ margin: '8px 0 0 0', fontStyle: 'italic' }}>
          ⚠️ Khác với True/False/Not Given: Đây là về <strong>quan điểm</strong> của tác giả, không phải sự thật.
        </p>
      </div>
    </div>
  );
};

export default YesNoNotGivenQuestion;
