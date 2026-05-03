import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import LineIcon from "../../../shared/components/LineIcon.jsx";

import "./MyFeedback.css";

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
  const themeVars = useMemo(
    () => ({
      "--mf-page-bg": isDarkMode
        ? "radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 32%), linear-gradient(180deg, #081120 0%, #0f172a 100%)"
        : "radial-gradient(circle at top left, rgba(191, 219, 254, 0.68), transparent 32%), linear-gradient(180deg, #f7faff 0%, #eef4ff 100%)",
      "--mf-shell-bg": isDarkMode ? "rgba(10, 18, 32, 0.9)" : "rgba(255, 255, 255, 0.94)",
      "--mf-panel-bg": isDarkMode ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.98)",
      "--mf-soft-bg": isDarkMode ? "#111b33" : "#f4f7fb",
      "--mf-soft-strong": isDarkMode ? "#16213e" : "#eef4ff",
      "--mf-input-bg": isDarkMode ? "#0f172a" : "#ffffff",
      "--mf-border": colors.border,
      "--mf-text": colors.text,
      "--mf-muted": colors.muted,
      "--mf-primary": colors.primary,
      "--mf-success": colors.success,
      "--mf-warning": colors.warning,
      "--mf-danger": colors.danger,
      "--mf-shadow": isDarkMode ? "0 24px 56px rgba(0, 0, 0, 0.34)" : "0 24px 56px rgba(15, 23, 42, 0.08)",
      "--mf-card-shadow": isDarkMode ? "0 18px 36px rgba(0, 0, 0, 0.24)" : "0 14px 28px rgba(15, 23, 42, 0.06)",
      "--mf-feedback-bg": isDarkMode ? "rgba(15, 42, 26, 0.78)" : "#eef9ee",
      "--mf-feedback-border": isDarkMode ? "rgba(34, 197, 94, 0.24)" : "#c9ebcf",
    }),
    [colors, isDarkMode]
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

  if (!user) return <p style={{ padding: 40 }}>You are not signed in.</p>;

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
  const activeFeedbackTab = feedbackTabs.find((tab) => tab.key === activeTab) || feedbackTabs[0];
  const hasActiveFilters =
    Boolean(searchClassCode.trim()) ||
    Boolean(searchTeacher.trim()) ||
    Boolean(searchFeedbackBy.trim());
  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-GB");
  };

  const getAccuracyColor = (value) => {
    if (value >= 70) return colors.success;
    if (value >= 50) return colors.warning;
    return colors.danger;
  };

  const renderMetaGrid = (items) => (
    <div className="myFeedbackMetaGrid">
      {items
        .filter((item) => item && item.value != null && String(item.value).trim() !== "")
        .map((item) => (
          <div key={`${item.label}-${item.value}`} className="myFeedbackMetaItem">
            <span className="myFeedbackMetaLabel">{item.label}</span>
            <span className="myFeedbackMetaValue">{item.value}</span>
          </div>
        ))}
    </div>
  );

  const renderStats = (stats) => (
    <div className="myFeedbackStats">
      {stats.map((stat) => (
        <div key={stat.label} className="myFeedbackStat">
          <div className="myFeedbackStatValue" style={{ color: stat.color || colors.primary }}>
            {stat.value}
          </div>
          <div className="myFeedbackStatLabel">{stat.label}</div>
        </div>
      ))}
    </div>
  );

  const renderFeedbackBlock = (submission, emptyText) => (
    <section className="myFeedbackFeedbackSection">
      <div className="myFeedbackFeedbackHeader">
        <span className="myFeedbackSectionEyebrow">Teacher feedback</span>
        <span className="myFeedbackReviewerChip">{submission.feedbackBy || "Not available"}</span>
      </div>

      {submission.feedback ? (
        <div className="myFeedbackFeedbackBox">
          <p className="myFeedbackFeedbackText">{submission.feedback}</p>
          <p className="myFeedbackFeedbackMeta">
            <strong>Reviewed at:</strong> {formatDateTime(submission.feedbackAt)}
          </p>
        </div>
      ) : (
        <p className="myFeedbackMuted myFeedbackMuted--italic">{emptyText}</p>
      )}
    </section>
  );

  const renderEssayPanel = (label, text) => {
    const cleanText = String(text || "").trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

    return (
      <details className="myFeedbackDetails" open={wordCount > 0 && wordCount <= 35}>
        <summary className="myFeedbackDetailsSummary">
          <span>{label}</span>
          <span className="myFeedbackDetailsHint">{wordCount > 0 ? `${wordCount} words` : "No response"}</span>
        </summary>
        <div className="myFeedbackEssayText">{cleanText || "No response submitted."}</div>
      </details>
    );
  };

  const resetFilters = () => {
    setSearchClassCode("");
    setSearchTeacher("");
    setSearchFeedbackBy("");
  };

  return (
    <>
      <StudentNavbar />
      <div className="myFeedbackPage" style={themeVars}>
        <div className="myFeedbackShell">
          <div className="myFeedbackLayout">
            <aside className="myFeedbackSidebar">
              <section className="myFeedbackSidebarCard">
                <div className="myFeedbackSidebarHeader">
                  <span className="myFeedbackSidebarEyebrow">Feedback</span>
                  <h3 className="myFeedbackSidebarTitle">My feedback</h3>
                  <p className="myFeedbackSidebarText">
                    Jump between Writing, Reading, Listening, and Orange results from one sticky panel.
                  </p>
                </div>

                <div className="myFeedbackSidebarTabs" role="tablist" aria-label="Feedback tabs">
                  {feedbackTabs.map((tab) => {
                    const isActive = tab.key === activeTab;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setActiveTab(tab.key)}
                        className={`myFeedbackSideTab myFeedbackSideTab--${tab.key}${isActive ? " is-active" : ""}`}
                      >
                        <span className="myFeedbackSideTabCopy">
                          <span className="myFeedbackSideTabLabel">{tab.shortLabel}</span>
                          <span className="myFeedbackSideTabHint">{tab.label}</span>
                        </span>
                        <span className="myFeedbackSideTabCount">{tab.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="myFeedbackSidebarCard myFeedbackSidebarCard--filters">
                <div className="myFeedbackSidebarPanelHeader">
                  <span className="myFeedbackSidebarEyebrow">Filters</span>
                  <span className="myFeedbackSidebarMeta">
                    {hasActiveFilters ? "Active" : "Optional"}
                  </span>
                </div>

                <div className="myFeedbackFilters">
                  <div className="myFeedbackField">
                    <label className="myFeedbackFieldLabel">
                      Class Code:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter class code"
                      value={searchClassCode}
                      onChange={(e) => setSearchClassCode(e.target.value)}
                      className="myFeedbackInput"
                    />
                  </div>

                  <div className="myFeedbackField">
                    <label className="myFeedbackFieldLabel">
                      Test Teacher:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter teacher name"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                      className="myFeedbackInput"
                    />
                  </div>

                  <div className="myFeedbackField">
                    <label className="myFeedbackFieldLabel">
                      Reviewed By:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reviewer name"
                      value={searchFeedbackBy}
                      onChange={(e) => setSearchFeedbackBy(e.target.value)}
                      className="myFeedbackInput"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="myFeedbackReset"
                  >
                    Reset Filters
                  </button>
                </div>
              </section>
            </aside>

            <main className="myFeedbackMain">
              <section className="myFeedbackMainPanel">
                <div className="myFeedbackMainHeader">
                  <div className="myFeedbackMainCopy">
                    <span className="myFeedbackSectionEyebrow">Feedback queue</span>
                    <h2 className="myFeedbackMainTitle">{activeFeedbackTab.label}</h2>
                    <p className="myFeedbackMainText">
                      Review your latest submission cards, feedback notes, and result actions in one compact list.
                    </p>
                  </div>

                  <div className="myFeedbackMainStats">
                    <p className="myFeedbackCount">
                      Total: <strong>{currentSubmissions.length}</strong> {activeTabLabel}
                    </p>
                    <p className="myFeedbackSummaryNote">
                      {hasActiveFilters
                        ? `Filtered from ${totalSubmissionsForActiveTab}`
                        : `${totalSubmissionsForActiveTab} total saved in this section`}
                    </p>
                  </div>
                </div>

                {loading && <p className="myFeedbackState">Loading feedback...</p>}

                {!loading && currentSubmissions.length === 0 && (
                  <p className="myFeedbackState myFeedbackState--empty">
                    {hasActiveFilters
                      ? "No matching submissions found."
                      : `You have not submitted any ${activeTabEmptyLabel} yet.`}
                  </p>
                )}

                <div className="myFeedbackCardsGrid">
          {activeTab === "writing" && filteredWriting.map((sub, idx) => (
            <article key={sub.id || idx} className="myFeedbackCard myFeedbackCard--writing">
              <div className="myFeedbackCardHeader">
                <div className="myFeedbackCardHeading">
                  <span className="myFeedbackCardEyebrow">Writing submission</span>
                  <h4 className="myFeedbackCardTitle">
                    Writing {sub.WritingTest?.index || "?"} - {sub.WritingTest?.classCode || "(Not specified)"} - {sub.WritingTest?.teacherName || "(Not specified)"}
                  </h4>
                </div>
                <div className="myFeedbackScoreBadge">
                  <strong>
                    {sub.bandOverall != null
                      ? Number(sub.bandOverall).toFixed(1)
                      : Number.isFinite(Number(sub.timeLeft))
                      ? Math.floor(Number(sub.timeLeft) / 60)
                      : "--"}
                  </strong>
                  <span>{sub.bandOverall != null ? "overall" : "min left"}</span>
                </div>
              </div>

              {renderMetaGrid([
                { label: "Submitted", value: formatDateTime(sub.submittedAt || sub.createdAt) },
                { label: "Teacher", value: sub.WritingTest?.teacherName || "(Not specified)" },
                { label: "Class", value: sub.WritingTest?.classCode || "(Not specified)" },
              ])}

              {(sub.bandTask1 != null || sub.bandTask2 != null || sub.bandOverall != null) && (
                <div className="myFeedbackBadgeRow">
                  {sub.bandTask1 != null && <span className="myFeedbackMetricPill">Task 1: {sub.bandTask1}</span>}
                  {sub.bandTask2 != null && <span className="myFeedbackMetricPill">Task 2: {sub.bandTask2}</span>}
                  {sub.bandOverall != null && <span className="myFeedbackMetricPill myFeedbackMetricPill--success">Overall: {sub.bandOverall}</span>}
                </div>
              )}

              {sub.WritingTest?.task1Image ? (
                <div className="myFeedbackImageWrap">
                  <img src={hostPath(sub.WritingTest.task1Image)} alt="Task 1" className="myFeedbackImage" />
                </div>
              ) : null}

              <div className="myFeedbackDetailsGrid">
                {renderEssayPanel("Task 1 response", sub.task1)}
                {renderEssayPanel("Task 2 response", sub.task2)}
              </div>

              {renderFeedbackBlock(sub, "No feedback yet.")}
            </article>
          ))}

          {activeTab === "reading" && filteredReading.map((sub, idx) => (
            <article key={sub.id || idx} className="myFeedbackCard myFeedbackCard--reading">
              <div className="myFeedbackCardHeader">
                <div className="myFeedbackCardHeading">
                  <span className="myFeedbackCardEyebrow">Reading submission</span>
                  <h4 className="myFeedbackCardTitle">
                    Reading #{sub.testId} - {sub.ReadingTest?.classCode || "(Not specified)"} - {sub.ReadingTest?.teacherName || "(Not specified)"}
                  </h4>
                </div>
                <div className="myFeedbackScoreBadge">
                  <strong>{sub.band ? Number(sub.band).toFixed(1) : "N/A"}</strong>
                  <span>band score</span>
                </div>
              </div>

              {renderMetaGrid([
                { label: "Title", value: sub.ReadingTest?.title || "N/A" },
                { label: "Submitted", value: formatDateTime(sub.createdAt) },
                { label: "Teacher", value: sub.ReadingTest?.teacherName || "(Not specified)" },
              ])}

              {renderStats([
                { label: "Correct", value: sub.correct || 0, color: colors.primary },
                { label: "Questions", value: sub.total || 0, color: colors.primary },
                { label: "Accuracy", value: `${sub.scorePercentage || 0}%`, color: getAccuracyColor(Number(sub.scorePercentage) || 0) },
              ])}

              <div className="myFeedbackActionRow">
                <button
                  type="button"
                  onClick={() => loadAnalysis(sub.id)}
                  disabled={loadingAnalysis}
                  className="myFeedbackActionButton"
                >
                  <LineIcon name="review" size={16} />
                  <span>{loadingAnalysis ? "Loading analysis..." : "View Detailed Analysis"}</span>
                </button>

                <a href={`/reading-results/${sub.id}`} className="myFeedbackActionLink">
                  <LineIcon name="eye" size={16} />
                  <span>View Answer Details</span>
                </a>
              </div>

              {renderFeedbackBlock(sub, "No teacher feedback yet.")}
            </article>
          ))}

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
            <article key={sub.id || idx} className="myFeedbackCard myFeedbackCard--listening">
              <div className="myFeedbackCardHeader">
                <div className="myFeedbackCardHeading">
                  <span className="myFeedbackCardEyebrow">Listening submission</span>
                  <h4 className="myFeedbackCardTitle">
                    Listening #{sub.testId} - {sub.ListeningTest?.classCode || "(Not specified)"} - {sub.ListeningTest?.teacherName || "(Not specified)"}
                  </h4>
                </div>
                <div className="myFeedbackScoreBadge">
                  <strong>
                    {sub.band != null && Number.isFinite(Number(sub.band)) ? Number(sub.band).toFixed(1) : "N/A"}
                  </strong>
                  <span>band score</span>
                </div>
              </div>

              {renderMetaGrid([
                { label: "Title", value: sub.ListeningTest?.title || "N/A" },
                { label: "Submitted", value: formatDateTime(sub.createdAt) },
                { label: "Teacher", value: sub.ListeningTest?.teacherName || "(Not specified)" },
              ])}

              {renderStats([
                { label: "Correct", value: correctCount, color: colors.primary },
                { label: "Questions", value: totalCount, color: colors.primary },
                { label: "Accuracy", value: `${accuracy}%`, color: getAccuracyColor(accuracy) },
              ])}

              <div className="myFeedbackActionRow">
                <a href={`/listening-results/${sub.id}`} className="myFeedbackActionLink">
                  <LineIcon name="eye" size={16} />
                  <span>View Result Details</span>
                </a>
              </div>

              {renderFeedbackBlock(sub, "No teacher feedback yet.")}
            </article>
          );
        })}

        {activeTab === "cambridge" && filteredCambridge.map((sub, idx) => (
          <article key={sub.id || idx} className="myFeedbackCard myFeedbackCard--cambridge">
            <div className="myFeedbackCardHeader">
              <div className="myFeedbackCardHeading">
                <span className="myFeedbackCardEyebrow">Orange submission</span>
                <h4 className="myFeedbackCardTitle">{sub.testTitle || sub.title || "Orange result"}</h4>
              </div>
              <div className="myFeedbackScoreBadge">
                <strong>
                  {typeof sub.score === "number" && typeof sub.totalQuestions === "number"
                    ? `${sub.score}/${sub.totalQuestions}`
                    : "--"}
                </strong>
                <span>score</span>
              </div>
            </div>

            {renderMetaGrid([
              { label: "Test type", value: sub.testType || "Orange" },
              { label: "Class", value: sub.classCode || "(Not specified)" },
              { label: "Teacher", value: sub.teacherName || "(Not specified)" },
              { label: "Submitted", value: formatDateTime(sub.submittedAt || sub.createdAt) },
            ])}

            <div className="myFeedbackActionRow">
              <a href={`/cambridge/result/${sub.id}`} className="myFeedbackActionLink">
                <LineIcon name="eye" size={16} />
                <span>View Full Result</span>
              </a>
            </div>

            {renderFeedbackBlock(sub, "No teacher feedback yet.")}
          </article>
        ))}
                </div>
              </section>
            </main>
          </div>
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

