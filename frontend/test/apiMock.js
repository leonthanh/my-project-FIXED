const API_HOST = '';

function normalizePath(pathname = '') {
  return String(pathname || '').replace(/^\/+/, '');
}

function apiPath(pathname = '') {
  return `/api/${normalizePath(pathname)}`;
}

function hostPath(pathname = '') {
  return `/${normalizePath(pathname)}`;
}

function getStoredUser() {
  const raw =
    (typeof localStorage !== 'undefined' && localStorage.getItem('user')) ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user')) ||
    null;

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAuth() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }
}

function hasStoredSession() {
  return Boolean(getStoredUser());
}

function redirectToLogin() {
  return undefined;
}

async function authFetch(input, init) {
  return fetch(input, init);
}

async function refreshAccessToken() {
  return false;
}

module.exports = {
  API_HOST,
  apiPath,
  hostPath,
  getStoredUser,
  clearAuth,
  hasStoredSession,
  redirectToLogin,
  authFetch,
  refreshAccessToken,
};