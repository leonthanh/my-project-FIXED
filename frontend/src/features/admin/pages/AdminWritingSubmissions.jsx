import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
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
  getAttemptTimingMeta,
} from "../utils/attemptTiming";

const omitRecordKey = (record, key) => {
  const next = { ...record };
  const keys = Array.isArray(key) ? key : [key];
  keys.forEach((entryKey) => {
    delete next[entryKey];
  });
  return next;
};

const stopSelectionEvent = (event) => {
  event.stopPropagation();
};

const AdminWritingSubmissions = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [bands, setBands] = useState({});
  const [messages, setMessages] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [sendLoading, setSendLoading] = useState({});
  const [hasSaved, setHasSaved] = useState({});

  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudentName, setSearchStudentName] = useState("");
  const [searchFeedbackBy, setSearchFeedbackBy] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("all");
  const [extendingId, setExtendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  let teacher = null;
  try {
    teacher = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
    teacher = null;
  }
  const canDeleteSubmissions = teacher?.role === "admin";

  useEffect(() => {
    fetch(apiPath("writing/list?includeDrafts=1"))
      .then((res) => res.json())
      .then((items) => {
        setData(items);
        setFilteredData(items);

        const savedMap = {};
        const feedbackMap = {};
        const bandMap = {};
        items.forEach((item) => {
          if (item.feedback && item.feedbackBy) {
            savedMap[item.id] = true;
          }
          if (item.feedback != null) {
            feedbackMap[item.id] = item.feedback;
          }
          if (item.bandTask1 != null || item.bandTask2 != null) {
            bandMap[item.id] = {
              task1: item.bandTask1 != null ? String(item.bandTask1) : "",
              task2: item.bandTask2 != null ? String(item.bandTask2) : "",
            };
          }
        });
        setFeedbacks(feedbackMap);
        setBands(bandMap);
        setHasSaved(savedMap);
      })
      .catch((err) => console.error("Failed to load writing submissions:", err));
  }, []);

  useEffect(() => {
    let filtered = data;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.classCode
          ?.toLowerCase()
          .includes(searchClassCode.toLowerCase())
      );
    }

    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.teacherName
          ?.toLowerCase()
          .includes(searchTeacher.toLowerCase())
      );
    }

    if (searchStudentName.trim()) {
      filtered = filtered.filter((item) =>
        item.userName?.toLowerCase().includes(searchStudentName.toLowerCase())
      );
    }

    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    if (filterStatus === "pending") {
      filtered = filtered.filter((item) => !item.feedback || !item.feedbackBy);
    }

    if (filterStatus === "reviewed") {
      filtered = filtered.filter((item) => !!(item.feedback && item.feedbackBy));
    }

    setFilteredData(filtered);
  }, [
    searchClassCode,
    searchTeacher,
    searchStudentName,
    searchFeedbackBy,
    filterStatus,
    data,
  ]);

  const filteredSubmissionIds = filteredData.map((item) => item.id);
  const selectedVisibleIds = filteredSubmissionIds.filter((submissionId) =>
    selectedSubmissionIds.has(submissionId)
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

  const toggleExpand = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelection = (submissionId) => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      next.has(submissionId) ? next.delete(submissionId) : next.add(submissionId);
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

  const openDeleteConfirmation = (item) => {
    if (!canDeleteSubmissions || deletingId === item.id || bulkDeleting) {
      return;
    }
    setDeleteConfirm({ mode: "single", submission: item });
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

  const resetFilters = () => {
    setSearchClassCode("");
    setSearchTeacher("");
    setSearchStudentName("");
    setSearchFeedbackBy("");
    setFilterStatus("all");
  };

  const computeOverall = (t1, t2) => {
    const n1 = parseFloat(t1);
    const n2 = parseFloat(t2);
    if (!isNaN(n1) && !isNaN(n2)) {
      return Math.round(((n2 * 2 + n1) / 3) * 2) / 2;
    }
    return "";
  };

  const handleSendFeedback = async (submissionId) => {
    const currentItem = data.find((item) => item.id === submissionId);
    const feedback = feedbacks[submissionId] ?? currentItem?.feedback ?? "";
    if (!feedback || !feedback.trim()) {
      alert("Please enter feedback.");
      return;
    }

    const bandEntry = bands[submissionId] || {};
    const bandTask1 = bandEntry.task1 !== undefined && bandEntry.task1 !== "" ? Number(bandEntry.task1) : null;
    const bandTask2 = bandEntry.task2 !== undefined && bandEntry.task2 !== "" ? Number(bandEntry.task2) : null;
    const bandOverall = bandTask1 !== null && bandTask2 !== null ? computeOverall(bandTask1, bandTask2) : null;

    setSendLoading((prev) => ({ ...prev, [submissionId]: true }));

    try {
      const res = await fetch(apiPath("writing/comment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          feedback,
          teacherName: teacher?.name || "Anonymous Teacher",
          bandTask1,
          bandTask2,
          bandOverall: bandOverall !== "" ? bandOverall : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.message || "Failed to send feedback.");
      }

      setMessages((prev) => ({
        ...prev,
        [submissionId]: currentItem?.feedback ? "Feedback updated successfully." : "Feedback sent successfully.",
      }));

      const bandEntry = bands[submissionId] || {};
      const bT1 = bandEntry.task1 !== undefined && bandEntry.task1 !== "" ? Number(bandEntry.task1) : null;
      const bT2 = bandEntry.task2 !== undefined && bandEntry.task2 !== "" ? Number(bandEntry.task2) : null;
      const bOv = bT1 !== null && bT2 !== null ? computeOverall(bT1, bT2) : null;
      const updated = data.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              feedback,
              feedbackBy: teacher?.name,
              feedbackAt: new Date().toISOString(),
              bandTask1: bT1,
              bandTask2: bT2,
              bandOverall: bOv !== "" ? bOv : null,
            }
          : item
      );
      setData(updated);
      setFeedbacks((prev) => ({ ...prev, [submissionId]: feedback }));
      setBands((prev) => ({
        ...prev,
        [submissionId]: {
          task1: bT1 != null ? String(bT1) : "",
          task2: bT2 != null ? String(bT2) : "",
        },
      }));
      setHasSaved((prev) => ({ ...prev, [submissionId]: true }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => ({
        ...prev,
        [submissionId]: "Failed to send feedback.",
      }));
    } finally {
      setSendLoading((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleAIComment = async (submission) => {
    setAiLoading((prev) => ({ ...prev, [submission.id]: true }));

    try {
      const aiRes = await fetch(apiPath("ai/generate-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1: submission.task1,
          task2: submission.task2,
        }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        throw new Error(aiData?.error || "AI could not generate feedback.");
      }

      if (aiData.suggestion) {
        setFeedbacks((prev) => ({
          ...prev,
          [submission.id]: aiData.suggestion,
        }));

        const statusMessage = aiData.cached
          ? aiData.source === "gemini"
            ? "Loaded cached Gemini AI feedback."
            : "Loaded cached AI feedback."
          : aiData.source === "gemini"
          ? aiData.upstreamProvider === "openai" && aiData.upstreamStatus === 429
            ? "OpenAI returned 429. Gemini generated the AI feedback instead."
            : aiData.upstreamProvider === "openai"
            ? "OpenAI was unavailable. Gemini generated the AI feedback instead."
            : "Gemini generated AI feedback."
          : aiData.fallback
          ? aiData.warning ||
            "OpenAI and Gemini are currently unavailable. The system generated fallback feedback so marking can continue."
          : "AI feedback generated.";

        setMessages((prev) => ({
          ...prev,
          [submission.id]: statusMessage,
        }));
      } else {
        alert(aiData.error || "AI could not generate feedback.");
      }
    } catch (err) {
      console.error("AI error:", err);
      alert("Could not connect to the AI service.");
    } finally {
      setAiLoading((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleExtendDraft = async (submissionId, extraMinutes) => {
    setExtendingId(submissionId);
    try {
      const res = await authFetch(apiPath(`writing/draft/${submissionId}/extend-time`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMinutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gia hạn thất bại");
      }

      setData((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                isDraft: true,
                draftEndAt: data?.draftEndAt || item.draftEndAt,
                draftSavedAt: new Date().toISOString(),
                timeLeft: data?.timeLeft ?? item.timeLeft,
              }
            : item
        )
      );
      alert(data?.message || "Đã gia hạn thời gian.");
      return true;
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  const handleDeleteSubmission = async (item) => {
    if (!canDeleteSubmissions || deletingId === item.id || bulkDeleting) {
      return false;
    }

    setDeletingId(item.id);
    try {
      const res = await authFetch(apiPath(`admin/submissions/writing/${item.id}`), {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Could not delete submission.");
      }

      setData((prev) => prev.filter((entry) => entry.id !== item.id));
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setExpandedItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setFeedbacks((prev) => omitRecordKey(prev, item.id));
      setBands((prev) => omitRecordKey(prev, item.id));
      setMessages((prev) => omitRecordKey(prev, item.id));
      setAiLoading((prev) => omitRecordKey(prev, item.id));
      setSendLoading((prev) => omitRecordKey(prev, item.id));
      setHasSaved((prev) => omitRecordKey(prev, item.id));

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
            type: "writing",
            id: submissionId,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Could not delete selected submissions.");
      }

      const deletedIds = new Set(submissionIds);
      setData((prev) => prev.filter((entry) => !deletedIds.has(entry.id)));
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
      setFeedbacks((prev) => omitRecordKey(prev, submissionIds));
      setBands((prev) => omitRecordKey(prev, submissionIds));
      setMessages((prev) => omitRecordKey(prev, submissionIds));
      setAiLoading((prev) => omitRecordKey(prev, submissionIds));
      setSendLoading((prev) => omitRecordKey(prev, submissionIds));
      setHasSaved((prev) => omitRecordKey(prev, submissionIds));

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

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return "Unknown";
    return `${d.getHours()}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")} on ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const pendingCount = data.filter((item) => !item.feedback || !item.feedbackBy).length;
  const reviewedCount = data.filter((item) => !!(item.feedback && item.feedbackBy)).length;
  const workspaceLinks = buildAdminWorkspaceLinks(navigate, "writing");
  const sidebarStats = [
    {
      key: "total",
      label: "Total",
      value: data.length,
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
      value: filteredData.length,
      bg: "#f5f3ff",
      border: "#ddd6fe",
      color: "#6d28d9",
    },
  ];

  return (
    <>
      <AdminNavbar />
      <div
        style={{ maxWidth: "100%", width: "100%", margin: "0 auto", padding: "22px 14px" }}
        className="admin-page admin-submission-page"
      >
        <AdminStickySidebarLayout
          eyebrow="Writing"
          title="Writing submissions"
          description="Review essay drafts, final submissions, AI suggestions, and teacher feedback from one sticky sidebar."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Workspace" title="Admin pages" meta="Quick jump">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel
                eyebrow="Summary"
                title="Queue status"
                meta={filterStatus === "all" ? "All statuses" : filterStatus}
              >
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Filter the queue on the right, then open any row to review both tasks, set bands, and send teacher or AI-assisted feedback.
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
                count: data.length,
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
            compactPrimaryFieldCount={3}
            fields={[
              {
                key: "student",
                label: "Student Name",
                placeholder: "Student name",
                value: searchStudentName,
                onChange: setSearchStudentName,
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
                value: searchFeedbackBy,
                onChange: setSearchFeedbackBy,
              },
            ]}
            statusValue={filterStatus}
            onStatusChange={setFilterStatus}
            onReset={resetFilters}
            filteredCount={filteredData.length}
            totalCount={data.length}
            summaryLabel="submissions"
            summaryHint="Click a row to view the writing response, rubric bands, and feedback actions."
          />

          {canDeleteSubmissions && (
            <>
              <div style={selectionToolbarStyle}>
                <span style={selectionSummaryStyle}>
                  Showing <strong>{filteredData.length}</strong> visible submissions
                </span>
                <div style={selectionActionsStyle}>
                  {filteredData.length > 0 ? (
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
          {filteredData.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 15,
              }}
            >
              No matching submissions found.
            </div>
          )}

          {filteredData.length > 0 && (
            <ExpandableSubmissionList
          compact
          items={filteredData}
          expandedItems={expandedItems}
          onToggle={toggleExpand}
          getTone={(item) =>
            getSubmissionTone(
              item.isDraft
                ? "draft"
                : !!(item.feedback && item.feedbackBy) || !!hasSaved[item.id]
                ? "reviewed"
                : "pending"
            )
          }
          renderHeader={({ item, index, tone }) => {
            const isDone = !!(item.feedback && item.feedbackBy) || !!hasSaved[item.id];
            const isDraft = !!item.isDraft;
            const timingMeta = isDraft ? getAttemptTimingMeta(item.draftEndAt) : null;
            const testLabel = [
              item.WritingTest?.testType === "pet-writing" ? "PET Writing" : "Writing",
              item.WritingTest?.index,
              item.WritingTest?.classCode,
              item.WritingTest?.teacherName,
            ]
              .filter(Boolean)
              .join(" - ");

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
                      aria-label={`Select submission #${item.id}`}
                      checked={selectedSubmissionIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
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
                  {isDraft ? "Draft not submitted" : isDone ? "Reviewed" : "Pending"}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                  {item.userName || "N/A"}
                </span>
                <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 100 }}>
                  {item.userPhone || "N/A"}
                </span>
                <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 180 }}>
                  {testLabel || "N/A"}
                </span>
                <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: "nowrap" }}>
                  {isDraft && timingMeta
                    ? `${timingMeta.label} • ${formatDateTime(item.draftSavedAt || item.updatedAt || item.createdAt)}`
                    : formatDateTime(item.createdAt)}
                </span>
              </>
            );
          }}
          renderExpanded={({ item, tone }) => {
            const isDone = !!(item.feedback && item.feedbackBy) || !!hasSaved[item.id];
            const isDraft = !!item.isDraft;
            const timingMeta = isDraft ? getAttemptTimingMeta(item.draftEndAt) : null;

            return (
              <>
                {isDraft && (
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
                    This is an autosaved draft that has not been submitted. The student must sign in again and click Submit to finalize it.
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                      {timingMeta && (
                        <span style={{ fontWeight: 700, color: timingMeta.color }}>
                          {timingMeta.label}
                        </span>
                      )}
                      <span style={{ color: tone.secondaryText }}>
                        Saved: {formatDateTime(item.draftSavedAt || item.updatedAt || item.createdAt)}
                      </span>
                      <AttemptExtensionControls
                        isLoading={extendingId === item.id}
                        onExtend={(minutes) => handleExtendDraft(item.id, minutes)}
                        buttonStyle={{
                          padding: "7px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: "#0284c7",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        inputStyle={{
                          borderColor: "#93c5fd",
                        }}
                        submitButtonStyle={{
                          padding: "7px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: "#0369a1",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        errorStyle={{ color: "#b91c1c" }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 14,
                  }}
                  className="admin-task-grid"
                >
                  <div style={{ background: tone.panelBg, borderRadius: 7, padding: 12, border: `1px solid ${tone.panelBorder}` }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: tone.secondaryText,
                        marginBottom: 6,
                      }}
                    >
                      Task 1
                    </div>
                    <p
                      style={{
                        margin: 0,
                        whiteSpace: "pre-line",
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: tone.primaryText,
                      }}
                    >
                      {item.task1 || "(empty)"}
                    </p>
                  </div>
                  <div style={{ background: tone.panelBg, borderRadius: 7, padding: 12, border: `1px solid ${tone.panelBorder}` }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: tone.secondaryText,
                        marginBottom: 6,
                      }}
                    >
                      Task 2
                    </div>
                    <p
                      style={{
                        margin: 0,
                        whiteSpace: "pre-line",
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: tone.primaryText,
                      }}
                    >
                      {item.task2 || "(empty)"}
                    </p>
                  </div>
                </div>

                {item.feedback && item.feedbackAt && item.feedbackBy && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 7,
                      padding: 12,
                      marginTop: 12,
                    }}
                  >
                    <p style={{ margin: "0 0 6px", fontSize: 13, color: "#166534" }}>
                      <strong>Reviewed</strong> at {formatDateTime(item.feedbackAt)} by <strong>{item.feedbackBy}</strong>
                    </p>
                    {(item.bandTask1 != null || item.bandTask2 != null || item.bandOverall != null) && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        {item.bandTask1 != null && (
                          <span style={{ background: "#0e276f", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                            Task 1: {item.bandTask1}
                          </span>
                        )}
                        {item.bandTask2 != null && (
                          <span style={{ background: "#0e276f", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                            Task 2: {item.bandTask2}
                          </span>
                        )}
                        {item.bandOverall != null && (
                          <span style={{ background: "#16a34a", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                            Overall: {item.bandOverall}
                          </span>
                        )}
                      </div>
                    )}
                    <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 14, color: tone.primaryText }}>
                      {item.feedback}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  {!isDraft && (
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: tone.secondaryText }}>Band Task 1</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="9"
                          placeholder="e.g. 6.5"
                          value={(bands[item.id]?.task1) ?? (item.bandTask1 != null ? String(item.bandTask1) : "")}
                          onChange={(e) => setBands((prev) => ({ ...prev, [item.id]: { ...prev[item.id], task1: e.target.value } }))}
                          style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: tone.secondaryText }}>Band Task 2</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="9"
                          placeholder="e.g. 6.5"
                          value={(bands[item.id]?.task2) ?? (item.bandTask2 != null ? String(item.bandTask2) : "")}
                          onChange={(e) => setBands((prev) => ({ ...prev, [item.id]: { ...prev[item.id], task2: e.target.value } }))}
                          style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: tone.secondaryText }}>
                          Band Overall <span style={{ fontWeight: 400, color: tone.subtleText }}>(tự tính)</span>
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={computeOverall(
                            (bands[item.id]?.task1) ?? (item.bandTask1 != null ? item.bandTask1 : ""),
                            (bands[item.id]?.task2) ?? (item.bandTask2 != null ? item.bandTask2 : "")
                          )}
                          style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                        />
                      </div>
                    </div>
                  )}
                  <textarea
                    placeholder={
                      isDraft
                        ? "This draft has not been submitted yet, so feedback cannot be sent."
                        : "Teacher feedback..."
                    }
                    rows={4}
                    style={{
                      width: "100%",
                      padding: 10,
                      boxSizing: "border-box",
                      fontSize: 14,
                      border: "1px solid #d1d5db",
                      borderRadius: 7,
                      resize: "vertical",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                    value={feedbacks[item.id] ?? item.feedback ?? ""}
                    disabled={isDraft}
                    onChange={(e) =>
                      setFeedbacks((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                  <div
                    style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}
                    className="admin-button-row"
                  >
                    <button
                      onClick={() => handleSendFeedback(item.id)}
                      disabled={
                        isDraft ||
                        sendLoading[item.id] ||
                        aiLoading[item.id]
                      }
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor:
                          isDraft || sendLoading[item.id] || aiLoading[item.id]
                            ? "default"
                            : "pointer",
                        background:
                          isDraft ||
                          sendLoading[item.id] ||
                          aiLoading[item.id]
                            ? "#9ca3af"
                            : "#0e276f",
                        color: "#fff",
                      }}
                    >
                      {isDraft
                        ? "Wait for student submission"
                        : sendLoading[item.id]
                        ? "Sending..."
                        : hasSaved[item.id]
                        ? "Update Feedback"
                        : "Send Feedback"}
                    </button>
                    <button
                      onClick={() => handleAIComment(item)}
                      disabled={
                        isDraft ||
                        aiLoading[item.id] ||
                        sendLoading[item.id] ||
                        hasSaved[item.id]
                      }
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: isDraft || aiLoading[item.id] ? "not-allowed" : "pointer",
                        background:
                          isDraft ||
                          aiLoading[item.id] ||
                          sendLoading[item.id] ||
                          hasSaved[item.id]
                            ? "#9ca3af"
                            : "#ee0033",
                        color: "#fff",
                      }}
                    >
                      {isDraft
                        ? "Wait for student submission"
                        : aiLoading[item.id]
                        ? "Generating..."
                        : "AI Feedback"}
                    </button>
                    {canDeleteSubmissions && (
                      <button
                        onClick={() => openDeleteConfirmation(item)}
                        disabled={deletingId === item.id || bulkDeleting}
                        style={{
                          padding: "9px 16px",
                          border: "none",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor:
                            deletingId === item.id || bulkDeleting
                              ? "default"
                              : "pointer",
                          background: "#dc2626",
                          color: "#fff",
                          minWidth: 132,
                          opacity: deletingId === item.id || bulkDeleting ? 0.72 : 1,
                        }}
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                  {messages[item.id] && (
                    <p style={{ marginTop: 6, color: "#16a34a", fontSize: 13 }}>
                      {messages[item.id]}
                    </p>
                  )}
                </div>
              </>
            );
          }}
        />
          )}
        </AdminStickySidebarLayout>

        <AdminConfirmModal
          open={Boolean(deleteConfirm)}
          title={
            deleteConfirm?.mode === "bulk"
              ? `Delete ${deleteConfirm?.ids?.length || 0} Writing submissions?`
              : "Delete Writing submission?"
          }
          description={
            deleteConfirm?.mode === "bulk"
              ? "This removes the selected Writing submissions from the queue immediately and cannot be undone."
              : "This permanently removes the selected Writing record, including saved bands, AI notes, and teacher feedback for that submission."
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
          iconName="trash"
        >
          {deleteConfirm?.mode === "bulk" ? (
            <>
              <p style={confirmMetaHeadingStyle}>Selection summary</p>
              <p style={confirmMetaTextStyle}>
                <strong>{deleteConfirm?.ids?.length || 0}</strong> visible Writing submissions will be deleted.
              </p>
              <p style={confirmMetaTextStyle}>Any draft, feedback, and saved band state tied to those records will be removed from this queue.</p>
            </>
          ) : (
            <>
              <p style={confirmMetaHeadingStyle}>Submission summary</p>
              <p style={confirmMetaTextStyle}>
                <strong>Student:</strong> {deleteConfirm?.submission?.userName || "Unknown student"}
              </p>
              <p style={confirmMetaTextStyle}>
                <strong>Status:</strong> {deleteConfirm?.submission?.isDraft ? "Draft not submitted" : "Submitted"}
              </p>
              <p style={confirmMetaTextStyle}>
                <strong>Submission ID:</strong> #{deleteConfirm?.submission?.id || "--"}
              </p>
            </>
          )}
        </AdminConfirmModal>
      </div>
    </>
  );
};

export default AdminWritingSubmissions;

const selectionToolbarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" };
const selectionSummaryStyle = { fontSize: 13, color: "#475569" };
const selectionActionsStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const selectionCheckboxLabelStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" };
const bulkBarStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", color: "#7f1d1d" };
const secondaryActionBtn = { background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, lineHeight: 1.05 };
const dangerActionBtn = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, lineHeight: 1.05 };
const confirmMetaHeadingStyle = { margin: "0 0 10px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "inherit" };
const confirmMetaTextStyle = { margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: "inherit" };
