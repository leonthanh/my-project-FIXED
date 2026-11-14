import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.]+$/, '');
const acceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || '').split(/[|/]/).map(normalize).filter(Boolean)
);
const primaryAnswer = (value) => String(value || '').split(/[|/]/)[0].trim();

const ReportedCommandCompletionDisplay = ({
  section,
  startingNumber = 1,
  onAnswerChange,
  answers = {},
  submitted = false,
}) => {
  const question = section?.questions?.[0] || {};
  const example = question.example || {};
  const items = Array.isArray(question.items) ? question.items : [];

  return (
    <div style={styles.container}>
      {question.instruction && <p style={styles.instruction}>{question.instruction}</p>}

      {example.sourceText && (
        <div style={styles.example}>
          <strong>0.</strong>
          <div style={styles.exampleContent}>
            <div>{example.sourceText}</div>
            <div style={styles.response}>
              <span style={styles.arrow}>↳</span>
              <span>
                {example.sentenceStarter}{' '}
                <strong>{example.correctAnswer}</strong>.{' '}
                <span>({example.reportingVerb})</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.items}>
        {items.map((item, itemIndex) => {
          const questionNumber = startingNumber + itemIndex;
          const answerKey = `${section?.id || 'section'}-${itemIndex}`;
          const userAnswer = String(answers[answerKey] || '');
          const expected = item.correctAnswer || '';
          const isCorrect = acceptedAnswers(expected).includes(normalize(userAnswer));

          return (
            <div
              key={itemIndex}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.item}
            >
              <div style={styles.source}>
                <strong>{questionNumber}.</strong> {item.sourceText}
              </div>
              <div style={styles.response}>
                <span style={styles.arrow}>↳</span>
                <span style={styles.starter}>{item.sentenceStarter}</span>
                <input
                  type="text"
                  aria-label={`Question ${questionNumber}, reported command`}
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
                <span>.</span>
                <span style={styles.verbHint}>({item.reportingVerb})</span>
              </div>
              {submitted && !isCorrect && expected && (
                <div style={styles.correctAnswer}>
                  Correct answer: <strong>{item.sentenceStarter} {primaryAnswer(expected)}.</strong>
                </div>
              )}
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
  example: { display: 'flex', gap: 8, marginBottom: 14, padding: '8px 4px', color: '#475569', fontFamily: 'serif', fontStyle: 'italic', lineHeight: 1.8 },
  exampleContent: { flex: 1 },
  items: { display: 'grid', gap: 10 },
  item: { padding: '4px 2px', color: '#1f2937', fontFamily: 'serif', fontSize: 15, lineHeight: 1.8 },
  source: { marginBottom: 3 },
  response: { display: 'flex', alignItems: 'baseline', gap: 6, marginLeft: 18, flexWrap: 'wrap' },
  arrow: { color: '#334155' },
  starter: { whiteSpace: 'pre' },
  answer: { flex: '1 1 260px', minWidth: 150, maxWidth: 600, height: 30, padding: '2px 6px', border: 0, borderBottom: '1px solid #334155', borderRadius: 0, background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: 600, outlineOffset: 2, boxSizing: 'border-box' },
  verbHint: { whiteSpace: 'nowrap', color: '#334155' },
  correctAnswer: { margin: '4px 0 0 44px', color: '#b91c1c', fontSize: 13 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default ReportedCommandCompletionDisplay;
