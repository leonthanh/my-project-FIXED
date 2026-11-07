import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const acceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || '').split(/[|/]/).map(normalize).filter(Boolean)
);
const primaryAnswer = (value) => String(value || '').split(/[|/]/)[0].trim();

const renderSentence = (text, renderBlank) => String(text || '').split(/(\{[12]\})/g).map((part, index) => {
  const match = part.match(/^\{([12])\}$/);
  return match ? renderBlank(Number(match[1]) - 1, index) : part;
});

const ConditionalSentenceCompletionDisplay = ({
  section,
  startingNumber = 1,
  onAnswerChange,
  answers = {},
  submitted = false,
}) => {
  const question = section?.questions?.[0] || {};
  const items = Array.isArray(question.items) ? question.items : [];

  return (
    <div style={styles.container}>
      {question.instruction && <p style={styles.instruction}>{question.instruction}</p>}
      <div style={styles.items}>
        {items.map((item, itemIndex) => {
          const questionNumber = startingNumber + itemIndex;
          return (
            <div
              key={itemIndex}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.item}
            >
              <span style={styles.number}>{questionNumber}.</span>
              <span style={styles.sentence}>
                {renderSentence(item.questionText, (blankIndex, key) => {
                  const answerKey = `${section?.id || 'section'}-${itemIndex}-${blankIndex}`;
                  const userAnswer = String(answers[answerKey] || '');
                  const correctAnswer = item.blankAnswers?.[blankIndex] || '';
                  const isCorrect = acceptedAnswers(correctAnswer).includes(normalize(userAnswer));
                  return (
                    <React.Fragment key={key}>
                      {' '}
                      <input
                        type="text"
                        aria-label={`Question ${questionNumber}, answer ${blankIndex + 1}`}
                        value={userAnswer}
                        disabled={submitted}
                        onChange={(event) => onAnswerChange(answerKey, event.target.value)}
                        style={{
                          ...styles.answer,
                          ...(submitted ? {
                            backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                            borderColor: isCorrect ? '#22c55e' : '#ef4444',
                          } : {}),
                        }}
                      />
                      {submitted && !isCorrect && correctAnswer && (
                        <span style={styles.correctAnswer}>{primaryAnswer(correctAnswer)}</span>
                      )}
                      {' '}
                    </React.Fragment>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
      {question.scoreNote && <div style={styles.scoreNote}>{question.scoreNote}</div>}
    </div>
  );
};

const styles = {
  container: { width: '100%', maxWidth: 1000, margin: '0 auto', padding: 20, background: '#fff', borderRadius: 12, boxSizing: 'border-box' },
  instruction: { margin: '0 0 16px', fontWeight: 700, color: '#1f2937', lineHeight: 1.6 },
  items: { display: 'grid', gap: 4 },
  item: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 4px', lineHeight: 2 },
  number: { flex: '0 0 24px', textAlign: 'right', fontWeight: 700, color: '#334155' },
  sentence: { flex: 1, color: '#1f2937', lineHeight: 2, fontFamily: 'serif', fontSize: 15 },
  answer: { display: 'inline-block', width: 'clamp(105px, 17vw, 155px)', height: 30, margin: '0 2px', padding: '2px 6px', border: 0, borderBottom: '2px solid #334155', borderRadius: 0, background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: 600, verticalAlign: 'baseline', outlineOffset: 2, boxSizing: 'border-box' },
  correctAnswer: { display: 'inline-block', marginLeft: 4, color: '#b91c1c', fontSize: 12, fontWeight: 700 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default ConditionalSentenceCompletionDisplay;
