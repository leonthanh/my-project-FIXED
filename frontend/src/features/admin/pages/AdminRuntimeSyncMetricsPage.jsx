import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from "../components/AdminStickySidebarLayout";
import { useDisplaySettings } from "../../../shared/contexts/DisplaySettingsContext";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  clearRuntimeSyncMetrics,
  getRuntimeSyncMetricsSnapshot,
} from "../../../shared/utils/runtimeSync";

const formatDateTime = (timestamp) => {
  if (!Number.isFinite(Number(timestamp)) || Number(timestamp) <= 0) return "—";
  return new Date(Number(timestamp)).toLocaleString();
};

const getRecentWindowLabel = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  }
  return `${minutes}m`;
};

const parseBucketKey = (key) => {
  const [minuteTsRaw, scope, endpoint, status] = String(key || "").split("|");
  const minuteTs = Number(minuteTsRaw);
  if (!Number.isFinite(minuteTs) || !scope || !endpoint || !status) return null;
  return { minuteTs, scope, endpoint, status };
};

const DEFAULT_RECENT_MINUTES = 30;

const AdminRuntimeSyncMetricsPage = () => {
  const navigate = useNavigate();
  const { displayLabels } = useDisplaySettings();
  const { isDarkMode } = useTheme();
  const [snapshot, setSnapshot] = useState(() => getRuntimeSyncMetricsSnapshot());
  const [recentMinutes, setRecentMinutes] = useState(DEFAULT_RECENT_MINUTES);

  const refreshMetrics = useCallback(() => {
    setSnapshot(getRuntimeSyncMetricsSnapshot());
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(refreshMetrics, 10000);
    return () => window.clearInterval(timerId);
  }, [refreshMetrics]);

  useEffect(() => {
    const onMetric = () => refreshMetrics();
    window.addEventListener("runtime-sync:metric", onMetric);
    return () => window.removeEventListener("runtime-sync:metric", onMetric);
  }, [refreshMetrics]);

  const workspaceLinks = useMemo(
    () => buildAdminWorkspaceLinks(navigate, "runtime-sync-metrics", undefined, "admin", displayLabels),
    [displayLabels, navigate]
  );

  const bucketRows = useMemo(() => {
    const rawBuckets = snapshot?.buckets || {};
    return Object.entries(rawBuckets)
      .map(([key, count]) => {
        const parsed = parseBucketKey(key);
        if (!parsed) return null;
        return {
          ...parsed,
          count: Number(count || 0),
          rowKey: key,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.minuteTs - left.minuteTs);
  }, [snapshot?.buckets]);

  const recentRows = useMemo(() => {
    const cutoff = Date.now() - recentMinutes * 60 * 1000;
    return bucketRows.filter((row) => row.minuteTs >= cutoff);
  }, [bucketRows, recentMinutes]);

  const statusTotals = useMemo(() => {
    const totals = { all: 0, ok2xx: 0, rate429: 0, networkError: 0, other: 0 };
    recentRows.forEach((row) => {
      totals.all += row.count;
      if (row.status === "network_error") {
        totals.networkError += row.count;
        return;
      }
      const code = Number(row.status);
      if (Number.isFinite(code) && code >= 200 && code < 300) {
        totals.ok2xx += row.count;
      } else if (code === 429) {
        totals.rate429 += row.count;
      } else {
        totals.other += row.count;
      }
    });
    return totals;
  }, [recentRows]);

  const groupedByScope = useMemo(() => {
    const map = new Map();
    recentRows.forEach((row) => {
      const key = `${row.scope}|${row.endpoint}`;
      const entry = map.get(key) || {
        scope: row.scope,
        endpoint: row.endpoint,
        total: 0,
        status429: 0,
        networkError: 0,
      };
      entry.total += row.count;
      if (row.status === "429") entry.status429 += row.count;
      if (row.status === "network_error") entry.networkError += row.count;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [recentRows]);

  const sidebarMetrics = [
    { key: "rows", label: "Rows (window)", value: recentRows.length, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    { key: "req", label: "Requests", value: statusTotals.all, bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    { key: "rate", label: "429 count", value: statusTotals.rate429, bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
    { key: "net", label: "Network err", value: statusTotals.networkError, bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  ];

  const surfaceStyle = {
    background: isDarkMode ? "linear-gradient(180deg, #0f172a 0%, #111827 100%)" : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: `1px solid ${isDarkMode ? "rgba(148,163,184,0.25)" : "#e2e8f0"}`,
    borderRadius: 18,
    padding: 16,
    boxShadow: isDarkMode ? "0 12px 30px rgba(2,6,23,0.35)" : "0 12px 30px rgba(15,23,42,0.08)",
  };

  return (
    <>
      <AdminNavbar />
      <div className="admin-page admin-submission-page" style={{ padding: 18 }}>
        <AdminStickySidebarLayout
          eyebrow="Admin"
          title="Runtime Sync Metrics"
          description="Live client-side telemetry for autosave/active runtime endpoints."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Admin settings" title="Access pages" meta="Quick switch">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>
              <AdminSidebarPanel eyebrow="Window" title={`Last ${getRecentWindowLabel(recentMinutes)}`} meta={formatDateTime(snapshot?.updatedAt)}>
                <AdminSidebarMetricList items={sidebarMetrics} />
                <p className="admin-side-layout__panelText">
                  Metrics are stored in browser localStorage for this admin device only.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
          <section style={surfaceStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Runtime sync request dashboard</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                  Updated: <strong>{formatDateTime(snapshot?.updatedAt)}</strong> · Buckets: <strong>{snapshot?.bucketCount || 0}</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={recentMinutes}
                  onChange={(event) => setRecentMinutes(Number(event.target.value) || DEFAULT_RECENT_MINUTES)}
                  style={{ minHeight: 36, borderRadius: 10, padding: "0 10px" }}
                >
                  <option value={10}>Last 10m</option>
                  <option value={30}>Last 30m</option>
                  <option value={60}>Last 1h</option>
                  <option value={180}>Last 3h</option>
                </select>
                <button type="button" onClick={refreshMetrics} style={{ minHeight: 36, padding: "0 12px", borderRadius: 10 }}>
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearRuntimeSyncMetrics();
                    refreshMetrics();
                  }}
                  style={{ minHeight: 36, padding: "0 12px", borderRadius: 10 }}
                >
                  Clear metrics
                </button>
              </div>
            </div>
          </section>

          <section style={{ ...surfaceStyle, marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>By scope / endpoint</h3>
            {groupedByScope.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No metrics in selected time window.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th align="left">Scope</th>
                      <th align="left">Endpoint</th>
                      <th align="right">Total</th>
                      <th align="right">429</th>
                      <th align="right">Network error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByScope.map((row) => (
                      <tr key={`${row.scope}-${row.endpoint}`}>
                        <td>{row.scope}</td>
                        <td>{row.endpoint}</td>
                        <td align="right">{row.total}</td>
                        <td align="right">{row.status429}</td>
                        <td align="right">{row.networkError}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ ...surfaceStyle, marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Raw buckets (minute-level)</h3>
            {recentRows.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No rows found.</p>
            ) : (
              <div style={{ maxHeight: 380, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th align="left">Time</th>
                      <th align="left">Scope</th>
                      <th align="left">Endpoint</th>
                      <th align="left">Status</th>
                      <th align="right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((row) => (
                      <tr key={row.rowKey}>
                        <td>{formatDateTime(row.minuteTs)}</td>
                        <td>{row.scope}</td>
                        <td>{row.endpoint}</td>
                        <td>{row.status}</td>
                        <td align="right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </AdminStickySidebarLayout>
      </div>
    </>
  );
};

export default AdminRuntimeSyncMetricsPage;
