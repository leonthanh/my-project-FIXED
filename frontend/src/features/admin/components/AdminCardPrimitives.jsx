import React from "react";

export const adminCardStyles = {
  filterField: { display: "flex", flexDirection: "column", gap: 5, flex: "1 1 180px" },
  filterLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  cardList: { display: "flex", flexDirection: "column", gap: 8 },
  managementCard: {
    display: "flex",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.035)",
  },
  managementCardAccent: { width: 4, flexShrink: 0, background: "#2563eb" },
  managementCardBody: { flex: 1, padding: "13px 14px" },
  managementCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  managementHeadingBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
    flex: "1 1 280px",
  },
  managementHeadingLine: { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" },
  managementTitle: { fontSize: 16, color: "#0f172a", lineHeight: 1.15 },
  managementSubline: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  managementMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #eef2f7",
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  metaLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  metaValue: {
    fontSize: 13,
    color: "#334155",
    minHeight: 18,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  idPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 9px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 11,
    fontWeight: 800,
    border: "1px solid #e2e8f0",
  },
  softPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid #c7d2fe",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 999,
    border: "1px solid transparent",
    fontSize: 11,
    fontWeight: 800,
  },
  listSummary: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  emptyCard: {
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    padding: "18px 16px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
  },
  selectionToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
  },
  selectionSummary: { fontSize: 12.5, color: "#475569" },
  selectionCheckboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 7,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
  },
  actionGroup: {
    display: "flex",
    gap: 6,
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
  },
};

export const FilterField = ({ label, children, minWidth = 180, style }) => (
  <label style={{ ...adminCardStyles.filterField, minWidth, ...style }}>
    <span style={adminCardStyles.filterLabel}>{label}</span>
    {children}
  </label>
);

export const MetaItem = ({ label, value }) => (
  <div style={adminCardStyles.metaItem}>
    <span style={adminCardStyles.metaLabel}>{label}</span>
    <span style={adminCardStyles.metaValue}>{value}</span>
  </div>
);

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
}) => (
  <div style={{ ...adminCardStyles.managementCard, borderColor, ...style }}>
    <div style={{ ...adminCardStyles.managementCardAccent, background: accent, ...accentStyle }} />
    <div style={{ ...adminCardStyles.managementCardBody, ...bodyStyle }}>{children}</div>
  </div>
);

export const AdminMetaGrid = ({ children, style }) => (
  <div style={{ ...adminCardStyles.managementMetaGrid, ...style }}>{children}</div>
);

export const AdminEmptyCard = ({ children, style }) => (
  <div style={{ ...adminCardStyles.emptyCard, ...style }}>{children}</div>
);

export const AdminListSummary = ({ children, style }) => (
  <p style={{ ...adminCardStyles.listSummary, ...style }}>{children}</p>
);

export const AdminSelectionToolbar = ({ children, style }) => (
  <div style={{ ...adminCardStyles.selectionToolbar, ...style }}>{children}</div>
);

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
  const renderedBadges = Array.isArray(badges) ? badges.filter(Boolean) : badges ? [badges] : [];
  const renderedMetaItems = Array.isArray(metaItems) ? metaItems.filter(Boolean) : [];

  return (
    <AdminManagementCard accent={accent} borderColor={borderColor} style={style} bodyStyle={bodyStyle}>
      <div style={adminCardStyles.managementCardTop}>
        <div style={adminCardStyles.managementHeadingBlock}>
          <div style={adminCardStyles.managementHeadingLine}>
            {leading}
            <strong style={adminCardStyles.managementTitle}>{title}</strong>
            {renderedBadges.map((badge, index) => (
              <React.Fragment key={index}>{badge}</React.Fragment>
            ))}
          </div>
          {subtitle ? <div style={adminCardStyles.managementSubline}>{subtitle}</div> : null}
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