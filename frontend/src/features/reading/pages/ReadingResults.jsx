import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { apiPath, getStoredUser } from "../../../shared/utils/api";
import { isAdmin, isTeacher } from "../../../shared/utils/permissions";
import ReadingStudentStyleReview from "../components/ReadingStudentStyleReview";

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
  analysisGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
  },
  analysisItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
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
  tabContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  tabActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
  },
  reviewPromptCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  reviewPromptTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "4px",
  },
  reviewPromptText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
  },
  questionSummary: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "24px",
  },
  questionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(42px, 1fr))",
    gap: "8px",
    marginBottom: "14px",
  },
  questionBadge: {
    minHeight: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
    border: "1px solid rgba(148, 163, 184, 0.25)",
  },
  legendRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    fontSize: "0.9rem",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    display: "inline-block",
  },
  subSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
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

const QuestionTypeBadge = ({ type }) => {
  const icons = {
    "True/False/Not Given": "📋",
    "Yes/No/Not Given": "📋",
    "Matching Headings": "🔗",
    "Matching Information": "🔗",
    "Multiple Choice": "🔘",
    "Cloze Test": "✏️",
    "Short Answer": "📝",
    "Sentence Completion": "📝",
    "Summary Completion": "📄",
  };
  return <span title={type}>{icons[type] || "❓"} {type}</span>;
};

const hasDetailAnswer = (detail) => {
  const raw = detail?.studentLabel ?? detail?.student ?? detail?.studentAnswer;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw ?? "").trim() !== "";
};

