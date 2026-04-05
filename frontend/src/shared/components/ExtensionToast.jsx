import React from "react";

const toastStyle = {
  position: "fixed",
  top: 78,
  right: 20,
  zIndex: 2000,
  width: "min(380px, calc(100vw - 24px))",
  padding: "14px 16px",
  borderRadius: 16,
  background: "linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(236, 254, 255, 0.98))",
  border: "1px solid rgba(56, 189, 248, 0.4)",
  borderLeft: "5px solid #0284c7",
  color: "#0f172a",
  boxShadow: "0 18px 40px rgba(14, 116, 144, 0.18)",
  backdropFilter: "blur(10px)",
};

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
  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
  boxShadow: "0 0 0 4px rgba(14, 165, 233, 0.12)",
  flexShrink: 0,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#0369a1",
};

const messageStyle = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
};

function ExtensionToast({ message }) {
  if (!message) return null;

  return (
    <div style={toastStyle} role="status" aria-live="polite">
      <div style={labelRowStyle}>
        <span style={dotStyle} />
        <span style={labelStyle}>Cap Nhat Thoi Gian</span>
      </div>
      <div style={messageStyle}>{message}</div>
    </div>
  );
}

export default ExtensionToast;