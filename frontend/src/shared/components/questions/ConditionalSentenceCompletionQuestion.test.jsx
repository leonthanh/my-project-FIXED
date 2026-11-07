import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import ConditionalSentenceCompletionEditor from './editors/ConditionalSentenceCompletionEditor';
import ConditionalSentenceCompletionDisplay from './displays/ConditionalSentenceCompletionDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['conditional-sentence-completion'].defaultData));

test('editor previews two blanks per item and loads the Second Conditional template', () => {
  const onChange = jest.fn();
  render(<ConditionalSentenceCompletionEditor question={question} onChange={onChange} startingNumber={6} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('6.')).toBeTruthy();
  expect(within(preview).getAllByLabelText(/Ô trả lời/)).toHaveLength(10);

  fireEvent.click(screen.getByRole('button', { name: 'Second Conditional' }));
  expect(onChange).toHaveBeenCalledWith('templateId', 'second-conditional');
  expect(onChange).toHaveBeenCalledWith('instruction', 'Complete the second conditional sentences.');
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([expect.objectContaining({ blankAnswers: ['were', 'would ask'] })])
  );
});

test('editor updates a verb-form answer independently', () => {
  const onChange = jest.fn();
  render(<ConditionalSentenceCompletionEditor question={question} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Đáp án ô 1 câu 1'), { target: { value: 'will never come' } });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([
      expect.objectContaining({ blankAnswers: ['will never come', 'is'] }),
    ])
  );
});

test('student answers use Prepare item-and-blank keys', () => {
  const onAnswerChange = jest.fn();
  render(
    <ConditionalSentenceCompletionDisplay
      section={{ id: '0-3-0', questions: [question] }}
      startingNumber={16}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.change(screen.getByLabelText('Question 16, answer 1'), { target: { value: "won't come" } });
  fireEvent.change(screen.getByLabelText('Question 16, answer 2'), { target: { value: 'is' } });
  expect(onAnswerChange).toHaveBeenNthCalledWith(1, '0-3-0-0-0', "won't come");
  expect(onAnswerChange).toHaveBeenNthCalledWith(2, '0-3-0-0-1', 'is');
});
