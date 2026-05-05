import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DoCambridgeListeningTestPage from '../DoCambridgeListeningTestPage';

const sampleListeningTest = {
  id: 13,
  title: 'Cambridge Listening Runtime',
  testType: 'ket-listening',
  duration: 30,
  classCode: 'CLS-02',
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
              questionText: 'Write one word.',
              options: [],
              answers: { '1': 'park' },
            },
          ],
        },
      ],
    },
  ],
};

describe('Cambridge listening autosave runtime limit', () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

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

    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    }
  });

  test('shows autosave toast when Cambridge listening autosave hits backend runtime limiter', async () => {
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

    const fetchMock = jest.fn((url, options = {}) => {
      if (String(url).includes('/cambridge/listening-tests/13') && (!options.method || options.method === 'GET')) {
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

      if (String(url).includes('/cambridge/submissions/autosave')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              rateLimitSource: 'backend:runtime-sync',
              retryAfterSeconds: 8,
            }),
        });
      }

      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    jest.spyOn(window, 'fetch').mockImplementation(fetchMock);

    render(
      <MemoryRouter initialEntries={['/cambridge/listening/13']}>
        <Routes>
          <Route path="/cambridge/listening/:id" element={<DoCambridgeListeningTestPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Play & Start/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/cambridge/submissions/autosave'),
        expect.anything()
      );
    });

    expect(await screen.findByText('Autosave')).toBeInTheDocument();
    expect(await screen.findByText(/Autosave is temporarily busy/i)).toBeInTheDocument();
    expect(await screen.findByText(/saved on this machine/i)).toBeInTheDocument();
  });
});