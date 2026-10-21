import { buildPlatformTabs } from "../examRegistry";
import { getQuestionTypesForTest } from "../questionTypes";

describe("examRegistry General platform", () => {
  test("uses General as the default platform label", () => {
    expect(buildPlatformTabs()[3]).toMatchObject({
      key: "general",
      label: "General",
    });
  });

  test.each([
    ["exam-reading-v1", "reading-open-questions"],
    ["exam-listening-v1", "notes-completion"],
    ["writing-task-v1", "story-writing"],
  ])("exposes shared question types for %s", (templateId, expectedType) => {
    expect(getQuestionTypesForTest(templateId).map(({ id }) => id)).toContain(
      expectedType
    );
  });
});
