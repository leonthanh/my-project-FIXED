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

test('QuestionSection includes Table Completion option for IELTS Listening', () => {
  render(<QuestionSection {...defaultProps} />);

  // Ensure the option with value table-completion exists in the type dropdown
  const allOptions = screen.getAllByRole('option');
  const tableOption = allOptions.find(opt => opt.getAttribute('value') === 'table-completion');
  expect(tableOption).toBeTruthy();
});