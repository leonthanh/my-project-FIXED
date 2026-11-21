import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProgressReportsPage from "../ProgressReportsPage";

jest.mock("../../../../shared/components/AdminNavbar", () => () => null);
jest.mock("../../../../shared/utils/api", () => ({
  apiPath: jest.fn((path) => `/api/${path}`),
  authFetch: jest.fn(),
}));

const { apiPath, authFetch } = require("../../../../shared/utils/api");

describe("ProgressReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authFetch.mockImplementation(async (url) => ({
      ok: true,
      text: async () => `<p>${url}</p>`,
    }));
  });

  test("loads each report through the authenticated API", async () => {
    render(<ProgressReportsPage />);

    const starEduFrame = await screen.findByTitle("Star Edu Progress Report");
    await waitFor(() => {
      expect(starEduFrame).toHaveAttribute("srcdoc", "<p>/api/progress-reports/general</p>");
    });
    expect(apiPath).toHaveBeenCalledWith("progress-reports/general");
    expect(authFetch).toHaveBeenCalledWith("/api/progress-reports/general");

    fireEvent.click(screen.getByRole("tab", { name: "IELTS" }));

    const ieltsFrame = await screen.findByTitle("Star Edu IELTS Progress Report");
    await waitFor(() => {
      expect(ieltsFrame).toHaveAttribute("srcdoc", "<p>/api/progress-reports/ielts</p>");
    });
    expect(apiPath).toHaveBeenCalledWith("progress-reports/ielts");
    expect(authFetch).toHaveBeenCalledWith("/api/progress-reports/ielts");
  });

  test("shows a server permission error instead of rendering an unavailable report", async () => {
    authFetch.mockResolvedValue({ ok: false, status: 403 });

    render(<ProgressReportsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tài khoản của bạn không có quyền xem báo cáo."
    );
    expect(screen.queryByTitle("Star Edu Progress Report")).not.toBeInTheDocument();
  });
});
