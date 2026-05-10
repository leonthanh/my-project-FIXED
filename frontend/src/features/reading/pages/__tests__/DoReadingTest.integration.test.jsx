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
          sentenceCompletionTitleHtml:
            '<p class="ql-align-center"><span style="color: rgb(37, 99, 235); font-size: 28px;">Art and the Brain</span></p>',
          questions: [
            {
              questionNumber: 31,
              questionType: 'sentence-completion',
              questionText:
                '<p>The discipline of neuroaesthetics studies how art changes our …………</p>',
              options: ['interpretation', 'complexity', 'emotions'],
            },
            {
              questionNumber: 32,
              questionType: 'sentence-completion',
              questionText:
                '<p>Alex Forsythe believes many artists give their works the precise degree of ………… which most appeals to the viewer’s brain.</p>',
              options: ['interpretation', 'complexity', 'emotions'],
            },
            {
              questionNumber: 33,
              questionType: 'sentence-completion',
              questionText:
                '<p>Pleasing works of art often contain repeated ………… found in the natural world.</p>',
              options: ['movements', 'images', 'patterns'],
            },
          ],
        },
      ],
    },
  ],
};

const diagramLabelingTest = {
  id: 1,
  title: 'Diagram Labeling Test',
  durationMinutes: 60,
  passages: [
    {
      passageTitle: 'Passage 1',
      sections: [
        {
          questions: [
            ...Array.from({ length: 6 }, (_, index) => ({
              questionNumber: index + 1,
              type: 'multiple-choice',
            })),
            {
              questionNumber: '7-8',
              questionType: 'diagram-labeling',
              questionText:
                '<p>Label the diagram below. Choose <strong>ONE WORD ONLY</strong> for each answer.</p>',
              diagramTitle: 'How a canal lock works',
              diagramImageUrl:
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"></svg>',
              maxWords: 1,
              blanks: [
                {
                  promptHtml: '[NUMBER] [BLANK]',
                  correctAnswer: 'gates',
                  labelX: 12,
                  labelY: 18,
                  anchorX: 42,
                  anchorY: 34,
                  width: 200,
                },
                {
                  promptHtml: '[NUMBER] [BLANK]',
                  correctAnswer: 'basin',
                  labelX: 58,
                  labelY: 62,
                  anchorX: 68,
                  anchorY: 42,
                  width: 200,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const legacyDiagramLabelingCountTest = {
  id: 1,
  title: 'Legacy Diagram Labeling Count Test',
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
          questions: Array.from({ length: 6 }, (_, index) => ({
            questionNumber: index + 14,
            questionType: 'true-false-not-given',
            questionText: `<p>Statement ${index + 14}</p>`,
            correctAnswer: 'TRUE',
          })),
        },
        {
          questions: [
            {
              questionNumber: '20-26',
              questionType: 'diagram-labeling',
              questionText: '<p>Label the diagram below.</p>',
              paragraphText: 'Legacy [BLANK] paragraph [BLANK] that should not control numbering',
              diagramTitle: 'Legacy Diagram Count',
              diagramImageUrl:
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"></svg>',
              maxWords: 1,
              blanks: Array.from({ length: 7 }, (_, index) => ({
                id: `legacy-blank-${index + 1}`,
                promptHtml: '[NUMBER] [BLANK]',
                correctAnswer: `answer-${index + 1}`,
                labelX: 12 + index * 5,
                labelY: 14 + index * 8,
                anchorX: 40 + index * 4,
                anchorY: 22 + index * 6,
                width: 220,
              })),
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

    const titleBlock = container.querySelector('.section-question-group-title .ql-align-center');
    expect(titleBlock).not.toBeNull();
    expect(screen.getByText('Art and the Brain')).toBeInTheDocument();
    expect(container.querySelectorAll('.section-question-group-title')).toHaveLength(1);
    expect(container.querySelectorAll('.question-item .question-title-html')).toHaveLength(0);

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

  it('renders diagram-labeling blanks and focuses the matching question number', async () => {
    global.fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(diagramLabelingTest),
      });
    });

    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('How a canal lock works');
    expect(screen.getByText(/No more than 1 word/i)).toBeInTheDocument();

    const diagramQuestion = screen
      .getByText('How a canal lock works')
      .closest('.question-item');
    expect(diagramQuestion).not.toBeNull();

    const inputs = within(diagramQuestion).getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    fireEvent.focus(inputs[0]);
    await waitFor(() => {
      expect(screen.getByTestId('nav-question-7')).toHaveClass('active');
    });
    fireEvent.change(inputs[0], { target: { value: 'gates' } });

    fireEvent.focus(inputs[1]);
    await waitFor(() => {
      expect(screen.getByTestId('nav-question-8')).toHaveClass('active');
    });
    fireEvent.change(inputs[1], { target: { value: 'basin' } });

    await waitFor(() => {
      expect(inputs[0]).toHaveValue('gates');
      expect(inputs[1]).toHaveValue('basin');
    });
  });

  it('counts legacy diagram-labeling payloads by blanks instead of stale paragraph text', async () => {
    global.fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(legacyDiagramLabelingCountTest),
      });
    });

    render(
      <MemoryRouter initialEntries={["/reading/1"]}>
        <Routes>
          <Route path="/reading/:id" element={<DoReadingTest />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('PASSAGE 1');

    fireEvent.click(screen.getByTitle('Passage 2'));

    await screen.findByText('Legacy Diagram Count');
    expect(screen.getByText('14–26')).toBeInTheDocument();
    expect(screen.getByTestId('nav-question-20')).toBeInTheDocument();
    expect(screen.getByTestId('nav-question-26')).toBeInTheDocument();

    const diagramQuestion = screen
      .getByText('Legacy Diagram Count')
      .closest('.question-item');
    expect(diagramQuestion).not.toBeNull();

    const inputs = within(diagramQuestion).getAllByRole('textbox');
    expect(inputs).toHaveLength(7);

    fireEvent.focus(inputs[6]);
    await waitFor(() => {
      expect(screen.getByTestId('nav-question-26')).toHaveClass('active');
    });
  });
});
