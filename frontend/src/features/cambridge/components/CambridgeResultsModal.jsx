import React, { useEffect, useMemo, useRef } from "react";

const CambridgeResultsModal = ({ results, onClose, testTitle, studentName }) => {
  const modalRef = useRef(null);

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
  }, [onClose]);

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

  const getStatus = () => {
    if (percentage >= 70) return { text: "Tốt", bg: "#dcfce7", color: "#166534", icon: "✅" };
    if (percentage >= 50) return { text: "Trung bình", bg: "#fef3c7", color: "#92400e", icon: "⚠️" };
    return { text: "Cần cải thiện", bg: "#fee2e2", color: "#991b1b", icon: "❌" };
  };

  const status = getStatus();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
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
          background: "#fff",
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
            background: "linear-gradient(135deg, #0052cc 0%, #0066ff 100%)",
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
                <div style={{ fontSize: "32px", fontWeight: 700, color: "#1e293b" }}>
                  {percentage}%
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Score</div>
              </div>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "16px 0 8px 0", color: "#1e293b" }}>
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
                background: "#f0fdf4",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                CÂU ĐÚNG
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#16a34a" }}>
                {correct}
              </div>
            </div>
            <div
              style={{
                background: "#fef2f2",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #fecaca",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                CÂU SAI
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#dc2626" }}>
                {incorrect}
              </div>
            </div>
          </div>

          {/* Writing Questions Status */}
          {writingQuestions && writingQuestions.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #f59e0b",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "18px" }}>📝</span>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#92400e" }}>
                  Writing Task (Câu {writingQuestions.map(q => q.questionNumber).join(", ")})
                </h4>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#b45309" }}>
                ⏳ Đang chờ giáo viên chấm. Bạn sẽ được cập nhật điểm trong thời gian sớm nhất.
              </p>
            </div>
          )}

          {/* Info */}
          <div
            style={{
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              color: "#64748b",
              lineHeight: "1.6",
            }}
          >
            {studentName && (
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: "#1e293b" }}>Học sinh:</strong> {studentName}
              </div>
            )}
            <div style={{ marginBottom: "8px" }}>
              <strong style={{ color: "#1e293b" }}>Tổng điểm:</strong> {score} / {total}
            </div>
            <div>
              <strong style={{ color: "#1e293b" }}>Tỷ lệ:</strong> {percentage}%
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
                background: "#0052cc",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.background = "#003d99")}
              onMouseOut={(e) => (e.target.style.background = "#0052cc")}
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
