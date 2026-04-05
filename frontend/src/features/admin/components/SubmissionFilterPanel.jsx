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
}) => {
  const hasCounts =
    Number.isFinite(Number(filteredCount)) && Number.isFinite(Number(totalCount));

  return (
    <>
      <div
        style={{
          width: "100%",
          alignSelf: "stretch",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            alignItems: "end",
          }}
        >
          {fields.map((field) => (
            <div key={field.key || field.label}>
              <label style={styles.label}>{field.label}</label>
              <input
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                style={styles.input}
              />
            </div>
          ))}

          {onSortChange && (
            <div>
              <label style={styles.label}>Sort By</label>
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                style={{ ...styles.input, background: "#fff" }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ alignSelf: "end" }}>
            <button onClick={onReset} style={styles.resetButton}>
              Reset
            </button>
          </div>
        </div>

        {onStatusChange && (
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Status</span>
            <div style={styles.statusTabs}>
              {statusOptions.map((option) => {
                const isActive = statusValue === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => onStatusChange(option.value)}
                    style={{
                      ...styles.statusTab,
                      ...(isActive ? styles.statusTabActive : {}),
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasCounts && (
        <p style={styles.summary}>
          Showing <strong>{filteredCount}</strong>
          {Number(totalCount) !== Number(filteredCount)
            ? ` / ${totalCount}`
            : ""} {summaryLabel}
        </p>
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
    background: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #e5e7eb",
    flexWrap: "wrap",
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
  statusTabActive: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  },
  summary: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
};

export default SubmissionFilterPanel;