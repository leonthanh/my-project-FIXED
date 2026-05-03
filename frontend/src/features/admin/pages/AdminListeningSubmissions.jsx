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
import { generateDetailsFromSections } from "../../listening/pages/ListeningResults";
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

// Small helpers (copied from ListeningResults) to safely parse test data
const safeParseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

const parseQuestionsDeep = (questions) => {
  let parsed = safeParseJson(questions);
  if (!Array.isArray(parsed)) return parsed;
  return parsed.map((q) => ({
    ...q,
    formRows: safeParseJson(q?.formRows),
    leftItems: safeParseJson(q?.leftItems),
    rightItems: safeParseJson(q?.rightItems),
    options: safeParseJson(q?.options),
    answers: safeParseJson(q?.answers),
  }));
};

// Local helper to compute band from correct count (mirror of listening results logic)
const bandFromCorrect = (c) => {
  if (c >= 39) return 9;
  if (c >= 37) return 8.5;
  if (c >= 35) return 8;
  if (c >= 32) return 7.5;
  if (c >= 30) return 7;
  if (c >= 26) return 6.5;
  if (c >= 23) return 6;
  if (c >= 18) return 5.5;
  if (c >= 16) return 5;
  if (c >= 13) return 4.5;
  if (c >= 11) return 4;
  return 3.5;
};

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

