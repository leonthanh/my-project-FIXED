import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRelativeDateInput = (offsetDays = 0) =>
  toDateInputValue(new Date(Date.now() + offsetDays * DAY_MS));

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

const getNiceTickStep = (maxValue, targetTickCount = 4) => {
  const safeMax = Math.max(1, Number(maxValue || 0));
  const roughStep = safeMax / Math.max(1, targetTickCount);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceMultiplier = 1;
  if (normalized <= 1) {
    niceMultiplier = 1;
  } else if (normalized <= 2) {
    niceMultiplier = 2;
  } else if (normalized <= 5) {
    niceMultiplier = 5;
  } else {
    niceMultiplier = 10;
  }

  return niceMultiplier * magnitude;
};

const toMonthLabel = (dateKey) => {
  if (!dateKey) return "";
  const parsedDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toLocaleString("en-US", { month: "short" });
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
  const [trendStartDate, setTrendStartDate] = useState(() => getRelativeDateInput(-6));
  const [trendEndDate, setTrendEndDate] = useState(() => getRelativeDateInput(0));
  const [densityPreset, setDensityPreset] = useState("compact");
  const [alertFilter, setAlertFilter] = useState("all");
  const [activeDrilldownKey, setActiveDrilldownKey] = useState("submissionsToday");
  const alertsSectionRef = useRef(null);
  const drilldownSectionRef = useRef(null);

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

  const fetchUsageTrend = useCallback(async ({ days, month, mode, startDate, endDate } = {}) => {
    try {
      const nextMode = mode === "month" ? "month" : mode === "custom" ? "custom" : "days";
      const nextDays = Number(days || 7) || 7;
      const nextMonth = String(month || getCurrentMonthInput()).trim();
      const nextStartDate = String(startDate || "").trim();
      const nextEndDate = String(endDate || "").trim();

      setTrendLoading(true);
      setTrendError("");

      const params = new URLSearchParams();
      if (nextMode === "month") {
        params.set("month", nextMonth);
      } else if (nextMode === "custom") {
        if (!nextStartDate || !nextEndDate) {
          throw new Error("Please choose both start and end date.");
        }
        params.set("startDate", nextStartDate);
        params.set("endDate", nextEndDate);
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
      } else if (nextMode === "month") {
        setTrendMonth(nextMonth);
      } else {
        setTrendStartDate(nextStartDate);
        setTrendEndDate(nextEndDate);
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

  const trendDaily = useMemo(() => (Array.isArray(trend?.daily) ? trend.daily : []), [trend?.daily]);
  const trendSummary = trend?.summary || {};
  const trendSeries = useMemo(
    () => [
      {
        key: "pageViews",
        label: "Page views",
        stroke: isDarkMode ? "#22c55e" : "#16a34a",
      },
      {
        key: "uniqueUsers",
        label: "Unique users",
        stroke: isDarkMode ? "#67e8f9" : "#0891b2",
      },
      {
        key: "uniqueSessions",
        label: "Unique sessions",
        stroke: isDarkMode ? "#a78bfa" : "#7c3aed",
      },
    ],
    [isDarkMode]
  );

  const trendYAxisStep = useMemo(() => {
    const maxValue = Math.max(
      1,
      ...trendDaily.flatMap((entry) => [
        Number(entry?.pageViews || 0),
        Number(entry?.uniqueUsers || 0),
        Number(entry?.uniqueSessions || 0),
      ])
    );

    return getNiceTickStep(maxValue, 4);
  }, [trendDaily]);

  const trendYAxisMax = trendYAxisStep * 4;
  const trendYAxisTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => trendYAxisMax - index * trendYAxisStep),
    [trendYAxisMax, trendYAxisStep]
  );

  const trendChart = useMemo(() => {
    const width = 560;
    const height = 250;
    const paddingTop = 12;
    const paddingRight = 14;
    const paddingBottom = 32;
    const paddingLeft = 38;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const pointCount = trendDaily.length;

    const getX = (index) =>
      pointCount <= 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (index / (pointCount - 1)) * plotWidth;

    const getY = (value) => {
      const safeValue = Math.max(0, Number(value || 0));
      return paddingTop + plotHeight - (safeValue / Math.max(1, trendYAxisMax)) * plotHeight;
    };

    const chartSeries = trendSeries.map((series) => {
      const points = trendDaily.map((entry, index) => {
        const value = Number(entry?.[series.key] || 0);
        return {
          date: String(entry?.date || ""),
          value,
          x: getX(index),
          y: getY(value),
        };
      });

      return {
        ...series,
        total: points.reduce((sum, point) => sum + point.value, 0),
        points,
        polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
      };
    });

    const monthMarkers = [];
    let previousMonthToken = "";
    trendDaily.forEach((entry, index) => {
      const dateKey = String(entry?.date || "");
      const monthToken = dateKey.slice(0, 7);
      if (!monthToken) return;
      if (index === 0 || monthToken !== previousMonthToken) {
        monthMarkers.push({
          key: `${monthToken}-${index}`,
          index,
          label: toMonthLabel(dateKey),
        });
      }
      previousMonthToken = monthToken;
    });

    const lastIndex = trendDaily.length - 1;
    if (
      lastIndex >= 0 &&
      !monthMarkers.some((marker) => marker.index === lastIndex)
    ) {
      monthMarkers.push({
        key: `last-${lastIndex}`,
        index: lastIndex,
        label: toMonthLabel(String(trendDaily[lastIndex]?.date || "")),
      });
    }

    return {
      width,
      height,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      plotHeight,
      getY,
      getX,
      monthMarkers,
      series: chartSeries,
    };
  }, [trendDaily, trendSeries, trendYAxisMax]);

  const trendRangeLabel =
    trendMode === "month"
      ? `Month ${trend?.month || trendMonth}`
      : trendMode === "custom"
      ? `${trend?.range?.startDate || trendStartDate} to ${trend?.range?.endDate || trendEndDate}`
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
      drilldownKey: "live-users",
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
      drilldownKey: "live-sessions",
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
      drilldownKey: "open-alerts",
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
      drilldownKey: "label-coverage",
    },
  ];

  const submissionTypeTotal =
    Number(usageByType.writing || 0) +
    Number(usageByType.reading || 0) +
    Number(usageByType.listening || 0) +
    Number(usageByType.cambridge || 0);

  const submissionTypeRows = useMemo(
    () => [
      { key: "writing", label: "Writing", value: Number(usageByType.writing || 0), tone: "#a855f7" },
      { key: "reading", label: "Reading", value: Number(usageByType.reading || 0), tone: "#2563eb" },
      { key: "listening", label: "Listening", value: Number(usageByType.listening || 0), tone: "#0ea5e9" },
      { key: "cambridge", label: "Cambridge", value: Number(usageByType.cambridge || 0), tone: "#f97316" },
    ],
    [usageByType.cambridge, usageByType.listening, usageByType.reading, usageByType.writing]
  );

  const openAlertItems = useMemo(
    () => alertItems.filter((item) => item.level !== "ok"),
    [alertItems]
  );

  const filteredAlertItems = useMemo(() => {
    if (alertFilter === "open") {
      if (openAlertItems.length > 0) return openAlertItems;
      return [{
        id: "no-open-alerts",
        level: "ok",
        title: "No open alerts",
        detail: "All current checks are healthy.",
        at: new Date().toLocaleTimeString(),
      }];
    }
    return alertItems;
  }, [alertFilter, alertItems, openAlertItems]);

  const scrollToPanel = useCallback((panelRef) => {
    if (!panelRef?.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleDrilldownSelect = useCallback((nextKey) => {
    setActiveDrilldownKey(String(nextKey || "submissionsToday"));
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => scrollToPanel(drilldownSectionRef));
    }
  }, [scrollToPanel]);

  const handleKpiClick = useCallback((item) => {
    const drilldownKey = item?.drilldownKey || "submissionsToday";
    setActiveDrilldownKey(drilldownKey);

    if (drilldownKey === "open-alerts") {
      setAlertFilter("open");
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => scrollToPanel(alertsSectionRef));
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => scrollToPanel(drilldownSectionRef));
    }
  }, [scrollToPanel]);

  const drilldownRows = useMemo(() => {
    const today = usageOverview?.today || {};
    const live = usageOverview?.live || {};

    const submissionRows = submissionTypeRows.map((row) => ({
      label: row.label,
      value: row.value,
      note:
        submissionTypeTotal > 0
          ? `${Math.round((row.value / submissionTypeTotal) * 100)}% of today's submissions`
          : "No submissions yet",
    }));

    if (activeDrilldownKey === "open-alerts") {
      return {
        title: "Open Alerts Details",
        description: "Actionable items from the latest telemetry checks.",
        kind: "alerts",
        rows: openAlertItems.length ? openAlertItems : filteredAlertItems,
      };
    }

    if (activeDrilldownKey === "live-users" || activeDrilldownKey === "activeUsersToday") {
      return {
        title: "Users Activity Details",
        description: "Current live users and today's visitor footprint.",
        kind: "kv",
        rows: [
          { label: "Active users in tests", value: Number(live.activeUsersInTests || 0), note: `${liveWindowMinutes} minute window` },
          { label: "Today's active users", value: Number(today.activeUsers || 0), note: "Unique visitors today" },
          { label: "Users in tests today", value: Number(today.usersInTests || 0), note: "Learners with test activity" },
        ],
      };
    }

    if (activeDrilldownKey === "live-sessions" || activeDrilldownKey === "writingDraftsNow") {
      return {
        title: "Live Sessions By Skill",
        description: "Unfinished runtime sessions seen in the live activity window.",
        kind: "kv",
        rows: [
          { label: "Writing drafts", value: Number(liveByType.writingDrafts || 0), note: "Active drafts" },
          { label: "Reading sessions", value: Number(liveByType.reading || 0), note: "In-progress attempts" },
          { label: "Listening sessions", value: Number(liveByType.listening || 0), note: "In-progress attempts" },
          { label: "Cambridge sessions", value: Number(liveByType.cambridge || 0), note: "In-progress attempts" },
        ],
      };
    }

    if (
      activeDrilldownKey === "submissionsToday" ||
      activeDrilldownKey === "activeSubmissionTypes"
    ) {
      return {
        title: "Submission Workload Details",
        description: "Distribution of submissions by skill for today.",
        kind: "kv",
        rows: submissionRows,
      };
    }

    if (activeDrilldownKey === "newStudentsToday") {
      return {
        title: "New Student Accounts",
        description: "New student registration volume today.",
        kind: "kv",
        rows: [
          { label: "New students", value: Number(today.newStudentAccounts || 0), note: "Accounts created today" },
        ],
      };
    }

    if (activeDrilldownKey === "label-coverage") {
      return {
        title: "Label Coverage Details",
        description: "Visibility and completeness of platform display labels.",
        kind: "kv",
        rows: [
          { label: "Coverage", value: `${labelCoveragePercent}%`, note: `${labelFilledCount}/${FIELD_META.length} labels set` },
          { label: "IX label", value: formValues.ixDisplayName || "-", note: "Navbar + test library" },
          { label: "Orange label", value: formValues.orangeDisplayName || "-", note: "Orange library" },
          { label: "FCE label", value: formValues.fceDisplayName || "-", note: "FCE surfaces" },
        ],
      };
    }

    if (activeDrilldownKey === "liveWindow") {
      return {
        title: "Live Window Details",
        description: "Current aggregation window used for live counters.",
        kind: "kv",
        rows: [
          { label: "Live window", value: `${liveWindowMinutes} min`, note: "Used for live users and session cards" },
          { label: "Heartbeat events", value: Number(today.heartbeats || 0), note: "Heartbeat count today" },
          { label: "Page views", value: Number(today.pageViews || 0), note: "Page views tracked today" },
        ],
      };
    }

    return {
      title: "Submission Workload Details",
      description: "Distribution of submissions by skill for today.",
      kind: "kv",
      rows: submissionRows,
    };
  }, [
    activeDrilldownKey,
    filteredAlertItems,
    formValues.fceDisplayName,
    formValues.ixDisplayName,
    formValues.orangeDisplayName,
    labelCoveragePercent,
    labelFilledCount,
    liveByType.cambridge,
    liveByType.listening,
    liveByType.reading,
    liveByType.writingDrafts,
    liveWindowMinutes,
    openAlertItems,
    submissionTypeRows,
    submissionTypeTotal,
    usageOverview,
  ]);

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
              <section style={styles.trafficFrame}>
                <div style={styles.trafficRow}>
                  <section style={styles.usageCard}>
                    <div style={styles.trafficPanelHeader}>
                      <div style={styles.trafficPanelHeading}>
                        <p style={styles.usageEyebrow}>Traffic snapshot</p>
                        <h3 style={styles.usageTitle}>Daily Usage Overview</h3>
                        <p style={styles.usageSubtitle}>
                          {usageOverview
                            ? `Last updated ${new Date(usageOverview.generatedAt).toLocaleTimeString()} (${usageOverview.timezone || "Asia/Ho_Chi_Minh"}).`
                            : "Loading usage data for this admin view."}
                        </p>
                      </div>
                    </div>

                    <div style={styles.usageGrid}>
                      {usageMetrics.map((metric) => (
                        <button
                          type="button"
                          key={metric.key}
                          onClick={() => handleDrilldownSelect(metric.key)}
                          style={{
                            ...styles.usageMetricItem,
                            ...styles.metricActionButton,
                            ...(activeDrilldownKey === metric.key ? styles.metricActionButtonActive : null),
                          }}
                        >
                          <div style={{ ...styles.usageMetricLabel, color: metric.color }}>
                            {metric.label}
                          </div>
                          <div style={{ ...styles.usageMetricValue, color: metric.color }}>
                            {metric.value.toLocaleString()}
                          </div>
                        </button>
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

                    <div style={styles.usageFooterControls}>
                      <div style={styles.usageFooterControlRow}>
                        <button
                          type="button"
                          onClick={fetchUsageOverview}
                          disabled={usageLoading}
                          style={{ ...styles.button, ...styles.ghostButton }}
                        >
                          {usageLoading ? "Refreshing..." : "Refresh Stats"}
                        </button>
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

                      <div style={styles.usageFooterControlRow}>
                        <input
                          type="date"
                          value={trendStartDate}
                          onChange={(event) => setTrendStartDate(event.target.value)}
                          style={styles.monthInput}
                        />
                        <input
                          type="date"
                          value={trendEndDate}
                          onChange={(event) => setTrendEndDate(event.target.value)}
                          style={styles.monthInput}
                        />
                        <button
                          type="button"
                          onClick={() => fetchUsageTrend({
                            mode: "custom",
                            startDate: trendStartDate,
                            endDate: trendEndDate,
                          })}
                          disabled={trendLoading || !trendStartDate || !trendEndDate}
                          style={{
                            ...styles.button,
                            ...(trendMode === "custom" ? styles.primaryButton : styles.ghostButton),
                          }}
                        >
                          {trendLoading && trendMode === "custom" ? "Loading..." : "Apply range"}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section style={styles.trendCard}>
                    <div style={styles.trafficPanelHeader}>
                      <div style={styles.trafficPanelHeading}>
                        <p style={styles.usageEyebrow}>Traffic trend</p>
                        <h3 style={styles.usageTitle}>Daily Trend and Monthly Total</h3>
                        <p style={styles.usageSubtitle}>{trendRangeLabel}</p>
                      </div>
                    </div>

                    {trendError ? (
                      <div style={{ ...styles.status, ...styles.statusError }}>{trendError}</div>
                    ) : null}

                    <div style={styles.trendBody}>
                      <div style={styles.trendSummaryColumn}>
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

                        <div style={styles.trendLegendGrid}>
                          {trendChart.series.map((series) => (
                            <div key={series.key} style={styles.trendLegendItem}>
                              <span style={{ ...styles.trendLegendSwatch, background: series.stroke }} />
                              <span style={styles.trendLegendLabel}>{series.label}</span>
                              <span style={styles.trendLegendValue}>{series.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <p style={styles.usageHint}>
                          {trendMode === "month"
                            ? `Monthly total users: ${Number(trendSummary.uniqueUsers || 0).toLocaleString()} (selected month).`
                            : "Three-line trend helps compare users, sessions, and page views in one chart."}
                        </p>
                      </div>

                      {!trendError && trendDaily.length > 0 ? (
                        <div style={styles.trendChartPanel}>
                          <svg
                            role="img"
                            aria-label="Users, sessions, and page views line chart"
                            viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
                            style={styles.trendChartSvg}
                          >
                            {trendYAxisTicks.map((tick) => {
                              const y = trendChart.getY(tick);
                              return (
                                <g key={`tick-${tick}`}>
                                  <line
                                    x1={trendChart.paddingLeft}
                                    y1={y}
                                    x2={trendChart.width - trendChart.paddingRight}
                                    y2={y}
                                    stroke={isDarkMode ? "rgba(148, 163, 184, 0.35)" : "#e2e8f0"}
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={trendChart.paddingLeft - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    style={{
                                      fontSize: 11,
                                      fill: isDarkMode ? "#e2e8f0" : "#0f172a",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {tick}
                                  </text>
                                </g>
                              );
                            })}

                          <line
                            x1={trendChart.paddingLeft}
                            y1={trendChart.paddingTop + trendChart.plotHeight}
                            x2={trendChart.width - trendChart.paddingRight}
                            y2={trendChart.paddingTop + trendChart.plotHeight}
                            stroke={isDarkMode ? "rgba(148, 163, 184, 0.5)" : "#cbd5e1"}
                            strokeWidth="1"
                          />

                          {trendChart.monthMarkers.map((marker) => (
                            <text
                              key={marker.key}
                              x={trendChart.getX(marker.index)}
                              y={trendChart.height - 10}
                              textAnchor="middle"
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                fill: isDarkMode ? "#e2e8f0" : "#0f172a",
                              }}
                            >
                              {marker.label}
                            </text>
                          ))}

                            {trendChart.series.map((series) => (
                              <g key={series.key}>
                                <polyline
                                  fill="none"
                                  stroke={series.stroke}
                                  strokeWidth="3"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  points={series.polyline}
                                />
                                {series.points.map((point) => (
                                  <circle
                                    key={`${series.key}-${point.date}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r="2.4"
                                    fill={series.stroke}
                                  >
                                    <title>{`${series.label} | ${point.date}: ${point.value}`}</title>
                                  </circle>
                                ))}
                              </g>
                            ))}
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              </section>

              <div style={styles.inlineRailRow}>
                <section style={{ ...styles.rightRailCard, ...styles.inlineRailCard }}>
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
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => handleKpiClick(item)}
                        style={{
                          ...styles.kpiSquareAction,
                          ...(activeDrilldownKey === item.drilldownKey ? styles.kpiSquareActionActive : null),
                        }}
                      >
                        <div
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
                      </button>
                    ))}
                  </div>
                </section>

                <section ref={alertsSectionRef} style={{ ...styles.rightRailCard, ...styles.inlineRailCard }}>
                  <div style={styles.rightRailHeader}>
                    <p style={styles.usageEyebrow}>Monitor</p>
                    <h3 style={styles.rightRailTitle}>Last 5 alerts</h3>
                    <p style={styles.rightRailSubtitle}>
                      Immediate signals for data issues and publishing actions.
                    </p>
                    <div style={styles.alertFilterRow}>
                      <button
                        type="button"
                        onClick={() => setAlertFilter("all")}
                        style={{
                          ...styles.alertFilterButton,
                          ...(alertFilter === "all" ? styles.alertFilterButtonActive : null),
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlertFilter("open")}
                        style={{
                          ...styles.alertFilterButton,
                          ...(alertFilter === "open" ? styles.alertFilterButtonActive : null),
                        }}
                      >
                        Open ({openAlertCount})
                      </button>
                    </div>
                  </div>
                  <div style={styles.alertList}>
                    {filteredAlertItems.map((alertItem) => (
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

                <section style={{ ...styles.rightRailCard, ...styles.inlineRailCard }}>
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
              </div>

              <section ref={drilldownSectionRef} style={styles.drilldownCard}>
                <div style={styles.rightRailHeader}>
                  <p style={styles.usageEyebrow}>KPI drill-down</p>
                  <h3 style={styles.rightRailTitle}>{drilldownRows.title}</h3>
                  <p style={styles.rightRailSubtitle}>{drilldownRows.description}</p>
                </div>

                {drilldownRows.kind === "alerts" ? (
                  <div style={styles.alertList}>
                    {drilldownRows.rows.map((alertItem) => (
                      <div key={`drill-${alertItem.id}`} style={styles.alertItem}>
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
                ) : (
                  <div style={styles.drilldownList}>
                    {drilldownRows.rows.map((row) => (
                      <div key={`${drilldownRows.title}-${row.label}`} style={styles.drilldownRow}>
                        <div style={styles.drilldownMain}>
                          <span style={styles.drilldownLabel}>{row.label}</span>
                          <span style={styles.drilldownValue}>{formatMetricValue(row.value)}</span>
                        </div>
                        <span style={styles.drilldownNote}>{row.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={styles.formCard}>
                <div style={styles.formCompactLayout}>
                  <div style={styles.formGrid}>
                    {FIELD_META.map((field) => (
                      <label key={field.key} style={styles.fieldLabel}>
                        <div style={styles.fieldRow}>
                          <span style={styles.fieldTitle}>{field.label}</span>
                          <input
                            type="text"
                            maxLength={40}
                            value={formValues[field.key] || ""}
                            onChange={(event) => onChangeField(field.key, event.target.value)}
                            placeholder={field.placeholder}
                            style={styles.input}
                          />
                        </div>
                        <span style={styles.fieldDescription}>{field.description}</span>
                      </label>
                    ))}
                  </div>

                  <div style={styles.formControlColumn}>
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
                  </div>
                </div>
              </section>
            </div>
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
    flex: "1 1 100%",
    minWidth: 0,
    display: "grid",
    gap: 14,
  },
  trafficRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
    gap: 0,
    alignItems: "stretch",
    gridAutoRows: "1fr",
  },
  trafficFrame: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    overflow: "hidden",
    boxShadow: isDarkMode ? "0 12px 28px rgba(2, 6, 23, 0.28)" : "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  inlineRailRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    alignItems: "start",
  },
  inlineRailCard: {
    height: "100%",
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
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  kpiSquareAction: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    textAlign: "left",
    borderRadius: 12,
    cursor: "pointer",
  },
  kpiSquareActionActive: {
    boxShadow: isDarkMode
      ? "0 0 0 2px rgba(59, 130, 246, 0.42)"
      : "0 0 0 2px rgba(37, 99, 235, 0.26)",
  },
  kpiSquareCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: 12,
    padding: densityPreset === "compact" ? "8px 9px" : "10px 11px",
    minHeight: densityPreset === "compact" ? 84 : 96,
    display: "grid",
    alignContent: "start",
    gap: 4,
  },
  kpiSquareTop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  kpiSquareIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: isDarkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.76)",
    flex: "0 0 auto",
  },
  kpiSquareLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  kpiSquareValue: {
    fontSize: "1.05rem",
    lineHeight: 1.15,
    fontWeight: 800,
  },
  kpiSquareHint: {
    fontSize: 10,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 1.25,
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
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
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
  alertFilterRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  alertFilterButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    background: "transparent",
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 9px",
    cursor: "pointer",
  },
  alertFilterButtonActive: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: isDarkMode ? "#1d4ed8" : "#2563eb",
    background: isDarkMode ? "rgba(37, 99, 235, 0.24)" : "#eff6ff",
    color: isDarkMode ? "#dbeafe" : "#1d4ed8",
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
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
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
    padding: densityPreset === "compact" ? "12px 14px" : "16px 18px",
    display: "grid",
    alignContent: "start",
  },
  formCompactLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    alignItems: "start",
  },
  formControlColumn: {
    display: "grid",
    gap: 8,
    alignContent: "start",
  },
  usageCard: {
    borderRadius: 0,
    border: "none",
    background: "transparent",
    padding: densityPreset === "compact" ? "16px 18px" : "20px 22px",
    display: "flex",
    flexDirection: "column",
    alignContent: "stretch",
    height: "100%",
  },
  trafficPanelHeader: {
    display: "grid",
    gap: 6,
    marginBottom: 8,
  },
  trafficPanelHeading: {
    display: "grid",
    alignContent: "start",
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
  metricActionButton: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: 10,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
  },
  metricActionButtonActive: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: isDarkMode ? "rgba(59, 130, 246, 0.46)" : "#bfdbfe",
    background: isDarkMode ? "rgba(30, 41, 59, 0.55)" : "#f8fbff",
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
  usageFooterControls: {
    marginTop: 0,
    paddingTop: 12,
    borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e2e8f0"}`,
    display: "grid",
    gap: 8,
  },
  usageFooterControlRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  trendCard: {
    borderRadius: 0,
    border: "none",
    borderLeft: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.5)" : "#e2e8f0"}`,
    background: "transparent",
    padding: densityPreset === "compact" ? "16px 18px" : "20px 22px",
    display: "flex",
    flexDirection: "column",
    alignContent: "stretch",
    height: "100%",
  },
  drilldownCard: {
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
    padding: densityPreset === "compact" ? "14px 16px" : "18px 20px",
    display: "grid",
    alignContent: "start",
    gap: 10,
  },
  drilldownList: {
    display: "grid",
    gap: 8,
  },
  drilldownRow: {
    border: `1px solid ${isDarkMode ? "#334155" : "#dbe4f0"}`,
    borderRadius: 12,
    padding: "8px 10px",
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    display: "grid",
    gap: 4,
  },
  drilldownMain: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  drilldownLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  drilldownValue: {
    fontSize: 12,
    fontWeight: 800,
    color: isDarkMode ? "#dbeafe" : "#1e3a8a",
  },
  drilldownNote: {
    fontSize: 10.5,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  trendBody: {
    marginTop: 4,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    alignItems: "start",
    flex: "1 1 auto",
  },
  trendSummaryColumn: {
    display: "grid",
    gap: 10,
    alignContent: "start",
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
  trendLegendGrid: {
    display: "grid",
    gap: 7,
  },
  trendLegendItem: {
    display: "grid",
    gridTemplateColumns: "12px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: "6px 8px",
    background: isDarkMode ? "rgba(15, 23, 42, 0.72)" : "#f8fafc",
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.45)" : "#e2e8f0"}`,
  },
  trendLegendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
  },
  trendLegendLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: isDarkMode ? "#e2e8f0" : "#1e293b",
  },
  trendLegendValue: {
    fontSize: 11,
    fontWeight: 800,
    color: isDarkMode ? "#cbd5e1" : "#334155",
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
  trendChartPanel: {
    borderRadius: 14,
    border: `1px solid ${isDarkMode ? "rgba(71, 85, 105, 0.66)" : "#dbe4f0"}`,
    background: isDarkMode ? "#0f172a" : "#ffffff",
    padding: "8px 10px 6px",
    minHeight: 220,
  },
  trendChartSvg: {
    width: "100%",
    height: 220,
    display: "block",
  },
  formGrid: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  fieldLabel: {
    display: "grid",
    gap: 4,
    border: `1px solid ${isDarkMode ? "#334155" : "#dbe4f0"}`,
    borderRadius: 12,
    background: isDarkMode ? "#0f172a" : "#f8fafc",
    padding: densityPreset === "compact" ? "8px 10px" : "10px 12px",
    minHeight: 0,
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "88px minmax(0, 1fr)",
    alignItems: "center",
    gap: 8,
  },
  fieldTitle: {
    fontWeight: 700,
    fontSize: 11.5,
    color: isDarkMode ? "#f8fafc" : "#0f172a",
  },
  fieldDescription: {
    fontSize: 10,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  input: {
    border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
    borderRadius: 10,
    padding: "6px 9px",
    width: "100%",
    maxWidth: 260,
    justifySelf: "start",
    fontSize: 12,
    outline: "none",
    background: isDarkMode ? "#0f172a" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  },
  actionRow: {
    marginTop: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
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
    marginTop: 0,
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 600,
    fontSize: 11.5,
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
    marginTop: 0,
    borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e2e8f0"}`,
    paddingTop: 6,
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
