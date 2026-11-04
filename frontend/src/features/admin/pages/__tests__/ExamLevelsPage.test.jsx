import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExamLevelsPage from "../ExamLevelsPage";

jest.mock("../../../../shared/components/AdminNavbar", () => () => (
  <div data-testid="admin-navbar" />
));

jest.mock("../../../../shared/utils/api", () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn(),
}));

const { authFetch } = require("../../../../shared/utils/api");

describe("ExamLevelsPage", () => {
  beforeEach(() => {
    authFetch.mockImplementation((path) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          path === "exam-levels/templates"
            ? [
                {
                  skill: "reading",
                  label: "Reading",
                  templateId: "exam-reading-v1",
                  defaultDurationMinutes: 45,
                },
                {
                  skill: "listening",
                  label: "Listening",
                  templateId: "exam-listening-v1",
                  defaultDurationMinutes: 30,
                },
                {
                  skill: "writing",
                  label: "Writing",
                  templateId: "writing-task-v1",
                  defaultDurationMinutes: 45,
                },
                {
                  skill: "reading-writing",
                  label: "Reading & Writing",
                  templateId: "gateway-reading-writing",
                  templateName: "Reading & writing template",
                  defaultDurationMinutes: 60,
                },
              ]
            : [],
      })
    );
  });

  test("renders the level skills when templates load", async () => {
    render(
      <MemoryRouter>
        <ExamLevelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("checkbox", { name: "Reading" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Listening" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Writing" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Create level" })).toBeEnabled();
  });

  test("selects Reading & Writing as one exam while keeping Listening independent", async () => {
    render(
      <MemoryRouter>
        <ExamLevelsPage />
      </MemoryRouter>
    );

    const reading = await screen.findByRole("checkbox", { name: "Reading" });
    const listening = screen.getByRole("checkbox", { name: "Listening" });
    const writing = screen.getByRole("checkbox", { name: "Writing" });
    const readingWriting = screen.getByRole("checkbox", { name: "Reading & Writing" });

    expect(readingWriting).not.toBeChecked();
    fireEvent.click(readingWriting);

    expect(readingWriting).toBeChecked();
    expect(reading).not.toBeChecked();
    expect(writing).not.toBeChecked();
    expect(listening).toBeChecked();

    fireEvent.click(reading);
    expect(reading).toBeChecked();
    expect(readingWriting).not.toBeChecked();
    expect(listening).toBeChecked();
  });

  test("renders and edits an existing combined-skills level", async () => {
    const scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
    const defaultFetch = authFetch.getMockImplementation();
    authFetch.mockImplementation((path) => path === "exam-levels/admin"
      ? Promise.resolve({
          ok: true,
          json: async () => [{
            id: 1,
            code: "prepare",
            name: "Prepare",
            skills: ["listening", "reading-writing"],
            skillConfig: {
              listening: { templateId: "exam-listening-v1", weight: 1.01, durationMinutes: 30 },
              "reading-writing": { templateId: "gateway-reading-writing", weight: 1.01, durationMinutes: 60 },
            },
            isActive: true,
          }],
        })
      : defaultFetch(path));

    render(
      <MemoryRouter>
        <ExamLevelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Prepare" })).toBeInTheDocument();
    expect(screen.getByText("Reading & Writing · weight 1.01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("checkbox", { name: "Listening" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Reading & Writing" })).toBeChecked();
    scrollTo.mockRestore();
  });
});
