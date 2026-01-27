import React from 'react';
import { act, render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
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
    { partIndex: 0, sectionIndex: 0, questionIndex: 0, questionType: 'notes-completion', notesText: '1___ 2___ 3___ 4___ 5___ 6___ 7___ 8___ 9___ 10___', answers: { 1: 'a',2:'b',3:'c',4:'d',5:'e',6:'f',7:'g',8:'h',9:'i',10:'j' } },
    { partIndex: 1, sectionIndex: 0, questionIndex: 0, questionType: 'abc', requiredAnswers: 2 },
    { partIndex: 1, sectionIndex: 1, questionIndex: 0, questionType: 'matching', leftItems: ['A','B','C','D','E','F'] },
    // Part3 multi-select question
    { partIndex: 2, sectionIndex: 0, questionIndex: 0, questionType: 'fill', requiredAnswers: 2, questionText: 'Which TWO ...', options: ['Option A','Option B','Option C'] },
    { partIndex: 2, sectionIndex: 1, questionIndex: 0, questionType: 'fill', answers: { '23': 'D', '24': 'A', '25': 'C', '26': 'G', '27': 'F' }, leftItems: ['Sid','Jack','Naomi','Anya','Zara'], rightItems: ['A','B','C','D','E','F','G'] },
    { partIndex: 2, sectionIndex: 2, questionIndex: 0, questionType: 'abc' },
    { partIndex: 3, sectionIndex: 0, questionIndex: 0, questionType: 'notes-completion', notesText: '31___ 32___ 33___ 34___ 35___ 36___ 37___ 38___ 39___ 40___', answers: {31:'a'} }
  ]
};

describe('Listening autosave localStorage', () => {
  beforeEach(() => {
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTest) });
    });
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  test('saves answers to localStorage and restores after remount', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/listening/3"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // Navigate to Part 3 to render the multi-select question
    const part3Btn = await screen.findByText(/Part 3/);
    await act(async () => { part3Btn.click(); });

    // Wait for the multi-select question to render (find checkboxes)
    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    const checkbox = checkboxes[0];

    // Click the first checkbox
    fireEvent.click(checkbox);

    // Wait for autosave to localStorage
    await waitFor(() => expect(localStorage.getItem('listening:3:state:anon')).not.toBeNull());

    const saved = JSON.parse(localStorage.getItem('listening:3:state:anon'));
    expect(saved).toHaveProperty('answers');
    const savedAnswers = saved.answers || {};
    const savedKeys = Object.keys(savedAnswers);
    expect(savedKeys.length).toBeGreaterThan(0);
    const firstKey = savedKeys[0];
    expect(Array.isArray(savedAnswers[firstKey])).toBe(true);
    expect(savedAnswers[firstKey]).toContain(0);

    // Unmount and remount to simulate reload
    unmount();

    render(
      <MemoryRouter initialEntries={["/listening/3"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // Navigate to Part 3 and check that the checkbox remains checked
    const part3Btn2 = await screen.findByText(/Part 3/);
    await act(async () => { part3Btn2.click(); });

    const checkboxes2 = await screen.findAllByRole('checkbox');
    await waitFor(() => expect(checkboxes2.some(cb => cb.checked)).toBe(true));
  });
});
