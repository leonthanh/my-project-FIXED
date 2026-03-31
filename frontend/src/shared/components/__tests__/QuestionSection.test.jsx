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