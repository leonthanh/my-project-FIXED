import React from 'react';
import QuillEditor from './QuillEditor';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import FillBlankQuestion from './FillBlankQuestion';
import ComboboxQuestion from './ComboboxQuestion';
import TrueFalseNotGivenQuestion from './TrueFalseNotGivenQuestion';
import YesNoNotGivenQuestion from './YesNoNotGivenQuestion';
import ParagraphMatchingQuestion from './ParagraphMatchingQuestion';
import SentenceCompletionQuestion from './SentenceCompletionQuestion';
import ShortAnswerQuestion from './ShortAnswerQuestion';
import ParagraphFillBlanksQuestion from './ParagraphFillBlanksQuestion';

const QuestionSection = ({
  passageIndex,
  sectionIndex,
  section,
  onSectionChange,
  onAddQuestion,
  onDeleteQuestion,
  onCopyQuestion,
  onCopySection,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px', flexWrap: 'wrap' }}>
        <h5 style={{ margin: 0, color: primaryBlue }}>📌 Section {sectionIndex + 1}</h5>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onCopySection && (
            <button
              type="button"
              onClick={() => onCopySection(passageIndex, sectionIndex)}
              title="Sao chép Section này"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1a3a8a'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0e276f'}
            >
              📋 Sao chép
            </button>
          )}
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
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c60'}
            onMouseLeave={(e) => e.target.style.backgroundColor = dangerRed}
          >
            🗑 Xóa Section
          </button>
        </div>
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: '12px', position: 'relative', zIndex: 5 }}>
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
            border: '2px solid #0e276f',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            cursor: 'text',
            position: 'relative',
            zIndex: 5
          }}
          autoComplete="off"
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
      <div style={{ marginBottom: '15px', position: 'relative', zIndex: 5 }}>
        <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          🖼️ Hình ảnh/Diagram (nếu có):
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onSectionChange(passageIndex, sectionIndex, 'sectionImage', e.target.files[0])}
          style={{
            padding: '8px',
            border: '2px solid #0e276f',
            borderRadius: '4px',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 5,
            backgroundColor: '#fff'
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onCopyQuestion(passageIndex, sectionIndex, questionIndex)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#0e276f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Copy câu hỏi này"
                >
                  📋 Copy
                </button>
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
            </div>

            {/* Question Number Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                Số câu hỏi (Question Number):
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={question.questionNumber || 1}
                onChange={(e) => {
                  const newQuestion = {
                    ...question,
                    questionNumber: parseInt(e.target.value) || 1
                  };
                  onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', newQuestion);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '2px solid #0e276f',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Ví dụ: 1, 8, 14..."
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                💡 Nhập số câu hỏi thứ mấy (ví dụ: Câu 1-7 = nhập từ 1 đến 7)
              </p>
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
                <option value="yes-no-not-given">Yes/No/Not Given</option>
                <option value="paragraph-fill-blanks">Đoạn văn - Điền chỗ trống</option>
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

            {question.questionType === 'yes-no-not-given' && (
              <YesNoNotGivenQuestion
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

            {question.questionType === 'paragraph-fill-blanks' && (
              <ParagraphFillBlanksQuestion
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
