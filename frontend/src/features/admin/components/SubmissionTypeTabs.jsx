import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../shared/contexts/ThemeContext";

const SUBMISSION_PAGES = [
  {
    key: "writing",
    shortLabel: "Writing",
    label: "Writing Submissions",
    path: "/admin/writing-submissions",
  },
  {
    key: "reading",
    shortLabel: "Reading",
    label: "Reading Submissions",
    path: "/admin/reading-submissions",
  },
  {
    key: "listening",
    shortLabel: "Listening",
    label: "Listening Submissions",
    path: "/admin/listening-submissions",
  },
];

const SubmissionTypeTabs = ({
  activeKey,
  items = SUBMISSION_PAGES,
  title = "Submissions",
  onSelect,
  allowMobileWrap = false,
  buttonFlex = "0 1 200px",
  showZeroBadge = false,
}) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <div className="admin-submission-switcher-block">
      {title ? <div className="admin-submission-switcher__title">{title}</div> : null}
      <div
        className={`admin-submission-switcher${allowMobileWrap ? " admin-submission-switcher--wrap-mobile" : ""}`}
      >
        {items.map((item) => {
          const isActive = item.key === activeKey;
          const badgeValue = Number(item.badge);
          const hasBadge = Number.isFinite(badgeValue) && (showZeroBadge ? badgeValue >= 0 : badgeValue > 0);

          return (
            <button
              key={item.key}
              className="admin-submission-switcher__button"
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              disabled={isActive}
              onClick={() => {
                if (typeof onSelect === "function") {
                  onSelect(item.key);
                  return;
                }

                if (item.path) {
                  navigate(item.path);
                }
              }}
              style={{
                flex: buttonFlex,
                minWidth: 0,
                padding: "11px 14px",
                borderRadius: 12,
                border: isActive
                  ? "1px solid #1d4ed8"
                  : `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
                background: isActive
                  ? "linear-gradient(135deg, #1d4ed8 0%, #0e276f 100%)"
                  : isDarkMode
                    ? "#111827"
                    : "#ffffff",
                color: isActive ? "#ffffff" : isDarkMode ? "#e5e7eb" : "#0f172a",
                boxShadow: isActive
                  ? "0 10px 24px rgba(14, 39, 111, 0.22)"
                  : "0 4px 14px rgba(15, 23, 42, 0.08)",
                cursor: isActive ? "default" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.15,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  maxWidth: "100%",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.shortLabel || item.label}
                </span>
                {hasBadge ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      height: 22,
                      padding: "0 7px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: isActive
                        ? "rgba(255,255,255,0.18)"
                        : isDarkMode
                          ? "#1e293b"
                          : "#eff6ff",
                      color: isActive ? "#ffffff" : "#1d4ed8",
                      boxSizing: "border-box",
                    }}
                  >
                    {badgeValue}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubmissionTypeTabs;