import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentNavbar from '../StudentNavbar';

describe('StudentNavbar profile navigation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 5, name: 'test', phone: '0901000000', role: 'student' })
    );

    global.fetch = jest.fn((url) => {
      if (String(url).includes('writing/list')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (String(url).includes('unseen-count')) {
        return Promise.resolve({ ok: true, json: async () => ({ count: 0 }) });
      }

      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    sessionStorage.clear();
  });

  test('navigates to the self profile page when the account chip is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/select-test?platform=orange&type=ket&tab=listening']}>
        <Routes>
          <Route
            path="/select-test"
            element={
              <>
                <StudentNavbar />
                <div>Test hub</div>
              </>
            }
          />
          <Route path="/profile" element={<div>Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const profileLink = await screen.findByRole('link', { name: 'test' });
    expect(profileLink).toHaveAttribute('href', '/profile');

    fireEvent.click(profileLink);

    await waitFor(() => {
      expect(screen.getByText('Profile Page')).toBeInTheDocument();
    });
  });
});