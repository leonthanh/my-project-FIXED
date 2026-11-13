import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import InlineIcon from "../../../shared/components/InlineIcon";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import { apiPath, authFetch, getStoredUser, hostPath } from "../../../shared/utils/api";
import { isAdmin } from "../../../shared/utils/permissions";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildSubmissionWorkspaceNav,
} from "../../../features/admin/components/AdminStickySidebarLayout";
import SubmissionFilterPanel from "../../../features/admin/components/SubmissionFilterPanel";
import SubmissionHeaderSurface from "../../../features/admin/components/SubmissionHeaderSurface";
import SubmissionTypeTabs from "../../../features/admin/components/SubmissionTypeTabs";
import {
  ExpandableSubmissionList,
  getSubmissionTone,
  SubmissionStatCards,
} from "../../../features/admin/components/SubmissionCardList";
import AttemptExtensionControls from "../../../features/admin/components/AttemptExtensionControls";
import {
  getAttemptTimingMeta,
} from "../../../features/admin/utils/attemptTiming";
import {
  getCambridgeResponseFeedbackText,
  upsertCambridgeResponseFeedback,
} from "../../../shared/utils/cambridgeFeedback";
import sanitizePromptHtml from "../../../shared/utils/sanitizePromptHtml";
import "./ExamLevelSubmissionsPage.css";

const PREPARE_SKILLS = ["listening", "reading-writing"];
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "all", label: "All" },
];

const EMPTY_FILTERS = {
  studentName: "",
  studentPhone: "",
  classCode: "",
  testTitle: "",
  fromDate: "",
  toDate: "",
};

const skillLabel = (value) => ({
  listening: "Listening",
  "reading-writing": "Reading & Writing",
}[value] || value);

const hasReview = (submission) =>
  submission?.status === "reviewed" || Boolean(String(submission?.feedback || "").trim());

