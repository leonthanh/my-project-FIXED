import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CambridgeTestBuilder from '../CambridgeTestBuilder';

const originalFetch = global.fetch;

jest.mock('react-quill', () => {
  const ReactLib = require('react');

  return ReactLib.forwardRef(({ value, onChange }, ref) => {
    const [innerValue, setInnerValue] = ReactLib.useState(value || '');
    const onChangeRef = ReactLib.useRef(onChange);

    ReactLib.useEffect(() => {
      setInnerValue(value || '');
    }, [value]);

    ReactLib.useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

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
          setTimeout(() => onChangeRef.current(nextValue), 0);
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
      <option value="gap-match">gap-match</option>
    </select>
  ),
  QuestionEditorFactory: ({ onChange, startingNumber }) => (
    <div>
      <div aria-label="question-editor-starting-number">{startingNumber}</div>
      <button type="button" onClick={() => onChange('questionText', 'Updated question text')}>
        Mock Update Question
      </button>
    </div>
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

test('preserves each part instruction when switching parts before delayed quill updates flush', async () => {
  jest.useFakeTimers();

  try {
    render(
      <MemoryRouter>
        <CambridgeTestBuilder testType="ket-listening" />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('part-instruction-editor'), {
      target: { value: '<p>Part 1 instruction</p>' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Thêm Part/i }));

    fireEvent.change(screen.getByLabelText('part-instruction-editor'), {
      target: { value: '<p>Part 2 instruction</p>' },
    });

    fireEvent.click(screen.getAllByText('Part 1')[0]);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByLabelText('part-instruction-editor')).toHaveValue('<p>Part 1 instruction</p>');

    fireEvent.click(screen.getAllByText('Part 2')[0]);
    expect(screen.getByLabelText('part-instruction-editor')).toHaveValue('<p>Part 2 instruction</p>');
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

test('uses the live instruction snapshot for save payloads before delayed quill updates flush', async () => {
  jest.useFakeTimers();

  try {
    render(
      <MemoryRouter>
        <CambridgeTestBuilder testType="ket-listening" />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('VD: KET Test 1'), {
      target: { value: 'KET Listening Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('VD: KET-631-A'), {
      target: { value: 'KET-001' },
    });

    fireEvent.change(screen.getByLabelText('part-instruction-editor'), {
      target: { value: '<p>Part 1 instruction</p>' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Thêm Part/i }));

    fireEvent.change(screen.getByLabelText('part-instruction-editor'), {
      target: { value: '<p>Part 2 instruction</p>' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Lưu đề/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalled();

    const [, request] = global.fetch.mock.calls.at(-1);
    const payload = JSON.parse(request.body);

    expect(payload.parts[0].instruction).toBe('<p>Part 1 instruction</p>');
    expect(payload.parts[1].instruction).toBe('<p>Part 2 instruction</p>');
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

test('uses section question numbering for gap-match editor after previous parts consume earlier numbers', () => {
  const buildFillPart = (partNumber) => ({
    partNumber,
    title: `Part ${partNumber}`,
    instruction: '',
    audioUrl: '',
    imageUrl: '',
    sections: [
      {
        sectionTitle: '',
        questionType: 'fill',
        questions: [{}, {}, {}, {}, {}],
      },
    ],
  });

  const initialData = {
    title: 'KET Listening Numbering',
    classCode: 'KET-021',
    teacherName: 'Teacher',
    parts: [
      buildFillPart(1),
      buildFillPart(2),
      buildFillPart(3),
      buildFillPart(4),
      {
        partNumber: 5,
        title: 'Part 5',
        instruction: '',
        audioUrl: '',
        imageUrl: '',
        sections: [
          {
            sectionTitle: '',
            questionType: 'gap-match',
            questions: [
              {
                leftItems: ['Anthea', 'Larry', 'Kerry', 'Tony', 'Hannah'],
                options: ['art equipment', 'bag', 'book', 'chocolate', 'concert ticket', 'jewellery', 'perfume', 'picture'],
                correctAnswers: ['jewellery', 'picture', 'book', 'concert ticket', 'bag'],
              },
            ],
          },
        ],
      },
    ],
  };

  render(
    <MemoryRouter>
      <CambridgeTestBuilder testType="ket-listening" initialData={initialData} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getAllByText('Part 5')[0]);

  expect(screen.getByLabelText('question-editor-starting-number')).toHaveTextContent('21');
});