const AdminListeningSubmissions = () => {
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

  // Search/filter state
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchReviewedBy, setSearchReviewedBy] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [extendingId, setExtendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const currentUser = useMemo(() => getStoredUser(), []);
  const canDeleteSubmissions = currentUser?.role === "admin";

  useEffect(() => {
    const fetchSubs = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiPath("listening-submissions/admin/list"));
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        // Map submissions to compute a reliable total for display (prefer generated details when available)
        const mapped = (data || []).map((s) => {
          const parsedDetails = Array.isArray(s.details) ? s.details : (safeParseJson(s.details) || []);
          const parsedAnswers = safeParseJson(s.answers) || {};

          // Prefer server-provided computedTotal when present (added by backend admin list route)
          let computedTotal = Number(s.computedTotal) || Number(s.total) || (parsedDetails.length ? parsedDetails.length : 40);

          const testObj = s.ListeningTest
            ? {
                ...s.ListeningTest,
                partInstructions: safeParseJson(s.ListeningTest.partInstructions),
                questions: parseQuestionsDeep(s.ListeningTest.questions),
              }
            : null;

          // If we have full test data in the payload and answers, prefer generated details length
          if (testObj && parsedAnswers && typeof parsedAnswers === "object") {
            const generated = generateDetailsFromSections(testObj, parsedAnswers);
            if (generated.length && (parsedDetails.length !== computedTotal || parsedDetails.length < generated.length)) {
              computedTotal = generated.length;
            }
          }

          // Compute correct count: parsed details will be considered later when deciding preference

          // If we have full test data + answers, try to generate details and prefer that when more complete
          let generatedCorrect = null;
          let generatedLength = 0;
          if (testObj && parsedAnswers && typeof parsedAnswers === 'object') {
            const generated = generateDetailsFromSections(testObj, parsedAnswers);
            if (generated && generated.length) {
              generatedCorrect = generated.filter((d) => d.isCorrect).length;
              generatedLength = generated.length;
              // prefer generated length as computedTotal when it seems more complete
              if (generated.length && (parsedDetails.length !== computedTotal || parsedDetails.length < generated.length)) {
                computedTotal = generated.length;
              }
            }
          }

          // Prefer parsedDetails when it is as complete or more complete than generated; otherwise prefer generated result.
          const parsedCorrectFromDetails = Array.isArray(parsedDetails) && parsedDetails.length ? parsedDetails.filter((d) => d.isCorrect).length : null;
          const storedCorrect = Number.isFinite(Number(s.correct)) && Number(s.correct) > 0 ? Number(s.correct) : null;

          let computedCorrect;
          if (parsedCorrectFromDetails != null && (parsedDetails.length >= generatedLength || generatedLength === 0)) {
            computedCorrect = parsedCorrectFromDetails;
          } else if (generatedLength > 0) {
            computedCorrect = generatedCorrect != null ? generatedCorrect : (storedCorrect != null ? storedCorrect : (Number(s.correct) || 0));
          } else if (storedCorrect != null) {
            computedCorrect = storedCorrect;
          } else if (s.computedPercentage != null) {
            computedCorrect = Math.round((Number(s.computedPercentage) / 100) * computedTotal);
          } else {
            computedCorrect = Number(s.correct) || 0;
          }

          const percentage = s.computedPercentage != null ? Number(s.computedPercentage) : (computedTotal ? Math.round((computedCorrect / computedTotal) * 100) : 0);

          return { ...s, parsedDetails, computedTotal, computedPercentage: percentage, computedCorrect };

        });

        setSubs(mapped);

        // Enrich results for submissions that lack stored details but have answers
        // (these are typically unfinished attempts where backend did not compute details).
        const toEnrich = mapped.filter(s => {
          const parsedLen = (s.parsedDetails || []).length;
          const hasTestQuestions = !!(s.ListeningTest && s.ListeningTest.questions);
          // Enrich when answers exist and either test payload lacks questions (so we cannot generate),
          // or parsedDetails exist but look incomplete (less than computedTotal)
          return s.answers && (!hasTestQuestions || (parsedLen > 0 && parsedLen < (s.computedTotal || 40)) || parsedLen === 0);
        });

        if (toEnrich.length) {
          await Promise.all(
            toEnrich.map(async (s) => {
              try {
                // Prefer the authoritative submission endpoint which returns submission + test + generated details
                const subRes = await fetch(apiPath(`listening-submissions/${s.id}`));
                if (!subRes.ok) return null;
                const payload = await subRes.json().catch(() => null);
                const sub = payload?.submission || null;
                const testRaw = payload?.test || null;

                if (sub) {
                  const parsedDetails = Array.isArray(sub.details) ? sub.details : (safeParseJson(sub.details) || []);
                  const parsedAnswersFromSub = safeParseJson(sub.answers) || {};

                  if (parsedDetails.length) {
                    // If we also have test payload, check whether generated details would be more complete
                    if (testRaw) {
                      const testObjFromSub = {
                        ...testRaw,
                        partInstructions: safeParseJson(testRaw.partInstructions),
                        questions: parseQuestionsDeep(testRaw.questions),
                      };
                      const generatedFromSub = generateDetailsFromSections(testObjFromSub, parsedAnswersFromSub);
                      if (generatedFromSub && generatedFromSub.length > parsedDetails.length) {
                        s.computedCorrect = generatedFromSub.filter((d) => d.isCorrect).length;
                        s.computedTotal = generatedFromSub.length;
                        s.computedPercentage = s.computedTotal ? Math.round((s.computedCorrect / s.computedTotal) * 100) : 0;
                        return;
                      }
                    }

                    // Default: use stored details
                    s.computedCorrect = parsedDetails.filter((d) => d.isCorrect).length;
                    s.computedTotal = parsedDetails.length;
                    s.computedPercentage = s.computedTotal ? Math.round((s.computedCorrect / s.computedTotal) * 100) : 0;
                    return;
                  }
                }

                // Fallback: if submission endpoint did not provide details but test exists, try fetching test and generating locally
                const parsedAnswers = safeParseJson(s.answers) || {};
                const testObj = s.ListeningTest && s.ListeningTest.questions ? {
                  ...s.ListeningTest,
                  partInstructions: safeParseJson(s.ListeningTest.partInstructions),
                  questions: parseQuestionsDeep(s.ListeningTest.questions),
                } : (testRaw ? { ...testRaw, partInstructions: safeParseJson(testRaw.partInstructions), questions: parseQuestionsDeep(testRaw.questions) } : null);

                if (testObj) {
                  const generated = generateDetailsFromSections(testObj, parsedAnswers);
                  if (generated && generated.length) {
                    s.computedCorrect = generated.filter(d => d.isCorrect).length;
                    s.computedTotal = generated.length;
                    s.computedPercentage = s.computedTotal ? Math.round((s.computedCorrect / s.computedTotal) * 100) : 0;
                  }
                }
              } catch (e) {
                // ignore per-row errors
              }
            })
          );

          // Update state with enriched data
          setSubs((prev) => prev.map((x) => {
            const enriched = mapped.find((m) => m.id === x.id);
            if (enriched && (enriched.computedCorrect != null || enriched.computedTotal != null)) {
              return { ...x, computedCorrect: enriched.computedCorrect, computedTotal: enriched.computedTotal, computedPercentage: enriched.computedPercentage };
            }
            return x;
          }));
        }
      } catch (err) {
        console.error("Error fetching listening submissions:", err);
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
        submission?.ListeningTest?.classCode || submission?.classCode || ""
      ).toLowerCase();
      const teacherName = String(
        submission?.ListeningTest?.teacherName || submission?.teacherName || ""
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
    () => buildAdminWorkspaceLinks(navigate, "listening"),
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
        .getElementById(`listening-submission-row-${selectedSubmission.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedSubmission?.id]);

  const saveFeedback = async () => {
    if (!selectedSubmission) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(
        apiPath(`listening-submissions/${selectedSubmission.id}/feedback`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackText, feedbackBy }),
        }
      );
      if (!res.ok) throw new Error("Save failed");

      setSubs((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                feedback: feedbackText,
                feedbackBy,
                feedbackAt: new Date().toISOString(),
              }
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

  const handleExtendTime = async (sub, extraMinutes) => {
    setExtendingId(sub.id);
    try {
      const res = await authFetch(apiPath(`listening-submissions/${sub.id}/extend-time`), {
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
      const res = await authFetch(apiPath(`admin/submissions/listening/${submission.id}`), {
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
            type: "listening",
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

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isDarkMode ? "rgba(2,6,23,0.7)" : "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  };

  const modalContentStyle = {
    width: "min(720px, 92vw)",
    background: isDarkMode ? "#111827" : "white",
    color: isDarkMode ? "#e5e7eb" : "#111827",
    padding: 24,
    borderRadius: 10,
    border: isDarkMode ? "1px solid #2a3350" : "1px solid transparent",
    boxShadow: isDarkMode ? "0 20px 60px rgba(0,0,0,0.45)" : "0 20px 60px rgba(0,0,0,0.25)",
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: "20px 14px", maxWidth: "100%", width: "100%", margin: "0 auto" }} className="admin-page admin-submission-page">
        <AdminStickySidebarLayout
          eyebrow="Listening"
          title="Listening submissions"
          description="Review listening attempts, inspect score details, and open feedback actions from one sticky sidebar."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Workspace" title="Admin pages" meta="Quick jump">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel
                eyebrow="Summary"
                title="Queue status"
                meta={statusTab === "all" ? "All statuses" : statusTab}
              >
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Use the filters on the right to narrow the listening queue, then open a row to inspect timing, score, and teacher feedback.
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
            summaryHint="Click a row to view the score summary, timing state, feedback, and actions."
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
            getItemDomId={(item) => `listening-submission-row-${item.id}`}
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
                submission.ListeningTest?.classCode || submission.classCode || "N/A";
              const teacherName =
                submission.ListeningTest?.teacherName || submission.teacherName || "N/A";
              const studentName = submission.userName || submission.User?.name || "N/A";
              const phone = submission.User?.phone || submission.userPhone || "N/A";
              const title =
                submission.ListeningTest?.title || `Listening #${submission.testId || submission.id}`;
              const displayCorrect = Number.isFinite(Number(submission.computedCorrect))
                ? Number(submission.computedCorrect)
                : Number(submission.correct) || 0;
              const displayTotal = submission.computedTotal || submission.total || 40;
              const displayPct =
                submission.computedPercentage != null
                  ? Number(submission.computedPercentage)
                  : displayTotal
                  ? Math.round((displayCorrect / displayTotal) * 100)
                  : 0;

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
                    {displayCorrect}/{displayTotal} ({displayPct}%)
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
                submission.ListeningTest?.classCode || submission.classCode || "N/A";
              const teacherName =
                submission.ListeningTest?.teacherName || submission.teacherName || "N/A";
              const studentName = submission.userName || submission.User?.name || "N/A";
              const phone = submission.User?.phone || submission.userPhone || "N/A";
              const displayCorrect = Number.isFinite(Number(submission.computedCorrect))
                ? Number(submission.computedCorrect)
                : Number(submission.correct) || 0;
              const displayTotal = submission.computedTotal || submission.total || 40;
              const displayPct =
                submission.computedPercentage != null
                  ? Number(submission.computedPercentage)
                  : displayTotal
                  ? Math.round((displayCorrect / displayTotal) * 100)
                  : 0;
              let bandVal = null;
              if (Number.isFinite(displayCorrect)) {
                bandVal = bandFromCorrect(displayCorrect);
              } else if (
                submission.band != null &&
                Number.isFinite(Number(submission.band))
              ) {
                bandVal = Number(submission.band);
              }

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
                      { label: "Correct", value: displayCorrect, color: "#1d4ed8" },
                      { label: "Questions", value: displayTotal, color: "#1d4ed8" },
                      {
                        label: "Accuracy",
                        value: `${displayPct}%`,
                        color:
                          displayPct >= 70
                            ? "#16a34a"
                            : displayPct >= 50
                            ? "#ca8a04"
                            : "#dc2626",
                      },
                      {
                        label: "Band",
                        value: bandVal != null ? Number(bandVal).toFixed(1) : "N/A",
                        color: tone.primaryText,
                      },
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
                      onClick={() => navigate(`/listening-results/${submission.id}`)}
                      style={actionBtn}
                      title="View details"
                    >
                      <InlineIcon name="eye" size={14} />
                      Details
                    </button>
                    <button
                      onClick={() => openFeedbackModal(submission)}
                      style={{ ...actionBtn, background: submission.feedback ? "#16a34a" : "#ca8a04" }}
                      title="Open feedback"
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
                        <strong>Reviewed</strong> at {formatAttemptTimestamp(submission.feedbackAt || submission.updatedAt)} by <strong>{submission.feedbackBy || "Reviewed"}</strong>
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

          <AdminConfirmModal
            open={Boolean(deleteConfirm)}
            title={
              deleteConfirm?.mode === "bulk"
                ? `Delete ${deleteConfirm?.ids?.length || 0} Listening submissions?`
                : "Delete Listening submission?"
            }
            description={
              deleteConfirm?.mode === "bulk"
                ? "This removes the selected Listening submissions from the queue immediately and cannot be undone."
                : "This permanently removes the selected Listening submission and any teacher feedback attached to that record."
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
                  <strong>{deleteConfirm?.ids?.length || 0}</strong> visible Listening submissions will be deleted.
                </p>
                <p style={confirmMetaTextStyle}>Selected rows are removed from this queue immediately after confirmation.</p>
              </>
            ) : (
              <>
                <p style={confirmMetaHeadingStyle}>Submission summary</p>
                <p style={confirmMetaTextStyle}>
                  <strong>Student:</strong> {deleteConfirm?.submission?.userName || deleteConfirm?.submission?.User?.name || "Unknown student"}
                </p>
                <p style={confirmMetaTextStyle}>
                  <strong>Test:</strong> {deleteConfirm?.submission?.ListeningTest?.title || `Listening #${deleteConfirm?.submission?.testId || deleteConfirm?.submission?.id || "--"}`}
                </p>
                <p style={confirmMetaTextStyle}>
                  <strong>Submission ID:</strong> #{deleteConfirm?.submission?.id || "--"}
                </p>
              </>
            )}
          </AdminConfirmModal>

          {showFeedbackModal && selectedSubmission && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <h3 style={modalTitleStyle}>
                  <InlineIcon name="feedback" size={18} />
                  Listening Submission Feedback #{selectedSubmission.id}
                </h3>
                <button onClick={closeFeedbackModal} style={closeBtn(isDarkMode)}>
                  <InlineIcon name="close" size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Reviewer
                  </div>
                  <input
                    value={feedbackBy}
                    onChange={(e) => setFeedbackBy(e.target.value)}
                    style={{
                      ...inputStyle,
                      background: isDarkMode ? "#0f172a" : undefined,
                      color: isDarkMode ? "#e5e7eb" : undefined,
                      borderColor: isDarkMode ? "#2a3350" : undefined,
                    }}
                    placeholder="Teacher name"
                  />
                </label>

                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Feedback</div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    style={{
                      ...inputStyle,
                      minHeight: 140,
                      resize: "vertical",
                      background: isDarkMode ? "#0f172a" : undefined,
                      color: isDarkMode ? "#e5e7eb" : undefined,
                      borderColor: isDarkMode ? "#2a3350" : undefined,
                    }}
                    placeholder="Write feedback for the student..."
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  onClick={closeFeedbackModal}
                  style={{ ...actionBtn, background: "#6b7280" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveFeedback}
                  style={{ ...actionBtn, background: "#16a34a" }}
                  disabled={savingFeedback}
                >
                  {savingFeedback ? "Saving..." : (<><InlineIcon name="review" size={14} />Save</>)}
                </button>
              </div>
            </div>
          </div>
          )}
        </AdminStickySidebarLayout>
      </div>
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

const cellStyle = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  fontSize: 14,
};

const inputStyle = {
  padding: "10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const actionBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  color: "#fff",
  background: "#0e276f",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const statusMessageStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
const selectionToolbarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" };
const selectionSummaryStyle = { fontSize: 13, color: "#475569" };
const selectionActionsStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const selectionCheckboxLabelStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" };
const bulkBarStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "10px 12px", border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", color: "#7f1d1d" };
const secondaryActionBtn = { background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, lineHeight: 1.05 };
const dangerActionBtn = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, lineHeight: 1.05 };
const confirmMetaHeadingStyle = { margin: "0 0 10px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "inherit" };
const confirmMetaTextStyle = { margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: "inherit" };

const feedbackStateStyle = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color,
});

const inProgressStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 700,
  color: "#1d4ed8",
};

const modalTitleStyle = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
};

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

export default AdminListeningSubmissions;

