import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AppErrorBoundary from '../AppErrorBoundary';

const AUTO_RECOVERY_KEY = 'app-error-boundary:auto-recovery';

const ThrowError = () => {
  throw new Error('Boundary test crash');
};

describe('AppErrorBoundary', () => {
  let reloadSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();

    reloadSpy = jest.spyOn(AppErrorBoundary, 'performAppReload').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
  });

  test('reloads the page automatically after the first crash', () => {
    render(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Trang gap loi tam thoi/i)).toBeNull();
  });

  test('preserves the session and offers recovery after repeated crashes', () => {
    localStorage.setItem('user', '{"id":1,"role":"admin"}');
    localStorage.setItem('accessToken', 'existing-token');
    sessionStorage.setItem(
      AUTO_RECOVERY_KEY,
      JSON.stringify({ count: 2, firstAt: Date.now() })
    );

    render(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBe('existing-token');
    expect(localStorage.getItem('user')).toBe('{"id":1,"role":"admin"}');
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đăng nhập của bạn vẫn được giữ');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(AUTO_RECOVERY_KEY)).toBeNull();
  });
});