import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../../../../shared/contexts/ThemeContext";
import ExamCoreResultsModal from "../ExamCoreResultsModal";

describe("ExamCoreResultsModal", () => {
  test("honors confirmation-only results and hides the calculated score", () => {
    render(
      <ThemeProvider>
        <ExamCoreResultsModal
          results={{
            mode: "confirmation",
            score: 43,
            total: 50,
            percentage: 86,
          }}
          displayMode="score"
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Submission received")).toBeInTheDocument();
    expect(
      screen.getByText("Your answers have been submitted successfully.")
    ).toBeInTheDocument();
    expect(screen.queryByText("43/50 points")).not.toBeInTheDocument();
    expect(screen.queryByText("86%")).not.toBeInTheDocument();
  });
});
