import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const acceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || '').split(/[|/]/).map(normalize).filter(Boolean)
);
const primaryAnswer = (value) => String(value || '').split(/[|/]/)[0].trim();

const renderSentence = (text, renderBlank) => String(text || '').split(/(\{1\})/g).map((part, index) => (
  part === '{1}' ? renderBlank(index) : part
));

const WordBankAdjectiveFormationDisplay = ({
  section,
  startingNumber = 1,
  onAnswerChange,
  answers = {},
  submitted = false,
}) => {
  const question = section?.questions?.[0] || {};
  const wordBank = Array.isArray(question.wordBank) ? question.wordBank : [];
  const items = Array.isArray(question.items) ? question.items : [];

  return (
    <div style={styles.container}>
      {question.instruction && <p style={styles.instruction}>{question.instruction}</p>}
      <div style={styles.wordBank}>
        {wordBank.map((word, index) => (
          <React.Fragment key={`${word}-${index}`}>
            {index > 0 && <span style={styles.wordSeparator}>★</span>}
            <strong>{word}</strong>
          </React.Fragment>
        ))}
      </div>
      <div style={styles.items}>
        {items.map((item, index) => {
          const questionNumber = startingNumber + index;
          const answerKey = `${section?.id || 'section'}-${index}`;
          const userAnswer = String(answers[answerKey] || '');
          const correctAnswer = item.correctAnswer || '';
          const isCorrect = acceptedAnswers(correctAnswer).includes(normalize(userAnswer));

          return (
            <div
              key={index}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.item}
            >
              <strong>{questionNumber}.</strong>{' '}
              {renderSentence(item.questionText || '', (key) => (
                <React.Fragment key={key}>
                  <input
                    type="text"
                    aria-label={`Question ${questionNumber}, adjective answer`}
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
                </React.Fragment>
              ))}
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
  instruction: { margin: '0 0 12px', fontWeight: 700, color: '#1f2937', fontFamily: 'serif', lineHeight: 1.7 },
  wordBank: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 10px', borderRadius: 6, background: '#f8fafc', color: '#1f2937', fontFamily: 'serif' },
  wordSeparator: { color: '#334155' },
  items: { display: 'grid', gap: 8 },
  item: { padding: '6px 4px', color: '#1f2937', fontFamily: 'serif', fontSize: 16, lineHeight: 2 },
  answer: { display: 'inline-block', width: 'clamp(150px, 30vw, 240px)', height: 28, margin: '0 4px', padding: '2px 6px', border: 0, borderBottom: '2px solid #334155', borderRadius: 0, background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: 600, outlineOffset: 2, boxSizing: 'border-box' },
  correctAnswer: { display: 'inline-block', marginLeft: 6, color: '#b91c1c', fontSize: 13, fontWeight: 700 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default WordBankAdjectiveFormationDisplay;
