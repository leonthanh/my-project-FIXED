import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";

/**
 * DoListeningTest - Trang làm bài thi Listening IELTS
 * - Audio chỉ nghe 1 lần (không tua lại được)
 * - Thời gian 30 phút
 * - Giao diện theo mẫu youpass.vn
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
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
  const [audioPlayed, setAudioPlayed] = useState({}); // Track which parts have been played
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedQuestion, setFocusedQuestion] = useState(null);
  
  const audioRef = useRef(null);
  const questionRefs = useRef({});

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`listening-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        const data = await res.json();
        console.log("Raw test data:", data);
        
        // Parse JSON strings if needed (Sequelize returns JSON as strings)
        const parsedData = {
          ...data,
          partTypes: typeof data.partTypes === 'string' ? JSON.parse(data.partTypes) : data.partTypes,
          partInstructions: typeof data.partInstructions === 'string' ? JSON.parse(data.partInstructions) : data.partInstructions,
          questions: typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions,
          partAudioUrls: typeof data.partAudioUrls === 'string' ? JSON.parse(data.partAudioUrls) : data.partAudioUrls,
        };
        console.log("Parsed test data:", parsedData);
        setTest(parsedData);
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !test) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit(); // Auto submit when time's up
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer change
  const handleAnswerChange = (questionKey, value) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value.trim()
    }));
  };

  // Handle submit
  const handleSubmit = () => {
    setShowConfirm(true);
  };

  // Auto submit when time's up
  const handleAutoSubmit = async () => {
    await confirmSubmit();
  };

  // Confirm and submit
  const confirmSubmit = async () => {
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
    } catch (err) {
      console.error("Error submitting:", err);
      alert("❌ Có lỗi xảy ra khi nộp bài!");
    }
  };

  // Get parts data from test
  const getParts = () => {
    if (!test) return [];
    
    console.log("getParts - test.partInstructions:", test.partInstructions);
    console.log("getParts - is array:", Array.isArray(test.partInstructions));
    
    // New structure: partInstructions contains parts info
    if (test.partInstructions && Array.isArray(test.partInstructions)) {
      return test.partInstructions;
    }
    
    return [];
  };

  // Get questions for a specific part and section
  const getQuestionsForSection = (partIndex, sectionIndex) => {
    if (!test || !test.questions) return [];
    
    console.log("getQuestionsForSection - questions:", test.questions);
    
    const filtered = test.questions.filter(q => 
      q.partIndex === partIndex && q.sectionIndex === sectionIndex
    );
    console.log(`Questions for part ${partIndex}, section ${sectionIndex}:`, filtered);
    return filtered;
  };

  // Render form completion question
  const renderFormCompletion = (question) => {
    const formRows = question.formRows || [];
    
    return (
      <div style={formContainerStyle}>
        {question.formTitle && (
          <h4 style={{ marginBottom: "16px", color: "#1e40af" }}>
            📋 {question.formTitle}
          </h4>
        )}
        
        <div style={{ lineHeight: "2.2" }}>
          {formRows.map((row, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
              paddingLeft: row.isSubRow ? "40px" : "0",
            }}>
              {/* Label */}
              {row.label && (
                <span style={{ fontWeight: 500, minWidth: "180px" }}>
                  {row.label}
                </span>
              )}
              
              {/* Prefix */}
              {row.prefix && <span>{row.prefix}</span>}
              
              {/* Blank or Value */}
              {row.isBlank ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={blankNumberStyle}>{row.blankNumber}</span>
                  <input
                    type="text"
                    value={answers[`q${row.blankNumber}`] || ""}
                    onChange={(e) => handleAnswerChange(`q${row.blankNumber}`, e.target.value)}
                    disabled={submitted}
                    style={inputStyle}
                    placeholder="Nhập đáp án..."
                  />
                </span>
              ) : (
                <span>{row.suffix}</span>
              )}
              
              {/* Suffix (for blanks) */}
              {row.isBlank && row.suffix && <span>{row.suffix}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render fill in the blank question
  const renderFillQuestion = (question, globalNumber) => {
    return (
      <div style={questionItemStyle}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={questionNumberStyle}>{globalNumber}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 8px 0" }}>{question.questionText}</p>
            <input
              type="text"
              value={answers[`q${globalNumber}`] || ""}
              onChange={(e) => handleAnswerChange(`q${globalNumber}`, e.target.value)}
              disabled={submitted}
              style={inputStyle}
              placeholder="Nhập đáp án..."
            />
          </div>
        </div>
      </div>
    );
  };

  // Render multiple choice question (abc/abcd)
  const renderMultipleChoice = (question, globalNumber) => {
    const options = question.options || [];
    
    return (
      <div style={questionItemStyle}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={questionNumberStyle}>{globalNumber}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: 500 }}>{question.questionText}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {options.map((opt, idx) => {
                const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
                const isSelected = answers[`q${globalNumber}`] === optionLetter;
                
                return (
                  <label
                    key={idx}
                    style={{
                      ...optionStyle,
                      backgroundColor: isSelected ? "#dbeafe" : "#f9fafb",
                      borderColor: isSelected ? "#3b82f6" : "#e5e7eb",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q${globalNumber}`}
                      value={optionLetter}
                      checked={isSelected}
                      onChange={(e) => handleAnswerChange(`q${globalNumber}`, e.target.value)}
                      disabled={submitted}
                      style={{ marginRight: "10px" }}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render matching question
  const renderMatching = (question, startNumber) => {
    const leftItems = question.leftItems || [];
    const rightItems = question.rightItems || question.items || [];
    
    return (
      <div style={formContainerStyle}>
        <p style={{ marginBottom: "16px", fontWeight: 500 }}>{question.questionText}</p>
        
        {/* Options box */}
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #86efac",
        }}>
          <strong>Lựa chọn:</strong>
          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {rightItems.map((item, idx) => (
              <span key={idx} style={{
                padding: "4px 12px",
                backgroundColor: "white",
                borderRadius: "16px",
                fontSize: "13px",
                border: "1px solid #d1d5db",
              }}>
                {typeof item === 'object' ? `${item.label}. ${item.text}` : item}
              </span>
            ))}
          </div>
        </div>
        
        {/* Questions */}
        {leftItems.map((item, idx) => {
          const qNum = startNumber + idx;
          return (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
              padding: "10px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}>
              <span style={questionNumberStyle}>{qNum}</span>
              <span style={{ flex: 1 }}>{item}</span>
              <select
                value={answers[`q${qNum}`] || ""}
                onChange={(e) => handleAnswerChange(`q${qNum}`, e.target.value)}
                disabled={submitted}
                style={selectStyle}
              >
                <option value="">-- Chọn --</option>
                {rightItems.map((opt, optIdx) => {
                  const label = typeof opt === 'object' ? opt.label : String.fromCharCode(65 + optIdx);
                  return (
                    <option key={optIdx} value={label}>{label}</option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  // Render questions based on type
  const renderQuestion = (question, sectionType) => {
    const qType = question.questionType || sectionType || "fill";
    const globalNum = question.globalNumber;
    
    switch (qType) {
      case "form-completion":
        return renderFormCompletion(question);
      case "abc":
      case "abcd":
        return renderMultipleChoice(question, globalNum);
      case "matching":
        return renderMatching(question, globalNum);
      case "fill":
      default:
        return renderFillQuestion(question, globalNum);
    }
  };

  // Render a section
  const renderSection = (section, partIndex, sectionIndex) => {
    const questions = getQuestionsForSection(partIndex, sectionIndex);
    
    return (
      <div key={sectionIndex} style={sectionStyle}>
        <h4 style={{ color: "#1e40af", marginBottom: "12px", fontSize: "16px" }}>
          📝 {section.sectionTitle}
        </h4>
        
        {section.sectionInstruction && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#fef9c3",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
            borderLeft: "4px solid #facc15",
          }}>
            {section.sectionInstruction}
          </div>
        )}
        
        {questions.map((q, idx) => (
          <div 
            key={idx}
            ref={el => questionRefs.current[q.globalNumber] = el}
            style={{
              transition: 'all 0.3s ease',
              backgroundColor: focusedQuestion === q.globalNumber ? '#dbeafe' : 'transparent',
              borderRadius: '8px',
              margin: '-4px',
              padding: '4px',
            }}
          >
            {renderQuestion(q, section.questionType)}
          </div>
        ))}
      </div>
    );
  };

  // Get question ranges for each part
  const getPartQuestionRange = useCallback((partIndex) => {
    const allQuestions = test?.questions || [];
    const partQuestions = allQuestions.filter(q => q.partIndex === partIndex);
    if (partQuestions.length === 0) return { start: 0, end: 0 };
    const nums = partQuestions.map(q => q.globalNumber);
    return { start: Math.min(...nums), end: Math.max(...nums) };
  }, [test?.questions]);

  // Count answered questions in a part
  const getAnsweredCount = useCallback((partIndex) => {
    const range = getPartQuestionRange(partIndex);
    let count = 0;
    for (let i = range.start; i <= range.end; i++) {
      if (answers[`q${i}`]) count++;
    }
    return count;
  }, [getPartQuestionRange, answers]);

  // Get total questions in a part
  const getPartTotalQuestions = useCallback((partIndex) => {
    const range = getPartQuestionRange(partIndex);
    return range.end - range.start + 1;
  }, [getPartQuestionRange]);

  // Scroll to question
  const scrollToQuestion = useCallback((qNum) => {
    const el = questionRefs.current[qNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFocusedQuestion(qNum);
      setTimeout(() => setFocusedQuestion(null), 2000);
    }
  }, []);

  // Handle audio ended
  const handleAudioEnded = useCallback((partIndex) => {
    setAudioPlayed(prev => ({ ...prev, [partIndex]: true }));
    setIsPlaying(false);
  }, []);

  // Handle audio play - prevent replay
  const handleAudioPlay = useCallback((partIndex) => {
    if (audioPlayed[partIndex]) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = audioRef.current.duration;
      }
      alert('⚠️ Audio này chỉ được nghe 1 lần!');
      return;
    }
    setIsPlaying(true);
  }, [audioPlayed]);

  // Loading state
  if (loading) {
    return (
      <div style={loadingStyle}>
        <div className="spinner" style={{ marginBottom: "16px" }}></div>
        ⏳ Đang tải đề thi...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={errorStyle}>
        <h2>❌ Lỗi</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/select-test")} style={primaryButtonStyle}>
          ← Quay lại
        </button>
      </div>
    );
  }

  const parts = getParts();

  // Debug output
  console.log("Rendering - parts:", parts);
  console.log("Rendering - parts.length:", parts.length);
  console.log("Rendering - currentPartIndex:", currentPartIndex);

  return (
    <div style={pageWrapperStyle}>
      {/* Top Header - youpass style */}
      <header style={topHeaderStyle}>
        <div style={headerLeftStyle}>
          <button 
            onClick={() => navigate('/select-test')} 
            style={backButtonStyle}
          >
            ← Thoát
          </button>
          <h1 style={testTitleStyle}>IELTS Listening Test</h1>
        </div>
        
        <div style={headerRightStyle}>
          <div style={{
            ...timerBoxStyle,
            backgroundColor: timeRemaining < 300 ? '#fee2e2' : '#dcfce7',
            color: timeRemaining < 300 ? '#dc2626' : '#16a34a',
          }}>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>⏱ Còn lại</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={submitted}
            style={submitButtonStyle}
          >
            📤 Nộp bài
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={mainContentStyle}>
        {/* Audio Player - Fixed at top of content */}
        {(() => {
          const audioUrl = test?.partAudioUrls?.[currentPartIndex] || test?.mainAudioUrl;
          const hasPlayed = audioPlayed[currentPartIndex];
          
          return audioUrl && (
            <div style={audioSectionStyle}>
              <div style={audioPlayerWrapperStyle}>
                <div style={audioInfoStyle}>
                  <span style={audioLabelStyle}>🎧 Audio {parts[currentPartIndex]?.title}</span>
                  {hasPlayed && (
                    <span style={audioPlayedBadgeStyle}>✓ Đã phát xong</span>
                  )}
                </div>
                <audio
                  ref={audioRef}
                  controls
                  controlsList="nodownload noplaybackrate"
                  style={{ 
                    width: '100%', 
                    opacity: hasPlayed ? 0.5 : 1,
                    pointerEvents: hasPlayed ? 'none' : 'auto'
                  }}
                  src={hostPath(audioUrl)}
                  onPlay={() => handleAudioPlay(currentPartIndex)}
                  onEnded={() => handleAudioEnded(currentPartIndex)}
                  onSeeking={(e) => {
                    // Prevent seeking backwards
                    if (audioRef.current && e.target.currentTime < audioRef.current.currentTime) {
                      e.target.currentTime = audioRef.current.currentTime;
                    }
                  }}
                />
                {hasPlayed && (
                  <p style={audioWarningStyle}>⚠️ Audio chỉ được nghe 1 lần. Bạn đã nghe xong phần này.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Part Content */}
        <div style={contentAreaStyle}>
          {parts[currentPartIndex] && (
            <>
              {/* Part Header */}
              <div style={partTitleBarStyle}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>
                  {parts[currentPartIndex].title}
                </h2>
                <span style={questionRangeStyle}>
                  Câu {getPartQuestionRange(currentPartIndex).start} - {getPartQuestionRange(currentPartIndex).end}
                </span>
              </div>

              {/* Part Instruction */}
              {parts[currentPartIndex].instruction && (
                <div style={instructionBoxStyle}>
                  <div dangerouslySetInnerHTML={{ __html: parts[currentPartIndex].instruction }} />
                </div>
              )}

              {/* Sections */}
              {parts[currentPartIndex].sections?.map((section, sIdx) => 
                renderSection(section, currentPartIndex, sIdx)
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar - youpass style */}
      <nav style={bottomNavStyle}>
        {/* Part Tabs */}
        <div style={partTabsContainerStyle}>
          {parts.map((part, idx) => {
            const range = getPartQuestionRange(idx);
            const answered = getAnsweredCount(idx);
            const total = getPartTotalQuestions(idx);
            
            return (
              <button
                key={idx}
                onClick={() => setCurrentPartIndex(idx)}
                style={{
                  ...partTabStyle,
                  backgroundColor: currentPartIndex === idx ? '#3b82f6' : '#f1f5f9',
                  color: currentPartIndex === idx ? 'white' : '#475569',
                  borderColor: currentPartIndex === idx ? '#3b82f6' : '#e2e8f0',
                }}
              >
                <span style={partTabTitleStyle}>{part.title}</span>
                <span style={partTabRangeStyle}>Câu {range.start}-{range.end}</span>
                <span style={{
                  ...partTabProgressStyle,
                  backgroundColor: currentPartIndex === idx ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                }}>
                  {answered}/{total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question Number Grid */}
        <div style={questionGridStyle}>
          {(() => {
            const range = getPartQuestionRange(currentPartIndex);
            const buttons = [];
            for (let i = range.start; i <= range.end; i++) {
              const isAnswered = !!answers[`q${i}`];
              const isFocused = focusedQuestion === i;
              buttons.push(
                <button
                  key={i}
                  onClick={() => scrollToQuestion(i)}
                  style={{
                    ...questionNumButtonStyle,
                    backgroundColor: isAnswered ? '#22c55e' : '#f1f5f9',
                    color: isAnswered ? 'white' : '#64748b',
                    borderColor: isFocused ? '#3b82f6' : (isAnswered ? '#22c55e' : '#e2e8f0'),
                    transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {i}
                </button>
              );
            }
            return buttons;
          })()}
        </div>

        {/* Navigation Arrows */}
        <div style={navArrowsStyle}>
          <button
            onClick={() => setCurrentPartIndex(Math.max(0, currentPartIndex - 1))}
            disabled={currentPartIndex === 0}
            style={{
              ...navArrowButtonStyle,
              opacity: currentPartIndex === 0 ? 0.3 : 1,
            }}
          >
            ← Phần trước
          </button>
          <button
            onClick={() => setCurrentPartIndex(Math.min(parts.length - 1, currentPartIndex + 1))}
            disabled={currentPartIndex === parts.length - 1}
            style={{
              ...navArrowButtonStyle,
              opacity: currentPartIndex === parts.length - 1 ? 0.3 : 1,
            }}
          >
            Phần sau →
          </button>
        </div>
      </nav>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>📋 Xác nhận nộp bài</h3>
            <p>Bạn có chắc chắn muốn nộp bài?</p>
            
            {/* Summary */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#64748b' }}>
                Tổng quan bài làm:
              </p>
              {parts.map((part, idx) => {
                const answered = getAnsweredCount(idx);
                const total = getPartTotalQuestions(idx);
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: '14px'
                  }}>
                    <span>{part.title}</span>
                    <span style={{ 
                      color: answered === total ? '#22c55e' : '#f59e0b',
                      fontWeight: 500
                    }}>
                      {answered}/{total} câu
                    </span>
                  </div>
                );
              })}
            </div>
            
            <p style={{ color: '#ef4444', fontSize: '14px', margin: '0 0 16px' }}>
              ⚠️ Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={cancelButtonStyle}>
                Hủy
              </button>
              <button onClick={confirmSubmit} style={confirmButtonStyle}>
                ✅ Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {results && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: '#059669' }}>
              🎉 Kết quả bài thi
            </h3>
            
            <div style={{
              textAlign: 'center',
              padding: '24px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '56px', fontWeight: 'bold', color: '#059669' }}>
                {results.score || 0}/{results.total || 40}
              </div>
              <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Số câu đúng</p>
              
              {/* Band Score Estimate */}
              <div style={{ 
                marginTop: '16px', 
                padding: '8px 16px', 
                backgroundColor: 'white', 
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Band Score: </span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                  {Math.min(9, Math.max(1, Math.round((results.score / 40) * 9 * 2) / 2)).toFixed(1)}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/select-test')}
                style={cancelButtonStyle}
              >
                ← Về trang chủ
              </button>
              <button
                onClick={() => navigate(`/listening-results/${id}`)}
                style={confirmButtonStyle}
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

// Styles - youpass.vn inspired design
const pageWrapperStyle = {
  minHeight: "100vh",
  backgroundColor: "#f1f5f9",
  display: "flex",
  flexDirection: "column",
};

const topHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 24px",
  backgroundColor: "#1e40af",
  color: "white",
  position: "sticky",
  top: 0,
  zIndex: 100,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const backButtonStyle = {
  padding: "8px 16px",
  backgroundColor: "rgba(255,255,255,0.15)",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
};

const testTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 600,
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const timerBoxStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "8px 16px",
  borderRadius: "8px",
  minWidth: "100px",
};

const submitButtonStyle = {
  padding: "10px 24px",
  backgroundColor: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "15px",
  transition: "all 0.2s",
};

const mainContentStyle = {
  flex: 1,
  padding: "20px",
  paddingBottom: "200px", // Space for bottom nav
  maxWidth: "900px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
};

const audioSectionStyle = {
  marginBottom: "20px",
};

const audioPlayerWrapperStyle = {
  padding: "16px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const audioInfoStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const audioLabelStyle = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#1e40af",
};

const audioPlayedBadgeStyle = {
  padding: "4px 12px",
  backgroundColor: "#dcfce7",
  color: "#16a34a",
  borderRadius: "16px",
  fontSize: "13px",
  fontWeight: 500,
};

const audioWarningStyle = {
  margin: "12px 0 0",
  padding: "8px 12px",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  borderRadius: "6px",
  fontSize: "13px",
};

const contentAreaStyle = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const partTitleBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  backgroundColor: "#1e40af",
  color: "white",
  borderRadius: "8px",
  marginBottom: "16px",
};

const questionRangeStyle = {
  padding: "4px 12px",
  backgroundColor: "rgba(255,255,255,0.2)",
  borderRadius: "16px",
  fontSize: "13px",
};

const instructionBoxStyle = {
  padding: "16px",
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  marginBottom: "20px",
  borderLeft: "4px solid #3b82f6",
};

const sectionStyle = {
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  marginBottom: "20px",
  backgroundColor: "#fafafa",
};

const formContainerStyle = {
  padding: "16px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const questionItemStyle = {
  padding: "16px",
  marginBottom: "12px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  transition: "all 0.2s",
};

const questionNumberStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  backgroundColor: "#3b82f6",
  color: "white",
  borderRadius: "50%",
  fontWeight: "bold",
  fontSize: "14px",
  flexShrink: 0,
};

const blankNumberStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  backgroundColor: "#3b82f6",
  color: "white",
  borderRadius: "50%",
  fontWeight: "bold",
  fontSize: "12px",
};

const inputStyle = {
  padding: "10px 14px",
  border: "2px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "15px",
  width: "220px",
  transition: "all 0.2s",
  outline: "none",
};

const selectStyle = {
  padding: "10px 14px",
  border: "2px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "15px",
  minWidth: "140px",
  cursor: "pointer",
  backgroundColor: "white",
};

const optionStyle = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  border: "2px solid",
  transition: "all 0.2s",
};

// Bottom Navigation Styles
const bottomNavStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "white",
  borderTop: "1px solid #e2e8f0",
  boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
  padding: "12px 20px",
  zIndex: 100,
};

const partTabsContainerStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "12px",
  justifyContent: "center",
  flexWrap: "wrap",
};

const partTabStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "8px 16px",
  border: "2px solid",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
  minWidth: "100px",
  backgroundColor: "transparent",
};

const partTabTitleStyle = {
  fontSize: "13px",
  fontWeight: 600,
};

const partTabRangeStyle = {
  fontSize: "11px",
  opacity: 0.8,
};

const partTabProgressStyle = {
  fontSize: "11px",
  padding: "2px 8px",
  borderRadius: "10px",
  marginTop: "4px",
};

const questionGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  justifyContent: "center",
  marginBottom: "12px",
  maxHeight: "60px",
  overflowY: "auto",
};

const questionNumButtonStyle = {
  width: "32px",
  height: "32px",
  border: "2px solid",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
};

const navArrowsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
};

const navArrowButtonStyle = {
  padding: "8px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  backgroundColor: "#f8fafc",
  color: "#475569",
  transition: "all 0.2s",
};

const loadingStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  fontSize: "1.2rem",
  backgroundColor: "#f1f5f9",
};

const errorStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  textAlign: "center",
  backgroundColor: "#f1f5f9",
};

const primaryButtonStyle = {
  padding: "12px 24px",
  backgroundColor: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "15px",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: "white",
  padding: "28px",
  borderRadius: "16px",
  maxWidth: "420px",
  width: "90%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

const cancelButtonStyle = {
  padding: "10px 20px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: "14px",
};

const confirmButtonStyle = {
  padding: "10px 24px",
  backgroundColor: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

export default DoListeningTest;
