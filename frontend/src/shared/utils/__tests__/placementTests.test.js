import {
  buildPlacementAttemptItemRuntimePath,
  isPlacementEligible,
} from "../placementTests";

describe("placementTests", () => {
  test("treats ix writing as placement eligible", () => {
    expect(
      isPlacementEligible({
        platform: "ix",
        skill: "writing",
        testType: "ix-writing",
      })
    ).toBe(true);
  });

  test("builds ix writing placement runtime paths", () => {
    expect(
      buildPlacementAttemptItemRuntimePath(
        {
          platform: "ix",
          skill: "writing",
          testId: 42,
          testType: "ix-writing",
          attemptItemToken: "item_tok_42",
        },
        "attempt_tok_7"
      )
    ).toBe(
      "/placement/ix/writing/42?attempt=attempt_tok_7&attemptItem=item_tok_42"
    );
  });
});