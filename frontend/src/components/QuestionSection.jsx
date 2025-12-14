import React from 'react';
import QuillEditor from './QuillEditor';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import FillBlankQuestion from './FillBlankQuestion';
import ComboboxQuestion from './ComboboxQuestion';
import TrueFalseNotGivenQuestion from './TrueFalseNotGivenQuestion';
import ParagraphMatchingQuestion from './ParagraphMatchingQuestion';
import SentenceCompletionQuestion from './SentenceCompletionQuestion';
import ShortAnswerQuestion from './ShortAnswerQuestion';

const QuestionSection = ({
  passageIndex,
  sectionIndex,
  section,
  onSectionChange,
  onAddQuestion,
  onDeleteQuestion,
  onQuestionChange,
  onDeleteSection,
  createDefaultQuestionByType
}) => {
  const primaryBlue = '#0e276f';
  const dangerRed = '#e03';

  return (
    <div style={{
      border: `2px solid ${primaryBlue}`,
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      backgroundColor: '#f0f5ff'
    }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h5 style={{ margin: 0, color: primaryBlue }}>📌 Section {sectionIndex + 1}</h5>
        <button
          type="button"
          onClick={() => onDeleteSection(passageIndex, sectionIndex)}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: dangerRed,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑 Xóa Section
        </button>
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          📝 Tiêu đề Section:
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Questions 1-7: Matching Headings"
          value={section.sectionTitle || ''}
          onChange={(e) => onSectionChange(passageIndex, sectionIndex, 'sectionTitle', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Section Instructions */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          📋 Hướng dẫn (Instructions):
        </label>
        <QuillEditor
          value={section.sectionInstruction || ''}
          onChange={(value) => onSectionChange(passageIndex, sectionIndex, 'sectionInstruction', value)}
        />
      </div>

      {/* Section Image */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          🖼️ Hình ảnh/Diagram (nếu có):
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onSectionChange(passageIndex, sectionIndex, 'sectionImage', e.target.files[0])}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        {section.sectionImage && (
          <div style={{ marginTop: '10px' }}>
            <img
              src={typeof section.sectionImage === 'string' 
                ? section.sectionImage 
                : section.sectionImage instanceof File || section.sectionImage instanceof Blob
                  ? URL.createObjectURL(section.sectionImage)
                  : ''}
              alt="Section"
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
            />
          </div>
        )}
      </div>

      {/* Questions in Section */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '12px', 
        borderRadius: '4px',
        marginBottom: '12px'
      }}>
        <h6 style={{ marginTop: 0, marginBottom: '12px', color: primaryBlue }}>
          ❓ Câu hỏi trong Section ({section.questions?.length || 0})
        </h6>

        {section.questions?.map((question, questionIndex) => (
          <div key={questionIndex} style={{
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#fafafa'
          }}>
            {/* Question Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              {/* Hide question numbers - teachers manage numbering manually */}
              <button
                type="button"
                onClick={() => onDeleteQuestion(passageIndex, sectionIndex, questionIndex)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: dangerRed,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🗑 Xóa
              </button>
            </div>

            {/* Question Type Select */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                Loại câu hỏi:
              </label>
              <select
                value={question.questionType}
                onChange={(e) => {
                  const newType = e.target.value;
                  const defaultObj = createDefaultQuestionByType(newType);
                  const newQuestion = {
                    ...question,
                    ...defaultObj,
                    questionNumber: question.questionNumber
                  };
                  onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', newQuestion);
                }}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  width: '100%'
                }}
              >
                <option value="multiple-choice">Trắc nghiệm 1 đáp án</option>
                <option value="multi-select">Trắc nghiệm nhiều đáp án</option>
                <option value="fill-in-the-blanks">Điền vào chỗ trống</option>
                <option value="matching">Ghép cặp / Combobox</option>
                <option value="true-false-not-given">True/False/Not Given</option>
                <option value="paragraph-matching">Tìm thông tin ở đoạn nào (A-G)</option>
                <option value="sentence-completion">Hoàn thành câu (chọn từ danh sách)</option>
                <option value="short-answer">Câu trả lời ngắn</option>
              </select>
            </div>

            {/* Question Editors by Type */}
            {question.questionType === 'multiple-choice' && (
              <MultipleChoiceQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                type="abc"
              />
            )}

            {question.questionType === 'multi-select' && (
              <MultiSelectQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'fill-in-the-blanks' && (
              <FillBlankQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'matching' && (
              <ComboboxQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'true-false-not-given' && (
              <TrueFalseNotGivenQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'paragraph-matching' && (
              <ParagraphMatchingQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'sentence-completion' && (
              <SentenceCompletionQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}

            {question.questionType === 'short-answer' && (
              <ShortAnswerQuestion
                question={question}
                onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
              />
            )}
          </div>
        ))}

        {/* Add Question Button */}
        <button
          type="button"
          onClick={() => onAddQuestion(passageIndex, sectionIndex)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: primaryBlue,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          ➕ Thêm câu hỏi
        </button>
      </div>
    </div>
  );
};

export default QuestionSection;
