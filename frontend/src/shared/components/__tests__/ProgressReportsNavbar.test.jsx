import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminNavbar from "../AdminNavbar";

jest.mock("../../utils/api", () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn(() => new Promise(() => {})),
  hostPath: jest.fn((path) => path),
  logoutAuthSession: jest.fn(),
  getStoredUser: jest.fn(),
}));

jest.mock("../../utils/adminSubmissionRequests", () => ({
  fetchAdminSubmissionJson: jest.fn(() => new Promise(() => {})),
}));

jest.mock("../../utils/cambridgeFeedback", () => ({
  hasResolvedSubmissionFeedback: jest.fn(() => false),
}));

jest.mock("../../utils/permissions", () => ({
  canManageCategory: jest.fn(() => true),
}));

const { getStoredUser } = require("../../utils/api");

describe("AdminNavbar progress report access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ["teacher", "/admin/progress-reports"],
    ["admin", "/admin/progress-reports"],
    ["student", null],
  ])("exposes the progress report link for %s users only", (role, expectedHref) => {
    getStoredUser.mockReturnValue({
      id: 12,
      name: "Test User",
      role,
      canManageTests: true,
    });

    render(
      <MemoryRouter initialEntries={["/admin/progress-reports"]}>
        <AdminNavbar />
      </MemoryRouter>
    );

    const reportLink = screen.queryByRole("link", { name: "Progress Reports" });
    expect(reportLink && reportLink.getAttribute("href")).toBe(expectedHref);
  });
});
