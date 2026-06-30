import { resolveHostPath } from "./assetUrls";

// API URL helper - normalize and export host/base helpers
const RAW_API = import.meta.env.VITE_API_URL || "";
// Remove trailing slashes and a trailing '/api' if present
const API_HOST = RAW_API.replace(/\/+$/g, "").replace(/\/api$/i, "");
const API_BASE = API_HOST + "/api";

function apiPath(p) {
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
}

function hostPath(p) {
  return resolveHostPath(API_HOST, p);
}

function redirectInApp(path, opts = {}) {
  if (typeof window === "undefined") return;
  const { replace = true } = opts;
  const target = typeof path === "string" && path.startsWith("/") ? path : "/";

  try {
    if (replace) {
      window.history.replaceState({}, "", target);
    } else {
      window.history.pushState({}, "", target);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch (_err) {
    if (replace) window.location.replace(target);
    else window.location.assign(target);
  }
}

function redirectToLogin(opts = {}) {
  const { reason, rememberPath = false, replace = true } = opts;
  if (typeof window === "undefined") return;

  if (rememberPath) {
    const current = `${window.location.pathname}${window.location.search || ""}`;
    localStorage.setItem("postLoginRedirect", current);
  }

  const reasonQuery = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  redirectInApp(`/login${reasonQuery}`, { replace });
}

function getStoredUser() {
  const raw =
    localStorage.getItem("user") ?? sessionStorage.getItem("user") ?? null;

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_err) {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    return null;
  }
}

function shouldUseSessionAuthStorage(user = getStoredUser()) {
  return user?.role === "student";
}

function getAuthValue(key) {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

function setAuthValue(key, value, user = getStoredUser()) {
  const useSession = shouldUseSessionAuthStorage(user);
  const primary = useSession ? sessionStorage : localStorage;
  const secondary = useSession ? localStorage : sessionStorage;

  secondary.removeItem(key);
  if (value === undefined || value === null || value === "") {
    primary.removeItem(key);
    return;
  }

  primary.setItem(key, value);
}

function storeAuthSession({ user, accessToken, refreshToken }) {
  if (user) {
    const serialized = JSON.stringify(user);
    localStorage.setItem("user", serialized);
    sessionStorage.setItem("user", serialized);
  }

  if (accessToken !== undefined) {
    setAuthValue("accessToken", accessToken, user);
  }

  if (refreshToken !== undefined) {
    setAuthValue("refreshToken", refreshToken, user);
  }
}

const SOCIAL_AUTH_SESSION_KEY = "auth:social:last";
const RECENT_LOGOUT_KEY = "auth:recentLogout";
const RECENT_LOGOUT_BLOCK_MS = 12 * 60 * 60 * 1000;

function readJsonStorage(storage, key) {
  try {
    const rawValue = storage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (_err) {
    storage.removeItem(key);
    return null;
  }
}

function rememberSocialLoginSession({ provider, accessToken } = {}) {
  if (typeof window === "undefined" || !provider) return;

  sessionStorage.setItem(
    SOCIAL_AUTH_SESSION_KEY,
    JSON.stringify({
      provider,
      accessToken: accessToken || "",
      rememberedAt: Date.now(),
    })
  );
}

function getRememberedSocialLoginSession() {
  if (typeof window === "undefined") return null;
  return readJsonStorage(sessionStorage, SOCIAL_AUTH_SESSION_KEY);
}

function clearRememberedSocialLoginSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SOCIAL_AUTH_SESSION_KEY);
  sessionStorage.removeItem("auth:zalo:pkce");
}

function rememberRecentLogout(user = getStoredUser(), provider = "") {
  if (typeof window === "undefined" || !user?.id) return;

  localStorage.setItem(
    RECENT_LOGOUT_KEY,
    JSON.stringify({
      userId: user.id,
      provider: String(provider || "").trim().toLowerCase(),
      loggedOutAt: Date.now(),
    })
  );
}

function getRecentLoggedOutUser(maxAgeMs = RECENT_LOGOUT_BLOCK_MS) {
  if (typeof window === "undefined") return null;

  const record = readJsonStorage(localStorage, RECENT_LOGOUT_KEY);
  const loggedOutAt = Number(record?.loggedOutAt || 0);

  if (!record?.userId || !loggedOutAt || Date.now() - loggedOutAt > maxAgeMs) {
    localStorage.removeItem(RECENT_LOGOUT_KEY);
    return null;
  }

  return record;
}

function isRecentlyLoggedOutUser(user, provider = "", maxAgeMs = RECENT_LOGOUT_BLOCK_MS) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const record = getRecentLoggedOutUser(maxAgeMs);
  if (!record || !user?.id) return false;
  if (record.provider && normalizedProvider && record.provider !== normalizedProvider) {
    return false;
  }

  return String(record.userId) === String(user.id);
}

function clearRecentLoggedOutUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_LOGOUT_KEY);
}

function revokeGoogleSocialSession(session) {
  if (typeof window === "undefined") return Promise.resolve();

  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch (_err) {
    // Best-effort cleanup only; app logout must still continue.
  }

  const token = String(session?.accessToken || "").trim();
  const revoke = window.google?.accounts?.oauth2?.revoke;
  if (!token || typeof revoke !== "function") return Promise.resolve();

  return new Promise((resolve) => {
    try {
      revoke(token, () => resolve());
    } catch (_err) {
      resolve();
    }
  });
}

function logoutFacebookSocialSession() {
  if (typeof window === "undefined" || !window.FB?.getLoginStatus) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    try {
      window.FB.getLoginStatus((statusResponse) => {
        if (statusResponse?.status !== "connected" || !window.FB?.logout) {
          resolve();
          return;
        }

        window.FB.logout(() => resolve());
      });
    } catch (_err) {
      resolve();
    }
  });
}

async function disconnectSocialProviderSession() {
  const socialSession = getRememberedSocialLoginSession();
  clearRememberedSocialLoginSession();

  await Promise.allSettled([
    revokeGoogleSocialSession(socialSession),
    logoutFacebookSocialSession(),
  ]);
}

async function logoutAuthSession() {
  const socialSession = getRememberedSocialLoginSession();
  rememberRecentLogout(getStoredUser(), socialSession?.provider);
  await disconnectSocialProviderSession();

  try {
    await fetch(apiPath("auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch (_err) {
    // Ignore network errors on logout; local auth state still needs clearing.
  }

  clearAuth();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:changed"));
  }
}

function hasStoredSession() {
  return Boolean(getStoredUser()) && Boolean(getAuthValue("accessToken") || getAuthValue("refreshToken"));
}

function getAuthHeaders() {
  const token = getAuthValue("accessToken");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function decodeJwtPayload(token) {
  if (!token) return null;

  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(padded));
  } catch (_err) {
    return null;
  }
}

function isAccessTokenUsable(bufferMs = 0) {
  const token = getAuthValue("accessToken");
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  const expMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expMs)) {
    // If we cannot decode the token, keep the current session instead of forcing
    // a background logout. Reactive 401 handling still protects real failures.
    return true;
  }

  return expMs > Date.now() + Math.max(0, Number(bufferMs) || 0);
}

/**
 * Remove all auth data from storage.
 */
function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("auth:lastRefreshAt");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("auth:lastRefreshAt");
  clearRememberedSocialLoginSession();
}

/**
 * Force logout: clear auth data then dispatch a global event so App.jsx can
 * redirect to /login and show a "session expired" message.
 */
function forceLogout() {
  clearAuth();
  window.dispatchEvent(new CustomEvent("auth:force-logout"));
}

// How long (ms) a successful refresh is considered "fresh" — prevents multi-tab race:
// if another tab already refreshed within this window and stored a valid accessToken,
// skip the refresh rather than firing a duplicate request that would fail with 401.
const REFRESH_RECENT_MS = 30_000;
const REFRESH_AT_KEY = "auth:lastRefreshAt";

let refreshPromise = null;

