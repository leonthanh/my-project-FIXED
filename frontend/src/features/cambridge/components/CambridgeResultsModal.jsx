import React, { useEffect, useMemo, useRef } from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

const CambridgeResultsModal = ({ results, onClose, testTitle, studentName }) => {
  const modalRef = useRef(null);
  const { isDarkMode } = useTheme();
  const colors = useMemo(() => (
    isDarkMode
      ? {
          overlay: 'rgba(2, 6, 23, 0.7)',
          surface: '#111827',
          surfaceAlt: '#1f2b47',
          text: '#e5e7eb',
          muted: '#94a3b8',
          border: '#2a3350',
          headerBg: 'linear-gradient(135deg, #0b1d2e 0%, #12213a 100%)',
          stroke: '#2a3350',
          correctBg: '#0f2a1a',
          correctBorder: '#14532d',
          correctText: '#a7f3d0',
          wrongBg: '#2a1515',
          wrongBorder: '#7f1d1d',
          wrongText: '#fecaca',
        }
      : {
          overlay: 'rgba(0, 0, 0, 0.6)',
          surface: '#fff',
          surfaceAlt: '#f8fafc',
          text: '#1e293b',
          muted: '#64748b',
          border: '#e2e8f0',
          headerBg: 'linear-gradient(135deg, #0052cc 0%, #0066ff 100%)',
          stroke: '#e2e8f0',
          correctBg: '#f0fdf4',
          correctBorder: '#bbf7d0',
          correctText: '#16a34a',
          wrongBg: '#fef2f2',
          wrongBorder: '#fecaca',
          wrongText: '#dc2626',
        }
  ), [isDarkMode]);

  const safe = useMemo(() => {
    const r = results || {};
    const score = Number(r.score) || 0;
    const correct = Number(r.correct) || 0;
    const incorrect = Number(r.incorrect) || 0;
    const total = Number(r.total) || 0;
    const rawPct = Number(r.percentage);
    const percentage = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0;

    return {
      score,
      correct,
      incorrect,
      total,
      percentage,
      writingQuestions: Array.isArray(r.writingQuestions) ? r.writingQuestions : [],
    };
  }, [results]);

  const { score, correct, incorrect, total, percentage, writingQuestions } = safe;

  useEffect(() => {
    if (!results) return;
    modalRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, results]);

  if (!results) return null;

  // Circular Progress
  const CircularProgress = ({ percentage, size = 100, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const color =
      percentage >= 70
        ? "#22c55e"
        : percentage >= 50
        ? "#f59e0b"
        : "#ef4444";

    return (
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
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

  const getStatus = () => {
    if (percentage >= 70) {
      return isDarkMode
        ? { text: "Tốt", bg: "#0f2a1a", color: "#a7f3d0", icon: "✅" }
        : { text: "Tốt", bg: "#dcfce7", color: "#166534", icon: "✅" };
    }
    if (percentage >= 50) {
      return isDarkMode
        ? { text: "Trung bình", bg: "#2a1f0f", color: "#fcd34d", icon: "⚠️" }
        : { text: "Trung bình", bg: "#fef3c7", color: "#92400e", icon: "⚠️" };
    }
    return isDarkMode
      ? { text: "Cần cải thiện", bg: "#2a1515", color: "#fecaca", icon: "❌" }
      : { text: "Cần cải thiện", bg: "#fee2e2", color: "#991b1b", icon: "❌" };
  };

  const status = getStatus();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: colors.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          animation: "slideUp 0.3s ease-out",
        }}
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Kết quả bài thi"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: colors.headerBg,
            padding: "32px 24px",
            color: "#fff",
            borderRadius: "16px 16px 0 0",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "#fff",
              cursor: "pointer",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
            Kết quả bài thi
          </h2>
          <p style={{ margin: "0", fontSize: "14px", opacity: 0.9 }}>
            {testTitle || "KET Reading Test"}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "32px 24px" }}>
          {/* Score Circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <CircularProgress percentage={percentage} size={120} strokeWidth={10} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <div style={{ fontSize: "32px", fontWeight: 700, color: colors.text }}>
                  {percentage}%
                </div>
                <div style={{ fontSize: "12px", color: colors.muted }}>Score</div>
              </div>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "16px 0 8px 0", color: colors.text }}>
              {score}/{total} điểm
            </h3>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "20px",
                background: status.bg,
                color: status.color,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {status.icon} {status.text}
            </span>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: colors.correctBg,
                padding: "16px",
                borderRadius: "12px",
                border: `1px solid ${colors.correctBorder}`,
              }}
            >
              <div style={{ fontSize: "12px", color: colors.muted, marginBottom: "6px" }}>
                CÂU ĐÚNG
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: colors.correctText }}>
                {correct}
              </div>
            </div>
            <div
              style={{
                background: colors.wrongBg,
                padding: "16px",
                borderRadius: "12px",
                border: `1px solid ${colors.wrongBorder}`,
              }}
            >
              <div style={{ fontSize: "12px", color: colors.muted, marginBottom: "6px" }}>
                CÂU SAI
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: colors.wrongText }}>
                {incorrect}
              </div>
            </div>
          </div>

          {/* Writing Questions Status */}
          {writingQuestions && writingQuestions.length > 0 && (
            <div
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #2a1f0f 0%, #3a2a12 100%)"
                  : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${isDarkMode ? '#92400e' : '#f59e0b'}`,
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "18px" }}>📝</span>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: isDarkMode ? '#fcd34d' : '#92400e' }}>
                  Writing Task (Câu {writingQuestions.map(q => q.questionNumber).join(", ")})
                </h4>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: isDarkMode ? '#fcd34d' : '#b45309' }}>
                ⏳ Đang chờ giáo viên chấm. Bạn sẽ được cập nhật điểm trong thời gian sớm nhất.
              </p>
            </div>
          )}

          {/* Info */}
          <div
            style={{
              background: colors.surfaceAlt,
              padding: "16px",
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
              fontSize: "13px",
              color: colors.muted,
              lineHeight: "1.6",
            }}
          >
            {studentName && (
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: colors.text }}>Học sinh:</strong> {studentName}
              </div>
            )}
            <div style={{ marginBottom: "8px" }}>
              <strong style={{ color: colors.text }}>Tổng điểm:</strong> {score} / {total}
            </div>
            <div>
              <strong style={{ color: colors.text }}>Tỷ lệ:</strong> {percentage}%
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "8px",
                border: "none",
                background: isDarkMode ? "#1f2b47" : "#0052cc",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.background = isDarkMode ? "#27354d" : "#003d99")}
              onMouseOut={(e) => (e.target.style.background = isDarkMode ? "#1f2b47" : "#0052cc")}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CambridgeResultsModal;
