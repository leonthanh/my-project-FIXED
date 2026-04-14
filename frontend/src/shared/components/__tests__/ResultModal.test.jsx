import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultModal from '../ResultModal';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

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

  test('does NOT render view-details for students', () => {
    const result = { submissionId: 123, score: 85 };
    renderWithTheme(<ResultModal {...defaultProps} result={result} />);
    const btn = screen.queryByRole('button', { name: /View details/i });
    expect(btn).toBeNull();
  });

  test('does not render view-details even for teacher; close works', () => {
    const teacher = { id: 1, name: 'Ms', role: 'teacher' };
    localStorage.setItem('user', JSON.stringify(teacher));
    const result = { submissionId: 123, score: 85 };

    renderWithTheme(<ResultModal {...defaultProps} result={result} />);

    const button = screen.queryByRole('button', { name: /View details/i });
    expect(button).toBeNull();

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
