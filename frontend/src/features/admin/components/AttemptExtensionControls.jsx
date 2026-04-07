import React, { useState } from "react";
import {
  MAX_EXTENSION_MINUTES,
  MIN_EXTENSION_MINUTES,
  normalizeCustomExtensionMinutes,
  QUICK_EXTENSION_OPTIONS,
} from "../utils/attemptTiming";

const wrapperBaseStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
};

const inputGroupBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const inputBaseStyle = {
  width: 86,
  minWidth: 86,
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #94a3b8",
  background: "#fff",
  color: "#0f172a",
  fontSize: 13,
};

const loadingBaseStyle = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "none",
  background: "#0284c7",
  color: "#fff",
  fontWeight: 600,
  cursor: "wait",
};

const errorBaseStyle = {
  width: "100%",
  fontSize: 12,
  color: "#b91c1c",
};

function AttemptExtensionControls({
  isLoading,
  onExtend,
  buttonStyle,
  submitButtonStyle,
  inputStyle,
  wrapperStyle,
  inputGroupStyle,
  loadingStyle,
  errorStyle,
  loadingLabel = "Extending...",
  submitLabel = "Extend",
  placeholder = "Enter minutes",
}) {
  const [customMinutes, setCustomMinutes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleCustomExtend = async () => {
    const normalized = normalizeCustomExtensionMinutes(customMinutes);
    if (!Number.isFinite(normalized)) {
      setErrorMessage(
        `Enter a value from ${MIN_EXTENSION_MINUTES} to ${MAX_EXTENSION_MINUTES} minutes.`
      );
      return;
    }

    setErrorMessage("");
    const didExtend = await onExtend(normalized);
    if (didExtend !== false) {
      setCustomMinutes("");
    }
  };

  const handleInputChange = (event) => {
    setCustomMinutes(event.target.value);
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCustomExtend();
    }
  };

  if (isLoading) {
    return <span style={{ ...loadingBaseStyle, ...loadingStyle }}>{loadingLabel}</span>;
  }

  return (
    <div style={{ ...wrapperBaseStyle, ...wrapperStyle }}>
      {QUICK_EXTENSION_OPTIONS.map((minutes) => (
        <button
          key={minutes}
          onClick={() => onExtend(minutes)}
          style={buttonStyle}
          title={`Add ${minutes} minutes`}
        >
          +{minutes}p
        </button>
      ))}

      <div style={{ ...inputGroupBaseStyle, ...inputGroupStyle }}>
        <input
          type="number"
          min={MIN_EXTENSION_MINUTES}
          max={MAX_EXTENSION_MINUTES}
          step="1"
          inputMode="numeric"
          value={customMinutes}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          style={{ ...inputBaseStyle, ...inputStyle }}
          title={`Enter ${MIN_EXTENSION_MINUTES} to ${MAX_EXTENSION_MINUTES} minutes`}
        />
        <button
          onClick={handleCustomExtend}
          style={submitButtonStyle || buttonStyle}
          title="Extend by the entered number of minutes"
        >
          {submitLabel}
        </button>
      </div>

      {errorMessage ? (
        <div style={{ ...errorBaseStyle, ...errorStyle }}>{errorMessage}</div>
      ) : null}
    </div>
  );
}

export default AttemptExtensionControls;