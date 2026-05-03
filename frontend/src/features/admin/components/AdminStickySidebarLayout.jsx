import React from "react";

import { getCurrentUser, isAdmin } from "../../../shared/utils/permissions";

import "./AdminStickySidebarLayout.css";

const buildBaseWorkspaceLinks = (navigate, currentKey) => [
  {
    key: "review",
    label: "Review",
    hint: "Teacher queue",
    tone: "blue",
    active: currentKey === "review",
    onClick: () => navigate("/review"),
  },
  {
    key: "writing",
    label: "Writing",
    hint: "Essay queue",
    tone: "violet",
    active: currentKey === "writing",
    onClick: () => navigate("/admin/writing-submissions"),
  },
  {
    key: "reading",
    label: "Reading",
    hint: "IX submissions",
    tone: "blue",
    active: currentKey === "reading",
    onClick: () => navigate("/admin/reading-submissions"),
  },
  {
    key: "listening",
    label: "Listening",
    hint: "Audio submissions",
    tone: "green",
    active: currentKey === "listening",
    onClick: () => navigate("/admin/listening-submissions"),
  },
  {
    key: "cambridge",
    label: "Orange",
    hint: "Cambridge submissions",
    tone: "orange",
    active: currentKey === "cambridge",
    onClick: () => navigate("/admin/cambridge-submissions"),
  },
];

const buildAdminOnlyWorkspaceLinks = (navigate, currentKey) => [
  {
    key: "permissions",
    label: "Permissions",
    hint: "Teacher access",
    tone: "green",
    active: currentKey === "permissions",
    onClick: () => navigate("/admin/teacher-permissions"),
  },
  {
    key: "users",
    label: "Users",
    hint: "Accounts and tests",
    tone: "violet",
    active: currentKey === "users",
    onClick: () => navigate("/admin/users"),
  },
];

export const buildAdminWorkspaceLinks = (
  navigate,
  currentKey,
  currentUser = getCurrentUser()
) => [
  ...buildBaseWorkspaceLinks(navigate, currentKey),
  ...(isAdmin(currentUser)
    ? buildAdminOnlyWorkspaceLinks(navigate, currentKey)
    : []),
];

export const AdminSidebarNavList = ({ items = [], ariaLabel = "Admin navigation" }) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return null;

  return (
    <div className="admin-side-layout__nav" role="navigation" aria-label={ariaLabel}>
      {safeItems.map((item) => {
        const buttonClassName = [
          "admin-side-layout__navButton",
          `admin-side-layout__navButton--${item.tone || "blue"}`,
          item.active ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const showBadge = Number.isFinite(Number(item.badge));

        return (
          <button
            key={item.key || item.label}
            type="button"
            onClick={item.onClick}
            className={buttonClassName}
            aria-current={item.active ? "page" : undefined}
          >
            <span className="admin-side-layout__navButtonCopy">
              <span className="admin-side-layout__navButtonLabel">{item.label}</span>
              {item.hint ? (
                <span className="admin-side-layout__navButtonHint">{item.hint}</span>
              ) : null}
            </span>
            {showBadge ? (
              <span className="admin-side-layout__navButtonCount">{item.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export const AdminSidebarPanel = ({ eyebrow, title, meta, children }) => (
  <section className="admin-side-layout__panel">
    {eyebrow || title || meta ? (
      <div className="admin-side-layout__panelHeader">
        <div style={{ display: "grid", gap: 4 }}>
          {eyebrow ? <span className="admin-side-layout__panelEyebrow">{eyebrow}</span> : null}
          {title ? <span className="admin-side-layout__panelTitle">{title}</span> : null}
        </div>
        {meta ? <span className="admin-side-layout__panelMeta">{meta}</span> : null}
      </div>
    ) : null}
    {children}
  </section>
);

export const AdminSidebarMetricList = ({ items = [] }) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return null;

  return (
    <div className="admin-side-layout__metricGrid">
      {safeItems.map((item) => (
        <div
          key={item.key || item.label}
          className="admin-side-layout__metricCard"
          style={{
            "--admin-side-layout-metric-color": item.color || "#0f3f94",
            borderColor: item.border || "rgba(148, 163, 184, 0.18)",
            background: item.bg || "rgba(248, 250, 252, 0.9)",
          }}
        >
          <span className="admin-side-layout__metricValue">{item.value}</span>
          <span className="admin-side-layout__metricLabel">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const AdminStickySidebarLayout = ({
  eyebrow = "Admin",
  title,
  description,
  showIntro = false,
  sidebarContent,
  children,
}) => (
  <div className="admin-side-layout">
    <aside className="admin-side-layout__sidebar">
      <div className="admin-side-layout__sidebarInner">
        {showIntro ? (
          <section className="admin-side-layout__card">
            <div className="admin-side-layout__hero">
              {eyebrow ? <span className="admin-side-layout__eyebrow">{eyebrow}</span> : null}
              {title ? <h2 className="admin-side-layout__title">{title}</h2> : null}
              {description ? (
                <p className="admin-side-layout__description">{description}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {sidebarContent}
      </div>
    </aside>

    <main className="admin-side-layout__main">{children}</main>
  </div>
);

export default AdminStickySidebarLayout;