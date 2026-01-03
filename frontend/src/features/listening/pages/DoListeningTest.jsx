import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { StudentNavbar } from "../../../shared/components";

/**
 * DoListeningTest - Trang làm bài thi Listening IELTS
 * Hỗ trợ các question types: form-completion, fill, abc, abcd, matching, multi-select
 */
const DoListeningTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(40 * 60); // 40 minutes
  const audioRef = useRef(null);

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
        <h4 style={{ color: "#059669", marginBottom: "12px" }}>
          📝 {section.sectionTitle}
        </h4>
        
        {section.sectionInstruction && (
          <div style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
          }}>
            {section.sectionInstruction}
          </div>
        )}
        
        {questions.map((q, idx) => (
          <div key={idx}>
            {renderQuestion(q, section.questionType)}
          </div>
        ))}
      </div>
    );
  };

  // Render a part
  const renderPart = (part, partIndex) => {
    const audioUrl = test.partAudioUrls?.[partIndex] || test.mainAudioUrl;
    
    return (
      <div key={partIndex} style={partStyle}>
        <div style={partHeaderStyle}>
          <h3 style={{ margin: 0 }}>🎧 {part.title}</h3>
        </div>
        
        {/* Audio Player */}
        {audioUrl && (
          <div style={audioContainerStyle}>
            <audio
              ref={audioRef}
              controls
              style={{ width: "100%" }}
              src={hostPath(audioUrl)}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        
        {/* Part Instruction */}
        {part.instruction && (
          <div style={{
            padding: "12px",
            backgroundColor: "#eff6ff",
            borderRadius: "8px",
            marginBottom: "16px",
          }}>
            <div dangerouslySetInnerHTML={{ __html: part.instruction }} />
          </div>
        )}
        
        {/* Sections */}
        {part.sections?.map((section, sIdx) => renderSection(section, partIndex, sIdx))}
        
        {/* Transcript (shown after submit) */}
        {submitted && part.transcript && (
          <details style={{ marginTop: "16px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "#6b7280" }}>
              📜 Xem Transcript
            </summary>
            <div style={{
              marginTop: "8px",
              padding: "12px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
              fontSize: "14px",
            }}>
              {part.transcript}
            </div>
          </details>
        )}
      </div>
    );
  };

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
    <>
      <StudentNavbar />
      
      <div style={containerStyle}>
        {/* Debug Info - Remove in production */}
        {parts.length === 0 && (
          <div style={{ 
            padding: "16px", 
            backgroundColor: "#fef2f2", 
            borderRadius: "8px", 
            marginBottom: "20px",
            border: "1px solid #fecaca"
          }}>
            <strong>⚠️ Debug:</strong> Không có parts data
            <pre style={{ fontSize: "11px", overflow: "auto", maxHeight: "200px" }}>
              {JSON.stringify(test, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>🎧 Bài thi Listening</h2>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
              {test.classCode} • {test.teacherName}
            </p>
          </div>
          
          <div style={timerStyle}>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>⏱️ Thời gian còn lại</span>
            <span style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: timeRemaining < 300 ? "#ef4444" : "#059669",
            }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Part Navigation */}
        <div style={partNavStyle}>
          {parts.map((part, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPartIndex(idx)}
              style={{
                ...partNavButtonStyle,
                backgroundColor: currentPartIndex === idx ? "#3b82f6" : "#f3f4f6",
                color: currentPartIndex === idx ? "white" : "#374151",
              }}
            >
              {part.title}
            </button>
          ))}
        </div>

        {/* Current Part Content */}
        <div style={contentStyle}>
          {parts[currentPartIndex] && renderPart(parts[currentPartIndex], currentPartIndex)}
        </div>

        {/* Submit Button */}
        <div style={submitBarStyle}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => setCurrentPartIndex(Math.max(0, currentPartIndex - 1))}
              disabled={currentPartIndex === 0}
              style={{
                ...secondaryButtonStyle,
                opacity: currentPartIndex === 0 ? 0.5 : 1,
              }}
            >
              ← Phần trước
            </button>
            
            <button
              onClick={() => setCurrentPartIndex(Math.min(parts.length - 1, currentPartIndex + 1))}
              disabled={currentPartIndex === parts.length - 1}
              style={{
                ...secondaryButtonStyle,
                opacity: currentPartIndex === parts.length - 1 ? 0.5 : 1,
              }}
            >
              Phần sau →
            </button>
          </div>
          
          <button
            onClick={() => handleSubmit()}
            disabled={submitted}
            style={{
              ...primaryButtonStyle,
              opacity: submitted ? 0.5 : 1,
            }}
          >
            {submitted ? "✅ Đã nộp bài" : "📤 Nộp bài"}
          </button>
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div style={modalOverlayStyle}>
            <div style={modalStyle}>
              <h3 style={{ marginTop: 0 }}>📋 Xác nhận nộp bài</h3>
              <p>Bạn có chắc chắn muốn nộp bài?</p>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button onClick={() => setShowConfirm(false)} style={secondaryButtonStyle}>
                  Hủy
                </button>
                <button onClick={confirmSubmit} style={primaryButtonStyle}>
                  ✅ Xác nhận nộp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {results && (
          <div style={modalOverlayStyle}>
            <div style={{ ...modalStyle, maxWidth: "500px" }}>
              <h3 style={{ marginTop: 0, textAlign: "center" }}>🎉 Kết quả bài thi</h3>
              
              <div style={{
                textAlign: "center",
                padding: "20px",
                backgroundColor: "#f0fdf4",
                borderRadius: "12px",
                marginBottom: "20px",
              }}>
                <div style={{ fontSize: "48px", fontWeight: "bold", color: "#059669" }}>
                  {results.score || 0}/{results.total || 40}
                </div>
                <p style={{ margin: "8px 0 0", color: "#6b7280" }}>Số câu đúng</p>
              </div>
              
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  onClick={() => navigate("/select-test")}
                  style={secondaryButtonStyle}
                >
                  ← Về trang chủ
                </button>
                <button
                  onClick={() => navigate(`/listening-results/${id}`)}
                  style={primaryButtonStyle}
                >
                  📊 Xem chi tiết
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Styles
const containerStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "20px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  backgroundColor: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  marginBottom: "20px",
};

const timerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "8px 16px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
};

const partNavStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const partNavButtonStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  transition: "all 0.2s",
};

const contentStyle = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  marginBottom: "20px",
};

const partStyle = {
  marginBottom: "24px",
};

const partHeaderStyle = {
  padding: "12px 16px",
  backgroundColor: "#1e40af",
  color: "white",
  borderRadius: "8px",
  marginBottom: "16px",
};

const audioContainerStyle = {
  padding: "12px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  marginBottom: "16px",
};

const sectionStyle = {
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  marginBottom: "16px",
};

const formContainerStyle = {
  padding: "16px",
  backgroundColor: "#fafafa",
  borderRadius: "8px",
};

const questionItemStyle = {
  padding: "12px",
  marginBottom: "12px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const questionNumberStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  backgroundColor: "#3b82f6",
  color: "white",
  borderRadius: "50%",
  fontWeight: "bold",
  fontSize: "13px",
  flexShrink: 0,
};

const blankNumberStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  backgroundColor: "#3b82f6",
  color: "white",
  borderRadius: "50%",
  fontWeight: "bold",
  fontSize: "12px",
};

const inputStyle = {
  padding: "8px 12px",
  border: "2px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  width: "200px",
  transition: "border-color 0.2s",
};

const selectStyle = {
  padding: "8px 12px",
  border: "2px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  minWidth: "120px",
  cursor: "pointer",
};

const optionStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  border: "2px solid",
  transition: "all 0.2s",
};

const submitBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  backgroundColor: "#fff",
  borderRadius: "12px",
  boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
  position: "sticky",
  bottom: "20px",
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

const secondaryButtonStyle = {
  padding: "10px 20px",
  backgroundColor: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 500,
};

const loadingStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  fontSize: "1.2rem",
};

const errorStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  textAlign: "center",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "12px",
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
};

export default DoListeningTest;
