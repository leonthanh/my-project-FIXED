import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";

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
  const [results, setResults] = useState(null);
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
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id]);

  // Timer countdown (compute remaining from persisted expiresAt to survive F5)
  useEffect(() => {
    if (submitted || !test) return;

    const stored = localStorage.getItem(expiresKey);
    const expiresAt = stored ? parseInt(stored, 10) : Date.now() + (test?.duration ? test.duration * 60 * 1000 : 30 * 60 * 1000);

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeRemaining(0);
        if (!submitted) confirmSubmit();
        return;
      }
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, submitted]);

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
  const confirmSubmit = async () => {
    if (submitted) return; // prevent double-submits

    try {
      const res = await fetch(apiPath(`listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error("Lỗi khi nộp bài");

      const data = await res.json();
      setResults(data);
      setSubmitted(true);
      setShowConfirm(false);

      // Clear persisted timer so next visit starts fresh
      try {
        localStorage.removeItem(expiresKey);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("Error submitting:", err);
      alert("❌ Có lỗi xảy ra khi nộp bài!");
    }
  };

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
    if ((q.questionType === "multi-select" || (q.requiredAnswers && q.requiredAnswers > 1)) && q.requiredAnswers) {
      return Math.max(1, q.requiredAnswers);
    }

    return 1;
  }, []);

  // Get question range for a part (considering multi-question types)
  // Calculate start number based on all previous parts to ensure continuous numbering
  const getPartQuestionRange = useCallback(
    (partIndex) => {
      const allQuestions = test?.questions || [];
      
      // Calculate start number by summing questions from all previous parts
      let startNum = 1;
      for (let p = 0; p < partIndex; p++) {
        const prevPartQuestions = allQuestions.filter((q) => q.partIndex === p);
        prevPartQuestions.forEach((q) => {
          startNum += getQuestionCount(q);
        });
      }
      
      // Get questions for this part
      const partQuestions = allQuestions.filter(
        (q) => q.partIndex === partIndex
      );
      if (partQuestions.length === 0) return { start: 0, end: 0, questions: [] };
      
      // Calculate total questions in this part
      let totalCount = 0;
      partQuestions.forEach((q) => {
        totalCount += getQuestionCount(q);
      });
      
      return { 
        start: startNum, 
        end: startNum + totalCount - 1,
        questions: partQuestions 
      };
    },
    [test?.questions, getQuestionCount]
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
  const getAnsweredCount = useCallback(
    (partIndex) => {
      const range = getPartQuestionRange(partIndex);
      let count = 0;
      for (let i = range.start; i <= range.end; i++) {
        const ans = answers[`q${i}`];
        if (Array.isArray(ans) ? ans.length > 0 : !!ans) count++;
      }
      return count;
    },
    [getPartQuestionRange, answers]
  );

  // Get total questions in a part
  const getPartTotalQuestions = useCallback(
    (partIndex) => {
      const range = getPartQuestionRange(partIndex);
      if (range.start === 0 && range.end === 0) return 0;
      return range.end - range.start + 1;
    },
    [getPartQuestionRange]
  );

  // Build navigator items for a part - groups multi-select questions
  const getNavigatorItems = useCallback(
    (partIndex) => {
      const allQuestions = test?.questions || [];
      const partQuestions = allQuestions.filter((q) => q.partIndex === partIndex);
      const partInstructions = test?.partInstructions || [];
      const partInfo = partInstructions[partIndex];
      const sections = partInfo?.sections || [];

      const buildItemsFromQuestions = () => {
        const items = [];
        const sorted = [...partQuestions].sort(
          (a, b) => (Number(a?.globalNumber) || 0) - (Number(b?.globalNumber) || 0)
        );

        for (const q of sorted) {
          const baseNum = Number(q?.globalNumber);
          const startNum = Number.isFinite(baseNum) && baseNum > 0 ? baseNum : null;

          // Derive type from question data when section metadata is missing
          const derivedType =
            q?.questionType ||
            (q?.formRows?.length ? "form-completion" : null) ||
            (q?.notesText ? "notes-completion" : null) ||
            (q?.leftItems?.length ? "matching" : null) ||
            (q?.requiredAnswers && q.requiredAnswers > 1 ? "multi-select" : null) ||
            "single";

          if (derivedType === "multi-select") {
            const count = q?.requiredAnswers || 2;
            const start = startNum ?? 1;
            const end = start + count - 1;
            items.push({
              type: "multi-select",
              startNum: start,
              endNum: end,
              label: `${start}-${end}`,
              questionKey: `q${start}`,
            });
            continue;
          }

          if (derivedType === "matching") {
            const leftItems = q?.leftItems || q?.items || [];
            const start = startNum ?? 1;
            leftItems.forEach((_, idx) => {
              const num = start + idx;
              items.push({
                type: "single",
                startNum: num,
                endNum: num,
                label: `${num}`,
                questionKey: `q${num}`,
              });
            });
            if (leftItems.length === 0 && startNum != null) {
              items.push({
                type: "single",
                startNum,
                endNum: startNum,
                label: `${startNum}`,
                questionKey: `q${startNum}`,
              });
            }
            continue;
          }

          if (derivedType === "form-completion") {
            const start = startNum ?? 1;
            const blanks = (q?.formRows || []).filter((r) => r?.isBlank);
            blanks.forEach((row, idx) => {
              const num = row?.blankNumber
                ? start + row.blankNumber - 1
                : start + idx;
              items.push({
                type: "single",
                startNum: num,
                endNum: num,
                label: `${num}`,
                questionKey: `q${num}`,
              });
            });
            if (blanks.length === 0 && startNum != null) {
              items.push({
                type: "single",
                startNum,
                endNum: startNum,
                label: `${startNum}`,
                questionKey: `q${startNum}`,
              });
            }
            continue;
          }

          if (derivedType === "notes-completion") {
            const notesText = q?.notesText || "";
            const matches = notesText.match(/(\d+)\s*[_…]+/g) || [];

            matches.forEach((m) => {
              const numMatch = m.match(/^(\d+)/);
              if (!numMatch) return;
              const num = parseInt(numMatch[1], 10);
              if (!Number.isFinite(num)) return;
              items.push({
                type: "single",
                startNum: num,
                endNum: num,
                label: `${num}`,
                questionKey: `q${num}`,
              });
            });

            // Fallback: if no numbered blanks, still provide a nav target so arrows don't break
            if (matches.length === 0 && startNum != null) {
              items.push({
                type: "single",
                startNum,
                endNum: startNum,
                label: `${startNum}`,
                questionKey: `q${startNum}`,
              });
            }
            continue;
          }

          // Default single question
          if (startNum != null) {
            items.push({
              type: "single",
              startNum,
              endNum: startNum,
              label: `${startNum}`,
              questionKey: `q${startNum}`,
            });
          }
        }

        // De-dup by startNum (can happen when data is inconsistent)
        const seen = new Set();
        const deduped = [];
        for (const it of items) {
          if (seen.has(it.startNum)) continue;
          seen.add(it.startNum);
          deduped.push(it);
        }
        deduped.sort((a, b) => a.startNum - b.startNum);
        return deduped;
      };
      
      const items = [];
      let currentQNum = getPartQuestionRange(partIndex).start;
      
      sections.forEach((section, sIdx) => {
        const sectionQuestions = partQuestions.filter((q) => q.sectionIndex === sIdx);
        const sectionQType = section.questionType || "fill";

        // If the section explicitly defines its start number, treat it as authoritative.
        if (typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0) {
          currentQNum = section.startingQuestionNumber;
        }
        
        if (sectionQType === "multi-select") {
          // Group multi-select questions (e.g., 25-26, 27-28, 29-30)
          sectionQuestions.forEach((q) => {
            const count = q.requiredAnswers || 2;
            const startNum = currentQNum;
            const endNum = currentQNum + count - 1;
            items.push({
              type: "multi-select",
              startNum,
              endNum,
              label: `${startNum}-${endNum}`,
              questionKey: `q${startNum}`,
            });
            currentQNum += count;
          });
        } else if (sectionQType === "matching") {
          // Matching questions - individual numbers
          const firstQ = sectionQuestions[0];
          const leftItems = firstQ?.leftItems || [];
          leftItems.forEach((_, idx) => {
            items.push({
              type: "single",
              startNum: currentQNum,
              endNum: currentQNum,
              label: `${currentQNum}`,
              questionKey: `q${currentQNum}`,
            });
            currentQNum++;
          });
        } else if (sectionQType === "form-completion") {
          const firstQ = sectionQuestions[0];
          const blankCount = firstQ?.formRows?.filter((r) => r.isBlank)?.length || 0;
          for (let i = 0; i < blankCount; i++) {
            items.push({
              type: "single",
              startNum: currentQNum,
              endNum: currentQNum,
              label: `${currentQNum}`,
              questionKey: `q${currentQNum}`,
            });
            currentQNum++;
          }
        } else if (sectionQType === "notes-completion") {
          const firstQ = sectionQuestions[0];
          const notesText = firstQ?.notesText || "";
          // Only numbered blanks render real inputs/refs.
          const matches = notesText.match(/(\d+)\s*[_…]+/g) || [];
          matches.forEach((token) => {
            const numMatch = token.match(/^(\d+)/);
            if (!numMatch) return;
            const qNum = parseInt(numMatch[1], 10);
            if (!Number.isFinite(qNum)) return;

            items.push({
              type: "single",
              startNum: qNum,
              endNum: qNum,
              label: `${qNum}`,
              questionKey: `q${qNum}`,
            });

            currentQNum = Math.max(currentQNum, qNum + 1);
          });
        } else {
          // abc, abcd, fill - individual questions
          sectionQuestions.forEach(() => {
            items.push({
              type: "single",
              startNum: currentQNum,
              endNum: currentQNum,
              label: `${currentQNum}`,
              questionKey: `q${currentQNum}`,
            });
            currentQNum++;
          });
        }
      });

      // If section metadata is missing/mismatched, fall back to question-driven navigator.
      // This prevents arrows getting stuck at the end of Part 1 (e.g., stopping at 10).
      if (!sections.length || (partQuestions.length > 0 && items.length === 0)) {
        return buildItemsFromQuestions();
      }

      return items;
    },
    [test?.questions, test?.partInstructions, getPartQuestionRange]
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
    Object.keys(answers).forEach((key) => {
      const ans = answers[key];
      if (Array.isArray(ans)) {
        if (ans.length > 0) count++;
      } else if (ans) {
        count++;
      }
    });
    return count;
  }, [answers]);

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
      for (let s = 0; s < sectionIndex; s++) {
        const prevSectionQuestions = currentPartQuestions.filter((q) => q.sectionIndex === s);
        prevSectionQuestions.forEach((q) => {
          startNum += getQuestionCount(q);
        });
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

      {/* Results Modal */}
      {results && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.resultsTitle}>🎉 Kết quả bài thi</h3>

            <div style={styles.scoreBox}>
              <div style={styles.scoreNumber}>
                {results.score || 0}/{results.total || 40}
              </div>
              <p style={styles.scoreLabel}>Số câu đúng</p>

              <div style={styles.bandScore}>
                <span style={styles.bandLabel}>Band Score: </span>
                <span style={styles.bandValue}>
                  {Math.min(
                    9,
                    Math.max(1, Math.round(((results.score || 0) / 40) * 9 * 2) / 2)
                  ).toFixed(1)}
                </span>
              </div>
            </div>

            <div style={styles.resultsButtons}>
              <button
                onClick={() => navigate("/select-test")}
                style={styles.cancelButton}
              >
                ← Về trang chủ
              </button>
              <button
                onClick={() => navigate(`/listening-results/${id}`)}
                style={styles.confirmButton}
              >
                📊 Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== STYLES =====================
const styles = {
  pageWrapper: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Arial, sans-serif",
    fontWeight: 500,
    backgroundColor: "#fff",
  },

  // Loading & Error
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#f3f4f6",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: { color: "#6b7280", fontSize: "16px" },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#f3f4f6",
  },
  errorTitle: { color: "#dc2626", fontSize: "24px", marginBottom: "8px" },
  errorText: { color: "#6b7280", marginBottom: "16px" },
  backButton: {
    padding: "12px 24px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  // Header
  header: {
    borderBottom: "1px solid #d1d5db",
    backgroundColor: "#fff",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    height: "56px",
  },
  logoWrapper: { padding: "8px 16px" },
  logoText: { fontSize: "20px", fontWeight: "bold", color: "#1e40af" },
  testInfo: { flex: 1, paddingLeft: "16px" },
  testTitle: { fontWeight: "bold", fontSize: "16px", color: "#1f2937" },
  timeInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#6b7280",
  },
  audioIcon: { fontSize: "16px" },
  submitButton: {
    padding: "8px 20px",
    backgroundColor: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  },

  // Part Info Box
  partInfoBox: {
    margin: "16px",
    padding: "16px",
    backgroundColor: "#f1f2ec",
    border: "1px solid #d5d5d5",
    borderRadius: "4px",
  },
  partTitle: { fontWeight: 900, fontSize: "16px", color: "#1f2937" },
  partDescription: { fontSize: "14px", color: "#4b5563", marginTop: "4px" },

  // Main Content
  mainContent: {
    flex: 1,
    position: "relative",
    paddingBottom: "80px",
  },
  audioContainer: { padding: "0 24px", marginBottom: "16px" },
  audioPlayer: { width: "100%", height: "40px" },
  audioWarning: { color: "#d97706", fontSize: "13px", marginTop: "4px" },
  questionsList: {
    padding: "0 24px",
    overflowY: "auto",
    maxHeight: "calc(100vh - 280px)",
  },

  // Section
  sectionContainer: { marginBottom: "32px" },
  sectionTitle: { fontWeight: "bold", fontSize: "16px", marginBottom: "8px" },
  sectionInstruction: { marginBottom: "16px", color: "#4b5563", lineHeight: 1.6 },
  questionsWrapper: { display: "flex", flexDirection: "column", gap: "8px" },

  // Multiple Choice
  questionItem: { marginBottom: "16px", padding: "8px", borderRadius: "4px" },
  questionHeader: { display: "flex", gap: "12px", marginBottom: "8px", alignItems: "flex-start" },
  questionNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "32px",
    backgroundColor: "#0e276f",
    color: "#fff",
    borderRadius: "50%",
    fontWeight: 600,
    fontSize: "14px",
    flexShrink: 0,
  },
  questionNumberWide: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "48px",
    height: "32px",
    backgroundColor: "#0e276f",
    color: "#fff",
    borderRadius: "16px",
    fontWeight: 600,
    fontSize: "13px",
    padding: "0 8px",
    flexShrink: 0,
  },
  questionText: { flex: 1, marginTop: "4px", lineHeight: 1.5 },
  optionsList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  optionItem: { position: "relative" },
  optionLabel: {
    display: "flex",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  optionText: { marginLeft: "20px" },
  radioInput: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: "8px",
  },
  checkboxInput: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: "8px",
    backgroundColor: "#fff",
  },

  // Fill Question
  fillQuestionItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    padding: "8px",
    borderRadius: "4px",
  },
  fillQuestionNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "32px",
    backgroundColor: "#0e276f",
    color: "#fff",
    borderRadius: "50%",
    fontWeight: 600,
    fontSize: "14px",
    flexShrink: 0,
  },
  fillInput: {
    flex: 1,
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    padding: "8px 12px",
    fontSize: "14px",
    outline: "none",
  },
  fillQuestionsContainer: { display: "flex", flexDirection: "column" },

  // Multi-select (Choose TWO letters style)
  multiSelectContainer: {
    padding: "16px 20px",
    marginBottom: "16px",
    borderRadius: "8px",
    border: "1px solid #cce5ff",
  },
  multiSelectHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
  },
  multiSelectBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    backgroundColor: "#0e276f",
    color: "#fff",
    borderRadius: "4px",
    fontWeight: 600,
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  multiSelectQuestionText: {
    fontSize: "15px",
    color: "#333",
    lineHeight: 1.5,
  },
  multiSelectOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  multiSelectOption: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    border: "1px solid #dee2e6",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  multiSelectCheckbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  multiSelectOptionText: {
    fontSize: "14px",
    color: "#333",
  },

  // Matching
  matchingContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "32px",
    flexWrap: "wrap",
  },
  matchingLeft: { flex: 1, minWidth: "280px" },
  matchingRight: { flex: 1, minWidth: "200px" },
  matchingItemsList: { display: "flex", flexDirection: "column", gap: "8px" },
  matchingRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "4px",
  },
  matchingQuestionNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#0e276f",
    color: "#fff",
    borderRadius: "50%",
    fontWeight: 600,
    fontSize: "14px",
    flexShrink: 0,
  },
  matchingItemText: { flex: 1 },
  matchingDropdownWrapper: { minWidth: "80px" },
  matchingSelect: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  optionsTitle: { fontWeight: 600, marginBottom: "8px" },
  optionsContainer: { display: "flex", flexDirection: "column", gap: "4px" },
  optionCard: {
    padding: "8px 12px",
    border: "1px solid #c5c5c5",
    borderRadius: "6px",
    backgroundColor: "#fff",
    fontSize: "14px",
  },

  // Form/Table Completion - IELTS Style
  formContainer: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
  },
  formContent: {
    padding: "16px 20px",
    lineHeight: "2.4",
  },
  formRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
    flexWrap: "wrap",
  },
  formLabel: {
    fontWeight: "500",
    color: "#374151",
    minWidth: "fit-content",
  },
  formValue: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap",
  },
  formFixedValue: {
    color: "#1f2937",
    fontWeight: "500",
  },
  formGapWrapper: {
    display: "inline-flex",
    alignItems: "center",
  },
  formGapInput: {
    width: "150px",
    padding: "6px 12px",
    border: "2px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  
  // Legacy Form/Table styles (kept for compatibility)
  formTable: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #d1d5db",
  },
  tableCell: {
    padding: "12px",
    border: "1px solid #d1d5db",
    verticalAlign: "middle",
  },
  gapWrapper: { position: "relative", display: "inline-flex", marginLeft: "4px" },
  gapInput: {
    width: "120px",
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    outline: "none",
  },
  gapPlaceholder: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#9ca3af",
    pointerEvents: "none",
  },

  // Floating Navigation
  floatingNav: {
    position: "fixed",
    bottom: "80px",
    right: "24px",
    display: "flex",
    gap: "8px",
    zIndex: 80,
  },
  navArrowLeft: {
    width: "56px",
    height: "56px",
    backgroundColor: "#374151",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowRight: {
    width: "56px",
    height: "56px",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom Navigation
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #d1d5db",
    zIndex: 30,
  },
  partsContainer: {
    display: "flex",
    overflowX: "auto",
  },
  partTab: {
    flex: 1,
    minWidth: "100px",
    padding: "12px 16px",
    cursor: "pointer",
    borderLeft: "1px solid #e5e7eb",
    transition: "background-color 0.2s",
  },
  partLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    whiteSpace: "nowrap",
  },
  partLabelText: { fontWeight: "bold", fontSize: "16px" },
  partProgress: { fontSize: "14px", color: "#6b7280" },
  questionNumbers: {
    display: "flex",
    flexWrap: "nowrap",
    gap: "8px",
    marginTop: "8px",
    justifyContent: "space-around",
  },
  questionNumBox: {
    minWidth: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid transparent",
    borderRadius: "4px",
    fontSize: "15px",
    cursor: "pointer",
    backgroundColor: "#fff",
    padding: "0 4px",
  },
  questionNumBoxWide: {
    minWidth: "40px",
    padding: "0 6px",
    fontSize: "14px",
  },
  submitIcon: {
    padding: "16px",
    backgroundColor: "#e5e7eb",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modals
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "28px",
    borderRadius: "16px",
    maxWidth: "480px",
    width: "90%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: "16px",
  },
  modalText: { marginBottom: "16px", color: "#4b5563" },
  summaryBox: {
    padding: "12px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  summaryLabel: { fontSize: "13px", color: "#6b7280", marginBottom: "8px" },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: "14px",
  },
  warningText: { color: "#dc2626", fontSize: "13px", marginBottom: "16px" },
  modalButtons: { display: "flex", gap: "12px", justifyContent: "flex-end" },
  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "14px",
  },
  confirmButton: {
    padding: "10px 24px",
    backgroundColor: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  },

  // Results
  resultsTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#15803d",
    textAlign: "center",
    marginBottom: "16px",
  },
  scoreBox: {
    textAlign: "center",
    padding: "24px",
    backgroundColor: "#f0fdf4",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  scoreNumber: { fontSize: "48px", fontWeight: "bold", color: "#16a34a" },
  scoreLabel: { color: "#6b7280", marginTop: "8px" },
  bandScore: {
    display: "inline-block",
    marginTop: "16px",
    padding: "8px 16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
  },
  bandLabel: { fontSize: "13px", color: "#6b7280" },
  bandValue: { fontSize: "20px", fontWeight: "bold", color: "#1e40af" },
  resultsButtons: { display: "flex", gap: "12px", justifyContent: "center" },

  // Notes Completion
  notesContainer: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "16px",
  },
  notesTitle: {
    fontWeight: "bold",
    fontSize: "15px",
    marginBottom: "12px",
    color: "#1f2937",
  },
  notesContent: {
    lineHeight: 1.8,
    fontSize: "14px",
  },
  notesLine: {
    marginBottom: "8px",
    display: "block",
  },
  notesBlank: {
    display: "inline-block",
    borderBottom: "1px solid #999",
    minWidth: "60px",
  },

  // Form Title
  formTitle: {
    fontWeight: "bold",
    fontSize: "15px",
    marginBottom: "12px",
    padding: "8px 12px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px 4px 0 0",
  },
};

export default DoListeningTest;
