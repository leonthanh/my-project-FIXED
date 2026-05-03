import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CambridgeTestBuilder from '../CambridgeTestBuilder';

const originalFetch = global.fetch;

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange }, ref) => {
    const [innerValue, setInnerValue] = ReactLib.useState(value || '');

    ReactLib.useEffect(() => {
      setInnerValue(value || '');
    }, [value]);

    ReactLib.useImperativeHandle(ref, () => ({
      getEditor: () => ({
        root: {
          innerHTML: innerValue,
        },
      }),
    }));

    return (
      <textarea
        aria-label="part-instruction-editor"
        value={innerValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setInnerValue(nextValue);
          setTimeout(() => onChange(nextValue), 0);
        }}
      />
    );
  });
});

jest.mock('../../../../../shared/components/AdminNavbar', () => () => <div>Admin Navbar</div>);
jest.mock('../../../../../shared/components/AudioPreviewBlock', () => () => <div>Audio Preview</div>);
jest.mock('../../../../../shared/components/LineIcon.jsx', () => () => <span aria-hidden="true">icon</span>);
jest.mock('../../../../../shared/utils/permissions', () => ({
  canManageCategory: jest.fn(() => true),
}));

jest.mock('../../../../../shared/components/questions', () => ({
  QuestionTypeSelector: ({ value, onChange }) => (
    <select aria-label="question-type-selector" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="fill">fill</option>
      <option value="abc">abc</option>
    </select>
  ),
  QuestionEditorFactory: ({ onChange }) => (
    <button type="button" onClick={() => onChange('questionText', 'Updated question text')}>
      Mock Update Question
    </button>
  ),
}));

beforeEach(() => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Teacher', role: 'admin' });
    return null;
  });
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: async () => ({}) })
  );
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('preserves part instruction when updating questions or adding a question', async () => {
  render(
    <MemoryRouter>
      <CambridgeTestBuilder testType="ket-listening" />
    </MemoryRouter>
  );

  const instructionEditor = screen.getByLabelText('part-instruction-editor');
  fireEvent.change(instructionEditor, { target: { value: '<p>Keep this instruction</p>' } });

  fireEvent.click(screen.getByRole('button', { name: 'Mock Update Question' }));
  expect(screen.getByLabelText('part-instruction-editor')).toHaveValue('<p>Keep this instruction</p>');

  fireEvent.click(screen.getByRole('button', { name: /Thêm câu hỏi/i }));
  expect(screen.getByLabelText('part-instruction-editor')).toHaveValue('<p>Keep this instruction</p>');

  await waitFor(() => {
    expect(screen.getByLabelText('part-instruction-editor')).toHaveValue('<p>Keep this instruction</p>');
  });
});