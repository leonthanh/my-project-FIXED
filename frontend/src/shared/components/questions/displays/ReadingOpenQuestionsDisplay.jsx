import React from 'react';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const acceptedAnswers = (raw) => {
  if (Array.isArray(raw)) return raw.map(normalize).filter(Boolean);
  if (typeof raw === 'string' && (raw.includes('|') || raw.includes('/'))) {
    return raw.split(/[|/]/).map((item) => normalize(item)).filter(Boolean);
  }
  return [normalize(raw)].filter(Boolean);
};

const ReadingOpenQuestionsDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  renderMode = 'full',
}) => {
  const singleQuestion = section?.questions?.[0] || {};
  const title = singleQuestion?.passageTitle || singleQuestion?.title || 'Read the message.';
  const passage = singleQuestion?.passage || singleQuestion?.passageText || '';
  const instruction = singleQuestion?.instruction || 'Answer the questions.';
  const items = Array.isArray(singleQuestion?.items) ? singleQuestion.items : [];
  const sectionId = section?.id || 'section';

  const passagePanel = (
    <div className="reading-open-questions-passage" style={styles.passagePanel}>
        {title && <h3 style={styles.title}>{title}</h3>}
        <div
          style={styles.passage}
          dangerouslySetInnerHTML={{ __html: passage || '<p>Reading passage...</p>' }}
        />
      </div>
  );

  const questionsPanel = (
    <div style={styles.questionsPanel}>
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
                  <span style={styles.questionNumber}>{questionNumber}</span>
                  <div style={styles.questionText}>{item.questionText || 'Question text...'}</div>
                </div>

                <textarea
                  value={userAnswer}
                  onChange={(event) => onAnswerChange(answerKey, event.target.value)}
                  disabled={submitted}
                  placeholder="Write your answer..."
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
                    Answer: <strong>{String(item.correctAnswer).split(/[|/]/)[0].trim()}</strong>
                    {item.explanation && <div style={styles.explanation}>{item.explanation}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
  );

  if (renderMode === 'passage') return passagePanel;
  if (renderMode === 'questions') return questionsPanel;

  return (
    <div className="reading-open-questions-display" style={styles.container}>
      <style>{`
        @media (max-width: 900px) {
          .reading-open-questions-display {
            display: flex !important;
            flex-direction: column;
          }
          .reading-open-questions-display .reading-open-questions-passage {
            position: static !important;
            max-height: none !important;
          }
        }
      `}</style>
      {passagePanel}
      {questionsPanel}
    </div>
  );
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.95fr) minmax(360px, 1.05fr)',
    gap: '20px',
    alignItems: 'start',
    marginBottom: '24px',
  },
  passagePanel: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 14px',
    color: '#0f172a',
    fontSize: '18px',
    fontWeight: 800,
  },
  passage: {
    color: '#1f2937',
    fontSize: '15px',
    lineHeight: 1.8,
  },
  questionsPanel: {
    minWidth: 0,
  },
  instruction: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 16px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  itemCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    scrollMarginTop: '120px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    color: '#111827',
    fontSize: '15px',
    lineHeight: 1.6,
    fontWeight: 650,
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
    marginTop: '10px',
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

export default ReadingOpenQuestionsDisplay;