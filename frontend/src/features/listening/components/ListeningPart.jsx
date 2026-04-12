import React from 'react';
import { 
  FormQuestion, 
  MultipleChoiceQuestion, 
  MultiSelectQuestion, 
  ComboboxQuestion, 
  DragDropQuestion, 
  PartInstructions,
  MapLabelingQuestion,
  FlowchartQuestion
} from '../../../shared/components';
import InlineIcon from '../../../shared/components/InlineIcon.jsx';

const ListeningPart = ({ 
  partNumber, 
  partType, 
  questions, 
  instruction,
  onTypeChange, 
  onInstructionChange,
  onQuestionChange,
  startFromNumber = 1,
  onAddOption,
  onRemoveOption,
  onRemoveQuestion
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
            <option value="map-labeling">Map/Plan Labeling</option>
            <option value="flowchart">Flowchart Completion</option>
            <option value="matching">Matching (A, B, C)</option>
          </select>
        </div>

        <PartInstructions
          partNumber={partNumber}
          value={instruction}
          onChange={onInstructionChange}
        />
      </div>

      {/* Map Labeling - Single question for whole part */}
      {partType === 'map-labeling' && (
        <MapLabelingQuestion
          question={questions[0] || { items: [], mapImageUrl: '' }}
          onChange={(field, value) => onQuestionChange(0, field, value)}
          mode="edit"
          questionNumber={startFromNumber}
        />
      )}

      {/* Flowchart - Single question for whole part */}
      {partType === 'flowchart' && (
        <FlowchartQuestion
          question={questions[0] || { steps: [], options: [] }}
          onChange={(updatedQuestion) => onQuestionChange(0, updatedQuestion)}
          mode="edit"
          questionNumber={startFromNumber}
        />
      )}

      {/* Matching questions (A, B, C style) */}
      {partType === 'matching' && questions.map((question, index) => (
        <div key={index} style={{
          marginBottom: '30px',
          padding: '15px',
          border: '1px solid #eee',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0 }}>
              Câu {index + startFromNumber}
            </h4>
            {onRemoveQuestion && (
              <button
                type="button"
                onClick={() => onRemoveQuestion(index)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  backgroundColor: '#e03',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="trash" size={12} style={{ color: 'white' }} />Xóa câu</span>
              </button>
            )}
          </div>
          <MultipleChoiceQuestion
            question={question}
            onChange={(updatedQuestion) => onQuestionChange(index, updatedQuestion)}
            optionsCount={3}
          />
        </div>
      ))}

      {/* Other question types */}
      {!['map-labeling', 'flowchart', 'matching'].includes(partType) && 
        questions.map((question, index) => (
        <div key={index} style={{
          marginBottom: '30px',
          padding: '15px',
          border: '1px solid #eee',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0 }}>
              Câu {index + startFromNumber}
            </h4>
            {onRemoveQuestion && (
              <button
                type="button"
                onClick={() => onRemoveQuestion(index)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  backgroundColor: '#e03',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="trash" size={12} style={{ color: 'white' }} />Xóa câu</span>
              </button>
            )}
          </div>
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
          {/* Parent-level option controls (Add/Remove) */}
          {Array.isArray(question.options) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => onAddOption && onAddOption(index)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>Thêm lựa chọn</button>
              <button type="button" onClick={() => onRemoveOption && onRemoveOption(index)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>Xóa lựa chọn cuối</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ListeningPart;
