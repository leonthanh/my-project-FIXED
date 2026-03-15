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
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDarkMode ? "#111827" : "#fff",
          borderRadius: 20,
          boxShadow: "0 24px 48px rgba(15,23,42,0.35)",
          maxWidth: "520px",
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
        {/* Gradient Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0284c7 100%)",
            padding: "26px 28px 22px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 20, right: 60, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              background: "rgba(255,255,255,0.18)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 16,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            ✕
          </button>

          {/* Icon badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.2)",
              marginBottom: 12,
              fontSize: 24,
            }}
          >
            🏆
          </div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: 22, fontWeight: 700, color: "#fff" }}>
            Kết quả bài thi
          </h2>
          {testTitle && (
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
              {testTitle}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "28px 28px 24px" }}>
          {/* Score Circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            <div style={{ position: "relative", marginBottom: 12 }}>
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
                <div style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>
                  {percentage}%
                </div>
                <div style={{ fontSize: 11, color: colors.muted }}>Score</div>
              </div>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 8px 0", color: colors.text }}>
              {score}/{total} điểm
            </h3>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 20,
                background: status.bg,
                color: status.color,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {status.icon} {status.text}
            </span>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: colors.correctBg,
                padding: "16px",
                borderRadius: 14,
                border: `1px solid ${colors.correctBorder}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Câu đúng
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.correctText }}>
                {correct}
              </div>
            </div>
            <div
              style={{
                background: colors.wrongBg,
                padding: "16px",
                borderRadius: 14,
                border: `1px solid ${colors.wrongBorder}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Câu sai
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.wrongText }}>
                {incorrect}
              </div>
            </div>
          </div>

          {/* Writing Questions Status */}
          {writingQuestions && writingQuestions.length > 0 && (
            <div
              style={{
                background: isDarkMode ? "#2a1f0f" : "#fef3c7",
                borderRadius: 12,
                padding: "14px 16px",
                border: `1px solid ${isDarkMode ? '#92400e' : '#f59e0b'}`,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>📝</span>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#fcd34d' : '#92400e' }}>
                  Writing Task (Câu {writingQuestions.map(q => q.questionNumber).join(", ")})
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: isDarkMode ? '#fcd34d' : '#b45309' }}>
                ⏳ Đang chờ giáo viên chấm. Bạn sẽ được cập nhật điểm trong thời gian sớm nhất.
              </p>
            </div>
          )}

          {/* Student info */}
          {studentName && (
            <div
              style={{
                background: colors.surfaceAlt,
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.muted,
                marginBottom: 20,
              }}
            >
              <strong style={{ color: colors.text }}>Học sinh:</strong> {studentName}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "13px 24px",
              borderRadius: 20,
              border: "none",
              background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0284c7 100%)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(29,78,216,0.4)",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Đóng
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CambridgeResultsModal;
