import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath, authFetch } from "../../../shared/utils/api";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
import {
  formatAttemptTimestamp,
  getAttemptTimingMeta,
} from "../utils/attemptTiming";

const AdminReadingSubmissions = () => {
  const { isDarkMode } = useTheme();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  // Open feedback modal
  const openFeedbackModal = (sub) => {
    setSelectedSubmission(sub);
    setFeedbackText(sub.feedback || "");
    setShowFeedbackModal(true);
  };

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
      setShowFeedbackModal(false);
      alert("✅ Đã lưu nhận xét!");
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
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
      alert("❌ Lỗi khi tải phân tích: " + err.message);
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
        throw new Error(data?.message || "Gia hạn thất bại");
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
      alert(data?.message || "Đã gia hạn thời gian.");
      return true;
    } catch (err) {
      alert(`❌ ${err.message}`);
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }} className="admin-page">
        <h2>📥 Reading Submissions</h2>

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

        {loading && <p>⏳ Loading...</p>}
        {!loading && filteredSubs.length === 0 && <p>Không có bài nộp phù hợp</p>}
        {!loading && filteredSubs.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0e276f", color: "white" }}>
                <th style={cellStyle}>#</th>
                <th style={cellStyle}>Mã lớp</th>
                <th style={cellStyle}>Giáo viên</th>
                <th style={cellStyle}>Học sinh</th>
                <th style={cellStyle}>SĐT</th>
                <th style={cellStyle}>Điểm</th>
                <th style={cellStyle}>Band</th>
                <th style={cellStyle}>Nhận xét</th>
                <th style={cellStyle}>Nộp lúc</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((s, idx) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee", background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
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
                      <span style={{ color: "#16a34a" }}>✅ {s.feedbackBy || "Đã có"}</span>
                    ) : (
                      <span style={{ color: "#dc2626" }}>❌ Chưa có</span>
                    )}
                  </td>
                  <td style={cellStyle}>
                    {s.finished === false ? (
                      <div>
                        <div style={{ fontWeight: 700, color: "#1d4ed8" }}>Đang làm</div>
                        <div style={{ fontSize: 12, color: timingMeta?.color || "#64748b" }}>
                          {timingMeta?.label || "Chưa có deadline"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Lưu: {formatAttemptTimestamp(s.lastSavedAt || s.updatedAt || s.createdAt)}
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
                        title="Xem chi tiết đáp án"
                      >
                        📋 Chi tiết
                      </button>
                      <button
                        onClick={() => loadAnalysis(s)}
                        style={{ ...actionBtn, background: "#4f46e5" }}
                        title="Xem phân tích"
                      >
                        📊 Phân tích
                      </button>
                      <button
                        onClick={() => openFeedbackModal(s)}
                        style={{ ...actionBtn, background: s.feedback ? "#16a34a" : "#ca8a04" }}
                        title="Thêm/sửa nhận xét"
                      >
                        ✍️ Nhận xét
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
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedSubmission && (
        <div style={modalOverlay(isDarkMode)} onClick={() => setShowFeedbackModal(false)}>
          <div style={modalContent(isDarkMode)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>✍️ Nhận xét bài làm</h3>
              <button onClick={() => setShowFeedbackModal(false)} style={closeBtn(isDarkMode)}>✕</button>
            </div>

            <div style={{ marginBottom: 15, padding: 15, background: isDarkMode ? "#0f172a" : "#f3f4f6", borderRadius: 8, border: isDarkMode ? "1px solid #2a3350" : "none" }}>
              <p><strong>Học sinh:</strong> {selectedSubmission.userName || "N/A"}</p>
              <p><strong>Mã lớp:</strong> {selectedSubmission.ReadingTest?.classCode || "N/A"}</p>
              <p><strong>Điểm:</strong> {selectedSubmission.correct}/{selectedSubmission.total} ({selectedSubmission.scorePercentage}%) - Band {selectedSubmission.band}</p>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Giáo viên chấm:
              </label>
              <input
                type="text"
                value={feedbackBy}
                onChange={(e) => setFeedbackBy(e.target.value)}
                placeholder="Tên giáo viên..."
                style={{ ...inputStyle, width: "100%", background: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#e5e7eb" : "#111827", borderColor: isDarkMode ? "#2a3350" : "#ccc" }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Nhận xét:
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Nhập nhận xét cho học sinh..."
                rows={8}
                style={{ ...inputStyle, width: "100%", resize: "vertical", background: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#e5e7eb" : "#111827", borderColor: isDarkMode ? "#2a3350" : "#ccc" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowFeedbackModal(false)}
                style={{ ...actionBtn, background: "#6b7280" }}
              >
                Hủy
              </button>
              <button
                onClick={saveFeedback}
                disabled={savingFeedback}
                style={{ ...actionBtn, background: "#16a34a" }}
              >
                {savingFeedback ? "Đang lưu..." : "💾 Lưu nhận xét"}
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
              <h3 style={{ margin: 0 }}>📊 Phân tích chi tiết</h3>
              <button onClick={() => setShowAnalysisModal(false)} style={closeBtn(isDarkMode)}>✕</button>
            </div>

            {loadingAnalysis ? (
              <p>⏳ Đang tải...</p>
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
                    <h4>📈 Theo dạng câu hỏi:</h4>
                    {analysisData.breakdown.byType.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: isDarkMode ? "1px solid #2a3350" : "1px solid #eee" }}>
                        <div style={{ flex: 1 }}>
                          <strong>{t.label}</strong>
                          <div style={{ fontSize: 12, color: isDarkMode ? "#9ca3af" : "#666" }}>{t.correct}/{t.total} câu đúng</div>
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
                    <h4 style={{ margin: "0 0 10px 0", color: isDarkMode ? "#fca5a5" : "#dc2626" }}>💡 Cần cải thiện:</h4>
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
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const cellStyle = { padding: 8, border: "1px solid #ddd", textAlign: "left" };
const inputStyle = { padding: 10, border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
const actionBtn = { padding: "6px 12px", background: "#0e276f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
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
  fontSize: 24,
  cursor: "pointer",
  color: isDarkMode ? "#e5e7eb" : "#111827",
});

export default AdminReadingSubmissions;

