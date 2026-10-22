import React from "react";
import { render, screen } from "@testing-library/react";
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
});
