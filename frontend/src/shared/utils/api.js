// API URL helper - normalize and export host/base helpers
const RAW_API = import.meta.env.VITE_API_URL || "";
// Remove trailing slashes and a trailing '/api' if present
const API_HOST = RAW_API.replace(/\/+$/g, "").replace(/\/api$/i, "");
const API_BASE = API_HOST + "/api";

function apiPath(p) {
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
}

function hostPath(p) {
  return `${API_HOST}/${String(p).replace(/^\/+/, "")}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Remove all auth data from storage.
 */
function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("auth:lastRefreshAt");
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

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // Skip proactive refresh if another tab (or this tab) already refreshed recently
    // and a valid accessToken is already stored. This prevents multi-tab race conditions
    // with rotating refresh tokens: both tabs open simultaneously → both send the same
    // cookie → second request hits an already-rotated (revoked) token → 401 → logout.
    const lastRefresh = parseInt(localStorage.getItem(REFRESH_AT_KEY) || "0", 10);
    if (
      Date.now() - lastRefresh < REFRESH_RECENT_MS &&
      localStorage.getItem("accessToken")
    ) {
      console.debug("auth: skipping refresh, token recently refreshed by this or another tab");
      return true;
    }

    const refreshToken = localStorage.getItem("refreshToken");
    const hasRefreshToken = Boolean(refreshToken);
    const hadStoredUser = Boolean(localStorage.getItem("user"));
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
          if (
            Date.now() - recentRefresh < REFRESH_RECENT_MS &&
            localStorage.getItem("accessToken")
          ) {
            console.debug("auth: 401 resolved — concurrent tab already refreshed successfully");
            return true;
          }
        }

        if (hadStoredUser) {
          forceLogout();
        } else {
          clearAuth();
        }
        return false;
      }

      const data = await res.json().catch(() => ({}));
      if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      // Record successful refresh time so concurrent tabs can detect it
      localStorage.setItem(REFRESH_AT_KEY, String(Date.now()));
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
  getAuthHeaders,
  authFetch,
  refreshAccessToken,
  clearAuth,
  forceLogout,
};
export default API_BASE;
