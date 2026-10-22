export const PLATFORM_SUBMISSION_PAGE_BY_GROUP = Object.freeze({
  gateway: Object.freeze({
    all: "/admin/gateway-submissions",
    listening: "/admin/gateway-submissions?view=listening",
    reading: "/admin/gateway-submissions?view=reading",
  }),
  orange: Object.freeze({
    all: "/admin/cambridge-submissions",
    listening: "/admin/cambridge-submissions?view=listening",
    reading: "/admin/cambridge-submissions?view=reading",
  }),
  general: Object.freeze({
    all: "/admin/general-submissions",
    listening: "/admin/general-submissions?view=listening",
    reading: "/admin/general-submissions?view=reading",
  }),
});

const normalizeWorkspaceGroup = (value) => {
  const normalized = String(value || "orange").trim().toLowerCase();
  if (normalized === "gateway") return "gateway";
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

export const getSubmissionResultRoute = (testType, submissionId) => {
  const id = String(submissionId ?? "").trim();
  if (!id) return null;

  const normalizedTestType = String(testType || "").trim().toLowerCase();
  const encodedId = encodeURIComponent(id);
  if (normalizedTestType.startsWith("gateway-")) {
    return `/gateway/result/${encodedId}`;
  }
  if (normalizedTestType === "general-reading-60") {
    return `/general/result/${encodedId}`;
  }
  return `/cambridge/result/${encodedId}`;
};
