import React, { useState } from 'react';
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
import ClozeTestQuestion from './ClozeTestQuestion';
import SummaryCompletionQuestion from './SummaryCompletionQuestion';
import IELTSMatchingHeadingsQuestion from './IELTSMatchingHeadingsQuestion';
import { getDefaultQuestionData } from '../config/questionTypes';
import InlineIcon from './InlineIcon.jsx';

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
  const legacyQuestionTypes = [
    'multiple-choice',
    'multi-select',
    'fill-in-the-blanks',
    'matching',
    'true-false-not-given',
    'yes-no-not-given',
    'cloze-test',
    'paragraph-matching',
    'ielts-matching-headings',
    'sentence-completion',
    'short-answer',
    'summary-completion',
  ];

  // State to track which questions are expanded - first question is expanded by default
  const [expandedQuestions, setExpandedQuestions] = useState(() => {
    const initial = {};
    if (section?.questions && section.questions.length > 0) {
      initial[0] = true; // First question expanded by default
    }
    return initial;
  });

  const toggleQuestionExpand = (questionIndex) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions({});
  };

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
        <h5 style={{ margin: 0, color: primaryBlue, fontSize: '14px' }}>Section {sectionIndex + 1}</h5>
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
              Sao chép
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
            Xóa Section
          </button>
        </div>
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: '12px', position: 'relative', zIndex: 5 }}>
        <label style={{ fontWeight: '600', marginBottom: '6px', display: 'block', fontSize: '14px' }}>
          Tiêu đề Section:
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
        <label style={{ fontWeight: '600', marginBottom: '6px', display: 'block', fontSize: '14px' }}>
          Hướng dẫn (Instructions):
        </label>
        <QuillEditor
          value={section.sectionInstruction || ''}
          onChange={(value) => onSectionChange(passageIndex, sectionIndex, 'sectionInstruction', value)}
        />
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
          Gợi ý: dùng nút chèn ảnh trên toolbar để thêm hình ảnh hoặc diagram vào nội dung.
        </p>
      </div>

      {/* Questions in Section */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '12px', 
        borderRadius: '4px',
        marginBottom: '12px'
      }}>
        <h6 style={{ marginTop: 0, marginBottom: '12px', color: primaryBlue, fontSize: '14px', fontWeight: '600' }}>
          Câu hỏi trong Section ({section.questions?.length || 0})
        </h6>

        {section.questions?.map((question, questionIndex) => (
          <div key={questionIndex} style={{
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#fafafa'
          }}>
            {/* Question Header with Collapse/Expand */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: expandedQuestions[questionIndex] ? '12px' : '0',
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => toggleQuestionExpand(questionIndex)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: expandedQuestions[questionIndex] ? '#ffc107' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minWidth: '30px'
                }}
                title={expandedQuestions[questionIndex] ? 'Thu nhỏ' : 'Mở rộng'}
              >
                <InlineIcon name={expandedQuestions[questionIndex] ? 'chevron-down' : 'chevron-right'} size={12} style={{ color: 'white' }} />
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                Câu {question.questionNumber || '1'} <span style={{ color: '#0e276f', fontSize: '12px', fontWeight: 'normal' }}>({question.questionType === 'multiple-choice' ? 'Trắc nghiệm 1 đáp án' : question.questionType})</span>
              </span>
              {expandedQuestions[questionIndex] && (
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
                    Sao chép
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
                    Xóa
                  </button>
                </div>
              )}
            </div>

            {/* Question Content - Only show when expanded */}
            {expandedQuestions[questionIndex] && (
              <>
                {/* Question Number Input */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                    Số câu hỏi (Question Number): <span style={{ color: '#0e276f', fontSize: '12px', fontWeight: 'normal' }}>- {question.questionType === 'multiple-choice' ? 'Trắc nghiệm 1 đáp án' : question.questionType}</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px 0' }}>
                    Ví dụ: 38-40 hoặc 38, 39, 40 hoặc chỉ 38
                  </p>
                  <input
                    type="text"
                    placeholder="Ví dụ: 38-40 hoặc 38, 39, 40"
                    value={question.questionNumber || ''}
                    onChange={(e) => {
                      const input = e.target.value.trim();
                      const newQuestion = {
                        ...question,
                        questionNumber: input || '1'
                      };
                      onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', newQuestion);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '2px solid #0e276f',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>

                {/* Question Type Select */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                    Loại câu hỏi: {question.questionType || '(not set)'}
                  </label>
                  <select
                    value={question.questionType || 'multiple-choice'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const defaultObj = legacyQuestionTypes.includes(newType)
                        ? createDefaultQuestionByType(newType)
                        : getDefaultQuestionData(newType);
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
                    <option value="multiple-choice" title="Học sinh chọn 1 đáp án đúng từ 4-5 lựa chọn">Trắc nghiệm 1 đáp án</option>
                    <option value="multi-select" title="Học sinh chọn nhiều đáp án đúng (tối thiểu 2 đáp án)">Trắc nghiệm nhiều đáp án</option>
                    <option value="fill-in-the-blanks" title="Học sinh điền từ/cụm từ để hoàn thành câu (tối đa 3 từ)">Điền vào chỗ trống</option>
                    <option value="matching" title="Học sinh ghép các mục từ cột trái với cột phải (ghép cặp)">Ghép cặp / Combobox</option>
                    <option value="true-false-not-given" title="Học sinh chọn True (đúng), False (sai), hoặc Not Given (chưa đề cập)">True/False/Not Given</option>
                    <option value="yes-no-not-given" title="Học sinh chọn Yes (có), No (không), hoặc Not Given (chưa đề cập)">Yes/No/Not Given</option>
                    <option value="cloze-test" title="Học sinh điền từ vào các chỗ trống nhúng trong đoạn văn (Cloze Test)">Cloze Test - Điền chỗ trống trong đoạn</option>
                    <option value="summary-completion" title="Hoàn thành đoạn tóm tắt bằng cách ghi chữ cái A-L tương ứng (Summary Completion)">Summary Completion - Complete the summary (A-L)</option>
                    <option value="paragraph-matching" title="Học sinh tìm thông tin ở đoạn A-G để trả lời câu hỏi">Tìm thông tin ở đoạn nào (A-G)</option>
                    <option value="ielts-matching-headings" title="IX: Ghép mỗi đoạn văn (A-G) với 1 heading phù hợp (i-x)">IX Matching Headings</option>
                    <option value="sentence-completion" title="Học sinh hoàn thành câu bằng cách chọn từ từ danh sách gợi ý">Hoàn thành câu (chọn từ danh sách)</option>
                    <option value="short-answer" title="Học sinh viết câu trả lời ngắn (tối đa 3 từ)">Câu trả lời ngắn</option>
                  </select>
                  
                  {/* Help text for question types */}
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', padding: '8px', backgroundColor: '#f0f8ff', borderRadius: '4px', borderLeft: '3px solid #0e276f' }}>
                    {question.questionType === 'multiple-choice' && 'Học sinh chọn 1 đáp án đúng từ 4-5 lựa chọn.'}
                    {question.questionType === 'multi-select' && 'Học sinh chọn nhiều đáp án đúng (tối thiểu 2 đáp án).'}
                    {question.questionType === 'fill-in-the-blanks' && 'Học sinh điền từ hoặc cụm từ để hoàn thành câu (tối đa 3 từ).'}
                    {question.questionType === 'matching' && 'Học sinh ghép các mục từ cột trái với cột phải.'}
                    {question.questionType === 'true-false-not-given' && 'Học sinh chọn True, False hoặc Not Given.'}
                    {question.questionType === 'yes-no-not-given' && 'Học sinh chọn Yes, No hoặc Not Given.'}
                    {question.questionType === 'cloze-test' && 'Học sinh điền từ vào các chỗ trống nhúng trong đoạn văn bằng [BLANK].'}
                    {question.questionType === 'summary-completion' && 'Hoàn thành đoạn tóm tắt bằng các lựa chọn A-L và gán đáp án cho từng [BLANK].'}
                    {question.questionType === 'paragraph-matching' && 'Học sinh tìm thông tin ở đoạn A-G để trả lời câu hỏi.'}
                    {question.questionType === 'ielts-matching-headings' && 'Ghép mỗi đoạn văn (A-G) với 1 heading phù hợp; có thể có headings dư.'}
                    {question.questionType === 'sentence-completion' && 'Học sinh hoàn thành câu bằng cách chọn từ từ danh sách gợi ý.'}
                    {question.questionType === 'short-answer' && 'Học sinh viết câu trả lời ngắn (tối đa 3 từ).'}
                  </div>
                </div>

                {/* Question Editors by Type */}
                {(question.questionType || 'multiple-choice') === 'multiple-choice' && (
                  <MultipleChoiceQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                    type="abc"
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'multi-select' && (
                  <MultiSelectQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'fill-in-the-blanks' && (
                  <FillBlankQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'matching' && (
                  <ComboboxQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'true-false-not-given' && (
                  <TrueFalseNotGivenQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'yes-no-not-given' && (
                  <YesNoNotGivenQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'paragraph-matching' && (
                  <ParagraphMatchingQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'ielts-matching-headings' && (
                  <IELTSMatchingHeadingsQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                    questionNumbers={question.questionNumber}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'sentence-completion' && (
                  <SentenceCompletionQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'cloze-test' && (
                  <ClozeTestQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {(question.questionType || 'multiple-choice') === 'summary-completion' && (
                  <SummaryCompletionQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}



                {(question.questionType || 'multiple-choice') === 'short-answer' && (
                  <ShortAnswerQuestion
                    question={question}
                    onChange={(q) => onQuestionChange(passageIndex, sectionIndex, questionIndex, 'full', q)}
                  />
                )}

                {![...legacyQuestionTypes].includes(question.questionType || 'multiple-choice') && (
                  <div style={{ color: 'red', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
                    Unknown question type: {question.questionType}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add Question Button */}
        <button
          type="button"
          onClick={() => {
            onAddQuestion(passageIndex, sectionIndex);
            collapseAllQuestions();
          }}
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
          Thêm câu hỏi
        </button>
      </div>
    </div>
  );
};

export default QuestionSection;
