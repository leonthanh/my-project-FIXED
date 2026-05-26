import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AdminUserManagement from '../AdminUserManagement';

jest.mock('../../../../shared/components/AdminNavbar', () => () => <div data-testid="admin-navbar" />);

jest.mock('../../../../shared/utils/api', () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn(),
  getStoredUser: jest.fn(() => ({ id: 1, name: 'Admin', role: 'admin' })),
  storeAuthSession: jest.fn(),
}));

const { authFetch, getStoredUser, storeAuthSession } = require('../../../../shared/utils/api');

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('AdminUserManagement admin tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStoredUser.mockReturnValue({ id: 1, name: 'Admin', role: 'admin' });
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

  test('filters IX Listening tests, hides one from student lists, and can delete it', async () => {
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
                hiddenFromStudents: false,
                status: 'published',
                deleteScope: 'ix-listening',
              },
              {
                id: 7,
                title: 'IX Listening 7',
                classCode: 'L7',
                teacherName: 'Other Teacher',
                createdAt: '2026-04-13T00:00:00.000Z',
                submissionCount: 0,
                hiddenFromStudents: false,
                status: 'published',
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

      if (url === 'admin/tests/ix-listening/6/visibility' && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Hidden',
            test: {
              id: 6,
              deleteScope: 'ix-listening',
              hiddenFromStudents: true,
              status: 'archived',
            },
          }),
        });
      }

      if (url === 'admin/tests/ix-listening/6' && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ deletedId: 6, scope: 'ix-listening' }) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Tests\b/i }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests');
    });

    fireEvent.click(screen.getByRole('button', { name: /IX Listening/i }));

    expect(await screen.findByText('IX Listening 6')).toBeInTheDocument();
    expect(screen.getByText('IX Listening 7')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Teacher'), {
      target: { value: 'Leak Teacher' },
    });

    fireEvent.change(screen.getByLabelText('Class'), {
      target: { value: 'L6' },
    });

    await waitFor(() => {
      expect(screen.queryByText('IX Listening 7')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hide from students' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Test hidden from student lists.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show to students' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.getByText('No tests found for the current filters.')).toBeInTheDocument();
    });
  });

  test('opens a selected user profile from the users tab', async () => {
    authFetch.mockImplementation((url) => {
      if (url.startsWith('admin/users?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 204,
              name: 'NGUYENNGOCLINH',
              phone: '0394434056',
              email: 'vytk@siec-star.edu.vn',
              role: 'student',
              createdAt: '2026-03-28T00:00:00.000Z',
            },
          ]),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={(
              <>
                <AdminUserManagement />
                <LocationDisplay />
              </>
            )}
          />
          <Route path="/admin/users/:userId/profile" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('NGUYENNGOCLINH')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/users/204/profile');
    });
  });

  test('opens a selected user profile from the submissions tab', async () => {
    authFetch.mockImplementation((url) => {
      if (url.startsWith('admin/users?search=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 204,
              name: 'NGUYENNGOCLINH',
              phone: '0394434056',
              email: 'vytk@siec-star.edu.vn',
              role: 'student',
              createdAt: '2026-03-28T00:00:00.000Z',
            },
          ]),
        });
      }

      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={(
              <>
                <AdminUserManagement />
                <LocationDisplay />
              </>
            )}
          />
          <Route path="/admin/users/:userId/profile" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Submissions\b/i }));

    expect(await screen.findByText('NGUYENNGOCLINH')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/users/204/profile');
    });
  });

  test('bulk hides and shows selected IX Listening tests', async () => {
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
                hiddenFromStudents: false,
                status: 'published',
                deleteScope: 'ix-listening',
              },
              {
                id: 7,
                title: 'IX Listening 7',
                classCode: 'L7',
                teacherName: 'Other Teacher',
                createdAt: '2026-04-13T00:00:00.000Z',
                submissionCount: 0,
                hiddenFromStudents: false,
                status: 'published',
                deleteScope: 'ix-listening',
              },
            ],
            cambridge: [],
          }),
        });
      }

      if (url === 'admin/tests/ix-listening/6/visibility' && options.method === 'PATCH') {
        const hidden = JSON.parse(options.body).hidden;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            test: {
              id: 6,
              deleteScope: 'ix-listening',
              hiddenFromStudents: hidden,
              status: hidden ? 'archived' : 'published',
            },
          }),
        });
      }

      if (url === 'admin/tests/ix-listening/7/visibility' && options.method === 'PATCH') {
        const hidden = JSON.parse(options.body).hidden;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            test: {
              id: 7,
              deleteScope: 'ix-listening',
              hiddenFromStudents: hidden,
              status: hidden ? 'archived' : 'published',
            },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Tests\b/i }));
    fireEvent.click(await screen.findByRole('button', { name: /IX Listening/i }));

    expect(await screen.findByText('IX Listening 6')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Hide Selected (2)' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      });
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/7/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Selected tests hidden from student lists.')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Show to students' }).length).toBe(2);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select all visible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show Selected (2)' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: false }),
      });
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/7/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: false }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Selected tests visible to students again.')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Hide from students' }).length).toBe(2);
    });
  });

  test('bulk deletes selected IX Listening tests', async () => {
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
                hiddenFromStudents: false,
                status: 'published',
                deleteScope: 'ix-listening',
              },
              {
                id: 7,
                title: 'IX Listening 7',
                classCode: 'L7',
                teacherName: 'Other Teacher',
                createdAt: '2026-04-13T00:00:00.000Z',
                submissionCount: 0,
                hiddenFromStudents: false,
                status: 'published',
                deleteScope: 'ix-listening',
              },
            ],
            cambridge: [],
          }),
        });
      }

      if (url === 'admin/tests/ix-listening/6' && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ deletedId: 6, scope: 'ix-listening' }) });
      }

      if (url === 'admin/tests/ix-listening/7' && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ deletedId: 7, scope: 'ix-listening' }) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Tests\b/i }));
    fireEvent.click(await screen.findByRole('button', { name: /IX Listening/i }));

    expect(await screen.findByText('IX Listening 6')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/6', { method: 'DELETE' });
      expect(authFetch).toHaveBeenCalledWith('admin/tests/ix-listening/7', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.getByText('Selected tests deleted permanently.')).toBeInTheDocument();
      expect(screen.getByText('No tests found for the current filters.')).toBeInTheDocument();
    });
  });

  test('shows submission cards for a selected user and deletes a writing submission', async () => {
    authFetch.mockImplementation((url, options = {}) => {
      if (url.startsWith('admin/users?search=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 204,
              name: 'NGUYENNGOCLINH',
              phone: '0394434056',
              email: 'vytk@siec-star.edu.vn',
              role: 'student',
              createdAt: '2026-03-28T00:00:00.000Z',
            },
          ]),
        });
      }

      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (url === 'admin/submissions?userId=204') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            writing: [
              {
                id: 501,
                userName: 'NGUYENNGOCLINH',
                userPhone: '0394434056',
                testId: 25,
                feedback: '',
                createdAt: '2026-04-14T00:00:00.000Z',
              },
            ],
            reading: [
              {
                id: 601,
                userName: 'NGUYENNGOCLINH',
                testId: 14,
                correct: 18,
                total: 25,
                band: 5.5,
                createdAt: '2026-04-13T00:00:00.000Z',
              },
            ],
            listening: [],
            cambridge: [],
          }),
        });
      }

      if (url === 'admin/submissions/writing/501' && options.method === 'DELETE') {
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

    fireEvent.click(screen.getByRole('button', { name: /^Submissions\b/i }));

    expect(await screen.findByText('NGUYENNGOCLINH')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open submissions' }));

    expect(await screen.findByText('Manage all submissions for this user across Writing, Reading, Listening, and Orange.')).toBeInTheDocument();
    expect(await screen.findByText('Waiting review')).toBeInTheDocument();
    expect(screen.getAllByText('Test #25').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/submissions/writing/501', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.getByText('No Writing submissions for this user.')).toBeInTheDocument();
    });
  });

  test('shows delete action on submission user cards and deletes the user directly', async () => {
    authFetch.mockImplementation((url, options = {}) => {
      if (url.startsWith('admin/users?search=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 204,
              name: 'NGUYENNGOCLINH',
              phone: '0394434056',
              email: 'vytk@siec-star.edu.vn',
              role: 'student',
              createdAt: '2026-03-28T00:00:00.000Z',
            },
          ]),
        });
      }

      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (url === 'admin/users/204' && options.method === 'DELETE') {
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

    fireEvent.click(screen.getByRole('button', { name: /^Submissions\b/i }));

    expect(await screen.findByText('NGUYENNGOCLINH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/users/204', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.getByText('No users found for the current search.')).toBeInTheDocument();
    });
  });

  test('auto-searches submission users by phone and search button reuses the current query', async () => {
    const users = [
      {
        id: 205,
        name: 'Placement Teacher',
        phone: '0911111111',
        email: 'placement-teacher@example.com',
        role: 'teacher',
        createdAt: '2026-05-02T00:00:00.000Z',
      },
      {
        id: 202,
        name: 'Number Match',
        phone: '0974656472',
        email: 'number-match@example.com',
        role: 'student',
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ];

    authFetch.mockImplementation((url) => {
      if (url.startsWith('admin/users?search=')) {
        const query = decodeURIComponent(url.slice('admin/users?search='.length)).toLowerCase();
        const filtered = users.filter((user) => [user.name, user.phone, user.email]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes(query)));

        return Promise.resolve({ ok: true, json: async () => filtered });
      }

      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => users });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Submissions\b/i }));

    expect(await screen.findByText('Placement Teacher')).toBeInTheDocument();
    expect(screen.getByText('Number Match')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search by user name or phone...'), {
      target: { value: '0974656472' },
    });

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/users?search=0974656472');
    });

    await waitFor(() => {
      expect(screen.getByText('Number Match')).toBeInTheDocument();
      expect(screen.queryByText('Placement Teacher')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const matchingCalls = authFetch.mock.calls.filter(([url]) => url === 'admin/users?search=0974656472');
      expect(matchingCalls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.queryByText('Search failed.')).not.toBeInTheDocument();
  });

  test('shows duplicate groups in card layout and deletes a duplicate account', async () => {
    authFetch.mockImplementation((url, options = {}) => {
      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (url === 'admin/users/duplicates') {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            [
              {
                id: 301,
                name: 'TRAN HA LINH',
                phone: '0901000001',
                email: 'linh-1@example.com',
                role: 'student',
                createdAt: '2026-04-11T00:00:00.000Z',
              },
              {
                id: 302,
                name: 'TRAN HA LINH',
                phone: '0901000002',
                email: 'linh-2@example.com',
                role: 'student',
                createdAt: '2026-04-12T00:00:00.000Z',
              },
            ],
          ]),
        });
      }

      if (url === 'admin/users/301' && options.method === 'DELETE') {
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

    fireEvent.click(screen.getByRole('button', { name: /^Duplicates\b/i }));

    expect(await screen.findByText('Duplicate group')).toBeInTheDocument();
    expect(screen.getAllByText('TRAN HA LINH').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/users/301', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.getByText('No duplicate names found for the current filters.')).toBeInTheDocument();
    });
  });

  test('lets an admin rename their own account and syncs the stored user', async () => {
    const currentAdmin = {
      id: 1,
      name: 'Admin',
      phone: '0900000001',
      email: 'admin@example.com',
      role: 'admin',
      canManageTests: false,
      createdAt: '2026-05-18T00:00:00.000Z',
    };

    authFetch.mockImplementation((url, options = {}) => {
      if (url.startsWith('admin/users?')) {
        return Promise.resolve({ ok: true, json: async () => ([currentAdmin]) });
      }

      if (url === 'admin/users/1' && options.method === 'PATCH') {
        const payload = JSON.parse(options.body);

        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Updated',
            user: {
              ...currentAdmin,
              ...payload,
              role: 'admin',
              canManageTests: false,
            },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter>
        <AdminUserManagement />
      </MemoryRouter>
    );

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    const roleSelect = screen.getAllByRole('combobox')[1];
    expect(roleSelect).toBeDisabled();
    expect(screen.getByText('You can update your own name, phone, and email here. Role changes stay disabled.')).toBeInTheDocument();

    fireEvent.change(screen.getAllByDisplayValue('Admin')[0], {
      target: { value: 'Thanh Admin' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('admin/users/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Thanh Admin',
          phone: '0900000001',
          email: 'admin@example.com',
          role: 'admin',
          canManageTests: false,
        }),
      });
    });

    await waitFor(() => {
      expect(storeAuthSession).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 1,
          name: 'Thanh Admin',
          role: 'admin',
        }),
      });
    });

    expect(await screen.findByText('Thanh Admin')).toBeInTheDocument();
  });
});