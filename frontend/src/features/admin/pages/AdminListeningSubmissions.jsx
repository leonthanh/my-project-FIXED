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

        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <button
            style={{ ...actionBtn, background: '#0ea5a3' }}
            onClick={async () => {
              if (!window.confirm('Chạy rescore cho các bài thiếu/không khớp (an toàn). Bạn có muốn tiếp tục?')) return;
              try {
                const res = await fetch(apiPath('listening-submissions/rescore'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: false }) });
                const payload = await res.json();
                if (!res.ok) throw new Error(payload?.message || 'Rescore failed');
                alert(`✅ Rescore completed. Updated ${payload.updated} submissions.`);
                // Refresh list
                window.location.reload();
              } catch (err) {
                alert('❌ Rescore error: ' + err.message);
              }
            }}
          >
            🔁 Rescore missing / inconsistent
          </button>
        </div>

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
