import React from "react";

export const getCambridgeQuestionType = (question) => {
  if (question?.questionType) return question.questionType;
  if (question?.anchors && Object.keys(question.anchors).length > 0) return 'draw-lines';
  if (Array.isArray(question?.leftItems) && question.leftItems.length > 0) return 'matching';
  return 'fill';
};

const isAnswerFilled = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return String(value ?? '').trim() !== '';
};

export const CambridgeQuestionDisplay = ({
  question,
  questionKey,
  questionNum,
  answers,
  submitted,
  results,
  activeQuestion,
  styles,
  handleAnswerChange,
  toggleFlag,
  flaggedQuestions,
  isDarkMode,
  currentPart,
  questionRefs,
  resolveImgSrc,
  DrawLinesComponent,
}) => {
  const qType = getCambridgeQuestionType(question);
  const userAnswer = answers[questionKey];
  const isCorrect = submitted && results?.answers?.[questionKey]?.isCorrect;
  const isActive = activeQuestion === questionKey;
  const isAnswered = isAnswerFilled(userAnswer);
  const wrapperClassName = `cambridge-question-wrapper ${isAnswered ? 'answered' : ''} ${isActive ? 'active-question' : ''}`;

  if (qType === 'fill') {
    return (
      <div
        className={wrapperClassName}
        ref={(el) => {
          questionRefs.current[questionKey] = el;
        }}
      >
        <div style={styles.questionHeader}>
          <span className="cambridge-question-number">{questionNum}</span>
          <div className="cambridge-question-text">{question.questionText}</div>
        </div>
        <input
          type="text"
          value={userAnswer || ''}
          onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
          disabled={submitted}
          placeholder="Nhap dap an..."
          style={{
            ...styles.input,
            ...(submitted
              ? {
                  backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                  borderColor: isCorrect ? '#22c55e' : '#ef4444',
                }
              : null),
          }}
        />
        {submitted && question.correctAnswer && (
          <div style={styles.correctAnswer}>✓ Dap an dung: {question.correctAnswer}</div>
        )}
      </div>
    );
  }

  if (qType === 'abc' || qType === 'abcd') {
    const options = question.options || [];
    return (
      <div
        className={wrapperClassName}
        ref={(el) => {
          questionRefs.current[questionKey] = el;
        }}
      >
        <div style={styles.questionHeader}>
          <span className="cambridge-question-number">{questionNum}</span>
          <div className="cambridge-question-text">{question.questionText}</div>
        </div>
        <div style={styles.optionsContainer}>
          {options.map((opt, idx) => {
            const optionLabel = String.fromCharCode(65 + idx);
            const isSelected = userAnswer === optionLabel;
            const isCorrectOption = submitted && question.correctAnswer === optionLabel;

            return (
              <label
                key={idx}
                style={{
                  ...styles.optionLabel,
                  ...(isSelected && styles.optionSelected),
                  ...(submitted && isCorrectOption && styles.optionCorrect),
                  ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                }}
              >
                <input
                  type="radio"
                  name={questionKey}
                  checked={isSelected}
                  onChange={() => handleAnswerChange(questionKey, optionLabel)}
                  disabled={submitted}
                  style={{ marginRight: '10px' }}
                />
                <span style={styles.optionBadge}>{optionLabel}</span>
                <span style={styles.optionText}>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (qType === 'multiple-choice-pictures') {
    const rawImageOptions = (() => {
      if (Array.isArray(question.imageOptions) && question.imageOptions.length) return question.imageOptions;
      if (Array.isArray(question.options) && question.options.length) return question.options;
      if (Array.isArray(question.images) && question.images.length) return question.images;
      return [];
    })();

    const imageOptions = rawImageOptions.map((opt) => {
      if (!opt) return {};
      if (typeof opt === 'string') return { imageUrl: opt };
      if (typeof opt === 'object') {
        return {
          ...opt,
          imageUrl: opt.imageUrl || opt.image || opt.url || opt.src || opt.path,
          label: opt.label || opt.text || opt.caption || opt.title,
        };
      }
      return {};
    });

    return (
      <div
        className={wrapperClassName}
        style={styles.pictureQuestionCard}
        ref={(el) => {
          questionRefs.current[questionKey] = el;
        }}
      >
        <div style={styles.pictureQuestionHeader}>
          <div
            style={{
              ...styles.questionHeader,
              padding: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 0,
            }}
          >
            <span className="cambridge-question-number">{questionNum}</span>
            <div className="cambridge-question-text">{question.questionText}</div>
          </div>

          <button
            type="button"
            aria-label={`Flag question ${questionNum}`}
            onClick={() => toggleFlag(questionKey)}
            style={{
              ...styles.flagButton,
              ...(flaggedQuestions.has(questionKey) ? styles.flagButtonActive : null),
            }}
          >
            {flaggedQuestions.has(questionKey) ? '⚑' : '⚐'}
          </button>
        </div>

        <div style={styles.pictureChoicesRow} role="radiogroup" aria-label={`Question ${questionNum}`}>
          {[0, 1, 2].map((idx) => {
            const optionLabel = String.fromCharCode(65 + idx);
            const opt = imageOptions[idx] || {};
            const isSelected = userAnswer === optionLabel;
            const isCorrectOption = submitted && question.correctAnswer === optionLabel;
            const imgSrc = opt.imageUrl ? resolveImgSrc(opt.imageUrl) : '';

            return (
              <div key={idx} style={styles.pictureChoiceItem}>
                <label
                  style={{
                    ...styles.pictureChoiceLabelWrap,
                    ...(isSelected ? styles.pictureChoiceSelected : null),
                    ...(submitted && isCorrectOption ? styles.pictureChoiceCorrect : null),
                    ...(submitted && isSelected && !isCorrectOption ? styles.pictureChoiceWrong : null),
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: styles.pictureChoiceImagePlaceholder.width,
                      height: styles.pictureChoiceImagePlaceholder.height,
                      overflow: 'hidden',
                      borderRadius: '10px',
                      border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`,
                      background: isDarkMode ? '#1f2b47' : '#f8fafc',
                    }}
                  >
                    <div style={{ ...styles.pictureChoiceImagePlaceholder, width: '100%', height: '100%' }}>
                      {imgSrc ? 'Loading...' : `No image (${optionLabel})`}
                    </div>

                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt=""
                        style={{
                          ...styles.pictureChoiceImage,
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          background: '#ffffff',
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el?.dataset?.fallbackTried !== '1') {
                            const current = String(el.currentSrc || el.src || '');
                            const swapped = current.includes('/uploads/')
                              ? current.replace('/uploads/', '/upload/')
                              : current.includes('/upload/')
                                ? current.replace('/upload/', '/uploads/')
                                : '';
                            if (swapped && swapped !== current) {
                              el.dataset.fallbackTried = '1';
                              el.src = swapped;
                              return;
                            }
                          }
                          el.style.display = 'none';
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '10px',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: '#0e276f',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                      }}
                    >
                      {optionLabel}
                    </div>
                  </div>

                  <input
                    type="radio"
                    name={questionKey}
                    value={optionLabel}
                    checked={isSelected}
                    onChange={() => handleAnswerChange(questionKey, optionLabel)}
                    disabled={submitted}
                    style={styles.pictureChoiceRadio}
                    aria-label={`Option ${optionLabel}`}
                  />

                  {opt.label ? (
                    <div style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#475569', textAlign: 'center' }}>
                      {opt.label}
                    </div>
                  ) : null}
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (qType === 'draw-lines' || qType === 'matching') {
    const leftItems = question.leftItems || [];
    const rightItems = question.rightItems || [];

    if (question.questionType === 'draw-lines' || (question.anchors && Object.keys(question.anchors).length > 0)) {
      const DrawLinesRenderer = DrawLinesComponent;
      return (
        <DrawLinesRenderer
          question={question}
          questionKey={questionKey}
          questionNum={questionNum}
          leftItems={leftItems}
          anchors={question.anchors || {}}
          partImageUrl={currentPart?.imageUrl || ''}
          answers={answers}
          submitted={submitted}
          results={results}
          isDarkMode={isDarkMode}
          wrapperClassName={wrapperClassName}
          handleAnswerChange={handleAnswerChange}
          questionRefs={questionRefs}
          activeQuestion={activeQuestion}
          resolveImgSrc={resolveImgSrc}
        />
      );
    }

    return (
      <div
        className={wrapperClassName}
        ref={(el) => {
          questionRefs.current[questionKey] = el;
        }}
      >
        <div style={styles.questionHeader}>
          <span className="cambridge-question-number">{questionNum}</span>
          <div className="cambridge-question-text">{question.questionText || 'Match the items'}</div>
        </div>
        <div style={styles.matchingContainer}>
          {leftItems.map((item, idx) => (
            <div key={idx} style={styles.matchingRow}>
              <span style={styles.matchingItem}>{idx + 1}. {item}</span>
              <select
                value={answers[`${questionKey}-${idx}`] || ''}
                onChange={(e) => handleAnswerChange(`${questionKey}-${idx}`, e.target.value)}
                disabled={submitted}
                style={styles.matchingSelect}
              >
                <option value="">-- Chon --</option>
                {rightItems.map((right, rIdx) => (
                  <option key={rIdx} value={String.fromCharCode(65 + rIdx)}>
                    {String.fromCharCode(65 + rIdx)}. {right}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div style={styles.rightItemsRef}>
          <strong>Options:</strong>
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {rightItems.map((item, idx) => (
              <span key={idx} style={styles.rightItemBadge}>
                {String.fromCharCode(65 + idx)}. {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={wrapperClassName}
      ref={(el) => {
        questionRefs.current[questionKey] = el;
      }}
    >
      <div style={styles.questionHeader}>
        <span className="cambridge-question-number">{questionNum}</span>
        <div className="cambridge-question-text">{question.questionText}</div>
      </div>
      <input
        type="text"
        value={userAnswer || ''}
        onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
        disabled={submitted}
        placeholder="Nhap dap an..."
        style={styles.input}
      />
    </div>
  );
};

export const CompactCambridgeQuestionDisplay = ({
  question,
  questionKey,
  questionNum,
  answers,
  submitted,
  results,
  activeQuestion,
  styles,
  handleAnswerChange,
  questionRefs,
  isDarkMode,
}) => {
  const qType = question.questionType || 'fill';
  const userAnswer = answers[questionKey];
  const isCorrect = submitted && results?.answers?.[questionKey]?.isCorrect;
  const isActive = activeQuestion === questionKey;
  const options = Array.isArray(question.options) ? question.options : [];

  return (
    <div
      key={questionKey}
      ref={(el) => {
        questionRefs.current[questionKey] = el;
      }}
      style={{
        padding: '12px 8px',
        borderBottom: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`,
        background: isActive ? (isDarkMode ? '#1f2b47' : '#f8fafc') : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="cambridge-question-number">{questionNum}</span>
        <div style={{ flex: 1 }}>
          <div className="cambridge-question-text" style={{ marginBottom: 8 }}>
            {question.questionText}
          </div>

          {(qType === 'abc' || qType === 'abcd') && (
            <div style={{ display: 'grid', gap: '8px' }}>
              {options.map((opt, idx) => {
                const optionLabel = String.fromCharCode(65 + idx);
                const isSelected = userAnswer === optionLabel;
                const isCorrectOption = submitted && question.correctAnswer === optionLabel;

                return (
                  <label
                    key={idx}
                    style={{
                      ...styles.optionLabel,
                      ...(isSelected && styles.optionSelected),
                      ...(submitted && isCorrectOption && styles.optionCorrect),
                      ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                      marginBottom: 0,
                    }}
                  >
                    <input
                      type="radio"
                      name={questionKey}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(questionKey, optionLabel)}
                      disabled={submitted}
                      style={{ marginRight: '10px' }}
                    />
                    <span style={styles.optionBadge}>{optionLabel}</span>
                    <span style={styles.optionText}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {qType === 'fill' && (
            <input
              type="text"
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
              disabled={submitted}
              placeholder="Nhap dap an..."
              style={{
                ...styles.input,
                ...(submitted
                  ? {
                      backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                      borderColor: isCorrect ? '#22c55e' : '#ef4444',
                    }
                  : null),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
