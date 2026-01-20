import React from 'react';

/**
 * LongTextMCDisplay - Display component for long-text-mc questions (KET Part 3)
 * Shows passage with 5-7 multiple choice questions
 */
const LongTextMCDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted 
}) => {
  const { passage, questions = [] } = section;

  return (
    <div style={styles.container}>
      {/* Passage */}
      {passage && (
        <div style={styles.passageContainer}>
          <div 
            style={styles.passageContent}
            dangerouslySetInnerHTML={{ __html: passage }}
          />
        </div>
      )}

      {/* Multiple Choice Questions */}
      <div style={styles.questionsContainer}>
        {questions.map((question, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${section.id}-${idx}`;
          const userAnswer = answers[questionKey];
          const { questionText, options = [], correctAnswer } = question;

          return (
            <div key={idx} style={styles.questionCard}>
              {/* Question Header */}
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.questionText}>{questionText}</div>
              </div>

              {/* Options */}
              <div style={styles.optionsContainer}>
                {options.map((option, optIdx) => {
                  const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C
                  const isSelected = userAnswer === optionLabel;
                  const isCorrect = submitted && correctAnswer === optionLabel;
                  const isWrong = submitted && isSelected && correctAnswer !== optionLabel;

                  return (
                    <label
                      key={optIdx}
                      style={{
                        ...styles.optionLabel,
                        ...(isSelected && styles.optionSelected),
                        ...(isCorrect && styles.optionCorrect),
                        ...(isWrong && styles.optionWrong),
                      }}
                    >
                      <input
                        type="radio"
                        name={questionKey}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => onAnswerChange(questionKey, optionLabel)}
                        disabled={submitted}
                        style={styles.radioInput}
                      />
                      <span style={styles.optionLetter}>{optionLabel}</span>
                      <span style={styles.optionText}>{option}</span>
                    </label>
                  );
                })}
              </div>

              {/* Correct Answer Display (after submission) */}
              {submitted && correctAnswer && userAnswer !== correctAnswer && (
                <div style={styles.correctAnswerBox}>
                  ✓ Correct answer: <strong>{correctAnswer}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    marginBottom: '24px',
  },
  passageContainer: {
    padding: '20px',
    backgroundColor: '#fffbeb',
    border: '2px solid #fcd34d',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  passageContent: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#1f2937',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.6,
    color: '#1f2937',
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
    fontSize: '14px',
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

export default LongTextMCDisplay;
