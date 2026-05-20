import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminNavbar from '../AdminNavbar';

jest.mock('../ThemeToggle', () => () => <div data-testid="theme-toggle" />);

jest.mock('../../utils/api', () => ({
  apiPath: jest.fn((path) => path),
  hostPath: jest.fn((path) => path),
  clearAuth: jest.fn(),
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
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});