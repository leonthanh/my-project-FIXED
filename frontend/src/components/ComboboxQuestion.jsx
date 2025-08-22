import React from 'react';

const ComboboxQuestion = ({ question, onChange, options = [] }) => {
  const handleQuestionChange = (e) => {
    onChange({
      ...question,
      questionText: e.target.value
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    onChange({
      ...question,
      options: newOptions
    });
  };

  const handleAnswerChange = (e) => {
    onChange({
      ...question,
      correctAnswer: e.target.value
    });
  };

  const handleAddOption = () => {
    onChange({
      ...question,
      options: [...question.options, '']
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    onChange({
      ...question,
      options: newOptions
    });
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Câu hỏi:
        </label>
        <textarea
          value={question.questionText}
          onChange={handleQuestionChange}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            minHeight: '60px'
          }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Các tùy chọn trong danh sách:
        </label>
        {question.options.map((option, index) => (
          <div key={index} style={{ display: 'flex', marginBottom: '5px' }}>
            <input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginRight: '10px'
              }}
              placeholder={`Tùy chọn ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => handleRemoveOption(index)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddOption}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '5px'
          }}
        >
          + Thêm tùy chọn
        </button>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Đáp án đúng:
        </label>
        <select
          value={question.correctAnswer}
          onChange={handleAnswerChange}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          <option value="">Chọn đáp án đúng</option>
          {question.options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ComboboxQuestion;
