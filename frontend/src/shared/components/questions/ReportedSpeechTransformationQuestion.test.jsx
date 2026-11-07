import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import ReportedSpeechTransformationEditor from './editors/ReportedSpeechTransformationEditor';
import ReportedSpeechTransformationDisplay from './displays/ReportedSpeechTransformationDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['reported-speech-transformation'].defaultData));

test('editor previews both source and target forms and edits item data', () => {
  const onChange = jest.fn();
  render(<ReportedSpeechTransformationEditor question={question} onChange={onChange} startingNumber={16} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('16.')).toBeTruthy();
  expect(within(preview).getByText(/Alice said,/)).toBeTruthy();
  expect(within(preview).getByLabelText('Ô trả lời câu 1')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Đáp án đúng câu 1'), {
    target: { value: 'she really loved reading fashion magazines' },
  });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([
      expect.objectContaining({ correctAnswer: 'she really loved reading fashion magazines' }),
    ])
  );
});

test('student enters the missing transformed sentence with the expected runtime key', () => {
  const onAnswerChange = jest.fn();
  render(
    <ReportedSpeechTransformationDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={16}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.change(screen.getByLabelText('Question 16, transformed sentence'), {
    target: { value: 'she loved reading fashion magazines' },
  });
  expect(onAnswerChange).toHaveBeenCalledWith('0-5-0-0', 'she loved reading fashion magazines');
});

test('submitted direct-speech answers accept straight apostrophes for curly apostrophe keys', () => {
  render(
    <ReportedSpeechTransformationDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={jest.fn()}
      answers={{ '0-5-0-2': "I don't want to go cycling" }}
      submitted
    />
  );

  expect(screen.getByLabelText('Question 3, transformed sentence').style.backgroundColor).toBe('rgb(220, 252, 231)');
});
