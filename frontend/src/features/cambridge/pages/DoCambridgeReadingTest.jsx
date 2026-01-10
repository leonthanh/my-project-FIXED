import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import QuestionDisplayFactory from "../../../shared/components/questions/displays/QuestionDisplayFactory";

/**
 * DoCambridgeReadingTest - Trang làm bài thi Reading Cambridge (KET, PET, etc.)
 * Support: KET, PET, FLYERS, MOVERS, STARTERS
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

  const questionRefs = useRef({});

  // Get test config
  const testConfig = useMemo(() => {
    return TEST_CONFIGS[testType] || TEST_CONFIGS['ket-reading'];
  }, [testType]);

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

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2>Đang tải đề thi...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Lỗi: {error}</h2>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <TestHeader
        title={test?.title || `${testConfig.name}`}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={formatTime(timeRemaining)}
        onSubmit={handleSubmit}
        submitted={submitted}
      />

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar - Parts Navigation */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>📋 Parts</h3>
          </div>
          {test?.parts?.map((part, idx) => {
            const range = getPartQuestionRange(idx);
            const isActive = currentPartIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => setCurrentPartIndex(idx)}
                style={{
                  ...styles.partItem,
                  ...(isActive && styles.partItemActive),
                }}
              >
                <strong>Part {idx + 1}</strong>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  Questions {range.start}-{range.end}
                </div>
              </div>
            );
          })}

          {/* Question Navigator */}
          <div style={styles.questionNav}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
              📝 Câu hỏi
            </h4>
            <div style={styles.questionGrid}>
              {(() => {
                let num = 1;
                return test?.parts?.map((part, pIdx) => 
                  part.sections?.map((sec, sIdx) =>
                    sec.questions?.map((q, qIdx) => {
                      const key = `${pIdx}-${sIdx}-${qIdx}`;
                      const isAnswered = !!answers[key];
                      const currentNum = num++;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setCurrentPartIndex(pIdx);
                            setActiveQuestion(key);
                          }}
                          style={{
                            ...styles.questionNavItem,
                            ...(isAnswered && styles.questionNavAnswered),
                            ...(activeQuestion === key && styles.questionNavActive),
                          }}
                        >
                          {currentNum}
                        </div>
                      );
                    })
                  )
                );
              })()}
            </div>
          </div>
        </div>

        {/* Main Question Area */}
        <div style={styles.questionArea}>
          {currentPart && (
            <>
              {/* Part Header */}
              <div style={styles.partHeader}>
                <h2 style={{ margin: 0, color: '#0e276f' }}>
                  {currentPart.title || `Part ${currentPartIndex + 1}`}
                </h2>
                {currentPart.instruction && (
                  <div 
                    style={styles.partInstruction}
                    dangerouslySetInnerHTML={{ __html: currentPart.instruction }}
                  />
                )}
              </div>

              {/* Reading Passage (if any) */}
              {currentPart.passage && (
                <div style={styles.passageContainer}>
                  <div 
                    style={styles.passageContent}
                    dangerouslySetInnerHTML={{ __html: currentPart.passage }}
                  />
                </div>
              )}

              {/* Sections & Questions */}
              {currentPart.sections?.map((section, secIdx) => {
                const partRange = getPartQuestionRange(currentPartIndex);
                let startingNumber = partRange.start;
                
                // Calculate starting question for this section
                for (let s = 0; s < secIdx; s++) {
                  const prevSection = currentPart.sections[s];
                  startingNumber += prevSection?.questions?.length || 0;
                }

                return (
                  <div key={secIdx} style={styles.section}>
                    {section.sectionTitle && (
                      <h3 style={styles.sectionTitle}>{section.sectionTitle}</h3>
                    )}
                    
                    {/* Use QuestionDisplayFactory to render appropriate display component */}
                    <QuestionDisplayFactory
                      section={{ ...section, id: `${currentPartIndex}-${secIdx}` }}
                      questionType={section.questionType}
                      startingNumber={startingNumber}
                      onAnswerChange={handleAnswerChange}
                      answers={answers}
                      submitted={submitted}
                    />
                  </div>
                );
              })}
            </>
          )}

          {/* Navigation Buttons */}
          <div style={styles.navButtons}>
            <button
              onClick={() => setCurrentPartIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPartIndex === 0}
              style={{
                ...styles.navButton,
                ...(currentPartIndex === 0 && styles.navButtonDisabled),
              }}
            >
              ← Previous Part
            </button>
            <button
              onClick={() => setCurrentPartIndex((prev) => Math.min((test?.parts?.length || 1) - 1, prev + 1))}
              disabled={currentPartIndex === (test?.parts?.length || 1) - 1}
              style={{
                ...styles.navButton,
                ...(currentPartIndex === (test?.parts?.length || 1) - 1 && styles.navButtonDisabled),
              }}
            >
              Next Part →
            </button>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {submitted && results && (
        <div style={styles.resultsOverlay}>
          <div style={styles.resultsModal}>
            <h2 style={{ margin: '0 0 20px', color: '#0e276f' }}>📊 Kết quả bài thi</h2>
            <div style={styles.scoreDisplay}>
              <div style={styles.scoreNumber}>{results.score}/{results.total}</div>
              <div style={styles.scorePercent}>{results.percentage}%</div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
                📋 Chọn đề khác
              </button>
              <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
                🔄 Làm lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div style={styles.resultsOverlay}>
          <div style={styles.confirmModal}>
            <h3 style={{ margin: '0 0 16px' }}>⚠️ Xác nhận nộp bài</h3>
            <p>Bạn có chắc chắn muốn nộp bài?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Đã trả lời: {Object.keys(answers).length} câu
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={confirmSubmit} style={styles.primaryButton}>
                ✓ Nộp bài
              </button>
              <button onClick={() => setShowConfirm(false)} style={styles.secondaryButton}>
                ✕ Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '24px',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sidebar: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '16px',
    height: 'fit-content',
    position: 'sticky',
    top: '24px',
  },
  sidebarHeader: {
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '12px',
  },
  partItem: {
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
    backgroundColor: '#f1f5f9',
    transition: 'all 0.2s',
  },
  partItemActive: {
    backgroundColor: '#0e276f',
    color: 'white',
  },
  questionNav: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },
  questionNavItem: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  questionNavAnswered: {
    backgroundColor: '#22c55e',
    color: 'white',
  },
  questionNavActive: {
    backgroundColor: '#0e276f',
    color: 'white',
  },
  questionArea: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  partHeader: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  partInstruction: {
    margin: '12px 0 0',
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: 1.6,
    backgroundColor: '#f0f9ff',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6',
  },
  passageContainer: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    border: '1px solid #fcd34d',
  },
  passageContent: {
    lineHeight: 1.8,
    fontSize: '15px',
    color: '#1f2937',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
  },
  sectionPassage: {
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    lineHeight: 1.7,
    fontSize: '14px',
  },
  questionCard: {
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  questionNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '13px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  correctAnswer: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
  },
  originalSentence: {
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  promptWord: {
    padding: '8px 12px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  passage: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    marginBottom: '12px',
    lineHeight: 1.7,
    fontSize: '14px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  optionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  optionCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionText: {
    flex: 1,
    fontSize: '14px',
  },
  matchingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  matchingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  matchingItem: {
    flex: 1,
    fontSize: '14px',
  },
  matchingSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
  },
  rightItemsRef: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
  },
  rightItemBadge: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    fontSize: '13px',
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  navButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  resultsOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  resultsModal: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '16px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
  },
  confirmModal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '360px',
    width: '90%',
  },
  scoreDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '24px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0e276f',
  },
  scorePercent: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#22c55e',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  backButton: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default DoCambridgeReadingTest;
