import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentPreviewModal from '../StudentPreviewModal';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';

describe('StudentPreviewModal teacher preview', () => {
  const testData = {
    title: 'Teacher Preview Test',
    passages: [
      {
        index: 1,
        passageTitle: 'Passage 1',
        sections: [
          {
            sectionTitle: 'Section 1',
            questions: []
          }
        ]
      }
    ],
    questions: [
      {
        type: 'multiple-choice',
        questionText: 'Choose the correct option',
        options: ['A', 'B', 'C'],
        correctAnswer: 'A'
      },
      {
        type: 'short-answer',
        questionText: 'Capital of Vietnam',
        correctAnswer: 'Hà Nội'
      }
    ],
  };

  test('shows answers and correctness when teacher toggles showAnswers', async () => {
    render(
      <ThemeProvider>
        <StudentPreviewModal isOpen={true} onClose={() => {}} testData={testData} />
      </ThemeProvider>
    );

    // Fill short answer with fuzzy (no diacritics) text
    const shortInput = screen.getByPlaceholderText('Nhập câu trả lời...');
    await userEvent.type(shortInput, 'Ha Noi');

    // Click submit to reveal results
    const submitBtn = screen.getByRole('button', { name: /✓ Nộp bài & Xem kết quả/i });
    expect(submitBtn).toBeInTheDocument();
    await userEvent.click(submitBtn);

    // Multiple-choice should show correct answer badge
    expect(screen.getByText(/✓ Đáp án đúng/i)).toBeInTheDocument();

    // Short-answer should show correctness ✓ Chính xác! due to fuzzy match
    expect(await screen.findByText(/✓ Chính xác!/i)).toBeInTheDocument();
  });
});
