import {
  getPlatformSubmissionRoute,
  PLATFORM_SUBMISSION_PAGE_BY_GROUP,
} from "../platformSubmissionRoutes";

describe("getPlatformSubmissionRoute", () => {
  test("maps orange views to cambridge submissions routes", () => {
    expect(getPlatformSubmissionRoute("orange", "all")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.orange.all
    );
    expect(getPlatformSubmissionRoute("orange", "listening")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.orange.listening
    );
    expect(getPlatformSubmissionRoute("orange", "reading")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.orange.reading
    );
  });

  test("maps general views to fce submissions routes", () => {
    expect(getPlatformSubmissionRoute("general", "all")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.general.all
    );
    expect(getPlatformSubmissionRoute("general", "listening")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.general.listening
    );
    expect(getPlatformSubmissionRoute("general", "reading")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.general.reading
    );
  });

  test("falls back safely for unknown values", () => {
    expect(getPlatformSubmissionRoute("unknown", "all")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.orange.all
    );
    expect(getPlatformSubmissionRoute("general", "unsupported")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.general.all
    );
    expect(getPlatformSubmissionRoute("ORANGE", "LISTENING")).toBe(
      PLATFORM_SUBMISSION_PAGE_BY_GROUP.orange.listening
    );
  });
});
