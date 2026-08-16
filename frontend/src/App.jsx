import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import {
  apiPath,
  authFetch,
  refreshAccessToken,
  redirectToLogin,
  isAccessTokenUsable,
  getStoredUser,
  hasStoredSession,
} from './shared/utils/api';
import { buildCoreRoutes } from './app/routes/coreRoutes';
import { buildIxRoutes } from './app/routes/ixRoutes';
import { buildCambridgeRoutes } from './app/routes/cambridgeRoutes';
import { buildFceRoutes } from './domains/fce/fceRoutes';
import { buildAdminRoutes } from './app/routes/adminRoutes';

const hasStoredUser = () => Boolean(getStoredUser());
const hasStoredUserProfile = () => {
  const user = getStoredUser();
  const displayName = String(user?.name || user?.username || user?.fullName || '').trim();
  return Boolean(user?.role && displayName);
};

const ANALYTICS_SESSION_KEY = 'analytics:sessionId';

const getAnalyticsSessionId = () => {
  if (typeof window === 'undefined') return `ssr-${Date.now()}`;

  try {
    const existing = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;

    const generated =
      (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      ).slice(0, 80);
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, generated);
    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`.slice(0, 80);
  }
};

function AuthenticatedAnalyticsTracker({ isAuthenticated }) {
  const location = useLocation();
  const [sessionId] = useState(() => getAnalyticsSessionId());
  const lastPageViewRef = useRef({ path: '', ts: 0 });

  const sendEvent = useCallback(
    async (eventType) => {
      if (!isAuthenticated || !getStoredUser()) return;

      const pagePath = `${location.pathname}${location.search || ''}`.slice(0, 255);
      const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';

      try {
        await authFetch(apiPath('analytics/events'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            pagePath,
            sessionId,
            referrer,
          }),
          keepalive: true,
        }, {
          logoutOnRefreshFailure: false,
        });
      } catch {
        // Fire-and-forget: analytics failures should not affect UX.
      }
    },
    [isAuthenticated, location.pathname, location.search, sessionId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location.pathname.startsWith('/login')) return;

    const pathKey = `${location.pathname}${location.search || ''}`;
    const now = Date.now();
    const last = lastPageViewRef.current;

    if (last.path === pathKey && now - last.ts < 2500) {
      return;
    }

    lastPageViewRef.current = { path: pathKey, ts: now };
    void sendEvent('page_view');
  }, [isAuthenticated, location.pathname, location.search, sendEvent]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void sendEvent('heartbeat');
      }
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, sendEvent]);

  return null;
}

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
      if (isAccessTokenUsable(60 * 1000) && hasStoredUserProfile()) {
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
      <AuthenticatedAnalyticsTracker isAuthenticated={isAuthenticated} />
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#334155' }}>
          Loading...
        </div>
      }>
        <Routes>
          {buildCoreRoutes({ isAuthenticated })}
          {buildIxRoutes({ isAuthenticated })}
          {buildCambridgeRoutes({ isAuthenticated })}
          {buildFceRoutes({ isAuthenticated })}
          {buildAdminRoutes()}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

