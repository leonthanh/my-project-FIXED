import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MultiSelectQuestion from '../MultiSelectQuestion';

function MultiSelectHarness() {
  const [question, setQuestion] = React.useState({
    questionNumber: '10-11',
    questionText: 'Which TWO points are mentioned?',
    options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'],
    correctAnswer: 'DE',
    maxSelection: 2,
  });

  return (
    <>
      <MultiSelectQuestion question={question} onChange={setQuestion} />
      <div data-testid="raw-correct-answer">{question.correctAnswer}</div>
      <div data-testid="raw-options">{JSON.stringify(question.options)}</div>
    </>
  );
}

test('MultiSelectQuestion loads legacy DE answers into the shared editor safely', () => {
  render(<MultiSelectHarness />);

  expect(screen.getByText('D, E')).toBeInTheDocument();
  expect(screen.getByTestId('raw-correct-answer')).toHaveTextContent('DE');

  fireEvent.click(screen.getByRole('button', { name: 'D' }));
  expect(screen.getByTestId('raw-correct-answer')).toHaveTextContent('E');

  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  expect(screen.getByTestId('raw-correct-answer')).toHaveTextContent('BE');
});

test('MultiSelectQuestion keeps legacy option text storage when editing', () => {
  render(<MultiSelectHarness />);

  fireEvent.change(screen.getByPlaceholderText('Lựa chọn A'), {
    target: { value: 'Updated option A' },
  });

  expect(screen.getByTestId('raw-options')).toHaveTextContent('Updated option A');
  expect(screen.getByTestId('raw-options')).not.toHaveTextContent('A. Updated option A');
});