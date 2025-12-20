import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

/**
 * StudentPreviewModal - Xem trước đề thi Reading như học sinh thấy
 * Hiển thị đúng giao diện khi học sinh làm bài
 */

const StudentPreviewModal = ({ isOpen, onClose, testData }) => {
  const { isDarkMode, colors } = useTheme();
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentAnswers({});
      setShowResults(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnswerChange = (questionIndex, value) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const resetTest = () => {
    setCurrentAnswers({});
    setShowResults(false);
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: '20px'
  };

  const contentStyle = {
    backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
  };

  const headerStyle = {
    padding: '20px 30px',
    borderBottom: `1px solid ${isDarkMode ? '#3d3d5c' : '#e0e0e0'}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: isDarkMode 
      ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const bodyStyle = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    gap: '20px',
    padding: '20px'
  };

  const passageStyle = {
    flex: 1,
    padding: '25px',
    backgroundColor: isDarkMode ? '#16213e' : '#f8f9fa',
    borderRadius: '12px',
    overflow: 'auto',
    lineHeight: '1.8',
    fontSize: '15px',
    color: isDarkMode ? '#e8e8e8' : '#333'
  };

  const questionsStyle = {
    flex: 1,
    padding: '25px',
    backgroundColor: isDarkMode ? '#16213e' : '#ffffff',
    borderRadius: '12px',
    overflow: 'auto',
    border: `1px solid ${isDarkMode ? '#3d3d5c' : '#e0e0e0'}`
  };

  // Render các loại câu hỏi khác nhau
  const renderQuestion = (question, qIndex) => {
    const questionStyle = {
      marginBottom: '25px',
      padding: '20px',
      backgroundColor: isDarkMode ? '#0f3460' : '#f8f9fa',
      borderRadius: '12px',
      border: showResults 
        ? currentAnswers[qIndex] === question.correctAnswer
          ? '2px solid #27ae60'
          : '2px solid #e74c3c'
        : `1px solid ${isDarkMode ? '#3d3d5c' : '#e0e0e0'}`
    };

    const labelStyle = {
      display: 'block',
      marginBottom: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e8e8e8' : '#333',
      fontSize: '15px'
    };

    const inputStyle = {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#3d3d5c' : '#ddd'}`,
      backgroundColor: isDarkMode ? '#1a1a2e' : '#fff',
      color: isDarkMode ? '#e8e8e8' : '#333',
      fontSize: '14px',
      transition: 'all 0.2s'
    };

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div key={qIndex} style={questionStyle}>
            <label style={labelStyle}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#4a90d9' : '#667eea',
                color: 'white',
                marginRight: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {qIndex + 1}
              </span>
              {question.questionText}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {question.options?.map((option, optIndex) => (
                <label 
                  key={optIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: currentAnswers[qIndex] === option
                      ? (isDarkMode ? '#3d3d5c' : '#e8f4ff')
                      : 'transparent',
                    border: `1px solid ${currentAnswers[qIndex] === option 
                      ? (isDarkMode ? '#4a90d9' : '#667eea')
                      : (isDarkMode ? '#3d3d5c' : '#e0e0e0')}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    value={option}
                    checked={currentAnswers[qIndex] === option}
                    onChange={() => handleAnswerChange(qIndex, option)}
                    disabled={showResults}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ color: isDarkMode ? '#e8e8e8' : '#333' }}>{option}</span>
                  {showResults && option === question.correctAnswer && (
                    <span style={{ marginLeft: 'auto', color: '#27ae60' }}>✓ Đáp án đúng</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        );

      case 'fill-in-blank':
      case 'short-answer':
        return (
          <div key={qIndex} style={questionStyle}>
            <label style={labelStyle}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#4a90d9' : '#667eea',
                color: 'white',
                marginRight: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {qIndex + 1}
              </span>
              {question.questionText}
            </label>
            <input
              type="text"
              value={currentAnswers[qIndex] || ''}
              onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
              placeholder="Nhập câu trả lời..."
              disabled={showResults}
              style={inputStyle}
            />
            {showResults && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '14px',
                color: currentAnswers[qIndex]?.toLowerCase() === question.correctAnswer?.toLowerCase() 
                  ? '#27ae60' 
                  : '#e74c3c' 
              }}>
                {currentAnswers[qIndex]?.toLowerCase() === question.correctAnswer?.toLowerCase()
                  ? '✓ Chính xác!'
                  : `✗ Đáp án đúng: ${question.correctAnswer}`}
              </div>
            )}
          </div>
        );

      case 'true-false-notgiven':
        return (
          <div key={qIndex} style={questionStyle}>
            <label style={labelStyle}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#4a90d9' : '#667eea',
                color: 'white',
                marginRight: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {qIndex + 1}
              </span>
              {question.questionText}
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '15px', flexWrap: 'wrap' }}>
              {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => (
                <button
                  key={option}
                  onClick={() => !showResults && handleAnswerChange(qIndex, option)}
                  disabled={showResults}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: currentAnswers[qIndex] === option
                      ? `2px solid ${isDarkMode ? '#4a90d9' : '#667eea'}`
                      : `1px solid ${isDarkMode ? '#3d3d5c' : '#ddd'}`,
                    backgroundColor: currentAnswers[qIndex] === option
                      ? (isDarkMode ? '#3d3d5c' : '#e8f4ff')
                      : (isDarkMode ? '#1a1a2e' : '#fff'),
                    color: isDarkMode ? '#e8e8e8' : '#333',
                    cursor: showResults ? 'default' : 'pointer',
                    fontWeight: currentAnswers[qIndex] === option ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  {option}
                  {showResults && option === question.correctAnswer && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        );

      case 'matching':
      case 'ielts-matching-headings':
        return (
          <div key={qIndex} style={questionStyle}>
            <label style={labelStyle}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#4a90d9' : '#667eea',
                color: 'white',
                marginRight: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {qIndex + 1}
              </span>
              {question.questionText || 'Matching Question'}
            </label>
            {question.matchingPairs?.map((pair, pairIndex) => (
              <div key={pairIndex} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px',
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: isDarkMode ? '#1a1a2e' : '#fff',
                borderRadius: '8px'
              }}>
                <span style={{ 
                  minWidth: '150px',
                  fontWeight: '500',
                  color: isDarkMode ? '#e8e8e8' : '#333'
                }}>
                  {pair.left || pair.paragraph}
                </span>
                <span style={{ color: isDarkMode ? '#4a90d9' : '#667eea' }}>→</span>
                <select
                  value={currentAnswers[`${qIndex}-${pairIndex}`] || ''}
                  onChange={(e) => handleAnswerChange(`${qIndex}-${pairIndex}`, e.target.value)}
                  disabled={showResults}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    minWidth: '200px'
                  }}
                >
                  <option value="">-- Chọn --</option>
                  {question.headings?.map((heading, hIndex) => (
                    <option key={hIndex} value={heading}>{heading}</option>
                  ))}
                  {question.matchingOptions?.map((opt, oIndex) => (
                    <option key={oIndex} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div key={qIndex} style={questionStyle}>
            <label style={labelStyle}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#4a90d9' : '#667eea',
                color: 'white',
                marginRight: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {qIndex + 1}
              </span>
              {question.questionText || 'Question'}
            </label>
            <input
              type="text"
              value={currentAnswers[qIndex] || ''}
              onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
              placeholder="Nhập câu trả lời..."
              disabled={showResults}
              style={inputStyle}
            />
          </div>
        );
    }
  };

  const questions = testData?.questions || [];
  const passage = testData?.passage || testData?.content || '';

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
              👁️ Xem trước đề thi (Student View)
            </h2>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
              {testData?.title || 'Reading Test'} • {questions.length} câu hỏi
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body - Split View */}
        <div style={bodyStyle}>
          {/* Passage Panel */}
          <div style={passageStyle}>
            <h3 style={{ 
              margin: '0 0 20px',
              color: isDarkMode ? '#4a90d9' : '#667eea',
              fontSize: '18px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📖 Bài đọc
            </h3>
            <div 
              dangerouslySetInnerHTML={{ __html: passage }}
              style={{ textAlign: 'justify' }}
            />
          </div>

          {/* Questions Panel */}
          <div style={questionsStyle}>
            <h3 style={{ 
              margin: '0 0 20px',
              color: isDarkMode ? '#4a90d9' : '#667eea',
              fontSize: '18px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ❓ Câu hỏi
            </h3>

            {questions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: isDarkMode ? '#888' : '#999'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📝</div>
                <p>Chưa có câu hỏi nào được thêm vào đề thi này</p>
              </div>
            ) : (
              <>
                {questions.map((q, index) => renderQuestion(q, index))}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '30px',
                  paddingTop: '20px',
                  borderTop: `1px solid ${isDarkMode ? '#3d3d5c' : '#e0e0e0'}`
                }}>
                  {!showResults ? (
                    <button
                      onClick={handleSubmit}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ✓ Nộp bài & Xem kết quả
                    </button>
                  ) : (
                    <button
                      onClick={resetTest}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔄 Làm lại
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '15px 30px',
          borderTop: `1px solid ${isDarkMode ? '#3d3d5c' : '#e0e0e0'}`,
          backgroundColor: isDarkMode ? '#0f3460' : '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: isDarkMode ? '#b0b0b0' : '#666'
        }}>
          <span>💡 Đây là chế độ xem trước - học sinh sẽ thấy giao diện tương tự khi làm bài</span>
          <span>Đã trả lời: {Object.keys(currentAnswers).length}/{questions.length}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentPreviewModal;
