import React from 'react';
import FormQuestion from './FormQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import ComboboxQuestion from './ComboboxQuestion';
import DragDropQuestion from './DragDropQuestion';
import PartInstructions from './PartInstructions';

const ListeningPart = ({ 
  partNumber, 
  partType, 
  questions, 
  instruction,
  onTypeChange, 
  onInstructionChange,
  onQuestionChange 
}) => {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#0e276f', marginRight: '20px', marginBottom: '0' }}>
            Part {partNumber}:
          </h3>
          <select
            value={partType}
            onChange={(e) => onTypeChange(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="fill">Điền vào chỗ trống</option>
            <option value="radio">Chọn 1 đáp án (Radio)</option>
            <option value="checkbox">Chọn nhiều đáp án (Checkbox)</option>
            <option value="combobox">Chọn từ danh sách (Combobox)</option>
            <option value="dragdrop-text">Kéo thả cụm từ</option>
            <option value="dragdrop-image">Kéo thả hình ảnh</option>
          </select>
        </div>

        <PartInstructions
          partNumber={partNumber}
          value={instruction}
          onChange={onInstructionChange}
        />
      </div>

      {questions.map((question, index) => (
        <div key={index} style={{
          marginBottom: '30px',
          padding: '15px',
          border: '1px solid #eee',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h4 style={{ marginTop: 0 }}>
            Câu {index + ((partNumber - 1) * 10) + 1}
          </h4>
          
          {partType === 'fill' && (
            <FormQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
            />
          )}
          {partType === 'radio' && (
            <MultipleChoiceQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
              optionsCount={partNumber === 4 ? 4 : 3}
            />
          )}
          {partType === 'checkbox' && (
            <MultiSelectQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
            />
          )}
          {partType === 'combobox' && (
            <ComboboxQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
            />
          )}
          {partType === 'dragdrop-text' && (
            <DragDropQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
              type="text"
            />
          )}
          {partType === 'dragdrop-image' && (
            <DragDropQuestion
              question={question}
              onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
              type="image"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ListeningPart;
