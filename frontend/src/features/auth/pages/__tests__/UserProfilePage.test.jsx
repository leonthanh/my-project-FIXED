import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserProfilePage from '../UserProfilePage';

jest.mock('react-easy-crop', () => () => <div data-testid="avatar-cropper" />);

jest.mock('../../../../shared/components/AdminNavbar', () => () => (
  <div data-testid="admin-navbar" />
));

jest.mock('../../../../shared/components/StudentNavbar', () => () => (
  <div data-testid="student-navbar" />
));

jest.mock('../../../../shared/utils/api', () => ({
  apiPath: jest.fn((value) => `/api/${value}`),
  authFetch: jest.fn(),
  getStoredUser: jest.fn(),
  hostPath: jest.fn((value) => `http://localhost:5000${value}`),
  storeAuthSession: jest.fn(),
}));

const { authFetch, getStoredUser, storeAuthSession } = require('../../../../shared/utils/api');

describe('UserProfilePage', () => {
  const baseUser = {
    id: 7,
    role: 'teacher',
    name: 'Thanh Le',
    phone: '0901123456',
    email: 'thanh@example.com',
    address: 'Hai Ba Trung, Ha Noi',
    bio: 'Teacher profile bio',
    createdAt: '2026-05-01T00:00:00.000Z',
    emailVerifiedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getStoredUser.mockReturnValue(baseUser);
  });

  test('renders the profile and keeps phone locked', async () => {
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: baseUser }),
    });

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-navbar')).toBeInTheDocument();
    expect(screen.queryByTestId('student-navbar')).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue('0901123456')).toBeDisabled();
    expect(screen.getByDisplayValue('Thanh Le')).toBeInTheDocument();
  });

  test('renders student navbar for student self-profile', async () => {
    const studentUser = {
      ...baseUser,
      role: 'student',
      name: 'Test Student',
      email: 'student@example.com',
    };

    getStoredUser.mockReturnValue(studentUser);
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: studentUser }),
    });

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('student-navbar')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-navbar')).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test Student')).toBeInTheDocument();
    expect(screen.getByText('Student account profile')).toBeInTheDocument();
  });

  test('saves edited profile details and syncs stored auth user', async () => {
    authFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: baseUser }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Cập nhật hồ sơ thành công.',
          user: {
            ...baseUser,
            name: 'Thanh Le Updated',
            email: 'teacher@example.com',
          },
        }),
      });

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    const nameInput = await screen.findByDisplayValue('Thanh Le');
    fireEvent.change(nameInput, { target: { value: 'Thanh Le Updated' } });

    fireEvent.change(screen.getByDisplayValue('thanh@example.com'), {
      target: { value: 'teacher@example.com' },
    });

  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledTimes(2);
    });

    expect(authFetch).toHaveBeenLastCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(storeAuthSession).toHaveBeenLastCalledWith({
      user: expect.objectContaining({
        name: 'Thanh Le Updated',
        email: 'teacher@example.com',
      }),
    });

    expect(await screen.findByText('Cập nhật hồ sơ thành công.')).toBeInTheDocument();
  });

  test('requests an email verification code from the security tab', async () => {
    authFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: baseUser }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Mã xác thực email đã được gửi.',
          testOtp: '123456',
        }),
      });

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    );

    await screen.findByDisplayValue('Thanh Le');
    fireEvent.click(screen.getByRole('tab', { name: /Bảo mật/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã xác thực' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledTimes(2);
    });

    expect(authFetch).toHaveBeenLastCalledWith(
      '/api/auth/me/email-verification/request',
      expect.objectContaining({ method: 'POST' })
    );

    expect(await screen.findByText(/Mã thử nghiệm: 123456/)).toBeInTheDocument();
  });

  test('loads admin review mode for another user profile', async () => {
    const adminViewer = {
      ...baseUser,
      id: 1,
      role: 'admin',
      name: 'System Admin',
      phone: '0988000111',
      email: 'admin@example.com',
    };
    const targetUser = {
      ...baseUser,
      id: 19,
      name: 'Target Teacher',
      phone: '0909988776',
      email: 'target@example.com',
      address: 'Dong Da, Ha Noi',
    };

    getStoredUser.mockImplementation(() => adminViewer);
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: targetUser }),
    });

    render(
      <MemoryRouter initialEntries={['/admin/users/19/profile']}>
        <Routes>
          <Route path="/admin/users/:userId/profile" element={<UserProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Target Teacher')).toBeDisabled();
    expect(screen.getByText('Admin review mode')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledWith('/api/admin/users/19/profile');
  });
});