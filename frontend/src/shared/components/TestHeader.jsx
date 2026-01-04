import React from "react";
import "./TestHeader.css";

/**
 * TestHeader - Shared header component for IELTS test pages
 * 
 * @param {string} testType - "READING" | "LISTENING" | "WRITING"
 * @param {string} testTitle - Title of the test
 * @param {string} testMeta - Meta info (e.g., "3 Passages • 40 Questions")
 * @param {number} timeRemaining - Time remaining in seconds
 * @param {number} answeredCount - Number of questions answered
 * @param {number} totalQuestions - Total number of questions
 * @param {function} onSubmit - Submit handler
 * @param {boolean} submitted - Whether test is submitted
 * @param {boolean} timerWarning - Show warning style (< 5 min)
 * @param {boolean} timerCritical - Show critical style (< 1 min)
 * @param {boolean} showAutoSave - Show auto-save indicator
 */
const TestHeader = ({
  testType = "LISTENING",
  testTitle = "Test",
  testMeta = "",
  timeRemaining = 0,
  answeredCount = 0,
  totalQuestions = 0,
  onSubmit,
  submitted = false,
  timerWarning = false,
  timerCritical = false,
  showAutoSave = true,
}) => {
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercent = totalQuestions > 0 
    ? (answeredCount / totalQuestions) * 100 
    : 0;

  return (
    <header className="test-header">
      <div className="header-left">
        <div className="test-badge">IELTS</div>
        <div className="test-info">
          <h1>IELTS - {testType} TEST</h1>
          <p className="test-meta">{testMeta || testTitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Timer */}
        <div
          className={`timer-container ${timerWarning ? "warning" : ""} ${
            timerCritical ? "critical" : ""
          }`}
        >
          <div className="timer-icon">⏱️</div>
          <div className="timer-display">
            <span className="timer-value">{formatTime(timeRemaining)}</span>
            <span className="timer-label">REMAINING</span>
          </div>
          {timerCritical && (
            <div className="timer-critical-badge pulse">🔥</div>
          )}
        </div>

        {/* Progress Ring */}
        <div className="progress-container">
          <div className="progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                className="progress-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="progress-bar"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="progress-text">
              <span className="progress-value">{answeredCount}</span>
              <span className="progress-total">/{totalQuestions}</span>
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        {showAutoSave && (
          <div className="auto-save-indicator">
            <span className="save-icon">💾</span>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={onSubmit}
          disabled={submitted}
          className="submit-btn"
        >
          {submitted ? (
            <>✓ Đã nộp</>
          ) : (
            <>
              <span className="submit-icon">📤</span>
              <span className="submit-text">Nộp bài</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default TestHeader;
