import React from "react";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";

const defaultHighlightColor = "#f59e0b";

export const getSubmissionTone = (variant = "pending", isDarkMode = false) => {
  const base = {
    cardBg: isDarkMode ? "#111827" : "#fff",
    panelBg: isDarkMode ? "#0f172a" : "#f8fafc",
    panelBorder: isDarkMode ? "#1f2937" : "#e5e7eb",
    divider: isDarkMode ? "#1f2937" : "#f3f4f6",
    primaryText: isDarkMode ? "#f8fafc" : "#111827",
    secondaryText: isDarkMode ? "#cbd5e1" : "#374151",
    mutedText: isDarkMode ? "#94a3b8" : "#6b7280",
    subtleText: isDarkMode ? "#94a3b8" : "#9ca3af",
    shadow: "0 1px 3px rgba(0,0,0,0.05)",
    calloutText: isDarkMode ? "#e5e7eb" : "#111827",
  };

  const variants = {
    pending: {
      border: "#fed7aa",
      accent: "#f59e0b",
      chipBg: "#fef3c7",
      chipColor: "#92400e",
      calloutBg: isDarkMode ? "rgba(245, 158, 11, 0.12)" : "#fff7ed",
      calloutBorder: "#fed7aa",
      calloutText: isDarkMode ? "#fde68a" : "#9a3412",
    },
    reviewed: {
      border: "#bbf7d0",
      accent: "#16a34a",
      chipBg: "#dcfce7",
      chipColor: "#166534",
      calloutBg: isDarkMode ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
      calloutBorder: "#bbf7d0",
      calloutText: isDarkMode ? "#bbf7d0" : "#166534",
    },
    active: {
      border: "#bfdbfe",
      accent: "#2563eb",
      chipBg: "#dbeafe",
      chipColor: "#1e3a8a",
      calloutBg: isDarkMode ? "rgba(37, 99, 235, 0.12)" : "#eff6ff",
      calloutBorder: "#bfdbfe",
      calloutText: isDarkMode ? "#dbeafe" : "#1e3a8a",
    },
    draft: {
      border: "#bfdbfe",
      accent: "#2563eb",
      chipBg: "#dbeafe",
      chipColor: "#1e3a8a",
      calloutBg: isDarkMode ? "rgba(37, 99, 235, 0.12)" : "#eff6ff",
      calloutBorder: "#bfdbfe",
      calloutText: isDarkMode ? "#dbeafe" : "#1e3a8a",
    },
  };

  return {
    ...base,
    ...(variants[variant] || variants.pending),
  };
};

export const SubmissionStatCards = ({ stats, containerStyle, compact = false }) => {
  const safeStats = Array.isArray(stats) ? stats.filter(Boolean) : [];
  if (!safeStats.length) return null;

  const cardPadding = compact ? "7px 14px" : "8px 18px";
  const cardRadius = compact ? 10 : 8;
  const minWidth = compact ? 96 : 110;
  const valueFont = compact ? 18 : 24;
  const labelFont = compact ? 11 : 12;
  const gap = compact ? 8 : 10;
  const marginBottom = compact ? 14 : 18;

  return (
    <div
      style={{
        display: "flex",
        gap,
        marginBottom,
        flexWrap: "wrap",
        ...containerStyle,
      }}
    >
      {safeStats.map((stat) => (
        <div
          key={stat.key || stat.label}
          style={{
            background: stat.bg,
            border: `1px solid ${stat.border}`,
            borderRadius: cardRadius,
            padding: cardPadding,
            minWidth,
            textAlign: "center",
            cursor: "default",
          }}
        >
          <div style={{ fontSize: valueFont, fontWeight: 700, color: stat.color, lineHeight: 1.1 }}>
            {stat.count}
          </div>
          <div style={{ fontSize: labelFont, color: stat.color, opacity: 0.85 }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ExpandableSubmissionList = ({
  items,
  expandedItems,
  onToggle,
  selectedId,
  getItemId = (item) => item.id,
  getItemDomId,
  getTone = () => getSubmissionTone("pending"),
  renderHeader,
  renderExpanded,
  containerStyle,
  emptyState = null,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyState;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        ...containerStyle,
      }}
    >
      {items.map((item, index) => {
        const itemId = getItemId(item);
        const isExpanded = Boolean(expandedItems?.has?.(itemId));
        const isSelected =
          selectedId != null && String(selectedId) === String(itemId);
        const resolvedTone = getTone(item, {
          index,
          isExpanded,
          isSelected,
        });
        const tone =
          typeof resolvedTone === "string"
            ? getSubmissionTone(resolvedTone)
            : resolvedTone;

        return (
          <div
            key={itemId}
            id={getItemDomId ? getItemDomId(item) : undefined}
            style={{
              border: `1px solid ${isSelected ? defaultHighlightColor : tone.border}`,
              borderLeft: `4px solid ${isSelected ? defaultHighlightColor : tone.accent}`,
              borderRadius: 8,
              background: tone.cardBg,
              overflow: "hidden",
              boxShadow: isSelected
                ? "0 0 0 2px rgba(245, 158, 11, 0.18)"
                : tone.shadow,
              scrollMarginTop: "120px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                userSelect: "none",
                flexWrap: "wrap",
              }}
              onClick={() => onToggle(itemId)}
            >
              {renderHeader({
                item,
                index,
                itemId,
                isExpanded,
                isSelected,
                tone,
              })}
              <span
                style={{
                  fontSize: 16,
                  color: tone.subtleText,
                  marginLeft: 4,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <InlineIcon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} style={{ color: "currentColor" }} />
              </span>
            </div>

            {isExpanded && (
              <div
                style={{
                  padding: "0 14px 16px",
                  borderTop: `1px solid ${tone.divider}`,
                }}
              >
                {renderExpanded({
                  item,
                  index,
                  itemId,
                  isExpanded,
                  isSelected,
                  tone,
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};