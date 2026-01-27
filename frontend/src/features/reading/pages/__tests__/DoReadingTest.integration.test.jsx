import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DoReadingTest from '../DoReadingTest';

// stub scrollIntoView to avoid JSDOM errors
Element.prototype.scrollIntoView = jest.fn();

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

describe('DoReadingTest integration - part navigation and focus', () => {
  beforeEach(() => {
    // ensure test is marked started
    localStorage.setItem('reading_test_1_started', 'true');
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
    const confirmBtn = await screen.findByText('Xác nhận nộp');
    fireEvent.click(confirmBtn);

    // Wait for result modal to open (it contains text 'Reading — Kết quả')
    await screen.findByText(/Reading — Kết quả/i);

    // Click 'Đóng' on result modal and expect to navigate to select-test
    const closeBtn = screen.getByText('Đóng');
    fireEvent.click(closeBtn);

    // Expect select-test route to be rendered
    await waitFor(() => {
      expect(screen.getByText('SELECT TEST PAGE')).toBeTruthy();
    });

    mockFetch.mockRestore();
    window.confirm.mockRestore();
  });
});
