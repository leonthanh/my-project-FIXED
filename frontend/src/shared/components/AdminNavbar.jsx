import React, { useEffect, useState, useRef } from "react";
import { createPortal, flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { apiPath, hostPath, clearAuth } from "../utils/api";
import { canManageCategory } from "../utils/permissions";
import "./AdminNavbar.css";

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
    case "review":
      return (
        <svg {...sharedProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "admin":
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.05V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.4-1.05 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.05-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.05-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.05V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.05 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...sharedProps}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
      );
    case "close":
      return (
        <svg {...sharedProps}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
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
    case "permissions":
      return (
        <svg {...sharedProps}>
          <path d="M12 3 4 7v5c0 5 3.4 8.5 8 9 4.6-.5 8-4 8-9V7l-8-4Z" />
          <path d="m9.5 12 1.8 1.8 3.7-3.7" />
        </svg>
      );
    case "users":
      return (
        <svg {...sharedProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "writing":
      return (
        <svg {...sharedProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "reading":
      return (
        <svg {...sharedProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
        </svg>
      );
    case "listening":
      return (
        <svg {...sharedProps}>
          <path d="M14 9a5 5 0 0 1 0 6" />
          <path d="M17.5 6.5a9 9 0 0 1 0 11" />
          <path d="M3 10h4l5-4v12l-5-4H3z" />
        </svg>
      );
    case "create":
      return (
        <svg {...sharedProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "submissions":
      return (
        <svg {...sharedProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16l4-3h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "management":
      return (
        <svg {...sharedProps}>
          <path d="M3 3v18h18" />
          <path d="m7 14 3-3 3 2 4-5" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...sharedProps}>
          <path d="M4 5h16v12H4z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </svg>
      );
    case "phone":
      return (
        <svg {...sharedProps}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.61 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6.27 6.27l1.27-1.27a2 2 0 0 1 2.11-.45c.85.28 1.73.49 2.63.61A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    default:
      return null;
  }
};

const adminRoutePreloaders = {
  "/select-test": () => import("../../features/admin/pages/SelectTest"),
  "/review": () => import("../../features/admin/pages/Review"),
  "/admin/create-writing": () => import("../../features/writing/pages/CreateWritingTest"),
  "/admin/create-reading": () => import("../../features/reading/pages/CreateReadingTest"),
  "/admin/create-listening": () => import("../../features/listening/pages/CreateListeningTestNew"),
  "/admin/writing-submissions": () => import("../../features/admin/pages/AdminWritingSubmissions"),
  "/admin/reading-submissions": () => import("../../features/admin/pages/AdminReadingSubmissions"),
  "/admin/listening-submissions": () => import("../../features/admin/pages/AdminListeningSubmissions"),
  "/admin/create-ket-listening": () => import("../../features/cambridge/pages/CreateKETListeningTest"),
  "/admin/create-ket-reading": () => import("../../features/cambridge/pages/CreateKETReadingTest"),
  "/admin/create-pet-listening": () => import("../../features/cambridge/pages/CreatePETListeningTest"),
  "/admin/create-pet-reading": () => import("../../features/cambridge/pages/CreatePETReadingTest"),
  "/admin/create-pet-writing": () => import("../../features/writing/pages/CreatePetWritingTest"),
  "/admin/create/flyers": () => import("../../features/cambridge/pages/CreateCambridgeTest"),
  "/admin/create/movers": () => import("../../features/cambridge/pages/CreateMoversReadingTest"),
  "/admin/create/starters": () => import("../../features/cambridge/pages/CreateCambridgeTest"),
  "/admin/create-movers-listening": () => import("../../features/cambridge/pages/CreateMoversListeningTest"),
  "/admin/cambridge-submissions": () => import("../../features/admin/pages/CambridgeSubmissionsPage"),
  "/admin/teacher-permissions": () => import("../../features/admin/pages/TeacherPermissionsPage"),
  "/admin/users": () => import("../../features/admin/pages/AdminUserManagement"),
};

const preloadAdminRoute = (path) => {
  const preloader = adminRoutePreloaders[path];
  if (!preloader) return;
  void preloader().catch(() => {});
};

const preloadAdminItems = (items = []) => {
  items.forEach((item) => {
    if (item?.to) preloadAdminRoute(item.to);
  });
};

const flattenAdminSections = (sections = []) =>
  sections.flatMap((section) => [
    ...(section.items || []),
    ...((section.groups || []).flatMap((group) => group.items || [])),
  ]);

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingNotifications, setPendingNotifications] = useState([]);
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
  const [mobileDrawerTab, setMobileDrawerTab] = useState("overview");
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

  const hasFeedback = (submission) =>
    String(submission?.feedback || "")
      .trim()
      .length > 0;

  const getSubmissionStatus = (submission) => {
    const explicitStatus = String(submission?.status || "").trim().toLowerCase();

    if (explicitStatus === "reviewed" || explicitStatus === "done") {
      return "done";
    }

    if (hasFeedback(submission) || String(submission?.feedbackBy || "").trim()) {
      return "done";
    }

    return "pending";
  };

  const isPendingSubmission = (submission) =>
    getSubmissionStatus(submission) === "pending";

  const getStudentName = (submission) =>
    submission?.studentName ||
    submission?.userName ||
    submission?.user?.name ||
    submission?.User?.name ||
    "N/A";

  const getStudentPhone = (submission) =>
    submission?.studentPhone ||
    submission?.userPhone ||
    submission?.user?.phone ||
    submission?.User?.phone ||
    "N/A";

  const getWritingCategoryLabel = (submission) => {
    const testType = String(
      submission?.writing_test?.testType ||
        submission?.WritingTest?.testType ||
        submission?.testType ||
        ""
    )
      .trim()
      .toLowerCase();

    return testType.includes("pet-writing") ? "PET Writing" : "Writing";
  };

  const buildPendingNotification = (submission, category, route) => ({
    key: `${category}-${submission.id}`,
    id: submission.id,
    category,
    route,
    studentName: getStudentName(submission),
    phone: getStudentPhone(submission),
    submittedAt: submission?.submittedAt || submission?.createdAt || null,
  });

  useEffect(() => {
    const readJsonOrThrow = async (path) => {
      const res = await fetch(apiPath(path));
      if (!res.ok) {
        throw new Error(`Request failed for ${path}`);
      }
      return res.json();
    };

    const fetchPendingNotifications = async () => {
      const [writingResult, readingResult, listeningResult, cambridgeResult] =
        await Promise.allSettled([
          readJsonOrThrow("writing/list"),
          readJsonOrThrow("reading-submissions/admin/list"),
          readJsonOrThrow("listening-submissions/admin/list"),
          readJsonOrThrow("cambridge/submissions?page=1&limit=100"),
        ]);

      if (writingResult.status === "rejected") {
        console.error("Failed to load writing notifications:", writingResult.reason);
      }
      if (readingResult.status === "rejected") {
        console.error("Failed to load reading notifications:", readingResult.reason);
      }
      if (listeningResult.status === "rejected") {
        console.error("Failed to load listening notifications:", listeningResult.reason);
      }
      if (cambridgeResult.status === "rejected") {
        console.error("Failed to load Orange notifications:", cambridgeResult.reason);
      }

      const writingSubmissions =
        writingResult.status === "fulfilled" && Array.isArray(writingResult.value)
          ? writingResult.value
          : [];
      const readingSubmissions =
        readingResult.status === "fulfilled" && Array.isArray(readingResult.value)
          ? readingResult.value
          : [];
      const listeningSubmissions =
        listeningResult.status === "fulfilled" && Array.isArray(listeningResult.value)
          ? listeningResult.value
          : [];
      const cambridgePayload =
        cambridgeResult.status === "fulfilled" ? cambridgeResult.value : null;
      const cambridgeSubmissions = Array.isArray(cambridgePayload?.submissions)
        ? cambridgePayload.submissions
        : Array.isArray(cambridgePayload)
        ? cambridgePayload
        : [];

      const nextNotifications = [
        ...writingSubmissions
          .filter(isPendingSubmission)
          .map((submission) =>
            buildPendingNotification(
              submission,
              getWritingCategoryLabel(submission),
              `/review/${submission.id}`
            )
          ),
        ...readingSubmissions
          .filter(isPendingSubmission)
          .map((submission) =>
            buildPendingNotification(
              submission,
              "Reading",
              `/admin/reading-submissions?submissionId=${submission.id}&action=feedback`
            )
          ),
        ...listeningSubmissions
          .filter(isPendingSubmission)
          .map((submission) =>
            buildPendingNotification(
              submission,
              "Listening",
              `/admin/listening-submissions?submissionId=${submission.id}&action=feedback`
            )
          ),
        ...cambridgeSubmissions
          .filter(isPendingSubmission)
          .map((submission) =>
            buildPendingNotification(
              submission,
              "Orange",
              `/admin/cambridge-submissions?submissionId=${submission.id}&action=review`
            )
          ),
      ].sort((left, right) => {
        const leftTime = new Date(left.submittedAt || 0).getTime();
        const rightTime = new Date(right.submittedAt || 0).getTime();
        return rightTime - leftTime;
      });

      setPendingNotifications(nextNotifications);
    };

    fetchPendingNotifications();
    const interval = setInterval(fetchPendingNotifications, 30000);
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

  useEffect(() => {
    if (!mobileDrawerOpen || typeof window === "undefined") return undefined;

    const warmupTimerId = window.setTimeout(() => {
      preloadAdminRoute("/admin/create-writing");
      preloadAdminRoute("/admin/create-reading");
      preloadAdminRoute("/admin/create-listening");
      preloadAdminRoute("/admin/create-pet-listening");
      preloadAdminRoute("/admin/create-pet-reading");
      preloadAdminRoute("/admin/create-pet-writing");
    }, 120);

    const timerId = window.setTimeout(() => {
      if (mobileDrawerTab === "ix") {
        preloadAdminItems(flattenAdminSections(ieltsSections));
        return;
      }

      if (mobileDrawerTab === "orange") {
        preloadAdminItems(flattenAdminSections(cambridgeSections));
        preloadAdminRoute("/admin/cambridge-submissions");
        return;
      }

      if (mobileDrawerTab === "admin") {
        preloadAdminItems(adminItems);
        return;
      }

      if (mobileDrawerTab === "review") {
        preloadAdminRoute("/review");
        preloadAdminRoute("/admin/writing-submissions");
        preloadAdminRoute("/admin/reading-submissions");
        preloadAdminRoute("/admin/listening-submissions");
        preloadAdminRoute("/admin/cambridge-submissions");
        return;
      }

      preloadAdminRoute("/select-test");
      preloadAdminRoute("/review");
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      window.clearTimeout(warmupTimerId);
    };
  }, [
    mobileDrawerOpen,
    mobileDrawerTab,
    mobileSubmissionSection,
    mobileCambridgeSection,
    mobileCambridgeGroup,
    user?.role,
    user?.canManageTests,
  ]);

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

  const getPreferredMobileDrawerTab = () => {
    const pathname = String(location?.pathname || "").toLowerCase();

    if (pathname.startsWith("/review")) return "review";
    if (pathname.includes("cambridge")) return "orange";
    if (
      pathname === "/select-test" ||
      pathname.startsWith("/admin/create") ||
      pathname.includes("submissions")
    ) {
      return "ix";
    }
    return "overview";
  };

  const closeMobileDrawer = () => setMobileDrawerOpen(false);
  const openMobileDrawer = () => {
    closeDesktopMenus();
    setMobileDrawerTab(getPreferredMobileDrawerTab());
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
  const handlePendingNotificationClick = (item) => {
    setNotificationDropdownVisible(false);
    setMobileDrawerOpen(false);
    navigate(item.route);
  };

  const buildLinkItem = (key, to, label, visible = true, iconName = null) =>
    visible ? { key, to, label, iconName } : null;

  const buildDisabledItem = (key, label, visible = true, iconName = null) =>
    visible ? { key, label, disabled: true, iconName } : null;

  const cambridgeSections = [
    {
      key: "ket",
      label: "KET",
      title: "KET (A2 Key)",
      iconName: "tests",
      items: [
        buildLinkItem(
          "ket-listening",
          "/admin/create-ket-listening",
          "KET Listening",
          canManageCategory(user, "listening"),
          "listening"
        ),
        buildLinkItem(
          "ket-reading",
          "/admin/create-ket-reading",
          "KET Reading",
          canManageCategory(user, "reading"),
          "reading"
        ),
      ].filter(Boolean),
    },
    {
      key: "pet",
      label: "PET",
      title: "PET (B1 Preliminary)",
      iconName: "tests",
      items: [
        buildLinkItem(
          "pet-listening",
          "/admin/create-pet-listening",
          "PET Listening",
          canManageCategory(user, "listening"),
          "listening"
        ),
        buildLinkItem(
          "pet-reading",
          "/admin/create-pet-reading",
          "PET Reading",
          canManageCategory(user, "reading"),
          "reading"
        ),
        buildLinkItem(
          "pet-writing",
          "/admin/create-pet-writing",
          "PET Writing",
          true,
          "writing"
        ),
      ].filter(Boolean),
    },
    {
      key: "yle",
      label: "YLE",
      title: "Young Learners",
      iconName: "tests",
      groups: [
        {
          key: "flyers",
          label: "Flyers",
          title: "Flyers (A2)",
          items: [
            buildDisabledItem("flyers-listening", "Listening (coming soon)", true, "listening"),
            buildLinkItem(
              "flyers-reading",
              "/admin/create/flyers",
              "Reading & Writing",
              canManageCategory(user, "reading"),
              "reading"
            ),
          ].filter(Boolean),
        },
        {
          key: "movers",
          label: "Movers",
          title: "Movers (A1)",
          items: [
            buildLinkItem(
              "movers-listening",
              "/admin/create-movers-listening",
              "Movers Listening",
              canManageCategory(user, "listening"),
              "listening"
            ),
            buildLinkItem(
              "movers-reading",
              "/admin/create/movers",
              "Reading & Writing",
              canManageCategory(user, "reading"),
              "reading"
            ),
          ].filter(Boolean),
        },
        {
          key: "starters",
          label: "Starters",
          title: "Starters (Pre-A1)",
          items: [
            buildDisabledItem("starters-listening", "Listening (coming soon)", true, "listening"),
            buildLinkItem(
              "starters-reading",
              "/admin/create/starters",
              "Reading & Writing",
              canManageCategory(user, "reading"),
              "reading"
            ),
          ].filter(Boolean),
        },
      ].filter((group) => group.items.some((item) => !item.disabled)),
    },
    {
      key: "management",
      label: "Management",
      title: "Management",
      iconName: "management",
      items: [
        buildLinkItem(
          "cambridge-submissions",
          "/admin/cambridge-submissions",
          "View submissions",
          true,
          "submissions"
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
      title: "Create",
      iconName: "create",
      items: [
        buildLinkItem(
          "create-writing",
          "/admin/create-writing",
          "Writing",
          canManageCategory(user, "writing"),
          "writing"
        ),
        buildLinkItem(
          "create-reading",
          "/admin/create-reading",
          "Reading",
          canManageCategory(user, "reading"),
          "reading"
        ),
        buildLinkItem(
          "create-listening",
          "/admin/create-listening",
          "Listening",
          canManageCategory(user, "listening"),
          "listening"
        ),
      ].filter(Boolean),
    },
    {
      key: "submissions",
      label: "Submissions",
      title: "Submissions",
      iconName: "submissions",
      items: [
        buildLinkItem(
          "writing-submissions",
          "/admin/writing-submissions",
          "Writing",
          true,
          "writing"
        ),
        buildLinkItem(
          "reading-submissions",
          "/admin/reading-submissions",
          "Reading",
          true,
          "reading"
        ),
        buildLinkItem(
          "listening-submissions",
          "/admin/listening-submissions",
          "Listening",
          true,
          "listening"
        ),
      ].filter(Boolean),
    },
  ].filter((section) => section.items.length > 0);

  const adminItems = [
    buildLinkItem(
      "teacher-permissions",
      "/admin/teacher-permissions",
      "Teacher Permissions",
      true,
      "permissions"
    ),
    buildLinkItem("users", "/admin/users", "User Management", true, "users"),
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

  const pendingNotificationCount = pendingNotifications.length;
  const pathname = String(location.pathname || "").toLowerCase();
  const isOrangeCurrent = pathname.includes("cambridge") || pathname.includes("pet-writing");
  const isIxCurrent =
    pathname.startsWith("/admin/create") ||
    pathname.includes("writing-submissions") ||
    pathname.includes("reading-submissions") ||
    pathname.includes("listening-submissions");
  const isTestListCurrent = pathname === "/select-test";
  const isReviewCurrent = pathname.startsWith("/review");
  const isAdminCurrent =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/teacher-permissions");

  const mobileDrawerTabs = [
    {
      key: "review",
      label: `Review${pendingNotificationCount > 0 ? ` (${pendingNotificationCount})` : ""}`,
    },
    { key: "ix", label: "IX" },
    { key: "orange", label: "Orange" },
    { key: "overview", label: "Overview" },
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
            {item.iconName ? (
              <span className="adminNavbar__menuItemIcon" aria-hidden="true">
                <NavIcon name={item.iconName} />
              </span>
            ) : null}
            <span>{item.label}</span>
          </span>
        );
      }

      return (
        <Link
          key={item.key}
          to={item.to}
          className={itemClassName}
          onMouseEnter={() => preloadAdminRoute(item.to)}
          onFocus={() => preloadAdminRoute(item.to)}
          onPointerDown={() => preloadAdminRoute(item.to)}
          onClick={(event) => {
            preloadAdminRoute(item.to);

            if (mobile) {
              event.preventDefault();
              flushSync(() => {
                onClose?.();
              });
              navigate(item.to);
              return;
            }

            onClose?.();
          }}
        >
          {item.iconName ? (
            <span className="adminNavbar__menuItemIcon" aria-hidden="true">
              <NavIcon name={item.iconName} />
            </span>
          ) : null}
          <span>{item.label}</span>
        </Link>
      );
    });

  const renderMobileQuickLink = (to, title, meta, iconName) => (
    <Link
      key={to}
      to={to}
      className="adminNavbar__mobileQuickLink"
      onMouseEnter={() => preloadAdminRoute(to)}
      onFocus={() => preloadAdminRoute(to)}
      onPointerDown={() => preloadAdminRoute(to)}
      onClick={(event) => {
        event.preventDefault();
        preloadAdminRoute(to);
        flushSync(() => {
          closeMobileDrawer();
        });
        navigate(to);
      }}
    >
      <span className="adminNavbar__mobileQuickIcon" aria-hidden="true">
        <NavIcon name={iconName} />
      </span>
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
          <span className="adminNavbar__menuHeaderContent">
            {section.iconName ? (
              <span className="adminNavbar__menuHeaderIcon" aria-hidden="true">
                <NavIcon name={section.iconName} />
              </span>
            ) : null}
            <span>{section.title}</span>
          </span>
        </div>
        {section.items ? renderMenuItems(section.items, onClose) : null}
        {section.groups
          ? section.groups.map((group) => (
              <React.Fragment key={group.key}>
                <div className="adminNavbar__menuHeader">
                  <span className="adminNavbar__menuHeaderContent">
                    <span>{group.title}</span>
                  </span>
                </div>
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
          <div className="adminNavbar__mobileMenuTitle">Orange</div>
          <div className="adminNavbar__mobileMenuHint">
            Multi-level menu with horizontal groups for easier teacher navigation.
          </div>
        </div>
        {renderMobileTabs(
          cambridgeSections,
          activeCambridgeSection.key,
          setMobileCambridgeSection
        )}
        <div
          key={`${activeCambridgeSection.key}-${activeCambridgeGroup?.key || "root"}`}
          className="adminNavbar__mobileAnimatedStage"
        >
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
        </div>
      </>
    );
  };

  const renderMobileSubmissionMenu = () => {
    if (!activeSubmissionSection) return null;

    return (
      <>
        <div className="adminNavbar__mobileMenuTop">
          <div className="adminNavbar__mobileMenuTitle">IX</div>
          <div className="adminNavbar__mobileMenuHint">
            Create and submissions are separated to keep the mobile menu cleaner.
          </div>
        </div>
        {renderMobileTabs(
          ieltsSections,
          activeSubmissionSection.key,
          setMobileSubmissionSection
        )}
        <div
          key={activeSubmissionSection.key}
          className="adminNavbar__mobileAnimatedStage"
        >
          <div className="adminNavbar__mobileMenuBody">
          <div className="adminNavbar__mobileSectionTitle">
            {activeSubmissionSection.title}
          </div>
          {renderMenuItems(activeSubmissionSection.items, closeMobileDrawer, true)}
        </div>
        </div>
      </>
    );
  };

  const renderMobileAdminMenu = () => (
    <>
      <div className="adminNavbar__mobileMenuTop">
        <div className="adminNavbar__mobileMenuTitle">Admin</div>
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
        <div className="adminNavbar__mobileMenuTitle">{user?.name || "Teacher"}</div>
        <div className="adminNavbar__mobileMenuHint">
          Open the sections below to manage tests, review submissions, and switch appearance.
        </div>
      </div>
      <div className="adminNavbar__mobileMenuBody adminNavbar__mobileMenuBody--compact">
        <div className="adminNavbar__mobileSectionTitle">Quick access</div>
        <div className="adminNavbar__mobileQuickGrid">
          {renderMobileQuickLink("/review", "Review", "Open review queue and submission flow", "review")}
          {renderMobileQuickLink("/select-test", "Test List", "Browse and edit available tests", "tests")}
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
          <span className="adminNavbar__mobileQuickIcon" aria-hidden="true">
            <NavIcon name="logout" />
          </span>
          <span className="adminNavbar__mobileQuickText">
            <span className="adminNavbar__mobileQuickTitle">Log Out</span>
            <span className="adminNavbar__mobileQuickMeta">Sign out of the teacher account</span>
          </span>
        </button>
      </div>
    </>
  );

  const renderMobileAlerts = () => (
    <>
      <div className="adminNavbar__mobileMenuTop">
        <div className="adminNavbar__mobileMenuTitle">Review & Alerts</div>
        <div className="adminNavbar__mobileMenuHint">
          Review queue first, then pending submissions across writing, reading, listening, and Orange.
        </div>
      </div>
      <div className="adminNavbar__mobileMenuBody adminNavbar__mobileMenuBody--compact">
        <div className="adminNavbar__mobileSectionTitle">Review queue</div>
        {renderMobileQuickLink("/review", "Open review queue", "Jump straight to the teacher review page", "inbox")}
        {pendingNotificationCount === 0 ? (
          <div className="adminNavbar__mobileEmptyState">No pending submissions.</div>
        ) : (
          <div className="adminNavbar__mobileAlertsList">
            {pendingNotifications.slice(0, 10).map((item) => (
              <button
                key={item.key}
                type="button"
                className="adminNavbar__mobileAlertItem"
                onClick={() => {
                  handlePendingNotificationClick(item);
                }}
              >
                <span className="adminNavbar__mobileAlertLine">
                  <span className="adminNavbar__mobileAlertIcon" aria-hidden="true"><NavIcon name="user" /></span>
                  <span className="adminNavbar__mobileAlertName">{item.category}: {item.studentName}</span>
                </span>
                <span className="adminNavbar__mobileAlertLine">
                  <span className="adminNavbar__mobileAlertIcon" aria-hidden="true"><NavIcon name="phone" /></span>
                  <span className="adminNavbar__mobileAlertMeta">{item.phone}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderMobileDrawerContent = () => {
    if (mobileDrawerTab === "review") {
      return renderMobileAlerts();
    }

    if (mobileDrawerTab === "orange") {
      return renderMobileCambridgeMenu();
    }

    if (mobileDrawerTab === "ix") {
      return renderMobileSubmissionMenu();
    }

    if (mobileDrawerTab === "admin") {
      return renderMobileAdminMenu();
    }

    return renderMobileOverview();
  };

  const mobileDrawer =
    mobileDrawerOpen && typeof document !== "undefined"
      ? createPortal(
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
                      Clean mobile navigation for review, tests, and account actions
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="adminNavbar__drawerClose"
                  onClick={closeMobileDrawer}
                  aria-label="Close navigation menu"
                >
                  <NavIcon name="close" />
                </button>
              </div>

              {renderMobileTabs(mobileDrawerTabs, mobileDrawerTab, setMobileDrawerTab)}

              <div
                key={mobileDrawerTab}
                className="adminNavbar__drawerContent adminNavbar__drawerStage"
              >
                {renderMobileDrawerContent()}
              </div>
            </aside>
          </>,
          document.body
        )
      : null;

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
            <span
              className={`adminNavbar__hamburger${
                mobileDrawerOpen ? " adminNavbar__hamburger--open" : ""
              }`}
              aria-hidden="true"
            >
              <span className="adminNavbar__hamburgerLine" />
              <span className="adminNavbar__hamburgerLine" />
              <span className="adminNavbar__hamburgerLine" />
            </span>
            <span className="adminNavbar__srOnly">
              {mobileDrawerOpen ? "Close menu" : "Open menu"}
            </span>
            {pendingNotificationCount > 0 && (
              <span className="adminNavbar__mobileMenuBadge">{pendingNotificationCount}</span>
            )}
          </button>
        </div>

        {mobileDrawer}
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
            className={`adminNavbar__link adminNavbar__dropdownToggle${isOrangeCurrent || cambridgeDropdownVisible ? " adminNavbar__link--active" : ""}`}
            onClick={() => setCambridgeDropdownVisible((prev) => !prev)}
            title="Orange"
          >
            <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="cambridge" /></span>
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
            className={`adminNavbar__link adminNavbar__dropdownToggle${isIxCurrent || submissionDropdownVisible ? " adminNavbar__link--active" : ""}`}
            onClick={() => setSubmissionDropdownVisible((prev) => !prev)}
            title="IX"
          >
            <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="tests" /></span>
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
        <Link to="/select-test" className={`adminNavbar__link${isTestListCurrent ? " adminNavbar__link--active" : ""}`} title="Test list">
          <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="tests" /></span>
          <span className="adminNavbar__label">Test List</span>
        </Link>

        <Link to="/review" className={`adminNavbar__link${isReviewCurrent ? " adminNavbar__link--active" : ""}`} title="Review">
          <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="review" /></span>
          <span className="adminNavbar__label">Review</span>
        </Link>

        {user?.role === 'admin' && (
          <div className="adminNavbar__dropdown" ref={adminDropdownRef}>
            <span
              className={`adminNavbar__link adminNavbar__dropdownToggle${isAdminCurrent || adminDropdownVisible ? " adminNavbar__link--active" : ""}`}
              onClick={() => setAdminDropdownVisible(!adminDropdownVisible)}
              title="Admin"
            >
              <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="admin" /></span>
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
            `adminNavbar__bell${pendingNotificationCount > 0 ? " adminNavbar__bell--shake" : ""}${notificationDropdownVisible ? " adminNavbar__bell--active" : ""}`
          }
          onClick={() =>
            setNotificationDropdownVisible(!notificationDropdownVisible)
          }
          title="Pending submissions"
        >
          <NavIcon name="notifications" />
          {pendingNotificationCount > 0 && (
            <span className="adminNavbar__badge">
              {pendingNotificationCount}
            </span>
          )}
        </div>

        {notificationDropdownVisible && (
          <div ref={notificationDropdownRef} className="adminNavbar__notifyMenu">
            {pendingNotificationCount === 0 ? (
              <div>No pending submissions</div>
            ) : (
              pendingNotifications.map((item) => (
                <div
                  key={item.key}
                  className="adminNavbar__notifyItem"
                  onClick={() => {
                    handlePendingNotificationClick(item);
                  }}
                >
                  <div className="adminNavbar__notifyItemRow">
                    <span className="adminNavbar__notifyItemIcon" aria-hidden="true"><NavIcon name="user" /></span>
                    <span>{item.category}: {item.studentName}</span>
                  </div>
                  <div className="adminNavbar__notifyItemMeta">
                    <span className="adminNavbar__notifyItemIcon" aria-hidden="true"><NavIcon name="phone" /></span>
                    <span>{item.phone}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 👨‍🏫 Hiển thị tên giáo viên và nút logout */}
      <div className="adminNavbar__right">
        <ThemeToggle />
        <span className="adminNavbar__teacherName">
          <span className="adminNavbar__icon adminNavbar__icon--user" aria-hidden="true"><NavIcon name="user" /></span>
          <span>{user?.name || "Teacher"}</span>
        </span>
        <button
          onClick={handleLogout}
          className="adminNavbar__logout"
          title="Logout"
        >
          <span className="adminNavbar__icon" aria-hidden="true"><NavIcon name="logout" /></span>
          <span className="adminNavbar__logoutLabel">Log Out</span>
        </button>
      </div>

    </nav>
  );
};

export default AdminNavbar;
