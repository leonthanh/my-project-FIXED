import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WritingTest from '../pages/WritingTest';

jest.mock('react-split', () => {
  const React = require('react');

  function SplitMock({ children }) {
    return React.createElement('div', { 'data-testid': 'split-mock' }, children);
  }

  return SplitMock;
});

describe('WritingTest autosave runtime limit', () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();

    localStorage.setItem('user', JSON.stringify({ id: 17, name: 'Student Test', role: 'student' }));
    localStorage.setItem('selectedTestId', '7');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();

    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    }
  });

  test('shows autosave toast when backend runtime limiter returns 429', async () => {
    const fetchMock = jest.fn((url, options = {}) => {
      if (String(url).includes('/writing/draft/active')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ submission: null }) });
      }

      if (String(url).includes('/writing-tests/detail/7') && (!options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 7,
              title: 'Writing Test 7',
              task1: '<p>Task 1 prompt</p>',
              task2: '<p>Task 2 prompt</p>',
            }),
        });
      }

      if (String(url).includes('/writing/draft/autosave')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              rateLimitSource: 'backend:runtime-sync',
              retryAfterSeconds: 9,
            }),
        });
      }

      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    jest.spyOn(window, 'fetch').mockImplementation(fetchMock);

    render(
      <MemoryRouter initialEntries={['/writing']}>
        <Routes>
          <Route path="/writing" element={<WritingTest />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /start test/i }));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/writing/draft/autosave'),
        expect.anything()
      );
    });

    expect(screen.getByText('Autosave')).toBeInTheDocument();
    expect(
      screen.getByText(/Server autosave is temporarily rate-limited by the backend/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/saved on this machine/i)).toBeInTheDocument();
  });
});