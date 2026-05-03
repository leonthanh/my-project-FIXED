import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  CambridgeQuestionDisplay,
  CompactCambridgeQuestionDisplay,
} from '../CambridgeQuestionCards';

jest.mock('../../../../../shared/components/LineIcon.jsx', () => () => (
  <span aria-hidden="true">icon</span>
));

const baseQuestion = {
  questionType: 'abc',
  questionText: 'When did Ben go to live in his new flat?',
  options: ['A. two days ago', 'B. two weeks ago', 'C. two months ago'],
  correctAnswer: 'B',
};

const baseStyles = {
  questionHeader: {},
  optionLabel: {},
  optionSelected: {},
  optionCorrect: {},
  optionWrong: {},
  optionBadge: {},
  optionText: {},
  optionsContainer: {},
};

const buildSharedProps = () => ({
  question: baseQuestion,
  questionKey: '0-0-0',
  questionNum: 11,
  answers: { '0-0-0': 'B' },
  submitted: false,
  results: null,
  activeQuestion: null,
  styles: baseStyles,
  handleAnswerChange: jest.fn(),
  toggleFlag: jest.fn(),
  flaggedQuestions: new Set(),
  isDarkMode: false,
  currentPart: {},
  questionRefs: { current: {} },
  resolveImgSrc: jest.fn(() => ''),
  DrawLinesComponent: () => null,
});

describe('CambridgeQuestionCards multiple choice labels', () => {
  it('keeps only the badge label in the full question card', () => {
    render(<CambridgeQuestionDisplay {...buildSharedProps()} />);

    expect(screen.queryByText('A. two days ago')).not.toBeInTheDocument();
    expect(screen.queryByText('B. two weeks ago')).not.toBeInTheDocument();
    expect(screen.queryByText('C. two months ago')).not.toBeInTheDocument();
    expect(screen.getByText('two days ago')).toBeInTheDocument();
    expect(screen.getByText('two weeks ago')).toBeInTheDocument();
    expect(screen.getByText('two months ago')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByLabelText('Flag question 11')).toBeInTheDocument();
  });

  it('keeps only the badge label in the compact question card', () => {
    const props = buildSharedProps();

    render(
      <CompactCambridgeQuestionDisplay
        question={props.question}
        questionKey={props.questionKey}
        questionNum={props.questionNum}
        answers={props.answers}
        submitted={props.submitted}
        results={props.results}
        activeQuestion={props.activeQuestion}
        styles={props.styles}
        handleAnswerChange={props.handleAnswerChange}
        questionRefs={props.questionRefs}
        isDarkMode={props.isDarkMode}
        toggleFlag={props.toggleFlag}
        flaggedQuestions={props.flaggedQuestions}
      />
    );

    expect(screen.queryByText('A. two days ago')).not.toBeInTheDocument();
    expect(screen.queryByText('B. two weeks ago')).not.toBeInTheDocument();
    expect(screen.queryByText('C. two months ago')).not.toBeInTheDocument();
    expect(screen.getByText('two days ago')).toBeInTheDocument();
    expect(screen.getByText('two weeks ago')).toBeInTheDocument();
    expect(screen.getByText('two months ago')).toBeInTheDocument();
    expect(screen.getByLabelText('Flag question 11')).toBeInTheDocument();
  });
});