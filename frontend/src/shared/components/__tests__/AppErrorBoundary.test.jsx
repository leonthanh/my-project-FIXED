import React from 'react';
import { act, render, screen } from '@testing-library/react';
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
    jest.spyOn(AppErrorBoundary, 'resetAuthAndRedirectToLogin').mockImplementation(() => undefined);
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

  test('redirects to login after repeated crashes inside the retry window', () => {
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
    expect(AppErrorBoundary.resetAuthAndRedirectToLogin).toHaveBeenCalledTimes(1);
  });
});