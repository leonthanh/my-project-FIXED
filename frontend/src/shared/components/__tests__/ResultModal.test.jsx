import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultModal from '../ResultModal';

describe('ResultModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.removeItem('user');
  });

  test('does NOT render Xem chi tiết for students', () => {
    const result = { submissionId: 123, score: 85 };
    render(<ResultModal {...defaultProps} result={result} />);
    const btn = screen.queryByRole('button', { name: /Xem chi tiết/i });
    expect(btn).toBeNull();
  });

  test('renders Xem chi tiết for teacher and calls onViewDetails', () => {
    const teacher = { id: 1, name: 'Ms', role: 'teacher' };
    localStorage.setItem('user', JSON.stringify(teacher));
    const result = { submissionId: 123, score: 85 };

    render(<ResultModal {...defaultProps} result={result} />);

    const button = screen.getByRole('button', { name: /Xem chi tiết/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(defaultProps.onViewDetails).toHaveBeenCalled();
  });
});
