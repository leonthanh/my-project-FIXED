import React from "react";

const toneStyles = {
  info: {
    background: "linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(236, 254, 255, 0.98))",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    borderLeft: "5px solid #0284c7",
    boxShadow: "0 18px 40px rgba(14, 116, 144, 0.18)",
    labelColor: "#0369a1",
    dotBackground: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    dotShadow: "0 0 0 4px rgba(14, 165, 233, 0.12)",
  },
  warning: {
    background: "linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(254, 242, 242, 0.98))",
    border: "1px solid rgba(251, 146, 60, 0.45)",
    borderLeft: "5px solid #ea580c",
    boxShadow: "0 18px 40px rgba(234, 88, 12, 0.16)",
    labelColor: "#c2410c",
    dotBackground: "linear-gradient(135deg, #f97316, #fb7185)",
    dotShadow: "0 0 0 4px rgba(249, 115, 22, 0.14)",
  },
};

const buildToastStyle = (top, tone) => ({
  position: "fixed",
  top,
  right: 20,
  zIndex: 2000,
  width: "min(380px, calc(100vw - 24px))",
  padding: "14px 16px",
  borderRadius: 16,
  background: tone.background,
  border: tone.border,
  borderLeft: tone.borderLeft,
  color: "#0f172a",
  boxShadow: tone.boxShadow,
  backdropFilter: "blur(10px)",
});

const labelRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const dotStyle = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  flexShrink: 0,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const messageStyle = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
};

function ExtensionToast({ message, label = "Cap Nhat Thoi Gian", tone = "info", top = 78 }) {
  if (!message) return null;

  const palette = toneStyles[tone] || toneStyles.info;

  return (
    <div style={buildToastStyle(top, palette)} role="status" aria-live="polite">
      <div style={labelRowStyle}>
        <span
          style={{
            ...dotStyle,
            background: palette.dotBackground,
            boxShadow: palette.dotShadow,
          }}
        />
        <span style={{ ...labelStyle, color: palette.labelColor }}>{label}</span>
      </div>
      <div style={messageStyle}>{message}</div>
    </div>
  );
}

export default ExtensionToast;