import React from "react";
import { getAiStatusStyle } from "../utils/aiFeedback";

const baseButtonStyle = {
  padding: "9px 16px",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 14,
  color: "#fff",
};

const baseStatusStyle = {
  marginTop: 8,
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 12.5,
  lineHeight: 1.45,
};

const baseSourceBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 6,
};

const baseToggleLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  fontWeight: 600,
  color: "#334155",
};

const AiFeedbackButton = ({
  onClick,
  loading = false,
  disabled = false,
  idleLabel = "Generate AI Draft",
  loadingLabel = "Generating...",
  backgroundColor = "#0f766e",
  disabledColor = "#9ca3af",
  style,
}) => {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...baseButtonStyle,
        background: isDisabled ? disabledColor : backgroundColor,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.68 : 1,
        ...style,
      }}
    >
      {loading ? loadingLabel : idleLabel}
    </button>
  );
};

const AiFeedbackStatus = ({ status, style }) => {
  if (!status?.text) return null;

  return (
    <div
      style={{
        ...baseStatusStyle,
        ...getAiStatusStyle(status.tone),
        ...style,
      }}
    >
      {status?.sourceLabel ? (
        <span
          style={{
            ...baseSourceBadgeStyle,
            ...(status?.sourceStyle || {}),
          }}
        >
          AI source: {status.sourceLabel}
        </span>
      ) : null}
      {status.text}
    </div>
  );
};

const AiAppendModeToggle = ({
  checked = false,
  onChange,
  disabled = false,
  label = "Append instead of replace",
  style,
}) => (
  <label
    style={{
      ...baseToggleLabelStyle,
      opacity: disabled ? 0.65 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}
  >
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
    />
    <span>{label}</span>
  </label>
);

export { AiAppendModeToggle, AiFeedbackButton, AiFeedbackStatus };
