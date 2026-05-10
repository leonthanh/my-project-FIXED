import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DiagramLabelingQuestion from '../DiagramLabelingQuestion.jsx';

const mockRect = (element, rect) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      toJSON: () => rect,
    }),
  });
};

const baseQuestion = {
  questionNumber: '1',
  questionType: 'diagram-labeling',
  questionText: 'Label the diagram below.',
  diagramTitle: 'Diagram Labeling',
  diagramImageUrl: 'https://example.com/diagram.png',
  diagramImageAlt: 'Diagram preview',
  maxWords: 1,
  blanks: [
    {
      id: 'blank_0',
      blankNumber: 1,
      promptHtml: '[NUMBER] [BLANK]',
      correctAnswer: 'gates',
      labelX: 10,
      labelY: 10,
      anchorX: 50,
      anchorY: 50,
      width: 220,
      textAlign: 'left',
    },
  ],
};

const multiBlankQuestion = {
  ...baseQuestion,
  questionNumber: '1-2',
  blanks: [
    baseQuestion.blanks[0],
    {
      id: 'blank_1',
      blankNumber: 2,
      promptHtml: 'The [NUMBER] [BLANK] controls the lock gate',
      correctAnswer: 'lever',
      labelX: 20,
      labelY: 24,
      anchorX: 62,
      anchorY: 38,
      width: 220,
      textAlign: 'left',
    },
  ],
};

function DiagramHarness() {
  const [question, setQuestion] = useState(baseQuestion);
  const blank = question.blanks[0];

  return (
    <div>
      <DiagramLabelingQuestion
        question={question}
        onChange={setQuestion}
        mode="edit"
        questionNumber={1}
      />
      <div data-testid="label-position">{`${Number(blank.labelX).toFixed(1)},${Number(blank.labelY).toFixed(1)}`}</div>
      <div data-testid="anchor-position">{`${Number(blank.anchorX).toFixed(1)},${Number(blank.anchorY).toFixed(1)}`}</div>
      <div data-testid="label-width">{String(blank.width)}</div>
    </div>
  );
}

function MultiBlankDiagramHarness() {
  const [question, setQuestion] = useState(multiBlankQuestion);

  return (
    <DiagramLabelingQuestion
      question={question}
      onChange={setQuestion}
      mode="edit"
      questionNumber={1}
    />
  );
}

describe('DiagramLabelingQuestion edit mode', () => {
  test('allows dragging the on-image label directly', () => {
    render(<DiagramHarness />);

    const board = screen.getByAltText('Diagram preview').parentElement;
    const label = screen.getByTitle('Kéo label Q1');

    mockRect(board, { left: 100, top: 100, width: 600, height: 400 });
    mockRect(label, { left: 160, top: 140, width: 220, height: 60 });

    fireEvent.mouseDown(label, { clientX: 210, clientY: 170 });
    fireEvent.mouseMove(window, { clientX: 450, clientY: 290 });
    fireEvent.mouseUp(window, { clientX: 450, clientY: 290 });

    const [labelX, labelY] = screen.getByTestId('label-position').textContent.split(',').map(Number);

    expect(labelX).toBeGreaterThan(49);
    expect(labelX).toBeLessThan(52);
    expect(labelY).toBeGreaterThan(39);
    expect(labelY).toBeLessThan(42);
  });

  test('can add a non-scored diagram annotation in edit mode', () => {
    render(<DiagramHarness />);

    expect(screen.getByText(/chưa có chú thích/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm chú thích' }));

    expect(screen.getByText('Chú thích 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nhập chú thích trực tiếp trên hình')).toBeInTheDocument();
    expect(screen.getByTitle('Kéo chú thích 1')).toBeInTheDocument();
  });

  test('can add a second arrow to a diagram question label', () => {
    render(<DiagramHarness />);

    expect(screen.queryByRole('button', { name: 'Kéo mũi tên 2 của Q1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm mũi tên cho Q1' }));

    expect(screen.getByRole('button', { name: 'Kéo mũi tên 2 của Q1' })).toBeInTheDocument();
  });

  test('can add a second arrow to a non-scored annotation', () => {
    render(<DiagramHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm chú thích' }));
    expect(screen.queryByRole('button', { name: 'Kéo mũi tên 2 của chú thích 1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm mũi tên cho chú thích 1' }));

    expect(screen.getByRole('button', { name: 'Kéo mũi tên 2 của chú thích 1' })).toBeInTheDocument();
  });

  test('can preview the student-facing diagram layout directly inside edit mode', () => {
    render(<DiagramHarness />);

    expect(screen.queryByText('Xem trước giao diện học sinh')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước kiểu học sinh' }));

    expect(screen.getByText('Xem trước giao diện học sinh')).toBeInTheDocument();
    expect(screen.getByText('No more than 1 word(s)')).toBeInTheDocument();
    expect(screen.getByTestId('student-preview-panel').querySelectorAll('circle')).toHaveLength(0);

    const previewInput = screen.getByRole('textbox', { name: 'Ô trả lời câu 1' });
    expect(previewInput.style.fontSize).toBe('1em');
    fireEvent.change(previewInput, { target: { value: 'gates' } });
    expect(previewInput).toHaveValue('gates');

    fireEvent.click(screen.getByRole('button', { name: 'Xóa đáp án thử' }));
    expect(previewInput).toHaveValue('');
  });

  test('allows resizing the on-image label directly', () => {
    render(<DiagramHarness />);

    const resizeHandle = screen.getByRole('button', { name: 'Co giãn label Q1' });

    fireEvent.mouseDown(resizeHandle, { clientX: 380, clientY: 200 });
    fireEvent.mouseMove(window, { clientX: 460, clientY: 200 });
    fireEvent.mouseUp(window, { clientX: 460, clientY: 200 });

    expect(screen.getByTestId('label-width')).toHaveTextContent('300');
  });

  test('can collapse on-image labels into compact Q chips for easier image inspection', () => {
    render(<DiagramHarness />);

    expect(screen.getByTitle('Kéo label Q1').tagName).toBe('DIV');

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn nội dung Q trên hình' }));

    const compactChip = screen.getByTitle('Kéo label Q1');
    expect(screen.getByRole('button', { name: 'Hiện nội dung Q trên hình' })).toBeInTheDocument();
    expect(compactChip.tagName).toBe('BUTTON');
    expect(compactChip).toHaveTextContent('Q1');
  });

  test('hides coordinate inputs in normal mode and reveals them in advanced mode', () => {
    render(<DiagramHarness />);

    expect(screen.queryByText('Text X / Y')).not.toBeInTheDocument();
    expect(screen.queryByText('Arrow X / Y')).not.toBeInTheDocument();
    expect(screen.getByText(/tọa độ text x/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hiện chế độ nâng cao' }));

    expect(screen.getByText('Text X / Y')).toBeInTheDocument();
    expect(screen.getByText('Arrow X / Y')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ẩn chế độ nâng cao' })).toBeInTheDocument();
  });

  test('can collapse and expand a diagram question card to reduce scrolling', () => {
    render(<DiagramHarness />);

    expect(screen.getByText('Prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }));

    expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
    expect(screen.getByText('Đáp án: gates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở rộng' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng' }));

    expect(screen.getByText('Prompt')).toBeInTheDocument();
  });

  test('can collapse and expand all diagram question cards at once', () => {
    render(<MultiBlankDiagramHarness />);

    expect(screen.getAllByText('Prompt')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ tất cả' }));

    expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
    expect(screen.getByText('Đáp án: gates')).toBeInTheDocument();
    expect(screen.getByText('Đáp án: lever')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng tất cả' }));

    expect(screen.getAllByText('Prompt')).toHaveLength(2);
  });
});