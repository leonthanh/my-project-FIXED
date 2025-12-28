import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminReadingSubmissions from '../AdminReadingSubmissions';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});
afterEach(() => jest.restoreAllMocks());

test('renders header and fetches submissions', async () => {
  const { container } = render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );
  expect(screen.getByText(/Reading Submissions/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalled();
});
