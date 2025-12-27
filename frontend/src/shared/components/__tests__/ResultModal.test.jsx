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
  });

  test('renders Xem chi tiết (chấm) button when submissionId exists and opens compare page in new tab', () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;

    const result = { submissionId: 123, score: 85 };

    render(<ResultModal {...defaultProps} result={result} />);

    const button = screen.getByRole('button', { name: /Xem chi tiết \(chấm\)/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockOpen).toHaveBeenCalledWith('/api/reading-submissions/123/compare-html', '_blank');
  });

  test('does not render Xem chi tiết (chấm) button when no submissionId', () => {
    render(<ResultModal {...defaultProps} result={{ score: 80 }} />);
    const buttons = screen.queryAllByRole('button', { name: /Xem chi tiết \(chấm\)/i });
    expect(buttons).toHaveLength(0);
  });
});
