import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
/* eslint-disable-next-line no-unused-vars */
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import QuestionDisplayFactory from "../../../shared/components/questions/displays/QuestionDisplayFactory";
import PeopleMatchingDisplay from "../../../shared/components/questions/displays/PeopleMatchingDisplay";
import MatchingPicturesDisplay from "../../../shared/components/questions/displays/MatchingPicturesDisplay";
/* eslint-disable-next-line no-unused-vars */
import ClozeMCDisplay from "../../../shared/components/questions/displays/ClozeMCDisplay";
import InlineChoiceDisplay from "../../../shared/components/questions/displays/InlineChoiceDisplay";
import CambridgeResultsModal from "../components/CambridgeResultsModal";
import { computeQuestionStarts, getQuestionCountForSection, parseClozeBlanksFromText } from "../utils/questionNumbering";
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
  /* eslint-disable-next-line no-unused-vars */
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Current question number
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Flagged questions
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  // Shared state for matching-pictures split view (questions left | picture bank right)
  const [mpSelectedChoiceId, setMpSelectedChoiceId] = useState('');
  const [mpActivePromptIndex, setMpActivePromptIndex] = useState(null);

  // Started flag for the test (show start modal and control timer)
  const [started, setStarted] = useState(() => {
    try {
      return localStorage.getItem(`cambridge_reading_test_${id}_started`) === "true";
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

  // Get test config - will be updated once test data is loaded
  const testConfig = useMemo(() => {
    // If testType from URL, use it
    if (testType) {
      return TEST_CONFIGS[testType] || TEST_CONFIGS['ket-reading'];
    }
    // If test data loaded, use testType from test
    if (test?.testType) {
      return TEST_CONFIGS[test.testType] || TEST_CONFIGS['ket-reading'];
    }
    // Fallback
    return TEST_CONFIGS['ket-reading'];
  }, [testType, test?.testType]);

  const effectiveDuration = useMemo(() => {
    const fromTest = Number(test?.duration);
    if (Number.isFinite(fromTest) && fromTest > 0) return fromTest;
    const fromConfig = Number(testConfig.duration);
    if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
    return 60;
  }, [test?.duration, testConfig.duration]);

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
        
        // Check if there's saved data for this test
        const savedTime = localStorage.getItem(`test-time-${id}`);
        const savedAnswers = localStorage.getItem(`test-answers-${id}`);
        const rawDuration = Number(data.duration);
        const resolvedDuration = Number.isFinite(rawDuration) && rawDuration > 0
          ? rawDuration
          : (testConfig.duration || 60);
        const durationSeconds = resolvedDuration * 60;

        if (savedTime || savedAnswers) {
          // Restore existing progress (even if answers are empty)
          setHasSavedProgress(true);
          if (savedTime) {
            const parsed = parseInt(savedTime, 10);
            const nextTime = Number.isFinite(parsed) ? Math.min(parsed, durationSeconds) : durationSeconds;
            setTimeRemaining(nextTime);
          } else {
            setTimeRemaining(durationSeconds);
          }
          try {
            setAnswers(savedAnswers ? JSON.parse(savedAnswers) : {});
          } catch (e) {
            console.error("Error parsing saved answers:", e);
            setAnswers({});
          }
        } else {
          // New test - clean up any old saved data and start fresh
          setHasSavedProgress(false);
          localStorage.removeItem(`test-time-${id}`);
          localStorage.removeItem(`test-answers-${id}`);
          // If there's no saved progress, force start modal again
          localStorage.removeItem(startedKey);
          setStarted(false);
          setTimeRemaining(durationSeconds);
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
  }, [id, testConfig.duration, startedKey]);

  // Timer countdown
  useEffect(() => {
    if (!started || submitted || !test || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          confirmSubmit();
          return 0;
        }
        // Save to localStorage every second
        localStorage.setItem(`test-time-${id}`, prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, submitted, timeRemaining, started]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        localStorage.setItem(`test-answers-${id}`, JSON.stringify(newAnswers));
        return newAnswers;
      });
    },
    [submitted, id]
  );

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

      if (!res.ok) throw new Error("Lỗi khi nộp bài");

      // Clear saved data from localStorage
      localStorage.removeItem(`test-time-${id}`);
      localStorage.removeItem(`test-answers-${id}`);
      localStorage.removeItem(startedKey);
      
      // Show results modal instead of redirecting
      setResults(localResults);
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
      localStorage.removeItem(`test-time-${id}`);
      localStorage.removeItem(`test-answers-${id}`);
      localStorage.removeItem(startedKey);
    }
  };

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
      part.sections?.forEach((section, sIdx) => {
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
          } else {
            // Regular questions
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
  }, [test?.parts]);

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
    return Boolean(answers[q.key]);
  }, [answers, getMatchingPicturesAnswerKey, getPeopleMatchingAnswerKey]);

  // Get current question data
  const currentQuestion = useMemo(() => {
    return allQuestions[currentQuestionIndex] || null;
  }, [allQuestions, currentQuestionIndex]);

  // Navigate to question
  const goToQuestion = (index) => {
    if (index >= 0 && index < allQuestions.length) {
      const q = allQuestions[index];
      
      setCurrentQuestionIndex(index);
      setCurrentPartIndex(q.partIndex);
      setActiveQuestion(q.key);
      
      // Scroll to question element and focus/open
      setTimeout(() => {
        const questionElement = document.getElementById(`question-${q.questionNumber}`);
        
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
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
    <div className="cambridge-test-container bg-slate-50">
      {/* Start Modal (only starts timer after click) */}
      {!started && !submitted && !loading && !error && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            zIndex: 1200
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.25)] sm:p-6"
            style={{
              background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 35%)',
              border: '1px solid #dbeafe',
              borderRadius: 14,
              maxHeight: '85vh',
              width: '100%',
              maxWidth: 520,
              overflowY: 'auto',
              padding: 20,
              boxShadow: '0 12px 32px rgba(15,23,42,0.25)'
            }}
          >
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg" style={{ color: '#0f2f5f' }}>
              Bắt đầu làm bài Cambridge Reading
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400" style={{ color: '#2563eb' }}>
              {examType} Reading
            </p>
            {hasSavedProgress ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Phát hiện bài làm đã được lưu.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Thời gian còn lại: <b>{timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}</b>
                </p>
              </>
            ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Bạn có <b>{Math.round(effectiveDuration)} phút</b> để hoàn tất bài làm. Bài làm sẽ được tự động lưu.
                </p>
            )}

            <div className="mt-3 text-sm text-slate-600">
              <div className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-slate-700" style={{ color: '#1d4ed8' }}>Đề: </span>
                <span>{test?.title || testConfig.name || "Cambridge Reading"}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2">
                <span className="font-semibold text-slate-700" style={{ color: '#1d4ed8' }}>Tổng số câu: </span>
                <span>{allQuestions.length}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => navigate(-1)}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                style={{ borderColor: '#c7d2fe' }}
              >
                Thoát
              </button>

              {hasSavedProgress && (
                <button
                  onClick={() => {
                    const ok = window.confirm(
                      "Bạn chắc chắn muốn làm lại từ đầu? Tất cả tiến độ đã lưu sẽ bị xóa."
                    );
                    if (!ok) return;

                    try {
                      localStorage.removeItem(`test-time-${id}`);
                      localStorage.removeItem(`test-answers-${id}`);
                      localStorage.removeItem(startedKey);
                    } catch {
                      // ignore
                    }

                    setAnswers({});
                    setFlaggedQuestions(new Set());
                    setCurrentPartIndex(0);
                    setCurrentQuestionIndex(0);
                    setActiveQuestion(null);
                    setTimeRemaining(effectiveDuration * 60);
                    setHasSavedProgress(false);
                    setStarted(false);
                  }}
                  className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  🔄 Làm lại từ đầu
                </button>
              )}

              <button
                onClick={() => {
                  setStarted(true);
                  const initialSeconds = effectiveDuration * 60;
                  try {
                    localStorage.setItem(startedKey, "true");
                    localStorage.setItem(`test-time-${id}`, String(timeRemaining ?? initialSeconds));
                    if (!localStorage.getItem(`test-answers-${id}`)) {
                      localStorage.setItem(`test-answers-${id}`, JSON.stringify(answers || {}));
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
                className="rounded-full bg-blue-600 px-6 py-2.5 text-[15px] font-semibold text-white hover:bg-blue-700"
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  boxShadow: '0 8px 18px rgba(37,99,235,0.25)'
                }}
              >
                {hasSavedProgress ? "Tiếp tục" : "Bắt đầu làm bài"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <TestHeader
        title={testConfig.name}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={timeRemaining}
        answeredCount={allQuestions.filter((q) => isQuestionAnswered(q)).length}
        totalQuestions={allQuestions.length}
        onSubmit={handleSubmit}
        submitted={submitted}
        examType={examType}
        timerWarning={timeRemaining > 0 && timeRemaining <= 300}
        timerCritical={timeRemaining > 0 && timeRemaining <= 60}
      />

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
                      <span className="ml-2 text-sm text-slate-700 sm:text-[15px]">
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
                              width: '150px',
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
                          src={hostPath(currentQuestion.part.imageUrl)}
                          alt="Part illustration"
                          style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        />
                      </div>

                      {/* Example block for abc-type sections under part image */}
                      {currentQuestion.section.questionType === 'abc' && (currentQuestion.section.exampleText || currentQuestion.section.exampleAnswer) && currentQuestion.questionIndex === 0 && (
                        <div style={{
                          marginTop: '14px',
                          padding: '12px 14px',
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}>
                          <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Example
                          </div>
                          {currentQuestion.section.exampleText && (
                            <div style={{ whiteSpace: 'pre-wrap', color: '#374151', marginBottom: currentQuestion.section.exampleAnswer ? '8px' : '0', lineHeight: '1.6' }}>
                              {currentQuestion.section.exampleText}
                            </div>
                          )}
                          {currentQuestion.section.exampleAnswer && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>Đáp án mẫu:</span>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '26px', height: '26px', borderRadius: '50%',
                                background: '#0e276f', color: 'white',
                                fontWeight: 700, fontSize: '13px',
                              }}>
                                {currentQuestion.section.exampleAnswer}
                              </span>
                            </div>
                          )}
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
      <footer className="cambridge-footer sticky bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-6px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:border-t-0 sm:bg-transparent sm:px-5 sm:py-2 sm:shadow-none">
        {/* Navigation Arrows - Top Right */}
        <div className="cambridge-footer-arrows flex items-center gap-2">
          <button
            className="cambridge-nav-arrow-btn h-9 w-9 text-sm sm:h-10 sm:w-10"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn h-9 w-9 text-sm sm:h-10 sm:w-10"
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === allQuestions.length - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>
        
        {/* Parts Tabs with Question Numbers */}
        <div className="cambridge-parts-container gap-2 overflow-x-auto px-2 sm:px-4">
          {test?.parts?.map((part, idx) => {
            /* eslint-disable-next-line no-unused-vars */
            const range = getPartQuestionRange(idx);
            const isActive = currentPartIndex === idx;
            const partQuestions = allQuestions.filter(q => q.partIndex === idx);
            const answeredInPart = partQuestions.filter(q => isQuestionAnswered(q)).length;

            return (
              <div key={idx} className="cambridge-part-wrapper flex-shrink-0">
                {/* Part Tab */}
                <button
                  className={`cambridge-part-tab h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-xs ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    // Jump to first question of this part
                    const firstQ = partQuestions[0];
                    if (firstQ) goToQuestion(firstQ.questionNumber - 1);
                  }}
                >
                  <span className="cambridge-part-label">Part</span>
                  <span className="cambridge-part-number">{idx + 1}</span>
                </button>

                {/* Show question numbers only for active part */}
                {isActive && (
                  <div className="cambridge-questions-inline">
                    {partQuestions.length > 0 ? (
                      partQuestions.map((q) => (
                        <button
                          key={q.key}
                          className={`cambridge-question-num-btn h-8 w-8 text-[11px] sm:h-9 sm:w-9 sm:text-xs ${isQuestionAnswered(q) ? 'answered' : ''} ${currentQuestionIndex === q.questionNumber - 1 ? 'active' : ''} ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
                          onClick={() => goToQuestion(q.questionNumber - 1)}
                        >
                          {q.questionNumber}
                        </button>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: '#999', padding: '0 8px' }}>
                        Writing task
                      </span>
                    )}
                  </div>
                )}

                {/* Show count for inactive parts */}
                {!isActive && (
                  <span className="cambridge-part-count">
                    {answeredInPart} of {partQuestions.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Review Button
        <button 
          className="cambridge-review-button"
          onClick={handleSubmit}
          aria-label="Review your answers"
        >
          <i className="fa fa-check"></i>
          Review
        </button> */}
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

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', textAlign: 'center', maxWidth: '360px', width: '90%' }}>
            <h3 style={{ margin: '0 0 16px' }}>⚠️ Confirm Submission</h3>
            <p>Are you sure you want to submit?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Answered: {Object.keys(answers).length}/{allQuestions.length} questions
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={confirmSubmit} style={{ padding: '12px 24px', background: '#0052cc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                ✓ Submit
              </button>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
