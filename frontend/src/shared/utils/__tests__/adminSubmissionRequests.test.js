import { apiPath, authFetch, getAuthHeaders } from "../api";
import { fetchAdminSubmissionJson } from "../adminSubmissionRequests";

jest.mock("../api", () => ({
  apiPath: jest.fn((path) => `/api/${path}`),
  authFetch: jest.fn(),
  getAuthHeaders: jest.fn(() => ({ Authorization: "Bearer test-token" })),
}));

describe("fetchAdminSubmissionJson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shares an in-flight response for identical submission requests", async () => {
    let resolveResponse;
    authFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );

    const firstRequest = fetchAdminSubmissionJson("reading-submissions/admin/list");
    const secondRequest = fetchAdminSubmissionJson("reading-submissions/admin/list");

    expect(apiPath).toHaveBeenCalledWith("reading-submissions/admin/list");
    expect(authFetch).toHaveBeenCalledTimes(1);

    resolveResponse({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      [{ id: 1 }],
      [{ id: 1 }],
    ]);
  });

  test("surfaces non-success responses", async () => {
    authFetch.mockResolvedValue({ ok: false });

    await expect(fetchAdminSubmissionJson("writing/list")).rejects.toThrow(
      "Request failed for writing/list"
    );
  });

  test("uses a supplied error message when the endpoint has no message", async () => {
    authFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(
      fetchAdminSubmissionJson("exam-levels/prepare", {
        errorMessage: "Could not load this exam level.",
      })
    ).rejects.toThrow("Could not load this exam level.");
  });
});
