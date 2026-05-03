import React, { useEffect } from "react";
import LineIcon from "../../../shared/components/LineIcon";

const tonePalette = {
  danger: {
    iconBg: "rgba(220, 38, 38, 0.12)",
    iconColor: "#dc2626",
    panelBorder: "#fecaca",
    detailBg: "#fff1f2",
    detailBorder: "#fecdd3",
    detailText: "#7f1d1d",
    confirmBg: "#dc2626",
  },
};

const AdminConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  busyLabel = "Working...",
  onConfirm,
  onCancel,
  isDarkMode = false,
  iconName = "trash",
  tone = "danger",
  children,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  const palette = tonePalette[tone] || tonePalette.danger;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: isDarkMode ? "rgba(2, 6, 23, 0.78)" : "rgba(15, 23, 42, 0.44)",
        backdropFilter: "blur(6px)",
      }}
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 18,
          background: isDarkMode ? "#0f172a" : "#ffffff",
          color: isDarkMode ? "#e5e7eb" : "#0f172a",
          border: `1px solid ${isDarkMode ? "#334155" : palette.panelBorder}`,
          boxShadow: isDarkMode
            ? "0 32px 80px rgba(2, 6, 23, 0.55)"
            : "0 28px 70px rgba(15, 23, 42, 0.24)",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 22px 12px",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: palette.iconBg,
                color: palette.iconColor,
                flex: "0 0 auto",
              }}
            >
              <LineIcon name={iconName} size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: isDarkMode ? "#fca5a5" : "#b91c1c",
                  marginBottom: 8,
                }}
              >
                Confirmation Required
              </div>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>{title}</h3>
              {description ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: isDarkMode ? "#cbd5e1" : "#475569",
                  }}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            aria-label="Close confirmation dialog"
            onClick={onCancel}
            disabled={busy}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              background: isDarkMode ? "#111827" : "#ffffff",
              color: isDarkMode ? "#e5e7eb" : "#334155",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <LineIcon name="close" size={16} />
          </button>
        </div>

        {children ? (
          <div style={{ padding: "0 22px 18px" }}>
            <div
              style={{
                borderRadius: 14,
                padding: "14px 16px",
                background: isDarkMode ? "rgba(148, 163, 184, 0.12)" : palette.detailBg,
                border: `1px solid ${isDarkMode ? "rgba(148, 163, 184, 0.2)" : palette.detailBorder}`,
                color: isDarkMode ? "#e2e8f0" : palette.detailText,
              }}
            >
              {children}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "0 22px 22px",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: isDarkMode ? "#1f2937" : "#e5e7eb",
              color: isDarkMode ? "#e5e7eb" : "#374151",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              cursor: busy ? "default" : "pointer",
              fontWeight: 700,
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              background: palette.confirmBg,
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              cursor: busy ? "default" : "pointer",
              fontWeight: 800,
              fontSize: 13,
              boxShadow: "0 12px 24px rgba(220, 38, 38, 0.22)",
              opacity: busy ? 0.88 : 1,
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmModal;