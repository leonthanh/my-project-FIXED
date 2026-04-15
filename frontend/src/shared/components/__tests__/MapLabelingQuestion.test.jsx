import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MapLabelingQuestion from '../MapLabelingQuestion';

describe('MapLabelingQuestion edit mode', () => {
  const baseQuestion = {
    imageUrl: 'https://example.com/map.png',
    items: [
      { label: 'Supermarket', correctAnswer: 'B', position: { x: 30, y: 40 } },
    ],
  };

  test('does not render marker placement controls or update positions on image click', () => {
    const onChange = jest.fn();
    const handleChange = (field, value) => onChange(field, value);

    render(
      <MapLabelingQuestion
        question={baseQuestion}
        onChange={handleChange}
        mode="edit"
        questionNumber={1}
      />
    );

    expect(screen.queryByRole('button', { name: 'Chọn' })).not.toBeInTheDocument();
    expect(screen.queryByText(/đặt nhãn/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Map preview'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('keeps answer mapping and add item actions for teachers', () => {
    const onChange = jest.fn();
    const handleChange = (field, value) => onChange(field, value);

    render(
      <MapLabelingQuestion
        question={baseQuestion}
        onChange={handleChange}
        mode="edit"
        questionNumber={1}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'C' } });

    expect(onChange).toHaveBeenCalledWith('items', [
      { label: 'Supermarket', correctAnswer: 'C', position: { x: 30, y: 40 } },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm địa điểm' }));

    expect(onChange).toHaveBeenLastCalledWith('items', [
      { label: 'Supermarket', correctAnswer: 'B', position: { x: 30, y: 40 } },
      { label: '', correctAnswer: '', position: null },
    ]);
  });

  test('shows the full A-J label bank for students in answer mode', () => {
    render(
      <MapLabelingQuestion
        question={{
          imageUrl: 'https://example.com/map.png',
          items: [
            { label: 'Toilets', correctAnswer: 'B' },
            { label: 'Water fountain', correctAnswer: 'I' },
          ],
        }}
        mode="answer"
        questionNumber={16}
        studentAnswer={{}}
      />
    );

    const select = screen.getAllByRole('combobox')[0];
    const optionValues = Array.from(select.querySelectorAll('option')).map((option) => option.textContent);

    expect(optionValues).toContain('I');
    expect(optionValues).toContain('J');
  });
});