import React from "react";

const DEFAULT_SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

const DEFAULT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "all", label: "All" },
];

const DEFAULT_STATUS_TONES = {
  pending: {
    activeBackground: "#f59e0b",
    activeBorder: "#f59e0b",
    activeText: "#ffffff",
    softBackground: "#fff7ed",
    softBorder: "#fed7aa",
    softText: "#9a3412",
  },
  reviewed: {
    activeBackground: "#16a34a",
    activeBorder: "#16a34a",
    activeText: "#ffffff",
    softBackground: "#f0fdf4",
    softBorder: "#bbf7d0",
    softText: "#166534",
  },
  all: {
    activeBackground: "#2563eb",
    activeBorder: "#2563eb",
    activeText: "#ffffff",
    softBackground: "#eff6ff",
    softBorder: "#bfdbfe",
    softText: "#1d4ed8",
  },
};

const SubmissionFilterPanel = ({
  fields = [],
  sortValue = "newest",
  onSortChange,
  sortOptions = DEFAULT_SORT_OPTIONS,
  statusValue = "pending",
  onStatusChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  onReset,
  filteredCount,
  totalCount,
  summaryLabel = "submissions",
  summaryHint = "",
  compact = false,
  compactPrimaryFieldCount = 4,
}) => {
  const hasCounts =
    Number.isFinite(Number(filteredCount)) && Number.isFinite(Number(totalCount));
  const resolvedPrimaryCount = compact
    ? Math.max(0, Math.min(fields.length, compactPrimaryFieldCount))
    : fields.length;
  const primaryFields = compact ? fields.slice(0, resolvedPrimaryCount) : fields;
  const secondaryFields = compact ? fields.slice(resolvedPrimaryCount) : [];
  const panelPadding = compact ? "10px 12px" : "14px 16px";
  const panelMarginBottom = compact ? 8 : 14;
  const fieldGap = compact ? 8 : 10;
  const labelStyle = compact
    ? { ...styles.label, marginBottom: 3, fontSize: 11.5 }
    : styles.label;
  const inputStyle = compact
    ? { ...styles.input, padding: "6px 9px", fontSize: 12.5 }
    : styles.input;
  const resetButtonStyle = compact
    ? { ...styles.resetButton, width: "auto", padding: "6px 14px", fontSize: 12.5 }
    : styles.resetButton;
  const statusLabelStyle = compact
    ? { ...styles.statusLabel, fontSize: 11.5 }
    : styles.statusLabel;
  const statusTabStyle = compact
    ? { ...styles.statusTab, padding: "6px 11px", fontSize: 12.5 }
    : styles.statusTab;
  const summaryStyle = compact
    ? { ...styles.summary, marginBottom: 6 }
    : styles.summary;
  const actionRowFieldStyle = compact
    ? styles.compactActionRowField
    : styles.actionRowField;
  const statusContainerStyle = compact
    ? styles.compactStatusContainer
    : styles.statusContainer;
  const resetContainerStyle = compact
    ? styles.compactResetContainer
    : styles.resetContainer;
  const statusTabsStyle = compact
    ? { ...styles.statusTabs, gap: 6 }
    : styles.statusTabs;
  const summaryContent = (
    <>
      Showing <strong>{filteredCount}</strong>
      {Number(totalCount) !== Number(filteredCount)
        ? ` / ${totalCount}`
        : ""} {summaryLabel}
    </>
  );

  return (
    <>
      <div
        style={{
          width: "100%",
          alignSelf: "stretch",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: panelPadding,
          marginBottom: panelMarginBottom,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact
              ? `repeat(${Math.max(primaryFields.length, 1)}, minmax(0, 1fr))`
              : "repeat(auto-fit, minmax(140px, 1fr))",
            gap: fieldGap,
            alignItems: "end",
          }}
        >
          {primaryFields.map((field) => (
            <div
              key={field.key || field.label}
              style={compact ? styles.compactField : undefined}
            >
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {(compact || secondaryFields.length > 0 || onSortChange || onStatusChange || onReset) && (
          <div
            style={{
              ...(compact ? styles.compactDividerRow : styles.dividerRow),
            }}
          >
            {secondaryFields.map((field) => (
              <div key={field.key || field.label} style={actionRowFieldStyle}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}

            {onSortChange && (
              <div style={actionRowFieldStyle}>
                <label style={labelStyle}>Sort By</label>
                <select
                  value={sortValue}
                  onChange={(e) => onSortChange(e.target.value)}
                  style={{ ...inputStyle, background: "#fff" }}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onStatusChange && (
              <div style={statusContainerStyle}>
                <span style={statusLabelStyle}>Status</span>
                <div style={statusTabsStyle}>
                  {statusOptions.map((option) => {
                    const isActive = statusValue === option.value;
                    const tone = DEFAULT_STATUS_TONES[option.value] || DEFAULT_STATUS_TONES.all;

                    return (
                      <button
                        key={option.value}
                        onClick={() => onStatusChange(option.value)}
                        style={{
                          ...statusTabStyle,
                          borderColor: isActive ? tone.activeBorder : tone.softBorder,
                          background: isActive ? tone.activeBackground : tone.softBackground,
                          color: isActive ? tone.activeText : tone.softText,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {onReset && (
              <div style={resetContainerStyle}>
                <button onClick={onReset} style={resetButtonStyle}>
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {hasCounts && (
        compact && summaryHint ? (
          <div style={styles.compactSummaryRow}>
            <p style={summaryStyle}>{summaryContent}</p>
            <p style={styles.summaryHint}>{summaryHint}</p>
          </div>
        ) : (
          <p style={summaryStyle}>{summaryContent}</p>
        )
      )}
    </>
  );
};

const styles = {
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box",
  },
  resetButton: {
    width: "100%",
    padding: "7px 10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  compactField: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },
  compactDividerRow: {
    display: "flex",
    alignItems: "end",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },
  actionRowField: {
    minWidth: 180,
    flex: "1 1 180px",
  },
  compactActionRowField: {
    display: "grid",
    gap: 3,
    minWidth: 148,
    flex: "1 1 148px",
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    minWidth: 260,
    flex: "1 1 260px",
  },
  compactStatusContainer: {
    display: "grid",
    gap: 3,
    minWidth: 232,
    flex: "1 1 232px",
  },
  resetContainer: {
    alignSelf: "end",
    width: 120,
    flex: "0 0 120px",
  },
  compactResetContainer: {
    alignSelf: "end",
    width: "auto",
    flex: "0 0 auto",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statusTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  statusTab: {
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  summary: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 8px",
  },
  compactSummaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  summaryHint: {
    fontSize: 12.5,
    color: "#6b7280",
    margin: 0,
  },
};

export default SubmissionFilterPanel;