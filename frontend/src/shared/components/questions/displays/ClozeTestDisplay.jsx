import React from 'react';

/**
 * ClozeTestDisplay - Display component for cloze-test questions (KET Part 5)
 * Shows passage with numbered blanks for text input
 */
const ClozeTestDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted 
}) => {
  const { passage, answers: correctAnswers = [] } = section;

  return (
    <div style={styles.container}>
      {/* Passage with numbered blanks */}
      {passage && (
        <div style={styles.passageContainer}>
          <div 
            style={styles.passageContent}
            dangerouslySetInnerHTML={{ __html: passage }}
          />
        </div>
      )}

      {/* Fill-in-the-blank inputs */}
      <div style={styles.answersContainer}>
        {correctAnswers.map((correctAnswer, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${section.id}-${idx}`;
          const userAnswer = answers[questionKey] || '';
          const isCorrect = submitted && userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

          return (
            <div key={idx} style={styles.answerRow}>
              <div style={styles.questionNumber}>{questionNumber}</div>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => onAnswerChange(questionKey, e.target.value)}
                disabled={submitted}
                placeholder="Type your answer..."
                style={{
                  ...styles.input,
                  ...(submitted && {
                    backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                    borderColor: isCorrect ? '#22c55e' : '#ef4444',
                  }),
                }}
              />
              {submitted && !isCorrect && (
                <div style={styles.correctAnswerInline}>
                  ✓ {correctAnswer}
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
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  answerRow: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr auto',
    gap: '12px',
    alignItems: 'center',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px 16px',
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
  },
  input: {
    padding: '10px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
  },
  correctAnswerInline: {
    padding: '8px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid #22c55e',
  },
};

export default ClozeTestDisplay;
