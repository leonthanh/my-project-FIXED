import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PeopleMatchingEditor from "../PeopleMatchingEditor";

const buildQuestion = () => ({
  description: "",
  textsTitle: "Book reviews",
  people: [
    { id: "A", name: "Jo", need: "likes running", imageUrl: "" },
    { id: "B", name: "Ben", need: "", imageUrl: "" },
    { id: "C", name: "Kim", need: "", imageUrl: "" },
    { id: "D", name: "Mai", need: "", imageUrl: "" },
    { id: "E", name: "Tom", need: "", imageUrl: "" },
  ],
  texts: [
    { id: "A", title: "A", content: "Alpha" },
    { id: "B", title: "B", content: "Beta" },
    { id: "C", title: "C", content: "Gamma" },
    { id: "D", title: "D", content: "Delta" },
    { id: "E", title: "E", content: "Epsilon" },
    { id: "F", title: "F", content: "Zeta" },
    { id: "G", title: "G", content: "Eta" },
    { id: "H", title: "H", content: "Theta" },
  ],
  answers: {},
});

function Harness() {
  const [question, setQuestion] = React.useState(buildQuestion());

  return (
    <PeopleMatchingEditor
      question={question}
      startingNumber={7}
      onChange={(field, value) => {
        setQuestion((prev) => ({
          ...prev,
          [field]: value,
        }));
      }}
    />
  );
}

test("updates person image from a pasted URL", () => {
  render(<Harness />);

  const imageUrlInputs = screen.getAllByPlaceholderText("Paste image/GIF URL or /uploads/...");
  fireEvent.change(imageUrlInputs[0], { target: { value: "https://example.com/jo.gif" } });

  const previewImage = screen.getByAltText("Jo");
  expect(previewImage).toHaveAttribute("src", "https://example.com/jo.gif");
});

test("resolves internal upload paths for preview", () => {
  render(<Harness />);

  const imageUrlInputs = screen.getAllByPlaceholderText("Paste image/GIF URL or /uploads/...");
  fireEvent.change(imageUrlInputs[0], { target: { value: "backend/uploads/jo.gif" } });

  const previewImage = screen.getByAltText("Jo");
  expect(previewImage).toHaveAttribute("src", "/uploads/jo.gif");
});
