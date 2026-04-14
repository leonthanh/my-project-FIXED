import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminUserManagement from '../AdminUserManagement';

jest.mock('../../../../shared/components/AdminNavbar', () => () => <div data-testid="admin-navbar" />);

jest.mock('../../../../shared/utils/api', () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn(),
}));

const { authFetch } = require('../../../../shared/utils/api');

describe('AdminUserManagement tests tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify({ id: 1, name: 'Admin', role: 'admin' });
      }
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads admin tests and deletes an IX Listening test from the Tests tab', async () => {
    authFetch.mockImplementation((url, options = {}) => {
      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (url === 'admin/tests' && !options.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ixWriting: [],
            ixReading: [],
            ixListening: [
              {
                id: 6,
                title: 'IX Listening 6',
                classCode: 'L6',
                teacherName: 'Leak Teacher',
                createdAt: '2026-04-14T00:00:00.000Z',
                submissionCount: 2,
                deleteScope: 'ix-listening',
              },
            ],
            cambridge: [
              {
                id: 12,
                title: 'PET Writing 12',
                classCode: 'PET-A',
                teacherName: 'Cambridge Teacher',
                testType: 'pet-writing',
                typeLabel: 'PET Writing',
                category: 'writing',
                status: 'published',
                createdAt: '2026-04-13T00:00:00.000Z',
                submissionCount: 0,
                deleteScope: 'cambridge-writing',
              },
            ],
          }),
        });
      }

      if (url === 'admin/tests/ix-listening/6' && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'Deleted' }) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tests' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests');
    });

    fireEvent.click(screen.getByRole('button', { name: /IX Listening/i }));

    expect(await screen.findByText('IX Listening 6')).toBeInTheDocument();
    expect(screen.getByText('Leak Teacher')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.queryByText('IX Listening 6')).not.toBeInTheDocument();
    });
  });
});