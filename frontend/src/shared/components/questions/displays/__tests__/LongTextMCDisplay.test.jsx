import React from 'react';
import { render, screen, within } from '@testing-library/react';
import LongTextMCDisplay from '../LongTextMCDisplay';

const gatewayReadingQuestions = [
  ...Array.from({ length: 5 }, (_, index) => ({
    questionText: `Reading A question ${index + 41}`,
    options: ['A. First', 'B. Second', 'C. Third'],
    correctAnswer: 'A',
    answerType: 'multiple-choice',
  })),
  {
    questionText: 'In the past, travelling around La Paz was difficult because the city has a large number of hills.',
    correctAnswer: 'F',
    answerType: 'true-false',
  },
  {
    questionText: 'The cable car system consists of eight lines connecting different parts of La Paz.',
    correctAnswer: 'T',
    answerType: 'true-false',
  },
  {
    questionText: 'Passengers can enjoy views of the city while travelling on the cable car.',
    correctAnswer: 'T',
    answerType: 'true-false',
  },
  {
    questionText: 'Local teacher Mónica Pérez believes that the cable car has made her daily journeys longer.',
    correctAnswer: 'F',
    answerType: 'true-false',
  },
  {
    questionText: 'Mercedes Blanco enjoys travelling by cable car because she can see parts of the city from above.',
    correctAnswer: 'T',
    answerType: 'true-false',
  },
];

describe('LongTextMCDisplay Gateway Reading B review', () => {
  test('shows the student and correct answers with a result status for questions 46-50', () => {
    const answerValues = ['F', 'F', 'T', 'F', 'T'];
    const expectedResults = [
      { questionNumber: 46, student: 'F', correct: 'F', status: 'Correct' },
      { questionNumber: 47, student: 'F', correct: 'T', status: 'Wrong' },
      { questionNumber: 48, student: 'T', correct: 'T', status: 'Correct' },
      { questionNumber: 49, student: 'F', correct: 'F', status: 'Correct' },
      { questionNumber: 50, student: 'T', correct: 'T', status: 'Correct' },
    ];
    const answers = Object.fromEntries(
      answerValues.map((answer, index) => [`0-8-0-${index + 5}`, answer])
    );

    render(
      <LongTextMCDisplay
        section={{
          id: '0-8-0',
          gatewayReadingMode: true,
          readingAInstruction: 'Reading A instructions',
          readingAScoreNote: 'Reading A score',
          readingBInstruction: 'Reading B instructions',
          readingBScoreNote: 'Reading B score',
          questions: gatewayReadingQuestions,
        }}
        startingNumber={41}
        answers={answers}
        submitted
      />
    );

    expect(screen.getByText('Reading B instructions')).toBeInTheDocument();
    expect(screen.getByText('Reading B score')).toBeInTheDocument();

    expectedResults.forEach(({ questionNumber, student, correct, status }) => {
      const question = screen.getByRole('group', { name: `Question ${questionNumber}` });
      expect(question).toHaveTextContent(`Student answer: ${student}`);
      expect(question).toHaveTextContent(`Correct answer: ${correct}`);
      expect(question).toHaveTextContent(status);
      expect(within(question).getByRole('radio', { name: 'T (True)' })).toBeInTheDocument();
      expect(within(question).getByRole('radio', { name: 'F (False)' })).toBeInTheDocument();
      expect(within(question).getByRole('radio', { name: `${student} (${student === 'T' ? 'True' : 'False'})` })).toBeChecked();
    });
  });
});
