import React from 'react';
import QuillEditor from './QuillEditor';

const TrueFalseNotGivenQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px',
      position: 'relative',
      zIndex: 5
    },
    label: { fontWeight: 'bold', marginBottom: '6px', display: 'block' },
    input: { 
      width: '100%', 
      padding: '8px', 
      marginBottom: '8px', 
      borderRadius: '4px', 
      border: '2px solid #0e276f',
      backgroundColor: '#fff',
      cursor: 'pointer',
      position: 'relative',
      zIndex: 5,
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi/Phát biểu:</label>
      <QuillEditor
        value={question.questionText}
        onChange={(value) => handleChange('questionText', value)}
      />

      <label style={styles.label}>✅ Đáp án đúng:</label>
      <select
        className="form-control"
        value={question.correctAnswer || ''}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        style={styles.input}
      >
        <option value="">-- Chọn đáp án --</option>
        <option value="TRUE">TRUE</option>
        <option value="FALSE">FALSE</option>
        <option value="NOT GIVEN">NOT GIVEN</option>
      </select>
    </div>
  );
};

export default TrueFalseNotGivenQuestion;
