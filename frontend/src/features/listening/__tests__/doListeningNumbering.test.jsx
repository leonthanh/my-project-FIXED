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

const mixedTypeTest = {
  id: 77,
  title: 'Mixed Runtime Smoke',
  partInstructions: [
    {
      title: 'Part 1',
      sections: [
        { sectionTitle: 'Questions 1', questionType: 'fill', startingQuestionNumber: 1 },
        { sectionTitle: 'Questions 2-3', questionType: 'abc', startingQuestionNumber: 2 },
        { sectionTitle: 'Questions 4-5', questionType: 'abcd', startingQuestionNumber: 4 },
      ],
    },
    {
      title: 'Part 2',
      sections: [
        { sectionTitle: 'Questions 6-7', questionType: 'multi-select', startingQuestionNumber: 6 },
        { sectionTitle: 'Questions 8-9', questionType: 'matching', startingQuestionNumber: 8 },
      ],
    },
    {
      title: 'Part 3',
      sections: [
        { sectionTitle: 'Questions 10-11', questionType: 'form-completion', startingQuestionNumber: 10 },
        { sectionTitle: 'Questions 12-13', questionType: 'notes-completion', startingQuestionNumber: 12 },
      ],
    },
    {
      title: 'Part 4',
      sections: [
        { sectionTitle: 'Questions 14-15', questionType: 'cloze-test', startingQuestionNumber: 14 },
        { sectionTitle: 'Questions 16-17', questionType: 'flowchart', startingQuestionNumber: 16 },
        { sectionTitle: 'Questions 18-19', questionType: 'map-labeling', startingQuestionNumber: 18 },
      ],
    },
  ],
  questions: [
    { partIndex: 0, sectionIndex: 0, questionIndex: 0, questionType: 'fill', questionText: 'Enter the gate number' },
    { partIndex: 0, sectionIndex: 1, questionIndex: 0, questionType: 'abc', questionText: 'Where is the meeting point?', options: ['Hall A', 'Hall B', 'Hall C'] },
    { partIndex: 0, sectionIndex: 1, questionIndex: 1, questionType: 'abc', questionText: 'Which ticket did she buy?', options: ['Standard', 'Flexi', 'Return'] },
    { partIndex: 0, sectionIndex: 2, questionIndex: 0, questionType: 'abcd', questionText: 'Which room changed?', options: ['Blue', 'Green', 'Red', 'Yellow'] },
    { partIndex: 0, sectionIndex: 2, questionIndex: 1, questionType: 'abcd', questionText: 'Which tool is needed?', options: ['Hammer', 'Saw', 'Drill', 'Brush'] },
    { partIndex: 1, sectionIndex: 0, questionIndex: 0, questionType: 'multi-select', questionText: 'Choose TWO facilities mentioned.', options: ['Pool', 'Gym', 'Library', 'Cafe'], requiredAnswers: 2 },
    { partIndex: 1, sectionIndex: 1, questionIndex: 0, questionType: 'matching', leftItems: ['Alice', 'Ben'], rightItems: ['A. excited', 'B. nervous', 'C. calm'] },
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
      answers: { 10: 'Anna', 11: 'Monday' },
    },
    {
      partIndex: 2,
      sectionIndex: 1,
      questionIndex: 0,
      questionType: 'notes-completion',
      notesTitle: 'Tour notes',
      notesText: '12 ___\n13 ___',
      answers: { 12: 'North', 13: 'Bus' },
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
      answers: { 16: 'B', 17: 'C' },
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

describe('Listening test numbering', () => {
  beforeEach(() => {
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTest) });
    });
    // jsdom doesn't implement scrollIntoView; stub it to avoid errors during render
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
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

  test('renders all major listening section types without crashing when switching parts', async () => {
    window.fetch.mockImplementation((url) => {
      const normalizedUrl = String(url || '');

      if (normalizedUrl.includes('/listening-submissions/77/active')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve(mixedTypeTest) });
    });

    localStorage.setItem('listening:77:state:anon', JSON.stringify({ started: true, audioPlayed: {}, answers: {} }));

    render(
      <MemoryRouter initialEntries={["/listening/77"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Questions 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    expect(screen.getByText('Where is the meeting point?')).toBeInTheDocument();
    expect(screen.getByText('Which tool is needed?')).toBeInTheDocument();

    await userEvent.click(await screen.findByText(/Part 2/));
    expect(await screen.findByText('Choose TWO facilities mentioned.')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('C. calm')).toBeInTheDocument();

    await userEvent.click(await screen.findByText(/Part 3/));
    expect(await screen.findByText('Booking form')).toBeInTheDocument();
    expect(screen.getByText('Tour notes')).toBeInTheDocument();

    await userEvent.click(await screen.findByText(/Part 4/));
    expect(await screen.findByText('Travel options')).toBeInTheDocument();
    expect(screen.getByText('Repair process')).toBeInTheDocument();
    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  test('shows number badges for notes and table completion blanks in the student runtime', async () => {
    window.fetch.mockImplementation((url) => {
      const normalizedUrl = String(url || '');

      if (normalizedUrl.includes('/listening-submissions/77/active')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve(mixedTypeTest) });
    });

    localStorage.setItem('listening:77:state:anon', JSON.stringify({ started: true, audioPlayed: {}, answers: {} }));

    render(
      <MemoryRouter initialEntries={['/listening/77']}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByText(/Part 3/));
    const notesInput = await screen.findByLabelText('Question 12');
    expect(notesInput.previousElementSibling).toHaveTextContent('12');

    await userEvent.click(await screen.findByText(/Part 4/));
    const tableInput = await screen.findByLabelText('Question 14');
    expect(tableInput.previousElementSibling).toHaveTextContent('14');
  });

  test('renders flowchart dropdowns with an opaque overlay menu in the student runtime', async () => {
    window.fetch.mockImplementation((url) => {
      const normalizedUrl = String(url || '');

      if (normalizedUrl.includes('/listening-submissions/77/active')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve(mixedTypeTest) });
    });

    localStorage.setItem('listening:77:state:anon', JSON.stringify({ started: true, audioPlayed: {}, answers: {} }));

    render(
      <MemoryRouter initialEntries={['/listening/77']}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByText(/Part 4/));

    const flowchartSelectButtons = await screen.findAllByRole('button', { name: 'Select' });
    await userEvent.click(flowchartSelectButtons[0]);

    const listbox = screen.getByRole('listbox');
    expect(listbox.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(listbox.style.zIndex).toBe('120');
  });

  test('gives the expanded footer part enough width for its navigator buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/listening/3']}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    const part3Label = await screen.findByText(/Part 3/);
    await userEvent.click(part3Label);

    const part3Tab = part3Label.parentElement?.parentElement;
    const part4Label = screen.getByText(/Part 4/);
    const part4Tab = part4Label.parentElement?.parentElement;

    expect(part3Tab).toBeTruthy();
    expect(part4Tab).toBeTruthy();
    expect(part3Tab.style.flex.startsWith('1 1 ')).toBe(true);
    expect(Number.parseInt(part3Tab.style.minWidth, 10)).toBeGreaterThan(Number.parseInt(part4Tab.style.minWidth, 10));
    expect(part3Tab.style.maxWidth).toBe('none');
  });
});
