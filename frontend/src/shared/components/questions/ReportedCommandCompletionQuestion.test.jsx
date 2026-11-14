import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import ReportedCommandCompletionEditor from './editors/ReportedCommandCompletionEditor';
import ReportedCommandCompletionDisplay from './displays/ReportedCommandCompletionDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['reported-command-completion'].defaultData));

test('editor includes an unscored example and previews numbered reported commands', () => {
  const onChange = jest.fn();
  render(<ReportedCommandCompletionEditor question={question} onChange={onChange} startingNumber={11} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('0.')).toBeTruthy();
  expect(within(preview).getByText('11.')).toBeTruthy();
  expect(within(preview).getByText(/asked me to do her a favour/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Câu 1, đáp án đúng'), {
    target: { value: 'warned everyone not to open that email' },
  });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([expect.objectContaining({ correctAnswer: 'warned everyone not to open that email' })])
  );
});

test('student enters the reported command after the sentence starter and answers are keyed by item', () => {
  const onAnswerChange = jest.fn();
  render(
    <ReportedCommandCompletionDisplay
      section={{ id: '0-1-0', questions: [question] }}
      startingNumber={11}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  expect(screen.getByText('0.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Question 11, reported command'), {
    target: { value: 'warned us not to open that email' },
  });
  expect(onAnswerChange).toHaveBeenCalledWith('0-1-0-0', 'warned us not to open that email');
});
