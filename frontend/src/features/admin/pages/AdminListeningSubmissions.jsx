import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath, authFetch } from "../../../shared/utils/api";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
import SubmissionTypeTabs from "../components/SubmissionTypeTabs";
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
  const [expandedItems, setExpandedItems] = useState(new Set());

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

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch (err) {
      localStorage.removeItem("user");
      user = null;
    }
    if (user?.name) setFeedbackBy(user.name);
  }, []);

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

  const pendingCount = subs.filter((submission) => !hasReview(submission)).length;
  const reviewedCount = subs.filter((submission) => hasReview(submission)).length;

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
      <div style={{ padding: 24, maxWidth: "100%", width: "100%", margin: "0 auto" }} className="admin-page admin-submission-page">
        <SubmissionTypeTabs activeKey="listening" />

        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {[
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
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.bg,
                border: `1px solid ${stat.border}`,
                borderRadius: 8,
                padding: "8px 18px",
                minWidth: 110,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                {stat.count}
              </div>
              <div style={{ fontSize: 12, color: stat.color, opacity: 0.85 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <SubmissionFilterPanel
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
        />

        <p style={{ fontSize: 13, color: isDarkMode ? "#94a3b8" : "#6b7280", marginBottom: 12 }}>
          Click a row to view the score summary, feedback, and actions.
        </p>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredSubs.map((s, idx) => {
              const isHighlighted = String(selectedSubmission?.id || "") === String(s.id);
              const isExpanded = expandedItems.has(s.id);
              const isDone = hasReview(s);
              const isInProgress = s.finished === false;
              const timingMeta = isInProgress ? getAttemptTimingMeta(s.expiresAt) : null;
              const classCode = s.ListeningTest?.classCode || s.classCode || "N/A";
              const teacherName = s.ListeningTest?.teacherName || s.teacherName || "N/A";
              const studentName = s.userName || s.User?.name || "N/A";
              const phone = s.User?.phone || s.userPhone || "N/A";
              const title = s.ListeningTest?.title || `Listening #${s.testId || s.id}`;
              const displayCorrect = Number.isFinite(Number(s.computedCorrect)) ? Number(s.computedCorrect) : (Number(s.correct) || 0);
              const displayTotal = s.computedTotal || s.total || 40;
              const displayPct = s.computedPercentage != null ? Number(s.computedPercentage) : (displayTotal ? Math.round((displayCorrect / displayTotal) * 100) : 0);
              let bandVal = null;
              if (Number.isFinite(displayCorrect)) {
                bandVal = bandFromCorrect(displayCorrect);
              } else if (s.band != null && Number.isFinite(Number(s.band))) {
                bandVal = Number(s.band);
              }
              const tone = isInProgress
                ? {
                    border: "#bfdbfe",
                    accent: "#2563eb",
                    chipBg: "#dbeafe",
                    chipColor: "#1e3a8a",
                    calloutBg: isDarkMode ? "rgba(37, 99, 235, 0.12)" : "#eff6ff",
                    calloutBorder: "#bfdbfe",
                  }
                : isDone
                ? {
                    border: "#bbf7d0",
                    accent: "#16a34a",
                    chipBg: "#dcfce7",
                    chipColor: "#166534",
                    calloutBg: isDarkMode ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
                    calloutBorder: "#bbf7d0",
                  }
                : {
                    border: "#fed7aa",
                    accent: "#f59e0b",
                    chipBg: "#fef3c7",
                    chipColor: "#92400e",
                    calloutBg: isDarkMode ? "rgba(245, 158, 11, 0.12)" : "#fff7ed",
                    calloutBorder: "#fed7aa",
                  };

              return (
                <div
                  key={s.id}
                  id={`listening-submission-row-${s.id}`}
                  style={{
                    border: `1px solid ${isHighlighted ? "#f59e0b" : tone.border}`,
                    borderLeft: `4px solid ${isHighlighted ? "#f59e0b" : tone.accent}`,
                    borderRadius: 8,
                    background: isDarkMode ? "#111827" : "#fff",
                    overflow: "hidden",
                    boxShadow: isHighlighted ? "0 0 0 2px rgba(245, 158, 11, 0.18)" : "0 1px 3px rgba(0,0,0,0.05)",
                    scrollMarginTop: "120px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      cursor: "pointer",
                      userSelect: "none",
                      flexWrap: "wrap",
                    }}
                    onClick={() => toggleExpand(s.id)}
                  >
                    <span style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#9ca3af", minWidth: 28 }}>
                      #{idx + 1}
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
                    <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: isDarkMode ? "#f8fafc" : "#111827" }}>
                      {studentName}
                    </span>
                    <span style={{ fontSize: 13, color: isDarkMode ? "#cbd5e1" : "#6b7280", minWidth: 110 }}>
                      {phone}
                    </span>
                    <span style={{ fontSize: 13, color: isDarkMode ? "#e5e7eb" : "#374151", flex: 1, minWidth: 220 }}>
                      {[title, classCode !== "N/A" ? classCode : null, teacherName !== "N/A" ? teacherName : null].filter(Boolean).join(" - ")}
                    </span>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: isDarkMode ? "#0f172a" : "#f3f4f6",
                        color: isDarkMode ? "#f8fafc" : "#111827",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {displayCorrect}/{displayTotal} ({displayPct}%)
                    </span>
                    <span style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#9ca3af", whiteSpace: "nowrap" }}>
                      {isInProgress && timingMeta
                        ? `${timingMeta.label} • ${formatAttemptTimestamp(s.lastSavedAt || s.updatedAt || s.createdAt)}`
                        : formatAttemptTimestamp(s.createdAt)}
                    </span>
                    <span style={{ fontSize: 16, color: isDarkMode ? "#94a3b8" : "#9ca3af", marginLeft: 4 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 14px 16px", borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#f3f4f6"}` }}>
                      {isInProgress && (
                        <div
                          style={{
                            background: tone.calloutBg,
                            border: `1px solid ${tone.calloutBorder}`,
                            borderRadius: 7,
                            padding: 12,
                            marginTop: 12,
                            color: isDarkMode ? "#dbeafe" : "#1e3a8a",
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
                            <span style={{ color: isDarkMode ? "#bfdbfe" : "#475569" }}>
                              Saved: {formatAttemptTimestamp(s.lastSavedAt || s.updatedAt || s.createdAt)}
                            </span>
                            <AttemptExtensionControls
                              isLoading={extendingId === s.id}
                              onExtend={(minutes) => handleExtendTime(s, minutes)}
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
                          { label: "Accuracy", value: `${displayPct}%`, color: displayPct >= 70 ? "#16a34a" : displayPct >= 50 ? "#ca8a04" : "#dc2626" },
                          { label: "Band", value: bandVal != null ? Number(bandVal).toFixed(1) : "N/A", color: "#111827" },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            style={{
                              background: isDarkMode ? "#0f172a" : "#f8fafc",
                              borderRadius: 7,
                              padding: 12,
                              border: `1px solid ${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
                              textAlign: "center",
                            }}
                          >
                            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                              {stat.value}
                            </div>
                            <div style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#6b7280" }}>
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
                          { label: "Submitted", value: formatAttemptTimestamp(s.createdAt) },
                          { label: "Feedback", value: s.feedbackBy || (isDone ? "Reviewed" : "Pending") },
                        ].map((item) => (
                          <div
                            key={item.label}
                            style={{
                              background: isDarkMode ? "#0f172a" : "#f8fafc",
                              borderRadius: 7,
                              padding: 12,
                              border: `1px solid ${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? "#94a3b8" : "#6b7280", marginBottom: 4 }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: 14, color: isDarkMode ? "#f8fafc" : "#111827" }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }} className="admin-action-buttons">
                        <button
                          onClick={() => navigate(`/listening-results/${s.id}`)}
                          style={actionBtn}
                          title="View details"
                        >
                          <InlineIcon name="eye" size={14} />
                          Details
                        </button>
                        <button
                          onClick={() => openFeedbackModal(s)}
                          style={{ ...actionBtn, background: s.feedback ? "#16a34a" : "#ca8a04" }}
                          title="Open feedback"
                        >
                          <InlineIcon name="feedback" size={14} />
                          Feedback
                        </button>
                      </div>

                      {s.feedback ? (
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
                            <strong>Reviewed</strong> at {formatAttemptTimestamp(s.feedbackAt || s.updatedAt)} by <strong>{s.feedbackBy || "Reviewed"}</strong>
                          </p>
                          <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 14, color: isDarkMode ? "#e5e7eb" : "#111827" }}>
                            {s.feedback}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: "12px 0 0", color: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 13 }}>
                          No teacher feedback yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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

