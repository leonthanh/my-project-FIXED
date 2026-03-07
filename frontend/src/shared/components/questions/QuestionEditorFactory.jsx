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
  ClozeTestEditor,
  SummaryCompletionEditor,
  SentenceTransformationEditor,
  ShortMessageEditor,
  TableCompletionEditor,
  // KET Part-specific editors
  SignMessageEditor,
  PeopleMatchingEditor,
  GapMatchEditor,
  LongTextMCEditor,
  ClozeMCEditor,
  WordFormEditor,
  MultipleChoicePicturesEditor,
  MatchingPicturesEditor,
  InlineChoiceEditor,
} from "./editors";

/**
 * QuestionEditorFactory - Render đúng editor component dựa trên question type
 * 
 * @param {string} questionType - ID của question type
 * @param {Object} question - Question data (alias: questionData)
 * @param {Function} onChange - Handler khi thay đổi field (alias: onQuestionChange)
 * @param {number} questionIndex - Index của câu hỏi
 * @param {number} startingNumber - Số câu bắt đầu
 */
const QuestionEditorFactory = ({
  questionType,
  question,
  questionData, // alias for question
  onChange,
  onQuestionChange, // alias for onChange
  questionIndex = 0,
  startingNumber = 1,
  partIndex = 0,
  testType,
}) => {
  // Support both prop naming conventions
  const actualQuestion = question || questionData || {};
  const actualOnChange = onChange || onQuestionChange || (() => {});

  // Common props for all editors
  const commonProps = {
    question: actualQuestion,
    onChange: actualOnChange,
    startingNumber,
    partIndex,
    testType,
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

    case 'table-completion':
      return <TableCompletionEditor {...commonProps} />;

    case 'map-labeling':
      return <MapLabelingEditor {...commonProps} />;

    case 'flowchart':
      return <FlowchartEditor {...commonProps} />;

    case 'cloze-test':
      return <ClozeTestEditor {...commonProps} />;

    case 'summary-completion':
      return <SummaryCompletionEditor {...commonProps} />;

    case 'sentence-transformation':
      return <SentenceTransformationEditor {...commonProps} />;

    case 'short-message':
      return <ShortMessageEditor {...commonProps} />;

    // KET Part-specific editors
    case 'sign-message':
      return <SignMessageEditor {...commonProps} />;

    case 'people-matching':
      return <PeopleMatchingEditor {...commonProps} />;

    case 'gap-match':
      return <GapMatchEditor {...commonProps} />;

    case 'long-text-mc':
      return <LongTextMCEditor {...commonProps} />;

    case 'cloze-mc':
      return <ClozeMCEditor {...commonProps} />;

    case 'word-form':
      return <WordFormEditor {...commonProps} />;

    case 'multiple-choice-pictures':
      return <MultipleChoicePicturesEditor {...commonProps} />;

    case 'matching-pictures':
      return <MatchingPicturesEditor {...commonProps} />;

    case 'inline-choice':
      return <InlineChoiceEditor {...commonProps} />;

    // Placeholder for future types
    case 'true-false-not-given':
    case 'yes-no-not-given':
    case 'matching-headings':
    case 'paragraph-matching':
    case 'sentence-completion':
    case 'tick-cross':
    case 'story-writing':
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
