import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiPath, hostPath, clearAuth } from "../utils/api";
import ThemeToggle from "./ThemeToggle";
import "./StudentNavbar.css";

const NavIcon = ({ name }) => {
  const sharedProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  switch (name) {
    case "tests":
      return (
        <svg {...sharedProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
        </svg>
      );
    case "cambridge":
      return (
        <svg {...sharedProps}>
          <path d="m2 10 10-5 10 5-10 5-10-5Z" />
          <path d="M6 12v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4" />
          <path d="M22 10v6" />
        </svg>
      );
    case "feedback":
      return (
        <svg {...sharedProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16l4-3h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...sharedProps}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
      );
    case "user":
      return (
        <svg {...sharedProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "close":
      return (
        <svg {...sharedProps}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...sharedProps}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...sharedProps}>
          <path d="M4 5h16v12H4z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </svg>
      );
    case "more":
      return (
        <svg {...sharedProps}>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      );
    default:
      return null;
  }
};

const StudentNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  const [writingFeedbackCount, setWritingFeedbackCount] = useState(0);
  const [readingFeedbackCount, setReadingFeedbackCount] = useState(0);
  const [listeningFeedbackCount, setListeningFeedbackCount] = useState(0);
  const [cambridgeFeedbackCount, setCambridgeFeedbackCount] = useState(0);
  const [moreDropdownVisible, setMoreDropdownVisible] = useState(false);
  const [isCompactMenu, setIsCompactMenu] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 520 : false
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState("overview");
  const moreDropdownRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem("user");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.phone) return;

    try {
      // Fetch Writing notifications
      const submissionsRes = await fetch(apiPath("writing/list")).then((res) =>
        res.json()
      );

      const mySubs = submissionsRes.filter(
        (sub) => sub.userPhone === user.phone
      );

      const unseenWritingFeedbacks = mySubs.filter(
        (sub) => sub.feedback && !sub.feedbackSeen
      );

      setWritingFeedbackCount(unseenWritingFeedbacks.length);

      // Fetch Reading notifications
      try {
        const readingRes = await fetch(apiPath(`reading-submissions/unseen-count/${user.phone}`));
        if (readingRes.ok) {
          const { count } = await readingRes.json();
          setReadingFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to load reading notifications:", err);
        setReadingFeedbackCount(0);
      }

      // Fetch Listening notifications
      try {
        const listeningRes = await fetch(apiPath(`listening-submissions/unseen-count/${user.phone}`));
        if (listeningRes.ok) {
          const { count } = await listeningRes.json();
          setListeningFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to load listening notifications:", err);
        setListeningFeedbackCount(0);
      }

      // Fetch Cambridge notifications
      try {
        const camRes = await fetch(apiPath(`cambridge/submissions/unseen-count/${user.phone}`));
        if (camRes.ok) {
          const { count } = await camRes.json();
          setCambridgeFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to load Cambridge notifications:", err);
        setCambridgeFeedbackCount(0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.phone) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const handleFeedbackSeen = () => {
      fetchNotifications();
    };
    window.addEventListener("feedbackSeen", handleFeedbackSeen);
    return () => {
      window.removeEventListener("feedbackSeen", handleFeedbackSeen);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(event.target)
      ) {
        setMoreDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      const compact = window.innerWidth <= 520;
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

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      let updatedUser = null;
      try {
        updatedUser = JSON.parse(localStorage.getItem("user") || "null");
      } catch (err) {
        localStorage.removeItem("user");
        updatedUser = null;
      }
      if (updatedUser?.lastFeedbackCheck !== user?.lastFeedbackCheck) {
        setUser(updatedUser);
        fetchNotifications();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markFeedbackAsSeen = async () => {
    try {
      // Mark Writing feedback as seen
      const res = await fetch(apiPath("writing/list"));
      const allSubs = await res.json();
      const mySubs = allSubs.filter(
        (sub) =>
          sub.userPhone === user.phone && sub.feedback && !sub.feedbackSeen
      );
      const writingUnseenIds = mySubs.map((sub) => sub.id);

      if (writingUnseenIds.length > 0) {
        await fetch(apiPath("writing/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: writingUnseenIds }),
        });
      }

      // Mark Reading feedback as seen
      try {
        const readingRes = await fetch(apiPath(`reading-submissions/user/${user.phone}`));
        if (readingRes.ok) {
          const readingSubs = await readingRes.json();
          const readingUnseenIds = readingSubs
            .filter((sub) => sub.feedback && !sub.feedbackSeen)
            .map((sub) => sub.id);

          if (readingUnseenIds.length > 0) {
            await fetch(apiPath("reading-submissions/mark-feedback-seen"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: readingUnseenIds }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to mark reading feedback as seen:", err);
      }

      // Mark Listening feedback as seen
      try {
        const listeningRes = await fetch(apiPath(`listening-submissions/user/${user.phone}`));
        if (listeningRes.ok) {
          const listeningSubs = await listeningRes.json();
          const listeningUnseenIds = listeningSubs
            .filter((sub) => sub.feedback && !sub.feedbackSeen)
            .map((sub) => sub.id);

          if (listeningUnseenIds.length > 0) {
            await fetch(apiPath("listening-submissions/mark-feedback-seen"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: listeningUnseenIds }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to mark listening feedback as seen:", err);
      }

      // Mark Cambridge feedback as seen
      try {
        const camRes = await fetch(apiPath(`cambridge/submissions/user/${user.phone}`));
        if (camRes.ok) {
          const camSubs = await camRes.json();
          const camUnseenIds = (Array.isArray(camSubs) ? camSubs : [])
            .filter((sub) => sub.feedback && !sub.feedbackSeen)
            .map((sub) => sub.id);

          if (camUnseenIds.length > 0) {
            await fetch(apiPath("cambridge/submissions/mark-feedback-seen"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: user.phone, ids: camUnseenIds }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to mark Cambridge feedback as seen:", err);
      }

      setWritingFeedbackCount(0);
      setReadingFeedbackCount(0);
      setListeningFeedbackCount(0);
      setCambridgeFeedbackCount(0);
    } catch (err) {
      console.error("Failed to mark feedback as seen:", err);
    }
  };

  const handleNotificationClick = async () => {
    try {
      await markFeedbackAsSeen();
      await fetchNotifications();
      navigate("/my-feedback");
    } catch (err) {
      console.error("Failed to handle notifications:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(apiPath('auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (_) { /* ignore network errors on logout */ }
    clearAuth();
    navigate('/login');
  };

  const getPreferredMobileTab = () => {
    const pathname = String(location.pathname || "").toLowerCase();
    if (pathname.startsWith("/my-feedback")) return "feedback";
    if (pathname.startsWith("/cambridge")) return "orange";
    if (pathname.startsWith("/select-test")) return "ielts";
    return "overview";
  };

  const openMobileDrawer = () => {
    setMoreDropdownVisible(false);
    setMobileDrawerTab(getPreferredMobileTab());
    setMobileDrawerOpen(true);
  };

  const closeMobileDrawer = () => setMobileDrawerOpen(false);

  const toggleMobileDrawer = () => {
    if (mobileDrawerOpen) {
      closeMobileDrawer();
    } else {
      openMobileDrawer();
    }
  };

  if (!user) return null;

  const feedbackCount = writingFeedbackCount + readingFeedbackCount + listeningFeedbackCount + cambridgeFeedbackCount;
  const totalNotifications = feedbackCount;

  const mobileDrawerTabs = [
    { key: "overview", label: "Overview" },
    { key: "ielts", label: "IX" },
    { key: "orange", label: "Orange" },
    {
      key: "feedback",
      label: `Feedback${totalNotifications > 0 ? ` (${totalNotifications})` : ""}`,
    },
  ];

  const renderMobileQuickLink = (to, title, meta, iconName) => (
    <Link
      key={to}
      to={to}
      className="studentNavbar__mobileQuickLink"
      onClick={closeMobileDrawer}
    >
      <span className="studentNavbar__mobileQuickIcon" aria-hidden="true">
        <NavIcon name={iconName} />
      </span>
      <span className="studentNavbar__mobileQuickText">
        <span className="studentNavbar__mobileQuickTitle">{title}</span>
        <span className="studentNavbar__mobileQuickMeta">{meta}</span>
      </span>
    </Link>
  );

  const renderMobileTabs = (tabs, activeKey, onChange) => (
    <div className="studentNavbar__mobileTabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`studentNavbar__mobileTab${
            activeKey === tab.key ? " studentNavbar__mobileTab--active" : ""
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderMobileOverview = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">{user.name}</div>
        <div className="studentNavbar__mobileMenuHint">
          Compact mobile menu for tests, feedback, appearance, and account actions.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        <div className="studentNavbar__mobileSectionTitle">Quick access</div>
        <div className="studentNavbar__mobileQuickGrid">
          {renderMobileQuickLink("/select-test", "IX", "Open the IX test list", "tests")}
          {renderMobileQuickLink("/cambridge", "Orange", "Open Orange practice tests", "cambridge")}
          {renderMobileQuickLink(
            "/my-feedback",
            "My Feedback",
            "See teacher comments and marked submissions",
            "feedback"
          )}
        </div>

        <div className="studentNavbar__mobileSectionTitle">Appearance</div>
        <div className="studentNavbar__mobileThemeWrap">
          <ThemeToggle style={{ width: "100%", justifyContent: "center" }} />
        </div>

        <div className="studentNavbar__mobileSectionTitle">Account</div>
        <button
          type="button"
          className="studentNavbar__mobileLogout"
          onClick={handleLogout}
        >
          <span className="studentNavbar__mobileQuickIcon" aria-hidden="true">
            <NavIcon name="logout" />
          </span>
          <span className="studentNavbar__mobileQuickText">
            <span className="studentNavbar__mobileQuickTitle">Log Out</span>
            <span className="studentNavbar__mobileQuickMeta">Sign out of your account</span>
          </span>
        </button>
      </div>
    </>
  );

  const renderMobileIelts = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">IX</div>
        <div className="studentNavbar__mobileMenuHint">
          Browse IX tests and return to the main test selection screen.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        {renderMobileQuickLink(
          "/select-test",
          "Open IX tests",
          "Go back to the IX test listing page",
          "tests"
        )}
      </div>
    </>
  );

  const renderMobileOrange = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">Orange</div>
        <div className="studentNavbar__mobileMenuHint">
          Jump to Orange reading, listening, and result pages.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        {renderMobileQuickLink(
          "/cambridge",
          "Open Orange tests",
          "Go to the Orange practice test hub",
          "cambridge"
        )}
      </div>
    </>
  );

  const renderMobileFeedback = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">Feedback & Updates</div>
        <div className="studentNavbar__mobileMenuHint">
          Track unseen feedback from one place on mobile.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        <div className="studentNavbar__mobileSummaryCard">
          <div className="studentNavbar__mobileSummaryRow">
            <span className="studentNavbar__mobileSummaryLabel">New feedback</span>
            <span className="studentNavbar__mobileSummaryValue">{feedbackCount}</span>
          </div>
        </div>

        <button
          type="button"
          className="studentNavbar__mobileQuickAction"
          onClick={async () => {
            closeMobileDrawer();
            await handleNotificationClick();
          }}
        >
          <span className="studentNavbar__mobileQuickIcon" aria-hidden="true">
            <NavIcon name="inbox" />
          </span>
          <span className="studentNavbar__mobileQuickText">
            <span className="studentNavbar__mobileQuickTitle">Open Feedback Center</span>
            <span className="studentNavbar__mobileQuickMeta">
              Mark notifications as seen and open My Feedback
            </span>
          </span>
        </button>

        {renderMobileQuickLink(
          "/my-feedback",
          "Open My Feedback",
          "Review all writing, reading, and Orange comments",
          "feedback"
        )}
      </div>
    </>
  );

  const renderMobileDrawerContent = () => {
    if (mobileDrawerTab === "ielts") return renderMobileIelts();
    if (mobileDrawerTab === "orange") return renderMobileOrange();
    if (mobileDrawerTab === "feedback") return renderMobileFeedback();
    return renderMobileOverview();
  };

  if (isCompactMenu) {
    return (
      <nav className="studentNavbar studentNavbar--compact">
        <div className="studentNavbar__mobileBar">
          <Link to="/select-test" className="studentNavbar__logoLink" title="Test list">
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="Logo"
              className="studentNavbar__logo"
            />
          </Link>

          <button
            type="button"
            className="studentNavbar__mobileMenuButton"
            onClick={toggleMobileDrawer}
            aria-label={mobileDrawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileDrawerOpen}
          >
            <span
              className={`studentNavbar__hamburger${
                mobileDrawerOpen ? " studentNavbar__hamburger--open" : ""
              }`}
              aria-hidden="true"
            >
              <span className="studentNavbar__hamburgerLine" />
              <span className="studentNavbar__hamburgerLine" />
              <span className="studentNavbar__hamburgerLine" />
            </span>
            <span className="studentNavbar__srOnly">
              {mobileDrawerOpen ? "Close menu" : "Open menu"}
            </span>
            {totalNotifications > 0 && (
              <span className="studentNavbar__mobileMenuBadge">{totalNotifications}</span>
            )}
          </button>
        </div>

        {mobileDrawerOpen && (
          <>
            <button
              type="button"
              className="studentNavbar__drawerBackdrop"
              aria-label="Close navigation menu"
              onClick={closeMobileDrawer}
            />
            <aside className="studentNavbar__drawerPanel" role="dialog" aria-modal="true">
              <div className="studentNavbar__drawerHeader">
                <div className="studentNavbar__drawerBrand">
                  <img
                    src={hostPath("uploads/staredu.jpg")}
                    alt="Logo"
                    className="studentNavbar__drawerLogo"
                  />
                  <div className="studentNavbar__drawerBrandText">
                    <div className="studentNavbar__drawerBrandTitle">Student Navigation</div>
                    <div className="studentNavbar__drawerBrandMeta">
                      Clean mobile navigation for tests, feedback, and account actions
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="studentNavbar__drawerClose"
                  onClick={closeMobileDrawer}
                  aria-label="Close navigation menu"
                >
                  <NavIcon name="close" />
                </button>
              </div>

              {renderMobileTabs(mobileDrawerTabs, mobileDrawerTab, setMobileDrawerTab)}

              <div key={mobileDrawerTab} className="studentNavbar__drawerContent studentNavbar__drawerStage">
                {renderMobileDrawerContent()}
              </div>
            </aside>
          </>
        )}

        <style>
          {`
            @keyframes shake {
              0% { transform: rotate(0deg); }
              25% { transform: rotate(10deg); }
              50% { transform: rotate(-10deg); }
              75% { transform: rotate(10deg); }
              100% { transform: rotate(0deg); }
            }
          `}
        </style>
      </nav>
    );
  }

  return (
    <nav className="studentNavbar">
      <div className="studentNavbar__left">
        <Link to="/select-test" className="studentNavbar__logoLink" title="Test List">
          <img
            src={hostPath("uploads/staredu.jpg")}
            alt="Logo"
            className="studentNavbar__logo"
          />
        </Link>
        <Link to="/select-test" className="studentNavbar__link" title="IX">
          <span className="studentNavbar__icon" aria-hidden="true"><NavIcon name="tests" /></span>
          <span className="studentNavbar__label">IX</span>
        </Link>
        <Link to="/cambridge" className="studentNavbar__link" title="Orange">
          <span className="studentNavbar__icon" aria-hidden="true"><NavIcon name="cambridge" /></span>
          <span className="studentNavbar__label">Orange</span>
        </Link>

        <button
          type="button"
          className={`studentNavbar__notificationPill${totalNotifications > 0 ? " studentNavbar__notificationPill--active" : ""}`}
          onClick={handleNotificationClick}
          title="My Feedback and notifications"
        >
          <span className="studentNavbar__notificationMain">
            <span className="studentNavbar__icon" aria-hidden="true"><NavIcon name="feedback" /></span>
            <span className="studentNavbar__label">My Feedback</span>
          </span>
          <span
            className={`studentNavbar__notificationBell${totalNotifications > 0 ? " studentNavbar__bell--shake" : ""}`}
            aria-hidden="true"
          >
            <NavIcon name="notifications" />
          </span>
          {totalNotifications > 0 ? (
            <span className="studentNavbar__notificationCount">{totalNotifications}</span>
          ) : null}
        </button>

        <div className="studentNavbar__more" ref={moreDropdownRef}>
          <span
            className="studentNavbar__moreToggle"
            onClick={() => setMoreDropdownVisible((prev) => !prev)}
            title="More"
          >
            <span className="studentNavbar__icon" aria-hidden="true"><NavIcon name="more" /></span>
            <span className="studentNavbar__label">More</span>
          </span>
          {moreDropdownVisible && (
            <div className="studentNavbar__menu">
              <Link
                to="/select-test"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                <span className="studentNavbar__menuItemIcon" aria-hidden="true"><NavIcon name="tests" /></span>
                <span>IX</span>
              </Link>
              <Link
                to="/cambridge"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                <span className="studentNavbar__menuItemIcon" aria-hidden="true"><NavIcon name="cambridge" /></span>
                <span>Orange</span>
              </Link>
              <Link
                to="/my-feedback"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                <span className="studentNavbar__menuItemIcon" aria-hidden="true"><NavIcon name="feedback" /></span>
                <span>My Feedback</span>
              </Link>
            </div>
          )}
        </div>

      </div>

      <div className="studentNavbar__right">
        <ThemeToggle />
        <span className="studentNavbar__user">
          <span className="studentNavbar__icon studentNavbar__icon--user" aria-hidden="true"><NavIcon name="user" /></span>
          <span>{user.name}</span>
        </span>
        <button
          onClick={handleLogout}
          className="studentNavbar__logout"
          title="Log out"
        >
          <span className="studentNavbar__icon" aria-hidden="true"><NavIcon name="logout" /></span>
          <span className="studentNavbar__logoutLabel">Log Out</span>
        </button>
      </div>

      <style>
        {`
          @keyframes shake {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(10deg); }
            50% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
            100% { transform: rotate(0deg); }
          }
        `}
      </style>
    </nav>
  );
};

export default StudentNavbar;
