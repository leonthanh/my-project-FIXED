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

  test("treats orange pet writing as placement eligible", () => {
    expect(
      isPlacementEligible({
        platform: "orange",
        skill: "writing",
        testType: "pet-writing",
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

  test("builds orange pet writing placement runtime paths", () => {
    expect(
      buildPlacementAttemptItemRuntimePath(
        {
          platform: "orange",
          skill: "writing",
          testId: 13,
          testType: "pet-writing",
          attemptItemToken: "item_pet_13",
        },
        "attempt_pet_5"
      )
    ).toBe(
      "/placement/orange/pet-writing/13?attempt=attempt_pet_5&attemptItem=item_pet_13"
    );
  });
});