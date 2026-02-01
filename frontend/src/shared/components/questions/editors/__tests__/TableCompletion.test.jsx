import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TableCompletion from '../TableCompletion';

const sample = {
  part: 1,
  title: 'Island Transport',
  instruction: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
  columns: ['Vehicles', 'Cost', 'Comments'],
  rows: [
    { vehicle: 'Motor scooter', cost: '1 $ ______ per day', comments: ['- fun to ride', '- they provide helmets and ______'] },
    { vehicle: 'Economy car', cost: '$87.80 per day', comments: ['- four doors, five passengers', '- can drive on all the roads and to ______ for a swim'] },
  ],
};

test('parses blanks, numbers them and validates input', () => {
  const onChange = jest.fn();
  render(<TableCompletion data={sample} onChange={onChange} startingQuestionNumber={1} maxWords={2} />);

  // There should be 3 blanks (1 in first cost, 1 in first comment, 1 in second comment)
  const inputs = screen.getAllByRole('textbox');
  expect(inputs.length).toBeGreaterThanOrEqual(3);

  // Type a valid two-word answer into first blank
  const first = screen.getByLabelText(/Question 1/);
  fireEvent.change(first, { target: { value: 'two words' } });
  expect(onChange).toHaveBeenCalled();

  // Type an invalid long answer (>2 words) into second blank
  const second = screen.getByLabelText(/Question 2/);
  fireEvent.change(second, { target: { value: 'one two three' } });
  expect(screen.getByText(/Không quá/)).toBeInTheDocument();
});
