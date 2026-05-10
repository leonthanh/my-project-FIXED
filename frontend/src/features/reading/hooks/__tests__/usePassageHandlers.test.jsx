import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { usePassageHandlers } from '../usePassageHandlers';

const buildDiagramQuestion = () => ({
  questionNumber: '1',
  questionType: 'diagram-labeling',
  questionText: 'Label the diagram below.',
  diagramTitle: 'Diagram Labeling',
  diagramImageUrl: '',
  diagramImageAlt: '',
  maxWords: 1,
  blanks: [
    {
      id: 'blank_0',
      blankNumber: 1,
      promptHtml: '[NUMBER] [BLANK]',
      correctAnswer: 'gates',
      labelX: 10,
      labelY: 10,
      anchorX: 50,
      anchorY: 50,
      width: 220,
      textAlign: 'left',
    },
  ],
});

const buildInitialPassages = () => ([
  {
    passageTitle: 'Passage 1',
    passageText: '',
    sections: [
      {
        sectionTitle: 'Section 1',
        sectionInstruction: '',
        sentenceCompletionTitleHtml: '',
        sectionImage: null,
        questions: [buildDiagramQuestion()],
      },
    ],
  },
]);

const HookHarness = () => {
  const { passages, handleAddQuestion } = usePassageHandlers(buildInitialPassages());
  const questions = passages[0].sections[0].questions;
  const diagramQuestion = questions[0];

  return (
    <div>
      <div data-testid="question-count">{questions.length}</div>
      <div data-testid="question-number">{diagramQuestion.questionNumber}</div>
      <div data-testid="blank-count">{diagramQuestion.blanks?.length || 0}</div>
      <div data-testid="second-question-type">{questions[1]?.questionType || ''}</div>

      <button type="button" onClick={() => handleAddQuestion(0, 0)}>
        smart-add
      </button>
      <button
        type="button"
        onClick={() => handleAddQuestion(0, 0, { forceNewQuestion: true })}
      >
        force-new
      </button>
    </div>
  );
};

describe('usePassageHandlers', () => {
  it('appends a new blank to the current diagram-labeling block by default', () => {
    render(<HookHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'smart-add' }));

    expect(screen.getByTestId('question-count')).toHaveTextContent('1');
    expect(screen.getByTestId('blank-count')).toHaveTextContent('2');
    expect(screen.getByTestId('question-number')).toHaveTextContent('1-2');
  });

  it('still allows creating a new question block after a diagram-labeling block', () => {
    render(<HookHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'force-new' }));

    expect(screen.getByTestId('question-count')).toHaveTextContent('2');
    expect(screen.getByTestId('blank-count')).toHaveTextContent('1');
    expect(screen.getByTestId('second-question-type')).toHaveTextContent('multiple-choice');
  });
});