// ===== MAIN COMPONENT =====
const ReadingResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navResult = location.state?.result;
  const currentUser = useMemo(() => getStoredUser(), []);
  const canViewDetailedReview = useMemo(
    () => isAdmin(currentUser) || isTeacher(currentUser),
    [currentUser]
  );

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState([]);
  const [meta, setMeta] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [test, setTest] = useState(null);
  const [filter, setFilter] = useState("all"); // all, correct, wrong
  const [collapsedParts, setCollapsedParts] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [showLegacyTable, setShowLegacyTable] = useState(false);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const submissionId = navResult?.submissionId || id;

      try {
        // 1. Fetch compare details
        const compareRes = await fetch(apiPath(`reading-submissions/${submissionId}/compare`));
        if (compareRes.ok) {
          const compareData = await compareRes.json();
          setDetails(compareData.details || []);
        }

        // 2. Fetch submission info
        const subRes = await fetch(apiPath(`reading-submissions/${submissionId}`));
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubmission(subData);
          let metaInfo = {
            submissionId: subData.id,
            userName: subData.userName,
            userPhone: subData.userPhone,
            testId: subData.testId,
            correct: subData.correct,
            total: subData.total,
            scorePercentage: subData.scorePercentage,
            band: subData.band,
            submittedAt: subData.submittedAt || subData.createdAt,
            feedback: subData.feedback,
            feedbackBy: subData.feedbackBy,
            feedbackAt: subData.feedbackAt,
          };

          // Store feedback
          if (subData.feedback) {
            setFeedback({
              content: subData.feedback,
              by: subData.feedbackBy,
              at: subData.feedbackAt,
            });
          }

          // 3. Fetch test info
          if (subData.testId) {
            const testRes = await fetch(apiPath(`reading-tests/${subData.testId}`));
            if (testRes.ok) {
              const testData = await testRes.json();
              setTest(testData);
              metaInfo.testTitle = testData.title || `#${testData.id}`;
              metaInfo.classCode = testData.classCode || "";
              metaInfo.teacherName = testData.teacherName || "";
              metaInfo.duration = testData.duration;
            }
          }

          // Use navResult for score if available
          if (navResult) {
            metaInfo = { ...metaInfo, ...navResult };
          }

          setMeta(metaInfo);
        }

        // 4. Fetch analysis
        const analysisRes = await fetch(apiPath(`reading-submissions/${submissionId}/analysis`));
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();

          // Normalize analysis to ensure `analysis.breakdown` is a mapping { label: {correct,total,percentage,status,...} }
          // Some older submissions store the full breakdown object (summary, byType, etc). Convert to frontend-friendly shape.
          const normalizeAnalysis = (data = {}) => {
            let normalized = { ...data };
            const breakdownMap = {};
            const suggestions = Array.isArray(normalized.suggestions) ? [...normalized.suggestions] : [];

            // If breakdown exists and looks like a proper map (not a legacy root object), use it.
            const legacyKeys = ['summary','byType','weakAreas','strongAreas','generatedAt','suggestions','breakdown'];
            if (
              normalized.breakdown &&
              typeof normalized.breakdown === 'object' &&
              Object.keys(normalized.breakdown).length > 0 &&
              !Object.keys(normalized.breakdown).some(k => legacyKeys.includes(k))
            ) {
              // already in the expected shape
              Object.assign(breakdownMap, normalized.breakdown);
            } else if (Array.isArray(normalized.byType) && normalized.byType.length > 0) {
              // Convert byType array into a lookup map keyed by label
              normalized.byType.forEach((t) => {
                const key = t.label || t.type || 'Other';
                breakdownMap[key] = {
                  correct: t.correct || 0,
                  total: t.total || 0,
                  percentage: t.percentage || 0,
                  status: t.status || 'average',
                  suggestion: t.suggestion || '',
                  wrongQuestions: t.wrongQuestions || []
                };
                if (t.suggestion) suggestions.push(t.suggestion);
              });
            } else if (normalized.breakdown && typeof normalized.breakdown === 'object' && Object.keys(normalized.breakdown).some(k => legacyKeys.includes(k))) {
              // Legacy case: breakdown contains root-level fields (summary/byType). Try to rebuild from that.
              const nb = normalized.breakdown;
              if (Array.isArray(nb.byType) && nb.byType.length > 0) {
                nb.byType.forEach((t) => {
                  const key = t.label || t.type || 'Other';
                  breakdownMap[key] = {
                    correct: t.correct || 0,
                    total: t.total || 0,
                    percentage: t.percentage || 0,
                    status: t.status || 'average',
                    suggestion: t.suggestion || '',
                    wrongQuestions: t.wrongQuestions || []
                  };
                  if (t.suggestion) suggestions.push(t.suggestion);
                });
              } else if (nb.summary) {
                breakdownMap['Summary'] = {
                  correct: nb.summary.totalCorrect || 0,
                  total: nb.summary.totalQuestions || 0,
                  percentage: nb.summary.overallPercentage || 0,
                  status: (nb.summary.overallPercentage || 0) >= 70 ? 'good' : (nb.summary.overallPercentage || 0) >= 50 ? 'average' : 'weak'
                };
              }
            } else if (normalized.summary && (normalized.summary.totalQuestions || normalized.summary.totalCorrect || normalized.summary.overallPercentage !== undefined)) {
              // Fallback: only overall summary available
              breakdownMap['Summary'] = {
                correct: normalized.summary.totalCorrect || 0,
                total: normalized.summary.totalQuestions || 0,
                percentage: normalized.summary.overallPercentage || 0,
                status:
                  (normalized.summary.overallPercentage || 0) >= 70
                    ? 'good'
                    : (normalized.summary.overallPercentage || 0) >= 50
                      ? 'average'
                      : 'weak'
              };
            }

            normalized.breakdown = breakdownMap;
            normalized.suggestions = suggestions;
            return normalized;
          };

          setAnalysis(normalizeAnalysis(analysisData));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navResult]);

  // Group details by part/paragraph
  const groupedDetails = useMemo(() => {
    if (!details.length) return {};
    const groups = {};
    details.forEach((d) => {
      const part = d.paragraphId || "Other";
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

  const togglePart = (part) => {
    setCollapsedParts((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  useEffect(() => {
    if (!canViewDetailedReview && activeTab === "review") {
      setActiveTab("overview");
    }
  }, [activeTab, canViewDetailedReview]);

  useEffect(() => {
    if (activeTab !== "review") {
      setShowLegacyTable(false);
    }
  }, [activeTab]);

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

  // No data
  if (!meta && !details.length) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📭</div>
          <h3 style={{ color: "#64748b" }}>Không tìm thấy kết quả</h3>
          <p style={{ color: "#94a3b8" }}>Submission ID: {id}</p>
          <Link to="/" style={{ color: "#3b82f6" }}>← Quay lại trang chủ</Link>
        </div>
      </div>
    );
  }

  const scorePercentage = meta?.scorePercentage || (meta?.total ? Math.round((meta.correct / meta.total) * 100) : 0);
  const band = meta?.band != null && Number.isFinite(Number(meta.band)) ? Number(meta.band).toFixed(1) : null;
  const wrongCount = details.filter((d) => !d.isCorrect).length;
  const legendColors = {
    correct: "#dcfce7",
    wrong: "#fee2e2",
    blank: "#f1f5f9",
  };

  const getDetailStatus = (detail) => {
    if (detail?.isCorrect) {
      return { label: "Đúng", bg: legendColors.correct, text: "#166534" };
    }
    if (!hasDetailAnswer(detail)) {
      return { label: "Bỏ trống", bg: legendColors.blank, text: "#64748b" };
    }
    return { label: "Sai", bg: legendColors.wrong, text: "#991b1b" };
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📖 Kết quả Reading Test</h1>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      {canViewDetailedReview && (
        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            style={{
              ...styles.tab,
              ...(activeTab === "overview" ? styles.tabActive : {}),
            }}
          >
            📈 Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            style={{
              ...styles.tab,
              ...(activeTab === "review" ? styles.tabActive : {}),
            }}
          >
            📝 Chi tiết từng câu
          </button>
        </div>
      )}

      {activeTab === "overview" && meta && (
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>📚 Bài test:</span>
            <span style={styles.metaValue}>{meta.testTitle || `#${meta.testId}`}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>🏫 Mã lớp:</span>
            <span style={styles.metaValue}>{meta.classCode || "N/A"}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>👨‍🏫 Giáo viên:</span>
            <span style={styles.metaValue}>{meta.teacherName || "N/A"}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>👤 Học sinh:</span>
            <span style={styles.metaValue}>
              {meta.userName || "N/A"} {meta.userPhone && `• ${meta.userPhone}`}
            </span>
          </div>
          {meta.submittedAt && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>📅 Ngày nộp:</span>
              <span style={styles.metaValue}>
                {new Date(meta.submittedAt).toLocaleString("vi-VN")}
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === "overview" && (
        <>
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
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {band || "N/A"}
          </div>
          <div style={styles.cardLabel}>Band IELTS</div>
        </div>

        {/* Correct Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#22c55e" }}>
            {meta?.correct || 0}
            <span style={{ fontSize: "1rem", color: "#64748b" }}>/{meta?.total || 0}</span>
          </div>
          <div style={styles.cardLabel}>Câu đúng</div>
        </div>

        {/* Wrong Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#ef4444" }}>{wrongCount}</div>
          <div style={styles.cardLabel}>Câu sai</div>
        </div>
      </div>

      {/* Teacher Feedback */}
      {feedback && (
        <div style={styles.feedbackBox}>
          <div style={styles.feedbackHeader}>
            <span style={{ fontSize: "1.5rem" }}>💬</span>
            <strong style={{ color: "#92400e" }}>Nhận xét từ giáo viên</strong>
            {feedback.by && (
              <span style={{ color: "#b45309", fontSize: "0.85rem" }}>— {feedback.by}</span>
            )}
          </div>
          <p style={{ margin: 0, color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {feedback.content}
          </p>
          {feedback.at && (
            <p style={{ margin: "12px 0 0", fontSize: "0.8rem", color: "#b45309" }}>
              🕐 {new Date(feedback.at).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
      )}

      {/* Analysis Breakdown */}
      {analysis?.breakdown && Object.keys(analysis.breakdown).length > 0 && (
        <div style={styles.analysisSection}>
          <h3 style={styles.sectionTitle}>
            📊 Phân tích theo dạng câu hỏi
          </h3>

          <div style={styles.analysisGrid}>
            {Object.entries(analysis.breakdown)
              .filter(([label, d]) => d && (typeof d.total === 'number' ? d.total >= 0 : true))
              .map(([label, d]) => (
                <div key={label} style={styles.analysisItem}>
                  <div>
                    <QuestionTypeBadge type={label} />
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      {d.correct}/{d.total} câu đúng ({d.percentage}%)
                    </div>
                    {d.suggestion && (
                      <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '6px' }}>
                        {d.suggestion}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
          </div>

          {/* Weak Areas */}
          {analysis.weakAreas && analysis.weakAreas.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ margin: '8px 0' }}>💥 Điểm yếu cần cải thiện</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {analysis.weakAreas.map((w, i) => (
                  <div key={i} style={{ background: '#fff5f5', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2', minWidth: '220px' }}>
                    <strong>{w.label}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{w.percentage}% đúng</div>
                    {w.wrongQuestions && w.wrongQuestions.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '6px' }}>
                        Sai ở các câu: {w.wrongQuestions.join(', ')}
                      </div>
                    )}
                    {w.suggestion && <div style={{ marginTop: '8px', color: '#92400e' }}>{w.suggestion}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
              <strong style={{ color: '#92400e' }}>💡 Gợi ý tổng quan:</strong>
              <ul style={{ margin: '8px 0 0 20px', color: '#78350f' }}>
                {analysis.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {canViewDetailedReview && details.length > 0 && (
        <div style={styles.reviewPromptCard}>
          <div>
            <div style={styles.reviewPromptTitle}>Giáo viên có thể mở chi tiết từng câu</div>
            <p style={styles.reviewPromptText}>
              Mở bảng đối chiếu để xem học sinh đã chọn gì ở từng câu, câu nào bỏ trống, và dùng kết quả đó để giảng lại ngay trên lớp.
            </p>
          </div>
          <button
            type="button"
            style={{ ...styles.actionBtn, ...styles.primaryBtn }}
            onClick={() => setActiveTab("review")}
          >
            📝 Xem chi tiết từng câu
          </button>
        </div>
      )}
        </>
      )}

      {/* Answer Comparison Table */}
      {canViewDetailedReview && activeTab === "review" && details.length > 0 && (
        <>
        <div style={styles.questionSummary}>
          <h3 style={styles.sectionTitle}>Tóm tắt kết quả từng câu</h3>
          <div style={styles.questionGrid}>
            {details.map((detail, idx) => {
              const status = getDetailStatus(detail);
              return (
                <div
                  key={`${detail.questionNumber}-${idx}`}
                  style={{
                    ...styles.questionBadge,
                    backgroundColor: status.bg,
                    color: status.text,
                  }}
                  title={`Câu ${detail.questionNumber}: ${status.label}`}
                >
                  {detail.questionNumber}
                </div>
              );
            })}
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.correct }}></span> Đúng</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.wrong }}></span> Sai</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.blank }}></span> Bỏ trống</span>
          </div>
        </div>

        {test && submission ? (
          <ReadingStudentStyleReview
            test={test}
            submission={submission}
            details={details}
          />
        ) : (
          <div style={styles.reviewPromptCard}>
            <div>
              <div style={styles.reviewPromptTitle}>Chưa dựng lại được giao diện làm bài gốc</div>
              <p style={styles.reviewPromptText}>
                Dữ liệu test hoặc submission gốc chưa sẵn sàng, nên trang hiện tạm bảng đối chiếu chi tiết bên dưới.
              </p>
            </div>
          </div>
        )}

        <div style={styles.tableContainer}>
          <div style={styles.subSectionHeader}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📝 Chi tiết đáp án</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...styles.actionBtn, ...styles.secondaryBtn, padding: "8px 14px" }}
                onClick={() => setShowLegacyTable((prev) => !prev)}
              >
                {showLegacyTable ? "Ẩn bảng đối chiếu" : "Hiện bảng đối chiếu"}
              </button>
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
          </div>

          {showLegacyTable && (
            <>

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
                      📄 {part} ({partCorrect}/{items.length} đúng)
                    </span>
                    <span>{collapsedParts[part] ? "▶" : "▼"}</span>
                  </div>
                  {!collapsedParts[part] && (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Q</th>
                          <th style={styles.th}>Đáp án đúng</th>
                          <th style={styles.th}>Bạn chọn</th>
                          <th style={styles.th}>Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partFiltered.map((r, idx) => (
                          <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                            <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                            <td style={styles.td}>
                              <span style={{ color: "#166534", fontWeight: 500 }}>
                                {r.expectedLabel || r.expected}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                                {r.studentLabel || r.student || <em style={{ color: "#94a3b8" }}>Bỏ trống</em>}
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
                  <th style={styles.th}>Paragraph</th>
                  <th style={styles.th}>Đáp án đúng</th>
                  <th style={styles.th}>Bạn chọn</th>
                  <th style={styles.th}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.map((r, idx) => (
                  <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                    <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                    <td style={styles.td}>{r.paragraphId || "-"}</td>
                    <td style={styles.td}>
                      <span style={{ color: "#166534", fontWeight: 500 }}>
                        {r.expectedLabel || r.expected}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                        {r.studentLabel || r.student || <em style={{ color: "#94a3b8" }}>Bỏ trống</em>}
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
            </>
          )}
        </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={styles.actionsBar}>
        {canViewDetailedReview && activeTab === "review" && (
          <button
            style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
            onClick={() => setActiveTab("overview")}
          >
            ← Quay lại tổng quan
          </button>
        )}
        <button
          style={{ ...styles.actionBtn, ...styles.primaryBtn }}
          onClick={() => navigate(`/reading/${meta?.testId || id}`)}
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

export default ReadingResults;
