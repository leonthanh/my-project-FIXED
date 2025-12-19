import React from 'react';
import QuillEditor from './QuillEditor';

const ShortAnswerQuestion = ({ question, onChange }) => {
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
      marginBottom: '15px'
    },
    label: { fontWeight: 'bold', marginBottom: '6px', display: 'block' },
    input: { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi:</label>
      <QuillEditor
        value={question.questionText}
        onChange={(value) => handleChange('questionText', value)}
      />

      <label style={styles.label}>🔢 Số từ tối đa (no more than):</label>
      <input
        type="number"
        className="form-control"
        value={question.maxWords || ''}
        onChange={e => handleChange('maxWords', Number(e.target.value) || 0)}
        placeholder="Số từ tối đa (ví dụ 3)"
        style={styles.input}
        min="1"
      />

      <label style={styles.label}>✅ Đáp án đúng (có thể có nhiều biến thể):</label>
      <textarea
        className="form-control"
        value={question.correctAnswer || ''}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        placeholder="Nhập đáp án. Nếu có nhiều đáp án đúng, cách nhau bằng dấu | (ví dụ: willow tree|willow bark)"
        style={{...styles.input, minHeight: '80px'}}
      />
      <small style={{ color: '#666' }}>💡 Tip: Tách các đáp án bằng dấu | nếu có nhiều biến thể đúng</small>
    </div>
  );
};

export default ShortAnswerQuestion;
