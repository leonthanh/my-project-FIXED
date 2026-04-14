import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TableCompletion from '../TableCompletion';
import TableCompletionEditor from '../TableCompletionEditor';

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
  expect(screen.getByText(/Use no more than 2 words/)).toBeInTheDocument();
});

test('preserves multiline cells and removes duplicate list prefixes in comments', () => {
  const multilineSample = {
    ...sample,
    rows: [
      {
        cells: ['Express\nservice', 'Platform [BLANK]', '- bring cash\n2. seats fill up fast'],
        cellBlankAnswers: [[''], ['7'], []],
        comments: ['- bring cash', '2. seats fill up fast'],
      },
    ],
  };

  const { container } = render(<TableCompletion data={multilineSample} startingQuestionNumber={11} />);

  const firstBodyCell = container.querySelector('tbody td');
  expect(firstBodyCell.querySelector('br')).not.toBeNull();

  const listItems = screen.getAllByRole('listitem');
  expect(listItems).toHaveLength(2);
  expect(listItems[0]).toHaveTextContent('bring cash');
  expect(listItems[0]).not.toHaveTextContent('- bring cash');
  expect(listItems[1]).toHaveTextContent('seats fill up fast');
  expect(listItems[1]).not.toHaveTextContent('2. seats fill up fast');
});

function TableCompletionEditorHarness({ initialQuestion }) {
  const [question, setQuestion] = React.useState(initialQuestion);

  return (
    <TableCompletionEditor
      question={question}
      startingNumber={12}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

test('smoke edits legacy comment blanks stored in cellBlankAnswers', () => {
  render(
    <TableCompletionEditorHarness
      initialQuestion={{
        title: 'Travel options',
        instruction: 'Write NO MORE THAN TWO WORDS.',
        columns: ['Type', 'Cost', 'Comments'],
        rows: [
          {
            cells: ['Bus', '[BLANK] dollars', 'bring [BLANK]\ncarry [BLANK]'],
            cellBlankAnswers: [[], ['12'], ['water', 'map']],
          },
        ],
      }}
    />
  );

  expect(screen.getByDisplayValue('water')).toBeInTheDocument();
  expect(screen.getByDisplayValue('map')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText(/Moi dong se tro thanh mot muc/i), {
    target: { value: 'bring [BLANK] today\ncarry [BLANK]' },
  });

  expect(screen.getByDisplayValue('water')).toBeInTheDocument();
  expect(screen.getByDisplayValue('map')).toBeInTheDocument();
});

test('inserts [BLANK] at the current caret position in regular cells', () => {
  render(
    <TableCompletionEditorHarness
      initialQuestion={{
        title: 'Transport costs',
        instruction: 'Write NO MORE THAN TWO WORDS.',
        columns: ['Vehicles', 'Cost', 'Comments'],
        rows: [
          {
            cells: ['Bus', 'Pay cash here', 'bring tickets'],
            cellBlankAnswers: [[], [], []],
            commentBlankAnswers: [],
          },
        ],
      }}
    />
  );

  const costTextarea = screen.getByRole('textbox', { name: 'Cost row 1' });
  costTextarea.focus();
  costTextarea.setSelectionRange(4, 4);

  const insertButton = screen.getByRole('button', { name: 'Insert [BLANK] into Cost row 1' });
  fireEvent.mouseDown(insertButton);
  fireEvent.click(insertButton);

  expect(costTextarea).toHaveValue('Pay [BLANK] cash here');
});

test('inserts [BLANK] at the current caret position in comments cells', () => {
  render(
    <TableCompletionEditorHarness
      initialQuestion={{
        title: 'Travel notes',
        instruction: 'Write NO MORE THAN TWO WORDS.',
        columns: ['Vehicles', 'Cost', 'Comments'],
        rows: [
          {
            cells: ['Bus', '12 dollars', 'bring cash\ncarry maps'],
            cellBlankAnswers: [[], [], []],
            commentBlankAnswers: [],
          },
        ],
      }}
    />
  );

  const commentsTextarea = screen.getByRole('textbox', { name: 'Comments row 1' });
  commentsTextarea.focus();
  commentsTextarea.setSelectionRange(6, 6);

  const insertButton = screen.getByRole('button', { name: 'Insert [BLANK] into Comments row 1' });
  fireEvent.mouseDown(insertButton);
  fireEvent.click(insertButton);

  expect(commentsTextarea).toHaveValue('bring [BLANK] cash\ncarry maps');
});
