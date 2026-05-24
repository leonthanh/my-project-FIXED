import React from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

const getAdminCardTheme = (isDarkMode) => ({
  filterLabel: isDarkMode ? "#94a3b8" : "#64748b",
  cardBackground: isDarkMode ? "rgba(15, 23, 42, 0.92)" : "#fff",
  cardBorder: isDarkMode ? "#334155" : "#e2e8f0",
  cardShadow: isDarkMode ? "0 10px 28px rgba(2, 6, 23, 0.28)" : "0 5px 14px rgba(15, 23, 42, 0.03)",
  titleColor: isDarkMode ? "#e2e8f0" : "#0f172a",
  sublineColor: isDarkMode ? "#94a3b8" : "#64748b",
  divider: isDarkMode ? "#23314f" : "#eef2f7",
  metaLabel: isDarkMode ? "#64748b" : "#94a3b8",
  metaValue: isDarkMode ? "#cbd5e1" : "#334155",
  listSummary: isDarkMode ? "#94a3b8" : "#64748b",
  emptyBackground: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#f8fafc",
  emptyBorder: isDarkMode ? "#475569" : "#cbd5e1",
  emptyText: isDarkMode ? "#94a3b8" : "#64748b",
  selectionBackground: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#f8fafc",
  selectionBorder: isDarkMode ? "#334155" : "#e2e8f0",
  selectionText: isDarkMode ? "#cbd5e1" : "#475569",
  checkboxBackground: isDarkMode ? "#0f172a" : "#f8fafc",
  checkboxBorder: isDarkMode ? "#334155" : "#e2e8f0",
});

export const adminCardStyles = {
  filterField: { display: "flex", flexDirection: "column", gap: 5, flex: "1 1 180px" },
  filterLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  cardList: { display: "flex", flexDirection: "column", gap: 7 },
  managementCard: {
    display: "flex",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 5px 14px rgba(15, 23, 42, 0.03)",
  },
  managementCardAccent: { width: 4, flexShrink: 0, background: "#2563eb" },
  managementCardBody: { flex: 1, padding: "11px 12px" },
  managementCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  managementHeadingBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: "1 1 240px",
  },
  managementHeadingLine: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  managementTitle: { fontSize: 14, color: "#0f172a", lineHeight: 1.05 },
  managementSubline: { fontSize: 10.5, color: "#64748b", lineHeight: 1.3 },
  managementMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #eef2f7",
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  metaValue: {
    fontSize: 12,
    color: "#334155",
    minHeight: 16,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  idPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 10,
    fontWeight: 800,
    border: "1px solid #e2e8f0",
  },
  softPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 10,
    fontWeight: 700,
    border: "1px solid #c7d2fe",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid transparent",
    fontSize: 10,
    fontWeight: 800,
  },
  listSummary: { fontSize: 11.5, color: "#64748b", marginBottom: 7 },
  emptyCard: {
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    padding: "16px 14px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
  },
  selectionToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 8,
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#f8fafc",
  },
  selectionSummary: { fontSize: 11.5, color: "#475569", lineHeight: 1.3 },
  selectionCheckboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
  },
  actionGroup: {
    display: "flex",
    gap: 4,
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
  },
};

export const FilterField = ({ label, children, minWidth = 180, style }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <label style={{ ...adminCardStyles.filterField, minWidth, ...style }}>
      <span style={{ ...adminCardStyles.filterLabel, color: theme.filterLabel }}>{label}</span>
      {children}
    </label>
  );
};

export const MetaItem = ({ label, value }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <div style={adminCardStyles.metaItem}>
      <span style={{ ...adminCardStyles.metaLabel, color: theme.metaLabel }}>{label}</span>
      <span style={{ ...adminCardStyles.metaValue, color: theme.metaValue }}>{value}</span>
    </div>
  );
};

export const AdminActionGroup = ({ children, style }) => (
  <div style={{ ...adminCardStyles.actionGroup, ...style }}>{children}</div>
);

export const AdminCardList = ({ children, style }) => (
  <div style={{ ...adminCardStyles.cardList, ...style }}>{children}</div>
);

export const AdminManagementCard = ({
  children,
  accent = "#2563eb",
  borderColor = "#e2e8f0",
  style,
  accentStyle,
  bodyStyle,
}) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <div
      style={{
        ...adminCardStyles.managementCard,
        background: theme.cardBackground,
        borderColor: isDarkMode ? theme.cardBorder : borderColor,
        boxShadow: theme.cardShadow,
        ...style,
      }}
    >
      <div style={{ ...adminCardStyles.managementCardAccent, background: accent, ...accentStyle }} />
      <div style={{ ...adminCardStyles.managementCardBody, ...bodyStyle }}>{children}</div>
    </div>
  );
};

export const AdminMetaGrid = ({ children, style }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <div style={{ ...adminCardStyles.managementMetaGrid, borderTopColor: theme.divider, ...style }}>
      {children}
    </div>
  );
};

export const AdminEmptyCard = ({ children, style }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <div
      style={{
        ...adminCardStyles.emptyCard,
        background: theme.emptyBackground,
        borderColor: theme.emptyBorder,
        color: theme.emptyText,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const AdminListSummary = ({ children, style }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return <p style={{ ...adminCardStyles.listSummary, color: theme.listSummary, ...style }}>{children}</p>;
};

export const AdminSelectionToolbar = ({ children, style }) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);

  return (
    <div
      style={{
        ...adminCardStyles.selectionToolbar,
        borderColor: theme.selectionBorder,
        background: theme.selectionBackground,
        color: theme.selectionText,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const AdminListCard = ({
  accent = "#2563eb",
  borderColor = "#e2e8f0",
  leading = null,
  title,
  badges = [],
  subtitle = "",
  actions = null,
  metaItems = [],
  children = null,
  style,
  bodyStyle,
  metaStyle,
}) => {
  const { isDarkMode } = useTheme();
  const theme = getAdminCardTheme(isDarkMode);
  const renderedBadges = Array.isArray(badges) ? badges.filter(Boolean) : badges ? [badges] : [];
  const renderedMetaItems = Array.isArray(metaItems) ? metaItems.filter(Boolean) : [];

  return (
    <AdminManagementCard accent={accent} borderColor={borderColor} style={style} bodyStyle={bodyStyle}>
      <div style={adminCardStyles.managementCardTop}>
        <div style={adminCardStyles.managementHeadingBlock}>
          <div style={adminCardStyles.managementHeadingLine}>
            {leading}
            <strong style={{ ...adminCardStyles.managementTitle, color: theme.titleColor }}>{title}</strong>
            {renderedBadges.map((badge, index) => (
              <React.Fragment key={index}>{badge}</React.Fragment>
            ))}
          </div>
          {subtitle ? <div style={{ ...adminCardStyles.managementSubline, color: theme.sublineColor }}>{subtitle}</div> : null}
        </div>

        {actions ? <AdminActionGroup>{actions}</AdminActionGroup> : null}
      </div>

      {renderedMetaItems.length > 0 ? (
        <AdminMetaGrid style={metaStyle}>
          {renderedMetaItems.map((item, index) => {
            if (React.isValidElement(item)) {
              return React.cloneElement(item, { key: item.key ?? index });
            }

            return <MetaItem key={item.key || `${item.label || "meta"}-${index}`} label={item.label} value={item.value} />;
          })}
        </AdminMetaGrid>
      ) : null}

      {children}
    </AdminManagementCard>
  );
};