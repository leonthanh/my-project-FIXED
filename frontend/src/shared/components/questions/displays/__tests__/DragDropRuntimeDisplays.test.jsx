import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ImageClozeDisplay from '../ImageClozeDisplay';
import WordDragClozeDisplay from '../WordDragClozeDisplay';
import PeopleMatchingDisplay from '../PeopleMatchingDisplay';
import ClozeMCDisplay from '../ClozeMCDisplay';

function ImageClozeHarness() {
  const [answers, setAnswers] = useState({});

  return (
    <ImageClozeDisplay
      section={{
        id: 'image-cloze-part-3',
        questions: [
          {
            passageTitle: 'A picnic story',
            passageText: 'Ben picks up (1) for lunch.',
            imageBank: [
              { id: 'img-1', word: 'an apple', url: 'https://example.com/apple.jpg' },
            ],
            answers: { '1': 'img-1' },
            titleQuestion: { enabled: false },
          },
        ],
      }}
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

function WordDragHarness() {
  const [answers, setAnswers] = useState({});

  return (
    <WordDragClozeDisplay
      section={{
        id: 'word-drag-part-4',
        questions: [
          {
            passageTitle: 'At school',
            passageText: 'Tom (1) to school every day.',
            exampleAnswer: 'walks',
            exampleOptions: ['walks', 'run', 'read'],
            blanks: [
              { number: 1, options: ['goes', 'go', 'going'], correctAnswer: 'goes' },
            ],
          },
        ],
      }}
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

function PeopleMatchingHarness() {
  const [answers, setAnswers] = useState({});

  return (
    <PeopleMatchingDisplay
      section={{
        id: 'people-matching-part-2',
        questions: [
          {
            people: [{ id: 'P1', name: 'Anna', need: 'likes music' }],
            texts: [{ id: 'A', title: 'Concert', content: 'A fun music show.' }],
          },
        ],
      }}
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

function ClozeMCHarness() {
  const [answers, setAnswers] = useState({});

  return (
    <ClozeMCDisplay
      section={{
        id: 'cloze-mc-part-4',
        passage: '<p>He (1) home after school.</p>',
        blanks: [
          {
            number: 1,
            options: ['A. goes', 'B. go', 'C. going', 'D. went'],
            correctAnswer: 'A',
          },
        ],
      }}
      startingNumber={1}
      answers={answers}
      submitted={false}
      testType="pet-reading"
      onAnswerChange={(answerKey, value) => {
        setAnswers((prev) => ({
          ...prev,
          [answerKey]: value,
        }));
      }}
    />
  );
}

describe('Cambridge drag-drop runtimes', () => {
  test('image cloze renders assigned image and clear control after a drop', () => {
    const { container } = render(<ImageClozeHarness />);

    const blank = container.querySelector('#question-1');
    expect(blank).not.toBeNull();

    fireEvent.drop(blank, {
      dataTransfer: {
        getData: jest.fn((key) => (key === 'imgId' ? 'img-1' : '')),
      },
    });

    expect(blank).toHaveTextContent('an apple');
    expect(screen.getByTitle('Bỏ ảnh này')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Bỏ ảnh này'));

    expect(blank).not.toHaveTextContent('an apple');
  });

  test('word drag cloze accepts a dropped word and can clear it again', () => {
    const { container } = render(<WordDragHarness />);

    const blank = container.querySelector('#question-1');
    expect(blank).not.toBeNull();

    fireEvent.drop(blank, {
      dataTransfer: {
        getData: jest.fn(() => 'goes'),
      },
    });

    expect(blank).toHaveTextContent('goes');

    fireEvent.click(blank);

    expect(blank).not.toHaveTextContent('goes');
  });

  test('people matching accepts a dropped text id without crashing', () => {
    render(<PeopleMatchingHarness />);

    const answerZone = screen.getByLabelText('Question 1 answer');
    fireEvent.drop(answerZone, {
      dataTransfer: {
        getData: jest.fn(() => 'A'),
      },
    });

    expect(answerZone).toHaveTextContent('A');
  });

  test('cloze mc token mode accepts a dropped option label and renders its text', () => {
    const { container } = render(<ClozeMCHarness />);

    const gap = container.querySelector('#question-1');
    expect(gap).not.toBeNull();

    fireEvent.drop(gap, {
      dataTransfer: {
        getData: jest.fn(() => 'A'),
      },
    });

    expect(gap).toHaveTextContent('goes');
  });
});