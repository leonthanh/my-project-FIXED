import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Split from "react-split";
import {
  apiPath,
  hostPath,
  redirectToLogin,
  clearAuth,
  getStoredUser,
  hasStoredSession,
} from "../../../shared/utils/api";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../shared/utils/testTiming";
import { getRuntimeSyncRateLimitMessage } from "../../../shared/utils/runtimeRateLimit";
import ExtensionToast from "../../../shared/components/ExtensionToast";
import TestStartModal from "../../../shared/components/TestStartModal";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  buildPlacementAttemptPath,
  readPlacementRuntimeContext,
} from "../../../shared/utils/placementTests";
import "./WritingTest.css";

const SERVER_AUTOSAVE_INTERVAL_MS = 30000;
const SERVER_TIMING_RECONCILE_INTERVAL_MS = 25000;
const LOCAL_AUTOSAVE_DEBOUNCE_MS = 500;

const hasMeaningfulWritingContent = (task1, task2) => {
  return (
    (typeof task1 === "string" && task1.trim().length > 0) ||
    (typeof task2 === "string" && task2.trim().length > 0)
  );
};

const progressRingStyle = {
  width: 40,
  height: 40,
  position: "relative",
  marginLeft: 10,
};

const createWritingRuntimeTheme = (isDarkMode = false) => {
  const colors = isDarkMode
    ? {
        pageBg: "linear-gradient(180deg, #081122 0%, #0d172d 48%, #0a1326 100%)",
        pageAccent: "radial-gradient(circle at 16% 10%, rgba(59, 130, 246, 0.16), transparent 24%), radial-gradient(circle at 84% 12%, rgba(16, 185, 129, 0.12), transparent 20%)",
        surface: "rgba(10, 18, 34, 0.9)",
        surfaceRaised: "rgba(17, 28, 52, 0.94)",
        surfaceSoft: "rgba(22, 33, 62, 0.96)",
        border: "rgba(75, 95, 132, 0.46)",
        text: "#ecf2ff",
        textMuted: "#bfd0f5",
        heading: "#f8fbff",
        primary: "#0f3f94",
        primaryStrong: "#2563eb",
        accent: "#ff3b66",
        accentStrong: "#ff6b81",
        footer: "rgba(11, 19, 35, 0.96)",
        inactiveButton: "rgba(191, 208, 245, 0.12)",
        inactiveButtonText: "#d7e3fb",
        shadow: "0 24px 64px rgba(2, 6, 23, 0.35)",
        gutter: "rgba(255, 59, 102, 0.72)",
        statusBg: "rgba(249, 115, 22, 0.12)",
        statusBorder: "rgba(251, 146, 60, 0.4)",
        statusText: "#fdba74",
        successBg: "rgba(34, 197, 94, 0.12)",
        successText: "#86efac",
        errorBg: "rgba(239, 68, 68, 0.12)",
        errorText: "#fca5a5",
      }
    : {
        pageBg: "linear-gradient(180deg, #f4f8ff 0%, #eef4ff 46%, #f8fbff 100%)",
        pageAccent: "radial-gradient(circle at 16% 10%, rgba(96, 165, 250, 0.2), transparent 24%), radial-gradient(circle at 84% 12%, rgba(14, 165, 233, 0.14), transparent 20%)",
        surface: "rgba(255, 255, 255, 0.94)",
        surfaceRaised: "rgba(255, 255, 255, 0.96)",
        surfaceSoft: "rgba(248, 251, 255, 0.98)",
        border: "rgba(214, 224, 239, 0.92)",
        text: "#132238",
        textMuted: "#5d6b82",
        heading: "#11203d",
        primary: "#0e276f",
        primaryStrong: "#1d4ed8",
        accent: "#e03",
        accentStrong: "#ff6b6b",
        footer: "rgba(255, 255, 255, 0.96)",
        inactiveButton: "#e7edf7",
        inactiveButtonText: "#42516d",
        shadow: "0 24px 70px rgba(30, 64, 175, 0.08)",
        gutter: "rgba(224, 0, 51, 0.7)",
        statusBg: "#fff7ed",
        statusBorder: "#fdba74",
        statusText: "#9a3412",
        successBg: "#f0fdf4",
        successText: "#166534",
        errorBg: "#fef2f2",
        errorText: "#b91c1c",
      };

  return {
    colors,
    root: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: `${colors.pageAccent}, ${colors.pageBg}`,
      color: colors.text,
    },
    loadingState: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 50,
      background: `${colors.pageAccent}, ${colors.pageBg}`,
      color: colors.text,
    },
    feedbackBlock: {
      marginTop: 30,
      padding: 18,
      borderRadius: 18,
      border: `1px solid ${colors.border}`,
      background: colors.surface,
      boxShadow: colors.shadow,
    },
    answerPreview: {
      whiteSpace: "pre-line",
      border: `1px solid ${colors.border}`,
      padding: 14,
      borderRadius: 14,
      background: colors.surface,
      color: colors.text,
    },
    header: {
      background: "linear-gradient(135deg, #0e276f 0%, #1a3a8f 100%)",
      color: "white",
      padding: "0 16px",
      height: 50,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: isDarkMode ? "0 18px 36px rgba(2, 6, 23, 0.28)" : "0 2px 10px rgba(14, 39, 111, 0.2)",
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 10 },
    headerRight: { display: "flex", alignItems: "center", gap: 10 },
    badge: {
      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentStrong} 100%)`,
      padding: "4px 10px",
      borderRadius: 12,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.5,
    },
    headerTitle: { fontWeight: 600, fontSize: 18 },
    timer: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(255,255,255,0.15)",
      padding: "0 10px",
      borderRadius: 8,
      backdropFilter: "blur(10px)",
      fontSize: 15,
    },
    progressText: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      textAlign: "center",
      fontSize: 13,
      lineHeight: 1,
      color: "white",
    },
    submitButtonHeader: (isSubmitting) => ({
      background: isSubmitting ? "#999" : colors.accent,
      color: "#fff",
      border: "none",
      padding: "8px 16px",
      borderRadius: 10,
      fontWeight: 700,
      cursor: isSubmitting ? "not-allowed" : "pointer",
      fontSize: 15,
      opacity: isSubmitting ? 0.85 : 1,
      boxShadow: isDarkMode && !isSubmitting ? "0 10px 22px rgba(255, 59, 102, 0.18)" : "none",
    }),
    statusBanner: {
      margin: "16px 24px 0",
      borderRadius: 12,
      padding: "12px 16px",
      background: colors.statusBg,
      border: `1px solid ${colors.statusBorder}`,
      color: colors.statusText,
      fontSize: 14,
      lineHeight: 1.5,
      boxShadow: isDarkMode ? "0 10px 25px rgba(15, 23, 42, 0.18)" : "0 10px 25px rgba(249, 115, 22, 0.08)",
    },
    split: {
      flexGrow: 1,
      overflow: "hidden",
      height: "100%",
      display: "flex",
    },
    leftPane: {
      padding: "24px 24px 28px",
      height: "auto",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Manrope', 'Segoe UI', sans-serif",
      background: colors.surfaceRaised,
      color: colors.text,
      boxShadow: isDarkMode ? "inset -1px 0 0 rgba(75, 95, 132, 0.3)" : "inset -1px 0 0 rgba(214, 224, 239, 0.92)",
    },
    rightPane: {
      padding: 24,
      background: colors.surfaceSoft,
      color: colors.text,
      boxShadow: isDarkMode ? "inset 1px 0 0 rgba(75, 95, 132, 0.3)" : "inset 1px 0 0 rgba(214, 224, 239, 0.92)",
    },
    sectionHeading: {
      margin: "0 0 18px",
      color: colors.heading,
      letterSpacing: "0.02em",
    },
    answerHeading: {
      margin: "0 0 16px",
      color: colors.heading,
    },
    textarea: {
      width: "100%",
      padding: 16,
      overflow: "auto",
      boxSizing: "border-box",
      fontSize: "18px",
      fontFamily: "'IBM Plex Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      marginBottom: "12px",
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      outline: "none",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
      background: colors.surface,
      color: colors.text,
      boxShadow: isDarkMode ? "inset 0 2px 10px rgba(2, 6, 23, 0.25)" : "inset 0 2px 10px rgba(14, 39, 111, 0.05)",
    },
    footer: {
      display: "flex",
      justifyContent: "center",
      padding: 10,
      background: colors.footer,
      borderTop: `1px solid ${colors.border}`,
      boxShadow: isDarkMode ? "0 -16px 32px rgba(2, 6, 23, 0.18)" : "none",
    },
    submitButton: (isSubmitting) => ({
      margin: "0 10px",
      padding: "10px 20px",
      border: "none",
      borderRadius: "12px",
      fontSize: "16px",
      backgroundColor: isSubmitting ? "#999" : colors.accent,
      color: "white",
      cursor: isSubmitting ? "not-allowed" : "pointer",
      opacity: isSubmitting ? 0.85 : 1,
      boxShadow: isDarkMode && !isSubmitting ? "0 12px 22px rgba(255, 59, 102, 0.18)" : "none",
    }),
    messageBanner: (message) => {
      const isSuccess = message.toLowerCase().includes("success");
      return {
        textAlign: "center",
        padding: "8px 12px 14px",
        color: isSuccess ? colors.successText : colors.errorText,
        fontWeight: 600,
        background: isSuccess ? colors.successBg : colors.errorBg,
        borderTop: `1px solid ${colors.border}`,
      };
    },
    taskButton: (isActive) => ({
      margin: "0 10px",
      padding: "10px 20px",
      border: "none",
      borderRadius: "12px",
      fontSize: "16px",
      background: isActive
        ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryStrong} 100%)`
        : colors.inactiveButton,
      color: isActive ? "#fff" : colors.inactiveButtonText,
      cursor: "pointer",
      boxShadow: isActive && isDarkMode ? "0 12px 22px rgba(37, 99, 235, 0.18)" : "none",
    }),
  };
};

