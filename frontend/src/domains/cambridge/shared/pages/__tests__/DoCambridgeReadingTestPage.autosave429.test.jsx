import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DoCambridgeReadingTestPage from '../DoCambridgeReadingTestPage';

const sampleReadingTest = {
  id: 12,
  title: 'Cambridge Reading Runtime',
  testType: 'ket-reading',
  duration: 30,
  classCode: 'CLS-01',
  teacherName: 'Teacher Demo',
  parts: [
    {
      title: 'Part 1',
      instruction: '<p>Read the sign and choose the correct answer.</p>',
      sections: [
        {
          questionType: 'sign-message',
          questions: [
            {
              questionText: 'What should students do here?',
              signText: '<p>Please walk.</p>',
              options: ['Walk carefully', 'Run quickly'],
            },
          ],
        },
      ],
    },
  ],
};

describe('Cambridge reading autosave runtime limit', () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    localStorage.setItem(
      'user',
      JSON.stringify({ id: 41, name: 'Cambridge Student', role: 'student' })
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

  test('shows autosave toast when Cambridge autosave hits backend runtime limiter', async () => {
    const fetchMock = jest.fn((url, options = {}) => {
      if (String(url).includes('/cambridge/reading-tests/12') && (!options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(sampleReadingTest),
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
      <MemoryRouter initialEntries={['/cambridge/reading/12']}>
        <Routes>
          <Route path="/cambridge/reading/:id" element={<DoCambridgeReadingTestPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /start test/i }));

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
    expect(
      await screen.findByText(/Autosave is temporarily busy/i)
    ).toBeInTheDocument();
    expect(await screen.findByText(/saved on this machine/i)).toBeInTheDocument();
  });
});