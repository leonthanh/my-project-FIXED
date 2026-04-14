import React from 'react';
import { render, screen } from '@testing-library/react';
import ListeningStudentStyleReview from '../ListeningStudentStyleReview';
import { generateDetailsFromSections } from '../../pages/ListeningResults';

const reviewTest = {
  id: 88,
  title: 'Listening Review Smoke',
  partAudioUrls: [
    '/uploads/audio/p1.mp3',
    '/uploads/audio/p2.mp3',
    '/uploads/audio/p3.mp3',
    '/uploads/audio/p4.mp3',
  ],
  partInstructions: [
    {
      title: 'Part 1',
      sections: [
        { sectionTitle: 'Questions 1', questionType: 'fill', startingQuestionNumber: 1 },
        { sectionTitle: 'Questions 2-3', questionType: 'abc', startingQuestionNumber: 2 },
      ],
    },
    {
      title: 'Part 2',
      sections: [
        { sectionTitle: 'Questions 4-5', questionType: 'multi-select', startingQuestionNumber: 4 },
        { sectionTitle: 'Questions 6-7', questionType: 'matching', startingQuestionNumber: 6 },
      ],
    },
    {
      title: 'Part 3',
      sections: [
        { sectionTitle: 'Questions 8-9', questionType: 'form-completion', startingQuestionNumber: 8 },
        { sectionTitle: 'Questions 10-11', questionType: 'notes-completion', startingQuestionNumber: 10 },
      ],
    },
    {
      title: 'Part 4',
      sections: [
        { sectionTitle: 'Questions 12-13', questionType: 'cloze-test', startingQuestionNumber: 12 },
        { sectionTitle: 'Questions 14-15', questionType: 'flowchart', startingQuestionNumber: 14 },
        { sectionTitle: 'Questions 16-17', questionType: 'map-labeling', startingQuestionNumber: 16 },
      ],
    },
  ],
  questions: [
    { partIndex: 0, sectionIndex: 0, questionIndex: 0, questionType: 'fill', questionText: 'Enter the gate number' },
    { partIndex: 0, sectionIndex: 1, questionIndex: 0, questionType: 'abc', questionText: 'Where is the meeting point?', options: ['Hall A', 'Hall B', 'Hall C'], correctAnswer: 'B' },
    { partIndex: 0, sectionIndex: 1, questionIndex: 1, questionType: 'abc', questionText: 'Which ticket did she buy?', options: ['Standard', 'Flexi', 'Return'], correctAnswer: 'A' },
    { partIndex: 1, sectionIndex: 0, questionIndex: 0, questionType: 'multi-select', questionText: 'Choose TWO facilities mentioned.', options: ['Pool', 'Gym', 'Library', 'Cafe'], requiredAnswers: 2, correctAnswer: 'A, B' },
    { partIndex: 1, sectionIndex: 1, questionIndex: 0, questionType: 'matching', leftItems: ['Alice', 'Ben'], rightItems: ['A. excited', 'B. nervous', 'C. calm'], answers: { 6: 'A', 7: 'C' } },
    {
      partIndex: 2,
      sectionIndex: 0,
      questionIndex: 0,
      questionType: 'form-completion',
      formTitle: 'Booking form',
      formRows: [
        { label: 'Name', isBlank: true, blankNumber: 1 },
        { label: 'Date', isBlank: true, blankNumber: 2 },
      ],
      answers: { 8: 'Anna', 9: 'Monday' },
    },
    {
      partIndex: 2,
      sectionIndex: 1,
      questionIndex: 0,
      questionType: 'notes-completion',
      notesTitle: 'Tour notes',
      notesText: '10 ___\n11 ___',
      answers: { 10: 'North', 11: 'Bus' },
    },
    {
      partIndex: 3,
      sectionIndex: 0,
      questionIndex: 0,
      questionType: 'cloze-test',
      tableMode: true,
      title: 'Travel options',
      instruction: 'Write NO MORE THAN TWO WORDS.',
      columns: ['Type', 'Cost', 'Comments'],
      clozeTable: {
        title: 'Travel options',
        instruction: 'Write NO MORE THAN TWO WORDS.',
        columns: ['Type', 'Cost', 'Comments'],
        rows: [
          {
            cells: ['Bus', '[BLANK] dollars', 'bring [BLANK]'],
            cellBlankAnswers: [[], ['12'], ['water']],
          },
        ],
      },
      rows: [
        {
          cells: ['Bus', '[BLANK] dollars', 'bring [BLANK]'],
          cellBlankAnswers: [[], ['12'], ['water']],
        },
      ],
    },
    {
      partIndex: 3,
      sectionIndex: 1,
      questionIndex: 0,
      questionType: 'flowchart',
      questionText: 'Repair process',
      options: ['A. check wires', 'B. replace fuse', 'C. restart unit'],
      steps: [
        { text: 'Inspect the panel' },
        { text: 'Choose [BLANK]', hasBlank: true, correctAnswer: 'B' },
        { text: 'Then [BLANK]', hasBlank: true, correctAnswer: 'C' },
      ],
      answers: { 14: 'B', 15: 'C' },
    },
    {
      partIndex: 3,
      sectionIndex: 2,
      questionIndex: 0,
      questionType: 'map-labeling',
      imageUrl: '/uploads/images/map.png',
      items: [
        { label: 'Reception', correctAnswer: 'A' },
        { label: 'Parking', correctAnswer: 'B' },
      ],
    },
  ],
};

const reviewSubmission = {
  id: 901,
  answers: {
    q1: 'Gate 4',
    q2: 'B',
    q3: 'C',
    q4: [0, 1],
    q6: 'A',
    q7: 'B',
    q8: 'Anna',
    q9: 'Tuesday',
    q10: 'North',
    q11: 'Train',
    q12: '12',
    q13: 'snacks',
    q14: 'B',
    q15: 'A',
    q16: 'A',
    q17: 'C',
  },
};

describe('ListeningStudentStyleReview', () => {
  test('renders the major listening review question types without runtime crashes', () => {
    const details = generateDetailsFromSections(reviewTest, reviewSubmission.answers);
    const { container } = render(
      <ListeningStudentStyleReview
        test={reviewTest}
        submission={reviewSubmission}
        details={details}
      />
    );

    expect(screen.getByText('Where is the meeting point?')).toBeInTheDocument();
    expect(screen.getByText('Choose TWO facilities mentioned.')).toBeInTheDocument();
    expect(screen.getByText('Booking form')).toBeInTheDocument();
    expect(screen.getByText('Tour notes')).toBeInTheDocument();
    expect(screen.getByText('Travel options')).toBeInTheDocument();
    expect(screen.getByText('Repair process')).toBeInTheDocument();
    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getAllByText('Original Audio').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('audio[controls]').length).toBeGreaterThan(0);
  });
});