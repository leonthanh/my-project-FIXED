import React from "react";
import { render, screen } from "@testing-library/react";
import GapMatchEditor from "../GapMatchEditor";

jest.mock("../../../LineIcon.jsx", () => () => <span aria-hidden="true">icon</span>);

const buildQuestion = () => ({
  leftTitle: "People",
  rightTitle: "Presents",
  studentTitle: "What present will each friend buy?",
  exampleText: "0 Cara",
  exampleAnswer: "art equipment",
  leftItems: ["Anthea", "Larry"],
  options: ["art equipment", "bag", "book"],
  correctAnswers: ["bag", "book"],
});

function Harness() {
  const [question, setQuestion] = React.useState(buildQuestion());

  return (
    <GapMatchEditor
      question={question}
      startingNumber={21}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

test("renders numbered prompts, labeled drag options, and student-style preview", () => {
  render(<Harness />);

  expect(screen.getAllByText(/^21$/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/^22$/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/^A$/).length).toBeGreaterThan(1);
  expect(screen.getAllByText(/^B$/).length).toBeGreaterThan(1);
  expect(screen.getAllByRole("option", { name: "A. art equipment" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("option", { name: "B. bag" }).length).toBeGreaterThan(0);
  expect(screen.getByText("Review giao diện học sinh")).toBeInTheDocument();
  expect(screen.getAllByText("What present will each friend buy?").length).toBeGreaterThan(0);
  expect(screen.getByText("Drop 21")).toBeInTheDocument();
});