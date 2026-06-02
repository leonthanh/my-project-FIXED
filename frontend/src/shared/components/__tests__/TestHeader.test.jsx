import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import TestHeader from "../TestHeader.jsx";

describe("TestHeader", () => {
  test("renders the optional student name and custom header actions", async () => {
    const handleNotesClick = jest.fn();

    render(
      <TestHeader
        testType="READING"
        testTitle="Sample Reading"
        timeRemaining={1200}
        answeredCount={6}
        totalQuestions={20}
        studentName="Nguyen Van A"
        headerActions={(
          <button type="button" onClick={handleNotesClick}>
            Notes
          </button>
        )}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();

    const notesButton = screen.getByRole("button", { name: /notes/i });
    await userEvent.click(notesButton);

    expect(handleNotesClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});