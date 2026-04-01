import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";

const ReviewSubmission = () => {
  const { id } = useParams();
  const teacher = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [bandTask1, setBandTask1] = useState("");
  const [bandTask2, setBandTask2] = useState("");

  const bandOverall = (() => {
    const t1 = parseFloat(bandTask1);
    const t2 = parseFloat(bandTask2);
    if (!isNaN(t1) && !isNaN(t2)) {
      return Math.round(((t2 * 2 + t1) / 3) * 2) / 2; // round to nearest 0.5
    }
    return "";
  })();
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(apiPath("writing/list"));
      const allSubs = await res.json();
      const found = Array.isArray(allSubs)
        ? allSubs.find((item) => String(item.id) === String(id))
        : null;

      setSubmission(found || null);

      if (found?.feedback) {
        setFeedback(found.feedback);
        setTeacherName(found.feedbackBy || teacher?.name || "");
        setBandTask1(found.bandTask1 != null ? String(found.bandTask1) : "");
        setBandTask2(found.bandTask2 != null ? String(found.bandTask2) : "");
        setHasSavedFeedback(true);
      } else {
        setFeedback("");
        setTeacherName(teacher?.name || "");
        setBandTask1("");
        setBandTask2("");
        setHasSavedFeedback(false);
      }
    } catch (err) {
      console.error("Failed to load writing submission:", err);
    } finally {
      setLoading(false);
    }
  }, [id, teacher]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleSaveFeedback = async () => {
    if (!feedback.trim()) {
      alert("Please enter feedback before saving.");
      return;
    }

    if (!teacherName.trim()) {
      alert("Please enter the teacher name.");
      return;
    }

    setSaveLoading(true);

    try {
      const res = await fetch(apiPath("writing/comment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          feedback,
          teacherName,
          bandTask1: bandTask1 !== "" ? Number(bandTask1) : null,
          bandTask2: bandTask2 !== "" ? Number(bandTask2) : null,
          bandOverall: bandOverall !== "" ? Number(bandOverall) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save feedback.");
      }

      alert(data.message || "Feedback saved.");
      setHasSavedFeedback(true);
      fetchSubmission();
    } catch (err) {
      console.error("Failed to save feedback:", err);
      alert(err.message || "Failed to save feedback.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAIComment = async () => {
    if (!submission) return;

    setAiLoading(true);

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
        setFeedback(aiData.suggestion);
      } else {
        throw new Error(aiData?.error || "AI could not generate feedback.");
      }
    } catch (err) {
      console.error("AI feedback error:", err);
      alert(err.message || "Could not connect to the AI service.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <p style={{ padding: 40 }}>Loading...</p>;
  }

  if (!submission) {
    return <p style={{ padding: 40 }}>Writing submission not found.</p>;
  }

  return (
    <>
      <AdminNavbar />
      <div
        style={{ padding: "30px", maxWidth: 800, margin: "auto" }}
        className="admin-page"
      >
        <h2>Writing Submission Details</h2>

        <p>
          <strong>Student:</strong> {submission.user?.name || submission.userName || "N/A"}
        </p>
        <p>
          <strong>Phone:</strong> {submission.user?.phone || submission.userPhone || "N/A"}
        </p>
        <p>
          <strong>Test:</strong> Writing {submission.WritingTest?.index || "N/A"}
          {submission.WritingTest?.classCode
            ? ` - ${submission.WritingTest.classCode}`
            : ""}
          {submission.WritingTest?.teacherName
            ? ` - ${submission.WritingTest.teacherName}`
            : ""}
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}
        </p>

        <h4>Task 1</h4>
        <p style={taskBoxStyle}>{submission.task1 || "(empty)"}</p>

        <h4>Task 2</h4>
        <p style={taskBoxStyle}>{submission.task2 || "(empty)"}</p>

        <h3 style={{ marginTop: 30 }}>Teacher Feedback</h3>
        {submission.feedback && (
          <div style={savedFeedbackStyle}>
            <p style={{ marginBottom: 6 }}>
              <b>{submission.feedbackBy || "Teacher"}:</b> {submission.feedback}
            </p>
            {(submission.bandTask1 != null || submission.bandTask2 != null || submission.bandOverall != null) && (
              <p style={{ marginTop: 6, fontSize: 14 }}>
                <b>Band:</b> Task 1: {submission.bandTask1 ?? "—"} | Task 2: {submission.bandTask2 ?? "—"} | Overall: {submission.bandOverall ?? "—"}
              </p>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold", fontSize: 14 }}>Band Task 1</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="9"
              placeholder="e.g. 6.5"
              value={bandTask1}
              onChange={(e) => setBandTask1(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold", fontSize: 14 }}>Band Task 2</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="9"
              placeholder="e.g. 6.5"
              value={bandTask2}
              onChange={(e) => setBandTask2(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold", fontSize: 14 }}>Band Overall <span style={{ fontWeight: "normal", fontSize: 12, color: "#888" }}>(tự tính: (T2×2+T1)÷3)</span></label>
            <input
              type="number"
              readOnly
              value={bandOverall}
              style={{ ...inputStyle, background: "#f0f0f0", color: "#555", cursor: "not-allowed" }}
            />
          </div>
        </div>

        <input
          type="text"
          placeholder="Teacher name"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          style={inputStyle}
        />

        <textarea
          rows={10}
          style={textareaStyle}
          placeholder="Enter feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSaveFeedback}
            disabled={saveLoading || hasSavedFeedback || aiLoading}
            style={{
              ...actionButtonStyle,
              backgroundColor:
                saveLoading || hasSavedFeedback || aiLoading ? "#ccc" : "#0e276f",
              cursor:
                saveLoading || hasSavedFeedback || aiLoading
                  ? "not-allowed"
                  : "pointer",
              opacity: saveLoading || hasSavedFeedback || aiLoading ? 0.6 : 1,
            }}
          >
            {saveLoading
              ? "Saving..."
              : hasSavedFeedback
              ? "Saved"
              : "Save Feedback"}
          </button>

          <button
            onClick={handleAIComment}
            disabled={aiLoading || saveLoading || hasSavedFeedback}
            style={{
              ...actionButtonStyle,
              backgroundColor:
                aiLoading || saveLoading || hasSavedFeedback ? "#ccc" : "#e03",
              cursor:
                aiLoading || saveLoading || hasSavedFeedback
                  ? "not-allowed"
                  : "pointer",
              opacity: aiLoading || saveLoading || hasSavedFeedback ? 0.6 : 1,
            }}
          >
            {aiLoading ? "Generating..." : "AI Feedback"}
          </button>
        </div>
      </div>
    </>
  );
};

const taskBoxStyle = {
  whiteSpace: "pre-line",
  border: "1px solid #ccc",
  padding: 10,
};

const savedFeedbackStyle = {
  whiteSpace: "pre-line",
  background: "#e7f4e4",
  padding: 10,
  borderRadius: 6,
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  fontSize: "16px",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const textareaStyle = {
  width: "100%",
  padding: "12px",
  boxSizing: "border-box",
  fontSize: "16px",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  marginBottom: "12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const actionButtonStyle = {
  flex: 1,
  padding: "10px 20px",
  border: "none",
  borderRadius: 6,
  color: "white",
  fontSize: 16,
};

export default ReviewSubmission;
