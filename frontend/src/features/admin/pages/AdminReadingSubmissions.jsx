import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath, authFetch } from "../../../shared/utils/api";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from "../components/AdminStickySidebarLayout";
import {
  ExpandableSubmissionList,
  SubmissionStatCards,
  getSubmissionTone,
} from "../components/SubmissionCardList";
import AdminConfirmModal from "../components/AdminConfirmModal";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
import {
  formatAttemptTimestamp,
  getAttemptTimingMeta,
} from "../utils/attemptTiming";

const InlineIcon = ({ name, size = 16, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      lineHeight: 0,
      flex: "0 0 auto",
      ...style,
    }}
    aria-hidden="true"
  >
    <LineIcon name={name} size={size} />
  </span>
);

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    localStorage.removeItem("user");
    return null;
  }
};

const stopSelectionEvent = (event) => {
  event.stopPropagation();
};

const AdminReadingSubmissions = () => {
  const { isDarkMode } = useTheme();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandledRef = useRef("");

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBy, setFeedbackBy] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [extendingId, setExtendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Search/filter state
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchReviewedBy, setSearchReviewedBy] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const currentUser = useMemo(() => getStoredUser(), []);
  const canDeleteSubmissions = currentUser?.role === "admin";

  useEffect(() => {
    const fetchSubs = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiPath("reading-submissions/admin/list"));
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setSubs(data || []);
      } catch (err) {
        console.error("Error fetching reading submissions:", err);
        setSubs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();

    if (currentUser?.name) setFeedbackBy(currentUser.name);
  }, [currentUser]);

  const hasReview = (submission) =>
    Boolean(
      String(submission?.feedback || "").trim() ||
        String(submission?.feedbackBy || "").trim()
    );

  const getSubmissionTime = (submission) =>
    new Date(
      submission?.submittedAt ||
        submission?.createdAt ||
        submission?.updatedAt ||
        0
    ).getTime();

  const filteredSubs = useMemo(() => {
    const next = subs.filter((submission) => {
      const classCode = String(
        submission?.ReadingTest?.classCode || submission?.classCode || ""
      ).toLowerCase();
      const teacherName = String(
        submission?.ReadingTest?.teacherName || submission?.teacherName || ""
      ).toLowerCase();
      const studentName = String(
        submission?.userName || submission?.User?.name || ""
      ).toLowerCase();
      const phone = String(
        submission?.User?.phone || submission?.userPhone || ""
      ).toLowerCase();
      const reviewedBy = String(submission?.feedbackBy || "").toLowerCase();

      if (searchClassCode && !classCode.includes(searchClassCode.toLowerCase())) {
        return false;
      }

      if (searchTeacher && !teacherName.includes(searchTeacher.toLowerCase())) {
        return false;
      }

      if (searchStudent && !studentName.includes(searchStudent.toLowerCase())) {
        return false;
      }

      if (searchPhone && !phone.includes(searchPhone.toLowerCase())) {
        return false;
      }

      if (
        searchReviewedBy &&
        !reviewedBy.includes(searchReviewedBy.toLowerCase())
      ) {
        return false;
      }

      if (statusTab === "pending" && hasReview(submission)) {
        return false;
      }

      if (statusTab === "reviewed" && !hasReview(submission)) {
        return false;
      }

      return true;
    });

    next.sort((left, right) => {
      const delta = getSubmissionTime(right) - getSubmissionTime(left);
      return sortOrder === "oldest" ? -delta : delta;
    });

    return next;
  }, [
    searchClassCode,
    searchPhone,
    searchReviewedBy,
    searchStudent,
    searchTeacher,
    sortOrder,
    statusTab,
    subs,
  ]);

  const filteredSubmissionIds = useMemo(
    () => filteredSubs.map((submission) => submission.id),
    [filteredSubs]
  );
  const selectedVisibleIds = useMemo(
    () => filteredSubmissionIds.filter((submissionId) => selectedSubmissionIds.has(submissionId)),
    [filteredSubmissionIds, selectedSubmissionIds]
  );
  const allVisibleSelected =
    filteredSubmissionIds.length > 0 &&
    filteredSubmissionIds.every((submissionId) => selectedSubmissionIds.has(submissionId));

  useEffect(() => {
    setSelectedSubmissionIds((prev) => {
      const visibleIds = new Set(filteredSubmissionIds);
      const next = new Set([...prev].filter((submissionId) => visibleIds.has(submissionId)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSubmissionIds]);

  const resetFilters = () => {
    setSearchClassCode("");
    setSearchTeacher("");
    setSearchStudent("");
    setSearchPhone("");
    setSearchReviewedBy("");
    setStatusTab("all");
    setSortOrder("newest");
  };

  const toggleExpand = (submissionId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });
  };

  const toggleSelection = (submissionId) => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });
  };

  const toggleAllVisibleSelections = () => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredSubmissionIds.forEach((submissionId) => next.delete(submissionId));
      } else {
        filteredSubmissionIds.forEach((submissionId) => next.add(submissionId));
      }
      return next;
    });
  };

  const openDeleteConfirmation = (submission) => {
    if (!canDeleteSubmissions || deletingId === submission.id || bulkDeleting) {
      return;
    }
    setDeleteConfirm({ mode: "single", submission });
  };

  const openBulkDeleteConfirmation = () => {
    if (!canDeleteSubmissions || bulkDeleting || selectedVisibleIds.length === 0) {
      return;
    }
    setDeleteConfirm({ mode: "bulk", ids: [...selectedVisibleIds] });
  };

  const closeDeleteConfirmation = () => {
    if (bulkDeleting || (deleteConfirm?.mode === "single" && deletingId === deleteConfirm?.submission?.id)) {
      return;
    }
    setDeleteConfirm(null);
  };

  const pendingCount = subs.filter((submission) => !hasReview(submission)).length;
  const reviewedCount = subs.filter((submission) => hasReview(submission)).length;
  const workspaceLinks = useMemo(
    () => buildAdminWorkspaceLinks(navigate, "reading", undefined, "review"),
    [navigate]
  );
  const sidebarStats = useMemo(
    () => [
      {
        key: "total",
        label: "Total",
        value: subs.length,
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
        value: filteredSubs.length,
        bg: isDarkMode ? "rgba(37, 99, 235, 0.14)" : "#eef4ff",
        border: isDarkMode ? "rgba(96, 165, 250, 0.36)" : "#dbeafe",
        color: "#2563eb",
      },
    ],
    [filteredSubs.length, isDarkMode, pendingCount, reviewedCount, subs.length]
  );

  const clearDeepLinkParams = () => {
    if (!searchParams.get("submissionId") && !searchParams.get("action")) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("submissionId");
    nextParams.delete("action");
    setSearchParams(nextParams, { replace: true });
  };

  // Open feedback modal
  const openFeedbackModal = (sub) => {
    setSelectedSubmission(sub);
    setFeedbackText(sub.feedback || "");
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedSubmission(null);
    clearDeepLinkParams();
  };

  useEffect(() => {
    if (!searchParams.get("submissionId")) {
      deepLinkHandledRef.current = "";
    }
  }, [searchParams]);

  useEffect(() => {
    const submissionId = searchParams.get("submissionId");
    const action = searchParams.get("action");

    if (!submissionId || (action && action !== "feedback") || loading) {
      return;
    }

    const deepLinkKey = `${action || "feedback"}:${submissionId}`;
    if (deepLinkHandledRef.current === deepLinkKey) {
      return;
    }

    const matchedSubmission = subs.find(
      (submission) => String(submission.id) === String(submissionId)
    );

    if (!matchedSubmission) {
      clearDeepLinkParams();
      return;
    }

    deepLinkHandledRef.current = deepLinkKey;
    openFeedbackModal(matchedSubmission);
  }, [loading, searchParams, subs]);

  useEffect(() => {
    if (
      !selectedSubmission?.id ||
      typeof document === "undefined" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      document
        .getElementById(`reading-submission-row-${selectedSubmission.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedSubmission?.id]);

  // Save feedback
  const saveFeedback = async () => {
    if (!selectedSubmission) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(apiPath(`reading-submissions/${selectedSubmission.id}/feedback`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText, feedbackBy }),
      });
      if (!res.ok) throw new Error("Save failed");
      
      // Update local state
      setSubs((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? { ...s, feedback: feedbackText, feedbackBy, feedbackAt: new Date().toISOString() }
            : s
        )
      );
      closeFeedbackModal();
      alert("Feedback saved.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSavingFeedback(false);
    }
  };

  // Load analysis
  const loadAnalysis = async (sub) => {
    setSelectedSubmission(sub);
    setLoadingAnalysis(true);
    try {
      const res = await fetch(apiPath(`reading-submissions/${sub.id}/analysis`));
      const data = await res.json();
      setAnalysisData(data);
      setShowAnalysisModal(true);
    } catch (err) {
      alert("Could not load analysis: " + err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleExtendTime = async (sub, extraMinutes) => {
    setExtendingId(sub.id);
    try {
      const res = await authFetch(apiPath(`reading-submissions/${sub.id}/extend-time`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMinutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Time extension failed.");
      }

      setSubs((prev) =>
        prev.map((item) =>
          item.id === sub.id
            ? {
                ...item,
                finished: false,
                expiresAt: data?.expiresAt || item.expiresAt,
                lastSavedAt: new Date().toISOString(),
              }
            : item
        )
      );
      alert(data?.message || "Time extended.");
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  const handleDeleteSubmission = async (submission) => {
    if (!canDeleteSubmissions || deletingId === submission.id || bulkDeleting) {
      return false;
    }

    setDeletingId(submission.id);
    try {
      const res = await authFetch(apiPath(`admin/submissions/reading/${submission.id}`), {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Could not delete submission.");
      }

      setSubs((prev) => prev.filter((item) => item.id !== submission.id));
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
      setExpandedItems((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });

      if (selectedSubmission?.id === submission.id) {
        setShowFeedbackModal(false);
        setShowAnalysisModal(false);
        setAnalysisData(null);
        setSelectedSubmission(null);
        clearDeepLinkParams();
      }

      return true;
    } catch (err) {
      alert(err.message || "Could not delete submission.");
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async (submissionIds = selectedVisibleIds) => {
    if (!canDeleteSubmissions || bulkDeleting || submissionIds.length === 0) {
      return false;
    }

    setBulkDeleting(true);
    try {
      const res = await authFetch(apiPath("admin/submissions/bulk"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: submissionIds.map((submissionId) => ({
            type: "reading",
            id: submissionId,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Could not delete selected submissions.");
      }

      const deletedIds = new Set(submissionIds);
      setSubs((prev) => prev.filter((item) => !deletedIds.has(item.id)));
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });
      setExpandedItems((prev) => {
        const next = new Set(prev);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });

      if (selectedSubmission?.id && deletedIds.has(selectedSubmission.id)) {
        setShowFeedbackModal(false);
        setShowAnalysisModal(false);
        setAnalysisData(null);
        setSelectedSubmission(null);
        clearDeepLinkParams();
      }

      alert(data?.message || `Deleted ${submissionIds.length} submissions.`);
      return true;
    } catch (err) {
      alert(err.message || "Could not delete selected submissions.");
      return false;
    } finally {
      setBulkDeleting(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) {
      return false;
    }

    const didDelete =
      deleteConfirm.mode === "single"
        ? await handleDeleteSubmission(deleteConfirm.submission)
        : await handleBulkDelete(deleteConfirm.ids);

    if (didDelete) {
      setDeleteConfirm(null);
    }

    return didDelete;
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: "20px 14px", maxWidth: "100%", width: "100%", margin: "0 auto" }} className="admin-page admin-submission-page">
        <AdminStickySidebarLayout
          eyebrow="Reading"
          title="Reading submissions"
          description="Track IX Reading attempts, open feedback, and extension actions from one sticky control rail."
          sidebarContent={(
            <>
              <AdminSidebarPanel
                eyebrow="Workspace"
                title="Admin pages"
                meta="Quick jump"
              >
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel
                eyebrow="Summary"
                title="Queue status"
                meta={statusTab === "all" ? "All statuses" : statusTab}
              >
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Use the filters on the right to narrow the queue, then open any row to review scores, analysis, and feedback.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
          <SubmissionStatCards
            compact
            dense
            stats={[
              {
                label: "Total",
                count: subs.length,
                bg: "#eff6ff",
                color: "#1d4ed8",
                border: "#bfdbfe",
              },
              {
                label: "Pending",
                count: pendingCount,
                bg: "#fffbeb",
                color: "#92400e",
                border: "#fde68a",
              },
              {
                label: "Reviewed",
                count: reviewedCount,
                bg: "#f0fdf4",
                color: "#166534",
                border: "#bbf7d0",
              },
            ]}
          />

          <SubmissionFilterPanel
            compact
            dense
            fields={[
              {
                key: "student",
                label: "Student Name",
                placeholder: "Student name",
                value: searchStudent,
                onChange: setSearchStudent,
              },
              {
                key: "phone",
                label: "Phone",
                placeholder: "Phone number",
                value: searchPhone,
                onChange: setSearchPhone,
              },
              {
                key: "classCode",
                label: "Class Code",
                placeholder: "e.g. 148-IX-3A-S1",
                value: searchClassCode,
                onChange: setSearchClassCode,
              },
              {
                key: "teacher",
                label: "Test Teacher",
                placeholder: "Teacher name",
                value: searchTeacher,
                onChange: setSearchTeacher,
              },
              {
                key: "reviewedBy",
                label: "Reviewed By",
                placeholder: "Reviewer name",
                value: searchReviewedBy,
                onChange: setSearchReviewedBy,
              },
            ]}
            sortValue={sortOrder}
            onSortChange={setSortOrder}
            statusValue={statusTab}
            onStatusChange={setStatusTab}
            onReset={resetFilters}
            filteredCount={filteredSubs.length}
            totalCount={subs.length}
            summaryLabel="submissions"
            summaryHint="Click a row to view the score summary, feedback, and actions."
          />

          {canDeleteSubmissions && (
            <>
              <div style={selectionToolbarStyle}>
                <span style={selectionSummaryStyle}>
                  Showing <strong>{filteredSubs.length}</strong> visible submissions
                </span>
                <div style={selectionActionsStyle}>
                  {filteredSubs.length > 0 ? (
                    <button
                      type="button"
                      onClick={toggleAllVisibleSelections}
                      style={secondaryActionBtn}
                      disabled={bulkDeleting}
                    >
                      {allVisibleSelected ? "Unselect all" : "Select all visible"}
                    </button>
                  ) : null}
                  {selectedVisibleIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionIds(new Set())}
                      style={secondaryActionBtn}
                      disabled={bulkDeleting}
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedVisibleIds.length > 0 && (
                <div style={bulkBarStyle}>
                  <span style={{ fontSize: 12.5, lineHeight: 1.25 }}>
                    Selected <strong>{selectedVisibleIds.length}</strong> submissions
                  </span>
                  <button
                    type="button"
                    onClick={openBulkDeleteConfirmation}
                    style={dangerActionBtn}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting
                      ? "Deleting..."
                      : `Delete Selected (${selectedVisibleIds.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionIds(new Set())}
                    style={secondaryActionBtn}
                    disabled={bulkDeleting}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </>
          )}
          {loading && (
            <p style={statusMessageStyle}>
              <InlineIcon name="loading" size={16} />
              Loading...
            </p>
          )}
          {!loading && filteredSubs.length === 0 && (
            <p style={statusMessageStyle}>
              <InlineIcon name="empty" size={16} />
              No matching submissions found.
            </p>
          )}
          {!loading && filteredSubs.length > 0 && (
            <ExpandableSubmissionList
              compact
            items={filteredSubs}
            expandedItems={expandedItems}
            onToggle={toggleExpand}
            selectedId={selectedSubmission?.id}
            getItemDomId={(item) => `reading-submission-row-${item.id}`}
            getTone={(submission) =>
              getSubmissionTone(
                submission.finished === false
                  ? "active"
                  : hasReview(submission)
                  ? "reviewed"
                  : "pending",
                isDarkMode
              )
            }
            renderHeader={({ item: submission, index, tone }) => {
              const isDone = hasReview(submission);
              const isInProgress = submission.finished === false;
              const timingMeta = isInProgress
                ? getAttemptTimingMeta(submission.expiresAt)
                : null;
              const classCode =
                submission.ReadingTest?.classCode || submission.classCode || "N/A";
              const teacherName =
                submission.ReadingTest?.teacherName || submission.teacherName || "N/A";
              const studentName = submission.userName || "N/A";
              const phone = submission.User?.phone || submission.userPhone || "N/A";
              const title =
                submission.ReadingTest?.title || `Reading #${submission.testId || submission.id}`;
              const correctCount = Number(submission.correct) || 0;
              const totalCount = Number(submission.total) || 0;
              const scorePercentage = Number(submission.scorePercentage) || 0;

              return (
                <>
                  {canDeleteSubmissions && (
                    <label
                      style={selectionCheckboxLabelStyle}
                      onClick={stopSelectionEvent}
                      onMouseDown={stopSelectionEvent}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select submission #${submission.id}`}
                        checked={selectedSubmissionIds.has(submission.id)}
                        onChange={() => toggleSelection(submission.id)}
                        onClick={stopSelectionEvent}
                      />
                    </label>
                  )}
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
                    {isInProgress ? "In progress" : isDone ? "Reviewed" : "Pending"}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                    {studentName}
                  </span>
                  <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
                    {phone}
                  </span>
                  <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
                    {[title, classCode !== "N/A" ? classCode : null, teacherName !== "N/A" ? teacherName : null].filter(Boolean).join(" - ")}
                  </span>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: tone.panelBg,
                      color: tone.primaryText,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {correctCount}/{totalCount} ({scorePercentage}%)
                  </span>
                  <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
                    {isInProgress && timingMeta
                      ? `${timingMeta.label} • ${formatAttemptTimestamp(submission.lastSavedAt || submission.updatedAt || submission.createdAt)}`
                      : formatAttemptTimestamp(submission.createdAt)}
                  </span>
                </>
              );
            }}
            renderExpanded={({ item: submission, tone }) => {
              const isDone = hasReview(submission);
              const isInProgress = submission.finished === false;
              const timingMeta = isInProgress
                ? getAttemptTimingMeta(submission.expiresAt)
                : null;
              const classCode =
                submission.ReadingTest?.classCode || submission.classCode || "N/A";
              const teacherName =
                submission.ReadingTest?.teacherName || submission.teacherName || "N/A";
              const studentName = submission.userName || "N/A";
              const phone = submission.User?.phone || submission.userPhone || "N/A";
              const correctCount = Number(submission.correct) || 0;
              const totalCount = Number(submission.total) || 0;
              const scorePercentage = Number(submission.scorePercentage) || 0;
              const bandValue =
                submission.band != null && Number.isFinite(Number(submission.band))
                  ? Number(submission.band).toFixed(1)
                  : "N/A";

              return (
                <>
                  {isInProgress && (
                    <div
                      style={{
                        background: tone.calloutBg,
                        border: `1px solid ${tone.calloutBorder}`,
                        borderRadius: 7,
                        padding: 12,
                        marginTop: 12,
                        color: tone.calloutText,
                        fontSize: 13,
                      }}
                    >
                      This attempt is still open. The student has not submitted it yet.
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                        {timingMeta ? (
                          <span style={{ fontWeight: 700, color: timingMeta.color }}>
                            {timingMeta.label}
                          </span>
                        ) : null}
                        <span style={{ color: tone.secondaryText }}>
                          Saved: {formatAttemptTimestamp(submission.lastSavedAt || submission.updatedAt || submission.createdAt)}
                        </span>
                        <AttemptExtensionControls
                          isLoading={extendingId === submission.id}
                          onExtend={(minutes) => handleExtendTime(submission, minutes)}
                          buttonStyle={{
                            ...actionBtn,
                            background: "#0284c7",
                          }}
                          submitButtonStyle={{
                            ...actionBtn,
                            background: "#0369a1",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 12,
                      marginTop: 14,
                    }}
                  >
                    {[
                      { label: "Correct", value: correctCount, color: "#1d4ed8" },
                      { label: "Questions", value: totalCount, color: "#1d4ed8" },
                      {
                        label: "Accuracy",
                        value: `${scorePercentage}%`,
                        color:
                          scorePercentage >= 70
                            ? "#16a34a"
                            : scorePercentage >= 50
                            ? "#ca8a04"
                            : "#dc2626",
                      },
                      { label: "Band", value: bandValue, color: tone.primaryText },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          background: tone.panelBg,
                          borderRadius: 7,
                          padding: 12,
                          border: `1px solid ${tone.panelBorder}`,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 12, color: tone.mutedText }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    {[
                      { label: "Class Code", value: classCode },
                      { label: "Teacher", value: teacherName },
                      { label: "Student", value: studentName },
                      { label: "Phone", value: phone },
                      { label: "Submitted", value: formatAttemptTimestamp(submission.createdAt) },
                      {
                        label: "Feedback",
                        value: submission.feedbackBy || (isDone ? "Reviewed" : "Pending"),
                      },
                    ].map((entry) => (
                      <div
                        key={entry.label}
                        style={{
                          background: tone.panelBg,
                          borderRadius: 7,
                          padding: 12,
                          border: `1px solid ${tone.panelBorder}`,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: tone.mutedText, marginBottom: 4 }}>
                          {entry.label}
                        </div>
                        <div style={{ fontSize: 14, color: tone.primaryText }}>
                          {entry.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }} className="admin-action-buttons">
                    <button
                      onClick={() => navigate(`/reading-results/${submission.id}`)}
                      style={actionBtn}
                      title="View answer details"
                    >
                      <InlineIcon name="eye" size={14} />
                      Details
                    </button>
                    <button
                      onClick={() => loadAnalysis(submission)}
                      style={{ ...actionBtn, background: "#4f46e5" }}
                      title="View analysis"
                    >
                      <InlineIcon name="overview" size={14} />
                      Analysis
                    </button>
                    <button
                      onClick={() => openFeedbackModal(submission)}
                      style={{ ...actionBtn, background: submission.feedback ? "#16a34a" : "#ca8a04" }}
                      title="Add or edit feedback"
                    >
                      <InlineIcon name="feedback" size={14} />
                      Feedback
                    </button>
                    {canDeleteSubmissions && (
                      <button
                        onClick={() => openDeleteConfirmation(submission)}
                        style={{
                          ...actionBtn,
                          background: "#dc2626",
                          opacity:
                            deletingId === submission.id || bulkDeleting ? 0.72 : 1,
                          cursor:
                            deletingId === submission.id || bulkDeleting
                              ? "default"
                              : "pointer",
                        }}
                        title="Delete submission permanently"
                        disabled={deletingId === submission.id || bulkDeleting}
                      >
                        <InlineIcon name="trash" size={14} />
                        {deletingId === submission.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>

                  {submission.feedback ? (
                    <div
                      style={{
                        background: isDarkMode ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
                        border: `1px solid ${isDarkMode ? "rgba(34, 197, 94, 0.28)" : "#bbf7d0"}`,
                        borderRadius: 7,
                        padding: 12,
                        marginTop: 12,
                      }}
                    >
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: isDarkMode ? "#bbf7d0" : "#166534" }}>
                        <strong>Reviewed</strong> at {formatDateTime(submission.feedbackAt)} by <strong>{submission.feedbackBy || "Reviewed"}</strong>
                      </p>
                      <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 14, color: tone.primaryText }}>
                        {submission.feedback}
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: "12px 0 0", color: tone.mutedText, fontSize: 13 }}>
                      No teacher feedback yet.
                    </p>
                  )}
                </>
              );
            }}
          />
          )}
        </AdminStickySidebarLayout>
      </div>

      <AdminConfirmModal
        open={Boolean(deleteConfirm)}
        title={
          deleteConfirm?.mode === "bulk"
            ? `Delete ${deleteConfirm?.ids?.length || 0} Reading submissions?`
            : "Delete Reading submission?"
        }
        description={
          deleteConfirm?.mode === "bulk"
            ? "This removes the selected Reading submissions from the queue immediately and cannot be undone."
            : "This permanently removes the selected Reading submission, including saved feedback state for that record."
        }
        confirmLabel="Delete Permanently"
        busy={
          deleteConfirm?.mode === "bulk"
            ? bulkDeleting
            : deletingId === deleteConfirm?.submission?.id
        }
        busyLabel="Deleting..."
        onCancel={closeDeleteConfirmation}
        onConfirm={confirmDeleteAction}
        isDarkMode={isDarkMode}
        iconName="trash"
      >
        {deleteConfirm?.mode === "bulk" ? (
          <>
            <p style={confirmMetaHeadingStyle}>Selection summary</p>
            <p style={confirmMetaTextStyle}>
              <strong>{deleteConfirm?.ids?.length || 0}</strong> visible Reading submissions will be deleted.
            </p>
            <p style={confirmMetaTextStyle}>Any open feedback or analysis context tied to those records will disappear from this page after confirmation.</p>
          </>
        ) : (
          <>
            <p style={confirmMetaHeadingStyle}>Submission summary</p>
            <p style={confirmMetaTextStyle}>
              <strong>Student:</strong> {deleteConfirm?.submission?.userName || deleteConfirm?.submission?.User?.name || "Unknown student"}
            </p>
            <p style={confirmMetaTextStyle}>
              <strong>Test:</strong> {deleteConfirm?.submission?.ReadingTest?.title || `Reading #${deleteConfirm?.submission?.testId || deleteConfirm?.submission?.id || "--"}`}
            </p>
            <p style={confirmMetaTextStyle}>
              <strong>Submission ID:</strong> #{deleteConfirm?.submission?.id || "--"}
            </p>
          </>
        )}
      </AdminConfirmModal>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedSubmission && (
        <div style={modalOverlay(isDarkMode)} onClick={closeFeedbackModal}>
          <div style={modalContent(isDarkMode)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={modalTitleStyle}>
                <InlineIcon name="feedback" size={18} />
                Submission Feedback
              </h3>
              <button onClick={closeFeedbackModal} style={closeBtn(isDarkMode)}>
                <InlineIcon name="close" size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 15, padding: 15, background: isDarkMode ? "#0f172a" : "#f3f4f6", borderRadius: 8, border: isDarkMode ? "1px solid #2a3350" : "none" }}>
              <p><strong>Student:</strong> {selectedSubmission.userName || "N/A"}</p>
              <p><strong>Class Code:</strong> {selectedSubmission.ReadingTest?.classCode || "N/A"}</p>
              <p><strong>Score:</strong> {selectedSubmission.correct}/{selectedSubmission.total} ({selectedSubmission.scorePercentage}%) - Band {selectedSubmission.band}</p>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Reviewer:
              </label>
              <input
                type="text"
                value={feedbackBy}
                onChange={(e) => setFeedbackBy(e.target.value)}
                placeholder="Teacher name..."
                style={{ ...inputStyle, width: "100%", background: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#e5e7eb" : "#111827", borderColor: isDarkMode ? "#2a3350" : "#ccc" }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Feedback:
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Write feedback for the student..."
                rows={8}
                style={{ ...inputStyle, width: "100%", resize: "vertical", background: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#e5e7eb" : "#111827", borderColor: isDarkMode ? "#2a3350" : "#ccc" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={closeFeedbackModal}
                style={{ ...actionBtn, background: "#6b7280" }}
              >
                Cancel
              </button>
              <button
                onClick={saveFeedback}
                disabled={savingFeedback}
                style={{ ...actionBtn, background: "#16a34a" }}
              >
                {savingFeedback ? "Saving..." : (<><InlineIcon name="review" size={14} />Save Feedback</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && analysisData && (
        <div style={modalOverlay(isDarkMode)} onClick={() => setShowAnalysisModal(false)}>
          <div style={{ ...modalContent(isDarkMode), maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={modalTitleStyle}>
                <InlineIcon name="overview" size={18} />
                Detailed Analysis
              </h3>
              <button onClick={() => setShowAnalysisModal(false)} style={closeBtn(isDarkMode)}>
                <InlineIcon name="close" size={18} />
              </button>
            </div>

            {loadingAnalysis ? (
              <p style={statusMessageStyle}>
                <InlineIcon name="loading" size={16} />
                Loading...
              </p>
            ) : (
              <>
                {analysisData.analysisText && (
                  <pre style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    fontSize: 14,
                    lineHeight: 1.6,
                    background: isDarkMode ? "#0f172a" : "#f8fafc",
                    color: isDarkMode ? "#e5e7eb" : "#111827",
                    padding: 20,
                    borderRadius: 8,
                    border: isDarkMode ? "1px solid #2a3350" : "none",
                    maxHeight: 300,
                    overflow: "auto"
                  }}>
                    {analysisData.analysisText}
                  </pre>
                )}

                {analysisData.breakdown?.byType && (
                  <div style={{ marginTop: 20 }}>
                    <h4 style={sectionTitleStyle}>
                      <InlineIcon name="overview" size={16} />
                      By Question Type
                    </h4>
                    {analysisData.breakdown.byType.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: isDarkMode ? "1px solid #2a3350" : "1px solid #eee" }}>
                        <div style={{ flex: 1 }}>
                          <strong>{t.label}</strong>
                          <div style={{ fontSize: 12, color: isDarkMode ? "#9ca3af" : "#666" }}>{t.correct}/{t.total} correct</div>
                        </div>
                        <div style={{ width: 100, height: 8, background: isDarkMode ? "#1f2b47" : "#e5e7eb", borderRadius: 4, overflow: "hidden", marginRight: 10 }}>
                          <div style={{ width: `${t.percentage}%`, height: "100%", background: t.status === "good" ? "#22c55e" : t.status === "average" ? "#eab308" : "#ef4444" }} />
                        </div>
                        <div style={{ width: 50, textAlign: "right", fontWeight: "bold", color: t.status === "good" ? "#16a34a" : t.status === "average" ? "#ca8a04" : "#dc2626" }}>
                          {t.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {analysisData.breakdown?.weakAreas?.length > 0 && (
                  <div style={{ marginTop: 20, padding: 15, background: isDarkMode ? "#2a1b1b" : "#fef2f2", borderRadius: 8, border: isDarkMode ? "1px solid #4c1d1d" : "none" }}>
                    <h4 style={{ ...sectionTitleStyle, margin: "0 0 10px 0", color: isDarkMode ? "#fca5a5" : "#dc2626" }}>
                      <InlineIcon name="error" size={16} />
                      Needs Improvement
                    </h4>
                    {analysisData.breakdown.weakAreas.map((area, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <strong>{area.label}</strong> ({area.percentage}%)
                        <p style={{ margin: "5px 0 0 0", fontSize: 13, color: isDarkMode ? "#e5e7eb" : "#666" }}>{area.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setShowAnalysisModal(false)}
              style={{ ...actionBtn, width: "100%", marginTop: 20 }}
            >
              <InlineIcon name="close" size={14} />
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const getSubmissionRowStyle = (index, isHighlighted, isDarkMode) => ({
  borderBottom: `1px solid ${isDarkMode ? "#334155" : "#eee"}`,
  background: isHighlighted
    ? isDarkMode
      ? "rgba(245, 158, 11, 0.18)"
      : "#fff7cc"
    : index % 2 === 0
    ? isDarkMode
      ? "#0f172a"
      : "#fff"
    : isDarkMode
    ? "#111827"
    : "#f9f9f9",
  boxShadow: isHighlighted ? "inset 4px 0 0 #f59e0b" : "none",
  scrollMarginTop: "120px",
  transition: "background-color 180ms ease, box-shadow 180ms ease",
});

const cellStyle = { padding: 8, border: "1px solid #ddd", textAlign: "left" };
const inputStyle = { padding: 10, border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
const actionBtn = { padding: "6px 12px", background: "#0e276f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap" };
const statusMessageStyle = { display: "inline-flex", alignItems: "center", gap: 8 };
const feedbackStateStyle = (color) => ({ display: "inline-flex", alignItems: "center", gap: 6, color });
const inProgressStyle = { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1d4ed8" };
const modalTitleStyle = { margin: 0, display: "inline-flex", alignItems: "center", gap: 10 };
const sectionTitleStyle = { margin: "0 0 10px 0", display: "inline-flex", alignItems: "center", gap: 8 };
const selectionToolbarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" };
const selectionSummaryStyle = { fontSize: 13, color: "#475569" };
const selectionActionsStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const selectionCheckboxLabelStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" };
const bulkBarStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", color: "#7f1d1d" };
const secondaryActionBtn = { background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, lineHeight: 1.05 };
const dangerActionBtn = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, lineHeight: 1.05 };
const confirmMetaHeadingStyle = { margin: "0 0 10px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "inherit" };
const confirmMetaTextStyle = { margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: "inherit" };
const modalOverlay = (isDarkMode) => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: isDarkMode ? "rgba(2,6,23,0.7)" : "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});
const modalContent = (isDarkMode) => ({
  background: isDarkMode ? "#111827" : "white",
  color: isDarkMode ? "#e5e7eb" : "#111827",
  padding: 30,
  borderRadius: 12,
  maxWidth: 600,
  width: "90%",
  maxHeight: "80vh",
  overflow: "auto",
  border: isDarkMode ? "1px solid #2a3350" : "none",
  boxShadow: isDarkMode ? "0 20px 60px rgba(0,0,0,0.45)" : "0 20px 60px rgba(0,0,0,0.25)",
});
const closeBtn = (isDarkMode) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: isDarkMode ? "#e5e7eb" : "#111827",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 999,
});

export default AdminReadingSubmissions;

