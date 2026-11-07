import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExamLevelHubPage from "../ExamLevelHubPage";

jest.mock("../../../../shared/components/AdminNavbar", () => () => <nav>Admin navigation</nav>);
jest.mock("../../../../shared/components/StudentNavbar", () => () => <nav>Student navigation</nav>);
jest.mock("../../../../shared/utils/api", () => ({
  apiPath: (path) => path,
  authFetch: jest.fn(),
  getStoredUser: () => ({ id: 1, role: "admin" }),
}));

const { authFetch } = require("../../../../shared/utils/api");

test("loads the Prepare hub and both configured skill test lists", async () => {
  authFetch.mockImplementation(async (path) => ({
    ok: true,
    json: async () => {
      if (path === "exam-levels/prepare") {
        return {
          code: "prepare",
          name: "Prepare",
          skills: ["listening", "reading-writing"],
        };
      }
      if (path === "placement/packages/current") return { items: [] };
      return [];
    },
  }));

  render(
    <MemoryRouter initialEntries={["/exam-levels/prepare"]}>
      <Routes>
        <Route path="/exam-levels/:code" element={<ExamLevelHubPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "Prepare" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Listening" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Reading & Writing" })).toBeInTheDocument();
  expect(authFetch).toHaveBeenCalledWith("exam-levels/prepare/listening/tests");
  expect(authFetch).toHaveBeenCalledWith("exam-levels/prepare/reading-writing/tests");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
