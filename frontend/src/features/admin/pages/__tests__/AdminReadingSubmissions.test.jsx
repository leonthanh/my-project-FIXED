import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminReadingSubmissions from '../AdminReadingSubmissions';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';

beforeEach(() => {
  // Mock localStorage for teacher user
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Test Teacher', role: 'teacher' });
    return null;
  });
  jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});
afterEach(() => jest.restoreAllMocks());

test('renders header and fetches submissions', async () => {
  // make fetch return 1 submission so the table renders - match new data structure
  const sample = [{ 
    id: 1, 
    testId: '1',
    userName: 'Student1', 
    correct: 5, 
    total: 10, 
    band: 5, 
    scorePercentage: 50,
    feedback: null,
    feedbackBy: null,
    createdAt: new Date().toISOString(),
    ReadingTest: { id: 1, classCode: 'C1', teacherName: 'Teacher1', title: 'Test 1' },
    User: { phone: '0123456789' }
  }];
  
  global.fetch.mockImplementation((url) => {
    // Match the new admin/list endpoint
    if (url.includes('reading-submissions/admin/list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('reading-submissions/admin/list'));
  expect(await screen.findByText(/Student1/)).toBeInTheDocument();
  expect(screen.getByText(/Class Code/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Test Teacher/i).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByText(/Student1/));
  expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
});

test('shows delete action to admins and removes a submission after confirmation', async () => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Admin User', role: 'admin' });
    return null;
  });

  const sample = [{
    id: 1,
    testId: '1',
    userName: 'Student1',
    correct: 5,
    total: 10,
    band: 5,
    scorePercentage: 50,
    feedback: null,
    feedbackBy: null,
    createdAt: new Date().toISOString(),
    ReadingTest: { id: 1, classCode: 'C1', teacherName: 'Teacher1', title: 'Test 1' },
    User: { phone: '0123456789' },
  }];

  global.fetch.mockImplementation((url) => {
    if (url.includes('reading-submissions/admin/list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByText(/Student1/));
  fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
  const dialog = screen.getByRole('dialog', { name: /Delete Reading submission/i });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete Permanently/i }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('admin/submissions/reading/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  );

  await waitFor(() => {
    expect(screen.queryByText(/Student1/)).not.toBeInTheDocument();
  });
});

test('admins can select many visible submissions and bulk delete them', async () => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Admin User', role: 'admin' });
    return null;
  });

  const sample = [
    {
      id: 1,
      testId: '1',
      userName: 'Student1',
      correct: 5,
      total: 10,
      band: 5,
      scorePercentage: 50,
      feedback: null,
      feedbackBy: null,
      createdAt: '2026-05-03T10:00:00.000Z',
      ReadingTest: { id: 1, classCode: 'C1', teacherName: 'Teacher1', title: 'Test 1' },
      User: { phone: '0123456789' },
    },
    {
      id: 2,
      testId: '2',
      userName: 'Student2',
      correct: 7,
      total: 10,
      band: 6,
      scorePercentage: 70,
      feedback: null,
      feedbackBy: null,
      createdAt: '2026-05-03T09:00:00.000Z',
      ReadingTest: { id: 2, classCode: 'C2', teacherName: 'Teacher2', title: 'Test 2' },
      User: { phone: '0987654321' },
    },
  ];

  global.fetch.mockImplementation((url, options = {}) => {
    if (url.includes('reading-submissions/admin/list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
    }
    if (url.includes('admin/submissions/bulk') && options.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Deleted 2 submissions.' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(window, 'alert').mockImplementation(() => {});

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/Student1/)).toBeInTheDocument();
  expect(screen.getByText(/Student2/)).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Select submission #1'));
  fireEvent.click(screen.getByLabelText('Select submission #2'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));
  const dialog = screen.getByRole('dialog', { name: /Delete 2 Reading submissions/i });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete Permanently/i }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('admin/submissions/bulk'),
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          items: [
            { type: 'reading', id: 1 },
            { type: 'reading', id: 2 },
          ],
        }),
      })
    )
  );

  await waitFor(() => {
    expect(screen.queryByText(/Student1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Student2/)).not.toBeInTheDocument();
  });
});
