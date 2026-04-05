import React, { useEffect, useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";
import {
  getAttemptTimingMeta,
  QUICK_EXTENSION_OPTIONS,
} from "../utils/attemptTiming";

const AdminWritingSubmissions = () => {
  const [data, setData] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [bands, setBands] = useState({});
  const [messages, setMessages] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [sendLoading, setSendLoading] = useState({});
  const [hasSaved, setHasSaved] = useState({});

  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudentName, setSearchStudentName] = useState("");
  const [searchFeedbackBy, setSearchFeedbackBy] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("");
  const [extendingId, setExtendingId] = useState(null);

  let teacher = null;
  try {
    teacher = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
    teacher = null;
  }

  useEffect(() => {
    fetch(apiPath("writing/list?includeDrafts=1"))
      .then((res) => res.json())
      .then((items) => {
        setData(items);
        setFilteredData(items);

        const savedMap = {};
        const feedbackMap = {};
        const bandMap = {};
        items.forEach((item) => {
          if (item.feedback && item.feedbackBy) {
            savedMap[item.id] = true;
          }
          if (item.feedback != null) {
            feedbackMap[item.id] = item.feedback;
          }
          if (item.bandTask1 != null || item.bandTask2 != null) {
            bandMap[item.id] = {
              task1: item.bandTask1 != null ? String(item.bandTask1) : "",
              task2: item.bandTask2 != null ? String(item.bandTask2) : "",
            };
          }
        });
        setFeedbacks(feedbackMap);
        setBands(bandMap);
        setHasSaved(savedMap);
      })
      .catch((err) => console.error("Failed to load writing submissions:", err));
  }, []);

  useEffect(() => {
    let filtered = data;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.classCode
          ?.toLowerCase()
          .includes(searchClassCode.toLowerCase())
      );
    }

    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.teacherName
          ?.toLowerCase()
          .includes(searchTeacher.toLowerCase())
      );
    }

    if (searchStudentName.trim()) {
      filtered = filtered.filter((item) =>
        item.userName?.toLowerCase().includes(searchStudentName.toLowerCase())
      );
    }

    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    if (filterStatus === "pending") {
      filtered = filtered.filter((item) => !item.feedback || !item.feedbackBy);
    }

    if (filterStatus === "done") {
      filtered = filtered.filter((item) => !!(item.feedback && item.feedbackBy));
    }

    setFilteredData(filtered);
  }, [
    searchClassCode,
    searchTeacher,
    searchStudentName,
    searchFeedbackBy,
    filterStatus,
    data,
  ]);

  const toggleExpand = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchClassCode("");
    setSearchTeacher("");
    setSearchStudentName("");
    setSearchFeedbackBy("");
    setFilterStatus("");
  };

  const computeOverall = (t1, t2) => {
    const n1 = parseFloat(t1);
    const n2 = parseFloat(t2);
    if (!isNaN(n1) && !isNaN(n2)) {
      return Math.round(((n2 * 2 + n1) / 3) * 2) / 2;
    }
    return "";
  };

  const handleSendFeedback = async (submissionId) => {
    const currentItem = data.find((item) => item.id === submissionId);
    const feedback = feedbacks[submissionId] ?? currentItem?.feedback ?? "";
    if (!feedback || !feedback.trim()) {
      alert("Please enter feedback.");
      return;
    }

    const bandEntry = bands[submissionId] || {};
    const bandTask1 = bandEntry.task1 !== undefined && bandEntry.task1 !== "" ? Number(bandEntry.task1) : null;
    const bandTask2 = bandEntry.task2 !== undefined && bandEntry.task2 !== "" ? Number(bandEntry.task2) : null;
    const bandOverall = bandTask1 !== null && bandTask2 !== null ? computeOverall(bandTask1, bandTask2) : null;

    setSendLoading((prev) => ({ ...prev, [submissionId]: true }));

    try {
      const res = await fetch(apiPath("writing/comment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          feedback,
          teacherName: teacher?.name || "Anonymous Teacher",
          bandTask1,
          bandTask2,
          bandOverall: bandOverall !== "" ? bandOverall : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.message || "Failed to send feedback.");
      }

      setMessages((prev) => ({
        ...prev,
        [submissionId]: currentItem?.feedback ? "Feedback updated successfully." : "Feedback sent successfully.",
      }));

      const bandEntry = bands[submissionId] || {};
      const bT1 = bandEntry.task1 !== undefined && bandEntry.task1 !== "" ? Number(bandEntry.task1) : null;
      const bT2 = bandEntry.task2 !== undefined && bandEntry.task2 !== "" ? Number(bandEntry.task2) : null;
      const bOv = bT1 !== null && bT2 !== null ? computeOverall(bT1, bT2) : null;
      const updated = data.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              feedback,
              feedbackBy: teacher?.name,
              feedbackAt: new Date().toISOString(),
              bandTask1: bT1,
              bandTask2: bT2,
              bandOverall: bOv !== "" ? bOv : null,
            }
          : item
      );
      setData(updated);
      setFeedbacks((prev) => ({ ...prev, [submissionId]: feedback }));
      setBands((prev) => ({
        ...prev,
        [submissionId]: {
          task1: bT1 != null ? String(bT1) : "",
          task2: bT2 != null ? String(bT2) : "",
        },
      }));
      setHasSaved((prev) => ({ ...prev, [submissionId]: true }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => ({
        ...prev,
        [submissionId]: "Failed to send feedback.",
      }));
    } finally {
      setSendLoading((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleAIComment = async (submission) => {
    setAiLoading((prev) => ({ ...prev, [submission.id]: true }));

    try {
      const aiRes = await fetch(apiPath("ai/generate-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1: submission.task1,
          task2: submission.task2,
        }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        throw new Error(aiData?.error || "AI could not generate feedback.");
      }

      if (aiData.suggestion) {
        setFeedbacks((prev) => ({
          ...prev,
          [submission.id]: aiData.suggestion,
        }));

        const statusMessage = aiData.cached
          ? "Loaded cached AI feedback."
          : aiData.fallback
          ? "OpenAI quota is currently unavailable. The system generated fallback feedback so marking can continue."
          : "AI feedback generated.";

        setMessages((prev) => ({
          ...prev,
          [submission.id]: statusMessage,
        }));
      } else {
        alert(aiData.error || "AI could not generate feedback.");
      }
    } catch (err) {
      console.error("AI error:", err);
      alert("Could not connect to the AI service.");
    } finally {
      setAiLoading((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleExtendDraft = async (submissionId, extraMinutes) => {
    setExtendingId(submissionId);
    try {
      const res = await fetch(apiPath(`writing/draft/${submissionId}/extend-time`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMinutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gia hạn thất bại");
      }

      setData((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                isDraft: true,
                draftEndAt: data?.draftEndAt || item.draftEndAt,
                draftSavedAt: new Date().toISOString(),
                timeLeft: data?.timeLeft ?? item.timeLeft,
              }
            : item
        )
      );
      alert(data?.message || "Đã gia hạn thời gian.");
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setExtendingId(null);
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return "Unknown";
    return `${d.getHours()}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")} on ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <>
      <AdminNavbar />
      <div
        style={{ maxWidth: 980, margin: "0 auto", padding: "30px 16px" }}
        className="admin-page"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Writing Submissions
          </h2>
          <button
            onClick={() => (window.location.href = "/admin/reading-submissions")}
            style={{
              padding: "8px 14px",
              background: "#0e276f",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reading Submissions
          </button>
        </div>

        <div
          style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}
        >
          {[
            {
              label: "Total",
              count: data.length,
              bg: "#eff6ff",
              color: "#1d4ed8",
              border: "#bfdbfe",
            },
            {
              label: "Pending",
              count: data.filter((i) => !i.feedback || !i.feedbackBy).length,
              bg: "#fffbeb",
              color: "#92400e",
              border: "#fde68a",
            },
            {
              label: "Reviewed",
              count: data.filter((i) => !!(i.feedback && i.feedbackBy)).length,
              bg: "#f0fdf4",
              color: "#166534",
              border: "#bbf7d0",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.bg,
                border: `1px solid ${stat.border}`,
                borderRadius: 8,
                padding: "8px 18px",
                minWidth: 110,
                textAlign: "center",
                cursor: "default",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                {stat.count}
              </div>
              <div style={{ fontSize: 12, color: stat.color, opacity: 0.85 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              alignItems: "end",
            }}
          >
            {[
              {
                label: "Student Name",
                placeholder: "Student name",
                value: searchStudentName,
                setValue: setSearchStudentName,
              },
              {
                label: "Class Code",
                placeholder: "e.g. 148-IX-3A-S1",
                value: searchClassCode,
                setValue: setSearchClassCode,
              },
              {
                label: "Test Teacher",
                placeholder: "Teacher name",
                value: searchTeacher,
                setValue: setSearchTeacher,
              },
              {
                label: "Reviewed By",
                placeholder: "Reviewer name",
                value: searchFeedbackBy,
                setValue: setSearchFeedbackBy,
              },
            ].map((field) => (
              <div key={field.label}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: "#374151",
                  }}
                >
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.setValue(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#374151",
                }}
              >
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: "border-box",
                  background: "#fff",
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="done">Reviewed</option>
              </select>
            </div>

            <div style={{ alignSelf: "end" }}>
              <button
                onClick={resetFilters}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Showing <strong>{filteredData.length}</strong>
          {data.length !== filteredData.length ? ` / ${data.length}` : ""} submissions
          {"  "}
          <span style={{ color: "#9ca3af" }}>
            Click a row to view the writing and feedback.
          </span>
        </p>

        {filteredData.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No matching submissions found.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredData.map((item, idx) => {
            const isDone = !!(item.feedback && item.feedbackBy) || !!hasSaved[item.id];
            const isDraft = !!item.isDraft;
            const isExpanded = expandedItems.has(item.id);
            const timingMeta = isDraft ? getAttemptTimingMeta(item.draftEndAt) : null;
            const testLabel = [
              item.WritingTest?.testType === "pet-writing" ? "PET Writing" : "Writing",
              item.WritingTest?.index,
              item.WritingTest?.classCode,
              item.WritingTest?.teacherName,
            ]
              .filter(Boolean)
              .join(" - ");

            return (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${
                    isDraft ? "#bfdbfe" : isDone ? "#bbf7d0" : "#fed7aa"
                  }`,
                  borderLeft: `4px solid ${
                    isDraft ? "#2563eb" : isDone ? "#16a34a" : "#f59e0b"
                  }`,
                  borderRadius: 8,
                  background: "#fff",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    userSelect: "none",
                    flexWrap: "wrap",
                  }}
                  onClick={() => toggleExpand(item.id)}
                >
                  <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 28 }}>
                    #{idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      whiteSpace: "nowrap",
                      background: isDraft
                        ? "#dbeafe"
                        : isDone
                        ? "#dcfce7"
                        : "#fef3c7",
                      color: isDraft
                        ? "#1e3a8a"
                        : isDone
                        ? "#166534"
                        : "#92400e",
                    }}
                  >
                    {isDraft ? "Draft not submitted" : isDone ? "Reviewed" : "Pending"}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120 }}>
                    {item.userName || "N/A"}
                  </span>
                  <span style={{ fontSize: 13, color: "#6b7280", minWidth: 100 }}>
                    {item.userPhone || "N/A"}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "#374151", flex: 1, minWidth: 180 }}
                  >
                    {testLabel || "N/A"}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}
                  >
                    {isDraft && timingMeta
                      ? `${timingMeta.label} • ${formatDateTime(item.draftSavedAt || item.updatedAt || item.createdAt)}`
                      : formatDateTime(item.createdAt)}
                  </span>
                  <span style={{ fontSize: 16, color: "#9ca3af", marginLeft: 4 }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 14px 16px 14px", borderTop: "1px solid #f3f4f6" }}>
                    {isDraft && (
                      <div
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 7,
                          padding: 12,
                          marginTop: 12,
                          color: "#1e3a8a",
                          fontSize: 13,
                        }}
                      >
                        This is an autosaved draft that has not been submitted. The student
                        must sign in again and click Submit to finalize it.
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                          {timingMeta && (
                            <span style={{ fontWeight: 700, color: timingMeta.color }}>
                              {timingMeta.label}
                            </span>
                          )}
                          <span style={{ color: "#475569" }}>
                            Lưu: {formatDateTime(item.draftSavedAt || item.updatedAt || item.createdAt)}
                          </span>
                          {extendingId === item.id ? (
                            <span
                              style={{
                                padding: "7px 12px",
                                borderRadius: 6,
                                border: "none",
                                background: "#0284c7",
                                color: "#fff",
                                fontWeight: 600,
                                cursor: "wait",
                              }}
                            >
                              Đang gia hạn...
                            </span>
                          ) : (
                            QUICK_EXTENSION_OPTIONS.map((minutes) => (
                              <button
                                key={minutes}
                                onClick={() => handleExtendDraft(item.id, minutes)}
                                style={{
                                  padding: "7px 12px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#0284c7",
                                  color: "#fff",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title={`Gia hạn thêm ${minutes} phút`}
                              >
                                +{minutes}p
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginTop: 14,
                      }}
                      className="admin-task-grid"
                    >
                      <div style={{ background: "#f8fafc", borderRadius: 7, padding: 12 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#374151",
                            marginBottom: 6,
                          }}
                        >
                          Task 1
                        </div>
                        <p
                          style={{
                            margin: 0,
                            whiteSpace: "pre-line",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: "#1f2937",
                          }}
                        >
                          {item.task1 || "(empty)"}
                        </p>
                      </div>
                      <div style={{ background: "#f8fafc", borderRadius: 7, padding: 12 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#374151",
                            marginBottom: 6,
                          }}
                        >
                          Task 2
                        </div>
                        <p
                          style={{
                            margin: 0,
                            whiteSpace: "pre-line",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: "#1f2937",
                          }}
                        >
                          {item.task2 || "(empty)"}
                        </p>
                      </div>
                    </div>

                    {item.feedback && item.feedbackAt && item.feedbackBy && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 7,
                          padding: 12,
                          marginTop: 12,
                        }}
                      >
                        <p style={{ margin: "0 0 6px", fontSize: 13, color: "#166534" }}>
                          <strong>Reviewed</strong> at {formatDateTime(item.feedbackAt)} by{" "}
                          <strong>{item.feedbackBy}</strong>
                        </p>
                        {(item.bandTask1 != null || item.bandTask2 != null || item.bandOverall != null) && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                            {item.bandTask1 != null && (
                              <span style={{ background: "#0e276f", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                                Task 1: {item.bandTask1}
                              </span>
                            )}
                            {item.bandTask2 != null && (
                              <span style={{ background: "#0e276f", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                                Task 2: {item.bandTask2}
                              </span>
                            )}
                            {item.bandOverall != null && (
                              <span style={{ background: "#16a34a", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                                Overall: {item.bandOverall}
                              </span>
                            )}
                          </div>
                        )}
                        <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 14 }}>
                          {item.feedback}
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      {/* Band score inputs */}
                      {!isDraft && (
                        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: "#374151" }}>Band Task 1</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="9"
                              placeholder="e.g. 6.5"
                              value={(bands[item.id]?.task1) ?? (item.bandTask1 != null ? String(item.bandTask1) : "")}
                              onChange={(e) => setBands((prev) => ({ ...prev, [item.id]: { ...prev[item.id], task1: e.target.value } }))}
                              style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: "#374151" }}>Band Task 2</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="9"
                              placeholder="e.g. 6.5"
                              value={(bands[item.id]?.task2) ?? (item.bandTask2 != null ? String(item.bandTask2) : "")}
                              onChange={(e) => setBands((prev) => ({ ...prev, [item.id]: { ...prev[item.id], task2: e.target.value } }))}
                              style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3, color: "#374151" }}>
                              Band Overall <span style={{ fontWeight: 400, color: "#9ca3af" }}>(tự tính)</span>
                            </label>
                            <input
                              type="number"
                              readOnly
                              value={computeOverall(
                                (bands[item.id]?.task1) ?? (item.bandTask1 != null ? item.bandTask1 : ""),
                                (bands[item.id]?.task2) ?? (item.bandTask2 != null ? item.bandTask2 : "")
                              )}
                              style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                            />
                          </div>
                        </div>
                      )}
                      <textarea
                        placeholder={
                          isDraft
                            ? "This draft has not been submitted yet, so feedback cannot be sent."
                            : "Teacher feedback..."
                        }
                        rows={4}
                        style={{
                          width: "100%",
                          padding: 10,
                          boxSizing: "border-box",
                          fontSize: 14,
                          border: "1px solid #d1d5db",
                          borderRadius: 7,
                          resize: "vertical",
                          fontFamily: "inherit",
                          outline: "none",
                        }}
                        value={feedbacks[item.id] ?? item.feedback ?? ""}
                        disabled={isDraft}
                        onChange={(e) =>
                          setFeedbacks((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <div
                        style={{ display: "flex", gap: 8, marginTop: 8 }}
                        className="admin-button-row"
                      >
                        <button
                          onClick={() => handleSendFeedback(item.id)}
                          disabled={
                            isDraft ||
                            sendLoading[item.id] ||
                            aiLoading[item.id]
                          }
                          style={{
                            flex: 1,
                            padding: "9px 16px",
                            border: "none",
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor:
                              isDraft || sendLoading[item.id] || aiLoading[item.id]
                                ? "default"
                                : "pointer",
                            background:
                              isDraft ||
                              sendLoading[item.id] ||
                              aiLoading[item.id]
                                ? "#9ca3af"
                                : "#0e276f",
                            color: "#fff",
                          }}
                        >
                          {isDraft
                            ? "Wait for student submission"
                            : sendLoading[item.id]
                            ? "Sending..."
                            : hasSaved[item.id]
                            ? "Update Feedback"
                            : "Send Feedback"}
                        </button>
                        <button
                          onClick={() => handleAIComment(item)}
                          disabled={
                            isDraft ||
                            aiLoading[item.id] ||
                            sendLoading[item.id] ||
                            hasSaved[item.id]
                          }
                          style={{
                            flex: 1,
                            padding: "9px 16px",
                            border: "none",
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: isDraft || aiLoading[item.id] ? "not-allowed" : "pointer",
                            background:
                              isDraft ||
                              aiLoading[item.id] ||
                              sendLoading[item.id] ||
                              hasSaved[item.id]
                                ? "#9ca3af"
                                : "#ee0033",
                            color: "#fff",
                          }}
                        >
                          {isDraft
                            ? "Wait for student submission"
                            : aiLoading[item.id]
                            ? "Generating..."
                            : "AI Feedback"}
                        </button>
                      </div>
                      {messages[item.id] && (
                        <p style={{ marginTop: 6, color: "#16a34a", fontSize: 13 }}>
                          {messages[item.id]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AdminWritingSubmissions;
