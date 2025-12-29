// API URL helper - normalize and export host/base helpers
const RAW_API = process.env.REACT_APP_API_URL || "";
// Remove trailing slashes and a trailing '/api' if present
const API_HOST = RAW_API.replace(/\/+$/g, "").replace(/\/api$/i, "");
const API_BASE = API_HOST + "/api";

function apiPath(p) {
  return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
}

function hostPath(p) {
  return `${API_HOST}/${String(p).replace(/^\/+/, "")}`;
}

export { API_HOST, API_BASE, apiPath, hostPath };
export default API_BASE;
