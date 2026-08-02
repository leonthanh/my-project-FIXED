import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
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

const AdminDisplaySettingsPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { displayLabels, loading, saveDisplayLabels } = useDisplaySettings();

  const [formValues, setFormValues] = useState(DEFAULT_DISPLAY_LABELS);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [saving, setSaving] = useState(false);

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
