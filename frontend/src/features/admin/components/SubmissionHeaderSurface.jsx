import React from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

const SubmissionHeaderSurface = ({
  topRowLeft = null,
  topRowRight = null,
  middleLabel = null,
  middleContent = null,
  bottomContent = null,
  sticky = false,
  stickyTop = 92,
}) => {
  const { isDarkMode } = useTheme();
  const hasTopRow = Boolean(topRowLeft || topRowRight);
  const hasMiddleRow = Boolean(middleLabel || middleContent);
  const hasBottomRow = Boolean(bottomContent);

  return (
    <section style={surfaceStyle(isDarkMode, sticky, stickyTop)}>
      {hasTopRow ? (
        <div style={topRowStyle}>
          {topRowLeft ? <div style={topRowLeftStyle}>{topRowLeft}</div> : null}
          {topRowRight ? <div style={topRowRightStyle}>{topRowRight}</div> : null}
        </div>
      ) : null}

      {hasMiddleRow ? (
        <>
          {hasTopRow ? <div style={dividerStyle(isDarkMode)} /> : null}
          <div style={middleRowStyle}>
            {middleLabel ? (
              <span style={labelStyle(isDarkMode)}>{middleLabel}</span>
            ) : null}
            {middleContent ? <div style={middleContentStyle}>{middleContent}</div> : null}
          </div>
        </>
      ) : null}

      {hasBottomRow ? (
        <>
          {hasTopRow || hasMiddleRow ? <div style={dividerStyle(isDarkMode)} /> : null}
          <div style={bottomRowStyle}>{bottomContent}</div>
        </>
      ) : null}
    </section>
  );
};

const surfaceStyle = (isDarkMode, sticky, stickyTop) => ({
  display: "grid",
  gap: 8,
  position: sticky ? "sticky" : "relative",
  top: sticky ? stickyTop : undefined,
  zIndex: sticky ? 12 : 1,
  border: `1px solid ${isDarkMode ? "#243047" : "#e5e7eb"}`,
  borderRadius: 16,
  padding: "12px 14px 14px",
  background: isDarkMode ? "#0f172a" : "#fff",
  boxShadow: isDarkMode
    ? "0 10px 30px rgba(2, 6, 23, 0.32)"
    : "0 8px 20px rgba(15, 23, 42, 0.04)",
});

const dividerStyle = (isDarkMode) => ({
  height: 1,
  background: isDarkMode ? "#243047" : "#edf2f7",
});

const topRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const topRowLeftStyle = {
  display: "flex",
  minWidth: 0,
  flex: "1 1 auto",
};

const topRowRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: "0 0 auto",
};

const middleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const middleContentStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  flex: "1 1 320px",
  minWidth: 0,
};

const bottomRowStyle = {
  minWidth: 0,
};

const labelStyle = (isDarkMode) => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: isDarkMode ? "#cbd5e1" : "#374151",
  whiteSpace: "nowrap",
});

export default SubmissionHeaderSurface;