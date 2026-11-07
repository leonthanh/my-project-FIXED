import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import QuestionTypeSelector, { getQuestionTypeScopeLabel } from './QuestionTypeSelector';

test('question type options show concise supported-level suffixes', () => {
  const onChange = jest.fn();
  const questionTypes = [
    { id: 'prepare-type', labelVi: 'Prepare question', supportedTests: ['prepare-reading-writing'] },
    QUESTION_TYPES['reported-command-completion'],
    { id: 'ket-pet-type', labelVi: 'Cambridge question', supportedTests: ['ket-reading', 'pet-reading'] },
    {
      id: 'shared-type',
      labelVi: 'Shared question',
      supportedTests: ['ielts-reading', 'ket-reading', 'pet-reading', 'general-reading'],
    },
  ];

  render(
    <QuestionTypeSelector
      questionTypes={questionTypes}
      value="prepare-type"
      onChange={onChange}
    />
  );

  expect(screen.getByRole('option', { name: 'Prepare question - PP' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Viết lại câu mệnh lệnh gián tiếp - PP' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Cambridge question - KET/PET' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Shared question - Dùng chung' })).toBeTruthy();
  expect(getQuestionTypeScopeLabel({ supportedTests: ['pet-reading', 'pet-listening'] })).toBe('PET');

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ket-pet-type' } });
  expect(onChange).toHaveBeenCalledWith('ket-pet-type');
});
