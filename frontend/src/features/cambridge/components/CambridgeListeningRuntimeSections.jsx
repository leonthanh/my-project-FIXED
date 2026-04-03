import React, { useEffect, useRef, useState } from 'react';

const IT_ACCENT = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];

export function ImageTickSlideSection({
  questions,
  exampleItem,
  secIdx,
  sectionStartNum,
  answers,
  submitted,
  results,
  isDarkMode,
  handleAnswerChange,
  currentPartIndex,
  questionRefs,
  resolveImgSrc,
  activeQuestion,
  onSlideChange,
}) {
  const hasExample = !!(exampleItem && exampleItem.questionText);
  const [slide, setSlide] = useState(0);

  const jumpToSlide = (questionIndex) => {
    setSlide(questionIndex);
  };

  useEffect(() => {
    if (!activeQuestion) return;
    const parts = String(activeQuestion).split('-');
    const questionIndex = parseInt(parts[2], 10);
    if (!Number.isNaN(questionIndex)) setSlide(questionIndex);
  }, [activeQuestion]);

  const goTo = (questionIndex) => {
    setSlide(questionIndex);
    onSlideChange?.(questionIndex);
  };

  const canPrev = slide > 0;
  const canNext = slide < questions.length - 1;

  const renderRow = (question, questionKey, isExample, accent) => {
    const userAnswer = isExample ? (question.correctAnswer || '') : (answers[questionKey] || '');
    const imageOptions = Array.isArray(question.imageOptions) ? question.imageOptions : [{}, {}, {}];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '16px' }}>
        {['A', 'B', 'C'].map((letter, idx) => {
          const option = imageOptions[idx] || {};
          const isSelected = userAnswer === letter;
          const isCorrectOption = submitted && question.correctAnswer === letter;
          const imgSrc = option.imageUrl ? resolveImgSrc(option.imageUrl) : '';

          const boxBorder = isExample
            ? (isDarkMode ? '#475569' : '#94a3b8')
            : submitted
              ? (isCorrectOption ? '#22c55e' : isSelected ? '#ef4444' : isDarkMode ? '#334155' : '#d1d5db')
              : isSelected ? accent : isDarkMode ? '#334155' : '#d1d5db';

          const checkBg = submitted
            ? (isCorrectOption ? '#22c55e' : isSelected && !isCorrectOption ? '#ef4444' : 'transparent')
            : isSelected ? accent : 'transparent';
          const checkBorder = submitted
            ? (isCorrectOption ? '#22c55e' : isSelected ? '#ef4444' : isDarkMode ? '#475569' : '#94a3b8')
            : isSelected ? accent : isDarkMode ? '#475569' : '#94a3b8';

          return (
            <div
              key={letter}
              onClick={() => {
                if (!isExample && !submitted) handleAnswerChange(questionKey, isSelected ? '' : letter);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', cursor: isExample || submitted ? 'default' : 'pointer' }}
            >
              <div
                className={`it-img-box${isSelected && !isExample ? ' it-selected' : ''}`}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  border: `3px solid ${boxBorder}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: isDarkMode ? '#1e293b' : '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected && !isExample ? `0 4px 16px ${accent}55` : submitted && isCorrectOption ? '0 4px 16px #22c55e55' : '0 2px 6px rgba(0,0,0,0.08)',
                  transform: isSelected && !isExample ? 'scale(1.04)' : 'scale(1)',
                  transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  position: 'relative',
                }}
              >
                {imgSrc ? (
                  <img src={imgSrc} alt={letter} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '28px', color: isDarkMode ? '#475569' : '#cbd5e1' }}>🖼️</span>
                )}
                {submitted && isCorrectOption ? (
                  <div style={{ position: 'absolute', top: '-10px', right: '-8px', fontSize: '22px', animation: 'itStarBurst 0.6s ease forwards', pointerEvents: 'none' }}>⭐</div>
                ) : null}
              </div>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: '15px',
                  width: '28px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: isSelected && !isExample ? accent : submitted && isCorrectOption ? '#22c55e' : isDarkMode ? '#1e293b' : '#f1f5f9',
                  color: isSelected && !isExample || (submitted && isCorrectOption) ? '#fff' : isDarkMode ? '#e2e8f0' : '#1e293b',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {letter}
              </span>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: `2.5px solid ${checkBorder}`,
                  background: checkBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: (isSelected || (submitted && isCorrectOption)) ? 'itCheckPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                  boxShadow: isSelected && !isExample ? `0 0 0 3px ${accent}33` : 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {(isSelected || (submitted && isCorrectOption)) ? <span style={{ color: '#fff', fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>✓</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const questionIndex = slide;
  const question = questions[questionIndex];
  const questionKey = `${currentPartIndex}-${secIdx}-${questionIndex}`;
  const accent = IT_ACCENT[questionIndex % IT_ACCENT.length];
  const isCorrect = submitted && results?.answers?.[questionKey]?.isCorrect;
  const isWrong = submitted && (answers[questionKey] || '') && !isCorrect;

  return (
    <>
      <style>{`
        @keyframes itBounceIn { 0%{opacity:0;transform:translateY(22px) scale(0.93)} 55%{transform:translateY(-5px) scale(1.03)} 80%{transform:translateY(2px) scale(0.99)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes itCheckPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 65%{transform:scale(1.35) rotate(6deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes itStarBurst { 0%{transform:scale(0) rotate(-30deg);opacity:1} 60%{transform:scale(1.4) rotate(15deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:0.9} }
        @keyframes itShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .it-img-box{position:relative;}
        .it-img-box:hover:not(.it-selected){transform:scale(1.06) !important;box-shadow:0 6px 18px rgba(0,0,0,0.13) !important;}
      `}</style>

      {questions.map((_, idx) => {
        const key = `${currentPartIndex}-${secIdx}-${idx}`;
        return (
          <div
            key={`sentinel-${idx}`}
            id={`question-${sectionStartNum + idx}`}
            ref={(element) => {
              questionRefs.current[key] = element;
            }}
            tabIndex={-1}
            onFocus={() => jumpToSlide(idx)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}
          />
        );
      })}

      <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        {hasExample && slide === 0 ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              border: `2px dashed ${isDarkMode ? '#334155' : '#cbd5e1'}`,
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  padding: '2px 12px',
                  borderRadius: '999px',
                  background: isDarkMode ? '#1e293b' : '#e2e8f0',
                  color: isDarkMode ? '#94a3b8' : '#475569',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                🌟 Example
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                {exampleItem.questionText || ''}
              </span>
            </div>
            {renderRow(exampleItem, null, true, '#94a3b8')}
          </div>
        ) : null}

        <div
          style={{
            padding: '20px 20px 24px',
            borderRadius: '18px',
            border: `2.5px solid ${submitted ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isDarkMode ? '#334155' : '#e2e8f0') : accent}`,
            background: isDarkMode ? '#111827' : `${accent}08`,
            boxShadow: `0 0 0 3px ${submitted ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : 'transparent') : accent}20, 0 4px 18px ${accent}15`,
            animation: 'itBounceIn 0.35s ease both',
            ...(isWrong ? { animationName: 'itBounceIn, itShake', animationDuration: '0.35s, 0.4s', animationDelay: '0s, 0.5s', animationFillMode: 'both' } : {}),
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                flexShrink: 0,
                background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : accent,
                color: '#fff',
                fontWeight: 900,
                fontSize: '14px',
                boxShadow: `0 3px 8px ${submitted ? (isCorrect ? '#22c55e55' : '#ef444455') : accent + '55'}`,
              }}
            >
              {submitted ? (isCorrect ? '✓' : '✗') : sectionStartNum + questionIndex}
            </span>
            <span style={{ fontWeight: 700, fontSize: '15px', color: isDarkMode ? '#e2e8f0' : '#0f172a', flex: 1 }}>
              {question?.questionText || ''}
            </span>
            {submitted && !isCorrect ? (
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#22c55e', background: isDarkMode ? '#052e16' : '#f0fdf4', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                ✓ {results?.answers?.[questionKey]?.correctAnswer || question?.correctAnswer || ''}
              </span>
            ) : null}
          </div>
          {renderRow(question, questionKey, false, accent)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => goTo(slide - 1)}
            disabled={!canPrev}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              cursor: canPrev ? 'pointer' : 'not-allowed',
              background: canPrev ? (isDarkMode ? '#334155' : '#e2e8f0') : (isDarkMode ? '#1e293b' : '#f8fafc'),
              color: canPrev ? (isDarkMode ? '#e2e8f0' : '#374151') : (isDarkMode ? '#475569' : '#cbd5e1'),
              fontSize: '18px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: canPrev ? '0 2px 6px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ‹
          </button>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {questions.map((_, idx) => {
              const isActive = idx === slide;
              const dotKey = `${currentPartIndex}-${secIdx}-${idx}`;
              const dotCorrect = submitted && results?.answers?.[dotKey]?.isCorrect;
              const dotWrong = submitted && (answers[dotKey] || '') && !dotCorrect;
              const dotAnswered = !submitted && !!(answers[dotKey] || '');
              const dotAccent = IT_ACCENT[idx % IT_ACCENT.length];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goTo(idx)}
                  style={{
                    width: isActive ? '28px' : '10px',
                    height: '10px',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    background: submitted
                      ? (dotCorrect ? '#22c55e' : dotWrong ? '#ef4444' : isDarkMode ? '#334155' : '#d1d5db')
                      : isActive ? dotAccent : dotAnswered ? `${dotAccent}88` : isDarkMode ? '#334155' : '#d1d5db',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: isActive ? `0 0 0 2px ${dotAccent}44` : 'none',
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goTo(slide + 1)}
            disabled={!canNext}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              cursor: canNext ? 'pointer' : 'not-allowed',
              background: canNext ? (isDarkMode ? '#334155' : '#e2e8f0') : (isDarkMode ? '#1e293b' : '#f8fafc'),
              color: canNext ? (isDarkMode ? '#e2e8f0' : '#374151') : (isDarkMode ? '#475569' : '#cbd5e1'),
              fontSize: '18px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: canNext ? '0 2px 6px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}

const CW_PALETTE = [
  { label: 'yellow', hex: '#eab308' },
  { label: 'blue', hex: '#3b82f6' },
  { label: 'red', hex: '#ef4444' },
  { label: 'orange', hex: '#f97316' },
  { label: 'purple', hex: '#a855f7' },
  { label: 'pink', hex: '#ec4899' },
  { label: 'green', hex: '#22c55e' },
  { label: 'brown', hex: '#92400e' },
  { label: 'black', hex: '#171717' },
  { label: 'grey', hex: '#6b7280' },
  { label: 'white', hex: '#f9fafb', border: '#d1d5db' },
];

export function ColourWriteStudentSection({
  questions,
  exampleItem,
  sceneImageUrl,
  decoyPositions = [],
  secIdx,
  sectionStartNum,
  answers,
  submitted,
  results,
  isDarkMode,
  handleAnswerChange,
  currentPartIndex,
  questionRefs,
}) {
  const [selectedColour, setSelectedColour] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null);
  const [activeColourDecoyIndex, setActiveColourDecoyIndex] = useState(null);
  const [decoyAnswers, setDecoyAnswers] = useState({});
  const writeInputRefs = useRef({});
  const decoyWriteRefs = useRef({});

  const selectQuestion = (questionIndex) => {
    setActiveQuestionIndex(questionIndex);
    setActiveColourDecoyIndex(null);
    const question = questions[questionIndex];
    if (!question || submitted) return;
    if (selectedColour && !selectedColour.erase && (question.taskType || 'colour') === 'colour') {
      handleAnswerChange(`${currentPartIndex}-${secIdx}-${questionIndex}`, selectedColour.label);
    }
    if ((question.taskType || 'colour') === 'write') {
      setTimeout(() => writeInputRefs.current[questionIndex]?.focus(), 80);
    }
  };

  const selectDecoy = (decoyIndex) => {
    setActiveColourDecoyIndex(decoyIndex);
    setActiveQuestionIndex(null);
    if (selectedColour && !selectedColour.erase && !submitted) {
      setDecoyAnswers((prev) => ({ ...prev, [decoyIndex]: selectedColour.label }));
    }
  };

  const pickColour = (colour) => {
    setSelectedColour(colour);
    if (!colour.erase && !submitted) {
      if (activeQuestionIndex !== null && activeQuestionIndex >= 0) {
        const question = questions[activeQuestionIndex];
        if (question && (question.taskType || 'colour') === 'colour') {
          handleAnswerChange(`${currentPartIndex}-${secIdx}-${activeQuestionIndex}`, colour.label);
        }
      } else if (activeColourDecoyIndex !== null) {
        setDecoyAnswers((prev) => ({ ...prev, [activeColourDecoyIndex]: colour.label }));
      }
    }
  };

  const handleImageClick = (event) => {
    if (submitted) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;
    let closest = null;
    let minDistance = Infinity;
    let closestIsDecoy = false;

    questions.forEach((question, questionIndex) => {
      const position = (question.taskType || 'colour') === 'colour' ? question.colorPosition : question.textPosition;
      if (!position) return;
      const distance = Math.sqrt((position.x - clickX) ** 2 + (position.y - clickY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closest = questionIndex;
        closestIsDecoy = false;
      }
    });

    decoyPositions.forEach((position, decoyIndex) => {
      if ((position.type || 'colour') !== 'colour') return;
      const distance = Math.sqrt((position.x - clickX) ** 2 + (position.y - clickY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closest = decoyIndex;
        closestIsDecoy = true;
      }
    });

    if (closest !== null && minDistance < 12) {
      if (closestIsDecoy) selectDecoy(closest);
      else selectQuestion(closest);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      {questions.map((_, questionIndex) => {
        const key = `${currentPartIndex}-${secIdx}-${questionIndex}`;
        return (
          <div
            key={`sentinel-${questionIndex}`}
            id={`question-${sectionStartNum + questionIndex}`}
            ref={(element) => {
              questionRefs.current[key] = element;
            }}
            tabIndex={-1}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}
          />
        );
      })}

      {sceneImageUrl ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div
            style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', userSelect: 'none', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', width: '100%', cursor: submitted ? 'default' : 'pointer' }}
            onClick={handleImageClick}
          >
            <img src={sceneImageUrl} alt="Scene" draggable={false} style={{ width: '100%', display: 'block', userSelect: 'none' }} />

            {exampleItem?.colorPosition ? (() => {
              const position = exampleItem.colorPosition;
              const colour = CW_PALETTE.find((item) => item.label === exampleItem?.correctAnswer);
              return (
                <div
                  title="Vi du"
                  style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: colour?.hex || '#94a3b8',
                    border: '3px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '10px',
                    color: '#fff',
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                >
                  VD
                </div>
              );
            })() : null}

            {questions.map((question, questionIndex) => {
              if ((question.taskType || 'colour') !== 'write' || !question.textPosition) return null;
              const key = `${currentPartIndex}-${secIdx}-${questionIndex}`;
              const userAnswer = answers[key] || '';
              const isQuestionCorrect = submitted && results?.answers?.[key]?.isCorrect;
              const isQuestionActive = questionIndex === activeQuestionIndex;

              return (
                <div key={questionIndex} style={{ position: 'absolute', left: `${question.textPosition.x}%`, top: `${question.textPosition.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                  <input
                    ref={(element) => {
                      writeInputRefs.current[questionIndex] = element;
                    }}
                    type="text"
                    value={userAnswer}
                    onChange={(event) => {
                      if (!submitted) handleAnswerChange(key, event.target.value);
                    }}
                    disabled={submitted}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveQuestionIndex(questionIndex);
                    }}
                    placeholder=""
                    style={{
                      width: '110px',
                      padding: '5px 8px',
                      textAlign: 'center',
                      borderRadius: '7px',
                      fontWeight: 800,
                      fontSize: '14px',
                      outline: 'none',
                      border: submitted ? (isQuestionCorrect ? '2.5px solid #22c55e' : '2.5px solid #ef4444') : isQuestionActive ? '2.5px solid #7c3aed' : '2px solid #1e293b',
                      background: submitted ? (isQuestionCorrect ? 'rgba(240,253,244,0.95)' : 'rgba(254,242,242,0.95)') : 'rgba(255,255,255,0.93)',
                      color: '#1e293b',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                      backdropFilter: 'blur(3px)',
                    }}
                  />
                </div>
              );
            })}

            {decoyPositions.map((position, decoyIndex) => {
              const decoyType = position.type || 'colour';
              if (decoyType === 'write') {
                const writeKey = `w${decoyIndex}`;
                const writeValue = decoyAnswers[writeKey] || '';
                return (
                  <div key={`decoy-${decoyIndex}`} style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                    <input
                      ref={(element) => {
                        decoyWriteRefs.current[decoyIndex] = element;
                      }}
                      type="text"
                      value={writeValue}
                      onChange={(event) => {
                        if (!submitted) setDecoyAnswers((prev) => ({ ...prev, [writeKey]: event.target.value }));
                      }}
                      disabled={submitted}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveQuestionIndex(null);
                        setActiveColourDecoyIndex(null);
                      }}
                      placeholder=""
                      style={{
                        width: '110px',
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderRadius: '7px',
                        fontWeight: 800,
                        fontSize: '14px',
                        outline: 'none',
                        border: submitted ? '2px solid #94a3b8' : '2px solid #1e293b',
                        background: submitted ? 'rgba(241,245,249,0.95)' : 'rgba(255,255,255,0.93)',
                        color: '#1e293b',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                        backdropFilter: 'blur(3px)',
                      }}
                    />
                  </div>
                );
              }

              const decoyAnswer = decoyAnswers[decoyIndex];
              const decoyColour = CW_PALETTE.find((item) => item.label === decoyAnswer);
              const isDecoyActive = activeColourDecoyIndex === decoyIndex;
              const blobSize = decoyAnswer ? 58 : isDecoyActive ? 44 : 20;
              const blobOpacity = decoyAnswer ? 0.85 : isDecoyActive ? 1 : 0.30;

              return (
                <div
                  key={`decoy-${decoyIndex}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!submitted) selectDecoy(decoyIndex);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isDecoyActive ? 20 : decoyAnswer ? 15 : 9,
                    width: `${blobSize}px`,
                    height: `${blobSize}px`,
                    borderRadius: '50%',
                    opacity: blobOpacity,
                    background: decoyColour ? decoyColour.hex : isDecoyActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.12)',
                    border: isDecoyActive ? '2.5px solid #7c3aed' : decoyColour ? '3px solid rgba(255,255,255,0.65)' : '2px dashed rgba(15,23,42,0.45)',
                    boxShadow: isDecoyActive ? '0 0 0 5px rgba(124,58,237,0.25), 0 3px 14px rgba(0,0,0,0.28)' : decoyColour ? `0 2px 14px ${decoyColour.hex}88` : 'none',
                    cursor: submitted ? 'default' : 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              );
            })}

            {questions.map((question, questionIndex) => {
              if ((question.taskType || 'colour') !== 'colour' || !question.colorPosition) return null;
              const key = `${currentPartIndex}-${secIdx}-${questionIndex}`;
              const userAnswer = answers[key] || '';
              const colour = CW_PALETTE.find((item) => item.label === userAnswer);
              const isActive = questionIndex === activeQuestionIndex;
              const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
              const isAnswered = !!colour && !submitted;
              const blobSize = submitted ? 42 : isAnswered ? 58 : isActive ? 44 : 20;
              const blobOpacity = submitted ? 1 : isAnswered ? 0.85 : isActive ? 1 : 0.30;

              return (
                <div
                  key={questionIndex}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!submitted) selectQuestion(questionIndex);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${question.colorPosition.x}%`,
                    top: `${question.colorPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isActive ? 20 : isAnswered ? 15 : 9,
                    width: `${blobSize}px`,
                    height: `${blobSize}px`,
                    borderRadius: '50%',
                    opacity: blobOpacity,
                    background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : colour ? colour.hex : isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.12)',
                    border: submitted ? '3px solid rgba(255,255,255,0.9)' : isActive ? '2.5px solid #7c3aed' : colour ? '3px solid rgba(255,255,255,0.65)' : '2px dashed rgba(15,23,42,0.45)',
                    boxShadow: isActive ? '0 0 0 5px rgba(124,58,237,0.25), 0 3px 14px rgba(0,0,0,0.28)' : colour ? `0 2px 14px ${colour.hex}88` : 'none',
                    cursor: submitted ? 'default' : 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {submitted ? <span style={{ fontSize: '17px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)', lineHeight: 1 }}>{isCorrect ? '✓' : '✗'}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ borderRadius: '16px', background: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '10px 12px 0', flexWrap: 'wrap' }}>
          {exampleItem ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '999px', fontWeight: 800, fontSize: '12px', border: `2px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`, background: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Vi du
              {CW_PALETTE.find((item) => item.label === exampleItem.correctAnswer) ? (
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: CW_PALETTE.find((item) => item.label === exampleItem.correctAnswer).hex, flexShrink: 0 }} />
              ) : null}
            </div>
          ) : null}
          {questions.map((question, questionIndex) => {
            const key = `${currentPartIndex}-${secIdx}-${questionIndex}`;
            const answer = answers[key] || '';
            const isAnswered = !!answer;
            const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
            const colour = (question.taskType || 'colour') !== 'write' ? CW_PALETTE.find((item) => item.label === answer) : null;
            return (
              <div
                key={questionIndex}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: `2px solid ${submitted ? (isCorrect ? '#22c55e' : '#ef4444') : isAnswered ? (isDarkMode ? '#334155' : '#94a3b8') : isDarkMode ? '#334155' : '#e5e7eb'}`,
                  background: submitted ? (isCorrect ? (isDarkMode ? '#052e16' : '#f0fdf4') : (isDarkMode ? '#2d0a0a' : '#fef2f2')) : isAnswered ? (isDarkMode ? '#1e293b' : '#f1f5f9') : (isDarkMode ? '#0f172a' : '#f8fafc'),
                  color: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : isAnswered ? (isDarkMode ? '#94a3b8' : '#475569') : (isDarkMode ? '#475569' : '#cbd5e1'),
                  transition: 'all 0.15s',
                }}
              >
                {submitted ? (isCorrect ? '✓' : '✗') : '●'}
                {colour ? <div style={{ width: 11, height: 11, borderRadius: '50%', background: colour.hex, border: colour.border ? `1px solid ${colour.border}` : 'none', flexShrink: 0 }} /> : null}
                {(question.taskType || 'colour') === 'write' && answer ? <span style={{ fontSize: '10px', maxWidth: '48px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{answer}</span> : null}
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <div style={{ textAlign: 'center', padding: '6px 12px 2px', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#64748b' : '#94a3b8' }}>
            {activeQuestionIndex !== null && activeQuestionIndex >= 0
              ? ((questions[activeQuestionIndex]?.taskType || 'colour') === 'colour' ? 'Chon mau ben duoi' : 'Nhap tu vao o tren hinh')
              : activeColourDecoyIndex !== null
                ? 'Chon mau ben duoi'
                : 'Nghe roi click vao dung doi tuong tren hinh de to mau / viet tu'}
          </div>
        ) : null}

        {!submitted ? (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center', padding: '8px 12px 14px', overflowX: 'auto' }}>
            {CW_PALETTE.map((colour) => {
              const isSelected = selectedColour?.label === colour.label;
              return (
                <button
                  key={colour.label}
                  type="button"
                  title={colour.label}
                  onClick={() => pickColour(colour)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 7px', borderRadius: '10px', outline: isSelected ? `2.5px solid ${isDarkMode ? '#a78bfa' : '#7c3aed'}` : 'none', outlineOffset: '1px' }}
                >
                  <div
                    style={{
                      width: isSelected ? '52px' : '44px',
                      height: isSelected ? '52px' : '44px',
                      borderRadius: '50%',
                      background: colour.hex,
                      flexShrink: 0,
                      border: colour.border ? `2px solid ${colour.border}` : '2px solid rgba(0,0,0,0.08)',
                      boxShadow: isSelected ? `0 0 0 3px ${colour.hex}55, 0 4px 12px ${colour.hex}44` : '0 2px 6px rgba(0,0,0,0.12)',
                      transform: isSelected ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
                      transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: isSelected ? 800 : 500 }}>{colour.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {exampleItem ? (
          <div style={{ margin: '0 12px 12px', padding: '8px 14px', borderRadius: '10px', background: isDarkMode ? '#0f172a' : '#f8fafc', border: `1.5px dashed ${isDarkMode ? '#334155' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 10px', borderRadius: '999px', background: isDarkMode ? '#1e293b' : '#e2e8f0', color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>Vi du</span>
            {exampleItem.questionText ? <span style={{ fontSize: '13px', color: isDarkMode ? '#cbd5e1' : '#374151', flex: 1 }}>{exampleItem.questionText}</span> : null}
            {(() => {
              const colour = CW_PALETTE.find((item) => item.label === exampleItem.correctAnswer);
              if (!colour) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: colour.hex, border: colour.border ? `2px solid ${colour.border}` : '2px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>{colour.label}</span>
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>

      {submitted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {questions.map((question, questionIndex) => {
            const key = `${currentPartIndex}-${secIdx}-${questionIndex}`;
            const userAnswer = answers[key] || '';
            const isCorrect = results?.answers?.[key]?.isCorrect;
            const taskType = question.taskType || 'colour';
            const colour = taskType !== 'write' ? CW_PALETTE.find((item) => item.label === userAnswer) : null;
            return (
              <div key={questionIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderRadius: '10px', background: isCorrect ? (isDarkMode ? '#052e16' : '#f0fdf4') : (isDarkMode ? '#2d0a0a' : '#fef2f2'), border: `1.5px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                <span style={{ fontWeight: 900, fontSize: '16px', color: isCorrect ? '#22c55e' : '#ef4444', width: '20px', flexShrink: 0 }}>{isCorrect ? '✓' : '✗'}</span>
                <span style={{ fontWeight: 800, fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b', flexShrink: 0 }}>Q{sectionStartNum + questionIndex}</span>
                <span style={{ flex: 1, fontSize: '13px', color: isDarkMode ? '#cbd5e1' : '#374151' }}>{question.questionText}</span>
                {colour ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: colour.hex, border: colour.border ? `1.5px solid ${colour.border}` : 'none', flexShrink: 0 }} /> : null}
                {taskType === 'write' && userAnswer ? <span style={{ fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{userAnswer}</span> : null}
                {!isCorrect ? (
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#22c55e', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                    ✓ {results?.answers?.[key]?.correctAnswer || question.correctAnswer || ''}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}