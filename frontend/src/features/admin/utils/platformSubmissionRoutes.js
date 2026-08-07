export const PLATFORM_SUBMISSION_PAGE_BY_GROUP = Object.freeze({
  orange: Object.freeze({
    all: "/admin/cambridge-submissions",
    listening: "/admin/cambridge-submissions?view=listening",
    reading: "/admin/cambridge-submissions?view=reading",
  }),
  general: Object.freeze({
    all: "/admin/fce-submissions",
    listening: "/admin/fce-submissions?view=listening",
    reading: "/admin/fce-submissions?view=reading",
  }),
});

const normalizeWorkspaceGroup = (value) => {
  const normalized = String(value || "orange").trim().toLowerCase();
  return normalized === "general" ? "general" : "orange";
};

const normalizeSubmissionView = (value) => {
  const normalized = String(value || "all").trim().toLowerCase();
  return ["all", "listening", "reading"].includes(normalized)
    ? normalized
    : "all";
};

export const getPlatformSubmissionRoute = (groupKey = "orange", tabKey = "all") => {
  const normalizedGroup = normalizeWorkspaceGroup(groupKey);
  const normalizedView = normalizeSubmissionView(tabKey);
  const groupMap = PLATFORM_SUBMISSION_PAGE_BY_GROUP[normalizedGroup];
  return groupMap[normalizedView] || groupMap.all;
};
