import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import "./ExamLevelSubmissionsPage.css";

const ExamLevelSubmissionsPage = () => {
  const { code: rawCode } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const [level, setLevel] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const query = skill ? `?skill=${encodeURIComponent(skill)}` : "";
        const [levelResponse, submissionsResponse] = await Promise.all([
          authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}`)),
          authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}/submissions${query}`)),
        ]);
        const [levelPayload, submissionPayload] = await Promise.all([
          levelResponse.json().catch(() => ({})),
          submissionsResponse.json().catch(() => ({})),
        ]);
        if (!levelResponse.ok) throw new Error(levelPayload.message || "Could not load this exam level.");
        if (!submissionsResponse.ok) {
          throw new Error(submissionPayload.message || "Could not load submissions.");
        }
        if (mounted) {
          setLevel(levelPayload);
          setSubmissions(Array.isArray(submissionPayload) ? submissionPayload : []);
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [code, skill]);

  return (
    <>
      <AdminNavbar />
      <main className="exam-level-submissions">
        <header className="exam-level-submissions__header">
          <div>
            <p>EXAM LEVEL RESULTS</p>
            <h1>{level?.name || code.toUpperCase()} submissions</h1>
            <span>{submissions.length} completed submissions</span>
          </div>
          <label>
            Filter by skill
            <select value={skill} onChange={(event) => setSkill(event.target.value)}>
              <option value="">All skills</option>
              {(level?.skills || []).map((item) => (
                <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>
              ))}
            </select>
          </label>
        </header>
        {error ? <p className="exam-level-submissions__error" role="alert">{error}</p> : null}
        {loading ? <p>Loading submissions…</p> : null}
        {!loading && !error && !submissions.length ? (
          <p className="exam-level-submissions__empty">No completed submissions yet.</p>
        ) : null}
        <div className="exam-level-submissions__list">
          {submissions.map((submission) => (
            <Link
              key={submission.id}
              className="exam-level-submissions__card"
              to={`/exam-levels/${encodeURIComponent(code)}/submissions/${submission.id}`}
            >
              <div>
                <strong>{submission.studentName || "Student"}</strong>
                <span>{submission.testTitle || `${submission.skill} test`} · {submission.skill}</span>
              </div>
              <div className="exam-level-submissions__score">
                <strong>
                  {Number(submission.score || 0)} / {Number(submission.totalQuestions || 0)}
                </strong>
                <span>{Number(submission.percentage || 0).toFixed(1)}% · {submission.status}</span>
              </div>
              <time dateTime={submission.submittedAt || submission.createdAt}>
                {submission.submittedAt || submission.createdAt
                  ? new Date(submission.submittedAt || submission.createdAt).toLocaleString()
                  : "Date unavailable"}
              </time>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
};

export default ExamLevelSubmissionsPage;
