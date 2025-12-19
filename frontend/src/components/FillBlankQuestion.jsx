import React from 'react';
import QuillEditor from './QuillEditor';

const FillBlankQuestion = ({ question, onChange }) => {
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
      <label style={styles.label}>❓ Câu hỏi (Fill in the blank):</label>
      <QuillEditor
        value={question.questionText}
        onChange={(value) => handleChange('questionText', value)}
        showBlankButton={true}
      />

      <label style={styles.label}>🔢 Số từ tối đa (no more than):</label>
      <input
        type="number"
        className="form-control"
        value={question.maxWords || ''}
        onChange={e => handleChange('maxWords', Number(e.target.value) || 0)}
        placeholder="Số từ tối đa (ví dụ 3)"
        style={styles.input}
      />

      <label style={styles.label}>✅ Đáp án đúng (văn bản):</label>
      <input
        type="text"
        className="form-control"
        value={question.correctAnswer || ''}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        placeholder="Nhập đáp án đúng (nhỏ)"
        style={styles.input}
      />

      <div style={{ marginTop: 12 }}>
        <label style={styles.label}>👁 Preview:</label>
        <div style={{ backgroundColor: 'white', padding: 12, borderRadius: 4 }}>
          <p dangerouslySetInnerHTML={{ __html: (question.questionText || '').replace(/__+/g, '<strong>____</strong>') }} />
          {question.maxWords ? <p style={{ color: '#666' }}>No more than {question.maxWords} words.</p> : null}
          {question.correctAnswer ? <p style={{ color: 'green' }}>Answer: {question.correctAnswer}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default FillBlankQuestion;
