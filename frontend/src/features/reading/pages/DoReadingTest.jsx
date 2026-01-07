import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ConfirmModal } from "../../../shared/components";
import ResultModal from "../../../shared/components/ResultModal";
import "../styles/do-reading-test.css";
import { normalizeQuestionType } from "../utils/questionHelpers";
import { apiPath, hostPath } from "../../../shared/utils/api";
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
      return localStorage.getItem(`reading_test_${id}_started`) === "true";
    } catch (e) {
      return false;
    }
  });

  const isQuestionAnswered = useCallback(
    (n) => {
      const key = `q_${n}`;

      // For matching-headings and cloze-test, skip the direct key check here
      // because they use composite storage (JSON or sub-keys) and are handled below.
      // First, determine if question n is part of a matching-headings or cloze block.
      let isPartOfMatchingHeadings = false;
      let isPartOfClozeTest = false;

      if (test && Array.isArray(test.passages)) {
        let qCounter = 1;
        outerLoop: for (const p of test.passages) {
          const sections = p.sections || [{ questions: p.questions }];
          for (const s of sections) {
            for (const q of s.questions || []) {
              const qType = q.type || q.questionType || "";

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
                const clozeText =
                  q.paragraphText ||
                  q.passageText ||
                  q.text ||
                  q.paragraph ||
                  (q.questionText && q.questionText.includes("[BLANK]")
                    ? q.questionText
                    : null);
                if (clozeText) {
                  const blanks = (clozeText.match(/\[BLANK\]/gi) || []).length;
                  if (n >= qCounter && n < qCounter + blanks) {
                    isPartOfClozeTest = true;
                    break outerLoop;
                  }
                  qCounter += blanks || 1;
                  continue;
                }
              }

              // Paragraph-matching with blanks
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

      // Direct value (string, JSON, or non-string) - for regular question types
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
        const clozeText =
          q.paragraphText ||
          q.passageText ||
          q.text ||
          q.paragraph ||
          (q.questionText && q.questionText.includes("[BLANK]")
            ? q.questionText
            : null);
        if (clozeText) {
          const blankMatches = clozeText.match(/\[BLANK\]/gi);
          return total + (blankMatches ? blankMatches.length : 1);
        }
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
  const [timerWarning, setTimerWarning] = useState(false);
  const [timerCritical, setTimerCritical] = useState(false);

  // Load saved answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`reading_test_${id}_answers`);
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
      localStorage.setItem(
        `reading_test_${id}_answers`,
        JSON.stringify(answers)
      );
    }
  }, [answers, id]);

  // Persist time remaining and started flag so a refresh retains state
  useEffect(() => {
    try {
      if (typeof timeRemaining === "number") {
        localStorage.setItem(
          `reading_test_${id}_timeRemaining`,
          String(timeRemaining)
        );
      }
      localStorage.setItem(
        `reading_test_${id}_started`,
        started ? "true" : "false"
      );
    } catch (e) {
      // ignore storage errors
    }
  }, [timeRemaining, started, id]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
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

        // If there's a saved timer and the test was started, restore it; otherwise use test default
        try {
          const savedStarted =
            localStorage.getItem(`reading_test_${id}_started`) === "true";
          const savedTime = localStorage.getItem(
            `reading_test_${id}_timeRemaining`
          );

          if (savedStarted && savedTime) {
            setTimeRemaining(Number(savedTime));
            setStarted(true);
          } else {
            setTimeRemaining((normalized.durationMinutes || 60) * 60);
          }
        } catch (e) {
          setTimeRemaining((normalized.durationMinutes || 60) * 60);
        }

        // Migrate saved answers if necessary: older saves may have keys like `q_<n>` (single) for paragraph-matching
        try {
          const saved = localStorage.getItem(`reading_test_${id}_answers`);
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
                    const clozeText =
                      q.paragraphText ||
                      q.passageText ||
                      q.text ||
                      q.paragraph ||
                      (q.questionText && q.questionText.includes("[BLANK]")
                        ? q.questionText
                        : null);
                    if (clozeText) {
                      const blanks = (clozeText.match(/\[BLANK\]/gi) || [])
                        .length;
                      qCounter += blanks || 1;
                    } else {
                      qCounter++;
                    }
                    return;
                  }

                  qCounter++;
                });
              });
            });

            // If migration changed anything, update saved answers and state
            if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
              localStorage.setItem(
                `reading_test_${id}_answers`,
                JSON.stringify(migrated)
              );
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
  }, [id]);

  // Timer countdown (runs only when started)
  useEffect(() => {
    if (timeRemaining === null || submitted || !started) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          setShowConfirm(true);
          return 0;
        }

        // Warning at 5 minutes
        if (prev <= 300 && !timerWarning) {
          setTimerWarning(true);
        }

        // Critical at 1 minute
        if (prev <= 60 && !timerCritical) {
          setTimerCritical(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted, timerWarning, timerCritical, started]);

  // Format time
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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
            const clozeText =
              q.paragraphText ||
              q.passageText ||
              q.text ||
              q.paragraph ||
              (q.questionText && q.questionText.includes("[BLANK]")
                ? q.questionText
                : null);

            if (clozeText) {
              const blankMatches = clozeText.match(/\[BLANK\]/gi) || [];
              const baseKey = `q_${total + 1}`;

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
              total++;
              const key = `q_${total}`;
              if (answers[key] && answers[key].toString().trim() !== "") {
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
      let targetPassageIndex = 0;

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
    const stats = getStatistics();
    if (stats.unanswered.length > 0 && !timeUp) {
      const confirmSubmit = window.confirm(
        `Bạn chưa trả lời ${stats.unanswered.length} câu: ${stats.unanswered
          .slice(0, 10)
          .join(", ")}${
          stats.unanswered.length > 10 ? "..." : ""
        }\n\nBạn có muốn nộp bài không?`
      );
      if (!confirmSubmit) return;
    }
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
          user,
          studentName: user?.name || undefined,
          studentId: user?.id || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setSubmitted(true);

      // Clear saved answers and timer so returning student gets a fresh attempt
      localStorage.removeItem(`reading_test_${id}_answers`);
      localStorage.removeItem(`reading_test_${id}_timeRemaining`);
      localStorage.removeItem(`reading_test_${id}_started`);
      // Also clear in-memory answers so the auto-save effect doesn't re-persist them
      setAnswers({});

      // Instead of navigating, show result modal (do not flip started state immediately
      // because component returns early when !started and would prevent modal mounting)
      setResultData(data);
      setResultModalOpen(true);
    } catch (err) {
      console.error("Error submitting reading test:", err);
      alert("Có lỗi khi nộp bài. Vui lòng thử lại.");
    } finally {
      setShowConfirm(false);
    }
  };

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
          const clozeText =
            q.paragraphText ||
            q.passageText ||
            q.text ||
            q.paragraph ||
            (q.questionText && q.questionText.includes("[BLANK]")
              ? q.questionText
              : null);
          if (clozeText) {
            const blanks = (clozeText.match(/\[BLANK\]/gi) || []).length;
            qNum += blanks || 1;
          } else {
            qNum++;
          }
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

  // If the test hasn't been started yet, show a start modal (60 minutes or test.duration)
  if (!started) {
    return (
      <div className="reading-test-loading" style={{ padding: 30 }}>
        <div className="start-modal">
          <h2>Bắt đầu làm bài Reading</h2>
          <p>
            Bạn có <b>{Math.round(test.durationMinutes || 60)} phút</b> để hoàn
            tất bài làm. Bài làm sẽ được tự động lưu.
          </p>
          <p style={{ marginTop: 12 }}>
            Số Passage: <b>{test.passages.length}</b> • Tổng số câu:{" "}
            <b>{stats.total}</b>
          </p>
          <div style={{ marginTop: 18 }}>
            <button
              className="start-test-btn"
              onClick={() => {
                setStarted(true);
                localStorage.setItem(`reading_test_${id}_started`, "true");
                // ensure timeRemaining is initialized if not yet
                if (timeRemaining === null)
                  setTimeRemaining((test.durationMinutes || 60) * 60);
                // focus first question after small delay
                setTimeout(() => {
                  setActiveQuestion(1);
                  scrollToQuestion(1);
                }, 260);
              }}
            >
              Bắt đầu làm bài
            </button>
          </div>
        </div>
      </div>
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
        className="multi-select-container"
        style={{
          backgroundColor: activeQuestion === startNumber ? "#eff6ff" : "#e8f4fc",
        }}
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
            const hasPrefix = /^[A-Z][\.\s]/.test(opt);
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
    const clozeText =
      question.paragraphText ||
      question.passageText ||
      question.text ||
      question.paragraph ||
      (question.questionText && question.questionText.includes("[BLANK]")
        ? question.questionText
        : null);
    const blankCount =
      isClozeTest && clozeText
        ? (clozeText.match(/\[BLANK\]/gi) || []).length
        : 0;

    // Check if short answer has inline dots
    const isShortAnswerInline =
      (qType === "fill-in-blank" ||
        qType === "short-answer" ||
        qType === "fill-in-the-blanks") &&
      question.questionText &&
      (question.questionText.includes("…") ||
        question.questionText.includes("...."));

    // Paragraph-matching: count blanks (ellipsis) as multiple items
    // (moved earlier)

    // Should hide single question number for multi-question blocks
    const isMultiQuestionBlock =
      isMatchingHeadings ||
      (isClozeTest && blankCount > 0) ||
      (isParagraphMatching && paragraphBlankCount > 0);

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
                  ? "✓"
                  : answers[key] === "FALSE" || answers[key] === "NO"
                  ? "✗"
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
                                    const clozeText =
                                      q2.paragraphText ||
                                      q2.passageText ||
                                      q2.text ||
                                      q2.paragraph ||
                                      (q2.questionText &&
                                      q2.questionText.includes("[BLANK]")
                                        ? q2.questionText
                                        : null);
                                    if (clozeText) {
                                      const blanks = (
                                        clozeText.match(/\[BLANK\]/gi) || []
                                      ).length;
                                      qNum += blanks || 1;
                                    } else {
                                      qNum++;
                                    }
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
                                        disabled={
                                          used.has(opt.id) && opt.id !== thisVal
                                        }
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
                              const clozeText =
                                q2.paragraphText ||
                                q2.passageText ||
                                q2.text ||
                                q2.paragraph ||
                                (q2.questionText &&
                                q2.questionText.includes("[BLANK]")
                                  ? q2.questionText
                                  : null);
                              if (clozeText) {
                                const blanks = (
                                  clozeText.match(/\[BLANK\]/gi) || []
                                ).length;
                                qNum += blanks || 1;
                              } else {
                                qNum++;
                              }
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
                              disabled={
                                used.has(opt.id) && opt.id !== singleValue
                              }
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

                    return cleanText.split(/(\.{3,}|…+)/).map((part, idx) => {
                      if (part.match(/\.{3,}|…+/)) {
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
                            placeholder={
                              question.maxWords
                                ? `≤${question.maxWords} words`
                                : ""
                            }
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
                  placeholder={
                    question.maxWords
                      ? `No more than ${question.maxWords} words`
                      : "Type your answer..."
                  }
                />
              )}
              {question.maxWords && (
                <p className="fill-hint">
                  <span className="hint-icon">ℹ️</span>
                  Maximum {question.maxWords} word(s)
                </p>
              )}
            </div>
          )}

          {/* Multi-Select */}
          {qType === "multi-select" && renderMultipleChoiceMany(question, currentQuestionNumber, question.requiredAnswers || 2)}

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
                  Questions {question.startQuestion || questionNumber}–
                  {(question.startQuestion || questionNumber) +
                    paragraphCount -
                    1}
                </span>
              </div>

              {/* List of headings */}
              <div className="headings-list">
                <p className="headings-title">📋 List of Headings</p>
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
                    // Use startQuestion from question data, or fall back to questionNumber
                    const baseQuestion =
                      question.startQuestion || questionNumber;
                    const actualQuestionNum = baseQuestion + pi;

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
                  <span className="cloze-range-badge">
                    Questions {question.startQuestion || questionNumber}–
                    {(question.startQuestion || questionNumber) +
                      blankCount -
                      1}
                  </span>
                  {question.maxWords && (
                    <span className="cloze-max-words">
                      ℹ️ No more than {question.maxWords} word(s) for each
                      answer
                    </span>
                  )}
                </div>
              )}

              {question.wordBank && question.wordBank.length > 0 && (
                <div className="word-bank">
                  <p className="word-bank-title">📝 Word Bank:</p>
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
                if (clozeText && clozeText.includes("[BLANK]")) {
                  return (
                    <div className="cloze-passage">
                      {(() => {
                        let blankIndex = 0;
                        const baseQuestionNum =
                          question.startQuestion || questionNumber;
                        return clozeText
                          .split(/\[BLANK\]/gi)
                          .map((part, idx, arr) => {
                            if (idx === arr.length - 1) {
                              return (
                                <span
                                  key={idx}
                                  dangerouslySetInnerHTML={{
                                    __html: stripUnwantedHtml(part),
                                  }}
                                />
                              );
                            }
                            const currentBlankIdx = blankIndex++;
                            const blankNum = baseQuestionNum + currentBlankIdx;
                            return (
                              <span key={idx}>
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: stripUnwantedHtml(part),
                                  }}
                                />
                                <span
                                  className="cloze-inline-wrapper"
                                  ref={(el) =>
                                    (questionRefs.current[`q_${blankNum}`] = el)
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveQuestion(blankNum);
                                  }}
                                >
                                  <span className="cloze-inline-number">
                                    {blankNum}
                                  </span>
                                  <input
                                    type="text"
                                    className={`cloze-inline-input ${
                                      answers[`${key}_${currentBlankIdx}`]
                                        ? "answered"
                                        : ""
                                    }`}
                                    value={
                                      answers[`${key}_${currentBlankIdx}`] || ""
                                    }
                                    onChange={(e) =>
                                      handleAnswerChange(
                                        `${key}_${currentBlankIdx}`,
                                        e.target.value
                                      )
                                    }
                                    onFocus={() => setActiveQuestion(blankNum)}
                                    placeholder=""
                                  />
                                </span>
                              </span>
                            );
                          });
                      })()}
                    </div>
                  );
                } else {
                  // Fallback to blank rows if no passage text
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
                        <input
                          type="text"
                          className={`cloze-input ${
                            answers[`${key}_${bi}`] ? "answered" : ""
                          }`}
                          value={answers[`${key}_${bi}`] || ""}
                          onChange={(e) =>
                            handleAnswerChange(`${key}_${bi}`, e.target.value)
                          }
                          onFocus={() => setActiveQuestion(blankQuestionNum)}
                          placeholder="Type answer..."
                        />
                      </div>
                    );
                  });
                }
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reading-test-container">
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
            <div className="timer-icon">⏱️</div>
            <div className="timer-display">
              <span className="timer-value">{formatTime(timeRemaining)}</span>
              <span className="timer-label">remaining</span>
            </div>
            {timerCritical && (
              <div className="timer-critical-badge pulse">🔥 Last minute!</div>
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
            <span className="save-icon">💾</span>
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
              <>✓ Đã nộp bài</>
            ) : (
              <>
                <span className="submit-icon">📤</span>
                <span className="submit-text">Nộp bài</span>
              </>
            )}
          </button>
        </div>
      </header>

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
                    const qNum = currentQuestionNumber;
                    const qType = normalizeQuestionType(
                      q.type || q.questionType || "multiple-choice"
                    );

                    // For matching headings, count each paragraph as a question
                    if (qType === "ielts-matching-headings") {
                      const paragraphCount = (q.paragraphs || q.answers || [])
                        .length;
                      currentQuestionNumber += paragraphCount || 1;
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
                      currentQuestionNumber += blankMatches.length || 1;
                    }
                    // For cloze test, count each blank as a question
                    else if (
                      qType === "cloze-test" ||
                      qType === "summary-completion"
                    ) {
                      const clozeText =
                        q.paragraphText ||
                        q.passageText ||
                        q.text ||
                        q.paragraph ||
                        (q.questionText && q.questionText.includes("[BLANK]")
                          ? q.questionText
                          : null);
                      if (clozeText) {
                        const blankMatches = clozeText.match(/\[BLANK\]/gi);
                        currentQuestionNumber += blankMatches
                          ? blankMatches.length
                          : 1;
                      } else {
                        currentQuestionNumber++;
                      }
                    } else {
                      currentQuestionNumber++;
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
          <span className="nav-panel-title">📊 Question Navigator</span>
          <span className="nav-panel-stats">
            <span className="stat-answered">✓ {stats.answered}</span>
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
                {Array.from({ length: part.count }, (_, i) => {
                  const num = part.start + i;
                  // Use canonical check to detect answers stored as JSON, sub-keys (q_X_Y), or simple strings
                  const isAnswered = isQuestionAnswered(num);
                  const isActive = activeQuestion === num;
                  return (
                    <button
                      key={num}
                      data-num={num}
                      data-testid={`nav-question-${num}`}
                      className={`nav-question-btn ${
                        isAnswered ? "answered" : ""
                      } ${isActive ? "active" : ""}`}
                      title={
                        isAnswered ? `Question ${num} ✓` : `Question ${num}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToQuestion(num);
                        setActiveQuestion(num);
                      }}
                    >
                      {num}
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
        title={timeUp ? "⏰ Hết giờ!" : "📝 Xác nhận nộp bài?"}
        message={
          timeUp
            ? "Thời gian đã hết. Bài làm sẽ được nộp tự động."
            : `Bạn đã trả lời ${stats.answered}/${stats.total} câu. Bạn có chắc muốn nộp bài?`
        }
        type={timeUp ? "warning" : "info"}
        confirmText={timeUp ? "Nộp ngay" : "Xác nhận nộp"}
      />

      {/* Result Modal shown after submit */}
      <ResultModal
        isOpen={resultModalOpen}
        onClose={() => {
          // When closing the result modal, reset started/timer so next visit is fresh
          // Also explicitly remove persisted localStorage keys synchronously to avoid races
          try {
            localStorage.removeItem(`reading_test_${id}_answers`);
            localStorage.removeItem(`reading_test_${id}_timeRemaining`);
            localStorage.removeItem(`reading_test_${id}_started`);
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
