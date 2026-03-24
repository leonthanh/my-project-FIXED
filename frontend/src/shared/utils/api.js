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
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Remove all auth data from storage and notify the app to redirect to login.
 * Call this on explicit logout OR when token refresh fails (session expired).
 */
function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Force logout: clear auth data then dispatch a global event so App.jsx can
 * redirect to /login and show a "session expired" message.
 */
function forceLogout() {
  clearAuth();
  window.dispatchEvent(new CustomEvent('auth:force-logout'));
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const hasRefreshToken = Boolean(refreshToken);

    try {
      console.debug('auth: attempting refresh');
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasRefreshToken ? { refreshToken } : {}),
      });

      if (!res.ok) {
        console.debug('auth: refresh failed', res.status);
        forceLogout();
        return false;
      }

      const data = await res.json().catch(() => ({}));
      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      console.debug('auth: refresh succeeded');
      return true;
    } catch (err) {
      console.debug('auth: refresh exception', err?.message || err);
      // Network error — don't force logout (server might be temporarily unavailable)
      localStorage.removeItem('accessToken');
      return false;
    } finally {
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
  if (!refreshed) return res; // still 401

  // Retry with new token
  mergedOpts.headers = { ...(mergedOpts.headers || {}), ...getAuthHeaders() };
  return fetch(url, mergedOpts);
}

export { API_HOST, API_BASE, apiPath, hostPath, getAuthHeaders, authFetch, refreshAccessToken, clearAuth, forceLogout };
export default API_BASE;
