import React, { useState } from 'react';

const DragDropQuestion = ({ question, onChange, type = 'text' }) => {

  const handleQuestionChange = (e) => {
    onChange({
      ...question,
      questionText: e.target.value
    });
  };

  const handleDragItemChange = (index, value) => {
    const newItems = [...question.dragItems];
    newItems[index] = value;
    onChange({
      ...question,
      dragItems: newItems
    });
  };

  const handleAddDragItem = () => {
    onChange({
      ...question,
      dragItems: [...(question.dragItems || []), type === 'image' ? '' : '']
    });
  };

  const handleRemoveDragItem = (index) => {
    const newItems = question.dragItems.filter((_, i) => i !== index);
    onChange({
      ...question,
      dragItems: newItems
    });
  };

  const handleCorrectOrderChange = (e) => {
    onChange({
      ...question,
      correctAnswer: e.target.value
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
          {type === 'image' ? 'Hình ảnh cần sắp xếp:' : 'Các cụm từ cần sắp xếp:'}
        </label>
        {(question.dragItems || []).map((item, index) => (
          <div key={index} style={{ display: 'flex', marginBottom: '5px' }}>
            {type === 'image' ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleDragItemChange(index, reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ flex: 1, marginRight: '10px' }}
                />
                {item && (
                  <img
                    src={item}
                    alt={`Item ${index + 1}`}
                    style={{
                      height: '50px',
                      marginRight: '10px',
                      border: '1px solid #ccc'
                    }}
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={item}
                onChange={(e) => handleDragItemChange(index, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginRight: '10px'
                }}
                placeholder={`Cụm từ ${index + 1}`}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemoveDragItem(index)}
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
          onClick={handleAddDragItem}
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
          + Thêm {type === 'image' ? 'hình ảnh' : 'cụm từ'}
        </button>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Thứ tự đúng (nhập số thứ tự cách nhau bởi dấu phẩy, ví dụ: 1,3,2,4):
        </label>
        <input
          type="text"
          value={question.correctAnswer}
          onChange={handleCorrectOrderChange}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
          placeholder="Ví dụ: 1,3,2,4"
        />
      </div>
    </div>
  );
};

export default DragDropQuestion;
