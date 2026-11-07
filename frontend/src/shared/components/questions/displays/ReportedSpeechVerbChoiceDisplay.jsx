import React from 'react';

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase();
const isSameAnswer = (left, right) => normalize(left) === normalize(right);

const ReportedSpeechVerbChoiceDisplay = ({
  section,
  startingNumber = 1,
  onAnswerChange,
  answers = {},
  submitted = false,
}) => {
  const question = section?.questions?.[0] || {};
  const items = Array.isArray(question.items) ? question.items : [];
  const options = Array.isArray(question.options) ? question.options : [];
  const example = question.example || {};

  return (
    <div style={styles.container}>
      {question.instruction && <p style={styles.instruction}>{question.instruction}</p>}
      {example.sentencePrefix && (
        <p style={styles.example}>
          <strong>Example.</strong>{' '}
          <em>
            {example.sentencePrefix}
            {options.filter((option) => !isSameAnswer(option, example.correctAnswer)).join(' / ')}
            {' ('}<strong>{example.correctAnswer}</strong>{')'}
            {example.sentenceSuffix}
          </em>
        </p>
      )}

      <div style={styles.items}>
        {items.map((item, itemIndex) => {
          const questionNumber = startingNumber + itemIndex;
          const answerKey = `${section?.id || 'section'}-${itemIndex}`;
          const userAnswer = answers[answerKey] || '';
          const expected = item.correctAnswer || '';
          const isCorrect = isSameAnswer(userAnswer, expected);

          return (
            <div
              key={itemIndex}
              id={`question-${questionNumber}`}
              tabIndex={-1}
              style={styles.item}
            >
              <span style={styles.sentence}>
                <strong>{questionNumber}.</strong> {item.sentencePrefix}
              </span>
              <span role="radiogroup" aria-label={`Question ${questionNumber} answer`} style={styles.options}>
                {options.map((option, optionIndex) => {
                  const selected = isSameAnswer(userAnswer, option);
                  const correctOption = submitted && isSameAnswer(expected, option);
                  const wrongSelection = submitted && selected && !correctOption;

                  return (
                    <label
                      key={`${option}-${optionIndex}`}
                      style={{
                        ...styles.option,
                        ...(correctOption ? styles.correctOption : {}),
                        ...(wrongSelection ? styles.wrongOption : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name={answerKey}
                        aria-label={`Question ${questionNumber}: ${option}`}
                        value={option}
                        checked={selected}
                        disabled={submitted}
                        onChange={() => onAnswerChange(answerKey, option)}
                      />
                      {option}
                    </label>
                  );
                })}
              </span>
              <span style={styles.sentence}>{item.sentenceSuffix}</span>
              {submitted && !isCorrect && expected && (
                <span style={styles.correctAnswer}>
                  Correct answer: <strong>{expected}</strong>
                </span>
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
  example: { margin: '0 0 16px', paddingLeft: 20, color: '#475569', lineHeight: 1.8 },
  items: { display: 'grid', gap: 12 },
  item: { display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', padding: '4px 2px', color: '#1f2937', fontFamily: 'serif', fontSize: 15, lineHeight: 1.8 },
  sentence: { whiteSpace: 'pre-wrap' },
  options: { display: 'inline-flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  option: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  correctOption: { background: '#dcfce7', color: '#166534' },
  wrongOption: { background: '#fee2e2', color: '#b91c1c' },
  correctAnswer: { marginLeft: 6, color: '#b91c1c', fontFamily: 'Arial, sans-serif', fontSize: 13 },
  scoreNote: { marginTop: 16, textAlign: 'right', color: '#475569', fontWeight: 700 },
};

export default ReportedSpeechVerbChoiceDisplay;
