import React from 'react';

const normalize = (value) => String(value || '').trim().toLowerCase();

const stripOptionLabel = (text) => {
  return String(text || '').replace(/^[A-H]\.\s*/i, '').trim();
};

/**
 * MatchingDisplay - Student display for generic matching questions
 * Renders left column items (numbered) and right column options (lettered A-H).
 * Used by IELTS/KET/PET/FCE matching questionType.
 */
const MatchingDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
}) => {
  const singleQuestion = section?.questions?.[0] || section || {};
  const sectionId = section?.id || 'section';

  const leftTitle = singleQuestion.leftTitle || section?.leftTitle || 'Items';
  const rightTitle = singleQuestion.rightTitle || section?.rightTitle || 'Options';
  const questionText = singleQuestion.questionText || singleQuestion.instruction || '';
  const leftItems = Array.isArray(singleQuestion.leftItems) ? singleQuestion.leftItems : [];
  const rightItems = Array.isArray(singleQuestion.rightItems)
    ? singleQuestion.rightItems
    : [];

  const getOptionLetter = (idx) => String.fromCharCode(65 + idx);

  const getCorrectAnswerForItem = (itemIdx) => {
    const qNum = startingNumber + itemIdx;
    const answersMap = singleQuestion.answers;
    if (answersMap && typeof answersMap === 'object' && answersMap[qNum] !== undefined) {
      return String(answersMap[qNum]).trim().toUpperCase();
    }
    if (answersMap && typeof answersMap === 'object' && answersMap[String(qNum)] !== undefined) {
      return String(answersMap[String(qNum)]).trim().toUpperCase();
    }
    // Fallback: parse text correctAnswer like "15-A, 16-B"
    const text = String(singleQuestion.correctAnswer || '');
    if (text) {
      const match = text.match(new RegExp(`(?:^|[^\\d])${qNum}\\s*[-=:]\\s*([A-H])`, 'i'));
      if (match) return match[1].toUpperCase();
    }
    return '';
  };

  return (
    <div style={styles.container}>
      {questionText && (
        <div style={styles.instruction}>{questionText}</div>
      )}

      <div style={styles.columns}>
        {/* Left: numbered items */}
        <div style={styles.column}>
          <div style={styles.columnTitle}>{leftTitle}</div>
          <div style={styles.list}>
            {leftItems.map((item, idx) => {
              const questionNumber = startingNumber + idx;
              const answerKey = `${sectionId}-${idx}`;
              const userAnswer = String(answers[answerKey] || '').trim().toUpperCase();
              const correctAnswer = getCorrectAnswerForItem(idx);
              const isCorrect = submitted && normalize(userAnswer) === normalize(correctAnswer);
              const isWrong = submitted && userAnswer && !isCorrect;

              return (
                <div key={idx} style={styles.itemRow}>
                  <div style={styles.itemNumber}>{questionNumber}</div>
                  <div style={styles.itemText}>{String(item || '')}</div>
                  <select
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(answerKey, e.target.value.toUpperCase())}
                    disabled={submitted}
                    style={{
                      ...styles.select,
                      ...(submitted && {
                        backgroundColor: isCorrect ? '#dcfce7' : isWrong ? '#fee2e2' : '#f3f4f6',
                        borderColor: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#d1d5db',
                      }),
                    }}
                  >
                    <option value="">--</option>
                    {rightItems.map((_, optIdx) => {
                      const letter = getOptionLetter(optIdx);
                      return (
                        <option key={optIdx} value={letter}>
                          {letter}
                        </option>
                      );
                    })}
                  </select>
                  {submitted && !isCorrect && correctAnswer && (
                    <span style={styles.correctBadge}>Correct: {correctAnswer}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: lettered options */}
        <div style={styles.column}>
          <div style={styles.columnTitle}>{rightTitle}</div>
          <div style={styles.list}>
            {rightItems.map((item, idx) => {
              const letter = getOptionLetter(idx);
              return (
                <div key={idx} style={styles.optionRow}>
                  <div style={styles.optionLetter}>{letter}</div>
                  <div style={styles.optionText}>{stripOptionLabel(item)}</div>
                </div>
              );
            })}
          </div>
        </div>
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
    lineHeight: 1.6,
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
  },
  column: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0e276f',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  itemNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '13px',
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: '15px',
    color: '#1f2937',
    lineHeight: 1.5,
  },
  select: {
    padding: '8px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    minWidth: '70px',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  correctBadge: {
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    border: '1px solid #22c55e',
    whiteSpace: 'nowrap',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#faf5ff',
    borderRadius: '8px',
    border: '1px solid #e9d5ff',
  },
  optionLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '13px',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    fontSize: '15px',
    color: '#1f2937',
    lineHeight: 1.5,
  },
};

export default MatchingDisplay;
