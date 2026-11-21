import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminNavbar from '../AdminNavbar';

jest.mock('../../utils/api', () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn((url, options) => global.fetch(url, options)),
  hostPath: jest.fn((path) => path),
  clearAuth: jest.fn(),
  getAuthHeaders: jest.fn(() => ({})),
  getStoredUser: jest.fn(),
}));

jest.mock('../../utils/cambridgeFeedback', () => ({
  hasResolvedSubmissionFeedback: jest.fn(() => false),
}));

jest.mock('../../utils/permissions', () => ({
  canManageCategory: jest.fn(() => true),
}));

const { getStoredUser } = require('../../utils/api');

describe('AdminNavbar auth sync', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (String(url).includes('cambridge/submissions')) {
        return Promise.resolve({ ok: true, json: async () => ({ submissions: [] }) });
      }

      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('updates the visible account label when auth data changes', async () => {
    getStoredUser.mockReturnValue({ id: 7, role: 'teacher', canManageTests: true });

    render(
      <MemoryRouter initialEntries={['/admin/writing-submissions']}>
        <AdminNavbar />
      </MemoryRouter>
    );

    expect(await screen.findByText('Teacher')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();

    getStoredUser.mockReturnValue({
      id: 7,
      name: 'Thanh Le',
      role: 'admin',
      canManageTests: true,
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:changed'));
    });

    await waitFor(() => {
      expect(screen.getByText('Thanh Le')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Thanh Le' })).toHaveAttribute('href', '/profile');
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('shows Prepare navigation even when the active exam-level list does not include it', async () => {
    getStoredUser.mockReturnValue({
      id: 8,
      name: 'Teacher',
      role: 'teacher',
      canManageTests: true,
    });

    render(
      <MemoryRouter initialEntries={['/prepare/submissions']}>
        <AdminNavbar />
      </MemoryRouter>
    );

    const prepareButton = await screen.findByRole('button', { name: 'Prepare' });
    expect(prepareButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(prepareButton);

    expect(prepareButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Prepare menu' })).toBeInTheDocument();
    expect(screen.getByText('Prepare submissions')).toBeInTheDocument();
  });

  test('shows pending notifications only for tests created by the current teacher', async () => {
    getStoredUser.mockReturnValue({
      id: 9,
      name: 'Thanh Le',
      role: 'teacher',
      canManageTests: true,
    });

    global.fetch = jest.fn((url) => {
      if (String(url).includes('writing/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 11,
              userName: 'Student Writing Match',
              userPhone: '0901',
              createdAt: '2026-05-21T10:00:00.000Z',
              WritingTest: { teacherName: 'Thanh Le', testType: 'writing' },
            },
            {
              id: 12,
              userName: 'Student Writing Other',
              userPhone: '0902',
              createdAt: '2026-05-21T09:00:00.000Z',
              WritingTest: { teacherName: 'Other Teacher', testType: 'writing' },
            },
          ]),
        });
      }

      if (String(url).includes('reading-submissions/admin/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 21,
              userName: 'Student Reading Match',
              userPhone: '0903',
              createdAt: '2026-05-21T08:00:00.000Z',
              teacherName: 'Thanh Le',
            },
            {
              id: 22,
              userName: 'Student Reading Other',
              userPhone: '0904',
              createdAt: '2026-05-21T07:00:00.000Z',
              teacherName: 'Other Teacher',
            },
          ]),
        });
      }

      if (String(url).includes('listening-submissions/admin/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 31,
              userName: 'Student Listening Match',
              userPhone: '0905',
              createdAt: '2026-05-21T06:00:00.000Z',
              teacherName: 'Thanh Le',
            },
          ]),
        });
      }

      if (String(url).includes('cambridge/submissions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            submissions: [
              {
                id: 41,
                studentName: 'Student Orange Match',
                studentPhone: '0906',
                createdAt: '2026-05-21T05:00:00.000Z',
                teacherName: 'Thanh Le',
              },
              {
                id: 42,
                studentName: 'Student Orange Other',
                studentPhone: '0907',
                createdAt: '2026-05-21T04:00:00.000Z',
                teacherName: 'Other Teacher',
              },
            ],
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => [] });
    });

    render(
      <MemoryRouter initialEntries={['/admin/reading-submissions']}>
        <AdminNavbar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('4', { selector: '.adminNavbar__badge' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Pending submissions'));

    expect(await screen.findByText('Student Writing Match')).toBeInTheDocument();
    expect(screen.getByText('Student Reading Match')).toBeInTheDocument();
    expect(screen.getByText('Student Listening Match')).toBeInTheDocument();
    expect(screen.getByText('Student Orange Match')).toBeInTheDocument();
    expect(screen.queryByText('Student Writing Other')).not.toBeInTheDocument();
    expect(screen.queryByText('Student Reading Other')).not.toBeInTheDocument();
    expect(screen.queryByText('Student Orange Other')).not.toBeInTheDocument();
  });
});