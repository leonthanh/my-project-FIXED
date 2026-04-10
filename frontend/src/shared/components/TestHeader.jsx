import React from "react";
import LineIcon from "./LineIcon.jsx";
import "./TestHeader.css";

/**
 * TestHeader - Shared header component for IELTS & Cambridge test pages
 * 
 * @param {string} testType - "READING" | "LISTENING" | "WRITING"
 * @param {string} testTitle - Title of the test
 * @param {string} title - Alternative prop for test title (Cambridge)
 * @param {string} testMeta - Meta info (e.g., "3 Passages • 40 Questions")
 * @param {string} classCode - Class code (Cambridge)
 * @param {string} teacherName - Teacher name (Cambridge)
 * @param {number} timeRemaining - Time remaining in seconds OR formatted string
 * @param {number} answeredCount - Number of questions answered
 * @param {number} totalQuestions - Total number of questions
 * @param {function} onSubmit - Submit handler
 * @param {boolean} submitted - Whether test is submitted
 * @param {boolean} timerWarning - Show warning style (< 5 min)
 * @param {boolean} timerCritical - Show critical style (< 1 min)
 * @param {boolean} showAutoSave - Show auto-save indicator
 * @param {string} audioStatusText - Optional audio status label (e.g., "Audio is playing")
 * @param {string} examType - "IELTS" | "KET" | "PET" | "FLYERS" | etc.
 */
const TestHeader = ({
  testType = "LISTENING",
  testTitle = "Test",
  title, // Cambridge prop
  testMeta = "",
  classCode,
  teacherName,
  timeRemaining = 0,
  answeredCount = 0,
  totalQuestions = 0,
  onSubmit,
  submitted = false,
  timerWarning = false,
  timerCritical = false,
  showAutoSave = true,
  audioStatusText = '',
  examType, // Auto-detect from title or classCode
}) => {
  // Auto-detect exam type from props
  const detectedExamType = examType || (
    (title || testTitle).toLowerCase().includes('ket') ? 'KET' :
    (title || testTitle).toLowerCase().includes('pet') ? 'PET' :
    (title || testTitle).toLowerCase().includes('flyers') ? 'FLYERS' :
    (title || testTitle).toLowerCase().includes('movers') ? 'MOVERS' :
    (title || testTitle).toLowerCase().includes('starters') ? 'STARTERS' :
    'IX'
  );

  const isCambridge = detectedExamType !== 'IX';
  const displayTitle = title || testTitle;

  // Format time as mm:ss if it's a number
  const formatTime = (time) => {
    if (typeof time === 'string') return time; // Already formatted
    const seconds = time || 0;
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
        <div className="test-badge" style={isCambridge ? {background: '#0052CC'} : {}}>
          {detectedExamType}
        </div>
        <div className="test-info">
          <h1>
            {isCambridge ? displayTitle : `IX - ${testType} TEST`}
          </h1>
          <p className="test-meta">
            {isCambridge && classCode && `Class: ${classCode}`}
            {isCambridge && teacherName && ` • ${teacherName}`}
            {!isCambridge && (testMeta || testTitle)}
          </p>
        </div>
      </div>

      <div className="header-right">
        {audioStatusText && (
          <div className="audio-status" aria-live="polite">
            <span className="audio-status-icon">
              <LineIcon name="listening" size={14} strokeWidth={2.1} />
            </span>
            <span className="audio-status-text">{audioStatusText}</span>
          </div>
        )}
        {/* Timer */}
        <div
          className={`timer-container ${timerWarning ? "warning" : ""} ${
            timerCritical ? "critical" : ""
          }`}
        >
          <div className="timer-icon">
            <LineIcon name="clock" size={18} strokeWidth={2.1} />
          </div>
          <div className="timer-display">
            <span className="timer-value">{formatTime(timeRemaining)}</span>
            <span className="timer-label">{isCambridge ? 'TIME LEFT' : 'REMAINING'}</span>
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
          <div className="auto-save-indicator" title="Auto-save enabled" aria-label="Auto-save enabled">
            <span className="save-icon">
              <LineIcon name="overview" size={16} strokeWidth={2.1} />
            </span>
          </div>
        )}

        {/* Submit button */}
        <button
          data-testid="submit-button"
          onClick={onSubmit}
          disabled={submitted}
          className="submit-btn"
        >
          {submitted ? (
            <>
              <LineIcon name="correct" size={16} strokeWidth={2.2} />
              Submitted
            </>
          ) : (
            <>
              <span className="submit-icon">
                <LineIcon name="review" size={16} strokeWidth={2.1} />
              </span>
              <span className="submit-text">Submit</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default TestHeader;
