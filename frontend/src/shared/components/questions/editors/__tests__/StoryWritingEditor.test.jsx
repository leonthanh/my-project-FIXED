import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StoryWritingEditor from '../StoryWritingEditor';

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange, placeholder, ...props }, ref) => (
    <textarea
      {...props}
      ref={ref}
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

jest.mock('uuid', () => ({ v4: () => 'story-question-id' }));

const Harness = ({ onChange }) => {
  const [question, setQuestion] = React.useState({
    prepareWritingMode: true,
    title: '',
    instructions: '',
    story: '',
    questions: [],
  });
  const updateQuestion = React.useCallback((field, value) => {
    onChange(field, value);
    setQuestion((current) => ({ ...current, [field]: value }));
  }, [onChange]);

  return <StoryWritingEditor question={question} onChange={updateQuestion} />;
};

test('Prepare story-writing editor updates the builder fields and hides auto-scored questions', () => {
  const onChange = jest.fn();

  render(<Harness onChange={onChange} />);

  expect(screen.getByText('Prepare Writing Task (W)')).toBeInTheDocument();
  expect(screen.getByText('Xem trước đề học sinh:')).toBeInTheDocument();
  expect(screen.getByText('Prepare Writing rubric: 10 points')).toBeInTheDocument();
  expect(screen.getByText('Write your response:')).toBeInTheDocument();
  expect(screen.getByText('Write about 80 words')).toBeInTheDocument();
  expect(screen.getByTestId('prepare-writing-preview-columns')).toHaveStyle({ display: 'grid' });
  expect(screen.queryByText('+ Add Question')).not.toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText("e.g. Katie's letter"), {
    target: { value: "Katie's letter" },
  });
  fireEvent.change(screen.getByPlaceholderText('Enter the writing task instructions shown to students.'), {
    target: { value: 'Write a reply in about 80 words.' },
  });
  fireEvent.change(screen.getByPlaceholderText(
    'Enter the letter or prompt that students should read before writing their response.'
  ), {
    target: { value: "<p><strong>I don't know what to do this weekend.</strong></p>" },
  });

  expect(onChange).toHaveBeenNthCalledWith(1, 'title', "Katie's letter");
  expect(onChange).toHaveBeenNthCalledWith(2, 'instructions', 'Write a reply in about 80 words.');
  expect(onChange).toHaveBeenNthCalledWith(3, 'story', "<p><strong>I don't know what to do this weekend.</strong></p>");
  expect(screen.getByText("Katie's letter")).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter the writing task instructions shown to students.')).toHaveStyle({
    fontWeight: 700,
  });
  expect(screen.getByText('Write a reply in about 80 words.', { selector: 'p' })).toHaveStyle({
    fontWeight: 700,
  });
  expect(screen.getByText("I don't know what to do this weekend.").tagName).toBe('STRONG');
});
