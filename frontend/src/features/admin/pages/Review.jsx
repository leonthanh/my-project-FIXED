import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from "../components/AdminStickySidebarLayout";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath } from "../../../shared/utils/api";
import {
  buildCambridgeResponseFeedbackDraftMap,
  countMissingCambridgeResponseFeedback,
  getCambridgeResponseFeedbackText,
  hasResolvedSubmissionFeedback,
  upsertCambridgeResponseFeedback,
} from "../../../shared/utils/cambridgeFeedback";
import {
  ExpandableSubmissionList,
  SubmissionStatCards,
  getSubmissionTone,
} from "../components/SubmissionCardList";
import { getAttemptTimingMeta } from "../utils/attemptTiming";

const DEFAULT_REVIEW_FILTERS = {
  studentName: "",
  classCode: "",
  teacherName: "",
  reviewedBy: "",
  status: "pending",
};

const CAMBRIDGE_REVIEW_PAGE_SIZE = 200;

const cloneReviewFilters = (overrides = {}) => ({
  ...DEFAULT_REVIEW_FILTERS,
  ...overrides,
});

const getDefaultFiltersForTab = (tabKey) =>
  cloneReviewFilters(tabKey === "cambridge" ? { status: "" } : {});

const createInitialFiltersByTab = () => ({
  writing: getDefaultFiltersForTab("writing"),
  reading: getDefaultFiltersForTab("reading"),
  listening: getDefaultFiltersForTab("listening"),
  cambridge: getDefaultFiltersForTab("cambridge"),
});

const normalizeFilterValue = (value) => String(value ?? "").trim().toLowerCase();

const REVIEW_HUB_PAGE_BY_TAB = {
  writing: {
    path: "/admin/writing-submissions",
    label: "Writing submissions page",
  },
  reading: {
    path: "/admin/reading-submissions",
    label: "Reading submissions page",
  },
  listening: {
    path: "/admin/listening-submissions",
    label: "Listening submissions page",
  },
  cambridge: {
    path: "/admin/cambridge-submissions",
    label: "Orange submissions page",
  },
};

const REVIEW_TAB_TONES = {
  writing: {
    activeBackground: "linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)",
    activeBorder: "#7c3aed",
    softBackground: "#f5f3ff",
    softBorder: "#ddd6fe",
    softText: "#6d28d9",
    softBadgeBackground: "rgba(124, 58, 237, 0.12)",
  },
  reading: {
    activeBackground: "linear-gradient(135deg, #0f3f94 0%, #2563eb 100%)",
    activeBorder: "#0f3f94",
    softBackground: "#eff6ff",
    softBorder: "#bfdbfe",
    softText: "#1d4ed8",
    softBadgeBackground: "rgba(37, 99, 235, 0.12)",
  },
  listening: {
    activeBackground: "linear-gradient(135deg, #0f8c4b 0%, #22c55e 100%)",
    activeBorder: "#0f8c4b",
    softBackground: "#f0fdf4",
    softBorder: "#bbf7d0",
    softText: "#15803d",
    softBadgeBackground: "rgba(34, 197, 94, 0.14)",
  },
  cambridge: {
    activeBackground: "linear-gradient(135deg, #d45512 0%, #fb923c 100%)",
    activeBorder: "#d45512",
    softBackground: "#fff7ed",
    softBorder: "#fed7aa",
    softText: "#c2410c",
    softBadgeBackground: "rgba(251, 146, 60, 0.16)",
  },
};

const matchesFilterValue = (value, search) => {
  const query = normalizeFilterValue(search);
  return !query || normalizeFilterValue(value).includes(query);
};

