import React, { useState, useEffect, useRef } from "react";
import LineIcon from "../../../shared/components/LineIcon.jsx";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

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
  allowFlagging = true,
}) => {
  const qType = getCambridgeQuestionType(question);
  const userAnswer = answers[questionKey];
  const isCorrect = submitted && results?.answers?.[questionKey]?.isCorrect;
  const isActive = activeQuestion === questionKey;
  const isAnswered = isAnswerFilled(userAnswer);
  const wrapperClassName = `cambridge-question-wrapper ${isAnswered ? 'answered' : ''} ${isActive ? 'active-question' : ''}`;

  // Ref + focus state for fill inline input
  const fillInputRef = useRef(null);
  const [fillFocused, setFillFocused] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Auto-focus & trigger pulse animation when this question becomes active via nav
  useEffect(() => {
    if (isActive && qType === 'fill' && fillInputRef.current && !submitted) {
      const timer = setTimeout(() => {
        fillInputRef.current?.focus({ preventScroll: true });
        setPulseKey((k) => k + 1);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isActive, qType, submitted]);

  if (qType === 'fill') {
    // Palette xoay vòng theo số câu — tạo màu sắc tươi sáng cho trẻ 9-10 tuổi
    const FILL_COLORS = [
      { bg: '#eff6ff', border: '#3b82f6', badge: '#1d4ed8', text: '#1e40af' },
      { bg: '#f0fdf4', border: '#22c55e', badge: '#15803d', text: '#166534' },
      { bg: '#fdf4ff', border: '#a855f7', badge: '#7e22ce', text: '#6b21a8' },
      { bg: '#fff7ed', border: '#f97316', badge: '#c2410c', text: '#9a3412' },
      { bg: '#fef2f2', border: '#ef4444', badge: '#b91c1c', text: '#991b1b' },
    ];
    const palette = FILL_COLORS[(questionNum - 1) % FILL_COLORS.length];
    const inputBorder = submitted
      ? isCorrect ? '#22c55e' : '#ef4444'
      : palette.border;
    const inputBg = submitted
      ? isCorrect ? '#dcfce7' : '#fee2e2'
      : (isDarkMode ? '#1f2b47' : '#ffffff');
    // Hiển thị đáp án đúng sau nộp bài (lấy phần đầu nếu có nhiều đáp án phân cách /)
    const rawCorrect = String(question.correctAnswer || '');
    const displayCorrect = rawCorrect.split('/').map(s => s.trim()).filter(Boolean).join(' hoặc ');

    return (
      <>
      <style>{`
        @keyframes fillCardPulse {
          0%   { box-shadow: 0 0 0 0px ${palette.border}60; }
          40%  { box-shadow: 0 0 0 6px ${palette.border}35; }
          100% { box-shadow: 0 0 0 3px ${palette.border}20; }
        }
        @keyframes fillInputGlow {
          0%   { filter: brightness(1); }
          50%  { filter: brightness(1.08); }
          100% { filter: brightness(1); }
        }
      `}</style>
      <div
        className={wrapperClassName}
        ref={(el) => { questionRefs.current[questionKey] = el; }}
        style={{
          background: isDarkMode ? '#111827' : palette.bg,
          border: `2px solid ${fillFocused ? palette.border : inputBorder}`,
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '12px',
          transition: 'border-color 0.2s, box-shadow 0.3s',
          boxShadow: fillFocused
            ? `0 0 0 4px ${palette.border}45, 0 4px 14px ${palette.border}25`
            : isActive
              ? `0 0 0 3px ${palette.border}30`
              : 'none',
          animation: pulseKey > 0 ? `fillCardPulse 0.55s ease` : 'none',
          animationPlayState: 'running',
        }}
      >
        {/* Header: số câu + nội dung với input inline tại vị trí ___ */}
        {(() => {
          const qText = question.questionText || '';
          const parts = qText.split(/_{2,}/);
          const hasBlank = parts.length > 1;
          const inlineInput = (
            <input
              key={questionKey}
              ref={fillInputRef}
              id={`question-${questionNum}`}
              type="text"
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
              onFocus={() => setFillFocused(true)}
              onBlur={() => setFillFocused(false)}
              disabled={submitted}
              placeholder="viết đáp án vào đây"
              style={{
                display: 'inline-block',
                width: Math.max(220, (userAnswer || '').length * 14 + 80) + 'px',
                padding: '4px 12px 5px',
                border: 'none',
                borderBottom: `3px solid ${fillFocused ? palette.border : inputBorder}`,
                borderRadius: '8px 8px 0 0',
                fontSize: '20px', fontWeight: 700,
                background: isDarkMode
                  ? (submitted ? inputBg : (fillFocused ? '#253459' : '#1f2b47'))
                  : (fillFocused ? `${palette.bg}` : inputBg),
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                outline: 'none',
                textAlign: 'center',
                verticalAlign: 'middle',
                minWidth: '100px',
                cursor: submitted ? 'default' : 'text',
                transition: 'border-color 0.2s, background 0.2s, width 0.15s, box-shadow 0.2s',
                boxShadow: fillFocused ? `0 3px 0 0 ${palette.border}` : 'none',
                animation: pulseKey > 0 ? `fillInputGlow 0.55s ease` : 'none',
              }}
            />
          );
          return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '36px', height: '36px', borderRadius: '50%',
                background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : palette.badge,
                color: '#fff', fontWeight: 800, fontSize: '16px', flexShrink: 0,
                boxShadow: `0 2px 6px ${palette.badge}55`,
                marginTop: '4px',
              }}>
                {submitted ? <InlineIcon name={isCorrect ? 'correct' : 'wrong'} size={18} style={{ color: '#fff' }} /> : questionNum}
              </span>
              <div style={{
                fontSize: '20px', lineHeight: 1.8, fontWeight: 600,
                color: isDarkMode ? '#e2e8f0' : '#1e293b', paddingTop: '2px', flex: 1,
              }}>
                {hasBlank ? (
                  parts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && inlineInput}
                    </span>
                  ))
                ) : (
                  <>
                    {qText}
                    {' '}
                    {inlineInput}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Feedback sau nộp bài */}
        {submitted && (
          <div style={{
            marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
            background: isCorrect ? '#dcfce7' : '#fee2e2',
            border: `1.5px solid ${isCorrect ? '#86efac' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <InlineIcon
              name={isCorrect ? 'correct' : 'review'}
              size={20}
              style={{ color: isCorrect ? '#15803d' : '#b91c1c' }}
            />
            <div>
              {isCorrect ? (
                <span style={{ color: '#15803d', fontWeight: 700, fontSize: '16px' }}>Correct! Đúng rồi!</span>
              ) : (
                <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '16px' }}>
                  Đáp án: <em>{displayCorrect || '—'}</em>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      </>
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

          {allowFlagging ? (
            <button
              type="button"
              aria-label={`Flag question ${questionNum}`}
              onClick={() => toggleFlag(questionKey)}
              style={{
                ...styles.flagButton,
                ...(flaggedQuestions.has(questionKey) ? styles.flagButtonActive : null),
              }}
            >
              <InlineIcon name="flag" size={14} />
            </button>
          ) : null}
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
