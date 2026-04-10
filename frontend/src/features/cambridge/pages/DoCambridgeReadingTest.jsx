import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
/* eslint-disable-next-line no-unused-vars */
import { apiPath, getStoredUser, hostPath } from "../../../shared/utils/api";
import TestHeader from "../../../shared/components/TestHeader";
import ExtensionToast from "../../../shared/components/ExtensionToast";
import TestStartModal from "../../../shared/components/TestStartModal";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import QuestionDisplayFactory from "../../../shared/components/questions/displays/QuestionDisplayFactory";
import PeopleMatchingDisplay from "../../../shared/components/questions/displays/PeopleMatchingDisplay";
import MatchingPicturesDisplay from "../../../shared/components/questions/displays/MatchingPicturesDisplay";
import ImageClozeDisplay from "../../../shared/components/questions/displays/ImageClozeDisplay";
import WordDragClozeDisplay from "../../../shared/components/questions/displays/WordDragClozeDisplay";
import StoryCompletionDisplay from "../../../shared/components/questions/displays/StoryCompletionDisplay";
import LookReadWriteDisplay from "../../../shared/components/questions/displays/LookReadWriteDisplay";
/* eslint-disable-next-line no-unused-vars */
import ClozeMCDisplay from "../../../shared/components/questions/displays/ClozeMCDisplay";
import InlineChoiceDisplay from "../../../shared/components/questions/displays/InlineChoiceDisplay";
import CambridgeResultsModal from "../components/CambridgeResultsModal";
import { computeQuestionStarts, getQuestionCountForSection, parseClozeBlanksFromText } from "../utils/questionNumbering";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../shared/utils/testTiming";
import "./DoCambridgeReadingTest.css";

/**
 * DoCambridgeReadingTest - Cambridge Reading Test (Authentic UI)
 * Replicate real Cambridge test interface for KET, PET, FLYERS, etc.
 */