async function refreshAccessToken(options = {}) {
  const { logoutOnFailure = true } = options;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // Skip proactive refresh if another tab (or this tab) already refreshed recently
    // and a valid accessToken is already stored. This prevents multi-tab race conditions
    // with rotating refresh tokens: both tabs open simultaneously → both send the same
    // cookie → second request hits an already-rotated (revoked) token → 401 → logout.
    const lastRefresh = parseInt(localStorage.getItem(REFRESH_AT_KEY) || "0", 10);
    const lastRefreshAny = parseInt(getAuthValue(REFRESH_AT_KEY) || String(lastRefresh || 0), 10);
    if (
      Date.now() - lastRefreshAny < REFRESH_RECENT_MS &&
      getAuthValue("accessToken")
    ) {
      console.debug("auth: skipping refresh, token recently refreshed by this or another tab");
      return true;
    }

    const refreshToken = getAuthValue("refreshToken");
    const hasRefreshToken = Boolean(refreshToken);
    const storedUser = getStoredUser();
    const hadStoredUser = Boolean(storedUser);
    const controller = new AbortController();
    // Increased from 2800ms → 5000ms to accommodate slow cPanel servers
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      console.debug("auth: attempting refresh");
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasRefreshToken ? { refreshToken } : {}),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.debug("auth: refresh failed", res.status);

        // 401 can be a false alarm caused by a multi-tab race: another tab's refresh
        // request arrived at the server first and rotated the cookie. Wait briefly to
        // let the winning tab finish storing its new accessToken, then re-check.
        if (res.status === 401) {
          await new Promise((r) => setTimeout(r, 600));
          const recentRefresh = parseInt(localStorage.getItem(REFRESH_AT_KEY) || "0", 10);
          const recentRefreshAny = parseInt(getAuthValue(REFRESH_AT_KEY) || String(recentRefresh || 0), 10);
          if (
            Date.now() - recentRefreshAny < REFRESH_RECENT_MS &&
            getAuthValue("accessToken")
          ) {
            console.debug("auth: 401 resolved — concurrent tab already refreshed successfully");
            return true;
          }
        }

        if (hadStoredUser) {
          if (logoutOnFailure) {
            forceLogout();
          }
        } else {
          clearAuth();
        }
        return false;
      }

      const data = await res.json().catch(() => ({}));
      const refreshedUser = data.user || storedUser;

      if (data.user) {
        storeAuthSession({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      } else {
        if (data.accessToken) setAuthValue("accessToken", data.accessToken, refreshedUser);
        if (data.refreshToken) setAuthValue("refreshToken", data.refreshToken, refreshedUser);
      }

      // Record successful refresh time so concurrent tabs can detect it
      setAuthValue(REFRESH_AT_KEY, String(Date.now()), refreshedUser);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:changed"));
      }
      console.debug("auth: refresh succeeded");
      return true;
    } catch (err) {
      console.debug("auth: refresh exception", err?.message || err);
      // Network / timeout error — do NOT clear any tokens. The server may be
      // temporarily unavailable; clearing accessToken would cause hasStoredSession()
      // to return false and kick users out of active sessions. Let the existing token
      // remain so the next API call can retry (authFetch handles 401s itself).
      return false;
    } finally {
      clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * authFetch - wrapper that adds Authorization header and tries to refresh access token once when 401 occurs
 */
async function authFetch(url, opts = {}) {
  const mergedOpts = { ...opts };
  mergedOpts.headers = { ...(mergedOpts.headers || {}), ...getAuthHeaders() };

  let res = await fetch(url, mergedOpts);
  if (res.status !== 401) return res;

  // Try refresh once
  const refreshed = await refreshAccessToken();
  if (!refreshed) return res;

  // Retry with new token
  mergedOpts.headers = { ...(mergedOpts.headers || {}), ...getAuthHeaders() };
  return fetch(url, mergedOpts);
}

export {
  API_HOST,
  API_BASE,
  apiPath,
  hostPath,
  redirectInApp,
  redirectToLogin,
  getAuthHeaders,
  authFetch,
  refreshAccessToken,
  isAccessTokenUsable,
  clearAuth,
  forceLogout,
  logoutAuthSession,
  getStoredUser,
  storeAuthSession,
  rememberSocialLoginSession,
  rememberRecentLogout,
  isRecentlyLoggedOutUser,
  clearRecentLoggedOutUser,
  disconnectSocialProviderSession,
  hasStoredSession,
};
export default API_BASE;
