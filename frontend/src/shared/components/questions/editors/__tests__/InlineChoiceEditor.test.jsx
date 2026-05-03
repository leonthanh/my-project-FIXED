import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InlineChoiceEditor from '../InlineChoiceEditor';

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange, placeholder }, ref) => (
    <textarea
      ref={ref}
      aria-label="inline-choice-passage"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  ));
});

jest.mock('../../../../hooks/useQuillImageUpload', () => () => ({
  quillRef: { current: null },
  modules: {},
}));

const buildQuestion = () => ({
  passageTitle: '',
  passage: '<p>The weather is (21) today.</p>',
  blanks: [
    { number: 21, options: ['', '', '', ''], correctAnswer: '' },
    { number: 22, options: ['', '', '', ''], correctAnswer: '' },
  ],
});

function Harness() {
  const [question, setQuestion] = React.useState(buildQuestion());

  return (
    <InlineChoiceEditor
      question={question}
      startingNumber={21}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

test('renders Vietnamese labels and student preview', () => {
  render(<Harness />);

  expect(screen.getByText('Lựa chọn cho từng blank')).toBeInTheDocument();
  expect(screen.getByText('Xem trước giao diện học sinh')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '--' })).toBeInTheDocument();
});

test('uses question-based placeholders instead of sample words or generic option labels', () => {
  render(<Harness />);

  expect(screen.queryByDisplayValue('temperature')).not.toBeInTheDocument();
  expect(screen.getByPlaceholderText('Câu 21 - lựa chọn A')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('Câu 21 - lựa chọn A'), {
    target: { value: 'sunny' },
  });

  expect(screen.getByDisplayValue('sunny')).toBeInTheDocument();
  expect(screen.queryByText('Option A')).not.toBeInTheDocument();
});
