import React from 'react';
import { render, screen } from '@testing-library/react';
import ShortMessageEditor from '../ShortMessageEditor';

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange, placeholder }, ref) => (
    <textarea
      ref={ref}
      aria-label="short-message-situation-editor"
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

const buildQuestion = (overrides = {}) => ({
  situation: '<p><strong>In your email:</strong></p><ul><li>say which sport the competition was for</li></ul>',
  recipient: 'your English friend Sam',
  messageType: 'email',
  wordLimit: { min: 25, max: 35 },
  sampleAnswer: '',
  ...overrides,
});

function Harness({ initialQuestion = buildQuestion() }) {
  const [question, setQuestion] = React.useState(initialQuestion);

  return (
    <ShortMessageEditor
      question={question}
      partIndex={5}
      startingNumber={31}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

describe('ShortMessageEditor', () => {
  test('hides recipient field and renders a student-style preview', () => {
    render(<Harness />);

    expect(screen.queryByPlaceholderText('VD: your English friend Sam / your teacher')).not.toBeInTheDocument();
    expect(screen.queryByText(/Write a message to/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('VD: https://media2.giphy.com/media/.../giphy.gif')).toBeInTheDocument();

    expect(screen.getByText('Situation:')).toBeInTheDocument();
    expect(screen.getByText('Write your email:')).toBeInTheDocument();
    expect(screen.getByText('25 words or more')).toBeInTheDocument();
    expect(screen.getByText('Words:')).toBeInTheDocument();
  });

  test('renders media preview when a short-message media URL is provided', () => {
    render(
      <Harness
        initialQuestion={buildQuestion({
          mediaUrl: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmFmOGVnNnBicDljZ2k5ZjE1NHFia3hsa3Y5engxczk0b3d3NjFmZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/rOai2K8OdFph0BYFiu/giphy.gif',
        })}
      />
    );

    expect(screen.getByAltText('Short message media preview')).toHaveAttribute(
      'src',
      'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmFmOGVnNnBicDljZ2k5ZjE1NHFia3hsa3Y5engxczk0b3d3NjFmZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/rOai2K8OdFph0BYFiu/giphy.gif'
    );
    expect(screen.getByAltText('Short message prompt media')).toBeInTheDocument();
  });

  test('normalizes empty quill paragraphs from situation values before rendering', () => {
    render(
      <Harness
        initialQuestion={buildQuestion({
          situation: '<p><strong>In your email:</strong></p><p><br></p><p><br></p><ul><li>say which sport the competition was for</li></ul><p>Write <strong>25 words or more</strong>.</p>',
        })}
      />
    );

    expect(screen.getByLabelText('short-message-situation-editor')).toHaveValue(
      '<p><strong>In your email:</strong></p><ul><li>say which sport the competition was for</li></ul><p>Write <strong>25 words or more</strong>.</p>'
    );
  });
});