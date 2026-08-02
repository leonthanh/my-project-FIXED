import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Split from "react-split";
import {
  apiPath,
  hostPath,
  redirectToLogin,
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

const readLocalStorageValue = (key, fallback = "") => {
  try {
    const value = localStorage.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch (_err) {
    return fallback;
  }
};

const readLocalStorageJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
};

const buildWritingDraftStateKey = (uid, testId) => `writing:draft:${uid}:${testId || "pending"}`;

const WritingTest = () => {
  const { id: routeTestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const initialSelectedTestId = useMemo(() => {
    if (isPlacementRuntime && routeTestId) {
      return String(routeTestId);
    }

    return readLocalStorageValue("selectedTestId", String(routeTestId || ""));
  }, [isPlacementRuntime, routeTestId]);
  const [selectedTestId, setSelectedTestId] = useState(initialSelectedTestId);
  const writingStorageScope = useMemo(
    () => String(selectedTestId || routeTestId || initialSelectedTestId || "pending"),
    [initialSelectedTestId, routeTestId, selectedTestId]
  );
  const writingTask1Key = `writing_task1:${uid}:${writingStorageScope}`;
  const writingTask2Key = `writing_task2:${uid}:${writingStorageScope}`;
  const writingTimeKey = `writing_timeLeft:${uid}:${writingStorageScope}`;
  const writingStartedKey = `writing_started:${uid}:${writingStorageScope}`;
  const writingEndAtKey = `writing_endAt:${uid}:${writingStorageScope}`;
  const writingStateKey = buildWritingDraftStateKey(uid, writingStorageScope);
  const legacyWritingTask1Key = `writing_task1:${uid}`;
  const legacyWritingTask2Key = `writing_task2:${uid}`;
  const legacyWritingTimeKey = `writing_timeLeft:${uid}`;
  const legacyWritingStartedKey = `writing_started:${uid}`;
  const legacyWritingEndAtKey = `writing_endAt:${uid}`;
  const initialLocalDraft = useMemo(() => readLocalStorageJson(writingStateKey), [writingStateKey]);
  const [task1, setTask1] = useState(() => {
    if (typeof initialLocalDraft?.task1 === "string") return initialLocalDraft.task1;
    return readLocalStorageValue(writingTask1Key, readLocalStorageValue(legacyWritingTask1Key, ""));
  });
  const [task2, setTask2] = useState(() => {
    if (typeof initialLocalDraft?.task2 === "string") return initialLocalDraft.task2;
    return readLocalStorageValue(writingTask2Key, readLocalStorageValue(legacyWritingTask2Key, ""));
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const snapshotValue = Number(initialLocalDraft?.timeLeft);
    if (Number.isFinite(snapshotValue) && snapshotValue > 0) return snapshotValue;

    const saved = readLocalStorageValue(writingTimeKey, readLocalStorageValue(legacyWritingTimeKey, ""));
    return saved ? parseInt(saved, 10) : 60 * 60;
  });
  const [endAt, setEndAt] = useState(() => {
    const snapshotValue = Number(initialLocalDraft?.endAt);
    if (Number.isFinite(snapshotValue) && snapshotValue > 0) return snapshotValue;

    const saved = readLocalStorageValue(writingEndAtKey, readLocalStorageValue(legacyWritingEndAtKey, ""));
    return saved ? parseInt(saved, 10) : 0;
  });
  const [started, setStarted] = useState(() => {
    if (typeof initialLocalDraft?.started === "boolean") return initialLocalDraft.started;
    return readLocalStorageValue(writingStartedKey, readLocalStorageValue(legacyWritingStartedKey, "false")) === "true";
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTask, setActiveTask] = useState("task1");
  const [testData, setTestData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const [runtimeLimitToast, setRuntimeLimitToast] = useState("");
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);
  const localDraftRef = useRef(initialLocalDraft);
  const lastServerDraftFingerprintRef = useRef("");

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

  const persistLocalDraft = useCallback(() => {
    const snapshot = {
      testId: writingStorageScope,
      task1,
      task2,
      timeLeft,
      endAt,
      started,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(writingTask1Key, task1);
      localStorage.setItem(writingTask2Key, task2);
      localStorage.setItem(writingTimeKey, String(timeLeft));
      localStorage.setItem(writingStartedKey, started ? "true" : "false");
      if (endAt) {
        localStorage.setItem(writingEndAtKey, String(endAt));
      } else {
        localStorage.removeItem(writingEndAtKey);
      }
      localStorage.setItem(writingStateKey, JSON.stringify(snapshot));
      localDraftRef.current = snapshot;
    } catch (_err) {
      // ignore storage errors
    }
  }, [endAt, started, task1, task2, timeLeft, writingEndAtKey, writingStartedKey, writingStateKey, writingStorageScope, writingTask1Key, writingTask2Key, writingTimeKey]);

  // Save writing content to localStorage as the student types (debounced).
  // The server is only synced periodically to avoid rate-limiting and dropped connections.
  useEffect(() => {
    let debounceId;
    debounceId = setTimeout(persistLocalDraft, LOCAL_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(debounceId);
  }, [persistLocalDraft]);

  useEffect(() => {
    const flushLocalDraft = () => persistLocalDraft();
    window.addEventListener("pagehide", flushLocalDraft);
    document.addEventListener("visibilitychange", flushLocalDraft);

    return () => {
      window.removeEventListener("pagehide", flushLocalDraft);
      document.removeEventListener("visibilitychange", flushLocalDraft);
    };
  }, [persistLocalDraft]);

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
          params.set("placementPlatform", placementContext.placementPlatform || "ix");
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

        const localDraft = localDraftRef.current || readLocalStorageJson(writingStateKey);
        const localUpdatedAt = Number(localDraft?.updatedAt) || 0;
        const serverUpdatedAt =
          toTimestamp(draft?.draftSavedAt) ||
          toTimestamp(draft?.updatedAt) ||
          toTimestamp(draft?.createdAt);
        const shouldPreferLocalDraft =
          Boolean(localDraft) &&
          (hasMeaningfulWritingContent(localDraft?.task1, localDraft?.task2) || localDraft?.started === true) &&
          (!Number.isFinite(serverUpdatedAt) || localUpdatedAt > serverUpdatedAt + 1500);

        const draftTestId = Number(draft.testId);
        if (!isPlacementRuntime && !storedTestId && Number.isFinite(draftTestId) && draftTestId > 0) {
          const nextTestId = String(draftTestId);
          localStorage.setItem("selectedTestId", nextTestId);
          setSelectedTestId(nextTestId);
        }

        if (!shouldPreferLocalDraft) {
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
          localDraftRef.current = {
            testId: writingStorageScope,
            task1: typeof draft.task1 === "string" ? draft.task1 : "",
            task2: typeof draft.task2 === "string" ? draft.task2 : "",
            timeLeft: Number.isFinite(Number(draft.timeLeft)) ? Number(draft.timeLeft) : timeLeft,
            endAt: toTimestamp(draft.draftEndAt) || endAt || 0,
            started: typeof draft.draftStarted === "boolean" ? Boolean(draft.draftStarted) : started,
            updatedAt: Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : Date.now(),
          };
        } else {
          const localEndAt = toTimestamp(localDraft?.endAt);
          const serverEndAt = toTimestamp(draft?.draftEndAt);
          const authoritativeEndAt = Number.isFinite(serverEndAt) && serverEndAt > localEndAt ? serverEndAt : localEndAt;

          if (Number.isFinite(authoritativeEndAt)) {
            syncTimingState(authoritativeEndAt, Number(localDraft?.timeLeft) || null);
          }

          if (typeof localDraft?.started === "boolean") {
            setStarted(localDraft.started);
          }
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
    placementContext.placementPlatform,
    placementContext.placementAttemptItemToken,
    routeTestId,
    selectedTestId,
    syncTimingState,
    user?.id,
    writingStateKey,
    writingStorageScope,
    timeLeft,
    endAt,
    started,
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
  const draftSyncFingerprint = useMemo(
    () =>
      JSON.stringify({
        testId: selectedTestId || routeTestId || "",
        task1,
        task2,
        endAt: Number.isFinite(Number(endAt)) ? Number(endAt) : 0,
        started: Boolean(started),
      }),
    [endAt, routeTestId, selectedTestId, started, task1, task2]
  );

  const saveDraftToServer = useCallback(async ({ force = false, keepalive = false } = {}) => {
    if (isHydratingDraft || submitted) return;
    if (!isPlacementRuntime && !user?.id) return;

    const numericTestId = parseInt(selectedTestId || routeTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) return;

    const now = Date.now();
    // Guard against accidental bursts from effect re-runs / rapid calls.
    if (!force && now - lastServerSaveAtRef.current < SERVER_AUTOSAVE_INTERVAL_MS - 1000) {
      return;
    }

    // Don't create an empty server draft before the student has typed anything.
    if (!hasMeaningfulWritingContent(task1, task2)) {
      return;
    }

    if (!force && draftSyncFingerprint === lastServerDraftFingerprintRef.current) {
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
        payload.placementPlatform = placementContext.placementPlatform || "ix";
      }

      const res = await fetch(apiPath("writing/draft/autosave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive,
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
      lastServerDraftFingerprintRef.current = draftSyncFingerprint;
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
    placementContext.placementPlatform,
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
    draftSyncFingerprint,
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
        params.set("placementPlatform", placementContext.placementPlatform || "ix");
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
    placementContext.placementPlatform,
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
        saveDraftToServer({ force: true, keepalive: true });
      }
    };

    const onPageHide = () => {
      saveDraftToServer({ force: true, keepalive: true });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
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
        payload.placementPlatform = placementContext.placementPlatform || "ix";
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
      localStorage.removeItem(writingStateKey);
      localStorage.removeItem(legacyWritingTask1Key);
      localStorage.removeItem(legacyWritingTask2Key);
      localStorage.removeItem(legacyWritingTimeKey);
      localStorage.removeItem(legacyWritingStartedKey);
      localStorage.removeItem(legacyWritingEndAtKey);
      if (!isPlacementRuntime) {
        localStorage.removeItem("selectedTestId");
      }

      navigate(exitPath, { replace: true });
    } catch (err) {
      console.error("Submit writing failed:", err);
      setSubmitted(false);
      setMessage(`Could not submit: ${err?.message || "Submission failed."}`);
      await saveDraftToServer();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    exitPath,
    isPlacementRuntime,
    isSubmitting,
    navigate,
    placementContext.placementPlatform,
    placementContext.placementAttemptItemToken,
    routeTestId,
    saveDraftToServer,
    selectedTestId,
    task1,
    task2,
    timeLeft,
    user,
    legacyWritingEndAtKey,
    legacyWritingStartedKey,
    legacyWritingTask1Key,
    legacyWritingTask2Key,
    legacyWritingTimeKey,
    writingEndAtKey,
    writingStateKey,
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
  const isTimeWarning = timeLeft > 0 && timeLeft <= 300;
  const isTimeCritical = timeLeft > 0 && timeLeft <= 60;
  const timerStateClass = isTimeCritical
    ? "is-critical"
    : isTimeWarning
      ? "is-warning"
      : "";
  const messageToneClass = message.toLowerCase().includes("success")
    ? "is-success"
    : "is-error";

  if (message && !testData) {
    return <div className="writing-test-loading">{message}</div>;
  }

  if (!testData) return <div className="writing-test-loading">Loading writing test...</div>;

  if (submitted) {
    return (
      <div className="writing-test-loading">
        <h2>Submission completed</h2>
        <p>{message}</p>
        {isPlacementRuntime ? <p>Returning to your placement test list...</p> : null}

        <div className="writing-test-feedback-block">
          <h3 className="writing-test-feedback-heading"><InlineIcon name="writing" size={16} />Task 1:</h3>
          <p className="writing-test-answer-preview">
            {task1}
          </p>
        </div>

        <div className="writing-test-feedback-block">
          <h3 className="writing-test-feedback-heading"><InlineIcon name="writing" size={16} />Task 2:</h3>
          <p className="writing-test-answer-preview">
            {task2}
          </p>
        </div>

        {feedback && (
          <div className="writing-test-feedback-block">
            <h3>Teacher feedback</h3>
            <p className="writing-test-feedback-text">{feedback}</p>
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
  const progressRingStateClass = isTimeCritical
    ? "is-critical"
    : isTimeWarning
      ? "is-warning"
      : "";

  return (
    <div className="writing-test-runtime">
      <ExtensionToast message={extensionToast} />
      <ExtensionToast message={runtimeLimitToast} label="Autosave" tone="warning" top={152} />
      <header className="writing-test-header">
        <div className="writing-test-header-left">
          <div className="writing-test-badge">IX</div>
          <span className="writing-test-title">
            IX - WRITING TEST
          </span>
        </div>
        <div className="writing-test-header-right">
          <div className={`writing-test-timer ${timerStateClass}`.trim()}>
            <span className="writing-test-timer-icon"><InlineIcon name="clock" size={18} /></span>
            <span className="writing-test-timer-value">
              {formatTime(timeLeft)}
            </span>
            <span className="writing-test-timer-label">
              REMAINING
            </span>
          </div>
          <div className={`writing-progress-ring ${progressRingStateClass}`.trim()}>
            <svg viewBox="0 0 36 36" className="writing-progress-ring__svg">
              <path
                className="writing-progress-ring__track"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="writing-progress-ring__value"
                strokeDasharray={`${Math.round(progress * 100)}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="writing-progress-ring__text">
              <span className="writing-progress-ring__value-text">
                {totalWords}
              </span>
              <span className="writing-progress-ring__target-text">/400</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="writing-test-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {started && !submitted && timeLeft === 0 && graceRemaining > 0 && (
        <div className="writing-test-status-banner">
          <strong>Official time is over.</strong> The system keeps your answers for another {formatTime(graceRemaining)} in case of power loss or page reload. Your teacher can extend the time if needed.
        </div>
      )}

      <Split
        key="writing-runtime"
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction={isMobile ? "vertical" : "horizontal"}
        gutter={() => {
          if (typeof document === "undefined") return null;
          const gutter = document.createElement("div");
          gutter.className = "writing-test-gutter";
          return gutter;
        }}
        className={`writing-test-split ${isMobile ? "is-mobile" : ""}`.trim()}
      >
        <div className="writing-test-left-pane">
          {activeTask === "task1" && (
            <>
              <h2 className="writing-test-section-heading">WRITING TASK 1</h2>
              <div
                className="writing-test-prompt"
                dangerouslySetInnerHTML={{ __html: testData.task1 }}
              />
              {testData.task1Image && (
                <img
                  src={hostPath(testData.task1Image)}
                  alt="Task 1"
                />
              )}
              {/* <p>
                <i>Write at least 150 words.</i>
              </p> */}
            </>
          )}

          {activeTask === "task2" && (
            <>
              <h2 className="writing-test-section-heading">WRITING TASK 2</h2>
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

        <div className="writing-test-right-pane">
          <h3 className="writing-test-answer-heading">
            Your Answer – {activeTask.toUpperCase()} (
            {countWords(activeTask === "task1" ? task1 : task2)} words)
          </h3>
          <textarea
            rows={25}
            className="writing-test-textarea"
            value={activeTask === "task1" ? task1 : task2}
            onChange={(e) => {
              if (activeTask === "task1") setTask1(e.target.value);
              else setTask2(e.target.value);
            }}
          />
        </div>
      </Split>

      <div className="writing-test-footer">
        <button
          onClick={() => setActiveTask("task1")}
          className={`writing-test-task-btn ${activeTask === "task1" ? "is-active" : ""}`.trim()}
        >
          Task 1
        </button>
        <button
          onClick={() => setActiveTask("task2")}
          className={`writing-test-task-btn ${activeTask === "task2" ? "is-active" : ""}`.trim()}
        >
          Task 2
        </button>
        {/* Submit moved to header to avoid accidental clicks next to Task 2 */}
      </div>
      {message && !submitted && (
        <div className={`writing-test-message-banner ${messageToneClass}`.trim()}>
          {message}
        </div>
      )}
    </div>
  );
};

export default WritingTest;
