import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../ProtectedRoute";

jest.mock("../../utils/api", () => ({
  clearAuth: jest.fn(),
  getStoredUser: jest.fn(),
  hasStoredSession: jest.fn(),
}));

const {
  getStoredUser,
  hasStoredSession,
} = require("../../utils/api");

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirects teachers away from admin-only pages to review", async () => {
    getStoredUser.mockReturnValue({ role: "teacher" });
    hasStoredSession.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route
            path="/admin/users"
            element={(
              <ProtectedRoute role="admin">
                <div>Admin Only</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/review" element={<div>Review Queue</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Review Queue")).toBeInTheDocument();
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});