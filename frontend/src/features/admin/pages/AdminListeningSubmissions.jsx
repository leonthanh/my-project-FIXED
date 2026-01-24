import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { apiPath } from "../../../shared/utils/api";
import { generateDetailsFromSections } from "../../listening/pages/ListeningResults";

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

const AdminListeningSubmissions = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
  const [filterFeedback, setFilterFeedback] = useState("all"); // all, with, without

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

          const correct = Number(s.correct) || 0;
          const percentage = s.computedPercentage != null ? Number(s.computedPercentage) : (computedTotal ? Math.round((correct / computedTotal) * 100) : 0);

          return { ...s, parsedDetails, computedTotal, computedPercentage: percentage };
        });

        setSubs(mapped);
      } catch (err) {
        console.error("Error fetching listening submissions:", err);
        setSubs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubs();

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.name) setFeedbackBy(user.name);
  }, []);

  const filteredSubs = subs.filter((s) => {
    const classCode = s.ListeningTest?.classCode || s.classCode || "";
    const teacherName = s.ListeningTest?.teacherName || s.teacherName || "";

    if (
      searchClassCode &&
      !classCode.toLowerCase().includes(searchClassCode.toLowerCase())
    )
      return false;
    if (
      searchTeacher &&
      !teacherName.toLowerCase().includes(searchTeacher.toLowerCase())
    )
      return false;
    if (searchStudent && !String(s.userName || "").toLowerCase().includes(searchStudent.toLowerCase()))
      return false;
    if (filterFeedback === "with" && !s.feedback) return false;
    if (filterFeedback === "without" && s.feedback) return false;

    return true;
  });

  const openFeedbackModal = (sub) => {
    setSelectedSubmission(sub);
    setFeedbackText(sub.feedback || "");
    setShowFeedbackModal(true);
  };

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

      setShowFeedbackModal(false);
      alert("✅ Đã lưu nhận xét!");
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }} className="admin-page">
        <h2>📥 Listening Submissions</h2>

        <div
          className="admin-filter-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 150px",
            gap: 15,
            marginBottom: 20,
            padding: 15,
            background: "#f3f4f6",
            borderRadius: 8,
          }}
        >
          <input
            type="text"
            placeholder="🔍 Mã lớp..."
            value={searchClassCode}
            onChange={(e) => setSearchClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="🔍 Giáo viên đề..."
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="🔍 Học sinh..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filterFeedback}
            onChange={(e) => setFilterFeedback(e.target.value)}
            style={inputStyle}
          >
            <option value="all">Tất cả</option>
            <option value="with">Đã nhận xét</option>
            <option value="without">Chưa nhận xét</option>
          </select>
        </div>

        <p style={{ color: "#666", marginBottom: 10 }}>
          📊 Hiển thị: <strong>{filteredSubs.length}</strong> / {subs.length} bài nộp
        </p>

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
                <th style={cellStyle}>Điểm</th>
                <th style={cellStyle}>Band</th>
                <th style={cellStyle}>Nhận xét</th>
                <th style={cellStyle}>Nộp lúc</th>
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
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>
                    {s.ListeningTest?.classCode || s.classCode || "N/A"}
                  </td>
                  <td style={cellStyle}>
                    {s.ListeningTest?.teacherName || s.teacherName || "N/A"}
                  </td>
                  <td style={cellStyle}>{s.userName || "N/A"}</td>
                  <td style={cellStyle}>
                    <span style={{ fontWeight: "bold" }}>
                      {Number(s.correct) || 0}/{s.computedTotal || s.total || 40}
                    </span>
                    <span style={{ color: "#666", fontSize: 12 }}>
                      {" "}
                      ({s.computedPercentage != null ? s.computedPercentage : (s.scorePercentage || 0)}%)
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: 4,
                        fontWeight: "bold",
                      }}
                    >
                      {s.band != null && Number.isFinite(Number(s.band))
                        ? Number(s.band).toFixed(1)
                        : "N/A"}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    {s.feedback ? (
                      <span style={{ color: "#16a34a" }}>
                        ✅ {s.feedbackBy || "Đã có"}
                      </span>
                    ) : (
                      <span style={{ color: "#dc2626" }}>❌ Chưa có</span>
                    )}
                  </td>
                  <td style={cellStyle}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleString("vi-VN") : "N/A"}
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }} className="admin-action-buttons">
                      <button
                        onClick={() => navigate(`/listening-results/${s.id}`)}
                        style={actionBtn}
                        title="Xem chi tiết"
                      >
                        📋 Chi tiết
                      </button>
                      <button
                        onClick={() => openFeedbackModal(s)}
                        style={{ ...actionBtn, background: "#f59e0b" }}
                        title="Nhận xét"
                      >
                        ✍️ Nhận xét
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}

        {showFeedbackModal && selectedSubmission && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3>✍️ Nhận xét Listening Submission #{selectedSubmission.id}</h3>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Người nhận xét
                  </div>
                  <input
                    value={feedbackBy}
                    onChange={(e) => setFeedbackBy(e.target.value)}
                    style={inputStyle}
                    placeholder="Tên giáo viên"
                  />
                </label>

                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Nội dung</div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
                    placeholder="Nhận xét cho học sinh..."
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  style={{ ...actionBtn, background: "#6b7280" }}
                >
                  Hủy
                </button>
                <button
                  onClick={saveFeedback}
                  style={{ ...actionBtn, background: "#16a34a" }}
                  disabled={savingFeedback}
                >
                  {savingFeedback ? "⏳ Đang lưu..." : "✅ Lưu"}
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
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};

const modalContentStyle = {
  width: "min(720px, 92vw)",
  background: "white",
  padding: 24,
  borderRadius: 10,
};

export default AdminListeningSubmissions;
