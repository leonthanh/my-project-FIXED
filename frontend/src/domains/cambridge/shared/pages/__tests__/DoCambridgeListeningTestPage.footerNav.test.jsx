import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DoCambridgeListeningTestPage from '../DoCambridgeListeningTestPage';

const sampleListeningTest = {
  id: 11,
  title: 'Cambridge Listening Footer Nav',
  testType: 'ket-listening',
  duration: 30,
  classCode: 'CLS-11',
  teacherName: 'Teacher Demo',
  mainAudioUrl: 'test-audio.mp3',
  parts: [
    {
      title: 'Part 1',
      sections: [
        {
          questionType: 'fill',
          questions: [
            {
              questionText: 'Question 1 prompt',
              answers: { '1': 'park' },
            },
            {
              questionText: 'Question 2 prompt',
              answers: { '2': 'museum' },
            },
          ],
        },
      ],
    },
    {
      title: 'Part 2',
      sections: [
        {
          questionType: 'fill',
          questions: [
            {
              questionText: 'Question 3 prompt',
              answers: { '3': 'station' },
            },
          ],
        },
      ],
    },
  ],
};

describe('Cambridge listening footer navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    localStorage.setItem(
      'user',
      JSON.stringify({ id: 42, name: 'Cambridge Student', role: 'student' })
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('footer arrows move across questions and parts', async () => {
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

    const fetchMock = jest.fn((url, options = {}) => {
      if (String(url).includes('/cambridge/listening-tests/11') && (!options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(sampleListeningTest),
        });
      }

      if (String(url).includes('/cambridge/submissions/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submission: null }),
        });
      }

      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    jest.spyOn(window, 'fetch').mockImplementation(fetchMock);

    const { container } = render(
      <MemoryRouter initialEntries={['/cambridge/ket-listening/11']}>
        <Routes>
          <Route path="/cambridge/:testType/:id" element={<DoCambridgeListeningTestPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Play & Start/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const getActiveQuestionText = () =>
      container.querySelector('.cambridge-question-num-btn.active')?.textContent || '';
    const getActivePartText = () =>
      container.querySelector('.cambridge-part-tab.active .cambridge-part-number')?.textContent || '';

    await waitFor(() => {
      expect(getActiveQuestionText()).toContain('1');
      expect(getActivePartText()).toBe('1');
    });

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(getActiveQuestionText()).toContain('2');
      expect(getActivePartText()).toBe('1');
    });

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(getActiveQuestionText()).toContain('3');
      expect(getActivePartText()).toBe('2');
    });

    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

    await waitFor(() => {
      expect(getActiveQuestionText()).toContain('2');
      expect(getActivePartText()).toBe('1');
    });
  });
});