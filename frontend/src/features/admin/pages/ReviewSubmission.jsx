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
        setHasSavedFeedback(true);
      } else {
        setFeedback("");
        setTeacherName(teacher?.name || "");
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
          <p style={savedFeedbackStyle}>
            <b>{submission.feedbackBy || "Teacher"}:</b> {submission.feedback}
          </p>
        )}

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
