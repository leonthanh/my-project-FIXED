import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import "./ExamLevelSubmissionsPage.css";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const ExamLevelSubmissionReviewPage = () => {
  const { code: rawCode, submissionId } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(submissionId)}`))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load this submission.");
        if (mounted) {
          setData(payload);
          setFeedback(payload.submission?.feedback || "");
        }
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [code, submissionId]);

  const saveReview = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await authFetch(
        apiPath(`exam-levels/${encodeURIComponent(code)}/submissions/${encodeURIComponent(submissionId)}/review`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not save review.");
      setData((current) => ({ ...current, submission: payload }));
      setFeedback(payload.feedback || "");
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const submission = data?.submission;
  const results = Object.entries(submission?.detailedResults || {}).sort(([left], [right]) =>
    left.localeCompare(right, undefined, { numeric: true })
  );

  return (
    <>
      <AdminNavbar />
      <main className="exam-level-submissions exam-level-submissions--review">
        <Link className="exam-level-submissions__back" to={`/exam-levels/${encodeURIComponent(code)}/submissions`}>
          Back to submissions
        </Link>
        {loading ? <p>Loading submission…</p> : null}
        {error ? <p className="exam-level-submissions__error" role="alert">{error}</p> : null}
        {!loading && submission ? (
          <>
            <header className="exam-level-submissions__header">
              <div>
                <p>{data.level?.name || code.toUpperCase()} · {submission.skill}</p>
                <h1>{submission.studentName || "Student"}</h1>
                <span>{submission.testTitle || data.test?.title || "Exam submission"}</span>
              </div>
              <div className="exam-level-submissions__score">
                <strong>{Number(submission.score || 0)} / {Number(submission.totalQuestions || 0)}</strong>
                <span>{Number(submission.percentage || 0).toFixed(1)}% · {submission.status}</span>
              </div>
            </header>
            <section className="exam-level-submissions__details">
              <h2>Answer review</h2>
              {results.length ? (
                <div className="exam-level-submissions__tableWrap">
                  <table>
                    <thead>
                      <tr><th>Question</th><th>Student answer</th><th>Expected answer</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {results.map(([key, result]) => (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{formatValue(result?.userAnswer ?? result?.answer)}</td>
                          <td>{formatValue(result?.correctAnswer ?? result?.expectedAnswer)}</td>
                          <td>{result?.isCorrect === true ? "Correct" : result?.isCorrect === false ? "Incorrect" : "Manual review"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No automatically scored answers are available for this submission.</p>
              )}
            </section>
            <form className="exam-level-submissions__reviewForm" onSubmit={saveReview}>
              <label htmlFor="exam-level-feedback">Teacher feedback</label>
              <textarea
                id="exam-level-feedback"
                value={feedback}
                maxLength={10000}
                rows={7}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Write feedback for this submission…"
              />
              <div>
                <span>{saved ? "Review saved." : ""}</span>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save review"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </main>
    </>
  );
};

export default ExamLevelSubmissionReviewPage;
