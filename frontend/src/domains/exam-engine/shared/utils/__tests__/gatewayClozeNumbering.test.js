import renumberGatewayClozeQuestion from "../gatewayClozeNumbering";

describe("renumberGatewayClozeQuestion", () => {
  test.each([
    ["Grammar - B", 6, 1],
    ["Grammar - C", 11, 1],
    ["Vocabulary - A", 16, 1],
    ["Vocabulary - C", 26, 2],
  ])("renumbers %s from its local number sequence", (sectionTitle, startNumber, localStart) => {
    const answers = Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [
        String(localStart + index),
        `answer-${index + 1}`,
      ])
    );
    const question = {
      passageText: Array.from(
        { length: 5 },
        (_, index) => `<p>(${localStart + index}) ______</p>`
      ).join(""),
      answers,
    };

    const result = renumberGatewayClozeQuestion(sectionTitle, question);

    expect(result.passageText).toBe(
      Array.from(
        { length: 5 },
        (_, index) => `<p>(${startNumber + index})${sectionTitle.startsWith("Grammar") ? " " : " ______"}</p>`
      ).join("")
    );
    expect(result.answers).toEqual(
      Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          String(startNumber + index),
          `answer-${index + 1}`,
        ])
      )
    );
  });

  test("preserves the example number in Vocabulary - C", () => {
    const question = {
      passageText: "<p>Ex 1. difficult (hard); answers (2), (3), (4), (5), and (6).</p>",
      answers: { 2: "outgoing", 3: "glad", 4: "clever", 5: "attractive", 6: "childish" },
    };

    const result = renumberGatewayClozeQuestion("Vocabulary - C", question);

    expect(result.passageText).toBe("<p>Ex 1. difficult (hard); answers (26), (27), (28), (29), and (30).</p>");
    expect(result.answers).toEqual({
      26: "outgoing",
      27: "glad",
      28: "clever",
      29: "attractive",
      30: "childish",
    });
  });

  test.each([
    ["Grammar - B", 6],
    ["Grammar - C", 11],
  ])("removes redundant underscores from %s without changing its question numbers", (sectionTitle, startNumber) => {
    const question = {
      passageText: Array.from(
        { length: 5 },
        (_, index) => `<p><strong>(${startNumber + index})</strong> __________ (verb)</p>`
      ).join(""),
      answers: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [String(startNumber + index), ""])
      ),
    };

    const result = renumberGatewayClozeQuestion(sectionTitle, question);

    expect(result.passageText).toBe(
      Array.from(
        { length: 5 },
        (_, index) => `<p><strong>(${startNumber + index})</strong> (verb)</p>`
      ).join("")
    );
  });

  test("leaves custom numbering unchanged", () => {
    const question = {
      passageText: "<p>(1) first (3) third</p>",
      answers: { 1: "first", 3: "third" },
    };

    const result = renumberGatewayClozeQuestion("Grammar - B", question);

    expect(result).toBe(question);
    expect(result.passageText).toBe("<p>(1) first (3) third</p>");
  });
});
