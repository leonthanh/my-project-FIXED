import React from 'react';

/**
 * SentenceTransformationDisplay - Display component for sentence transformation questions
 * Used in: KET Reading Part 7, PET Writing, FCE Reading
 */
const SentenceTransformationDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  answerKeyPrefix,
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const originalSentence = questionData.originalSentence || '';
  const keyword = questionData.keyword || '';
  const targetSentence = questionData.targetSentence || '';
  const wordLimit = questionData.wordLimit || '1-3';
  const hint = questionData.hint || '';
  const correctAnswer = questionData.correctAnswer || '';
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'sentence-transform';
  const questionKey = `${resolvedKeyPrefix}-0`;
  const userAnswer = answers[questionKey] || '';

  const normalize = (value) => String(value || '').trim().toLowerCase();
  const acceptedAnswers = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && (raw.includes('|') || raw.includes('/'))) {
      return raw.split(/[|/]/).map((item) => item.trim()).filter(Boolean);
    }
    return [raw];
  };
  const isCorrect = submitted && acceptedAnswers(correctAnswer).some((ans) => normalize(ans) === normalize(userAnswer));

  // Render target sentence with blank
  const renderTargetSentence = () => {
    if (!targetSentence) return null;
    const parts = targetSentence.split(/[_…]+/);
    if (parts.length < 2) {
      return <span>{targetSentence}</span>;
    }
    return (
      <span>
        {parts[0]}
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => onAnswerChange(questionKey, e.target.value)}
          disabled={submitted}
          placeholder="..."
          style={{
            ...styles.inlineInput,
            ...(submitted && {
              backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
              borderColor: isCorrect ? '#22c55e' : '#ef4444',
            }),
          }}
        />
        {parts.slice(1).join('')}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Question number + original sentence */}
        <div style={styles.header}>
          <div style={styles.questionNumber}>{startingNumber}</div>
          <div style={styles.headerContent}>
            {originalSentence && (
              <div style={styles.originalSentence}>{originalSentence}</div>
            )}
            {keyword && (
              <div style={styles.keyword}>{keyword}</div>
            )}
          </div>
        </div>

        {/* Target sentence with inline blank */}
        {targetSentence && (
          <div style={styles.targetSentence}>
            {renderTargetSentence()}
          </div>
        )}

        {/* Word limit + hint */}
        <div style={styles.metaRow}>
          <span style={styles.wordLimit}>(Write {wordLimit} word{wordLimit === '1' ? '' : 's'} only)</span>
          {hint && <span style={styles.hint}>Hint: {hint}</span>}
        </div>

        {/* Fallback input if no target sentence */}
        {!targetSentence && (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswerChange(questionKey, e.target.value)}
            disabled={submitted}
            placeholder="Type your answer..."
            style={{
              ...styles.fallbackInput,
              ...(submitted && {
                backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                borderColor: isCorrect ? '#22c55e' : '#ef4444',
              }),
            }}
          />
        )}

        {/* Correct answer display */}
        {submitted && !isCorrect && correctAnswer && (
          <div style={styles.correctAnswerBox}>
            Correct answer: <strong>{String(correctAnswer).split(/[|/]/)[0]}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '18px',
  },
  header: {
    display: 'flex',
    gap: '12px',
    marginBottom: '14px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  originalSentence: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#1f2937',
    marginBottom: '6px',
  },
  keyword: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#dc2626',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  targetSentence: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#1f2937',
    padding: '14px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  inlineInput: {
    minWidth: '140px',
    padding: '6px 10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    textAlign: 'center',
    margin: '0 6px',
    outline: 'none',
  },
  fallbackInput: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    marginTop: '10px',
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: '10px',
  },
  wordLimit: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  hint: {
    fontSize: '13px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  correctAnswerBox: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default SentenceTransformationDisplay;
