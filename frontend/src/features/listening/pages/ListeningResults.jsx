import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";

// ===== STYLES =====
const styles = {
  container: {
    padding: "24px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1e293b",
    margin: 0,
  },
  backBtn: {
    padding: "8px 16px",
    background: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  // Summary Cards
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  cardLabel: {
    fontSize: "0.85rem",
    color: "#64748b",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cardValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1e293b",
  },
  // Progress Circle
  progressCircle: {
    position: "relative",
    width: "80px",
    height: "80px",
    margin: "0 auto 8px",
  },
  // Analysis Section
  analysisSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  // Feedback Box
  feedbackBox: {
    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    border: "1px solid #f59e0b",
  },
  feedbackHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  // Table styles
  tableContainer: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "24px",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s",
  },
  filterBtnActive: {
    background: "#3b82f6",
    color: "#fff",
    borderColor: "#3b82f6",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    padding: "12px",
    background: "#1e293b",
    color: "#fff",
    fontWeight: 600,
    textAlign: "left",
    borderBottom: "2px solid #334155",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
  },
  rowCorrect: {
    background: "#f0fdf4",
  },
  rowWrong: {
    background: "#fef2f2",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  // Part Group
  partHeader: {
    background: "#e2e8f0",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "6px",
    marginTop: "8px",
  },
  // Actions
  actionsBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  actionBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  primaryBtn: {
    background: "#3b82f6",
    color: "#fff",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  // Meta info
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "24px",
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metaLabel: {
    color: "#64748b",
    fontSize: "0.85rem",
  },
  metaValue: {
    fontWeight: 600,
    color: "#1e293b",
  },
};

// ===== HELPER COMPONENTS =====
const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const config = {
    good: { bg: "#dcfce7", color: "#166534", icon: "✅", text: "Tốt" },
    average: { bg: "#fef3c7", color: "#92400e", icon: "⚠️", text: "Trung bình" },
    weak: { bg: "#fee2e2", color: "#991b1b", icon: "❌", text: "Cần cải thiện" },
  };
  const c = config[status] || config.average;
  return (
    <span style={{ ...styles.badge, background: c.bg, color: c.color }}>
      {c.icon} {c.text}
    </span>
  );
};

// Band score calculation for Listening
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

// ===== MAIN COMPONENT =====
const ListeningResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navResult = location.state;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [test, setTest] = useState(null);
  const [details, setDetails] = useState([]);
  const [filter, setFilter] = useState("all");
  const [collapsedParts, setCollapsedParts] = useState({});

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // If we have navigation state with score, use it
        if (navResult?.score !== undefined) {
          setSubmission({
            correct: navResult.score,
            total: navResult.answers ? Object.keys(navResult.answers).length : 40,
            answers: navResult.answers,
          });
        }

        // Fetch test data
        const testRes = await fetch(apiPath(`listening-tests/${id}`));
        if (testRes.ok) {
          const testData = await testRes.json();
          setTest(testData);
          
          // Generate details from answers and test data
          if (navResult?.answers && testData.questions) {
            const generatedDetails = generateDetails(testData.questions, navResult.answers);
            setDetails(generatedDetails);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navResult]);

  // Generate answer details
  const generateDetails = (questions, answers) => {
    const details = [];
    let questionNumber = 1;

    Object.entries(questions).forEach(([partKey, partQuestions]) => {
      const partNum = parseInt(partKey.replace('part', ''));
      
      partQuestions.forEach((q, idx) => {
        const answerKey = `${partKey}_${idx}`;
        const studentAnswer = answers[answerKey] || '';
        const correctAnswer = q.correctAnswer || '';
        const isCorrect = studentAnswer.toString().toLowerCase().trim() === 
                          correctAnswer.toString().toLowerCase().trim();

        details.push({
          questionNumber,
          part: partNum,
          questionType: q.questionType || 'fill',
          studentAnswer,
          correctAnswer,
          isCorrect,
          questionText: q.questionText || '',
        });
        questionNumber++;
      });
    });

    return details;
  };

  // Group details by part
  const groupedDetails = useMemo(() => {
    if (!details.length) return {};
    const groups = {};
    details.forEach((d) => {
      const part = `Part ${d.part}`;
      if (!groups[part]) groups[part] = [];
      groups[part].push(d);
    });
    return groups;
  }, [details]);

  // Filtered details
  const filteredDetails = useMemo(() => {
    if (filter === "all") return details;
    if (filter === "correct") return details.filter((d) => d.isCorrect);
    if (filter === "wrong") return details.filter((d) => !d.isCorrect);
    return details;
  }, [details, filter]);

  // Analysis by part - must be before early return
  const partAnalysis = useMemo(() => {
    const analysis = {};
    details.forEach(d => {
      const part = `Part ${d.part}`;
      if (!analysis[part]) {
        analysis[part] = { correct: 0, total: 0 };
      }
      analysis[part].total++;
      if (d.isCorrect) analysis[part].correct++;
    });
    return Object.entries(analysis).map(([part, data]) => ({
      part,
      ...data,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      status: data.total > 0 
        ? (data.correct / data.total >= 0.7 ? 'good' : data.correct / data.total >= 0.5 ? 'average' : 'weak')
        : 'weak'
    }));
  }, [details]);

  const togglePart = (part) => {
    setCollapsedParts((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ ...styles.container, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#64748b" }}>Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  const correct = submission?.correct || details.filter(d => d.isCorrect).length;
  const total = submission?.total || details.length || 40;
  const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const band = bandFromCorrect(correct);
  const wrongCount = details.filter((d) => !d.isCorrect).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎧 Kết quả Listening Test</h1>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      {/* Meta Info */}
      {test && (
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>📚 Bài test:</span>
            <span style={styles.metaValue}>{test.title || `Listening #${id}`}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>🏫 Mã lớp:</span>
            <span style={styles.metaValue}>{test.classCode || "N/A"}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>👨‍🏫 Giáo viên:</span>
            <span style={styles.metaValue}>{test.teacherName || "N/A"}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        {/* Score Circle */}
        <div style={styles.summaryCard}>
          <div style={styles.progressCircle}>
            <CircularProgress percentage={scorePercentage} />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(0deg)",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: scorePercentage >= 70 ? "#22c55e" : scorePercentage >= 50 ? "#f59e0b" : "#ef4444",
              }}
            >
              {scorePercentage}%
            </div>
          </div>
          <div style={styles.cardLabel}>Tỷ lệ đúng</div>
        </div>

        {/* Band Score */}
        <div style={styles.summaryCard}>
          <div
            style={{
              ...styles.cardValue,
              fontSize: "2.5rem",
              color: "#1e293b",
              background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {band}
          </div>
          <div style={styles.cardLabel}>Band IELTS</div>
        </div>

        {/* Correct Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#22c55e" }}>
            {correct}
            <span style={{ fontSize: "1rem", color: "#64748b" }}>/{total}</span>
          </div>
          <div style={styles.cardLabel}>Câu đúng</div>
        </div>

        {/* Wrong Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#ef4444" }}>{wrongCount}</div>
          <div style={styles.cardLabel}>Câu sai</div>
        </div>
      </div>

      {/* Part Analysis */}
      {partAnalysis.length > 0 && (
        <div style={styles.analysisSection}>
          <h3 style={styles.sectionTitle}>
            📊 Phân tích theo Part
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {partAnalysis.map((p) => (
              <div key={p.part} style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#0e276f" }}>{p.part}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {p.correct}/{p.total} ({p.percentage}%)
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer Comparison Table */}
      {details.length > 0 && (
        <div style={styles.tableContainer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📝 Chi tiết đáp án</h3>
            <div style={styles.filterBar}>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "all" ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter("all")}
              >
                Tất cả ({details.length})
              </button>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "correct" ? { ...styles.filterBtnActive, background: "#22c55e", borderColor: "#22c55e" } : {}),
                }}
                onClick={() => setFilter("correct")}
              >
                ✓ Đúng ({details.filter((d) => d.isCorrect).length})
              </button>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "wrong" ? { ...styles.filterBtnActive, background: "#ef4444", borderColor: "#ef4444" } : {}),
                }}
                onClick={() => setFilter("wrong")}
              >
                ✕ Sai ({wrongCount})
              </button>
            </div>
          </div>

          {/* Grouped by Part */}
          {Object.keys(groupedDetails).length > 1 ? (
            Object.entries(groupedDetails).map(([part, items]) => {
              const partFiltered = items.filter((d) =>
                filter === "all" ? true : filter === "correct" ? d.isCorrect : !d.isCorrect
              );
              if (partFiltered.length === 0) return null;

              const partCorrect = items.filter((d) => d.isCorrect).length;
              return (
                <div key={part} style={{ marginBottom: "12px" }}>
                  <div style={styles.partHeader} onClick={() => togglePart(part)}>
                    <span>
                      🎧 {part} ({partCorrect}/{items.length} đúng)
                    </span>
                    <span>{collapsedParts[part] ? "▶" : "▼"}</span>
                  </div>
                  {!collapsedParts[part] && (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Câu</th>
                          <th style={styles.th}>Đáp án đúng</th>
                          <th style={styles.th}>Bạn trả lời</th>
                          <th style={styles.th}>Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partFiltered.map((r, idx) => (
                          <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                            <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                            <td style={styles.td}>
                              <span style={{ color: "#166534", fontWeight: 500 }}>
                                {r.correctAnswer}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                                {r.studentAnswer || <em style={{ color: "#94a3b8" }}>Bỏ trống</em>}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {r.isCorrect ? (
                                <span style={{ color: "#22c55e", fontSize: "1.2rem" }}>✓</span>
                              ) : (
                                <span style={{ color: "#ef4444", fontSize: "1.2rem" }}>✕</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Câu</th>
                  <th style={styles.th}>Part</th>
                  <th style={styles.th}>Đáp án đúng</th>
                  <th style={styles.th}>Bạn trả lời</th>
                  <th style={styles.th}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.map((r, idx) => (
                  <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                    <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                    <td style={styles.td}>Part {r.part}</td>
                    <td style={styles.td}>
                      <span style={{ color: "#166534", fontWeight: 500 }}>
                        {r.correctAnswer}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                        {r.studentAnswer || <em style={{ color: "#94a3b8" }}>Bỏ trống</em>}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.isCorrect ? (
                        <span style={{ color: "#22c55e", fontSize: "1.2rem" }}>✓</span>
                      ) : (
                        <span style={{ color: "#ef4444", fontSize: "1.2rem" }}>✕</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actionsBar}>
        <button
          style={{ ...styles.actionBtn, ...styles.primaryBtn }}
          onClick={() => navigate(`/listening/${id}`)}
        >
          🔄 Làm lại bài này
        </button>
        <button
          style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
          onClick={() => navigate("/select-test")}
        >
          📚 Chọn bài khác
        </button>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>
            🏠 Về trang chủ
          </button>
        </Link>
      </div>
    </div>
  );
};

export default ListeningResults;
