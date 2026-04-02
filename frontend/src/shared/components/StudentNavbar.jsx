import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiPath, hostPath, clearAuth } from "../utils/api";
import ThemeToggle from "./ThemeToggle";
import "./StudentNavbar.css";

const StudentNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  const [writingFeedbackCount, setWritingFeedbackCount] = useState(0);
  const [readingFeedbackCount, setReadingFeedbackCount] = useState(0);
  const [cambridgeFeedbackCount, setCambridgeFeedbackCount] = useState(0);
  const [newTestCount, setNewTestCount] = useState(0);
  const [moreDropdownVisible, setMoreDropdownVisible] = useState(false);
  const [isCompactMenu, setIsCompactMenu] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 520 : false
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState("overview");
  const moreDropdownRef = useRef(null);

  // Lấy thông tin user từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("❌ Lỗi parse user:", e);
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
      const [testsRes, submissionsRes] = await Promise.all([
        fetch(apiPath("writing-tests")).then((res) => res.json()),
        fetch(apiPath("writing/list")).then((res) => res.json()),
      ]);

      const mySubs = submissionsRes.filter(
        (sub) => sub.userPhone === user.phone
      );

      const unseenWritingFeedbacks = mySubs.filter(
        (sub) => sub.feedback && !sub.feedbackSeen
      );

      const submittedTestIds = mySubs
        .map((sub) => String(sub.testId))
        .filter(Boolean);
      const unsubmittedTests = testsRes.filter(
        (test) => !submittedTestIds.includes(String(test.id))
      );

      setWritingFeedbackCount(unseenWritingFeedbacks.length);
      setNewTestCount(unsubmittedTests.length);

      // Fetch Reading notifications
      try {
        const readingRes = await fetch(apiPath(`reading-submissions/unseen-count/${user.phone}`));
        if (readingRes.ok) {
          const { count } = await readingRes.json();
          setReadingFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải Reading notifications:", err);
        setReadingFeedbackCount(0);
      }

      // Fetch Cambridge notifications
      try {
        const camRes = await fetch(apiPath(`cambridge/submissions/unseen-count/${user.phone}`));
        if (camRes.ok) {
          const { count } = await camRes.json();
          setCambridgeFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải Cambridge notifications:", err);
        setCambridgeFeedbackCount(0);
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải thông báo:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.phone) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // 🔹 Lắng nghe sự kiện từ MyFeedback để cập nhật số chuông
  useEffect(() => {
    const handleFeedbackSeen = () => {
      fetchNotifications(); // ✅ Đồng bộ lại số thông báo
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

  // 🔹 Kiểm tra định kỳ sự thay đổi trong localStorage
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
    }, 3000); // kiểm tra mỗi 3 giây

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
        console.error("❌ Lỗi khi đánh dấu Reading đã xem:", err);
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
        console.error("❌ Lỗi khi đánh dấu Cambridge đã xem:", err);
      }

      setWritingFeedbackCount(0);
      setReadingFeedbackCount(0);
      setCambridgeFeedbackCount(0);
    } catch (err) {
      console.error("❌ Lỗi khi đánh dấu đã xem nhận xét:", err);
    }
  };

  const handleNotificationClick = async () => {
    try {
      await markFeedbackAsSeen();
      await fetchNotifications();
      navigate("/my-feedback");
    } catch (err) {
      console.error("❌ Lỗi khi xử lý thông báo:", err);
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

  const feedbackCount = writingFeedbackCount + readingFeedbackCount + cambridgeFeedbackCount;
  const totalNotifications = feedbackCount + newTestCount;

  const mobileDrawerTabs = [
    { key: "overview", label: "Overview" },
    { key: "ielts", label: "IELTS" },
    { key: "orange", label: "Orange" },
    {
      key: "feedback",
      label: `Feedback${totalNotifications > 0 ? ` (${totalNotifications})` : ""}`,
    },
  ];

  const renderMobileQuickLink = (to, title, meta, icon) => (
    <Link
      key={to}
      to={to}
      className="studentNavbar__mobileQuickLink"
      onClick={closeMobileDrawer}
    >
      <span className="studentNavbar__mobileQuickIcon">{icon}</span>
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
        <div className="studentNavbar__mobileMenuTitle">👤 {user.name}</div>
        <div className="studentNavbar__mobileMenuHint">
          Compact mobile menu for tests, feedback, appearance, and account actions.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        <div className="studentNavbar__mobileSectionTitle">Quick access</div>
        <div className="studentNavbar__mobileQuickGrid">
          {renderMobileQuickLink("/select-test", "IELTS", "Open the IELTS test list", "📚")}
          {renderMobileQuickLink("/cambridge", "Orange", "Open Cambridge-style practice tests", "🍊")}
          {renderMobileQuickLink(
            "/my-feedback",
            "My feedback",
            "See teacher comments and marked submissions",
            "📄"
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
          <span className="studentNavbar__mobileQuickIcon">🔓</span>
          <span className="studentNavbar__mobileQuickText">
            <span className="studentNavbar__mobileQuickTitle">Logout</span>
            <span className="studentNavbar__mobileQuickMeta">Sign out of your account</span>
          </span>
        </button>
      </div>
    </>
  );

  const renderMobileIelts = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">📚 IELTS</div>
        <div className="studentNavbar__mobileMenuHint">
          Browse IELTS tests and return to the main test selection screen.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        {renderMobileQuickLink(
          "/select-test",
          "Open IELTS tests",
          "Go back to the IELTS test listing page",
          "🧾"
        )}
      </div>
    </>
  );

  const renderMobileOrange = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">🍊 Orange</div>
        <div className="studentNavbar__mobileMenuHint">
          Jump to Cambridge-style reading, listening, and result pages.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        {renderMobileQuickLink(
          "/cambridge",
          "Open Orange tests",
          "Go to the Cambridge / Orange practice test hub",
          "🎓"
        )}
      </div>
    </>
  );

  const renderMobileFeedback = () => (
    <>
      <div className="studentNavbar__mobileMenuTop">
        <div className="studentNavbar__mobileMenuTitle">🔔 Feedback & updates</div>
        <div className="studentNavbar__mobileMenuHint">
          Track unseen feedback and new tests from one place on mobile.
        </div>
      </div>
      <div className="studentNavbar__mobileMenuBody studentNavbar__mobileMenuBody--compact">
        <div className="studentNavbar__mobileSummaryCard">
          <div className="studentNavbar__mobileSummaryRow">
            <span className="studentNavbar__mobileSummaryLabel">New feedback</span>
            <span className="studentNavbar__mobileSummaryValue">{feedbackCount}</span>
          </div>
          <div className="studentNavbar__mobileSummaryRow">
            <span className="studentNavbar__mobileSummaryLabel">New tests</span>
            <span className="studentNavbar__mobileSummaryValue">{newTestCount}</span>
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
          <span className="studentNavbar__mobileQuickIcon">📬</span>
          <span className="studentNavbar__mobileQuickText">
            <span className="studentNavbar__mobileQuickTitle">Open feedback center</span>
            <span className="studentNavbar__mobileQuickMeta">
              Mark notifications as seen and open My Feedback
            </span>
          </span>
        </button>

        {renderMobileQuickLink(
          "/my-feedback",
          "Open My Feedback",
          "Review all writing, reading, and Cambridge comments",
          "📝"
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
                    <div className="studentNavbar__drawerBrandTitle">Student Menu</div>
                    <div className="studentNavbar__drawerBrandMeta">
                      Compact slide-out navigation for mobile devices
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="studentNavbar__drawerClose"
                  onClick={closeMobileDrawer}
                  aria-label="Close navigation menu"
                >
                  ✕
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
        <Link to="/select-test" className="studentNavbar__logoLink" title="Danh sách đề">
          <img
            src={hostPath("uploads/staredu.jpg")}
            alt="Logo"
            className="studentNavbar__logo"
          />
        </Link>
        <Link to="/select-test" className="studentNavbar__link" title="IELTS">
          <span className="studentNavbar__icon">📚</span>
          <span className="studentNavbar__label">IELTS</span>
        </Link>
        <Link to="/cambridge" className="studentNavbar__link" title="Orange">
          <span className="studentNavbar__icon">🍊</span>
          <span className="studentNavbar__label">Orange</span>
        </Link>

        <Link to="/my-feedback" className="studentNavbar__link studentNavbar__link--desktop" title="Xem nhận xét">
          <span className="studentNavbar__icon">📄</span>
          <span className="studentNavbar__label">Xem nhận xét</span>
        </Link>

        <div className="studentNavbar__more" ref={moreDropdownRef}>
          <span
            className="studentNavbar__moreToggle"
            onClick={() => setMoreDropdownVisible((prev) => !prev)}
            title="Thêm"
          >
            <span className="studentNavbar__icon">⋯</span>
            <span className="studentNavbar__label">Thêm</span>
          </span>
          {moreDropdownVisible && (
            <div className="studentNavbar__menu">
              <Link
                to="/select-test"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                📚 IELTS
              </Link>
              <Link
                to="/cambridge"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                🍊 Orange
              </Link>
              <Link
                to="/my-feedback"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                📄 Xem nhận xét
              </Link>
            </div>
          )}
        </div>

        <div
          className={
            totalNotifications > 0
              ? "studentNavbar__bell studentNavbar__bell--shake"
              : "studentNavbar__bell"
          }
          onClick={handleNotificationClick}
          title="Thông báo mới"
        >
          🔔
          {totalNotifications > 0 && (
            <span className="studentNavbar__badge">
              {totalNotifications}
            </span>
          )}
        </div>
      </div>

      <div className="studentNavbar__right">
        <ThemeToggle />
        <span className="studentNavbar__user">👤 {user.name}</span>
        <button
          onClick={handleLogout}
          className="studentNavbar__logout"
          title="Đăng xuất"
        >
          <span className="studentNavbar__icon">🔓</span>
          <span className="studentNavbar__logoutLabel">Đăng xuất</span>
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