const DoCambridgeReadingTest = () => {
  const { testType, id } = useParams(); // testType: ket-reading, pet-reading, etc.
  const navigate = useNavigate();

  const examType = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("ket")) return "KET";
    if (s.includes("pet")) return "PET";
    if (s.includes("flyers")) return "FLYERS";
    if (s.includes("movers")) return "MOVERS";
    if (s.includes("starters")) return "STARTERS";
    return "CAMBRIDGE";
  }, [testType]);

  const startedKey = useMemo(() => `cambridge_reading_test_${id}_started`, [id]);

  // Stable user ID: isolates data per-student on shared devices
  const storageUserId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.id || 'anon';
    } catch (e) { return 'anon'; }
  }, []);
  const camReadTimeKey  = useMemo(() => `cambridge_reading_${id}_expiresAt:${storageUserId}`, [id, storageUserId]);
  const camReadAnsKey   = useMemo(() => `cambridge_reading_${id}_answers:${storageUserId}`, [id, storageUserId]);
  const camReadStartKey = useMemo(() => `cambridge_reading_${id}_started:${storageUserId}`, [id, storageUserId]);
  const camReadSubmissionKey = useMemo(() => `cambridge_reading_${id}_submissionId:${storageUserId}`, [id, storageUserId]);
  const expiresAtRef = useRef(null);
  const submissionIdRef = useRef(null);
  const confirmSubmitRef = useRef(null);
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  // States
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null); // Will be set from localStorage or config
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  /* eslint-disable-next-line no-unused-vars */
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Current question number
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Flagged questions
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  // Shared state for matching-pictures split view (questions left | picture bank right)
  const [mpSelectedChoiceId, setMpSelectedChoiceId] = useState('');
  const [mpActivePromptIndex, setMpActivePromptIndex] = useState(null);
  const [icSelectedImgId, setIcSelectedImgId] = useState(null); // image-cloze split panel
  const [wdcFocusedBlank, setWdcFocusedBlank] = useState(null); // word-drag-cloze split panel

  // Started flag for the test (show start modal and control timer)
  const [started, setStarted] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const uid = u?.id || 'anon';
      return localStorage.getItem(`cambridge_reading_${id}_started:${uid}`) === "true";
    } catch (e) {
      return false;
    }
  });
  
  // Divider resize state
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  /* eslint-disable-next-line no-unused-vars */
  const questionRefs = useRef({});

  const resolveTestConfig = useCallback((rawType) => {
    const normalized = String(rawType || '').trim().toLowerCase();
    if (!normalized) return null;

    // Support alias routes like "movers-reading" while configs are keyed as "movers".
    const candidates = [
      normalized,
      normalized.replace(/-reading$/i, ''),
      normalized.replace(/-listening$/i, ''),
    ];

    for (const key of candidates) {
      if (TEST_CONFIGS[key]) return TEST_CONFIGS[key];
    }
    return null;
  }, []);

  // Get test config - will be updated once test data is loaded
  const testConfig = useMemo(() => {
    if (testType) {
      const fromUrl = resolveTestConfig(testType);
      if (fromUrl) return fromUrl;
    }
    if (test?.testType) {
      const fromData = resolveTestConfig(test.testType);
      if (fromData) return fromData;
    }
    return TEST_CONFIGS['ket-reading'];
  }, [resolveTestConfig, testType, test?.testType]);

  // For young-learner tests the section name is more informative than the full program name
  const headerTitle = useMemo(() => {
    if (['MOVERS', 'FLYERS', 'STARTERS'].includes(examType)) return 'Reading & Writing';
    return testConfig.name || 'Reading & Writing';
  }, [examType, testConfig.name]);

  const effectiveDuration = useMemo(() => {
    // Prefer the authoritative config duration for the test's type (avoids DB default of 60
    // being used for tests that never had duration saved explicitly).
    const fromConfig = Number(testConfig.duration);
    if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
    const fromTest = Number(test?.duration);
    if (Number.isFinite(fromTest) && fromTest > 0) return fromTest;
    return 60;
  }, [test?.duration, testConfig.duration]);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        expiresAtRef.current = expiresAtMs;
        try {
          localStorage.setItem(camReadTimeKey, String(expiresAtMs));
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
    [camReadTimeKey]
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

  const sanitizeQuillHtml = useCallback((html) => {
    if (typeof html !== 'string' || !html.trim()) return '';
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Remove empty images
      doc.querySelectorAll('img').forEach(img => {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) img.remove();
      });

      // Remove empty paragraphs and collapse repeated <br>
      doc.querySelectorAll('p').forEach(p => {
        const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
        const hasImg = p.querySelector('img');
        const brCount = p.querySelectorAll('br').length;
        if (!text && !hasImg && brCount > 0) {
          p.remove();
        }
      });

      return doc.body.innerHTML;
    } catch (err) {
      console.warn('sanitizeQuillHtml failed:', err);
      return html;
    }
  }, []);

  const stripOptionLabel = useCallback((raw = '') => {
    const s = String(raw).trim();
    const m = s.match(/^[A-H](?:\.\s*|\s+)(.+)$/i);
    return m ? m[1].trim() : s;
  }, []);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const localUser = getStoredUser();
        const savedSubmissionId = localStorage.getItem(camReadSubmissionKey);
        if (savedSubmissionId) {
          submissionIdRef.current = savedSubmissionId;
        }
        const res = await fetch(apiPath(`cambridge/reading-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        const data = await res.json();

        // Parse parts JSON
        let parsedParts = typeof data.parts === "string"
          ? JSON.parse(data.parts)
          : data.parts;

        const parsedData = {
          ...data,
          parts: parsedParts,
        };

        setTest(parsedData);

        let restoredFromServer = false;
        const query = submissionIdRef.current
          ? `?submissionId=${submissionIdRef.current}`
          : localUser?.id
            ? `?userId=${localUser.id}`
            : "";

        // Check if there's saved data for this test
        const savedExpiry = localStorage.getItem(camReadTimeKey);
        const savedAnswers = localStorage.getItem(camReadAnsKey);
        // Prefer testType config duration over the DB value (DB defaults to 60 for all types)
        const configDuration = Number(TEST_CONFIGS[data.testType]?.duration);
        const rawDuration = Number(data.duration);
        const resolvedDuration = Number.isFinite(configDuration) && configDuration > 0
          ? configDuration
          : (Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : (testConfig.duration || 60));
        const durationSeconds = resolvedDuration * 60;

        if (query) {
          try {
            const activeRes = await fetch(
              apiPath(
                `cambridge/submissions/active${query}&testId=${id}&testType=${encodeURIComponent(data.testType)}`
              )
            );
            if (activeRes.ok) {
              const payload = await activeRes.json().catch(() => null);
              const draft = payload?.submission || null;
              if (draft && draft.finished !== true) {
                restoredFromServer = true;
                if (draft.id) {
                  submissionIdRef.current = draft.id;
                  localStorage.setItem(camReadSubmissionKey, String(draft.id));
                }

                const serverAnswers =
                  draft.answers &&
                  typeof draft.answers === "object" &&
                  !Array.isArray(draft.answers)
                    ? draft.answers
                    : {};
                setAnswers(serverAnswers);
                localStorage.setItem(camReadAnsKey, JSON.stringify(serverAnswers));

                const expiresAtMs = draft.expiresAt
                  ? new Date(draft.expiresAt).getTime()
                  : null;
                if (Number.isFinite(expiresAtMs)) {
                  syncTimingState(expiresAtMs, durationSeconds);
                } else {
                  setTimeRemaining(durationSeconds);
                  setGraceRemaining(0);
                }

                const progressMeta =
                  draft.progressMeta &&
                  typeof draft.progressMeta === "object" &&
                  !Array.isArray(draft.progressMeta)
                    ? draft.progressMeta
                    : {};
                const resumedStarted =
                  progressMeta.started === true ||
                  Boolean(expiresAtMs) ||
                  Object.keys(serverAnswers).length > 0;
                setStarted(resumedStarted);
                localStorage.setItem(camReadStartKey, resumedStarted ? "true" : "false");
                setHasSavedProgress(true);

                if (Number.isFinite(Number(progressMeta.currentPartIndex))) {
                  setCurrentPartIndex(Number(progressMeta.currentPartIndex));
                }
                if (Number.isFinite(Number(progressMeta.currentQuestionIndex))) {
                  setCurrentQuestionIndex(Number(progressMeta.currentQuestionIndex));
                }
              }
            }
          } catch (resumeErr) {
            console.error("Error restoring Cambridge reading draft:", resumeErr);
          }
        }

        if (!restoredFromServer && (savedExpiry || savedAnswers)) {
          // Restore existing progress (even if answers are empty)
          setHasSavedProgress(true);
          if (savedExpiry) {
            syncTimingState(parseInt(savedExpiry, 10), durationSeconds);
          } else {
            setTimeRemaining(durationSeconds);
            setGraceRemaining(0);
          }
          try {
            setAnswers(savedAnswers ? JSON.parse(savedAnswers) : {});
          } catch (e) {
            console.error("Error parsing saved answers:", e);
            setAnswers({});
          }
        } else if (!restoredFromServer) {
          // New test - clean up any old saved data and start fresh
          setHasSavedProgress(false);
          localStorage.removeItem(camReadTimeKey);
          localStorage.removeItem(camReadAnsKey);
          localStorage.removeItem(camReadSubmissionKey);
          // If there's no saved progress, force start modal again
          localStorage.removeItem(camReadStartKey);
          setStarted(false);
          setTimeRemaining(durationSeconds);
          setGraceRemaining(0);
          setAnswers({});
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [
    camReadAnsKey,
    camReadStartKey,
    camReadSubmissionKey,
    camReadTimeKey,
    id,
    syncTimingState,
    testConfig.duration,
    startedKey,
  ]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !started || !Number.isFinite(expiresAtRef.current)) return;

    const tick = () => {
      const expiresAtMs = expiresAtRef.current;
      if (!Number.isFinite(expiresAtMs)) return;

      setTimeRemaining(getRemainingSeconds(expiresAtMs));
      setGraceRemaining(getGraceRemainingSeconds(expiresAtMs));
    };

    tick();
    const timer = setInterval(tick, 1000);
    const onCheck = () => tick();
    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [submitted, started]);

  useEffect(() => {
    if (
      !started ||
      submitted ||
      timeRemaining === null ||
      timeRemaining > 0 ||
      graceRemaining > 0
    ) {
      return;
    }
    if (autoSubmittingRef.current || !confirmSubmitRef.current) {
      return;
    }

    autoSubmittingRef.current = true;
    confirmSubmitRef.current();
  }, [started, submitted, timeRemaining, graceRemaining]);

  // Format time display
  const formatTime = (seconds) => {
    return formatClock(seconds);
  };

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionKey, value) => {
      if (submitted) return;
      setAnswers((prev) => {
        const newAnswers = {
          ...prev,
          [questionKey]: value,
        };
        // Save to localStorage
        localStorage.setItem(camReadAnsKey, JSON.stringify(newAnswers));
        return newAnswers;
      });
    },
    [submitted, id]
  );

  useEffect(() => {
    if (!started || submitted || timeRemaining === null) return;

    const user = getStoredUser();
    if (!user?.id && !submissionIdRef.current) return;

    const persistDraft = async () => {
      try {
        const payload = {
          submissionId: submissionIdRef.current,
          testId: id,
          testType: test?.testType || testType || "ket-reading",
          answers,
          expiresAt: expiresAtRef.current,
          user,
          progressMeta: {
            started,
            currentPartIndex,
            currentQuestionIndex,
          },
        };
        const res = await fetch(apiPath("cambridge/submissions/autosave"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (json?.submissionId) {
          submissionIdRef.current = json.submissionId;
          localStorage.setItem(camReadSubmissionKey, String(json.submissionId));
        }
        const nextExpiresAt = json?.timing?.expiresAt || json?.expiresAt;
        if (nextExpiresAt) {
          announceExtension(nextExpiresAt, expiresAtRef.current);
          syncTimingState(nextExpiresAt);
        }
      } catch (_err) {
        // Keep local progress if the network is unavailable.
      }
    };

    const debounceId = setTimeout(persistDraft, 600);
    const intervalId = setInterval(persistDraft, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistDraft();
    };
    const onBeforeUnload = () => {
      persistDraft();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearTimeout(debounceId);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [
    answers,
    camReadSubmissionKey,
    currentPartIndex,
    currentQuestionIndex,
    id,
    started,
    submitted,
    test?.testType,
    testType,
    timeRemaining,
    announceExtension,
    syncTimingState,
  ]);

  const reconcileServerTiming = useCallback(async () => {
    if (!started || submitted) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const localUser = getStoredUser();
    const query = submissionIdRef.current
      ? `?submissionId=${submissionIdRef.current}`
      : localUser?.id
        ? `?userId=${localUser.id}`
        : "";
    if (!query || !test?.testType) return;

    try {
      const res = await fetch(
        apiPath(`cambridge/submissions/active${query}&testId=${id}&testType=${encodeURIComponent(test.testType)}`)
      );
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
  }, [announceExtension, id, started, submitted, syncTimingState, test?.testType]);

  useEffect(() => {
    if (!started || submitted || !test?.testType) return;

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
  }, [reconcileServerTiming, started, submitted, test?.testType]);

  // Handle submit
  const handleSubmit = () => setShowConfirm(true);

  // Confirm and submit
  const confirmSubmit = async () => {
    try {
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const initialTime = effectiveDuration * 60;
      const timeSpent = initialTime - timeRemaining;

      // Calculate results locally
      const localResults = calculateLocalResults();

      // Submit to backend
      const res = await fetch(apiPath(`cambridge/reading-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          submissionId: submissionIdRef.current,
          answers,
          studentName: user.name || user.username || 'Unknown',
          studentPhone: user.phone || null,
          studentEmail: user.email || null,
          classCode: test?.classCode || null,
          userId: user.id || null,
          timeRemaining,
          timeSpent,
          score: localResults.score,
          correct: localResults.correct,
          incorrect: localResults.incorrect,
          total: localResults.total,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit the test");

      // Use backend scoring as source of truth
      const data = await res.json();
      const dr = data.detailedResults || {};
      const backendCorrect = Object.values(dr).filter(r => r.isCorrect === true).length;
      const backendIncorrect = Object.values(dr).filter(r => r.isCorrect === false).length;

      // Clear saved data from localStorage
      localStorage.removeItem(camReadTimeKey);
      localStorage.removeItem(camReadAnsKey);
      localStorage.removeItem(camReadStartKey);
      localStorage.removeItem(camReadSubmissionKey);
      expiresAtRef.current = null;
      submissionIdRef.current = null;
      
      // Show results modal using backend score (more accurate than local calculation)
      setResults({
        score: data.score,
        total: data.total,
        percentage: data.percentage,
        correct: backendCorrect,
        incorrect: backendIncorrect,
        writingQuestions: localResults.writingQuestions || [],
        writingCount: localResults.writingCount || 0,
      });
      setSubmitted(true);
      setShowConfirm(false);
    } catch (err) {
      console.error("Error submitting:", err);
      // Calculate locally and show results even if backend fails
      const localResults = calculateLocalResults();
      setResults(localResults);
      setSubmitted(true);
      setShowConfirm(false);
      // Clear saved data on error too
      localStorage.removeItem(camReadTimeKey);
      localStorage.removeItem(camReadAnsKey);
      localStorage.removeItem(camReadStartKey);
      localStorage.removeItem(camReadSubmissionKey);
      expiresAtRef.current = null;
      submissionIdRef.current = null;
    }
  };

  useEffect(() => {
    confirmSubmitRef.current = confirmSubmit;
  }, [confirmSubmit]);

  // Calculate results locally (fallback)
  const calculateLocalResults = () => {
    let correct = 0;
    let incorrect = 0;
    let writingQuestions = [];
    let debugInfo = [];
    let scorableCount = 0;

    const normalize = (val) => String(val).trim().toLowerCase();

    const explode = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && (val.includes('/') || val.includes('|'))) {
        return val.split(new RegExp('[\\/|]')).map((v) => v.trim()).filter(Boolean);
      }
      return [val];
    };

    // Use allQuestions for accurate scoring
    allQuestions.forEach((q) => {
      const questionType = q.nestedQuestion?.questionType
        || q.section?.questionType
        || q.question?.questionType;

      // Skip writing tasks (manual scoring)
      if (questionType === 'short-message' || questionType === 'story-writing') {
        writingQuestions.push({
          questionNumber: q.questionNumber,
          sectionType: q.section.questionType,
          answered: answers[q.key] ? true : false,
          answer: answers[q.key] || null,
        });
        return;
      }

      if (questionType === 'people-matching' && Array.isArray(q.question?.people)) {
        const person = q.question.people[q.personIndex] || {};
        const personId = person?.id ? String(person.id).trim() : String.fromCharCode(65 + (q.personIndex || 0));
        const primaryKey = `${q.partIndex}-${q.sectionIndex}-${personId}`;
        const legacyKey = `${q.partIndex}-${q.sectionIndex}-${q.personIndex}`;
        const userAnswer = answers[primaryKey] ?? answers[legacyKey];
        const correctMap = (q.question?.answers && typeof q.question.answers === 'object') ? q.question.answers : {};
        const correctAnswer = correctMap[personId];

        if (correctAnswer === undefined || correctAnswer === null) {
          debugInfo.push(`Q${q.questionNumber}: No correctAnswer field`);
          return;
        }

        scorableCount++;
        if (!userAnswer) return;

        if (normalize(userAnswer) === normalize(correctAnswer)) {
          correct++;
        } else {
          incorrect++;
        }
        return;
      }

      if (questionType === 'matching-pictures' && q.prompt) {
        const promptId = String(q.prompt?.id || q.prompt?.number || (q.promptIndex || 0) + 1);
        const primaryKey = `${q.partIndex}-${q.sectionIndex}-${promptId}`;
        const legacyKey = `${q.partIndex}-${q.sectionIndex}-${q.promptIndex || 0}`;
        const userAnswer = answers[primaryKey] ?? answers[legacyKey];
        const correctAnswer = q.prompt?.correctAnswer;

        if (correctAnswer === undefined || correctAnswer === null) {
          debugInfo.push(`Q${q.questionNumber}: No correctAnswer field`);
          return;
        }

        scorableCount++;
        if (!userAnswer) return;

        if (normalize(userAnswer) === normalize(correctAnswer)) {
          correct++;
        } else {
          incorrect++;
        }
        return;
      }

      if (questionType === 'image-cloze') {
        const userAnswer = answers[q.key];
        if (q.isTitleQuestion) {
          const correctAnswer = q.question?.titleQuestion?.correctAnswer;
          if (correctAnswer === undefined || correctAnswer === null) {
            debugInfo.push(`Q${q.questionNumber}: No titleQuestion correctAnswer`);
            return;
          }
          scorableCount++;
          if (!userAnswer) return;
          if (normalize(userAnswer) === normalize(correctAnswer)) correct++;
          else incorrect++;
        } else {
          const correctImgId = q.question?.answers?.[String(q.blankNum)];
          if (correctImgId === undefined || correctImgId === null) {
            debugInfo.push(`Q${q.questionNumber}: No correct answer for blank ${q.blankNum}`);
            return;
          }
          scorableCount++;
          if (!userAnswer) return;
          if (userAnswer === correctImgId) correct++;
          else incorrect++;
        }
        return;
      }

      // word-drag-cloze: answers stored as {partIdx}-{secIdx}-blank-{blank.number}
      if (questionType === 'word-drag-cloze' && q.blank) {
        const wdcKey = `${q.partIndex}-${q.sectionIndex}-blank-${q.blank.number}`;
        const ua = answers[wdcKey];
        const ca = q.blank.correctAnswer ?? q.blank.answer ?? q.blank.correct;
        if (ca === undefined || ca === null) {
          debugInfo.push(`Q${q.questionNumber}: word-drag-cloze no correctAnswer`);
          return;
        }
        scorableCount++;
        if (!ua) return;
        const accepted = explode(ca);
        if (accepted.some((a) => normalize(a) === normalize(ua))) correct++;
        else incorrect++;
        return;
      }

      // story-completion: q.key = "{p}-{s}-item-{n}", q.item.answer = correct answer
      if (questionType === 'story-completion' && q.item) {
        const ua = answers[q.key];
        const ca = q.item.answer ?? q.item.correctAnswer;
        if (ca === undefined || ca === null) {
          debugInfo.push(`Q${q.questionNumber}: story-completion no answer on item`);
          return;
        }
        scorableCount++;
        if (!ua) return;
        const accepted = explode(ca);
        if (accepted.some((a) => normalize(a) === normalize(ua))) correct++;
        else incorrect++;
        return;
      }

      // look-read-write: q.key = "{p}-{s}-g{g}-item{i}", free-write items accept any non-empty
      if (questionType === 'look-read-write' && q.item) {
        const ua = answers[q.key];
        const ca = (q.item.answer ?? q.item.correctAnswer ?? '').trim();
        scorableCount++;
        if (!ua || !ua.trim()) return;
        if (!ca) { correct++; return; } // free-write: any answer accepted
        const accepted = explode(ca);
        if (accepted.some((a) => normalize(a) === normalize(ua))) correct++;
        else incorrect++;
        return;
      }

      // Word-form: score each sentence using its own key
      if (questionType === 'word-form' && Array.isArray(q.question?.sentences)) {
        q.question.sentences.forEach((sentence, sentIdx) => {
          const legacyKey = `${q.partIndex}-${q.sectionIndex}-${sentIdx}`;
          const primaryKey = `${q.partIndex}-${q.sectionIndex}-${q.questionIndex}-${sentIdx}`;
          const userAnswer = answers[primaryKey] ?? answers[legacyKey];
          const correctAnswer = sentence?.correctAnswer;

          if (correctAnswer === undefined || correctAnswer === null) {
            debugInfo.push(`Q${q.questionNumber + sentIdx}: No correctAnswer field`);
            return;
          }

          scorableCount++;
          if (!userAnswer) return;

          const accepted = explode(correctAnswer);
          const isCorrect = accepted.some((ans) => normalize(ans) === normalize(userAnswer));
          if (isCorrect) {
            correct++;
          } else {
            incorrect++;
          }
        });
        return;
      }

      const userAnswer = answers[q.key];
      let resolvedCorrect = q.nestedQuestion?.correctAnswer
        ?? q.nestedQuestion?.answers
        ?? q.nestedQuestion?.answer
        ?? q.nestedQuestion?.correct
        ?? q.blank?.correctAnswer
        ?? q.blank?.answers
        ?? q.blank?.answer
        ?? q.blank?.correct
        ?? q.question?.correctAnswer
        ?? q.question?.answers
        ?? q.question?.answer
        ?? q.question?.correct;

      // Object-form correct answers keyed by question number (e.g., {"25":"the"})
      if (resolvedCorrect && typeof resolvedCorrect === 'object' && !Array.isArray(resolvedCorrect)) {
        const key = String(q.blank?.questionNum || q.questionNumber);
        resolvedCorrect = resolvedCorrect[key] ?? Object.values(resolvedCorrect)[0];
      }
      if (questionType === 'inline-choice' && typeof resolvedCorrect === 'string') {
        resolvedCorrect = String(resolvedCorrect).replace(/^[A-H]\.\s*/i, '').trim();
      }

      // Missing correct answer: do not penalize, just log
      if (resolvedCorrect === undefined || resolvedCorrect === null) {
        debugInfo.push(`Q${q.questionNumber}: No correctAnswer field`);
        return;
      }

      scorableCount++;

      if (!userAnswer) return;

      const checkArray = (expected, actual) => {
        const normalizedActual = normalize(actual);
        return expected.some((ans) => normalize(ans) === normalizedActual);
      };

      const checkAnswer = () => {
        // MC types: case-insensitive letter compare
        if (questionType === 'abc' || questionType === 'abcd' || questionType === 'long-text-mc' || questionType === 'cloze-mc') {
          return normalize(userAnswer) === normalize(resolvedCorrect);
        }

        const accepted = explode(resolvedCorrect);
        return checkArray(accepted, userAnswer);
      };

      if (checkAnswer()) {
        correct++;
      } else {
        incorrect++;
        debugInfo.push(
          `Q${q.questionNumber}: user=${JSON.stringify(userAnswer)} expected=${JSON.stringify(resolvedCorrect)}`
        );
      }
    });

    const scorableQuestions = scorableCount; // Only count questions with an answer key
    const score = correct;

    // Log debug info if there are issues
    if (debugInfo.length > 0) {
      console.warn('⚠️ Scoring debug info:', debugInfo.slice(0, 10));
    }

    return {
      score,
      correct,
      incorrect,
    total: scorableQuestions,
    percentage: scorableQuestions > 0 ? Math.round((correct / scorableQuestions) * 100) : 0,
      writingQuestions,
      writingCount: writingQuestions.length,
    };
  };

  // Get current part data
  /* eslint-disable-next-line no-unused-vars */
  const currentPart = useMemo(() => {
    return test?.parts?.[currentPartIndex] || null;
  }, [test?.parts, currentPartIndex]);

  const questionStarts = useMemo(() => {
    return computeQuestionStarts(test?.parts || []);
  }, [test?.parts]);

  // Calculate question number range for a part
  const getPartQuestionRange = useCallback((partIndex) => {
    if (!test?.parts) return { start: 1, end: 1 };

    const startNum = questionStarts.sectionStart[`${partIndex}-0`] || 1;
    let count = 0;
    for (const sec of test.parts[partIndex]?.sections || []) {
      count += getQuestionCountForSection(sec);
    }

    return { start: startNum, end: count > 0 ? startNum + count - 1 : startNum };
  }, [test?.parts, questionStarts]);

  // Get all questions flattened
  const allQuestions = useMemo(() => {
    if (!test?.parts) return [];
    const questions = [];
    let qNum = 1;
    
    test.parts.forEach((part, pIdx) => {
      const hasIntegratedLookReadWriteWriting = (part.sections || []).some((section) => {
        if (section.questionType !== 'look-read-write') return false;
        return (section.questions || []).some((question) =>
          Array.isArray(question.groups) &&
          question.groups.some((group) => group.type === 'write' && Array.isArray(group.items) && group.items.length > 0)
        );
      });

      part.sections?.forEach((section, sIdx) => {
        const isStandaloneWritingSection = section.questionType === 'short-message' || section.questionType === 'story-writing';
        const shouldSkipStandaloneWritingSection =
          examType === 'MOVERS' &&
          isStandaloneWritingSection &&
          hasIntegratedLookReadWriteWriting;

        if (shouldSkipStandaloneWritingSection) {
          return;
        }

        section.questions?.forEach((q, qIdx) => {
          // Check if this is long-text-mc with nested questions
          if (section.questionType === 'long-text-mc' && q.questions && Array.isArray(q.questions)) {
            // For long-text-mc: create separate entries for each nested question
            q.questions.forEach((nestedQ, nestedIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                nestedIndex: nestedIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}-${nestedIdx}`,
                question: q, // Keep parent question object (has passage)
                nestedQuestion: nestedQ, // Individual question data
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'cloze-mc' && q.blanks && Array.isArray(q.blanks)) {
            // For cloze-mc: create separate entries for each blank
            q.blanks.forEach((blank, blankIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                blankIndex: blankIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`,
                question: q, // Keep parent question object (has passage)
                blank: blank, // Individual blank data
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'inline-choice' && q.blanks && Array.isArray(q.blanks)) {
            // For inline-choice: create separate entries for each blank
            q.blanks.forEach((blank, blankIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                blankIndex: blankIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`,
                question: q,
                blank: blank,
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'cloze-test') {
            // For cloze-test (Open Cloze): parse blanks from passage
            const passageText = q.passageText || q.passage || '';
            const blanks = (q.blanks && q.blanks.length > 0) ? q.blanks : parseClozeBlanksFromText(passageText, qNum);
            
            if (blanks.length > 0) {
              blanks.forEach((blank, blankIdx) => {
                questions.push({
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionIndex: qIdx,
                  blankIndex: blankIdx,
                  questionNumber: qNum++,
                  key: `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`,
                  question: q, // Keep parent question object (has passage)
                  blank: blank, // Individual blank data
                  section: section,
                  part: part,
                });
              });
            } else {
              // No blanks found, treat as regular question
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}`,
                question: q,
                section: section,
                part: part,
              });
            }
          } else if (section.questionType === 'people-matching' && Array.isArray(q.people)) {
            // For people-matching: create separate entries for each person
            q.people.forEach((person, personIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                personIndex: personIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${personIdx}`,
                question: q,
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'matching-pictures' && Array.isArray(q.prompts)) {
            q.prompts.forEach((prompt, promptIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                promptIndex: promptIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}-${promptIdx}`,
                question: q,
                prompt,
                section,
                part,
              });
            });
          } else if (section.questionType === 'image-cloze') {
            // Expand blanks from passageText + optional title question
            const passageText = q.passageText || '';
            const blankMatches = [...passageText.matchAll(/\(\s*(\d+)\s*\)/g)];
            const blankNums = blankMatches.map(m => parseInt(m[1], 10));
            blankNums.forEach((blankNum) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-blank-${blankNum}`,
                question: q,
                section,
                part,
                blankNum,
                isTitleQuestion: false,
              });
            });
            if (q.titleQuestion?.enabled) {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-title`,
                question: q,
                section,
                part,
                isTitleQuestion: true,
              });
            }
          } else if (section.questionType === 'word-drag-cloze' && q.blanks && Array.isArray(q.blanks)) {
            // word-drag-cloze: one entry per blank (like cloze-mc)
            q.blanks.forEach((blank, blankIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                blankIndex: blankIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`,
                question: q,
                blank: blank,
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'story-completion' && q.items && Array.isArray(q.items)) {
            // story-completion: one entry per item (Movers Part 5)
            q.items.forEach((item, itemIdx) => {
              questions.push({
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionIndex: qIdx,
                itemIndex: itemIdx,
                questionNumber: qNum++,
                key: `${pIdx}-${sIdx}-item-${itemIdx + 1}`,
                question: q,
                item: item,
                section: section,
                part: part,
              });
            });
          } else if (section.questionType === 'look-read-write' && q.groups && Array.isArray(q.groups)) {
            // look-read-write: one entry per group item (Movers Part 6)
            q.groups.forEach((group, groupIdx) => {
              (group.items || []).forEach((item, itemIdx) => {
                questions.push({
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionIndex: qIdx,
                  groupIndex: groupIdx,
                  itemIndex: itemIdx,
                  questionNumber: qNum++,
                  key: `${pIdx}-${sIdx}-g${groupIdx}-item${itemIdx}`,
                  question: q,
                  group: group,
                  item: item,
                  section: section,
                  part: part,
                });
              });
            });
          } else if (section.questionType === 'short-message' || section.questionType === 'story-writing') {
            // Free-writing tasks still need their real paper numbers for footer navigation.
            questions.push({
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionIndex: qIdx,
              questionNumber: qNum++,
              key: `${pIdx}-${sIdx}-${qIdx}`,
              question: q,
              section: section,
              part: part,
            });
          } else {
            // Regular numbered questions
            questions.push({
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionIndex: qIdx,
              questionNumber: qNum++,
              key: `${pIdx}-${sIdx}-${qIdx}`,
              question: q,
              section: section,
              part: part,
            });
          }
        });
      });
    });
    
    return questions;
  }, [examType, test?.parts]);

  const isNumberedQuestion = useCallback((q) => Number.isFinite(q?.questionNumber), []);

  const numberedQuestions = useMemo(() => {
    return allQuestions.filter(isNumberedQuestion);
  }, [allQuestions, isNumberedQuestion]);

  const questionIndexByKey = useMemo(() => {
    const indexMap = new Map();
    allQuestions.forEach((q, index) => {
      indexMap.set(q.key, index);
    });
    return indexMap;
  }, [allQuestions]);

  const getPeopleMatchingAnswerKey = useCallback((q) => {
    const person = q.question?.people?.[q.personIndex] || {};
    const personId = person?.id
      ? String(person.id).trim()
      : String.fromCharCode(65 + (q.personIndex || 0));
    return `${q.partIndex}-${q.sectionIndex}-${personId}`;
  }, []);

  const getMatchingPicturesAnswerKey = useCallback((q) => {
    const prompt = q.question?.prompts?.[q.promptIndex] || q.prompt || {};
    const promptId = String(prompt?.id || prompt?.number || (q.promptIndex || 0) + 1);
    return `${q.partIndex}-${q.sectionIndex}-${promptId}`;
  }, []);

  const isQuestionAnswered = useCallback((q) => {
    if (q.section?.questionType === 'people-matching' || Array.isArray(q.question?.people)) {
      const key = getPeopleMatchingAnswerKey(q);
      return Boolean(answers[key] ?? answers[q.key]);
    }
    if (q.section?.questionType === 'matching-pictures' || Array.isArray(q.question?.prompts)) {
      const key = getMatchingPicturesAnswerKey(q);
      return Boolean(answers[key] ?? answers[q.key]);
    }
    if (q.section?.questionType === 'story-completion') {
      const val = answers[q.key];
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.some(Boolean); // backward compat
      return Boolean(val);
    }
    if (q.section?.questionType === 'look-read-write') {
      const val = answers[q.key];
      if (typeof val === "string") return val.trim().length > 0;
      return Boolean(val);
    }
    if (q.section?.questionType === 'short-message' || q.section?.questionType === 'story-writing') {
      const val = answers[q.key];
      if (typeof val === 'string') return val.trim().length > 0;
      return Boolean(val);
    }
    if (q.section?.questionType === 'word-drag-cloze') {
      // WDC stores answers as `${partIdx}-${sectionIdx}-blank-${blank.number}`
      const wdcPrefix = `${q.partIndex}-${q.sectionIndex}`;
      const blankAnswerKey = `${wdcPrefix}-blank-${q.blank?.number}`;
      return Boolean((answers[blankAnswerKey] || '').trim());
    }
    return Boolean(answers[q.key]);
  }, [answers, getMatchingPicturesAnswerKey, getPeopleMatchingAnswerKey]);

  const answeredCount = useMemo(() => {
    return numberedQuestions.filter((q) => isQuestionAnswered(q)).length;
  }, [isQuestionAnswered, numberedQuestions]);

  const totalQuestions = numberedQuestions.length;
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);

  // Get current question data
  const currentQuestion = useMemo(() => {
    return allQuestions[currentQuestionIndex] || null;
  }, [allQuestions, currentQuestionIndex]);

  useEffect(() => {
    if (!allQuestions.length) return;
    if (currentQuestionIndex >= 0 && currentQuestionIndex < allQuestions.length) return;

    const fallbackIndex = Math.min(Math.max(currentQuestionIndex, 0), allQuestions.length - 1);
    const fallbackQuestion = allQuestions[fallbackIndex];
    setCurrentQuestionIndex(fallbackIndex);
    if (fallbackQuestion) {
      setCurrentPartIndex(fallbackQuestion.partIndex);
      setActiveQuestion(fallbackQuestion.key);
    }
  }, [allQuestions, currentQuestionIndex]);

  const currentCounterLabel = currentQuestion?.questionNumber ?? (currentQuestion ? 'W' : 0);

  // Navigate to question
  const goToQuestion = (index) => {
    if (index >= 0 && index < allQuestions.length) {
      const q = allQuestions[index];
      
      setCurrentQuestionIndex(index);
      setCurrentPartIndex(q.partIndex);
      setActiveQuestion(q.key);
      
      // For word-drag-cloze: set focused blank so passage + wordbank both highlight
      if (q.section?.questionType === 'word-drag-cloze' && q.blank?.number != null) {
        setWdcFocusedBlank(q.blank.number);
      }

      // Scroll to question element and focus/open
      setTimeout(() => {
        if (!Number.isFinite(q.questionNumber)) return;
        const questionElement = document.getElementById(`question-${q.questionNumber}`);
        
        if (questionElement) {
          // Ưu tiên scroll container scroll riêng (cambridge-passage-column / overflow-y: auto)
          // thay vì window, để left panel tự cuộn đúng vị trí
          const scrollContainer = questionElement.closest('.cambridge-passage-column') ||
                                  questionElement.closest('.cambridge-questions-column');
          if (scrollContainer) {
            const elemRect = questionElement.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const offset = elemRect.top - containerRect.top - (scrollContainer.clientHeight / 2) + (questionElement.offsetHeight / 2);
            scrollContainer.scrollBy({ top: offset, behavior: 'smooth' });
          } else {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          if (typeof questionElement.focus === 'function') {
            questionElement.focus();
          }
          
          // If it's a select element (cloze-mc), focus and trigger open
          if (questionElement.tagName === 'SELECT') {
            questionElement.focus();
            
            // Try modern API first (Chrome 99+, Firefox 97+, Safari 16+)
            if (questionElement.showPicker && typeof questionElement.showPicker === 'function') {
              try {
                questionElement.showPicker();
              } catch (e) {
                // Fallback silently
              }
            } else {
              // Fallback: try keyboard event
              const keyEvent = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                altKey: true,
                bubbles: true,
                cancelable: true
              });
              questionElement.dispatchEvent(keyEvent);
            }
          } else if (questionElement.tagName === 'INPUT') {
            // For cloze-test text inputs
            questionElement.focus();
            questionElement.select(); // Select all text to show cursor and highlight
          } else {
            // For container elements (e.g. image-cloze title question), focus first radio inside
            const firstRadio = questionElement.querySelector('input[type="radio"]');
            if (firstRadio) {
              firstRadio.focus();
            }
            // Visual pulse: briefly highlight the container so the user notices it
            questionElement.style.transition = 'outline 0.15s ease, box-shadow 0.15s ease';
            questionElement.style.outline = '3px solid #7c3aed';
            questionElement.style.boxShadow = '0 0 0 6px rgba(124, 58, 237, 0.25)';
            setTimeout(() => {
              questionElement.style.outline = '';
              questionElement.style.boxShadow = '';
              questionElement.style.transition = '';
            }, 1400);
          }
        }
      }, 200);
    }
  };

  // Toggle flag
  const toggleFlag = (questionKey) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionKey)) {
        newSet.delete(questionKey);
      } else {
        newSet.add(questionKey);
      }
      return newSet;
    });
  };

  // Divider resize handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit between 20% and 80%
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Loading state
  if (loading) {
    return (
      <div className="cambridge-loading flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-700">
        <div className="text-5xl">⏳</div>
        <h2 className="text-lg font-semibold">Loading test...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cambridge-error flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-700">
        <div className="text-5xl">❌</div>
        <h2 className="text-lg font-semibold">Error: {error}</h2>
        <button onClick={() => navigate(-1)} className="cambridge-nav-button">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className={`cambridge-test-container bg-slate-50${examType === 'MOVERS' ? ' cambridge-movers' : ''}`}>
      <ExtensionToast message={extensionToast} />
      {/* Start Modal (only starts timer after click) */}
      {!started && !submitted && !loading && !error && (
        <TestStartModal
          iconName="reading"
          eyebrow={`Cambridge ${examType}`}
          subtitle="Reading Test"
          title={test?.title || testConfig.name || 'Cambridge Reading'}
          stats={[
            { value: Math.round(effectiveDuration), label: 'Minutes', tone: 'sky' },
            { value: totalQuestions, label: 'Questions', tone: 'green' },
          ]}
          extraContent={hasSavedProgress ? (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 3 }}>Resume previous attempt</div>
              <div style={{ fontSize: 13, color: '#b45309' }}>
                Time remaining: <b>{timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}</b>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.6 }}>
              Your answers are <b>auto-saved</b>. You can leave and come back later to continue.
            </p>
          )}
          secondaryLabel="Exit"
          onSecondary={() => navigate(-1)}
          extraActions={hasSavedProgress ? [
            {
              label: 'Start over',
              variant: 'danger',
              onClick: () => {
                const ok = window.confirm(
                  "Are you sure you want to start over? All saved progress will be removed."
                );
                if (!ok) return;

                try {
                  localStorage.removeItem(camReadTimeKey);
                  localStorage.removeItem(camReadAnsKey);
                  localStorage.removeItem(camReadStartKey);
                  localStorage.removeItem(camReadSubmissionKey);
                } catch {
                  // ignore
                }

                setAnswers({});
                setFlaggedQuestions(new Set());
                setCurrentPartIndex(0);
                setCurrentQuestionIndex(0);
                setActiveQuestion(null);
                setTimeRemaining(effectiveDuration * 60);
                setGraceRemaining(0);
                setHasSavedProgress(false);
                setStarted(false);
                autoSubmittingRef.current = false;
                expiresAtRef.current = null;
                submissionIdRef.current = null;
              },
            },
          ] : []}
          primaryLabel={hasSavedProgress ? 'Resume' : 'Start test'}
          onPrimary={() => {
            setStarted(true);
            autoSubmittingRef.current = false;
            const initialSeconds = effectiveDuration * 60;
            try {
              localStorage.setItem(camReadStartKey, "true");
              const expiry = Date.now() + (timeRemaining ?? initialSeconds) * 1000;
              syncTimingState(expiry, initialSeconds);
              if (!localStorage.getItem(camReadAnsKey)) {
                localStorage.setItem(camReadAnsKey, JSON.stringify(answers || {}));
              }
            } catch {
              // ignore
            }
            if (timeRemaining === null) {
              setTimeRemaining(initialSeconds);
            }
            // focus first question after small delay
            setTimeout(() => {
              const el = document.getElementById("question-1");
              if (el && typeof el.scrollIntoView === "function") {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 250);
          }}
          maxWidth={480}
        />
      )}

      {/* Header */}
      <TestHeader
        title={headerTitle}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={timeRemaining}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onSubmit={handleSubmit}
        submitted={submitted}
        examType={examType}
        timerWarning={timeRemaining > 0 && timeRemaining <= 300}
        timerCritical={timeRemaining > 0 && timeRemaining <= 60}
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
          <strong>Official time is over.</strong> The system keeps your answers for another {formatTime(graceRemaining)} in case of power loss or page reload. Your teacher can extend the time if needed.
        </div>
      )}

      {/* Main Content - Split View or Single Column based on question type */}
      {currentQuestion && currentQuestion.section.questionType === 'sign-message' ? (
        /* Part 1 (Sign & Message): instruction on top, sign left, options right */
        <div className="cambridge-sign-container flex-1 overflow-y-auto px-3 py-4 sm:p-6">
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {currentQuestion.part.instruction && (
              <div
                className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
              />
            )}

            <div className="cambridge-sign-split">
              <div className="cambridge-sign-intro">
                {(currentQuestion.question.imageUrl || currentQuestion.question.signText) && (
                  <div className="cambridge-sign-card">
                    {currentQuestion.question.imageUrl && (
                      <img
                        src={currentQuestion.question.imageUrl}
                        alt={currentQuestion.question.imageAlt || 'Sign'}
                        style={{
                          width: '100%',
                          height: 'auto',
                          border: '1px solid #ddd'
                        }}
                      />
                    )}
                    {currentQuestion.question.signText && (
                      <div
                        className="cambridge-sign-text"
                        style={{
                          marginTop: currentQuestion.question.imageUrl ? '12px' : '0',
                          padding: '16px',
                          border: '2px solid #333',
                          borderRadius: '4px',
                          fontSize: '16px',
                          fontWeight: '600',
                          background: 'white',
                          lineHeight: '1.5'
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.question.signText) }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="cambridge-sign-questions">
                <div
                  className={`cambridge-question-wrapper ${answers[currentQuestion.key] ? 'answered' : ''} cambridge-sign-question-card p-3 sm:p-4`}
                  style={{ position: 'relative' }}
                >
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>

                  <div className="mb-3">
                    <span className="cambridge-question-number">
                      {currentQuestion.questionNumber}
                    </span>
                    {currentQuestion.question.questionText && (
                      <span style={{ fontSize: '15px', color: '#334155', marginLeft: '8px' }}>
                        {currentQuestion.question.questionText}
                      </span>
                    )}
                  </div>

                  {currentQuestion.question.options && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {currentQuestion.question.options.map((option, idx) => {
                        const optionLetter = String.fromCharCode(65 + idx); // A, B, C
                        const questionKey = currentQuestion.key;
                        const isSelected = answers[questionKey] === optionLetter;
                        const cleanOption = stripOptionLabel(option);

                        return (
                          <li key={idx} className="mb-1.5 sm:mb-2">
                            <label
                              className={`flex min-h-[44px] w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${
                                isSelected ? 'bg-indigo-50' : 'bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${currentQuestion.questionNumber}`}
                                value={optionLetter}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(questionKey, optionLetter)}
                                disabled={submitted}
                                className="mt-1 h-5 w-5 cursor-pointer"
                              />
                              <span style={{
                                minWidth: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                backgroundColor: '#0e276f',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                {optionLetter}
                              </span>
                              <span style={{ fontSize: '15px', lineHeight: '1.5' }}>
                                {cleanOption}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentQuestion && currentQuestion.section.questionType === 'cloze-test' ? (
        /* Part 5 (Open Cloze): Single column with inline text inputs */
        <>
          {/* Part Instruction - Fixed, doesn't scroll */}
          {currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-4">
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              {(() => {
                const questionData = currentQuestion.section.questions?.[0] || {};
                const passageText = questionData.passageText || questionData.passage || '';
                const passageTitle = questionData.passageTitle || '';
                let blanks = questionData.blanks || []; // Use pre-parsed blanks from backend
                
                // Fallback: If no blanks from backend, parse them dynamically
                if (blanks.length === 0 && passageText) {
                  blanks = parseClozeBlanksFromText(passageText, currentQuestion.questionNumber);
                }
                
                const renderPassageWithInputs = () => {
                  if (!passageText) return null;

                  const safeHtml = sanitizeQuillHtml(passageText);
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(safeHtml, 'text/html');
                  const firstQuestionNum = currentQuestion.questionNumber - (allQuestions[currentQuestionIndex].blankIndex || 0);

                  const toCamelCase = (value) => value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
                  const allowedTags = new Set([
                    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'ul', 'ol', 'li',
                    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
                    'blockquote', 'code', 'pre',
                    'a', 'img'
                  ]);
                  const allowedStyleProps = new Set([
                    'textAlign', 'fontWeight', 'fontStyle', 'textDecoration',
                    'color', 'backgroundColor',
                    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                    'lineHeight', 'letterSpacing', 'wordSpacing', 'whiteSpace',
                    'width', 'minWidth', 'maxWidth', 'height',
                    'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
                    'borderCollapse', 'borderSpacing', 'borderColor', 'borderWidth', 'borderStyle',
                    'verticalAlign'
                  ]);
                  const safeHref = (value = '') => {
                    const href = String(value).trim();
                    if (!href) return '';
                    if (/^javascript:/i.test(href)) return '';
                    return href;
                  };
                  const parseStyle = (styleText) => {
                    if (!styleText) return undefined;
                    const style = {};
                    styleText.split(';').forEach((rule) => {
                      const [rawKey, rawValue] = rule.split(':');
                      if (!rawKey || !rawValue) return;
                      const key = toCamelCase(rawKey.trim().toLowerCase());
                      const value = rawValue.trim();
                      if (key && allowedStyleProps.has(key)) style[key] = value;
                    });
                    return Object.keys(style).length ? style : undefined;
                  };

                  const renderTextWithBlanks = (text, keyPrefix) => {
                    if (!text) return null;
                    const parts = [];
                    const regex = /\((\d+)\)|\[(\d+)\]/g;
                    let lastIndex = 0;
                    let match;

                    while ((match = regex.exec(text)) !== null) {
                      const questionNumber = parseInt(match[1] || match[2], 10);
                      const blankIndex = questionNumber - firstQuestionNum;

                      if (match.index > lastIndex) {
                        parts.push(text.slice(lastIndex, match.index));
                      }

                      if (blankIndex >= 0 && blankIndex < blanks.length) {
                        const questionKey = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}-${currentQuestion.questionIndex}-${blankIndex}`;
                        const userAnswer = answers[questionKey] || '';
                        parts.push(
                          <input
                            key={`${keyPrefix}-input-${questionNumber}`}
                            id={`question-${questionNumber}`}
                            type="text"
                            value={userAnswer}
                            onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                            disabled={submitted}
                            placeholder={`(${questionNumber})`}
                            style={{
                              display: 'inline-block',
                              margin: '0 4px',
                              padding: '6px 10px',
                              fontSize: '15px',
                              fontWeight: '600',
                              border: '2px solid #0284c7',
                              borderRadius: '4px',
                              backgroundColor: userAnswer ? '#f0f9ff' : 'white',
                              color: '#0e7490',
                              width: '160px',
                              textAlign: 'center',
                              scrollMarginTop: '100px'
                            }}
                          />
                        );
                      } else {
                        parts.push(match[0]);
                      }

                      lastIndex = match.index + match[0].length;
                    }

                    if (lastIndex < text.length) {
                      parts.push(text.slice(lastIndex));
                    }

                    return parts;
                  };

                  const renderNode = (node, keyPrefix) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                      return renderTextWithBlanks(node.nodeValue || '', keyPrefix);
                    }

                    if (node.nodeType !== Node.ELEMENT_NODE) return null;

                    const tag = node.tagName.toLowerCase();
                    if (!allowedTags.has(tag)) {
                      const fallbackChildren = [];
                      node.childNodes.forEach((child, idx) => {
                        const rendered = renderNode(child, `${keyPrefix}-${idx}`);
                        if (Array.isArray(rendered)) fallbackChildren.push(...rendered);
                        else if (rendered !== null && rendered !== undefined) fallbackChildren.push(rendered);
                      });
                      return fallbackChildren;
                    }

                    const props = { key: keyPrefix };

                    Array.from(node.attributes || []).forEach((attr) => {
                      const name = attr.name.toLowerCase();
                      const value = attr.value;
                      if (name === 'class') props.className = value;
                      if (name === 'style') props.style = parseStyle(value);
                      if (name === 'href') props.href = safeHref(value);
                      if (name === 'target') props.target = value;
                      if (name === 'rel') props.rel = value;
                      if (name === 'src') props.src = value;
                      if (name === 'alt') props.alt = value;
                      if (name === 'width') props.width = value;
                      if (name === 'height') props.height = value;
                      if (name === 'colspan') props.colSpan = value;
                      if (name === 'rowspan') props.rowSpan = value;
                      if (name.startsWith('data-')) props[name] = value;
                    });

                    if (tag === 'a') {
                      const href = safeHref(props.href || '');
                      if (!href) {
                        delete props.href;
                      } else {
                        props.href = href;
                        if (props.target === '_blank') {
                          props.rel = 'noopener noreferrer';
                        }
                      }
                    }

                    if (tag === 'img') {
                      const src = String(props.src || '').trim();
                      if (!src) return null;
                    }

                    const children = [];
                    node.childNodes.forEach((child, idx) => {
                      const rendered = renderNode(child, `${keyPrefix}-${idx}`);
                      if (Array.isArray(rendered)) {
                        children.push(...rendered);
                      } else if (rendered !== null && rendered !== undefined) {
                        children.push(rendered);
                      }
                    });

                    if (tag === 'table') {
                      return React.createElement(
                        'div',
                        {
                          key: `${keyPrefix}-table-wrap`,
                          style: { overflowX: 'auto', marginBottom: '12px' }
                        },
                        React.createElement(
                          'table',
                          {
                            ...props,
                            style: {
                              width: '100%',
                              borderCollapse: 'collapse',
                              ...(props.style || {})
                            }
                          },
                          children.length ? children : undefined
                        )
                      );
                    }

                    if ((tag === 'ul' || tag === 'ol') && !props.style) {
                      props.style = {
                        paddingLeft: '1.25rem',
                        marginBottom: '0.75rem'
                      };
                    }

                    return React.createElement(tag, props, children.length ? children : undefined);
                  };

                  const rootNodes = Array.from(doc.body.childNodes || []);
                  const rendered = rootNodes.map((node, idx) => renderNode(node, `node-${idx}`));

                  return rendered;
                };
                
                return (
                  <div className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`} style={{ position: 'relative' }}>
                    {/* Flag Button */}
                    <button
                      className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                      onClick={() => toggleFlag(currentQuestion.key)}
                      aria-label="Flag question"
                      style={{ position: 'absolute', top: 0, right: 0 }}
                    >
                      {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                    </button>

                    {/* Passage Title */}
                    {passageTitle && (
                      <h3 
                        style={{ 
                          marginBottom: '16px',
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#0c4a6e'
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passageTitle) }}
                      />
                    )}
                    
                    {/* Passage with inline text inputs */}
                    <div 
                      className="cambridge-passage-content"
                      style={{
                        padding: '20px',
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #0284c7',
                        borderRadius: '12px',
                        fontSize: '15px',
                        lineHeight: 2,
                      }}
                    >
                      {renderPassageWithInputs()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'inline-choice' ? (
        /* Part 5 (Inline Choice): Single column with inline dropdowns */
        <>
          {currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3">
            <div style={{ maxWidth: '100%', width: '100%', margin: '0 auto' }}>
              {(() => {
                const questionData = currentQuestion.section.questions?.[0] || {};
                const { passageTitle = '' } = questionData;
                const keyPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}-${currentQuestion.questionIndex}`;

                return (
                  <div
                    className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}
                    style={{ position: 'relative', width: '100%' }}
                  >
                    <button
                      className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                      onClick={() => toggleFlag(currentQuestion.key)}
                      aria-label="Flag question"
                      style={{ position: 'absolute', top: 0, right: 0 }}
                    >
                      {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                    </button>

                    {passageTitle && (
                      <h3
                        style={{
                          marginBottom: '16px',
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#0e276f'
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passageTitle) }}
                      />
                    )}

                    <InlineChoiceDisplay
                      section={{
                        ...currentQuestion.section,
                        ...questionData,
                        id: keyPrefix,
                      }}
                      startingNumber={currentQuestion.questionNumber}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      answerKeyPrefix={keyPrefix}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'cloze-mc' ? (
        /* Part 4 (Cloze MC): PET drag & drop tokens or KET dropdowns */
        <>
          {/* Part Instruction - Fixed, doesn't scroll */}
          {currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3">
            <div style={{ maxWidth: '100%', width: '100%', margin: '0 auto' }}>
              {(() => {
                const questionData = currentQuestion.section.questions?.[0] || {};
                const { passage = '', blanks = [], passageTitle = '' } = questionData;
                const isPetReading = String(testType || test?.testType || '').toLowerCase().includes('pet');
                const keyPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}-${currentQuestion.questionIndex}`;

                if (isPetReading) {
                  return (
                    <div
                      className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}
                      style={{ position: 'relative', width: '100%' }}
                    >
                      <button
                        className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                        onClick={() => toggleFlag(currentQuestion.key)}
                        aria-label="Flag question"
                        style={{ position: 'absolute', top: 0, right: 0 }}
                      >
                        {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                      </button>

                      {passageTitle && (
                        <h3 
                          style={{ 
                            marginBottom: '16px',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: '#0e276f'
                          }}
                          dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passageTitle) }}
                        />
                      )}

                      <ClozeMCDisplay
                        section={{
                          ...currentQuestion.section,
                          ...questionData,
                          id: keyPrefix,
                        }}
                        startingNumber={currentQuestion.questionNumber}
                        onAnswerChange={handleAnswerChange}
                        answers={answers}
                        submitted={submitted}
                        testType={testType}
                        answerKeyPrefix={keyPrefix}
                      />
                    </div>
                  );
                }

                const renderPassageWithDropdowns = () => {
                  if (!passage) return null;
                  
                  const elements = [];
                  let lastIndex = 0;
                  
                  // Find all (19), (20), etc. patterns
                  const regex = /\((\d+)\)/g;
                  let match;
                  
                  while ((match = regex.exec(passage)) !== null) {
                    const questionNumber = parseInt(match[1]);
                    // Get the first question number in this part to calculate correct blank index
                    const firstQuestionNum = currentQuestion.questionNumber - (allQuestions[currentQuestionIndex].blankIndex || 0);
                    const blankIndex = questionNumber - firstQuestionNum;
                    
                    // Only process if this blank exists in our data
                    if (blankIndex >= 0 && blankIndex < blanks.length) {
                      // Add text before this blank
                      if (match.index > lastIndex) {
                        elements.push(
                          <span 
                            key={`text-${lastIndex}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passage.substring(lastIndex, match.index)) }}
                          />
                        );
                      }
                      
                      // Add dropdown
                      const blank = blanks[blankIndex];
                      const questionKey = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}-${currentQuestion.questionIndex}-${blankIndex}`;
                      const userAnswer = answers[questionKey];
                      
                      elements.push(
                        <select
                          key={`dropdown-${questionNumber}`}
                          id={`question-${questionNumber}`}
                          value={userAnswer || ''}
                          onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                          disabled={submitted}
                          style={{
                            display: 'inline-block',
                            margin: '0 4px',
                            padding: '6px 10px',
                            fontSize: '15px',
                            fontWeight: '600',
                            border: '2px solid #0e276f',
                            borderRadius: '4px',
                            backgroundColor: userAnswer ? '#dbeafe' : 'white',
                            color: '#0e276f',
                            cursor: 'pointer',
                            minWidth: '140px',
                            scrollMarginTop: '100px'
                          }}
                        >
                          <option value="">({questionNumber})</option>
                          {blank.options.map((option, optIdx) => {
                            const optionLabel = String.fromCharCode(65 + optIdx);
                            const cleanOption = option.replace(/^[A-C]\.\s*/, '');
                            return (
                              <option key={optIdx} value={optionLabel}>
                                {optionLabel}. {cleanOption}
                              </option>
                            );
                          })}
                        </select>
                      );
                      
                      lastIndex = match.index + match[0].length;
                    }
                  }
                  
                  // Add remaining text
                  if (lastIndex < passage.length) {
                    elements.push(
                      <span 
                        key={`text-${lastIndex}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passage.substring(lastIndex)) }}
                      />
                    );
                  }
                  
                  return elements;
                };
                
                return (
                  <div
                    className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}
                    style={{ position: 'relative', width: '100%' }}
                  >
                    {/* Flag Button */}
                    <button
                      className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                      onClick={() => toggleFlag(currentQuestion.key)}
                      aria-label="Flag question"
                      style={{ position: 'absolute', top: 0, right: 0 }}
                    >
                      {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                    </button>

                    {/* Passage Title */}
                    {passageTitle && (
                      <h3 
                        style={{ 
                          marginBottom: '16px',
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#0e276f'
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(passageTitle) }}
                      />
                    )}
                    
                    {/* Passage with inline dropdowns */}
                    <div 
                      className="cambridge-passage-content"
                      style={{
                        padding: '20px',
                        backgroundColor: '#fefce8',
                        border: '2px solid #fde047',
                        borderRadius: '12px',
                        fontSize: '15px',
                        lineHeight: 2,
                      }}
                    >
                      {renderPassageWithDropdowns()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'short-message' ? (
        /* Part 6 (Writing Task): Split-view with divider (Instructions left | Textarea right) */
        <>
          {/* Part Instruction - Fixed, doesn't scroll */}
          {currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column - Instructions/Requirements */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              {currentQuestion && (
                <div className="cambridge-passage-container">
                  {(() => {
                    const q = currentQuestion.question || {};
                    const situation = q.situation || '';
                    
                    return (
                      <>
                        {/* Situation */}
                        {situation && (
                          <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ 
                              margin: '0 0 12px', 
                              fontSize: '16px', 
                              fontWeight: 700, 
                              color: '#1f2937' 
                            }}>
                              Situation:
                            </h4>
                            <div 
                              style={{
                                fontSize: '14px',
                                lineHeight: '1.6',
                                color: '#374151'
                              }}
                              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(situation) }}
                              className="situation-content"
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Draggable Divider */}
            <div 
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ 
                left: `${leftWidth}%`,
                cursor: isResizing ? 'col-resize' : 'col-resize'
              }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column - Writing Area */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              {currentQuestion && (
                <div className="cambridge-content-wrapper">
                  {(() => {
                    const q = currentQuestion.question || {};
                    const messageType = q.messageType || 'email';
                    const wordLimit = q.wordLimit || { min: 25, max: 35 };
                    const questionKey = currentQuestion.key;
                    const userAnswer = answers[questionKey] || '';
                    const wordCount = userAnswer.trim().split(/\s+/).filter(w => w).length;
                    
                    return (
                      <div className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`} style={{ position: 'relative' }}>
                        {/* Flag Button */}
                        <button
                          className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                          onClick={() => toggleFlag(currentQuestion.key)}
                          aria-label="Flag question"
                          style={{ position: 'absolute', top: 0, right: 0 }}
                        >
                          {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                        </button>

                        {/* Writing Instructions */}
                        <div className="mb-4 pr-4 sm:mb-5 sm:pr-12">
                          <h3 style={{ 
                            margin: '0 0 8px', 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            color: '#0c4a6e' 
                          }}>
                            Write your {messageType}:
                          </h3>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '13px', 
                            color: '#6b7280' 
                          }}>
                            {wordLimit.min} words or more
                          </p>
                        </div>

                        {/* Textarea */}
                        <textarea
                          id={`question-${currentQuestion.questionNumber}`}
                          value={userAnswer}
                          onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                          disabled={submitted}
                          placeholder={`Write your ${messageType} here (${wordLimit.min}-${wordLimit.max} words)...`}
                          style={{
                            width: '100%',
                            minHeight: '400px',
                            padding: '16px',
                            fontSize: '15px',
                            lineHeight: '1.6',
                            border: '2px solid #0284c7',
                            borderRadius: '6px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            backgroundColor: userAnswer ? '#f0f9ff' : 'white',
                            color: '#0c4a6e',
                            marginBottom: '12px'
                          }}
                        />

                        {/* Word Count */}
                        <div className="flex justify-end pr-4 text-[13px] text-slate-500 sm:pr-12">
                          <div>
                            Words: <strong style={{
                              color: wordCount < wordLimit.min ? '#dc2626' : 
                                     wordCount > wordLimit.max ? '#dc2626' : '#16a34a'
                            }}>
                              {wordCount}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      ) : currentQuestion && (currentQuestion.section.questionType === 'matching-pictures' || Array.isArray(currentQuestion.question?.prompts)) ? (
        /* Matching Pictures (e.g. Movers Part 1): Questions left | Divider | Picture Bank right */
        <>
          {/* Part Instruction */}
          {currentQuestion.part.instruction && (
            <div
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column – Questions (prompts + drop zones) */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              <div className="cambridge-passage-container" style={{ padding: '12px' }}>
                {(() => {
                  const sectionData = {
                    ...currentQuestion.section,
                    id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                    questions: [currentQuestion.question],
                  };
                  const promptQs = allQuestions.filter(q =>
                    q.partIndex === currentQuestion.partIndex &&
                    q.sectionIndex === currentQuestion.sectionIndex &&
                    (q.section.questionType === 'matching-pictures' || Array.isArray(q.question?.prompts))
                  );
                  const startNumber = promptQs[0]?.questionNumber ?? currentQuestion.questionNumber;
                  return (
                    <MatchingPicturesDisplay
                      renderMode="questions"
                      section={sectionData}
                      startingNumber={startNumber}
                      answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      sharedSelectedChoiceId={mpSelectedChoiceId}
                      onSharedChoiceSelect={setMpSelectedChoiceId}
                      sharedActivePromptIndex={mpActivePromptIndex}
                      onSharedActivePromptChange={setMpActivePromptIndex}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: 'col-resize' }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column – Picture Bank */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper">
                {(() => {
                  const sectionData = {
                    ...currentQuestion.section,
                    id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                    questions: [currentQuestion.question],
                  };
                  const promptQs = allQuestions.filter(q =>
                    q.partIndex === currentQuestion.partIndex &&
                    q.sectionIndex === currentQuestion.sectionIndex &&
                    (q.section.questionType === 'matching-pictures' || Array.isArray(q.question?.prompts))
                  );
                  const startNumber = promptQs[0]?.questionNumber ?? currentQuestion.questionNumber;
                  return (
                    <MatchingPicturesDisplay
                      renderMode="picturebank"
                      section={sectionData}
                      startingNumber={startNumber}
                      answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      sharedSelectedChoiceId={mpSelectedChoiceId}
                      onSharedChoiceSelect={setMpSelectedChoiceId}
                      sharedActivePromptIndex={mpActivePromptIndex}
                      onSharedActivePromptChange={setMpActivePromptIndex}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'word-drag-cloze' ? (
        /* Movers Part 4: Word Drag & Drop Cloze – passage left | word bank right */
        <>
          {currentQuestion.part.instruction && (
            <div
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}
          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column – Passage with blank slots */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              <div className="cambridge-passage-container" style={{ padding: '12px' }}>
                {(() => {
                  const wdcPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  const wdcQuestions = allQuestions.filter(
                    q => q.partIndex === currentQuestion.partIndex &&
                         q.sectionIndex === currentQuestion.sectionIndex &&
                         q.section.questionType === 'word-drag-cloze'
                  );
                  return (
                    <WordDragClozeDisplay
                      renderMode="passage"
                      section={{ ...currentQuestion.section, id: wdcPrefix, questions: [currentQuestion.question] }}
                      startingNumber={wdcQuestions[0]?.questionNumber ?? currentQuestion.questionNumber}
                      answerKeyPrefix={wdcPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                      sharedFocusedBlank={wdcFocusedBlank}
                      onSharedFocusChange={setWdcFocusedBlank}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: 'col-resize' }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column – Word Bank */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper" style={{ position: 'relative' }}>
                <button
                  className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currentQuestion.key)}
                  aria-label="Flag question"
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                >
                  {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                </button>
                {(() => {
                  const wdcPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  const wdcQuestions = allQuestions.filter(
                    q => q.partIndex === currentQuestion.partIndex &&
                         q.sectionIndex === currentQuestion.sectionIndex &&
                         q.section.questionType === 'word-drag-cloze'
                  );
                  return (
                    <WordDragClozeDisplay
                      renderMode="wordbank"
                      section={{ ...currentQuestion.section, id: wdcPrefix, questions: [currentQuestion.question] }}
                      startingNumber={wdcQuestions[0]?.questionNumber ?? currentQuestion.questionNumber}
                      answerKeyPrefix={wdcPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                      sharedFocusedBlank={wdcFocusedBlank}
                      onSharedFocusChange={setWdcFocusedBlank}
                      activeBlankNumber={currentQuestion.blank?.number ?? null}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'story-completion' ? (
        /* Movers Part 5: Story Completion – story left | letter-box questions right */
        <>
          {currentQuestion.part.instruction && (
            <div
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}
          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column – Story + Examples */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              <div className="cambridge-passage-container" style={{ padding: '12px' }}>
                {(() => {
                  const scPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  const scQuestions = allQuestions.filter(
                    q => q.partIndex === currentQuestion.partIndex &&
                         q.sectionIndex === currentQuestion.sectionIndex &&
                         q.section.questionType === 'story-completion'
                  );
                  return (
                    <StoryCompletionDisplay
                      renderMode="story"
                      section={{ ...currentQuestion.section, id: scPrefix, questions: [currentQuestion.question] }}
                      startingNumber={scQuestions[0]?.questionNumber ?? currentQuestion.questionNumber}
                      answerKeyPrefix={scPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: 'col-resize' }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column – Letter-box Questions */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper" style={{ position: 'relative' }}>
                <button
                  className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currentQuestion.key)}
                  aria-label="Flag question"
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                >
                  {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                </button>
                {(() => {
                  const scPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  // Show only the CURRENT item (1 câu / 1 item) so young learners aren't overwhelmed
                  const singleItemQ = {
                    ...currentQuestion.question,
                    items: [currentQuestion.item],
                  };
                  return (
                    <StoryCompletionDisplay
                      renderMode="questions"
                      section={{ ...currentQuestion.section, id: scPrefix, questions: [singleItemQ] }}
                      startingNumber={currentQuestion.questionNumber}
                      startItemIndex={currentQuestion.itemIndex}
                      answerKeyPrefix={scPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'look-read-write' ? (
        /* Movers Part 6: Look, Read & Write – picture+examples left | questions right */
        <>
          {currentQuestion.part.instruction && (
            <div
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}
          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column – Picture + Examples */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              <div className="cambridge-passage-container" style={{ padding: '12px' }}>
                {(() => {
                  const lrwPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  const lrwQuestions = allQuestions.filter(
                    q => q.partIndex === currentQuestion.partIndex &&
                         q.sectionIndex === currentQuestion.sectionIndex &&
                         q.section.questionType === 'look-read-write'
                  );
                  return (
                    <LookReadWriteDisplay
                      renderMode="picture"
                      section={{ ...currentQuestion.section, id: lrwPrefix, questions: [currentQuestion.question] }}
                      startingNumber={lrwQuestions[0]?.questionNumber ?? currentQuestion.questionNumber}
                      answerKeyPrefix={lrwPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: 'col-resize' }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column – Three Question Groups */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper" style={{ position: 'relative' }}>
                <button
                  className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currentQuestion.key)}
                  aria-label="Flag question"
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                >
                  {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                </button>
                {(() => {
                  const lrwPrefix = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`;
                  const lrwQuestions = allQuestions.filter(
                    q => q.partIndex === currentQuestion.partIndex &&
                         q.sectionIndex === currentQuestion.sectionIndex &&
                         q.section.questionType === 'look-read-write'
                  );
                  // Show only the CURRENT GROUP so young learners aren't overwhelmed
                  const activeGroupIdx = currentQuestion.groupIndex ?? 0;
                  const activeGroup = currentQuestion.question.groups?.[activeGroupIdx];
                  const singleGroupQ = {
                    ...currentQuestion.question,
                    groups: activeGroup ? [activeGroup] : currentQuestion.question.groups,
                  };
                  const groupFirstQ = lrwQuestions.find(q => q.groupIndex === activeGroupIdx);
                  return (
                    <LookReadWriteDisplay
                      renderMode="questions"
                      section={{ ...currentQuestion.section, id: lrwPrefix, questions: [singleGroupQ] }}
                      startingNumber={groupFirstQ?.questionNumber ?? currentQuestion.questionNumber}
                      startGroupIndex={activeGroupIdx}
                      answerKeyPrefix={lrwPrefix}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      partImage={currentQuestion.part?.imageUrl || ""}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : currentQuestion && currentQuestion.section.questionType === 'image-cloze' ? (
        /* Image Cloze (Movers Part 3): Passage left | Resizable Divider | Picture Bank right */
        <>
          {currentQuestion.part.instruction && (
            <div
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}
          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column – Passage with blank drop zones */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              <div className="cambridge-passage-container" style={{ padding: '12px' }}>
                {(() => {
                  const icQuestions = allQuestions.filter(q =>
                    q.partIndex === currentQuestion.partIndex &&
                    q.sectionIndex === currentQuestion.sectionIndex &&
                    q.section.questionType === 'image-cloze'
                  );
                  const startNumber = icQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;
                  return (
                    <ImageClozeDisplay
                      renderMode="passage"
                      section={{
                        ...currentQuestion.section,
                        id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                        questions: [currentQuestion.question],
                      }}
                      startingNumber={startNumber}
                      answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      sharedSelectedImgId={icSelectedImgId}
                      onSharedImgSelect={setIcSelectedImgId}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: 'col-resize' }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column – Picture Bank */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper">
                {(() => {
                  const icQuestions = allQuestions.filter(q =>
                    q.partIndex === currentQuestion.partIndex &&
                    q.sectionIndex === currentQuestion.sectionIndex &&
                    q.section.questionType === 'image-cloze'
                  );
                  const startNumber = icQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;
                  return (
                    <ImageClozeDisplay
                      renderMode="picturebank"
                      section={{
                        ...currentQuestion.section,
                        id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                        questions: [currentQuestion.question],
                      }}
                      startingNumber={startNumber}
                      answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      sharedSelectedImgId={icSelectedImgId}
                      onSharedImgSelect={setIcSelectedImgId}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Part Instruction - Above split view */}
          {currentQuestion && currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction px-4 py-2 text-[13px] leading-relaxed sm:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.instruction) }}
            />
          )}

          <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
            {/* Left Column - Passage */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              {currentQuestion && (
                <>

                  {/* Passage - check both part.passage and question.passage for long-text-mc */}
                  {currentQuestion.part.passage ? (
                    <div className="cambridge-passage-container">
                      {currentQuestion.part.title && (
                        <h3 className="cambridge-passage-title">
                          {currentQuestion.part.title}
                        </h3>
                      )}
                      <div 
                        className="cambridge-passage-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.part.passage) }}
                      />
                    </div>
                  ) : currentQuestion.question.passage && currentQuestion.question.passage !== '<p><br></p>' ? (
                    /* For long-text-mc: passage is in question object */
                    <div className="cambridge-passage-container">
                      {currentQuestion.question.passageTitle && (
                        <h3 className="cambridge-passage-title">
                          {currentQuestion.question.passageTitle}
                        </h3>
                      )}
                      <div 
                        className="cambridge-passage-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeQuillHtml(currentQuestion.question.passage) }}
                      />
                    </div>
                  ) : (currentQuestion.section.questionType === 'people-matching' || Array.isArray(currentQuestion.question?.people)) ? (
                    <div className="cambridge-passage-container">
                      {(() => {
                        const peopleQuestions = allQuestions.filter(q => 
                          q.partIndex === currentQuestion.partIndex &&
                          q.sectionIndex === currentQuestion.sectionIndex &&
                          (q.section.questionType === 'people-matching' || Array.isArray(q.question?.people))
                        );
                        const startNumber = peopleQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;

                        return (
                          <PeopleMatchingDisplay
                            section={{
                              ...currentQuestion.section,
                              id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                              questions: [currentQuestion.question],
                            }}
                            startingNumber={startNumber}
                            answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                            onAnswerChange={handleAnswerChange}
                            answers={answers}
                            submitted={submitted}
                            showPeople={true}
                            showTexts={false}
                          />
                        );
                      })()}
                    </div>
                  ) : currentQuestion.part.imageUrl ? (
                    /* Part scene image (e.g. Movers Part 2) */
                    <div className="cambridge-passage-container" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                        <img
                          src={/^https?:\/\//i.test(currentQuestion.part.imageUrl) ? currentQuestion.part.imageUrl : hostPath(currentQuestion.part.imageUrl)}
                          alt="Part illustration"
                          style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        />
                      </div>

                      {/* Example block for abc-type sections under part image */}
                      {currentQuestion.section.questionType === 'abc' && (currentQuestion.section.exampleText || currentQuestion.section.exampleAnswer) && currentQuestion.questionIndex === 0 && (
                        <div style={{
                          marginTop: '16px',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 16px rgba(234,179,8,0.18)',
                          border: '2px solid #fde68a',
                        }}>
                          {/* Header */}
                          <div style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            padding: '8px 14px',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <span style={{ fontSize: 18 }}>⭐</span>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              Ví dụ mẫu
                            </span>
                          </div>

                          {/* Body */}
                          <div style={{ background: '#fffbeb', padding: '12px 14px' }}>
                            {currentQuestion.section.exampleText && (() => {
                              const exAnswer = String(currentQuestion.section.exampleAnswer || '').trim().toUpperCase();
                              const lines = currentQuestion.section.exampleText.split('\n');
                              const optionRegex = /^([A-C])\.\s*(.*)/;
                              const contextLines = lines.filter(l => !optionRegex.test(l.trim()));
                              const optionLines = lines.filter(l => optionRegex.test(l.trim()));
                              const OPTION_THEMES = [
                                { grad: ['#3b82f6','#1d4ed8'], light: '#dbeafe', lightBorder: '#93c5fd' },
                                { grad: ['#f97316','#ea580c'], light: '#ffedd5', lightBorder: '#fdba74' },
                                { grad: ['#a855f7','#8b5cf6'], light: '#f3e8ff', lightBorder: '#d8b4fe' },
                              ];
                              return (
                                <div style={{ marginBottom: currentQuestion.section.exampleAnswer ? 12 : 0 }}>
                                  {/* Context text (non-option lines) */}
                                  {contextLines.length > 0 && (
                                    <div style={{ color: '#374151', lineHeight: 1.75, fontSize: 14, marginBottom: optionLines.length ? 10 : 0, whiteSpace: 'pre-wrap' }}>
                                      {contextLines.join('\n')}
                                    </div>
                                  )}
                                  {/* Styled A/B/C option cards */}
                                  {optionLines.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                      {optionLines.map((line, idx) => {
                                        const match = line.trim().match(optionRegex);
                                        if (!match) return null;
                                        const letter = match[1].toUpperCase();
                                        const text = match[2].trim();
                                        const isCorrect = letter === exAnswer;
                                        const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];
                                        return (
                                          <div key={letter} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '9px 12px',
                                            borderRadius: 12,
                                            border: `2px solid ${isCorrect ? '#22c55e' : theme.lightBorder}`,
                                            background: isCorrect ? '#f0fdf4' : theme.light,
                                            boxShadow: isCorrect ? '0 4px 12px #22c55e30' : 'none',
                                          }}>
                                            <div style={{
                                              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              background: isCorrect
                                                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                                                : `linear-gradient(135deg,${theme.grad[0]},${theme.grad[1]})`,
                                              color: '#fff', fontWeight: 900, fontSize: 15,
                                              boxShadow: isCorrect ? '0 3px 8px #22c55e50' : 'none',
                                            }}>
                                              {isCorrect ? '✓' : letter}
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: isCorrect ? 700 : 500, color: isCorrect ? '#15803d' : '#1f2937', flex: 1 }}>
                                              {text}
                                            </span>

                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {currentQuestion.section.exampleAnswer && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <span style={{ fontSize: 13, color: '#78350f', fontWeight: 600 }}>Đáp án đúng:</span>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 34, height: 34, borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                  color: 'white', fontWeight: 900, fontSize: 16,
                                  boxShadow: '0 3px 10px #22c55e50',
                                }}>
                                  {currentQuestion.section.exampleAnswer}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback */
                    <div className="cambridge-passage-container">
                      <div style={{ 
                        padding: '40px', 
                        textAlign: 'center', 
                        color: '#999',
                        fontSize: '14px'
                      }}>
                        No passage for this part
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Draggable Divider */}
            <div 
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ 
                left: `${leftWidth}%`,
                cursor: isResizing ? 'col-resize' : 'col-resize'
              }}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-arrows-h"></i>
              </div>
            </div>

            {/* Right Column - Questions */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              {currentQuestion && (
                <div className="cambridge-content-wrapper">
                  {/* Section Title */}
                  {currentQuestion.section.sectionTitle && (
                    <h3 className="cambridge-section-title">
                      {currentQuestion.section.sectionTitle}
                    </h3>
                  )}

              {/* For long-text-mc: Show ALL questions in section */}
              {currentQuestion.section.questionType === 'long-text-mc' && currentQuestion.question.questions ? (
                <div>
                  {/* Render all nested questions at once */}
                  {allQuestions
                    .filter(q => 
                      q.partIndex === currentQuestion.partIndex && 
                      q.sectionIndex === currentQuestion.sectionIndex &&
                      q.section.questionType === 'long-text-mc'
                    )
                    .map((q) => (
                      <div 
                        key={q.key}
                        id={`question-${q.questionNumber}`}
                        className={`cambridge-question-wrapper ${answers[q.key] ? 'answered' : ''} ${q.key === currentQuestion.key ? 'active-question' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}
                        style={{ marginBottom: '24px', scrollMarginTop: '20px' }}
                      >
                        {/* Flag Button */}
                        <button
                          className={`cambridge-flag-button ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
                          onClick={() => toggleFlag(q.key)}
                          aria-label={`Flag question ${q.questionNumber}`}
                        >
                          {flaggedQuestions.has(q.key) ? '🚩' : '⚐'}
                        </button>

                        {/* Question Content */}
                        <div className="pr-4 sm:pr-12">
                          {/* Question Number + Text */}
                          <div style={{ marginBottom: '12px' }}>
                            <span className="cambridge-question-number">
                              {q.questionNumber}
                            </span>
                            {q.nestedQuestion?.questionText && (
                              <span style={{ 
                                marginLeft: '12px', 
                                fontSize: '15px', 
                                fontWeight: '600',
                                color: '#1a1a1a' 
                              }}>
                                {q.nestedQuestion.questionText}
                              </span>
                            )}
                          </div>

                          {/* Options */}
                          {q.nestedQuestion?.options && (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {q.nestedQuestion.options.map((option, optIdx) => {
                                const optionLetter = String.fromCharCode(65 + optIdx);
                                const isSelected = answers[q.key] === optionLetter;
                                const cleanOption = stripOptionLabel(option);

                                return (
                                  <li key={optIdx} className="mb-1.5 sm:mb-2">
                                    <label
                                      className={`flex min-h-[44px] w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${
                                        isSelected ? 'bg-indigo-50' : 'bg-white'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${q.questionNumber}`}
                                        value={optionLetter}
                                        checked={isSelected}
                                        onChange={() => handleAnswerChange(q.key, optionLetter)}
                                        disabled={submitted}
                                        className="mt-1 h-5 w-5 cursor-pointer"
                                      />
                                      <span style={{
                                        minWidth: '22px',
                                        height: '22px',
                                        borderRadius: '4px',
                                        backgroundColor: '#0e276f',
                                        color: '#fff',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        marginTop: '2px'
                                      }}>
                                        {optionLetter}
                                      </span>
                                      <span className="text-sm leading-6 sm:text-[15px]">
                                        {cleanOption}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (currentQuestion.section.questionType === 'matching-pictures' || Array.isArray(currentQuestion.question?.prompts)) ? (
                <div className={`cambridge-question-wrapper ${isQuestionAnswered(currentQuestion) ? 'answered' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}>
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>

                  <div className="pr-4 sm:pr-12">
                    {(() => {
                      const promptQuestions = allQuestions.filter(q =>
                        q.partIndex === currentQuestion.partIndex &&
                        q.sectionIndex === currentQuestion.sectionIndex &&
                        q.section.questionType === 'matching-pictures'
                      );
                      const startNumber = promptQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;

                      return (
                        <MatchingPicturesDisplay
                          section={{
                            ...currentQuestion.section,
                            id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                            questions: [currentQuestion.question],
                          }}
                          startingNumber={startNumber}
                          answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                          onAnswerChange={handleAnswerChange}
                          answers={answers}
                          submitted={submitted}
                        />
                      );
                    })()}
                  </div>
                </div>
              ) : currentQuestion.section.questionType === 'image-cloze' ? (
                <div className={`cambridge-question-wrapper ${isQuestionAnswered(currentQuestion) ? 'answered' : ''} !w-full p-3 sm:p-4`}>
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>
                  <div className="pr-4 sm:pr-12">
                    {(() => {
                      const icQuestions = allQuestions.filter(q =>
                        q.partIndex === currentQuestion.partIndex &&
                        q.sectionIndex === currentQuestion.sectionIndex &&
                        q.section.questionType === 'image-cloze'
                      );
                      const startNumber = icQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;
                      return (
                        <ImageClozeDisplay
                          section={{
                            ...currentQuestion.section,
                            id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                            questions: [currentQuestion.question],
                          }}
                          startingNumber={startNumber}
                          answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                          onAnswerChange={handleAnswerChange}
                          answers={answers}
                          submitted={submitted}
                        />
                      );
                    })()}
                  </div>
                </div>
              ) : (currentQuestion.section.questionType === 'people-matching' || Array.isArray(currentQuestion.question?.people)) ? (
                <div className={`cambridge-question-wrapper ${isQuestionAnswered(currentQuestion) ? 'answered' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}>
                  {/* Flag Button */}
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>

                  <div className="pr-4 sm:pr-12">
                    {(() => {
                      const peopleQuestions = allQuestions.filter(q => 
                        q.partIndex === currentQuestion.partIndex &&
                        q.sectionIndex === currentQuestion.sectionIndex &&
                        q.section.questionType === 'people-matching'
                      );
                      const startNumber = peopleQuestions[0]?.questionNumber ?? currentQuestion.questionNumber;

                      return (
                        <PeopleMatchingDisplay
                          section={{
                            ...currentQuestion.section,
                            id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                            questions: [currentQuestion.question],
                          }}
                          startingNumber={startNumber}
                          answerKeyPrefix={`${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`}
                          onAnswerChange={handleAnswerChange}
                          answers={answers}
                          submitted={submitted}
                          showPeople={false}
                          showTexts={true}
                        />
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* Other question types: Show single question */
                <div className={`cambridge-question-wrapper ${answers[currentQuestion.key] ? 'answered' : ''} !w-full sm:!w-[80%] p-3 sm:p-4`}>
                  {/* Flag Button */}
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>

                  {/* Question Content */}
                  <div className="pr-4 sm:pr-12">
                    <span className="cambridge-question-number">
                      {currentQuestion.questionNumber}
                    </span>

                    <QuestionDisplayFactory
                      section={{ 
                        ...currentQuestion.section,
                        id: `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}`,
                        questions: [currentQuestion.question],
                      }}
                      questionType={currentQuestion.section.questionType}
                      startingNumber={currentQuestion.questionNumber}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                      singleQuestionMode={true}
                      questionIndex={currentQuestion.questionIndex}
                      examType={examType}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Footer Navigation */}
      <footer className="cambridge-footer">
        {/* Floating arrows – positioned absolute above footer */}
        <div className="cambridge-footer-arrows">
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-chevron-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === allQuestions.length - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-chevron-right"></i>
          </button>
        </div>

        {/* Parts strip – horizontally scrollable */}
        <div className="cambridge-parts-container">
          {test?.parts?.map((part, idx) => {
            /* eslint-disable-next-line no-unused-vars */
            const range = getPartQuestionRange(idx);
            const isActive = currentPartIndex === idx;
            const partEntries = allQuestions.filter((q) => q.partIndex === idx);
            const partQuestions = partEntries.filter(isNumberedQuestion);
            const partWritingTasks = partEntries.filter((q) => !isNumberedQuestion(q));
            const answeredInPart = partQuestions.filter((q) => isQuestionAnswered(q)).length;
            const totalInPart = partQuestions.length;

            return (
              <div key={idx} className={`cambridge-part-wrapper ${isActive ? 'active' : ''}`}>
                {/* Part chip */}
                <button
                  className={`cambridge-part-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    const firstEntry = partEntries[0];
                    const firstIndex = firstEntry ? (questionIndexByKey.get(firstEntry.key) ?? -1) : -1;
                    if (firstIndex >= 0) goToQuestion(firstIndex);
                  }}
                  title={`Part ${idx + 1}`}
                >
                  <span className="cambridge-part-label">P</span>
                  <span className="cambridge-part-number">{idx + 1}</span>
                  {!isActive && totalInPart > 0 && (
                    <span className="cambridge-part-badge">{answeredInPart}/{totalInPart}</span>
                  )}
                </button>

                {/* Question bubbles – only when this part is active */}
                {isActive && (
                  <div className="cambridge-questions-inline">
                    {(totalInPart > 0 || partWritingTasks.length > 0) ? (
                      <>
                        {partQuestions.map((q) => {
                          const questionIndex = questionIndexByKey.get(q.key) ?? -1;
                          const isActiveQuestion = currentQuestionIndex === questionIndex;

                          return (
                            <button
                              key={q.key}
                              className={`cambridge-question-num-btn ${isQuestionAnswered(q) ? 'answered' : ''} ${isActiveQuestion ? 'active' : ''} ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
                              onClick={() => goToQuestion(questionIndex)}
                              title={`Question ${q.questionNumber}${isQuestionAnswered(q) ? ' ✓' : ''}`}
                            >
                              {isQuestionAnswered(q) && !isActiveQuestion
                                ? <i className="fa fa-check" style={{ fontSize: 10 }}></i>
                                : q.questionNumber}
                              {flaggedQuestions.has(q.key) && (
                                <span className="nav-flag-icon" aria-hidden="true">🚩</span>
                              )}
                            </button>
                          );
                        })}
                        {partWritingTasks.map((q, writingIdx) => {
                          const questionIndex = questionIndexByKey.get(q.key) ?? -1;
                          const isActiveQuestion = currentQuestionIndex === questionIndex;
                          const label = partWritingTasks.length > 1 ? `W${writingIdx + 1}` : 'W';

                          return (
                            <button
                              key={q.key}
                              className={`cambridge-question-num-btn ${isQuestionAnswered(q) ? 'answered' : ''} ${isActiveQuestion ? 'active' : ''} ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
                              onClick={() => goToQuestion(questionIndex)}
                              title={`Writing${isQuestionAnswered(q) ? ' ✓' : ''}`}
                            >
                              {label}
                              {flaggedQuestions.has(q.key) && (
                                <span className="nav-flag-icon" aria-hidden="true">🚩</span>
                              )}
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <span className="cambridge-writing-label">Writing</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Q counter */}
        <div className="cambridge-footer-right">
          <span className="cambridge-q-counter">
            {currentCounterLabel}<span className="cambridge-q-counter-total">/{totalQuestions}</span>
          </span>
        </div>
      </footer>

      {/* Results Modal */}
      {submitted && results && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <h2 style={{ margin: '0 0 20px', color: '#0052cc' }}>📊 Test Results</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px', background: '#f0fdf4', borderRadius: '12px' }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#0052cc' }}>{results.score}/{results.total}</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#22c55e' }}>{results.percentage}%</div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/cambridge')} style={{ padding: '12px 24px', background: '#0052cc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                📋 Select another test
              </button>
              <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                🔄 Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Submit Cambridge Reading?"
        message="Are you sure you want to submit your answers? After submission, you will not be able to edit them."
        type="info"
        iconName="reading"
        confirmText="Submit now"
        cancelText="Keep working"
        extraContent={
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>
                {answeredCount}
              </div>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>Answered</div>
            </div>
            <div style={{ background: unansweredCount > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${unansweredCount > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: unansweredCount > 0 ? '#dc2626' : '#15803d', lineHeight: 1 }}>
                {unansweredCount}
              </div>
              <div style={{ fontSize: 11, color: unansweredCount > 0 ? '#ef4444' : '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>Unanswered</div>
            </div>
          </div>
        }
      />

      {/* Results Modal */}
      {results && submitted && (
        <CambridgeResultsModal
          results={results}
          testTitle={test?.title}
          studentName={JSON.parse(localStorage.getItem("user") || "{}").name || JSON.parse(localStorage.getItem("user") || "{}").username}
          onClose={() => {
            setResults(null);
            setSubmitted(false);
            navigate(-1);
          }}
        />
      )}
    </div>
  );
};

export default DoCambridgeReadingTest;

