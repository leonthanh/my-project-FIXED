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
});
