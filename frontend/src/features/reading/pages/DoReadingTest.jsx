import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import ResultModal from "../../../shared/components/ResultModal";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import ExtensionToast from "../../../shared/components/ExtensionToast";
import TestStartModal from "../../../shared/components/TestStartModal";
import "../styles/do-reading-test.css";
import { renderHtmlWithBlankPlaceholders } from "../utils/htmlHelpers";
import {
  countClozeBlanks,
  getActiveClozeTable,
  getClozeText,
  normalizeQuestionType,
  resolveQuestionStartNumber,
} from "../utils/questionHelpers";
import { getClozeTableCellLines, isClozeCommentsColumn } from "../../../shared/utils/clozeTable";
import { apiPath, getStoredUser, hostPath } from "../../../shared/utils/api";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../shared/utils/testTiming";
/* eslint-disable no-loop-func */
// Utility: Remove unwanted <span ...> tags from HTML
function stripUnwantedHtml(html) {
  if (!html) return "";
  return html.replace(/<span[^>]*>|<\/span>/gi, "");
}

/**
 * DoReadingTest - Trang học sinh làm bài Reading IELTS
 *
 * Features:
 * - Support all IELTS question types (T/F/NG, Matching Headings, etc.)
 * - Auto-save answers to localStorage
 * - Interactive question navigation with click-to-jump
 * - Enhanced timer with warnings (5 min, 1 min)
 * - Paragraph highlighting
 * - Beautiful animations & hover effects
 * - Progress tracking
 */

const DoReadingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Refs
  const questionRefs = useRef({});
  const passageRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // State
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [highlightedParagraph, setHighlightedParagraph] = useState(null);

  // Result modal state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Ensure ResultModal import

  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  // Populated from the passage DOM when there's no structured paragraphs array
  const [passageParagraphOptions, setPassageParagraphOptions] = useState([]);

  // Bottom palette helpers
  const [expandedPart, setExpandedPart] = useState(0);

  // Started flag for the test (show start modal and control timer)
  const [started, setStarted] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const uid = u?.id || 'anon';
      return localStorage.getItem(`reading_test_${id}_started:${uid}`) === "true";
    } catch (e) {
      return false;
    }
  });

  // Determine if the current user is a teacher so we can hide student-only UI hints
  const isTeacher = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u && u.role === 'teacher';
    } catch (e) {
      return false;
    }
  }, []);

  // Stable user ID for localStorage key isolation (different students on same device)
  const storageUserId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.id || 'anon';
    } catch (e) {
      return 'anon';
    }
  }, []);
  const readingAnswersKey = `reading_test_${id}_answers:${storageUserId}`;
  const readingExpiresKey = `reading_test_${id}_expiresAt:${storageUserId}`;
  const readingStartedKey = `reading_test_${id}_started:${storageUserId}`;
  const readingSubmissionKey = `reading_test_${id}_submissionId:${storageUserId}`;

  // Track absolute expiry so we can survive power-loss (ref avoids stale closure in effects)
  const expiresAtRef = React.useRef(null);
  const submissionIdRef = useRef(null);
  const confirmSubmitRef = useRef(null);
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        expiresAtRef.current = expiresAtMs;
        try {
          localStorage.setItem(readingExpiresKey, String(expiresAtMs));
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
    [readingExpiresKey]
  );

  const isQuestionAnswered = useCallback(
    (n) => {
      const key = `q_${n}`;

      // For matching-headings, cloze-test, paragraph-matching and multi-select, skip the direct key check here
      // because they use composite storage (JSON or sub-keys) and are handled below.
      // First, determine if question n is part of these blocks.
      let isPartOfMatchingHeadings = false;
      let isPartOfClozeTest = false;
      let isPartOfParagraphMatching = false;
      let isPartOfMultiSelect = false;

      if (test && Array.isArray(test.passages)) {
        let qCounter = 1;
        outerLoop: for (const p of test.passages) {
          const sections = p.sections || [{ questions: p.questions }];
          for (const s of sections) {
            for (const q of s.questions || []) {
              const qType = normalizeQuestionType(q.type || q.questionType || "");

              if (
                qType === "ielts-matching-headings" ||
                qType === "matching-headings"
              ) {
                const paragraphs = q.paragraphs || q.answers || [];
                if (n >= qCounter && n < qCounter + paragraphs.length) {
                  isPartOfMatchingHeadings = true;
                  break outerLoop;
                }
                qCounter += paragraphs.length;
                continue;
              }

              if (qType === "cloze-test" || qType === "summary-completion") {
                const blanks = countClozeBlanks(q);

                if (blanks > 0) {
                  if (n >= qCounter && n < qCounter + blanks) {
                    isPartOfClozeTest = true;
                    break outerLoop;
                  }
                  qCounter += blanks;
                  continue;
                }
              }

              // Paragraph-matching with blanks
              if (qType === "paragraph-matching") {
                const paragraphBlankCount = q.questionText
                  ? (q.questionText.match(/(\.{3,}|…+)/g) || []).length
                  : 0;
                if (paragraphBlankCount > 0) {
                  if (n >= qCounter && n < qCounter + paragraphBlankCount) {
                    isPartOfParagraphMatching = true;
                    break outerLoop;
                  }
                  qCounter += paragraphBlankCount;
                  continue;
                }
              }

              // Multi-select: count each required answer as separate question
              if (qType === "multi-select") {
                const requiredAnswers = q.requiredAnswers || 2;
                if (n >= qCounter && n < qCounter + requiredAnswers) {
                  isPartOfMultiSelect = true;
                  break outerLoop;
                }
                qCounter += requiredAnswers;
                continue;
              }

              qCounter++;
            }
          }
        }
      }

      // For matching-headings, handle specifically below (don't use direct key check)
      if (isPartOfMatchingHeadings) {
        // Find the matching-headings block and check the specific paragraph
        if (test && Array.isArray(test.passages)) {
          let qCounter = 1;
          for (const p of test.passages) {
            const sections = p.sections || [{ questions: p.questions }];
            for (const s of sections) {
              for (const q of s.questions || []) {
                const qType = q.type || q.questionType || "";

                if (
                  qType === "ielts-matching-headings" ||
                  qType === "matching-headings"
                ) {
                  const paragraphs = q.paragraphs || q.answers || [];
                  const base = qCounter;

                  if (n >= base && n < base + paragraphs.length) {
                    const raw = answers[`q_${base}`];
                    if (raw) {
                      try {
                        const parsed = JSON.parse(raw);
                        const paragraphIndex = n - base;
                        const paragraph = paragraphs[paragraphIndex];
                        const paragraphId =
                          typeof paragraph === "object"
                            ? paragraph.id || paragraph.paragraphId || ""
                            : paragraph;
                        if (
                          parsed &&
                          paragraphId &&
                          parsed[paragraphId] !== undefined &&
                          parsed[paragraphId] !== ""
                        ) {
                          return true;
                        }
                      } catch (e) {
                        // not JSON
                      }
                    }
                    return false;
                  }

                  qCounter += paragraphs.length;
                  continue;
                }

                // Skip other types in this loop
                if (qType === "cloze-test" || qType === "summary-completion") {
                  const clozeText =
                    q.paragraphText ||
                    q.passageText ||
                    q.text ||
                    q.paragraph ||
                    (q.questionText && q.questionText.includes("[BLANK]")
                      ? q.questionText
                      : null);
                  if (clozeText) {
                    const blanks =
                      (clozeText.match(/\[BLANK\]/gi) || []).length;
                    qCounter += blanks || 1;
                    continue;
                  }
                }

                if (qType === "paragraph-matching") {
                  const paragraphBlankCount = q.questionText
                    ? (q.questionText.match(/(\.{3,}|…+)/g) || []).length
                    : 0;
                  if (paragraphBlankCount > 0) {
                    qCounter += paragraphBlankCount;
                    continue;
                  }
                }

                qCounter++;
              }
            }
          }
        }
        return false;
      }

      // For cloze-test, check sub-keys q_base_index where base + index === n
      if (isPartOfClozeTest) {
        for (const k of Object.keys(answers || {})) {
          const m = k.match(/^q_(\d+)_(\d+)$/);
          if (m) {
            const base = Number(m[1]);
            const sub = Number(m[2]);
            if (!Number.isNaN(base) && !Number.isNaN(sub)) {
              if (
                base + sub === n &&
                answers[k] &&
                answers[k].toString().trim() !== ""
              ) {
                return true;
              }
            }
          }
        }
        return false;
      }

      // For paragraph-matching, check sub-keys q_base_index where base + index === n
      if (isPartOfParagraphMatching) {
        for (const k of Object.keys(answers || {})) {
          const m = k.match(/^q_(\d+)_(\d+)$/);
          if (m) {
            const base = Number(m[1]);
            const sub = Number(m[2]);
            if (!Number.isNaN(base) && !Number.isNaN(sub)) {
              if (
                base + sub === n &&
                answers[k] &&
                answers[k].toString().trim() !== ""
              ) {
                return true;
              }
            }
          }
        }
        return false;
      }

      // For multi-select, check if answer array has selections
      if (isPartOfMultiSelect) {
        const v = answers[key];
        if (Array.isArray(v) && v.length > 0) {
          return true;
        }
        return false;
      }

      // Direct value (string, JSON, or non-string) - for regular question types (including true/false/not given)
      const v = answers[key];
      if (v) {
        if (typeof v === "string") {
          if (v.toString().trim() !== "") return true;
        } else {
          return true;
        }
      }

      return false;
    },
    [answers, test]
  );

  const paletteContainerRef = useRef(null);
  const partItemsRefs = useRef({});

  const togglePart = useCallback(
    (idx) => setExpandedPart((prev) => (prev === idx ? null : idx)),
    []
  );

  // Scroll and expand a part in the palette (used when user navigates by prev/next/part dots)
  const scrollPaletteToPart = useCallback((index) => {
    if (index == null) return;
    if (!paletteContainerRef.current) {
      setExpandedPart(index);
      return;
    }

    // Expand then scroll the part into view (small timeout so CSS can apply)
    setExpandedPart(index);
    setTimeout(() => {
      try {
        const el = paletteContainerRef.current.querySelector(
          `.palette-part[data-part="${index}"]`
        );
        if (el)
          el.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });

        // Scroll the first question button inside the part into view
        const btn = el && el.querySelector(".nav-question-btn");
        if (btn)
          btn.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
      } catch (e) {
        // ignore
      }
    }, 120);
  }, []);

  // Helper function to count questions (matching headings & cloze test count as multiple questions)
  const countQuestionsInSection = useCallback((questions) => {
    return (questions || []).reduce((total, q) => {
      const qType = normalizeQuestionType(
        q.type || q.questionType || "multiple-choice"
      );

      if (qType === "ielts-matching-headings") {
        return total + ((q.paragraphs || q.answers || []).length || 1);
      }

      if (qType === "cloze-test" || qType === "summary-completion") {
        return total + (countClozeBlanks(q) || 1);
      }

      if (
        q.type === "paragraph-matching" ||
        q.questionType === "paragraph-matching"
      ) {
        const paragraphBlankCount = q.questionText
          ? (q.questionText.match(/(\.{3,}|…+)/g) || []).length
          : 0;
        if (paragraphBlankCount > 0) return total + paragraphBlankCount;
      }

      // Handle multi-select (like listening - count as multiple questions)
      if (qType === "multi-select") {
        return total + (q.requiredAnswers || 2);
      }

      return total + 1;
    }, 0);
  }, []);

  // Build palette parts with question ranges and answered counts
  const paletteParts = useMemo(() => {
    if (!test) return [];
    let qNum = 1;
    return test.passages.map((p, idx) => {
      const sections = p.sections || [{ questions: p.questions }];
      let count = 0;
      sections.forEach((s) => (count += countQuestionsInSection(s.questions)));
      const start = qNum;
      const end = qNum + count - 1;
      let answered = 0;
      for (let i = start; i <= end; i++) {
        if (isQuestionAnswered(i)) answered++;
      }
      qNum += count;
      return { index: idx, start, end, count, answered };
    });
  }, [test, countQuestionsInSection, isQuestionAnswered]);

  // Build question groups (merging ONLY multi-select questions into ranges like 12-13)
  const buildQuestionGroups = useCallback((partIndex) => {
    if (!test || !test.passages || !test.passages[partIndex]) return [];
    
    const passage = test.passages[partIndex];
    const sections = passage.sections || [{ questions: passage.questions }];
    const groups = [];
    let currentNum = 1;
    
    // Calculate starting number for this passage
    for (let i = 0; i < partIndex; i++) {
      const p = test.passages[i];
      const s = p.sections || [{ questions: p.questions }];
      s.forEach((sec) => {
        currentNum += countQuestionsInSection(sec.questions);
      });
    }
    
    // Process each section
    sections.forEach((section) => {
      (section.questions || []).forEach((q) => {
        const qType = normalizeQuestionType(q.type || q.questionType || "multiple-choice");
        const startNum = currentNum;
        
        // Only merge multi-select questions, all others are single
        if (qType === "multi-select") {
          const count = q.requiredAnswers || 2;
          groups.push({ type: "multi-select", start: startNum, end: startNum + count - 1, count });
          currentNum += count;
        } else if (qType === "ielts-matching-headings") {
          const count = (q.paragraphs || q.answers || []).length || 1;
          for (let i = 0; i < count; i++) {
            groups.push({ type: "single", start: startNum + i, count: 1 });
          }
          currentNum += count;
        } else if (qType === "paragraph-matching") {
          const clean = (q.questionText || "")
            .replace(/<p[^>]*>/gi, "")
            .replace(/<\/p>/gi, " ")
            .replace(/<br\s*\/?/gi, " ")
            .trim();
          const parts = clean ? clean.split(/(\.{3,}|…+)/) : [];
          const blankCount = parts.filter((p) => p && p.match(/\.{3,}|…+/)).length || 1;
          for (let i = 0; i < blankCount; i++) {
            groups.push({ type: "single", start: startNum + i, count: 1 });
          }
          currentNum += blankCount;
        } else if (qType === "cloze-test" || qType === "summary-completion") {
          let blankCount = countClozeBlanks(q);
          blankCount = blankCount || 1;
          for (let i = 0; i < blankCount; i++) {
            groups.push({ type: "single", start: startNum + i, count: 1 });
          }
          currentNum += blankCount;
        } else {
          groups.push({ type: "single", start: startNum, count: 1 });
          currentNum += 1;
        }
      });
    });
    
    return groups;
  }, [test, countQuestionsInSection]);

  // Auto-expand the part that contains the active question (if any)
  useEffect(() => {
    if (!paletteParts || !paletteParts.length || activeQuestion == null) return;
    const part = paletteParts.find(
      (p) => activeQuestion >= p.start && activeQuestion <= p.end
    );
    if (part && expandedPart !== part.index) {
      setExpandedPart(part.index);
    }
  }, [activeQuestion, paletteParts, expandedPart]);

  // Auto-scroll palette to show active button and ensure part is visible
  useEffect(() => {
    if (!paletteContainerRef.current) return;

    // Scroll the part container into view
    const activePartEl = paletteContainerRef.current.querySelector(
      `.palette-part[data-part="${expandedPart}"]`
    );
    if (activePartEl)
      activePartEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });

    if (activeQuestion == null) return;
    const btn = paletteContainerRef.current.querySelector(
      `.nav-question-btn[data-num="${activeQuestion}"]`
    );
    if (btn) {
      // scroll the button into view within the palette area
      btn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeQuestion, expandedPart]);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const [timerWarning, setTimerWarning] = useState(false);
  const [timerCritical, setTimerCritical] = useState(false);

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

  // Load saved answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(readingAnswersKey);
    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (e) {
        console.error("Error loading saved answers:", e);
      }
    }
  }, [id]);

  // Auto-save answers to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(readingAnswersKey, JSON.stringify(answers));
    }
  }, [answers, id, readingAnswersKey]);

  // Persist expiresAt (absolute) and started flag so a refresh/power-loss restores correct remaining time
  useEffect(() => {
    try {
      if (started && Number.isFinite(expiresAtRef.current)) {
        localStorage.setItem(readingExpiresKey, String(expiresAtRef.current));
      }
      localStorage.setItem(readingStartedKey, started ? "true" : "false");
    } catch (e) {
      // ignore storage errors
    }
  }, [timeRemaining, started, id, readingExpiresKey, readingStartedKey]);

  // Autosave reading progress to the server so students can resume after re-login.
  useEffect(() => {
    if (!started || submitted || timeRemaining === null) return;

    const user = getStoredUser();
    if (!user?.id && !submissionIdRef.current) return;

    const persistDraft = async () => {
      try {
        const payload = {
          submissionId: submissionIdRef.current,
          answers,
          expiresAt: expiresAtRef.current,
          user,
          progressMeta: {
            started,
            activeQuestion,
            currentPartIndex,
          },
        };
        const res = await fetch(apiPath(`reading-submissions/${id}/autosave`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (json?.submissionId) {
          submissionIdRef.current = json.submissionId;
          localStorage.setItem(
            readingSubmissionKey,
            String(json.submissionId)
          );
        }
        const nextExpiresAt = json?.timing?.expiresAt || json?.expiresAt;
        if (nextExpiresAt) {
          announceExtension(nextExpiresAt, expiresAtRef.current);
          syncTimingState(nextExpiresAt);
        }
      } catch (_err) {
        // Keep localStorage as a fallback if the network is unstable.
      }
    };

    const debounceId = setTimeout(persistDraft, 600);
    const intervalId = setInterval(persistDraft, 15000);
    const onBeforeUnload = () => {
      persistDraft();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistDraft();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(debounceId);
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    activeQuestion,
    answers,
    currentPartIndex,
    id,
    readingSubmissionKey,
    announceExtension,
    syncTimingState,
    started,
    submitted,
    timeRemaining,
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
    if (!query) return;

    try {
      const res = await fetch(apiPath(`reading-submissions/${id}/active${query}`));
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
  }, [announceExtension, id, started, submitted, syncTimingState]);

  useEffect(() => {
    if (!started || submitted) return;

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
  }, [reconcileServerTiming, started, submitted]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const localUser = getStoredUser();
        const savedSubmissionId = localStorage.getItem(readingSubmissionKey);
        if (savedSubmissionId) {
          submissionIdRef.current = savedSubmissionId;
        }

        const res = await fetch(apiPath(`reading-tests/${id}`));
        if (!res.ok) throw new Error("Failed to fetch test");
        const data = await res.json();
        // Normalize question type names across the test data
        const normalizeTest = (t) => {
          if (!t || !Array.isArray(t.passages)) return t;
          return {
            ...t,
            passages: t.passages.map((p) => ({
              ...p,
              sections: p.sections
                ? p.sections.map((s) => ({
                    ...s,
                    questions: s.questions
                      ? s.questions.map((q) => ({
                          ...q,
                          questionType: normalizeQuestionType(
                            q.type || q.questionType || ""
                          ),
                        }))
                      : [],
                  }))
                : undefined,
              questions: p.questions
                ? p.questions.map((q) => ({
                    ...q,
                    questionType: normalizeQuestionType(
                      q.type || q.questionType || ""
                    ),
                  }))
                : undefined,
            })),
          };
        };

        const normalized = normalizeTest(data);
        setTest(normalized);

        let restoredFromServer = false;
        const query = submissionIdRef.current
          ? `?submissionId=${submissionIdRef.current}`
          : localUser?.id
            ? `?userId=${localUser.id}`
            : "";

        if (query) {
          try {
            const activeRes = await fetch(
              apiPath(`reading-submissions/${id}/active${query}`)
            );
            if (activeRes.ok) {
              const payload = await activeRes.json().catch(() => null);
              const draft = payload?.submission || null;

              if (draft && draft.finished !== true) {
                restoredFromServer = true;
                if (draft.id) {
                  submissionIdRef.current = draft.id;
                  localStorage.setItem(readingSubmissionKey, String(draft.id));
                }

                const serverAnswers =
                  draft.answers &&
                  typeof draft.answers === "object" &&
                  !Array.isArray(draft.answers)
                    ? draft.answers
                    : {};
                setAnswers(serverAnswers);
                localStorage.setItem(
                  readingAnswersKey,
                  JSON.stringify(serverAnswers)
                );

                const expiresAtMs = draft.expiresAt
                  ? new Date(draft.expiresAt).getTime()
                  : null;
                if (Number.isFinite(expiresAtMs)) {
                  syncTimingState(expiresAtMs);
                } else {
                  setTimeRemaining((normalized.durationMinutes || 60) * 60);
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
                localStorage.setItem(
                  readingStartedKey,
                  resumedStarted ? "true" : "false"
                );

                if (Number.isFinite(Number(progressMeta.activeQuestion))) {
                  setActiveQuestion(Number(progressMeta.activeQuestion));
                }
                if (Number.isFinite(Number(progressMeta.currentPartIndex))) {
                  setCurrentPartIndex(Number(progressMeta.currentPartIndex));
                  setExpandedPart(Number(progressMeta.currentPartIndex));
                }
              }
            }
          } catch (resumeErr) {
            console.error("Error restoring reading draft from server:", resumeErr);
          }
        }

        if (!restoredFromServer) {
          // If there's a saved timer and the test was started, restore it; otherwise use test default
          try {
            const savedStarted =
              localStorage.getItem(readingStartedKey) === "true";
            const savedExpiry = localStorage.getItem(readingExpiresKey);

            if (savedStarted && savedExpiry) {
              syncTimingState(parseInt(savedExpiry, 10));
              setStarted(true);
            } else {
              setTimeRemaining((normalized.durationMinutes || 60) * 60);
              setGraceRemaining(0);
            }
          } catch (e) {
            setTimeRemaining((normalized.durationMinutes || 60) * 60);
            setGraceRemaining(0);
          }
        }

        // Migrate saved answers if necessary: older saves may have keys like `q_<n>` (single) for paragraph-matching
        try {
          const saved = localStorage.getItem(readingAnswersKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const migrated = { ...parsed };

            // Walk test structure to find paragraph-matching questions and normalize old keys
            let qCounter = 1;
            data.passages.forEach((p) => {
              const sections = p.sections || [{ questions: p.questions }];
              sections.forEach((section) => {
                (section.questions || []).forEach((q) => {
                  const qType = normalizeQuestionType(
                    q.type || q.questionType || "multiple-choice"
                  );
                  if (qType === "ielts-matching-headings") {
                    const paragraphCount =
                      (q.paragraphs || q.answers || []).length || 1;
                    qCounter += paragraphCount;
                    return;
                  }

                  if (qType === "paragraph-matching") {
                    // If old value exists as q_<n> (single) migrate to q_<n>_0
                    const baseKey = `q_${qCounter}`;
                    if (parsed[baseKey] && !parsed[`${baseKey}_0`]) {
                      migrated[`${baseKey}_0`] = parsed[baseKey];
                      delete migrated[baseKey];
                    }

                    // Count blanks
                    const text = (q.questionText || "")
                      .replace(/<p[^>]*>/gi, "")
                      .replace(/<\/p>/gi, " ")
                      .replace(/<br\s*\/?/gi, " ")
                      .trim();
                    const parts = text ? text.split(/(\.{3,}|…+)/) : [];
                    const blanks =
                      parts.filter((p2) => p2 && p2.match(/\.{3,}|…+/))
                        .length || 1;
                    qCounter += blanks;
                    return;
                  }

                  // cloze or others
                  if (
                    qType === "cloze-test" ||
                    qType === "summary-completion"
                  ) {
                    qCounter += countClozeBlanks(q) || 1;
                    return;
                  }

                  qCounter++;
                });
              });
            });

            // If migration changed anything, update saved answers and state
            if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
              localStorage.setItem(readingAnswersKey, JSON.stringify(migrated));
              setAnswers(migrated);
            }
          }
        } catch (e) {
          console.error("Error migrating saved answers:", e);
        }
      } catch (err) {
        console.error("Error fetching reading test:", err);
      }
    };
    fetchTest();
  }, [
    id,
    readingAnswersKey,
    readingExpiresKey,
    readingStartedKey,
    readingSubmissionKey,
    syncTimingState,
  ]);

  // Timer countdown (runs only when started)
  useEffect(() => {
    if (submitted || !started || !Number.isFinite(expiresAtRef.current)) return;

    const tick = () => {
      const expiresAtMs = expiresAtRef.current;
      if (!Number.isFinite(expiresAtMs)) return;

      const remaining = getRemainingSeconds(expiresAtMs);
      const nextGraceRemaining = getGraceRemainingSeconds(expiresAtMs);

      setTimeRemaining(remaining);
      setGraceRemaining(nextGraceRemaining);
      setTimerWarning(remaining > 0 && remaining <= 300);
      setTimerCritical(remaining > 0 && remaining <= 60);
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
    setTimeUp(true);
    setShowConfirm(false);
    confirmSubmitRef.current();
  }, [started, submitted, timeRemaining, graceRemaining]);

  // Format time
  const formatTime = (seconds) => {
    return formatClock(seconds);
  };

  // Handle answer change
  const handleAnswerChange = useCallback((qKey, value) => {
    setAnswers((prev) => ({ ...prev, [qKey]: value }));
  }, []);

  // Handle multi-select change
  // Handle checkbox change for multi-select (matching listening style)
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

  // Handle matching headings change
  const handleMatchingHeadingsChange = useCallback(
    (qKey, paragraphId, headingIndex) => {
      setAnswers((prev) => {
        const current = prev[qKey] ? JSON.parse(prev[qKey]) : {};
        return {
          ...prev,
          [qKey]: JSON.stringify({ ...current, [paragraphId]: headingIndex }),
        };
      });
    },
    []
  );

  // Calculate statistics
  const getStatistics = useCallback(() => {
    if (!test) return { total: 0, answered: 0, unanswered: [] };

    let total = 0;
    let answered = 0;
    const unanswered = [];

    test.passages.forEach((p) => {
      const sections = p.sections || [{ questions: p.questions }];
      sections.forEach((section) => {
        (section.questions || []).forEach((q) => {
          const qType = normalizeQuestionType(
            q.type || q.questionType || "multiple-choice"
          );

          // For matching headings, count each paragraph as a question
          if (qType === "ielts-matching-headings") {
            const paragraphs = q.paragraphs || q.answers || [];
            const key = `q_${total + 1}`;
            let answerObj = {};
            try {
              answerObj = answers[key] ? JSON.parse(answers[key]) : {};
            } catch (e) {
              answerObj = {};
            }

            paragraphs.forEach((para) => {
              total++;
              const paragraphId =
                typeof para === "object" ? para.id || para.paragraphId : para;
              if (
                answerObj[paragraphId] !== undefined &&
                answerObj[paragraphId] !== ""
              ) {
                answered++;
              } else {
                unanswered.push(total);
              }
            });
          }
          // For paragraph-matching, treat each blank (ellipsis) as a separate question
          else if (qType === "paragraph-matching") {
            const cleanText = (q.questionText || "")
              .replace(/<p[^>]*>/gi, "")
              .replace(/<\/p>/gi, " ")
              .replace(/<br\s*\/?/gi, " ")
              .trim();
            const parts = cleanText ? cleanText.split(/(\.{3,}|…+)/) : [];
            const blankMatches = parts.filter((p) => p && p.match(/\.{3,}|…+/));
            const baseKey = `q_${total + 1}`;

            if (blankMatches.length > 0) {
              blankMatches.forEach((_, bi) => {
                total++;
                const answerKey = `${baseKey}_${bi}`;
                if (
                  answers[answerKey] &&
                  answers[answerKey].toString().trim() !== ""
                ) {
                  answered++;
                } else {
                  unanswered.push(total);
                }
              });
            } else {
              // single select stored at baseKey_0
              total++;
              const answerKey = `${baseKey}_0`;
              if (
                answers[answerKey] &&
                answers[answerKey].toString().trim() !== ""
              ) {
                answered++;
              } else {
                unanswered.push(total);
              }
            }
          }
          // For cloze test, count each blank as a question
          else if (qType === "cloze-test" || qType === "summary-completion") {
            const totalBlanks = countClozeBlanks(q);
            const baseKey = `q_${total + 1}`;

            if (totalBlanks > 0) {
              for (let i = 0; i < totalBlanks; i++) {
                total++;
                const answerKey = `${baseKey}_${i}`;
                if (
                  answers[answerKey] &&
                  answers[answerKey].toString().trim() !== ""
                ) {
                  answered++;
                } else {
                  unanswered.push(total);
                }
              }
            } else {
              total++;
              const key = `q_${total}`;
              if (answers[key] && answers[key].toString().trim() !== "") {
                answered++;
              } else {
                unanswered.push(total);
              }
            }
          }
          // For multi-select, count each required answer as a separate question
          else if (qType === "multi-select") {
            const requiredAnswers = q.requiredAnswers || 2;
            const baseKey = `q_${total + 1}`;

            for (let i = 0; i < requiredAnswers; i++) {
              total++;
              const answerArray = answers[baseKey] || [];
              if (Array.isArray(answerArray) && answerArray.length > 0) {
                answered++;
              } else {
                unanswered.push(total);
              }
            }
          } else {
            total++;
            const key = `q_${total}`;
            if (answers[key] && answers[key].toString().trim() !== "") {
              answered++;
            } else {
              unanswered.push(total);
            }
          }
        });
      });
    });

    return { total, answered, unanswered };
  }, [test, answers]);

  // Navigate to question
  const scrollToQuestion = useCallback(
    (questionNumber) => {
      if (!test) return;

      // Find which passage contains this question
      let counter = 0;
      let targetPassageIndex = Math.max(0, test.passages.length - 1);

      for (let i = 0; i < test.passages.length; i++) {
        const passage = test.passages[i];
        const sections = passage.sections || [{ questions: passage.questions }];
        let passageQuestionCount = 0;
        sections.forEach(
          (s) => (passageQuestionCount += countQuestionsInSection(s.questions))
        );

        if (counter + passageQuestionCount >= questionNumber) {
          targetPassageIndex = i;
          break;
        }
        counter += passageQuestionCount;
      }

      // Change passage if needed
      if (targetPassageIndex !== currentPartIndex) {
        setCurrentPartIndex(targetPassageIndex);
      }

      // Scroll to question
      setActiveQuestion(questionNumber);
      setTimeout(() => {
        const element = questionRefs.current[`q_${questionNumber}`];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // After scroll, focus the first focusable control inside the element (input, textarea, select, contenteditable)
          setTimeout(() => {
            try {
              const focusable = element.querySelector
                ? element.querySelector(
                    'input, textarea, select, [contenteditable="true"]'
                  )
                : null;

              if (focusable && typeof focusable.focus === "function") {
                focusable.focus({ preventScroll: true });
                // place cursor at end for inputs
                if (focusable.setSelectionRange && focusable.value != null) {
                  const len = focusable.value.length;
                  focusable.setSelectionRange(len, len);
                }
              } else if (element && typeof element.focus === "function") {
                element.focus({ preventScroll: true });
              }
            } catch (e) {
              // ignore focus errors
            }
          }, 220);
        }
      }, 150);
    },
    [test, currentPartIndex, countQuestionsInSection]
  );

  // Navigate to a part (expand palette, scroll navigator, and optionally focus first question)
  const goToPart = useCallback(
    (index, { focusFirst = true } = {}) => {
      if (index == null) return;

      // set the current part index so UI updates
      setCurrentPartIndex(index);

      // ensure palette is expanded & scrolled into view
      scrollPaletteToPart(index);

      // Optionally focus the first question in the part
      if (focusFirst && Array.isArray(paletteParts) && paletteParts.length) {
        const part = paletteParts.find((p) => p.index === index);
        const firstQ = part ? part.start : null;
        if (firstQ != null) {
          // small timeout to ensure UI has updated
          setTimeout(() => {
            setActiveQuestion(firstQ);
            scrollToQuestion(firstQ);
          }, 180);
        }
      }
    },
    [scrollPaletteToPart, paletteParts, scrollToQuestion]
  );

  // Highlight paragraph in passage
  const handleParagraphHighlight = useCallback((paragraphId) => {
    setHighlightedParagraph(paragraphId);
  }, []);

  const handleParagraphUnhighlight = useCallback(() => {
    setHighlightedParagraph(null);
  }, []);

  // Process passage text to add paragraph markers and data attributes
  const processPassageText = useCallback(
    (htmlText) => {
      if (!htmlText) return "";

      // Add data-paragraph attributes to paragraphs if they don't exist
      // Look for paragraphs that start with letters like A, B, C, etc.
      let processed = htmlText;

      // Pattern: Find <p> tags or paragraph markers
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      letters.forEach((letter) => {
        // Look for paragraphs starting with bold letter markers like <strong>A</strong> or <b>A</b>
        // Support multiple formats including with/without space
        const patterns = [
          // <p><strong>A</strong> or <p> <strong>A</strong>
          new RegExp(`(<p[^>]*>)\\s*<strong>\\s*${letter}\\s*</strong>`, "gi"),
          // <p><b>A</b>
          new RegExp(`(<p[^>]*>)\\s*<b>\\s*${letter}\\s*</b>`, "gi"),
          // <p><span>A</span>
          new RegExp(`(<p[^>]*>)\\s*<span[^>]*>\\s*${letter}\\s*</span>`, "gi"),
          // <p>A (letter followed by space or non-letter)
          new RegExp(`(<p[^>]*>)\\s*${letter}(?=\\s|[^A-Za-z])`, "gi"),
          // <p><em>A</em>
          new RegExp(`(<p[^>]*>)\\s*<em>\\s*${letter}\\s*</em>`, "gi"),
          // Already has class but need to add marker - <p class="...">A
          new RegExp(
            `(<p\\s+class="[^"]*">)\\s*${letter}(?=\\s|[^A-Za-z])`,
            "gi"
          ),
        ];

        patterns.forEach((pattern) => {
          processed = processed.replace(pattern, (match, pTag) => {
            // Skip if already processed
            if (match.includes("data-paragraph")) return match;
            if (match.includes("paragraph-marker")) return match;

            const highlighted =
              highlightedParagraph === letter ? " highlighted" : "";
            return `<p data-paragraph="${letter}" class="paragraph-block${highlighted}"><span class="paragraph-marker">${letter}</span> `;
          });
        });
      });

      return processed;
    },
    [highlightedParagraph]
  );

  // Resizable panel handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;

    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 25% and 75%
      if (newLeftWidth >= 25 && newLeftWidth <= 75) {
        setLeftPanelWidth(newLeftWidth);
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // Add/remove global mouse listeners for resize
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Quick fix: remove stray single-brace text nodes ("{" or "}") that sometimes appear
  // in the question list due to malformed HTML or legacy edits. This cleans up visible '}' marks.
  useEffect(() => {
    const ql = document.querySelector(".questions-list");
    if (!ql) return;

    const walker = document.createTreeWalker(ql, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const v = node.nodeValue && node.nodeValue.trim();
        if (v === "}" || v === "{") return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((t) => t.parentNode && t.parentNode.removeChild(t));
  }, [currentPartIndex, answers, test]);

  // Validate and submit
  const handleSubmit = () => {
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      const user = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch (e) {
          return null;
        }
      })();

      const res = await fetch(apiPath(`reading-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          submissionId: submissionIdRef.current,
          user,
          studentName: user?.name || undefined,
          studentId: user?.id || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setSubmitted(true);

      // Clear saved answers and timer so returning student gets a fresh attempt
      localStorage.removeItem(readingAnswersKey);
      localStorage.removeItem(readingExpiresKey);
      localStorage.removeItem(readingStartedKey);
      localStorage.removeItem(readingSubmissionKey);
      expiresAtRef.current = null;
      submissionIdRef.current = null;
      // Also clear in-memory answers so the auto-save effect doesn't re-persist them
      setAnswers({});

      // Instead of navigating, show result modal (do not flip started state immediately
      // because component returns early when !started and would prevent modal mounting)
      setResultData(data);
      if (test?.showResultModal !== false) {
        setResultModalOpen(true);
      } else {
        // If teacher disabled result modal, show success message and navigate back
        alert("Submission successful. Your teacher can review your results.");
        navigate("/select-test");
      }
    } catch (err) {
      console.error("Error submitting reading test:", err);
      autoSubmittingRef.current = false;
      alert("Something went wrong while submitting. Please try again.");
    } finally {
      setShowConfirm(false);
    }
  };

  useEffect(() => {
    confirmSubmitRef.current = confirmSubmit;
  }, [confirmSubmit]);

  // Build passage paragraph options if structured data not provided
  useEffect(() => {
    const currentPassageLocal =
      test && test.passages && test.passages[currentPartIndex];
    if (!currentPassageLocal || !passageRef.current) return;

    // Structured paragraphs first
    if (
      currentPassageLocal.paragraphs &&
      currentPassageLocal.paragraphs.length
    ) {
      const opts = currentPassageLocal.paragraphs.map((p) => {
        if (typeof p === "object") {
          const id = (p.id || p.label || p.paragraphId || "").toString();
          const excerpt = (p.text || p.content || p.excerpt || "")
            .replace(/<[^>]+>/g, "")
            .trim()
            .slice(0, 120);
          return { id, excerpt };
        }
        return { id: String(p), excerpt: "" };
      });
      setPassageParagraphOptions(opts.filter(Boolean));
      return;
    }

    // Fallback: scan rendered passage DOM for paragraph markers
    setTimeout(() => {
      const el = passageRef.current;
      if (!el) return;

      const found = new Map();
      const nodes = el.querySelectorAll("[data-paragraph], .paragraph-marker");
      nodes.forEach((node) => {
        let letter = node.getAttribute && node.getAttribute("data-paragraph");
        if (!letter) {
          const marker =
            node.classList && node.classList.contains("paragraph-marker")
              ? node
              : node.querySelector && node.querySelector(".paragraph-marker");
          letter = marker ? (marker.innerText || "").trim() : null;
        }
        if (!letter) return;

        // closest paragraph text
        let pEl = node;
        while (pEl && pEl.tagName !== "P") pEl = pEl.parentElement;
        const text = pEl
          ? pEl.innerText.replace(letter, "").trim()
          : (node.innerText || "").trim();
        const excerpt = text.slice(0, 120);
        if (!found.has(letter)) found.set(letter, { id: letter, excerpt });
      });

      setPassageParagraphOptions(Array.from(found.values()));
    }, 40);
  }, [currentPartIndex, test, passageRef]);

  // Sync selected paragraphs with passage DOM (add/remove .paragraph-chosen on <p data-paragraph="X">)
  useEffect(() => {
    if (!passageRef.current || !test) return;
    const el = passageRef.current;

    // Clear previous marks for this passage
    el.querySelectorAll(".paragraph-block").forEach((p) =>
      p.classList.remove("paragraph-chosen")
    );

    // Calculate starting question number for this passage
    let startQuestionNumber = 1;
    for (let i = 0; i < currentPartIndex; i++) {
      const p = test.passages[i];
      const sections = p.sections || [{ questions: p.questions }];
      for (const s of sections) {
        startQuestionNumber += countQuestionsInSection(s.questions);
      }
    }

    const currentPassageLocal = test.passages[currentPartIndex];
    const currentSectionsLocal = currentPassageLocal.sections || [
      { questions: currentPassageLocal.questions },
    ];
    let qNum = startQuestionNumber;

    currentSectionsLocal.forEach((section) => {
      const sectionQuestions = section.questions || [];
      sectionQuestions.forEach((q) => {
        const qType = normalizeQuestionType(
          q.type || q.questionType || "multiple-choice"
        );

        if (qType === "paragraph-matching") {
          const clean = (q.questionText || "")
            .replace(/<p[^>]*>/gi, "")
            .replace(/<\/p>/gi, " ")
            .replace(/<br\s*\/?/gi, " ")
            .trim();
          const parts = clean ? clean.split(/(\.{3,}|…+)/) : [];
          const blankCount =
            parts.filter((p) => p && p.match(/\.{3,}|…+/)).length || 1;

          for (let bi = 0; bi < blankCount; bi++) {
            const val = answers[`q_${qNum}_${bi}`];
            if (val) {
              const pEl = el.querySelector(`[data-paragraph="${val}"]`);
              if (pEl) pEl.classList.add("paragraph-chosen");
            }
          }

          qNum += blankCount || 1;
        } else if (qType === "ielts-matching-headings") {
          qNum += (q.paragraphs || q.answers || []).length || 1;
        } else if (qType === "cloze-test" || qType === "summary-completion") {
          qNum += countClozeBlanks(q) || 1;
        } else {
          qNum++;
        }
      });
    });
  }, [answers, currentPartIndex, test, countQuestionsInSection, passageRef]);

  // Loading state
  if (!test) {
    return (
      <div className="reading-test-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải đề thi...</p>
      </div>
    );
  }

  // Calculate statistics early so start modal can display total questions
  const stats = getStatistics();
  const startDurationMinutes = Math.round(test.durationMinutes || 60);

  // If the test hasn't been started yet, show a start modal (60 minutes or test.duration)
  if (!started) {
    return (
      <TestStartModal
        iconName="reading"
        eyebrow="IX Reading"
        subtitle="Reading Test"
        title={test?.title || "IX Reading"}
        stats={[
          { value: startDurationMinutes, label: "Minutes", tone: "sky" },
          { value: stats.total, label: "Questions", tone: "green" },
          { value: test?.passages?.length || 0, label: "Passage", tone: "amber" },
        ]}
        noticeTitle="Important note"
        noticeContent={
          <>
            The timer starts as soon as you press Start. Your answers are auto-saved throughout the test and you can move between passages before submitting.
          </>
        }
        secondaryLabel="Cancel"
        onSecondary={() => navigate("/select-test")}
        primaryLabel="Start test"
        onPrimary={() => {
          setStarted(true);
          localStorage.setItem(readingStartedKey, "true");
          // Set expiry timestamp when test begins
          const durationSecs = (test.durationMinutes || 60) * 60;
          const expiry = Date.now() + (timeRemaining ?? durationSecs) * 1000;
          syncTimingState(expiry, durationSecs);
          // ensure timeRemaining is initialized if not yet
          if (timeRemaining === null) setTimeRemaining(durationSecs);
          // focus first question after small delay
          setTimeout(() => {
            setActiveQuestion(1);
            scrollToQuestion(1);
          }, 260);
        }}
        maxWidth={540}
      />
    );
  }

  const currentPassage = test.passages[currentPartIndex];

  // (moved earlier)

  // paletteParts is defined earlier (keeps hooks in stable order)

  // Calculate question range for current passage
  let startQuestionNumber = 1;
  for (let i = 0; i < currentPartIndex; i++) {
    const p = test.passages[i];
    const sections = p.sections || [{ questions: p.questions }];
    for (const s of sections) {
      startQuestionNumber += countQuestionsInSection(s.questions);
    }
  }

  // Get sections for current passage
  const currentSections = currentPassage.sections || [
    { questions: currentPassage.questions },
  ];
  let currentQuestionNumber = startQuestionNumber;

  // Total questions in current passage
  let totalQuestionsInPassage = 0;
  for (const s of currentSections) {
    totalQuestionsInPassage += countQuestionsInSection(s.questions);
  }

  // Render multiple choice many (checkboxes) - Multi-select style (matching listening)
  const renderMultipleChoiceMany = (question, startNumber, count = 2) => {
    const options = question.options || [];
    const questionKey = `q_${startNumber}`;
    const selectedAnswers = answers[questionKey] || [];
    const endNumber = startNumber + count - 1;

    return (
      <div
        id={`question-${startNumber}`}
        key={startNumber}
        className={`multi-select-container ${
          activeQuestion === startNumber ? "active" : ""
        }`}
      >
        {/* Question number badge + text */}
        <div className="multi-select-header">
          <span className="multi-select-badge">{startNumber}-{endNumber}</span>
          <span className="multi-select-question-text">{question.questionText}</span>
        </div>
        
        {/* Options with checkboxes */}
        <div className="multi-select-options">
          {options.map((opt, idx) => {
            const optionId = `q_${startNumber}checkbox${idx}`;
            const isSelected = selectedAnswers.includes(idx);
            // Check if option already has letter prefix like "A. " or "A "
            const hasPrefix = /^[A-Z][.\s]/.test(opt);
            const letterLabel = String.fromCharCode(65 + idx); // A, B, C...

            return (
              <label
                key={idx}
                htmlFor={optionId}
                className={`multi-select-option ${isSelected ? "selected" : ""}`}
              >
                <input
                  id={optionId}
                  type="checkbox"
                  className="multi-select-checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    handleCheckboxChange(questionKey, idx, e.target.checked, count)
                  }
                  onFocus={() => setActiveQuestion(startNumber)}
                  disabled={submitted}
                />
                <span className="multi-select-option-text">
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

  // Render question based on type
  const renderQuestion = (question, questionNumber) => {
    const key = `q_${questionNumber}`;
    const qType = normalizeQuestionType(
      question.type || question.questionType || "multiple-choice"
    );
    const baseQuestionNum =
      resolveQuestionStartNumber(question, questionNumber) || questionNumber;
    const isParagraphMatching = qType === "paragraph-matching";
    const paragraphBlankCount =
      isParagraphMatching && question.questionText
        ? (question.questionText.match(/(\.{3,}|…+)/g) || []).length
        : 0;
    let isAnswered = false;
    if (isParagraphMatching && paragraphBlankCount > 0) {
      for (let i = 0; i < paragraphBlankCount; i++) {
        if (
          answers[`${key}_${i}`] &&
          answers[`${key}_${i}`].toString().trim() !== ""
        ) {
          isAnswered = true;
          break;
        }
      }
    } else {
      isAnswered = answers[key] && answers[key].toString().trim() !== "";
    }

    const isActive = activeQuestion === questionNumber;

    // For matching headings, each paragraph is a separate question
    const isMatchingHeadings = qType === "ielts-matching-headings";
    const paragraphCount = isMatchingHeadings
      ? (question.paragraphs || question.answers || []).length
      : 0;

    // For cloze test, count blanks
    const isClozeTest =
      qType === "cloze-test" || qType === "summary-completion";
    const clozeTable = isClozeTest ? getActiveClozeTable(question) : null;
    const clozeText = isClozeTest ? getClozeText(question) : null;
    const blankCount = isClozeTest ? countClozeBlanks(question) : 0;

    // Check if short answer has inline dots
    const isShortAnswerInline =
      (qType === "fill-in-blank" ||
        qType === "short-answer" ||
        qType === "fill-in-the-blanks") &&
      question.questionText &&
      (question.questionText.includes("…") ||
        question.questionText.includes("....") ||
        /_{2,}/.test(question.questionText));

    // Paragraph-matching: count blanks (ellipsis) as multiple items
    // (moved earlier)

    // Should hide single question number for multi-question blocks
    const isMultiSelectQuestion = qType === "multi-select";
    const isMultiQuestionBlock =
      isMatchingHeadings ||
      (isClozeTest && blankCount > 0) ||
      (isParagraphMatching && paragraphBlankCount > 0) ||
      isMultiSelectQuestion;

    const isInlineAnswerType =
      qType === "true-false-not-given" || qType === "yes-no-not-given";

    return (
      <div
        key={key}
        ref={(el) => (questionRefs.current[key] = el)}
        className={`question-item ${isAnswered ? "answered" : ""} ${
          isActive ? "active" : ""
        } ${isMultiQuestionBlock ? "matching-headings-block" : ""} ${
          isInlineAnswerType ? "inline-answer" : ""
        }`}
        onClick={() => setActiveQuestion(questionNumber)}
      >
        {/* Hide single question number for multi-question blocks - show range instead */}
        {!isMultiQuestionBlock && (
          <div className={`question-number ${isAnswered ? "answered" : ""}`}>
            {questionNumber}
          </div>
        )}

        <div
          className={`question-content ${
            isMultiQuestionBlock ? "full-width" : ""
          }`}
        >
          {/* Hide questionText for inline short answer (it's shown in inline) and cloze test (shown in passage) */}
          {question.questionText &&
            !isShortAnswerInline &&
            !(isClozeTest && clozeText) &&
            qType !== "paragraph-matching" &&
            !isInlineAnswerType && (
              <div
                className="question-text"
                dangerouslySetInnerHTML={{
                  __html:
                    qType === "sentence-completion" && answers[key]
                      ? (question.questionText || "").replace(
                          /_{3,}|…+/g,
                          `<span class="sentence-blank-intext">${answers[key]}</span>`
                        )
                      : question.questionText,
                }}
              />
            )}

          {/* Multiple Choice */}
          {qType === "multiple-choice" && (
            <div className="question-options">
              {(question.options || []).map((opt, oi) => {
                // Handle both string and object options {id, label, text}
                const optText =
                  typeof opt === "object" ? opt.text || opt.label || "" : opt;
                const optValue =
                  typeof opt === "object"
                    ? opt.id || opt.label || optText
                    : opt;

                return (
                  <label
                    key={oi}
                    className={`option-label ${
                      answers[key] === optValue ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={key}
                      value={optValue}
                      checked={answers[key] === optValue}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      className="option-input"
                    />
                    <span className="option-letter">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span
                      className="option-text"
                      dangerouslySetInnerHTML={{ __html: optText }}
                    />
                  </label>
                );
              })}
            </div>
          )}

          {/* Sentence completion - show dropdown (value stored as letter A/B/...) and a compact badge */}
          {qType === "sentence-completion" && (
            <div className="question-sentence-completion">
              <div className="sentence-completion-inline">
                <select
                  className={`sentence-select ${
                    answers[key] ? "answered" : ""
                  }`}
                  value={answers[key] || ""}
                  onChange={(e) => handleAnswerChange(key, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Choose ending"
                >
                  <option value="">-- Select --</option>
                  {(question.options || []).map((opt, oi) => (
                    <option key={oi} value={String.fromCharCode(65 + oi)}>
                      {`${String.fromCharCode(65 + oi)}. ${stripUnwantedHtml(
                        typeof opt === "object"
                          ? opt.text || opt.label || ""
                          : opt
                      )}`}
                    </option>
                  ))}
                </select>

                <span
                  className={`sentence-selected-badge ${
                    answers[key] ? "selected" : ""
                  }`}
                  aria-hidden
                >
                  {answers[key] ? answers[key] : ""}
                </span>
              </div>
            </div>
          )}

          {/* True/False/Not Given & Yes/No/Not Given - inline combobox with icon */}
          {(qType === "true-false-not-given" ||
            qType === "yes-no-not-given") && (
            <div className="tfng-inline">
              <select
                className={`tfng-select tfng-inline-select ${
                  answers[key] ? "answered" : ""
                }`}
                value={answers[key] || ""}
                onChange={(e) => handleAnswerChange(key, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={
                  qType === "true-false-not-given"
                    ? "Select True False Not Given"
                    : "Select Yes No Not Given"
                }
              >
                <option value="">--- Select ---</option>
                {qType === "true-false-not-given" ? (
                  <>
                    <option value="TRUE">TRUE</option>
                    <option value="FALSE">FALSE</option>
                    <option value="NOT GIVEN">NOT GIVEN</option>
                  </>
                ) : (
                  <>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    <option value="NOT GIVEN">NOT GIVEN</option>
                  </>
                )}
              </select>

              <span
                className={`tfng-selected-badge ${
                  answers[key] === "TRUE" || answers[key] === "YES"
                    ? "true"
                    : answers[key] === "FALSE" || answers[key] === "NO"
                    ? "false"
                    : answers[key] === "NOT GIVEN"
                    ? "not-given"
                    : ""
                }`}
              >
                {answers[key] === "TRUE" || answers[key] === "YES"
                  ? <InlineIcon name="correct" size={12} style={{ color: "currentColor" }} />
                  : answers[key] === "FALSE" || answers[key] === "NO"
                  ? <InlineIcon name="wrong" size={12} style={{ color: "currentColor" }} />
                  : answers[key] === "NOT GIVEN"
                  ? "?"
                  : ""}
              </span>

              <span
                className="question-text-inline"
                dangerouslySetInnerHTML={{
                  __html: question.questionText || "",
                }}
              />
            </div>
          )}

          {/* Paragraph Matching (e.g., Questions 14-18) */}
          {qType === "paragraph-matching" && (
            <div className="question-paragraph-matching">
              {(() => {
                // Options source: question.paragraphs (objects with id/label) or fallback to A-G
                const defaultOptions = [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G",
                  "H",
                  "I",
                ];
                let options = [];

                // Priority: 1) passageParagraphOptions (scanned from passage DOM) 2) structured currentPassage.paragraphs 3) question.paragraphs 4) default A-I
                if (
                  Array.isArray(passageParagraphOptions) &&
                  passageParagraphOptions.length
                ) {
                  options = passageParagraphOptions;
                } else if (
                  currentPassage &&
                  currentPassage.paragraphs &&
                  currentPassage.paragraphs.length
                ) {
                  options = currentPassage.paragraphs.map((p) =>
                    typeof p === "object"
                      ? {
                          id: (
                            p.id ||
                            p.label ||
                            p.paragraphId ||
                            ""
                          ).toString(),
                          excerpt: (p.text || p.content || p.excerpt || "")
                            .replace(/<[^>]+>/g, "")
                            .trim()
                            .slice(0, 120),
                        }
                      : { id: String(p), excerpt: "" }
                  );
                } else if (question.paragraphs && question.paragraphs.length) {
                  options = (question.paragraphs || []).map((p) =>
                    typeof p === "object"
                      ? {
                          id: (
                            p.id ||
                            p.label ||
                            p.paragraphId ||
                            ""
                          ).toString(),
                          excerpt: (p.text || p.content || p.excerpt || "")
                            .replace(/<[^>]+>/g, "")
                            .trim()
                            .slice(0, 120),
                        }
                      : { id: String(p), excerpt: "" }
                  );
                } else {
                  options = defaultOptions.map((l) => ({ id: l, excerpt: "" }));
                }

                if (question.questionText) {
                  // Replace inline dots/ellipses with a select dropdown
                  const cleanText = question.questionText
                    .replace(/<p[^>]*>/gi, "")
                    .replace(/<\/p>/gi, " ")
                    .replace(/<br\s*\/?>/gi, " ")
                    .trim();

                  return (
                    <div className="paragraph-matching-inline">
                      {(() => {
                        const parts = cleanText.split(/(\.{3,}|…+)/);
                        let blankCounter = 0;
                        return parts.map((part, idx) => {
                          if ((part || "").match(/\.{3,}|…+/)) {
                            const thisIndex = blankCounter++;
                            const thisKey = `${key}_${thisIndex}`;
                            const thisVal = answers[thisKey] || "";

                            // Build used set across ALL paragraph-matching questions in this passage
                            const used = new Set();
                            if (currentPassage && test) {
                              // compute starting question number for this passage
                              let startQuestionNumber = 1;
                              for (let i = 0; i < currentPartIndex; i++) {
                                const p = test.passages[i];
                                const sections = p.sections || [
                                  { questions: p.questions },
                                ];
                                sections.forEach(
                                  (s) =>
                                    (startQuestionNumber +=
                                      countQuestionsInSection(s.questions))
                                );
                              }

                              const currentSections =
                                currentPassage.sections || [
                                  { questions: currentPassage.questions },
                                ];
                              let qNum = startQuestionNumber;

                              /* eslint-disable no-loop-func */
                              currentSections.forEach((section) => {
                                (section.questions || []).forEach((q2) => {
                                  const qType2 =
                                    q2.type ||
                                    q2.questionType ||
                                    "multiple-choice";
                                  if (qType2 === "paragraph-matching") {
                                    const text = (q2.questionText || "")
                                      .replace(/<p[^>]*>/gi, "")
                                      .replace(/<\/p>/gi, " ")
                                      .replace(/<br\s*\/?/gi, " ")
                                      .trim();
                                    const parts2 = text
                                      ? text.split(/(\.{3,}|…+)/)
                                      : [];
                                    const blanks2 =
                                      parts2.filter(
                                        (p) => p && p.match(/\.{3,}|…+/)
                                      ).length || 1;

                                    for (let bi = 0; bi < blanks2; bi++) {
                                      const val =
                                        answers[`q_${qNum}_${bi}`] || "";
                                      if (val) used.add(val);
                                    }

                                    qNum += blanks2 || 1;
                                  } else if (
                                    qType2 === "ielts-matching-headings"
                                  ) {
                                    qNum +=
                                      (q2.paragraphs || q2.answers || [])
                                        .length || 1;
                                  } else if (
                                    qType2 === "cloze-test" ||
                                    qType2 === "summary-completion"
                                  ) {
                                    const blanks = countClozeBlanks(q2);
                                    qNum += blanks || 1;
                                  } else {
                                    qNum++;
                                  }
                                });
                              });
                              /* eslint-enable no-loop-func */
                            }

                            // Render an own row for this blank: show number, select and the sentence text
                            const sentence = (parts[idx + 1] || "").trim();

                            const row = (
                              <div
                                key={`blank-${thisIndex}`}
                                ref={(el) =>
                                  (questionRefs.current[
                                    `q_${questionNumber + thisIndex}`
                                  ] = el)
                                }
                                className={`paragraph-match-row ${
                                  thisVal ? "answered" : ""
                                }`}
                              >
                                <span className="paragraph-question-number">
                                  {questionNumber + thisIndex}
                                </span>
                                <div className="paragraph-row-inner">
                                  <select
                                    className={`heading-select ${
                                      thisVal ? "answered" : ""
                                    }`}
                                    value={thisVal}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      handleAnswerChange(thisKey, v);
                                      if (v) handleParagraphHighlight(v);
                                      else handleParagraphUnhighlight();
                                    }}
                                  >
                                    <option value="" disabled>
                                      Choose...
                                    </option>
                                    {options.map((opt) => (
                                      <option
                                        key={opt.id}
                                        value={opt.id}
                                      >
                                        {opt.id}
                                      </option>
                                    ))}
                                  </select>

                                  <div
                                    className="paragraph-text"
                                    dangerouslySetInnerHTML={{
                                      __html: sentence,
                                    }}
                                  />
                                </div>
                              </div>
                            );

                            // Skip the sentence text part since we've rendered it with the select
                            parts[idx + 1] = "";
                            return row;
                          }

                          return (
                            <span
                              key={idx}
                              dangerouslySetInnerHTML={{ __html: part }}
                            />
                          );
                        });
                      })()}
                    </div>
                  );
                }

                // If no inline blank, render select below the question text (or alone)
                return (
                  <div className="paragraph-matching-row">
                    {question.questionText && (
                      <div
                        className="paragraph-question-text"
                        dangerouslySetInnerHTML={{
                          __html: question.questionText,
                        }}
                      />
                    )}
                    {(() => {
                      const singleKey = `${key}_0`;
                      const singleValue = answers[singleKey] || "";

                      // Compute used set across passage (disable letters chosen by other paragraph-matching questions)
                      const used = new Set();
                      if (currentPassage && test) {
                        let startQuestionNumber = 1;
                        for (let i = 0; i < currentPartIndex; i++) {
                          const p = test.passages[i];
                          const sections = p.sections || [
                            { questions: p.questions },
                          ];
                          for (const s of sections) {
                            startQuestionNumber += countQuestionsInSection(
                              s.questions
                            );
                          }
                        }

                        const currentSections = currentPassage.sections || [
                          { questions: currentPassage.questions },
                        ];
                        let qNum = startQuestionNumber;
                        /* eslint-disable no-loop-func */
                        currentSections.forEach((section) => {
                          (section.questions || []).forEach((q2) => {
                            const qType2 =
                              q2.type || q2.questionType || "multiple-choice";
                            if (qType2 === "paragraph-matching") {
                              const text = (q2.questionText || "")
                                .replace(/<p[^>]*>/gi, "")
                                .replace(/<\/p>/gi, " ")
                                .replace(/<br\s*\/?/gi, " ")
                                .trim();
                              const parts2 = text
                                ? text.split(/(\.{3,}|…+)/)
                                : [];
                              const blanks2 =
                                parts2.filter((p) => p && p.match(/\.{3,}|…+/))
                                  .length || 1;
                              for (let bi = 0; bi < blanks2; bi++) {
                                const val = answers[`q_${qNum}_${bi}`] || "";
                                if (val) used.add(val);
                              }

                              qNum += blanks2 || 1;
                            } else if (qType2 === "ielts-matching-headings") {
                              qNum +=
                                (q2.paragraphs || q2.answers || []).length || 1;
                            } else if (
                              qType2 === "cloze-test" ||
                              qType2 === "summary-completion"
                            ) {
                              const blanks = countClozeBlanks(q2);
                              qNum += blanks || 1;
                            } else {
                              qNum++;
                            }
                          });
                        });
                        /* eslint-enable no-loop-func */
                      }

                      return (
                        <select
                          className={`heading-select ${
                            singleValue ? "answered" : ""
                          }`}
                          value={singleValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            handleAnswerChange(singleKey, v);
                            if (v) handleParagraphHighlight(v);
                            else handleParagraphUnhighlight();
                          }}
                        >
                          <option value="" disabled>
                            Choose...
                          </option>
                          {options.map((opt) => (
                            <option
                              key={opt.id}
                              value={opt.id}
                            >
                              {opt.id}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Fill in Blank / Short Answer - Inline style */}
          {(qType === "fill-in-blank" ||
            qType === "short-answer" ||
            qType === "fill-in-the-blanks") && (
            <div className="question-fill-inline">
              {/* If questionText contains blanks (.....), replace with input */}
              {isShortAnswerInline ? (
                <div className="inline-fill-text">
                  {(() => {
                    // Strip <p> tags and clean up HTML for inline display
                    const cleanText = question.questionText
                      .replace(/<p[^>]*>/gi, "")
                      .replace(/<\/p>/gi, " ")
                      .replace(/<br\s*\/?>/gi, " ")
                      .trim();

                    return cleanText.split(/(\.{3,}|…+|_{2,})/).map((part, idx) => {
                      if (part.match(/\.{3,}|…+|_{2,}/)) {
                        return (
                          <input
                            key={idx}
                            ref={(el) =>
                              (questionRefs.current[`q_${questionNumber}`] = el)
                            }
                            type="text"
                            className={`inline-fill-input ${
                              answers[key] ? "answered" : ""
                            }`}
                            value={answers[key] || ""}
                            onChange={(e) =>
                              handleAnswerChange(key, e.target.value)
                            }
                            placeholder=""
                          />
                        );
                      }
                      // Skip empty parts
                      if (!part.trim()) return null;
                      return <span key={idx}>{part}</span>;
                    });
                  })()}
                </div>
              ) : (
                <input
                  type="text"
                  className={`fill-input ${isAnswered ? "answered" : ""}`}
                  value={answers[key] || ""}
                  onChange={(e) => handleAnswerChange(key, e.target.value)}
                  placeholder=""
                />
              )}
            </div>
          )}

          {/* Multi-Select */}
          {qType === "multi-select" && renderMultipleChoiceMany(question, questionNumber, question.requiredAnswers || 2)}

          {/* Matching */}
          {qType === "matching" && (
            <div className="question-matching">
              <div className="matching-items">
                {(question.leftItems || question.matchingPairs || []).map(
                  (item, idx) => {
                    const leftText =
                      typeof item === "string"
                        ? item
                        : item.left || item.paragraph || "";
                    const currentValues = answers[key]
                      ? answers[key].split(",")
                      : [];

                    return (
                      <div key={idx} className="matching-row">
                        <span className="matching-letter">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="matching-left">{leftText}</span>
                        <span className="matching-arrow">→</span>
                        <select
                          className={`matching-select ${
                            currentValues[idx] ? "answered" : ""
                          }`}
                          value={currentValues[idx] || ""}
                          onChange={(e) => {
                            const newValues = [...currentValues];
                            while (newValues.length <= idx) newValues.push("");
                            newValues[idx] = e.target.value;
                            handleAnswerChange(key, newValues.join(","));
                          }}
                        >
                          <option value="" disabled>
                            Choose...
                          </option>
                          {(
                            question.rightItems ||
                            question.matchingOptions ||
                            []
                          ).map((opt, ri) => (
                            <option key={ri} value={ri + 1}>
                              {ri + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                )}
              </div>

              {question.rightItems && (
                <div className="matching-options-list">
                  <p className="matching-options-title">Options:</p>
                  {question.rightItems.map((item, idx) => {
                    const itemText =
                      typeof item === "object"
                        ? item.text || item.label || ""
                        : item;
                    return (
                      <div key={idx} className="matching-option">
                        <span className="matching-option-number">
                          {idx + 1}.
                        </span>
                        <span>{itemText}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* IELTS Matching Headings */}
          {qType === "ielts-matching-headings" && (
            <div className="question-matching-headings">
              {/* Question range header */}
              <div className="matching-headings-header">
                <span className="matching-range-badge">
                  Questions {baseQuestionNum}–{baseQuestionNum + paragraphCount - 1}
                </span>
              </div>

              {/* List of headings */}
              <div className="headings-list">
                <p className="headings-title"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><InlineIcon name="document" size={14} />List of Headings</span></p>
                {(question.headings || []).map((heading, hi) => {
                  const headingText =
                    typeof heading === "object"
                      ? heading.text || heading.label || ""
                      : heading;
                  return (
                    <div key={hi} className="heading-item">
                      <span className="heading-number">
                        {[
                          "i",
                          "ii",
                          "iii",
                          "iv",
                          "v",
                          "vi",
                          "vii",
                          "viii",
                          "ix",
                          "x",
                        ][hi] || hi + 1}
                        .
                      </span>
                      <span className="heading-text">{headingText}</span>
                    </div>
                  );
                })}
              </div>

              {/* Paragraphs to match - with question numbers */}
              <div className="paragraphs-match">
                {(question.paragraphs || question.answers || []).map(
                  (para, pi) => {
                    const paragraphId =
                      typeof para === "object"
                        ? para.id || para.paragraphId
                        : para;
                    let currentAnswerObj = {};
                    try {
                      currentAnswerObj = answers[key]
                        ? JSON.parse(answers[key])
                        : {};
                    } catch (e) {
                      currentAnswerObj = {};
                    }
                    const selectedHeading = currentAnswerObj[paragraphId];
                    const actualQuestionNum = baseQuestionNum + pi;

                    return (
                      <div
                        key={pi}
                        ref={(el) =>
                          (questionRefs.current[`q_${actualQuestionNum}`] = el)
                        }
                        className={`paragraph-match-row ${
                          selectedHeading !== undefined &&
                          selectedHeading !== ""
                            ? "answered"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveQuestion(actualQuestionNum);
                        }}
                        onMouseEnter={() =>
                          handleParagraphHighlight(paragraphId)
                        }
                        onMouseLeave={handleParagraphUnhighlight}
                      >
                        <span className="paragraph-question-number">
                          {actualQuestionNum}
                        </span>
                        <span className="paragraph-label">
                          Paragraph {paragraphId}
                        </span>
                        <select
                          className={`heading-select ${
                            selectedHeading !== undefined &&
                            selectedHeading !== ""
                              ? "answered"
                              : ""
                          }`}
                          value={
                            selectedHeading !== undefined ? selectedHeading : ""
                          }
                          onChange={(e) =>
                            handleMatchingHeadingsChange(
                              key,
                              paragraphId,
                              e.target.value
                            )
                          }
                          onFocus={() => setActiveQuestion(actualQuestionNum)}
                        >
                          <option value="">Choose a heading...</option>
                          {(question.headings || []).map((heading, hi) => {
                            const headingText =
                              typeof heading === "object"
                                ? heading.text || heading.label || ""
                                : heading;
                            const romanNum =
                              [
                                "i",
                                "ii",
                                "iii",
                                "iv",
                                "v",
                                "vi",
                                "vii",
                                "viii",
                                "ix",
                                "x",
                              ][hi] || hi + 1;
                            return (
                              <option key={hi} value={romanNum}>
                                {romanNum}. {headingText}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Cloze Test / Summary Completion */}
          {(qType === "cloze-test" || qType === "summary-completion") && (
            <div className="question-cloze">
              {/* Question range header for cloze test */}
              {blankCount > 0 && (
                <div className="cloze-header">
                  {isTeacher && (
                    <span className="cloze-range-badge">
                      Questions {baseQuestionNum}–{baseQuestionNum + blankCount - 1}
                    </span>
                  )}
                  {question.maxWords && !isTeacher && (
                    <span className="cloze-max-words">
                      ℹ️ No more than {question.maxWords} word(s) for each
                      answer
                    </span>
                  )}
                </div>
              )}

              {question.wordBank && question.wordBank.length > 0 && (
                <div className="word-bank">
                  <p className="word-bank-title"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><InlineIcon name="writing" size={14} />Word Bank:</span></p>
                  <div className="word-bank-items">
                    {question.wordBank.map((word, wi) => {
                      const wordText =
                        typeof word === "object"
                          ? word.text || word.label || ""
                          : word;
                      return (
                        <span key={wi} className="word-bank-item">
                          {wordText}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If passage text exists with [BLANK], render inline */}
              {(() => {
                if (clozeTable) {
                  const table = clozeTable;
                  let blankIndex = 0;
                  const renderTableCellParts = (parts, ri, ci, lineIndex) =>
                    parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return <span key={`${ri}-${ci}-${lineIndex}-${partIndex}`}>{part.value}</span>;
                      }

                      const currentBlankIdx = blankIndex++;
                      const blankNum = baseQuestionNum + currentBlankIdx;
                      const blankKey = `${key}_${currentBlankIdx}`;

                      const blankInput = question.options && question.options.length > 0 ? (
                        <select
                          className={'cloze-inline-select ' + (answers[blankKey] ? 'answered' : '')}
                          value={answers[blankKey] || ''}
                          onChange={(e) => handleAnswerChange(blankKey, e.target.value)}
                          onFocus={() => setActiveQuestion(blankNum)}
                        >
                          <option value="">--</option>
                          {question.options.map((opt, oi) => (
                            <option key={oi} value={String.fromCharCode(65 + oi)}>
                              {`${String.fromCharCode(65 + oi)}. ${stripUnwantedHtml(
                                typeof opt === 'object' ? opt.text || opt.label || '' : opt
                              )}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={'cloze-inline-input ' + (answers[blankKey] ? 'answered' : '')}
                          value={answers[blankKey] || ''}
                          onChange={(e) => handleAnswerChange(blankKey, e.target.value)}
                          onFocus={() => setActiveQuestion(blankNum)}
                        />
                      );

                      return (
                        <span
                          key={`${ri}-${ci}-${lineIndex}-blank-${partIndex}`}
                          className="cloze-inline-wrapper"
                          ref={(el) => (questionRefs.current[`q_${blankNum}`] = el)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveQuestion(blankNum);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span className="cloze-inline-number">{blankNum}</span>
                          {blankInput}
                        </span>
                      );
                    });

                  return (
                    <div className="cloze-table-wrapper" style={{ overflowX: 'auto' }}>
                      {table.instruction && (
                        <div style={{ fontStyle: 'italic', marginBottom: 8 }}>{table.instruction}</div>
                      )}
                      {table.title && (
                        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>{table.title}</div>
                      )}
                      <table className="cloze-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {(table.columns || []).map((col, ci) => (
                              <th key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px', background: '#e0f2fe' }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(table.rows || []).map((row, ri) => (
                            <tr key={ri}>
                              {(table.columns || []).map((col, ci) => {
                                const cellValue = row.cells?.[ci] || '';
                                const lineParts = getClozeTableCellLines(cellValue, col);

                                return (
                                  <td key={ci} style={{ border: '1px solid #cbd5e1', padding: '8px', verticalAlign: 'top' }}>
                                    {isClozeCommentsColumn(col) ? (
                                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {lineParts.map((parts, lineIndex) => (
                                          <li key={`${ri}-${ci}-${lineIndex}`}>
                                            {renderTableCellParts(parts, ri, ci, lineIndex)}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      lineParts.map((parts, lineIndex) => (
                                        <React.Fragment key={`${ri}-${ci}-${lineIndex}`}>
                                          {lineIndex > 0 ? <br /> : null}
                                          {renderTableCellParts(parts, ri, ci, lineIndex)}
                                        </React.Fragment>
                                      ))
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                if (clozeText && clozeText.includes("[BLANK]")) {
                  return (
                    <div className="cloze-passage">
                      {renderHtmlWithBlankPlaceholders(
                        clozeText,
                        (blankIndex, blankElementKey) => {
                          const blankNum = baseQuestionNum + blankIndex;
                          const answerKey = `${key}_${blankIndex}`;

                          return (
                            <span
                              key={blankElementKey}
                              className="cloze-inline-wrapper"
                              ref={(el) => (questionRefs.current[`q_${blankNum}`] = el)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQuestion(blankNum);
                              }}
                            >
                              <span className="cloze-inline-number">{blankNum}</span>
                              {question.options && question.options.length > 0 ? (
                                <select
                                  className={'cloze-inline-select ' + (answers[answerKey] ? 'answered' : '')}
                                  value={answers[answerKey] || ''}
                                  onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                  onFocus={() => setActiveQuestion(blankNum)}
                                >
                                  <option value="">--</option>
                                  {question.options.map((opt, oi) => (
                                    <option key={oi} value={String.fromCharCode(65 + oi)}>
                                      {`${String.fromCharCode(65 + oi)}. ${stripUnwantedHtml(
                                        typeof opt === 'object' ? opt.text || opt.label || '' : opt
                                      )}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className={'cloze-inline-input ' + (answers[answerKey] ? 'answered' : '')}
                                  value={answers[answerKey] || ''}
                                  onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                  onFocus={() => setActiveQuestion(blankNum)}
                                  placeholder=""
                                />
                              )}
                            </span>
                          );
                        },
                        `${key}-cloze`
                      )}
                    </div>
                  );
                }

                return (question.blanks || []).map((blank, bi) => {
                  const blankQuestionNum = questionNumber + bi;
                  return (
                    <div
                      key={bi}
                      ref={(el) =>
                        (questionRefs.current[`q_${blankQuestionNum}`] = el)
                      }
                      className="cloze-blank-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveQuestion(blankQuestionNum);
                      }}
                    >
                      <span className="cloze-blank-number">
                        {blank.id || blankQuestionNum}.
                      </span>
                      {question.options && question.options.length > 0 ? (
                        <select
                          className={'cloze-select ' + (answers[key + '_' + bi] ? 'answered' : '')}
                          value={answers[key + '_' + bi] || ""}
                          onChange={(e) =>
                            handleAnswerChange(key + '_' + bi, e.target.value)
                          }
                          onFocus={() => setActiveQuestion(blankQuestionNum)}
                        >
                          <option value="">-- Select --</option>
                          {question.options.map((opt, oi) => (
                            <option key={oi} value={String.fromCharCode(65 + oi)}>
                              {`${String.fromCharCode(65 + oi)}. ${stripUnwantedHtml(
                                typeof opt === "object" ? opt.text || opt.label || "" : opt
                              )}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={'cloze-input ' + (answers[key + '_' + bi] ? 'answered' : '')}
                          value={answers[key + '_' + bi] || ""}
                          onChange={(e) =>
                            handleAnswerChange(key + '_' + bi, e.target.value)
                          }
                          onFocus={() => setActiveQuestion(blankQuestionNum)}
                          placeholder="Type answer..."
                        />
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reading-test-container">
      <ExtensionToast message={extensionToast} />
      {/* Enhanced Header */}
      <header className="reading-test-header">
        <div className="header-left">
          <div className="test-badge">IELTS</div>
          <div className="test-info">
            <h1>{test.title || "Reading Test"}</h1>
            <p className="test-meta">
              {test.passages.length} Passage
              {test.passages.length > 1 ? "s" : ""} • {stats.total} Questions
            </p>
          </div>
        </div>

        <div className="header-right">
          {/* Enhanced Timer */}
          <div
            className={`timer-container ${timerWarning ? "warning" : ""} ${
              timerCritical ? "critical" : ""
            }`}
          >
            <div className="timer-icon"><InlineIcon name="clock" size={16} /></div>
            <div className="timer-display">
              <span className="timer-value">{formatTime(timeRemaining)}</span>
              <span className="timer-label">remaining</span>
            </div>
            {timerCritical && (
              <div className="timer-critical-badge pulse"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><InlineIcon name="average" size={14} />Last minute!</span></div>
            )}
          </div>

          {/* Progress indicator */}
          <div className="progress-container">
            <div className="progress-ring">
              <svg viewBox="0 0 36 36">
                <path
                  className="progress-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-bar"
                  strokeDasharray={`${
                    stats.total > 0 ? (stats.answered / stats.total) * 100 : 0
                  }, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="progress-text">
                <span className="progress-value">{stats.answered}</span>
                <span className="progress-total">/{stats.total}</span>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="auto-save-indicator">
            <span className="save-icon"><InlineIcon name="save" size={14} /></span>
            <span className="save-text">Auto-saved</span>
          </div>

          {/* Submit button */}
          <button
            data-testid="submit-button"
            onClick={handleSubmit}
            disabled={submitted}
            className="submit-button"
          >
            {submitted ? (
              <>
                <LineIcon name="correct" size={16} strokeWidth={2.2} /> Submitted
              </>
            ) : (
              <>
                <span className="submit-icon">
                  <LineIcon name="review" size={18} strokeWidth={2.1} />
                </span>
                <span className="submit-text">Submit</span>
              </>
            )}
          </button>
        </div>
      </header>

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

      {/* Main Content */}
      <main className="reading-test-main" ref={containerRef}>
        {/* Left: Passage */}
        <div
          className="reading-passage-column"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="passage-header">
            <div className="passage-part">PASSAGE {currentPartIndex + 1}</div>
            {currentPassage.passageTitle && (
              <h2 className="passage-title">{currentPassage.passageTitle}</h2>
            )}
          </div>

          <div ref={passageRef} className="passage-content">
            <div
              className="passage-text"
              dangerouslySetInnerHTML={{
                __html: processPassageText(currentPassage.passageText || ""),
              }}
            />
          </div>

          {/* Part Navigation */}
          <div className="part-navigation">
            <button
              className="nav-btn prev"
              disabled={currentPartIndex === 0}
              onClick={() => goToPart(Math.max(0, currentPartIndex - 1))}
            >
              <span className="nav-icon">←</span>
              <span className="nav-text">Previous</span>
            </button>

            <div className="part-indicators">
              {test.passages.map((_, idx) => (
                <button
                  key={idx}
                  data-testid={`part-dot-${idx}`}
                  className={`part-dot ${
                    idx === currentPartIndex ? "active" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPart(idx);
                  }}
                  title={`Passage ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              className="nav-btn next"
              disabled={currentPartIndex === test.passages.length - 1}
              onClick={() =>
                goToPart(
                  Math.min(test.passages.length - 1, currentPartIndex + 1)
                )
              }
            >
              <span className="nav-text">Next</span>
              <span className="nav-icon">→</span>
            </button>
          </div>
        </div>

        {/* Resizable Divider */}
        <div className="resizable-divider" onMouseDown={handleMouseDown}>
          <div className="divider-handle">
            <span className="divider-dots">⋮⋮</span>
          </div>
        </div>

        {/* Right: Questions */}
        <div
          className="reading-questions-column"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="questions-header">
            <h3>Questions</h3>
            <span className="questions-range">
              {startQuestionNumber}–
              {startQuestionNumber + totalQuestionsInPassage - 1}
            </span>
          </div>

          <div className="questions-list">
            {currentSections.map((section, sectionIdx) => {
              const sectionQuestions = section.questions || [];
              
              // Extract starting question number from section instructions (e.g., "Questions 10-11" -> 10)
              const extractSectionStartNumber = (instruction) => {
                if (!instruction) return null;
                // Strip HTML tags first
                const plainText = instruction.replace(/<[^>]*>/g, '');
                const match = plainText.match(/[Qq]uestions?\s+(\d+)/);
                return match ? parseInt(match[1], 10) : null;
              };
              
              const sectionStartNumber = extractSectionStartNumber(section.sectionInstruction);
              let sectionQuestionNumber = sectionStartNumber || currentQuestionNumber;

              return (
                <div key={sectionIdx} className="question-section">
                  {/* Section header */}
                  {(section.sectionTitle || section.sectionInstruction) && (
                    <div className="section-header">
                      {section.sectionTitle && (
                        <h4 className="section-title">
                          {section.sectionTitle}
                        </h4>
                      )}
                      {section.sectionInstruction && (
                        <p
                          className="section-instruction"
                          dangerouslySetInnerHTML={{
                            __html: section.sectionInstruction,
                          }}
                        />
                      )}
                      {section.sectionImage && (
                        <img
                          src={
                            section.sectionImage.startsWith("http")
                              ? section.sectionImage
                              : hostPath(section.sectionImage)
                          }
                          alt="Section diagram"
                          className="section-image"
                        />
                      )}
                    </div>
                  )}

                  {/* If this section contains sentence-completion questions, render the List of Endings once */}
                  {sectionQuestions.some(
                    (sq) =>
                      (sq.type || sq.questionType) === "sentence-completion"
                  ) &&
                    (() => {
                      // If teacher already added a List of Endings in sectionInstruction or the passage text,
                      // don't render our duplicate list.
                      const hasTeacherList =
                        (section.sectionInstruction &&
                          section.sectionInstruction
                            .toLowerCase()
                            .includes("list of endings")) ||
                        (currentPassage &&
                          currentPassage.passageText &&
                          currentPassage.passageText
                            .toLowerCase()
                            .includes("list of endings"));

                      if (hasTeacherList) return null;

                      const scQ = sectionQuestions.find(
                        (sq) =>
                          (sq.type || sq.questionType) === "sentence-completion"
                      );
                      const scOptions =
                        scQ && scQ.options && scQ.options.length
                          ? scQ.options
                          : [];
                      const usedLetters = new Set(
                        Object.values(answers || {}).filter(Boolean)
                      );
                      return (
                        <div className="sentence-completion-options">
                          <p className="sc-title">List of Endings</p>
                          <ul className="sc-list">
                            {scOptions.map((opt, oi) => {
                              const letter = String.fromCharCode(65 + oi);
                              return (
                                <li
                                  key={oi}
                                  className={`sc-item ${
                                    usedLetters.has(letter) ? "used" : ""
                                  }`}
                                >
                                  <span className="sc-letter">{letter}</span>
                                  <span
                                    className="sc-text"
                                    dangerouslySetInnerHTML={{
                                      __html: stripUnwantedHtml(opt),
                                    }}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })()}

                  {/* Questions */}
                  {sectionQuestions.map((q) => {
                    // Allow explicit per-question numbering (e.g., teacher set '11' or '11-13')
                    let qNum = sectionQuestionNumber;
                    if (q && q.questionNumber) {
                      const firstPart = String(q.questionNumber).trim().split(/[, -]/)[0];
                      const parsed = parseInt(firstPart, 10);
                      if (!Number.isNaN(parsed)) {
                        qNum = parsed;
                        // ensure subsequent questions continue from this explicit start
                        sectionQuestionNumber = parsed;
                      }
                    }

                    const qType = normalizeQuestionType(
                      q.type || q.questionType || "multiple-choice"
                    );

                    // For matching headings, count each paragraph as a question
                    if (qType === "ielts-matching-headings") {
                      const paragraphCount = (q.paragraphs || q.answers || [])
                        .length;
                      sectionQuestionNumber += paragraphCount || 1;
                    }
                    // For paragraph-matching, count each ellipsis as separate question
                    else if (qType === "paragraph-matching") {
                      const clean = (q.questionText || "")
                        .replace(/<p[^>]*>/gi, "")
                        .replace(/<\/p>/gi, " ")
                        .replace(/<br\s*\/?/gi, " ")
                        .trim();
                      const parts = clean ? clean.split(/(\.{3,}|…+)/) : [];
                      const blankMatches = parts.filter(
                        (p) => p && p.match(/\.{3,}|…+/)
                      );
                      sectionQuestionNumber += blankMatches.length || 1;
                    }
                    // For multi-select, count as requiredAnswers questions
                    else if (qType === "multi-select") {
                      const requiredAnswers = q.requiredAnswers || 2;
                      sectionQuestionNumber += requiredAnswers;
                    }
                    // For cloze test, count each blank as a question
                    else if (
                      qType === "cloze-test" ||
                      qType === "summary-completion"
                    ) {
                      const blankCount = countClozeBlanks(q);
                      sectionQuestionNumber += blankCount || 1;
                    } else {
                      sectionQuestionNumber++;
                    }
                    return renderQuestion(q, qNum);
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Question Navigation Grid */}
      <div className="question-nav-panel">
        <div className="nav-panel-header">
          <span className="nav-panel-title">Question Navigator</span>
          <span className="nav-panel-stats">
            <span className="stat-answered"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><InlineIcon name="correct" size={12} />{stats.answered}</span></span>
            <span className="stat-divider">|</span>
            <span className="stat-remaining">
              ○ {stats.total - stats.answered}
            </span>
          </span>
        </div>
        <div
          className="question-nav-grid palette-inline"
          ref={paletteContainerRef}
        >
          {paletteParts.map((part) => (
            <div
              key={part.index}
              data-part={part.index}
              data-testid={`palette-part-${part.index}`}
              className={`palette-part inline ${
                expandedPart === part.index ? "expanded" : ""
              }`}
            >
              <button
                data-testid={`palette-part-toggle-${part.index}`}
                className={`palette-part-toggle ${
                  expandedPart === part.index ? "open" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPartIndex(part.index);
                  togglePart(part.index);
                  setActiveQuestion(null);
                }}
                type="button"
              >
                <span className="part-label">Part {part.index + 1}</span>
                <span className="part-status">
                  <span className="number">{part.answered}</span> of{" "}
                  <span className="total">{part.count}</span>
                </span>
                <span className="part-caret">
                  {expandedPart === part.index ? "▾" : "▸"}
                </span>
              </button>

              <div
                ref={(el) => (partItemsRefs.current[part.index] = el)}
                className={`palette-part-items ${
                  expandedPart === part.index ? "open" : "closed"
                }`}
                aria-hidden={expandedPart === part.index ? "false" : "true"}
              >
                {buildQuestionGroups(part.index).map((group, idx) => {
                  const isAnswered = group.type === "multi-select"
                    ? isQuestionAnswered(group.start)
                    : group.type === "single"
                    ? isQuestionAnswered(group.start)
                    : Array.from({ length: group.count }, (_, i) => group.start + i).every((n) => isQuestionAnswered(n));
                  const isActive = group.type === "single"
                    ? activeQuestion === group.start
                    : activeQuestion >= group.start && activeQuestion <= group.end;
                  const label = group.type === "single" ? group.start : `${group.start}-${group.end}`;
                  const isMerged = group.type === "multi-select";
                  
                  return (
                    <button
                      key={idx}
                      data-num={group.start}
                      data-testid={`nav-question-${group.start}`}
                      className={`nav-question-btn ${
                        isAnswered ? "answered" : ""
                      } ${isActive ? "active" : ""} ${isMerged ? "merged" : ""}`}
                      title={
                        isAnswered ? `Questions ${label} answered` : `Questions ${label}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToQuestion(group.start);
                        setActiveQuestion(group.start);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => !timeUp && setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title={timeUp ? "Time is up" : "Submit reading test?"}
        message={
          timeUp
            ? "The time limit has ended. Your answers are being submitted automatically."
            : `You have answered ${stats.answered}/${stats.total} questions. Are you sure you want to submit?`
        }
        type={timeUp ? "warning" : "info"}
        iconName={timeUp ? "clock" : "reading"}
        confirmText={timeUp ? "Submit now" : "Submit answers"}
        cancelText="Keep working"
        hideCancel={timeUp}
        extraContent={
          !timeUp && stats.unanswered.length > 0 ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Unanswered questions: {stats.unanswered.length}
              </div>
              <div>
                {stats.unanswered.slice(0, 10).join(", ")}
                {stats.unanswered.length > 10 ? "..." : ""}
              </div>
            </div>
          ) : null
        }
      />

      {/* Result Modal shown after submit */}
      <ResultModal
        isOpen={resultModalOpen}
        onClose={() => {
          // When closing the result modal, reset started/timer so next visit is fresh
          // Also explicitly remove persisted localStorage keys synchronously to avoid races
          try {
            localStorage.removeItem(readingAnswersKey);
            localStorage.removeItem(readingExpiresKey);
            localStorage.removeItem(readingStartedKey);
            expiresAtRef.current = null;
          } catch (e) {
            // ignore
          }

          setResultModalOpen(false);
          setTimeRemaining(null);
          setStarted(false);
          setTimeUp(false);

          // Navigate student back to select-test page after closing modal
          try {
            navigate("/select-test");
          } catch (e) {
            /* ignore */
          }
        }}
        result={resultData}
        title="Reading Results"
        iconName="reading"
        onViewDetails={() => {
          setResultModalOpen(false);
          if (resultData && resultData.submissionId) {
            navigate(`/reading-results/${resultData.submissionId}`);
          } else {
            navigate(`/reading-results/${id}`, {
              state: { result: resultData },
            });
          }
        }}
      />
    </div>
  );
};

/* eslint-enable no-loop-func */

export default DoReadingTest;

