import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DoListeningTest from '../pages/DoListeningTest';

const sampleTest = {
  id: 3,
  partInstructions: [
    { title: 'Part 1', sections: [{ sectionTitle: 'Questions 1-10', questionType: 'notes-completion' }] },
    { title: 'Part 2', sections: [{ sectionTitle: 'Questions 11-14', questionType: 'abc' }, { sectionTitle: 'Questions 15-20', questionType: 'matching' }] },
    { title: 'Part 3', sections: [
      { sectionTitle: 'Questions 21-22', questionType: 'multi-select' },
      { sectionTitle: 'Questions 23-27', questionType: 'matching' },
      { sectionTitle: 'Questions 28-30', questionType: 'abc' }
    ] },
    { title: 'Part 4', sections: [{ sectionTitle: 'Questions 31-40', questionType: 'notes-completion' }] },
  ],
  questions: [
    // Part1 - 10 notes blanks (stubbed as one question with answers map)
    { partIndex: 0, sectionIndex: 0, questionIndex: 0, questionType: 'notes-completion', notesText: '1___ 2___ 3___ 4___ 5___ 6___ 7___ 8___ 9___ 10___', answers: { 1: 'a',2:'b',3:'c',4:'d',5:'e',6:'f',7:'g',8:'h',9:'i',10:'j' } },
    // Part2 (some ABCs)
    { partIndex: 1, sectionIndex: 0, questionIndex: 0, questionType: 'abc', requiredAnswers: 2 },
    { partIndex: 1, sectionIndex: 1, questionIndex: 0, questionType: 'matching', leftItems: ['A','B','C','D','E','F'] },
    // Part3: first section is multi-select *in partInstructions* but questionType is stored as 'fill' with requiredAnswers
    { partIndex: 2, sectionIndex: 0, questionIndex: 0, questionType: 'fill', requiredAnswers: 2, questionText: 'Which TWO ...' },
    // Matching section has answers keyed 23-27
    { partIndex: 2, sectionIndex: 1, questionIndex: 0, questionType: 'fill', answers: { '23': 'D', '24': 'A', '25': 'C', '26': 'G', '27': 'F' }, leftItems: ['Sid','Jack','Naomi','Anya','Zara'], rightItems: ['A','B','C','D','E','F','G'] },
    // Part3 abc
    { partIndex: 2, sectionIndex: 2, questionIndex: 0, questionType: 'abc' },
    // Part4 notes
    { partIndex: 3, sectionIndex: 0, questionIndex: 0, questionType: 'notes-completion', notesText: '31___ 32___ 33___ 34___ 35___ 36___ 37___ 38___ 39___ 40___', answers: {31:'a'} }
  ]
};

describe('Listening test numbering', () => {
  beforeEach(() => {
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTest) });
    });
    // jsdom doesn't implement scrollIntoView; stub it to avoid errors during render
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders correct section numbers when question has requiredAnswers but questionType is fill', async () => {
    render(
      <MemoryRouter initialEntries={["/listening/3"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // navigate to Part 2 (footer tab) to check its sections render correctly
    const part2Btn = await screen.findByText(/Part 2/);
    await userEvent.click(part2Btn);

    // Wait for the part and section titles to appear
    await screen.findByText(/Questions 11-14/);
    // The matching section should render as Questions 15-20 (not 19-24)
    expect(screen.getByText(/Questions 15-20/)).toBeInTheDocument();

    // Also check Part 3 remains correct
    const part3Btn = await screen.findByText(/Part 3/);
    await userEvent.click(part3Btn);
    await screen.findByText(/Questions 21-22/);
    expect(screen.getByText(/Questions 23-27/)).toBeInTheDocument();
  });
});
