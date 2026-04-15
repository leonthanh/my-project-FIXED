import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath, authFetch } from "../../../shared/utils/api";
import TestHeader from "../../../shared/components/TestHeader";
import ExtensionToast from "../../../shared/components/ExtensionToast";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import TestStartModal from "../../../shared/components/TestStartModal";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../shared/utils/testTiming";
import MapLabelingQuestion from "../../../shared/components/MapLabelingQuestion";
import TableCompletion from "../../../shared/components/questions/editors/TableCompletion.jsx";
import ResultModal from "../../../shared/components/ResultModal";
import { generateDetailsFromSections } from "./ListeningResults";
import {
  countFlowchartQuestionSlots,
  getConfiguredFlowchartOptionEntries,
  getFlowchartBlankEntries,
  getFlowchartOptionTableRows,
  splitFlowchartStepText,
} from "../utils/flowchart";
import {
  countListeningTableBlanks,
  getListeningSectionType,
  getListeningTableQuestionData,
  isListeningTableQuestion,
  LISTENING_CLOZE_TYPE,
} from "../utils/clozeTableSchema";
import createStyles from "./DoListeningTest.styles";

// Local helper to compute band (mirror of listening results logic)
const bandFromCorrect = (c) => {
  if (c >= 39) return 9;
  if (c >= 37) return 8.5;
  if (c >= 35) return 8;
  if (c >= 32) return 7.5;
  if (c >= 30) return 7;
  if (c >= 26) return 6.5;
  if (c >= 23) return 6;
  if (c >= 18) return 5.5;
  if (c >= 16) return 5;
  if (c >= 13) return 4.5;
  if (c >= 11) return 4;
  return 3.5;
};

const stripHtml = (html) => {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
};

const safeParseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const hasMeaningfulAnswerValue = (value) => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasMeaningfulAnswerValue);
  if (typeof value === "object") {
    return Object.values(value).some(hasMeaningfulAnswerValue);
  }
  return false;
};

const hasMeaningfulAnswers = (answers) => {
  if (!answers || typeof answers !== "object") return false;
  return Object.values(answers).some(hasMeaningfulAnswerValue);
};

const COLLAPSED_PART_TAB_WIDTH = 172;
const MIN_EXPANDED_PART_TAB_WIDTH = 280;
const MAX_EXPANDED_PART_TAB_WIDTH = 620;

const estimateNavigatorChipWidth = (item) => {
  const label = String(item?.label ?? "");

  if (item?.type === "multi-select") return 60;
  if (label.length >= 5) return 56;
  if (label.length >= 3) return 48;
  return 38;
};

const getPartTabWidth = (items = [], expanded = false) => {
  if (!expanded) return COLLAPSED_PART_TAB_WIDTH;

  const chipsWidth = items.reduce((total, item) => total + estimateNavigatorChipWidth(item), 0);
  const gapsWidth = Math.max(0, items.length - 1) * 10;

  return Math.min(
    MAX_EXPANDED_PART_TAB_WIDTH,
    Math.max(MIN_EXPANDED_PART_TAB_WIDTH, chipsWidth + gapsWidth + 32)
  );
};

const parseQuestionsDeep = (questions) => {
  const parsed = safeParseJson(questions);
  if (!Array.isArray(parsed)) return parsed;

  return parsed.map((q) => ({
    ...q,
    formRows: safeParseJson(q?.formRows),
    leftItems: safeParseJson(q?.leftItems),
    rightItems: safeParseJson(q?.rightItems),
    options: safeParseJson(q?.options),
    answers: safeParseJson(q?.answers),
    steps: safeParseJson(q?.steps),
    clozeTable: safeParseJson(q?.clozeTable),
  }));
};

/**
 * DoListeningTest - Trang làm bài thi Listening IELTS
 * Giao diện theo mẫu youpass.vn
 */
const DoListeningTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);

  // States
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  /* eslint-disable-next-line no-unused-vars */
  const [expandedPart, setExpandedPart] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const [audioPlayed, setAudioPlayed] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [openFlowchartQuestion, setOpenFlowchartQuestion] = useState(null);
  // Modal & start state: control whether student has started the test (controls audio visibility)
  const [showStartModal, setShowStartModal] = useState(true);
  const [started, setStarted] = useState(false);
  const [resumeHydrated, setResumeHydrated] = useState(false);
  const [requestAutoPlay, setRequestAutoPlay] = useState(false);
  // Track if audio is currently playing so we can show a status without controls
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const listQuestionRef = useRef(null);
  const flowchartDropdownRefs = useRef({});

  // When switching parts via navigator/arrows, we may need to wait for the new part
  // to render before scrolling to the target question.
  const pendingScrollToRef = useRef(null);

  // Key for persisting full state (answers + expiresAt). Includes user id to allow per-user isolation.
  // Compute a stable storage user id once (so we can use it safely in dependency arrays).
  const storageUserId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.id || "anon";
    } catch (e) {
      return "anon";
    }
  }, []);

  // Keys include userId so each student's timer and answers are isolated on shared devices.
  const expiresKey = `listening:${id}:expiresAt:${storageUserId}`;
  const stateKey = `listening:${id}:state:${storageUserId}`;

  const expiresAtRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // Track server-side partial submission id (for anonymous resume we will store id locally)
  const submissionIdRef = useRef(null);
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  const resetPersistedAttempt = useCallback(
    (durationSeconds) => {
      submissionIdRef.current = null;
      expiresAtRef.current = null;
      autoSubmittingRef.current = false;
      lastAnnouncedExpiryRef.current = null;

      setAnswers({});
      setAudioPlayed({});
      setStarted(false);
      setShowStartModal(true);
      setSubmitted(false);
      setResultData(null);
      setResultModalOpen(false);
      setTimeRemaining(durationSeconds);
      setGraceRemaining(0);

      try {
        localStorage.removeItem(expiresKey);
        localStorage.removeItem(stateKey);
      } catch (_err) {
        // ignore storage errors
      }
    },
    [expiresKey, stateKey]
  );

  const getReusableStoredExpiry = useCallback(() => {
    try {
      const raw = localStorage.getItem(expiresKey);
      if (!raw) return null;

      const expiresAtMs = parseInt(raw, 10);
      if (!Number.isFinite(expiresAtMs)) {
        localStorage.removeItem(expiresKey);
        return null;
      }

      const graceRemainingSeconds = getGraceRemainingSeconds(expiresAtMs);
      if (!Number.isFinite(graceRemainingSeconds) || graceRemainingSeconds <= 0) {
        localStorage.removeItem(expiresKey);
        return null;
      }

      return expiresAtMs;
    } catch (_err) {
      return null;
    }
  }, [expiresKey]);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        expiresAtRef.current = expiresAtMs;
        try {
          localStorage.setItem(expiresKey, String(expiresAtMs));
        } catch (_err) {
          // ignore storage errors
        }
        setTimeRemaining(getRemainingSeconds(expiresAtMs));
        setGraceRemaining(getGraceRemainingSeconds(expiresAtMs));
        return true;
      }

      expiresAtRef.current = null;
      setGraceRemaining(0);
      if (fallbackSeconds !== null) {
        setTimeRemaining(fallbackSeconds);
      }
      return false;
    },
    [expiresKey]
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
    if (openFlowchartQuestion == null) return undefined;

    const handlePointerDown = (event) => {
      const current = flowchartDropdownRefs.current[openFlowchartQuestion];
      if (current && !current.contains(event.target)) {
        setOpenFlowchartQuestion(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenFlowchartQuestion(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFlowchartQuestion]);

  useEffect(() => {
    setOpenFlowchartQuestion(null);
  }, [currentPartIndex, submitted]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        setResumeHydrated(false);
        const res = await authFetch(apiPath(`listening-tests/${id}`));
        if (!res.ok) throw new Error("Listening test not found");
        const data = await res.json();

        // Parse JSON fields if they're strings
        let parsedQuestions = typeof data.questions === "string"
          ? JSON.parse(data.questions)
          : data.questions;
        
        // Ensure nested JSON fields in questions are parsed
        if (Array.isArray(parsedQuestions)) {
          parsedQuestions = parsedQuestions.map((q) => ({
            ...q,
            formRows: typeof q.formRows === "string" ? JSON.parse(q.formRows) : q.formRows,
            leftItems: typeof q.leftItems === "string" ? JSON.parse(q.leftItems) : q.leftItems,
            rightItems: typeof q.rightItems === "string" ? JSON.parse(q.rightItems) : q.rightItems,
            options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
            answers: typeof q.answers === "string" ? JSON.parse(q.answers) : q.answers,
            steps: typeof q.steps === "string" ? JSON.parse(q.steps) : q.steps,
          }));
        }

        const parsedData = {
          ...data,
          partTypes:
            typeof data.partTypes === "string"
              ? JSON.parse(data.partTypes)
              : data.partTypes,
          partInstructions:
            typeof data.partInstructions === "string"
              ? JSON.parse(data.partInstructions)
              : data.partInstructions,
          questions: parsedQuestions,
          partAudioUrls:
            typeof data.partAudioUrls === "string"
              ? JSON.parse(data.partAudioUrls)
              : data.partAudioUrls,
        };
        
        setTest(parsedData);

        const durationSeconds = parsedData.duration ? parsedData.duration * 60 : 30 * 60;
        const storedExpiresAt = getReusableStoredExpiry();
        let parsedState = null;

        try {
          const storedState = localStorage.getItem(stateKey);
          if (storedState) {
            parsedState = JSON.parse(storedState);
          }
        } catch (_err) {
          // ignore malformed storage
        }

        const storedAnswers =
          parsedState?.answers && typeof parsedState.answers === "object"
            ? parsedState.answers
            : null;
        const storedAudioPlayed =
          parsedState?.audioPlayed && typeof parsedState.audioPlayed === "object"
            ? parsedState.audioPlayed
            : null;
        const storedSubmissionId = parsedState?.submissionId || null;
        const candidateExpiresAt = parsedState?.expiresAt ?? storedExpiresAt;
        const candidateExpiresAtMs = toTimestamp(candidateExpiresAt);
        const storedHasAnswers = hasMeaningfulAnswers(storedAnswers);
        const storedAttemptExpired =
          Number.isFinite(candidateExpiresAtMs) &&
          getRemainingSeconds(candidateExpiresAtMs) <= 0 &&
          getGraceRemainingSeconds(candidateExpiresAtMs) <= 0;

        // Default to a fresh timer display until we confirm the resume state is valid.
        setTimeRemaining(durationSeconds);
        setGraceRemaining(0);

        if (storedAnswers) {
          setAnswers(storedAnswers);
        }
        if (storedAudioPlayed) {
          setAudioPlayed(storedAudioPlayed);
        }
        if (parsedState?.started && !storedAttemptExpired) {
          setStarted(true);
          setShowStartModal(false);
        } else {
          setStarted(false);
          setShowStartModal(true);
        }
        if (!storedAttemptExpired && Number.isFinite(candidateExpiresAtMs)) {
          syncTimingState(candidateExpiresAtMs, durationSeconds);
        }

        // Try to resume from server if available. Do not trust a persisted submissionId
        // until the backend confirms that it still points to an unfinished attempt.
        let resolvedActiveSubmission = null;
        try {
          const user = (() => {
            try {
              return JSON.parse(localStorage.getItem("user") || "null");
            } catch (_err) {
              return null;
            }
          })();
          const query = storedSubmissionId
            ? `?submissionId=${storedSubmissionId}`
            : user?.id
              ? `?userId=${user.id}`
              : "";

          if (query) {
            const activeRes = await fetch(
              apiPath(`listening-submissions/${id}/active${query}`)
            );
            if (activeRes.ok) {
              const payload = await activeRes.json().catch(() => null);
              const sub = payload?.submission || null;

              if (
                sub &&
                !sub.finished &&
                Number(sub.testId) === Number(id)
              ) {
                const serverAnswers =
                  sub.answers && typeof sub.answers === "string"
                    ? JSON.parse(sub.answers)
                    : sub.answers || null;
                const hasServerAnswers = hasMeaningfulAnswers(serverAnswers);
                const shouldResumeServerAttempt = Boolean(
                  storedHasAnswers || hasServerAnswers
                );

                if (shouldResumeServerAttempt) {
                  resolvedActiveSubmission = sub;

                  if (serverAnswers) {
                    setAnswers(serverAnswers);
                  }
                  if (sub.expiresAt) {
                    const eAt =
                      typeof sub.expiresAt === "string"
                        ? new Date(sub.expiresAt).getTime()
                        : sub.expiresAt;
                    syncTimingState(eAt, durationSeconds);
                  }
                  if (sub.id) {
                    submissionIdRef.current = sub.id;
                  }

                  try {
                    const cur = JSON.parse(localStorage.getItem(stateKey) || "{}") || {};
                    cur.submissionId = sub.id;
                    cur.started = true;
                    if (serverAnswers) cur.answers = serverAnswers;
                    localStorage.setItem(stateKey, JSON.stringify(cur));
                  } catch (_err) {
                    // ignore storage errors
                  }

                  if (parsedState?.started || storedHasAnswers || hasServerAnswers) {
                    setShowStartModal(false);
                    setStarted(true);
                  }
                }
              }
            }
          }
        } catch (_err) {
          // ignore server resume errors and fall back to local validation below
        }

        if (!resolvedActiveSubmission) {
          const shouldDropStaleAttempt = Boolean(storedSubmissionId) ||
            (Boolean(parsedState?.started) && storedAttemptExpired && !storedHasAnswers);

          if (shouldDropStaleAttempt) {
            resetPersistedAttempt(durationSeconds);
          }
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setResumeHydrated(true);
      }
    };
    fetchTest();
  }, [id, stateKey, storageUserId, expiresKey, getReusableStoredExpiry, resetPersistedAttempt, syncTimingState]);

  // Keep a ref to confirmSubmit to avoid referencing it before initialization in effects
  const confirmSubmitRef = useRef(null);

  // Timer countdown (compute remaining from persisted expiresAt to survive F5)
  // Timer starts only after the student explicitly confirms start.
  useEffect(() => {
    // Don't start the timer until the student starts the test
    if (submitted || !test || !started || !resumeHydrated) return;

    if (!Number.isFinite(expiresAtRef.current)) {
      const storedExpiresAt = getReusableStoredExpiry();
      if (Number.isFinite(storedExpiresAt)) {
        syncTimingState(storedExpiresAt);
      } else {
        const expiresAt =
          Date.now() +
          (test?.duration ? test.duration * 60 * 1000 : 30 * 60 * 1000);
        syncTimingState(expiresAt);
      }
    }

    const tick = () => {
      const expiresAt = expiresAtRef.current;
      if (!Number.isFinite(expiresAt)) return;

      const remaining = getRemainingSeconds(expiresAt);
      const nextGraceRemaining = getGraceRemainingSeconds(expiresAt);
      setTimeRemaining(remaining);
      setGraceRemaining(nextGraceRemaining);
      if (
        remaining <= 0 &&
        nextGraceRemaining <= 0 &&
        !autoSubmittingRef.current
      ) {
        if (confirmSubmitRef.current) {
          autoSubmittingRef.current = true;
          confirmSubmitRef.current();
        } else {
          setTimeRemaining(0);
        }
      }
    };

    // Run immediately so reaching 00:00 triggers submit without waiting 1s.
    tick();

    const intervalId = setInterval(tick, 1000);

    const onCheck = () => tick();
    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [test, submitted, expiresKey, started, resumeHydrated, getReusableStoredExpiry, syncTimingState]);

  // Format time display
  /* eslint-disable-next-line no-unused-vars */
  const formatTime = (seconds) => {
    return formatClock(seconds);
  };

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionKey, value) => {
      if (submitted) return;
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: value,
      }));
    },
    [submitted]
  );

  // Handle checkbox change for multiple choice many
  const handleCheckboxChange = useCallback(
    (questionKey, optionIndex, checked, maxSelections = 2) => {
      if (submitted) return;

      setAnswers((prev) => {
        const currentAnswers = prev[questionKey] || [];
        let newAnswers;

        if (checked) {
          if (currentAnswers.length < maxSelections) {
            newAnswers = [...currentAnswers, optionIndex];
          } else {
            return prev;
          }
        } else {
          newAnswers = currentAnswers.filter((idx) => idx !== optionIndex);
        }

        return { ...prev, [questionKey]: newAnswers };
      });
    },
    [submitted]
  );

  // Handle submit
  const handleSubmit = () => setShowConfirm(true);

  // Confirm and submit
  const confirmSubmit = useCallback(async () => {
    if (submitted) return; // prevent double-submits

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch (e) {
      user = null;
    }

    const studentName = user?.name || user?.username || user?.email || null;
    const studentId = user?.id || null;

    try {
      // If there are no answers and we don't have a server attempt, avoid creating an empty submission.
      if (!hasMeaningfulAnswers(answers) && !submissionIdRef.current) {
        // Mark as submitted locally (no server record created) and clear local state.
        setSubmitted(true);
        setShowConfirm(false);
        try {
          localStorage.removeItem(expiresKey);
          localStorage.removeItem(stateKey);
        } catch (e) {}
        alert("Time is up, but you did not answer any questions. No empty submission was created.");
        navigate('/select-test');
        return;
      }

      const res = await authFetch(apiPath(`listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, user, studentName, studentId, submissionId: submissionIdRef.current }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.message || "Failed to submit the test";
        const detail = payload?.error ? ` (${payload.error})` : "";
        throw new Error(`${msg}${detail}`);
      }

      const totalRaw = payload?.total ?? payload?.totalQuestions;
      const totalParsed = Number(totalRaw);
      const totalFinal = Number.isFinite(totalParsed) && totalParsed > 0 ? totalParsed : 40;

      const correctRaw = payload?.correct ?? payload?.score;
      const correctParsed = Number(correctRaw);
      const correctFinal = Number.isFinite(correctParsed) ? correctParsed : 0;

      let result = {
        submissionId: payload?.submissionId,
        total: totalFinal,
        correct: correctFinal,
        scorePercentage: payload?.scorePercentage ?? payload?.percentage,
        band: payload?.band,
      };

      // Client-side override: if we can generate full details from `test` + `answers` and
      // that generated result is more complete or more correct than server payload, prefer it
      // for immediate user feedback (doesn't persist server-side; use rescore script to persist).
      try {
        if (test && answers && typeof answers === 'object') {
          const generated = generateDetailsFromSections(test, answers || {});
          if (Array.isArray(generated) && generated.length) {
            const genCorrect = generated.filter((d) => d.isCorrect).length;
            const genTotal = generated.length;
            // Prefer generated result when it appears more complete or more correct
            if (genTotal > (result.total || 0) || genCorrect > (result.correct || 0)) {
              result = {
                ...result,
                total: genTotal,
                correct: genCorrect,
                scorePercentage: genTotal ? Math.round((genCorrect / genTotal) * 100) : result.scorePercentage,
                band: bandFromCorrect(genCorrect),
                // provide details for potential later use in modal
                details: generated,
              };
            }
          }
        }
      } catch (e) {
        // ignore - fall back to server result
      }

      // Try to fetch authoritative submission details from server and prefer that if more complete.
      if (result.submissionId) {
        try {
          const subRes = await fetch(apiPath(`listening-submissions/${result.submissionId}`));
          if (subRes.ok) {
            const detailPayload = await subRes.json().catch(() => null);
            const sub = detailPayload?.submission || null;
            const serverTest = detailPayload?.test || null;

            if (sub) {
              const parsedSub = {
                ...sub,
                answers: safeParseJson(sub.answers),
                details: safeParseJson(sub.details),
              };

              const parsedTest = serverTest
                ? {
                    ...serverTest,
                    partInstructions: safeParseJson(serverTest.partInstructions),
                    partTypes: safeParseJson(serverTest.partTypes),
                    partAudioUrls: safeParseJson(serverTest.partAudioUrls),
                    questions: parseQuestionsDeep(serverTest.questions),
                  }
                : null;

              const parsedDetails = Array.isArray(parsedSub.details) ? parsedSub.details : [];
              const totalTarget = Number(parsedSub.total) || result.total || 40;
              let authoritativeDetails = parsedDetails;

              if (parsedTest && parsedSub.answers && typeof parsedSub.answers === "object") {
                const generated = generateDetailsFromSections(parsedTest, parsedSub.answers);
                if (generated.length && (parsedDetails.length !== totalTarget || parsedDetails.length < generated.length)) {
                  authoritativeDetails = generated;
                }
              }

              if (Array.isArray(authoritativeDetails) && authoritativeDetails.length) {
                const detailCorrect = authoritativeDetails.filter((d) => d.isCorrect).length;
                const detailTotal = authoritativeDetails.length;
                result = {
                  ...result,
                  total: detailTotal,
                  correct: detailCorrect,
                  scorePercentage: detailTotal ? Math.round((detailCorrect / detailTotal) * 100) : result.scorePercentage,
                  band: bandFromCorrect(detailCorrect),
                  details: authoritativeDetails,
                };
              }
            }
          }
        } catch (_error) {
          // ignore network errors and keep the best local result
        }
      }

      setResultData(result);

      if (test?.showResultModal !== false) {
        setResultModalOpen(true);
      } else {
        alert("Submission successful. Your teacher can review your results.");
        navigate("/select-test");
      }
      setSubmitted(true);
      setShowConfirm(false);

      // Clear persisted timer and saved state so next visit starts fresh
      try {
        localStorage.removeItem(expiresKey);
        localStorage.removeItem(stateKey);
      } catch (e) {
        // ignore
      }

      // Tell server to cleanup any leftover unfinished autosaves for this user/test
      try {
        if (user && user.id) {
          fetch(apiPath(`listening-submissions/${id}/cleanup`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user }),
          }).catch(() => {});
        }
      } catch (e) {
        // ignore
      }

      // Clear local submission ref
      submissionIdRef.current = null;
    } catch (err) {
      console.error("Error submitting:", err);
      alert(`Something went wrong while submitting.${err?.message ? `\n${err.message}` : ""}`);
    }
  }, [answers, expiresKey, id, navigate, submitted, stateKey, test, test?.showResultModal]);

  // Keep ref up-to-date with the latest confirmSubmit implementation
  useEffect(() => {
    confirmSubmitRef.current = confirmSubmit;
  }, [confirmSubmit]);

  // Auto-save answers to localStorage (debounced) and sync across tabs.
  useEffect(() => {
    if (submitted || !resumeHydrated) return;
    // Save function
    const saveState = () => {
      try {
        const expiresStored = localStorage.getItem(expiresKey);
        const expiresAt = expiresStored ? parseInt(expiresStored, 10) : expiresAtRef.current || null;
        const payload = { answers, expiresAt, audioPlayed, started, lastSavedAt: Date.now() };
        localStorage.setItem(stateKey, JSON.stringify(payload));
      } catch (e) {
        // ignore
      }
    };

    // Debounced save on answers change
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveState, 500);

    // Also attempt server autosave (debounced + non-blocking)
    const serverAutosave = async () => {
      try {
        if (!started) {
          return;
        }

        // Don't create a server attempt if we have no answers yet and no submissionId.
        // This prevents creating an empty attempt that will later be auto-submitted as 0/40.
        if (!submissionIdRef.current && !hasMeaningfulAnswers(answers)) {
          // nothing to save yet
          return;
        }

        const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; } })();
        const payload = { submissionId: submissionIdRef.current, answers, expiresAt: expiresAtRef.current, user };
        const res = await fetch(apiPath(`listening-submissions/${id}/autosave`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.submissionId) {
            submissionIdRef.current = json.submissionId;
            // persist submissionId locally
            try {
              const cur = JSON.parse(localStorage.getItem(stateKey) || '{}') || {};
              cur.submissionId = json.submissionId;
              cur.answers = payload.answers || cur.answers;
              localStorage.setItem(stateKey, JSON.stringify(cur));
            } catch (e) {}
          }
          const nextExpiresAt = json?.timing?.expiresAt || json?.expiresAt;
          if (nextExpiresAt) {
            announceExtension(nextExpiresAt, expiresAtRef.current);
            syncTimingState(nextExpiresAt);
          }
        }
      } catch (err) {
        // ignore server autosave failures (we still have localStorage fallback)
      }
    };

    // Debounce server autosave slightly
    const serverAutosaveTimeoutId = setTimeout(serverAutosave, 700);

    // Periodic save (every 30s) to handle timer-only changes
    const intervalId = setInterval(saveState, 30000);

    // Periodic server autosave
    const serverIntervalId = setInterval(serverAutosave, 30000);

    // Save before unload
    const onBeforeUnload = () => {
      saveState();
      // Try one last synchronous navigator send via sendBeacon (best-effort)
      try {
        if (!started) return;
        if (!submissionIdRef.current && !hasMeaningfulAnswers(answers)) {
          return;
        }

        const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch (e) { return null; } })();
        const payload = { submissionId: submissionIdRef.current, answers, expiresAt: expiresAtRef.current, user };
        const url = apiPath(`listening-submissions/${id}/autosave`);
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Storage event to sync across tabs
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key === stateKey) {
        try {
          const parsed = JSON.parse(e.newValue || "{}");
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.expiresAt) {
            syncTimingState(parsed.expiresAt);
          }
          if (parsed.submissionId) submissionIdRef.current = parsed.submissionId;
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      clearTimeout(serverAutosaveTimeoutId);
      clearInterval(intervalId);
      clearInterval(serverIntervalId);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("storage", onStorage);
    };
  }, [answers, submitted, resumeHydrated, stateKey, expiresKey, id, audioPlayed, started, syncTimingState, announceExtension]);

  const reconcileServerTiming = useCallback(async () => {
    if (!resumeHydrated || !started || submitted) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const hasLocalAnswers = hasMeaningfulAnswers(answers);
    if (!submissionIdRef.current && !hasLocalAnswers) {
      return;
    }

    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch (_err) {
        return null;
      }
    })();
    const query = submissionIdRef.current
      ? `?submissionId=${submissionIdRef.current}`
      : user?.id
        ? `?userId=${user.id}`
        : "";
    if (!query) return;

    try {
      const res = await fetch(apiPath(`listening-submissions/${id}/active${query}`));
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const nextExpiresAt = data?.submission?.expiresAt || data?.timing?.expiresAt;
      const nextExpiresAtMs = toTimestamp(nextExpiresAt);
      const currentExpiresAtMs = toTimestamp(expiresAtRef.current);

      if (
        Number.isFinite(nextExpiresAtMs) &&
        (!Number.isFinite(currentExpiresAtMs) || Math.abs(nextExpiresAtMs - currentExpiresAtMs) > 1000)
      ) {
        announceExtension(nextExpiresAtMs, currentExpiresAtMs);
        syncTimingState(nextExpiresAtMs);
      }
    } catch (_err) {
      // ignore polling errors; autosave and refresh can still recover timing
    }
  }, [announceExtension, answers, id, resumeHydrated, started, submitted, syncTimingState]);

  useEffect(() => {
    if (!resumeHydrated || !started || submitted) return;

    reconcileServerTiming();
    const intervalId = setInterval(reconcileServerTiming, 5000);
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
  }, [reconcileServerTiming, resumeHydrated, started, submitted]);

  // Get parts data
  const parts = useMemo(() => {
    if (!test) return [];
    return test.partInstructions || [];
  }, [test]);

  // Get all questions for current part
  const currentPartQuestions = useMemo(() => {
    if (!test?.questions) return [];
    return test.questions.filter((q) => q.partIndex === currentPartIndex);
  }, [test?.questions, currentPartIndex]);

  // Calculate actual question count for a question (considering form-completion, matching, etc.)
  const getQuestionCount = useCallback((q) => {
    if (!q) return 0;

    if (q.formRows && q.formRows.length > 0) {
      const blanks = q.formRows.filter((r) => r.isBlank).length;
      return Math.max(1, blanks);
    }

    if (isListeningTableQuestion(q)) {
      const blanks = countListeningTableBlanks(q);
      return Math.max(1, blanks);
    }

    // Notes-completion: number of blanks in notesText (supports both numbered and unnumbered blanks)
    if (typeof q.notesText === "string" && q.notesText.trim()) {
      const blanks = stripHtml(q.notesText).match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
      return Math.max(1, blanks.length);
    }

    if (Array.isArray(q.steps) && q.steps.length > 0) {
      return Math.max(1, countFlowchartQuestionSlots(q));
    }

    if (q.leftItems && q.leftItems.length > 0) {
      return Math.max(1, q.leftItems.length);
    }

    if (q.items && q.items.length > 0) {
      return Math.max(1, q.items.length);
    }

    // Multi-select: each question counts by requiredAnswers (e.g. Choose TWO = 2)
    // NOTE: some tests store multi-select questions with `questionType: 'fill'` but with
    // `requiredAnswers` set. Treat any question that has `requiredAnswers` as occupying
    // that many slots so numbering remains consistent with the editor.
    if ((q.questionType === "multi-select" || Number(q?.requiredAnswers)) && q.requiredAnswers) {
      return Math.max(1, Number(q.requiredAnswers));
    }

    return 1;
  }, []);

  // Count questions for a section using section metadata and actual questions
  const getSectionQuestionCount = (section, sectionQuestions) => {
    if (!section) return 0;
    const sectionType = getListeningSectionType(section, sectionQuestions[0] || {});

    if (sectionType === "form-completion") {
      const firstQ = sectionQuestions[0] || {};
      const keys = firstQ?.answers && typeof firstQ.answers === "object" && !Array.isArray(firstQ.answers)
        ? Object.keys(firstQ.answers).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n))
        : [];
      if (keys.length) return keys.length;
      return (firstQ?.formRows || []).filter((r) => r && r.isBlank).length || 0;
    }

    if (sectionType === "notes-completion") {
      const firstQ = sectionQuestions[0] || {};
      const keys = firstQ?.answers && typeof firstQ.answers === "object" && !Array.isArray(firstQ.answers)
        ? Object.keys(firstQ.answers).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n))
        : [];
      if (keys.length) return keys.length;
      const matches = stripHtml(String(firstQ?.notesText || "")).match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
      return matches.length || 0;
    }

    if (sectionType === "matching") {
      const firstQ = sectionQuestions[0] || {};
      const keys = firstQ?.answers && typeof firstQ.answers === "object" && !Array.isArray(firstQ.answers)
        ? Object.keys(firstQ.answers).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n))
        : [];
      if (keys.length) return keys.length;
      const leftItems = firstQ?.leftItems || firstQ?.items || [];
      return leftItems.length || 0;
    }

    if (sectionType === "multi-select") {
      return sectionQuestions.reduce((sum, q) => sum + (Number(q?.requiredAnswers) || 2), 0);
    }

    if (sectionType === LISTENING_CLOZE_TYPE) {
      const firstQ = sectionQuestions[0] || {};
      return countListeningTableBlanks(firstQ) || 0;
    }

    if (sectionType === "flowchart") {
      const firstQ = sectionQuestions[0] || {};
      return countFlowchartQuestionSlots(firstQ);
    }

    if (sectionType === "map-labeling") {
      const firstQ = sectionQuestions[0] || {};
      const items = firstQ?.items || [];
      return items.length || 0;
    }

    // Default: each question counts as 1 (abc/abcd/fill)
    return sectionQuestions.length;
  };

  // Get question range for a part (considering multi-question types)
  // Calculate start number based on all previous parts to ensure continuous numbering
  const getPartQuestionRange = useCallback(
    (partIndex) => {
      const allQuestions = test?.questions || [];
      const partInstructions = test?.partInstructions || [];

      // Calculate start number by summing section-level counts from all previous parts
      let startNum = 1;
      for (let p = 0; p < partIndex; p++) {
        const partInfo = partInstructions[p] || {};
        const sections = Array.isArray(partInfo?.sections) ? partInfo.sections : [];
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx] || {};
          const sectionQuestions = allQuestions.filter((q) => q.partIndex === p && q.sectionIndex === sIdx);
          const qCount = getSectionQuestionCount(section, sectionQuestions);
          startNum += qCount;
        }
      }

      // Get questions for this part
      const partQuestions = allQuestions.filter((q) => q.partIndex === partIndex);
      if (partQuestions.length === 0) return { start: 0, end: 0, questions: [] };

      // Calculate total questions in this part by summing section-level counts
      const partInfo = partInstructions[partIndex] || {};
      const sections = Array.isArray(partInfo?.sections) ? partInfo.sections : [];

      let totalCount = 0;
      if (sections.length) {
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx] || {};
          const sectionQuestions = allQuestions.filter((q) => q.partIndex === partIndex && q.sectionIndex === sIdx);
          totalCount += getSectionQuestionCount(section, sectionQuestions);
        }
      } else {
        // Fallback: count per question
        partQuestions.forEach((q) => {
          totalCount += getQuestionCount(q);
        });
      }

      return {
        start: startNum,
        end: startNum + totalCount - 1,
        questions: partQuestions,
      };
    },
    [test?.questions, test?.partInstructions, getQuestionCount]
  );

  // Get actual question range for display (accounts for embedded numbers in notes)
  const getPartDisplayRange = useCallback(
    (partIndex) => {
      const partInstructions = test?.partInstructions || [];
      const allQuestions = test?.questions || [];
      const partInfo = partInstructions[partIndex];
      const sections = partInfo?.sections || [];
      const partQuestions = allQuestions.filter((q) => q.partIndex === partIndex);
      
      let minNum = Infinity;
      let maxNum = -Infinity;
      
      sections.forEach((section, sIdx) => {
        const sectionQuestions = partQuestions.filter((q) => q.sectionIndex === sIdx);
        const firstQ = sectionQuestions[0];
        const sectionQType = getListeningSectionType(section, firstQ);
        
        if (sectionQType === "notes-completion" && firstQ?.notesText) {
          const matches = stripHtml(firstQ.notesText).match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
          let foundNumbered = false;
          matches.forEach((match) => {
            const numMatch = String(match).match(/^(\d+)/);
            if (numMatch) {
              const num = parseInt(numMatch[1], 10);
              minNum = Math.min(minNum, num);
              maxNum = Math.max(maxNum, num);
              foundNumbered = true;
            }
          });
          if (!foundNumbered && section.startingQuestionNumber) {
            const start = section.startingQuestionNumber;
            minNum = Math.min(minNum, start);
            maxNum = Math.max(maxNum, start + Math.max(0, matches.length) - 1);
          }
        } else if (sectionQType === "form-completion" && firstQ?.formRows) {
          // Get blank numbers from formRows
          firstQ.formRows.forEach((row) => {
            if (row.isBlank && row.blankNumber) {
              minNum = Math.min(minNum, row.blankNumber);
              maxNum = Math.max(maxNum, row.blankNumber);
            }
          });
        } else if (sectionQType === "matching" && firstQ?.answers) {
          // Get numbers from answers object
          Object.keys(firstQ.answers).forEach((key) => {
            const num = parseInt(key, 10);
            if (!isNaN(num)) {
              minNum = Math.min(minNum, num);
              maxNum = Math.max(maxNum, num);
            }
          });
        } else if (section.startingQuestionNumber) {
          // Use starting number from section
          const start = section.startingQuestionNumber;
          minNum = Math.min(minNum, start);
          // Estimate end based on question count
          if (sectionQType === "multi-select") {
            const count = sectionQuestions.reduce((sum, q) => sum + (q.requiredAnswers || 2), 0);
            maxNum = Math.max(maxNum, start + count - 1);
          } else if (sectionQType === LISTENING_CLOZE_TYPE) {
            const count = countListeningTableBlanks(firstQ) || 0;
            maxNum = Math.max(maxNum, start + Math.max(0, count) - 1);
          } else if (sectionQType === "flowchart") {
            const count = countFlowchartQuestionSlots(firstQ) || 0;
            maxNum = Math.max(maxNum, start + Math.max(0, count) - 1);
          } else if (sectionQType === "map-labeling") {
            const count = (firstQ?.items || []).length || 0;
            maxNum = Math.max(maxNum, start + Math.max(0, count) - 1);
          } else {
            maxNum = Math.max(maxNum, start + sectionQuestions.length - 1);
          }
        }
      });
      
      // Fallback to calculated range
      if (minNum === Infinity || maxNum === -Infinity) {
        const calcRange = getPartQuestionRange(partIndex);
        return calcRange;
      }
      
      return { start: minNum, end: maxNum };
    },
    [test?.partInstructions, test?.questions, getPartQuestionRange]
  );

  // Count answered questions in a part
  const getPartSlots = useCallback(
    (partIndex) => {
      const allQuestions = test?.questions || [];
      const partInfo = (test?.partInstructions || [])[partIndex];
      const sections = partInfo?.sections || [];
      const slots = [];

      const getSectionQuestions = (sectionIndex) =>
        allQuestions
          .filter((q) => q.partIndex === partIndex && q.sectionIndex === sectionIndex)
          .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));

      const numericKeys = (obj) =>
        obj && typeof obj === "object" && !Array.isArray(obj)
          ? Object.keys(obj)
              .map((k) => parseInt(k, 10))
              .filter((n) => Number.isFinite(n))
              .sort((a, b) => a - b)
          : [];

      // Calculate part range to get starting number
      const partRange = getPartQuestionRange(partIndex);
      let currentStart = partRange.start;

      sections.forEach((section, sectionIndex) => {
        const sectionQuestions = getSectionQuestions(sectionIndex);
        if (!sectionQuestions.length) return;

        const firstQ = sectionQuestions[0];
        const sectionType = getListeningSectionType(section, firstQ);

        // Calculate section start number
        let sectionStartNum = typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0
          ? section.startingQuestionNumber
          : currentStart;

        if (sectionType === "form-completion") {
          const keys = numericKeys(firstQ?.answers);
          if (keys.length) {
            keys.forEach((n) => slots.push({ type: "single", key: `q${n}` }));
          } else {
            const blanks = (firstQ?.formRows || []).filter((r) => r && r.isBlank);
            blanks.forEach((row, idx) => {
              const num = row?.blankNumber ? sectionStartNum + Number(row.blankNumber) - 1 : sectionStartNum + idx;
              slots.push({ type: "single", key: `q${num}` });
            });
          }
          // Update currentStart for next section
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            const keys = numericKeys(firstQ?.answers);
            const questionCount = keys.length || (firstQ?.formRows || []).filter((r) => r && r.isBlank).length;
            currentStart += questionCount;
          }
          return;
        }

        if (sectionType === "notes-completion") {
          const keys = numericKeys(firstQ?.answers);
          if (keys.length) {
            keys.forEach((n) => slots.push({ type: "single", key: `q${n}` }));
          } else {
            const notesText = String(firstQ?.notesText || "");
            const matches = stripHtml(notesText).match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
            let autoNum = sectionStartNum;
            matches.forEach((token) => {
              const m = String(token).match(/^(\d+)/);
              if (m) {
                const num = parseInt(m[1], 10);
                if (Number.isFinite(num)) {
                  slots.push({ type: "single", key: `q${num}` });
                  autoNum = Math.max(autoNum, num + 1);
                }
              } else {
                slots.push({ type: "single", key: `q${autoNum}` });
                autoNum += 1;
              }
            });
          }
          // Update currentStart for next section
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            const keys = numericKeys(firstQ?.answers);
            const matches = stripHtml(String(firstQ?.notesText || "")).match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
            const questionCount = keys.length || matches.length;
            currentStart += questionCount;
          }
          return;
        }

        if (sectionType === "matching") {
          const keys = numericKeys(firstQ?.answers);
          if (keys.length) {
            keys.forEach((n) => slots.push({ type: "single", key: `q${n}` }));
          } else {
            const leftItems = firstQ?.leftItems || firstQ?.items || [];
            leftItems.forEach((_, idx) => slots.push({ type: "single", key: `q${sectionStartNum + idx}` }));
          }
          // Update currentStart for next section
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            const keys = numericKeys(firstQ?.answers);
            const leftItems = firstQ?.leftItems || firstQ?.items || [];
            const questionCount = keys.length || leftItems.length;
            currentStart += questionCount;
          }
          return;
        }

        if (sectionType === "multi-select") {
          let groupStart = sectionStartNum;
          sectionQuestions.forEach((q) => {
            const required = Number(q?.requiredAnswers) || 2;
            slots.push({ type: "multi-select", key: `q${groupStart}`, slots: required });
            groupStart += required;
          });
          // Update currentStart for next section
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            const totalRequired = sectionQuestions.reduce((sum, q) => sum + (Number(q?.requiredAnswers) || 2), 0);
            currentStart += totalRequired;
          }
          return;
        }

        if (sectionType === LISTENING_CLOZE_TYPE) {
          const blanks = countListeningTableBlanks(firstQ) || 0;
          const count = Math.max(0, blanks);
          for (let i = 0; i < count; i++) {
            slots.push({ type: "single", key: `q${sectionStartNum + i}` });
          }
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            currentStart += count;
          }
          return;
        }

        if (sectionType === "flowchart") {
          const entries = getFlowchartBlankEntries(firstQ, sectionStartNum);
          entries.forEach((entry) => {
            slots.push({ type: "single", key: `q${entry.num}` });
          });
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            currentStart += entries.length;
          }
          return;
        }

        if (sectionType === "map-labeling") {
          const items = firstQ?.items || [];
          const count = items.length || 0;
          for (let i = 0; i < count; i++) {
            slots.push({ type: "single", key: `q${sectionStartNum + i}` });
          }
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            currentStart += count;
          }
          return;
        }

        // Default: sequential single-slot questions from startingQuestionNumber
        const start = Number(section?.startingQuestionNumber) || null;
        if (!start) {
          // best-effort: parse leading number in questionText like "11   ..."
          const m = String(firstQ?.questionText || "").trim().match(/^(\d+)\b/);
          if (m) {
            const parsed = parseInt(m[1], 10);
            if (Number.isFinite(parsed)) {
              sectionQuestions.forEach((_, idx) => slots.push({ type: "single", key: `q${parsed + idx}` }));
              // Update currentStart
              if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
                currentStart += sectionQuestions.length;
              }
              return;
            }
          }
        }
        const startNum = start || sectionStartNum;
        sectionQuestions.forEach((_, idx) => slots.push({ type: "single", key: `q${startNum + idx}` }));
        // Update currentStart for next section
        if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
          currentStart += sectionQuestions.length;
        }
      });

      return slots;
    },
    [test?.questions, test?.partInstructions, getPartQuestionRange]
  );

  const getAnsweredCount = useCallback(
    (partIndex) => {
      const slots = getPartSlots(partIndex);
      let count = 0;

      for (const s of slots) {
        if (s.type === "multi-select") {
          const ans = answers[s.key];
          const filled = Array.isArray(ans) ? Math.min(ans.length, s.slots || 2) : 0;
          count += filled;
          continue;
        }
        const ans = answers[s.key];
        if (ans != null && String(ans).trim() !== "") count += 1;
      }

      return count;
    },
    [answers, getPartSlots]
  );

  const getPartTotalQuestions = useCallback(
    (partIndex) => {
      const slots = getPartSlots(partIndex);
      return slots.reduce((sum, s) => sum + (s.type === "multi-select" ? (s.slots || 2) : 1), 0);
    },
    [getPartSlots]
  );

  const getNavigatorItems = useCallback(
    (partIndex) => {
      const slots = getPartSlots(partIndex);
      const items = [];

      slots.forEach((s) => {
        const startNum = parseInt(String(s.key).replace(/^q/, ""), 10);
        if (!Number.isFinite(startNum)) return;

        if (s.type === "multi-select") {
          const count = s.slots || 2;
          const endNum = startNum + count - 1;
          items.push({
            type: "multi-select",
            startNum,
            endNum,
            label: `${startNum}-${endNum}`,
            questionKey: s.key,
          });
        } else {
          items.push({
            type: "single",
            startNum,
            endNum: startNum,
            label: `${startNum}`,
            questionKey: s.key,
          });
        }
      });

      const seen = new Set();
      const deduped = [];
      for (const it of items) {
        if (seen.has(it.startNum)) continue;
        seen.add(it.startNum);
        deduped.push(it);
      }
      deduped.sort((a, b) => a.startNum - b.startNum);
      return deduped;
    },
    [getPartSlots]
  );

  // Flatten navigator items across all parts (used by arrow navigation)
  const allNavigatorItems = useMemo(() => {
    const partCount = test?.partInstructions?.length || 0;
    if (!partCount) return [];

    const items = [];
    for (let p = 0; p < partCount; p++) {
      const partItems = getNavigatorItems(p);
      partItems.forEach((it) => items.push({ ...it, partIndex: p }));
    }
    items.sort((a, b) => a.startNum - b.startNum);
    return items;
  }, [test?.partInstructions, getNavigatorItems]);

  // Check if navigator item is answered
  const isNavItemAnswered = useCallback(
    (item) => {
      if (item.type === "multi-select") {
        const ans = answers[item.questionKey];
        return Array.isArray(ans) && ans.length > 0;
      }
      const ans = answers[item.questionKey];
      return !!ans;
    },
    [answers]
  );

  // Check if navigator item is active
  const isNavItemActive = useCallback(
    (item) => {
      if (item.type === "multi-select") {
        return activeQuestion >= item.startNum && activeQuestion <= item.endNum;
      }
      return activeQuestion === item.startNum;
    },
    [activeQuestion]
  );

  // Check if question is answered
  /* eslint-disable-next-line no-unused-vars */
  const isQuestionAnswered = useCallback(
    (qNum) => {
      const ans = answers[`q${qNum}`];
      if (Array.isArray(ans)) return ans.length > 0;
      return !!ans;
    },
    [answers]
  );

  // Calculate total answered questions
  const totalAnswered = useMemo(() => {
    let count = 0;

    // Build a map of required slots for multi-select questions by their globalNumber
    const requiredMap = {};
    if (Array.isArray(test?.questions)) {
      test.questions.forEach((q) => {
        const num = Number(q?.globalNumber);
        if (!Number.isFinite(num)) return;
        const req = Number(q?.requiredAnswers);
        if (Number.isFinite(req) && req > 0) requiredMap[num] = req;
        else if (String(q?.questionType || '').toLowerCase() === 'multi-select') requiredMap[num] = 2;
      });
    }

    Object.keys(answers).forEach((key) => {
      const m = key.match(/^q(\d+)$/);
      if (!m) return;
      const qNum = Number(m[1]);
      const ans = answers[key];

      // If the answer is an array (checkbox multi-select), count number of selections
      if (Array.isArray(ans)) {
        const selected = ans.filter((x) => x != null).length;
        const cap = requiredMap[qNum] || 2;
        count += Math.min(selected, cap);
        return;
      }

      // If it's a string that looks like a multi selection (csv, pipe or slash), split and count
      if (typeof ans === 'string' && (ans.includes(',') || ans.includes('|') || ans.includes('/'))) {
        const parts = ans.split(new RegExp('[,|/]')).map((s) => s.trim()).filter(Boolean);
        const cap = requiredMap[qNum] || 2;
        count += Math.min(parts.length, cap);
        return;
      }

      // Default truthy value counts as 1 slot
      if (ans != null && String(ans).trim() !== '') count += 1;
    });

    return count;
  }, [answers, test?.questions]);

  // Calculate total questions
  const totalQuestions = useMemo(() => {
    if (!test?.partInstructions) return 40;
    let total = 0;
    test.partInstructions.forEach((_, partIndex) => {
      const range = getPartDisplayRange(partIndex);
      if (range.start && range.end) {
        total = Math.max(total, range.end);
      }
    });
    return total || 40;
  }, [test?.partInstructions, getPartDisplayRange]);

  // Timer warning states
  const timerWarning = timeRemaining > 60 && timeRemaining <= 300; // < 5 min
  const timerCritical = timeRemaining > 0 && timeRemaining <= 60; // < 1 min

  // Scroll to question
  const scrollToQuestion = useCallback((qNum) => {
    const el = questionRefs.current[qNum];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveQuestion(qNum);
      // try to focus the first interactive control inside the question for better UX
      try {
        const isFocusable = el.matches && el.matches("input, select, textarea, button");
        if (isFocusable) {
          el.focus({ preventScroll: true });
        } else {
          const input = el.querySelector("input, select, textarea, button");
          if (input) input.focus({ preventScroll: true });
        }
      } catch (e) {}
    }
  }, []);

  const goToNavItem = useCallback(
    (item) => {
      if (!item) return;

      // Keep the footer expanded on the destination part (like KET-reading)
      setExpandedPart(item.partIndex);

      if (item.partIndex !== currentPartIndex) {
        pendingScrollToRef.current = item.startNum;
        setCurrentPartIndex(item.partIndex);
        return;
      }

      scrollToQuestion(item.startNum);
    },
    [currentPartIndex, scrollToQuestion]
  );

  // After switching parts, perform any pending scroll once the question anchors exist.
  useEffect(() => {
    let rafId = null;
    let tries = 0;

    const attempt = () => {
      const target = pendingScrollToRef.current;
      if (target == null) return;

      if (questionRefs.current[target]) {
        pendingScrollToRef.current = null;
        scrollToQuestion(target);
        return;
      }

      tries += 1;
      if (tries < 12) {
        rafId = requestAnimationFrame(attempt);
      }
    };

    attempt();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [currentPartIndex, scrollToQuestion]);

  // Find currently visible question (center of viewport or nearest to container center)
  const findVisibleQuestion = useCallback(() => {
    const keys = Object.keys(questionRefs.current).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return null;

    const containerRect = listQuestionRef.current ? listQuestionRef.current.getBoundingClientRect() : null;
    const centerY = containerRect ? (containerRect.top + containerRect.bottom) / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

    let best = null;
    let bestDist = Infinity;

    for (const k of keys) {
      const el = questionRefs.current[k];
      if (!el || !el.getBoundingClientRect) continue;
      const r = el.getBoundingClientRect();
      const elCenter = (r.top + r.bottom) / 2;
      const dist = Math.abs(elCenter - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    }

    return best;
  }, []);

  // NOTE:
  // We intentionally do NOT continuously overwrite activeQuestion based on viewport center.
  // That behavior caused "Q1 -> jump to Q3" and wrong boundary disable states.
  // activeQuestion is treated as a navigation cursor, updated via focus/click and arrow navigation.

  // Ensure we always have a sane activeQuestion (for boundary disable states)
  useEffect(() => {
    if (activeQuestion != null) return;
    if (!allNavigatorItems.length) return;
    setActiveQuestion(allNavigatorItems[0].startNum);
  }, [activeQuestion, allNavigatorItems]);

  const currentNavIndex = useMemo(() => {
    if (!allNavigatorItems.length) return -1;
    const currentNum = activeQuestion ?? allNavigatorItems[0].startNum;

    let idx = allNavigatorItems.findIndex(
      (it) => currentNum >= it.startNum && currentNum <= it.endNum
    );
    if (idx === -1) {
      idx = allNavigatorItems.findIndex((it) => it.startNum >= currentNum);
      if (idx === -1) idx = allNavigatorItems.length - 1;
    }
    return idx;
  }, [activeQuestion, allNavigatorItems]);

  const canGoPrev = currentNavIndex > 0;
  const canGoNext =
    currentNavIndex !== -1 && currentNavIndex < allNavigatorItems.length - 1;

  // Navigate to next/prev question (robust: use visible question when none is active)
  const navigateQuestion = useCallback(
    (direction) => {
      if (!allNavigatorItems.length) return;

      const visible = findVisibleQuestion();
      const currentNum = activeQuestion ?? visible ?? allNavigatorItems[0].startNum;

      // Find the current nav item by range match (supports multi-select ranges)
      let currentIndex = allNavigatorItems.findIndex(
        (it) => currentNum >= it.startNum && currentNum <= it.endNum
      );

      // If not found, choose the nearest item by startNum
      if (currentIndex === -1) {
        currentIndex = allNavigatorItems.findIndex((it) => it.startNum >= currentNum);
        if (currentIndex === -1) currentIndex = allNavigatorItems.length - 1;
      }

      // Boundary behavior like DoKetReading: disable at the ends
      if (direction === "prev" && currentIndex <= 0) return;
      if (direction === "next" && currentIndex >= allNavigatorItems.length - 1) return;

      const targetIndex =
        direction === "next"
          ? Math.min(allNavigatorItems.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

      const targetItem = allNavigatorItems[targetIndex];
      goToNavItem(targetItem);
    },
    [activeQuestion, allNavigatorItems, findVisibleQuestion, goToNavItem]
  );

  // Handle part click
  const handlePartClick = useCallback(
    (partIndex) => {
      // Match KET-reading behavior: clicking a Part jumps to the first question of that part
      const firstItem = getNavigatorItems(partIndex)[0];

      setExpandedPart(partIndex);

      if (partIndex !== currentPartIndex) {
        pendingScrollToRef.current = firstItem?.startNum ?? null;
        setCurrentPartIndex(partIndex);
        return;
      }

      if (firstItem) {
        scrollToQuestion(firstItem.startNum);
      }
    },
    [currentPartIndex, getNavigatorItems, scrollToQuestion]
  );

  // Handle audio events
  const handleAudioEnded = useCallback((partIndex) => {
    setAudioPlayed((prev) => ({ ...prev, [partIndex]: true }));
  }, []);

  const handleAudioPlay = useCallback(
    (partIndex) => {
      if (audioPlayed[partIndex]) {
        if (audioRef.current) {
          audioRef.current.pause();
          // Guard against invalid duration values in test envs (NaN) or slow metadata loading
          const dur = Number(audioRef.current.duration);
          if (Number.isFinite(dur)) {
            try {
              audioRef.current.currentTime = dur;
            } catch (e) {
              // ignore any errors setting currentTime
            }
          }
        }
        alert("Audio này chỉ được nghe 1 lần!");
      }
    },
    [audioPlayed]
  );

  // Start the test and (optionally) autoplay audio. This is invoked by the "start" modal.
  const handleStartClick = useCallback(() => {
    setShowStartModal(false);
    setStarted(true);
    setRequestAutoPlay(true);
    autoSubmittingRef.current = false;

    // Starting from the modal always means a fresh timer should begin.
    // Any stale local expires key from an abandoned attempt must be discarded.
    try {
      localStorage.removeItem(expiresKey);
      if (test) {
        const durationSeconds = test?.duration ? test.duration * 60 : 30 * 60;
        const expiresAt = Date.now() + durationSeconds * 1000;
        syncTimingState(expiresAt, durationSeconds);
      }
    } catch (e) {}

    // Attempt to play the audio as part of the user gesture
    setTimeout(() => {
      if (audioRef.current) {
        try {
          const p = audioRef.current.play();
          if (p && typeof p.then === 'function') {
            p.then(() => setIsAudioPlaying(true)).catch(() => {});
          } else {
            // immediate play
            setIsAudioPlaying(true);
          }
        } catch (e) {
          // ignore autoplay errors - user can click play manually
        }
      }
    }, 0);
    // Clear the request flag after a short delay so it doesn't stick around
    setTimeout(() => setRequestAutoPlay(false), 1200);
  }, [test, expiresKey, syncTimingState]);

  // ===================== RENDER FUNCTIONS =====================

  // Render multiple choice question (single answer) - Part 2 style
  const renderMultipleChoice = (question, globalNumber) => {
    const options = question.options || [];
    const selectedAnswer = answers[`q${globalNumber}`];

    return (
      <div
        id={`question-${globalNumber}`}
        ref={(el) => (questionRefs.current[globalNumber] = el)}
        onClick={() => setActiveQuestion(globalNumber)}
        style={{
          ...styles.questionItem,
          backgroundColor: activeQuestion === globalNumber ? "#eff6ff" : "transparent",
        }}
      >
        <div style={styles.questionHeader}>
          <div style={styles.questionNumber}>{globalNumber}</div>
          <div style={styles.questionText}>{question.questionText}</div>
        </div>
        <ul style={styles.optionsList}>
          {options.map((opt, idx) => {
            const optionId = `q${globalNumber}opt${idx}`;
            const optionLetter = String.fromCharCode(65 + idx);
            const isSelected = selectedAnswer === optionLetter;

            return (
              <li key={idx} style={styles.optionItem}>
                <label
                  htmlFor={optionId}
                  style={{
                    ...styles.optionLabel,
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                  }}
                >
                  <span style={styles.optionText}>{opt}</span>
                </label>
                <input
                  id={optionId}
                  type="radio"
                  name={`q${globalNumber}`}
                  style={styles.radioInput}
                  checked={isSelected}
                  onChange={() => handleAnswerChange(`q${globalNumber}`, optionLetter)}
                  onFocus={() => setActiveQuestion(globalNumber)}
                  disabled={submitted}
                />
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // Render multiple choice many (checkboxes) - Questions 25-26 style (IELTS multi-select)
  const renderMultipleChoiceMany = (question, startNumber, count = 2) => {
    const options = question.options || [];
    const questionKey = `q${startNumber}`;
    const selectedAnswers = answers[questionKey] || [];
    const endNumber = startNumber + count - 1;

    return (
      <div
        id={`question-${startNumber}`}
        ref={(el) => (questionRefs.current[startNumber] = el)}
        style={{
          ...styles.multiSelectContainer,
          backgroundColor: activeQuestion === startNumber ? "#eff6ff" : "#e8f4fc",
        }}
      >
        {/* Question number badge */}
        <div style={styles.multiSelectHeader}>
          <span style={styles.multiSelectBadge}>{startNumber}-{endNumber}</span>
          <span style={styles.multiSelectQuestionText}>{question.questionText}</span>
        </div>
        
        {/* Options with checkboxes */}
        <div style={styles.multiSelectOptions}>
          {options.map((opt, idx) => {
            const optionId = `q${startNumber}checkbox${idx}`;
            const isSelected = selectedAnswers.includes(idx);
            // Check if option already has letter prefix like "A. " or "A "
            const hasPrefix = /^[A-Z][.\s]/.test(opt);
            const letterLabel = String.fromCharCode(65 + idx); // A, B, C...

            return (
              <label
                key={idx}
                htmlFor={optionId}
                style={{
                  ...styles.multiSelectOption,
                  backgroundColor: isSelected ? "#d1e7dd" : "#fff",
                  borderColor: isSelected ? "#0f5132" : "#dee2e6",
                }}
              >
                <input
                  id={optionId}
                  type="checkbox"
                  style={styles.multiSelectCheckbox}
                  checked={isSelected}
                  onChange={(e) =>
                    handleCheckboxChange(questionKey, idx, e.target.checked, count)
                  }
                  onFocus={() => setActiveQuestion(startNumber)}
                  disabled={submitted}
                />
                <span style={styles.multiSelectOptionText}>
                  {!hasPrefix && <strong>{letterLabel}. </strong>}
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Render gap filling question (input style)
  const renderFillQuestion = (question, globalNumber) => {
    return (
      <div
        id={`question-${globalNumber}`}
        ref={(el) => (questionRefs.current[globalNumber] = el)}
        style={{
          ...styles.fillQuestionItem,
          backgroundColor: activeQuestion === globalNumber ? "#eff6ff" : "transparent",
        }}
      >
        <span style={styles.fillQuestionNumber}>{globalNumber}</span>
        <input
          type="text"
          value={answers[`q${globalNumber}`] || ""}
          onChange={(e) => handleAnswerChange(`q${globalNumber}`, e.target.value)}
          onFocus={() => setActiveQuestion(globalNumber)}
          disabled={submitted}
          style={styles.fillInput}
          placeholder="Type your answer..."
        />
      </div>
    );
  };

  // Render matching question - Part 3 style with drag items and options
  const renderMatching = (question, startNumber) => {
    const leftItems = question.leftItems || question.items || [];
    const leftTitle = question.leftTitle || "Items";
    const rightTitle = question.rightTitle || "Options";
    // Options can be in different formats: array of strings, or array of objects
    // Note: Use options if it has items, otherwise fall back to rightItems
    let rightItems = (question.options && question.options.length > 0) 
      ? question.options 
      : (question.rightItems || []);
    
    // If rightItems are objects with label/text, extract text
    if (rightItems.length > 0 && typeof rightItems[0] === 'object') {
      rightItems = rightItems.map(opt => opt.text || opt.label || opt);
    }



    return (
      <div style={styles.matchingContainer}>
        {/* Left side - items with dropdowns */}
        <div style={styles.matchingLeft}>
          <div style={styles.optionsTitle}>{leftTitle}</div>
          <div style={styles.matchingItemsList}>
            {leftItems.map((item, idx) => {
              const qNum = startNumber + idx;
              const selectedValue = answers[`q${qNum}`];
              // Handle item as string or object
              const itemText = typeof item === 'object' ? (item.text || item.label || item) : item;

              return (
                <div
                  key={idx}
                  ref={(el) => (questionRefs.current[qNum] = el)}
                  style={{
                    ...styles.matchingRow,
                    backgroundColor: activeQuestion === qNum ? "#eff6ff" : "transparent",
                  }}
                >
                  <span style={styles.matchingQuestionNum}>{qNum}</span>
                  <span style={styles.matchingItemText}>{itemText}</span>
                  <div style={styles.matchingDropdownWrapper}>
                    <select
                      value={selectedValue || ""}
                      onChange={(e) => handleAnswerChange(`q${qNum}`, e.target.value)}
                      onFocus={() => setActiveQuestion(qNum)}
                      disabled={submitted}
                      style={{
                        ...styles.matchingSelect,
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        paddingRight: "30px",
                      }}
                    >
                      <option value="">--</option>
                      {rightItems.map((_, optIdx) => (
                        <option key={optIdx} value={String.fromCharCode(65 + optIdx)}>
                          {String.fromCharCode(65 + optIdx)}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64748b" }}>
                      <LineIcon name="chevron-down" size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - list of options */}
        <div style={styles.matchingRight}>
          <div style={styles.optionsTitle}>{rightTitle}</div>
          <div style={styles.optionsContainer}>
            {rightItems.map((opt, idx) => {
              const optText = typeof opt === 'object' ? (opt.text || opt.label || JSON.stringify(opt)) : opt;
              // Check if optText already has letter prefix like "A. " or "A "
              const hasPrefix = /^[A-Z][.\s]/.test(optText);
              return (
                <div key={idx} style={styles.optionCard}>
                  {!hasPrefix && (
                    <strong style={{ marginRight: '8px' }}>{String.fromCharCode(65 + idx)}</strong>
                  )}
                  {optText}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderFlowchart = (question, startNumber) => {
    const entries = getFlowchartBlankEntries(question, startNumber);
    const entryByStepIndex = new Map(entries.map((entry) => [entry.stepIndex, entry]));
    const optionEntries = getConfiguredFlowchartOptionEntries(question?.options || []);
    const optionRows = getFlowchartOptionTableRows(optionEntries);
    const steps = Array.isArray(question?.steps) ? question.steps : [];

    return (
      <div style={{ width: "100%" }}>
        {optionRows.length > 0 && (
          <div style={{
            maxWidth: "760px",
            margin: "0 auto 18px",
            border: "1px solid #94a3b8",
            borderRadius: "10px",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}>
            {optionRows.map((row, rowIndex) => (
              <div
                key={`flowchart-option-row-${rowIndex}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "52px minmax(0, 1fr) 52px minmax(0, 1fr)",
                  borderTop: rowIndex === 0 ? "none" : "1px solid #cbd5e1",
                }}
              >
                {row.map((option, columnIndex) => {
                  if (!option) {
                    return (
                      <React.Fragment key={`flowchart-option-empty-${rowIndex}-${columnIndex}`}>
                        <div style={{ borderLeft: columnIndex === 1 ? "1px solid #cbd5e1" : "none", backgroundColor: "#f8fafc" }}></div>
                        <div style={{ borderLeft: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}></div>
                      </React.Fragment>
                    );
                  }

                  return (
                    <React.Fragment key={`flowchart-option-${option.value}`}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        backgroundColor: "#fff7ed",
                        color: "#9a3412",
                        borderLeft: columnIndex === 1 ? "1px solid #cbd5e1" : "none",
                        borderRight: "1px solid #cbd5e1",
                        minHeight: "44px",
                      }}>
                        {option.value}
                      </div>
                      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", fontSize: "13px" }}>
                        {option.label || option.raw}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div style={{
          maxWidth: "760px",
          margin: "0 auto",
          fontFamily: styles.pageWrapper.fontFamily,
        }}>
          {question?.questionText && (
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: "1.1rem", marginBottom: "14px", color: styles.sectionTitle.color }}>
              {question.questionText}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {steps.map((step, stepIndex) => {
            const blankEntry = entryByStepIndex.get(stepIndex);
            const textParts = splitFlowchartStepText(step?.text || "");
            const previewBefore = blankEntry
              ? (textParts.hasPlaceholder ? textParts.before : String(step?.text || ""))
              : String(step?.text || "");
            const previewAfter = blankEntry && textParts.hasPlaceholder ? textParts.after : "";
            const questionNumber = blankEntry?.num || null;
            const answerKey = questionNumber ? `q${questionNumber}` : null;
            const selectedValue = answerKey ? answers[answerKey] || "" : "";
            const isActive = questionNumber != null && activeQuestion === questionNumber;
            const flowchartSelectLabels = optionEntries.map((option) => {
              const labelText = option.label || option.raw || "";
              return labelText ? `${option.value} ${labelText}` : option.value;
            });
            const flowchartMenuWidth = Math.min(
              280,
              Math.max(
                180,
                flowchartSelectLabels.reduce((maxWidth, text) => Math.max(maxWidth, text.length * 7 + 36), 0)
              )
            );
            const isDropdownOpen = questionNumber != null && openFlowchartQuestion === questionNumber;
            const triggerLabel = selectedValue || "Select";
            const flowchartBadgeStyle = questionNumber != null
              ? {
                  ...styles.questionNumber,
                  minWidth: "28px",
                  width: "28px",
                  height: "28px",
                  margin: "0 6px",
                  fontSize: "13px",
                  lineHeight: 1,
                  verticalAlign: "middle",
                  boxShadow: isActive ? "0 0 0 2px rgba(220, 38, 38, 0.15)" : "none",
                }
              : null;

            return (
              <React.Fragment key={`flowchart-step-${stepIndex}`}>
                <div
                  id={questionNumber != null ? `question-${questionNumber}` : undefined}
                  ref={(el) => {
                    if (questionNumber != null) {
                      questionRefs.current[questionNumber] = el;
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    lineHeight: 1.85,
                    fontSize: styles.multiSelectQuestionText.fontSize,
                    color: styles.multiSelectQuestionText.color,
                    position: "relative",
                    zIndex: isDropdownOpen ? 4 : 1,
                  }}
                >
                  <div style={{ lineHeight: 1.85, textAlign: "center", whiteSpace: "normal" }}>
                    <span>{previewBefore}</span>
                    {questionNumber != null && (
                      <span style={flowchartBadgeStyle}>{questionNumber}</span>
                    )}
                    {questionNumber != null && (
                      <span
                        ref={(el) => {
                          if (questionNumber != null) {
                            flowchartDropdownRefs.current[questionNumber] = el;
                          }
                        }}
                        style={{ position: "relative", display: "inline-flex", alignItems: "center", margin: "0 6px", verticalAlign: "middle", zIndex: isDropdownOpen ? 5 : 1 }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuestion(questionNumber);
                            if (!submitted) {
                              setOpenFlowchartQuestion((prev) => (prev === questionNumber ? null : questionNumber));
                            }
                          }}
                          onFocus={() => setActiveQuestion(questionNumber)}
                          disabled={submitted}
                          aria-haspopup="listbox"
                          aria-expanded={isDropdownOpen}
                          style={{
                            minWidth: selectedValue ? "64px" : "96px",
                            maxWidth: "110px",
                            padding: "6px 28px 6px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${isActive ? "#ef4444" : "#f59e0b"}`,
                            backgroundColor: submitted ? "#fefce8" : "#fef3c7",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: styles.multiSelectQuestionText.color,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            cursor: submitted ? "default" : "pointer",
                            position: "relative",
                            boxShadow: isDropdownOpen ? "0 0 0 2px rgba(245, 158, 11, 0.15)" : "none",
                          }}
                        >
                          <span>{triggerLabel}</span>
                          <span style={{ position: "absolute", right: "10px", top: "50%", transform: `translateY(-50%) rotate(${isDropdownOpen ? 180 : 0}deg)`, color: "#b45309", transition: "transform 0.18s ease" }}>
                            <LineIcon name="chevron-down" size={14} />
                          </span>
                        </button>
                        {isDropdownOpen && !submitted && (
                          <div
                            role="listbox"
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              width: `${flowchartMenuWidth}px`,
                              maxHeight: "240px",
                              overflowY: "auto",
                              backgroundColor: styles.surfaceColor,
                              border: `1px solid ${styles.multiSelectBadge.backgroundColor}`,
                              borderRadius: "10px",
                              boxShadow: "0 16px 30px rgba(15, 23, 42, 0.16)",
                              zIndex: 120,
                              padding: "6px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleAnswerChange(answerKey, "");
                                setActiveQuestion(questionNumber);
                                setOpenFlowchartQuestion(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "none",
                                backgroundColor: selectedValue ? "transparent" : styles.multiSelectBadge.backgroundColor,
                                color: selectedValue ? styles.multiSelectQuestionText.color : "#fff",
                                borderRadius: "8px",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: selectedValue ? 500 : 700,
                                marginBottom: "4px",
                              }}
                            >
                              Select
                            </button>
                            {optionEntries.map((option) => {
                              const optionText = option.label || option.raw ? `${option.value} ${option.label || option.raw}` : option.value;
                              const isSelected = selectedValue === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    handleAnswerChange(answerKey, option.value);
                                    setActiveQuestion(questionNumber);
                                    setOpenFlowchartQuestion(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    border: "none",
                                    backgroundColor: isSelected ? "#fff7ed" : "transparent",
                                    color: styles.multiSelectQuestionText.color,
                                    borderRadius: "8px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: isSelected ? 700 : 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <span style={{ minWidth: "18px", fontWeight: 700, color: "#b45309" }}>{option.value}</span>
                                  <span>{option.label || option.raw || option.value}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </span>
                    )}
                    {questionNumber != null && <span>{previewAfter}</span>}
                  </div>
                </div>
                {stepIndex < steps.length - 1 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0 2px", color: "#94a3b8" }}>
                    <div style={{ width: "2px", height: "26px", backgroundColor: "#1d4ed8" }}></div>
                    <LineIcon name="chevron-down" size={18} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  // Render form completion (IELTS format: label + prefix + [blank/value] + suffix)
  const renderFormCompletion = (section, question, calculatedStartNum) => {
    const formTitle = question?.formTitle || "";
    const formRows = question?.formRows || [];
    const startNum = calculatedStartNum || question?.globalNumber || 1;

    if (formRows && formRows.length > 0) {
      // Use blankNumber from row data if available
      const renderBlankInput = (row, rowIdx) => {
        // blankNumber starts from 1, so qNum = startNum + (blankNumber - 1)
        const qNum = row.blankNumber ? startNum + row.blankNumber - 1 : startNum + rowIdx;
        
        return (
          <span
            key={`blank-${rowIdx}`}
            ref={(el) => (questionRefs.current[qNum] = el)}
            style={styles.formGapWrapper}
          >
            <input
              type="text"
              value={answers[`q${qNum}`] || ""}
              onChange={(e) => handleAnswerChange(`q${qNum}`, e.target.value)}
              onFocus={() => setActiveQuestion(qNum)}
              disabled={submitted}
              placeholder={`${qNum}`}
              style={{
                ...styles.formGapInput,
                borderColor: activeQuestion === qNum ? "#3b82f6" : "#d1d5db",
                boxShadow: activeQuestion === qNum ? "0 0 0 2px rgba(59, 130, 246, 0.2)" : "none",
              }}
            />
          </span>
        );
      };

      return (
        <div style={styles.formContainer}>
          {formTitle && <div style={styles.formTitle}>{formTitle}</div>}
          <div style={styles.formContent}>
            {formRows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  ...styles.formRow,
                  paddingLeft: row.isSubRow ? "24px" : "0",
                }}
              >
                {/* Label */}
                {row.label && (
                  <span style={styles.formLabel}>{row.label}</span>
                )}
                
                {/* Prefix + Blank/Value + Suffix */}
                <span style={styles.formValue}>
                  {row.prefix && <span>{row.prefix} </span>}
                  
                  {row.isBlank ? (
                    renderBlankInput(row, rowIdx)
                  ) : (
                    <span style={styles.formFixedValue}>{row.suffix || row.value || ""}</span>
                  )}
                  
                  {row.isBlank && row.suffix && <span> {row.suffix}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback: If no formRows, render simple fill questions for this section
    const questions = currentPartQuestions.filter(
      (q) => q.sectionIndex === section.sectionIndex
    );
    
    if (questions.length === 0) {
      return (
        <div style={{ color: "#6b7280", fontStyle: "italic", padding: "16px" }}>
          No questions were found for this section. Please review the test configuration.
        </div>
      );
    }
    
    return (
      <div style={styles.fillQuestionsContainer}>
        {questions.map((q) => renderFillQuestion(q, q.globalNumber))}
      </div>
    );
  };

  const renderTableCompletion = (question, startNumber, endNumber) => {
    const tableQuestion = getListeningTableQuestionData(question);
    const title = tableQuestion.title || '';
    const instruction = tableQuestion.instruction || '';
    const tableAnswers = {};

    Object.entries(answers || {}).forEach(([key, value]) => {
      const match = String(key).match(/^q(\d+)$/);
      if (!match) return;
      const num = Number(match[1]);
      if (Number.isFinite(num)) tableAnswers[num] = value;
    });

    return (
      <div style={{ width: '100%' }}>
        {instruction && (
          <div style={{ fontStyle: 'italic', marginBottom: 8 }}>{instruction}</div>
        )}
        {title && (
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>{title}</div>
        )}
        <TableCompletion
          data={{
            part: currentPartIndex + 1,
            title,
            instruction,
            columns: tableQuestion.columns || [],
            rows: tableQuestion.rows || [],
            rangeStart: startNumber,
            rangeEnd: endNumber,
          }}
          startingQuestionNumber={startNumber}
          answers={tableAnswers}
          showHeader={false}
          onFocusQuestion={(qNum) => setActiveQuestion(qNum)}
          registerQuestionRef={(qNum, el) => {
            if (el) questionRefs.current[qNum] = el;
          }}
          onChange={(nextAns) => {
            if (submitted) return;
            setAnswers((prev) => {
              const merged = { ...prev };
              Object.entries(nextAns || {}).forEach(([num, val]) => {
                merged[`q${num}`] = val;
              });
              return merged;
            });
          }}
        />
      </div>
    );
  };

  const renderMapLabeling = (question, startNumber) => {
    const safeQuestion = {
      ...(question || {}),
      mapImageUrl: question?.mapImageUrl || question?.imageUrl || '',
    };

    return (
      <MapLabelingQuestion
        question={safeQuestion}
        mode="answer"
        questionNumber={startNumber}
        studentAnswer={answers}
        onAnswerChange={(qNum, value) => handleAnswerChange(`q${qNum}`, value)}
        registerQuestionRef={(qNum, el) => {
          if (el) questionRefs.current[qNum] = el;
        }}
        onFocusQuestion={(qNum) => setActiveQuestion(qNum)}
      />
    );
  };

  // Render a section based on question type
  const renderSection = (section, sectionIndex) => {
    const sectionQuestions = currentPartQuestions.filter(
      (q) => q.sectionIndex === sectionIndex
    );
    if (sectionQuestions.length === 0) return null;

    const firstQ = sectionQuestions[0];
    
    const qType = getListeningSectionType(section, firstQ);
    
    // Calculate startNum based on all previous parts and sections
    // If the section explicitly defines a start number, treat it as authoritative.
    const partRange = getPartQuestionRange(currentPartIndex);
    let startNum =
      typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0
        ? section.startingQuestionNumber
        : partRange.start;

    // Add questions from previous sections in current part (only when start is not explicitly set)
    if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
      const partInfo = test?.partInstructions?.[currentPartIndex] || {};
      const prevSections = Array.isArray(partInfo?.sections) ? partInfo.sections : [];
      for (let s = 0; s < sectionIndex; s++) {
        const prevSection = prevSections[s] || {};
        const prevSectionQuestions = currentPartQuestions.filter((q) => q.sectionIndex === s);
        startNum += getSectionQuestionCount(prevSection, prevSectionQuestions);
      }
    }

    // Calculate actual question count based on type
    const actualQuestionCount = sectionQuestions.reduce((sum, q) => sum + getQuestionCount(q), 0);

    const displayEndNum = startNum + actualQuestionCount - 1;

    return (
      <div key={sectionIndex} style={styles.sectionContainer}>
        {/* Section Title */}
        <div style={styles.sectionTitle}>
          {section.sectionTitle || `Questions ${startNum}-${displayEndNum}`}
        </div>

        {/* Section Instruction */}
        {(section.sectionInstruction || section.instruction) && (
          <div
            style={styles.sectionInstruction}
            dangerouslySetInnerHTML={{
              __html: section.sectionInstruction || section.instruction,
            }}
          />
        )}

        {/* Questions based on type */}
        <div style={styles.questionsWrapper}>
          {qType === "multiple-choice" || qType === "abc" || qType === "abcd"
            ? sectionQuestions.map((q, qIdx) => {
                const qNum = startNum + qIdx;
                return (
                  <React.Fragment key={qNum}>
                    {renderMultipleChoice(q, qNum)}
                  </React.Fragment>
                );
              })
            : qType === "multi-select"
            ? (() => {
                let qNum = startNum;
                return sectionQuestions.map((q, qIdx) => {
                  const currentQNum = qNum;
                  qNum += q.requiredAnswers || 2;
                  return (
                    <React.Fragment key={currentQNum}>
                      {renderMultipleChoiceMany(q, currentQNum, q.requiredAnswers || 2)}
                    </React.Fragment>
                  );
                });
              })()
            : qType === "matching"
            ? renderMatching(firstQ, startNum)
            : qType === "form-completion"
            ? renderFormCompletion({ ...section, sectionIndex }, firstQ, startNum)
            : qType === "notes-completion"
            ? renderNotesCompletion(firstQ, startNum)
            : qType === "map-labeling"
            ? renderMapLabeling(firstQ, startNum)
            : qType === LISTENING_CLOZE_TYPE
            ? renderTableCompletion(firstQ, startNum, displayEndNum)
            : qType === "flowchart"
            ? renderFlowchart(firstQ, startNum)
            : sectionQuestions.map((q, qIdx) => {
                const qNum = startNum + qIdx;
                return (
                  <React.Fragment key={qNum}>
                    {renderFillQuestion(q, qNum)}
                  </React.Fragment>
                );
              })}
        </div>
      </div>
    );
  };


  // Render notes completion (Part 4 style with inline gaps)
  const renderNotesCompletion = (question, startNumber) => {
    const notesText = question.notesText || "";
    const notesTitle = question.notesTitle || "";

    const parseBlankPattern = /(\d+)\s*[_…]+|[_…]{2,}/g;

    const styleStringToObject = (styleString) => {
      if (!styleString) return undefined;
      return styleString
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .reduce((acc, decl) => {
          const [prop, value] = decl.split(':').map((v) => v.trim());
          if (!prop || !value) return acc;
          const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          acc[camelProp] = value;
          return acc;
        }, {});
    };

    const renderTextWithGaps = (text, keyPrefix, counter) => {
      const parts = text.split(/(\d+\s*[_…]+|[_…]{2,})/g);
      return parts.map((part, idx) => {
        const key = `${keyPrefix}-t-${idx}`;
        const match = part.match(/^(\d+)\s*[_…]+$/);
        if (match || part.match(/^[_…]{2,}$/)) {
          let qNum = null;
          if (match) {
            qNum = parseInt(match[1], 10);
            if (Number.isFinite(qNum)) counter.value = Math.max(counter.value, qNum + 1);
          } else {
            qNum = counter.value;
            counter.value += 1;
          }
          return (
            <span
              key={key}
              ref={(el) => (questionRefs.current[qNum] = el)}
              style={styles.gapWrapper}
            >
              <input
                type="text"
                value={answers[`q${qNum}`] || ""}
                onChange={(e) => handleAnswerChange(`q${qNum}`, e.target.value)}
                onFocus={() => setActiveQuestion(qNum)}
                disabled={submitted}
                style={{
                  ...styles.gapInput,
                  borderColor: activeQuestion === qNum ? "#3b82f6" : "#d1d5db",
                  boxShadow: activeQuestion === qNum ? "0 0 0 1px #418ec8" : "none",
                }}
              />
              {!answers[`q${qNum}`] && (
                <span style={styles.gapPlaceholder}>{qNum}</span>
              )}
            </span>
          );
        }
        return <span key={key}>{part}</span>;
      });
    };

    const renderRichNotes = () => {
      if (!notesText) return null;
      const parser = new DOMParser();
      const doc = parser.parseFromString(notesText, 'text/html');
      const counter = { value: startNumber };

      const walk = (node, keyPrefix) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return renderTextWithGaps(node.textContent || '', keyPrefix, counter);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const tag = node.tagName.toLowerCase();
        if (tag === 'br') return <br key={keyPrefix} />;

        const children = Array.from(node.childNodes)
          .map((child, idx) => walk(child, `${keyPrefix}-${idx}`))
          .flat()
          .filter(Boolean);

        const style = styleStringToObject(node.getAttribute('style'));
        const className = node.getAttribute('class') || undefined;
        const props = { key: keyPrefix, style, className };

        return React.createElement(tag, props, children);
      };

      return Array.from(doc.body.childNodes)
        .map((child, idx) => walk(child, `n-${idx}`))
        .filter(Boolean);
    };

    return (
      <div style={styles.notesContainer}>
        {notesTitle && <div style={styles.notesTitle}>{notesTitle}</div>}
        <div style={styles.notesContent} className="ql-editor">
          {renderRichNotes()}
        </div>
      </div>
    );
  };

  // ===================== MAIN RENDER =====================

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading listening test...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={{ ...styles.errorTitle, display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="error" size={18} style={{ color: "#dc2626" }} />Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate("/select-test")} style={styles.backButton}>
          ← Back to Test Selection
        </button>
      </div>
    );
  }

  const currentPart = parts[currentPartIndex];
  const audioUrl = test?.partAudioUrls?.[currentPartIndex] || test?.mainAudioUrl;
  const resolvedAudioUrl = hostPath(audioUrl);
  /* eslint-disable-next-line no-unused-vars */
  const currentRange = getPartQuestionRange(currentPartIndex);
  const displayRange = getPartDisplayRange(currentPartIndex);
  const startDurationMinutes = Math.max(1, Math.round(timeRemaining / 60));

  return (
    <div style={styles.pageWrapper}>
      <ExtensionToast message={extensionToast} />
      {/* Global Styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Aptos', 'Segoe UI Variable Text', 'Trebuchet MS', sans-serif; background: #eef4ff; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background-color: #8a8a8a; border-radius: 5px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        input[type="radio"], input[type="checkbox"] { 
          width: 16px; height: 16px; cursor: pointer; 
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header - Shared Component */}
      <TestHeader
        testType="LISTENING"
        testTitle={test?.title || "Listening Test"}
        testMeta={`${parts.length} Parts • ${totalQuestions} Questions`}
        timeRemaining={timeRemaining}
        answeredCount={totalAnswered}
        totalQuestions={totalQuestions}
        onSubmit={handleSubmit}
        submitted={submitted}
        timerWarning={timerWarning}
        timerCritical={timerCritical}
        showAutoSave={true}
      />

      {started && !submitted && timeRemaining === 0 && graceRemaining > 0 && (
        <div
          style={{
            margin: "16px 24px 0",
            borderRadius: 12,
            padding: "12px 16px",
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: "0 10px 25px rgba(249, 115, 22, 0.08)",
          }}
        >
          <strong>Official time is over.</strong> The system keeps your answers for another {formatClock(graceRemaining)} in case of power loss or page reload. Your teacher can extend the time if needed.
        </div>
      )}

      {/* Part Info Box */}
      <div style={styles.partInfoBox}>
        <div style={styles.partTitle}>
          {currentPart?.title || `Part ${currentPartIndex + 1}`}
        </div>
        <div style={styles.partDescription}>
          Listen and answer questions {displayRange.start}-{displayRange.end}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
      {audioUrl && started && (
        <div style={styles.audioContainer}>
          {/* Hidden audio element (no native controls). We surface status messages instead. */}
          <audio
            ref={audioRef}
            autoPlay={requestAutoPlay}
            aria-hidden="true"
            style={{ display: 'none' }}
            preload="auto"
            src={resolvedAudioUrl}
            onPlay={() => {
              setAudioError("");
              setIsAudioPlaying(true);
              handleAudioPlay(currentPartIndex);
            }}
            onPause={() => {
              setIsAudioPlaying(false);
            }}
            onLoadedMetadata={() => {
              setAudioError("");
            }}
            onCanPlay={() => {
              setAudioError("");
            }}
            onEnded={() => {
              setIsAudioPlaying(false);
              handleAudioEnded(currentPartIndex);
              // Persist played flag immediately
              try {
                const cur = JSON.parse(localStorage.getItem(stateKey) || '{}') || {};
                cur.audioPlayed = { ...(cur.audioPlayed || {}), [currentPartIndex]: true };
                localStorage.setItem(stateKey, JSON.stringify(cur));
              } catch (e) {}
            }}
            onError={(event) => {
              setIsAudioPlaying(false);
              const mediaError = event.currentTarget?.error;
              const fallbackMessage = {
                1: 'The browser cancelled the audio request.',
                2: 'The audio file could not be loaded from the server.',
                3: 'The audio file is corrupted or uses an unsupported format.',
                4: 'This browser cannot read the audio file.',
              };
              setAudioError(
                fallbackMessage[mediaError?.code] || 'Audio playback is not available on this device.'
              );
            }}
          />

          {/* Status messages (no visible controls) */}
          {!audioPlayed[currentPartIndex] && !isAudioPlaying && (
            <div>
              <div style={{ color: '#0e276f', marginTop: 8 }}>
                {audioError
                  ? `Autoplay did not start. ${audioError}`
                  : 'Audio is ready. If you cannot hear it yet, use the button below to start playback.'}
              </div>
              {audioError && resolvedAudioUrl && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    color: '#9a3412',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  If playback still fails in production, open the audio file directly to confirm the server is returning it correctly:{' '}
                  <a
                    href={resolvedAudioUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#9a3412', fontWeight: 700 }}
                  >
                    Open audio file
                  </a>
                </div>
              )}
              {/* Show a one-time Resume button if the student reloads or opened the test without autoplay */}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={async () => {
                    // User gesture to resume playback after reload
                    try {
                      setRequestAutoPlay(false);
                      if (audioRef.current) {
                        const p = audioRef.current.play();
                        if (p && typeof p.then === 'function') {
                          await p;
                        }
                        setIsAudioPlaying(true);
                      }
                    } catch (e) {
                      // ignore play errors
                    }
                  }}
                  style={styles.playGateButton}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <InlineIcon name="play" size={14} />
                    {audioError ? 'Try audio again' : 'Play audio'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {isAudioPlaying && (
            <div style={{ color: '#0e276f', marginTop: 8 }}>Audio is playing. Please listen carefully.</div>
          )}

          {audioPlayed[currentPartIndex] && (
            <p style={styles.audioWarning}>Audio can only be played once.</p>
          )}
        </div>
      )}

        {/* Questions List */}
        <div ref={listQuestionRef} style={styles.questionsList}>
          {currentPart?.sections?.map((section, idx) => renderSection(section, idx))}

          {/* Fallback if no sections */}
          {(!currentPart?.sections || currentPart.sections.length === 0) &&
            currentPartQuestions.map((q) => (
              <React.Fragment key={q.globalNumber}>
                {q.questionType === "multiple-choice" ||
                q.questionType === "abc" ||
                q.questionType === "abcd"
                  ? renderMultipleChoice(q, q.globalNumber)
                  : renderFillQuestion(q, q.globalNumber)}
              </React.Fragment>
            ))}

          <div style={{ height: "100px" }}></div>
        </div>
      </main>

      {/* Start Modal (Play Gate) */}
      {showStartModal && (
        <TestStartModal
          iconName="listening"
          eyebrow="IX Listening"
          subtitle="Listening Test"
          title={test?.title || "IX Listening"}
          stats={[
            { value: startDurationMinutes, label: "Minutes", tone: "sky" },
            { value: totalQuestions, label: "Questions", tone: "green" },
          ]}
          noticeTitle="Important note"
          noticeContent={
            <>
              Audio starts as soon as you press Play and can only be heard <b>once</b>. Students cannot open the file in another tab during the test.
            </>
          }
          secondaryLabel="Cancel"
          onSecondary={() => {
            setShowStartModal(false);
            navigate('/select-test');
          }}
          primaryLabel="Play & Start"
          onPrimary={() => {
            handleStartClick();
            try {
              const cur = JSON.parse(localStorage.getItem(stateKey) || '{}') || {};
              cur.started = true;
              localStorage.setItem(stateKey, JSON.stringify(cur));
            } catch (e) {}
          }}
          darkContent={isDarkMode}
          maxWidth={500}
        />
      )}

      {/* Floating Navigation Arrows */}
      <div style={styles.floatingNav}>
        <button
          onClick={() => navigateQuestion("prev")}
          disabled={!canGoPrev}
          style={{
            ...styles.navArrowLeft,
            opacity: canGoPrev ? 1 : 0.4,
            cursor: canGoPrev ? "pointer" : "not-allowed",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <button
          onClick={() => navigateQuestion("next")}
          disabled={!canGoNext}
          style={{
            ...styles.navArrowRight,
            opacity: canGoNext ? 1 : 0.4,
            cursor: canGoNext ? "pointer" : "not-allowed",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Bottom Navigation - Youpass Style */}
      <nav style={styles.bottomNav}>
        <div style={styles.partsContainer}>
          {parts.map((part, idx) => {
            /* eslint-disable-next-line no-unused-vars */
            const range = getPartQuestionRange(idx);
            const answered = getAnsweredCount(idx);
            const total = getPartTotalQuestions(idx);
            const isCurrentPart = currentPartIndex === idx;
            const isExpanded = isCurrentPart;
            const navItems = getNavigatorItems(idx);
            const partTabWidth = getPartTabWidth(navItems, isExpanded);

            return (
              <div
                key={idx}
                style={{
                  ...styles.partTab,
                  flex: `0 0 ${partTabWidth}px`,
                  minWidth: `${partTabWidth}px`,
                  maxWidth: `${partTabWidth}px`,
                  backgroundColor: isCurrentPart ? "#fff" : "transparent",
                  borderTop: isCurrentPart ? "2px solid #3b82f6" : "2px solid transparent",
                }}
                onClick={() => handlePartClick(idx)}
              >
                {/* Part Label */}
                <div style={styles.partLabel}>
                  <span style={styles.partLabelText}>
                    {part.title || `Part ${idx + 1}`}
                  </span>
                  {!isExpanded && (
                    <span style={styles.partProgress}>
                      {answered} of {total}
                    </span>
                  )}
                </div>

                {/* Question Numbers (expanded) */}
                {isExpanded && (
                  <div style={styles.questionNumbers}>
                    {navItems.map((item, itemIdx) => {
                      const isAnswered = isNavItemAnswered(item);
                      const isActive = isNavItemActive(item);

                      return (
                        <div
                          key={itemIdx}
                          style={{
                            ...styles.questionNumBox,
                            ...(item.type === "multi-select" ? styles.questionNumBoxWide : {}),
                            borderColor: isActive
                              ? "#3b82f6"
                              : isAnswered
                              ? "#22c55e"
                              : "transparent",
                            backgroundColor: isAnswered ? "#dcfce7" : "#fff",
                            boxShadow: isActive ? "0 0 0 1px #418ec8" : "none",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPart(idx);
                            scrollToQuestion(item.startNum);
                          }}
                        >
                          {item.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit Icon */}
          <div style={styles.submitIcon} onClick={handleSubmit}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
      </nav>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Submit listening test?"
        message="Are you sure you want to submit your answers? After submission, you will not be able to edit them."
        type="info"
        iconName="listening"
        confirmText="Submit now"
        cancelText="Keep working"
        extraContent={
          <div>
            <p style={{ ...styles.summaryLabel, margin: "0 0 10px" }}>Attempt summary</p>
            <div style={styles.summaryBox}>
              {parts.map((part, idx) => {
                const answered = getAnsweredCount(idx);
                const total = getPartTotalQuestions(idx);
                return (
                  <div key={idx} style={styles.summaryRow}>
                    <span>{part.title || `Part ${idx + 1}`}</span>
                    <span
                      style={{
                        color: answered === total ? "#22c55e" : "#f59e0b",
                        fontWeight: 500,
                      }}
                    >
                      {answered}/{total} answered
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />

      <ResultModal
        isOpen={resultModalOpen}
        onClose={() => {
          setResultModalOpen(false);
          setResultData(null);

          // Ensure timer key is cleared so next attempt is fresh
          try {
            localStorage.removeItem(expiresKey);
          } catch (e) {
            // ignore
          }

          navigate("/select-test");
        }}
        result={resultData}
        title="Listening Results"
        iconName="listening"
      />
    </div>
  );
};

export default DoListeningTest;

