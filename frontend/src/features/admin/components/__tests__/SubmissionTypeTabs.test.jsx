import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SubmissionTypeTabs from "../SubmissionTypeTabs";

jest.mock("../../../../shared/contexts/ThemeContext", () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock("../../../../shared/utils/api", () => ({
  apiPath: (path) => path,
  authFetch: jest.fn(),
}));

const { authFetch } = require("../../../../shared/utils/api");

describe("SubmissionTypeTabs", () => {
  beforeEach(() => {
    authFetch.mockReset();
  });

  test("loads tab counts from the General submissions API", async () => {
    authFetch.mockImplementation(async (url) => {
      const total = url.includes("testType=listening")
        ? 0
        : url.includes("testType=reading")
        ? 1
        : 1;
      return {
        ok: true,
        json: async () => ({ pagination: { total } }),
      };
    });

    render(
      <MemoryRouter>
        <SubmissionTypeTabs
          activeKey="all"
          countMode="general"
          showZeroBadge
          items={[
            { key: "all", label: "All Submissions" },
            { key: "listening", label: "Listening Submissions" },
            { key: "reading", label: "Reading + Writing Submissions" },
          ]}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All Submissions" })).toHaveTextContent("1");
      expect(screen.getByRole("button", { name: "Listening Submissions" })).toHaveTextContent("0");
      expect(screen.getByRole("button", { name: "Reading + Writing Submissions" })).toHaveTextContent("1");
    });

    expect(authFetch.mock.calls.map(([url]) => url)).toEqual([
      "general/submissions?page=1&limit=1&includeActive=1",
      "general/submissions?page=1&limit=1&includeActive=1&testType=listening",
      "general/submissions?page=1&limit=1&includeActive=1&testType=reading",
    ]);
  });
});
