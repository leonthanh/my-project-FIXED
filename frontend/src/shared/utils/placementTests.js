export const PLACEMENT_LEAD_DRAFT_STORAGE_KEY = "placement-test:lead:v2";

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const normalizeText = (value) => String(value ?? "").trim();

const appendSearchParams = (path, params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    const normalized = normalizeText(value);
    if (!normalized) return;
    searchParams.set(key, normalized);
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

export const buildPlacementSelectionKey = ({ platform, skill, testId, testType }) => {
  return [
    normalizeText(platform).toLowerCase(),
    normalizeText(skill).toLowerCase(),
    normalizeText(testType).toLowerCase() || "generic",
    normalizeText(testId),
  ].join(":");
};

export const createPlacementSelection = ({
  platform,
  skill,
  testId,
  testType = "",
  title,
  subtitle = "",
  badge = "",
  questionsLabel = "",
  durationLabel = "",
}) => {
  const normalizedPlatform = normalizeText(platform).toLowerCase();
  const normalizedSkill = normalizeText(skill).toLowerCase();
  const normalizedTestId = normalizeText(testId);

  return {
    key: buildPlacementSelectionKey({
      platform: normalizedPlatform,
      skill: normalizedSkill,
      testId: normalizedTestId,
      testType,
    }),
    platform: normalizedPlatform,
    skill: normalizedSkill,
    testId: normalizedTestId,
    testType: normalizeText(testType).toLowerCase(),
    title: normalizeText(title),
    subtitle: normalizeText(subtitle),
    badge: normalizeText(badge),
    questionsLabel: normalizeText(questionsLabel),
    durationLabel: normalizeText(durationLabel),
  };
};

export const normalizePlacementSelections = (items) => {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const normalized = createPlacementSelection(item || {});
      if (!normalized.key || !normalized.title) return null;
      if (seen.has(normalized.key)) return null;
      seen.add(normalized.key);
      return {
        ...normalized,
        id: item?.id ?? null,
      };
    })
    .filter(Boolean);
};

export const isPlacementEligible = ({ platform, skill, testType }) => {
  const normalizedPlatform = normalizeText(platform).toLowerCase();
  const normalizedSkill = normalizeText(skill).toLowerCase();
  const normalizedTestType = normalizeText(testType).toLowerCase();

  if (normalizedPlatform === "ix") {
    return (
      normalizedSkill === "writing" ||
      normalizedSkill === "reading" ||
      normalizedSkill === "listening"
    );
  }

  if (normalizedPlatform === "orange") {
    if (!(normalizedSkill === "reading" || normalizedSkill === "listening")) {
      return false;
    }
    return normalizedTestType !== "pet-writing";
  }

  return false;
};

export const readPlacementLeadDraft = () => {
  if (!canUseStorage()) return { name: "", phone: "" };
  return safeJsonParse(
    window.localStorage.getItem(PLACEMENT_LEAD_DRAFT_STORAGE_KEY),
    { name: "", phone: "" }
  );
};

export const savePlacementLeadDraft = (draft) => {
  const nextDraft = {
    name: normalizeText(draft?.name),
    phone: normalizeText(draft?.phone),
  };
  if (canUseStorage()) {
    window.localStorage.setItem(
      PLACEMENT_LEAD_DRAFT_STORAGE_KEY,
      JSON.stringify(nextDraft)
    );
  }
  return nextDraft;
};

export const getPlacementItemSummaryCounts = (items) => {
  return (Array.isArray(items) ? items : []).reduce(
    (acc, item) => {
      if (item?.platform === "ix") acc.ix += 1;
      if (item?.platform === "orange") acc.orange += 1;
      if (item?.skill === "writing") acc.writing += 1;
      if (item?.skill === "reading") acc.reading += 1;
      if (item?.skill === "listening") acc.listening += 1;
      if (item?.status === "started") acc.started += 1;
      if (item?.status === "submitted") acc.submitted += 1;
      acc.total += 1;
      return acc;
    },
    {
      ix: 0,
      orange: 0,
      writing: 0,
      reading: 0,
      listening: 0,
      started: 0,
      submitted: 0,
      total: 0,
    }
  );
};

export const buildPlacementSharePath = (shareToken) => {
  const normalizedShareToken = normalizeText(shareToken);
  return normalizedShareToken
    ? `/placement-test/${encodeURIComponent(normalizedShareToken)}`
    : "/placement-test";
};

export const buildPlacementShareUrl = (shareToken) => {
  const path = buildPlacementSharePath(shareToken);
  if (typeof window === "undefined" || !window.location?.origin) return path;
  return new URL(path, window.location.origin).toString();
};

export const buildPlacementAttemptPath = (attemptToken) => {
  const normalizedAttemptToken = normalizeText(attemptToken);
  return normalizedAttemptToken
    ? `/placement-attempt/${encodeURIComponent(normalizedAttemptToken)}`
    : "/placement-attempt";
};

export const buildPlacementAttemptItemRuntimePath = (item, attemptToken = "") => {
  const platform = normalizeText(item?.platform).toLowerCase();
  const skill = normalizeText(item?.skill).toLowerCase();
  const testId = encodeURIComponent(normalizeText(item?.testId));
  const normalizedTestType =
    normalizeText(item?.testType).toLowerCase() ||
    (skill === "listening" ? "ket-listening" : "ket-reading");

  if (!platform || !skill || !testId) {
    return buildPlacementAttemptPath(attemptToken);
  }

  let basePath = buildPlacementAttemptPath(attemptToken);

  if (platform === "ix" && skill === "writing") {
    basePath = `/placement/ix/writing/${testId}`;
  } else if (platform === "ix" && skill === "reading") {
    basePath = `/placement/ix/reading/${testId}`;
  } else if (platform === "ix" && skill === "listening") {
    basePath = `/placement/ix/listening/${testId}`;
  } else if (platform === "orange") {
    basePath = `/placement/orange/${encodeURIComponent(normalizedTestType)}/${testId}`;
  }

  return appendSearchParams(basePath, {
    attempt: attemptToken,
    attemptItem: item?.attemptItemToken,
  });
};

export const readPlacementRuntimeContext = ({ pathname = "", search = "" } = {}) => {
  const searchParams = new URLSearchParams(search || "");

  return {
    isPlacementRuntime: String(pathname || "").startsWith("/placement/"),
    placementAttemptToken: normalizeText(searchParams.get("attempt")),
    placementAttemptItemToken: normalizeText(searchParams.get("attemptItem")),
  };
};