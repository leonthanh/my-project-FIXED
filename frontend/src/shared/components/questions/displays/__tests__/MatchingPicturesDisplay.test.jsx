import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MatchingPicturesDisplay from '../MatchingPicturesDisplay';

const section = {
  id: 'matching-pictures-part-1',
  questions: [
    {
      description: 'Match the picture to the sentence.',
      choices: [
        {
          id: 'A',
          label: 'a salad',
          imageUrl: 'https://example.com/salad.jpg',
        },
      ],
      prompts: [
        {
          id: '1',
          text: 'This is for lunch.',
          correctAnswer: 'A',
        },
      ],
    },
  ],
};

function MatchingPicturesHarness() {
  const [answers, setAnswers] = useState({});

  return (
    <MatchingPicturesDisplay
      section={section}
      startingNumber={1}
      answers={answers}
      submitted={false}
      onAnswerChange={(answerKey, value) => {
        setAnswers((prev) => ({
          ...prev,
          [answerKey]: value,
        }));
      }}
    />
  );
}

describe('MatchingPicturesDisplay', () => {
  test('renders the selected answer UI after a drop without crashing', () => {
    render(<MatchingPicturesHarness />);

    const emptyDropZone = screen.getByText('Chưa trả lời — kéo ảnh vào đây').closest('div');
    expect(emptyDropZone).not.toBeNull();

    fireEvent.dragOver(emptyDropZone);
    fireEvent.drop(emptyDropZone, {
      dataTransfer: {
        getData: jest.fn(() => 'A'),
      },
    });

    expect(screen.queryByText('Chưa trả lời — kéo ảnh vào đây')).not.toBeInTheDocument();
    expect(screen.getByTitle('Xóa đáp án')).toBeInTheDocument();
  });

  test('clears an assigned picture answer when the remove button is clicked', () => {
    render(<MatchingPicturesHarness />);

    const emptyDropZone = screen.getByText('Chưa trả lời — kéo ảnh vào đây').closest('div');
    fireEvent.drop(emptyDropZone, {
      dataTransfer: {
        getData: jest.fn(() => 'A'),
      },
    });

    fireEvent.click(screen.getByTitle('Xóa đáp án'));

    expect(screen.getByText('Chưa trả lời — kéo ảnh vào đây')).toBeInTheDocument();
  });
});