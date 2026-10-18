import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpenClozeSectionDisplay } from "../ExamCoreSectionDisplays";

describe("OpenClozeSectionDisplay", () => {
  test("numbers blanks continuously across notes list items", () => {
    const handleAnswerChange = jest.fn();
    const notesText = [
      "<ul>",
      "<li>The festival is ______ years old this year.</li>",
      "<li>The topic is ______.</li>",
      "<li>Sheila Sparks is a famous ______.</li>",
      "<li>There will be recycled games and ______.</li>",
      "<li>The festival costs £3 for ______.</li>",
      "</ul>",
    ].join("");

    render(
      <OpenClozeSectionDisplay
        section={{
          questions: [{
            passageTitle: "Earth Festival",
            passageText: notesText,
          }],
        }}
        secIdx={0}
        sectionStartNum={1}
        currentPartIndex={0}
        answers={{}}
        submitted={false}
        isDarkMode={false}
        flaggedQuestions={new Set()}
        toggleFlag={jest.fn()}
        handleAnswerChange={handleAnswerChange}
      />
    );

    for (let number = 1; number <= 5; number += 1) {
      expect(screen.getByPlaceholderText(`(${number})`)).toHaveAttribute(
        "id",
        `question-${number}`
      );
    }

    fireEvent.change(screen.getByPlaceholderText("(5)"), {
      target: { value: "children" },
    });
    expect(handleAnswerChange).toHaveBeenCalledWith("0-0-0-4", "children");
  });
});
