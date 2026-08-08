import React from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

import { getCurrentUser, isAdmin } from "../../../shared/utils/permissions";

import "./AdminStickySidebarLayout.css";

const resolveFceDisplayName = (displayLabels = {}) =>
  String(displayLabels?.fceDisplayName || "FCE").trim() || "FCE";

const resolveIxDisplayName = (displayLabels = {}) =>
  String(displayLabels?.ixDisplayName || "IX").trim() || "IX";

const IX_WORKSPACE_KEYS = ["writing", "reading", "listening"];

const buildBaseWorkspaceLinks = (navigate, currentKey, displayLabels) => {
  const fceDisplayName = resolveFceDisplayName(displayLabels);

  return [
  {
    key: "review",
    label: "Review",
    hint: "All submission types",
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
  {
    key: "fce",
    label: fceDisplayName,
    hint: `${fceDisplayName} submissions`,
    tone: "cyan",
    active: currentKey === "fce",
    onClick: () => navigate("/admin/fce-submissions"),
  },
  ];
};

const buildAdminOnlyWorkspaceLinks = (navigate, currentKey) => [
  {
    key: "display-settings",
    label: "Display",
    hint: "Global labels",
    tone: "blue",
    active: currentKey === "display-settings",
    onClick: () => navigate("/admin/display-settings"),
  },
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

const WORKSPACE_LINK_GROUPS = {
  all: "all",
  review: "review",
  admin: "admin",
};

export const buildAdminWorkspaceLinks = (
  navigate,
  currentKey,
  currentUser = getCurrentUser(),
  group = WORKSPACE_LINK_GROUPS.all,
  displayLabels = {}
) => {
  const includeBaseLinks =
    group === WORKSPACE_LINK_GROUPS.all || group === WORKSPACE_LINK_GROUPS.review;
  const includeAdminLinks =
    isAdmin(currentUser) &&
    (group === WORKSPACE_LINK_GROUPS.all || group === WORKSPACE_LINK_GROUPS.admin);

  return [
    ...(includeBaseLinks ? buildBaseWorkspaceLinks(navigate, currentKey, displayLabels) : []),
    ...(includeAdminLinks ? buildAdminOnlyWorkspaceLinks(navigate, currentKey) : []),
  ];
};

export const buildSubmissionWorkspaceContext = ({
  navigate,
  currentKey,
  displayLabels = {},
} = {}) => {
  const workspaceLinks = buildAdminWorkspaceLinks(
    navigate,
    currentKey,
    undefined,
    WORKSPACE_LINK_GROUPS.review,
    displayLabels
  );
  const ixDisplayName = resolveIxDisplayName(displayLabels);
  const reviewWorkspaceLink =
    workspaceLinks.find((item) => item?.key === "review") || null;
  const ixWorkspaceLinks = workspaceLinks.filter((item) =>
    IX_WORKSPACE_KEYS.includes(String(item?.key || ""))
  );
  const orangeWorkspaceLink =
    workspaceLinks.find((item) => item?.key === "cambridge") || null;
  const generalWorkspaceLink =
    workspaceLinks.find((item) => item?.key === "fce") || null;

  return {
    workspaceLinks,
    ixDisplayName,
    reviewWorkspaceLink,
    ixWorkspaceLinks,
    orangeWorkspaceLink,
    generalWorkspaceLink,
  };
};

export const buildSubmissionWorkspaceNav = ({
  navigate,
  currentKey,
  activeWorkspaceGroup,
  setActiveWorkspaceGroup,
  displayLabels = {},
  activeIxKey = "writing",
  onIxGroupClick,
  onOrangeGroupClick,
  onGeneralGroupClick,
} = {}) => {
  const {
    workspaceLinks,
    ixDisplayName,
    reviewWorkspaceLink,
    ixWorkspaceLinks,
    orangeWorkspaceLink,
    generalWorkspaceLink,
  } = buildSubmissionWorkspaceContext({
    navigate,
    currentKey,
    displayLabels,
  });

  const workspaceGroupLinks = [
    reviewWorkspaceLink
      ? {
          key: "workspace-review",
          label: reviewWorkspaceLink.label,
          hint: reviewWorkspaceLink.hint,
          tone: reviewWorkspaceLink.tone,
          active: activeWorkspaceGroup === "review",
          onClick: () => {
            setActiveWorkspaceGroup("review");
            reviewWorkspaceLink.onClick?.();
          },
        }
      : null,
    {
      key: "workspace-ix",
      label: ixDisplayName,
      hint: "Writing, Reading, Listening",
      tone: "blue",
      active: activeWorkspaceGroup === "ix",
      onClick: () => {
        setActiveWorkspaceGroup("ix");
        onIxGroupClick?.({ ixWorkspaceLinks, workspaceLinks });
      },
    },
    orangeWorkspaceLink
      ? {
          key: "workspace-orange",
          label: orangeWorkspaceLink.label,
          hint: orangeWorkspaceLink.hint,
          tone: orangeWorkspaceLink.tone,
          active: activeWorkspaceGroup === "orange",
          onClick: () => {
            setActiveWorkspaceGroup("orange");
            if (onOrangeGroupClick) {
              onOrangeGroupClick({ orangeWorkspaceLink, workspaceLinks });
            } else {
              orangeWorkspaceLink.onClick?.();
            }
          },
        }
      : null,
    generalWorkspaceLink
      ? {
          key: "workspace-general",
          label: generalWorkspaceLink.label,
          hint: generalWorkspaceLink.hint,
          tone: generalWorkspaceLink.tone,
          active: activeWorkspaceGroup === "general",
          onClick: () => {
            setActiveWorkspaceGroup("general");
            if (onGeneralGroupClick) {
              onGeneralGroupClick({ generalWorkspaceLink, workspaceLinks });
            } else {
              generalWorkspaceLink.onClick?.();
            }
          },
        }
      : null,
  ].filter(Boolean);

  const workspaceChildLinks =
    activeWorkspaceGroup === "ix"
      ? ixWorkspaceLinks.map((item) => ({
          key: `workspace-child-${item.key}`,
          label: item.label,
          hint: item.hint,
          tone: item.tone,
          active: item.key === activeIxKey,
          onClick: item.onClick,
        }))
      : [];

  return {
    ixDisplayName,
    workspaceLinks,
    reviewWorkspaceLink,
    ixWorkspaceLinks,
    orangeWorkspaceLink,
    generalWorkspaceLink,
    workspaceGroupLinks,
    workspaceChildLinks,
  };
};

export const buildReviewWorkspaceNav = ({
  navigate,
  displayLabels = {},
  activeTab = "review",
  activeWorkspaceGroup = "review",
  setActiveWorkspaceGroup,
  setActiveTab,
  reviewTabs = [],
  navigateToIxSubmissionPage,
  navigateToPlatformSubmissionPage,
  orangeSubmissionTypeTabs = [],
  generalSubmissionTypeTabs = [],
  activeReviewTabShortLabel = "Review",
} = {}) => {
  const {
    ixDisplayName,
    reviewWorkspaceLink,
    orangeWorkspaceLink,
    generalWorkspaceLink,
  } = buildSubmissionWorkspaceContext({
    navigate,
    currentKey: "review",
    displayLabels,
  });

  const workspaceParentLinks = [];

  if (reviewWorkspaceLink) {
    workspaceParentLinks.push({
      key: "workspace-review",
      label: reviewWorkspaceLink.label,
      hint: reviewWorkspaceLink.hint,
      tone: reviewWorkspaceLink.tone,
      active: activeTab === "review" || activeWorkspaceGroup === "review",
      onClick: () => {
        setActiveWorkspaceGroup("review");
        setActiveTab("review");
        reviewWorkspaceLink.onClick?.();
      },
    });
  }

  workspaceParentLinks.push({
    key: "workspace-ix",
    label: ixDisplayName,
    hint: "Writing, Reading, Listening",
    tone: "blue",
    active: activeTab !== "review" && activeWorkspaceGroup === "ix",
    onClick: () => {
      setActiveWorkspaceGroup("ix");
      setActiveTab("writing");
      navigateToIxSubmissionPage("writing");
    },
  });

  if (orangeWorkspaceLink) {
    workspaceParentLinks.push({
      key: "workspace-orange",
      label: orangeWorkspaceLink.label,
      hint: orangeWorkspaceLink.hint,
      tone: orangeWorkspaceLink.tone,
      active: activeTab !== "review" && activeWorkspaceGroup === "orange",
      onClick: () => {
        navigateToPlatformSubmissionPage("orange", "all");
      },
    });
  }

  if (generalWorkspaceLink) {
    workspaceParentLinks.push({
      key: "workspace-general",
      label: generalWorkspaceLink.label,
      hint: generalWorkspaceLink.hint,
      tone: generalWorkspaceLink.tone,
      active: activeTab !== "review" && activeWorkspaceGroup === "general",
      onClick: () => {
        navigateToPlatformSubmissionPage("general", "all");
      },
    });
  }

  const ixReviewTabs = Array.isArray(reviewTabs)
    ? reviewTabs.filter((tab) => IX_WORKSPACE_KEYS.includes(tab?.key))
    : [];

  let workspaceChildLinks = [];

  if (activeTab !== "review") {
    if (activeWorkspaceGroup === "ix") {
      workspaceChildLinks = ixReviewTabs.map((tab) => ({
        key: `workspace-child-${tab.key}`,
        label: tab.shortLabel || tab.label,
        hint: tab.label,
        tone:
          tab.key === "writing"
            ? "violet"
            : tab.key === "reading"
            ? "blue"
            : "green",
        badge: tab.badge,
        active: activeTab === tab.key,
        onClick: () => {
          setActiveWorkspaceGroup("ix");
          setActiveTab(tab.key);
          navigateToIxSubmissionPage(tab.key);
        },
      }));
    } else if (activeWorkspaceGroup === "orange") {
      workspaceChildLinks = (Array.isArray(orangeSubmissionTypeTabs)
        ? orangeSubmissionTypeTabs
        : []
      ).map((tab) => ({
        key: `workspace-child-orange-${tab.key}`,
        label: tab.shortLabel,
        hint: tab.label,
        tone: tab.tone,
        active: false,
        onClick: () => {
          navigateToPlatformSubmissionPage("orange", tab.key);
        },
      }));
    } else if (activeWorkspaceGroup === "general") {
      workspaceChildLinks = (Array.isArray(generalSubmissionTypeTabs)
        ? generalSubmissionTypeTabs
        : []
      ).map((tab) => ({
        key: `workspace-child-general-${tab.key}`,
        label: tab.shortLabel,
        hint: tab.label,
        tone: tab.tone,
        active: false,
        onClick: () => {
          navigateToPlatformSubmissionPage("general", tab.key);
        },
      }));
    }
  }

  const workspaceChildMeta =
    activeWorkspaceGroup === "ix"
      ? ixDisplayName
      : activeWorkspaceGroup === "orange"
      ? "Open Cambridge submissions"
      : activeWorkspaceGroup === "general"
      ? "Open General submissions"
      : activeReviewTabShortLabel;

  const workspaceChildAriaLabel =
    activeWorkspaceGroup === "ix"
      ? "IX submission types"
      : activeWorkspaceGroup === "orange"
      ? "Orange submission types"
      : activeWorkspaceGroup === "general"
      ? "General submission types"
      : "Submission types";

  const submissionTypeTabs =
    activeTab === "review" || activeWorkspaceGroup !== "ix"
      ? []
      : ixReviewTabs.map((tab) => ({
          ...tab,
          onClick: () => {
            setActiveWorkspaceGroup("ix");
            setActiveTab(tab.key);
            navigateToIxSubmissionPage(tab.key);
          },
        }));

  return {
    ixDisplayName,
    workspaceParentLinks,
    workspaceChildLinks,
    workspaceChildMeta,
    workspaceChildAriaLabel,
    submissionTypeTabs,
  };
};

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
  const { isDarkMode } = useTheme();
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
            borderColor: isDarkMode ? "rgba(71, 85, 105, 0.82)" : item.border || "rgba(148, 163, 184, 0.18)",
            background: isDarkMode
              ? "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.98) 100%)"
              : item.bg || "rgba(248, 250, 252, 0.9)",
            boxShadow: isDarkMode ? "0 14px 28px rgba(2, 6, 23, 0.22)" : "none",
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
