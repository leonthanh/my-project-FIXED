import React from 'react';

function sanitizePassageHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';

  if (typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
      const src = String(img.getAttribute('src') || '').trim();
      if (!src) {
        img.remove();
      }
    });

    doc.querySelectorAll('p').forEach((paragraph) => {
      const text = String(paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasMedia = paragraph.querySelector('img, video, audio');
      const brCount = paragraph.querySelectorAll('br').length;

      if (!text && !hasMedia && brCount > 0) {
        paragraph.remove();
        return;
      }

      if (!text && !hasMedia) {
        paragraph.remove();
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function normalizeAnswer(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'TRUE') return 'T';
  if (normalized === 'FALSE') return 'F';
  return normalized;
}

/**
 * LongTextMCDisplay - Display component for long-text-mc questions (KET Part 3)
 * Shows passage with 5-7 multiple choice questions
 */
const LongTextMCDisplay = ({ 
  section, 
  startingNumber,
  onAnswerChange,
  answers,
  submitted 
}) => {
  const { passage, questions = [] } = section;
  const sanitizedPassage = sanitizePassageHtml(passage);

  return (
    <div style={styles.container}>
      {/* Passage */}
      {sanitizedPassage && (
        <div style={styles.passageContainer}>
          <div 
            className="long-text-mc-passage"
            style={styles.passageContent}
            dangerouslySetInnerHTML={{ __html: sanitizedPassage }}
          />
        </div>
      )}

      {/* Multiple Choice Questions */}
      <div style={styles.questionsContainer}>
        {questions.map((question, idx) => {
          const questionNumber = startingNumber + idx;
          const questionKey = `${section.id}-${idx}`;
          const userAnswer = answers[questionKey];
          const { questionText, options = [], correctAnswer, answerType } = question;
          const isTrueFalse = answerType === 'true-false';
          const normalizedUserAnswer = normalizeAnswer(userAnswer);
          const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
          const answerOptions = isTrueFalse
            ? [
              { label: 'T', text: 'True' },
              { label: 'F', text: 'False' },
            ]
            : options.map((option, optionIndex) => ({
              label: String.fromCharCode(65 + optionIndex),
              text: option,
            }));
          const resultStatus = !submitted || !isTrueFalse
            ? null
            : !normalizedUserAnswer
              ? 'Blank'
              : normalizedUserAnswer === normalizedCorrectAnswer
                ? 'Correct'
                : 'Wrong';
          const startsGatewayGroup =
            section.gatewayReadingMode &&
            (idx === 0 || question.answerType !== questions[idx - 1]?.answerType);
          const endsGatewayGroup =
            section.gatewayReadingMode &&
            (idx === questions.length - 1 || question.answerType !== questions[idx + 1]?.answerType);
          const instruction = isTrueFalse
            ? section.readingBInstruction
            : section.readingAInstruction;
          const scoreNote = isTrueFalse
            ? section.readingBScoreNote
            : section.readingAScoreNote;

          return (
            <React.Fragment key={idx}>
              {startsGatewayGroup && instruction && (
                <div style={styles.gatewayInstruction}>{instruction}</div>
              )}
              <div
                role="group"
                aria-label={`Question ${questionNumber}`}
                style={styles.questionCard}
              >
              {/* Question Header */}
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.questionText}>{questionText}</div>
                {resultStatus && (
                  <span
                    style={{
                      ...styles.resultStatus,
                      ...(resultStatus === 'Correct'
                        ? styles.resultStatusCorrect
                        : resultStatus === 'Wrong'
                          ? styles.resultStatusWrong
                          : styles.resultStatusBlank),
                    }}
                  >
                    {resultStatus}
                  </span>
                )}
              </div>

              {/* Options */}
              <div style={styles.optionsContainer}>
                {answerOptions.map((option) => {
                  const optionLabel = option.label;
                  const isSelected = normalizedUserAnswer === optionLabel;
                  const isCorrect = submitted && normalizedCorrectAnswer === optionLabel;
                  const isWrong = submitted && isSelected && normalizedUserAnswer !== normalizedCorrectAnswer;

                  return (
                    <label
                      key={optionLabel}
                      style={{
                        ...styles.optionLabel,
                        ...(isSelected && styles.optionSelected),
                        ...(isCorrect && styles.optionCorrect),
                        ...(isWrong && styles.optionWrong),
                      }}
                    >
                      <input
                        type="radio"
                        name={questionKey}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => onAnswerChange(questionKey, optionLabel)}
                        disabled={submitted}
                        style={styles.radioInput}
                      />
                      {!isTrueFalse && <span style={styles.optionLetter}>{optionLabel}</span>}
                      <span style={styles.optionText}>
                        {isTrueFalse ? `${optionLabel} (${option.text})` : option.text}
                      </span>
                    </label>
                  );
                })}
              </div>

              {submitted && isTrueFalse && (
                <div style={styles.trueFalseResult}>
                  <div>
                    Student answer: <strong>{normalizedUserAnswer || '(No answer)'}</strong>
                  </div>
                  <div>
                    Correct answer: <strong>{normalizedCorrectAnswer || '(Not available)'}</strong>
                  </div>
                </div>
              )}

              {/* Correct Answer Display (after submission) */}
              {submitted && !isTrueFalse && correctAnswer && normalizedUserAnswer !== normalizedCorrectAnswer && (
                <div style={styles.correctAnswerBox}>
                  Correct answer: <strong>{correctAnswer}</strong>
                </div>
              )}
              </div>
              {endsGatewayGroup && scoreNote && (
                <div style={styles.gatewayScoreNote}>{scoreNote}</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    marginBottom: '24px',
  },
  passageContainer: {
    padding: '20px',
    backgroundColor: '#fffbeb',
    border: '2px solid #fcd34d',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  passageContent: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#1f2937',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  gatewayInstruction: {
    marginBottom: '-8px',
    color: '#1f2937',
    fontSize: '15px',
    fontWeight: 600,
  },
  gatewayScoreNote: {
    marginTop: '-12px',
    marginBottom: '4px',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'right',
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
  },
  questionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.6,
    color: '#1f2937',
  },
  resultStatus: {
    flexShrink: 0,
    padding: '4px 9px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  resultStatusCorrect: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  resultStatusWrong: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  resultStatusBlank: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  trueFalseResult: {
    display: 'grid',
    gap: '6px',
    marginTop: '14px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '14px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#fafafa',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  optionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
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
  },
  optionLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    fontSize: '14px',
    lineHeight: 1.5,
  },
  correctAnswerBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
};

export default LongTextMCDisplay;
