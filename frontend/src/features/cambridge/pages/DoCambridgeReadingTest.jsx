import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
/* eslint-disable-next-line no-unused-vars */
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import QuestionDisplayFactory from "../../../shared/components/questions/displays/QuestionDisplayFactory";
/* eslint-disable-next-line no-unused-vars */
import ClozeMCDisplay from "../../../shared/components/questions/displays/ClozeMCDisplay";
import CambridgeResultsModal from "../components/CambridgeResultsModal";
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
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Current question number
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Flagged questions
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

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

        if (savedTime || savedAnswers) {
          // Restore existing progress (even if answers are empty)
          setHasSavedProgress(true);
          if (savedTime) {
            setTimeRemaining(parseInt(savedTime));
          } else {
            setTimeRemaining((testConfig.duration || 60) * 60);
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
          setTimeRemaining((testConfig.duration || 60) * 60);
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
      const initialTime = (testConfig.duration || 60) * 60;
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

    // Use allQuestions for accurate scoring
    allQuestions.forEach((q) => {
      // Skip writing questions (31-32)
      if (q.questionNumber >= 31) {
        writingQuestions.push({
          questionNumber: q.questionNumber,
          sectionType: q.section.questionType,
          answered: answers[q.key] ? true : false,
          answer: answers[q.key] || null,
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
      const questionType = q.nestedQuestion?.questionType
        || q.section?.questionType
        || q.question?.questionType;

      // Missing correct answer: do not penalize, just log
      if (resolvedCorrect === undefined || resolvedCorrect === null) {
        debugInfo.push(`Q${q.questionNumber}: No correctAnswer field`);
        return;
      }

      scorableCount++;

      if (!userAnswer) return;

      const normalize = (val) => String(val).trim().toLowerCase();

      const explode = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string' && (val.includes('/') || val.includes('|'))) {
          return val.split(/[\/|]/).map((v) => v.trim()).filter(Boolean);
        }
        return [val];
      };

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
  const currentPart = useMemo(() => {
    return test?.parts?.[currentPartIndex] || null;
  }, [test?.parts, currentPartIndex]);

  // Calculate question number range for a part
  const getPartQuestionRange = useCallback((partIndex) => {
    if (!test?.parts) return { start: 1, end: 1 };
    
    let startNum = 1;
    for (let p = 0; p < partIndex; p++) {
      const part = test.parts[p];
      part?.sections?.forEach((sec) => {
        startNum += sec.questions?.length || 0;
      });
    }

    let count = 0;
    test.parts[partIndex]?.sections?.forEach((sec) => {
      count += sec.questions?.length || 0;
    });

    return { start: startNum, end: startNum + count - 1 };
  }, [test?.parts]);

  // Get all questions flattened
  const allQuestions = useMemo(() => {
    if (!test?.parts) return [];
    const questions = [];
    let qNum = 1;
    
    // Helper: Parse blanks from cloze-test passage
    const parseBlanksFromPassage = (passageText, startingNum) => {
      if (!passageText) return [];
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = passageText;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      const blanks = [];
      const regex = /\((\d+)\)|\[(\d+)\]/g;
      let match;
      
      while ((match = regex.exec(plainText)) !== null) {
        blanks.push({
          questionNum: parseInt(match[1] || match[2]),
          fullMatch: match[0],
          index: match.index
        });
      }
      
      if (blanks.length === 0) {
        const underscorePattern = /[_…]{3,}/g;
        let blankIndex = 0;
        while ((match = underscorePattern.exec(plainText)) !== null) {
          blanks.push({
            questionNum: startingNum + blankIndex,
            fullMatch: match[0],
            index: match.index
          });
          blankIndex++;
        }
      }
      
      return blanks.sort((a, b) => a.questionNum - b.questionNum);
    };
    
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
          } else if (section.questionType === 'cloze-test') {
            // For cloze-test (Open Cloze): parse blanks from passage
            const passageText = q.passageText || q.passage || '';
            const blanks = (q.blanks && q.blanks.length > 0) ? q.blanks : parseBlanksFromPassage(passageText, qNum);
            
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
      <div className="cambridge-loading">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2>Loading test...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cambridge-error">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Error: {error}</h2>
        <button onClick={() => navigate(-1)} className="cambridge-nav-button">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="cambridge-test-container">
      {/* Start Modal (only starts timer after click) */}
      {!started && !submitted && !loading && !error && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "26px",
              borderRadius: "14px",
              width: "90%",
              maxWidth: "520px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 12 }}>Bắt đầu làm bài Cambridge Reading</h2>
            {hasSavedProgress ? (
              <>
                <p style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}>
                  Phát hiện bài làm đã được lưu.
                </p>
                <p style={{ marginTop: 10, marginBottom: 0, color: "#6b7280" }}>
                  Thời gian còn lại: <b>{timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}</b>
                </p>
              </>
            ) : (
              <p style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}>
                Bạn có <b>{Math.round(testConfig.duration || 60)} phút</b> để hoàn tất bài làm. Bài làm sẽ được tự động lưu.
              </p>
            )}
            <p style={{ marginTop: 10, marginBottom: 0, color: "#6b7280" }}>
              Đề: <b>{test?.title || testConfig.name || "Cambridge Reading"}</b>
            </p>
            <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280" }}>
              Tổng số câu: <b>{allQuestions.length}</b>
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  padding: "10px 14px",
                  background: "#f1f5f9",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
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
                    setTimeRemaining((testConfig.duration || 60) * 60);
                    setHasSavedProgress(false);
                    setStarted(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    background: "#fff",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  🔄 Làm lại từ đầu
                </button>
              )}

              <button
                onClick={() => {
                  setStarted(true);
                  const initialSeconds = (testConfig.duration || 60) * 60;
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
                style={{
                  padding: "10px 16px",
                  background: "#0052cc",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 800,
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
        answeredCount={Object.keys(answers).length}
        totalQuestions={allQuestions.length}
        onSubmit={handleSubmit}
        submitted={submitted}
        examType={examType}
        timerWarning={timeRemaining > 0 && timeRemaining <= 300}
        timerCritical={timeRemaining > 0 && timeRemaining <= 60}
      />

      {/* Main Content - Split View or Single Column based on question type */}
      {currentQuestion && currentQuestion.section.questionType === 'sign-message' ? (
        /* Part 1 (Sign & Message): Single column with inline image + options */
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Part Instruction */}
            {currentQuestion.part.instruction && (
              <div 
                className="cambridge-part-instruction"
                dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
              />
            )}

            {/* Question Wrapper with Flag */}
            <div className={`cambridge-question-wrapper ${answers[currentQuestion.key] ? 'answered' : ''}`} style={{ position: 'relative' }}>
              {/* Flag Button */}
              <button
                className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                onClick={() => toggleFlag(currentQuestion.key)}
                aria-label="Flag question"
              >
                {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
              </button>

              {/* Inline Layout: Image (30%) + Question/Options (70%) */}
              <div style={{ display: 'flex', gap: '30px', paddingRight: '50px', alignItems: 'flex-start' }}>
                {/* Left: Image/Sign (30% width) */}
                {(currentQuestion.question.imageUrl || currentQuestion.question.signText) && (
                  <div style={{ width: '30%', minWidth: '200px', maxWidth: '362px', flexShrink: 0 }}>
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
                        dangerouslySetInnerHTML={{ __html: currentQuestion.question.signText }}
                      />
                    )}
                  </div>
                )}

                {/* Right: Question Number + Options (70%) */}
                <div style={{ flex: 1 }}>
                  {/* Question Number */}
                  <div style={{ marginBottom: '16px' }}>
                    <span className="cambridge-question-number">
                      {currentQuestion.questionNumber}
                    </span>
                    {currentQuestion.question.questionText && (
                      <span style={{ marginLeft: '12px', fontSize: '15px', color: '#333' }}>
                        {currentQuestion.question.questionText}
                      </span>
                    )}
                  </div>

                  {/* Options List */}
                  {currentQuestion.question.options && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {currentQuestion.question.options.map((option, idx) => {
                        const optionLetter = String.fromCharCode(65 + idx); // A, B, C
                        const questionKey = currentQuestion.key;
                        const isSelected = answers[questionKey] === optionLetter;

                        return (
                          <li key={idx} style={{ marginBottom: '8px' }}>
                            <label style={{ 
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              cursor: 'pointer',
                              padding: '8px 0'
                            }}>
                              <input
                                type="radio"
                                name={`question-${currentQuestion.questionNumber}`}
                                value={optionLetter}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(questionKey, optionLetter)}
                                disabled={submitted}
                                style={{ cursor: 'pointer', marginTop: '4px' }}
                              />
                              <span style={{ fontSize: '15px', lineHeight: '1.6' }}>
                                {option}
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
              className="cambridge-part-instruction"
              dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
            />
          )}

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {(() => {
                const questionData = currentQuestion.section.questions?.[0] || {};
                const passageText = questionData.passageText || questionData.passage || '';
                const passageTitle = questionData.passageTitle || '';
                let blanks = questionData.blanks || []; // Use pre-parsed blanks from backend
                
                // Fallback: If no blanks from backend, parse them dynamically
                if (blanks.length === 0 && passageText) {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = passageText;
                  const plainText = tempDiv.textContent || tempDiv.innerText || '';
                  
                  const blankMatches = [];
                  const regex = /\((\d+)\)|\[(\d+)\]/g;
                  let match;
                  
                  while ((match = regex.exec(plainText)) !== null) {
                    const num = parseInt(match[1] || match[2]);
                    blankMatches.push({
                      questionNum: num,
                      fullMatch: match[0],
                      index: match.index
                    });
                  }
                  
                  // If still no numbered blanks, look for underscores
                  if (blankMatches.length === 0) {
                    const underscorePattern = /[_…]{3,}/g;
                    let blankIndex = 0;
                    const firstQNum = currentQuestion.questionNumber;
                    
                    while ((match = underscorePattern.exec(plainText)) !== null) {
                      blankMatches.push({
                        questionNum: firstQNum + blankIndex,
                        fullMatch: match[0],
                        index: match.index
                      });
                      blankIndex++;
                    }
                  }
                  
                  blanks = blankMatches.sort((a, b) => a.questionNum - b.questionNum);
                }
                
                const renderPassageWithInputs = () => {
                  if (!passageText) return null;
                  
                  const elements = [];
                  let lastIndex = 0;
                  
                  // Find all (25), (26), etc. patterns or [25], [26], etc.
                  const regex = /\((\d+)\)|\[(\d+)\]/g;
                  let match;
                  
                  while ((match = regex.exec(passageText)) !== null) {
                    const questionNumber = parseInt(match[1] || match[2]);
                    const firstQuestionNum = currentQuestion.questionNumber - (allQuestions[currentQuestionIndex].blankIndex || 0);
                    const blankIndex = questionNumber - firstQuestionNum;
                    
                    // Only process if this blank exists in our data
                    if (blankIndex >= 0 && blankIndex < blanks.length) {
                      // Add text before this blank
                      if (match.index > lastIndex) {
                        elements.push(
                          <span 
                            key={`text-${lastIndex}`}
                            dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex, match.index) }}
                          />
                        );
                      }
                      
                      // Add text input
                      const questionKey = `${currentQuestion.partIndex}-${currentQuestion.sectionIndex}-${currentQuestion.questionIndex}-${blankIndex}`;
                      const userAnswer = answers[questionKey] || '';
                      
                      elements.push(
                        <input
                          key={`input-${questionNumber}`}
                          id={`question-${questionNumber}`}
                          type="text"
                          value={userAnswer}
                          onChange={(e) => handleAnswerChange(questionKey, e.target.value.trim())}
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
                      
                      lastIndex = match.index + match[0].length;
                    }
                  }
                  
                  // Add remaining text
                  if (lastIndex < passageText.length) {
                    elements.push(
                      <span 
                        key={`text-${lastIndex}`}
                        dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex) }}
                      />
                    );
                  }
                  
                  return elements;
                };
                
                return (
                  <div className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''}`} style={{ position: 'relative' }}>
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
                        dangerouslySetInnerHTML={{ __html: passageTitle }}
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
      ) : currentQuestion && currentQuestion.section.questionType === 'cloze-mc' ? (
        /* Part 4 (Cloze MC): Single column with inline dropdowns */
        <>
          {/* Part Instruction - Fixed, doesn't scroll */}
          {currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction"
              dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
            />
          )}

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {(() => {
                const questionData = currentQuestion.section.questions?.[0] || {};
                const { passage = '', blanks = [], passageTitle = '' } = questionData;
                
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
                            dangerouslySetInnerHTML={{ __html: passage.substring(lastIndex, match.index) }}
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
                        dangerouslySetInnerHTML={{ __html: passage.substring(lastIndex) }}
                      />
                    );
                  }
                  
                  return elements;
                };
                
                return (
                  <div className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''}`} style={{ position: 'relative' }}>
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
                        dangerouslySetInnerHTML={{ __html: passageTitle }}
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
              className="cambridge-part-instruction"
              dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
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
                              dangerouslySetInnerHTML={{ __html: situation }}
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
                      <div className={`cambridge-question-wrapper ${flaggedQuestions.has(currentQuestion.key) ? 'flagged-section' : ''}`} style={{ position: 'relative' }}>
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
                        <div style={{ marginBottom: '20px', paddingRight: '50px' }}>
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
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          fontSize: '13px',
                          color: '#6b7280',
                          paddingRight: '50px'
                        }}>
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
      ) : (
        <>
          {/* Part Instruction - Above split view */}
          {currentQuestion && currentQuestion.part.instruction && (
            <div 
              className="cambridge-part-instruction"
              dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
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
                        className={`cambridge-question-wrapper ${answers[q.key] ? 'answered' : ''} ${q.key === currentQuestion.key ? 'active-question' : ''}`}
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
                        <div style={{ paddingRight: '50px' }}>
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

                                return (
                                  <li key={optIdx} style={{ marginBottom: '8px' }}>
                                    <label style={{ 
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      padding: '8px 0'
                                    }}>
                                      <input
                                        type="radio"
                                        name={`question-${q.questionNumber}`}
                                        value={optionLetter}
                                        checked={isSelected}
                                        onChange={() => handleAnswerChange(q.key, optionLetter)}
                                        disabled={submitted}
                                        style={{ cursor: 'pointer', marginTop: '4px' }}
                                      />
                                      <span style={{ fontSize: '15px', lineHeight: '1.6' }}>
                                        {option}
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
              ) : (
                /* Other question types: Show single question */
                <div className={`cambridge-question-wrapper ${answers[currentQuestion.key] ? 'answered' : ''}`}>
                  {/* Flag Button */}
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(currentQuestion.key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(currentQuestion.key)}
                    aria-label="Flag question"
                  >
                    {flaggedQuestions.has(currentQuestion.key) ? '🚩' : '⚐'}
                  </button>

                  {/* Question Content */}
                  <div style={{ paddingRight: '50px' }}>
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
      <footer className="cambridge-footer">
        {/* Navigation Arrows - Top Right */}
        <div className="cambridge-footer-arrows">
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === allQuestions.length - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>
        
        {/* Parts Tabs with Question Numbers */}
        <div className="cambridge-parts-container">
          {test?.parts?.map((part, idx) => {
            const range = getPartQuestionRange(idx);
            const isActive = currentPartIndex === idx;
            const partQuestions = allQuestions.filter(q => q.partIndex === idx);
            const answeredInPart = partQuestions.filter(q => answers[q.key]).length;

            return (
              <div key={idx} className="cambridge-part-wrapper">
                {/* Part Tab */}
                <button
                  className={`cambridge-part-tab ${isActive ? 'active' : ''}`}
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
                          className={`cambridge-question-num-btn ${answers[q.key] ? 'answered' : ''} ${currentQuestionIndex === q.questionNumber - 1 ? 'active' : ''} ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
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
