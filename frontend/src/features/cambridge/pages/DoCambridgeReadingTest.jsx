import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import QuestionDisplayFactory from "../../../shared/components/questions/displays/QuestionDisplayFactory";
import "./DoCambridgeReadingTest.css";

/**
 * DoCambridgeReadingTest - Cambridge Reading Test (Authentic UI)
 * Replicate real Cambridge test interface for KET, PET, FLYERS, etc.
 */
const DoCambridgeReadingTest = () => {
  const { testType, id } = useParams(); // testType: ket-reading, pet-reading, etc.
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
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Current question number
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Flagged questions

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
        setTimeRemaining((testConfig.duration || 60) * 60);
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id, testConfig.duration]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !test) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          confirmSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, submitted]);

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
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: value,
      }));
    },
    [submitted]
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
          timeSpent
        }),
      });

      if (!res.ok) throw new Error("Lỗi khi nộp bài");

      const data = await res.json();
      
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
    } catch (err) {
      console.error("Error submitting:", err);
      // Calculate locally if backend not ready
      const localResults = calculateLocalResults();
      setResults(localResults);
      setSubmitted(true);
      setShowConfirm(false);
    }
  };

  // Calculate results locally (fallback)
  const calculateLocalResults = () => {
    let correct = 0;
    let total = 0;

    test?.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        section.questions?.forEach((q, qIdx) => {
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
    
    test.parts.forEach((part, pIdx) => {
      part.sections?.forEach((section, sIdx) => {
        section.questions?.forEach((q, qIdx) => {
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
      setCurrentQuestionIndex(index);
      const q = allQuestions[index];
      setCurrentPartIndex(q.partIndex);
      setActiveQuestion(q.key);
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
      {/* Header */}
      <TestHeader
        title={test?.title || `${testConfig.name}`}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={timeRemaining}
        answeredCount={Object.keys(answers).length}
        totalQuestions={test?.totalQuestions || allQuestions.length}
        onSubmit={handleSubmit}
        submitted={submitted}
        examType={testConfig.name?.split(' ')[0]}
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
                style={{ marginBottom: '20px' }}
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
                      <div style={{
                        marginTop: currentQuestion.question.imageUrl ? '12px' : '0',
                        padding: '16px',
                        border: '2px solid #333',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: '600',
                        textAlign: 'center',
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
      ) : (
        /* Other Parts: Split-view layout (Passage left | Questions right) */
        <>
          <div className="cambridge-main-content">
            {/* Left Column - Passage */}
            <div className="cambridge-passage-column">
              {currentQuestion && (
                <>
                  {/* Part Instruction */}
                  {currentQuestion.part.instruction && (
                    <div 
                      className="cambridge-part-instruction"
                      style={{ marginBottom: '20px' }}
                      dangerouslySetInnerHTML={{ __html: currentQuestion.part.instruction }}
                    />
                  )}

                  {/* Passage (if exists) */}
                  {currentQuestion.part.passage ? (
                    <div className="cambridge-passage-container">
                      {currentQuestion.part.title && (
                        <h3 className="cambridge-passage-title">
                          {currentQuestion.part.title}
                        </h3>
                      )}
                      <div 
                        className="cambridge-passage-content"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.part.passage }}
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

        {/* Right Column - Questions */}
        <div className="cambridge-questions-column">
          {currentQuestion && (
            <div className="cambridge-content-wrapper">
              {/* Section Title */}
              {currentQuestion.section.sectionTitle && (
                <h3 className="cambridge-section-title">
                  {currentQuestion.section.sectionTitle}
                </h3>
              )}

              {/* Question Display */}
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
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Footer Navigation */}
      <footer className="cambridge-footer">
        {/* Previous/Next Arrows */}
        <div className="cambridge-footer-nav">
          <button
            className="cambridge-footer-arrow"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            aria-label="Previous"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-footer-arrow"
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === allQuestions.length - 1}
            aria-label="Next"
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
                    {partQuestions.map((q) => (
                      <button
                        key={q.key}
                        className={`cambridge-question-num-btn ${answers[q.key] ? 'answered' : ''} ${currentQuestionIndex === q.questionNumber - 1 ? 'active' : ''} ${flaggedQuestions.has(q.key) ? 'flagged' : ''}`}
                        onClick={() => goToQuestion(q.questionNumber - 1)}
                      >
                        {q.questionNumber}
                      </button>
                    ))}
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

        {/* Review Button */}
        <button 
          className="cambridge-review-button"
          onClick={handleSubmit}
          aria-label="Review your answers"
        >
          <i className="fa fa-check"></i>
          Review
        </button>
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
    </div>
  );
};

export default DoCambridgeReadingTest;
