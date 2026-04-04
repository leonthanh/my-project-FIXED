import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const IT_ACCENT = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];
const DRAW_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const ANCHOR_NEUTRAL = '#94a3b8';
const DRAWLINE_SNAP_RADIUS_PX = 22;
const DRAWLINE_ANCHOR_HIT_AREA_PX = 34;

export function DrawLinesQuestion({
  question,
  questionKey,
  questionNum,
  leftItems,
  anchors,
  partImageUrl,
  answers,
  submitted,
  results,
  isDarkMode,
  wrapperClassName,
  handleAnswerChange,
  questionRefs,
  activeQuestion,
  resolveImgSrc,
}) {
  const [selectedNameIdx, setSelectedNameIdx] = useState(null);
  const [lines, setLines] = useState([]);
  const [selectedAnchorByName, setSelectedAnchorByName] = useState({});
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pillRefs = useRef({});

  const resolveImg = (url) => {
    if (!url) return '';
    if (resolveImgSrc) return resolveImgSrc(url);
    return url;
  };

  const getStudentAnswer = useCallback(
    (nameIdx) => answers[`${questionKey}-${nameIdx}`] || '',
    [answers, questionKey]
  );

  const anchorLetterByIdx = useMemo(() => {
    const rawAnswers = question.answers && typeof question.answers === 'object' ? question.answers : {};
    const next = {};
    Object.entries(rawAnswers).forEach(([idxStr, letter]) => {
      if (!letter) return;
      next[String(idxStr)] = String(letter).trim();
    });
    return next;
  }, [question.answers]);

  const anchorIndexesByLetter = useMemo(() => {
    const next = {};
    Object.entries(anchorLetterByIdx).forEach(([idxStr, letter]) => {
      if (idxStr === '0') return;
      if (!next[letter]) next[letter] = [];
      next[letter].push(idxStr);
    });
    return next;
  }, [anchorLetterByIdx]);

  const derivedAnchorByName = useMemo(() => {
    const next = {};
    leftItems.forEach((_name, nameIdx) => {
      if (nameIdx === 0) return;
      const studentAnswer = answers[`${questionKey}-${nameIdx}`];
      if (!studentAnswer) return;
      const candidates = anchorIndexesByLetter[studentAnswer] || [];
      if (candidates.length === 1) {
        next[String(nameIdx)] = candidates[0];
      } else if (candidates.includes(String(nameIdx))) {
        next[String(nameIdx)] = String(nameIdx);
      }
    });
    return next;
  }, [anchorIndexesByLetter, answers, leftItems, questionKey]);

  const effectiveAnchorByName = useMemo(
    () => ({ ...derivedAnchorByName, ...selectedAnchorByName }),
    [derivedAnchorByName, selectedAnchorByName]
  );

  const anchorUsedByName = useMemo(() => {
    const next = {};
    Object.entries(effectiveAnchorByName).forEach(([nameIdxStr, anchorIdxStr]) => {
      if (!anchorIdxStr) return;
      next[String(anchorIdxStr)] = parseInt(nameIdxStr, 10);
    });
    return next;
  }, [effectiveAnchorByName]);

  const setDrawLineAnswer = useCallback(
    (nameIdx, anchorIdxStr) => {
      const answerKey = `${questionKey}-${nameIdx}`;
      if (!anchorIdxStr) {
        handleAnswerChange(answerKey, '');
        setSelectedAnchorByName((prev) => {
          const nameKey = String(nameIdx);
          if (!Object.prototype.hasOwnProperty.call(prev, nameKey)) return prev;
          const next = { ...prev };
          delete next[nameKey];
          return next;
        });
        return;
      }

      const chosenLetter = anchorLetterByIdx[String(anchorIdxStr)];
      if (!chosenLetter) return;
      handleAnswerChange(answerKey, chosenLetter);
      setSelectedAnchorByName((prev) => ({
        ...prev,
        [String(nameIdx)]: String(anchorIdxStr),
      }));
    },
    [anchorLetterByIdx, handleAnswerChange, questionKey]
  );

  useEffect(() => {
    setSelectedAnchorByName((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(prev).forEach(([nameIdxStr, anchorIdxStr]) => {
        const studentAnswer = answers[`${questionKey}-${nameIdxStr}`];
        const mappedLetter = anchorLetterByIdx[String(anchorIdxStr)];
        if (!studentAnswer || studentAnswer !== mappedLetter) {
          delete next[nameIdxStr];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [answers, anchorLetterByIdx, questionKey]);

  useEffect(() => {
    if (!activeQuestion || submitted) return;
    const prefix = `${questionKey}-`;
    if (!activeQuestion.startsWith(prefix)) return;
    const nameIdx = parseInt(activeQuestion.slice(prefix.length), 10);
    if (!Number.isNaN(nameIdx) && nameIdx > 0) {
      setSelectedNameIdx(nameIdx);
    }
  }, [activeQuestion, questionKey, submitted]);

  const recomputeLines = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imgRef.current.getBoundingClientRect();
    const newLines = [];

    leftItems.forEach((name, idx) => {
      if (!name) return;
      const pill = pillRefs.current[idx];
      if (!pill) return;

      if (idx === 0) {
        const exampleAnchor = anchors['0'];
        if (!exampleAnchor) return;
        const pillRect = pill.getBoundingClientRect();
        newLines.push({
          x1: pillRect.left + pillRect.width / 2 - containerRect.left,
          y1: pillRect.top + pillRect.height / 2 - containerRect.top,
          x2: imageRect.left - containerRect.left + (exampleAnchor.x / 100) * imageRect.width,
          y2: imageRect.top - containerRect.top + (exampleAnchor.y / 100) * imageRect.height,
          color: '#9ca3af',
          nameIdx: 0,
          isExample: true,
        });
        return;
      }

      const studentAnswer = answers[`${questionKey}-${idx}`];
      if (!studentAnswer) return;
      const mappedAnchorIdx = effectiveAnchorByName[String(idx)];
      const fallbackCandidates = anchorIndexesByLetter[studentAnswer] || [];
      const fallbackAnchorIdx = fallbackCandidates.length === 1 ? fallbackCandidates[0] : undefined;
      const anchorIdxStr = mappedAnchorIdx || fallbackAnchorIdx;
      const anchor = anchorIdxStr !== undefined ? anchors[anchorIdxStr] : null;
      if (!anchor) return;
      const pillRect = pill.getBoundingClientRect();
      newLines.push({
        x1: pillRect.left + pillRect.width / 2 - containerRect.left,
        y1: pillRect.top + pillRect.height / 2 - containerRect.top,
        x2: imageRect.left - containerRect.left + (anchor.x / 100) * imageRect.width,
        y2: imageRect.top - containerRect.top + (anchor.y / 100) * imageRect.height,
        color: DRAW_COLORS[idx % DRAW_COLORS.length],
        nameIdx: idx,
      });
    });

    setLines(newLines);
  }, [anchorIndexesByLetter, answers, anchors, effectiveAnchorByName, leftItems, questionKey]);

  useEffect(() => {
    const id = requestAnimationFrame(recomputeLines);
    return () => cancelAnimationFrame(id);
  }, [recomputeLines]);

  useEffect(() => {
    window.addEventListener('resize', recomputeLines);
    return () => window.removeEventListener('resize', recomputeLines);
  }, [recomputeLines]);

  const handleImageClick = (event) => {
    if (selectedNameIdx === null || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const validAnswers = question.answers || {};
    const clampedClientX = Math.min(Math.max(event.clientX, rect.left), rect.right);
    const clampedClientY = Math.min(Math.max(event.clientY, rect.top), rect.bottom);
    const clickX = clampedClientX - rect.left;
    const clickY = clampedClientY - rect.top;
    let best = null;
    let bestDist = Infinity;

    Object.entries(anchors).forEach(([idxStr, pos]) => {
      const idx = parseInt(idxStr, 10);
      if (idx === 0) return;
      if (!validAnswers[idxStr]) return;
      const anchorX = (pos.x / 100) * rect.width;
      const anchorY = (pos.y / 100) * rect.height;
      const dx = clickX - anchorX;
      const dy = clickY - anchorY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < bestDist) {
        bestDist = distance;
        best = idxStr;
      }
    });

    if (!best || bestDist > DRAWLINE_SNAP_RADIUS_PX) return;
    const chosenLetter = validAnswers[best];
    if (!chosenLetter) return;
    setDrawLineAnswer(selectedNameIdx, best);
    setSelectedNameIdx(null);
  };

  const handleAnchorClick = (event, idxStr) => {
    event.stopPropagation();
    if (selectedNameIdx === null || submitted) return;
    const idx = parseInt(idxStr, 10);
    if (idx === 0) return;
    const chosenLetter = anchorLetterByIdx[idxStr];
    if (!chosenLetter) return;
    setDrawLineAnswer(selectedNameIdx, idxStr);
    setSelectedNameIdx(null);
  };

  return (
    <div
      ref={containerRef}
      className={wrapperClassName}
      style={{ padding: '12px 16px', width: 'fit-content', maxWidth: '100%', position: 'relative', margin: '0 auto' }}
    >
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          {lines.map((line) => (
            <marker key={`m-${line.nameIdx}`} id={`arrow-${questionKey}-${line.nameIdx}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" fill={line.color} />
            </marker>
          ))}
        </defs>
        {lines.map((line) => {
          const lineIsCorrect = submitted && results?.answers?.[`${questionKey}-${line.nameIdx}`]?.isCorrect;
          const lineColor = line.isExample ? '#9ca3af' : submitted ? (lineIsCorrect ? '#22c55e' : '#ef4444') : line.color;
          return (
            <line
              key={line.nameIdx}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={lineColor}
              strokeWidth={line.isExample ? 2 : 3}
              strokeDasharray={line.isExample ? '6 4' : '10 5'}
              strokeLinecap="round"
              opacity={line.isExample ? 0.6 : 0.92}
              markerEnd={`url(#arrow-${questionKey}-${line.nameIdx})`}
            />
          );
        })}
      </svg>

      <div style={{ marginBottom: '12px' }}>
        <div className="cambridge-question-text">{question.questionText || 'Look at the picture. Listen and draw lines.'}</div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '150px', maxWidth: '220px', flexShrink: 0 }}>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '13px',
              fontWeight: 700,
              color: selectedNameIdx !== null ? DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length] : isDarkMode ? '#94a3b8' : '#374151',
            }}
          >
            {selectedNameIdx !== null ? `⚡ "${leftItems[selectedNameIdx]}" — click nhan vat` : 'Click ten -> click nhan vat'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leftItems.map((name, idx) => {
              if (!name) return null;
              const isExample = idx === 0;
              const studentAns = getStudentAnswer(idx);
              const isCorrect = submitted && results?.answers?.[`${questionKey}-${idx}`]?.isCorrect;
              const isWrong = submitted && studentAns && !isCorrect;
              const isSelected = selectedNameIdx === idx;
              const color = DRAW_COLORS[idx % DRAW_COLORS.length];

              let bg;
              let border;
              let textColor;
              if (submitted) {
                bg = isCorrect ? '#dcfce7' : studentAns ? '#fee2e2' : isDarkMode ? '#374151' : '#f3f4f6';
                border = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#9ca3af';
                textColor = isCorrect ? '#15803d' : isWrong ? '#dc2626' : isDarkMode ? '#d1d5db' : '#374151';
              } else if (isExample) {
                bg = isDarkMode ? '#374151' : '#f1f5f9';
                border = '#9ca3af';
                textColor = isDarkMode ? '#9ca3af' : '#6b7280';
              } else {
                bg = isSelected ? color : studentAns ? `${color}22` : isDarkMode ? '#1e293b' : 'white';
                border = isSelected ? color : studentAns ? color : '#d1d5db';
                textColor = isSelected ? 'white' : isDarkMode ? '#e2e8f0' : '#1e293b';
              }

              return (
                <div
                  key={idx}
                  ref={(element) => {
                    if (element && questionRefs) questionRefs.current[`${questionKey}-${idx}`] = element;
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isExample ? (
                    <span style={{ fontSize: '14px', color: isDarkMode ? '#6b7280' : '#9ca3af', width: '36px', textAlign: 'right', flexShrink: 0 }}>e.g.</span>
                  ) : (
                    <span style={{ fontSize: '15px', fontWeight: 800, color: isDarkMode ? '#94a3b8' : '#6b7280', width: '36px', textAlign: 'right', flexShrink: 0 }}>
                      {questionNum + idx - 1}
                    </span>
                  )}
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) pillRefs.current[idx] = element;
                    }}
                    disabled={submitted || isExample}
                    onClick={() => {
                      if (isExample || submitted) return;
                      setSelectedNameIdx(isSelected ? null : idx);
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '24px',
                      border: `2.5px solid ${border}`,
                      background: bg,
                      color: textColor,
                      fontWeight: 800,
                      fontSize: '20px',
                      cursor: isExample || submitted ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 0 0 4px ${color}40, 0 2px 8px ${color}50` : 'none',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    <span>{name}</span>
                    {isExample ? <span style={{ fontSize: '13px', opacity: 0.6 }}>(example)</span> : null}
                    {submitted && studentAns ? <span style={{ fontSize: '15px' }}>{isCorrect ? '✓' : '✗'}</span> : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {partImageUrl ? (
            <div
              style={{ position: 'relative', display: 'block', width: '100%', maxWidth: '540px', cursor: selectedNameIdx !== null ? 'crosshair' : 'default', overflow: 'visible' }}
              onClick={handleImageClick}
            >
              <img
                ref={imgRef}
                src={resolveImg(partImageUrl)}
                alt="Scene"
                draggable={false}
                style={{
                  width: '100%',
                  maxWidth: '540px',
                  display: 'block',
                  borderRadius: '12px',
                  userSelect: 'none',
                  border: `3px solid ${selectedNameIdx !== null ? DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length] : isDarkMode ? '#334155' : '#e2e8f0'}`,
                  transition: 'border-color 0.2s',
                }}
              />

              {Object.entries(anchors).map(([idxStr, pos]) => {
                const idx = parseInt(idxStr, 10);
                const anchorLetter = anchorLetterByIdx[idxStr];
                const usedByNameIdx = idx === 0 ? 0 : anchorUsedByName[idxStr] ?? -1;
                const hasAnswer = usedByNameIdx >= 0 && (idx === 0 || usedByNameIdx > 0);
                const name = hasAnswer ? leftItems[usedByNameIdx] || '' : '';
                const studentAns = hasAnswer && usedByNameIdx > 0 ? answers[`${questionKey}-${usedByNameIdx}`] : '';
                const personColor = usedByNameIdx >= 0 ? DRAW_COLORS[usedByNameIdx % DRAW_COLORS.length] : ANCHOR_NEUTRAL;
                const anchorColor = hasAnswer ? personColor : ANCHOR_NEUTRAL;
                const isCorrect = submitted && usedByNameIdx > 0 && results?.answers?.[`${questionKey}-${usedByNameIdx}`]?.isCorrect;
                const dotColor = submitted ? (isCorrect ? '#22c55e' : hasAnswer && usedByNameIdx > 0 ? '#ef4444' : ANCHOR_NEUTRAL) : anchorColor;
                const dotSize = hasAnswer ? 20 : 16;
                const isClickableAnchor = !submitted && selectedNameIdx !== null && idx !== 0 && Boolean(anchorLetter);
                const activeDotSize = isClickableAnchor ? Math.max(dotSize, 24) : dotSize;
                const hitAreaSize = Math.max(activeDotSize, DRAWLINE_ANCHOR_HIT_AREA_PX);

                return (
                  <div
                    key={idxStr}
                    style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 6 }}
                  >
                    {!hasAnswer && !submitted ? (
                      <div className="draw-dot-ripple" style={{ width: `${activeDotSize}px`, height: `${activeDotSize}px`, background: anchorColor }} />
                    ) : null}
                    <button
                      type="button"
                      onClick={isClickableAnchor ? (event) => handleAnchorClick(event, idxStr) : undefined}
                      onMouseDown={isClickableAnchor ? (event) => event.stopPropagation() : undefined}
                      onPointerDown={isClickableAnchor ? (event) => event.stopPropagation() : undefined}
                      aria-label={isClickableAnchor ? `Select anchor for ${leftItems[selectedNameIdx] || 'name'}` : undefined}
                      style={{
                        width: `${hitAreaSize}px`,
                        height: `${hitAreaSize}px`,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        pointerEvents: isClickableAnchor ? 'auto' : 'none',
                        cursor: isClickableAnchor ? 'crosshair' : 'default',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: isClickableAnchor ? 20 : 'auto',
                      }}
                    >
                      <div
                        className={!hasAnswer && !submitted ? 'draw-dot-pulse' : ''}
                        style={{
                          width: `${activeDotSize}px`,
                          height: `${activeDotSize}px`,
                          borderRadius: '50%',
                          background: dotColor,
                          border: '3px solid white',
                          boxShadow: `0 2px 10px rgba(0,0,0,0.45), 0 0 0 3px ${anchorColor}55`,
                          transition: 'width 0.2s, height 0.2s, background 0.2s',
                        }}
                      />
                    </button>
                    {submitted && hasAnswer ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${dotSize + 4}px`,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: dotColor,
                          color: 'white',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        {name}: {studentAns}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {selectedNameIdx !== null ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    border: `4px dashed ${DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length]}`,
                    pointerEvents: 'none',
                    zIndex: 4,
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div style={{ padding: '20px', background: isDarkMode ? '#1e293b' : '#f9fafb', borderRadius: '10px', textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#6b7280', fontSize: '13px' }}>
              Anh dang tai...
            </div>
          )}

          {!submitted && leftItems.slice(1).some((name, idx) => name && getStudentAnswer(idx + 1)) ? (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {leftItems.slice(1).map((name, idx) => {
                const nameIdx = idx + 1;
                const answer = getStudentAnswer(nameIdx);
                if (!name || !answer) return null;
                return (
                  <button
                    key={nameIdx}
                    type="button"
                    onClick={() => setDrawLineAnswer(nameIdx, null)}
                    style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '14px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ✕ {name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

export function LetterMatchingStudentSection({
  section,
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
}) {
  const question = section?.questions?.[0];
  if (!question) return null;

  const questionIdx = 0;
  const options = Array.isArray(question.options) ? question.options : [];
  const people = Array.isArray(question.people) ? question.people : [];
  const examplePerson = people[0];
  const questionPeople = people.slice(1).filter((person) => String(person?.name || '').trim());
  const partStart = sectionStartNum;

  const placedLetters = new Set(
    questionPeople
      .map((_, idx) => answers[`${currentPartIndex}-${secIdx}-${questionIdx}-${idx + 1}`])
      .filter(Boolean)
  );

  const handleDragStart = (event, letter) => {
    event.dataTransfer.setData('text/plain', letter);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event, targetKey) => {
    event.preventDefault();
    event.currentTarget.style.borderColor = '';
    event.currentTarget.style.background = '';
    event.currentTarget.style.transform = '';
    if (submitted) return;
    const letter = event.dataTransfer.getData('text/plain');
    if (!letter) return;

    questionPeople.forEach((_, personIdx) => {
      const key = `${currentPartIndex}-${secIdx}-${questionIdx}-${personIdx + 1}`;
      if (answers[key] === letter) handleAnswerChange(key, '');
    });
    handleAnswerChange(targetKey, letter);
  };

  return (
    <div>
      {question.questionText ? (
        <div
          style={{
            fontSize: '13px',
            color: isDarkMode ? '#94a3b8' : '#6b7280',
            fontStyle: 'italic',
            marginBottom: '12px',
            lineHeight: 1.5,
            padding: '8px 12px',
            background: isDarkMode ? '#1e293b' : '#fafafa',
            borderRadius: '9px',
            border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
          }}
        >
          {question.questionText}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          {examplePerson && String(examplePerson.name || '').trim() ? (() => {
            const exampleOption = options.find((option) => option.letter === examplePerson.correctAnswer);
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  marginBottom: '6px',
                  background: isDarkMode ? '#0f172a' : '#f8fafc',
                  border: `2px dashed ${isDarkMode ? '#334155' : '#94a3b8'}`,
                  borderRadius: '11px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isDarkMode ? '#1e293b' : '#e2e8f0',
                    color: isDarkMode ? '#94a3b8' : '#475569',
                    fontWeight: 800,
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  Ex
                </span>
                {examplePerson.photoUrl ? (
                  <img src={resolveImgSrc(examplePerson.photoUrl)} alt="" draggable={false} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                ) : null}
                <span style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: isDarkMode ? '#94a3b8' : '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {examplePerson.name}
                </span>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '9px',
                    border: `3px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDarkMode ? '#1e3a5f' : '#eff6ff',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {exampleOption?.imageUrl ? (
                    <img src={resolveImgSrc(exampleOption.imageUrl)} alt="" draggable={false} style={{ width: '100%', height: '40px', objectFit: 'contain' }} />
                  ) : null}
                  <span style={{ fontWeight: 900, fontSize: '13px', color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>{examplePerson.correctAnswer}</span>
                </div>
                <span style={{ fontSize: '10px', color: isDarkMode ? '#475569' : '#94a3b8', flexShrink: 0 }}>(ex)</span>
              </div>
            );
          })() : null}

          {questionPeople.map((person, idx) => {
            const personIdx = idx + 1;
            const key = `${currentPartIndex}-${secIdx}-${questionIdx}-${personIdx}`;
            const userAnswer = answers[key] || '';
            const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
            const isActive = activeQuestion === key;
            const placedOption = userAnswer ? options.find((option) => option.letter === userAnswer) : null;
            const rowBorder = submitted
              ? (isCorrect ? '#22c55e' : '#ef4444')
              : isActive ? '#7c3aed' : userAnswer ? '#8b5cf6' : isDarkMode ? '#4f46e5' : '#c4b5fd';
            const dropzoneBorder = submitted
              ? (isCorrect ? '#22c55e' : '#ef4444')
              : userAnswer ? '#8b5cf6' : isDarkMode ? '#6d28d9' : '#a78bfa';

            return (
              <div
                key={personIdx}
                id={`question-${partStart + idx}`}
                ref={(element) => {
                  questionRefs.current[key] = element;
                }}
                className={`lm-person-row${isCorrect ? ' lm-correct' : ''}`}
                style={{
                  '--row-delay': `${idx * 80}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  marginBottom: '8px',
                  background: isDarkMode
                    ? (isActive ? '#2d1b69' : submitted ? (isCorrect ? '#14532d22' : '#450a0a22') : '#111827')
                    : (isActive ? '#faf5ff' : submitted ? (isCorrect ? '#f0fdf4' : '#fff1f2') : '#fff'),
                  border: `2.5px solid ${rowBorder}`,
                  borderRadius: '14px',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                  boxShadow: isActive ? `0 0 0 4px ${isDarkMode ? '#7c3aed44' : '#8b5cf640'}, 0 4px 16px rgba(139,92,246,0.18)` : userAnswer && !submitted ? '0 2px 10px rgba(139,92,246,0.15)' : 'none',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : '#7c3aed',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '16px',
                    flexShrink: 0,
                    boxShadow: submitted ? 'none' : '0 2px 8px rgba(124,58,237,0.4)',
                  }}
                >
                  {submitted ? (isCorrect ? '✓' : '✗') : partStart + idx}
                </span>
                {person.photoUrl ? (
                  <img src={resolveImgSrc(person.photoUrl)} alt={person.name} draggable={false} style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                ) : null}
                <span style={{ flex: 1, fontWeight: 800, fontSize: '22px', color: isDarkMode ? '#e2e8f0' : '#1e293b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {person.name}
                </span>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {userAnswer && !submitted ? (
                    <button
                      type="button"
                      title="Bo chon"
                      onClick={() => handleAnswerChange(key, '')}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#fff',
                        border: '2.5px solid white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 900,
                        lineHeight: 1,
                        boxShadow: '0 2px 8px rgba(239,68,68,0.55)',
                        zIndex: 20,
                        padding: 0,
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.transform = 'scale(1.2)';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ✕
                    </button>
                  ) : null}
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!submitted) {
                        event.currentTarget.style.borderColor = '#7c3aed';
                        event.currentTarget.style.background = isDarkMode ? '#2d1b69' : '#ede9fe';
                        event.currentTarget.style.transform = 'scale(1.08)';
                      }
                    }}
                    onDragLeave={(event) => {
                      event.currentTarget.style.borderColor = '';
                      event.currentTarget.style.background = '';
                      event.currentTarget.style.transform = '';
                    }}
                    onDrop={(event) => handleDrop(event, key)}
                    className={!userAnswer && !submitted ? 'lm-dropzone-empty' : ''}
                    style={{
                      width: '90px',
                      minWidth: '90px',
                      height: '90px',
                      border: `3px ${userAnswer ? 'solid' : 'dashed'} ${dropzoneBorder}`,
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      background: userAnswer
                        ? (submitted ? (isCorrect ? (isDarkMode ? '#14532d' : '#dcfce7') : (isDarkMode ? '#450a0a' : '#fee2e2')) : (isDarkMode ? '#2d1b69' : '#f5f3ff'))
                        : (isDarkMode ? '#1e1b4b' : '#faf5ff'),
                      cursor: submitted ? 'default' : 'copy',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                    }}
                  >
                    {userAnswer ? (
                      <>
                        {placedOption?.imageUrl ? (
                          <img src={resolveImgSrc(placedOption.imageUrl)} alt="" draggable={false} style={{ width: '100%', height: '64px', objectFit: 'contain', pointerEvents: 'none' }} />
                        ) : null}
                        <span style={{ fontWeight: 900, fontSize: '17px', color: submitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#7c3aed', lineHeight: 1 }}>
                          {userAnswer}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '28px', color: isDarkMode ? '#6d28d9' : '#c4b5fd', pointerEvents: 'none', lineHeight: 1 }}>?</span>
                    )}
                  </div>
                </div>
                {submitted && !isCorrect ? <span style={{ fontSize: '14px', fontWeight: 900, flexShrink: 0, color: '#22c55e' }}>→ {results?.answers?.[key]?.correctAnswer || ''}</span> : null}
              </div>
            );
          })}
        </div>

        <div style={{ flexShrink: 0, width: '260px' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '14px', fontWeight: 800, color: isDarkMode ? '#a5b4fc' : '#7c3aed' }}>
            Keo hinh vao o ben trai
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {options.map((option, tileIdx) => {
              const isPlaced = placedLetters.has(option.letter);
              return (
                <div
                  key={option.letter}
                  draggable={!submitted}
                  onDragStart={(event) => handleDragStart(event, option.letter)}
                  className={`lm-tile${isPlaced ? '' : ' lm-tile-idle'}`}
                  style={{
                    '--tile-delay': `${tileIdx * 50}ms`,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    border: `3px solid ${isPlaced ? (isDarkMode ? '#312e81' : '#bfdbfe') : isDarkMode ? '#4f46e5' : '#a5b4fc'}`,
                    borderRadius: '14px',
                    background: isPlaced ? (isDarkMode ? '#0f172a' : '#eff6ff') : (isDarkMode ? '#1e1b4b' : '#f5f3ff'),
                    opacity: isPlaced ? 0.38 : 1,
                    cursor: submitted ? 'default' : 'grab',
                    transition: 'opacity 0.25s, border-color 0.2s, transform 0.15s, box-shadow 0.2s',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    boxShadow: isPlaced ? 'none' : `0 3px 10px ${isDarkMode ? 'rgba(99,102,241,0.22)' : 'rgba(139,92,246,0.2)'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      background: isPlaced ? '#64748b' : '#4f46e5',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '18px',
                      boxShadow: isPlaced ? 'none' : '0 2px 5px rgba(79,70,229,0.4)',
                    }}
                  >
                    {option.letter}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {option.imageUrl ? (
                      <img
                        src={resolveImgSrc(option.imageUrl)}
                        alt={option.letter}
                        draggable={false}
                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', pointerEvents: 'none', display: 'block' }}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '100px',
                          width: '100%',
                          borderRadius: '8px',
                          background: isDarkMode ? '#1e1b4b' : '#ede9fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDarkMode ? '#a5b4fc' : '#7c3aed',
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        {option.description || option.letter}
                      </div>
                    )}
                    {option.description && option.imageUrl ? (
                      <div style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '4px', fontWeight: 600, textAlign: 'center', pointerEvents: 'none' }}>
                        {option.description}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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