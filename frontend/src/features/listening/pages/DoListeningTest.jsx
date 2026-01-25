import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import ResultModal from "../../../shared/components/ResultModal";
import styles from "./DoListeningTest.styles";

/**
 * DoListeningTest - Trang làm bài thi Listening IELTS
 * Giao diện theo mẫu youpass.vn
 */
const DoListeningTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [expandedPart, setExpandedPart] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [audioPlayed, setAudioPlayed] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const listQuestionRef = useRef(null);

  // When switching parts via navigator/arrows, we may need to wait for the new part
  // to render before scrolling to the target question.
  const pendingScrollToRef = useRef(null);

  // Key for persisting timer across page reloads (resets only when the test is submitted)
  const expiresKey = `listening:${id}:expiresAt`;

  // Key for persisting full state (answers + expiresAt). Includes user id to allow per-user isolation.
  const userForStorage = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (e) {
      return null;
    }
  })();
  const storageUserId = userForStorage?.id || "anon";
  const stateKey = `listening:${id}:state:${storageUserId}`;

  const expiresAtRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`listening-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
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
        const stored = localStorage.getItem(expiresKey);
        if (stored) {
          const expiresAt = parseInt(stored, 10);
          const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
          setTimeRemaining(remaining);
        } else {
          const expiresAt = Date.now() + durationSeconds * 1000;
          localStorage.setItem(expiresKey, String(expiresAt));
          setTimeRemaining(durationSeconds);
        }

        // Restore saved answers+expires if present (resume after F5/power loss).
        try {
          const storedState = localStorage.getItem(stateKey);
          if (storedState) {
            const parsedState = JSON.parse(storedState);
            if (parsedState?.answers) {
              setAnswers(parsedState.answers);
            }
            if (parsedState?.expiresAt) {
              localStorage.setItem(expiresKey, String(parsedState.expiresAt));
              expiresAtRef.current = parsedState.expiresAt;
              const remaining = Math.max(0, Math.ceil((parsedState.expiresAt - Date.now()) / 1000));
              setTimeRemaining(remaining);
            }
          }
        } catch (e) {
          // ignore malformed storage
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id]);

  // Keep a ref to confirmSubmit to avoid referencing it before initialization in effects
  const confirmSubmitRef = useRef(null);

  // Timer countdown (compute remaining from persisted expiresAt to survive F5)
  // Auto-submit reliably even if the tab is backgrounded/throttled.
  useEffect(() => {
    if (submitted || !test) return;

    const stored = localStorage.getItem(expiresKey);
    const expiresAt = stored
      ? parseInt(stored, 10)
      : Date.now() + (test?.duration ? test.duration * 60 * 1000 : 30 * 60 * 1000);
    expiresAtRef.current = expiresAt;

    let done = false;
    const tick = () => {
      if (done) return;
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        done = true;
        // call via ref so effect doesn't require confirmSubmit in its deps
        if (confirmSubmitRef.current) confirmSubmitRef.current();
      }
    };

    // Run immediately so reaching 00:00 triggers submit without waiting 1s.
    tick();

    const intervalId = setInterval(tick, 1000);
    const msUntilExpire = Math.max(0, expiresAt - Date.now());
    const timeoutId = setTimeout(tick, msUntilExpire + 50);

    const onCheck = () => tick();
    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [test, submitted, expiresKey]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} minutes remaining`;
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
      const res = await fetch(apiPath(`listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, user, studentName, studentId }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.message || "Lỗi khi nộp bài";
        const detail = payload?.error ? ` (${payload.error})` : "";
        throw new Error(`${msg}${detail}`);
      }

      const totalRaw = payload?.total ?? payload?.totalQuestions;
      const totalParsed = Number(totalRaw);
      const totalFinal = Number.isFinite(totalParsed) && totalParsed > 0 ? totalParsed : 40;

      const correctRaw = payload?.correct ?? payload?.score;
      const correctParsed = Number(correctRaw);
      const correctFinal = Number.isFinite(correctParsed) ? correctParsed : 0;

      const result = {
        submissionId: payload?.submissionId,
        total: totalFinal,
        correct: correctFinal,
        scorePercentage: payload?.scorePercentage ?? payload?.percentage,
        band: payload?.band,
      };

      setResultData(result);
      if (test?.showResultModal !== false) {
        setResultModalOpen(true);
      } else {
        alert("✅ Nộp bài thành công! Giáo viên sẽ xem kết quả của bạn.");
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
    } catch (err) {
      console.error("Error submitting:", err);
      alert(`❌ Có lỗi xảy ra khi nộp bài!${err?.message ? `\n${err.message}` : ""}`);
    }
  }, [answers, expiresKey, id, submitted]);

  // Keep ref up-to-date with the latest confirmSubmit implementation
  useEffect(() => {
    confirmSubmitRef.current = confirmSubmit;
  }, [confirmSubmit]);

  // Auto-save answers to localStorage (debounced) and sync across tabs.
  useEffect(() => {
    if (submitted) return;
    // Save function
    const saveState = () => {
      try {
        const expiresStored = localStorage.getItem(expiresKey);
        const expiresAt = expiresStored ? parseInt(expiresStored, 10) : expiresAtRef.current || null;
        const payload = { answers, expiresAt, lastSavedAt: Date.now() };
        localStorage.setItem(stateKey, JSON.stringify(payload));
      } catch (e) {
        // ignore
      }
    };

    // Debounced save on answers change
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveState, 500);

    // Periodic save (every 30s) to handle timer-only changes
    const intervalId = setInterval(saveState, 30000);

    // Save before unload
    const onBeforeUnload = () => {
      saveState();
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
            localStorage.setItem(expiresKey, String(parsed.expiresAt));
            expiresAtRef.current = parsed.expiresAt;
            const remaining = Math.max(0, Math.ceil((parsed.expiresAt - Date.now()) / 1000));
            setTimeRemaining(remaining);
          }
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("storage", onStorage);
    };
  }, [answers, submitted, stateKey, expiresKey]);

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

    // Notes-completion: number of blanks in notesText (supports both numbered and unnumbered blanks)
    if (typeof q.notesText === "string" && q.notesText.trim()) {
      // IMPORTANT: Only numbered blanks actually render inputs in renderNotesCompletion.
      // Unnumbered underscores are just placeholders and should not affect numbering/navigation.
      const blanks = q.notesText.match(/(\d+)\s*[_…]+/g) || [];
      return Math.max(1, blanks.length);
    }

    if (q.leftItems && q.leftItems.length > 0) {
      return Math.max(1, q.leftItems.length);
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
    const sectionType = String(section?.questionType || "fill").toLowerCase();

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
      const matches = String(firstQ?.notesText || "").match(/(\d+)\s*[_…]+/g) || [];
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
        const sectionQType = section.questionType || "fill";
        const sectionQuestions = partQuestions.filter((q) => q.sectionIndex === sIdx);
        const firstQ = sectionQuestions[0];
        
        if (sectionQType === "notes-completion" && firstQ?.notesText) {
          // Extract numbers from notes text
          const matches = firstQ.notesText.match(/(\d+)\s*[_…]+/g) || [];
          matches.forEach((match) => {
            const numMatch = match.match(/^(\d+)/);
            if (numMatch) {
              const num = parseInt(numMatch[1], 10);
              minNum = Math.min(minNum, num);
              maxNum = Math.max(maxNum, num);
            }
          });
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
        const sectionType = String(section?.questionType || "fill").toLowerCase();
        const sectionQuestions = getSectionQuestions(sectionIndex);
        if (!sectionQuestions.length) return;

        const firstQ = sectionQuestions[0];

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
            const matches = notesText.match(/(\d+)\s*[_…]+/g) || [];
            matches.forEach((token) => {
              const m = token.match(/^(\d+)/);
              if (!m) return;
              const num = parseInt(m[1], 10);
              if (Number.isFinite(num)) slots.push({ type: "single", key: `q${num}` });
            });
          }
          // Update currentStart for next section
          if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
            const keys = numericKeys(firstQ?.answers);
            const matches = String(firstQ?.notesText || "").match(/(\d+)\s*[_…]+/g) || [];
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
        const parts = ans.split(/[,|\/]/).map((s) => s.trim()).filter(Boolean);
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
  const timerWarning = timeRemaining <= 300 && timeRemaining > 60; // < 5 min
  const timerCritical = timeRemaining <= 60; // < 1 min

  // Scroll to question
  const scrollToQuestion = useCallback((qNum) => {
    const el = questionRefs.current[qNum];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveQuestion(qNum);
      // try to focus the first interactive control inside the question for better UX
      try {
        const input = el.querySelector("input, select, textarea, button");
        if (input) input.focus({ preventScroll: true });
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
          audioRef.current.currentTime = audioRef.current.duration;
        }
        alert("⚠️ Audio này chỉ được nghe 1 lần!");
      }
    },
    [audioPlayed]
  );

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
            const hasPrefix = /^[A-Z][\.\s]/.test(opt);
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
                      style={styles.matchingSelect}
                    >
                      <option value="">--</option>
                      {rightItems.map((_, optIdx) => (
                        <option key={optIdx} value={String.fromCharCode(65 + optIdx)}>
                          {String.fromCharCode(65 + optIdx)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - list of options */}
        <div style={styles.matchingRight}>
          <div style={styles.optionsTitle}>List of options</div>
          <div style={styles.optionsContainer}>
            {rightItems.map((opt, idx) => {
              const optText = typeof opt === 'object' ? (opt.text || opt.label || JSON.stringify(opt)) : opt;
              // Check if optText already has letter prefix like "A. " or "A "
              const hasPrefix = /^[A-Z][\.\s]/.test(optText);
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
          Không có câu hỏi cho section này. Vui lòng kiểm tra lại đề thi.
        </div>
      );
    }
    
    return (
      <div style={styles.fillQuestionsContainer}>
        {questions.map((q) => renderFillQuestion(q, q.globalNumber))}
      </div>
    );
  };

  // Render a section based on question type
  const renderSection = (section, sectionIndex) => {
    const sectionQuestions = currentPartQuestions.filter(
      (q) => q.sectionIndex === sectionIndex
    );
    if (sectionQuestions.length === 0) return null;

    const firstQ = sectionQuestions[0];
    
    // Detect question type - priority order:
    // 1) section.questionType (from partInstructions - most reliable)
    // 2) explicit questionType from question (abc, abcd, multi-select, etc.)
    // 3) detect from data structure
    const sectionQType = section.questionType;
    let qType = sectionQType || firstQ?.questionType || "fill";
    
    // Only override for special data structures when type is still "fill"
    if (qType === "fill") {
      if (firstQ?.formRows && firstQ.formRows.length > 0) {
        qType = "form-completion";
      } else if (firstQ?.notesText) {
        qType = "notes-completion";
      } else if (firstQ?.leftItems && firstQ.leftItems.length > 0) {
        qType = "matching";
      } else if (firstQ?.options && firstQ.options.length > 0) {
        // Detect abc/abcd from options count
        qType = firstQ.options.length === 3 ? "abc" : "abcd";
      }
    }
    // Note: multi-select, abc, abcd, matching must be explicitly set in section.questionType
    
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
    
    // Split by line breaks first to preserve them
    const lines = notesText.split(/\n/);
    
    const renderLine = (line, lineIdx) => {
      // Match patterns like "31 ___" or "the 32 ___" (number followed by underscores)
      const parts = line.split(/(\d+\s*[_…]+|[_…]{2,})/g);
      
      return (
        <div key={lineIdx} style={styles.notesLine}>
          {parts.map((part, partIdx) => {
            // Check if this part is a blank (number + underscores)
            const match = part.match(/^(\d+)\s*[_…]+$/);
            if (match) {
              const qNum = parseInt(match[1], 10); // Use the number from the text
              return (
                <span
                  key={partIdx}
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
            // Check for standalone underscores without number (use sequential)
            if (part.match(/^[_…]{2,}$/)) {
              // Find next available number based on context
              return <span key={partIdx} style={styles.notesBlank}>______</span>;
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </div>
      );
    };

    return (
      <div style={styles.notesContainer}>
        {notesTitle && <div style={styles.notesTitle}>{notesTitle}</div>}
        <div style={styles.notesContent}>
          {lines.map((line, idx) => renderLine(line, idx))}
        </div>
      </div>
    );
  };

  // ===================== MAIN RENDER =====================

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Đang tải đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>❌ Lỗi</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate("/select-test")} style={styles.backButton}>
          ← Quay lại
        </button>
      </div>
    );
  }

  const currentPart = parts[currentPartIndex];
  const audioUrl = test?.partAudioUrls?.[currentPartIndex] || test?.mainAudioUrl;
  const currentRange = getPartQuestionRange(currentPartIndex);
  const displayRange = getPartDisplayRange(currentPartIndex);

  return (
    <div style={styles.pageWrapper}>
      {/* Global Styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; }
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

      {/* Part Info Box */}
      <div style={styles.partInfoBox}>
        <div style={styles.partTitle}>
          {currentPart?.title || `Part ${currentPartIndex + 1}`}
        </div>
        <div style={styles.partDescription}>
          Read the text and answer questions {displayRange.start}-{displayRange.end}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Audio Player */}
        {audioUrl && (
          <div style={styles.audioContainer}>
            <audio
              ref={audioRef}
              controls
              controlsList="nodownload noplaybackrate"
              style={{
                ...styles.audioPlayer,
                opacity: audioPlayed[currentPartIndex] ? 0.5 : 1,
                pointerEvents: audioPlayed[currentPartIndex] ? "none" : "auto",
              }}
              src={hostPath(audioUrl)}
              onPlay={() => handleAudioPlay(currentPartIndex)}
              onEnded={() => handleAudioEnded(currentPartIndex)}
            />
            {audioPlayed[currentPartIndex] && (
              <p style={styles.audioWarning}>⚠️ Audio chỉ được nghe 1 lần</p>
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
            const range = getPartQuestionRange(idx);
            const answered = getAnsweredCount(idx);
            const total = getPartTotalQuestions(idx);
            const isCurrentPart = currentPartIndex === idx;
            const isExpanded = isCurrentPart;

            return (
              <div
                key={idx}
                style={{
                  ...styles.partTab,
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
                    {getNavigatorItems(idx).map((item, itemIdx) => {
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

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>📋 Xác nhận nộp bài</h3>
            <p style={styles.modalText}>Bạn có chắc chắn muốn nộp bài?</p>

            <div style={styles.summaryBox}>
              <p style={styles.summaryLabel}>Tổng quan bài làm:</p>
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
                      {answered}/{total} câu
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={styles.warningText}>
              ⚠️ Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời.
            </p>

            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.cancelButton}
              >
                Hủy
              </button>
              <button onClick={confirmSubmit} style={styles.confirmButton}>
                ✅ Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}

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
        title="Listening — Kết quả"
      />
    </div>
  );
};

export default DoListeningTest;
