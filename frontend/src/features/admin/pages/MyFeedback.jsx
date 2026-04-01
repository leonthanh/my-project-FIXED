import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { useTheme } from "../../../shared/contexts/ThemeContext";

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
      console.error("❌ Lỗi khi tải bài viết:", err);
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
      console.error("❌ Lỗi khi tải bài Reading:", err);
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
      console.error("❌ Lỗi khi tải Cambridge submissions:", err);
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
        fetchCambridgeData(user.phone),
      ]);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchWritingData, fetchReadingData, fetchCambridgeData, user]);

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
      console.error("❌ Lỗi khi tải phân tích:", err);
      setAnalysisData(null);
      setShowAnalysis(true);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (!user) return <p style={{ padding: 40 }}>❌ Bạn chưa đăng nhập.</p>;

  const currentSubmissions =
    activeTab === "writing"
      ? filteredWriting
      : activeTab === "reading"
        ? filteredReading
        : filteredCambridge;

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
          <h2>📚 Bài làm & Nhận xét của tôi</h2>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab("writing")}
            style={{
              padding: "12px 24px",
              backgroundColor:
                activeTab === "writing" ? colors.primary : colors.surfaceAlt,
              color: activeTab === "writing" ? "#fff" : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: activeTab === "writing" ? "bold" : "normal",
            }}
          >
            📝 Writing ({writingSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab("reading")}
            style={{
              padding: "12px 24px",
              backgroundColor:
                activeTab === "reading" ? colors.primary : colors.surfaceAlt,
              color: activeTab === "reading" ? "#fff" : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: activeTab === "reading" ? "bold" : "normal",
            }}
          >
            📖 Reading ({readingSubmissions.length})
          </button>

          <button
            onClick={() => setActiveTab("cambridge")}
            style={{
              padding: "12px 24px",
              backgroundColor:
                activeTab === "cambridge" ? colors.primary : colors.surfaceAlt,
              color: activeTab === "cambridge" ? "#fff" : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: activeTab === "cambridge" ? "bold" : "normal",
            }}
          >
            🎓 Cambridge ({cambridgeSubmissions.length})
          </button>
        </div>

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
              🧾 Mã lớp:
            </label>
            <input
              type="text"
              placeholder="Nhập mã lớp"
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
              👨‍🏫 Giáo viên đề:
            </label>
            <input
              type="text"
              placeholder="Nhập tên giáo viên"
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
              ✍️ Giáo viên chấm:
            </label>
            <input
              type="text"
              placeholder="Nhập tên giáo viên chấm"
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
            🔄 Reset
          </button>
        </div>

        {/* Results count */}
        <p style={{ color: colors.muted, marginBottom: 15 }}>
          📊 Tổng cộng: <strong>{currentSubmissions.length}</strong> bài{" "}
          {activeTab === "writing" ? "viết" : activeTab === "reading" ? "đọc" : "Cambridge"}
          {(searchClassCode || searchTeacher || searchFeedbackBy) &&
            ` (lọc từ ${
              activeTab === "writing"
                ? writingSubmissions.length
                : activeTab === "reading"
                  ? readingSubmissions.length
                  : cambridgeSubmissions.length
            })`}
        </p>

        {loading && <p>⏳ Đang tải dữ liệu...</p>}

        {!loading && currentSubmissions.length === 0 && (
          <p style={{ color: colors.danger, fontWeight: "bold" }}>
            🙁 {searchClassCode || searchTeacher || searchFeedbackBy
              ? "Không tìm thấy bài phù hợp."
              : `Bạn chưa nộp bài ${
                  activeTab === "writing" ? "viết" : activeTab === "reading" ? "đọc" : "Cambridge"
                } nào.`}
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
              <strong>📋 Mã đề:</strong> Writing {sub.WritingTest?.index || "?"} –{" "}
              {sub.WritingTest?.classCode || "(Không xác định)"} –{" "}
              {sub.WritingTest?.teacherName || "(Không xác định)"}
            </p>
            <p>
              <strong>⏰ Nộp lúc:</strong>{" "}
              {new Date(sub.submittedAt || sub.createdAt).toLocaleString("vi-VN")}
            </p>
            <p>
              <strong>⏳ Thời gian còn lại:</strong> {Math.floor(sub.timeLeft / 60)} phút
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

            <h4>✍️ Bài làm Task 1:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{sub.task1}</p>

            <h4>✍️ Bài làm Task 2:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{sub.task2}</p>

            <h4 style={{ marginTop: 20 }}>
              📩 Nhận xét từ giáo viên:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Không xác định"}
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
                  🕐 <strong>Thời gian nhận xét:</strong>{" "}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString("vi-VN") : "Không rõ"}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>Chưa có nhận xét nào.</p>
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
                  <strong>📋 Mã đề:</strong> Reading #{sub.testId} –{" "}
                  {sub.ReadingTest?.classCode || "(Không xác định)"} –{" "}
                  {sub.ReadingTest?.teacherName || "(Không xác định)"}
                </p>
                <p>
                  <strong>📝 Tên đề:</strong> {sub.ReadingTest?.title || "N/A"}
                </p>
                <p>
                  <strong>⏰ Nộp lúc:</strong>{" "}
                  {new Date(sub.createdAt).toLocaleString("vi-VN")}
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
                <div style={{ fontSize: 12, color: colors.muted }}>Câu đúng</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                  {sub.total || 0}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>Tổng câu</div>
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
                <div style={{ fontSize: 12, color: colors.muted }}>Tỷ lệ đúng</div>
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
              📊 Xem phân tích chi tiết
            </button>

            {/* Teacher feedback */}
            <h4 style={{ marginTop: 10 }}>
              📩 Nhận xét từ giáo viên:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Chưa có"}
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
                  🕐 <strong>Thời gian nhận xét:</strong>{" "}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString("vi-VN") : "Không rõ"}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>Chưa có nhận xét từ giáo viên.</p>
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
                📋 Xem chi tiết đáp án →
              </a>
            </div>
          </div>
        ))}

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
                  <strong>📋 Loại bài:</strong> {sub.testType || "Cambridge"}
                </p>
                <p>
                  <strong>📝 Tên đề:</strong> {sub.testTitle || "N/A"}
                </p>
                <p>
                  <strong>🧾 Lớp:</strong> {sub.classCode || "(Không xác định)"}
                </p>
                <p>
                  <strong>👨‍🏫 Giáo viên đề:</strong> {sub.teacherName || "(Không xác định)"}
                </p>
                <p>
                  <strong>⏰ Nộp lúc:</strong>{" "}
                  {new Date(sub.submittedAt || sub.createdAt).toLocaleString("vi-VN")}
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
              📩 Nhận xét từ giáo viên:{" "}
              <span style={{ color: colors.primary, fontWeight: "bold" }}>
                {sub.feedbackBy || "Chưa có"}
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
                  🕐 <strong>Thời gian nhận xét:</strong>{" "}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString("vi-VN") : "Không rõ"}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: colors.muted }}>Chưa có nhận xét từ giáo viên.</p>
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
                📋 Xem chi tiết bài làm →
              </a>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysis && analysisData && (
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
              <h3 style={{ margin: 0 }}>📊 Phân tích chi tiết</h3>
              <button
                onClick={() => setShowAnalysis(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: colors.text
                }}
              >
                ✕
              </button>
            </div>

            {analysisData.analysisText ? (
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
              <p>Không có dữ liệu phân tích.</p>
            )}

            {/* Breakdown by type */}
            {analysisData.breakdown?.byType && (
              <div style={{ marginTop: 20 }}>
                <h4>📈 Chi tiết theo dạng câu hỏi:</h4>
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
                        {t.correct}/{t.total} câu đúng
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
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MyFeedback;

