import React from 'react';
import QuillEditor from './QuillEditor';

const SentenceCompletionQuestion = ({ question, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const handleAddOption = () => {
    const newOptions = [...(question.options || []), ''];
    handleChange('options', newOptions);
  };

  const handleRemoveOption = (index) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px'
    },
    label: { fontWeight: 'bold', marginBottom: '6px', display: 'block' },
    input: { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' },
    optionContainer: { marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi/Câu cần hoàn thành:</label>
      <QuillEditor
        value={question.questionText}
        onChange={(value) => handleChange('questionText', value)}
        placeholder="Ví dụ: The ancient Egyptians used ............ as a painkiller"
      />

      <label style={styles.label}>📋 Danh sách lựa chọn (A, B, C, D...):</label>
      {(question.options || []).map((option, index) => (
        <div key={index} style={styles.optionContainer}>
          <span style={{ minWidth: '30px', fontWeight: 'bold' }}>
            {String.fromCharCode(65 + index)}.
          </span>
          <input
            type="text"
            placeholder={`Lựa chọn ${String.fromCharCode(65 + index)}`}
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => handleRemoveOption(index)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#e03',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddOption}
        style={{
          padding: '8px 16px',
          backgroundColor: '#0e276f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '10px',
          fontSize: '14px'
        }}
      >
        ➕ Thêm lựa chọn
      </button>

      <label style={styles.label}>✅ Đáp án đúng:</label>
      <select
        className="form-control"
        value={question.correctAnswer || ''}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        style={styles.input}
      >
        <option value="">-- Chọn đáp án --</option>
        {(question.options || []).map((_, index) => (
          <option key={index} value={String.fromCharCode(65 + index)}>
            {String.fromCharCode(65 + index)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SentenceCompletionQuestion;
