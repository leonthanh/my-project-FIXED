import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import WordBankCompletionEditor from './editors/WordBankCompletionEditor';
import WordBankCompletionDisplay from './displays/WordBankCompletionDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['word-bank-completion'].defaultData));

test('editor exposes two word banks, an example, and editable two-blank questions', () => {
  const onChange = jest.fn();
  render(<WordBankCompletionEditor question={question} onChange={onChange} startingNumber={1} />);

  expect(screen.getByText('Danh sách A')).toBeTruthy();
  expect(screen.getByText('Danh sách B')).toBeTruthy();
  expect(screen.getByText('Ví dụ (không tính điểm)')).toBeTruthy();
  expect(screen.getByText('Câu 5')).toBeTruthy();
  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('Xem trước:')).toBeTruthy();
  expect(within(preview).getAllByLabelText(/Ô trả lời/)).toHaveLength(10);

  fireEvent.change(screen.getAllByLabelText('Đáp án ô 1')[1], { target: { value: 'sum' } });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([expect.objectContaining({ blankAnswers: ['sum', 'up'] })])
  );
});

test('student display saves both answers with distinct keys and shows the example', () => {
  const onAnswerChange = jest.fn();
  render(
    <WordBankCompletionDisplay
      section={{ id: '0-0-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  expect(screen.getByText(/We can't/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Question 1, answer 1'), { target: { value: 'add' } });
  fireEvent.change(screen.getByLabelText('Question 1, answer 2'), { target: { value: 'up' } });
  expect(onAnswerChange).toHaveBeenNthCalledWith(1, '0-0-0-0-0', 'add');
  expect(onAnswerChange).toHaveBeenNthCalledWith(2, '0-0-0-0-1', 'up');
});
