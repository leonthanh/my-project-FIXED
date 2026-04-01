import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { apiPath, hostPath, clearAuth } from "../utils/api";
import { canManageCategory } from "../utils/permissions";
import "./AdminNavbar.css";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const [unreviewed, setUnreviewed] = useState([]);
  const [notificationDropdownVisible, setNotificationDropdownVisible] =
    useState(false);
  const [submissionDropdownVisible, setSubmissionDropdownVisible] =
    useState(false);
  const [cambridgeDropdownVisible, setCambridgeDropdownVisible] =
    useState(false);
  const [adminDropdownVisible, setAdminDropdownVisible] = useState(false);
  const [isCompactMenu, setIsCompactMenu] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState("main");
  const [mobileCambridgeSection, setMobileCambridgeSection] = useState("ket");
  const [mobileCambridgeGroup, setMobileCambridgeGroup] = useState("flyers");
  const [mobileSubmissionSection, setMobileSubmissionSection] =
    useState("create");
  const notificationDropdownRef = useRef(null);
  const submissionDropdownRef = useRef(null);
  const cambridgeDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  useEffect(() => {
    const fetchUnreviewed = async () => {
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();

        // ✅ Lọc bài chưa chấm (feedback null hoặc rỗng)
        const notReviewed = all.filter(
          (sub) => !sub.feedback || sub.feedback.trim() === ""
        );
        setUnreviewed(notReviewed);
      } catch (err) {
        console.error("❌ Lỗi khi tải thông báo GV:", err);
      }
    };

    fetchUnreviewed();
    const interval = setInterval(fetchUnreviewed, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setNotificationDropdownVisible(false);
      }
      if (
        submissionDropdownRef.current &&
        !submissionDropdownRef.current.contains(event.target)
      ) {
        setSubmissionDropdownVisible(false);
      }
      if (
        cambridgeDropdownRef.current &&
        !cambridgeDropdownRef.current.contains(event.target)
      ) {
        setCambridgeDropdownVisible(false);
      }
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(event.target)
      ) {
        setAdminDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      const compact = window.innerWidth <= 768;
      setIsCompactMenu(compact);
      if (!compact) {
        setMobileDrawerOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const originalOverflow = document.body.style.overflow;
    if (isCompactMenu && mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow || "";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCompactMenu, mobileDrawerOpen]);

  const handleLogout = async () => {
    try {
      await fetch(apiPath('auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (_) { /* ignore network errors on logout */ }
    clearAuth();
    navigate('/login');
  };

  const closeDesktopMenus = () => {
    setNotificationDropdownVisible(false);
    setSubmissionDropdownVisible(false);
    setCambridgeDropdownVisible(false);
    setAdminDropdownVisible(false);
  };

  const closeMobileDrawer = () => setMobileDrawerOpen(false);
  const openMobileDrawer = () => {
    closeDesktopMenus();
    setMobileDrawerOpen(true);
  };
  const toggleMobileDrawer = () => {
    if (mobileDrawerOpen) {
      closeMobileDrawer();
    } else {
      openMobileDrawer();
    }
  };

  const closeCambridgeMenu = () => setCambridgeDropdownVisible(false);
  const closeSubmissionMenu = () => setSubmissionDropdownVisible(false);
  const closeAdminMenu = () => setAdminDropdownVisible(false);

  const buildLinkItem = (key, to, label, visible = true) =>
    visible ? { key, to, label } : null;

  const buildDisabledItem = (key, label, visible = true) =>
    visible ? { key, label, disabled: true } : null;

  const cambridgeSections = [
    {
      key: "ket",
      label: "KET",
      title: "📚 KET (A2 Key)",
      items: [
        buildLinkItem(
          "ket-listening",
          "/admin/create-ket-listening",
          "🎧 KET Listening",
          canManageCategory(user, "listening")
        ),
        buildLinkItem(
          "ket-reading",
          "/admin/create-ket-reading",
          "📖 KET Reading",
          canManageCategory(user, "reading")
        ),
      ].filter(Boolean),
    },
    {
      key: "pet",
      label: "PET",
      title: "📚 PET (B1 Preliminary)",
      items: [
        buildLinkItem(
          "pet-listening",
          "/admin/create-pet-listening",
          "🎧 PET Listening",
          canManageCategory(user, "listening")
        ),
        buildLinkItem(
          "pet-reading",
          "/admin/create-pet-reading",
          "📖 PET Reading",
          canManageCategory(user, "reading")
        ),
        buildLinkItem(
          "pet-writing",
          "/admin/create-pet-writing",
          "✍️ PET Writing"
        ),
      ].filter(Boolean),
    },
    {
      key: "yle",
      label: "YLE",
      title: "🧒 Young Learners",
      groups: [
        {
          key: "flyers",
          label: "Flyers",
          title: "✈️ Flyers (A2)",
          items: [
            buildDisabledItem("flyers-listening", "🎧 Listening (coming soon)"),
            buildLinkItem(
              "flyers-reading",
              "/admin/create/flyers",
              "📖 Reading & Writing",
              canManageCategory(user, "reading")
            ),
          ].filter(Boolean),
        },
        {
          key: "movers",
          label: "Movers",
          title: "🚗 Movers (A1)",
          items: [
            buildLinkItem(
              "movers-listening",
              "/admin/create-movers-listening",
              "🎧 Movers Listening",
              canManageCategory(user, "listening")
            ),
            buildLinkItem(
              "movers-reading",
              "/admin/create/movers",
              "📖 Reading & Writing",
              canManageCategory(user, "reading")
            ),
          ].filter(Boolean),
        },
        {
          key: "starters",
          label: "Starters",
          title: "⭐ Starters (Pre-A1)",
          items: [
            buildDisabledItem("starters-listening", "🎧 Listening (coming soon)"),
            buildLinkItem(
              "starters-reading",
              "/admin/create/starters",
              "📖 Reading & Writing",
              canManageCategory(user, "reading")
            ),
          ].filter(Boolean),
        },
      ].filter((group) => group.items.some((item) => !item.disabled)),
    },
    {
      key: "management",
      label: "Management",
      title: "📊 Management",
      items: [
        buildLinkItem(
          "cambridge-submissions",
          "/admin/cambridge-submissions",
          "📋 View submissions"
        ),
      ].filter(Boolean),
    },
  ].filter(
    (section) =>
      (section.items && section.items.length > 0) ||
      (section.groups && section.groups.length > 0)
  );

  const ieltsSections = [
    {
      key: "create",
      label: "Create",
      title: "✏️ Create",
      items: [
        buildLinkItem(
          "create-writing",
          "/admin/create-writing",
          "✍️ Writing",
          canManageCategory(user, "writing")
        ),
        buildLinkItem(
          "create-reading",
          "/admin/create-reading",
          "📖 Reading",
          canManageCategory(user, "reading")
        ),
        buildLinkItem(
          "create-listening",
          "/admin/create-listening",
          "🎧 Listening",
          canManageCategory(user, "listening")
        ),
      ].filter(Boolean),
    },
    {
      key: "submissions",
      label: "Submissions",
      title: "📥 Submissions",
      items: [
        buildLinkItem(
          "writing-submissions",
          "/admin/writing-submissions",
          "✍️ Writing"
        ),
        buildLinkItem(
          "reading-submissions",
          "/admin/reading-submissions",
          "📖 Reading"
        ),
        buildLinkItem(
          "listening-submissions",
          "/admin/listening-submissions",
          "🎧 Listening"
        ),
      ].filter(Boolean),
    },
  ].filter((section) => section.items.length > 0);

  const adminItems = [
    buildLinkItem(
      "teacher-permissions",
      "/admin/teacher-permissions",
      "🔑 Teacher Permissions"
    ),
    buildLinkItem("users", "/admin/users", "👥 User Management"),
  ].filter(Boolean);

  const activeCambridgeSection =
    cambridgeSections.find((section) => section.key === mobileCambridgeSection) ||
    cambridgeSections[0] ||
    null;

  const activeCambridgeGroup =
    activeCambridgeSection?.groups?.find(
      (group) => group.key === mobileCambridgeGroup
    ) || activeCambridgeSection?.groups?.[0] || null;

  const activeSubmissionSection =
    ieltsSections.find((section) => section.key === mobileSubmissionSection) ||
    ieltsSections[0] ||
    null;

  const mobileDrawerTabs = [
    { key: "main", label: "Overview" },
    { key: "orange", label: "Orange" },
    { key: "ix", label: "IX" },
    { key: "alerts", label: `Alerts${unreviewed.length > 0 ? ` (${unreviewed.length})` : ""}` },
    ...(user?.role === "admin" ? [{ key: "admin", label: "Admin" }] : []),
  ];

  const renderMenuItems = (items, onClose, mobile = false) =>
    items.map((item) => {
      const itemClassName = mobile
        ? "adminNavbar__menuItem adminNavbar__mobileMenuItem"
        : "adminNavbar__menuItem";

      if (item.disabled) {
        return (
          <span
            key={item.key}
            className={`${itemClassName} adminNavbar__menuItem--disabled`}
          >
            {item.label}
          </span>
        );
      }

      return (
        <Link
          key={item.key}
          to={item.to}
          className={itemClassName}
          onClick={onClose}
        >
          {item.label}
        </Link>
      );
    });

  const renderMobileQuickLink = (to, title, meta, icon) => (
    <Link
      key={to}
      to={to}
      className="adminNavbar__mobileQuickLink"
      onClick={closeMobileDrawer}
    >
      <span className="adminNavbar__mobileQuickIcon">{icon}</span>
      <span className="adminNavbar__mobileQuickText">
        <span className="adminNavbar__mobileQuickTitle">{title}</span>
        <span className="adminNavbar__mobileQuickMeta">{meta}</span>
      </span>
    </Link>
  );

  const renderDesktopSections = (sections, onClose) =>
    sections.map((section, sectionIndex) => (
      <React.Fragment key={section.key}>
        <div
          className={`adminNavbar__menuHeader${
            sectionIndex > 0 ? " adminNavbar__menuHeader--spaced" : ""
          }`}
        >
          {section.title}
        </div>
        {section.items ? renderMenuItems(section.items, onClose) : null}
        {section.groups
          ? section.groups.map((group) => (
              <React.Fragment key={group.key}>
                <div className="adminNavbar__menuHeader">{group.title}</div>
                {renderMenuItems(group.items, onClose)}
              </React.Fragment>
            ))
          : null}
      </React.Fragment>
    ));

  const renderMobileTabs = (sections, activeKey, onChange) => (
    <div className="adminNavbar__mobileTabs">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={`adminNavbar__mobileTab${
            activeKey === section.key ? " adminNavbar__mobileTab--active" : ""
          }`}
          onClick={() => onChange(section.key)}
        >
          {section.label}
        </button>
      ))}
    </div>
  );

  const renderMobileCambridgeMenu = () => {
    if (!activeCambridgeSection) return null;

    return (
      <>
        <div className="adminNavbar__mobileMenuTop">
          <div className="adminNavbar__mobileMenuTitle">🍊 Orange</div>
          <div className="adminNavbar__mobileMenuHint">
            Multi-level menu with horizontal groups for easier teacher navigation.
          </div>
        </div>
        {renderMobileTabs(
          cambridgeSections,
          activeCambridgeSection.key,
          setMobileCambridgeSection
        )}
        <div className="adminNavbar__mobileMenuBody">
          <div className="adminNavbar__mobileSectionTitle">
            {activeCambridgeSection.title}
          </div>
          {activeCambridgeSection.groups?.length ? (
            <>
              <div className="adminNavbar__mobileSubTabs">
                {activeCambridgeSection.groups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={`adminNavbar__mobileSubTab${
                      activeCambridgeGroup?.key === group.key
                        ? " adminNavbar__mobileSubTab--active"
                        : ""
                    }`}
                    onClick={() => setMobileCambridgeGroup(group.key)}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              {activeCambridgeGroup ? (
                <>
                  <div className="adminNavbar__mobileSubTitle">
                    {activeCambridgeGroup.title}
                  </div>
                  {renderMenuItems(
                    activeCambridgeGroup.items,
                    closeMobileDrawer,
                    true
                  )}
                </>
              ) : null}
            </>
          ) : (
            renderMenuItems(activeCambridgeSection.items || [], closeMobileDrawer, true)
          )}
        </div>
      </>
    );
  };

  const renderMobileSubmissionMenu = () => {
    if (!activeSubmissionSection) return null;

    return (
      <>
        <div className="adminNavbar__mobileMenuTop">
          <div className="adminNavbar__mobileMenuTitle">📚 IX</div>
          <div className="adminNavbar__mobileMenuHint">
            Create and submissions are separated to keep the mobile menu cleaner.
          </div>
        </div>
        {renderMobileTabs(
          ieltsSections,
          activeSubmissionSection.key,
          setMobileSubmissionSection
        )}
        <div className="adminNavbar__mobileMenuBody">
          <div className="adminNavbar__mobileSectionTitle">
            {activeSubmissionSection.title}
          </div>
          {renderMenuItems(activeSubmissionSection.items, closeMobileDrawer, true)}
        </div>
      </>
    );
  };

  const renderMobileAdminMenu = () => (
    <>
      <div className="adminNavbar__mobileMenuTop">
        <div className="adminNavbar__mobileMenuTitle">⚙️ Admin</div>
        <div className="adminNavbar__mobileMenuHint">
          System administration tools are grouped in a dedicated mobile panel.
        </div>
      </div>
      <div className="adminNavbar__mobileMenuBody adminNavbar__mobileMenuBody--compact">
        {renderMenuItems(adminItems, closeMobileDrawer, true)}
      </div>
    </>
  );

  const renderMobileOverview = () => (
    <>
      <div className="adminNavbar__mobileMenuTop">
        <div className="adminNavbar__mobileMenuTitle">👨‍🏫 {user?.name || "Teacher"}</div>
        <div className="adminNavbar__mobileMenuHint">
          Open the sections below to manage tests, review submissions, and switch appearance.
        </div>
      </div>
      <div className="adminNavbar__mobileMenuBody adminNavbar__mobileMenuBody--compact">
        <div className="adminNavbar__mobileSectionTitle">Quick access</div>
        <div className="adminNavbar__mobileQuickGrid">
          {renderMobileQuickLink("/select-test", "Test list", "Browse and edit available tests", "🧾")}
          {renderMobileQuickLink("/review", "Review", "Open review queue and submission flow", "✍️")}
        </div>

        <div className="adminNavbar__mobileSectionTitle">Appearance</div>
        <div className="adminNavbar__mobileThemeWrap">
          <ThemeToggle style={{ width: "100%", justifyContent: "center" }} />
        </div>

        <div className="adminNavbar__mobileSectionTitle">Account</div>
        <button
          type="button"
          className="adminNavbar__mobileLogout"
          onClick={handleLogout}
        >
          <span className="adminNavbar__mobileQuickIcon">🔓</span>
          <span className="adminNavbar__mobileQuickText">
            <span className="adminNavbar__mobileQuickTitle">Logout</span>
            <span className="adminNavbar__mobileQuickMeta">Sign out of the teacher account</span>
          </span>
        </button>
      </div>
    </>
  );

  const renderMobileAlerts = () => (
    <>
      <div className="adminNavbar__mobileMenuTop">
        <div className="adminNavbar__mobileMenuTitle">🔔 Alerts</div>
        <div className="adminNavbar__mobileMenuHint">
          Monitor unreviewed writing submissions without keeping a separate bell icon on the top bar.
        </div>
      </div>
      <div className="adminNavbar__mobileMenuBody adminNavbar__mobileMenuBody--compact">
        <div className="adminNavbar__mobileSectionTitle">Review queue</div>
        {renderMobileQuickLink("/review", "Open review queue", "Jump straight to the teacher review page", "📬")}
        {unreviewed.length === 0 ? (
          <div className="adminNavbar__mobileEmptyState">✅ No unreviewed submissions.</div>
        ) : (
          <div className="adminNavbar__mobileAlertsList">
            {unreviewed.slice(0, 10).map((sub) => (
              <button
                key={sub.id}
                type="button"
                className="adminNavbar__mobileAlertItem"
                onClick={() => {
                  closeMobileDrawer();
                  navigate(`/review/${sub.id}`);
                }}
              >
                <span className="adminNavbar__mobileAlertName">
                  👤 {sub.User?.name || sub.userName || "N/A"}
                </span>
                <span className="adminNavbar__mobileAlertMeta">
                  📞 {sub.User?.phone || sub.userPhone || "N/A"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderMobileDrawerContent = () => {
    if (mobileDrawerTab === "orange") {
      return renderMobileCambridgeMenu();
    }

    if (mobileDrawerTab === "ix") {
      return renderMobileSubmissionMenu();
    }

    if (mobileDrawerTab === "alerts") {
      return renderMobileAlerts();
    }

    if (mobileDrawerTab === "admin") {
      return renderMobileAdminMenu();
    }

    return renderMobileOverview();
  };

  if (isCompactMenu) {
    return (
      <nav className="adminNavbar adminNavbar--compact">
        <div className="adminNavbar__mobileBar">
          <Link to="/select-test" className="adminNavbar__logoLink" title="Test list">
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="Logo"
              className="adminNavbar__logo"
            />
          </Link>

          <button
            type="button"
            className="adminNavbar__mobileMenuButton"
            onClick={toggleMobileDrawer}
            aria-label={mobileDrawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileDrawerOpen}
          >
            <span className="adminNavbar__mobileMenuIcon">
              {mobileDrawerOpen ? "✕" : "☰"}
            </span>
            <span className="adminNavbar__mobileMenuLabel">Menu</span>
            {unreviewed.length > 0 && (
              <span className="adminNavbar__mobileMenuBadge">{unreviewed.length}</span>
            )}
          </button>
        </div>

        {mobileDrawerOpen && (
          <>
            <button
              type="button"
              className="adminNavbar__drawerBackdrop"
              aria-label="Close navigation menu"
              onClick={closeMobileDrawer}
            />
            <aside className="adminNavbar__drawerPanel" role="dialog" aria-modal="true">
              <div className="adminNavbar__drawerHeader">
                <div className="adminNavbar__drawerBrand">
                  <img
                    src={hostPath("uploads/staredu.jpg")}
                    alt="Logo"
                    className="adminNavbar__drawerLogo"
                  />
                  <div className="adminNavbar__drawerBrandText">
                    <div className="adminNavbar__drawerBrandTitle">Teacher Menu</div>
                    <div className="adminNavbar__drawerBrandMeta">
                      Slide-out navigation for mobile devices
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="adminNavbar__drawerClose"
                  onClick={closeMobileDrawer}
                  aria-label="Close navigation menu"
                >
                  ✕
                </button>
              </div>

              {renderMobileTabs(mobileDrawerTabs, mobileDrawerTab, setMobileDrawerTab)}

              <div className="adminNavbar__drawerContent">
                {renderMobileDrawerContent()}
              </div>
            </aside>
          </>
        )}
      </nav>
    );
  }

  return (
    <nav className="adminNavbar">
      <div className="adminNavbar__left">
        <Link to="/select-test" className="adminNavbar__logoLink" title="Test list">
          <img
            src={hostPath("uploads/staredu.jpg")}
            alt="Logo"
            className="adminNavbar__logo"
          />
        </Link>

        {/* Cambridge Tests Dropdown */}
        <div className="adminNavbar__dropdown" ref={cambridgeDropdownRef}>
          <span
            className="adminNavbar__link adminNavbar__dropdownToggle"
            onClick={() => setCambridgeDropdownVisible((prev) => !prev)}
            title="Orange"
          >
            <span className="adminNavbar__icon">🍊</span>
            <span className="adminNavbar__label">Orange</span>
            <span className="adminNavbar__caret">▼</span>
          </span>
          {cambridgeDropdownVisible && (
            isCompactMenu ? renderMobileCambridgeMenu() : (
              <div className="adminNavbar__menu">
                {renderDesktopSections(cambridgeSections, closeCambridgeMenu)}
              </div>
            )
          )}
        </div>

        <div
          className="adminNavbar__dropdown"
          ref={submissionDropdownRef}
        >
          <span
            className="adminNavbar__link adminNavbar__dropdownToggle"
            onClick={() => setSubmissionDropdownVisible((prev) => !prev)}
            title="IELTS"
          >
            <span className="adminNavbar__icon">📚</span>
            <span className="adminNavbar__label">IX</span>
            <span className="adminNavbar__caret">▼</span>
          </span>
          {submissionDropdownVisible && (
            isCompactMenu ? renderMobileSubmissionMenu() : (
              <div className="adminNavbar__menu adminNavbar__menu--wide">
                {renderDesktopSections(ieltsSections, closeSubmissionMenu)}
              </div>
            )
          )}
        </div>
        <Link to="/select-test" className="adminNavbar__link" title="Test list">
          <span className="adminNavbar__icon">🧾</span>
          <span className="adminNavbar__label">Test list</span>
        </Link>

        <Link to="/review" className="adminNavbar__link" title="Review">
          <span className="adminNavbar__icon">✍️</span>
          <span className="adminNavbar__label">Review</span>
        </Link>

        {user?.role === 'admin' && (
          <div className="adminNavbar__dropdown" ref={adminDropdownRef}>
            <span
              className="adminNavbar__link adminNavbar__dropdownToggle"
              onClick={() => setAdminDropdownVisible(!adminDropdownVisible)}
              title="Admin"
            >
              <span className="adminNavbar__icon">⚙️</span>
              <span className="adminNavbar__label">Admin</span>
              <span className="adminNavbar__caret">▼</span>
            </span>
            {adminDropdownVisible && (
              isCompactMenu ? renderMobileAdminMenu() : (
                <div className="adminNavbar__menu">
                  {renderMenuItems(adminItems, closeAdminMenu)}
                </div>
              )
            )}
          </div>
        )}

        <div
          className={
            unreviewed.length > 0
              ? "adminNavbar__bell adminNavbar__bell--shake"
              : "adminNavbar__bell"
          }
          onClick={() =>
            setNotificationDropdownVisible(!notificationDropdownVisible)
          }
          title="Unreviewed"
        >
          🔔
          {unreviewed.length > 0 && (
            <span className="adminNavbar__badge">
              {unreviewed.length}
            </span>
          )}
        </div>

        {notificationDropdownVisible && (
          <div ref={notificationDropdownRef} className="adminNavbar__notifyMenu">
            {unreviewed.length === 0 ? (
              <div>✅ No unreviewed submissions</div>
            ) : (
              unreviewed.map((sub, i) => (
                <div
                  key={i}
                  className="adminNavbar__notifyItem"
                  onClick={() => {
                    setNotificationDropdownVisible(false);
                    navigate(`/review/${sub.id}`);
                  }}
                >
                  👤 {sub.User?.name || sub.userName || "N/A"} - 📞{" "}
                  {sub.User?.phone || sub.userPhone || "N/A"}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 👨‍🏫 Hiển thị tên giáo viên và nút logout */}
      <div className="adminNavbar__right">
        <ThemeToggle />
        <span className="adminNavbar__teacherName">👨‍🏫 {user?.name || "Teacher"}</span>
        <button
          onClick={handleLogout}
          className="adminNavbar__logout"
          title="Logout"
        >
          <span className="adminNavbar__icon">🔓</span>
          <span className="adminNavbar__logoutLabel">Logout</span>
        </button>
      </div>

    </nav>
  );
};

export default AdminNavbar;
