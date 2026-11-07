import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import ReportedSpeechVerbChoiceEditor from './editors/ReportedSpeechVerbChoiceEditor';
import ReportedSpeechVerbChoiceDisplay from './displays/ReportedSpeechVerbChoiceDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['reported-speech-verb-choice'].defaultData));

test('editor previews the example and choice pairs and edits sentence frames', () => {
  const onChange = jest.fn();
  render(<ReportedSpeechVerbChoiceEditor question={question} onChange={onChange} startingNumber={6} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText(/The headmaster/)).toBeTruthy();
  expect(within(preview).getByText(/Example\./)).toBeTruthy();
  expect(within(preview).getByText('6.')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Câu sau lựa chọn 1'), {
    target: { value: ' we would have three weeks off for Christmas.' },
  });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([
      expect.objectContaining({ sentenceSuffix: ' we would have three weeks off for Christmas.' }),
    ])
  );
});

test('student selects a reported speech verb using the runtime answer key', () => {
  const onAnswerChange = jest.fn();
  render(
    <ReportedSpeechVerbChoiceDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.click(screen.getByRole('radio', { name: 'Question 1: said' }));
  expect(onAnswerChange).toHaveBeenCalledWith('0-5-0-0', 'said');
});

test('submitted verb choices mark the correct option and reveal wrong answers', () => {
  render(
    <ReportedSpeechVerbChoiceDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={jest.fn()}
      answers={{
        '0-5-0-0': 'told',
        '0-5-0-1': 'said',
        '0-5-0-2': 'told',
        '0-5-0-3': 'said',
        '0-5-0-4': 'told',
      }}
      submitted
    />
  );

  expect(screen.getByRole('radio', { name: 'Question 1: said' })).toBeDisabled();
  expect(screen.getByRole('radio', { name: 'Question 1: told' })).toBeChecked();
  expect(screen.getByText(/Correct answer:/)).toHaveTextContent('said');
});
