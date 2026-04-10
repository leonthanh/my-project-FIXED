import React from "react";
import LineIcon from "./LineIcon.jsx";

const HERO_BACKGROUND =
  "linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #0ea5e9 100%)";

const STAT_TONES = {
  sky: {
    light: {
      background: "#e0f2fe",
      border: "#bae6fd",
      value: "#0369a1",
      label: "#0284c7",
    },
    dark: {
      background: "rgba(12, 74, 110, 0.2)",
      border: "#0369a1",
      value: "#7dd3fc",
      label: "#38bdf8",
    },
  },
  green: {
    light: {
      background: "#f0fdf4",
      border: "#bbf7d0",
      value: "#15803d",
      label: "#16a34a",
    },
    dark: {
      background: "rgba(20, 83, 45, 0.2)",
      border: "#16a34a",
      value: "#86efac",
      label: "#4ade80",
    },
  },
  amber: {
    light: {
      background: "#fff7ed",
      border: "#fed7aa",
      value: "#c2410c",
      label: "#ea580c",
    },
    dark: {
      background: "rgba(146, 64, 14, 0.18)",
      border: "#c2410c",
      value: "#fdba74",
      label: "#fb923c",
    },
  },
};

const getToneStyles = (tone, darkContent) => {
  const palette = STAT_TONES[tone] || STAT_TONES.sky;
  return darkContent ? palette.dark : palette.light;
};

const TestStartModal = ({
  icon,
  iconName,
  eyebrow,
  subtitle,
  title,
  stats = [],
  statsMinWidth = 120,
  noticeTitle = "Important note",
  noticeContent,
  extraContent,
  extraActions = [],
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  darkContent = false,
  maxWidth = 520,
  zIndex = 1200,
}) => {
  const safeStats = Array.isArray(stats) ? stats.filter(Boolean) : [];
  const safeExtraActions = Array.isArray(extraActions)
    ? extraActions.filter(Boolean)
    : [];
  const contentBackground = darkContent ? "#1e293b" : "#fff";
  const secondaryBackground = darkContent ? "#1e293b" : "#fff";
  const secondaryBorder = darkContent ? "#334155" : "#e2e8f0";
  const secondaryColor = darkContent ? "#94a3b8" : "#64748b";
  const noticeBackground = darkContent ? "#1c1917" : "#fff7ed";
  const noticeBorder = darkContent ? "#92400e" : "#fed7aa";
  const noticeTextColor = darkContent ? "#fdba74" : "#9a3412";

  const getExtraActionStyles = (variant = "secondary") => {
    if (variant === "danger") {
      return darkContent
        ? {
            border: "#7f1d1d",
            background: "#450a0a",
            color: "#fca5a5",
          }
        : {
            border: "#fecaca",
            background: "#fef2f2",
            color: "#dc2626",
          };
    }

    return {
      border: secondaryBorder,
      background: secondaryBackground,
      color: secondaryColor,
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(4px)",
        zIndex,
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.35)",
          background: contentBackground,
        }}
      >
        <div
          style={{
            background: HERO_BACKGROUND,
            padding: "26px 28px 22px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -20,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {iconName ? <LineIcon name={iconName} size={22} strokeWidth={2} /> : icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.65)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {eyebrow}
              </div>
              {subtitle ? (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              lineHeight: 1.3,
              position: "relative",
              zIndex: 1,
              textShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ background: contentBackground, padding: "22px 24px" }}>
          {safeStats.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(${statsMinWidth}px, 1fr))`,
                gap: 10,
                marginBottom: 16,
              }}
            >
              {safeStats.map((stat, index) => {
                const toneStyles = getToneStyles(stat.tone, darkContent);
                return (
                  <div
                    key={`${stat.label}-${index}`}
                    style={{
                      background: toneStyles.background,
                      border: `1px solid ${toneStyles.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: toneStyles.value,
                        lineHeight: 1,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: toneStyles.label,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginTop: 4,
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {noticeContent ? (
            <div
              style={{
                background: noticeBackground,
                border: `1px solid ${noticeBorder}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#c2410c",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                {noticeTitle}
              </div>
              <div style={{ fontSize: 13, color: noticeTextColor, lineHeight: 1.5 }}>
                {noticeContent}
              </div>
            </div>
          ) : null}

          {extraContent || null}

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {secondaryLabel && onSecondary ? (
              <button
                type="button"
                onClick={onSecondary}
                style={{
                  padding: "9px 18px",
                  borderRadius: 20,
                  border: `1.5px solid ${secondaryBorder}`,
                  background: secondaryBackground,
                  fontSize: 13,
                  fontWeight: 600,
                  color: secondaryColor,
                  cursor: "pointer",
                }}
              >
                {secondaryLabel}
              </button>
            ) : null}
            {safeExtraActions.map((action, index) => {
              const tone = getExtraActionStyles(action.variant);
              return (
                <button
                  key={`${action.label}-${index}`}
                  type="button"
                  onClick={action.onClick}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 20,
                    border: `1.5px solid ${tone.border}`,
                    background: tone.background,
                    fontSize: 13,
                    fontWeight: 600,
                    color: tone.color,
                    cursor: "pointer",
                  }}
                >
                  {action.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onPrimary}
              style={{
                padding: "11px 28px",
                borderRadius: 20,
                background: "linear-gradient(135deg, #0369a1, #0ea5e9)",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(3,105,161,0.4)",
              }}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestStartModal;