import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";

const ReadingResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navResult = location.state && location.state.result;

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState([]);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    // If navigation provided result, show summary only; still try to fetch submission meta if available
    if (navResult) {
      setMeta(navResult);
      if (navResult.submissionId) {
        // fetch submission metadata and test info
        (async () => {
          try {
            const r = await fetch(
              apiPath(`reading-submissions/${navResult.submissionId}`)
            );
            if (r.ok) {
              const s = await r.json();
              const m = {
                submissionId: s.id,
                userName: s.userName,
                userPhone: s.userPhone,
                testId: s.testId,
              };
              // fetch test info
              if (s.testId) {
                try {
                  const rt = await fetch(apiPath(`reading-tests/${s.testId}`));
                  if (rt.ok) {
                    const t = await rt.json();
                    m.testTitle = t.title || `#${t.id}`;
                    m.classCode = t.classCode || "";
                    m.teacherName = t.teacherName || "";
                  }
                } catch (e) {
                  /* ignore */
                }
              }
              setMeta((prev) => ({ ...prev, ...m }));
            }
          } catch (e) {
            /* ignore */
          }
        })();
      }
      return;
    }

    const fetchCompare = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiPath(`reading-submissions/${id}/compare`));
        if (!res.ok) throw new Error("Không thể tải dữ liệu");
        const data = await res.json();
        setDetails(data.details || []);
        setMeta({ submissionId: data.submissionId });

        // fetch submission metadata and test info using submissionId
        try {
          const r = await fetch(
            apiPath(`reading-submissions/${data.submissionId}`)
          );
          if (r.ok) {
            const s = await r.json();
            const m = {
              submissionId: s.id,
              userName: s.userName,
              userPhone: s.userPhone,
              testId: s.testId,
            };
            if (s.testId) {
              try {
                const rt = await fetch(apiPath(`reading-tests/${s.testId}`));
                if (rt.ok) {
                  const t = await rt.json();
                  m.testTitle = t.title || `#${t.id}`;
                  m.classCode = t.classCode || "";
                  m.teacherName = t.teacherName || "";
                }
              } catch (e) {
                /* ignore */
              }
            }
            setMeta((prev) => ({ ...prev, ...m }));
          }
        } catch (e) {
          /* ignore */
        }
      } catch (err) {
        console.error("Error fetching compare:", err);
        setDetails([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompare();
  }, [id, navResult]);

  if (loading)
    return <p style={{ padding: 20 }}>⏳ Đang tải chi tiết chấm...</p>;

  // If navigation provided result summary, show summary
  if (navResult && !details.length) {
    // if we have a submissionId, try to fetch submission and test meta (non-blocking)
    return (
      <div style={{ padding: 24 }}>
        <h2>Reading Results — Test {id}</h2>
        {meta && (
          <div style={{ marginBottom: 12 }}>
            <p>
              <strong>Test:</strong> {meta.testTitle || `#${meta.testId || ""}`}
            </p>
            <p>
              <strong>Mã lớp:</strong> {meta.classCode || "N/A"}
            </p>
            <p>
              <strong>Giáo viên đề:</strong> {meta.teacherName || "N/A"}
            </p>
            <p>
              <strong>Học sinh:</strong>{" "}
              {meta.userName || navResult.userName || "N/A"}
              {meta.userPhone ? ` • ${meta.userPhone}` : ""}
            </p>
          </div>
        )}

        <p>
          <strong>Total questions:</strong> {navResult.total}
        </p>
        <p>
          <strong>Correct:</strong> {navResult.correct}
        </p>
        <p>
          <strong>Score percentage:</strong> {navResult.scorePercentage}%
        </p>
        <p>
          <strong>IELTS Band:</strong>{" "}
          {navResult.band != null && Number.isFinite(Number(navResult.band))
            ? Number(navResult.band).toFixed(1)
            : "N/A"}
        </p>
        <p>
          <button onClick={() => navigate(-1)}>Quay lại</button>
        </p>
      </div>
    );
  }

  if (!details.length)
    return (
      <div style={{ padding: 24 }}>
        <h3>Không có chi tiết chấm</h3>
        <p>Submission ID: {id}</p>
        <p>
          <Link to="/">Quay lại</Link>
        </p>
      </div>
    );

  return (
    <div style={{ padding: 18, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h2>Chi tiết chấm — Submission #{id}</h2>
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <a
          href={apiPath(`reading-submissions/${id}/compare-html`)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0e276f', textDecoration: 'none', padding: '6px 10px', background: '#e6f4ea', borderRadius: 6 }}
        >
          Mở trang so sánh (plain)
        </a>
      </div>

      {/* Meta block: test, class, teacher, student, band */}
      {meta && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
            <div>
              <strong>Reading:</strong>{" "}
              {meta.testTitle || `#${meta.testId || ""}`}
            </div>
            <div>
              <strong>Mã lớp:</strong> {meta.classCode || "N/A"}
            </div>
            <div>
              <strong>Giáo viên:</strong> {meta.teacherName || "N/A"}
            </div>
          </div>

          <div>
            <div>
              <strong>Học sinh:</strong> {meta.userName || "N/A"}
              {meta.userPhone ? ` • ${meta.userPhone}` : ""}
            </div>
            {meta.submissionId && (
              <div>
                <strong>Submission:</strong> #{meta.submissionId}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            {meta.band != null && Number.isFinite(Number(meta.band)) && (
              <div
                style={{
                  padding: "6px 10px",
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                Band {Number(meta.band).toFixed(1)}
              </div>
            )}
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0e276f", color: "white" }}>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>Q</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>Paragraph</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>
              Expected (raw)
            </th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>
              Expected Label
            </th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>
              Student (raw)
            </th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>
              Student Label
            </th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {details.map((r, idx) => (
            <tr
              key={idx}
              style={{ background: r.isCorrect ? "#e6f4ea" : "#ffe6e6" }}
            >
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.questionNumber}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.paragraphId || "-"}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.expected}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.expectedLabel}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.student}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.studentLabel}
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                {r.isCorrect ? "✓" : "✕"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 18 }}>
        <Link to="/">Quay lại</Link>
      </div>
    </div>
  );
};

export default ReadingResults;
