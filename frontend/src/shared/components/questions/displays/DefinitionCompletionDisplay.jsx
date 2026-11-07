import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const acceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || '').split(/[|/]/).map(normalize).filter(Boolean)
);
const getPrimaryAnswer = (answer) => String(answer || '').split(/[|/]/)[0].trim();

const DefinitionCompletionDisplay = ({
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
        {items.map((item, index) => {
          const questionNumber = startingNumber + index;
          const answerKey = `${section?.id || 'section'}-${index}`;
          const correctAnswer = item.correctAnswer || '';
          const primaryAnswer = getPrimaryAnswer(correctAnswer);
          const firstLetter = Array.from(primaryAnswer)[0] || '';
          const storedAnswer = String(answers[answerKey] || '');
          const answerSuffix = firstLetter && storedAnswer.toLowerCase().startsWith(firstLetter.toLowerCase())
            ? storedAnswer.slice(firstLetter.length)
            : storedAnswer;
          const isCorrect = acceptedAnswers(correctAnswer).includes(normalize(storedAnswer));
          const suffixLength = Math.max(Array.from(primaryAnswer).length - 1, 4);

          return (
            <div
              key={index}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.item}
            >
              <div style={styles.prompt}>
                <strong>{questionNumber}.</strong>{' '}
                {item.questionText || ''}
              </div>
              <div style={styles.answerRow}>
                <span style={styles.firstLetter}>{firstLetter || '…'}</span>
                <input
                  type="text"
                  aria-label={`Question ${questionNumber}, complete the word`}
                  value={answerSuffix}
                  disabled={submitted}
                  placeholder={'_'.repeat(suffixLength)}
                  onChange={(event) => {
                    const suffix = event.target.value;
                    onAnswerChange(
                      answerKey,
                      suffix && firstLetter ? `${firstLetter}${suffix}` : suffix
                    );
                  }}
                  style={{
                    ...styles.answer,
                    width: Math.max(80, Math.min(18 * suffixLength, 240)),
                    ...(submitted ? {
                      backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                      borderColor: isCorrect ? '#22c55e' : '#ef4444',
                    } : {}),
                  }}
                />
                {submitted && !isCorrect && correctAnswer && (
                  <span style={styles.correctAnswer}>{primaryAnswer}</span>
                )}
              </div>
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
  items: { display: 'grid', gap: 12 },
  item: { padding: '10px 4px', borderBottom: '1px solid #e5e7eb', lineHeight: 1.8 },
  prompt: { color: '#1f2937', fontFamily: 'serif', fontSize: 16 },
  answerRow: { display: 'flex', alignItems: 'baseline', gap: 8, marginLeft: 26, marginTop: 2 },
  firstLetter: { minWidth: 12, color: '#111827', fontFamily: 'serif', fontSize: 16, fontWeight: 600 },
  answer: { display: 'inline-block', height: 28, padding: '2px 4px', border: 0, borderBottom: '2px solid #334155', borderRadius: 0, background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: 600, letterSpacing: 1, outlineOffset: 2, boxSizing: 'border-box' },
  correctAnswer: { marginLeft: 4, color: '#b91c1c', fontSize: 12, fontWeight: 700 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default DefinitionCompletionDisplay;
