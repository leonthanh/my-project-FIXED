import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionSection from '../QuestionSection';

// Minimal props stub
const noop = () => {};
const sampleSection = {
  sectionTitle: 'Questions 1-10',
  questionType: 'notes-completion',
  questions: [{}],
};

const defaultProps = {
  passageIndex: 0,
  sectionIndex: 0,
  section: sampleSection,
  onSectionChange: noop,
  onAddQuestion: noop,
  onDeleteQuestion: noop,
  onCopyQuestion: noop,
  onQuestionChange: noop,
  onAddSection: noop,
  onDeleteSection: noop,
  onCopySection: noop,
  onBulkAddQuestions: noop,
  createDefaultQuestionByType: (t) => ({ questionType: t }),
};

test('QuestionSection does not include Listening-only question types in reading editor', () => {
  render(<QuestionSection {...defaultProps} />);

  const allOptions = screen.getAllByRole('option');
  const forbiddenListeningTypes = [
    'fill',
    'abc',
    'abcd',
    'form-completion',
    'table-completion',
    'notes-completion',
    'map-labeling',
    'flowchart',
  ];

  forbiddenListeningTypes.forEach((type) => {
    const option = allOptions.find((opt) => opt.getAttribute('value') === type);
    expect(option).toBeUndefined();
  });
});

test('QuestionSection shows diagram-specific add actions for diagram-labeling blocks', () => {
  const onAddQuestion = jest.fn();
  const diagramSection = {
    ...sampleSection,
    questions: [
      {
        questionNumber: '1',
        questionType: 'diagram-labeling',
        questionText: 'Label the diagram below.',
        diagramTitle: 'Diagram Labeling',
        diagramImageUrl: '',
        diagramImageAlt: '',
        maxWords: 1,
        blanks: [
          {
            id: 'blank_0',
            blankNumber: 1,
            promptHtml: '[NUMBER] [BLANK]',
            correctAnswer: '',
            labelX: 10,
            labelY: 10,
            anchorX: 50,
            anchorY: 50,
            width: 220,
            textAlign: 'left',
          },
        ],
      },
    ],
  };

  render(
    <QuestionSection
      {...defaultProps}
      section={diagramSection}
      onAddQuestion={onAddQuestion}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Thêm Q vào Diagram hiện tại' }));
  expect(onAddQuestion).toHaveBeenNthCalledWith(1, 0, 0);

  fireEvent.click(screen.getByRole('button', { name: 'Tạo block câu hỏi mới' }));
  expect(onAddQuestion).toHaveBeenNthCalledWith(2, 0, 0, { forceNewQuestion: true });
});