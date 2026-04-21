import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import {
  refreshAccessToken,
  redirectToLogin,
  isAccessTokenUsable,
  getStoredUser,
  hasStoredSession,
} from './shared/utils/api';
import { buildCoreRoutes } from './app/routes/coreRoutes';
import { buildIxRoutes } from './app/routes/ixRoutes';
import { buildCambridgeRoutes } from './app/routes/cambridgeRoutes';
import { buildAdminRoutes } from './app/routes/adminRoutes';

const hasStoredUser = () => Boolean(getStoredUser());

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredSession);

  const syncAuthState = useCallback(() => {
    setIsAuthenticated(hasStoredSession());
  }, []);

  useEffect(() => {
    const onForceLogout = () => {
      syncAuthState();
      if (!window.location.pathname.startsWith('/login')) {
        redirectToLogin({ reason: 'expired', replace: true });
      }
    };

    const onStorage = () => syncAuthState();
    const onAuthChanged = () => syncAuthState();

    window.addEventListener('auth:force-logout', onForceLogout);
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:changed', onAuthChanged);

    const withTimeout = (promise, ms = 6500) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), ms)),
      ]);

    // Always try to refresh on mount if user is stored (rehydrates from session cookie)
    const tryRefresh = async () => {
      if (!hasStoredSession()) {
        return;
      }

      // Skip background refresh while the current access token is still healthy.
      // This avoids logging students out during production cookie hiccups.
      if (isAccessTokenUsable(60 * 1000)) {
        syncAuthState();
        return;
      }

      const refreshResult = await withTimeout(
        refreshAccessToken({ logoutOnFailure: false }),
        2500,
      );
      const refreshed = refreshResult === true;
      syncAuthState();

      // Redirect only when refresh truly expired the session (clearAuth removed user)
      if (!refreshed && !hasStoredUser() && !isAccessTokenUsable()) {
        redirectToLogin({ reason: 'expired', replace: true });
        return;
      }
    };

    tryRefresh();

    // Proactive refresh every 10 minutes to keep session alive
    const intervalId = setInterval(tryRefresh, 10 * 60 * 1000);

    // Refresh when tab becomes visible again (handles long idle / reopen)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('auth:force-logout', onForceLogout);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, [syncAuthState]);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#334155' }}>
          Loading...
        </div>
      }>
        <Routes>
          {buildCoreRoutes({ isAuthenticated })}
          {buildIxRoutes({ isAuthenticated })}
          {buildCambridgeRoutes({ isAuthenticated })}
          {buildAdminRoutes()}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

