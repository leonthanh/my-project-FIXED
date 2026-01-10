import React from 'react';

/**
 * WordFormDisplay - Display component for word-form questions (KET Part 6)
 * Shows sentences with root words, students fill in correct form
 */
const WordFormDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted 
}) => {
  const { sentences = [] } = section;

  return (
    <div style={styles.container}>
      <div style={styles.questionsContainer}>
        {sentences.map((sentence, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${section.id}-${idx}`;
          const userAnswer = answers[questionKey] || '';
          const { text, rootWord, correctAnswer } = sentence;
          const isCorrect = submitted && userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

          return (
            <div key={idx} style={styles.questionCard}>
              {/* Question Header */}
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.sentenceText}>{text}</div>
              </div>

              {/* Root Word + Answer Input */}
              <div style={styles.answerSection}>
                <div style={styles.rootWordBox}>
                  Root word: <strong>{rootWord}</strong>
                </div>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => onAnswerChange(questionKey, e.target.value)}
                  disabled={submitted}
                  placeholder="Type the correct form..."
                  style={{
                    ...styles.input,
                    ...(submitted && {
                      backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                      borderColor: isCorrect ? '#22c55e' : '#ef4444',
                    }),
                  }}
                />
              </div>

              {/* Correct Answer Display (after submission) */}
              {submitted && !isCorrect && (
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
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '18px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '14px',
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
  sentenceText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#1f2937',
  },
  answerSection: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: '16px',
    alignItems: 'center',
  },
  rootWordBox: {
    padding: '10px 14px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#78350f',
  },
  input: {
    padding: '10px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
  },
  correctAnswerBox: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default WordFormDisplay;
