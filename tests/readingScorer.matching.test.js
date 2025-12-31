const assert = require("assert");
const { getDetailedScoring } = require("../backend/utils/readingScorer");

describe("readingScorer - matching headings numbering", () => {
  it("assigns sequential numeric question numbers when questionNumber is a string like '37'", () => {
    const testData = {
      passages: [
        {
          id: "p1",
          title: "P1",
          questions: [
            {
              id: "q-mh-1",
              type: "matching-headings",
              questionNumber: "37",
              paragraphs: [{ id: "para1" }, { id: "para2" }, { id: "para3" }],
              headings: ["A", "B", "C"],
              correct: [
                { paragraphId: "para1", answer: "A" },
                { paragraphId: "para2", answer: "B" },
                { paragraphId: "para3", answer: "C" }
              ]
            }
          ]
        }
      ]
    };

    const answers = {
      para1: "A",
      para2: "X",
      para3: "C"
    };

    const details = getDetailedScoring(testData, answers);
    // expect three rows numbered 37,38,39
    const qnums = details.map((d) => d.questionNumber);
    assert.deepStrictEqual(qnums, [37, 38, 39]);

    // assert correct flags for each generated row
    assert.strictEqual(details[0].isCorrect, true);  // para1 correct
    assert.strictEqual(details[1].isCorrect, false); // para2 wrong
    assert.strictEqual(details[2].isCorrect, true);  // para3 correct
  });
});