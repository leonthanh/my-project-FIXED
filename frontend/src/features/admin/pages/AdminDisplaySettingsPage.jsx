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

const KpiIcon = ({ name, color }) => {
  const iconColor = color || "#2563eb";
  const iconProps = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: iconColor,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "users") {
    return (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }

  if (name === "sessions") {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "alerts") {
    return (
      <svg {...iconProps}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <circle cx="12" cy="16.7" r=".8" fill={iconColor} stroke="none" />
      </svg>
    );
  }

  if (name === "labels") {
    return (
      <svg {...iconProps}>
        <path d="M20.6 13.4 12.7 21a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 2.3 12l1.2-6a2 2 0 0 1 1.6-1.6l6-1.2a2 2 0 0 1 2 .6l7 7a2 2 0 0 1 .5 2.6Z" />
        <circle cx="7.8" cy="7.8" r="1.2" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
};

const formatMetricValue = (value) =>
  typeof value === "number" ? value.toLocaleString() : String(value || "-");

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
  const [densityPreset, setDensityPreset] = useState("compact");

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

  const styles = useMemo(() => getStyles(isDarkMode, densityPreset), [densityPreset, isDarkMode]);

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
    const sessionsByType = live?.sessionsByType || {};
    const submissionsByType = today?.submissionsByType || {};
    const activityWindowMinutes = Number(live.activityWindowMinutes || 15);
    const activeSubmissionTypes = ["writing", "reading", "listening", "cambridge"].filter(
      (key) => Number(submissionsByType[key] || 0) > 0
    ).length;

    return [
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
      {
        key: "writingDraftsNow",
        label: "Writing drafts live",
        value: Number(sessionsByType.writingDrafts || 0),
        bg: "#fff7ed",
        border: "#fed7aa",
        color: "#9a3412",
      },
      {
        key: "activeSubmissionTypes",
        label: "Active submission types",
        value: activeSubmissionTypes,
        bg: "#eef2ff",
        border: "#c7d2fe",
        color: "#3730a3",
      },
      {
        key: "liveWindow",
        label: "Live window (min)",
        value: activityWindowMinutes,
        bg: "#fff1f2",
        border: "#fecdd3",
        color: "#be123c",
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

  const liveWindowMinutes = Number(usageOverview?.live?.activityWindowMinutes || 15);
  const labelFilledCount = [
    formValues.ixDisplayName,
    formValues.orangeDisplayName,
    formValues.fceDisplayName,
  ].filter((value) => String(value || "").trim()).length;
  const labelCoveragePercent = Math.round((labelFilledCount / FIELD_META.length) * 100);

  const alertItems = useMemo(() => {
    const nowLabel = new Date().toLocaleTimeString();
    const items = [];

    if (usageError) {
      items.push({
        id: "usage-error",
        level: "critical",
        title: "Usage snapshot failed",
        detail: usageError,
        at: nowLabel,
      });
    }

    if (trendError) {
      items.push({
        id: "trend-error",
        level: "critical",
        title: "Trend data failed",
        detail: trendError,
        at: nowLabel,
      });
    }

    if (hasChanges) {
      items.push({
        id: "pending-publish",
        level: "warn",
        title: "Label changes not published",
        detail: "Click Save Labels to push current display names to live pages.",
        at: nowLabel,
      });
    }

    if (labelCoveragePercent < 100) {
      items.push({
        id: "label-coverage",
        level: "warn",
        title: "Label coverage is incomplete",
        detail: `${labelFilledCount}/${FIELD_META.length} labels are currently filled.`,
        at: nowLabel,
      });
    }

    const liveUsersNow = Number(usageOverview?.live?.activeUsersInTests || 0);
    if (!usageError && liveUsersNow === 0) {
      items.push({
        id: "no-live-users",
        level: "info",
        title: "No users in live tests",
        detail: `No active test users in the last ${liveWindowMinutes} minutes.`,
        at: nowLabel,
      });
    }

    const submissionsToday = Number(usageOverview?.today?.submissions || 0);
    if (!usageError && submissionsToday === 0) {
      items.push({
        id: "no-submissions",
        level: "info",
        title: "No submissions today",
        detail: "Submission counters are still at zero for the current day.",
        at: nowLabel,
      });
    }

    if (!items.length) {
      items.push({
        id: "all-good",
        level: "ok",
        title: "All systems stable",
        detail: "No admin alerts detected from current telemetry checks.",
        at: nowLabel,
      });
    }

    const levelPriority = { critical: 0, warn: 1, info: 2, ok: 3 };
    return items
      .sort((a, b) => levelPriority[a.level] - levelPriority[b.level])
      .slice(0, 5);
  }, [
    hasChanges,
    labelCoveragePercent,
    labelFilledCount,
    liveWindowMinutes,
    trendError,
    usageError,
    usageOverview,
  ]);

  const openAlertCount = alertItems.filter((item) => item.level !== "ok").length;

  const rightRailKpis = [
    {
      key: "kpi-live-users",
      label: "Live users",
      value: Number(usageOverview?.live?.activeUsersInTests || 0),
      hint: `${liveWindowMinutes}m window`,
      icon: "users",
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    {
      key: "kpi-live-sessions",
      label: "Active sessions",
      value: Number(usageOverview?.live?.activeTestSessions || 0),
      hint: "Right now",
      icon: "sessions",
      bg: "#fff7ed",
      border: "#fed7aa",
      color: "#c2410c",
    },
    {
      key: "kpi-alerts",
      label: "Open alerts",
      value: openAlertCount,
      hint: "Last checks",
      icon: "alerts",
      bg: "#fff7ed",
      border: "#fdba74",
      color: openAlertCount > 0 ? "#c2410c" : "#166534",
    },
    {
      key: "kpi-label-coverage",
      label: "Label coverage",
      value: `${labelCoveragePercent}%`,
      hint: `${labelFilledCount}/${FIELD_META.length} labels`,
      icon: "labels",
      bg: "#ecfeff",
      border: "#a5f3fc",
      color: labelCoveragePercent < 100 ? "#0e7490" : "#166534",
    },
  ];

  const submissionTypeTotal =
    Number(usageByType.writing || 0) +
    Number(usageByType.reading || 0) +
    Number(usageByType.listening || 0) +
    Number(usageByType.cambridge || 0);

  const submissionTypeRows = [
    { key: "writing", label: "Writing", value: Number(usageByType.writing || 0), tone: "#a855f7" },
    { key: "reading", label: "Reading", value: Number(usageByType.reading || 0), tone: "#2563eb" },
    { key: "listening", label: "Listening", value: Number(usageByType.listening || 0), tone: "#0ea5e9" },
    { key: "cambridge", label: "Cambridge", value: Number(usageByType.cambridge || 0), tone: "#f97316" },
  ];

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

          <div style={styles.dashboardSplit}>
            <div style={styles.primaryColumn}>
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
                      style={styles.usageMetricItem}
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
                        <strong>Live sessions:</strong>
                        <span style={styles.usageBreakdownChip}>Writing drafts {Number(liveByType.writingDrafts || 0)}</span>
                        <span style={styles.usageBreakdownChip}>Reading {Number(liveByType.reading || 0)}</span>
                        <span style={styles.usageBreakdownChip}>Listening {Number(liveByType.listening || 0)}</span>
                        <span style={styles.usageBreakdownChip}>Cambridge {Number(liveByType.cambridge || 0)}</span>
                      </div>
                    </div>

                    <p style={styles.usageHint}>
                      Live numbers are estimated from recent test activity in the last {liveWindowMinutes} minutes.
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

                {trendError ? (
                  <div style={{ ...styles.status, ...styles.statusError }}>{trendError}</div>
                ) : null}

                <div style={styles.trendBody}>
                  <div style={styles.trendSummaryGrid}>
                    <div style={styles.trendSummaryItem}>
                      <div style={styles.trendSummaryLabel}>Unique users</div>
                      <div style={styles.trendSummaryValue}>{Number(trendSummary.uniqueUsers || 0).toLocaleString()}</div>
                    </div>
                    <div style={styles.trendSummaryItem}>
                      <div style={styles.trendSummaryLabel}>Unique sessions</div>
                      <div style={styles.trendSummaryValue}>{Number(trendSummary.uniqueSessions || 0).toLocaleString()}</div>
                    </div>
                    <div style={styles.trendSummaryItem}>
                      <div style={styles.trendSummaryLabel}>Page views</div>
                      <div style={styles.trendSummaryValue}>{Number(trendSummary.pageViews || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {!trendError && trendDaily.length > 0 ? (
                    <div style={styles.trendChartWrap}>
                      <div style={styles.trendChartBars}>
                        {trendDaily.map((entry) => {
                          const pageViews = Number(entry?.pageViews || 0);
                          const barHeight = Math.max(
                            12,
                            Math.round((pageViews / trendMaxPageViews) * 68)
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
                </div>
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
            </div>

            <aside style={styles.rightRail}>
              <section style={styles.rightRailCard}>
                <div style={styles.rightRailHeader}>
                  <p style={styles.usageEyebrow}>Admin control center</p>
                  <h3 style={styles.rightRailTitle}>Right-side snapshot</h3>
                  <p style={styles.rightRailSubtitle}>
                    Square KPI cards inspired by Microsoft-style at-a-glance dashboards.
                  </p>
                  <div style={styles.densityRow}>
                    <span style={styles.densityLabel}>Density</span>
                    <div style={styles.densitySwitch} role="group" aria-label="Density preset">
                      <button
                        type="button"
                        onClick={() => setDensityPreset("compact")}
                        style={{
                          ...styles.densityButton,
                          ...(densityPreset === "compact" ? styles.densityButtonActive : null),
                        }}
                      >
                        Compact
                      </button>
                      <button
                        type="button"
                        onClick={() => setDensityPreset("comfortable")}
                        style={{
                          ...styles.densityButton,
                          ...(densityPreset === "comfortable" ? styles.densityButtonActive : null),
                        }}
                      >
                        Comfortable
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.kpiSquareGrid}>
                  {rightRailKpis.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        ...styles.kpiSquareCard,
                        borderColor: isDarkMode ? "rgba(71, 85, 105, 0.82)" : item.border,
                        background: isDarkMode
                          ? "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)"
                          : item.bg,
                      }}
                    >
                      <div style={styles.kpiSquareTop}>
                        <span style={{ ...styles.kpiSquareIcon, borderColor: item.border }}>
                          <KpiIcon name={item.icon} color={item.color} />
                        </span>
                        <span style={{ ...styles.kpiSquareLabel, color: item.color }}>{item.label}</span>
                      </div>
                      <span style={{ ...styles.kpiSquareValue, color: item.color }}>{formatMetricValue(item.value)}</span>
                      <span style={styles.kpiSquareHint}>{item.hint}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.rightRailCard}>
                <div style={styles.rightRailHeader}>
                  <p style={styles.usageEyebrow}>Monitor</p>
                  <h3 style={styles.rightRailTitle}>Last 5 alerts</h3>
                  <p style={styles.rightRailSubtitle}>
                    Immediate signals for data issues and publishing actions.
                  </p>
                </div>
                <div style={styles.alertList}>
                  {alertItems.map((alertItem) => (
                    <div key={alertItem.id} style={styles.alertItem}>
                      <div style={styles.alertItemHeader}>
                        <span style={styles.alertTitle}>{alertItem.title}</span>
                        <span
                          style={{
                            ...styles.alertBadge,
                            ...(alertItem.level === "critical"
                              ? styles.alertBadgeCritical
                              : alertItem.level === "warn"
                              ? styles.alertBadgeWarn
                              : alertItem.level === "info"
                              ? styles.alertBadgeInfo
                              : styles.alertBadgeOk),
                          }}
                        >
                          {alertItem.level}
                        </span>
                      </div>
                      <p style={styles.alertDetail}>{alertItem.detail}</p>
                      <span style={styles.alertTime}>{alertItem.at}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.rightRailCard}>
                <div style={styles.rightRailHeader}>
                  <p style={styles.usageEyebrow}>Today split</p>
                  <h3 style={styles.rightRailTitle}>Submission workload</h3>
                </div>
                <div style={styles.breakdownList}>
                  {submissionTypeRows.map((row) => {
                    const percent = submissionTypeTotal > 0
                      ? Math.round((row.value / submissionTypeTotal) * 100)
                      : 0;
                    return (
                      <div key={row.key} style={styles.breakdownRow}>
                        <div style={styles.breakdownMeta}>
                          <span style={styles.breakdownLabel}>{row.label}</span>
                          <span style={styles.breakdownValue}>{row.value}</span>
                        </div>
                        <div style={styles.breakdownTrack}>
                          <div
                            style={{
                              ...styles.breakdownFill,
                              width: `${percent}%`,
                              background: row.tone,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </AdminStickySidebarLayout>
      </div>
    </>
  );
};

const getStyles = (isDarkMode, densityPreset) => ({
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
    padding: "18px 20px",
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
    fontSize: "1.55rem",
    lineHeight: 1.2,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  headerSubtitle: {
    margin: "10px 0 0",
    fontSize: 13,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    lineHeight: 1.58,
    maxWidth: 720,
  },
  dashboardSplit: {
    display: "flex",
    alignItems: "flex-start",
    gap: densityPreset === "compact" ? 14 : 18,
    flexWrap: "wrap",
  },
  primaryColumn: {
    flex: "1 1 680px",
    minWidth: 0,
    display: "grid",
    gap: 14,
  },
  rightRail: {
    flex: "0 1 320px",
    minWidth: 280,
    maxWidth: 360,
    display: "grid",
    gap: 14,
  },
  rightRailCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: densityPreset === "compact" ? "14px 14px" : "17px 17px",
    boxShadow: isDarkMode ? "0 12px 28px rgba(2, 6, 23, 0.28)" : "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  rightRailHeader: {
    marginBottom: 10,
  },
  densityRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  densityLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  densitySwitch: {
    display: "inline-flex",
    gap: 6,
    padding: 3,
    borderRadius: 999,
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  densityButton: {
    border: "none",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    background: "transparent",
    cursor: "pointer",
  },
  densityButtonActive: {
    background: isDarkMode ? "#1d4ed8" : "#2563eb",
    color: "#ffffff",
  },
  rightRailTitle: {
    margin: "5px 0 0",
    fontSize: "1rem",
    lineHeight: 1.25,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  rightRailSubtitle: {
    margin: "7px 0 0",
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 1.5,
  },
  kpiSquareGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  kpiSquareCard: {
    border: "1px solid",
    borderRadius: 14,
    padding: "10px 10px",
    aspectRatio: "1 / 1",
    minHeight: densityPreset === "compact" ? 120 : 132,
    display: "grid",
    alignContent: "space-between",
  },
  kpiSquareTop: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  kpiSquareIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    border: "1px solid",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: isDarkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.76)",
    flex: "0 0 auto",
  },
  kpiSquareLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  kpiSquareValue: {
    fontSize: "1.32rem",
    lineHeight: 1.05,
    fontWeight: 800,
  },
  kpiSquareHint: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 1.35,
  },
  healthGrid: {
    display: "grid",
    gap: 10,
  },
  healthItem: {
    border: `1px solid ${isDarkMode ? "#334155" : "#dbe4f0"}`,
    borderRadius: 12,
    padding: "10px 11px",
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  healthLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: isDarkMode ? "#dbeafe" : "#1e293b",
  },
  healthValue: {
    fontSize: 12,
    fontWeight: 800,
  },
  statusBadge: {
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 10,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 800,
    border: "1px solid",
  },
  statusBadgeSuccess: {
    color: isDarkMode ? "#86efac" : "#166534",
    borderColor: isDarkMode ? "rgba(22, 163, 74, 0.4)" : "#86efac",
    background: isDarkMode ? "rgba(22, 163, 74, 0.16)" : "#ecfdf3",
  },
  statusBadgeInfo: {
    color: isDarkMode ? "#93c5fd" : "#1d4ed8",
    borderColor: isDarkMode ? "rgba(59, 130, 246, 0.45)" : "#bfdbfe",
    background: isDarkMode ? "rgba(59, 130, 246, 0.14)" : "#eff6ff",
  },
  statusBadgeWarn: {
    color: isDarkMode ? "#fdba74" : "#9a3412",
    borderColor: isDarkMode ? "rgba(249, 115, 22, 0.44)" : "#fdba74",
    background: isDarkMode ? "rgba(249, 115, 22, 0.14)" : "#fff7ed",
  },
  breakdownList: {
    display: "grid",
    gap: 10,
  },
  breakdownRow: {
    display: "grid",
    gap: 6,
  },
  breakdownMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    color: isDarkMode ? "#cbd5e1" : "#334155",
  },
  breakdownLabel: {
    fontWeight: 700,
  },
  breakdownValue: {
    fontWeight: 800,
  },
  breakdownTrack: {
    borderRadius: 999,
    overflow: "hidden",
    height: 8,
    background: isDarkMode ? "#1f2937" : "#e2e8f0",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 999,
  },
  alertList: {
    display: "grid",
    gap: 8,
  },
  alertItem: {
    border: `1px solid ${isDarkMode ? "#334155" : "#dbe4f0"}`,
    borderRadius: 12,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    padding: "8px 10px",
    display: "grid",
    gap: 4,
  },
  alertItemHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  alertBadge: {
    borderRadius: 999,
    border: "1px solid",
    padding: "2px 7px",
    fontSize: 9,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    fontWeight: 800,
  },
  alertBadgeCritical: {
    color: isDarkMode ? "#fecaca" : "#991b1b",
    borderColor: isDarkMode ? "rgba(239, 68, 68, 0.42)" : "#fecaca",
    background: isDarkMode ? "rgba(239, 68, 68, 0.18)" : "#fef2f2",
  },
  alertBadgeWarn: {
    color: isDarkMode ? "#fdba74" : "#9a3412",
    borderColor: isDarkMode ? "rgba(249, 115, 22, 0.44)" : "#fdba74",
    background: isDarkMode ? "rgba(249, 115, 22, 0.14)" : "#fff7ed",
  },
  alertBadgeInfo: {
    color: isDarkMode ? "#93c5fd" : "#1d4ed8",
    borderColor: isDarkMode ? "rgba(59, 130, 246, 0.45)" : "#bfdbfe",
    background: isDarkMode ? "rgba(59, 130, 246, 0.14)" : "#eff6ff",
  },
  alertBadgeOk: {
    color: isDarkMode ? "#86efac" : "#166534",
    borderColor: isDarkMode ? "rgba(22, 163, 74, 0.4)" : "#86efac",
    background: isDarkMode ? "rgba(22, 163, 74, 0.16)" : "#ecfdf3",
  },
  alertDetail: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.45,
    color: isDarkMode ? "#94a3b8" : "#475569",
  },
  alertTime: {
    fontSize: 10,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  formCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: densityPreset === "compact" ? "16px 18px" : "20px 22px",
    minHeight: densityPreset === "compact" ? 300 : 340,
    display: "grid",
    alignContent: "start",
  },
  usageCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: densityPreset === "compact" ? "16px 18px" : "20px 22px",
    display: "grid",
    alignContent: "start",
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
    fontSize: "1.08rem",
    lineHeight: 1.25,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  usageSubtitle: {
    margin: "7px 0 0",
    fontSize: 12,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    lineHeight: 1.52,
  },
  usageGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  usageMetricItem: {
    padding: "4px 2px",
    display: "grid",
    gap: 2,
    alignContent: "start",
  },
  usageMetricLabel: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  usageMetricValue: {
    marginTop: 0,
    fontSize: 20,
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
    fontSize: 12,
  },
  usageBreakdownChip: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontWeight: 700,
    fontSize: 11,
  },
  usageHint: {
    marginTop: 10,
    marginBottom: 0,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 11.5,
    lineHeight: 1.6,
  },
  trendCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: densityPreset === "compact" ? "16px 18px" : "20px 22px",
    display: "grid",
    alignContent: "start",
  },
  trendBody: {
    marginTop: 10,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "start",
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
    padding: "8px 10px",
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
    fontSize: 12,
  },
  trendSummaryGrid: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  trendSummaryItem: {
    display: "grid",
    gap: 2,
    minWidth: 112,
  },
  trendSummaryLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  trendSummaryValue: {
    marginTop: 0,
    fontSize: 21,
    fontWeight: 800,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
    lineHeight: 1.1,
  },
  trendChartWrap: {
    border: "none",
    borderRadius: 0,
    padding: "2px 0 0",
    background: "transparent",
    alignSelf: "start",
  },
  trendChartBars: {
    minHeight: 72,
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    justifyContent: "flex-start",
    overflowX: "auto",
    paddingBottom: 4,
  },
  trendBarColumn: {
    minWidth: 28,
    flex: "1 1 34px",
    display: "grid",
    gap: 4,
    justifyItems: "center",
  },
  trendBar: {
    width: "64%",
    minWidth: 14,
    borderRadius: 6,
    background: "linear-gradient(180deg, #22d3ee 0%, #2563eb 100%)",
    boxShadow: isDarkMode
      ? "0 6px 14px rgba(37, 99, 235, 0.35)"
      : "0 6px 14px rgba(37, 99, 235, 0.2)",
  },
  trendBarLabel: {
    fontSize: 10,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    whiteSpace: "nowrap",
  },
  formGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  fieldLabel: {
    display: "grid",
    gap: 6,
    border: `1px solid ${isDarkMode ? "#334155" : "#dbe4f0"}`,
    borderRadius: 14,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    padding: "10px 11px",
    minHeight: densityPreset === "compact" ? 100 : 116,
  },
  fieldTitle: {
    fontWeight: 700,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  fieldDescription: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  input: {
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    borderRadius: 12,
    padding: "9px 11px",
    fontSize: 13,
    outline: "none",
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  actionRow: {
    marginTop: 12,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    borderRadius: 999,
    border: "none",
    padding: densityPreset === "compact" ? "8px 14px" : "9px 16px",
    fontSize: densityPreset === "compact" ? 12 : 13,
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
    fontSize: 12,
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
    marginTop: 12,
    borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e2e8f0"}`,
    paddingTop: 10,
  },
  previewLabel: {
    fontSize: 12,
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
    padding: "7px 11px",
    fontSize: 12,
  },
});

export default AdminDisplaySettingsPage;
