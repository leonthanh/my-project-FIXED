import React from 'react';
import { render, screen } from '@testing-library/react';
import CambridgeStudentStyleReview from './CambridgeStudentStyleReview';

const createSubmission = (answers) => ({
  testType: 'gateway-reading-writing',
  answers,
  detailedResults: {},
});

describe('CambridgeStudentStyleReview Prepare question types', () => {
  it('renders Prepare reading comprehension in the student-style review', () => {
    const question = {
      passageTitle: 'A short passage',
      passage: '<p>Prepare passage text.</p>',
      prepareReadingMode: true,
      gatewayReadingMode: true,
      readingAInstruction: 'Choose the correct answer.',
      readingAScoreNote: '____/1',
      questions: [{
        questionText: 'What is described?',
        options: ['A. A book', 'B. A film', 'C. A play', 'D. A song'],
        correctAnswer: 'A',
      }],
    };

    render(
      <CambridgeStudentStyleReview
        test={{
          testType: 'gateway-reading-writing',
          parts: [{
            sections: [{
              sectionTitle: 'Reading',
              questionType: 'prepare-reading-comprehension',
              questions: [question],
            }],
          }],
        }}
        submission={createSubmission({ '0-0-0-0': 'A' })}
      />
    );

    expect(screen.getByText('Prepare passage text.')).toBeInTheDocument();
    expect(screen.getByText('What is described?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /A\. A book/ })).toBeChecked();
    expect(screen.queryByText(/renderer is not available yet/i)).not.toBeInTheDocument();
  });

  it('renders Prepare definition completion with the saved answer', () => {
    render(
      <CambridgeStudentStyleReview
        test={{
          testType: 'gateway-reading-writing',
          parts: [{
            sections: [{
              sectionTitle: 'Vocabulary',
              questionType: 'definition-completion',
              questions: [{
                instruction: 'Complete the word.',
                items: [{ questionText: 'a book that tells a story', correctAnswer: 'novel' }],
              }],
            }],
          }],
        }}
        submission={createSubmission({ '0-0-0-0': 'novel' })}
      />
    );

    expect(screen.getByText('a book that tells a story')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Question 1, complete the word' })).toHaveValue('ovel');
    expect(screen.queryByText(/renderer is not available yet/i)).not.toBeInTheDocument();
  });
});
