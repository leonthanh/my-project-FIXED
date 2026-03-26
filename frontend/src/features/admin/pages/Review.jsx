// frontend/src/features/admin/pages/Review.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath } from "../../../shared/utils/api";

const Review = () => {
  const { isDarkMode } = useTheme();
  const teacher = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("writing"); // writing | cambridge

  // Writing IELTS
  const [unreviewedWriting, setUnreviewedWriting] = useState([]);
  const [unreviewedPetWriting, setUnreviewedPetWriting] = useState([]);
  const [loadingWriting, setLoadingWriting] = useState(true);

  // Cambridge
  const [cambridgeSubmissions, setCambridgeSubmissions] = useState([]);
  const [loadingCambridge, setLoadingCambridge] = useState(true);
  const [cambridgeError, setCambridgeError] = useState(null);
  const [expandedCambridge, setExpandedCambridge] = useState(() => new Set());
  const [cambridgeDetailsById, setCambridgeDetailsById] = useState({});
  const [cambridgeLoadingDetailById, setCambridgeLoadingDetailById] = useState({});
  const [cambridgeFeedbackDraftById, setCambridgeFeedbackDraftById] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnreviewedWriting = async () => {
      setLoadingWriting(true);
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();

        // lọc bài chưa có nhận xét
        const filtered = Array.isArray(all) ? all.filter((sub) => !sub.feedback) : [];
        const petWriting = filtered.filter((sub) =>
          String(sub?.writing_test?.testType || sub?.WritingTest?.testType || sub?.testType || "").toLowerCase() === "pet-writing"
        );
        const writingIelts = filtered.filter((sub) => !petWriting.includes(sub));

        setUnreviewedPetWriting(petWriting);
        setUnreviewedWriting(writingIelts);
      } catch (err) {
        console.error("❌ Lỗi khi tải bài chưa chấm:", err);
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
        // Fetch recent submissions; filter client-side for items needing review
        const res = await fetch(apiPath("cambridge/submissions?page=1&limit=100"));
        if (!res.ok) throw new Error("Không thể tải danh sách bài nộp Cambridge");
        const data = await res.json();
        const subs = Array.isArray(data?.submissions) ? data.submissions : (Array.isArray(data) ? data : []);
        // Needs review: status !== reviewed (backend sets reviewed when feedback exists)
        const needReview = subs.filter((s) => String(s.status || "").toLowerCase() !== "reviewed");
        setCambridgeSubmissions(needReview);
      } catch (err) {
        console.error("❌ Lỗi khi tải Cambridge submissions:", err);
        setCambridgeError(err.message);
        setCambridgeSubmissions([]);
      } finally {
        setLoadingCambridge(false);
      }
    };

    fetchUnreviewedWriting();
    fetchCambridgeSubmissions();
  }, []);

  const cambridgeNeedsReviewCount = cambridgeSubmissions.length + unreviewedPetWriting.length;

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

    const pending = Object.entries(detailedResults)
      .filter(([, r]) => r && typeof r === "object" && r.isCorrect === null)
      .map(([key, r]) => ({
        key,
        userAnswer: typeof r.userAnswer === "string" ? r.userAnswer : "",
      }))
      .filter((x) => x.userAnswer.trim().length > 0);

    return pending;
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

    return [...petRows, ...cambridgeRows].sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [unreviewedPetWriting, cambridgeSubmissions]);

  const handleToggleCambridgeDetail = async (submissionId) => {
    setExpandedCambridge((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });

    if (cambridgeDetailsById[submissionId] || cambridgeLoadingDetailById[submissionId]) return;

    try {
      setCambridgeLoadingDetailById((prev) => ({ ...prev, [submissionId]: true }));
      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`));
      if (!res.ok) throw new Error("Không thể tải chi tiết bài nộp");
      const detail = await res.json();

      setCambridgeDetailsById((prev) => ({ ...prev, [submissionId]: detail }));
      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]: typeof detail?.feedback === "string" ? detail.feedback : (prev[submissionId] || ""),
      }));
    } catch (err) {
      console.error("❌ Lỗi khi tải chi tiết Cambridge submission:", err);
    } finally {
      setCambridgeLoadingDetailById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleSaveCambridgeFeedback = async (submissionId) => {
    const feedback = (cambridgeFeedbackDraftById[submissionId] || "").trim();
    if (!feedback) return;

    try {
      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          feedbackBy: teacher?.name || teacher?.username || teacher?.fullName || "Teacher",
          status: "reviewed",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Không thể lưu nhận xét");
      }

      // Remove from needs-review list
      setCambridgeSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setExpandedCambridge((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu nhận xét Cambridge:", err);
      alert("❌ " + err.message);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="admin-page">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }} className="admin-header-row">
          <h3 style={{ margin: 0 }}>📝 Danh sách bài cần nhận xét</h3>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }} className="admin-tabs">
        <button
          onClick={() => setActiveTab("writing")}
          style={{
            ...tabStyle,
            ...(activeTab === "writing" ? tabActiveStyle : {}),
          }}
        >
          ✍️ Writing IELTS
          {unreviewedWriting.length > 0 ? ` (${unreviewedWriting.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("cambridge")}
          style={{
            ...tabStyle,
            ...(activeTab === "cambridge" ? tabActiveStyle : {}),
          }}
        >
          📚 Cambridge
          {cambridgeNeedsReviewCount > 0 ? ` (${cambridgeNeedsReviewCount})` : ""}
        </button>
      </div>

      {/* Writing IELTS tab */}
      {activeTab === "writing" && (
        <>
          {loadingWriting && <p>⏳ Đang tải dữ liệu...</p>}
          {!loadingWriting && unreviewedWriting.length === 0 && (
            <p>✅ Không có bài viết nào cần chấm.</p>
          )}
          {!loadingWriting && unreviewedWriting.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "20px",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f2f2f2" }}>
                  <th style={cellStyle}>#</th>
                  <th style={cellStyle}>👤 Học sinh</th>
                  <th style={cellStyle}>📞 SĐT</th>
                  <th style={cellStyle}>🧾 Mã đề</th>
                  <th style={cellStyle}>⏱ Thời gian nộp</th>
                  <th style={cellStyle}>✏️</th>
                </tr>
              </thead>
              <tbody>
                {unreviewedWriting.map((sub, idx) => {
                  const writingTest = sub.writing_test || sub.WritingTest || {};
                  return (
                    <tr key={sub.id} style={{ borderBottom: "1px solid #ccc" }}>
                      <td style={cellStyle}>{idx + 1}</td>
                      <td style={cellStyle}>
                        {sub.userName || sub.user?.name || "N/A"}
                      </td>
                      <td style={cellStyle}>
                        {sub.userPhone || sub.user?.phone || "N/A"}
                      </td>
                      <td style={cellStyle}>
                        Writing {writingTest.index || "N/A"}
                        {writingTest.classCode ? ` – ${writingTest.classCode}` : ""}
                        {writingTest.teacherName
                          ? ` – ${writingTest.teacherName}`
                          : ""}
                      </td>
                      <td style={cellStyle}>
                        {new Date(
                          sub.submittedAt || sub.createdAt
                        ).toLocaleString()}
                      </td>
                      <td style={cellStyle}>
                        <button
                          onClick={() => navigate(`/review/${sub.id}`)}
                          style={primaryButtonStyle}
                        >
                          ✏️ Nhận xét
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

      {/* Cambridge tab */}
      {activeTab === "cambridge" && (
        <>
          {loadingWriting && <p>⏳ Đang tải PET Writing...</p>}
          {loadingCambridge && <p>⏳ Đang tải Cambridge submissions...</p>}
          {!loadingCambridge && cambridgeError && (
            <p style={{ color: "#dc2626" }}>❌ {cambridgeError}</p>
          )}
          {!loadingWriting && !loadingCambridge && !cambridgeError && mergedCambridgeRows.length === 0 && (
            <p>✅ Không có bài Cambridge nào cần chấm.</p>
          )}

          {!loadingCambridge && !cambridgeError && mergedCambridgeRows.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "20px",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f2f2f2" }}>
                  <th style={cellStyle}>#</th>
                  <th style={cellStyle}>📚 Loại</th>
                  <th style={cellStyle}>👤 Học sinh</th>
                  <th style={cellStyle}>📞 SĐT</th>
                  <th style={cellStyle}>🧾 Lớp</th>
                  <th style={cellStyle}>📊 Điểm</th>
                  <th style={cellStyle}>⏱ Nộp lúc</th>
                  <th style={cellStyle}>📝 Câu tự luận</th>
                  <th style={cellStyle}>✏️</th>
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
                            ✏️ Nhận xét
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
                  const hasTwo = pendingAnswers.length >= 2;

                  return (
                    <React.Fragment key={`cam-${sub.id}`}>
                      <tr style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={cellStyle}>{idx + 1}</td>
                        <td style={cellStyle}>{String(sub.testType || "Cambridge")}</td>
                        <td style={cellStyle}>{sub.studentName || "N/A"}</td>
                        <td style={cellStyle}>{sub.studentPhone || "N/A"}</td>
                        <td style={cellStyle}>{sub.classCode || "N/A"}</td>
                        <td style={cellStyle}>
                          {typeof sub.score === "number" && typeof sub.totalQuestions === "number"
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
                            {isExpanded ? "Ẩn" : "Xem"}
                          </button>
                        </td>
                        <td style={cellStyle}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => navigate(`/cambridge/result/${sub.id}`)}
                              style={secondaryButtonStyle}
                            >
                              📄 Xem bài
                            </button>
                          </div>
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
                            {isLoadingDetail && <div>⏳ Đang tải chi tiết...</div>}
                            {!isLoadingDetail && detail && (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div style={{ display: "grid", gap: 8 }}>
                                  <div style={{ fontWeight: 700 }}>
                                    ✍️ Nội dung cần chấm (các câu isCorrect=null)
                                  </div>
                                  {pendingAnswers.length === 0 ? (
                                    <div style={{ color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                                      (Không tìm thấy câu tự luận/pending trong bài này. Bạn có thể bấm “📄 Xem bài” để kiểm tra.)
                                    </div>
                                  ) : (
                                    <div style={{ display: "grid", gap: 10 }}>
                                      <div style={{ display: "grid", gap: 8 }}>
                                        <div style={answerBoxStyle(isDarkMode)}>
                                          <div style={{ fontWeight: 700 }}>
                                            {hasTwo ? "Câu 31" : "Câu tự luận 1"}
                                          </div>
                                          <div style={{ whiteSpace: "pre-wrap" }}>{pendingAnswers[0]?.userAnswer}</div>
                                        </div>
                                        {pendingAnswers[1] && (
                                          <div style={answerBoxStyle(isDarkMode)}>
                                            <div style={{ fontWeight: 700 }}>
                                              {hasTwo ? "Câu 32" : "Câu tự luận 2"}
                                            </div>
                                            <div style={{ whiteSpace: "pre-wrap" }}>{pendingAnswers[1]?.userAnswer}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                                  <div style={{ fontWeight: 700 }}>📝 Nhận xét của giáo viên</div>
                                  <textarea
                                    rows={4}
                                    value={cambridgeFeedbackDraftById[sub.id] || ""}
                                    onChange={(e) =>
                                      setCambridgeFeedbackDraftById((prev) => ({
                                        ...prev,
                                        [sub.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Nhập nhận xét..."
                                    style={{
                                      width: "100%",
                                      padding: 10,
                                      border: `1px solid ${isDarkMode ? "#2a3350" : "#d1d5db"}`,
                                      borderRadius: 8,
                                      fontSize: 14,
                                      background: isDarkMode ? "#0f172a" : "#fff",
                                      color: isDarkMode ? "#e5e7eb" : "#111827",
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <button
                                      onClick={() => handleSaveCambridgeFeedback(sub.id)}
                                      style={primaryButtonStyle}
                                      disabled={!(cambridgeFeedbackDraftById[sub.id] || "").trim()}
                                    >
                                      ✅ Lưu nhận xét
                                    </button>
                                    <span style={{ color: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 13 }}>
                                      Lưu sẽ chuyển bài sang trạng thái “reviewed”.
                                    </span>
                                  </div>
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

// CSS cho từng ô trong bảng
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

