import React from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Paragraph Matching Question Component
 * 
 * Dạng tìm thông tin ở đoạn văn nào:
 * - Cho một statement/information
 * - Học sinh xác định thông tin đó ở đoạn nào (A, B, C, D, E, F, G...)
 * - Thường dùng trong bài đọc có nhiều đoạn
 */

const ParagraphMatchingQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentOrange = '#ea580c';

  // Available paragraph options
  const paragraphOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#fff7ed',
      borderRadius: '12px',
      border: `2px solid ${accentOrange}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentOrange}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentOrange,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentOrange,
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
    infoBox: {
      padding: '12px 16px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      marginBottom: '15px',
      fontSize: '13px',
      color: '#92400e',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    paragraphGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginTop: '10px'
    },
    paragraphOption: {
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: 'bold',
      transition: 'all 0.3s',
      border: '2px solid #ddd',
      backgroundColor: 'white'
    },
    paragraphOptionSelected: {
      backgroundColor: accentOrange,
      color: 'white',
      borderColor: accentOrange,
      transform: 'scale(1.1)',
      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#fed7aa',
      borderRadius: '8px',
      border: '1px solid #fdba74'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#9a3412',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      fontSize: '14px'
    },
    previewQuestion: {
      padding: '12px',
      backgroundColor: '#f8fafc',
      borderRadius: '6px',
      marginBottom: '12px',
      borderLeft: `4px solid ${accentOrange}`
    },
    answerBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      backgroundColor: '#22c55e',
      color: 'white',
      borderRadius: '50%',
      fontWeight: 'bold',
      fontSize: '18px'
    },
    helpSection: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#ffedd5',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#9a3412',
      borderLeft: `4px solid ${accentOrange}`
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🔍</span>
        <h4 style={styles.headerTitle}>Tìm thông tin ở đoạn nào (A-G)</h4>
        <span style={styles.headerBadge}>IELTS Reading</span>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <span>✓</span>
        <span>Học sinh tìm thông tin ở đoạn A-G để trả lời câu hỏi</span>
      </div>

      {/* Question/Statement */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>❓</span> Câu hỏi/Thông tin cần tìm:
        </h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="VD: ... a rejected explanation of why tiger attacks on humans are rare."
        />
      </div>

      {/* Paragraph Selection */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>📑</span> Chọn đoạn chứa thông tin (A, B, C, D, E, F, G...):
        </h5>
        
        <div style={styles.paragraphGrid}>
          {paragraphOptions.map((letter) => {
            const isSelected = question.correctAnswer === letter;
            return (
              <div
                key={letter}
                onClick={() => handleChange('correctAnswer', letter)}
                style={{
                  ...styles.paragraphOption,
                  ...(isSelected ? styles.paragraphOptionSelected : {}),
                  ':hover': {
                    borderColor: accentOrange,
                    backgroundColor: '#fff7ed'
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.target.style.borderColor = accentOrange;
                    e.target.style.backgroundColor = '#fff7ed';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.target.style.borderColor = '#ddd';
                    e.target.style.backgroundColor = 'white';
                  }
                }}
                title={`Chọn đoạn ${letter}`}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* Current Answer Display */}
        {question.correctAnswer && (
          <div style={{ 
            marginTop: '15px', 
            padding: '12px 20px',
            backgroundColor: '#dcfce7',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ color: '#166534', fontWeight: 'bold' }}>✅ Đáp án đã chọn:</span>
            <span style={styles.answerBadge}>{question.correctAnswer}</span>
          </div>
        )}
      </div>

      {/* Preview */}
      {question.questionText && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>👁 Preview - Học sinh sẽ thấy:</h5>
          <div style={styles.previewContent}>
            {/* Question */}
            <div style={styles.previewQuestion}>
              <div 
                dangerouslySetInnerHTML={{ __html: question.questionText }}
                style={{ marginBottom: '10px' }}
              />
              <em style={{ color: '#666', fontSize: '13px' }}>
                Which paragraph contains this information? Write the correct letter A-G.
              </em>
            </div>

            {/* Answer */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #ddd'
            }}>
              <strong>Đáp án:</strong>
              {question.correctAnswer ? (
                <span style={styles.answerBadge}>{question.correctAnswer}</span>
              ) : (
                <span style={{ color: '#999' }}>(Chưa chọn)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div style={styles.helpSection}>
        <strong>💡 Hướng dẫn sử dụng:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Nhập câu hỏi hoặc thông tin cần tìm vào ô text</li>
          <li>Click vào chữ cái (A-G) để chọn đoạn chứa thông tin</li>
          <li>Dạng này yêu cầu học sinh xác định vị trí thông tin trong bài đọc</li>
          <li>Thường dùng cho bài đọc có nhiều đoạn được đánh dấu A, B, C...</li>
        </ul>
      </div>
    </div>
  );
};

export default ParagraphMatchingQuestion;
