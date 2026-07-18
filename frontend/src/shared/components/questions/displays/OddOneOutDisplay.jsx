import React from 'react';

const normalize = (value) => String(value || '').trim().toLowerCase();

/**
 * OddOneOutDisplay - FCE Part 3 student display
 * Shows groups of 4 words; student selects the one that does not belong.
 */
const OddOneOutDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
}) => {
  const singleQuestion = section?.questions?.[0] || {};
  const instruction = singleQuestion?.instruction || 'Circle the word that is not in the same group.';
  const groups = Array.isArray(singleQuestion?.groups) ? singleQuestion.groups : [];
  const sectionId = section?.id || 'section';

  return (
    <div style={styles.container}>
      <p style={styles.instruction}>{instruction}</p>

      <div style={styles.questionsContainer}>
        {groups.map((group, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${sectionId}-${idx}`;
          const userAnswer = answers[questionKey] || '';
          const correctAnswer = String(group.correctAnswer || '').trim();
          const isCorrect = submitted && normalize(userAnswer) === normalize(correctAnswer);
          const words = Array.isArray(group.words) ? group.words.slice(0, 4) : [];

          return (
            <div
              key={idx}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.questionCard}
            >
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.wordsRow}>
                  {words.map((word, wordIdx) => {
                    const isSelected = normalize(userAnswer) === normalize(word);
                    const isTheCorrectOne = submitted && normalize(word) === normalize(correctAnswer);
                    const isWrongSelected = submitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={wordIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => onAnswerChange(questionKey, word)}
                        style={{
                          ...styles.wordButton,
                          ...(isSelected && !submitted ? styles.wordButtonSelected : {}),
                          ...(isTheCorrectOne && submitted ? styles.wordButtonCorrect : {}),
                          ...(isWrongSelected ? styles.wordButtonWrong : {}),
                        }}
                      >
                        <span style={styles.wordLabel}>{String.fromCharCode(65 + wordIdx)}.</span>
                        <span>{word}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {submitted && !isCorrect && correctAnswer && (
                <div style={styles.correctAnswerBox}>
                  Correct answer: <strong>{correctAnswer}</strong>
                  {group.explanation && (
                    <div style={styles.explanation}>({group.explanation})</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  instruction: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
    fontStyle: 'italic',
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
    scrollMarginTop: '120px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#059669',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  wordsRow: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  wordButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '20px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  wordButtonSelected: {
    backgroundColor: '#d1fae5',
    borderColor: '#059669',
    color: '#065f46',
  },
  wordButtonCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
    color: '#166534',
  },
  wordButtonWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    color: '#b91c1c',
  },
  wordLabel: {
    fontWeight: 700,
    opacity: 0.7,
  },
  correctAnswerBox: {
    marginTop: '14px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
  explanation: {
    marginTop: '4px',
    fontSize: '13px',
    color: '#15803d',
    fontStyle: 'italic',
  },
};

export default OddOneOutDisplay;
