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

  test('confirmation mode only confirms submission without showing any score', () => {
    renderWithTheme(
      <ResultModal
        {...defaultProps}
        displayMode="confirmation"
        result={{ submissionId: 123, correct: 8, total: 10, scorePercentage: 80, band: 6 }}
      />
    );

    expect(screen.getByText('Submission received')).toBeInTheDocument();
    expect(screen.getByText('Your answers have been submitted successfully.')).toBeInTheDocument();
    expect(screen.queryByText('8/10')).not.toBeInTheDocument();
    expect(screen.queryByText('80%')).not.toBeInTheDocument();
    expect(screen.queryByText(/Answer details/i)).not.toBeInTheDocument();
  });

  test('details mode shows per-question answers while score mode keeps aggregate results', () => {
    const result = {
      correct: 1,
      total: 2,
      scorePercentage: 50,
      details: [
        { questionNumber: 1, student: 'A', expected: 'A', isCorrect: true },
        { questionNumber: 2, student: 'B', expected: 'C', isCorrect: false },
      ],
    };

    const { rerender } = renderWithTheme(
      <ResultModal {...defaultProps} result={result} displayMode="score" />
    );
    expect(screen.queryByText('Answer details:')).not.toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <ResultModal {...defaultProps} result={result} displayMode="details" />
      </ThemeProvider>
    );
    expect(screen.getByText('Answer details:')).toBeInTheDocument();
    expect(screen.getByText('Correct answer: C')).toBeInTheDocument();
  });
});