const Review = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const teacher = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("writing");
  const [filtersByTab, setFiltersByTab] = useState(createInitialFiltersByTab);

  const [unreviewedWriting, setUnreviewedWriting] = useState([]);
  const [unreviewedPetWriting, setUnreviewedPetWriting] = useState([]);
  const [loadingWriting, setLoadingWriting] = useState(true);

  const [unreviewedReading, setUnreviewedReading] = useState([]);
  const [loadingReading, setLoadingReading] = useState(true);

  const [unreviewedListening, setUnreviewedListening] = useState([]);
  const [loadingListening, setLoadingListening] = useState(true);

  const [cambridgeSubmissions, setCambridgeSubmissions] = useState([]);
  const [loadingCambridge, setLoadingCambridge] = useState(true);
  const [cambridgeError, setCambridgeError] = useState(null);
  const [expandedCambridge, setExpandedCambridge] = useState(() => new Set());
  const [cambridgeDetailsById, setCambridgeDetailsById] = useState({});
  const [cambridgeLoadingDetailById, setCambridgeLoadingDetailById] = useState(
    {}
  );
  const [cambridgeFeedbackDraftById, setCambridgeFeedbackDraftById] = useState(
    {}
  );
  const [cambridgeAiLoadingById, setCambridgeAiLoadingById] = useState({});
  const [cambridgeSavingById, setCambridgeSavingById] = useState({});
  const [cambridgeStatusById, setCambridgeStatusById] = useState({});
  const [cambridgeResponseStatusByKey, setCambridgeResponseStatusByKey] = useState({});
  const [expandedQueueItems, setExpandedQueueItems] = useState(() => ({
    writing: new Set(),
    reading: new Set(),
    listening: new Set(),
  }));
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const hasFeedback = (submission) => hasResolvedSubmissionFeedback(submission);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsCompactLayout(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUnreviewedWriting = async () => {
      setLoadingWriting(true);
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();
        const filtered = Array.isArray(all) ? all : [];

        const petWriting = filtered.filter((sub) =>
          String(
            sub?.writing_test?.testType ||
              sub?.WritingTest?.testType ||
              sub?.testType ||
              ""
          )
            .toLowerCase()
            .includes("pet-writing")
        );

        const writingIelts = filtered.filter((sub) => !petWriting.includes(sub));
        setUnreviewedPetWriting(petWriting);
        setUnreviewedWriting(writingIelts);
      } catch (err) {
        console.error("Failed to load writing submissions:", err);
        setUnreviewedWriting([]);
        setUnreviewedPetWriting([]);
      } finally {
        setLoadingWriting(false);
      }
    };

    const fetchUnreviewedReading = async () => {
      setLoadingReading(true);
      try {
        const res = await fetch(apiPath("reading-submissions/admin/list"));
        if (!res.ok) {
          throw new Error("Could not load Reading submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data) ? data : [];
        setUnreviewedReading(submissions);
      } catch (err) {
        console.error("Failed to load reading submissions:", err);
        setUnreviewedReading([]);
      } finally {
        setLoadingReading(false);
      }
    };

    const fetchUnreviewedListening = async () => {
      setLoadingListening(true);
      try {
        const res = await fetch(apiPath("listening-submissions/admin/list"));
        if (!res.ok) {
          throw new Error("Could not load Listening submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data) ? data : [];
        setUnreviewedListening(submissions);
      } catch (err) {
        console.error("Failed to load listening submissions:", err);
        setUnreviewedListening([]);
      } finally {
        setLoadingListening(false);
      }
    };

    const fetchCambridgeSubmissions = async () => {
      try {
        setLoadingCambridge(true);
        setCambridgeError(null);
        const buildUrl = (page) =>
          apiPath(
            `cambridge/submissions?page=${page}&limit=${CAMBRIDGE_REVIEW_PAGE_SIZE}&includeActive=1`
          );

        const firstRes = await fetch(buildUrl(1));
        if (!firstRes.ok) {
          throw new Error("Could not load Orange submissions.");
        }

        const firstData = await firstRes.json();
        const firstPageSubmissions = Array.isArray(firstData?.submissions)
          ? firstData.submissions
          : Array.isArray(firstData)
          ? firstData
          : [];
        const totalPages = Math.max(
          1,
          Number(firstData?.pagination?.totalPages) || 1
        );

        const remainingPages =
          totalPages > 1
            ? await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(
                  async (page) => {
                    const res = await fetch(buildUrl(page));
                    if (!res.ok) {
                      throw new Error("Could not load Orange submissions.");
                    }

                    const data = await res.json();
                    return Array.isArray(data?.submissions)
                      ? data.submissions
                      : Array.isArray(data)
                      ? data
                      : [];
                  }
                )
              )
            : [];

        const submissionsById = new Map();
        [...firstPageSubmissions, ...remainingPages.flat()].forEach((submission) => {
          if (!submission?.id) return;
          submissionsById.set(String(submission.id), submission);
        });

        const submissions = Array.from(submissionsById.values()).sort((left, right) => {
          const leftTime = new Date(left?.submittedAt || left?.createdAt || 0).getTime();
          const rightTime = new Date(right?.submittedAt || right?.createdAt || 0).getTime();
          return rightTime - leftTime;
        });

        setCambridgeSubmissions(submissions);
      } catch (err) {
        console.error("Failed to load Cambridge submissions:", err);
        setCambridgeError(err.message);
        setCambridgeSubmissions([]);
      } finally {
        setLoadingCambridge(false);
      }
    };

    fetchUnreviewedWriting();
    fetchUnreviewedReading();
    fetchUnreviewedListening();
    fetchCambridgeSubmissions();
  }, []);

  const parseJsonIfString = (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const getPendingManualAnswers = (submissionDetail) => {
    const detailedResults = parseJsonIfString(submissionDetail?.detailedResults);
    if (!detailedResults || typeof detailedResults !== "object") return [];

    return Object.entries(detailedResults)
      .filter(([, result]) => result && typeof result === "object" && result.isCorrect === null)
      .map(([key, result], index) => ({
        key,
        label: `Response ${index + 1}`,
        prompt:
          typeof result.questionText === "string" ? result.questionText.trim() : "",
        userAnswer:
          typeof result.userAnswer === "string" ? result.userAnswer.trim() : "",
        questionType:
          typeof result.questionType === "string"
            ? result.questionType.trim()
            : "",
      }))
      .filter((item) => item.userAnswer.length > 0);
  };

  const getCambridgeFeedbackStateKey = (submissionId, responseKey) =>
    `${submissionId}:${responseKey}`;

  const getCambridgeRowKey = (source, submissionId) =>
    `${String(source || "cambridge")}:${String(submissionId || "")}`;

  const getCambridgeRowId = (row) =>
    getCambridgeRowKey(row?.source, row?.sub?.id);

  const mergedCambridgeRows = useMemo(() => {
    const petRows = unreviewedPetWriting.map((sub) => ({
      source: "pet-writing",
      sub,
      submittedAt: sub.submittedAt || sub.createdAt || 0,
    }));

    const cambridgeRows = cambridgeSubmissions.map((sub) => ({
      source: "cambridge",
      sub,
      submittedAt: sub.submittedAt || 0,
    }));

    return [...petRows, ...cambridgeRows].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [unreviewedPetWriting, cambridgeSubmissions]);

  const handleToggleCambridgeDetail = async (row) => {
    const rowId = getCambridgeRowId(row);
    const submissionId = row?.sub?.id;

    setExpandedCambridge((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });

    if (row?.source !== "cambridge" || !submissionId) {
      return;
    }

    if (
      cambridgeDetailsById[submissionId] ||
      cambridgeLoadingDetailById[submissionId]
    ) {
      return;
    }

    try {
      setCambridgeLoadingDetailById((prev) => ({
        ...prev,
        [submissionId]: true,
      }));

      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`));
      if (!res.ok) {
        throw new Error("Could not load submission details.");
      }

      const detail = await res.json();
      setCambridgeDetailsById((prev) => ({ ...prev, [submissionId]: detail }));
      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]: prev[submissionId] || buildCambridgeResponseFeedbackDraftMap(detail?.responseFeedback),
      }));
    } catch (err) {
      console.error("Failed to load Cambridge submission detail:", err);
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submissionId]: err.message || "Could not load submission details.",
      }));
    } finally {
      setCambridgeLoadingDetailById((prev) => ({
        ...prev,
        [submissionId]: false,
      }));
    }
  };

  const handleGenerateCambridgeFeedback = async (submission, responseItem) => {
    const detail = cambridgeDetailsById[submission.id];
    const stateKey = getCambridgeFeedbackStateKey(submission.id, responseItem.key);

    if (!responseItem?.userAnswer?.trim()) {
      alert("No open-ended responses were found for AI feedback.");
      return;
    }

    try {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [stateKey]: true }));
      setCambridgeResponseStatusByKey((prev) => ({ ...prev, [stateKey]: "" }));

      const res = await fetch(apiPath("ai/generate-cambridge-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: submission.studentName || "N/A",
          testType: submission.testType || "Orange",
          classCode: submission.classCode || "",
          responses: [
            {
              label: responseItem.label,
              prompt: responseItem.prompt,
              answer: responseItem.userAnswer,
              questionType: responseItem.questionType,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI could not generate Orange feedback.");
      }

      if (!data?.suggestion) {
        throw new Error("AI returned an empty Orange feedback result.");
      }

      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submission.id]: {
          ...(prev[submission.id] || {}),
          [responseItem.key]: data.suggestion,
        },
      }));
      setCambridgeResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: data.warning
          ? data.warning
          : data.cached
          ? `${responseItem.label || 'Response'} loaded cached AI feedback.`
          : `${responseItem.label || 'Response'} AI feedback generated.`,
      }));
    } catch (err) {
      console.error("Failed to generate Cambridge AI feedback:", err);
      setCambridgeResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: err.message || "AI feedback failed.",
      }));
      alert(err.message || "AI feedback failed.");
    } finally {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleSaveCambridgeFeedback = async (submissionId, responseItem) => {
    const stateKey = getCambridgeFeedbackStateKey(submissionId, responseItem.key);
    const feedback = String(
      cambridgeFeedbackDraftById[submissionId]?.[responseItem.key] || ""
    ).trim();
    if (!feedback) return;

    const detail = cambridgeDetailsById[submissionId];
    const submission = cambridgeSubmissions.find((item) => item.id === submissionId);
    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];
    const existingResponseFeedback = getCambridgeResponseFeedbackText(
      detail?.responseFeedback || submission?.responseFeedback,
      responseItem.key
    );
    const reviewerName =
      teacher?.name || teacher?.username || teacher?.fullName || "Teacher";

    try {
      setCambridgeSavingById((prev) => ({ ...prev, [stateKey]: true }));

      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackBy: reviewerName,
          responseFeedbackPatch: {
            key: responseItem.key,
            label: responseItem.label,
            prompt: responseItem.prompt,
            questionType: responseItem.questionType,
            feedback,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Could not save feedback.");
      }

      const payload = await res.json().catch(() => ({}));
      const savedSubmission = payload?.submission || {};
      const nextResponseFeedback =
        savedSubmission.responseFeedback ||
        upsertCambridgeResponseFeedback({
          existingValue: detail?.responseFeedback || submission?.responseFeedback,
          responseKey: responseItem.key,
          feedback,
          feedbackBy: reviewerName,
          feedbackAt: savedSubmission.feedbackAt || new Date().toISOString(),
          label: responseItem.label,
          prompt: responseItem.prompt,
          questionType: responseItem.questionType,
        });
      const hasLegacyOverallFeedback = Boolean(
        String(savedSubmission.feedback || detail?.feedback || submission?.feedback || "").trim()
      );
      const nextPendingManualCount = hasLegacyOverallFeedback
        ? 0
        : countMissingCambridgeResponseFeedback(pendingAnswers, nextResponseFeedback);
      const nextStatus = hasLegacyOverallFeedback || nextPendingManualCount === 0
        ? "reviewed"
        : "submitted";
      const savedFeedbackAt =
        savedSubmission.feedbackAt || new Date().toISOString();

      setCambridgeSubmissions((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                responseFeedback: nextResponseFeedback,
                feedback: savedSubmission.feedback ?? item.feedback,
                feedbackBy: nextStatus === "reviewed" ? reviewerName : item.feedbackBy,
                feedbackAt: nextStatus === "reviewed" ? savedFeedbackAt : item.feedbackAt,
                status: savedSubmission.status || nextStatus,
                pendingManualCount: nextPendingManualCount,
              }
            : item
        )
      );
      setCambridgeDetailsById((prev) => ({
        ...prev,
        [submissionId]: prev[submissionId]
          ? {
              ...prev[submissionId],
              responseFeedback: nextResponseFeedback,
              feedback: savedSubmission.feedback ?? prev[submissionId].feedback,
              feedbackBy:
                savedSubmission.status === "reviewed" || nextStatus === "reviewed"
                  ? reviewerName
                  : prev[submissionId].feedbackBy,
              feedbackAt:
                savedSubmission.status === "reviewed" || nextStatus === "reviewed"
                  ? savedFeedbackAt
                  : prev[submissionId].feedbackAt,
              status: savedSubmission.status || nextStatus,
            }
          : prev[submissionId],
      }));
      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]: {
          ...(prev[submissionId] || {}),
          [responseItem.key]: feedback,
        },
      }));
      setCambridgeResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: existingResponseFeedback
          ? `${responseItem.label || 'Response'} updated.`
          : nextPendingManualCount === 0
          ? `${responseItem.label || 'Response'} saved. Submission marked reviewed.`
          : `${responseItem.label || 'Response'} saved. ${nextPendingManualCount} response(s) still pending.`,
      }));
    } catch (err) {
      console.error("Failed to save Cambridge feedback:", err);
      setCambridgeResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: err.message || "Could not save feedback.",
      }));
      alert(err.message || "Could not save feedback.");
    } finally {
      setCambridgeSavingById((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const formatDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("en-GB");
  };

  const getReviewStatus = (submission) => {
    const explicitStatus = normalizeFilterValue(submission?.status);
    if (explicitStatus === "reviewed" || explicitStatus === "done") {
      return "done";
    }

    if (hasFeedback(submission) || normalizeFilterValue(submission?.feedbackBy)) {
      return "done";
    }

    return "pending";
  };

  const getSubmissionStudentName = (submission) =>
    submission?.studentName ||
    submission?.userName ||
    submission?.user?.name ||
    submission?.User?.name ||
    "N/A";

  const getSubmissionPhone = (submission) =>
    submission?.studentPhone ||
    submission?.userPhone ||
    submission?.user?.phone ||
    submission?.User?.phone ||
    "N/A";

  const getReadingTestLabel = (submission) => {
    const test = submission?.ReadingTest || {};
    return [test.title || `Reading #${submission?.testId || "N/A"}`, test.classCode || "", test.teacherName || ""]
      .filter(Boolean)
      .join(" - ");
  };

  const getListeningTestLabel = (submission) => {
    const test = submission?.ListeningTest || {};
    return [test.title || `Listening #${submission?.testId || "N/A"}`, test.classCode || "", test.teacherName || ""]
      .filter(Boolean)
      .join(" - ");
  };

  const toggleQueueItem = (tabKey, itemId) => {
    setExpandedQueueItems((prev) => {
      const nextTabItems = new Set(prev[tabKey] || []);
      if (nextTabItems.has(itemId)) {
        nextTabItems.delete(itemId);
      } else {
        nextTabItems.add(itemId);
      }

      return {
        ...prev,
        [tabKey]: nextTabItems,
      };
    });
  };

  const getWritingTestTitle = (submission) => {
    const test = submission?.writing_test || submission?.WritingTest || {};
    const testType = String(test?.testType || submission?.testType || "").toLowerCase();
    if (testType.includes("pet-writing")) return "PET Writing";
    if (test?.index != null && String(test.index).trim()) {
      return `Writing ${test.index}`;
    }
    return "Writing";
  };

  const getWritingTestLabel = (submission) => {
    const test = submission?.writing_test || submission?.WritingTest || {};
    return [
      getWritingTestTitle(submission),
      test?.classCode || null,
      test?.teacherName || null,
    ]
      .filter(Boolean)
      .join(" - ");
  };

  const getQueueToneVariant = (submission) => {
    if (submission?.finished === false) return "active";
    return getReviewStatus(submission) === "done" ? "reviewed" : "pending";
  };

  const getQueueStatusLabel = (submission) => {
    if (submission?.finished === false) return "Active";
    return getReviewStatus(submission) === "done" ? "Reviewed" : "Pending";
  };

  const getObjectiveScoreSummary = (submission) => {
    const correctCount = Number(submission?.correct);
    const totalCount = Number(submission?.total);
    const scorePercentage = Number(submission?.scorePercentage);

    if (Number.isFinite(correctCount) && Number.isFinite(totalCount) && totalCount > 0) {
      const resolvedPercentage = Number.isFinite(scorePercentage)
        ? scorePercentage
        : Math.round((correctCount / totalCount) * 100);
      return `${correctCount}/${totalCount} (${resolvedPercentage}%)`;
    }

    if (Number.isFinite(scorePercentage)) {
      return `${scorePercentage}%`;
    }

    return null;
  };

  const getCambridgeScoreSummary = (submission) => {
    if (submission?.finished === false) return "In Progress";

    const score = Number(submission?.score);
    const totalQuestions = Number(submission?.totalQuestions);
    const percentage = Number(submission?.percentage);

    if (Number.isFinite(score) && Number.isFinite(totalQuestions) && totalQuestions > 0) {
      const resolvedPercentage = Number.isFinite(percentage)
        ? percentage
        : Math.round((score / totalQuestions) * 100);
      return `${score}/${totalQuestions} (${resolvedPercentage}%)`;
    }

    return null;
  };

  const renderStatGrid = (stats, tone) => {
    const safeStats = Array.isArray(stats) ? stats.filter(Boolean) : [];
    if (!safeStats.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        {safeStats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: tone.panelBg,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${tone.panelBorder}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color || tone.primaryText }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: tone.mutedText }}>{stat.label}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderInfoGrid = (entries, tone, minWidth = 150) => {
    const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (!safeEntries.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
          gap: 12,
          marginTop: 14,
        }}
      >
        {safeEntries.map((entry) => {
          const displayValue =
            entry.value || entry.value === 0 ? entry.value : entry.fallback || "N/A";

          return (
            <div
              key={entry.label}
              style={{
                background: tone.panelBg,
                borderRadius: 8,
                padding: 12,
                border: `1px solid ${tone.panelBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: tone.subtleText,
                  marginBottom: 6,
                }}
              >
                {entry.label}
              </div>
              <div style={{ fontSize: 14, color: tone.primaryText, lineHeight: 1.45 }}>
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFeedbackPreview = (feedback, tone, label = "Feedback") => {
    const text = String(feedback || "").trim();
    if (!text) return null;

    return (
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 8,
          background: tone.panelBg,
          border: `1px solid ${tone.panelBorder}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: tone.subtleText,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ color: tone.primaryText, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {text}
        </div>
      </div>
    );
  };

  const renderWritingExpandedContent = (submission, tone) => {
    const test = submission?.writing_test || submission?.WritingTest || {};

    return (
      <>
        {renderInfoGrid(
          [
            { label: "Student", value: getSubmissionStudentName(submission) },
            { label: "Phone", value: getSubmissionPhone(submission) },
            { label: "Test", value: getWritingTestTitle(submission) },
            { label: "Class Code", value: test?.classCode },
            { label: "Teacher", value: test?.teacherName },
            {
              label: "Submitted",
              value: formatDateTime(submission?.submittedAt || submission?.createdAt),
            },
            {
              label: "Reviewed By",
              value: submission?.feedbackBy,
              fallback: getQueueStatusLabel(submission),
            },
          ],
          tone,
          160
        )}

        {renderFeedbackPreview(submission?.feedback, tone, "Existing feedback")}

        <div style={expandedActionRowStyle}>
          <button
            onClick={() => navigate(`/review/${submission.id}`)}
            style={primaryButtonStyle}
          >
            Open Review
          </button>
        </div>
      </>
    );
  };

  const renderObjectiveExpandedContent = (submission, tone, buildTestLabel, onReview) => {
    const test = submission?.ReadingTest || submission?.ListeningTest || {};
    const correctCount = Number(submission?.correct);
    const totalCount = Number(submission?.total);
    const scorePercentage = Number(submission?.scorePercentage);
    const timingMeta = submission?.finished === false ? getAttemptTimingMeta(submission?.expiresAt) : null;

    return (
      <>
        {submission?.finished === false && timingMeta && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 8,
              background: tone.calloutBg,
              border: `1px solid ${tone.calloutBorder}`,
              color: tone.calloutText,
            }}
          >
            This attempt is still open. Last saved at {formatDateTime(
              submission?.lastSavedAt || submission?.updatedAt || submission?.createdAt
            )}.
            <div style={{ marginTop: 6, fontWeight: 700, color: timingMeta.color }}>
              {timingMeta.label}
            </div>
          </div>
        )}

        {renderStatGrid(
          Number.isFinite(correctCount) && Number.isFinite(totalCount) && totalCount > 0
            ? [
                { label: "Correct", value: correctCount, color: "#1d4ed8" },
                { label: "Questions", value: totalCount, color: "#1d4ed8" },
                {
                  label: "Accuracy",
                  value: `${Number.isFinite(scorePercentage) ? scorePercentage : Math.round((correctCount / totalCount) * 100)}%`,
                  color:
                    (Number.isFinite(scorePercentage) ? scorePercentage : Math.round((correctCount / totalCount) * 100)) >= 70
                      ? "#16a34a"
                      : (Number.isFinite(scorePercentage)
                          ? scorePercentage
                          : Math.round((correctCount / totalCount) * 100)) >= 50
                      ? "#ca8a04"
                      : "#dc2626",
                },
                submission?.band != null
                  ? {
                      label: "Band",
                      value: Number.isFinite(Number(submission.band))
                        ? Number(submission.band).toFixed(1)
                        : submission.band,
                    }
                  : null,
              ]
            : [],
          tone
        )}

        {renderInfoGrid(
          [
            { label: "Student", value: getSubmissionStudentName(submission) },
            { label: "Phone", value: getSubmissionPhone(submission) },
            { label: "Test", value: buildTestLabel(submission) },
            { label: "Class Code", value: test?.classCode },
            { label: "Teacher", value: test?.teacherName },
            {
              label: "Submitted",
              value: formatDateTime(submission?.submittedAt || submission?.createdAt),
            },
            {
              label: "Reviewed By",
              value: submission?.feedbackBy,
              fallback: getQueueStatusLabel(submission),
            },
          ],
          tone,
          160
        )}

        {renderFeedbackPreview(submission?.feedback, tone, "Feedback")}

        <div style={expandedActionRowStyle}>
          <button onClick={() => onReview(submission)} style={primaryButtonStyle}>
            Open Result
          </button>
        </div>
      </>
    );
  };

  const renderCambridgeRowExpandedContent = (row, tone) => {
    if (row?.source === "pet-writing") {
      return renderWritingExpandedContent(row.sub, tone);
    }

    const submission = row?.sub || {};
    const detail = cambridgeDetailsById[submission.id];
    const isLoadingDetail = !!cambridgeLoadingDetailById[submission.id];
    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];
    const timingMeta = submission?.finished === false ? getAttemptTimingMeta(submission?.expiresAt) : null;
    const score = Number(submission?.score);
    const totalQuestions = Number(submission?.totalQuestions);
    const resolvedPercentage = Number.isFinite(Number(submission?.percentage))
      ? Number(submission.percentage)
      : Number.isFinite(score) && Number.isFinite(totalQuestions) && totalQuestions > 0
      ? Math.round((score / totalQuestions) * 100)
      : null;

    return (
      <>
        {submission?.finished === false && timingMeta && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 8,
              background: tone.calloutBg,
              border: `1px solid ${tone.calloutBorder}`,
              color: tone.calloutText,
            }}
          >
            This Orange attempt is still active. Last saved at {formatDateTime(
              submission?.lastSavedAt || submission?.createdAt
            )}.
            <div style={{ marginTop: 6, fontWeight: 700, color: timingMeta.color }}>
              {timingMeta.label}
            </div>
          </div>
        )}

        {renderStatGrid(
          Number.isFinite(score) && Number.isFinite(totalQuestions) && totalQuestions > 0
            ? [
                { label: "Score", value: score, color: "#1d4ed8" },
                { label: "Questions", value: totalQuestions, color: "#1d4ed8" },
                {
                  label: "Accuracy",
                  value: `${resolvedPercentage}%`,
                  color:
                    resolvedPercentage >= 70
                      ? "#16a34a"
                      : resolvedPercentage >= 50
                      ? "#ca8a04"
                      : "#dc2626",
                },
                {
                  label: "Essay items",
                  value: pendingAnswers.length,
                  color: pendingAnswers.length ? "#c2410c" : tone.primaryText,
                },
              ]
            : [
                {
                  label: "Essay items",
                  value: pendingAnswers.length,
                  color: pendingAnswers.length ? "#c2410c" : tone.primaryText,
                },
              ],
          tone
        )}

        {renderInfoGrid(
          [
            { label: "Type", value: submission?.testType || "Orange" },
            { label: "Student", value: submission?.studentName },
            { label: "Phone", value: submission?.studentPhone },
            { label: "Class Code", value: submission?.classCode },
            { label: "Teacher", value: submission?.teacherName },
            {
              label: "Submitted",
              value: formatDateTime(submission?.submittedAt || submission?.createdAt),
            },
            {
              label: "Reviewed By",
              value: submission?.feedbackBy,
              fallback: getQueueStatusLabel(submission),
            },
          ],
          tone,
          160
        )}

        <div style={expandedActionRowStyle}>
          <button
            onClick={() => navigate(`/cambridge/result/${submission.id}`)}
            style={secondaryButtonStyle}
          >
            View Result
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {renderCambridgeExpandedContent(
            submission,
            detail,
            pendingAnswers,
            isLoadingDetail
          )}
        </div>
      </>
    );
  };

  const getWritingFilterMeta = (submission) => {
    const test = submission?.writing_test || submission?.WritingTest || {};
    return {
      studentName: submission?.userName || submission?.user?.name || submission?.User?.name || "",
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getReadingFilterMeta = (submission) => {
    const test = submission?.ReadingTest || {};
    return {
      studentName: getSubmissionStudentName(submission),
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getListeningFilterMeta = (submission) => {
    const test = submission?.ListeningTest || {};
    return {
      studentName: getSubmissionStudentName(submission),
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getCambridgeFilterMeta = (row) => {
    if (row?.source === "pet-writing") {
      const sub = row?.sub || {};
      const test = sub?.writing_test || sub?.WritingTest || {};

      return {
        studentName: sub?.userName || sub?.user?.name || sub?.User?.name || "",
        classCode: test?.classCode || "",
        teacherName: test?.teacherName || "",
        reviewedBy: sub?.feedbackBy || "",
        status: getReviewStatus(sub),
      };
    }

    const sub = row?.sub || {};
    return {
      studentName: sub?.studentName || sub?.userName || "",
      classCode: sub?.classCode || "",
      teacherName: sub?.teacherName || "",
      reviewedBy: sub?.feedbackBy || "",
      status: getReviewStatus(sub),
    };
  };

  const applyQueueFilters = (items, filters, getMeta) =>
    items.filter((item) => {
      const meta = getMeta(item);

      if (!matchesFilterValue(meta.studentName, filters.studentName)) return false;
      if (!matchesFilterValue(meta.classCode, filters.classCode)) return false;
      if (!matchesFilterValue(meta.teacherName, filters.teacherName)) return false;
      if (!matchesFilterValue(meta.reviewedBy, filters.reviewedBy)) return false;
      if (filters.status === "pending" && meta.status !== "pending") return false;
      if (filters.status === "done" && meta.status !== "done") return false;

      return true;
    });

  const countPendingItems = (items, getMeta) =>
    items.reduce(
      (count, item) => count + (getMeta(item).status === "pending" ? 1 : 0),
      0
    );

  const filteredWriting = applyQueueFilters(
    unreviewedWriting,
    filtersByTab.writing,
    getWritingFilterMeta
  );
  const filteredReading = applyQueueFilters(
    unreviewedReading,
    filtersByTab.reading,
    getReadingFilterMeta
  );
  const filteredListening = applyQueueFilters(
    unreviewedListening,
    filtersByTab.listening,
    getListeningFilterMeta
  );
  const filteredCambridgeRows = applyQueueFilters(
    mergedCambridgeRows,
    filtersByTab.cambridge,
    getCambridgeFilterMeta
  );

  const writingNeedsReviewCount = countPendingItems(
    unreviewedWriting,
    getWritingFilterMeta
  );
  const readingNeedsReviewCount = countPendingItems(
    unreviewedReading,
    getReadingFilterMeta
  );
  const listeningNeedsReviewCount = countPendingItems(
    unreviewedListening,
    getListeningFilterMeta
  );
  const cambridgeNeedsReviewCount = countPendingItems(
    mergedCambridgeRows,
    getCambridgeFilterMeta
  );
  const reviewTabs = [
    {
      key: "writing",
      shortLabel: "Writing",
      label: "Writing Review Queue",
      tone: "writing",
      badge: writingNeedsReviewCount,
    },
    {
      key: "reading",
      shortLabel: "Reading",
      label: "Reading Review Queue",
      tone: "reading",
      badge: readingNeedsReviewCount,
    },
    {
      key: "listening",
      shortLabel: "Listening",
      label: "Listening Review Queue",
      tone: "listening",
      badge: listeningNeedsReviewCount,
    },
    {
      key: "cambridge",
      shortLabel: "Orange",
      label: "Orange Review Queue",
      tone: "cambridge",
      badge: cambridgeNeedsReviewCount,
    },
  ];

  const activeFilters = filtersByTab[activeTab] || getDefaultFiltersForTab(activeTab);
  const activeTotalCount =
    activeTab === "writing"
      ? unreviewedWriting.length
      : activeTab === "reading"
      ? unreviewedReading.length
      : activeTab === "listening"
      ? unreviewedListening.length
      : mergedCambridgeRows.length;
  const activeFilteredCount =
    activeTab === "writing"
      ? filteredWriting.length
      : activeTab === "reading"
      ? filteredReading.length
      : activeTab === "listening"
      ? filteredListening.length
      : filteredCambridgeRows.length;
  const activePendingCount =
    activeTab === "writing"
      ? writingNeedsReviewCount
      : activeTab === "reading"
      ? readingNeedsReviewCount
      : activeTab === "listening"
      ? listeningNeedsReviewCount
      : cambridgeNeedsReviewCount;
  const activeReviewedCount = Math.max(activeTotalCount - activePendingCount, 0);
  const activeQueueHint =
    activeTab === "writing"
      ? "Click a row to open the writing review page."
      : activeTab === "cambridge"
      ? "Click a row to review Orange details, feedback, and result actions."
      : "Click a row to view the score summary, feedback, and actions.";
  const activeReviewTab =
    reviewTabs.find((tab) => tab.key === activeTab) || reviewTabs[0];
  const activeReviewPageTarget =
    REVIEW_HUB_PAGE_BY_TAB[activeTab] || REVIEW_HUB_PAGE_BY_TAB.writing;
  const workspaceLinks = useMemo(
    () => buildAdminWorkspaceLinks(navigate, "review"),
    [navigate]
  );
  const sidebarStats = useMemo(
    () => [
      {
        key: "total",
        label: "Total",
        value: activeTotalCount,
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
      },
      {
        key: "pending",
        label: "Pending",
        value: activePendingCount,
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#92400e",
      },
      {
        key: "reviewed",
        label: "Reviewed",
        value: activeReviewedCount,
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#166534",
      },
      {
        key: "visible",
        label: "Visible",
        value: activeFilteredCount,
        bg: "#f5f3ff",
        border: "#ddd6fe",
        color: "#6d28d9",
      },
    ],
    [activeFilteredCount, activePendingCount, activeReviewedCount, activeTotalCount]
  );

  const updateTabFilter = (tabKey, field, value) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: {
        ...(prev[tabKey] || getDefaultFiltersForTab(tabKey)),
        [field]: value,
      },
    }));
  };

  const resetTabFilters = (tabKey) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: getDefaultFiltersForTab(tabKey),
    }));
  };

  const renderCambridgeExpandedContent = (
    sub,
    detail,
    pendingAnswers,
    isLoadingDetail
  ) => {
    const legacyFeedback = String(detail?.feedback || sub?.feedback || "").trim();
    const responseDrafts = cambridgeFeedbackDraftById[sub.id] || {};

    return (
    <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
      {isLoadingDetail && <div>Loading submission details...</div>}

      {!isLoadingDetail && !detail && cambridgeStatusById[sub.id] && (
        <div
          style={{
            color: isDarkMode ? "#93c5fd" : "#1d4ed8",
            fontSize: 13,
          }}
        >
          {cambridgeStatusById[sub.id]}
        </div>
      )}

      {!isLoadingDetail && detail && (
        <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
          <div style={{ display: "grid", gap: isCompactLayout ? 6 : 8 }}>
            <div style={{ fontWeight: 700 }}>Open-ended responses to review</div>

            {pendingAnswers.length === 0 ? (
              <div
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                No pending open-ended responses were found in this submission. You can still
                open the full result to inspect it manually.
              </div>
            ) : (
              <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
                {pendingAnswers.map((item, answerIndex) => (
                  <div key={item.key} style={answerBoxStyle(isDarkMode, isCompactLayout)}>
                    <div style={{ fontWeight: 700 }}>
                      {item.label || `Response ${answerIndex + 1}`}
                    </div>
                    {item.prompt && (
                      <div
                        style={{
                          marginTop: 6,
                          marginBottom: 8,
                          color: isDarkMode ? "#cbd5e1" : "#4b5563",
                          fontSize: 13,
                        }}
                      >
                        Prompt: {item.prompt}
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>{item.userAnswer}</div>

                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Feedback for {item.label || `Response ${answerIndex + 1}`}
                      </div>
                      <textarea
                        rows={4}
                        value={responseDrafts[item.key] || ""}
                        onChange={(e) =>
                          setCambridgeFeedbackDraftById((prev) => ({
                            ...prev,
                            [sub.id]: {
                              ...(prev[sub.id] || {}),
                              [item.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={`Enter feedback for ${item.label || `response ${answerIndex + 1}`}...`}
                        style={{
                          width: "100%",
                          padding: isCompactLayout ? 9 : 10,
                          border: `1px solid ${isDarkMode ? "#2a3350" : "#d1d5db"}`,
                          borderRadius: 8,
                          fontSize: 14,
                          background: isDarkMode ? "#0f172a" : "#fff",
                          color: isDarkMode ? "#e5e7eb" : "#111827",
                          boxSizing: "border-box",
                        }}
                      />

                      <div style={feedbackActionRowStyle(isCompactLayout)}>
                        <button
                          onClick={() => handleGenerateCambridgeFeedback(sub, item)}
                          style={
                            isCompactLayout
                              ? { ...secondaryButtonStyle, width: "100%", padding: "10px 12px" }
                              : secondaryButtonStyle
                          }
                          disabled={
                            !item.userAnswer ||
                            cambridgeAiLoadingById[
                              getCambridgeFeedbackStateKey(sub.id, item.key)
                            ] ||
                            cambridgeSavingById[
                              getCambridgeFeedbackStateKey(sub.id, item.key)
                            ]
                          }
                        >
                          {cambridgeAiLoadingById[
                            getCambridgeFeedbackStateKey(sub.id, item.key)
                          ]
                            ? "Generating..."
                            : "AI Feedback"}
                        </button>
                        <button
                          onClick={() => handleSaveCambridgeFeedback(sub.id, item)}
                          style={
                            isCompactLayout
                              ? { ...primaryButtonStyle, width: "100%", padding: "10px 12px" }
                              : primaryButtonStyle
                          }
                          disabled={
                            !(responseDrafts[item.key] || "").trim() ||
                            cambridgeSavingById[
                              getCambridgeFeedbackStateKey(sub.id, item.key)
                            ] ||
                            cambridgeAiLoadingById[
                              getCambridgeFeedbackStateKey(sub.id, item.key)
                            ]
                          }
                        >
                          {cambridgeSavingById[
                            getCambridgeFeedbackStateKey(sub.id, item.key)
                          ]
                            ? "Saving..."
                            : getCambridgeResponseFeedbackText(
                                detail?.responseFeedback || sub?.responseFeedback,
                                item.key
                              )
                            ? "Update Feedback"
                            : "Save Feedback"}
                        </button>
                      </div>

                      {cambridgeResponseStatusByKey[
                        getCambridgeFeedbackStateKey(sub.id, item.key)
                      ] && (
                        <div
                          style={{
                            color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                            fontSize: 13,
                          }}
                        >
                          {
                            cambridgeResponseStatusByKey[
                              getCambridgeFeedbackStateKey(sub.id, item.key)
                            ]
                          }
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {legacyFeedback && (
            <div style={{ display: "grid", gap: isCompactLayout ? 6 : 8, marginTop: isCompactLayout ? 2 : 6 }}>
              <div style={{ fontWeight: 700 }}>Existing overall feedback</div>
              <div
                style={{
                  padding: isCompactLayout ? 10 : 12,
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? "#2a3350" : "#d1d5db"}`,
                  background: isDarkMode ? "#0f172a" : "#fff",
                  whiteSpace: "pre-wrap",
                  color: isDarkMode ? "#e5e7eb" : "#111827",
                  lineHeight: 1.55,
                }}
              >
                {legacyFeedback}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
  };

  const renderFilterToolbar = (tabKey) => (
    <div style={filterPanelStyle(isDarkMode)}>
      <div style={filterGridStyle}>
        {[
          {
            key: "studentName",
            label: "Student Name",
            placeholder: "Student name",
          },
          {
            key: "classCode",
            label: "Class Code",
            placeholder: "e.g. 148-IX-3A-S1",
          },
          {
            key: "teacherName",
            label: "Test Teacher",
            placeholder: "Teacher name",
          },
          {
            key: "reviewedBy",
            label: "Reviewed By",
            placeholder: "Reviewer name",
          },
        ].map((field) => (
          <div key={field.key}>
            <label style={filterFieldLabelStyle(isDarkMode)}>{field.label}</label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={activeFilters[field.key] || ""}
              onChange={(e) => updateTabFilter(tabKey, field.key, e.target.value)}
              style={filterInputStyle(isDarkMode)}
            />
          </div>
        ))}

        <div>
          <label style={filterFieldLabelStyle(isDarkMode)}>Status</label>
          <select
            value={activeFilters.status || ""}
            onChange={(e) => updateTabFilter(tabKey, "status", e.target.value)}
            style={filterInputStyle(isDarkMode)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="done">Reviewed</option>
          </select>
        </div>

        <div style={{ alignSelf: "end" }}>
          <button
            onClick={() => resetTabFilters(tabKey)}
            style={filterResetButtonStyle}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );

  const renderQueueEmptyState = (message) => {
    const tone = getSubmissionTone("pending", isDarkMode);
    return <div style={emptyStateStyle(tone)}>{message}</div>;
  };

  const renderWritingQueue = () => {
    if (loadingWriting) return <p>Loading writing submissions...</p>;
    if (!filteredWriting.length) {
      return renderQueueEmptyState(
        unreviewedWriting.length === 0
          ? "No writing submissions found."
          : "No writing submissions match the current filters."
      );
    }

    return (
      <ExpandableSubmissionList
        items={filteredWriting}
        expandedItems={expandedQueueItems.writing}
        onToggle={(itemId) => toggleQueueItem("writing", itemId)}
        getTone={(submission) =>
          getSubmissionTone(getQueueToneVariant(submission), isDarkMode)
        }
        renderHeader={({ item: submission, index, tone }) => (
          <>
            <span style={{ fontSize: 12, color: tone.subtleText, minWidth: 28 }}>
              #{index + 1}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
                whiteSpace: "nowrap",
                background: tone.chipBg,
                color: tone.chipColor,
              }}
            >
              {getQueueStatusLabel(submission)}
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
              {getSubmissionStudentName(submission)}
            </span>
            <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
              {getSubmissionPhone(submission)}
            </span>
            <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
              {getWritingTestLabel(submission)}
            </span>
            <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
              {formatDateTime(submission?.submittedAt || submission?.createdAt)}
            </span>
          </>
        )}
        renderExpanded={({ item: submission, tone }) =>
          renderWritingExpandedContent(submission, tone)
        }
      />
    );
  };

  const renderObjectiveQueue = ({
    tabKey,
    items,
    allItems,
    loading,
    emptyAllMessage,
    emptyFilteredMessage,
    buildTestLabel,
    onReview,
  }) => {
    if (loading) {
      return <p>Loading {tabKey} submissions...</p>;
    }

    if (!items.length) {
      return renderQueueEmptyState(
        allItems.length === 0 ? emptyAllMessage : emptyFilteredMessage
      );
    }

    return (
      <ExpandableSubmissionList
        items={items}
        expandedItems={expandedQueueItems[tabKey]}
        onToggle={(itemId) => toggleQueueItem(tabKey, itemId)}
        getTone={(submission) =>
          getSubmissionTone(getQueueToneVariant(submission), isDarkMode)
        }
        renderHeader={({ item: submission, index, tone }) => {
          const scoreSummary = getObjectiveScoreSummary(submission);
          const timingMeta =
            submission?.finished === false
              ? getAttemptTimingMeta(submission?.expiresAt)
              : null;

          return (
            <>
              <span style={{ fontSize: 12, color: tone.subtleText, minWidth: 28 }}>
                #{index + 1}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                  background: tone.chipBg,
                  color: tone.chipColor,
                }}
              >
                {getQueueStatusLabel(submission)}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                {getSubmissionStudentName(submission)}
              </span>
              <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
                {getSubmissionPhone(submission)}
              </span>
              <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
                {buildTestLabel(submission)}
              </span>
              {scoreSummary && (
                <span style={scoreBadgeStyle(tone, submission?.finished === false ? "#1d4ed8" : tone.primaryText)}>
                  {scoreSummary}
                </span>
              )}
              <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
                {submission?.finished === false && timingMeta
                  ? `${timingMeta.label} • ${formatDateTime(
                      submission?.lastSavedAt || submission?.updatedAt || submission?.createdAt
                    )}`
                  : formatDateTime(submission?.submittedAt || submission?.createdAt)}
              </span>
            </>
          );
        }}
        renderExpanded={({ item: submission, tone }) =>
          renderObjectiveExpandedContent(submission, tone, buildTestLabel, onReview)
        }
      />
    );
  };

  const renderCambridgeQueue = () => {
    if (loadingWriting || loadingCambridge) {
      return (
        <>
          {loadingWriting && <p>Loading PET writing submissions...</p>}
          {loadingCambridge && <p>Loading Orange submissions...</p>}
        </>
      );
    }

    if (cambridgeError) {
      return <p style={{ color: "#dc2626" }}>{cambridgeError}</p>;
    }

    if (!filteredCambridgeRows.length) {
      return renderQueueEmptyState(
        mergedCambridgeRows.length === 0
          ? "No Orange submissions found."
          : "No Orange submissions match the current filters."
      );
    }

    return (
      <ExpandableSubmissionList
        items={filteredCambridgeRows}
        expandedItems={expandedCambridge}
        onToggle={(rowId) => {
          const row = filteredCambridgeRows.find(
            (entry) => getCambridgeRowId(entry) === rowId
          );
          if (row) {
            handleToggleCambridgeDetail(row);
          }
        }}
        getItemId={getCambridgeRowId}
        getTone={(row) =>
          getSubmissionTone(getQueueToneVariant(row?.sub), isDarkMode)
        }
        renderHeader={({ item: row, index, tone }) => {
          if (row?.source === "pet-writing") {
            const submission = row?.sub || {};
            return (
              <>
                <span style={{ fontSize: 12, color: tone.subtleText, minWidth: 28 }}>
                  #{index + 1}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    whiteSpace: "nowrap",
                    background: tone.chipBg,
                    color: tone.chipColor,
                  }}
                >
                  {getQueueStatusLabel(submission)}
                </span>
                <span style={typeBadgeStyle(isDarkMode)}>{getWritingTestTitle(submission)}</span>
                <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                  {getSubmissionStudentName(submission)}
                </span>
                <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
                  {getSubmissionPhone(submission)}
                </span>
                <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
                  {getWritingTestLabel(submission)}
                </span>
                <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
                  {formatDateTime(submission?.submittedAt || submission?.createdAt)}
                </span>
              </>
            );
          }

          const submission = row?.sub || {};
          const timingMeta =
            submission?.finished === false
              ? getAttemptTimingMeta(submission?.expiresAt)
              : null;
          const scoreSummary = getCambridgeScoreSummary(submission);

          return (
            <>
              <span style={{ fontSize: 12, color: tone.subtleText, minWidth: 28 }}>
                #{index + 1}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                  background: tone.chipBg,
                  color: tone.chipColor,
                }}
              >
                {getQueueStatusLabel(submission)}
              </span>
              <span style={typeBadgeStyle(isDarkMode)}>
                {String(submission?.testType || "Orange")}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                {submission?.studentName || "N/A"}
              </span>
              <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
                {submission?.studentPhone || "N/A"}
              </span>
              <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
                {[
                  submission?.testTitle || submission?.testType || "Orange",
                  submission?.classCode || null,
                  submission?.teacherName || null,
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </span>
              {scoreSummary && (
                <span style={scoreBadgeStyle(tone, submission?.finished === false ? "#1d4ed8" : tone.primaryText)}>
                  {scoreSummary}
                </span>
              )}
              <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
                {submission?.finished === false && timingMeta
                  ? `${timingMeta.label} • ${formatDateTime(
                      submission?.lastSavedAt || submission?.createdAt
                    )}`
                  : formatDateTime(submission?.submittedAt || submission?.createdAt)}
              </span>
            </>
          );
        }}
        renderExpanded={({ item: row, tone }) =>
          renderCambridgeRowExpandedContent(row, tone)
        }
      />
    );
  };

  return (
    <>
      <AdminNavbar />
      <div
        className="admin-page admin-submission-page"
        style={{ maxWidth: "100%", width: "100%", margin: "0 auto", padding: "22px 14px" }}
      >
        <AdminStickySidebarLayout
          eyebrow="Review hub"
          title="Teacher review hub"
          description="Review across writing, reading, listening, and Orange submissions."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Workspace" title="Admin pages" meta="Quick jump">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel eyebrow="Summary" title="Current queue" meta={`${activeReviewTab.shortLabel} • ${activeFilteredCount} visible`}>
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">{activeQueueHint}</p>
              </AdminSidebarPanel>
            </>
          )}
        >
        <div style={reviewContentStackStyle}>
          <SubmissionStatCards
            containerStyle={{ marginBottom: 0 }}
            stats={[
              {
                label: "Total",
                count: activeTotalCount,
                bg: "#eff6ff",
                color: "#1d4ed8",
                border: "#bfdbfe",
              },
              {
                label: "Pending",
                count: activePendingCount,
                bg: "#fffbeb",
                color: "#92400e",
                border: "#fde68a",
              },
              {
                label: "Reviewed",
                count: activeReviewedCount,
                bg: "#f0fdf4",
                color: "#166534",
                border: "#bbf7d0",
              },
            ]}
          />

          <div style={reviewHubToolbarStyle(isDarkMode)}>
            <div style={reviewHubToolbarClusterStyle}>
              <span style={reviewHubLabelStyle(isDarkMode)}>Submission Type</span>
              <div style={reviewHubTabRowStyle}>
                {reviewTabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      style={reviewHubTabButtonStyle(isDarkMode, tab.tone, isActive)}
                    >
                      <span>{tab.shortLabel || tab.label}</span>
                      <span style={reviewHubTabBadgeStyle(isDarkMode, tab.tone, isActive)}>
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={reviewHubToolbarHeaderStyle}>
              <button
                type="button"
                onClick={() => navigate(activeReviewPageTarget.path)}
                style={reviewHubOpenPageButtonStyle(isDarkMode, activeReviewTab.tone)}
              >
                Open {activeReviewTab.shortLabel} page
              </button>
            </div>
          </div>

          {renderFilterToolbar(activeTab)}

          <p style={filterSummaryStyle(isDarkMode)}>
            Showing <strong>{activeFilteredCount}</strong>
            {activeTotalCount !== activeFilteredCount ? ` / ${activeTotalCount}` : ""} submissions
            {"  "}
            <span style={{ color: isDarkMode ? "#64748b" : "#9ca3af" }}>
              {activeQueueHint}
            </span>
          </p>

          {activeTab === "writing" && (
            <>{renderWritingQueue()}</>
          )}

          {activeTab === "reading" && (
            <>
              {renderObjectiveQueue({
                tabKey: "reading",
                items: filteredReading,
                allItems: unreviewedReading,
                loading: loadingReading,
                emptyAllMessage: "No reading submissions found.",
                emptyFilteredMessage: "No reading submissions match the current filters.",
                buildTestLabel: getReadingTestLabel,
                onReview: (submission) => navigate(`/reading-results/${submission.id}`),
              })}
            </>
          )}

          {activeTab === "listening" && (
            <>
              {renderObjectiveQueue({
                tabKey: "listening",
                items: filteredListening,
                allItems: unreviewedListening,
                loading: loadingListening,
                emptyAllMessage: "No listening submissions found.",
                emptyFilteredMessage: "No listening submissions match the current filters.",
                buildTestLabel: getListeningTestLabel,
                onReview: (submission) => navigate(`/listening-results/${submission.id}`),
              })}
            </>
          )}

          {activeTab === "cambridge" && (
            <>{renderCambridgeQueue()}</>
          )}
        </div>
        </AdminStickySidebarLayout>
      </div>
    </>
  );
};

const reviewContentStackStyle = {
  display: "grid",
  gap: 12,
};

const reviewHubToolbarStyle = (isDarkMode) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  border: `1px solid ${isDarkMode ? "#243047" : "#e5e7eb"}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: isDarkMode ? "#0f172a" : "#fff",
  boxShadow: isDarkMode
    ? "0 10px 30px rgba(2, 6, 23, 0.32)"
    : "0 8px 20px rgba(15, 23, 42, 0.04)",
});

const reviewHubToolbarClusterStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const reviewHubToolbarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
};

const reviewHubLabelStyle = (isDarkMode) => ({
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: isDarkMode ? "#cbd5e1" : "#374151",
  whiteSpace: "nowrap",
});

const getReviewTabTone = (toneKey) =>
  REVIEW_TAB_TONES[toneKey] || REVIEW_TAB_TONES.reading;

const reviewHubOpenPageButtonStyle = (isDarkMode, toneKey) => {
  const tone = getReviewTabTone(toneKey);

  return {
    border: `1px solid ${tone.softBorder}`,
    background: isDarkMode ? tone.activeBackground : tone.softBackground,
    color: isDarkMode ? "#ffffff" : tone.softText,
    boxShadow: isDarkMode ? "none" : `0 8px 18px ${tone.softBadgeBackground}`,
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
};

const reviewHubTabRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const reviewHubTabButtonStyle = (isDarkMode, toneKey, isActive) => {
  const tone = getReviewTabTone(toneKey);

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 12px",
    borderRadius: 999,
    border: `1px solid ${isActive ? tone.activeBorder : tone.softBorder}`,
    background: isActive
      ? tone.activeBackground
      : isDarkMode
      ? "rgba(15, 23, 42, 0.88)"
      : tone.softBackground,
    color: isActive ? "#fff" : tone.softText,
    boxShadow: isActive
      ? `0 10px 20px ${tone.softBadgeBackground}`
      : "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
};

const reviewHubTabBadgeStyle = (isDarkMode, toneKey, isActive) => {
  const tone = getReviewTabTone(toneKey);

  return {
    minWidth: 28,
    padding: "3px 8px",
    borderRadius: 999,
    background: isActive
      ? "rgba(255, 255, 255, 0.18)"
      : isDarkMode
      ? tone.softBadgeBackground
      : "rgba(255, 255, 255, 0.78)",
    color: isActive ? "#fff" : tone.softText,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 800,
  };
};

const filterPanelStyle = (isDarkMode) => ({
  border: `1px solid ${isDarkMode ? "#243047" : "#e5e7eb"}`,
  borderRadius: 14,
  padding: "12px 14px",
  background: isDarkMode ? "#0f172a" : "#fff",
  boxShadow: isDarkMode
    ? "0 10px 30px rgba(2, 6, 23, 0.32)"
    : "0 8px 20px rgba(15, 23, 42, 0.04)",
});

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const filterFieldLabelStyle = (isDarkMode) => ({
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: isDarkMode ? "#cbd5e1" : "#374151",
});

const filterInputStyle = (isDarkMode) => ({
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${isDarkMode ? "#334155" : "#d1d5db"}`,
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  background: isDarkMode ? "#111827" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "#111827",
});

const filterResetButtonStyle = {
  width: "100%",
  padding: "7px 10px",
  background: "#6b7280",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const filterSummaryStyle = (isDarkMode) => ({
  margin: 0,
  fontSize: 13,
  color: isDarkMode ? "#9ca3af" : "#6b7280",
});

const emptyStateStyle = (tone) => ({
  marginTop: 10,
  padding: "18px 16px",
  borderRadius: 10,
  border: `1px dashed ${tone.border}`,
  background: tone.panelBg,
  color: tone.mutedText,
  textAlign: "center",
});

const expandedActionRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const scoreBadgeStyle = (tone, color = tone.primaryText) => ({
  padding: "3px 8px",
  borderRadius: 999,
  background: tone.panelBg,
  color,
  fontWeight: 700,
  fontSize: 12,
});

const typeBadgeStyle = (isDarkMode) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  background: isDarkMode ? "#1e293b" : "#eef2ff",
  color: isDarkMode ? "#bfdbfe" : "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
});

const primaryButtonStyle = {
  background: "#e03",
  color: "white",
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "#fff",
  color: "#111827",
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
};

const answerBoxStyle = (isDarkMode, isCompactLayout = false) => ({
  border: `1px solid ${isDarkMode ? "#2a3350" : "#e5e7eb"}`,
  borderRadius: 10,
  background: isDarkMode ? "#111827" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "inherit",
  padding: isCompactLayout ? 10 : 12,
});

const feedbackActionRowStyle = (isCompactLayout) => ({
  display: "grid",
  gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, max-content)",
  gap: isCompactLayout ? 8 : 10,
  alignItems: "center",
});

export default Review;
