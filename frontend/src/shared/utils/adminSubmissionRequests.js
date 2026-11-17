import { apiPath, authFetch, getAuthHeaders } from "./api";

const inFlightRequests = new Map();

export const fetchAdminSubmissionJson = (path, { errorMessage } = {}) => {
  const url = apiPath(path);
  const requestKey = `${url}::${getAuthHeaders().Authorization || ""}`;
  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = authFetch(url).then(async (response) => {
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (response.ok) throw error;
      payload = {};
    }
    if (!response.ok) {
      throw new Error(payload?.message || errorMessage || `Request failed for ${path}`);
    }
    return payload;
  });

  inFlightRequests.set(requestKey, request);
  request.then(
    () => {
      if (inFlightRequests.get(requestKey) === request) inFlightRequests.delete(requestKey);
    },
    () => {
      if (inFlightRequests.get(requestKey) === request) inFlightRequests.delete(requestKey);
    }
  );

  return request;
};
