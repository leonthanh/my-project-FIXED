import React from 'react';

const BLANK_REGEX = /_{3,}/;

/**
 * StoryWritingDisplay - Display component for story writing questions
 * Used in: FCE Reading
 */
const StoryWritingDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  answerKeyPrefix,
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const title = questionData.title || '';
  const instructions = questionData.instructions || '';
  const story = questionData.story || '';
  const questions = Array.isArray(questionData.questions)
    ? questionData.questions
    : [];
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'story-writing';

  const normalize = (value) => String(value || '').trim().toLowerCase();

  // Split story by blanks and render inputs
  const renderStoryWithBlanks = () => {
    const parts = story.split(BLANK_REGEX);
    const blankCount = (story.match(BLANK_REGEX) || []).length;

    if (blankCount === 0) {
      return <div style={styles.storyText}>{story}</div>;
    }

    return (
      <div style={styles.storyText}>
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            <span dangerouslySetInnerHTML={{ __html: part }} />
            {idx < blankCount && (
              <input
                type="text"
                value={answers[`${resolvedKeyPrefix}-blank-${idx}`] || ''}
                onChange={(e) =>
                  onAnswerChange(`${resolvedKeyPrefix}-blank-${idx}`, e.target.value)
                }
                disabled={submitted}
                placeholder="..."
                style={{
                  ...styles.blankInput,
                  ...(submitted && {
                    backgroundColor: '#f3f4f6',
                    borderColor: '#d1d5db',
                  }),
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Title + Instructions */}
      <div style={styles.headerCard}>
        {title && <h3 style={styles.title}>{title}</h3>}
        {instructions && <p style={styles.instructions}>{instructions}</p>}
      </div>

      {/* Story with blanks */}
      {story && (
        <div style={styles.storyCard}>
          {renderStoryWithBlanks()}
        </div>
      )}

      {/* Follow-up questions */}
      {questions.length > 0 && (
        <div style={styles.questionsContainer}>
          {questions.map((q, idx) => {
            const questionNumber = startingNumber + idx;
            const questionKey = `${resolvedKeyPrefix}-q-${idx}`;
            const userAnswer = answers[questionKey] || '';
            const correctAnswer = q.correctAnswer || '';
            const isCorrect = submitted && normalize(userAnswer) === normalize(correctAnswer);
            const isWrong = submitted && userAnswer && !isCorrect;

            return (
              <div key={q.id || idx} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <div style={styles.questionNumber}>{questionNumber}</div>
                  <div style={styles.questionText}>{q.text}</div>
                </div>

                <div style={styles.answerRow}>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(questionKey, e.target.value)}
                    disabled={submitted}
                    placeholder="Your answer"
                    style={{
                      ...styles.answerInput,
                      ...(submitted && {
                        backgroundColor: isCorrect ? '#dcfce7' : isWrong ? '#fee2e2' : '#f3f4f6',
                        borderColor: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#d1d5db',
                      }),
                    }}
                  />
                  {q.wordLimit && (
                    <span style={styles.wordLimit}>({q.wordLimit} word{q.wordLimit === '1' ? '' : 's'})</span>
                  )}
                </div>

                {q.hint && !submitted && (
                  <div style={styles.hint}>Hint: {q.hint}</div>
                )}

                {isWrong && correctAnswer && (
                  <div style={styles.correctAnswerBox}>
                    Correct answer: <strong>{correctAnswer}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  headerCard: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0c4a6e',
  },
  instructions: {
    margin: 0,
    fontSize: '14px',
    color: '#0369a1',
    lineHeight: 1.6,
  },
  storyCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  storyText: {
    fontSize: '15px',
    lineHeight: 2,
    color: '#1f2937',
  },
  blankInput: {
    minWidth: '100px',
    padding: '6px 10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    textAlign: 'center',
    margin: '0 4px',
    outline: 'none',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#1f2937',
  },
  answerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: '44px',
    flexWrap: 'wrap',
  },
  answerInput: {
    minWidth: '180px',
    padding: '8px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
  },
  wordLimit: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  hint: {
    marginTop: '8px',
    marginLeft: '44px',
    fontSize: '13px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'inline-block',
  },
  correctAnswerBox: {
    marginTop: '10px',
    marginLeft: '44px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default StoryWritingDisplay;
