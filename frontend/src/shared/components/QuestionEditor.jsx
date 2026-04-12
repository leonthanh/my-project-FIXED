// components/QuestionEditor.jsx
import React from 'react';
import InlineIcon from './InlineIcon.jsx';

const QuestionEditor = ({ question, onChange }) => {
  const handleChange = (field, value) => {
    const updated = { ...question, [field]: value };

    // Reset fields if switching between types
    if (field === 'questionType') {
      if (value === 'dragdrop') {
        updated.options = ['', '', '', '']; // words to drag
        updated.correctAnswer = '1,2,3,4'; // correct order
      } else if (value === 'fill') {
        updated.options = undefined;
        updated.correctAnswer = '';
      } else {
        updated.options = ['', '', '', ''];
        updated.correctAnswer = value === 'checkbox' ? '' : 'A';
      }
    }

    onChange(updated);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  };

  const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    display: 'block'
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="selector" size={14} />Loại câu hỏi:</label>
      <select
        value={question.questionType}
        onChange={(e) => handleChange('questionType', e.target.value)}
        style={{ ...inputStyle, marginBottom: '15px' }}
      >
        <option value="radio">Chọn 1 đáp án (Radio)</option>
        <option value="checkbox">Chọn nhiều đáp án (Checkbox)</option>
        <option value="fill">Điền vào chỗ trống</option>
        <option value="dropdown">Chọn từ danh sách (Combobox)</option>
        <option value="dragdrop">Kéo thả cụm từ</option>
      </select>

      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="writing" size={14} />Câu hỏi:</label>
      <textarea
        value={question.questionText}
        onChange={(e) => handleChange('questionText', e.target.value)}
        rows={3}
        style={{ ...inputStyle, marginBottom: '15px' }}
        placeholder={
          question.questionType === 'fill' 
            ? 'Ví dụ: The concert will start ___ 8 PM tonight.' 
            : 'Nhập câu hỏi...'
        }
      />

      {(question.questionType === 'radio' || 
        question.questionType === 'checkbox' || 
        question.questionType === 'dropdown' ||
        question.questionType === 'dragdrop') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <InlineIcon name={question.questionType === 'dragdrop' ? 'retry' : 'choice'} size={14} />
            {question.questionType === 'dragdrop' ? 'Các cụm từ để kéo thả:' : 'Các lựa chọn:'}
          </label>
          {question.options.map((opt, i) => (
            <input
              key={i}
              type="text"
              placeholder={
                question.questionType === 'dragdrop'
                  ? `Cụm từ ${i + 1}`
                  : `Lựa chọn ${String.fromCharCode(65 + i)}`
              }
              value={opt}
              onChange={e => handleOptionChange(i, e.target.value)}
              style={inputStyle}
            />
          ))}
        </div>
      )}

      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="correct" size={14} />Đáp án đúng:</label>
      <input
        type="text"
        placeholder={
          question.questionType === 'checkbox' 
            ? 'VD: A,C (nhiều đáp án, phân cách bởi dấu phẩy)'
            : question.questionType === 'fill'
            ? 'VD: at'
            : question.questionType === 'dragdrop'
            ? 'VD: 1,2,3,4 (thứ tự các cụm từ, phân cách bởi dấu phẩy)'
            : 'VD: A (một đáp án)'
        }
        value={question.correctAnswer}
        onChange={(e) => handleChange('correctAnswer', e.target.value)}
        style={inputStyle}
      />
    </div>
  );
};

export default QuestionEditor;
