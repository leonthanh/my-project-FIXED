import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";
import { StudentNavbar } from "../../../shared/components";

/**
 * CambridgeResultPage - Trang xem kết quả chi tiết sau khi nộp bài Cambridge test
 * Hiển thị:
 * - Điểm số tổng quan
 * - Danh sách câu hỏi với đánh dấu đúng/sai
 * - Đáp án đúng cho từng câu
 */
const CambridgeResultPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State from navigation (if available) or fetch from API
  const [submission, setSubmission] = useState(location.state?.submission || null);
  const [test, setTest] = useState(location.state?.test || null);
  const [loading, setLoading] = useState(!location.state?.submission);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, review
  const [expandedParts, setExpandedParts] = useState({});

  // Fetch submission data if not passed via navigation state
  useEffect(() => {
    if (location.state?.submission) return;

    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`));
        if (!res.ok) throw new Error("Không tìm thấy kết quả");
        const data = await res.json();
        setSubmission(data);

        // Fetch test data for question details
        const testType = data.testType.includes('listening') ? 'listening' : 'reading';
        const testRes = await fetch(apiPath(`cambridge/${testType}-tests/${data.testId}`));
        if (testRes.ok) {
          const testData = await testRes.json();
          testData.parts = typeof testData.parts === 'string' 
            ? JSON.parse(testData.parts) 
            : testData.parts;
          setTest(testData);
        }
      } catch (err) {
        console.error("Error fetching submission:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, location.state]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!submission) return null;
    
    const { score, totalQuestions, percentage, detailedResults } = submission;
    
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    if (detailedResults) {
      Object.values(detailedResults).forEach(result => {
        if (result.isCorrect) correctCount++;
        else if (result.userAnswer === null || result.userAnswer === '') unansweredCount++;
        else wrongCount++;
      });
    }

    return {
      score: score || 0,
      total: totalQuestions || 0,
      percentage: percentage || 0,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      grade: getGrade(percentage || 0)
    };
  }, [submission]);

  // Build mapping of answer keys to question numbers
  const questionNumberMap = useMemo(() => {
    const map = {};
    let questionNum = 0;

    if (!test?.parts) return map;

    test.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        section.questions?.forEach((question, qIdx) => {
          // Handle long-text-mc with nested questions
          if (section.questionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
            question.questions.forEach((nestedQ, nestedIdx) => {
              const key = `${partIdx}-${secIdx}-${nestedIdx}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
          }
          // Handle cloze-mc with blanks
          else if (section.questionType === 'cloze-mc' && question.blanks && Array.isArray(question.blanks)) {
            question.blanks.forEach((blank, blankIdx) => {
              const key = `${partIdx}-${secIdx}-${blankIdx}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
          }
          // Handle cloze-test with blanks
          else if (section.questionType === 'cloze-test' && question.blanks && Array.isArray(question.blanks)) {
            question.blanks.forEach((blank, blankIdx) => {
              const key = `${partIdx}-${secIdx}-${blankIdx}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
          }
          // Regular question
          else {
            const key = `${partIdx}-${secIdx}-${qIdx}`;
            map[key] = questionNum + 1;
            questionNum++;
          }
        });
      });
    });

    return map;
  }, [test?.parts]);

  // Get grade based on percentage
  function getGrade(percentage) {
    if (percentage >= 90) return { label: 'Xuất sắc', color: '#22c55e', icon: '🏆' };
    if (percentage >= 80) return { label: 'Giỏi', color: '#3b82f6', icon: '⭐' };
    if (percentage >= 70) return { label: 'Khá', color: '#8b5cf6', icon: '👍' };
    if (percentage >= 60) return { label: 'Trung bình', color: '#f59e0b', icon: '📝' };
    if (percentage >= 50) return { label: 'Đạt', color: '#f97316', icon: '✓' };
    return { label: 'Cần cố gắng', color: '#ef4444', icon: '💪' };
  }

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle part expansion
  const togglePart = (partIdx) => {
    setExpandedParts(prev => ({
      ...prev,
      [partIdx]: !prev[partIdx]
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.errorContainer}>
          <h2>❌ {error}</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  // No submission
  if (!submission) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.errorContainer}>
          <h2>Không tìm thấy kết quả</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <StudentNavbar />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button 
            onClick={() => navigate('/cambridge')} 
            style={styles.backButton}
          >
            ← Quay lại
          </button>
          <div>
            <h1 style={styles.title}>📊 Kết quả bài thi</h1>
            <p style={styles.subtitle}>{submission.testTitle || 'Cambridge Test'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' && styles.tabActive)
          }}
        >
          📈 Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('review')}
          style={{
            ...styles.tab,
            ...(activeTab === 'review' && styles.tabActive)
          }}
        >
          📝 Chi tiết từng câu
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div style={styles.overviewGrid}>
            
            {/* Score Card */}
            <div style={styles.scoreCard}>
              <div style={styles.scoreCircle}>
                <div style={styles.scoreValue}>{stats.score}</div>
                <div style={styles.scoreTotal}>/ {stats.total}</div>
              </div>
              <div style={styles.percentageBar}>
                <div 
                  style={{
                    ...styles.percentageFill,
                    width: `${stats.percentage}%`,
                    backgroundColor: stats.grade.color
                  }}
                />
              </div>
              <div style={{ ...styles.gradeLabel, color: stats.grade.color }}>
                {stats.grade.icon} {stats.grade.label} - {stats.percentage}%
              </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderLeftColor: '#22c55e' }}>
                <div style={styles.statIcon}>✓</div>
                <div style={styles.statNumber}>{stats.correct}</div>
                <div style={styles.statLabel}>Đúng</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#ef4444' }}>
                <div style={styles.statIcon}>✕</div>
                <div style={styles.statNumber}>{stats.wrong}</div>
                <div style={styles.statLabel}>Sai</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#94a3b8' }}>
                <div style={styles.statIcon}>○</div>
                <div style={styles.statNumber}>{stats.unanswered}</div>
                <div style={styles.statLabel}>Bỏ trống</div>
              </div>
            </div>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>📋 Thông tin bài thi</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Loại bài:</span>
                  <span style={styles.infoValue}>{submission.testType?.toUpperCase()}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Thời gian làm:</span>
                  <span style={styles.infoValue}>{formatTime(submission.timeSpent)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Lớp:</span>
                  <span style={styles.infoValue}>{submission.classCode || '--'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Ngày nộp:</span>
                  <span style={styles.infoValue}>
                    {new Date(submission.submittedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionsCard}>
              <button 
                onClick={() => setActiveTab('review')} 
                style={styles.primaryButton}
              >
                📝 Xem chi tiết từng câu
              </button>
              <button 
                onClick={() => navigate('/cambridge')} 
                style={styles.secondaryButton}
              >
                📋 Chọn đề khác
              </button>
            </div>
          </div>
        )}

        {/* Review Tab */}
        {activeTab === 'review' && (
          <div style={styles.reviewContainer}>
            
            {/* Question Summary */}
            <div style={styles.questionSummary}>
              <h3 style={styles.summaryTitle}>Tóm tắt kết quả</h3>
              <div style={styles.questionGrid}>
                {submission.detailedResults && Object.entries(submission.detailedResults).map(([key, result]) => {
                  const questionNum = questionNumberMap[key] || 0;

                  return (
                    <div
                      key={key}
                      style={{
                        ...styles.questionBadge,
                        backgroundColor: result.isCorrect ? '#dcfce7' : 
                          (result.userAnswer === null || result.userAnswer === '') ? '#f1f5f9' : '#fee2e2',
                        color: result.isCorrect ? '#166534' : 
                          (result.userAnswer === null || result.userAnswer === '') ? '#64748b' : '#991b1b'
                      }}
                      title={result.isCorrect ? 'Đúng' : 'Sai'}
                    >
                      {questionNum}
                    </div>
                  );
                })}
              </div>
              <div style={styles.legendRow}>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: '#dcfce7'}}></span> Đúng</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: '#fee2e2'}}></span> Sai</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: '#f1f5f9'}}></span> Bỏ trống</span>
              </div>
            </div>

            {/* Detailed Review by Part */}
            {test?.parts?.map((part, partIdx) => (
              <div key={partIdx} style={styles.partCard}>
                <div 
                  style={styles.partHeader}
                  onClick={() => togglePart(partIdx)}
                >
                  <div style={styles.partTitle}>
                    📖 Part {partIdx + 1}: {part.partTitle || `Part ${partIdx + 1}`}
                  </div>
                  <span style={styles.expandIcon}>
                    {expandedParts[partIdx] ? '▼' : '▶'}
                  </span>
                </div>

                {expandedParts[partIdx] && (
                  <div style={styles.partContent}>
                    {part.sections?.map((section, secIdx) => (
                      <div key={secIdx} style={styles.sectionBlock}>
                        {section.sectionTitle && (
                          <div style={styles.sectionTitle}>{section.sectionTitle}</div>
                        )}
                        
                        {section.questions?.map((question, qIdx) => {
                          // Handle long-text-mc with nested questions
                          if (section.questionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {question.questions.map((nestedQ, nestedIdx) => {
                                  const key = `${partIdx}-${secIdx}-${nestedIdx}`;
                                  const result = submission.detailedResults?.[key] || {};
                                  const questionNum = questionNumberMap[key] || 0;

                                  return (
                                    <div 
                                      key={`${qIdx}-${nestedIdx}`}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                        }}>
                                          {questionNum}
                                        </span>
                                        <span style={styles.questionStatus}>
                                          {result.isCorrect ? '✓ Đúng' : '✕ Sai'}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.questionText}>
                                        {nestedQ.questionText || 'Question'}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: result.isCorrect ? '#166534' : '#991b1b',
                                            backgroundColor: result.isCorrect ? '#dcfce7' : '#fee2e2'
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {!result.isCorrect && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{
                                              ...styles.answerValue,
                                              color: '#166534',
                                              backgroundColor: '#dcfce7'
                                            }}>
                                              {result.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Handle cloze-mc and cloze-test with blanks
                          else if ((section.questionType === 'cloze-mc' || section.questionType === 'cloze-test') && 
                                   question.blanks && Array.isArray(question.blanks)) {
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {question.blanks.map((blank, blankIdx) => {
                                  const key = `${partIdx}-${secIdx}-${blankIdx}`;
                                  const result = submission.detailedResults?.[key] || {};
                                  const questionNum = questionNumberMap[key] || 0;

                                  return (
                                    <div 
                                      key={`${qIdx}-${blankIdx}`}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                        }}>
                                          {questionNum}
                                        </span>
                                        <span style={styles.questionStatus}>
                                          {result.isCorrect ? '✓ Đúng' : '✕ Sai'}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.questionText}>
                                        {blank.questionText || 'Question'}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: result.isCorrect ? '#166534' : '#991b1b',
                                            backgroundColor: result.isCorrect ? '#dcfce7' : '#fee2e2'
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {!result.isCorrect && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{
                                              ...styles.answerValue,
                                              color: '#166534',
                                              backgroundColor: '#dcfce7'
                                            }}>
                                              {result.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Regular questions
                          else {
                            const key = `${partIdx}-${secIdx}-${qIdx}`;
                            const result = submission.detailedResults?.[key] || {};
                            const questionNum = questionNumberMap[key] || 0;

                            return (
                              <div 
                                key={qIdx} 
                                style={{
                                  ...styles.questionReviewCard,
                                  borderLeftColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                }}
                              >
                                <div style={styles.questionReviewHeader}>
                                  <span style={{
                                    ...styles.questionNum,
                                    backgroundColor: result.isCorrect ? '#22c55e' : '#ef4444'
                                  }}>
                                    {questionNum}
                                  </span>
                                  <span style={styles.questionStatus}>
                                    {result.isCorrect ? '✓ Đúng' : '✕ Sai'}
                                  </span>
                                </div>
                                
                                <div style={styles.questionText}>
                                  {question.questionText || 'Question'}
                                </div>

                                <div style={styles.answersCompare}>
                                  <div style={styles.answerRow}>
                                    <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                    <span style={{
                                      ...styles.answerValue,
                                      color: result.isCorrect ? '#166534' : '#991b1b',
                                      backgroundColor: result.isCorrect ? '#dcfce7' : '#fee2e2'
                                    }}>
                                      {result.userAnswer || '(Không trả lời)'}
                                    </span>
                                  </div>
                                  {!result.isCorrect && (
                                    <div style={styles.answerRow}>
                                      <span style={styles.answerLabel}>Đáp án đúng:</span>
                                      <span style={{
                                        ...styles.answerValue,
                                        color: '#166534',
                                        backgroundColor: '#dcfce7'
                                      }}>
                                        {result.correctAnswer}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Show options for multiple choice */}
                                {(question.questionType === 'abc' || question.questionType === 'abcd') && question.options && (
                                  <div style={styles.optionsList}>
                                    {question.options.map((opt, optIdx) => {
                                      const optLabel = String.fromCharCode(65 + optIdx);
                                      const isSelected = result.userAnswer === optLabel;
                                      const isCorrectOpt = result.correctAnswer === optLabel;
                                      
                                      return (
                                        <div 
                                          key={optIdx}
                                          style={{
                                            ...styles.optionItem,
                                            backgroundColor: isCorrectOpt ? '#dcfce7' : 
                                              (isSelected && !isCorrectOpt) ? '#fee2e2' : '#f8fafc',
                                            borderColor: isCorrectOpt ? '#22c55e' : 
                                              (isSelected && !isCorrectOpt) ? '#ef4444' : '#e5e7eb'
                                          }}
                                        >
                                          <span style={styles.optionLabel}>{optLabel}.</span>
                                          <span>{opt}</span>
                                          {isCorrectOpt && <span style={styles.correctMark}>✓</span>}
                                          {isSelected && !isCorrectOpt && <span style={styles.wrongMark}>✕</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Back to Overview */}
            <div style={styles.reviewActions}>
              <button 
                onClick={() => setActiveTab('overview')} 
                style={styles.secondaryButton}
              >
                ← Quay lại tổng quan
              </button>
              <button 
                onClick={() => navigate('/cambridge')} 
                style={styles.primaryButton}
              >
                📋 Chọn đề khác
              </button>
            </div>
          </div>
        )}
      </div>
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
    minHeight: '80vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    gap: '20px',
  },
  header: {
    backgroundColor: '#0e276f',
    color: 'white',
    padding: '20px 24px',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
  },
  subtitle: {
    margin: '4px 0 0',
    opacity: 0.8,
    fontSize: '14px',
  },
  tabContainer: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
    display: 'flex',
    gap: '4px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  tab: {
    padding: '16px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    color: '#64748b',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#0e276f',
    borderBottomColor: '#0e276f',
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  
  // Overview styles
  overviewGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  scoreCircle: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  scoreValue: {
    fontSize: '64px',
    fontWeight: 700,
    color: '#0e276f',
  },
  scoreTotal: {
    fontSize: '28px',
    color: '#64748b',
  },
  percentageBar: {
    height: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  percentageFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease-out',
  },
  gradeLabel: {
    fontSize: '20px',
    fontWeight: 600,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderLeft: '4px solid',
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  infoTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    color: '#1e293b',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: '14px',
  },
  infoValue: {
    fontWeight: 600,
    color: '#1e293b',
  },
  actionsCard: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },

  // Review styles
  reviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  questionSummary: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  summaryTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    color: '#1e293b',
  },
  questionGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  questionBadge: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '14px',
  },
  legendRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
  },
  legendDot: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
  },
  partCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  partHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    borderBottom: '1px solid #e5e7eb',
  },
  partTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  expandIcon: {
    color: '#64748b',
    fontSize: '12px',
  },
  partContent: {
    padding: '20px',
  },
  sectionBlock: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
  },
  questionReviewCard: {
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    borderLeft: '4px solid',
  },
  questionReviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  questionNum: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: 'white',
    fontWeight: 600,
    fontSize: '13px',
  },
  questionStatus: {
    fontSize: '14px',
    fontWeight: 600,
  },
  questionText: {
    fontSize: '15px',
    color: '#374151',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  answersCompare: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  answerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  answerLabel: {
    fontSize: '13px',
    color: '#64748b',
    minWidth: '140px',
  },
  answerValue: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  optionsList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
  },
  optionLabel: {
    fontWeight: 600,
    color: '#64748b',
  },
  correctMark: {
    marginLeft: 'auto',
    color: '#22c55e',
    fontWeight: 700,
  },
  wrongMark: {
    marginLeft: 'auto',
    color: '#ef4444',
    fontWeight: 700,
  },
  reviewActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '24px',
  },

  // Buttons
  primaryButton: {
    padding: '14px 28px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '14px 28px',
    backgroundColor: '#f1f5f9',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all 0.2s',
  },
};

export default CambridgeResultPage;
