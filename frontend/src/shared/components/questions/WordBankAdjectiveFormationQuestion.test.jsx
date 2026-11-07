import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import WordBankAdjectiveFormationEditor from './editors/WordBankAdjectiveFormationEditor';
import WordBankAdjectiveFormationDisplay from './displays/WordBankAdjectiveFormationDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['word-bank-adjective-formation'].defaultData));

test('editor previews numbered adjective questions and edits accepted answers', () => {
  const onChange = jest.fn();
  render(<WordBankAdjectiveFormationEditor question={question} onChange={onChange} startingNumber={6} />);

  expect(screen.getByLabelText('Word bank').value).toContain('history');
  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('6.')).toBeTruthy();
  expect(within(preview).getAllByText('________________')).toHaveLength(5);

  fireEvent.change(screen.getByLabelText('Tính từ đúng câu 1'), { target: { value: 'stressfull' } });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([expect.objectContaining({ correctAnswer: 'stressfull' })])
  );
});

test('student answers use Prepare item keys and show submitted feedback', () => {
  const onAnswerChange = jest.fn();
  render(
    <WordBankAdjectiveFormationDisplay
      section={{ id: '0-1-0', questions: [question] }}
      startingNumber={6}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.change(screen.getByLabelText('Question 6, adjective answer'), { target: { value: 'stressful' } });
  expect(onAnswerChange).toHaveBeenCalledWith('0-1-0-0', 'stressful');

  render(
    <WordBankAdjectiveFormationDisplay
      section={{ id: '0-1-0', questions: [question] }}
      startingNumber={6}
      onAnswerChange={onAnswerChange}
      answers={{ '0-1-0-0': 'wrong' }}
      submitted
    />
  );
  expect(screen.getByText('stressful')).toBeTruthy();
  expect(screen.getAllByLabelText('Question 6, adjective answer')[1].disabled).toBe(true);
});
