import { getExamLevelSkillBuilderSuccessPath } from "../ExamLevelSkillBuilderPage";

jest.mock("../../../exam-core/shared/components/ExamCoreTestBuilder", () => () => null);

describe("getExamLevelSkillBuilderSuccessPath", () => {
  test("returns Prepare builders to the matching Test List skill", () => {
    expect(getExamLevelSkillBuilderSuccessPath("prepare", "reading-writing")).toBe(
      "/select-test?platform=prepare&tab=reading-writing"
    );
    expect(getExamLevelSkillBuilderSuccessPath("prepare", "listening")).toBe(
      "/select-test?platform=prepare&tab=listening"
    );
  });

  test("keeps other exam levels on their existing hub route", () => {
    expect(getExamLevelSkillBuilderSuccessPath("gateway", "reading-writing")).toBe(
      "/exam-levels/gateway"
    );
  });
});
