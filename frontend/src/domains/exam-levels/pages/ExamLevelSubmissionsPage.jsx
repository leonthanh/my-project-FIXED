import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import InlineIcon from "../../../shared/components/InlineIcon";
import { apiPath, authFetch } from "../../../shared/utils/api";
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

  const requestedSkill = String(searchParams.get("skill") || "all").toLowerCase();
  const activeSkill = PREPARE_SKILLS.includes(requestedSkill) ? requestedSkill : "all";

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

                    {!isActive ? (
                      <div className="prepare-submissions-page__actions">
                        <Link
                          className="prepare-submissions-page__open"
                          to={`/exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(item.id)}`}
                        >
                          <InlineIcon name="eye" size={15} />
                          <span>Open submission review</span>
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              }}
              emptyState={null}
              compact
            />
          ) : null}
        </AdminStickySidebarLayout>
      </div>
    </>
  );
};

export default ExamLevelSubmissionsPage;
