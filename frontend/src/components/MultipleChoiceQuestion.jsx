import React from 'react';

const MultipleChoiceQuestion = ({ question, onChange, type = 'abc' }) => {
  const handleChange = (field, value) => {
    onChange({
      ...question,
      [field]: value
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px'
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '5px',
      display: 'block'
    },
    input: {
      width: '100%',
      padding: '8px',
      marginBottom: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px'
    },
    option: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '8px',
      gap: '8px'
    },
    optionLabel: {
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0e276f',
      color: 'white',
      borderRadius: '50%',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi:</label>
      <textarea
        value={question.questionText}
        onChange={e => handleChange('questionText', e.target.value)}
        rows={3}
        style={styles.input}
        placeholder="Nhập nội dung câu hỏi"
      />

      <label style={styles.label}>🔤 Các lựa chọn:</label>
      {question.options.map((option, index) => (
        <div key={index} style={styles.option}>
          <span style={styles.optionLabel}>
            {type === 'abc' ? String.fromCharCode(65 + index) : String(index + 1)}
          </span>
          <input
            type="text"
            value={option}
            onChange={e => handleOptionChange(index, e.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
            placeholder={`Nhập lựa chọn ${type === 'abc' ? String.fromCharCode(65 + index) : index + 1}`}
          />
        </div>
      ))}

      <label style={styles.label}>✅ Đáp án đúng:</label>
      <select
        value={question.correctAnswer}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        style={styles.input}
      >
        <option value="">Chọn đáp án đúng</option>
        {question.options.map((_, index) => (
          <option key={index} value={type === 'abc' ? String.fromCharCode(65 + index) : index + 1}>
            {type === 'abc' ? String.fromCharCode(65 + index) : `Lựa chọn ${index + 1}`}
          </option>
        ))}
      </select>

      {/* Preview */}
      <div style={{ marginTop: '15px' }}>
        <label style={styles.label}>👁 Preview:</label>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px' }}>
          <p>{question.questionText}</p>
          {question.options.map((option, index) => (
            <div key={index} style={{ margin: '8px 0' }}>
              <span style={{ marginRight: '10px', fontWeight: 'bold' }}>
                {type === 'abc' ? String.fromCharCode(65 + index) : index + 1}.
              </span>
              {option}
            </div>
          ))}
          {question.correctAnswer && (
            <p style={{ color: 'green', marginTop: '10px' }}>
              Đáp án: {question.correctAnswer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;
