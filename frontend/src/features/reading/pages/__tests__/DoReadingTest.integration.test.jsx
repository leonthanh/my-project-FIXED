import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DoReadingTest from '../DoReadingTest';

// stub scrollIntoView to avoid JSDOM errors
Element.prototype.scrollIntoView = jest.fn(function scrollIntoView() {
  if (this && typeof this.setAttribute === 'function') {
    this.setAttribute('data-scrolled', 'true');
  }
});

const simpleTest = {
  id: 1,
  title: 'Sample Test',
  durationMinutes: 60,
  passages: [
    {
      passageTitle: 'Passage 1',
      sections: [
        { questions: [{ questionNumber: 1, type: 'multiple-choice' }, { questionNumber: 2, type: 'multiple-choice' }, { questionNumber: 3, type: 'multiple-choice' }] }
      ]
    },
    {
      passageTitle: 'Passage 2',
      sections: [
        { questions: [{ questionNumber: 4, type: 'multiple-choice' }, { questionNumber: 5, type: 'multiple-choice' }] }
      ]
    }
  ]
};

const clozeLegacyStartTest = {
  id: 1,
  title: 'Cloze Legacy Start Test',
  durationMinutes: 60,
  passages: [
    {
      passageTitle: 'Passage 1',
      sections: [
        {
          questions: [
            { questionNumber: 1, type: 'multiple-choice' },
            { questionNumber: 2, type: 'multiple-choice' },
            {
              questionNumber: '3-5',
              startQuestion: 10,
              questionType: 'cloze-test',
              tableMode: true,
              clozeTable: {
                title: 'GEO-ENGINEERING PROJECTS',
                columns: ['Procedure', 'Aim'],
                rows: [
                  { cells: ['place [BLANK] in the sea', 'to encourage [BLANK] to form'] },
                  { cells: ['release aerosol sprays into the stratosphere', 'to create [BLANK]'] },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

const latePassageClozeNavigationTest = {
  id: 1,
  title: 'Late Passage Navigation Test',
  durationMinutes: 60,
  passages: [
    {
      passageTitle: 'Passage 1',
      sections: [
        {
          questions: Array.from({ length: 13 }, (_, index) => ({
            questionNumber: index + 1,
            type: 'multiple-choice',
          })),
        },
      ],
    },
    {
      passageTitle: 'Passage 2',
      sections: [
        {
          questions: Array.from({ length: 13 }, (_, index) => ({
            questionNumber: index + 14,
            type: 'multiple-choice',
          })),
        },
      ],
    },
    {
      passageTitle: 'Passage 3 Target',
      sections: [
        {
          questions: [
            ...Array.from({ length: 7 }, (_, index) => ({
              questionNumber: index + 27,
              type: 'multiple-choice',
            })),
            {
              questionNumber: '34-40',
              questionType: 'cloze-test',
              tableMode: true,
              clozeTable: {
                title: 'Late Passage Cloze',
                columns: ['Procedure', 'Aim'],
                rows: [
                  { cells: ['first [BLANK]', 'second [BLANK]'] },
                  { cells: ['third [BLANK]', 'fourth [BLANK]'] },
                  { cells: ['fifth [BLANK]', 'sixth [BLANK]'] },
                  { cells: ['seventh [BLANK]', 'done'] },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

const sentenceCompletionInlineTest = {
  id: 1,
  title: 'Sentence Completion Inline Test',
  durationMinutes: 60,
  passages: [
    {
      passageTitle: 'Passage 1',
      sections: [
        {
          questions: [
            {
              questionNumber: 31,
              questionType: 'sentence-completion',
              questionText:
                '<p>The discipline of neuroaesthetics studies how art changes our …………</p>',
              options: ['interpretation', 'complexity', 'emotions'],
            },
          ],
        },
      ],
    },
  ],
};

describe('DoReadingTest integration - part navigation and focus', () => {
  beforeEach(() => {
    // ensure test is marked started
    localStorage.setItem('reading_test_1_started:anon', 'true');
    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(simpleTest) });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('clicking part dot focuses first question of that part', async () => {
    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    // wait for passage to render
    await screen.findByText('PASSAGE 1');

    // part 2 button (select by title to avoid ambiguity with question nav button)
    const part2 = screen.getByTitle('Passage 2');
    fireEvent.click(part2);

    // after click, the first question of part 2 is q_4
    await waitFor(() => expect(screen.getByTestId('nav-question-4')).toHaveClass('active'));
  });

  it('clicking Next focuses first question of next part', async () => {
    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('PASSAGE 1');

    const nextBtn = screen.getByText('Next');
    fireEvent.click(nextBtn);

    await waitFor(() => expect(screen.getByTestId('nav-question-4')).toHaveClass('active'));
  });

  it('after submit, closing result modal navigates to select-test', async () => {
    // mock confirm to allow submit despite unanswered
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    // mock fetch to return test (first call) and submit response (second call)
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation((url, opts) => {
      if (String(url).endsWith('/submit')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ submissionId: 999, correctCount: 2, totalQuestions: 3, score: 66, scorePercentage: 66 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(simpleTest) });
    });

    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
          <Route path="/select-test" element={<div>SELECT TEST PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );

    // wait for test to render
    await screen.findByText('PASSAGE 1');

    // click submit
    const submitBtn = screen.getByTestId('submit-button');
    fireEvent.click(submitBtn);

    // Confirm modal appears; find confirm button and click
    const confirmBtn = await screen.findByText('Submit answers');
    fireEvent.click(confirmBtn);

    // Wait for result modal to open.
    await screen.findByText(/Reading Results/i);

    // Click Close on result modal and expect to navigate to select-test.
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);

    // Expect select-test route to be rendered
    await waitFor(() => {
      expect(screen.getByText('SELECT TEST PAGE')).toBeTruthy();
    });

    mockFetch.mockRestore();
    window.confirm.mockRestore();
  });

  it('uses questionNumber instead of stale startQuestion for cloze table numbering and navigation', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(clozeLegacyStartTest) });
    });

    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('GEO-ENGINEERING PROJECTS');

    const inlineNumbers = Array.from(document.querySelectorAll('.cloze-inline-number')).map((node) =>
      node.textContent?.trim()
    );
    expect(inlineNumbers).toEqual(['3', '4', '5']);

    const blankWrappers = Array.from(document.querySelectorAll('.cloze-inline-wrapper'));
    const secondBlankWrapper = blankWrappers[1];
    expect(secondBlankWrapper).toBeTruthy();
    secondBlankWrapper.removeAttribute('data-scrolled');

    fireEvent.click(screen.getByTestId('nav-question-4'));

    await waitFor(() => {
      expect(secondBlankWrapper).toHaveAttribute('data-scrolled', 'true');
    });
  });

  it('navigates late footer questions to passage 3 when the final cloze block spans multiple blanks', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(latePassageClozeNavigationTest) });
    });

    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('PASSAGE 1');
    expect(screen.getByTestId('palette-part-toggle-2').textContent).toContain('14');

    fireEvent.click(screen.getByTestId('nav-question-35'));

    await screen.findByText('PASSAGE 3');
    await screen.findByText('Passage 3 Target');
    await screen.findByText('Late Passage Cloze');
  });

  it('renders sentence-completion combobox inline at the authored blank position', async () => {
    global.fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sentenceCompletionInlineTest),
      });
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('PASSAGE 1');
    await screen.findByText('List of Endings');

    await waitFor(() => {
      expect(
        container.querySelector('.question-text.sentence-completion-question-text')
      ).not.toBeNull();
    });

    const inlineSentence = container.querySelector(
      '.question-text.sentence-completion-question-text'
    );
    const select = within(inlineSentence).getByRole('combobox', {
      name: /choose ending for question 31/i,
    });

    expect(select).toBeInTheDocument();
    expect(
      container.querySelector('.question-sentence-completion > .sentence-completion-inline')
    ).toBeNull();

    fireEvent.change(select, { target: { value: 'C' } });

    await waitFor(() => {
      expect(select).toHaveValue('C');
      expect(container.querySelector('.question-item.answered')).not.toBeNull();
    });
  });
});
