import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import StudentAnnotations from "../StudentAnnotations.jsx";

const originalGetBoundingClientRect = Range.prototype.getBoundingClientRect;
const originalGetClientRects = Range.prototype.getClientRects;

const Harness = () => {
  const containerRef = React.useRef(null);

  return (
    <div>
      <StudentAnnotations
        containerRef={containerRef}
        storageKey="student-annotations:test"
        scopeKey="part-3"
        scopeLabel="Part 3"
      />
      <div ref={containerRef}>Alpha beta gamma delta.</div>
    </div>
  );
};

const selectSubstring = (container, substring) => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const index = currentNode.textContent.indexOf(substring);
    if (index >= 0) {
      const range = document.createRange();
      range.setStart(currentNode, index);
      range.setEnd(currentNode, index + substring.length);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    currentNode = walker.nextNode();
  }

  throw new Error(`Unable to find substring: ${substring}`);
};

describe("StudentAnnotations", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 140,
      left: 220,
      right: 320,
      bottom: 164,
      width: 100,
      height: 24,
    }));
    Range.prototype.getClientRects = jest.fn(() => [{
      top: 140,
      left: 220,
      right: 320,
      bottom: 164,
      width: 100,
      height: 24,
    }]);
  });

  afterEach(() => {
    Range.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Range.prototype.getClientRects = originalGetClientRects;
  });

  test("creates notes and highlights from a text selection", async () => {
    render(<Harness />);

    const content = screen.getByText("Alpha beta gamma delta.");
    const selection = window.getSelection();

    selectSubstring(content, "beta");

    fireEvent.mouseUp(content);

    const noteButton = await screen.findByRole("button", { name: /^note$/i });
    await userEvent.click(noteButton);

    expect(await screen.findByLabelText("Notes panel")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("Start typing your note");
    fireEvent.change(textarea, { target: { value: "Remember this word" } });

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("student-annotations:test"));
      expect(stored.annotations[0].noteText).toBe("Remember this word");
    });

    selectSubstring(content, "gamma");

    fireEvent.mouseUp(content);

    const highlightButton = await screen.findByRole("button", { name: /^highlight$/i });
    await userEvent.click(highlightButton);

    await waitFor(() => {
      expect(document.querySelectorAll("mark[data-student-annotation-id]")).toHaveLength(2);
    });

    expect(screen.getByRole("button", { name: /open notes/i })).toHaveTextContent("2");
  });
});