import React from 'react';
import QuillEditor from './QuillEditor';

const ParagraphMatchingQuestion = ({ question, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px'
    },
    label: { fontWeight: 'bold', marginBottom: '6px', display: 'block' },
    input: { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi/Thông tin cần tìm:</label>
      <QuillEditor
        value={question.questionText}
        onChange={(value) => handleChange('questionText', value)}
      />

      <label style={styles.label}>✅ Đoạn (A, B, C, D, E, F, G...):</label>
      <input
        type="text"
        placeholder="Nhập chữ cái đoạn (ví dụ: A, B, C)"
        className="form-control"
        value={question.correctAnswer || ''}
        onChange={e => handleChange('correctAnswer', e.target.value.toUpperCase())}
        style={styles.input}
        maxLength="1"
      />
    </div>
  );
};

export default ParagraphMatchingQuestion;
