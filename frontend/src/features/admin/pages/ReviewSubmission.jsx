import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-GB");
};

const formatBand = (value) => {
  if (value === "" || value == null) return "—";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1);
};

const styles = {
  page: {
    maxWidth: "100%",
    width: "100%",
    margin: "0 auto",
    padding: "30px 16px",
    background: "#f8fafc",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  contentShell: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  loadingCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#475569",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
  },
  titleBlock: {
    maxWidth: "780px",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.7,
  },
  backButton: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "152px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: "0.85rem",
    color: "#64748b",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,
  },
  cardValue: {
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1.2,
  },
  cardValueCompact: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1.45,
  },
  cardMeta: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "0.95rem",
    lineHeight: 1.5,
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  sectionCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  sectionText: {
    margin: "6px 0 0",
    color: "#64748b",
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  metaItem: {
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  metaLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "0.85rem",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 700,
  },
  metaValue: {
    color: "#1e293b",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  taskGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
  },
  taskCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "320px",
    display: "flex",
    flexDirection: "column",
  },
  taskEyebrow: {
    color: "#0e276f",
    fontSize: "0.8rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  taskTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  taskText: {
    margin: "16px 0 0",
    whiteSpace: "pre-line",
    color: "#1f2937",
    lineHeight: 1.75,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px 20px",
    flex: 1,
  },
  savedFeedbackCard: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "20px",
  },
  savedFeedbackHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
    color: "#166534",
  },
  bandRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  bandPill: {
    background: "#0e276f",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  overallBandPill: {
    background: "#16a34a",
  },
  savedFeedbackText: {
    margin: 0,
    color: "#14532d",
    lineHeight: 1.75,
    whiteSpace: "pre-line",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fieldLabel: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#334155",
  },
  fieldLabelMeta: {
    fontWeight: 400,
    fontSize: "0.8rem",
    color: "#64748b",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "0.95rem",
    color: "#111827",
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
  },
  readOnlyInput: {
    background: "#f1f5f9",
    color: "#64748b",
    cursor: "not-allowed",
  },
  textarea: {
    width: "100%",
    minHeight: "220px",
    padding: "14px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    fontSize: "1rem",
    lineHeight: 1.65,
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    marginBottom: "16px",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  actionButton: {
    flex: "1 1 220px",
    padding: "12px 18px",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 700,
  },
};

const ReviewSubmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);

  const bandOverall = (() => {
    const t1 = parseFloat(bandTask1);
    const t2 = parseFloat(bandTask2);
    if (!Number.isNaN(t1) && !Number.isNaN(t2)) {
      return Math.round(((t2 * 2 + t1) / 3) * 2) / 2;
    }
    return "";
  })();

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

  const statusLabel = submission?.feedback ? "Reviewed" : "Pending";
  const statusTone = submission?.feedback
    ? { background: "#dcfce7", color: "#166534" }
    : { background: "#fef3c7", color: "#92400e" };
  const studentName = submission?.user?.name || submission?.userName || "N/A";
  const studentPhone = submission?.user?.phone || submission?.userPhone || "N/A";
  const testIndex = submission?.WritingTest?.index || "N/A";
  const testLabel = `Writing ${testIndex}`;
  const submittedAt = formatDateTime(submission?.submittedAt || submission?.createdAt);
  const currentOverallBand = bandOverall !== "" ? bandOverall : submission?.bandOverall;

  return (
    <>
      <AdminNavbar />
      <div className="admin-page admin-submission-page" style={styles.page}>
        <div style={styles.contentShell}>
          {loading ? (
            <div style={styles.loadingCard}>Loading writing submission...</div>
          ) : !submission ? (
            <div style={styles.loadingCard}>Writing submission not found.</div>
          ) : (
            <>
              <div style={styles.headerRow}>
                <div style={styles.titleBlock}>
                  <h1 style={styles.title}>Writing Submission Details</h1>
                  <p style={styles.subtitle}>
                    Review the student's two writing tasks, enter band scores, and save feedback in the same teacher layout used across the other IX result pages.
                  </p>
                </div>
                <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
                  Back to Queue
                </button>
              </div>

              <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                  <div>
                    <div style={styles.cardLabel}>Student</div>
                    <div style={styles.cardValueCompact}>{studentName}</div>
                  </div>
                  <div style={styles.cardMeta}>{studentPhone}</div>
                </div>

                <div style={styles.summaryCard}>
                  <div>
                    <div style={styles.cardLabel}>Test</div>
                    <div style={styles.cardValueCompact}>{testLabel}</div>
                  </div>
                  <div style={styles.cardMeta}>
                    {submission?.WritingTest?.classCode || "No class code"}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.cardLabel}>Submitted</div>
                  <div style={styles.cardValueCompact}>{submittedAt}</div>
                  <div style={styles.cardMeta}>{submission?.WritingTest?.teacherName || "No teacher assigned"}</div>
                </div>

                <div style={styles.summaryCard}>
                  <div>
                    <div style={styles.cardLabel}>Overall Band</div>
                    <div style={styles.cardValue}>{formatBand(currentOverallBand)}</div>
                  </div>
                  <span style={{ ...styles.statusChip, ...statusTone }}>{statusLabel}</span>
                </div>
              </div>

              <section style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Submission Metadata</h2>
                    <p style={styles.sectionText}>Key context for the submission and the currently assigned writing test.</p>
                  </div>
                </div>

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Submission ID</span>
                    <span style={styles.metaValue}>{submission.id}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Phone</span>
                    <span style={styles.metaValue}>{studentPhone}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Class Code</span>
                    <span style={styles.metaValue}>{submission?.WritingTest?.classCode || "N/A"}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Test Teacher</span>
                    <span style={styles.metaValue}>{submission?.WritingTest?.teacherName || "N/A"}</span>
                  </div>
                </div>
              </section>

              <div style={styles.taskGrid}>
                <section style={styles.taskCard}>
                  <div style={styles.taskEyebrow}>Essay Task</div>
                  <h2 style={styles.taskTitle}>Task 1</h2>
                  <p style={styles.taskText}>{submission.task1 || "(empty)"}</p>
                </section>

                <section style={styles.taskCard}>
                  <div style={styles.taskEyebrow}>Essay Task</div>
                  <h2 style={styles.taskTitle}>Task 2</h2>
                  <p style={styles.taskText}>{submission.task2 || "(empty)"}</p>
                </section>
              </div>

              <section style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Teacher Feedback</h2>
                    <p style={styles.sectionText}>Add or update the final review, band scores, and written feedback for this submission.</p>
                  </div>
                  <span style={{ ...styles.statusChip, ...statusTone }}>{statusLabel}</span>
                </div>

                {submission.feedback && (
                  <div style={styles.savedFeedbackCard}>
                    <div style={styles.savedFeedbackHeader}>
                      <strong>Latest saved feedback</strong>
                      <span>
                        Reviewed {formatDateTime(submission.feedbackAt)} by {submission.feedbackBy || "Teacher"}
                      </span>
                    </div>

                    {(submission.bandTask1 != null || submission.bandTask2 != null || submission.bandOverall != null) && (
                      <div style={styles.bandRow}>
                        {submission.bandTask1 != null && (
                          <span style={styles.bandPill}>Task 1: {formatBand(submission.bandTask1)}</span>
                        )}
                        {submission.bandTask2 != null && (
                          <span style={styles.bandPill}>Task 2: {formatBand(submission.bandTask2)}</span>
                        )}
                        {submission.bandOverall != null && (
                          <span style={{ ...styles.bandPill, ...styles.overallBandPill }}>
                            Overall: {formatBand(submission.bandOverall)}
                          </span>
                        )}
                      </div>
                    )}

                    <p style={styles.savedFeedbackText}>{submission.feedback}</p>
                  </div>
                )}

                <div style={styles.formGrid}>
                  <div style={styles.fieldBlock}>
                    <label style={styles.fieldLabel}>Band Task 1</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 6.5"
                      value={bandTask1}
                      onChange={(e) => setBandTask1(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldBlock}>
                    <label style={styles.fieldLabel}>Band Task 2</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 6.5"
                      value={bandTask2}
                      onChange={(e) => setBandTask2(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldBlock}>
                    <label style={styles.fieldLabel}>
                      Band Overall <span style={styles.fieldLabelMeta}>(auto-calculated: (T2 x 2 + T1) / 3)</span>
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={bandOverall}
                      style={{ ...styles.input, ...styles.readOnlyInput }}
                    />
                  </div>
                </div>

                <div style={styles.fieldBlock}>
                  <label style={styles.fieldLabel}>Reviewer Name</label>
                  <input
                    type="text"
                    placeholder="Teacher name"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldBlock}>
                  <label style={styles.fieldLabel}>Feedback Notes</label>
                  <textarea
                    rows={10}
                    style={styles.textarea}
                    placeholder="Enter feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div style={styles.buttonRow}>
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={saveLoading || aiLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: saveLoading || aiLoading ? "#94a3b8" : "#0e276f",
                      cursor: saveLoading || aiLoading ? "not-allowed" : "pointer",
                      opacity: saveLoading || aiLoading ? 0.65 : 1,
                    }}
                  >
                    {saveLoading
                      ? "Saving..."
                      : hasSavedFeedback
                      ? "Update Feedback"
                      : "Save Feedback"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAIComment}
                    disabled={aiLoading || saveLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: aiLoading || saveLoading ? "#94a3b8" : "#e11d48",
                      cursor: aiLoading || saveLoading ? "not-allowed" : "pointer",
                      opacity: aiLoading || saveLoading ? 0.65 : 1,
                    }}
                  >
                    {aiLoading ? "Generating..." : "AI Feedback"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewSubmission;
