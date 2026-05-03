import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { apiPath, getStoredUser, hostPath } from "../../../../shared/utils/api";
import {
  buildPlacementAttemptPath,
  readPlacementRuntimeContext,
} from "../../../../shared/utils/placementTests";
import TestHeader from "../../../../shared/components/TestHeader";
import ExtensionToast from "../../../../shared/components/ExtensionToast";
import TestStartModal from "../../../../shared/components/TestStartModal";
import ConfirmModal from "../../../../shared/components/ConfirmModal";
import CambridgeResultsModal from "../components/CambridgeResultsModal";
import LineIcon from "../../../../shared/components/LineIcon.jsx";
import { useTheme } from "../../../../shared/contexts/ThemeContext";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../../shared/utils/testTiming";
import { TEST_CONFIGS } from "../../../../shared/config/questionTypes";
import { computeQuestionStarts, countClozeBlanksFromText, getQuestionCountForSection } from "../utils/questionNumbering";
import { CambridgeQuestionDisplay, CompactCambridgeQuestionDisplay } from "../components/CambridgeQuestionCards";
import { ColourWriteStudentSection, DrawLinesQuestion, ImageTickSlideSection, LetterMatchingStudentSection } from "../components/CambridgeListeningRuntimeSections";
import { OpenClozeSectionDisplay, GapMatchSectionDisplay } from "../components/CambridgeSectionDisplays";
import createStyles from "./DoCambridgeListeningTest.styles";
import './DoCambridgeReadingTest.css';

const SERVER_AUTOSAVE_INTERVAL_MS = 30000;
const SERVER_TIMING_RECONCILE_INTERVAL_MS = 15000;

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

/**
 * DoCambridgeListeningTest - Trang làm bài thi Listening Cambridge (KET, PET, etc.)
 * Support: KET, PET, FLYERS, MOVERS, STARTERS
 */
