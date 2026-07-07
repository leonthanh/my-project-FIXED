import React from 'react';

const OPTIONS = [
  { key: 'TRUE', label: 'True' },
  { key: 'FALSE', label: 'False' },
  { key: 'NOT GIVEN', label: 'Not Given' },
];

/**
 * TrueFalseNotGivenDisplay - Display component for True/False/Not Given questions
 * Used in: IELTS Reading, FCE Listening
 */
const TrueFalseNotGivenDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  answerKeyPrefix,
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const statements = Array.isArray(questionData.statements)
    ? questionData.statements
    : [];
  const passageTitle = questionData.passageTitle || '';
  const passage = questionData.passage || '';
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'tfng';

  const normalize = (value) => String(value || '').trim().toUpperCase();

  return (
    <div style={styles.container}>
      {/* Passage / Prompt */}
      {(passageTitle || passage) && (
        <div style={styles.passageContainer}>
          {passageTitle && <h4 style={styles.passageTitle}>{passageTitle}</h4>}
          {passage && (
            <div style={styles.passageContent} dangerouslySetInnerHTML={{ __html: passage }} />
          )}
        </div>
      )}

      {/* Statements */}
      <div style={styles.statementsContainer}>
        {statements.map((stmt, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${resolvedKeyPrefix}-${idx}`;
          const userAnswer = answers[questionKey] || '';
          const correctAnswer = stmt.correctAnswer || '';
          const isCorrect = submitted && normalize(userAnswer) === normalize(correctAnswer);
          const isWrong = submitted && userAnswer && !isCorrect;

          return (
            <div key={stmt.id || idx} style={styles.statementCard}>
              <div style={styles.statementHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.statementText}>{stmt.text}</div>
              </div>

              <div style={styles.optionsContainer}>
                {OPTIONS.map((option) => {
                  const isSelected = normalize(userAnswer) === option.key;
                  const isCorrectOption = submitted && normalize(correctAnswer) === option.key;

                  return (
                    <label
                      key={option.key}
                      style={{
                        ...styles.optionLabel,
                        ...(isSelected && styles.optionSelected),
                        ...(isCorrectOption && styles.optionCorrect),
                        ...(isWrong && isSelected && styles.optionWrong),
                      }}
                    >
                      <input
                        type="radio"
                        name={questionKey}
                        value={option.key}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() => onAnswerChange(questionKey, option.key)}
                        style={styles.radioInput}
                      />
                      <span style={styles.optionText}>{option.label}</span>
                    </label>
                  );
                })}
              </div>

              {isWrong && correctAnswer && (
                <div style={styles.correctAnswerBox}>
                  Correct answer: <strong>{correctAnswer}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  passageContainer: {
    padding: '20px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  passageTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0c4a6e',
  },
  passageContent: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#1f2937',
  },
  statementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statementCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '18px',
  },
  statementHeader: {
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
    backgroundColor: '#0ea5e9',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  statementText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#1f2937',
  },
  optionsContainer: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginLeft: '44px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#fafafa',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '110px',
  },
  optionSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  optionCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#0ea5e9',
  },
  optionText: {
    fontSize: '14px',
    fontWeight: 500,
  },
  correctAnswerBox: {
    marginTop: '12px',
    marginLeft: '44px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default TrueFalseNotGivenDisplay;
