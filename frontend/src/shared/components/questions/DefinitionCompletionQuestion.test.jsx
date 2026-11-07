import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import DefinitionCompletionEditor from './editors/DefinitionCompletionEditor';
import DefinitionCompletionDisplay from './displays/DefinitionCompletionDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['definition-completion'].defaultData));
question.items[0] = {
  questionText: 'a piece of art made from stone or wood',
  correctAnswer: 'sculpture',
};

test('editor previews first-letter clues with lengths based on the answer', () => {
  const onChange = jest.fn();
  render(<DefinitionCompletionEditor question={question} onChange={onChange} startingNumber={6} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('6.')).toBeTruthy();
  expect(within(preview).getAllByText('s')).toHaveLength(2);
  expect(within(preview).getByText('________')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Đáp án đúng câu 1'), { target: { value: 'statue' } });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([expect.objectContaining({ correctAnswer: 'statue' })])
  );
});

test('student enters only the remaining letters while the saved answer includes the given first letter', () => {
  const onAnswerChange = jest.fn();
  render(
    <DefinitionCompletionDisplay
      section={{ id: '0-1-0', questions: [question] }}
      startingNumber={6}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.change(screen.getByLabelText('Question 6, complete the word'), {
    target: { value: 'culpture' },
  });
  expect(onAnswerChange).toHaveBeenCalledWith('0-1-0-0', 'sculpture');
});
