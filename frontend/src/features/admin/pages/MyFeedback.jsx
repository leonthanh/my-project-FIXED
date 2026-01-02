import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { StudentNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";

const MyFeedback = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState("writing");
  
  // Writing state
  const [writingSubmissions, setWritingSubmissions] = useState([]);
  const [filteredWriting, setFilteredWriting] = useState([]);
  
  // Reading state
  const [readingSubmissions, setReadingSubmissions] = useState([]);
  const [filteredReading, setFilteredReading] = useState([]);
  
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

  useEffect(() => {
    if (!user?.phone || hasFetched.current) return;
    hasFetched.current = true;
    
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchWritingData(user.phone), fetchReadingData(user.phone)]);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchWritingData, fetchReadingData, user]);

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

  const currentSubmissions = activeTab === "writing" ? filteredWriting : filteredReading;

  return (
    <>
      <StudentNavbar />
      <div style={{ padding: "30px", maxWidth: 1200, margin: "0 auto" }}>
        <h2>📚 Bài làm & Nhận xét của tôi</h2>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab("writing")}
            style={{
              padding: "12px 24px",
              backgroundColor: activeTab === "writing" ? "#0e276f" : "#e0e0e0",
              color: activeTab === "writing" ? "white" : "#333",
              border: "none",
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
              backgroundColor: activeTab === "reading" ? "#0e276f" : "#e0e0e0",
              color: activeTab === "reading" ? "white" : "#333",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: activeTab === "reading" ? "bold" : "normal",
            }}
          >
            📖 Reading ({readingSubmissions.length})
          </button>
        </div>

        {/* Search Form */}
        <div
          style={{
            background: "#f0f0f0",
            padding: 20,
            borderRadius: 8,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 15,
            alignItems: "end",
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
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
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
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
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
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
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
              backgroundColor: "#666",
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
        <p style={{ color: "#666", marginBottom: 15 }}>
          📊 Tổng cộng: <strong>{currentSubmissions.length}</strong> bài{" "}
          {activeTab === "writing" ? "viết" : "đọc"}
          {(searchClassCode || searchTeacher || searchFeedbackBy) &&
            ` (lọc từ ${activeTab === "writing" ? writingSubmissions.length : readingSubmissions.length})`}
        </p>

        {loading && <p>⏳ Đang tải dữ liệu...</p>}

        {!loading && currentSubmissions.length === 0 && (
          <p style={{ color: "#d32f2f", fontWeight: "bold" }}>
            🙁 {searchClassCode || searchTeacher || searchFeedbackBy
              ? "Không tìm thấy bài phù hợp."
              : `Bạn chưa nộp bài ${activeTab === "writing" ? "viết" : "đọc"} nào.`}
          </p>
        )}

        {/* Writing submissions list */}
        {activeTab === "writing" && filteredWriting.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              backgroundColor: "#f9f9f9",
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
              <span style={{ color: "#0e276f", fontWeight: "bold" }}>
                {sub.feedbackBy || "Không xác định"}
              </span>
            </h4>
            {sub.feedback ? (
              <div style={{ background: "#e7f4e4", padding: 10, borderRadius: 6 }}>
                <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                <p style={{ fontSize: 14, color: "#555" }}>
                  🕐 <strong>Thời gian nhận xét:</strong>{" "}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString("vi-VN") : "Không rõ"}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: "#999" }}>Chưa có nhận xét nào.</p>
            )}
          </div>
        ))}

        {/* Reading submissions list */}
        {activeTab === "reading" && filteredReading.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              backgroundColor: "#f9f9f9",
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
                background: "#111827",
                color: "#fff",
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
              background: "#e8f4fd",
              borderRadius: 8
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#0e276f" }}>
                  {sub.correct || 0}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>Câu đúng</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#0e276f" }}>
                  {sub.total || 0}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>Tổng câu</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: sub.scorePercentage >= 70 ? "#16a34a" : sub.scorePercentage >= 50 ? "#ca8a04" : "#dc2626" }}>
                  {sub.scorePercentage || 0}%
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>Tỷ lệ đúng</div>
              </div>
            </div>

            {/* Analysis button */}
            <button
              onClick={() => loadAnalysis(sub.id)}
              disabled={loadingAnalysis}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4f46e5",
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
              <span style={{ color: "#0e276f", fontWeight: "bold" }}>
                {sub.feedbackBy || "Chưa có"}
              </span>
            </h4>
            {sub.feedback ? (
              <div style={{ background: "#e7f4e4", padding: 10, borderRadius: 6 }}>
                <p style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{sub.feedback}</p>
                <p style={{ fontSize: 14, color: "#555" }}>
                  🕐 <strong>Thời gian nhận xét:</strong>{" "}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString("vi-VN") : "Không rõ"}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: "#999" }}>Chưa có nhận xét từ giáo viên.</p>
            )}

            {/* View details link */}
            <div style={{ marginTop: 15 }}>
              <a
                href={`/reading-results/${sub.id}`}
                style={{
                  color: "#0e276f",
                  textDecoration: "underline",
                  fontSize: 14
                }}
              >
                📋 Xem chi tiết đáp án →
              </a>
            </div>
          </div>
        ))}
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
              background: "white",
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
                  cursor: "pointer"
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
                background: "#f8fafc",
                padding: 20,
                borderRadius: 8
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
                      borderBottom: "1px solid #eee"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{t.label}</strong>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {t.correct}/{t.total} câu đúng
                      </div>
                    </div>
                    <div style={{
                      width: 100,
                      height: 8,
                      background: "#e5e7eb",
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
                      color: t.status === "good" ? "#16a34a" : t.status === "average" ? "#ca8a04" : "#dc2626"
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
                backgroundColor: "#0e276f",
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
