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
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0e276f", color: "white" }}>
                <th style={cellStyle}>#</th>
                <th style={cellStyle}>Class Code</th>
                <th style={cellStyle}>Teacher</th>
                <th style={cellStyle}>Student</th>
                <th style={cellStyle}>Phone</th>
                <th style={cellStyle}>Score</th>
                <th style={cellStyle}>Band</th>
                <th style={cellStyle}>Feedback</th>
                <th style={cellStyle}>Submitted At</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((s, idx) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                  }}
                >
                  {(() => {
                    const timingMeta = s.finished === false ? getAttemptTimingMeta(s.expiresAt) : null;
                    return (
                      <>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>
                    {s.ListeningTest?.classCode || s.classCode || "N/A"}
                  </td>
                  <td style={cellStyle}>
                    {s.ListeningTest?.teacherName || s.teacherName || "N/A"}
                  </td>
                  <td style={cellStyle}>{s.userName || "N/A"}</td>
                  <td style={cellStyle}>{s.User?.phone || s.userPhone || "N/A"}</td>
                  <td style={cellStyle}>
                    {(() => {
                      const displayCorrect = Number.isFinite(Number(s.computedCorrect)) ? s.computedCorrect : (Number(s.correct) || 0);
                      const displayTotal = s.computedTotal || s.total || 40;
                      const displayPct = s.computedPercentage != null ? Number(s.computedPercentage) : (displayTotal ? Math.round((displayCorrect / displayTotal) * 100) : 0);
                      return (
                        <>
                          <span style={{ fontWeight: "bold" }}>
                            {displayCorrect}/{displayTotal}
                          </span>
                          <span style={{ color: "#666", fontSize: 12 }}>
                            {" "}({displayPct}%)
                          </span>
                        </>
                      );
                    })()}
                  </td>
                  <td style={cellStyle}>
                    {(() => {
                      // Prefer band computed from authoritative computedCorrect when available
                      const displayCorrect = Number.isFinite(Number(s.computedCorrect)) ? Number(s.computedCorrect) : (Number(s.correct) || null);
                      let bandVal = null;
                      if (Number.isFinite(displayCorrect)) {
                        // Use computed correct (reflects any rescore) to derive band
                        bandVal = bandFromCorrect(displayCorrect);
                      } else if (s.band != null && Number.isFinite(Number(s.band))) {
                        // Fallback to stored band if computed correct not available
                        bandVal = Number(s.band);
                      }

                      return (
                        <span
                          style={{
                            padding: "4px 8px",
                            background: "#111827",
                            color: "#fff",
                            borderRadius: 4,
                            fontWeight: "bold",
                          }}
                        >
                          {bandVal != null ? Number(bandVal).toFixed(1) : "N/A"}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={cellStyle}>
                    {s.feedback ? (
                      <span style={feedbackStateStyle("#16a34a")}>
                        <InlineIcon name="correct" size={14} />
                        {s.feedbackBy || "Reviewed"}
                      </span>
                    ) : (
                      <span style={feedbackStateStyle("#dc2626")}>
                        <InlineIcon name="error" size={14} />
                        Pending
                      </span>
                    )}
                  </td>
                  <td style={cellStyle}>
                    {s.finished === false ? (
                      <div>
                        <div style={inProgressStyle}>
                          <InlineIcon name="clock" size={14} />
                          In progress
                        </div>
                        <div style={{ fontSize: 12, color: timingMeta?.color || "#64748b" }}>
                          {timingMeta?.label || "No deadline yet"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Saved: {formatAttemptTimestamp(s.lastSavedAt || s.updatedAt || s.createdAt)}
                        </div>
                      </div>
                    ) : (
                      formatAttemptTimestamp(s.createdAt)
                    )}
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }} className="admin-action-buttons">
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
                        style={{ ...actionBtn, background: "#f59e0b" }}
                        title="Open feedback"
                      >
                        <InlineIcon name="feedback" size={14} />
                        Feedback
                      </button>
                      {s.finished === false && (
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
                      )}
                    </div>
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
            </table>
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