const getSubmissionTimestamp = (submission) => {
  const timestamp = new Date(
    submission?.lastSavedAt
      || submission?.submittedAt
      || submission?.updatedAt
      || submission?.createdAt
      || 0
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getDayBoundaryTimestamp = (value, endOfDay = false) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const timestamp = new Date(
    `${normalized}${endOfDay ? "T23:59:59.999" : "T00:00:00"}`
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const formatSubmissionDate = (submission) => {
  const value = submission?.finished === false
    ? submission?.lastSavedAt || submission?.updatedAt || submission?.createdAt
    : submission?.submittedAt || submission?.createdAt;
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";
};

const formatTimeSpent = (value) => {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "--:--";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const getManualResponses = (submission) => {
  const detailedResults = submission?.detailedResults;
  const parsedResults = typeof detailedResults === "string"
    ? (() => {
        try {
          return JSON.parse(detailedResults);
        } catch {
          return {};
        }
      })()
    : detailedResults;
  if (!parsedResults || typeof parsedResults !== "object" || Array.isArray(parsedResults)) {
    return [];
  }

  return Object.entries(parsedResults)
    .filter(([, result]) => result?.isCorrect === null)
    .map(([key, result], index) => {
      const userAnswer = typeof result.userAnswer === "string"
        ? result.userAnswer.trim()
        : String(result.userAnswer ?? "").trim();
      return {
        key,
        label: result.questionNumber
          ? `Question ${result.questionNumber}`
          : ["short-message", "story-writing"].includes(result.questionType)
            ? "Writing task"
            : `Response ${index + 1}`,
        prompt: String(result.questionText || "").trim(),
        questionType: String(result.questionType || "").trim(),
        userAnswer,
      };
    })
    .filter((response) => response.userAnswer);
};

const getWritingContentFromTest = (test, response) => {
  const emptyContent = { isPrepareWriting: false, instructions: "", prompt: "" };
  const keyParts = String(response?.key || "").split("-").map(Number);
  if (keyParts.length !== 3 || keyParts.some((index) => !Number.isInteger(index))) return emptyContent;

  let parts = test?.parts;
  if (typeof parts === "string") {
    try {
      parts = JSON.parse(parts);
    } catch {
      return emptyContent;
    }
  }
  if (!Array.isArray(parts)) return emptyContent;

  const [partIndex, sectionIndex, questionIndex] = keyParts;
  const section = parts[partIndex]?.sections?.[sectionIndex];
  const question = section?.questions?.[questionIndex];
  if (!question || typeof question !== "object") return emptyContent;

  const questionType = response.questionType || section.questionType;
  if (questionType === "story-writing") {
    return {
      isPrepareWriting: Boolean(question.prepareWritingMode),
      instructions: String(question.instructions || "").trim(),
      prompt: String(question.story || question.prompt || question.openingSentence || "").trim(),
    };
  }

  const candidates = questionType === "short-message"
    ? [question.situation, question.questionText, question.prompt]
    : [question.prompt, question.instructions, question.openingSentence, question.situation, question.questionText];
  return {
    isPrepareWriting: Boolean(question.prepareWritingMode),
    instructions: "",
    prompt: String(candidates.find((candidate) => String(candidate || "").trim()) || "").trim(),
  };
};

const getPendingManualResponses = (submission) => {
  if (String(submission?.feedback || "").trim()) return [];
  return getManualResponses(submission).filter((response) => (
    !getCambridgeResponseFeedbackText(submission?.responseFeedback, response.key)
  ));
};

const extensionButtonStyle = {
  padding: "7px 12px",
  border: "none",
  borderRadius: 6,
  background: "#0284c7",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const ExamLevelSubmissionsPage = () => {
  const { code: rawCode } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [level, setLevel] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [reviewStatus, setReviewStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const [activeWorkspaceGroup, setActiveWorkspaceGroup] = useState("prepare");
  const [extendingId, setExtendingId] = useState(null);
  const [extensionErrors, setExtensionErrors] = useState({});
  const [reviewingEssayId, setReviewingEssayId] = useState(null);
  const [essayFeedbackDrafts, setEssayFeedbackDrafts] = useState({});
  const [essaySavingKey, setEssaySavingKey] = useState("");
  const [essayReviewErrors, setEssayReviewErrors] = useState({});
  const [essayReviewDetails, setEssayReviewDetails] = useState({});
  const [essayReviewLoadingIds, setEssayReviewLoadingIds] = useState({});
  const [essayReviewLoadErrors, setEssayReviewLoadErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const currentUser = useMemo(() => getStoredUser(), []);
  const canDeleteSubmissions = isAdmin(currentUser);
  const reviewingSubmission = submissions.find((item) => item.id === reviewingEssayId) || null;
  const reviewingResponses = reviewingSubmission ? getManualResponses(reviewingSubmission) : [];
  const reviewingPendingCount = reviewingSubmission
    ? getPendingManualResponses(reviewingSubmission).length
    : 0;

  const requestedSkill = String(searchParams.get("skill") || "all").toLowerCase();
  const activeSkill = PREPARE_SKILLS.includes(requestedSkill) ? requestedSkill : "all";

  useEffect(() => {
    if (reviewingEssayId === null) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setReviewingEssayId(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reviewingEssayId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [levelResponse, submissionsResponse] = await Promise.all([
          authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}`)),
          authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}/submissions?includeActive=1`)),
        ]);
        const [levelPayload, submissionPayload] = await Promise.all([
          levelResponse.json().catch(() => ({})),
          submissionsResponse.json().catch(() => ({})),
        ]);
        if (!levelResponse.ok) {
          throw new Error(levelPayload.message || "Could not load this exam level.");
        }
        if (!submissionsResponse.ok) {
          throw new Error(submissionPayload.message || "Could not load submissions.");
        }
        if (mounted) {
          setLevel(levelPayload);
          setSubmissions(Array.isArray(submissionPayload) ? submissionPayload : []);
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [code]);

  const selectSkill = (skill) => {
    const nextParams = new URLSearchParams(searchParams);
    if (skill === "all") {
      nextParams.delete("skill");
    } else {
      nextParams.set("skill", skill);
    }
    setSearchParams(nextParams);
  };

  const submissionTypeTabs = useMemo(() => [
    {
      key: "all",
      shortLabel: "All",
      label: "All Prepare submissions",
      tone: "prepare",
      badge: submissions.length,
    },
    ...PREPARE_SKILLS.map((skill) => ({
      key: skill,
      shortLabel: skillLabel(skill),
      label: `${skillLabel(skill)} submissions`,
      tone: skill === "listening" ? "listening" : "writing",
      badge: submissions.filter((submission) => submission.skill === skill).length,
    })),
  ], [submissions]);

  const {
    workspaceGroupLinks,
    workspaceChildLinks,
  } = buildSubmissionWorkspaceNav({
    navigate,
    currentKey: "prepare",
    activeWorkspaceGroup,
    setActiveWorkspaceGroup,
    activePrepareSkill: activeSkill,
    onPrepareSkillClick: selectSkill,
    onIxGroupClick: ({ ixWorkspaceLinks }) => {
      ixWorkspaceLinks.find((item) => item.key === "writing")?.onClick?.();
    },
  });

  const fromDateStart = getDayBoundaryTimestamp(filters.fromDate);
  const toDateEnd = getDayBoundaryTimestamp(filters.toDate, true);

  const filteredSubmissions = useMemo(() => {
    const studentName = filters.studentName.trim().toLowerCase();
    const studentPhone = filters.studentPhone.trim().toLowerCase();
    const classCode = filters.classCode.trim().toLowerCase();
    const testTitle = filters.testTitle.trim().toLowerCase();

    return submissions
      .filter((submission) => {
        if (activeSkill !== "all" && submission.skill !== activeSkill) return false;
        if (studentName && !String(submission.studentName || "").toLowerCase().includes(studentName)) {
          return false;
        }
        if (studentPhone && !String(submission.studentPhone || "").toLowerCase().includes(studentPhone)) {
          return false;
        }
        if (classCode && !String(submission.classCode || "").toLowerCase().includes(classCode)) {
          return false;
        }
        if (testTitle && !String(submission.testTitle || "").toLowerCase().includes(testTitle)) {
          return false;
        }
        const reviewed = hasReview(submission);
        if (reviewStatus === "pending" && reviewed) return false;
        if (reviewStatus === "reviewed" && !reviewed) return false;
        if (fromDateStart !== null || toDateEnd !== null) {
          const timestamp = getSubmissionTimestamp(submission);
          if (timestamp === null) return false;
          if (fromDateStart !== null && timestamp < fromDateStart) return false;
          if (toDateEnd !== null && timestamp > toDateEnd) return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftTime = getSubmissionTimestamp(left) || 0;
        const rightTime = getSubmissionTimestamp(right) || 0;
        return sortOrder === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [
    activeSkill,
    filters.classCode,
    filters.studentName,
    filters.studentPhone,
    filters.testTitle,
    fromDateStart,
    reviewStatus,
    sortOrder,
    submissions,
    toDateEnd,
  ]);

  const pendingCount = submissions.filter((submission) => !hasReview(submission)).length;
  const reviewedCount = submissions.length - pendingCount;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setReviewStatus("all");
    setSortOrder("newest");
  };

  const toggleExpanded = (submissionId) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });
  };

  const handleExtendTime = async (submission, extraMinutes) => {
    setExtendingId(submission.id);
    setExtensionErrors((current) => ({ ...current, [submission.id]: "" }));
    try {
      const response = await authFetch(apiPath(
        `exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(submission.id)}/extend-time`
      ), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMinutes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Could not extend time.");
      }

      setSubmissions((current) => current.map((item) => (
        item.id === submission.id
          ? {
              ...item,
              finished: false,
              expiresAt: payload.expiresAt || item.expiresAt,
              lastSavedAt: new Date().toISOString(),
            }
          : item
      )));
      return true;
    } catch (extendError) {
      setExtensionErrors((current) => ({
        ...current,
        [submission.id]: extendError.message || "Could not extend time.",
      }));
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  const openEssayReview = async (submission) => {
    setReviewingEssayId(submission.id);
    setEssayFeedbackDrafts((current) => ({
      ...current,
      [submission.id]: current[submission.id] || Object.fromEntries(
        getManualResponses(submission).map((response) => [
          response.key,
          getCambridgeResponseFeedbackText(submission.responseFeedback, response.key),
        ])
      ),
    }));
    setEssayReviewErrors((current) => ({ ...current, [submission.id]: "" }));
    if (essayReviewDetails[submission.id] || essayReviewLoadingIds[submission.id]) return;

    setEssayReviewLoadingIds((current) => ({ ...current, [submission.id]: true }));
    setEssayReviewLoadErrors((current) => ({ ...current, [submission.id]: "" }));
    try {
      const response = await authFetch(apiPath(
        `exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(submission.id)}`
      ));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Could not load the writing prompt.");
      }
      setEssayReviewDetails((current) => ({ ...current, [submission.id]: payload }));
    } catch (detailError) {
      setEssayReviewLoadErrors((current) => ({
        ...current,
        [submission.id]: detailError.message || "Could not load the writing prompt.",
      }));
    } finally {
      setEssayReviewLoadingIds((current) => ({ ...current, [submission.id]: false }));
    }
  };

  const handleSaveEssayFeedback = async (submission, response) => {
    const feedback = String(
      essayFeedbackDrafts[submission.id]?.[response.key] || ""
    ).trim();
    const stateKey = `${submission.id}:${response.key}`;
    if (!feedback) {
      setEssayReviewErrors((current) => ({
        ...current,
        [submission.id]: "Enter feedback before saving.",
      }));
      return;
    }

    setEssaySavingKey(stateKey);
    setEssayReviewErrors((current) => ({ ...current, [submission.id]: "" }));
    try {
      const reviewerName = String(
        currentUser?.name || currentUser?.username || currentUser?.fullName || "Teacher"
      ).trim();
      const responseFeedback = upsertCambridgeResponseFeedback({
        existingValue: submission.responseFeedback,
        responseKey: response.key,
        feedback,
        feedbackBy: reviewerName,
        feedbackAt: new Date().toISOString(),
        label: response.label,
        prompt: response.prompt,
        questionType: response.questionType,
      });
      const responseObject = await authFetch(apiPath(
        `exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(submission.id)}/review`
      ), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: submission.feedback || "",
          responseFeedback,
        }),
      });
      const payload = await responseObject.json().catch(() => ({}));
      if (!responseObject.ok) {
        throw new Error(payload.message || "Could not save essay feedback.");
      }

      setSubmissions((current) => current.map((item) => (
        item.id === submission.id
          ? {
              ...item,
              feedback: payload.feedback ?? submission.feedback ?? null,
              responseFeedback: payload.responseFeedback || responseFeedback,
              status: payload.status || "reviewed",
            }
          : item
      )));
    } catch (reviewError) {
      setEssayReviewErrors((current) => ({
        ...current,
        [submission.id]: reviewError.message || "Could not save essay feedback.",
      }));
    } finally {
      setEssaySavingKey("");
    }
  };

  const handleDeleteSubmission = async () => {
    if (!deleteConfirm || !canDeleteSubmissions || deletingId) return;
    setDeletingId(deleteConfirm.id);
    setDeleteError("");
    try {
      const response = await authFetch(apiPath(
        `exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(deleteConfirm.id)}`
      ), { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Could not delete submission.");
      }

      setSubmissions((current) => current.filter((item) => item.id !== deleteConfirm.id));
      setExpandedItems((current) => {
        const next = new Set(current);
        next.delete(deleteConfirm.id);
        return next;
      });
      if (reviewingEssayId === deleteConfirm.id) setReviewingEssayId(null);
      setDeleteConfirm(null);
    } catch (deleteSubmissionError) {
      setDeleteError(deleteSubmissionError.message || "Could not delete submission.");
    } finally {
      setDeletingId(null);
    }
  };

  const filterFields = [
    {
      key: "studentName",
      label: "Student Name",
      placeholder: "Student name",
      value: filters.studentName,
      onChange: (value) => updateFilter("studentName", value),
    },
    {
      key: "studentPhone",
      label: "Phone",
      placeholder: "Phone number",
      value: filters.studentPhone,
      onChange: (value) => updateFilter("studentPhone", value),
    },
    {
      key: "classCode",
      label: "Class Code",
      placeholder: "Class code",
      value: filters.classCode,
      onChange: (value) => updateFilter("classCode", value),
    },
    {
      key: "testTitle",
      label: "Test",
      placeholder: "Test title",
      value: filters.testTitle,
      onChange: (value) => updateFilter("testTitle", value),
    },
    {
      key: "fromDate",
      label: "From Date",
      type: "date",
      value: filters.fromDate,
      onChange: (value) => updateFilter("fromDate", value),
    },
    {
      key: "toDate",
      label: "To Date",
      type: "date",
      value: filters.toDate,
      onChange: (value) => updateFilter("toDate", value),
    },
  ];

  const sidebarStats = [
    {
      key: "total",
      label: "Total",
      value: submissions.length,
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    {
      key: "pending",
      label: "Pending",
      value: pendingCount,
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    },
    {
      key: "reviewed",
      label: "Reviewed",
      value: reviewedCount,
      bg: "#f0fdf4",
      border: "#bbf7d0",
      color: "#166534",
    },
    {
      key: "visible",
      label: "Visible",
      value: filteredSubmissions.length,
      bg: "#f5f3ff",
      border: "#ddd6fe",
      color: "#6d28d9",
    },
  ];

  return (
    <>
      <AdminNavbar />
      <div className="prepare-submissions-page admin-page admin-submission-page">
        <AdminStickySidebarLayout
          eyebrow="Prepare"
          title={`${level?.name || "Prepare"} submissions`}
          description="Review Prepare Reading & Writing and Listening submissions, filter the queue, and open individual answers for feedback."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Workspace" title="Admin pages" meta="Quick jump">
                <AdminSidebarNavList items={workspaceGroupLinks} ariaLabel="Review workspace groups" />
              </AdminSidebarPanel>

              {workspaceChildLinks.length > 0 ? (
                <AdminSidebarPanel eyebrow="View" title="Submission type" meta="Prepare">
                  <AdminSidebarNavList items={workspaceChildLinks} ariaLabel="Prepare submission types" />
                </AdminSidebarPanel>
              ) : null}

              <AdminSidebarPanel eyebrow="Summary" title="Result queue" meta="All statuses">
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Filter by skill, student, test, or date; expand active attempts to manage their time.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
          <SubmissionHeaderSurface
            topRowLeft={(
              <SubmissionStatCards
                compact
                dense
                containerStyle={{ marginBottom: 0, gap: 8 }}
                stats={[
                  {
                    key: "total",
                    label: "Total",
                    count: submissions.length,
                    bg: "#eff6ff",
                    color: "#1d4ed8",
                    border: "#bfdbfe",
                  },
                  {
                    key: "pending",
                    label: "Pending",
                    count: pendingCount,
                    bg: "#fffbeb",
                    color: "#92400e",
                    border: "#fde68a",
                  },
                  {
                    key: "reviewed",
                    label: "Reviewed",
                    count: reviewedCount,
                    bg: "#f0fdf4",
                    color: "#166534",
                    border: "#bbf7d0",
                  },
                ]}
              />
            )}
            middleLabel="Submission Type"
            middleContent={(
              <SubmissionTypeTabs
                activeKey={activeSkill}
                items={submissionTypeTabs}
                title={null}
                allowMobileWrap
                showZeroBadge
                onSelect={selectSkill}
              />
            )}
            bottomContent={(
              <SubmissionFilterPanel
                embedded
                compact
                dense
                compactPrimaryFieldCount={3}
                fields={filterFields}
                sortValue={sortOrder}
                onSortChange={setSortOrder}
                statusValue={reviewStatus}
                onStatusChange={setReviewStatus}
                statusOptions={STATUS_OPTIONS}
                onReset={resetFilters}
                filteredCount={filteredSubmissions.length}
                totalCount={submissions.length}
                summaryLabel="submissions"
                summaryHint="Expand an active attempt to extend its time, or open a completed submission for review."
              />
            )}
          />

          {error ? <p className="prepare-submissions-page__error" role="alert">{error}</p> : null}
          {loading ? <p className="prepare-submissions-page__state">Loading submissions…</p> : null}
          {!loading && !error && filteredSubmissions.length === 0 ? (
            <p className="prepare-submissions-page__empty">
              {submissions.length
                ? "No submissions match the current filters."
                : "No submissions yet."}
            </p>
          ) : null}
          {!loading && filteredSubmissions.length > 0 ? (
            <ExpandableSubmissionList
              items={filteredSubmissions}
              expandedItems={expandedItems}
              onToggle={toggleExpanded}
              getTone={(submission) => getSubmissionTone(
                submission.finished === false
                  ? "active"
                  : hasReview(submission) ? "reviewed" : "pending"
              )}
              renderHeader={({ item, index }) => (
                <>
                  <span className="prepare-submissions-page__index">#{index + 1}</span>
                  <span className={`prepare-submissions-page__status ${item.finished === false ? "is-active" : hasReview(item) ? "is-reviewed" : "is-pending"}`}>
                    {item.finished === false ? "In Progress" : hasReview(item) ? "Reviewed" : "Pending"}
                  </span>
                  <span className={`prepare-submissions-page__skill is-${item.skill === "listening" ? "listening" : "reading"}`}>
                    {skillLabel(item.skill)}
                  </span>
                  <span className="prepare-submissions-page__student">
                    <strong>{item.studentName || "Student"}</strong>
                    <small>{item.studentPhone || item.classCode || "Prepare student"}</small>
                  </span>
                  <span className="prepare-submissions-page__test">
                    {item.testTitle || `${skillLabel(item.skill)} test`}
                  </span>
                  <span className="prepare-submissions-page__score">
                    {item.finished === false ? (
                      <>
                        <strong>In Progress</strong>
                        <small>{getAttemptTimingMeta(item.expiresAt)?.label || "Timer unavailable"}</small>
                      </>
                    ) : (
                      <>
                        <strong>{Number(item.score || 0)}/{Number(item.totalQuestions || 0)}</strong>
                        <small>{Number(item.percentage || 0).toFixed(0)}%</small>
                      </>
                    )}
                  </span>
                  <time className="prepare-submissions-page__date">
                    {formatSubmissionDate(item)}
                  </time>
                </>
              )}
              renderExpanded={({ item }) => {
                const isActive = item.finished === false;
                const timingMeta = isActive ? getAttemptTimingMeta(item.expiresAt) : null;
                const feedback = String(item.feedback || "").trim();
                const isReviewed = hasReview(item);
                const pendingManualResponses = getPendingManualResponses(item);
                const canReviewEssay = !isActive
                  && item.skill === "reading-writing"
                  && pendingManualResponses.length > 0;
                const summaryStats = [
                  {
                    label: "Type",
                    value: `Prepare ${skillLabel(item.skill)}`,
                    className: "is-type",
                  },
                  {
                    label: "Score",
                    value: isActive
                      ? "In Progress"
                      : `${Number(item.score || 0)}/${Number(item.totalQuestions || 0)}`,
                    className: isActive ? "is-active" : "",
                  },
                  {
                    label: "Accuracy",
                    value: isActive ? "--" : `${Number(item.percentage || 0)}%`,
                    className: "",
                  },
                  {
                    label: "Time Spent",
                    value: isActive ? "--:--" : formatTimeSpent(item.timeSpent),
                    className: "",
                  },
                ];
                const detailItems = [
                  { label: "Test Title", value: item.testTitle || `${skillLabel(item.skill)} test` },
                  { label: "Skill", value: skillLabel(item.skill) },
                  { label: "Student", value: item.studentName || "--" },
                  { label: "Phone", value: item.studentPhone || "--" },
                  { label: "Class Code", value: item.classCode || "--" },
                  {
                    label: isActive ? "Last saved" : "Submitted",
                    value: formatSubmissionDate(item),
                  },
                ];

                return (
                  <div className="prepare-submissions-page__expanded">
                    {isActive ? (
                      <div className="prepare-submissions-page__active">
                        <div className="prepare-submissions-page__activeMessage">
                          <strong>This attempt is still open.</strong>{" "}
                          The student has not submitted it yet.
                        </div>
                        <div className="prepare-submissions-page__activeActions">
                          {timingMeta ? (
                            <strong
                              className="prepare-submissions-page__timing"
                              style={{ color: timingMeta.color }}
                            >
                              {timingMeta.label}
                            </strong>
                          ) : null}
                          <span className="prepare-submissions-page__saved">
                            Saved: {formatSubmissionDate(item)}
                          </span>
                          <AttemptExtensionControls
                            isLoading={extendingId === item.id}
                            onExtend={(minutes) => handleExtendTime(item, minutes)}
                            buttonStyle={extensionButtonStyle}
                            submitButtonStyle={{ ...extensionButtonStyle, background: "#0369a1" }}
                          />
                        </div>
                        {extensionErrors[item.id] ? (
                          <p className="prepare-submissions-page__error" role="alert">
                            {extensionErrors[item.id]}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="prepare-submissions-page__stats">
                      {summaryStats.map((stat) => (
                        <div
                          key={stat.label}
                          className={`prepare-submissions-page__stat ${stat.className}`}
                        >
                          {stat.label === "Type" ? (
                            <span
                              className={`prepare-submissions-page__typeBadge ${item.skill === "listening" ? "is-listening" : ""}`}
                            >
                              {stat.value}
                            </span>
                          ) : (
                            <strong>{stat.value}</strong>
                          )}
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="prepare-submissions-page__details">
                      {detailItems.map((detail) => (
                        <div key={detail.label} className="prepare-submissions-page__detail">
                          <strong>{detail.label}</strong>
                          <span>{detail.value}</span>
                        </div>
                      ))}
                    </div>

                    {isReviewed ? (
                      <div className="prepare-submissions-page__feedback is-reviewed">
                        <strong>Reviewed</strong>
                        <p>{feedback || "Teacher feedback has been saved."}</p>
                      </div>
                    ) : (
                      <p className="prepare-submissions-page__noFeedback">No teacher feedback yet.</p>
                    )}

                    <div className="prepare-submissions-page__actions">
                      {canReviewEssay ? (
                        <button
                          type="button"
                          className="prepare-submissions-page__reviewEssay"
                          onClick={() => openEssayReview(item)}
                        >
                          <InlineIcon name="review" size={15} />
                          <span>Review Essay</span>
                          <span className="prepare-submissions-page__reviewCount">
                            {pendingManualResponses.length}
                          </span>
                        </button>
                      ) : null}
                      {!isActive ? (
                        <Link
                          className="prepare-submissions-page__open"
                          to={`/exam-levels/${encodeURIComponent(code)}/submission-results/${encodeURIComponent(item.id)}`}
                        >
                          <InlineIcon name="eye" size={15} />
                          <span>View</span>
                        </Link>
                      ) : null}
                      {canDeleteSubmissions ? (
                        <button
                          type="button"
                          className="prepare-submissions-page__delete"
                          disabled={deletingId === item.id}
                          onClick={() => {
                            setDeleteError("");
                            setDeleteConfirm({ id: item.id, studentName: item.studentName });
                          }}
                        >
                          <InlineIcon name="trash" size={15} />
                          <span>{deletingId === item.id ? "Deleting…" : "Delete"}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
              emptyState={null}
              compact
            />
          ) : null}
        </AdminStickySidebarLayout>
      </div>
      {reviewingSubmission ? (
        <div
          className="prepare-submissions-page__drawerOverlay"
          onClick={() => setReviewingEssayId(null)}
        >
          <aside
            className="prepare-submissions-page__drawerPanel"
            role="dialog"
            aria-modal="true"
            aria-label="Prepare essay review"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="prepare-submissions-page__drawerHeader">
              <div>
                <div className="prepare-submissions-page__drawerEyebrow">Prepare Essay Review</div>
                <h2 className="prepare-submissions-page__drawerTitle">
                  {reviewingSubmission.testTitle || `${skillLabel(reviewingSubmission.skill)} test`}
                </h2>
                <div className="prepare-submissions-page__drawerMeta">
                  <span>{reviewingSubmission.studentName || "Student"}</span>
                  {reviewingSubmission.classCode ? <span>{reviewingSubmission.classCode}</span> : null}
                  <span className="is-pending">
                    {reviewingPendingCount} pending
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="prepare-submissions-page__drawerClose"
                aria-label="Close review drawer"
                onClick={() => setReviewingEssayId(null)}
              >
                <InlineIcon name="close" size={18} />
              </button>
            </header>

            <div className="prepare-submissions-page__drawerBody">
              <section className="prepare-submissions-page__essayReview" aria-label="Essay review responses">
                <h3>Open-ended responses to review</h3>
                {essayReviewLoadingIds[reviewingSubmission.id] ? (
                  <p className="prepare-submissions-page__drawerEmpty">Loading writing prompt…</p>
                ) : null}
                {essayReviewLoadErrors[reviewingSubmission.id] ? (
                  <p className="prepare-submissions-page__error" role="alert">
                    {essayReviewLoadErrors[reviewingSubmission.id]}
                  </p>
                ) : null}
                {reviewingResponses.length ? reviewingResponses.map((response) => {
                  const stateKey = `${reviewingSubmission.id}:${response.key}`;
                  const savedFeedback = getCambridgeResponseFeedbackText(
                    reviewingSubmission.responseFeedback,
                    response.key
                  );
                  const writingContent = getWritingContentFromTest(
                    essayReviewDetails[reviewingSubmission.id]?.test,
                    response
                  );
                  const isPrepareWriting = writingContent.isPrepareWriting
                    || response.questionType === "story-writing";
                  const instructions = writingContent.instructions
                    || (isPrepareWriting ? response.prompt : "");
                  const prompt = writingContent.prompt
                    || (isPrepareWriting ? "" : response.prompt);
                  const feedbackPrompt = isPrepareWriting
                    ? [
                        instructions ? `Instructions:\n${instructions}` : "",
                        prompt ? `Letter / Prompt Text:\n${prompt}` : "",
                      ].filter(Boolean).join("\n\n")
                    : prompt;
                  return (
                    <article key={response.key} className="prepare-submissions-page__essayResponse">
                      <strong>{response.label}</strong>
                      {instructions ? (
                        <div className="prepare-submissions-page__essayPromptWrap">
                          <span className="prepare-submissions-page__essayPromptLabel">Instructions</span>
                          <div
                            className="prepare-submissions-page__essayPromptHtml"
                            dangerouslySetInnerHTML={{ __html: sanitizePromptHtml(instructions, hostPath) }}
                          />
                        </div>
                      ) : null}
                      {prompt ? (
                        <div className="prepare-submissions-page__essayPromptWrap">
                          <span className="prepare-submissions-page__essayPromptLabel">
                            {isPrepareWriting ? "Letter / Prompt Text" : "Prompt"}
                          </span>
                          <div
                            className="prepare-submissions-page__essayPromptHtml"
                            dangerouslySetInnerHTML={{ __html: sanitizePromptHtml(prompt, hostPath) }}
                          />
                        </div>
                      ) : null}
                      <div className="prepare-submissions-page__essayAnswer">
                        {response.userAnswer}
                      </div>
                      <label htmlFor={`prepare-feedback-${reviewingSubmission.id}-${response.key}`}>
                        Teacher feedback
                      </label>
                      <textarea
                        id={`prepare-feedback-${reviewingSubmission.id}-${response.key}`}
                        value={essayFeedbackDrafts[reviewingSubmission.id]?.[response.key] ?? savedFeedback}
                        maxLength={10000}
                        rows={4}
                        onChange={(event) => setEssayFeedbackDrafts((current) => ({
                          ...current,
                          [reviewingSubmission.id]: {
                            ...current[reviewingSubmission.id],
                            [response.key]: event.target.value,
                          },
                        }))}
                      />
                      <button
                        type="button"
                        disabled={essaySavingKey === stateKey}
                        onClick={() => handleSaveEssayFeedback(
                          reviewingSubmission,
                          { ...response, prompt: feedbackPrompt }
                        )}
                      >
                        {essaySavingKey === stateKey
                          ? "Saving…"
                          : savedFeedback ? "Update Feedback" : "Save Feedback"}
                      </button>
                    </article>
                  );
                }) : (
                  <p className="prepare-submissions-page__drawerEmpty">
                    No open-ended responses were found in this submission.
                  </p>
                )}
                {essayReviewErrors[reviewingSubmission.id] ? (
                  <p className="prepare-submissions-page__error" role="alert">
                    {essayReviewErrors[reviewingSubmission.id]}
                  </p>
                ) : null}
              </section>
            </div>
          </aside>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => {
          if (deletingId) return;
          setDeleteConfirm(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteSubmission}
        title="Delete this submission?"
        message={`This will permanently delete ${deleteConfirm?.studentName || "this student's"} submission and its review data.`}
        confirmText={deletingId ? "Deleting…" : "Delete submission"}
        type="danger"
        extraContent={deleteError || null}
      />
    </>
  );
};

export default ExamLevelSubmissionsPage;