const WritingTest = () => {
  const { isDarkMode } = useTheme();
  const { id: routeTestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMemo(() => createWritingRuntimeTheme(isDarkMode), [isDarkMode]);
  const placementContext = useMemo(
    () => readPlacementRuntimeContext({ pathname: location.pathname, search: location.search }),
    [location.pathname, location.search]
  );
  const isPlacementRuntime = Boolean(
    placementContext.isPlacementRuntime && placementContext.placementAttemptItemToken
  );
  // Resolve user ID early so all localStorage keys are per-user (prevents student A
  // seeing student B's draft when logging in on the same device)
  const user = getStoredUser();
  const uid = isPlacementRuntime && placementContext.placementAttemptItemToken
    ? `placement:${placementContext.placementAttemptItemToken}`
    : user?.id || 'anon';
  const exitPath = useMemo(
    () => (
      isPlacementRuntime && placementContext.placementAttemptToken
        ? buildPlacementAttemptPath(placementContext.placementAttemptToken)
        : "/select-test"
    ),
    [isPlacementRuntime, placementContext.placementAttemptToken]
  );
  const writingTask1Key   = `writing_task1:${uid}`;
  const writingTask2Key   = `writing_task2:${uid}`;
  const writingTimeKey    = `writing_timeLeft:${uid}`;
  const writingStartedKey = `writing_started:${uid}`;
  const writingEndAtKey   = `writing_endAt:${uid}`;
  const [task1, setTask1] = useState(
    localStorage.getItem(writingTask1Key) || ""
  );
  const [task2, setTask2] = useState(
    localStorage.getItem(writingTask2Key) || ""
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(writingTimeKey);
    return saved ? parseInt(saved, 10) : 60 * 60;
  });
  const [endAt, setEndAt] = useState(() => {
    const saved = localStorage.getItem(writingEndAtKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [started, setStarted] = useState(
    localStorage.getItem(writingStartedKey) === "true"
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTask, setActiveTask] = useState("task1");
  const [testData, setTestData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [selectedTestId, setSelectedTestId] = useState(() => {
    if (isPlacementRuntime && routeTestId) {
      return String(routeTestId);
    }

    return localStorage.getItem("selectedTestId") || "";
  });
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const [runtimeLimitToast, setRuntimeLimitToast] = useState("");
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        setEndAt(expiresAtMs);
        try {
          localStorage.setItem(writingEndAtKey, String(expiresAtMs));
        } catch (_err) {
          // ignore storage errors
        }
        setTimeLeft(getRemainingSeconds(expiresAtMs));
        setGraceRemaining(getGraceRemainingSeconds(expiresAtMs));
        return true;
      }

      setEndAt(0);
      setGraceRemaining(0);
      if (fallbackSeconds !== null) {
        setTimeLeft(fallbackSeconds);
      }
      return false;
    },
    [writingEndAtKey]
  );

  const announceExtension = useCallback((nextExpiresAtValue, previousExpiresAtValue) => {
    const nextExpiresAtMs = toTimestamp(nextExpiresAtValue);
    const message = getExtensionToastMessage(previousExpiresAtValue, nextExpiresAtMs);
    const lastAnnouncedMs = toTimestamp(lastAnnouncedExpiryRef.current);

    if (!message || !Number.isFinite(nextExpiresAtMs)) return;
    if (Number.isFinite(lastAnnouncedMs) && Math.abs(lastAnnouncedMs - nextExpiresAtMs) <= 1000) {
      return;
    }

    lastAnnouncedExpiryRef.current = nextExpiresAtMs;
    setExtensionToast(message);
  }, []);

  useEffect(() => {
    if (!extensionToast) return;
    const timeoutId = setTimeout(() => setExtensionToast(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [extensionToast]);

  useEffect(() => {
    if (!runtimeLimitToast) return;
    const timeoutId = setTimeout(() => setRuntimeLimitToast(""), 6500);
    return () => clearTimeout(timeoutId);
  }, [runtimeLimitToast]);

  // Save writing content to localStorage as the student types (debounced).
  // The server is only synced periodically to avoid rate-limiting and dropped connections.
  useEffect(() => {
    let debounceId;
    const persistLocal = () => {
      try {
        localStorage.setItem(writingTask1Key, task1);
        localStorage.setItem(writingTask2Key, task2);
      } catch (_err) {
        // ignore storage errors
      }
    };
    debounceId = setTimeout(persistLocal, LOCAL_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(debounceId);
  }, [task1, task2, writingTask1Key, writingTask2Key]);

  useEffect(() => {
    localStorage.setItem(writingTimeKey, timeLeft.toString());
  }, [timeLeft, writingTimeKey]);

  useEffect(() => {
    localStorage.setItem(writingStartedKey, started.toString());
  }, [started, writingStartedKey]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (isPlacementRuntime) {
      return;
    }

    if (!user || !hasStoredSession()) {
      redirectToLogin({ replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlacementRuntime, user]);

  useEffect(() => {
    if (!isPlacementRuntime || !routeTestId) return;

    const nextTestId = String(routeTestId);
    if (nextTestId !== selectedTestId) {
      setSelectedTestId(nextTestId);
    }
  }, [isPlacementRuntime, routeTestId, selectedTestId]);

  useEffect(() => {
    if (isPlacementRuntime || !selectedTestId) return;
    if (!selectedTestId) return;
    localStorage.setItem("selectedTestId", String(selectedTestId));
  }, [isPlacementRuntime, selectedTestId]);

  // Restore latest draft from server so students can continue on another device.
  useEffect(() => {
    let cancelled = false;

    const loadServerDraft = async () => {
      const numericTestId = Number(selectedTestId || routeTestId);

      if (isPlacementRuntime) {
        if (!placementContext.placementAttemptItemToken || !Number.isFinite(numericTestId) || numericTestId <= 0) {
          setIsHydratingDraft(false);
          return;
        }
      } else if (!user?.id) {
        setIsHydratingDraft(false);
        return;
      }

      try {
        const storedTestId = isPlacementRuntime
          ? String(routeTestId || selectedTestId || "")
          : localStorage.getItem("selectedTestId") || "";
        const params = new URLSearchParams();

        if (isPlacementRuntime) {
          params.set("placementAttemptItemToken", placementContext.placementAttemptItemToken);
          params.set("testId", String(numericTestId));
        } else {
          params.set("userId", String(user.id));
          const scopedTestId = Number(storedTestId);
          if (Number.isFinite(scopedTestId) && scopedTestId > 0) {
            params.set("testId", String(scopedTestId));
          }
        }

        const res = await fetch(apiPath(`writing/draft/active?${params.toString()}`));
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const draft = data?.submission;
        if (!draft) return;

        const draftTestId = Number(draft.testId);
        if (!isPlacementRuntime && !storedTestId && Number.isFinite(draftTestId) && draftTestId > 0) {
          const nextTestId = String(draftTestId);
          localStorage.setItem("selectedTestId", nextTestId);
          setSelectedTestId(nextTestId);
        }

        setTask1(typeof draft.task1 === "string" ? draft.task1 : "");
        setTask2(typeof draft.task2 === "string" ? draft.task2 : "");

        if (Number.isFinite(Number(draft.timeLeft))) {
          setTimeLeft(Number(draft.timeLeft));
        }

        if (draft.draftEndAt) {
          syncTimingState(draft.draftEndAt);
        }

        if (typeof draft.draftStarted === "boolean") {
          setStarted(Boolean(draft.draftStarted));
        }
      } catch (err) {
        console.error("Error loading writing draft:", err);
      } finally {
        if (!cancelled) setIsHydratingDraft(false);
      }
    };

    loadServerDraft();

    return () => {
      cancelled = true;
    };
  }, [
    isPlacementRuntime,
    placementContext.placementAttemptItemToken,
    routeTestId,
    selectedTestId,
    syncTimingState,
    user?.id,
  ]);

  useEffect(() => {
    if (isHydratingDraft) return;
    if (!selectedTestId) {
      setMessage("Cannot find the selected writing test.");
      return;
    }

    const fetchTestData = async () => {
      try {
        const res = await fetch(
          apiPath(`writing-tests/detail/${selectedTestId}`)
        );
        if (!res.ok) {
          throw new Error(`Error ${res.status}: The test could not be found.`);
        }
        const data = await res.json();
        setTestData(data);
      } catch (err) {
        console.error("Failed to load writing test:", err);
        setMessage("Cannot load the writing test. Please go back and choose it again.");
      }
    };

    fetchTestData();
  }, [selectedTestId, isHydratingDraft]);

  const lastServerSaveAtRef = useRef(0);

  const saveDraftToServer = useCallback(async () => {
    if (isHydratingDraft || submitted) return;
    if (!isPlacementRuntime && !user?.id) return;

    const numericTestId = parseInt(selectedTestId || routeTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) return;

    const now = Date.now();
    // Guard against accidental bursts from effect re-runs / rapid calls.
    if (now - lastServerSaveAtRef.current < SERVER_AUTOSAVE_INTERVAL_MS - 1000) {
      return;
    }

    // Don't create an empty server draft before the student has typed anything.
    if (!hasMeaningfulWritingContent(task1, task2)) {
      return;
    }

    lastServerSaveAtRef.current = now;

    try {
      const payload = {
        testId: numericTestId,
        task1,
        task2,
        timeLeft,
        endAt,
        started,
      };

      if (user) {
        payload.user = {
          id: user.id,
          name: user.name,
          phone: user.phone,
        };
      }

      if (isPlacementRuntime && placementContext.placementAttemptItemToken) {
        payload.placementAttemptItemToken = placementContext.placementAttemptItemToken;
      }

      const res = await fetch(apiPath("writing/draft/autosave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const runtimeMessage = getRuntimeSyncRateLimitMessage(res.status, data || {});
        if (runtimeMessage) {
          setRuntimeLimitToast(runtimeMessage);
        }
        return;
      }

      setRuntimeLimitToast("");
      const nextEndAt = data?.timing?.expiresAt || data?.draftEndAt;
      if (nextEndAt) {
        announceExtension(nextEndAt, endAt);
        syncTimingState(nextEndAt);
      }
    } catch (err) {
      console.error("Error autosaving writing draft:", err);
    }
  }, [
    announceExtension,
    endAt,
    isHydratingDraft,
    isPlacementRuntime,
    placementContext.placementAttemptItemToken,
    routeTestId,
    selectedTestId,
    started,
    submitted,
    syncTimingState,
    task1,
    task2,
    timeLeft,
    user,
  ]);

  const reconcileServerTiming = useCallback(async () => {
    if (isHydratingDraft || submitted || !started) return;
    if (!isPlacementRuntime && !user?.id) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const numericTestId = Number(selectedTestId || routeTestId);
    if (!Number.isFinite(numericTestId) || numericTestId <= 0) return;

    try {
      const params = new URLSearchParams();

      if (isPlacementRuntime) {
        params.set("placementAttemptItemToken", placementContext.placementAttemptItemToken);
      } else {
        params.set("userId", String(user.id));
      }
      params.set("testId", String(numericTestId));

      const res = await fetch(apiPath(`writing/draft/active?${params.toString()}`));
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const nextEndAt = data?.submission?.draftEndAt || data?.timing?.expiresAt;
      const nextEndAtMs = toTimestamp(nextEndAt);
      const currentEndAtMs = toTimestamp(endAt);

      if (
        Number.isFinite(nextEndAtMs) &&
        (!Number.isFinite(currentEndAtMs) || Math.abs(nextEndAtMs - currentEndAtMs) > 1000)
      ) {
        announceExtension(nextEndAtMs, currentEndAtMs);
        syncTimingState(nextEndAtMs);
      }
    } catch (_err) {
      // ignore polling errors; autosave and refresh can still recover timing
    }
  }, [
    announceExtension,
    endAt,
    isHydratingDraft,
    isPlacementRuntime,
    placementContext.placementAttemptItemToken,
    routeTestId,
    selectedTestId,
    started,
    submitted,
    syncTimingState,
    user?.id,
  ]);

  useEffect(() => {
    if (isHydratingDraft || submitted) return;
    if ((!isPlacementRuntime && !user?.id) || !selectedTestId) return;

    const intervalId = setInterval(() => {
      saveDraftToServer();
    }, SERVER_AUTOSAVE_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveDraftToServer();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isHydratingDraft, isPlacementRuntime, saveDraftToServer, selectedTestId, submitted, user?.id]);

  useEffect(() => {
    if (isHydratingDraft || submitted || !started) return;
    if ((!isPlacementRuntime && !user?.id) || !selectedTestId) return;

    reconcileServerTiming();
    const intervalId = setInterval(
      reconcileServerTiming,
      SERVER_TIMING_RECONCILE_INTERVAL_MS
    );
    const onCheck = () => {
      if (document.visibilityState !== "hidden") {
        reconcileServerTiming();
      }
    };

    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [isHydratingDraft, isPlacementRuntime, reconcileServerTiming, selectedTestId, started, submitted, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const numericTestId = parseInt(selectedTestId || routeTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) {
      setMessage("Cannot find a valid test ID to submit.");
      return;
    }

    // Save latest draft once before final submit to minimize data loss on flaky networks.
    try {
      await saveDraftToServer();
    } catch (_err) {
      // Ignore: submit can still proceed; autosave retry exists.
    }

    setIsSubmitting(true);

    try {
      const payload = {
        task1,
        task2,
        timeLeft,
        testId: numericTestId,
      };

      if (user) {
        payload.user = user;
      }

      if (isPlacementRuntime && placementContext.placementAttemptItemToken) {
        payload.placementAttemptItemToken = placementContext.placementAttemptItemToken;
      }

      const res = await fetch(apiPath("writing/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "The server did not confirm the submission.");
      }

      setSubmitted(true);
      setMessage(data.message || "Submission completed successfully.");

      if (!isPlacementRuntime && user?.id) {
        fetch(apiPath("writing/draft/clear"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: numericTestId,
            user: { id: user.id },
          }),
        }).catch(() => {});
      }

      localStorage.removeItem(writingTask1Key);
      localStorage.removeItem(writingTask2Key);
      localStorage.removeItem(writingTimeKey);
      localStorage.removeItem(writingStartedKey);
      localStorage.removeItem(writingEndAtKey);
      if (!isPlacementRuntime) {
        localStorage.removeItem("selectedTestId");
      }

      navigate(exitPath, { replace: true });
    } catch (err) {
      console.error("Submit writing failed:", err);
      setSubmitted(false);
      setMessage(`Could not submit: ${err?.message || "Submission failed."}`);
      autoSubmittingRef.current = false;
      await saveDraftToServer();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    exitPath,
    isPlacementRuntime,
    isSubmitting,
    navigate,
    placementContext.placementAttemptItemToken,
    routeTestId,
    saveDraftToServer,
    selectedTestId,
    task1,
    task2,
    timeLeft,
    user,
    writingEndAtKey,
    writingStartedKey,
    writingTask1Key,
    writingTask2Key,
    writingTimeKey,
  ]);

  // keep a stable ref to the submit function so the timer effect doesn't re-run when
  // handleSubmit changes on typing (avoids interval reset)
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // persist endAt so we can resume after reload
  useEffect(() => {
    if (endAt) {
      localStorage.setItem(writingEndAtKey, endAt.toString());
    } else {
      localStorage.removeItem(writingEndAtKey);
    }
  }, [endAt, writingEndAtKey]);

  // when starting, if we don't already have an endAt, set it using current timeLeft
  useEffect(() => {
    if (started && !endAt) {
      syncTimingState(Date.now() + timeLeft * 1000, timeLeft);
    }
  }, [started, endAt, syncTimingState, timeLeft]);

  // TIMER: dựa trên endAt, không phụ thuộc timeLeft (tránh reset interval khi re-render do typing)
  useEffect(() => {
    if (!started || submitted || isSubmitting || !endAt) return;

    const tick = () => {
      const remain = getRemainingSeconds(endAt);
      const nextGraceRemaining = getGraceRemainingSeconds(endAt);
      setTimeLeft(remain);
      setGraceRemaining(nextGraceRemaining);
      if (
        remain <= 0 &&
        !autoSubmittingRef.current
      ) {
        autoSubmittingRef.current = true;
        if (submitRef.current) submitRef.current();
      }
    };

    // chạy ngay 1 lần để sync UI
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // CHÚ Ý: không thêm timeLeft/handleSubmit vào dependency!
  }, [started, submitted, isSubmitting, endAt]);

  const formatTime = (seconds) => formatClock(seconds);

  useEffect(() => {
    if (isPlacementRuntime || !user || !user.phone) return;

    fetch(apiPath("writing/list"))
      .then((res) => res.json())
      .then((list) => {
        const last = list.find((item) => item.user?.phone === user.phone);
        if (last) setFeedback(last.feedback || "");
      })
      .catch((err) => console.error("Failed to load teacher feedback:", err));
  }, [isPlacementRuntime, submitted, user]);

  const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  if (message && !testData) {
    return <div style={theme.loadingState}>{message}</div>;
  }

  if (!testData) return <div style={theme.loadingState}>Loading writing test...</div>;

  if (submitted) {
    return (
      <div style={theme.loadingState}>
        <h2>Submission completed</h2>
        <p>{message}</p>
        {isPlacementRuntime ? <p>Returning to your placement test list...</p> : null}

        <div style={theme.feedbackBlock}>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="writing" size={16} />Task 1:</h3>
          <p style={theme.answerPreview}>
            {task1}
          </p>
        </div>

        <div style={theme.feedbackBlock}>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="writing" size={16} />Task 2:</h3>
          <p style={theme.answerPreview}>
            {task2}
          </p>
        </div>

        {feedback && (
          <div style={theme.feedbackBlock}>
            <h3>Teacher feedback</h3>
            <p style={{ whiteSpace: "pre-line" }}>{feedback}</p>
          </div>
        )}
      </div>
    );
  }

  // Modal bắt đầu làm bài
  if (!started) {
    const writingStartMinutes =
      Number.isFinite(timeLeft) && timeLeft > 0 ? Math.ceil(timeLeft / 60) : 60;

    return (
      <TestStartModal
        iconName="writing"
        eyebrow="IX Writing"
        subtitle="Writing Test"
        title={testData?.title || "IX Writing"}
        stats={[
          { value: writingStartMinutes, label: "Minutes", tone: "sky" },
          { value: 2, label: "Tasks", tone: "green" },
        ]}
        statsMinWidth={140}
        noticeTitle="Important note"
        noticeContent={
          <>
            The timer starts as soon as you press Start. The system auto-saves both Task 1 and Task 2 while you work, but you should still review your answers before submitting.
          </>
        }
        secondaryLabel={isPlacementRuntime ? "Back to placement" : "Cancel"}
        onSecondary={() => navigate(exitPath, { replace: true })}
        primaryLabel="Start test"
        darkContent={isDarkMode}
        onPrimary={() => {
          autoSubmittingRef.current = false;
          syncTimingState(Date.now() + timeLeft * 1000, timeLeft);
          setStarted(true);
        }}
        zIndex={9999}
      />
    );
  }

  // Tính progress cho vòng tròn
  const totalWords = countWords(task1) + countWords(task2);
  const minWords = 150 + 250;
  const progress = Math.min(totalWords / minWords, 1);
  // Header đồng bộ với Reading
  return (
    <div style={theme.root}>
      <ExtensionToast message={extensionToast} />
      <ExtensionToast message={runtimeLimitToast} label="Autosave" tone="warning" top={152} />
      <header style={theme.header}>
        <div style={theme.headerLeft}>
          <div style={theme.badge}>IX</div>
          <span style={theme.headerTitle}>
            IX - WRITING TEST
          </span>
        </div>
        <div style={theme.headerRight}>
          <div style={theme.timer}>
            <span style={{ marginRight: 4, display: "inline-flex", alignItems: "center" }}><InlineIcon name="clock" size={18} /></span>
            <span
              style={{
                fontWeight: 700,
                fontFamily: "Courier New, monospace",
                fontSize: 18,
              }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 13, marginLeft: 6, opacity: 0.7 }}>
              REMAINING
            </span>
          </div>
          {/* Progress Ring giống Reading */}
          <div style={progressRingStyle}>
            <svg viewBox="0 0 36 36" style={{ width: 40, height: 40 }}>
              <path
                style={{
                  fill: "none",
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 3,
                }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                style={{
                  fill: "none",
                  stroke: "#2ecc71",
                  strokeWidth: 3,
                  strokeLinecap: "round",
                }}
                strokeDasharray={`${Math.round(progress * 100)}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div style={theme.progressText}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {totalWords}
              </span>
              <span style={{ opacity: 0.7, fontSize: 12 }}>/400</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            style={theme.submitButtonHeader(isSubmitting)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {started && !submitted && timeLeft === 0 && graceRemaining > 0 && (
        <div style={theme.statusBanner}>
          <strong>Official time is over.</strong> The system keeps your answers for another {formatTime(graceRemaining)} in case of power loss or page reload. Your teacher can extend the time if needed.
        </div>
      )}

      <Split
        key={isDarkMode ? "writing-runtime-dark" : "writing-runtime-light"}
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction={isMobile ? "vertical" : "horizontal"}
        gutter={() => {
          if (typeof document === "undefined") return null;
          const gutter = document.createElement("div");
          gutter.style.backgroundColor = theme.colors.gutter;
          gutter.style.backgroundRepeat = "no-repeat";
          gutter.style.backgroundPosition = "50%";
          return gutter;
        }}
        style={{
          ...theme.split,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div style={theme.leftPane}>
          {activeTask === "task1" && (
            <>
              <h2 style={theme.sectionHeading}>WRITING TASK 1</h2>
              <div
                className="writing-test-prompt"
                dangerouslySetInnerHTML={{ __html: testData.task1 }}
              />
              {testData.task1Image && (
                <img
                  src={hostPath(testData.task1Image)}
                  alt="Task 1"
                  style={{ maxWidth: "80%" }}
                />
              )}
              {/* <p>
                <i>Write at least 150 words.</i>
              </p> */}
            </>
          )}

          {activeTask === "task2" && (
            <>
              <h2 style={theme.sectionHeading}>WRITING TASK 2</h2>
              <div
                className="writing-test-prompt"
                dangerouslySetInnerHTML={{ __html: testData.task2 }}
              />
              {/* <p>
                <i>Write at least 250 words.</i>
              </p> */}
            </>
          )}
        </div>

        <div style={theme.rightPane}>
          <h3 style={theme.answerHeading}>
            Your Answer – {activeTask.toUpperCase()} (
            {countWords(activeTask === "task1" ? task1 : task2)} words)
          </h3>
          <textarea
            rows={25}
            style={theme.textarea}
            value={activeTask === "task1" ? task1 : task2}
            onChange={(e) => {
              if (activeTask === "task1") setTask1(e.target.value);
              else setTask2(e.target.value);
            }}
          />
        </div>
      </Split>

      <div
        style={theme.footer}
      >
        <button
          onClick={() => setActiveTask("task1")}
          style={theme.taskButton(activeTask === "task1")}
        >
          Task 1
        </button>
        <button
          onClick={() => setActiveTask("task2")}
          style={theme.taskButton(activeTask === "task2")}
        >
          Task 2
        </button>
        {/* Submit moved to header to avoid accidental clicks next to Task 2 */}
      </div>
      {message && !submitted && (
        <div style={theme.messageBanner(message)}>
          {message}
        </div>
      )}
    </div>
  );
};

export default WritingTest;
