import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import SubmissionTypeTabs from "../components/SubmissionTypeTabs";

const MyFeedback = () => {
  const { isDarkMode } = useTheme();
  const colors = useMemo(
    () =>
      isDarkMode
        ? {
            pageBg: "#0f172a",
            surface: "#111827",
            surfaceAlt: "#16213e",
            border: "#2a3350",
            text: "#e8e8e8",
            muted: "#b0b0b0",
            primary: "#4a90d9",
            success: "#22c55e",
            warning: "#f59e0b",
            danger: "#ef4444",
          }
        : {
            pageBg: "#ffffff",
            surface: "#f9f9f9",
            surfaceAlt: "#f0f0f0",
            border: "#ccc",
            text: "#1f2937",
            muted: "#666",
            primary: "#0e276f",
            success: "#16a34a",
            warning: "#ca8a04",
            danger: "#d32f2f",
          },
    [isDarkMode]
  );
  // Tab state
  const [activeTab, setActiveTab] = useState("writing");
  
  // Writing state
  const [writingSubmissions, setWritingSubmissions] = useState([]);
  const [filteredWriting, setFilteredWriting] = useState([]);
  
  // Reading state
  const [readingSubmissions, setReadingSubmissions] = useState([]);
  const [filteredReading, setFilteredReading] = useState([]);

  // Listening state
  const [listeningSubmissions, setListeningSubmissions] = useState([]);
  const [filteredListening, setFilteredListening] = useState([]);

  // Cambridge state
  const [cambridgeSubmissions, setCambridgeSubmissions] = useState([]);
  const [filteredCambridge, setFilteredCambridge] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // Search state (shared for both tabs)
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchFeedbackBy, setSearchFeedbackBy] = useState("");

  // Analysis modal state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Use useMemo to prevent user object from changing on every render
  const user = useMemo(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  }, []);
  
  // Use ref to track if data has been fetched
  const hasFetched = useRef(false);

  // Fetch Writing submissions
  const fetchWritingData = useCallback(async (userPhone) => {
    if (!userPhone) return;
    try {
      const res = await fetch(apiPath("writing/list"));
      const allSubs = await res.json();

      const userSubs = allSubs.filter(
        (sub) => sub.User?.phone === userPhone || sub.userPhone === userPhone
      );

      const unseenIds = userSubs
        .filter((sub) => sub.feedback && !sub.feedbackSeen)
        .map((sub) => sub.id);

      if (unseenIds.length > 0) {
        await fetch(apiPath("writing/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unseenIds }),
        });
        window.dispatchEvent(new Event("feedbackSeen"));
      }

      const updatedSubs = userSubs.map((sub) =>
        unseenIds.includes(sub.id) ? { ...sub, feedbackSeen: true } : sub
      );
      setWritingSubmissions(updatedSubs);
    } catch (err) {
      console.error("Failed to load writing submissions:", err);
    }
  }, []);

  // Fetch Reading submissions
  const fetchReadingData = useCallback(async (userPhone) => {
    if (!userPhone) return;
    try {
      const res = await fetch(apiPath(`reading-submissions/user/${userPhone}`));
      const subs = await res.json();

      const unseenIds = subs
        .filter((sub) => sub.feedback && !sub.feedbackSeen)
        .map((sub) => sub.id);

      if (unseenIds.length > 0) {
        await fetch(apiPath("reading-submissions/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unseenIds }),
        });
        window.dispatchEvent(new Event("feedbackSeen"));
      }

      const updatedSubs = subs.map((sub) =>
        unseenIds.includes(sub.id) ? { ...sub, feedbackSeen: true } : sub
      );
      setReadingSubmissions(updatedSubs);
    } catch (err) {
      console.error("Failed to load reading submissions:", err);
    }
  }, []);

  // Fetch Listening submissions
  const fetchListeningData = useCallback(async (userPhone) => {
    if (!userPhone) return;
    try {
      const res = await fetch(apiPath(`listening-submissions/user/${userPhone}`));
      const subs = await res.json();
      const userSubs = Array.isArray(subs) ? subs : [];

      const unseenIds = userSubs
        .filter((sub) => sub.feedback && !sub.feedbackSeen)
        .map((sub) => sub.id);

      if (unseenIds.length > 0) {
        await fetch(apiPath("listening-submissions/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unseenIds }),
        });
        window.dispatchEvent(new Event("feedbackSeen"));
      }

      const updatedSubs = userSubs.map((sub) =>
        unseenIds.includes(sub.id) ? { ...sub, feedbackSeen: true } : sub
      );
      setListeningSubmissions(updatedSubs);
    } catch (err) {
      console.error("Failed to load listening submissions:", err);
      setListeningSubmissions([]);
    }
  }, []);

  // Fetch Cambridge submissions
  const fetchCambridgeData = useCallback(async (userPhone) => {
    if (!userPhone) return;
    try {
      const res = await fetch(apiPath(`cambridge/submissions/user/${userPhone}`));
      const subs = await res.json();
      const userSubs = Array.isArray(subs) ? subs : [];

      const unseenIds = userSubs
        .filter((sub) => sub.feedback && !sub.feedbackSeen)
        .map((sub) => sub.id);

      if (unseenIds.length > 0) {
        await fetch(apiPath("cambridge/submissions/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: userPhone, ids: unseenIds }),
        });
        window.dispatchEvent(new Event("feedbackSeen"));
      }

      const updatedSubs = userSubs.map((sub) =>
        unseenIds.includes(sub.id) ? { ...sub, feedbackSeen: true } : sub
      );
      setCambridgeSubmissions(updatedSubs);
    } catch (err) {
      console.error("Failed to load Cambridge submissions:", err);
      setCambridgeSubmissions([]);
    }
  }, []);

  useEffect(() => {
    if (!user?.phone || hasFetched.current) return;
    hasFetched.current = true;
    
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchWritingData(user.phone),
        fetchReadingData(user.phone),
        fetchListeningData(user.phone),
        fetchCambridgeData(user.phone),
      ]);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchWritingData, fetchReadingData, fetchListeningData, fetchCambridgeData, user]);

  // Filter Writing submissions
  useEffect(() => {
    let filtered = writingSubmissions;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.classCode?.toLowerCase().includes(searchClassCode.toLowerCase())
      );
    }
    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.teacherName?.toLowerCase().includes(searchTeacher.toLowerCase())
      );
    }
    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredWriting(filtered);
  }, [searchClassCode, searchTeacher, searchFeedbackBy, writingSubmissions]);

  // Filter Reading submissions
  useEffect(() => {
    let filtered = readingSubmissions;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.ReadingTest?.classCode?.toLowerCase().includes(searchClassCode.toLowerCase())
      );
    }
    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.ReadingTest?.teacherName?.toLowerCase().includes(searchTeacher.toLowerCase())
      );
    }
    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredReading(filtered);
  }, [searchClassCode, searchTeacher, searchFeedbackBy, readingSubmissions]);

  // Filter Listening submissions
  useEffect(() => {
    let filtered = listeningSubmissions;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.ListeningTest?.classCode?.toLowerCase().includes(searchClassCode.toLowerCase())
      );
    }
    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.ListeningTest?.teacherName?.toLowerCase().includes(searchTeacher.toLowerCase())
      );
    }
    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredListening(filtered);
  }, [searchClassCode, searchTeacher, searchFeedbackBy, listeningSubmissions]);

  // Filter Cambridge submissions
  useEffect(() => {
    let filtered = cambridgeSubmissions;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        String(item.classCode || "")
          .toLowerCase()
          .includes(searchClassCode.toLowerCase())
      );
    }
    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        String(item.teacherName || "")
          .toLowerCase()
          .includes(searchTeacher.toLowerCase())
      );
    }
    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        String(item.feedbackBy || "")
          .toLowerCase()
          .includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredCambridge(filtered);
  }, [searchClassCode, searchTeacher, searchFeedbackBy, cambridgeSubmissions]);

  // Load analysis for a Reading submission
  const loadAnalysis = async (submissionId) => {
    setLoadingAnalysis(true);
    setAnalysisData(null);
    try {
      // First try to get existing analysis
      let res = await fetch(apiPath(`reading-submissions/${submissionId}/analysis`));
      let data = await res.json();
      
      // If no analysis exists, generate it first
      if (!data || !data.breakdown || Object.keys(data.breakdown || {}).length === 0) {
        // Generate analysis
        const genRes = await fetch(apiPath(`reading-submissions/${submissionId}/generate-analysis`), {
          method: "POST",
        });
        if (genRes.ok) {
          // Fetch again after generating
          res = await fetch(apiPath(`reading-submissions/${submissionId}/analysis`));
          data = await res.json();
        }
      }
      
      if (data && data.breakdown && Object.keys(data.breakdown).length > 0) {
        setAnalysisData(data);
        setShowAnalysis(true);
      } else {
        setAnalysisData(null);
        setShowAnalysis(true); // Still show modal with "no data" message
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
      setAnalysisData(null);
      setShowAnalysis(true);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (!user) return <p style={{ padding: 40 }}>❌ You are not signed in.</p>;

  const currentSubmissions =
    activeTab === "writing"
      ? filteredWriting
      : activeTab === "reading"
        ? filteredReading
        : activeTab === "listening"
          ? filteredListening
          : filteredCambridge;
  const totalSubmissionsForActiveTab =
    activeTab === "writing"
      ? writingSubmissions.length
      : activeTab === "reading"
        ? readingSubmissions.length
        : activeTab === "listening"
          ? listeningSubmissions.length
          : cambridgeSubmissions.length;
  const activeTabLabel =
    activeTab === "writing"
      ? "writing submissions"
      : activeTab === "reading"
        ? "reading submissions"
        : activeTab === "listening"
          ? "listening submissions"
          : "Orange submissions";
  const activeTabEmptyLabel =
    activeTab === "writing"
      ? "writing tests"
      : activeTab === "reading"
        ? "reading tests"
        : activeTab === "listening"
          ? "listening tests"
          : "Orange tests";
  const feedbackTabs = [
    {
      key: "writing",
      shortLabel: "Writing",
      label: "Writing feedback",
      badge: writingSubmissions.length,
    },
    {
      key: "reading",
      shortLabel: "Reading",
      label: "Reading feedback",
      badge: readingSubmissions.length,
    },
    {
      key: "listening",
      shortLabel: "Listening",
      label: "Listening feedback",
      badge: listeningSubmissions.length,
    },
    {
      key: "cambridge",
      shortLabel: "Orange",
      label: "Orange feedback",
      badge: cambridgeSubmissions.length,
    },
  ];
  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-GB");
  };

  return (
    <>
      <StudentNavbar />
      <div style={{ background: colors.pageBg, minHeight: "100vh" }}>
        <div
          style={{
            padding: "30px",
            maxWidth: 1200,
            margin: "0 auto",
            color: colors.text,
          }}
        >
          <h3>Feedback</h3>
          <SubmissionTypeTabs
            title={null}
            items={feedbackTabs}
            activeKey={activeTab}
            onSelect={setActiveTab}
            allowMobileWrap
            buttonFlex="0 1 180px"
            showZeroBadge
          />

          {/* Search Form */}
          <div
            style={{
              background: colors.surfaceAlt,
              padding: 20,
              borderRadius: 8,
              marginBottom: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 15,
              alignItems: "end",
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Class Code:
              </label>
              <input
                type="text"
                placeholder="Enter class code"
                value={searchClassCode}
                onChange={(e) => setSearchClassCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  background: colors.surface,
                  color: colors.text,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Test Teacher:
              </label>
              <input
                type="text"
                placeholder="Enter teacher name"
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  background: colors.surface,
                  color: colors.text,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Reviewed By:
              </label>
              <input
                type="text"
                placeholder="Enter reviewer name"
                value={searchFeedbackBy}
                onChange={(e) => setSearchFeedbackBy(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  background: colors.surface,
                  color: colors.text,
                }}
              />
            </div>

            <button
              onClick={() => {
                setSearchClassCode("");
                setSearchTeacher("");
                setSearchFeedbackBy("");
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: isDarkMode ? colors.primary : "#666",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              Reset
            </button>
          </div>

          {/* Results count */}
          <p style={{ color: colors.muted, marginBottom: 15 }}>
            Total: <strong>{currentSubmissions.length}</strong> {activeTabLabel}
            {(searchClassCode || searchTeacher || searchFeedbackBy) &&
              ` (filtered from ${totalSubmissionsForActiveTab})`}
          </p>

          {loading && <p>Loading feedback...</p>}

          {!loading && currentSubmissions.length === 0 && (
            <p style={{ color: colors.danger, fontWeight: "bold" }}>
              {searchClassCode || searchTeacher || searchFeedbackBy
                ? "No matching submissions found."
                : `You have not submitted any ${activeTabEmptyLabel} yet.`}
            </p>
          )}

        {/* Writing submissions list */}
        {activeTab === "writing" && filteredWriting.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              backgroundColor: colors.surface,
            }}
          >
            <p>
              <strong>Test:</strong> Writing {sub.WritingTest?.index || "?"} –{" "}
              {sub.WritingTest?.classCode || "(Not specified)"} –{" "}
              {sub.WritingTest?.teacherName || "(Not specified)"}
            </p>
            <p>
              <strong>Submitted at:</strong>{" "}
              {formatDateTime(sub.submittedAt || sub.createdAt)}
            </p>
            <p>
              <strong>Time remaining:</strong>{" "}
              {Number.isFinite(Number(sub.timeLeft)) ? `${Math.floor(Number(sub.timeLeft) / 60)} minutes` : "--"}
            </p>

            {sub.WritingTest?.task1Image && (
              <div style={{ marginBottom: 10 }}>
                <img
                  src={hostPath(sub.WritingTest.task1Image)}
                  alt="Task 1"
                  style={{ maxWidth: "80%", borderRadius: 6 }}
                />
              </div>
            )}

            <h4>Task 1 Response:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{sub.task1}</p>

            <h4>Task 2 Response:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{sub.task2}</p>

            <h4 style={{ marginTop: 20 }}>
              Teacher Feedback:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Unknown"}
              </span>
            </h4>
            {sub.feedback ? (
              <div
                style={{
                  background: isDarkMode ? "#0f2a1a" : "#e7f4e4",
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {(sub.bandTask1 != null || sub.bandTask2 != null || sub.bandOverall != null) && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                    {sub.bandTask1 != null && (
                      <span style={{ background: colors.primary, color: "#fff", padding: "4px 10px", borderRadius: 6, fontWeight: "bold", fontSize: 14 }}>
                        Task 1: {sub.bandTask1}
                      </span>
                    )}
                    {sub.bandTask2 != null && (
                      <span style={{ background: colors.primary, color: "#fff", padding: "4px 10px", borderRadius: 6, fontWeight: "bold", fontSize: 14 }}>
                        Task 2: {sub.bandTask2}
                      </span>
                    )}
                    {sub.bandOverall != null && (
                      <span style={{ background: "#16a34a", color: "#fff", padding: "4px 10px", borderRadius: 6, fontWeight: "bold", fontSize: 14 }}>
                        Overall: {sub.bandOverall}
                      </span>
                    )}
                  </div>
                )}
                <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                <p style={{ fontSize: 14, color: colors.muted }}>
                  <strong>Reviewed at:</strong>{" "}
                  {formatDateTime(sub.feedbackAt)}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>No feedback yet.</p>
            )}
          </div>
        ))}

        {/* Reading submissions list */}
        {activeTab === "reading" && filteredReading.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              backgroundColor: colors.surface,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p>
                  <strong>Test:</strong> Reading #{sub.testId} –{" "}
                  {sub.ReadingTest?.classCode || "(Not specified)"} –{" "}
                  {sub.ReadingTest?.teacherName || "(Not specified)"}
                </p>
                <p>
                  <strong>Title:</strong> {sub.ReadingTest?.title || "N/A"}
                </p>
                <p>
                  <strong>Submitted at:</strong>{" "}
                  {formatDateTime(sub.createdAt)}
                </p>
              </div>
              
              {/* Score badge */}
              <div style={{
                padding: "12px 16px",
                background: colors.surfaceAlt,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 24, fontWeight: "bold" }}>
                  {sub.band ? Number(sub.band).toFixed(1) : "N/A"}
                </div>
                <div style={{ fontSize: 12 }}>Band Score</div>
              </div>
            </div>

            {/* Score summary */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 15,
              margin: "15px 0",
              padding: 15,
              background: colors.surfaceAlt,
              color: colors.text,
              borderRadius: 8
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                  {sub.correct || 0}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>Correct</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                  {sub.total || 0}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>Total Questions</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: sub.scorePercentage >= 70
                    ? colors.success
                    : sub.scorePercentage >= 50
                      ? colors.warning
                      : colors.danger
                }}>
                  {sub.scorePercentage || 0}%
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>Accuracy</div>
              </div>
            </div>

            {/* Analysis button */}
            <button
              onClick={() => loadAnalysis(sub.id)}
              disabled={loadingAnalysis}
              style={{
                padding: "10px 20px",
                backgroundColor: isDarkMode ? colors.primary : "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                marginBottom: 15
              }}
            >
              View Detailed Analysis
            </button>

            {/* Teacher feedback */}
            <h4 style={{ marginTop: 10 }}>
              Teacher Feedback:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Not available"}
              </span>
            </h4>
            {sub.feedback ? (
              <div
                style={{
                  background: isDarkMode ? "#0f2a1a" : "#e7f4e4",
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                <p style={{ fontSize: 14, color: colors.muted }}>
                  <strong>Reviewed at:</strong>{" "}
                  {formatDateTime(sub.feedbackAt)}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>No teacher feedback yet.</p>
            )}

            {/* View details link */}
            <div style={{ marginTop: 15 }}>
              <a
                href={`/reading-results/${sub.id}`}
                style={{
                  color: colors.primary,
                  textDecoration: "underline",
                  fontSize: 14
                }}
              >
                View Answer Details
              </a>
            </div>
          </div>
        ))}

        {/* Listening submissions list */}
        {activeTab === "listening" && filteredListening.map((sub, idx) => {
          const correctCount = Number.isFinite(Number(sub.computedCorrect))
            ? Number(sub.computedCorrect)
            : Number(sub.correct) || 0;
          const totalCount = Number.isFinite(Number(sub.computedTotal))
            ? Number(sub.computedTotal)
            : Number(sub.total) || 0;
          const accuracy = Number.isFinite(Number(sub.computedPercentage))
            ? Number(sub.computedPercentage)
            : Number(sub.scorePercentage) || 0;

          return (
            <div
              key={sub.id || idx}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 20,
                marginBottom: 20,
                backgroundColor: colors.surface,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p>
                    <strong>Test:</strong> Listening #{sub.testId} –{" "}
                    {sub.ListeningTest?.classCode || "(Not specified)"} –{" "}
                    {sub.ListeningTest?.teacherName || "(Not specified)"}
                  </p>
                  <p>
                    <strong>Title:</strong> {sub.ListeningTest?.title || "N/A"}
                  </p>
                  <p>
                    <strong>Submitted at:</strong>{" "}
                    {formatDateTime(sub.createdAt)}
                  </p>
                </div>

                <div style={{
                  padding: "12px 16px",
                  background: colors.surfaceAlt,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 24, fontWeight: "bold" }}>
                    {sub.band != null && Number.isFinite(Number(sub.band)) ? Number(sub.band).toFixed(1) : "N/A"}
                  </div>
                  <div style={{ fontSize: 12 }}>Band Score</div>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 15,
                margin: "15px 0",
                padding: 15,
                background: colors.surfaceAlt,
                color: colors.text,
                borderRadius: 8
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                    {correctCount}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Correct</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                    {totalCount}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Total Questions</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: accuracy >= 70
                      ? colors.success
                      : accuracy >= 50
                        ? colors.warning
                        : colors.danger
                  }}>
                    {accuracy}%
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Accuracy</div>
                </div>
              </div>

              <h4 style={{ marginTop: 10 }}>
                Teacher Feedback:{" "}
                <span style={{ color: colors.primary, fontWeight: "bold" }}>
                  {sub.feedbackBy || "Not available"}
                </span>
              </h4>
              {sub.feedback ? (
                <div
                  style={{
                    background: isDarkMode ? "#0f2a1a" : "#e7f4e4",
                    padding: 10,
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                  <p style={{ fontSize: 14, color: colors.muted }}>
                    <strong>Reviewed at:</strong>{" "}
                    {formatDateTime(sub.feedbackAt)}
                  </p>
                </div>
              ) : (
                <p style={{ fontStyle: "italic", color: colors.muted }}>No teacher feedback yet.</p>
              )}

              <div style={{ marginTop: 15 }}>
                <a
                  href={`/listening-results/${sub.id}`}
                  style={{
                    color: colors.primary,
                    textDecoration: "underline",
                    fontSize: 14
                  }}
                >
                  View Result Details
                </a>
              </div>
            </div>
          );
        })}

        {/* Cambridge submissions list */}
        {activeTab === "cambridge" && filteredCambridge.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              backgroundColor: colors.surface,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p>
                  <strong>Test Type:</strong> {sub.testType || "Orange"}
                </p>
                <p>
                  <strong>Title:</strong> {sub.testTitle || "N/A"}
                </p>
                <p>
                  <strong>Class:</strong> {sub.classCode || "(Not specified)"}
                </p>
                <p>
                  <strong>Test Teacher:</strong> {sub.teacherName || "(Not specified)"}
                </p>
                <p>
                  <strong>Submitted at:</strong>{" "}
                  {formatDateTime(sub.submittedAt || sub.createdAt)}
                </p>
              </div>

              <div style={{
                padding: "12px 16px",
                background: colors.surfaceAlt,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 20, fontWeight: "bold" }}>
                  {typeof sub.score === "number" && typeof sub.totalQuestions === "number"
                    ? `${sub.score}/${sub.totalQuestions}`
                    : "--"}
                </div>
                <div style={{ fontSize: 12 }}>Score</div>
              </div>
            </div>

            {/* Teacher feedback */}
            <h4 style={{ marginTop: 10 }}>
              Teacher Feedback:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Not available"}
              </span>
            </h4>
            {sub.feedback ? (
              <div
                style={{
                  background: isDarkMode ? "#0f2a1a" : "#e7f4e4",
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                <p style={{ fontSize: 14, color: colors.muted }}>
                  <strong>Reviewed at:</strong>{" "}
                  {formatDateTime(sub.feedbackAt)}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>No teacher feedback yet.</p>
            )}

            {/* View details link */}
            <div style={{ marginTop: 15 }}>
              <a
                href={`/cambridge/result/${sub.id}`}
                style={{
                  color: colors.primary,
                  textDecoration: "underline",
                  fontSize: 14
                }}
              >
                View Full Result
              </a>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysis && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowAnalysis(false)}
        >
          <div
            style={{
              background: colors.surface,
              color: colors.text,
              padding: 30,
              borderRadius: 12,
              maxWidth: 700,
              maxHeight: "80vh",
              overflow: "auto",
              margin: 20
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Detailed Analysis</h3>
              <button
                onClick={() => setShowAnalysis(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 14,
                  cursor: "pointer",
                  color: colors.text
                }}
              >
                Close
              </button>
            </div>

            {analysisData?.analysisText ? (
              <pre style={{
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.6,
                background: colors.surfaceAlt,
                padding: 20,
                borderRadius: 8,
                border: `1px solid ${colors.border}`
              }}>
                {analysisData.analysisText}
              </pre>
            ) : (
              <p>No analysis data available.</p>
            )}

            {/* Breakdown by type */}
            {analysisData?.breakdown?.byType && (
              <div style={{ marginTop: 20 }}>
                <h4>Breakdown by Question Type:</h4>
                {analysisData.breakdown.byType.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: `1px solid ${colors.border}`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{t.label}</strong>
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {t.correct}/{t.total} correct
                      </div>
                    </div>
                    <div style={{
                      width: 100,
                      height: 8,
                      background: colors.border,
                      borderRadius: 4,
                      overflow: "hidden",
                      marginRight: 10
                    }}>
                      <div style={{
                        width: `${t.percentage}%`,
                        height: "100%",
                        background: t.status === "good" ? "#22c55e" : t.status === "average" ? "#eab308" : "#ef4444"
                      }} />
                    </div>
                    <div style={{
                      width: 50,
                      textAlign: "right",
                      fontWeight: "bold",
                      color: t.status === "good" ? colors.success : t.status === "average" ? colors.warning : colors.danger
                    }}>
                      {t.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAnalysis(false)}
              style={{
                marginTop: 20,
                padding: "12px 24px",
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MyFeedback;

