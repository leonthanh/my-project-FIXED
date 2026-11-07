import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PrepareQuestionsDisplay from "./PrepareQuestionsDisplay";

test("renders and saves two blanks under one question number", () => {
  const onAnswerChange = jest.fn();
  render(
    <PrepareQuestionsDisplay
      section={{
        id: "0-0",
        questions: [{
          exerciseMode: "two-blanks",
          items: [{ questionText: "I {1} and {2}." }],
        }],
      }}
      startingNumber={1}
      onAnswerChange={onAnswerChange}
      answers={{ "0-0-0-0": "one" }}
      submitted={false}
    />
  );
  expect(screen.getByText("1")).toBeTruthy();
  expect(screen.getByLabelText("Câu 1, ô 1").value).toBe("one");
  fireEvent.change(screen.getByLabelText("Câu 1, ô 2"), { target: { value: "two" } });
  expect(onAnswerChange).toHaveBeenCalledWith("0-0-0-1", "two");
});

test("renders two choices with a single saved answer", () => {
  const onAnswerChange = jest.fn();
  render(
    <PrepareQuestionsDisplay
      section={{ id: "0-8", questions: [{ exerciseMode: "choice", items: [{ questionText: "Choose", options: ["a", "b"] }] }] }}
      startingNumber={41}
      onAnswerChange={onAnswerChange}
      answers={{}}
      submitted={false}
    />
  );
  fireEvent.click(screen.getByLabelText("b"));
  expect(onAnswerChange).toHaveBeenCalledWith("0-8-0", "b");
});
