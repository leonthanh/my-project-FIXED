import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExamLevelSubmissionsPage from "../ExamLevelSubmissionsPage";

jest.mock("../../../../shared/components/AdminNavbar", () => () => <nav>Admin navigation</nav>);
jest.mock("../../../../shared/utils/api", () => ({
  apiPath: (path) => path,
  authFetch: jest.fn(),
}));

const { authFetch } = require("../../../../shared/utils/api");

const submissions = [
  {
    id: 1,
    skill: "reading-writing",
    studentName: "Alex Student",
    studentPhone: "0900000001",
    classCode: "PP-A",
    testTitle: "Prepare Reading & Writing",
    score: 42,
    totalQuestions: 50,
    percentage: 84,
    status: "submitted",
    submittedAt: "2026-11-12T08:00:00.000Z",
  },
  {
    id: 2,
    skill: "listening",
    studentName: "Sam Student",
    studentPhone: "0900000002",
    classCode: "PP-B",
    testTitle: "Prepare Listening",
    score: 20,
    totalQuestions: 25,
    percentage: 80,
    status: "reviewed",
    feedback: "Good work",
    submittedAt: "2026-11-12T09:00:00.000Z",
  },
];

beforeEach(() => {
  authFetch.mockReset();
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
      if (path === "exam-levels/prepare/submissions?includeActive=1") return submissions;
      return {};
    },
  }));
});

test("shows shared submission layout, filters by skill/status, and opens Prepare review", async () => {
  render(
    <MemoryRouter initialEntries={["/exam-levels/prepare/submissions"]}>
      <Routes>
        <Route path="/exam-levels/:code/submissions" element={<ExamLevelSubmissionsPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Alex Student")).toBeInTheDocument();
  expect(screen.getByText("Sam Student")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Review workspace groups" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Prepare submission types" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Listening submissions" }));

  expect(await screen.findByText("Sam Student")).toBeInTheDocument();
  expect(screen.queryByText("Alex Student")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Pending" }));
  expect(await screen.findByText("No submissions match the current filters.")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "All" }));
  expect(await screen.findByText("Sam Student")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Sam Student"));
  expect(await screen.findByText("20/25", {
    selector: ".prepare-submissions-page__stat > strong",
  })).toBeInTheDocument();
  expect(screen.getByText("80%", {
    selector: ".prepare-submissions-page__stat > strong",
  })).toBeInTheDocument();
  expect(screen.getByText("Good work")).toBeInTheDocument();
  const reviewLink = await screen.findByRole("link", { name: "Open submission review" });
  expect(reviewLink).toHaveAttribute("href", "/exam-levels/prepare/submissions/2");
});

test("shows active Prepare attempts and sends extension requests", async () => {
  const activeSubmission = {
    id: 3,
    skill: "reading-writing",
    studentName: "Taylor Student",
    studentPhone: "0900000003",
    classCode: "PP-C",
    testTitle: "Prepare Reading & Writing",
    status: "submitted",
    finished: false,
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    lastSavedAt: "2026-11-12T10:00:00.000Z",
  };
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  let extensionRequest;
  authFetch.mockImplementation(async (path, options = {}) => ({
    ok: true,
    json: async () => {
      if (path === "exam-levels/prepare") {
        return {
          code: "prepare",
          name: "Prepare",
          skills: ["listening", "reading-writing"],
        };
      }
      if (path === "exam-levels/prepare/submissions?includeActive=1") {
        return [activeSubmission];
      }
      if (path === "exam-levels/prepare/submissions/3/extend-time") {
        extensionRequest = { path, options };
        return { message: "Extended by 5 minutes.", expiresAt };
      }
      return {};
    },
  }));

  render(
    <MemoryRouter initialEntries={["/exam-levels/prepare/submissions"]}>
      <Routes>
        <Route path="/exam-levels/:code/submissions" element={<ExamLevelSubmissionsPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Taylor Student")).toBeInTheDocument();
  expect(screen.getByText("In Progress", {
    selector: ".prepare-submissions-page__status.is-active",
  })).toBeInTheDocument();
  fireEvent.click(screen.getByText("Taylor Student"));
  expect(await screen.findByText("This attempt is still open.")).toBeInTheDocument();
  expect(screen.getByText("Accuracy")).toBeInTheDocument();
  expect(screen.getByText("Time Spent")).toBeInTheDocument();
  expect(screen.getByText("Last saved")).toBeInTheDocument();

  fireEvent.click(screen.getByTitle("Add 5 minutes"));
  await waitFor(() => {
    expect(authFetch).toHaveBeenCalledWith(
      "exam-levels/prepare/submissions/3/extend-time",
      expect.objectContaining({ method: "POST" })
    );
  });
  expect(extensionRequest).toEqual({
    path: "exam-levels/prepare/submissions/3/extend-time",
    options: expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ extraMinutes: 5 }),
    }),
  });
});
