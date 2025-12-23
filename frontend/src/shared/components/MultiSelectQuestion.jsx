import React from 'react';

const MultiSelectQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>❌ Error: Question object missing</div>;
  }

  const options = question.options || [''];

  const handleChange = (field, value) => {
    onChange({
      ...question,
      [field]: value
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
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
    },
    checkboxGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginTop: '10px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
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

      <label style={styles.label}>🔤 Các lựa chọn (A-E):</label>
      {options.map((option, index) => (
        <div key={index} style={styles.option}>
          <span style={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
          <input
            type="text"
            value={option}
            onChange={e => handleOptionChange(index, e.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
            placeholder={`Nhập lựa chọn ${String.fromCharCode(65 + index)}`}
          />
        </div>
      ))}

      <label style={styles.label}>✅ Đáp án đúng (chọn 2-3 đáp án):</label>
      <div style={styles.checkboxGroup}>
        {options.map((_, index) => (
          <label key={index} style={styles.checkbox}>
            <input
              type="checkbox"
              checked={question.correctAnswer?.includes(String.fromCharCode(65 + index))}
              onChange={e => {
                const letter = String.fromCharCode(65 + index);
                let newAnswer = question.correctAnswer || '';
                if (e.target.checked) {
                  newAnswer += letter;
                } else {
                  newAnswer = newAnswer.replace(letter, '');
                }
                handleChange('correctAnswer', newAnswer.split('').sort().join(''));
              }}
            />
            {String.fromCharCode(65 + index)}
          </label>
        ))}
      </div>

      {/* Preview */}
      <div style={{ marginTop: '15px' }}>
        <label style={styles.label}>👁 Preview:</label>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px' }}>
          <p>{question.questionText}</p>
          <p style={{ color: '#666' }}>Choose TWO letters, A-E.</p>
          {options.map((option, index) => (
            <div key={index} style={{ margin: '8px 0' }}>
              <span style={{ marginRight: '10px', fontWeight: 'bold' }}>
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </div>
          ))}
          {question.correctAnswer && (
            <p style={{ color: 'green', marginTop: '10px' }}>
              Đáp án: {question.correctAnswer.split('').join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSelectQuestion;
