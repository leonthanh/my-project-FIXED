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

const SubmissionTypeTabs = ({ activeKey }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <div className="admin-submission-switcher-block">
      <div className="admin-submission-switcher__title">Submissions</div>
      <div className="admin-submission-switcher">
        {SUBMISSION_PAGES.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <button
              key={item.key}
              className="admin-submission-switcher__button"
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              disabled={isActive}
              onClick={() => navigate(item.path)}
              style={{
                flex: "0 1 200px",
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
              {item.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubmissionTypeTabs;