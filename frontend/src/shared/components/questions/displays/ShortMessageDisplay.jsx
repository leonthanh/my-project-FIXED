import React, { useState, useEffect } from 'react';
import { hostPath } from '../../../utils/api';

/**
 * ShortMessageDisplay - Display component for short-message writing (KET Part 7)
 * Shows 3 images and bullet points, student writes 35+ words
 */
const ShortMessageDisplay = ({ 
  section, 
  questionNumber, 
  onAnswerChange, 
  userAnswer = '', 
  submitted 
}) => {
  const { images = [], bulletPoints = [] } = section;
  const [wordCount, setWordCount] = useState(0);

  // Calculate word count
  useEffect(() => {
    const words = userAnswer.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [userAnswer]);

  return (
    <div style={styles.container}>
      {/* Question Header */}
      <div style={styles.header}>
        <h3 style={styles.questionTitle}>Question {questionNumber}</h3>
        <div style={styles.instruction}>
          Look at the three pictures. Write the story shown in the pictures. 
          Write <strong>35 words or more</strong>.
        </div>
      </div>

      {/* Content: Images + Writing Area */}
      <div style={styles.content}>
        {/* Images */}
        <div style={styles.imagesSection}>
          <div style={styles.imagesGrid}>
            {images.map((imageUrl, idx) => (
              <div key={idx} style={styles.imageCard}>
                <img 
                  src={hostPath(imageUrl)} 
                  alt={`Picture ${idx + 1}`}
                  style={styles.image}
                />
              </div>
            ))}
          </div>

          {/* Bullet Points */}
          {bulletPoints.length > 0 && (
            <div style={styles.bulletPointsSection}>
              <strong>Write about:</strong>
              <ul style={styles.bulletList}>
                {bulletPoints.map((point, idx) => (
                  <li key={idx} style={styles.bulletItem}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Writing Textarea */}
        <div style={styles.writingSection}>
          <textarea
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={submitted}
            placeholder="Write your story here..."
            style={styles.textarea}
            rows={10}
          />
          
          {/* Word Count */}
          <div style={styles.wordCountSection}>
            <span style={{
              ...styles.wordCount,
              color: wordCount >= 35 ? '#22c55e' : '#ef4444',
            }}>
              Words: {wordCount}
            </span>
            {wordCount < 35 && !submitted && (
              <span style={styles.wordCountWarning}>
                (Minimum 35 words required)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #0e276f',
  },
  questionTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0e276f',
  },
  instruction: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#4b5563',
    backgroundColor: '#f0f9ff',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  imagesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  imageCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 'auto',
    maxHeight: '150px',
    objectFit: 'contain',
    borderRadius: '4px',
  },
  bulletPointsSection: {
    padding: '14px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    fontSize: '14px',
  },
  bulletList: {
    margin: '8px 0 0',
    paddingLeft: '24px',
  },
  bulletItem: {
    marginBottom: '6px',
    lineHeight: 1.5,
  },
  writingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  textarea: {
    width: '100%',
    padding: '14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  wordCountSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between',
  },
  wordCount: {
    fontSize: '15px',
    fontWeight: 600,
  },
  wordCountWarning: {
    fontSize: '13px',
    color: '#ef4444',
    fontStyle: 'italic',
  },
};

export default ShortMessageDisplay;
