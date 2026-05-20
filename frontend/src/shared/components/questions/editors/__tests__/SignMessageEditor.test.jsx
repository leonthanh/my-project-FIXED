import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SignMessageEditor from '../SignMessageEditor';

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange, placeholder }, ref) => (
    <textarea
      ref={ref}
      aria-label="sign-text-editor"
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
  imageUrl: '',
  imageAlt: '',
  signText: '<p>Keep off the grass.</p>',
  questionText: '',
  options: ['A. option one', 'B. option two', 'C. option three'],
  correctAnswer: 'B',
});

function Harness() {
  const [question, setQuestion] = React.useState(buildQuestion());

  return (
    <SignMessageEditor
      question={question}
      startingNumber={2}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

describe('SignMessageEditor', () => {
  test('adds a separate prompt input above options without removing sign text editor', () => {
    render(<Harness />);

    expect(screen.getByPlaceholderText('VD: CAMPSITE - Groups of 4+ please call ahead')).toBeInTheDocument();

    const promptInput = screen.getByPlaceholderText('VD: What is this message asking students to do?');
    fireEvent.change(promptInput, {
      target: { value: 'What is this message asking students to do?' },
    });

    expect(screen.getByDisplayValue('What is this message asking students to do?')).toBeInTheDocument();
    expect(screen.getByText('What is this message asking students to do?')).toBeInTheDocument();
    expect(screen.getByLabelText('sign-text-editor')).toBeInTheDocument();
  });
});