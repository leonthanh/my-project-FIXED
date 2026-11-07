import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTION_TYPES } from '../../config/questionTypes';
import PastSimplePassiveTransformationEditor from './editors/PastSimplePassiveTransformationEditor';
import PastSimplePassiveTransformationDisplay from './displays/PastSimplePassiveTransformationDisplay';

const question = JSON.parse(JSON.stringify(QUESTION_TYPES['past-simple-passive-transformation'].defaultData));

test('editor previews passive frames and updates the answer key', () => {
  const onChange = jest.fn();
  render(<PastSimplePassiveTransformationEditor question={question} onChange={onChange} startingNumber={6} />);

  const preview = screen.getByRole('region', { name: 'Xem trước câu hỏi' });
  expect(within(preview).getByText('6.')).toBeTruthy();
  expect(within(preview).getByText('Did they make your shoes in Spain?')).toBeTruthy();
  expect(within(preview).getByLabelText('Ô trả lời câu 5')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Đáp án đúng câu 5'), {
    target: { value: 'were your shoes made in Spain' },
  });
  expect(onChange).toHaveBeenCalledWith(
    'items',
    expect.arrayContaining([
      expect.objectContaining({ correctAnswer: 'were your shoes made in Spain' }),
    ])
  );
});

test('student enters the missing passive form with the expected runtime key', () => {
  const onAnswerChange = jest.fn();
  render(
    <PastSimplePassiveTransformationDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );

  fireEvent.change(screen.getByLabelText('Question 5, passive sentence'), {
    target: { value: 'your shoes made in Spain' },
  });
  expect(onAnswerChange).toHaveBeenCalledWith('0-5-0-4', 'your shoes made in Spain');
});

test('submitted passive answers are marked against the accepted forms', () => {
  render(
    <PastSimplePassiveTransformationDisplay
      section={{ id: '0-5-0', questions: [question] }}
      startingNumber={1}
      onAnswerChange={jest.fn()}
      answers={{ '0-5-0-4': 'your shoes made in Spain' }}
      submitted
    />
  );

  expect(screen.getByLabelText('Question 5, passive sentence').style.backgroundColor).toBe('rgb(220, 252, 231)');
});
