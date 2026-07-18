import React from 'react';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const acceptedAnswers = (raw) => {
  if (Array.isArray(raw)) return raw.map(normalize).filter(Boolean);
  if (typeof raw === 'string' && (raw.includes('|') || raw.includes('/'))) {
    return raw.split(/[|/]/).map((item) => normalize(item)).filter(Boolean);
  }
  return [normalize(raw)].filter(Boolean);
};

/**
 * SentenceCorrectionDisplay - FCE sentence error correction display.
 * Students rewrite each incorrect sentence correctly.
 */
const SentenceCorrectionDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
}) => {
  const singleQuestion = section?.questions?.[0] || {};
  const instruction = singleQuestion?.instruction || 'Correct the sentences.';
  const items = Array.isArray(singleQuestion?.items) ? singleQuestion.items : [];
  const sectionId = section?.id || 'section';

  return (
    <div style={styles.container}>
      <p style={styles.instruction}>{instruction}</p>

      <div style={styles.itemsList}>
        {items.map((item, index) => {
          const questionNumber = startingNumber + index;
          const answerKey = `${sectionId}-${index}`;
          const userAnswer = answers[answerKey] || '';
          const correctAnswers = acceptedAnswers(item.correctAnswer);
          const isCorrect = submitted && correctAnswers.includes(normalize(userAnswer));

          return (
            <div
              key={index}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.itemCard}
            >
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.sentenceText}>{item.sentence || 'Sentence to correct...'}</div>
              </div>

              <textarea
                value={userAnswer}
                onChange={(event) => onAnswerChange(answerKey, event.target.value)}
                disabled={submitted}
                placeholder="Write the corrected sentence..."
                rows={2}
                style={{
                  ...styles.textarea,
                  ...(submitted && {
                    backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                    borderColor: isCorrect ? '#22c55e' : '#ef4444',
                  }),
                }}
              />

              {submitted && !isCorrect && item.correctAnswer && (
                <div style={styles.correctAnswerBox}>
                  Correct: <strong>{String(item.correctAnswer).split(/[|/]/)[0].trim()}</strong>
                  {item.explanation && <div style={styles.explanation}>{item.explanation}</div>}
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
    fontWeight: 700,
    color: '#374151',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  itemCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '18px',
    scrollMarginTop: '120px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#0f766e',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  sentenceText: {
    flex: 1,
    color: '#111827',
    fontSize: '15px',
    lineHeight: 1.7,
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
  },
  correctAnswerBox: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
  explanation: {
    marginTop: '4px',
    color: '#15803d',
    fontSize: '13px',
    fontStyle: 'italic',
  },
};

export default SentenceCorrectionDisplay;
