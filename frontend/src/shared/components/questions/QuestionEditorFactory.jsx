import React from "react";
import {
  FillBlankEditor,
  MultipleChoiceEditor,
  MultiSelectEditor,
  MatchingEditor,
  FormCompletionEditor,
  NotesCompletionEditor,
  MapLabelingEditor,
  FlowchartEditor,
} from "./editors";

/**
 * QuestionEditorFactory - Render đúng editor component dựa trên question type
 * 
 * @param {string} questionType - ID của question type
 * @param {Object} question - Question data
 * @param {Function} onChange - Handler khi thay đổi field
 * @param {number} questionIndex - Index của câu hỏi
 * @param {number} startingNumber - Số câu bắt đầu
 */
const QuestionEditorFactory = ({
  questionType,
  question,
  onChange,
  questionIndex = 0,
  startingNumber = 1,
}) => {
  // Common props for all editors
  const commonProps = {
    question,
    onChange,
    startingNumber,
  };

  // Render appropriate editor based on question type
  switch (questionType) {
    case 'fill':
      return <FillBlankEditor {...commonProps} />;

    case 'abc':
      return (
        <MultipleChoiceEditor
          {...commonProps}
          questionIndex={questionIndex}
          optionLabels={['A', 'B', 'C']}
        />
      );

    case 'abcd':
      return (
        <MultipleChoiceEditor
          {...commonProps}
          questionIndex={questionIndex}
          optionLabels={['A', 'B', 'C', 'D']}
        />
      );

    case 'matching':
      return <MatchingEditor {...commonProps} />;

    case 'multi-select':
      return <MultiSelectEditor {...commonProps} />;

    case 'form-completion':
      return <FormCompletionEditor {...commonProps} />;

    case 'notes-completion':
      return <NotesCompletionEditor {...commonProps} />;

    case 'map-labeling':
      return <MapLabelingEditor {...commonProps} />;

    case 'flowchart':
      return <FlowchartEditor {...commonProps} />;

    // Placeholder for future types
    case 'true-false-not-given':
    case 'yes-no-not-given':
    case 'matching-headings':
    case 'paragraph-matching':
    case 'cloze-test':
    case 'sentence-completion':
    case 'sentence-transformation':
    case 'matching-pictures':
    case 'multiple-choice-pictures':
    case 'tick-cross':
      return (
        <div style={{
          padding: "20px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
          border: "1px solid #fcd34d",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, color: "#92400e" }}>
            🚧 Editor cho "{questionType}" đang được phát triển...
          </p>
        </div>
      );

    default:
      return <FillBlankEditor {...commonProps} />;
  }
};

export default QuestionEditorFactory;
