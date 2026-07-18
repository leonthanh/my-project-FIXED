import React from 'react';

const normalize = (value) => String(value || '').trim().toLowerCase();

const acceptedAnswers = (raw) => {
  if (Array.isArray(raw)) return raw.map(normalize).filter(Boolean);
  if (typeof raw === 'string' && (raw.includes('/') || raw.includes('|'))) {
    return raw.split(/[|/]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  return [normalize(raw)].filter(Boolean);
};

const DroppableBlank = ({ userAnswer, submitted, isCorrect, onDrop }) => {
  const [dragOver, setDragOver] = React.useState(false);

  return (
    <span
      onDragOver={(e) => {
        e.preventDefault();
        if (!submitted) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (submitted) return;
        let word = e.dataTransfer.getData('text/plain');
        if (!word && typeof window !== 'undefined' && window.__prepositionDragWord) {
          word = window.__prepositionDragWord;
        }
        if (word && onDrop) onDrop(word);
      }}
      style={{
        display: 'inline-block',
        minWidth: '80px',
        padding: '2px 10px',
        borderBottom: `2px solid ${submitted ? (isCorrect ? '#22c55e' : '#ef4444') : '#3b82f6'}`,
        color: submitted ? (isCorrect ? '#15803d' : '#b91c1c') : '#1d4ed8',
        fontWeight: 600,
        margin: '0 4px',
        textAlign: 'center',
        cursor: submitted ? 'default' : 'move',
        borderRadius: '4px',
        backgroundColor: submitted
          ? 'transparent'
          : dragOver
          ? '#bfdbfe'
          : '#eff6ff',
        transition: 'background-color 0.15s ease',
      }}
    >
      {userAnswer || '___'}
    </span>
  );
};

const getHighlightedSentence = (sentence, userAnswer, submitted, isCorrect, onDrop) => {
  if (!sentence) return null;
  const parts = sentence.split(/_{2,}|\[BLANK\]/gi);
  if (parts.length < 2) return <span>{sentence}</span>;

  return (
    <span style={{ lineHeight: 1.8, fontSize: '15px' }}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <DroppableBlank
              userAnswer={userAnswer}
              submitted={submitted}
              isCorrect={isCorrect}
              onDrop={onDrop}
            />
          )}
        </React.Fragment>
      ))}
    </span>
  );
};

/**
 * PrepositionGapFillDisplay - FCE Part 2 student display
 * Shows word bank and sentences with blanks for students to fill in.
 */
const PrepositionGapFillDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  renderMode = 'full',
}) => {
  const singleQuestion = section?.questions?.[0] || {};
  const passageTitle = singleQuestion?.passageTitle || '';
  const instruction = singleQuestion?.instruction || 'Fill in the appropriate prepositions in the blanks.';
  const options = Array.isArray(singleQuestion?.options) ? singleQuestion.options : [];
  const items = Array.isArray(singleQuestion?.items) ? singleQuestion.items : [];
  const sectionId = section?.id || 'section';

  const wordBankContent = options.length > 0 ? (
    <div style={styles.wordBank}>
      <div style={styles.wordBankTitle}>Word Bank</div>
      <div style={styles.wordBankGrid}>
        {options.map((opt, idx) => (
          <div
            key={idx}
            draggable={!submitted}
            onDragStart={(e) => {
              if (typeof window !== 'undefined') {
                window.__prepositionDragWord = opt.word || '';
              }
              e.dataTransfer.setData('text/plain', opt.word || '');
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDragEnd={() => {
              if (typeof window !== 'undefined') {
                window.__prepositionDragWord = '';
              }
            }}
            style={{
              ...styles.wordBankItem,
              cursor: submitted ? 'default' : 'grab',
              opacity: submitted ? 0.7 : 1,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <span style={styles.wordBankWord}>{opt.word}</span>
            {opt.count > 1 && <span style={styles.wordBankCount}>(×{opt.count})</span>}
          </div>
        ))}
      </div>
      {!submitted && (
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#7c3aed', fontStyle: 'italic' }}>
          Drag a word and drop it into a blank, or type your answer below.
        </p>
      )}
    </div>
  ) : null;

  const questionsContent = (
    <div style={styles.questionsContainer}>
      {items.map((item, idx) => {
        const questionNumber = startingNumber + idx;
        const questionKey = `${sectionId}-${idx}`;
        const userAnswer = answers[questionKey] || '';
        const correct = acceptedAnswers(item.correctAnswer);
        const isCorrect = submitted && correct.includes(normalize(userAnswer));

        return (
          <div
            key={idx}
            id={`question-${questionNumber}`}
            tabIndex={-1}
            style={styles.questionCard}
          >
            <div style={styles.questionHeader}>
              <div style={styles.questionNumber}>{questionNumber}</div>
              <div style={{ flex: 1 }}>
                {getHighlightedSentence(item.sentence, userAnswer, submitted, isCorrect, (word) =>
                  onAnswerChange(questionKey, word)
                )}
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => onAnswerChange(questionKey, e.target.value)}
                disabled={submitted}
                placeholder="Type your answer..."
                style={{
                  ...styles.input,
                  maxWidth: '220px',
                  ...(submitted && {
                    backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                    borderColor: isCorrect ? '#22c55e' : '#ef4444',
                  }),
                }}
              />
              {submitted && !isCorrect && item.correctAnswer && (
                <span style={styles.correctAnswerBox}>
                  Correct: <strong>{item.correctAnswer}</strong>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (renderMode === 'wordbank') {
    return (
      <div style={styles.container}>
        {passageTitle && <h3 style={styles.title}>{passageTitle}</h3>}
        <p style={styles.instruction}>{instruction}</p>
        {wordBankContent}
      </div>
    );
  }

  if (renderMode === 'questions') {
    return (
      <div style={styles.container}>
        {questionsContent}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {passageTitle && <h3 style={styles.title}>{passageTitle}</h3>}
      <p style={styles.instruction}>{instruction}</p>
      {wordBankContent}
      {questionsContent}
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 14px',
    fontSize: 'clamp(18px, 2vw, 24px)',
    fontWeight: 700,
    color: '#0e276f',
  },
  instruction: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  wordBank: {
    backgroundColor: '#faf5ff',
    border: '1px solid #e9d5ff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  wordBankTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#6b21a8',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  wordBankGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px',
  },
  wordBankItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 12px',
    backgroundColor: '#fff',
    border: '1px solid #d8b4fe',
    borderRadius: '8px',
    fontWeight: 600,
    color: '#5b21b6',
  },
  wordBankWord: {
    fontSize: '15px',
  },
  wordBankCount: {
    fontSize: '12px',
    color: '#7c3aed',
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
    backgroundColor: '#7c3aed',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  input: {
    padding: '10px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
  },
  correctAnswerBox: {
    padding: '8px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default PrepositionGapFillDisplay;
