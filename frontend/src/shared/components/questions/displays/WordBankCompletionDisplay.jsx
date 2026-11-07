import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const acceptedAnswers = (value) => (
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || '').split(/[|/]/).map(normalize).filter(Boolean)
);

const renderSentence = (text, renderBlank) => {
  const parts = String(text || '').split(/(\{[12]\})/g);
  return parts.map((part, index) => {
    const blankMatch = part.match(/^\{([12])\}$/);
    return blankMatch ? renderBlank(Number(blankMatch[1]) - 1, index) : part;
  });
};

const WordBankCompletionDisplay = ({
  section,
  startingNumber = 1,
  onAnswerChange,
  answers = {},
  submitted = false,
}) => {
  const question = section?.questions?.[0] || {};
  const banks = Array.isArray(question.wordBanks) ? question.wordBanks : [];
  const items = Array.isArray(question.items) ? question.items : [];
  const example = question.example || {};
  const exampleAnswers = Array.isArray(example.blankAnswers) ? example.blankAnswers : [];
  const usedExampleWords = new Set(exampleAnswers.map(normalize));

  const renderFilledSentence = (item) => renderSentence(item.questionText, (blankIndex, key) => (
    <strong key={key} style={styles.exampleAnswer}>
      {item.blankAnswers?.[blankIndex] || `(${blankIndex + 1})`}
    </strong>
  ));

  return (
    <div style={styles.container}>
      {question.instruction && <p style={styles.instruction}>{question.instruction}</p>}

      <div style={styles.banks}>
        {banks.map((bank, bankIndex) => (
          <div key={`${bank.label || bankIndex}-${bankIndex}`} style={styles.bank}>
            <strong>{bank.label || String.fromCharCode(65 + bankIndex)}:</strong>
            <span>
              {(bank.words || []).map((word, wordIndex) => (
                <React.Fragment key={`${word}-${wordIndex}`}>
                  {wordIndex > 0 && ' | '}
                  <span style={usedExampleWords.has(normalize(word)) ? styles.usedWord : undefined}>{word}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        ))}
      </div>

      {example.questionText && (
        <div style={styles.example}>
          <span style={styles.number}>0.</span>
          <span>{renderFilledSentence(example)}</span>
        </div>
      )}

      <div style={styles.items}>
        {items.map((item, itemIndex) => (
          <div
            key={itemIndex}
            id={`question-${startingNumber + itemIndex}`}
            tabIndex={-1}
            style={styles.item}
          >
            <span style={styles.number}>{startingNumber + itemIndex}.</span>
            <span style={styles.sentence}>
              {renderSentence(item.questionText, (blankIndex, key) => {
                const answerKey = `${section?.id || 'section'}-${itemIndex}-${blankIndex}`;
                const userAnswer = String(answers[answerKey] || '');
                const correctAnswer = item.blankAnswers?.[blankIndex];
                const isCorrect = acceptedAnswers(correctAnswer).includes(normalize(userAnswer));
                return (
                  <React.Fragment key={key}>
                    {' '}
                    <input
                      type="text"
                      aria-label={`Question ${startingNumber + itemIndex}, answer ${blankIndex + 1}`}
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
                      <span style={styles.correctAnswer}>{String(correctAnswer).split(/[|/]/)[0].trim()}</span>
                    )}
                    {' '}
                  </React.Fragment>
                );
              })}
            </span>
          </div>
        ))}
      </div>

      {question.scoreNote && <div style={styles.scoreNote}>{question.scoreNote}</div>}
    </div>
  );
};

const styles = {
  container: { width: '100%', maxWidth: 1000, margin: '0 auto', padding: '20px', background: '#fff', borderRadius: 12, boxSizing: 'border-box' },
  instruction: { margin: '0 0 16px', fontWeight: 700, color: '#1f2937', lineHeight: 1.6 },
  banks: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 14 },
  bank: { display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 180, maxWidth: '100%', padding: '10px 14px', border: '2px solid #94a3b8', borderRadius: 6, lineHeight: 1.7 },
  example: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, padding: '8px 4px', color: '#475569', fontStyle: 'italic', lineHeight: 1.9 },
  exampleAnswer: { display: 'inline-block', margin: '0 3px', padding: '0 5px', color: '#166534', textDecoration: 'underline' },
  usedWord: { textDecoration: 'line-through', color: '#64748b' },
  items: { display: 'grid', gap: 4 },
  item: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 4px', lineHeight: 2 },
  number: { flex: '0 0 24px', textAlign: 'right', fontWeight: 700, color: '#334155' },
  sentence: { flex: 1, color: '#1f2937', lineHeight: 2 },
  answer: { display: 'inline-block', width: 'clamp(82px, 16vw, 150px)', height: 30, margin: '0 2px', padding: '2px 6px', border: '0', borderBottom: '2px solid #334155', borderRadius: 0, background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: 600, verticalAlign: 'baseline', outlineOffset: 2, boxSizing: 'border-box' },
  correctAnswer: { display: 'inline-block', color: '#b91c1c', fontSize: 12, fontWeight: 700 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default WordBankCompletionDisplay;
