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

  test('does not render Xem chi tiết even for teacher; close works', () => {
    const teacher = { id: 1, name: 'Ms', role: 'teacher' };
    localStorage.setItem('user', JSON.stringify(teacher));
    const result = { submissionId: 123, score: 85 };

    render(<ResultModal {...defaultProps} result={result} />);

    const button = screen.queryByRole('button', { name: /Xem chi tiết/i });
    expect(button).toBeNull();

    const closeBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
