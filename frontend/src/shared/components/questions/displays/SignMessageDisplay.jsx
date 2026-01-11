import React from 'react';
import { hostPath } from '../../../utils/api';

/**
 * SignMessageDisplay - Display component for sign-message questions (KET Part 1)
 * Shows image with 3 multiple choice options (A, B, C)
 */
const SignMessageDisplay = ({ 
  question, 
  questionNumber, 
  onAnswerChange, 
  userAnswer, 
  submitted 
}) => {
  const { imageUrl, options = [], correctAnswer } = question;

  return (
    <div style={styles.container}>
      {/* Question Header */}
      <div style={styles.header}>
        <h3 style={styles.questionTitle}>Question {questionNumber}</h3>
      </div>

      {/* Main Content: Image + Options */}
      <div style={styles.content}>
        {/* Image */}
        {imageUrl && (
          <div style={styles.imageContainer}>
            <img 
              src={hostPath(imageUrl)} 
              alt={`Question ${questionNumber}`}
              style={styles.image}
            />
          </div>
        )}

        {/* Multiple Choice Options */}
        <div style={styles.optionsContainer}>
          {options.map((option, idx) => {
            const optionLabel = String.fromCharCode(65 + idx); // A, B, C
            const isSelected = userAnswer === optionLabel;
            const isCorrect = submitted && correctAnswer === optionLabel;
            const isWrong = submitted && isSelected && correctAnswer !== optionLabel;

            return (
              <label
                key={idx}
                style={{
                  ...styles.optionLabel,
                  ...(isSelected && styles.optionSelected),
                  ...(isCorrect && styles.optionCorrect),
                  ...(isWrong && styles.optionWrong),
                }}
              >
                <input
                  type="radio"
                  name={`q-${questionNumber}`}
                  value={optionLabel}
                  checked={isSelected}
                  onChange={() => onAnswerChange(optionLabel)}
                  disabled={submitted}
                  style={styles.radioInput}
                />
                <span style={styles.optionLetter}>{optionLabel}</span>
                <span style={styles.optionText}>{option}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Correct Answer Display (after submission) */}
      {submitted && correctAnswer && userAnswer !== correctAnswer && (
        <div style={styles.correctAnswerBox}>
          ✓ Correct answer: <strong>{correctAnswer}</strong>
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
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #0e276f',
  },
  questionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#0e276f',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  imageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  image: {
    maxWidth: '100%',
    height: 'auto',
    maxHeight: '300px',
    borderRadius: '4px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#fafafa',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '15px',
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
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  optionLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    lineHeight: 1.5,
  },
  correctAnswerBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default SignMessageDisplay;
