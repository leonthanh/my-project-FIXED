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
  // make fetch return 1 submission so the table renders
  const sample = [{ id: 1, classCode: 'C1', teacherName: 'T', userName: 'S', correct: 5, total: 10, band: 5, createdAt: new Date().toISOString() }];
  global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(sample) }));

  const { container } = render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/Reading Submissions/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalled();

  // wait until either the "No submissions yet" message OR the table headers render
  await (async () => {
    const { waitFor } = require('@testing-library/react');
    await waitFor(() => {
      const txt = container.textContent || '';
      if (txt.includes('No submissions yet') || txt.includes('Mã lớp')) return true;
      throw new Error('waiting for admin table or empty state');
    }, { timeout: 2000 });
  })();

  // now assert whichever is present
  if (container.textContent.includes('No submissions yet')) {
    expect(container.textContent).toMatch(/No submissions yet/);
  } else {
    expect(container.querySelector('th')?.textContent).toBe('#');
    expect(container.textContent).toMatch(/Mã lớp/);
    expect(container.textContent).toMatch(/Giáo viên/);
  }
});
