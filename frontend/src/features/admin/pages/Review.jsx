import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath } from "../../../shared/utils/api";

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

  const [unreviewedWriting, setUnreviewedWriting] = useState([]);
  const [unreviewedPetWriting, setUnreviewedPetWriting] = useState([]);
  const [loadingWriting, setLoadingWriting] = useState(true);

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

  useEffect(() => {
    const fetchUnreviewedWriting = async () => {
      setLoadingWriting(true);
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();
        const filtered = Array.isArray(all)
          ? all.filter((sub) => !sub.feedback)
          : [];

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

    const fetchCambridgeSubmissions = async () => {
      try {
        setLoadingCambridge(true);
        setCambridgeError(null);
        const res = await fetch(apiPath("cambridge/submissions?page=1&limit=100"));
        if (!res.ok) {
          throw new Error("Could not load Cambridge submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data?.submissions)
          ? data.submissions
          : Array.isArray(data)
          ? data
          : [];

        const needReview = submissions.filter(
          (item) => String(item.status || "").toLowerCase() !== "reviewed"
        );
        setCambridgeSubmissions(needReview);
      } catch (err) {
        console.error("Failed to load Cambridge submissions:", err);
        setCambridgeError(err.message);
        setCambridgeSubmissions([]);
      } finally {
        setLoadingCambridge(false);
      }
    };

    fetchUnreviewedWriting();
    fetchCambridgeSubmissions();
  }, []);

  const cambridgeNeedsReviewCount =
    cambridgeSubmissions.length + unreviewedPetWriting.length;

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

  const handleToggleCambridgeDetail = async (submissionId) => {
    setExpandedCambridge((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });

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
        [submissionId]:
          typeof detail?.feedback === "string" ? detail.feedback : prev[submissionId] || "",
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

  const handleGenerateCambridgeFeedback = async (submission) => {
    const detail = cambridgeDetailsById[submission.id];
    const responses = getPendingManualAnswers(detail);

    if (!responses.length) {
      alert("No open-ended responses were found for AI feedback.");
      return;
    }

    try {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [submission.id]: true }));
      setCambridgeStatusById((prev) => ({ ...prev, [submission.id]: "" }));

      const res = await fetch(apiPath("ai/generate-cambridge-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: submission.studentName || "N/A",
          testType: submission.testType || "Cambridge",
          classCode: submission.classCode || "",
          responses: responses.map((item) => ({
            label: item.label,
            prompt: item.prompt,
            answer: item.userAnswer,
            questionType: item.questionType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI could not generate Cambridge feedback.");
      }

      if (!data?.suggestion) {
        throw new Error("AI returned an empty Cambridge feedback result.");
      }

      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submission.id]: data.suggestion,
      }));
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submission.id]: data.warning
          ? data.warning
          : data.cached
          ? "Loaded cached AI feedback."
          : "AI feedback generated.",
      }));
    } catch (err) {
      console.error("Failed to generate Cambridge AI feedback:", err);
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submission.id]: err.message || "AI feedback failed.",
      }));
      alert(err.message || "AI feedback failed.");
    } finally {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleSaveCambridgeFeedback = async (submissionId) => {
    const feedback = (cambridgeFeedbackDraftById[submissionId] || "").trim();
    if (!feedback) return;

    try {
      setCambridgeSavingById((prev) => ({ ...prev, [submissionId]: true }));

      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          feedbackBy:
            teacher?.name || teacher?.username || teacher?.fullName || "Teacher",
          status: "reviewed",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Could not save feedback.");
      }

      setCambridgeSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
      setExpandedCambridge((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    } catch (err) {
      console.error("Failed to save Cambridge feedback:", err);
      alert(err.message || "Could not save feedback.");
    } finally {
      setCambridgeSavingById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="admin-page">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
          className="admin-header-row"
        >
          <h3 style={{ margin: 0 }}>Review Queue</h3>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }} className="admin-tabs">
          <button
            onClick={() => setActiveTab("writing")}
            style={{
              ...tabStyle,
              ...(activeTab === "writing" ? tabActiveStyle : {}),
            }}
          >
            Writing IELTS{unreviewedWriting.length > 0 ? ` (${unreviewedWriting.length})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("cambridge")}
            style={{
              ...tabStyle,
              ...(activeTab === "cambridge" ? tabActiveStyle : {}),
            }}
          >
            Cambridge{cambridgeNeedsReviewCount > 0 ? ` (${cambridgeNeedsReviewCount})` : ""}
          </button>
        </div>

        {activeTab === "writing" && (
          <>
            {loadingWriting && <p>Loading writing submissions...</p>}
            {!loadingWriting && unreviewedWriting.length === 0 && (
              <p>No writing submissions need review.</p>
            )}

            {!loadingWriting && unreviewedWriting.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f2f2f2" }}>
                    <th style={cellStyle}>#</th>
                    <th style={cellStyle}>Student</th>
                    <th style={cellStyle}>Phone</th>
                    <th style={cellStyle}>Test</th>
                    <th style={cellStyle}>Submitted</th>
                    <th style={cellStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unreviewedWriting.map((sub, idx) => {
                    const writingTest = sub.writing_test || sub.WritingTest || {};
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={cellStyle}>{idx + 1}</td>
                        <td style={cellStyle}>{sub.userName || sub.user?.name || "N/A"}</td>
                        <td style={cellStyle}>{sub.userPhone || sub.user?.phone || "N/A"}</td>
                        <td style={cellStyle}>
                          Writing {writingTest.index || "N/A"}
                          {writingTest.classCode ? ` - ${writingTest.classCode}` : ""}
                          {writingTest.teacherName ? ` - ${writingTest.teacherName}` : ""}
                        </td>
                        <td style={cellStyle}>
                          {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                        </td>
                        <td style={cellStyle}>
                          <button
                            onClick={() => navigate(`/review/${sub.id}`)}
                            style={primaryButtonStyle}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === "cambridge" && (
          <>
            {loadingWriting && <p>Loading PET writing submissions...</p>}
            {loadingCambridge && <p>Loading Cambridge submissions...</p>}
            {!loadingCambridge && cambridgeError && (
              <p style={{ color: "#dc2626" }}>{cambridgeError}</p>
            )}
            {!loadingWriting &&
              !loadingCambridge &&
              !cambridgeError &&
              mergedCambridgeRows.length === 0 && (
                <p>No Cambridge submissions need review.</p>
              )}

            {!loadingCambridge && !cambridgeError && mergedCambridgeRows.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f2f2f2" }}>
                    <th style={cellStyle}>#</th>
                    <th style={cellStyle}>Type</th>
                    <th style={cellStyle}>Student</th>
                    <th style={cellStyle}>Phone</th>
                    <th style={cellStyle}>Class</th>
                    <th style={cellStyle}>Score</th>
                    <th style={cellStyle}>Submitted</th>
                    <th style={cellStyle}>Essay</th>
                    <th style={cellStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedCambridgeRows.map((row, idx) => {
                    if (row.source === "pet-writing") {
                      const sub = row.sub;
                      const writingTest = sub.writing_test || sub.WritingTest || {};

                      return (
                        <tr key={`pet-${sub.id}`} style={{ borderBottom: "1px solid #ccc" }}>
                          <td style={cellStyle}>{idx + 1}</td>
                          <td style={cellStyle}>pet-writing</td>
                          <td style={cellStyle}>{sub.userName || sub.user?.name || "N/A"}</td>
                          <td style={cellStyle}>{sub.userPhone || sub.user?.phone || "N/A"}</td>
                          <td style={cellStyle}>{writingTest.classCode || "N/A"}</td>
                          <td style={cellStyle}>--</td>
                          <td style={cellStyle}>
                            {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                          </td>
                          <td style={cellStyle}>--</td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => navigate(`/review/${sub.id}`)}
                              style={primaryButtonStyle}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const sub = row.sub;
                    const isExpanded = expandedCambridge.has(sub.id);
                    const detail = cambridgeDetailsById[sub.id];
                    const isLoadingDetail = !!cambridgeLoadingDetailById[sub.id];
                    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];

                    return (
                      <React.Fragment key={`cam-${sub.id}`}>
                        <tr style={{ borderBottom: "1px solid #ccc" }}>
                          <td style={cellStyle}>{idx + 1}</td>
                          <td style={cellStyle}>{String(sub.testType || "Cambridge")}</td>
                          <td style={cellStyle}>{sub.studentName || "N/A"}</td>
                          <td style={cellStyle}>{sub.studentPhone || "N/A"}</td>
                          <td style={cellStyle}>{sub.classCode || "N/A"}</td>
                          <td style={cellStyle}>
                            {typeof sub.score === "number" &&
                            typeof sub.totalQuestions === "number"
                              ? `${sub.score}/${sub.totalQuestions}`
                              : "--"}
                          </td>
                          <td style={cellStyle}>
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => handleToggleCambridgeDetail(sub.id)}
                              style={secondaryButtonStyle}
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => navigate(`/cambridge/result/${sub.id}`)}
                              style={secondaryButtonStyle}
                            >
                              View Result
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td
                              style={{
                                ...cellStyle,
                                background: isDarkMode ? "#0f172a" : "#fafafa",
                                color: isDarkMode ? "#e5e7eb" : "inherit",
                                borderColor: isDarkMode ? "#1f2b47" : cellStyle.border,
                              }}
                              colSpan={9}
                            >
                              {isLoadingDetail && <div>Loading submission details...</div>}

                              {!isLoadingDetail && detail && (
                                <div style={{ display: "grid", gap: 10 }}>
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ fontWeight: 700 }}>
                                      Open-ended responses to review
                                    </div>

                                    {pendingAnswers.length === 0 ? (
                                      <div
                                        style={{
                                          color: isDarkMode ? "#9ca3af" : "#6b7280",
                                        }}
                                      >
                                        No pending open-ended responses were found in this
                                        submission. You can still open the full result to
                                        inspect it manually.
                                      </div>
                                    ) : (
                                      <div style={{ display: "grid", gap: 10 }}>
                                        {pendingAnswers.map((item, answerIndex) => (
                                          <div
                                            key={item.key}
                                            style={answerBoxStyle(isDarkMode)}
                                          >
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
                                            <div style={{ whiteSpace: "pre-wrap" }}>
                                              {item.userAnswer}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                                    <div style={{ fontWeight: 700 }}>Teacher Feedback</div>
                                    <textarea
                                      rows={4}
                                      value={cambridgeFeedbackDraftById[sub.id] || ""}
                                      onChange={(e) =>
                                        setCambridgeFeedbackDraftById((prev) => ({
                                          ...prev,
                                          [sub.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Enter feedback..."
                                      style={{
                                        width: "100%",
                                        padding: 10,
                                        border: `1px solid ${
                                          isDarkMode ? "#2a3350" : "#d1d5db"
                                        }`,
                                        borderRadius: 8,
                                        fontSize: 14,
                                        background: isDarkMode ? "#0f172a" : "#fff",
                                        color: isDarkMode ? "#e5e7eb" : "#111827",
                                      }}
                                    />

                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 10,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <button
                                        onClick={() => handleGenerateCambridgeFeedback(sub)}
                                        style={secondaryButtonStyle}
                                        disabled={
                                          !pendingAnswers.length ||
                                          cambridgeAiLoadingById[sub.id] ||
                                          cambridgeSavingById[sub.id]
                                        }
                                      >
                                        {cambridgeAiLoadingById[sub.id]
                                          ? "Generating..."
                                          : "AI Feedback"}
                                      </button>
                                      <button
                                        onClick={() => handleSaveCambridgeFeedback(sub.id)}
                                        style={primaryButtonStyle}
                                        disabled={
                                          !(cambridgeFeedbackDraftById[sub.id] || "").trim() ||
                                          cambridgeSavingById[sub.id] ||
                                          cambridgeAiLoadingById[sub.id]
                                        }
                                      >
                                        {cambridgeSavingById[sub.id]
                                          ? "Saving..."
                                          : "Save Feedback"}
                                      </button>
                                      <span
                                        style={{
                                          color: isDarkMode ? "#9ca3af" : "#6b7280",
                                          fontSize: 13,
                                        }}
                                      >
                                        Saving will move this submission to the reviewed state.
                                      </span>
                                    </div>

                                    {cambridgeStatusById[sub.id] && (
                                      <div
                                        style={{
                                          color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                                          fontSize: 13,
                                        }}
                                      >
                                        {cambridgeStatusById[sub.id]}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </>
  );
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
  fontSize: "15px",
};

const cellStyle = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "left",
};

const tabStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const tabActiveStyle = {
  borderColor: "#111827",
  background: "#111827",
  color: "#fff",
};

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

const answerBoxStyle = (isDarkMode) => ({
  border: `1px solid ${isDarkMode ? "#2a3350" : "#e5e7eb"}`,
  borderRadius: 10,
  background: isDarkMode ? "#111827" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "inherit",
  padding: 12,
});

export default Review;
