import {
  filterPlacementGroups,
  buildPlacementAttemptItemRuntimePath,
  getPlacementItemSummaryCounts,
  groupPlacementItems,
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

  test("treats Gateway reading-writing and listening tests as placement eligible", () => {
    expect(
      isPlacementEligible({
        platform: "gateway",
        skill: "reading-writing",
        testType: "gateway-reading-writing",
      })
    ).toBe(true);
    expect(
      isPlacementEligible({
        platform: "gateway",
        skill: "listening",
        testType: "gateway-listening",
      })
    ).toBe(true);
  });

  test("builds General placement runtime paths and groups", () => {
    const item = {
      platform: "general",
      skill: "listening",
      testId: 18,
      testType: "general-listening",
      title: "General listening test",
      attemptItemToken: "item_general_18",
    };

    expect(isPlacementEligible(item)).toBe(true);
    expect(buildPlacementAttemptItemRuntimePath(item, "attempt_general_3")).toBe(
      "/placement/general/listening/18?attempt=attempt_general_3&attemptItem=item_general_18"
    );
    expect(groupPlacementItems([item]).map(({ platform, title }) => ({ platform, title }))).toEqual([
      { platform: "general", title: "General tests" },
    ]);
    expect(getPlacementItemSummaryCounts([item]).general).toBe(1);
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

  test("builds Gateway placement runtime paths", () => {
    expect(
      buildPlacementAttemptItemRuntimePath(
        {
          platform: "gateway",
          skill: "reading-writing",
          testId: 5,
          testType: "gateway-reading-writing",
          attemptItemToken: "item_gateway_5",
        },
        "attempt_gateway_2"
      )
    ).toBe(
      "/placement/gateway/reading-writing/5?attempt=attempt_gateway_2&attemptItem=item_gateway_5"
    );
  });

  test("builds General placement runtime paths", () => {
    expect(
      buildPlacementAttemptItemRuntimePath(
        {
          platform: "general",
          skill: "reading",
          testId: 22,
          testType: "general-reading-60",
          attemptItemToken: "item_general_22",
        },
        "attempt_general_4"
      )
    ).toBe(
      "/placement/general/reading/22?attempt=attempt_general_4&attemptItem=item_general_22"
    );
  });

  test("groups placement items by platform with stable filtered numbering", () => {
    const groups = groupPlacementItems([
      {
        platform: "orange",
        skill: "listening",
        testType: "pet-listening",
        title: "PET Listening",
      },
      {
        platform: "ix",
        skill: "listening",
        testType: "ix-listening",
        title: "IX Listening",
      },
      {
        platform: "orange",
        skill: "reading",
        testType: "ket-reading",
        title: "KET Reading",
      },
      {
        platform: "ix",
        skill: "writing",
        testType: "ix-writing",
        title: "IX Writing",
      },
    ]);

    expect(groups.map((group) => group.platform)).toEqual(["ix", "orange"]);
    expect(groups[0].items.map((item) => item.skill)).toEqual(["writing", "listening"]);
    expect(groups[1].items.map((item) => item.title)).toEqual(["KET Reading", "PET Listening"]);

    expect(filterPlacementGroups(groups).map((group) => group.startIndex)).toEqual([0, 2]);
    expect(filterPlacementGroups(groups, "orange")[0].startIndex).toBe(0);
  });

  test("includes Gateway items in their platform group and summary count", () => {
    const gatewayItem = {
      platform: "gateway",
      skill: "reading-writing",
      testType: "gateway-reading-writing",
      title: "284-GW-5A",
    };
    const groups = groupPlacementItems([gatewayItem]);

    expect(groups).toEqual([
      {
        platform: "gateway",
        accent: "gateway",
        title: "Gateway tests",
        items: [gatewayItem],
      },
    ]);
    expect(getPlacementItemSummaryCounts([gatewayItem]).gateway).toBe(1);
  });
});