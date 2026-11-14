import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExamLevelSubmissionsPage from "../ExamLevelSubmissionsPage";

jest.mock("../../../../shared/components/AdminNavbar", () => () => <nav>Admin navigation</nav>);
jest.mock("../../../../shared/components/ConfirmModal", () => (props) => (
  props.isOpen ? (
    <div role="dialog">
      <h2>{props.title}</h2>
      {props.extraContent}
      <button onClick={props.onConfirm}>{props.confirmText}</button>
    </div>
  ) : null
));
jest.mock("../../../../shared/utils/api", () => ({
  apiPath: (path) => path,
  authFetch: jest.fn(),
  getStoredUser: jest.fn(() => ({ role: "teacher", name: "Teacher" })),
  hostPath: (path) => path,
}));

const { authFetch, getStoredUser } = require("../../../../shared/utils/api");

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
    detailedResults: {
      "0-10-0": {
        isCorrect: null,
        userAnswer: "The student essay text.",
        questionType: "story-writing",
        questionText: "Read the letter and write about 80 words.",
      },
    },
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
  getStoredUser.mockReturnValue({ role: "teacher", name: "Teacher" });
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
      if (path === "exam-levels/prepare/submissions?includeActive=1") return submissions;
      if (path === "exam-levels/prepare/submissions/1/review") {
        return {
          ...JSON.parse(options.body),
          status: "reviewed",
        };
      }
      if (path === "exam-levels/prepare/submissions/1" && !options.method) {
        return {
          submission: submissions[0],
          test: {
            parts: [{
              sections: Array.from({ length: 11 }, (_, index) => (
                index === 10
                  ? {
                      questionType: "story-writing",
                      questions: [{
                        prepareWritingMode: true,
                        instructions: "Read the letter and write about 80 words.",
                        story: "<p><em>Dear Katie, I don't know what to do this weekend.</em></p>",
                      }],
                    }
                  : {}
              )),
            }],
          },
        };
      }
      if (path === "exam-levels/prepare/submissions/1" && options.method === "DELETE") {
        return { message: "Submission deleted." };
      }
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
  const reviewLink = await screen.findByRole("link", { name: "View" });
  expect(reviewLink).toHaveAttribute("href", "/prepare/submission-results/2");
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

test("reviews Prepare writing responses and saves per-response feedback", async () => {
  render(
    <MemoryRouter initialEntries={["/exam-levels/prepare/submissions"]}>
      <Routes>
        <Route path="/exam-levels/:code/submissions" element={<ExamLevelSubmissionsPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Alex Student")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Alex Student"));
  fireEvent.click(screen.getByRole("button", { name: /Review Essay/ }));

  const drawer = screen.getByRole("dialog", { name: "Prepare essay review" });
  expect(drawer).toHaveTextContent("The student essay text.");
  expect(drawer).toHaveTextContent("Open-ended responses to review");
  expect(await screen.findByText("Read the letter and write about 80 words.")).toBeInTheDocument();
  expect(await screen.findByText("Dear Katie, I don't know what to do this weekend.")).toBeInTheDocument();
  expect(drawer).toHaveTextContent("Instructions");
  expect(drawer).toHaveTextContent("Letter / Prompt Text");
  fireEvent.change(screen.getByLabelText("Teacher feedback"), {
    target: { value: "Good organization." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Feedback" }));

  await waitFor(() => {
    expect(authFetch).toHaveBeenCalledWith(
      "exam-levels/prepare/submissions/1/review",
      expect.objectContaining({ method: "PUT" })
    );
  });
  expect(JSON.parse(authFetch.mock.calls.find(
    ([path]) => path === "exam-levels/prepare/submissions/1/review"
  )[1].body)).toEqual(expect.objectContaining({
    responseFeedback: expect.objectContaining({
      items: expect.objectContaining({
        "0-10-0": expect.objectContaining({
          feedback: "Good organization.",
          prompt: expect.stringContaining("Letter / Prompt Text:"),
        }),
      }),
    }),
  }));
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Prepare essay review" })).not.toBeInTheDocument();
});

test("lets admins delete a Prepare submission after confirmation", async () => {
  getStoredUser.mockReturnValue({ role: "admin", name: "Admin" });
  render(
    <MemoryRouter initialEntries={["/exam-levels/prepare/submissions"]}>
      <Routes>
        <Route path="/exam-levels/:code/submissions" element={<ExamLevelSubmissionsPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Alex Student")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Alex Student"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Delete this submission?");
  fireEvent.click(screen.getByRole("button", { name: "Delete submission" }));

  await waitFor(() => {
    expect(authFetch).toHaveBeenCalledWith(
      "exam-levels/prepare/submissions/1",
      { method: "DELETE" }
    );
  });
  await waitFor(() => {
    expect(screen.queryByText("Alex Student")).not.toBeInTheDocument();
  });
});
