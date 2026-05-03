import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';
import AdminListeningSubmissions from '../AdminListeningSubmissions';

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Admin User', role: 'admin' });
    return null;
  });
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  );
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('admins can confirm bulk delete for listening submissions through the modal', async () => {
  const sample = [
    {
      id: 11,
      testId: '11',
      userName: 'Student Listening 1',
      correct: 5,
      total: 10,
      createdAt: '2026-05-03T10:00:00.000Z',
      feedback: null,
      feedbackBy: null,
      ListeningTest: { id: 11, classCode: 'L1', teacherName: 'Teacher A', title: 'Listening Test 1' },
      User: { phone: '0123000001' },
    },
    {
      id: 12,
      testId: '12',
      userName: 'Student Listening 2',
      correct: 6,
      total: 10,
      createdAt: '2026-05-03T09:00:00.000Z',
      feedback: null,
      feedbackBy: null,
      ListeningTest: { id: 12, classCode: 'L2', teacherName: 'Teacher B', title: 'Listening Test 2' },
      User: { phone: '0123000002' },
    },
  ];

  global.fetch.mockImplementation((url, options = {}) => {
    if (url.includes('listening-submissions/admin/list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
    }
    if (url.includes('admin/submissions/bulk') && options.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Deleted 2 submissions.' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminListeningSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/Student Listening 1/)).toBeInTheDocument();
  expect(screen.getByText(/Student Listening 2/)).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Select submission #11'));
  fireEvent.click(screen.getByLabelText('Select submission #12'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));

  const dialog = screen.getByRole('dialog', { name: /Delete 2 Listening submissions/i });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete Permanently/i }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('admin/submissions/bulk'),
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          items: [
            { type: 'listening', id: 11 },
            { type: 'listening', id: 12 },
          ],
        }),
      })
    )
  );

  await waitFor(() => {
    expect(screen.queryByText(/Student Listening 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Student Listening 2/)).not.toBeInTheDocument();
  });
});