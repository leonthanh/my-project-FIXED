const API_HOST = '';

function normalizePath(pathname = '') {
  const raw = String(pathname || '').trim();
  if (!raw) return '';

  let cleaned = raw.replace(/\\/g, '/');

  if (/^https?:\/\//i.test(cleaned) || /^data:/i.test(cleaned) || /^blob:/i.test(cleaned)) {
    return cleaned;
  }

  cleaned = cleaned.replace(/^\.\//, '').replace(/^(\.\.\/)+/, '');
  cleaned = cleaned.replace(/^backend\/upload\//i, 'uploads/');
  cleaned = cleaned.replace(/^backend\/uploads\//i, 'uploads/');
  cleaned = cleaned.replace(/^upload\//i, 'uploads/');
  cleaned = cleaned.replace(/^\/+backend\/+upload\//i, 'uploads/');
  cleaned = cleaned.replace(/^\/+backend\/+uploads\//i, 'uploads/');
  cleaned = cleaned.replace(/^\/+upload\//i, 'uploads/');

  return cleaned.replace(/^\/+/, '');
}

function apiPath(pathname = '') {
  return `/api/${normalizePath(pathname)}`;
}

function hostPath(pathname = '') {
  const normalized = normalizePath(pathname);
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized) || /^blob:/i.test(normalized)) {
    return normalized;
  }
  return `/${normalized}`;
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