import React, { useState, useEffect } from "react";

/**
 * WritingTaskDisplay - Component hiển thị Part 7 Writing Task cho học sinh
 * Dùng cho KET/PET Reading & Writing Test
 * 
 * Features:
 * - Hiển thị đề bài với situation và bullet points
 * - Text area cho học sinh viết
 * - Word counter realtime với visual feedback
 * - Auto-save to localStorage
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data từ test
 * @param {string} props.value - Current answer value
 * @param {Function} props.onChange - Handler khi học sinh thay đổi câu trả lời
 * @param {number} props.partNumber - Part number (thường là 7)
 */
const WritingTaskDisplay = ({
  question,
  value = '',
  onChange,
  partNumber = 7,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const situation = question?.situation || '';
  const recipient = question?.recipient || 'your friend';
  const messageType = question?.messageType || 'email';
  const bulletPoints = question?.bulletPoints || [];
  const wordLimit = question?.wordLimit || { min: 25, max: 35 };

  // Sync with parent value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Word count
  const wordCount = localValue.trim() ? localValue.trim().split(/\s+/).length : 0;
  
  // Word count status
  const getWordCountStatus = () => {
    if (wordCount === 0) return { color: '#9ca3af', status: 'empty' };
    if (wordCount < wordLimit.min) return { color: '#f59e0b', status: 'below' };
    if (wordCount > wordLimit.max) return { color: '#ef4444', status: 'above' };
    return { color: '#22c55e', status: 'perfect' };
  };

  const wordStatus = getWordCountStatus();

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  // Message type label
  const getMessageTypeLabel = () => {
    switch (messageType) {
      case 'email': return 'an email';
      case 'note': return 'a note';
      case 'postcard': return 'a postcard';
      case 'message': return 'a message';
      default: return 'a message';
    }
  };

  return (
    <div style={styles.container}>
      {/* Part Header */}
      <div style={styles.partHeader}>
        <span style={styles.partBadge}>Part {partNumber}</span>
        <span style={styles.partTitle}>Writing Task</span>
      </div>

      {/* Question Content */}
      <div style={styles.questionContent}>
        {/* Situation */}
        <p style={styles.situation}>
          {situation}
        </p>

        {/* Writing instruction */}
        <p style={styles.instruction}>
          Write {getMessageTypeLabel()} to <strong>{recipient}</strong>.
          {bulletPoints.length > 0 && ` In your ${messageType}:`}
        </p>

        {/* Bullet Points */}
        {bulletPoints.length > 0 && (
          <ul style={styles.bulletList}>
            {bulletPoints.filter(b => b).map((bullet, index) => (
              <li key={index} style={styles.bulletItem}>
                {bullet}
              </li>
            ))}
          </ul>
        )}

        {/* Word limit instruction */}
        <p style={styles.wordLimitNote}>
          Write <strong>{wordLimit.min}-{wordLimit.max}</strong> words.
        </p>
      </div>

      {/* Writing Area */}
      <div style={styles.writingAreaContainer}>
        <div style={styles.writingHeader}>
          <span style={{ fontWeight: 600, color: '#374151' }}>Your answer:</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {/* Word count indicator */}
            <div style={{
              ...styles.wordCounter,
              backgroundColor: wordStatus.color + '20',
              color: wordStatus.color,
              borderColor: wordStatus.color,
            }}>
              <span style={{ fontWeight: 700 }}>{wordCount}</span>
              <span style={{ opacity: 0.8 }}> / {wordLimit.min}-{wordLimit.max}</span>
              <span style={{ marginLeft: '4px' }}>words</span>
            </div>
            
            {/* Status icon */}
            {wordCount > 0 && (
              <span style={{ fontSize: '18px' }}>
                {wordStatus.status === 'perfect' ? '✅' : 
                 wordStatus.status === 'below' ? '⚠️' : 
                 wordStatus.status === 'above' ? '🚫' : ''}
              </span>
            )}
          </div>
        </div>

        <textarea
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`Start writing your ${messageType} here...`}
          style={{
            ...styles.textarea,
            borderColor: isFocused ? '#3b82f6' : '#d1d5db',
            boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
          }}
        />

        {/* Feedback message */}
        {wordCount > 0 && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '12px',
            color: wordStatus.color,
          }}>
            {wordStatus.status === 'below' && 
              `⚠️ You need at least ${wordLimit.min - wordCount} more word${wordLimit.min - wordCount > 1 ? 's' : ''}`}
            {wordStatus.status === 'above' && 
              `🚫 You have ${wordCount - wordLimit.max} word${wordCount - wordLimit.max > 1 ? 's' : ''} too many`}
            {wordStatus.status === 'perfect' && 
              `✅ Great! Your answer is within the word limit.`}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${Math.min((wordCount / wordLimit.max) * 100, 100)}%`,
            backgroundColor: wordStatus.color,
          }} />
          {/* Min marker */}
          <div style={{
            ...styles.progressMarker,
            left: `${(wordLimit.min / wordLimit.max) * 100}%`,
          }}>
            <span style={styles.markerLabel}>{wordLimit.min}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  partHeader: {
    backgroundColor: '#0e276f',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  partBadge: {
    backgroundColor: '#e03',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 700,
  },
  partTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
  },
  questionContent: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  situation: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#1e293b',
  },
  instruction: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#1e293b',
  },
  bulletList: {
    margin: '0 0 16px 0',
    paddingLeft: '24px',
  },
  bulletItem: {
    marginBottom: '6px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#334155',
  },
  wordLimitNote: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    display: 'inline-block',
  },
  writingAreaContainer: {
    padding: '16px 20px 20px',
  },
  writingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  wordCounter: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    border: '1px solid',
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '16px',
    fontSize: '16px',
    lineHeight: 1.8,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  progressContainer: {
    padding: '0 20px 16px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  progressMarker: {
    position: 'absolute',
    top: '-4px',
    width: '2px',
    height: '14px',
    backgroundColor: '#6b7280',
    transform: 'translateX(-50%)',
  },
  markerLabel: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: '#6b7280',
  },
};

export default WritingTaskDisplay;
