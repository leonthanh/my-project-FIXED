import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath, authFetch } from "../../../shared/utils/api";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
import SubmissionTypeTabs from "../components/SubmissionTypeTabs";
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

  // Search/filter state
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchReviewedBy, setSearchReviewedBy] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

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

    // Load teacher name from localStorage
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

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: 24, maxWidth: "100%", width: "100%", margin: "0 auto" }} className="admin-page admin-submission-page">
        <SubmissionTypeTabs activeKey="reading" />

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
              {filteredSubs.map((s, idx) => {
                const isHighlighted = String(selectedSubmission?.id || "") === String(s.id);

                return (
                <tr
                  key={s.id}
                  id={`reading-submission-row-${s.id}`}
                  style={getSubmissionRowStyle(idx, isHighlighted, isDarkMode)}
                >
                  {(() => {
                    const timingMeta = s.finished === false ? getAttemptTimingMeta(s.expiresAt) : null;
                    return (
                      <>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>{s.ReadingTest?.classCode || s.classCode || "N/A"}</td>
                  <td style={cellStyle}>{s.ReadingTest?.teacherName || s.teacherName || "N/A"}</td>
                  <td style={cellStyle}>{s.userName || "N/A"}</td>
                  <td style={cellStyle}>{s.User?.phone || "N/A"}</td>
                  <td style={cellStyle}>
                    <span style={{ fontWeight: "bold" }}>{s.correct}/{s.total}</span>
                    <span style={{ color: "#666", fontSize: 12 }}> ({s.scorePercentage || 0}%)</span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      padding: "4px 8px",
                      background: "#111827",
                      color: "#fff",
                      borderRadius: 4,
                      fontWeight: "bold"
                    }}>
                      {s.band != null && Number.isFinite(Number(s.band)) ? Number(s.band).toFixed(1) : "N/A"}
                    </span>
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
                        onClick={() => navigate(`/reading-results/${s.id}`)}
                        style={actionBtn}
                        title="View answer details"
                      >
                        <InlineIcon name="eye" size={14} />
                        Details
                      </button>
                      <button
                        onClick={() => loadAnalysis(s)}
                        style={{ ...actionBtn, background: "#4f46e5" }}
                        title="View analysis"
                      >
                        <InlineIcon name="overview" size={14} />
                        Analysis
                      </button>
                      <button
                        onClick={() => openFeedbackModal(s)}
                        style={{ ...actionBtn, background: s.feedback ? "#16a34a" : "#ca8a04" }}
                        title="Add or edit feedback"
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
              )})}
            </tbody>
            </table>
          </div>
        )}
      </div>

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

