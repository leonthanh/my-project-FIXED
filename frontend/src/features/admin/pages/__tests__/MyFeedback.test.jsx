import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../../../shared/contexts/ThemeContext";
import MyFeedback from "../MyFeedback";

jest.mock("../../../../shared/components/StudentNavbar", () => () => null);

describe("MyFeedback", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ phone: "123456789" }));
    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const response = (body) => Promise.resolve({ ok: true, json: async () => body });
      if (String(url).includes("reading-submissions/user/")) {
        return response([
          {
            id: 2,
            testId: 8,
            band: 7.5,
            correct: 43,
            total: 51,
            scorePercentage: 84,
            studentResultVisibility: "confirmation",
            ReadingTest: { classCode: "IX-A", teacherName: "Teacher" },
          },
        ]);
      }
      if (String(url).includes("listening-submissions/user/")) {
        return response([
          {
            id: 3,
            testId: 9,
            band: 7.5,
            correct: 43,
            total: 51,
            scorePercentage: 84,
            studentResultVisibility: "confirmation",
            ListeningTest: { classCode: "IX-A", teacherName: "Teacher" },
          },
        ]);
      }
      if (String(url).includes("cambridge/submissions/user/")) {
        return response([
          {
            id: 1,
            testTitle: "Gateway mid-course test",
            testType: "gateway-reading-writing",
            classCode: "284-GW-5A",
            score: 43,
            totalQuestions: 51,
            studentResultVisibility: "confirmation",
          },
        ]);
      }
      return response([]);
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("shows submission status instead of results on all supported feedback tabs", async () => {
    render(
      <ThemeProvider>
        <MyFeedback />
      </ThemeProvider>
    );

    fireEvent.click(await screen.findByRole("tab", { name: /Reading/ }));
    expect(
      await screen.findByText("Submitted", {
        selector: ".myFeedbackScoreBadge strong",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText("7.5")).not.toBeInTheDocument();
    expect(screen.queryByText("84%")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /View Detailed Analysis/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View Answer Details/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Listening/ }));
    expect(
      await screen.findByText("Submitted", {
        selector: ".myFeedbackScoreBadge strong",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText("7.5")).not.toBeInTheDocument();
    expect(screen.queryByText("84%")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View Result Details/i })
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("tab", { name: /Orange/ }));
    expect(
      await screen.findByText("Submitted", {
        selector: ".myFeedbackScoreBadge strong",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText("43/51")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View Full Result/i })
    ).not.toBeInTheDocument();
  });
});
