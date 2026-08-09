import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  DEFAULT_DISPLAY_LABELS,
  useDisplaySettings,
} from "../../../shared/contexts/DisplaySettingsContext";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from "../components/AdminStickySidebarLayout";

const FIELD_META = [
  {
    key: "ixDisplayName",
    label: "IX label",
    description: "Shown in navbars and test library tabs.",
    placeholder: "IX",
  },
  {
    key: "orangeDisplayName",
    label: "Orange label",
    description: "Shown in navbars and Orange library sections.",
    placeholder: "Orange",
  },
  {
    key: "fceDisplayName",
    label: "FCE label",
    description: "Shown wherever the current FCE name appears.",
    placeholder: "FCE",
  },
];

const getCurrentMonthInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const AdminDisplaySettingsPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { displayLabels, loading, saveDisplayLabels } = useDisplaySettings();

  const [formValues, setFormValues] = useState(DEFAULT_DISPLAY_LABELS);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [saving, setSaving] = useState(false);
  const [usageOverview, setUsageOverview] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [trendDays, setTrendDays] = useState(7);
  const [trendMonth, setTrendMonth] = useState(getCurrentMonthInput);
  const [trendMode, setTrendMode] = useState("days");

  useEffect(() => {
    setFormValues({
      ixDisplayName: String(displayLabels?.ixDisplayName || DEFAULT_DISPLAY_LABELS.ixDisplayName),
      orangeDisplayName: String(
        displayLabels?.orangeDisplayName || DEFAULT_DISPLAY_LABELS.orangeDisplayName
      ),
      fceDisplayName: String(displayLabels?.fceDisplayName || DEFAULT_DISPLAY_LABELS.fceDisplayName),
    });
  }, [displayLabels]);

  useEffect(() => {
    if (!status) return undefined;
    const timerId = window.setTimeout(() => setStatus(""), 2600);
    return () => window.clearTimeout(timerId);
  }, [status]);

  const fetchUsageOverview = useCallback(async () => {
    try {
      setUsageLoading(true);
      const response = await authFetch(apiPath("admin/usage-overview"));
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Could not load usage overview.");
      }

      setUsageOverview(payload);
      setUsageError("");
    } catch (error) {
      setUsageError(error?.message || "Could not load usage overview.");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageOverview();
  }, [fetchUsageOverview]);

  const fetchUsageTrend = useCallback(async ({ days, month, mode } = {}) => {
    try {
      const nextMode = mode === "month" ? "month" : "days";
      const nextDays = Number(days || 7) || 7;
      const nextMonth = String(month || getCurrentMonthInput()).trim();

      setTrendLoading(true);
      setTrendError("");

      const params = new URLSearchParams();
      if (nextMode === "month") {
        params.set("month", nextMonth);
      } else {
        params.set("days", String(nextDays));
      }

      const response = await authFetch(apiPath(`admin/usage-trend?${params.toString()}`));
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Could not load usage trend.");
      }

      setTrend(payload);
      setTrendMode(nextMode);
      if (nextMode === "days") {
        setTrendDays(nextDays);
      } else {
        setTrendMonth(nextMonth);
      }
    } catch (error) {
      setTrendError(error?.message || "Could not load usage trend.");
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageTrend({ days: 7, mode: "days" });
  }, [fetchUsageTrend]);

  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const workspaceLinks = useMemo(
    () =>
      buildAdminWorkspaceLinks(
        navigate,
        "display-settings",
        undefined,
        "admin",
        displayLabels
      ),
    [displayLabels, navigate]
  );

  const metrics = useMemo(
    () => [
      {
        key: "ix",
        label: "IX",
        value: formValues.ixDisplayName || "-",
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
      },
      {
        key: "orange",
        label: "Orange",
        value: formValues.orangeDisplayName || "-",
        bg: "#fff7ed",
        border: "#fed7aa",
        color: "#c2410c",
      },
      {
        key: "fce",
        label: "FCE",
        value: formValues.fceDisplayName || "-",
        bg: "#ecfeff",
        border: "#a5f3fc",
        color: "#155e75",
      },
    ],
    [formValues.fceDisplayName, formValues.ixDisplayName, formValues.orangeDisplayName]
  );

  const hasChanges = useMemo(() => {
    return (
      String(formValues.ixDisplayName || "") !== String(displayLabels?.ixDisplayName || "") ||
      String(formValues.orangeDisplayName || "") !==
        String(displayLabels?.orangeDisplayName || "") ||
      String(formValues.fceDisplayName || "") !== String(displayLabels?.fceDisplayName || "")
    );
  }, [displayLabels, formValues]);

  const usageMetrics = useMemo(() => {
    const live = usageOverview?.live || {};
    const today = usageOverview?.today || {};

    return [
      {
        key: "activeUsersNow",
        label: "Users doing tests now",
        value: Number(live.activeUsersInTests || 0),
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
      },
      {
        key: "activeSessionsNow",
        label: "Active test sessions now",
        value: Number(live.activeTestSessions || 0),
        bg: "#fff7ed",
        border: "#fed7aa",
        color: "#c2410c",
      },
      {
        key: "activeUsersToday",
        label: "Active users today",
        value: Number(today.activeUsers || 0),
        bg: "#ecfeff",
        border: "#a5f3fc",
        color: "#155e75",
      },
      {
        key: "submissionsToday",
        label: "Submissions today",
        value: Number(today.submissions || 0),
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#166534",
      },
      {
        key: "newStudentsToday",
        label: "New students today",
        value: Number(today.newStudentAccounts || 0),
        bg: "#f5f3ff",
        border: "#ddd6fe",
        color: "#6d28d9",
      },
    ];
  }, [usageOverview]);

  const usageByType = usageOverview?.today?.submissionsByType || {};
  const liveByType = usageOverview?.live?.sessionsByType || {};

  const trendDaily = Array.isArray(trend?.daily) ? trend.daily : [];
  const trendSummary = trend?.summary || {};
  const trendMaxPageViews = Math.max(
    1,
    ...trendDaily.map((entry) => Number(entry?.pageViews || 0))
  );

  const trendRangeLabel =
    trendMode === "month"
      ? `Month ${trend?.month || trendMonth}`
      : `Last ${Number(trend?.range?.days || trendDays)} days`;

  const onChangeField = (fieldKey, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const onRestoreDefaults = () => {
    setFormValues({ ...DEFAULT_DISPLAY_LABELS });
    setStatus("Defaults applied to the form. Click Save to publish.");
    setStatusTone("neutral");
  };

  const onResetFromLive = () => {
    setFormValues({
      ixDisplayName: String(displayLabels?.ixDisplayName || DEFAULT_DISPLAY_LABELS.ixDisplayName),
      orangeDisplayName: String(
        displayLabels?.orangeDisplayName || DEFAULT_DISPLAY_LABELS.orangeDisplayName
      ),
      fceDisplayName: String(displayLabels?.fceDisplayName || DEFAULT_DISPLAY_LABELS.fceDisplayName),
    });
    setStatus("Form reset to current live labels.");
    setStatusTone("neutral");
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const nextLabels = {
        ixDisplayName: formValues.ixDisplayName,
        orangeDisplayName: formValues.orangeDisplayName,
        fceDisplayName: formValues.fceDisplayName,
      };

      await saveDisplayLabels(nextLabels);
      setStatus("Display labels updated successfully.");
      setStatusTone("success");
    } catch (error) {
      setStatus(error?.message || "Could not update display labels.");
      setStatusTone("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="admin-page admin-submission-page" style={styles.page}>
        <AdminStickySidebarLayout
          eyebrow="Admin"
          title="Display Settings"
          description="Update global platform labels once and reuse them across navbars and key test pages."
          sidebarContent={(
            <>
              <AdminSidebarPanel
                eyebrow="Admin settings"
                title="Access pages"
                meta="Quick switch"
              >
                <AdminSidebarNavList
                  items={workspaceLinks}
                  ariaLabel="Admin workspace pages"
                />
              </AdminSidebarPanel>

              <AdminSidebarPanel
                eyebrow="Live preview"
                title="Current labels"
                meta={saving ? "Saving" : loading ? "Loading" : "Synced"}
              >
                <AdminSidebarMetricList items={metrics} />
                <p className="admin-side-layout__panelText">
                  Routes and internal keys remain stable; only user-facing labels are updated.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
          <section style={styles.headerCard}>
            <p style={styles.headerEyebrow}>Global UI labels</p>
            <h2 style={styles.headerTitle}>Display Name Manager</h2>
            <p style={styles.headerSubtitle}>
              Teachers can rename visible platform labels directly from admin without code edits.
            </p>
          </section>

          <section style={styles.usageCard}>
            <div style={styles.usageHeader}>
              <div>
                <p style={styles.usageEyebrow}>Traffic snapshot</p>
                <h3 style={styles.usageTitle}>Daily Usage Overview</h3>
                <p style={styles.usageSubtitle}>
                  {usageOverview
                    ? `Last updated ${new Date(usageOverview.generatedAt).toLocaleTimeString()} (${usageOverview.timezone || "Asia/Ho_Chi_Minh"}).`
                    : "Loading usage data for this admin view."}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchUsageOverview}
                disabled={usageLoading}
                style={{ ...styles.button, ...styles.ghostButton }}
              >
                {usageLoading ? "Refreshing..." : "Refresh Stats"}
              </button>
            </div>

            <div style={styles.usageGrid}>
              {usageMetrics.map((metric) => (
                <div
                  key={metric.key}
                  style={{
                    ...styles.usageMetricCard,
                    background: metric.bg,
                    borderColor: metric.border,
                  }}
                >
                  <div style={{ ...styles.usageMetricLabel, color: metric.color }}>
                    {metric.label}
                  </div>
                  <div style={{ ...styles.usageMetricValue, color: metric.color }}>
                    {metric.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {usageError ? (
              <div style={{ ...styles.status, ...styles.statusError }}>
                {usageError}
              </div>
            ) : null}

            {!usageError && usageOverview ? (
              <>
                <div style={styles.usageBreakdownWrap}>
                  <div style={styles.usageBreakdownRow}>
                    <strong>Today submissions:</strong>
                    <span style={styles.usageBreakdownChip}>Writing {Number(usageByType.writing || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Reading {Number(usageByType.reading || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Listening {Number(usageByType.listening || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Cambridge {Number(usageByType.cambridge || 0)}</span>
                  </div>
                  <div style={styles.usageBreakdownRow}>
                    <strong>Live sessions:</strong>
                    <span style={styles.usageBreakdownChip}>Writing drafts {Number(liveByType.writingDrafts || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Reading {Number(liveByType.reading || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Listening {Number(liveByType.listening || 0)}</span>
                    <span style={styles.usageBreakdownChip}>Cambridge {Number(liveByType.cambridge || 0)}</span>
                  </div>
                </div>

                <p style={styles.usageHint}>
                  Live numbers are estimated from recent test activity in the last {Number(usageOverview?.live?.activityWindowMinutes || 15)} minutes.
                </p>
              </>
            ) : null}
          </section>

          <section style={styles.trendCard}>
            <div style={styles.trendHeader}>
              <div>
                <p style={styles.usageEyebrow}>Traffic trend</p>
                <h3 style={styles.usageTitle}>Daily Trend and Monthly Total</h3>
                <p style={styles.usageSubtitle}>{trendRangeLabel}</p>
              </div>
              <div style={styles.trendActionRow}>
                <button
                  type="button"
                  onClick={() => fetchUsageTrend({ days: 7, mode: "days" })}
                  disabled={trendLoading}
                  style={{
                    ...styles.button,
                    ...(trendMode === "days" && trendDays === 7 ? styles.primaryButton : styles.ghostButton),
                  }}
                >
                  7 days
                </button>
                <button
                  type="button"
                  onClick={() => fetchUsageTrend({ days: 30, mode: "days" })}
                  disabled={trendLoading}
                  style={{
                    ...styles.button,
                    ...(trendMode === "days" && trendDays === 30 ? styles.primaryButton : styles.ghostButton),
                  }}
                >
                  30 days
                </button>
                <input
                  type="month"
                  value={trendMonth}
                  onChange={(event) => setTrendMonth(event.target.value)}
                  style={styles.monthInput}
                />
                <button
                  type="button"
                  onClick={() => fetchUsageTrend({ month: trendMonth, mode: "month" })}
                  disabled={trendLoading || !trendMonth}
                  style={{ ...styles.button, ...styles.softButton }}
                >
                  {trendLoading && trendMode === "month" ? "Loading..." : "Search month"}
                </button>
              </div>
            </div>

            <div style={styles.trendSummaryGrid}>
              <div style={styles.trendSummaryCard}>
                <div style={styles.trendSummaryLabel}>Unique users</div>
                <div style={styles.trendSummaryValue}>{Number(trendSummary.uniqueUsers || 0).toLocaleString()}</div>
              </div>
              <div style={styles.trendSummaryCard}>
                <div style={styles.trendSummaryLabel}>Unique sessions</div>
                <div style={styles.trendSummaryValue}>{Number(trendSummary.uniqueSessions || 0).toLocaleString()}</div>
              </div>
              <div style={styles.trendSummaryCard}>
                <div style={styles.trendSummaryLabel}>Page views</div>
                <div style={styles.trendSummaryValue}>{Number(trendSummary.pageViews || 0).toLocaleString()}</div>
              </div>
            </div>

            {trendError ? (
              <div style={{ ...styles.status, ...styles.statusError }}>{trendError}</div>
            ) : null}

            {!trendError && trendDaily.length > 0 ? (
              <div style={styles.trendChartWrap}>
                <div style={styles.trendChartBars}>
                  {trendDaily.map((entry) => {
                    const pageViews = Number(entry?.pageViews || 0);
                    const barHeight = Math.max(
                      8,
                      Math.round((pageViews / trendMaxPageViews) * 88)
                    );
                    return (
                      <div key={entry.date} style={styles.trendBarColumn} title={`${entry.date}: ${pageViews} page views`}>
                        <div style={{ ...styles.trendBar, height: barHeight }} />
                        <span style={styles.trendBarLabel}>{String(entry.date || "").slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <p style={styles.usageHint}>
                  {trendMode === "month"
                    ? `Monthly total users: ${Number(trendSummary.uniqueUsers || 0).toLocaleString()} (selected month).`
                    : "Trend reflects daily page views from tracked page_view events."}
                </p>
              </div>
            ) : null}
          </section>

          <section style={styles.formCard}>
            <div style={styles.formGrid}>
              {FIELD_META.map((field) => (
                <label key={field.key} style={styles.fieldLabel}>
                  <span style={styles.fieldTitle}>{field.label}</span>
                  <span style={styles.fieldDescription}>{field.description}</span>
                  <input
                    type="text"
                    maxLength={40}
                    value={formValues[field.key] || ""}
                    onChange={(event) => onChangeField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    style={styles.input}
                  />
                </label>
              ))}
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || loading || !hasChanges}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                {saving ? "Saving..." : "Save Labels"}
              </button>
              <button
                type="button"
                onClick={onResetFromLive}
                disabled={saving || loading}
                style={{ ...styles.button, ...styles.ghostButton }}
              >
                Reset Form
              </button>
              <button
                type="button"
                onClick={onRestoreDefaults}
                disabled={saving || loading}
                style={{ ...styles.button, ...styles.softButton }}
              >
                Restore Defaults
              </button>
            </div>

            {status ? (
              <div
                style={{
                  ...styles.status,
                  ...(statusTone === "success"
                    ? styles.statusSuccess
                    : statusTone === "error"
                    ? styles.statusError
                    : styles.statusNeutral),
                }}
              >
                {status}
              </div>
            ) : null}

            <div style={styles.previewWrap}>
              <div style={styles.previewLabel}>Preview chips</div>
              <div style={styles.previewRow}>
                <span style={styles.previewChip}>{formValues.ixDisplayName || "IX"}</span>
                <span style={styles.previewChip}>{formValues.orangeDisplayName || "Orange"}</span>
                <span style={styles.previewChip}>{formValues.fceDisplayName || "FCE"}</span>
              </div>
            </div>
          </section>
        </AdminStickySidebarLayout>
      </div>
    </>
  );
};

const getStyles = (isDarkMode) => ({
  page: {
    maxWidth: "100%",
    padding: "0 12px 28px",
    background: isDarkMode ? "linear-gradient(180deg, #06101d 0%, #0b1628 100%)" : "#f8fafc",
  },
  headerCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.7)" : "#dbe4f0"}`,
    background: isDarkMode
      ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.9) 100%)"
      : "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    padding: "22px 24px",
    marginBottom: 18,
  },
  headerEyebrow: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  headerTitle: {
    margin: "8px 0 0",
    fontSize: "1.9rem",
    lineHeight: 1.2,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  headerSubtitle: {
    margin: "12px 0 0",
    color: isDarkMode ? "#cbd5e1" : "#475569",
    lineHeight: 1.65,
    maxWidth: 720,
  },
  formCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: "22px 24px",
  },
  usageCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: "20px 24px",
    marginBottom: 18,
  },
  usageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  usageEyebrow: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  usageTitle: {
    margin: "6px 0 0",
    fontSize: "1.3rem",
    lineHeight: 1.25,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  usageSubtitle: {
    margin: "8px 0 0",
    fontSize: 13,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    lineHeight: 1.6,
  },
  usageGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  usageMetricCard: {
    border: "1px solid",
    borderRadius: 14,
    padding: "10px 12px",
  },
  usageMetricLabel: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  usageMetricValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  usageBreakdownWrap: {
    marginTop: 12,
    display: "grid",
    gap: 8,
  },
  usageBreakdownRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    color: isDarkMode ? "#cbd5e1" : "#334155",
    fontSize: 13,
  },
  usageBreakdownChip: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontWeight: 600,
  },
  usageHint: {
    marginTop: 10,
    marginBottom: 0,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 12.5,
    lineHeight: 1.6,
  },
  trendCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: "20px 24px",
    marginBottom: 18,
  },
  trendHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  trendActionRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  monthInput: {
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    borderRadius: 10,
    padding: "9px 10px",
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontSize: 13,
  },
  trendSummaryGrid: {
    marginTop: 12,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  },
  trendSummaryCard: {
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    borderRadius: 14,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    padding: "10px 12px",
  },
  trendSummaryLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  trendSummaryValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 800,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
    lineHeight: 1.1,
  },
  trendChartWrap: {
    marginTop: 14,
    borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e2e8f0"}`,
    paddingTop: 12,
  },
  trendChartBars: {
    minHeight: 108,
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 6,
  },
  trendBarColumn: {
    minWidth: 24,
    display: "grid",
    gap: 4,
    justifyItems: "center",
  },
  trendBar: {
    width: 18,
    borderRadius: 6,
    background: "linear-gradient(180deg, #22d3ee 0%, #2563eb 100%)",
    boxShadow: isDarkMode
      ? "0 6px 14px rgba(37, 99, 235, 0.35)"
      : "0 6px 14px rgba(37, 99, 235, 0.2)",
  },
  trendBarLabel: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    whiteSpace: "nowrap",
  },
  formGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  fieldLabel: {
    display: "grid",
    gap: 8,
  },
  fieldTitle: {
    fontWeight: 700,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  fieldDescription: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  input: {
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    outline: "none",
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  actionRow: {
    marginTop: 18,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    borderRadius: 999,
    border: "none",
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
  },
  ghostButton: {
    background: "transparent",
    border: `1px solid ${isDarkMode ? "#475569" : "#cbd5e1"}`,
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  softButton: {
    background: isDarkMode ? "rgba(30, 41, 59, 0.86)" : "#f1f5f9",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  status: {
    marginTop: 14,
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 600,
    fontSize: 14,
  },
  statusSuccess: {
    background: isDarkMode ? "rgba(22, 163, 74, 0.16)" : "#ecfdf3",
    border: `1px solid ${isDarkMode ? "rgba(22, 163, 74, 0.34)" : "#86efac"}`,
    color: isDarkMode ? "#bbf7d0" : "#166534",
  },
  statusError: {
    background: isDarkMode ? "rgba(239, 68, 68, 0.16)" : "#fef2f2",
    border: `1px solid ${isDarkMode ? "rgba(239, 68, 68, 0.36)" : "#fecaca"}`,
    color: isDarkMode ? "#fecaca" : "#991b1b",
  },
  statusNeutral: {
    background: isDarkMode ? "rgba(59, 130, 246, 0.14)" : "#eff6ff",
    border: `1px solid ${isDarkMode ? "rgba(59, 130, 246, 0.32)" : "#bfdbfe"}`,
    color: isDarkMode ? "#bfdbfe" : "#1e3a8a",
  },
  previewWrap: {
    marginTop: 16,
    borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e2e8f0"}`,
    paddingTop: 14,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
  },
  previewRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  previewChip: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    borderRadius: 999,
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontWeight: 700,
    padding: "8px 12px",
  },
});

export default AdminDisplaySettingsPage;
