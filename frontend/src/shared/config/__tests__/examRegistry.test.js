import {
  buildPlatformTabs,
  buildSelectTestPath,
  DEFAULT_PREPARE_SKILL,
  parseSelectTestSearch,
  PREPARE_SKILLS,
} from "../examRegistry";
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

describe("examRegistry Prepare platform", () => {
  test("preserves Prepare skill selections in the Test Library route", () => {
    expect(PREPARE_SKILLS.map(({ key }) => key)).toEqual([
      "reading-writing",
      "listening",
    ]);
    expect(buildSelectTestPath({ platform: "prepare", tab: "listening" })).toBe(
      "/select-test?platform=prepare&tab=listening"
    );
    expect(parseSelectTestSearch("?platform=prepare&tab=reading-writing")).toMatchObject({
      platform: "prepare",
      prepareTab: "reading-writing",
    });
  });

  test("falls back to Reading & Writing for an unknown Prepare skill", () => {
    expect(parseSelectTestSearch("?platform=prepare&tab=unknown").prepareTab).toBe(
      DEFAULT_PREPARE_SKILL
    );
  });
});