const DoCambridgeListeningTest = () => {
  const { testType, id } = useParams(); // testType: ket-listening, pet-listening, etc.
  const location = useLocation();
  const navigate = useNavigate();
  const placementContext = useMemo(
    () => readPlacementRuntimeContext({ pathname: location.pathname, search: location.search }),
    [location.pathname, location.search]
  );
  const isPlacementRuntime = Boolean(
    placementContext.isPlacementRuntime && placementContext.placementAttemptItemToken
  );
  const { isDarkMode } = useTheme();
  const examType = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("ket")) return "KET";
    if (s.includes("pet")) return "PET";
    if (s.includes("flyers")) return "FLYERS";
    if (s.includes("movers")) return "MOVERS";
    if (s.includes("starters")) return "STARTERS";
    // fallback to Cambridge style if unknown
    return "CAMBRIDGE";
  }, [testType]);

  const styles = useMemo(() => createStyles(isDarkMode, examType), [isDarkMode, examType]);

  // States
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  /* eslint-disable-next-line no-unused-vars */
  const [expandedPart, setExpandedPart] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const [activeQuestion, setActiveQuestion] = useState(null);

  // Cambridge-style start gate (must click Play)
  const [testStarted, setTestStarted] = useState(false);
  const [startedAudioByPart, setStartedAudioByPart] = useState({});
  const [showAudioTip, setShowAudioTip] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => new Set());
  const [audioError, setAudioError] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasResumeAudio, setHasResumeAudio] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const maxPlayedTimeByPartRef = useRef({});
  const sharedAudioMaxPlayedTimeRef = useRef(0);
  const ignoreSeekRef = useRef(false);
  const switchingAudioSrcRef = useRef(false);
  const lastAudioSrcRef = useRef('');
  const endTimeRef = useRef(null);
  const lastAudioTimeRef = useRef(0);
  const lastAudioSaveRef = useRef(0);
  const submissionIdRef = useRef(null);
  const confirmSubmitRef = useRef(null);
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  // Cambridge Reading-like splitter
  const [leftWidth, setLeftWidth] = useState(42);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Get test config
  const testConfig = useMemo(() => {
    return TEST_CONFIGS[testType] || TEST_CONFIGS['ket-listening'];
  }, [testType]);

  const storageKey = useMemo(() => {
    if (placementContext.placementAttemptItemToken) {
      return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}-placement:${placementContext.placementAttemptItemToken}`;
    }

    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const uid = u?.id || 'anon';
      return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}-${uid}`;
    } catch {
      return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}-anon`;
    }
  }, [id, placementContext.placementAttemptItemToken, testType]);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        endTimeRef.current = expiresAtMs;
        setTimeRemaining(getRemainingSeconds(expiresAtMs));
        setGraceRemaining(getGraceRemainingSeconds(expiresAtMs));
        return true;
      }

      endTimeRef.current = null;
      setGraceRemaining(0);
      if (fallbackSeconds !== null) {
        setTimeRemaining(fallbackSeconds);
      }
      return false;
    },
    []
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

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const localUser = getStoredUser();
        const res = await fetch(apiPath(`cambridge/listening-tests/${id}`));
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
        const initialSeconds = (testConfig.duration || 30) * 60;
        setTimeRemaining(initialSeconds);
  setGraceRemaining(0);

        let restoredFromServer = false;

        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved?.submissionId) {
              submissionIdRef.current = saved.submissionId;
            }
            if (saved?.answers) setAnswers(saved.answers);
            if (Number.isInteger(saved?.currentPartIndex)) {
              setCurrentPartIndex(saved.currentPartIndex);
              setExpandedPart(saved.currentPartIndex);
            }
            if (saved?.activeQuestion) setActiveQuestion(saved.activeQuestion);
            if (saved?.startedAudioByPart) setStartedAudioByPart(saved.startedAudioByPart);
            if (saved?.testStarted) {
              setTestStarted(true);
              setHasResumeAudio(true);
            }

            if (saved?.endTime) {
              syncTimingState(saved.endTime, initialSeconds);
            }

            if (typeof saved?.audioCurrentTime === 'number') {
              lastAudioTimeRef.current = saved.audioCurrentTime;
              if (saved.audioCurrentTime > 0) {
                setHasResumeAudio(true);
              }
            }
          }
        } catch {
          // ignore restore errors
        }

        const query = placementContext.placementAttemptItemToken
          ? `?placementAttemptItemToken=${encodeURIComponent(
              placementContext.placementAttemptItemToken
            )}`
          : submissionIdRef.current
            ? `?submissionId=${submissionIdRef.current}`
            : localUser?.id
              ? `?userId=${localUser.id}`
              : "";

        if (query) {
          try {
            const activeRes = await fetch(
              apiPath(
                `cambridge/submissions/active${query}&testId=${id}&testType=${encodeURIComponent(parsedData.testType)}`
              )
            );
            if (activeRes.ok) {
              const payload = await activeRes.json().catch(() => null);
              const draft = payload?.submission || null;
              if (draft && draft.finished !== true) {
                restoredFromServer = true;
                if (draft.id) {
                  submissionIdRef.current = draft.id;
                }

                const serverAnswers =
                  draft.answers &&
                  typeof draft.answers === "object" &&
                  !Array.isArray(draft.answers)
                    ? draft.answers
                    : {};
                setAnswers(serverAnswers);

                const progressMeta =
                  draft.progressMeta &&
                  typeof draft.progressMeta === "object" &&
                  !Array.isArray(draft.progressMeta)
                    ? draft.progressMeta
                    : {};

                if (Number.isInteger(progressMeta.currentPartIndex)) {
                  setCurrentPartIndex(progressMeta.currentPartIndex);
                  setExpandedPart(progressMeta.currentPartIndex);
                }
                if (progressMeta.activeQuestion) {
                  setActiveQuestion(progressMeta.activeQuestion);
                }
                if (progressMeta.startedAudioByPart) {
                  setStartedAudioByPart(progressMeta.startedAudioByPart);
                }
                if (progressMeta.testStarted) {
                  setTestStarted(true);
                }
                if (typeof progressMeta.audioCurrentTime === "number") {
                  lastAudioTimeRef.current = progressMeta.audioCurrentTime;
                  if (progressMeta.audioCurrentTime > 0) {
                    setHasResumeAudio(true);
                  }
                }

                const endTime = progressMeta.endTime || (draft.expiresAt ? new Date(draft.expiresAt).getTime() : null);
                if (Number.isFinite(Number(endTime))) {
                  syncTimingState(Number(endTime), initialSeconds);
                }

                try {
                  localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                      answers: serverAnswers,
                      currentPartIndex:
                        Number.isInteger(progressMeta.currentPartIndex)
                          ? progressMeta.currentPartIndex
                          : 0,
                      activeQuestion: progressMeta.activeQuestion || null,
                      startedAudioByPart: progressMeta.startedAudioByPart || {},
                      testStarted: Boolean(progressMeta.testStarted),
                      endTime: Number.isFinite(Number(endTime))
                        ? Number(endTime)
                        : null,
                      audioCurrentTime:
                        typeof progressMeta.audioCurrentTime === "number"
                          ? progressMeta.audioCurrentTime
                          : 0,
                      submissionId: draft.id,
                      updatedAt: Date.now(),
                    })
                  );
                } catch {
                  // ignore local mirror errors
                }
              }
            }
          } catch (resumeErr) {
            console.error("Error restoring Cambridge listening draft:", resumeErr);
          }
        }

        if (!restoredFromServer && submissionIdRef.current) {
          try {
            const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...(raw || {}),
                submissionId: submissionIdRef.current,
              })
            );
          } catch {
            // ignore local mirror errors
          }
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id, testConfig.duration, storageKey, syncTimingState]);

  const hasAnyAudio = useMemo(() => {
    return Boolean(test?.mainAudioUrl || test?.parts?.some((p) => p?.audioUrl));
  }, [test]);

  // If teacher uploads only one mp3 (usually in Part 1), treat it as global audio.
  const globalAudioUrl = useMemo(() => {
    if (test?.mainAudioUrl) return test.mainAudioUrl;
    const parts = test?.parts || [];
    const first = parts.find((p) => p?.audioUrl)?.audioUrl;
    return first || '';
  }, [test]);

  const audioMeta = useMemo(() => {
    if (test?.mainAudioUrl) {
      return {
        hasAudio: true,
        uniqueCount: 1,
        isSingleFile: true,
        usesMain: true,
      };
    }
    const urls = new Set(
      (test?.parts || [])
        .map((p) => (p?.audioUrl ? String(p.audioUrl).trim() : ''))
        .filter(Boolean)
    );
    return {
      hasAudio: urls.size > 0,
      uniqueCount: urls.size,
      isSingleFile: urls.size === 1,
      usesMain: false,
    };
  }, [test]);


  // Build global question order + ranges (for footer nav)
  const questionIndex = useMemo(() => {
    const parts = test?.parts || [];
    const starts = computeQuestionStarts(parts);
    let globalNumber = 1;
    const byPart = [];
    const orderedKeys = [];

    const countClozeBlanks = (question) => {
      if (Array.isArray(question?.blanks) && question.blanks.length) return question.blanks.length;
      if (question?.answers && typeof question.answers === 'object') {
        return Object.keys(question.answers).length;
      }
      return countClozeBlanksFromText(question?.passageText || question?.passage || '');
    };

    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const partKeys = [];
      const start = starts.sectionStart[`${pIdx}-0`] || globalNumber;
      if (start !== globalNumber) globalNumber = start;

      const sections = part?.sections || [];
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const q0 = sec?.questions?.[0] || {};
        const secType =
          sec?.questionType ||
          q0?.questionType ||
          q0?.type ||
          (Array.isArray(q0?.people) ? 'people-matching' : '') ||
          (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
          (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
          '';
        const questions = sec?.questions || [];

        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx];

          if (secType === 'long-text-mc' && Array.isArray(q?.questions)) {
            for (let nestedIdx = 0; nestedIdx < q.questions.length; nestedIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${nestedIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'cloze-mc' && Array.isArray(q?.blanks)) {
            for (let blankIdx = 0; blankIdx < q.blanks.length; blankIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'cloze-test') {
            const blanksCount = countClozeBlanks(q);
            if (blanksCount > 0) {
              for (let blankIdx = 0; blankIdx < blanksCount; blankIdx++) {
                const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
                const num = globalNumber++;
                partKeys.push({ key, number: num, sectionIndex: sIdx });
                orderedKeys.push({ key, partIndex: pIdx, number: num });
              }
              continue;
            }
          }

          if (secType === 'word-form' && Array.isArray(q?.sentences)) {
            for (let sentIdx = 0; sentIdx < q.sentences.length; sentIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${sentIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'people-matching' && Array.isArray(q?.people)) {
            for (let personIdx = 0; personIdx < q.people.length; personIdx++) {
              const person = q.people[personIdx];
              const personId = person?.id || String.fromCharCode(65 + personIdx);
              const key = `${pIdx}-${sIdx}-${qIdx}-${personId}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'gap-match' && Array.isArray(q?.leftItems)) {
            for (let itemIdx = 0; itemIdx < q.leftItems.length; itemIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${itemIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          // draw-lines (MOVERS Part 1): expand into per-name sub-keys (skip idx 0 = example)
          if ((q.questionType === 'draw-lines' || (q.anchors && Object.keys(q.anchors || {}).length > 0)) && Array.isArray(q.leftItems) && q.leftItems.length > 1) {
            let expanded = 0;
            for (let nameIdx = 1; nameIdx < q.leftItems.length; nameIdx++) {
              if (String(q.leftItems[nameIdx] || '').trim()) {
                const subKey = `${pIdx}-${sIdx}-${qIdx}-${nameIdx}`;
                const subNum = globalNumber++;
                partKeys.push({ key: subKey, number: subNum, sectionIndex: sIdx });
                orderedKeys.push({ key: subKey, partIndex: pIdx, number: subNum });
                expanded++;
              }
            }
            if (expanded > 0) continue;
          }

          // letter-matching (MOVERS Part 3): expand into per-person sub-keys (skip idx 0 = example)
          if ((q.questionType === 'letter-matching' || secType === 'letter-matching') && Array.isArray(q.people)) {
            let expanded = 0;
            for (let pi = 1; pi < q.people.length; pi++) {
              if (String(q.people[pi]?.name || '').trim()) {
                const subKey = `${pIdx}-${sIdx}-${qIdx}-${pi}`;
                const subNum = globalNumber++;
                partKeys.push({ key: subKey, number: subNum, sectionIndex: sIdx });
                orderedKeys.push({ key: subKey, partIndex: pIdx, number: subNum });
                expanded++;
              }
            }
            if (expanded > 0) continue;
          }

          const key = `${pIdx}-${sIdx}-${qIdx}`;
          const num = globalNumber++;
          const hiddenLabel = secType === 'colour-write';
          partKeys.push({ key, number: num, sectionIndex: sIdx, hiddenLabel });
          orderedKeys.push({ key, partIndex: pIdx, number: num, hiddenLabel });
        }
      }

      const partCount = (part?.sections || []).reduce((sum, sec) => sum + getQuestionCountForSection(sec), 0);
      const end = partCount > 0 ? start + partCount - 1 : globalNumber - 1;
      byPart.push({ partIndex: pIdx, start, end, keys: partKeys });
    }

    return { byPart, orderedKeys };
  }, [test]);

  // Init active question to first question
  useEffect(() => {
    if (!test) return;
    const first = questionIndex?.orderedKeys?.[0]?.key;
    if (first && !activeQuestion) {
      setCurrentPartIndex(questionIndex.orderedKeys[0].partIndex);
      setExpandedPart(questionIndex.orderedKeys[0].partIndex);
      setActiveQuestion(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, questionIndex]);

  // Scroll to active question when changed
  useEffect(() => {
    if (!activeQuestion) return;
    const el = questionRefs.current?.[activeQuestion];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeQuestion]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !test) return;
    if (hasAnyAudio && !testStarted && !Number.isFinite(endTimeRef.current)) return;

    if (!Number.isFinite(endTimeRef.current)) {
      syncTimingState(Date.now() + timeRemaining * 1000, timeRemaining);
    }

    const tick = () => {
      const expiresAtMs = endTimeRef.current;
      if (!Number.isFinite(expiresAtMs)) return;

      const remaining = getRemainingSeconds(expiresAtMs);
      const nextGraceRemaining = getGraceRemainingSeconds(expiresAtMs);
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
  }, [test, submitted, testStarted, hasAnyAudio, timeRemaining, syncTimingState]);

  useEffect(() => {
    if (!test) return;
    const payload = {
      answers,
      currentPartIndex,
      activeQuestion,
      startedAudioByPart,
      testStarted,
      endTime: endTimeRef.current,
      audioCurrentTime: lastAudioTimeRef.current,
      submissionId: submissionIdRef.current,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [answers, currentPartIndex, activeQuestion, startedAudioByPart, testStarted, storageKey, test]);

  useEffect(() => {
    if (!test || submitted) return;
    if (!testStarted && !endTimeRef.current && Object.keys(answers || {}).length === 0) {
      return;
    }

    const user = getStoredUser();
    if (
      !placementContext.placementAttemptItemToken &&
      !user?.id &&
      !submissionIdRef.current
    ) {
      return;
    }

    const persistDraft = async () => {
      try {
        const payload = {
          submissionId: submissionIdRef.current,
          placementAttemptItemToken:
            placementContext.placementAttemptItemToken || undefined,
          testId: id,
          testType: test?.testType || testType || "ket-listening",
          answers,
          expiresAt: endTimeRef.current,
          user,
          progressMeta: {
            currentPartIndex,
            activeQuestion,
            startedAudioByPart,
            testStarted,
            endTime: endTimeRef.current,
            audioCurrentTime: lastAudioTimeRef.current,
            hasResumeAudio,
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
          try {
            const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...(raw || {}),
                submissionId: json.submissionId,
              })
            );
          } catch {
            // ignore local mirror errors
          }
        }
        const nextExpiresAt = json?.timing?.expiresAt || json?.expiresAt;
        if (nextExpiresAt) {
          announceExtension(nextExpiresAt, endTimeRef.current);
          syncTimingState(nextExpiresAt);
        }
      } catch (_err) {
        // Keep local progress if the network is unavailable.
      }
    };

    const debounceId = setTimeout(persistDraft, 700);
    const intervalId = setInterval(persistDraft, SERVER_AUTOSAVE_INTERVAL_MS);
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
    activeQuestion,
    answers,
    currentPartIndex,
    hasResumeAudio,
    id,
    startedAudioByPart,
    storageKey,
    submitted,
    test,
    testStarted,
    test?.testType,
    testType,
    announceExtension,
    syncTimingState,
  ]);

  const reconcileServerTiming = useCallback(async () => {
    if (!testStarted || submitted) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const localUser = getStoredUser();
    const query = placementContext.placementAttemptItemToken
      ? `?placementAttemptItemToken=${encodeURIComponent(
          placementContext.placementAttemptItemToken
        )}`
      : submissionIdRef.current
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
      const currentExpiresAtMs = toTimestamp(endTimeRef.current);

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
  }, [announceExtension, id, submitted, syncTimingState, test?.testType, testStarted]);

  useEffect(() => {
    if (!testStarted || submitted || !test?.testType) return;

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
  }, [reconcileServerTiming, submitted, test?.testType, testStarted]);

  const currentPart = useMemo(() => {
    return test?.parts?.[currentPartIndex] || null;
  }, [test, currentPartIndex]);

  const isSinglePanelPart = useMemo(() => {
    const isPetListening = String(testType || '').toLowerCase().includes('pet');
    if (currentPartIndex === 0) return true;
    if (isPetListening && currentPartIndex === 1) return true;
    if (currentPartIndex >= 2 && currentPartIndex <= 4) {
      // Part 3 letter-matching → 2-panel layout với divider
      if (currentPartIndex === 2) {
        const secs = currentPart?.sections || [];
        const hasLetterMatching = secs.some(
          (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
        );
        if (hasLetterMatching) return false;
      }
      return true;
    }
    const sections = currentPart?.sections || [];
    return sections.some((section) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      return sectionType === 'cloze-test';
    });
  }, [currentPartIndex, currentPart, testType]);

  const currentAudioUrl = useMemo(() => {
    return test?.mainAudioUrl || currentPart?.audioUrl || globalAudioUrl || '';
  }, [test?.mainAudioUrl, currentPart, globalAudioUrl]);

  const resolveAudioSrc = useCallback((url) => {
    if (!url) return '';
    const s = String(url).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return hostPath(s);
    return hostPath(`/${s}`);
  }, []);

  const resolvedAudioSrc = useMemo(() => {
    return resolveAudioSrc(currentAudioUrl);
  }, [currentAudioUrl, resolveAudioSrc]);

  const usesSharedAudio = useMemo(() => {
    return Boolean(audioMeta.isSingleFile && resolvedAudioSrc);
  }, [audioMeta.isSingleFile, resolvedAudioSrc]);

  useEffect(() => {
    setAudioError(null);

    const audio = audioRef.current;
    if (!audio) return;

    const prevSrc = lastAudioSrcRef.current;
    const nextSrc = resolvedAudioSrc;
    if (audioMeta.isSingleFile && prevSrc && prevSrc === nextSrc) {
      const seededTime = Math.max(
        Number(audio.currentTime || 0),
        Number(lastAudioTimeRef.current || 0),
        Number(sharedAudioMaxPlayedTimeRef.current || 0)
      );
      sharedAudioMaxPlayedTimeRef.current = seededTime;
      maxPlayedTimeByPartRef.current = {
        ...(maxPlayedTimeByPartRef.current || {}),
        [currentPartIndex]: Math.max(
          Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0),
          seededTime
        ),
      };
      return;
    }
    lastAudioSrcRef.current = nextSrc;

    // When switching parts/audio, reset playback bookkeeping without the pause-handler forcing replay.
    switchingAudioSrcRef.current = true;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: 0,
    };
    if (audioMeta.isSingleFile) {
      sharedAudioMaxPlayedTimeRef.current = 0;
    }

    const t = setTimeout(() => {
      switchingAudioSrcRef.current = false;
    }, 0);

    return () => clearTimeout(t);
  }, [resolvedAudioSrc, currentPartIndex, audioMeta.isSingleFile]);

  useEffect(() => {
    if (!audioMeta.isSingleFile) return;
    const audio = audioRef.current;
    if (!audio) return;
    const currentTime = Math.max(
      Number(audio.currentTime || 0),
      Number(lastAudioTimeRef.current || 0),
      Number(sharedAudioMaxPlayedTimeRef.current || 0)
    );
    sharedAudioMaxPlayedTimeRef.current = currentTime;
    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: Math.max(
        Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0),
        currentTime
      ),
    };
  }, [currentPartIndex, audioMeta.isSingleFile]);


  useEffect(() => {
    if (!usesSharedAudio || !testStarted) return;

    setStartedAudioByPart((prev) => {
      if (prev?.[currentPartIndex]) return prev;
      return { ...(prev || {}), [currentPartIndex]: true };
    });

    const audio = audioRef.current;
    if (!audio) return;

    const syncedTime = Math.max(
      Number(audio.currentTime || 0),
      Number(lastAudioTimeRef.current || 0),
      Number(sharedAudioMaxPlayedTimeRef.current || 0)
    );

    sharedAudioMaxPlayedTimeRef.current = syncedTime;
    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: Math.max(
        Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0),
        syncedTime
      ),
    };

    if (audio.ended || !audio.paused) return;

    const resumePlayback = () => {
      audio.play().catch(() => {
        // ignore autoplay/resume failures; start gate remains the fallback path
      });
    };

    if (audio.readyState >= 2) {
      resumePlayback();
      return;
    }

    const handleCanPlay = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      resumePlayback();
    };

    audio.addEventListener('canplay', handleCanPlay);
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentPartIndex, testStarted, usesSharedAudio]);
  const isStartGateVisible = useMemo(() => {
    if (submitted) return false;
    if (!resolvedAudioSrc) return false;
    const isStarted = audioMeta.isSingleFile
      ? testStarted
      : Boolean(startedAudioByPart?.[currentPartIndex]);
    if (!isStarted) return true;
    if (audioEnded) return false;
    if (!isAudioPlaying && hasResumeAudio) return true;
    return false;
  }, [submitted, resolvedAudioSrc, startedAudioByPart, currentPartIndex, audioMeta.isSingleFile, testStarted, isAudioPlaying, hasResumeAudio, audioEnded]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const showGlobalAudioBar = useMemo(() => {
    return usesSharedAudio;
  }, [usesSharedAudio]);

  const markPartAudioStarted = useCallback((partIndex) => {
    setStartedAudioByPart((prev) => {
      if (prev?.[partIndex]) return prev;
      return { ...(prev || {}), [partIndex]: true };
    });
    setTestStarted(true);
    setAudioEnded(false);
    setHasResumeAudio(false);
    autoSubmittingRef.current = false;
    if (!Number.isFinite(endTimeRef.current)) {
      syncTimingState(Date.now() + timeRemaining * 1000, timeRemaining);
    }
  }, [syncTimingState, timeRemaining]);

  const handlePlayGate = useCallback(async () => {
    const audio =
      audioRef.current ||
      (typeof document !== 'undefined'
        ? document.querySelector('audio[data-listening-audio="true"]')
        : null);
    if (!audio) {
      setAudioError('Audio element is not ready yet. Please refresh and try again.');
      return;
    }
    if (!resolvedAudioSrc) {
      setAudioError('Audio source is missing.');
      return;
    }
    try {
      const resumeAt = lastAudioTimeRef.current;

      // Ensure the element picks up the current src before attempting to play.
      audio.load?.();

      const playAfterReady = async () => {
        if (resumeAt > 0 && Number.isFinite(resumeAt)) {
          try {
            audio.currentTime = resumeAt;
          } catch {
            // ignore
          }
        }
        await audio.play();
      };

      if (audio.readyState < 1) {
        const onMeta = () => {
          audio.removeEventListener('loadedmetadata', onMeta);
          playAfterReady().catch((e) => {
            throw e;
          });
        };
        audio.addEventListener('loadedmetadata', onMeta);
      } else {
        await playAfterReady();
      }
      markPartAudioStarted(currentPartIndex);
      setTimeout(() => {
        if (audio.paused) {
          setAudioError('Audio did not start. Please check the audio file or try another browser.');
        }
      }, 300);
    } catch (e) {
      console.error('Audio play failed:', e);
      setAudioError(
        e?.name === 'NotSupportedError'
          ? 'Audio file is not supported or the source URL is invalid.'
          : 'Unable to play audio. Please check your connection or try another browser.'
      );
    }
  }, [currentPartIndex, markPartAudioStarted, resolvedAudioSrc]);

  const handleAudioPlay = useCallback(() => {
    markPartAudioStarted(currentPartIndex);
    setIsAudioPlaying(true);
    setAudioEnded(false);
  }, [currentPartIndex, markPartAudioStarted]);

  const handleAudioEnded = useCallback(() => {
    setIsAudioPlaying(false);
    setAudioEnded(true);
  }, []);

  const handleAudioPause = useCallback(() => {
    if (switchingAudioSrcRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    if (audio.ended) return;
    audio.play().catch(() => {
      // ignore
    });
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    const t = Number(audio.currentTime || 0);
    lastAudioTimeRef.current = t;
    if (audioMeta.isSingleFile) {
      sharedAudioMaxPlayedTimeRef.current = Math.max(
        Number(sharedAudioMaxPlayedTimeRef.current || 0),
        t
      );
    }
    const now = Date.now();
    if (now - lastAudioSaveRef.current > 1000) {
      lastAudioSaveRef.current = now;
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...(saved || {}),
            audioCurrentTime: t,
            updatedAt: now,
          })
        );
      } catch {
        // ignore
      }
    }
    const allowedProgress = audioMeta.isSingleFile
      ? Math.max(Number(sharedAudioMaxPlayedTimeRef.current || 0), t)
      : t;
    const prevMax = Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    if (allowedProgress > prevMax) {
      maxPlayedTimeByPartRef.current = {
        ...(maxPlayedTimeByPartRef.current || {}),
        [currentPartIndex]: allowedProgress,
      };
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted, storageKey]);

  const handleAudioSeeking = useCallback(() => {
    if (ignoreSeekRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;

    const max = audioMeta.isSingleFile
      ? Math.max(
          Number(sharedAudioMaxPlayedTimeRef.current || 0),
          Number(lastAudioTimeRef.current || 0),
          Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0)
        )
      : Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    const t = Number(audio.currentTime || 0);
    // Block any seeking (rewind or fast-forward). Cambridge flow: no pause/rewind;
    // we also prevent skipping ahead via keyboard/media controls.
    if (Math.abs(t - max) > 0.25) {
      ignoreSeekRef.current = true;
      audio.currentTime = max;
      setTimeout(() => {
        ignoreSeekRef.current = false;
      }, 0);
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  // Format time display
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

  const resolveImgSrc = useCallback((url) => {
    if (!url) return "";
    let s = String(url).trim();
    // Normalize common storage formats
    s = s.replace(/\\/g, '/');
    s = s.replace(/^\.\//, '');
    s = s.replace(/^(\.\.\/)+/, '');

    const normalizePathSegments = (path) => {
      const rawParts = String(path || '').split('/').filter(Boolean);
      const out = [];
      const dedupeWhitelist = new Set(['cambridge', 'upload', 'uploads']);
      for (const part of rawParts) {
        const prev = out[out.length - 1];
        if (prev && prev === part && dedupeWhitelist.has(part)) continue;
        out.push(part);
      }
      return `/${out.join('/')}`;
    };

    const rewriteKnownUploadPaths = (path) => {
      let p = String(path || '');
      // Backend serves static assets from /uploads (see backend/server.js).
      // Some older/stored data may reference /upload; normalize to /uploads.
      p = p.replace(/^\/upload\//i, '/uploads/');
      p = p.replace(/^\/upload$/i, '/uploads');
      return p;
    };

    const normalizeUrlLike = (value) => {
      const str = String(value || '');
      const [baseAndPath, hash = ''] = str.split('#');
      const [base, query = ''] = baseAndPath.split('?');

      // Absolute URL: normalize pathname only.
      if (/^https?:\/\//i.test(base)) {
        try {
          const u = new URL(str);
          u.pathname = rewriteKnownUploadPaths(normalizePathSegments(u.pathname));
          return u.toString();
        } catch {
          // fall through
        }
      }

      const normalizedPath = rewriteKnownUploadPaths(normalizePathSegments(base));
      return `${normalizedPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
    };

    if (/^data:/i.test(s)) return s;
    if (/^blob:/i.test(s)) return s;

    s = normalizeUrlLike(s);

    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return hostPath(s);
    return hostPath(`/${s}`);
  }, []);

  const sanitizeBasicHtml = useCallback((html) => {
    const s = String(html || "");
    return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }, []);

  const renderMaybeHtml = useCallback(
    (value) => {
      const s = String(value || "");
      if (!s) return null;
      if (s.includes("<") && s.includes(">")) {
        return <div dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(s) }} />;
      }
      return <div>{s}</div>;
    },
    [sanitizeBasicHtml]
  );

  const renderOpenClozeSection = (section, secIdx, sectionStartNum) => (
    <OpenClozeSectionDisplay
      section={section}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      currentPartIndex={currentPartIndex}
      answers={answers}
      submitted={submitted}
      isDarkMode={isDarkMode}
      flaggedQuestions={flaggedQuestions}
      toggleFlag={toggleFlag}
      handleAnswerChange={handleAnswerChange}
    />
  );
  const renderGapMatchSection = (section, secIdx, sectionStartNum) => (
    <GapMatchSectionDisplay
      section={section}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      currentPartIndex={currentPartIndex}
      answers={answers}
      setAnswers={setAnswers}
      submitted={submitted}
      isDarkMode={isDarkMode}
      flaggedQuestions={flaggedQuestions}
      toggleFlag={toggleFlag}
      questionRefs={questionRefs}
      activeQuestion={activeQuestion}
      styles={styles}
    />
  );

  const renderFillExample = (section, sectionStartNum) => {
    const exampleItem = section?.exampleItem;
    const exampleText = String(exampleItem?.questionText || "").trim();
    const exampleAnswer = String(exampleItem?.correctAnswer || "").trim();
    if (!exampleText && !exampleAnswer) return null;

    return (
      <div
        style={{
          background: isDarkMode ? '#0f172a' : '#f8fafc',
          border: `2px dashed ${isDarkMode ? '#334155' : '#94a3b8'}`,
          borderRadius: '16px',
          padding: '14px 20px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '36px', height: '36px', borderRadius: '50%',
            background: isDarkMode ? '#1e293b' : '#e2e8f0',
            color: isDarkMode ? '#94a3b8' : '#475569',
            fontWeight: 800, fontSize: '13px', flexShrink: 0,
          }}>Ex</span>
          <div style={{
            fontSize: '20px', lineHeight: 1.5, fontWeight: 600,
            color: isDarkMode ? '#94a3b8' : '#64748b', paddingTop: '4px',
          }}>
            {exampleText || `Example before question ${sectionStartNum}`}
            <span style={{ marginLeft: '8px', fontSize: '13px', opacity: 0.6, fontWeight: 400 }}>(example)</span>
          </div>
        </div>
        {/* Ô đáp án mẫu — đọc only, màu xanh */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '18px', pointerEvents: 'none', opacity: 0.45,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><InlineIcon name="writing" size={16} /></span>
          <input
            type="text"
            value={exampleAnswer}
            readOnly
            disabled
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 44px',
              border: `2.5px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
              borderRadius: '12px',
              fontSize: '20px', fontWeight: 700,
              background: isDarkMode ? '#1e3a5f' : '#eff6ff',
              color: isDarkMode ? '#e5e7eb' : '#1d4ed8',
              outline: 'none',
            }}
          />
        </div>
      </div>
    );
  };

  // ── MOVERS Part 3: Letter Matching renderer ──────────────────────────────
  // ── Letter Matching drop handler (shared by left panel people rows) ──────
  const handleLetterMatchingDrop = (e, targetKey, questionPeople, secIdx) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.background = '';
    if (submitted) return;
    const letter = e.dataTransfer.getData('text/plain');
    if (!letter) return;
    setAnswers((prev) => {
      const next = { ...prev };
      questionPeople.forEach((_, pi) => {
        const k = `${currentPartIndex}-${secIdx}-0-${pi + 1}`;
        if (next[k] === letter) next[k] = '';
      });
      next[targetKey] = letter;
      return next;
    });
  };

  // ── MOVERS Part 3: Full single-panel Letter Matching (people + tiles) ────
  const renderLetterMatchingSectionFull = (section, secIdx, sectionStartNum) => {
    return (
      <LetterMatchingStudentSection
        section={section}
        secIdx={secIdx}
        sectionStartNum={sectionStartNum}
        answers={answers}
        submitted={submitted}
        results={results}
        isDarkMode={isDarkMode}
        handleAnswerChange={handleAnswerChange}
        currentPartIndex={currentPartIndex}
        questionRefs={questionRefs}
        resolveImgSrc={resolveImgSrc}
        activeQuestion={activeQuestion}
      />
    );
  };

  const renderLetterMatchingSection = (section, secIdx) => {
    const q = section.questions?.[0];
    if (!q) return null;
    const qIdx = 0;
    const options = Array.isArray(q.options) ? q.options : [];
    const people = Array.isArray(q.people) ? q.people : [];
    const questionPeople = people.slice(1).filter((p) => String(p?.name || '').trim());
    const exampleLetter = people[0]?.correctAnswer;

    const placedLetters = new Set(
      questionPeople
        .map((_, i) => answers[`${currentPartIndex}-${secIdx}-${qIdx}-${i + 1}`])
        .filter(Boolean)
    );

    const handleDragStart = (e, letter) => {
      e.dataTransfer.setData('text/plain', letter);
      e.dataTransfer.effectAllowed = 'move';
    };

    return (
      <div>
        {/* Instruction */}
        <div style={{
          textAlign: 'center', paddingBottom: '16px',
          fontSize: '15px', fontWeight: 800,
          color: isDarkMode ? '#a5b4fc' : '#7c3aed',
          letterSpacing: '0.04em',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><InlineIcon name="matching" size={16} />Kéo hình → ô bên trái</span>
        </div>

        {/* Draggable option tiles 2 columns – letter badge LEFT, image fills rest */}
        {options.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {options.map((opt, tileIdx) => {
              const isPlaced = placedLetters.has(opt.letter);
              const isExample = opt.letter === exampleLetter;
              return (
                <div
                  key={opt.letter}
                  draggable={!submitted && !isExample}
                  onDragStart={(e) => !isExample && handleDragStart(e, opt.letter)}
                  className={`lm-tile${(isPlaced || isExample) ? '' : ' lm-tile-idle'}`}
                  style={{
                    '--tile-delay': `${tileIdx * 60}ms`,
                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    border: `3px solid ${isExample
                      ? (isDarkMode ? '#475569' : '#94a3b8')
                      : isPlaced
                        ? (isDarkMode ? '#312e81' : '#bfdbfe')
                        : (isDarkMode ? '#4f46e5' : '#a5b4fc')}`,
                    borderRadius: '16px',
                    background: isExample
                      ? (isDarkMode ? '#0f172a' : '#f8fafc')
                      : isPlaced
                        ? (isDarkMode ? '#0f172a' : '#eff6ff')
                        : (isDarkMode ? '#1e1b4b' : '#f5f3ff'),
                    opacity: (isPlaced || isExample) ? 0.45 : 1,
                    cursor: (submitted || isExample) ? 'default' : 'grab',
                    position: 'relative',
                    transition: 'opacity 0.25s, border-color 0.2s, transform 0.15s, box-shadow 0.2s',
                    userSelect: 'none', WebkitUserSelect: 'none',
                    boxShadow: isPlaced ? 'none' : `0 3px 12px ${isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.22)'}`,
                  }}
                >
                  {/* Letter badge – left side */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: isExample ? '#94a3b8' : isPlaced ? '#64748b' : '#4f46e5',
                    color: '#fff', fontWeight: 900, fontSize: '20px',
                    boxShadow: (isPlaced || isExample) ? 'none' : '0 2px 6px rgba(79,70,229,0.45)',
                  }}>
                    {opt.letter}
                  </div>
                  {/* Activity image – right side, fills remaining space */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {opt.imageUrl ? (
                      <img
                        src={resolveImgSrc(opt.imageUrl)}
                        alt={opt.letter}
                        draggable={false}
                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', pointerEvents: 'none', display: 'block' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        height: '150px', width: '100%', borderRadius: '10px',
                        background: isDarkMode ? '#1e1b4b' : '#ede9fe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isDarkMode ? '#a5b4fc' : '#7c3aed', fontSize: '14px', fontWeight: 700,
                      }}>
                        {opt.description || opt.letter}
                      </div>
                    )}
                    {opt.description && opt.imageUrl && (
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '5px', pointerEvents: 'none', fontWeight: 600, textAlign: 'center' }}>
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {/* "Ex" badge overlay for example tile */}
                  {isExample && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      background: '#64748b', color: '#fff',
                      fontSize: '11px', fontWeight: 900,
                      padding: '2px 7px', borderRadius: '20px',
                      border: '2px solid #fff',
                      pointerEvents: 'none',
                    }}>Ex</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Part 4: "Listen and tick the box" – image multiple choice ────────
  const renderImageTickSection = (section, secIdx, sectionStartNum) => (
    <ImageTickSlideSection
      questions={Array.isArray(section.questions) ? section.questions : []}
      exampleItem={section.exampleItem || null}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      answers={answers}
      submitted={submitted}
      results={results}
      isDarkMode={isDarkMode}
      handleAnswerChange={handleAnswerChange}
      currentPartIndex={currentPartIndex}
      questionRefs={questionRefs}
      resolveImgSrc={resolveImgSrc}
      activeQuestion={activeQuestion}
      onSlideChange={(qi) => setActiveQuestion(`${currentPartIndex}-${secIdx}-${qi}`)}
    />
  );

  // ── Part 5: Colour and Write (rendered by ColourWriteStudentSection above) ──
  const renderColourWriteSection = (section, secIdx, sectionStartNum) => (
    <ColourWriteStudentSection
      questions={Array.isArray(section.questions) ? section.questions : []}
      exampleItem={section.exampleItem || null}
      sceneImageUrl={section.sceneImageUrl ? resolveImgSrc(section.sceneImageUrl) : ''}
      decoyPositions={Array.isArray(section.decoyPositions) ? section.decoyPositions : []}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      answers={answers}
      submitted={submitted}
      results={results}
      isDarkMode={isDarkMode}
      handleAnswerChange={handleAnswerChange}
      currentPartIndex={currentPartIndex}
      questionRefs={questionRefs}
    />
  );

  // Handle checkbox change for multi-select
  /* eslint-disable-next-line no-unused-vars */
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

  const toggleFlag = useCallback((questionKey) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionKey)) next.delete(questionKey);
      else next.add(questionKey);
      return next;
    });
  }, []);

  // Divider resize handlers (match Reading UI)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 20% and 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Part 3 letter-matching: 50/50 split mặc định
  useEffect(() => {
    if (!isSinglePanelPart && currentPartIndex === 2) {
      setLeftWidth(50);
    }
  }, [currentPartIndex, isSinglePanelPart]);

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

  const currentKeyIndex = useMemo(() => {
    const list = questionIndex?.orderedKeys || [];
    if (!activeQuestion) return 0;
    const idx = list.findIndex((it) => it.key === activeQuestion);
    return idx >= 0 ? idx : 0;
  }, [questionIndex, activeQuestion]);

  const totalQuestions = useMemo(() => {
    return questionIndex?.orderedKeys?.length || 0;
  }, [questionIndex]);

  const answeredCount = useMemo(() => {
    const list = questionIndex?.orderedKeys || [];
    const isAnswered = (val) => {
      if (Array.isArray(val)) return val.length > 0;
      if (val && typeof val === 'object') return Object.keys(val).length > 0;
      return String(val ?? '').trim() !== '';
    };
    return list.reduce((acc, item) => {
      if (isAnswered(answers[item.key])) return acc + 1;
      // draw-lines sub-answers are stored as `key-nameIdx`; count the block as answered if any sub-answer exists
      const hasSubAnswer = Object.keys(answers).some(
        (k) => k.startsWith(`${item.key}-`) && isAnswered(answers[k])
      );
      return hasSubAnswer ? acc + 1 : acc;
    }, 0);
  }, [questionIndex, answers]);

  const goToKeyIndex = useCallback(
    (idx) => {
      const list = questionIndex?.orderedKeys || [];
      if (idx < 0 || idx >= list.length) return;
      const next = list[idx];
      setCurrentPartIndex(next.partIndex);
      setExpandedPart(next.partIndex);
      setActiveQuestion(next.key);

      // Focus the matching blank/input if it exists (Open Cloze and similar).
      if (next?.number) {
        setTimeout(() => {
          const el = document.getElementById(`question-${next.number}`);
          if (el && typeof el.focus === 'function') {
            el.focus({ preventScroll: true });
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 0);
      }
    },
    [questionIndex]
  );

  // Confirm and submit
  const confirmSubmit = async () => {
    try {
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const initialTime = (testConfig.duration || 30) * 60;
      const timeSpent = initialTime - timeRemaining;

      const res = await fetch(apiPath(`cambridge/listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          submissionId: submissionIdRef.current,
          placementAttemptItemToken:
            placementContext.placementAttemptItemToken || undefined,
          answers,
          studentName: user.name || user.username || 'Unknown',
          studentPhone: user.phone || null,
          studentEmail: user.email || null,
          classCode: test?.classCode || null,
          userId: user.id || null,
          timeRemaining,
          timeSpent
        }),
      });

      if (!res.ok) throw new Error("Failed to submit the test");

      const data = await res.json();

      endTimeRef.current = null;
      submissionIdRef.current = null;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      if (isPlacementRuntime && placementContext.placementAttemptToken) {
        navigate(buildPlacementAttemptPath(placementContext.placementAttemptToken), {
          replace: true,
        });
      } else {
        // Navigate to result page with submission data
        navigate(`/cambridge/result/${data.submissionId}`, {
          state: {
            submission: {
              ...data,
              testTitle: test?.title,
              testType: testType,
              timeSpent,
              classCode: test?.classCode,
              submittedAt: new Date().toISOString()
            },
            test
          }
        });
      }
    } catch (err) {
      console.error("Error submitting:", err);
      if (isPlacementRuntime) {
        setShowConfirm(false);
        alert("Could not submit this placement test. Please try again.");
      } else {
        // For now, calculate locally if backend not ready
        const localResults = calculateLocalResults();
        setResults(localResults);
        setSubmitted(true);
        setShowConfirm(false);
        endTimeRef.current = null;
        submissionIdRef.current = null;
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    }
  };

  useEffect(() => {
    confirmSubmitRef.current = confirmSubmit;
  }, [confirmSubmit]);

  // Calculate results locally (fallback)
  const calculateLocalResults = () => {
    let correct = 0;
    let total = 0;

    test?.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        const q0 = section?.questions?.[0] || {};
        const sectionType =
          section?.questionType ||
          q0?.questionType ||
          q0?.type ||
          (Array.isArray(q0?.people) ? 'people-matching' : '') ||
          (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
          (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
          '';
        section.questions?.forEach((q, qIdx) => {
          if (sectionType === 'gap-match' && Array.isArray(q?.leftItems)) {
            q.leftItems.forEach((_, itemIdx) => {
              total++;
              const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
              const userAnswer = answers[key];
              const correctAnswer = Array.isArray(q?.correctAnswers) ? q.correctAnswers[itemIdx] : undefined;
              if (correctAnswer && String(userAnswer || '').trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
                correct++;
              }
            });
            return;
          }

          total++;
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];

          if (q.correctAnswer) {
            if (typeof q.correctAnswer === 'string') {
              if (userAnswer?.toLowerCase?.() === q.correctAnswer.toLowerCase()) {
                correct++;
              }
            } else if (userAnswer === q.correctAnswer) {
              correct++;
            }
          }
        });
      });
    });

    return {
      score: correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  // Calculate question number range for a part
  const getPartQuestionRange = useCallback((partIndex) => {
    const range = questionIndex?.byPart?.[partIndex];
    if (range && typeof range.start === 'number' && typeof range.end === 'number') {
      return { start: range.start, end: range.end };
    }

    if (!test?.parts) return { start: 1, end: 1 };

    let startNum = 1;
    for (let p = 0; p < partIndex; p++) {
      const part = test.parts[p];
      for (const sec of part?.sections || []) {
        startNum += sec.questions?.length || 0;
      }
    }

    let count = 0;
    for (const sec of test.parts[partIndex]?.sections || []) {
      count += sec.questions?.length || 0;
    }

    return { start: startNum, end: startNum + count - 1 };
  }, [questionIndex, test?.parts]);

  // Render question based on type
  const renderQuestion = (question, questionKey, questionNum) => (
    <CambridgeQuestionDisplay
      question={question}
      questionKey={questionKey}
      questionNum={questionNum}
      answers={answers}
      submitted={submitted}
      results={results}
      activeQuestion={activeQuestion}
      styles={styles}
      handleAnswerChange={handleAnswerChange}
      toggleFlag={toggleFlag}
      flaggedQuestions={flaggedQuestions}
      isDarkMode={isDarkMode}
      currentPart={currentPart}
      questionRefs={questionRefs}
      resolveImgSrc={resolveImgSrc}
      DrawLinesComponent={DrawLinesQuestion}
    />
  );
  const renderCompactQuestion = (question, questionKey, questionNum) => (
    <CompactCambridgeQuestionDisplay
      question={question}
      questionKey={questionKey}
      questionNum={questionNum}
      answers={answers}
      submitted={submitted}
      results={results}
      activeQuestion={activeQuestion}
      styles={styles}
      handleAnswerChange={handleAnswerChange}
      questionRefs={questionRefs}
      isDarkMode={isDarkMode}
    />
  );
  // Loading state
  if (loading) {
    return (
      <div className="cambridge-loading">
        <div style={{ marginBottom: '20px' }}><InlineIcon name="loading" size={42} style={{ color: '#475569' }} /></div>
        <h2>Đang tải đề thi...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cambridge-error">
        <div style={{ marginBottom: '20px' }}><InlineIcon name="error" size={42} style={{ color: '#dc2626' }} /></div>
        <h2>Lỗi: {error}</h2>
        <button onClick={() => navigate(-1)} className="cambridge-nav-button">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="cambridge-test-container">
      <ExtensionToast message={extensionToast} />
      {/* Header */}
      <TestHeader
        title={testConfig.name}
        examType={examType}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={formatTime(timeRemaining)}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        audioStatusText={hasAnyAudio && isAudioPlaying ? 'Audio is playing' : ''}
        onSubmit={handleSubmit}
        submitted={submitted}
        timerWarning={timeRemaining > 0 && timeRemaining <= 300}
        timerCritical={timeRemaining > 0 && timeRemaining <= 60}
      />

      {testStarted && !submitted && timeRemaining === 0 && graceRemaining > 0 && (
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

      {/* Hidden shared audio element for any test that uses a single file across all parts. */}
      {usesSharedAudio && (
        <audio
          ref={audioRef}
          data-listening-audio="true"
          src={resolvedAudioSrc}
          preload="auto"
          controls={false}
          controlsList="nodownload noplaybackrate"
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onTimeUpdate={handleAudioTimeUpdate}
          onSeeking={handleAudioSeeking}
          onEnded={handleAudioEnded}
          onError={(e) => {
            const mediaErr = e?.currentTarget?.error;
            const code = mediaErr?.code;
            setAudioError(
              `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
            );
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            left: -9999,
            top: 0,
          }}
        >
          Your browser does not support audio.
        </audio>
      )}

      {/* Global audio bar (single audio for whole test) */}
      {showGlobalAudioBar && (
        <div
          className="cambridge-global-audio"
          style={{ padding: '6px 16px', background: isDarkMode ? '#111827' : '#f8fafc', borderBottom: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}` }}
        >
          <div style={{ ...styles.audioContainer, padding: '8px 10px', marginBottom: 0, borderRadius: '10px' }}>
            <InlineIcon name="listening" size={14} style={{ marginRight: '8px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }} />
            <div style={{ flex: 1, fontSize: 12.5, color: isDarkMode ? '#e5e7eb' : '#0f172a', lineHeight: 1.3 }}>
              Global audio is ready for this test.
            </div>
            <div
              style={styles.audioTipWrap}
              onMouseEnter={() => setShowAudioTip(true)}
              onMouseLeave={() => setShowAudioTip(false)}
            >
              <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                i
              </button>
              {showAudioTip && (
                <div style={styles.audioTipBubble} role="tooltip">
                  No pause / no rewind
                </div>
              )}
            </div>
          </div>

          {audioError && (
            <div style={styles.audioErrorBox} role="alert">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
              <div style={{ marginBottom: 8 }}>{audioError}</div>
              <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                Open audio in a new tab
              </a>
            </div>
          )}
        </div>
      )}

      {/* Cambridge-style Play gate overlay */}
      {isStartGateVisible && (
        <TestStartModal
          iconName="listening"
          eyebrow={`Cambridge ${examType}`}
          subtitle="Listening Test"
          title={test?.title || testConfig.name || 'Cambridge Listening'}
          stats={[
            { value: Math.round(timeRemaining / 60), label: 'Minutes', tone: 'sky' },
            { value: totalQuestions, label: 'Questions', tone: 'green' },
          ]}
          noticeTitle="Important note"
          noticeContent={
            <>
              Audio starts as soon as you press Play. You <b>cannot pause or rewind</b> during the test.
            </>
          }
          extraContent={audioError ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Audio error</div>
              <div style={{ marginBottom: 6 }}>{audioError}</div>
              <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                Open audio in a new tab
              </a>
            </div>
          ) : null}
          secondaryLabel="Exit"
          onSecondary={() => navigate(-1)}
          primaryLabel={hasResumeAudio ? 'Resume' : 'Play & Start'}
          onPrimary={handlePlayGate}
          darkContent={isDarkMode}
          maxWidth={480}
        />
      )}

      {/* Letter-matching instruction – sits above both panels */}
      {!isSinglePanelPart && currentPart && (() => {
        const isLetterMatchPart = currentPart?.sections?.some(
          (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
        );
        if (!isLetterMatchPart) return null;
        const range = getPartQuestionRange(currentPartIndex);
        const instructionText = String(currentPart.instruction || '');
        const hasQRange = /question(s)?\s*\d+/i.test(instructionText);
        return (
          <div className="cambridge-part-instruction" style={{ padding: '10px 20px', flexShrink: 0 }}>
            {!hasQRange && <strong>Questions {range.start}–{range.end}</strong>}
            <div style={{ marginTop: hasQRange ? 0 : 4 }}>
              {renderMaybeHtml(instructionText || 'For each question, choose the correct answer.')}
            </div>
          </div>
        );
      })()}

      {/* Main Content */}
      <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
        {isSinglePanelPart ? (
          // Part 1: single panel (teacher request)
          <div className="cambridge-questions-column" style={{ width: '100%' }}>
            <div className="cambridge-content-wrapper">
              {currentPart && (
                <>
                  {(() => {
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <div className="cambridge-part-instruction" style={{ marginBottom: 14 }}>
                        {!hasQuestionRangeInInstruction && (
                          <strong>Questions {range.start}–{range.end}</strong>
                        )}
                        <div style={{ marginTop: hasQuestionRangeInInstruction ? 0 : 4 }}>
                          {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                        </div>
                      </div>
                    );
                  })()}

                  {resolvedAudioSrc && !usesSharedAudio && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <InlineIcon name="listening" size={18} style={{ marginRight: '12px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }} />
                      <audio
                        ref={audioRef}
                        data-listening-audio="true"
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ flex: 1, width: '100%' }}
                      >
                        Your browser does not support audio.
                      </audio>
                      <div
                        style={styles.audioTipWrap}
                        onMouseEnter={() => setShowAudioTip(true)}
                        onMouseLeave={() => setShowAudioTip(false)}
                      >
                        <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                          i
                        </button>
                        {showAudioTip && (
                          <div style={styles.audioTipBubble} role="tooltip">
                            No pause / no rewind
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolvedAudioSrc && audioError && !usesSharedAudio && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}

                  {/* Part scene image – hidden for draw-lines parts (image is rendered inside DrawLinesQuestion itself) */}
                  {currentPart?.imageUrl && (() => {
                    const q = currentPart?.sections?.[0]?.questions?.[0];
                    if (q?.questionType === 'draw-lines') return false;
                    if (q?.anchors && Object.keys(q.anchors).length > 0) return false;
                    return true;
                  })() && (
                    <div style={{ margin: '12px 0 18px', textAlign: 'center' }}>
                      <img
                        src={resolveImgSrc(currentPart.imageUrl)}
                        alt="Part illustration"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '480px',
                          objectFit: 'contain',
                          borderRadius: '10px',
                          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {currentPart &&
                currentPart.sections?.map((section, secIdx) => {
                  const partRange = getPartQuestionRange(currentPartIndex);
                  const sectionStartNum =
                    questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                    partRange.start;

                  const isGroupedPart = currentPartIndex === 2 || currentPartIndex === 3; // Parts 3-4

                  // Teacher wants Part 1 displayed one question at a time (like the Cambridge player).
                  // We use the global `activeQuestion` key to decide which question to show.
                  const partKeys = questionIndex?.byPart?.[currentPartIndex]?.keys || [];
                  const defaultActiveKey = partKeys?.[0]?.key;
                  const activeKeyForPart =
                    activeQuestion && String(activeQuestion).startsWith(`${currentPartIndex}-`)
                      ? activeQuestion
                      : defaultActiveKey;

                  // Robust section type detection (some legacy data stores type on question instead of section)
                  const q0 = section?.questions?.[0] || {};
                  const rawSectionType =
                    section?.questionType ||
                    q0?.questionType ||
                    q0?.type ||
                    (Array.isArray(q0?.people) ? 'people-matching' : '') ||
                    (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
                    (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
                    '';
                  // Auto-upgrade: MOVERS Listening Part 4 was previously 'fill' – treat as 'image-tick'
                  // Auto-upgrade: MOVERS Listening Part 5 was previously 'fill' – treat as 'colour-write'
                  const sectionType =
                    rawSectionType === 'fill' &&
                    String(testType || '').includes('movers') &&
                    currentPartIndex === 3
                      ? 'image-tick'
                      : rawSectionType === 'fill' &&
                        String(testType || '').includes('movers') &&
                        currentPartIndex === 4
                        ? 'colour-write'
                        : rawSectionType;

                  return (
                    <div key={secIdx} className="cambridge-section">
                      {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}
                      {sectionType === 'fill' && renderFillExample(section, sectionStartNum)}

                      {/* Section-based types (KET Reading style) */}
                      {sectionType === 'long-text-mc' && section.questions?.[0]?.questions ? (
                        (() => {
                          const qIdx = 0;
                          const container = section.questions[0] || {};
                          const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                          const nested = Array.isArray(container.questions) ? container.questions : [];
                          return (
                            <div>
                              {passageHtml ? (
                                <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                  <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                    {renderMaybeHtml(passageHtml)}
                                  </div>
                                </div>
                              ) : null}

                              {nested.map((nq, nestedIdx) => {
                                const key = `${currentPartIndex}-${secIdx}-${qIdx}-${nestedIdx}`;
                                const num = sectionStartNum + nestedIdx;
                                const opts = nq.options || [];
                                const userAnswer = answers[key] || '';
                                const correct = nq.correctAnswer;
                                const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();
                                return (
                                  <div
                                    key={key}
                                    ref={(el) => (questionRefs.current[key] = el)}
                                    className={
                                      `cambridge-question-wrapper ` +
                                      `${userAnswer ? 'answered' : ''} ` +
                                      `${activeQuestion === key ? 'active-question' : ''}`
                                    }
                                  >
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      <InlineIcon name="flag" size={14} />
                                    </button>

                                    <div style={{ paddingRight: '50px' }}>
                                      <div className="cambridge-question-header">
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
                                      </div>

                                      <div style={styles.optionsContainer}>
                                        {opts.map((opt, i) => {
                                          const letter = String.fromCharCode(65 + i);
                                          const isSelected = userAnswer === letter;
                                          const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                          return (
                                            <label
                                              key={letter}
                                              style={{
                                                ...styles.optionLabel,
                                                ...(isSelected && styles.optionSelected),
                                                ...(submitted && isCorrectOption && styles.optionCorrect),
                                                ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={key}
                                                checked={isSelected}
                                                onChange={() => handleAnswerChange(key, letter)}
                                                disabled={submitted}
                                                style={{ marginRight: '10px' }}
                                              />
                                              <span style={styles.optionText}>{opt}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      {submitted && correct && !isCorrect && (
                                        <div style={styles.correctAnswer}><InlineIcon name="correct" size={14} style={{ marginRight: 6 }} />Đáp án đúng: {correct}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : sectionType === 'cloze-mc' && section.questions?.[0]?.clozeText ? (
                        (() => {
                          // fall through to existing renderer below in the 2-panel branch
                          return null;
                        })()
                      ) : sectionType === 'gap-match' ? (
                        renderGapMatchSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'cloze-test' ? (
                        renderOpenClozeSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'letter-matching' ? (
                        renderLetterMatchingSectionFull(section, secIdx, sectionStartNum)
                      ) : sectionType === 'image-tick' ? (
                        renderImageTickSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'colour-write' ? (
                        renderColourWriteSection(section, secIdx, sectionStartNum)
                      ) : isGroupedPart ? (
                        <div
                          className="cambridge-question-wrapper"
                          style={{ padding: '10px 12px' }}
                        >
                          {section.questions?.map((q, qIdx) => {
                            const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;
                            return renderCompactQuestion(q, questionKey, sectionStartNum + qIdx);
                          })}
                        </div>
                      ) : (
                        // Default per-question rendering
                        section.questions?.map((q, qIdx) => {
                          const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;

                          // draw-lines renders all names as one block → always show, never filter by active sub-key
                          const isDrawLinesQ = q.questionType === 'draw-lines' || (q.anchors && Object.keys(q.anchors || {}).length > 0);
                          // Part 1: render only the active question card (except draw-lines which is a single interactive block).
                          if (!isDrawLinesQ && currentPartIndex === 0 && activeKeyForPart && questionKey !== activeKeyForPart) return null;

                          return (
                            <div key={qIdx} ref={(el) => (questionRefs.current[questionKey] = el)}>
                              {renderQuestion(q, questionKey, sectionStartNum + qIdx)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          // Other parts: keep 2-column Cambridge layout
          <>
            {/* Left Column: Audio + Instructions */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              {currentPart && (
                <div className="cambridge-passage-container">
                  {(() => {
                    const isLetterMatchPart = currentPart?.sections?.some(
                      (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
                    );
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <>
                        {!isLetterMatchPart && (
                          <div className="cambridge-part-instruction">
                            {!hasQuestionRangeInInstruction && (
                              <strong>Questions {range.start}–{range.end}</strong>
                            )}
                            <div style={{ marginTop: hasQuestionRangeInInstruction ? 0 : 4 }}>
                              {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                            </div>
                          </div>
                        )}

                        {/* Part illustration image (e.g. MOVERS Part 2 form picture) */}
                        {currentPart.imageUrl && (
                          <div style={{ marginTop: 12 }}>
                            {/* Tiêu đề hiển thị trên ảnh (lưu tại section.imageTitle) */}
                            {(() => {
                              const sec0 = currentPart?.sections?.[0];
                              const title = String(sec0?.imageTitle || '').trim();
                              if (!title) return null;
                              return (
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: 800,
                                  color: isDarkMode ? '#c7d2fe' : '#4338ca',
                                  marginBottom: '10px',
                                  lineHeight: 1.4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  textAlign: 'center',
                                }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    background: isDarkMode ? '#312e81' : '#e0e7ff',
                                    flexShrink: 0,
                                  }}><InlineIcon name="writing" size={15} style={{ color: isDarkMode ? '#c7d2fe' : '#4338ca' }} /></span>
                                  {title}
                                </div>
                              );
                            })()}
                            <img
                              src={resolveImgSrc(currentPart.imageUrl)}
                              alt="Part illustration"
                              draggable={false}
                              style={{
                                width: '80%', borderRadius: '10px',
                                border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                display: 'block',
                              }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* LETTER MATCHING: people + drop zones live in left panel */}
                  {(() => {
                    const sec0 = currentPart?.sections?.find(
                      (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
                    );
                    if (!sec0) return null;
                    const q = sec0.questions?.[0];
                    if (!q) return null;
                    const secIdx = currentPart.sections.indexOf(sec0);
                    const qIdx = 0;
                    const people = Array.isArray(q.people) ? q.people : [];
                    const options = Array.isArray(q.options) ? q.options : [];
                    const examplePerson = people[0];
                    const questionPeople = people.slice(1).filter((p) => String(p?.name || '').trim());
                    const partStart = questionIndex.byPart?.[currentPartIndex]?.start ?? 1;

                    return (
                      <div style={{ marginTop: '14px' }}>
                        {/* Context text */}
                        {q.questionText && (
                          <div style={{
                            fontSize: '15px', color: isDarkMode ? '#a5b4fc' : '#4f46e5',
                            fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5,
                            padding: '10px 14px',
                            background: isDarkMode ? '#1e1b4b' : '#f5f3ff',
                            borderRadius: '12px',
                            border: `2px solid ${isDarkMode ? '#4f46e5' : '#c4b5fd'}`,
                            fontWeight: 600,
                          }}>
                            {q.questionText}
                          </div>
                        )}

                        {/* Example row */}
                        {examplePerson && String(examplePerson.name || '').trim() && (() => {
                          const exOpt = options.find((o) => o.letter === examplePerson.correctAnswer);
                          return (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 12px', marginBottom: '8px',
                              background: isDarkMode ? '#0f172a' : '#f8fafc',
                              border: `2px dashed ${isDarkMode ? '#475569' : '#94a3b8'}`,
                              borderRadius: '14px',
                            }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '34px', height: '34px', borderRadius: '50%',
                                background: isDarkMode ? '#1e293b' : '#e2e8f0',
                                color: isDarkMode ? '#94a3b8' : '#475569',
                                fontWeight: 800, fontSize: '13px', flexShrink: 0,
                              }}>Ex</span>
                              {examplePerson.photoUrl && (
                                <img src={resolveImgSrc(examplePerson.photoUrl)} alt="" draggable={false}
                                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                              )}
                              <span style={{ flex: 1, fontWeight: 800, fontSize: '20px', color: isDarkMode ? '#94a3b8' : '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {examplePerson.name}
                              </span>
                              <div style={{
                                width: '76px', height: '76px', borderRadius: '12px',
                                border: `3px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: isDarkMode ? '#1e3a5f' : '#eff6ff', overflow: 'hidden', flexShrink: 0,
                              }}>
                                {exOpt?.imageUrl
                                  ? <img src={resolveImgSrc(exOpt.imageUrl)} alt="" draggable={false}
                                      style={{ width: '100%', height: '56px', objectFit: 'contain' }} />
                                  : null}
                                <span style={{ fontWeight: 900, fontSize: '16px', color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
                                  {examplePerson.correctAnswer}
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', color: isDarkMode ? '#475569' : '#94a3b8', flexShrink: 0, fontWeight: 600 }}>(ex)</span>
                            </div>
                          );
                        })()}

                        {/* Question people rows */}
                        {questionPeople.map((person, i) => {
                          const personIdx = i + 1;
                          const key = `${currentPartIndex}-${secIdx}-${qIdx}-${personIdx}`;
                          const userAnswer = answers[key] || '';
                          const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
                          const isActive = activeQuestion === key;
                          const placedOpt = userAnswer ? options.find((o) => o.letter === userAnswer) : null;
                          const rowBorder = submitted
                            ? (isCorrect ? '#22c55e' : '#ef4444')
                            : isActive ? '#7c3aed' : userAnswer ? '#8b5cf6'
                            : isDarkMode ? '#4f46e5' : '#c4b5fd';
                          const dzBorder = submitted
                            ? (isCorrect ? '#22c55e' : '#ef4444')
                            : userAnswer ? '#8b5cf6' : (isDarkMode ? '#6d28d9' : '#a78bfa');
                          return (
                            <div
                              key={personIdx}
                              id={`question-${partStart + i}`}
                              ref={(el) => { questionRefs.current[key] = el; }}
                              className={`lm-person-row${isCorrect ? ' lm-correct' : ''}`}
                              style={{
                                '--row-delay': `${i * 80}ms`,
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', marginBottom: '8px',
                                background: isDarkMode
                                  ? (isActive ? '#2d1b69' : submitted ? (isCorrect ? '#14532d22' : '#450a0a22') : '#111827')
                                  : (isActive ? '#faf5ff' : submitted ? (isCorrect ? '#f0fdf4' : '#fff1f2') : '#fff'),
                                border: `2.5px solid ${rowBorder}`,
                                borderRadius: '14px',
                                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                                boxShadow: isActive
                                  ? `0 0 0 4px ${isDarkMode ? '#7c3aed44' : '#8b5cf640'}, 0 4px 16px rgba(139,92,246,0.18)`
                                  : userAnswer && !submitted ? `0 2px 10px rgba(139,92,246,0.15)` : 'none',
                              }}
                            >
                              {/* Question number badge */}
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '36px', height: '36px', borderRadius: '50%',
                                background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : '#7c3aed',
                                color: '#fff', fontWeight: 900, fontSize: '16px', flexShrink: 0,
                                boxShadow: submitted ? 'none' : '0 2px 8px rgba(124,58,237,0.4)',
                              }}>
                                {submitted ? <InlineIcon name={isCorrect ? 'correct' : 'wrong'} size={16} style={{ color: '#fff' }} /> : partStart + i}
                              </span>
                              {/* Person photo */}
                              {person.photoUrl && (
                                <img src={resolveImgSrc(person.photoUrl)} alt={person.name} draggable={false}
                                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                              )}
                              {/* Person name */}
                              <span style={{ flex: 1, fontWeight: 800, fontSize: '22px', color: isDarkMode ? '#e2e8f0' : '#1e293b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {person.name}
                              </span>
                              {/* Drop zone wrapper – relative so clear button can float above */}
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                {/* Release / clear button */}
                                {userAnswer && !submitted && (
                                  <button
                                    type="button"
                                    title="Bỏ chọn"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [key]: '' }))}
                                    style={{
                                      position: 'absolute', top: '-10px', right: '-10px',
                                      width: '26px', height: '26px', borderRadius: '50%',
                                      background: '#ef4444', color: '#fff', border: '2.5px solid white',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '13px', fontWeight: 900, lineHeight: 1,
                                      boxShadow: '0 2px 8px rgba(239,68,68,0.55)',
                                      zIndex: 20, padding: 0, transition: 'transform 0.15s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                  ><InlineIcon name="close" size={12} style={{ color: '#fff' }} /></button>
                                )}
                                {/* Drop zone – big and inviting */}
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!submitted) {
                                      e.currentTarget.style.borderColor = '#7c3aed';
                                      e.currentTarget.style.background = isDarkMode ? '#2d1b69' : '#ede9fe';
                                      e.currentTarget.style.transform = 'scale(1.08)';
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.background = '';
                                    e.currentTarget.style.transform = '';
                                  }}
                                  onDrop={(e) => { e.currentTarget.style.transform = ''; handleLetterMatchingDrop(e, key, questionPeople, secIdx); }}
                                  className={!userAnswer && !submitted ? 'lm-dropzone-empty' : ''}
                                  style={{
                                    width: '90px', minWidth: '90px', height: '90px',
                                    border: `3px ${userAnswer ? 'solid' : 'dashed'} ${dzBorder}`,
                                    borderRadius: '14px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                    background: userAnswer
                                      ? (submitted ? (isCorrect ? (isDarkMode ? '#14532d' : '#dcfce7') : (isDarkMode ? '#450a0a' : '#fee2e2')) : (isDarkMode ? '#2d1b69' : '#f5f3ff'))
                                      : (isDarkMode ? '#1e1b4b' : '#faf5ff'),
                                    cursor: submitted ? 'default' : 'copy',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                                  }}
                                >
                                  {userAnswer ? (
                                    <>
                                      {placedOpt?.imageUrl && (
                                        <img src={resolveImgSrc(placedOpt.imageUrl)} alt="" draggable={false}
                                          style={{ width: '100%', height: '64px', objectFit: 'contain', pointerEvents: 'none' }} />
                                      )}
                                      <span style={{ fontWeight: 900, fontSize: '17px', color: submitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#7c3aed', lineHeight: 1 }}>
                                        {userAnswer}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '28px', color: isDarkMode ? '#6d28d9' : '#c4b5fd', pointerEvents: 'none', lineHeight: 1 }}>?</span>
                                  )}
                                </div>
                              </div>
                              {submitted && !isCorrect && (
                                <span style={{ fontSize: '14px', fontWeight: 900, flexShrink: 0, color: '#22c55e' }}>
                                  → {results?.answers?.[key]?.correctAnswer || ''}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Audio Player */}
                  {resolvedAudioSrc && !usesSharedAudio && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <InlineIcon name="listening" size={18} style={{ marginRight: '12px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }} />
                      <audio
                        ref={audioRef}
                        data-listening-audio="true"
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ flex: 1, width: '100%' }}
                      >
                        Your browser does not support audio.
                      </audio>
                      <div
                        style={styles.audioTipWrap}
                        onMouseEnter={() => setShowAudioTip(true)}
                        onMouseLeave={() => setShowAudioTip(false)}
                      >
                        <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                          i
                        </button>
                        {showAudioTip && (
                          <div style={styles.audioTipBubble} role="tooltip">
                            No pause / no rewind
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolvedAudioSrc && audioError && !usesSharedAudio && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              style={{ left: `${leftWidth}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-ellipsis-v"></i>
              </div>
            </div>

            {/* Right Column: Questions */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper">
                {currentPart &&
                  currentPart.sections?.map((section, secIdx) => {
                const partRange = getPartQuestionRange(currentPartIndex);
                const sectionStartNum =
                  questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                  partRange.start;

                // Robust section type detection (some legacy data stores type on question instead of section)
                const q0 = section?.questions?.[0] || {};
                const sectionType =
                  (q0?.questionType === 'letter-matching' || (Array.isArray(q0?.people) && q0.people.length > 0) ? 'letter-matching' :
                   q0?.questionType === 'draw-lines' || (q0?.anchors && Object.keys(q0?.anchors || {}).length > 0) ? 'draw-lines' :
                   section?.questionType) ||
                  q0?.questionType ||
                  q0?.type ||
                  (Array.isArray(q0?.people) ? 'people-matching' : '') ||
                  (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
                  (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
                  '';

                return (
                  <div key={secIdx} className="cambridge-section">
                    {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}
                    {sectionType === 'fill' && renderFillExample(section, sectionStartNum)}

                    {/* Section-based types (KET Reading style) */}
                    {sectionType === 'long-text-mc' && section.questions?.[0]?.questions ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const nested = Array.isArray(container.questions) ? container.questions : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {nested.map((nq, nestedIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${nestedIdx}`;
                              const num = sectionStartNum + nestedIdx;
                              const opts = nq.options || [];
                              const userAnswer = answers[key] || '';
                              const correct = nq.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div className={`cambridge-question-wrapper ${userAnswer ? 'answered' : ''} ${activeQuestion === key ? 'active-question' : ''}`}>
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      <InlineIcon name="flag" size={14} />
                                    </button>

                                    <div style={{ paddingRight: '50px' }}>
                                      <div style={styles.questionHeader}>
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
                                      </div>
                                      <div style={styles.optionsContainer}>
                                        {opts.map((opt, optIdx) => {
                                          const letter = String.fromCharCode(65 + optIdx);
                                          const isSelected = userAnswer === letter;
                                          const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                          return (
                                            <label
                                              key={letter}
                                              style={{
                                                ...styles.optionLabel,
                                                ...(isSelected && styles.optionSelected),
                                                ...(submitted && isCorrectOption && styles.optionCorrect),
                                                ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={key}
                                                checked={isSelected}
                                                onChange={() => handleAnswerChange(key, letter)}
                                                disabled={submitted}
                                                style={{ marginRight: '10px' }}
                                              />
                                              <span style={styles.optionText}>{opt}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-mc' && section.questions?.[0]?.blanks ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const blanks = Array.isArray(container.blanks) ? container.blanks : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {blanks.map((blank, blankIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIdx}`;
                              const num = sectionStartNum + blankIdx;
                              const userAnswer = answers[key] || '';
                              const opts = blank.options || [];
                              const correct = blank.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div style={styles.questionCard}>
                                    <div style={styles.questionHeader}>
                                      <span style={styles.questionNum}>{num}</span>
                                      <span style={styles.questionText}>{blank.questionText || ''}</span>
                                    </div>
                                    <div style={styles.optionsContainer}>
                                      {opts.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const isSelected = userAnswer === letter;
                                        const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                        return (
                                          <label
                                            key={letter}
                                            style={{
                                              ...styles.optionLabel,
                                              ...(isSelected && styles.optionSelected),
                                              ...(submitted && isCorrectOption && styles.optionCorrect),
                                              ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                            }}
                                          >
                                            <input
                                              type="radio"
                                              name={key}
                                              checked={isSelected}
                                              onChange={() => handleAnswerChange(key, letter)}
                                              disabled={submitted}
                                              style={{ marginRight: '10px' }}
                                            />
                                            <span style={styles.optionText}>{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-test' ? (
                      renderOpenClozeSection(section, secIdx, sectionStartNum)
                    ) : sectionType === 'word-form' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const sentences = (Array.isArray(container.sentences) && container.sentences.length > 0)
                          ? container.sentences
                          : [
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                            ];
                        return (
                          <div>
                            {sentences.map((s, sentIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${sentIdx}`;
                              const num = sectionStartNum + sentIdx;
                              const userAnswer = answers[key] || '';
                              const sentenceText = s.sentence || s.text || '';
                              const rootWord = s.rootWord || '';
                              const correct = s.correctAnswer;
                              const isCorrect = submitted && String(userAnswer || '').trim().toLowerCase() === String(correct || '').trim().toLowerCase();

                              return (
                                <div
                                  key={key}
                                  ref={(el) => (questionRefs.current[key] = el)}
                                  className={
                                    `cambridge-question-wrapper ` +
                                    `${userAnswer ? 'answered' : ''} ` +
                                    `${activeQuestion === key ? 'active-question' : ''}`
                                  }
                                >
                                  <button
                                    className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                    onClick={() => toggleFlag(key)}
                                    aria-label="Flag question"
                                    type="button"
                                  >
                                    <InlineIcon name="flag" size={14} />
                                  </button>

                                  <div style={{ paddingRight: '50px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ fontSize: '15px', lineHeight: 1.7, color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>{sentenceText}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center' }}>
                                      <div style={{ padding: '10px 12px', background: isDarkMode ? '#1f2b47' : '#fef3c7', border: `1px solid ${isDarkMode ? '#2a3350' : '#fbbf24'}`, borderRadius: '6px', color: isDarkMode ? '#e5e7eb' : '#78350f' }}>
                                        Root word: <strong>{rootWord}</strong>
                                      </div>
                                      <input
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        disabled={submitted}
                                        placeholder="Type the correct form..."
                                        style={{
                                          ...styles.input,
                                          ...(submitted && {
                                            backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                                            borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                          }),
                                        }}
                                      />
                                    </div>

                                    {submitted && correct && !isCorrect && (
                                      <div style={styles.correctAnswer}><InlineIcon name="correct" size={14} style={{ marginRight: 6 }} />Đáp án đúng: {correct}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'gap-match' ? (
                      renderGapMatchSection(section, secIdx, sectionStartNum)
                    ) : sectionType === 'people-matching' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const getOptionLabel = (t) => {
                          const id = String(t?.id || '').trim();
                          const content = String(t?.title || t?.content || '').trim();
                          return content ? `${id} ${content}`.trim() : id;
                        };
                        const people = (Array.isArray(container.people) && container.people.length > 0)
                          ? container.people
                          : [
                              { id: 'A', name: '', need: '' },
                              { id: 'B', name: '', need: '' },
                              { id: 'C', name: '', need: '' },
                              { id: 'D', name: '', need: '' },
                              { id: 'E', name: '', need: '' },
                            ];
                        const texts = (Array.isArray(container.texts) && container.texts.length > 0)
                          ? container.texts
                          : [
                              { id: 'A', title: '', content: '' },
                              { id: 'B', title: '', content: '' },
                              { id: 'C', title: '', content: '' },
                              { id: 'D', title: '', content: '' },
                              { id: 'E', title: '', content: '' },
                              { id: 'F', title: '', content: '' },
                              { id: 'G', title: '', content: '' },
                              { id: 'H', title: '', content: '' },
                            ];
                        return (
                          <div>
                            <div className="cambridge-question-wrapper" style={{ marginBottom: '16px' }}>
                              <div >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                  <div style={{ border: `1px solid ${isDarkMode ? '#2a3350' : '#bae6fd'}`, background: isDarkMode ? '#0f172a' : '#f0f9ff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px' }}>People</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {people.map((p, idx) => {
                                        const pid = p?.id || String.fromCharCode(65 + idx);
                                        return (
                                          <div key={pid} style={{ padding: '10px', background: isDarkMode ? '#111827' : '#fff', border: `1px solid ${isDarkMode ? '#2a3350' : '#bae6fd'}`, borderRadius: '8px', color: isDarkMode ? '#e5e7eb' : undefined }}>
                                            <strong>{pid}.</strong> {p?.name || ''} {p?.need ? `— ${p.need}` : ''}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div style={{ border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`, background: isDarkMode ? '#0f172a' : '#fff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px' }}>Texts</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {texts.map((t) => (
                                        <div key={t?.id || t?.title || Math.random()} style={{ padding: '10px', background: isDarkMode ? '#111827' : '#fafafa', border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`, borderRadius: '8px', color: isDarkMode ? '#e5e7eb' : undefined }}>
                                          <strong>{String(t?.id || '').trim()}.</strong>
                                          <span style={{ marginLeft: '6px' }}>{String(t?.title || t?.content || '').trim()}</span>
                                          {t?.title && t?.content ? (
                                            <div style={{ marginTop: '6px' }}>{t?.content || ''}</div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {people.map((p, idx) => {
                                const pid = p?.id || String.fromCharCode(65 + idx);
                                const key = `${currentPartIndex}-${secIdx}-${qIdx}-${pid}`;
                                const num = sectionStartNum + idx;
                                const userAnswer = answers[key] || '';
                                const correct = container?.answers?.[pid];
                                const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();

                                return (
                                  <div
                                    key={key}
                                    ref={(el) => (questionRefs.current[key] = el)}
                                    className={
                                      `cambridge-question-wrapper ` +
                                      `${userAnswer ? 'answered' : ''} ` +
                                      `${activeQuestion === key ? 'active-question' : ''}`
                                    }
                                  >
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      <InlineIcon name="flag" size={14} />
                                    </button>

                                    <div style={{ paddingRight: '50px', display: 'grid', gridTemplateColumns: '56px 1fr 160px', gap: '12px', alignItems: 'center' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                                        <strong>{pid}.</strong> {p?.name || ''}
                                      </div>
                                      <select
                                        value={userAnswer}
                                        disabled={submitted}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        style={{
                                          padding: '10px 12px',
                                          border: `2px solid ${isDarkMode ? '#3d3d5c' : '#d1d5db'}`,
                                          borderRadius: '8px',
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          background: isDarkMode ? '#1f2b47' : '#fff',
                                          color: isDarkMode ? '#e5e7eb' : undefined,
                                          ...(submitted
                                            ? {
                                                borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                                background: isCorrect ? '#dcfce7' : '#fee2e2',
                                              }
                                            : null),
                                        }}
                                      >
                                        <option value="">—</option>
                                        {texts.map((t) => (
                                          <option key={t?.id} value={String(t?.id || '').trim()}>
                                            {getOptionLabel(t)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : section.questionType === 'short-message' && section.questions?.[0] ? (
                      (() => {
                        const qIdx = 0;
                        const q = section.questions[0] || {};
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        const num = sectionStartNum;
                        const userAnswer = answers[key] || '';
                        return (
                          <div ref={(el) => (questionRefs.current[key] = el)} style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                              <span style={styles.questionNum}>{num}</span>
                              <span style={styles.questionText}>{q.situation || 'Write a short message.'}</span>
                            </div>

                            {Array.isArray(q.bulletPoints) && q.bulletPoints.some(Boolean) && (
                              <ul style={{ marginTop: '8px', marginBottom: '12px', color: '#334155' }}>
                                {q.bulletPoints.filter(Boolean).map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}

                            <textarea
                              value={userAnswer}
                              onChange={(e) => handleAnswerChange(key, e.target.value)}
                              disabled={submitted}
                              rows={6}
                              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #d1d5db', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }}
                              placeholder="Type your answer..."
                            />
                            {submitted && (
                              <div style={{ marginTop: '10px', color: '#64748b', fontSize: '13px' }}>
                                (This question is not auto-scored.)
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : section.questionType === 'sign-message' ? (
                      section.questions?.map((q, qIdx) => {
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                            <div style={styles.questionCard}>
                              <div style={styles.questionHeader}>
                                <span style={styles.questionNum}>{sectionStartNum + qIdx}</span>
                                <span style={styles.questionText}>{q.signText || q.questionText || ''}</span>
                              </div>
                              {q.imageUrl ? (
                                <div style={{ marginBottom: '12px' }}>
                                  <img
                                    src={resolveImgSrc(q.imageUrl)}
                                    alt=""
                                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}
                                  />
                                </div>
                              ) : null}
                              <div style={styles.optionsContainer}>
                                {(q.options || []).slice(0, 3).map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  const isSelected = (answers[key] || '') === letter;
                                  const isCorrectOption = submitted && String(q.correctAnswer || '').toUpperCase() === letter;
                                  return (
                                    <label
                                      key={letter}
                                      style={{
                                        ...styles.optionLabel,
                                        ...(isSelected && styles.optionSelected),
                                        ...(submitted && isCorrectOption && styles.optionCorrect),
                                        ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={key}
                                        checked={isSelected}
                                        onChange={() => handleAnswerChange(key, letter)}
                                        disabled={submitted}
                                        style={{ marginRight: '10px' }}
                                      />
                                      <span style={styles.optionText}>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : sectionType === 'letter-matching' ? (
                      renderLetterMatchingSection(section, secIdx, sectionStartNum)
                    ) : (
                      // Default per-question rendering
                      section.questions?.map((q, qIdx) => {
                        const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={qIdx} ref={(el) => (questionRefs.current[questionKey] = el)}>
                            {renderQuestion(q, questionKey, sectionStartNum + qIdx)}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Navigation (match Cambridge Reading) */}
      <footer className="cambridge-footer">
        {/* Navigation Arrows - Top Right */}
        <div className="cambridge-footer-arrows">
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex - 1)}
            disabled={currentKeyIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex + 1)}
            disabled={currentKeyIndex >= (questionIndex?.orderedKeys?.length || 1) - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>

        {/* Parts Tabs with Question Numbers */}
        <div className="cambridge-parts-container">
          {questionIndex.byPart.map((p) => {
            const total = p.keys.length;
            const answeredInPart = p.keys.reduce((acc, item) => acc + (answers[item.key] ? 1 : 0), 0);
            const isActive = currentPartIndex === p.partIndex;
            const firstKey = p.keys?.[0]?.key;

            return (
              <div key={p.partIndex} className="cambridge-part-wrapper">
                <button
                  className={`cambridge-part-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!firstKey) return;
                    const idx = questionIndex.orderedKeys.findIndex((x) => x.key === firstKey);
                    goToKeyIndex(idx);
                  }}
                >
                  <span className="cambridge-part-label">Part</span>
                  <span className="cambridge-part-number">{p.partIndex + 1}</span>
                </button>

                {isActive && (
                  <div className="cambridge-questions-inline">
                    {p.keys.map((item) => (
                      <button
                        key={item.key}
                        className={`cambridge-question-num-btn ${answers[item.key] ? 'answered' : ''} ${activeQuestion === item.key ? 'active' : ''} ${flaggedQuestions.has(item.key) ? 'flagged' : ''}`}
                        onClick={() => {
                          const idx = questionIndex.orderedKeys.findIndex((x) => x.key === item.key);
                          goToKeyIndex(idx);
                        }}
                      >
                        {item.hiddenLabel ? '●' : item.number}
                      </button>
                    ))}
                  </div>
                )}

                {!isActive && (
                  <span className="cambridge-part-count">
                    {answeredInPart} of {total}
                  </span>
                )}
              </div>
            );
          })}

          {/* <button
            type="button"
            className="cambridge-review-button"
            onClick={handleSubmit}
            aria-label="Review your answers"
            title="Review"
          >
            <i className="fa fa-check"></i>
            Review
          </button> */}
        </div>
      </footer>

      <CambridgeResultsModal
        results={submitted ? results : null}
        testTitle={test?.title || testConfig.name || 'Cambridge Listening'}
        studentName={getStoredUser()?.name || getStoredUser()?.username}
        onClose={() => navigate('/cambridge')}
        actions={[
          {
            label: 'Choose another test',
            onClick: () => navigate('/cambridge'),
            variant: 'primary',
            iconName: 'tests',
          },
          {
            label: 'Try again',
            onClick: () => window.location.reload(),
            iconName: 'retry',
          },
        ]}
      />

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Submit Cambridge Listening?"
        message="Are you sure you want to submit your answers? After submission, you will not be able to edit them."
        type="info"
        iconName="listening"
        confirmText="Submit now"
        cancelText="Keep working"
        extraContent={
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Progress summary
            </div>
            <div>
              Answered {answeredCount} of {totalQuestions} questions.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default DoCambridgeListeningTest;


