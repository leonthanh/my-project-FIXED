import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import { computeQuestionStarts, countClozeBlanksFromText, getQuestionCountForSection } from "../utils/questionNumbering";
import { CambridgeQuestionDisplay, CompactCambridgeQuestionDisplay } from "../components/CambridgeQuestionCards";
import { OpenClozeSectionDisplay, GapMatchSectionDisplay } from "../components/CambridgeSectionDisplays";
import createStyles from "./DoCambridgeListeningTest.styles";
import './DoCambridgeReadingTest.css';

// ── Draw-lines interactive component for MOVERS Listening Part 1 ───────────
const DRAW_COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16'];
// Màu trung tính cho anchor dot khi chưa được nối
const ANCHOR_NEUTRAL = '#94a3b8';
const DRAWLINE_SNAP_RADIUS_PX = 22;
const DRAWLINE_ANCHOR_HIT_AREA_PX = 34;

const DrawLinesQuestion = ({
  question, questionKey, questionNum,
  leftItems, rightItems, anchors, partImageUrl,
  answers, submitted, results, isDarkMode, wrapperClassName,
  handleAnswerChange, hostPath: hp,
  questionRefs, activeQuestion,
}) => {
  const [selectedNameIdx, setSelectedNameIdx] = useState(null);
  const [lines, setLines] = useState([]);
  const [selectedAnchorByName, setSelectedAnchorByName] = useState({});
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pillRefs = useRef({});

  const resolveImg = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${hp}${url.startsWith('/') ? '' : '/'}${url}`;
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

  const setDrawLineAnswer = useCallback((nameIdx, anchorIdxStr) => {
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
  }, [anchorLetterByIdx, handleAnswerChange, questionKey]);

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

  // Recompute SVG lines from pill centres → anchor dots
  // When activeQuestion changes to a sub-key of this block, highlight that pill
  useEffect(() => {
    if (!activeQuestion || submitted) return;
    const prefix = `${questionKey}-`;
    if (!activeQuestion.startsWith(prefix)) return;
    const nameIdx = parseInt(activeQuestion.slice(prefix.length), 10);
    if (!isNaN(nameIdx) && nameIdx > 0) {
      setSelectedNameIdx(nameIdx);
    }
  }, [activeQuestion, questionKey, submitted]);

  const recomputeLines = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const iRect = imgRef.current.getBoundingClientRect();
    // Build reverse map: chosenLetter → anchorIdx so lines go to the anchor the student clicked
    const newLines = [];
    leftItems.forEach((name, i) => {
      if (!name) return;
      const pill = pillRefs.current[i];
      if (!pill) return;

      if (i === 0) {
        // Example: always draw pre-set line to anchor[0] if it exists
        const exampleAnchor = anchors['0'];
        if (!exampleAnchor) return;
        const pRect = pill.getBoundingClientRect();
        newLines.push({
          x1: pRect.left + pRect.width / 2 - cRect.left,
          y1: pRect.top + pRect.height / 2 - cRect.top,
          x2: iRect.left - cRect.left + (exampleAnchor.x / 100) * iRect.width,
          y2: iRect.top - cRect.top + (exampleAnchor.y / 100) * iRect.height,
          color: '#9ca3af', // grey – example line
          nameIdx: 0,
          isExample: true,
        });
        return;
      }

      const studentAns = answers[`${questionKey}-${i}`];
      if (!studentAns) return;
      // Find the anchor position that corresponds to the letter the student chose
      const mappedAnchorIdx = effectiveAnchorByName[String(i)];
      const fallbackCandidates = anchorIndexesByLetter[studentAns] || [];
      const fallbackAnchorIdx = fallbackCandidates.length === 1 ? fallbackCandidates[0] : undefined;
      const anchorIdxStr = mappedAnchorIdx || fallbackAnchorIdx;
      const anchor = anchorIdxStr !== undefined ? anchors[anchorIdxStr] : null;
      if (!anchor) return;
      const pRect = pill.getBoundingClientRect();
      newLines.push({
        x1: pRect.left + pRect.width / 2 - cRect.left,
        y1: pRect.top + pRect.height / 2 - cRect.top,
        x2: iRect.left - cRect.left + (anchor.x / 100) * iRect.width,
        y2: iRect.top - cRect.top + (anchor.y / 100) * iRect.height,
        color: DRAW_COLORS[i % DRAW_COLORS.length],
        nameIdx: i,
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

  const handleImageClick = (e) => {
    if (selectedNameIdx === null || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const validAnswers = question.answers || {};
    const clampedClientX = Math.min(Math.max(e.clientX, rect.left), rect.right);
    const clampedClientY = Math.min(Math.max(e.clientY, rect.top), rect.bottom);
    const clickX = clampedClientX - rect.left;
    const clickY = clampedClientY - rect.top;
    let best = null;
    let bestDist = Infinity;
    Object.entries(anchors).forEach(([idxStr, pos]) => {
      const i = parseInt(idxStr, 10);
      if (i === 0) return;
      if (!validAnswers[idxStr]) return;
      // Khoảng cách pixel thực (không bị méo bởi tỉ lệ ảnh)
      const anchorX = (pos.x / 100) * rect.width;
      const anchorY = (pos.y / 100) * rect.height;
      const dx = clickX - anchorX;
      const dy = clickY - anchorY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = idxStr; }
    });
    // Chỉ snap khi click trong vòng 28px — fallback cho miss hơi lệch
    if (!best || bestDist > DRAWLINE_SNAP_RADIUS_PX) return;
    const chosenLetter = validAnswers[best];
    if (!chosenLetter) return;
    setDrawLineAnswer(selectedNameIdx, best);
    setSelectedNameIdx(null);
  };

  // Click trực tiếp vào chấm anchor — chính xác hơn nearest-anchor logic
  const handleAnchorClick = (e, idxStr) => {
    e.stopPropagation(); // không để handleImageClick cũng bắt event này
    if (selectedNameIdx === null || submitted) return;
    const i = parseInt(idxStr, 10);
    if (i === 0) return; // bỏ qua anchor Example
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
      {/* SVG lines overlay – drawn from pill centres to anchor dots */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          {lines.map((ln) => (
            <marker key={`m-${ln.nameIdx}`} id={`arrow-${questionKey}-${ln.nameIdx}`}
              markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" fill={ln.color} />
            </marker>
          ))}
        </defs>
        {lines.map((ln) => {
          const lineIsCorrect = submitted && results?.answers?.[`${questionKey}-${ln.nameIdx}`]?.isCorrect;
          // Example line stays grey always; student lines turn green/red on submit
          const lineColor = ln.isExample ? '#9ca3af' : (submitted ? (lineIsCorrect ? '#22c55e' : '#ef4444') : ln.color);
          return (
            <line
              key={ln.nameIdx}
              x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
              stroke={lineColor}
              strokeWidth={ln.isExample ? 2 : 3}
              strokeDasharray={ln.isExample ? '6 4' : '10 5'}
              strokeLinecap="round"
              opacity={ln.isExample ? 0.6 : 0.92}
              markerEnd={`url(#arrow-${questionKey}-${ln.nameIdx})`}
            />
          );
        })}
      </svg>

      {/* Question header */}
      <div style={{ marginBottom: '12px' }}>
        <div className="cambridge-question-text">{question.questionText || 'Look at the picture. Listen and draw lines.'}</div>
      </div>

      {/* Two-column: pills left | image right */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Left column: hint + pills (vertical) */}
        <div style={{ minWidth: '150px', maxWidth: '220px', flexShrink: 0 }}>
          <p style={{
            margin: '0 0 10px', fontSize: '13px', fontWeight: 700,
            color: selectedNameIdx !== null ? DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length] : (isDarkMode ? '#94a3b8' : '#374151'),
          }}>
            {selectedNameIdx !== null
              ? `⚡ "${leftItems[selectedNameIdx]}" — click nhân vật`
              : '👇 Click tên → click nhân vật'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leftItems.map((name, i) => {
            if (!name) return null;
            const isExample = i === 0;
            const studentAns = getStudentAnswer(i);
            const isCorrect = submitted && results?.answers?.[`${questionKey}-${i}`]?.isCorrect;
            const isWrong = submitted && studentAns && !isCorrect;
            const isSelected = selectedNameIdx === i;
            const color = DRAW_COLORS[i % DRAW_COLORS.length];

            let bg, border, textColor;
            if (submitted) {
              bg = isCorrect ? '#dcfce7' : (studentAns ? '#fee2e2' : (isDarkMode ? '#374151' : '#f3f4f6'));
              border = isCorrect ? '#22c55e' : (isWrong ? '#ef4444' : '#9ca3af');
              textColor = isCorrect ? '#15803d' : (isWrong ? '#dc2626' : (isDarkMode ? '#d1d5db' : '#374151'));
            } else if (isExample) {
              bg = isDarkMode ? '#374151' : '#f1f5f9';
              border = '#9ca3af';
              textColor = isDarkMode ? '#9ca3af' : '#6b7280';
            } else {
              bg = isSelected ? color : (studentAns ? `${color}22` : (isDarkMode ? '#1e293b' : 'white'));
              border = isSelected ? color : (studentAns ? color : '#d1d5db');
              textColor = isSelected ? 'white' : (isDarkMode ? '#e2e8f0' : '#1e293b');
            }

            return (
              <div
                key={i}
                ref={(el) => {
                  if (el && questionRefs) questionRefs.current[`${questionKey}-${i}`] = el;
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {/* Question number or example label */}
                {isExample ? (
                  <span style={{ fontSize: '14px', color: isDarkMode ? '#6b7280' : '#9ca3af', width: '36px', textAlign: 'right', flexShrink: 0 }}>e.g.</span>
                ) : (
                  <span style={{
                    fontSize: '15px', fontWeight: 800, color: isDarkMode ? '#94a3b8' : '#6b7280',
                    width: '36px', textAlign: 'right', flexShrink: 0,
                  }}>{questionNum + i - 1}</span>
                )}
              <button
                key={i}
                ref={(el) => { if (el) pillRefs.current[i] = el; }}
                disabled={submitted || isExample}
                onClick={() => {
                  if (isExample || submitted) return;
                  setSelectedNameIdx(isSelected ? null : i);
                }}
                style={{
                  padding: '8px 18px', borderRadius: '24px',
                  border: `2.5px solid ${border}`,
                  background: bg, color: textColor,
                  fontWeight: 800, fontSize: '20px',
                  cursor: isExample || submitted ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? `0 0 0 4px ${color}40, 0 2px 8px ${color}50` : 'none',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <span>{name}</span>
                {isExample && (
                  <span style={{ fontSize: '13px', opacity: 0.6 }}>(example)</span>
                )}
                {submitted && studentAns && (
                  <span style={{ fontSize: '15px' }}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                )}
              </button>
              </div>
            );
          })}
        </div>
      </div>{/* end left column */}

        {/* Right column: image + clear buttons */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {partImageUrl ? (
            <div
              style={{
                position: 'relative', display: 'block', width: '100%', maxWidth: '540px',
                cursor: selectedNameIdx !== null ? 'crosshair' : 'default',
                overflow: 'visible',
              }}
              onClick={handleImageClick}
            >
          <img
            ref={imgRef}
            src={resolveImg(partImageUrl)}
            alt="Scene"
            draggable={false}
            style={{
              width: '100%', maxWidth: '540px', display: 'block', borderRadius: '12px', userSelect: 'none',
              border: `3px solid ${selectedNameIdx !== null
                ? DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length]
                : (isDarkMode ? '#334155' : '#e2e8f0')}`,
              transition: 'border-color 0.2s',
            }}
          />

          {/* Anchor dots */}
          {Object.entries(anchors).map(([idxStr, pos]) => {
            const i = parseInt(idxStr, 10);
            // Find which person has actually chosen THIS anchor's letter, rather than
            // assuming anchor index == person index (that assumption caused the bug where
            // clicking any anchor would strip the animation from the "correct" dot).
            const anchorLetter = anchorLetterByIdx[idxStr];
            const usedByNameIdx = (i === 0)
              ? 0
              : (anchorUsedByName[idxStr] ?? -1);
            const hasAnswer = usedByNameIdx >= 0 && (i === 0 || usedByNameIdx > 0);
            const name = hasAnswer ? (leftItems[usedByNameIdx] || '') : '';
            const studentAns = hasAnswer && usedByNameIdx > 0
              ? answers[`${questionKey}-${usedByNameIdx}`]
              : '';
            // Màu chấm = màu của NGƯỜI đã nối vào anchor này (DRAW_COLORS),
            // không dùng màu anchor riêng để tránh nhầm lẫn với pill tên
            const personColor = usedByNameIdx >= 0 ? DRAW_COLORS[usedByNameIdx % DRAW_COLORS.length] : ANCHOR_NEUTRAL;
            const anchorColor = hasAnswer ? personColor : ANCHOR_NEUTRAL;
            const isCorrect = submitted && usedByNameIdx > 0
              && results?.answers?.[`${questionKey}-${usedByNameIdx}`]?.isCorrect;
            const dotColor = submitted
              ? (isCorrect ? '#22c55e' : (hasAnswer && usedByNameIdx > 0 ? '#ef4444' : ANCHOR_NEUTRAL))
              : anchorColor;
            const dotSize = hasAnswer ? 20 : 16;

            const isClickableAnchor = !submitted && selectedNameIdx !== null && i !== 0 && Boolean(anchorLetter);
            // Kích thước chấm hiển thị lớn hơn khi đang chọn tên → dễ bấm hơn
            const activeDotSize = isClickableAnchor ? Math.max(dotSize, 24) : dotSize;
            const hitAreaSize = Math.max(activeDotSize, DRAWLINE_ANCHOR_HIT_AREA_PX);
            return (
              <div
                key={idxStr}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`, top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none', // wrapper không bắt event, tránh che anchor khác
                  zIndex: 6,
                }}
              >
                {/* Ripple ring – only when unanswered and not submitted */}
                {!hasAnswer && !submitted && (
                  <div
                    className="draw-dot-ripple"
                    style={{
                      width: `${activeDotSize}px`, height: `${activeDotSize}px`,
                      background: anchorColor,
                    }}
                  />
                )}
                {/* Main dot — đây là vùng click thực sự, chỉ bằng kích thước chấm */}
                <button
                  type="button"
                  onClick={isClickableAnchor ? (e) => handleAnchorClick(e, idxStr) : undefined}
                  onMouseDown={isClickableAnchor ? (e) => e.stopPropagation() : undefined}
                  onPointerDown={isClickableAnchor ? (e) => e.stopPropagation() : undefined}
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
                {/* Label only after submission */}
                {submitted && hasAnswer && (
                  <div style={{
                    position: 'absolute', top: `${dotSize + 4}px`, left: '50%',
                    transform: 'translateX(-50%)',
                    background: dotColor,
                    color: 'white', borderRadius: '6px', padding: '2px 8px',
                    fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}>
                    {name}: {studentAns}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dashed border when a pill is selected */}
              {selectedNameIdx !== null && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '12px',
                  border: `4px dashed ${DRAW_COLORS[selectedNameIdx % DRAW_COLORS.length]}`,
                  pointerEvents: 'none', zIndex: 4,
                }} />
              )}
            </div>
          ) : (
            <div style={{
              padding: '20px', background: isDarkMode ? '#1e293b' : '#f9fafb',
              borderRadius: '10px', textAlign: 'center',
              color: isDarkMode ? '#94a3b8' : '#6b7280', fontSize: '13px',
            }}>
              Ảnh đang tải...
            </div>
          )}

          {/* Clear buttons */}
          {!submitted && leftItems.slice(1).some((n, i) => n && getStudentAnswer(i + 1)) && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {leftItems.slice(1).map((name, i) => {
            const nameIdx = i + 1;
            const ans = getStudentAnswer(nameIdx);
            if (!name || !ans) return null;
            return (
              <button
                key={nameIdx}
                onClick={() => setDrawLineAnswer(nameIdx, null)}
                style={{
                  padding: '4px 12px', fontSize: '12px', borderRadius: '14px',
                  border: '1px solid #fca5a5', background: '#fef2f2',
                  color: '#dc2626', cursor: 'pointer', fontWeight: 600,
                }}
              >
                ✕ {name}
              </button>
            );
          })}
            </div>
          )}
        </div>{/* end right column */}
      </div>{/* end two-column row */}
    </div>
  );
};

// ─── Part 4 Image-Tick — one question per slide ───────────────────────────────
const IT_ACCENT = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];

function ImageTickSlideSection({
  questions, exampleItem,
  secIdx, sectionStartNum,
  answers, submitted, results, isDarkMode,
  handleAnswerChange, currentPartIndex, questionRefs,
  resolveImgSrc, activeQuestion, onSlideChange,
}) {
  // Example shown as fixed header only on slide 0 (câu 16)
  const hasExample = !!(exampleItem && exampleItem.questionText);
  const [slide, setSlide] = useState(0); // 0..questions.length-1

  // Jump when footer nav focuses a question sentinel
  const jumpToSlide = (qi) => { setSlide(qi); };

  // Keep in sync when activeQuestion changes from outside (footer nav)
  useEffect(() => {
    if (!activeQuestion) return;
    const parts = String(activeQuestion).split('-');
    const qi = parseInt(parts[2], 10);
    if (!Number.isNaN(qi)) setSlide(qi);
  }, [activeQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to adjacent slide and notify parent
  const goTo = (qi) => {
    setSlide(qi);
    onSlideChange?.(qi);
  };

  const canPrev = slide > 0;
  const canNext = slide < questions.length - 1;

  const renderRow = (q, qKey, isExample, accent) => {
    const userAns   = isExample ? (q.correctAnswer || '') : (answers[qKey] || '');
    const imageOpts = Array.isArray(q.imageOptions) ? q.imageOptions : [{}, {}, {}];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '16px' }}>
        {['A', 'B', 'C'].map((letter, idx) => {
          const opt          = imageOpts[idx] || {};
          const isSelected   = userAns === letter;
          const isCorrectOpt = submitted && q.correctAnswer === letter;
          const imgSrc       = opt.imageUrl ? resolveImgSrc(opt.imageUrl) : '';

          const boxBorder = isExample
            ? (isDarkMode ? '#475569' : '#94a3b8')
            : submitted
              ? (isCorrectOpt ? '#22c55e' : isSelected ? '#ef4444' : isDarkMode ? '#334155' : '#d1d5db')
              : isSelected ? accent : isDarkMode ? '#334155' : '#d1d5db';

          const checkBg = submitted
            ? (isCorrectOpt ? '#22c55e' : isSelected && !isCorrectOpt ? '#ef4444' : 'transparent')
            : isSelected ? accent : 'transparent';
          const checkBorder = submitted
            ? (isCorrectOpt ? '#22c55e' : isSelected ? '#ef4444' : isDarkMode ? '#475569' : '#94a3b8')
            : isSelected ? accent : isDarkMode ? '#475569' : '#94a3b8';

          return (
            <div key={letter}
              onClick={() => { if (!isExample && !submitted) handleAnswerChange(qKey, isSelected ? '' : letter); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', cursor: isExample || submitted ? 'default' : 'pointer' }}
            >
              <div
                className={`it-img-box${isSelected && !isExample ? ' it-selected' : ''}`}
                style={{
                  width: '100%', aspectRatio: '1 / 1',
                  border: `3px solid ${boxBorder}`, borderRadius: '14px', overflow: 'hidden',
                  background: isDarkMode ? '#1e293b' : '#f9fafb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isSelected && !isExample ? `0 4px 16px ${accent}55` : submitted && isCorrectOpt ? '0 4px 16px #22c55e55' : '0 2px 6px rgba(0,0,0,0.08)',
                  transform: isSelected && !isExample ? 'scale(1.04)' : 'scale(1)',
                  transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  position: 'relative',
                }}
              >
                {imgSrc
                  ? <img src={imgSrc} alt={letter} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '28px', color: isDarkMode ? '#475569' : '#cbd5e1' }}>🖼️</span>
                }
                {submitted && isCorrectOpt && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-8px', fontSize: '22px', animation: 'itStarBurst 0.6s ease forwards', pointerEvents: 'none' }}>⭐</div>
                )}
              </div>
              <span style={{
                fontWeight: 900, fontSize: '15px', width: '28px', height: '28px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                background: isSelected && !isExample ? accent : submitted && isCorrectOpt ? '#22c55e' : isDarkMode ? '#1e293b' : '#f1f5f9',
                color: isSelected && !isExample || (submitted && isCorrectOpt) ? '#fff' : isDarkMode ? '#e2e8f0' : '#1e293b',
                transition: 'background 0.18s, color 0.18s',
              }}>{letter}</span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                border: `2.5px solid ${checkBorder}`, background: checkBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: (isSelected || (submitted && isCorrectOpt)) ? 'itCheckPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                boxShadow: isSelected && !isExample ? `0 0 0 3px ${accent}33` : 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {(isSelected || (submitted && isCorrectOpt)) && <span style={{ color: '#fff', fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Current question slide
  const qIdx   = slide;
  const q      = questions[qIdx];
  const qKey   = `${currentPartIndex}-${secIdx}-${qIdx}`;
  const accent = IT_ACCENT[qIdx % IT_ACCENT.length];
  const isCorrect = submitted && results?.answers?.[qKey]?.isCorrect;
  const isWrong   = submitted && (answers[qKey] || '') && !isCorrect;

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes itBounceIn { 0%{opacity:0;transform:translateY(22px) scale(0.93)} 55%{transform:translateY(-5px) scale(1.03)} 80%{transform:translateY(2px) scale(0.99)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes itCheckPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 65%{transform:scale(1.35) rotate(6deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes itStarBurst { 0%{transform:scale(0) rotate(-30deg);opacity:1} 60%{transform:scale(1.4) rotate(15deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:0.9} }
        @keyframes itShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .it-img-box{position:relative;}
        .it-img-box:hover:not(.it-selected){transform:scale(1.06) !important;box-shadow:0 6px 18px rgba(0,0,0,0.13) !important;}
      `}</style>

      {/* Sentinel divs for footer nav focus */}
      {questions.map((_, qi) => {
        const key = `${currentPartIndex}-${secIdx}-${qi}`;
        return (
          <div key={`sentinel-${qi}`}
            id={`question-${sectionStartNum + qi}`}
            ref={(el) => { questionRefs.current[key] = el; }}
            tabIndex={-1}
            onFocus={() => jumpToSlide(qi)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}
          />
        );
      })}

      <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>

        {/* ── Example — fixed header, only on first question slide ── */}
        {hasExample && slide === 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '14px',
            border: `2px dashed ${isDarkMode ? '#334155' : '#cbd5e1'}`,
            background: isDarkMode ? '#0f172a' : '#f8fafc',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                padding: '2px 12px', borderRadius: '999px',
                background: isDarkMode ? '#1e293b' : '#e2e8f0',
                color: isDarkMode ? '#94a3b8' : '#475569',
                fontWeight: 800, fontSize: '12px', flexShrink: 0,
              }}>🌟 Example</span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                {exampleItem.questionText || ''}
              </span>
            </div>
            {renderRow(exampleItem, null, true, '#94a3b8')}
          </div>
        )}

        {/* ── Active question slide ── */}
        <div style={{
          padding: '20px 20px 24px',
          borderRadius: '18px',
          border: `2.5px solid ${submitted ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isDarkMode ? '#334155' : '#e2e8f0') : accent}`,
          background: isDarkMode ? '#111827' : `${accent}08`,
          boxShadow: `0 0 0 3px ${submitted ? (isCorrect ? '#22c55e' : isWrong ? '#ef4444' : 'transparent') : accent}20, 0 4px 18px ${accent}15`,
          animation: 'itBounceIn 0.35s ease both',
          ...(isWrong ? { animationName: 'itBounceIn, itShake', animationDuration: '0.35s, 0.4s', animationDelay: '0s, 0.5s', animationFillMode: 'both' } : {}),
          transition: 'border-color 0.2s, background 0.2s',
        }}>
          {/* Question header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
              background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : accent,
              color: '#fff', fontWeight: 900, fontSize: '14px',
              boxShadow: `0 3px 8px ${submitted ? (isCorrect ? '#22c55e55' : '#ef444455') : accent + '55'}`,
            }}>
              {submitted ? (isCorrect ? '✓' : '✗') : sectionStartNum + qIdx}
            </span>
            <span style={{ fontWeight: 700, fontSize: '15px', color: isDarkMode ? '#e2e8f0' : '#0f172a', flex: 1 }}>
              {q?.questionText || ''}
            </span>
            {submitted && !isCorrect && (
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#22c55e', background: isDarkMode ? '#052e16' : '#f0fdf4', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                ✓ {results?.answers?.[qKey]?.correctAnswer || q?.correctAnswer || ''}
              </span>
            )}
          </div>
          {renderRow(q, qKey, false, accent)}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button type="button" onClick={() => goTo(slide - 1)} disabled={!canPrev}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: canPrev ? 'pointer' : 'not-allowed',
              background: canPrev ? (isDarkMode ? '#334155' : '#e2e8f0') : (isDarkMode ? '#1e293b' : '#f8fafc'),
              color: canPrev ? (isDarkMode ? '#e2e8f0' : '#374151') : (isDarkMode ? '#475569' : '#cbd5e1'),
              fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: canPrev ? '0 2px 6px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}>‹</button>

          {/* Progress dots — one per question */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {questions.map((_, i) => {
              const isActive   = i === slide;
              const dotKey     = `${currentPartIndex}-${secIdx}-${i}`;
              const dotCorrect = submitted && results?.answers?.[dotKey]?.isCorrect;
              const dotWrong   = submitted && (answers[dotKey] || '') && !dotCorrect;
              const dotAnswered = !submitted && !!(answers[dotKey] || '');
              const dotAccent  = IT_ACCENT[i % IT_ACCENT.length];
              return (
                <button key={i} type="button" onClick={() => goTo(i)}
                  style={{
                    width: isActive ? '28px' : '10px', height: '10px', borderRadius: '999px',
                    border: 'none', cursor: 'pointer', padding: 0,
                    background: submitted
                      ? (dotCorrect ? '#22c55e' : dotWrong ? '#ef4444' : isDarkMode ? '#334155' : '#d1d5db')
                      : isActive ? dotAccent : dotAnswered ? `${dotAccent}88` : (isDarkMode ? '#334155' : '#d1d5db'),
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: isActive ? `0 0 0 2px ${dotAccent}44` : 'none',
                  }}
                />
              );
            })}
          </div>

          <button type="button" onClick={() => goTo(slide + 1)} disabled={!canNext}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed',
              background: canNext ? (isDarkMode ? '#334155' : '#e2e8f0') : (isDarkMode ? '#1e293b' : '#f8fafc'),
              color: canNext ? (isDarkMode ? '#e2e8f0' : '#374151') : (isDarkMode ? '#475569' : '#cbd5e1'),
              fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: canNext ? '0 2px 6px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}>›</button>
        </div>
      </div>
    </>
  );
}

// ─── Part 5 Colour & Write — palette (module-level so child component can use) ─
const CW_PALETTE = [
  { label: 'yellow', hex: '#eab308' },
  { label: 'blue',   hex: '#3b82f6' },
  { label: 'red',    hex: '#ef4444' },
  { label: 'orange', hex: '#f97316' },
  { label: 'purple', hex: '#a855f7' },
  { label: 'pink',   hex: '#ec4899' },
  { label: 'green',  hex: '#22c55e' },
  { label: 'brown',  hex: '#92400e' },
  { label: 'black',  hex: '#171717' },
  { label: 'grey',   hex: '#6b7280' },
  { label: 'white',  hex: '#f9fafb', border: '#d1d5db' },
];

// ─── ColourWriteStudentSection (uses hooks — must be defined outside main component) ─
function ColourWriteStudentSection({
  questions, exampleItem, sceneImageUrl,
  secIdx, sectionStartNum,
  answers, submitted, results, isDarkMode,
  handleAnswerChange, currentPartIndex, questionRefs,
}) {
  const [selColour, setSelColour] = useState(null);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const writeInputRefs = useRef({});   // qi → input DOM node

  const jumpToQuestion = (qi) => {
    setActiveQIdx(qi);
    // Scroll scene image into view
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // If write-type: focus the overlaid input after a short tick
    const q = questions[qi];
    if ((q?.taskType || 'colour') === 'write') {
      setTimeout(() => writeInputRefs.current[qi]?.focus(), 120);
    }
  };
  const isDrawing    = useRef(false);
  const strokes      = useRef([]);
  const curPts       = useRef([]);

  // Resize canvas to match image dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) { cv.width = Math.round(width); cv.height = Math.round(height); }
      redraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const redraw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.current.forEach((s) => {
      if (!s.points?.length) return;
      ctx.beginPath();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.erase) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 24; ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color; ctx.lineWidth = 11; ctx.globalAlpha = 0.70;
      }
      const pts = s.points;
      ctx.moveTo(pts[0][0] * cv.width / 100, pts[0][1] * cv.height / 100);
      pts.slice(1).forEach((p) => ctx.lineTo(p[0] * cv.width / 100, p[1] * cv.height / 100));
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    });
  };

  const getXY = (e) => {
    const cv = canvasRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return [((cx - r.left) / r.width) * 100, ((cy - r.top) / r.height) * 100];
  };

  const onDown = (e) => {
    if (submitted || !selColour || selColour.label === '_write_') return;
    isDrawing.current = true; curPts.current = [getXY(e)]; e.preventDefault();
  };
  const onMove = (e) => {
    if (!isDrawing.current || submitted) return;
    curPts.current.push(getXY(e));
    const cv = canvasRef.current;
    if (cv) {
      redraw();
      const ctx = cv.getContext('2d');
      ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (selColour.erase) {
        ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 24; ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = selColour.hex; ctx.lineWidth = 11; ctx.globalAlpha = 0.70;
      }
      const pts = curPts.current;
      ctx.moveTo(pts[0][0] * cv.width / 100, pts[0][1] * cv.height / 100);
      pts.slice(1).forEach((p) => ctx.lineTo(p[0] * cv.width / 100, p[1] * cv.height / 100));
      ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    e.preventDefault();
  };
  const onUp = (e) => {
    if (!isDrawing.current || submitted) return;
    isDrawing.current = false;
    if (curPts.current.length > 0) {
      strokes.current.push({ color: selColour?.hex || '#3b82f6', erase: !!selColour?.erase, points: [...curPts.current] });
      curPts.current = [];
    }
    e.preventDefault();
  };

  const handleColourClick = (c) => {
    setSelColour(c);
    const q = questions[activeQIdx];
    if (!submitted && q && (q.taskType || 'colour') !== 'write' && !c.erase) {
      const key = `${currentPartIndex}-${secIdx}-${activeQIdx}`;
      handleAnswerChange(key, c.label);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      {/* Hidden sentinel divs per question — footer nav focuses these to trigger setActiveQIdx */}
      {questions.map((q, qi) => {
        const key = `${currentPartIndex}-${secIdx}-${qi}`;
        return (
          <div
            key={`sentinel-${qi}`}
            id={`question-${sectionStartNum + qi}`}
            ref={(el) => { questionRefs.current[key] = el; }}
            tabIndex={-1}
            onFocus={() => jumpToQuestion(qi)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}
          />
        );
      })}

      {/* Scene image + interactive canvas + write overlays */}
      {sceneImageUrl && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <div ref={containerRef} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', userSelect: 'none', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', width: 'fit-content' }}>
          <img src={sceneImageUrl} alt="Scene" draggable={false} style={{ width: '100%', display: 'block', userSelect: 'none' }} />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: selColour && !selColour.erase ? 'crosshair' : selColour?.erase ? 'cell' : 'default' }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          />
          {/* Write-type overlays at teacher-set positions */}
          {questions.map((q, qi) => {
            if ((q.taskType || 'colour') !== 'write' || !q.textPosition) return null;
            const key = `${currentPartIndex}-${secIdx}-${qi}`;
            const userAnswer = answers[key] || '';
            const isQCorrect = submitted && results?.answers?.[key]?.isCorrect;
            const isQActive  = qi === activeQIdx;
            return (
              <div key={qi} style={{ position: 'absolute', left: `${q.textPosition.x}%`, top: `${q.textPosition.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                <input
                  ref={(el) => { writeInputRefs.current[qi] = el; }}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => { if (!submitted) handleAnswerChange(key, e.target.value); }}
                  disabled={submitted}
                  onClick={(e) => { e.stopPropagation(); jumpToQuestion(qi); }}
                  placeholder={`Q${sectionStartNum + qi}`}
                  style={{
                    width: '110px', padding: '5px 8px', textAlign: 'center', borderRadius: '7px', fontWeight: 800,
                    fontSize: '14px', letterSpacing: '0.06em', outline: 'none',
                    border: submitted
                      ? (isQCorrect ? '2.5px solid #22c55e' : '2.5px solid #ef4444')
                      : isQActive ? '2.5px solid #7c3aed' : '2px solid #1e293b',
                    background: submitted
                      ? (isQCorrect ? 'rgba(240,253,244,0.95)' : 'rgba(254,242,242,0.95)')
                      : 'rgba(255,255,255,0.93)',
                    color: '#1e293b',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                    backdropFilter: 'blur(3px)',
                  }}
                />
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Colour palette bar + question number pills */}
      <div style={{
        borderRadius: '16px',
        background: isDarkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }}>
        {/* Question number pills row */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '10px 12px 0', flexWrap: 'wrap' }}>
          {questions.map((q, qi) => {
            const key = `${currentPartIndex}-${secIdx}-${qi}`;
            const ans = answers[key] || '';
            const isAct = qi === activeQIdx;
            const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
            const col = (q.taskType || 'colour') !== 'write' ? CW_PALETTE.find((c) => c.label === ans) : null;
            return (
              <button
                key={qi}
                type="button"
                onClick={() => jumpToQuestion(qi)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px', borderRadius: '999px', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                  border: `2px solid ${submitted ? (isCorrect ? '#22c55e' : '#ef4444') : isAct ? '#7c3aed' : (isDarkMode ? '#334155' : '#e5e7eb')}`,
                  background: submitted ? (isCorrect ? (isDarkMode ? '#052e16' : '#f0fdf4') : (isDarkMode ? '#2d0a0a' : '#fef2f2')) : isAct ? (isDarkMode ? '#2e1065' : '#ede9fe') : (isDarkMode ? '#0f172a' : '#f8fafc'),
                  color: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : isAct ? (isDarkMode ? '#c4b5fd' : '#5b21b6') : (isDarkMode ? '#94a3b8' : '#374151'),
                  transition: 'all 0.15s', outline: 'none',
                }}
              >
                {submitted ? (isCorrect ? '✓' : '✗') : sectionStartNum + qi}
                {col && <div style={{ width: 11, height: 11, borderRadius: '50%', background: col.hex, border: col.border ? `1px solid ${col.border}` : 'none', flexShrink: 0 }} />}
                {(q.taskType || 'colour') === 'write' && ans && <span style={{ fontSize: '10px', maxWidth: '48px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ans}</span>}
              </button>
            );
          })}
        </div>

        {/* Palette dots row */}
        {!submitted && (
        <div style={{
          display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center',
          padding: '10px 12px 14px', overflowX: 'auto',
        }}>
          {CW_PALETTE.map((c) => {
            const isSel = selColour?.label === c.label;
            return (
              <button key={c.label} type="button" title={c.label} onClick={() => handleColourClick(c)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 7px', borderRadius: '10px', outline: isSel ? `2.5px solid ${isDarkMode ? '#a78bfa' : '#7c3aed'}` : 'none', outlineOffset: '1px' }}
              >
                <div style={{
                  width: isSel ? '52px' : '44px', height: isSel ? '52px' : '44px', borderRadius: '50%',
                  background: c.hex, flexShrink: 0,
                  border: c.border ? `2px solid ${c.border}` : '2px solid rgba(0,0,0,0.08)',
                  boxShadow: isSel ? `0 0 0 3px ${c.hex}55, 0 4px 12px ${c.hex}44` : '0 2px 6px rgba(0,0,0,0.12)',
                  transform: isSel ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
                  transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
                <span style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: isSel ? 800 : 500 }}>{c.label}</span>
              </button>
            );
          })}
          {/* Erase — same shape as colour dots */}
          <button type="button" title="Erase" onClick={() => setSelColour({ label: '_erase_', erase: true })}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 7px', borderRadius: '10px', outline: selColour?.erase ? `2.5px solid ${isDarkMode ? '#a78bfa' : '#7c3aed'}` : 'none', outlineOffset: '1px' }}
          >
            <div style={{
              width: selColour?.erase ? '52px' : '44px', height: selColour?.erase ? '52px' : '44px', borderRadius: '50%',
              background: isDarkMode ? '#334155' : '#f1f5f9', flexShrink: 0,
              border: selColour?.erase ? '2.5px solid #ef4444' : '2px solid rgba(0,0,0,0.10)',
              boxShadow: selColour?.erase ? '0 0 0 3px #ef444433, 0 4px 12px #ef444422' : '0 2px 6px rgba(0,0,0,0.12)',
              transform: selColour?.erase ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
              transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', lineHeight: 1,
            }}>🧹</div>
            <span style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: selColour?.erase ? 800 : 500 }}>Erase</span>
          </button>
        </div>
        )}
      </div>

      {/* Post-submission result summary */}
      {submitted && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {questions.map((q, qi) => {
            const key = `${currentPartIndex}-${secIdx}-${qi}`;
            const userAnswer = answers[key] || '';
            const isCorrect = results?.answers?.[key]?.isCorrect;
            const taskType = q.taskType || 'colour';
            const col = taskType !== 'write' ? CW_PALETTE.find((x) => x.label === userAnswer) : null;
            return (
              <div key={qi} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderRadius: '10px', background: isCorrect ? (isDarkMode ? '#052e16' : '#f0fdf4') : (isDarkMode ? '#2d0a0a' : '#fef2f2'), border: `1.5px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                <span style={{ fontWeight: 900, fontSize: '16px', color: isCorrect ? '#22c55e' : '#ef4444', width: '20px', flexShrink: 0 }}>{isCorrect ? '✓' : '✗'}</span>
                <span style={{ fontWeight: 800, fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b', flexShrink: 0 }}>Q{sectionStartNum + qi}</span>
                <span style={{ flex: 1, fontSize: '13px', color: isDarkMode ? '#cbd5e1' : '#374151' }}>{q.questionText}</span>
                {col && <div style={{ width: 22, height: 22, borderRadius: '50%', background: col.hex, border: col.border ? `1.5px solid ${col.border}` : 'none', flexShrink: 0 }} />}
                {taskType === 'write' && userAnswer && <span style={{ fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{userAnswer}</span>}
                {!isCorrect && (
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#22c55e', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                    ✓ {results?.answers?.[key]?.correctAnswer || q.correctAnswer || ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * DoCambridgeListeningTest - Trang làm bài thi Listening Cambridge (KET, PET, etc.)
 * Support: KET, PET, FLYERS, MOVERS, STARTERS
 */
const DoCambridgeListeningTest = () => {
  const { testType, id } = useParams(); // testType: ket-listening, pet-listening, etc.
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const examType = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("ket")) return "KET";
    if (s.includes("pet")) return "PET";
    if (s.includes("flyers")) return "FLYERS";
    if (s.includes("movers")) return "MOVERS";
    if (s.includes("starters")) return "STARTERS";
    // fallback to Cambridge style if unknown
    return "CAMBRIDGE";
  }, [testType]);

  const styles = useMemo(() => createStyles(isDarkMode, examType), [isDarkMode, examType]);

  // States
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  /* eslint-disable-next-line no-unused-vars */
  const [expandedPart, setExpandedPart] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [activeQuestion, setActiveQuestion] = useState(null);

  // Cambridge-style start gate (must click Play)
  const [testStarted, setTestStarted] = useState(false);
  const [startedAudioByPart, setStartedAudioByPart] = useState({});
  const [showAudioTip, setShowAudioTip] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => new Set());
  const [audioError, setAudioError] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasResumeAudio, setHasResumeAudio] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const maxPlayedTimeByPartRef = useRef({});
  const ignoreSeekRef = useRef(false);
  const switchingAudioSrcRef = useRef(false);
  const lastAudioSrcRef = useRef('');
  const endTimeRef = useRef(null);
  const lastAudioTimeRef = useRef(0);
  const lastAudioSaveRef = useRef(0);

  // Cambridge Reading-like splitter
  const [leftWidth, setLeftWidth] = useState(42);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Get test config
  const testConfig = useMemo(() => {
    return TEST_CONFIGS[testType] || TEST_CONFIGS['ket-listening'];
  }, [testType]);

  const storageKey = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const uid = u?.id || 'anon';
      return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}-${uid}`;
    } catch {
      return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}-anon`;
    }
  }, [testType, id]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`cambridge/listening-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        const data = await res.json();

        // Parse parts JSON
        let parsedParts = typeof data.parts === "string"
          ? JSON.parse(data.parts)
          : data.parts;

        const parsedData = {
          ...data,
          parts: parsedParts,
        };

        setTest(parsedData);
        const initialSeconds = (testConfig.duration || 30) * 60;
        setTimeRemaining(initialSeconds);

        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved?.answers) setAnswers(saved.answers);
            if (Number.isInteger(saved?.currentPartIndex)) {
              setCurrentPartIndex(saved.currentPartIndex);
              setExpandedPart(saved.currentPartIndex);
            }
            if (saved?.activeQuestion) setActiveQuestion(saved.activeQuestion);
            if (saved?.startedAudioByPart) setStartedAudioByPart(saved.startedAudioByPart);
            if (saved?.testStarted) {
              setTestStarted(true);
              setHasResumeAudio(true);
            }

            if (saved?.endTime) {
              endTimeRef.current = saved.endTime;
              const remaining = Math.max(0, Math.floor((saved.endTime - Date.now()) / 1000));
              setTimeRemaining(remaining);
            }

            if (typeof saved?.audioCurrentTime === 'number') {
              lastAudioTimeRef.current = saved.audioCurrentTime;
              if (saved.audioCurrentTime > 0) {
                setHasResumeAudio(true);
              }
            }
          }
        } catch {
          // ignore restore errors
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id, testConfig.duration, storageKey]);

  const hasAnyAudio = useMemo(() => {
    return Boolean(test?.mainAudioUrl || test?.parts?.some((p) => p?.audioUrl));
  }, [test]);

  // If teacher uploads only one mp3 (usually in Part 1), treat it as global audio.
  const globalAudioUrl = useMemo(() => {
    if (test?.mainAudioUrl) return test.mainAudioUrl;
    const parts = test?.parts || [];
    const first = parts.find((p) => p?.audioUrl)?.audioUrl;
    return first || '';
  }, [test]);

  const audioMeta = useMemo(() => {
    if (test?.mainAudioUrl) {
      return {
        hasAudio: true,
        uniqueCount: 1,
        isSingleFile: true,
        usesMain: true,
      };
    }
    const urls = new Set(
      (test?.parts || [])
        .map((p) => (p?.audioUrl ? String(p.audioUrl).trim() : ''))
        .filter(Boolean)
    );
    return {
      hasAudio: urls.size > 0,
      uniqueCount: urls.size,
      isSingleFile: urls.size === 1,
      usesMain: false,
    };
  }, [test]);


  // Build global question order + ranges (for footer nav)
  const questionIndex = useMemo(() => {
    const parts = test?.parts || [];
    const starts = computeQuestionStarts(parts);
    let globalNumber = 1;
    const byPart = [];
    const orderedKeys = [];

    const countClozeBlanks = (question) => {
      if (Array.isArray(question?.blanks) && question.blanks.length) return question.blanks.length;
      if (question?.answers && typeof question.answers === 'object') {
        return Object.keys(question.answers).length;
      }
      return countClozeBlanksFromText(question?.passageText || question?.passage || '');
    };

    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const partKeys = [];
      const start = starts.sectionStart[`${pIdx}-0`] || globalNumber;
      if (start !== globalNumber) globalNumber = start;

      const sections = part?.sections || [];
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const q0 = sec?.questions?.[0] || {};
        const secType =
          sec?.questionType ||
          q0?.questionType ||
          q0?.type ||
          (Array.isArray(q0?.people) ? 'people-matching' : '') ||
          (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
          (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
          '';
        const questions = sec?.questions || [];

        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx];

          if (secType === 'long-text-mc' && Array.isArray(q?.questions)) {
            for (let nestedIdx = 0; nestedIdx < q.questions.length; nestedIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${nestedIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'cloze-mc' && Array.isArray(q?.blanks)) {
            for (let blankIdx = 0; blankIdx < q.blanks.length; blankIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'cloze-test') {
            const blanksCount = countClozeBlanks(q);
            if (blanksCount > 0) {
              for (let blankIdx = 0; blankIdx < blanksCount; blankIdx++) {
                const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
                const num = globalNumber++;
                partKeys.push({ key, number: num, sectionIndex: sIdx });
                orderedKeys.push({ key, partIndex: pIdx, number: num });
              }
              continue;
            }
          }

          if (secType === 'word-form' && Array.isArray(q?.sentences)) {
            for (let sentIdx = 0; sentIdx < q.sentences.length; sentIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${sentIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'people-matching' && Array.isArray(q?.people)) {
            for (let personIdx = 0; personIdx < q.people.length; personIdx++) {
              const person = q.people[personIdx];
              const personId = person?.id || String.fromCharCode(65 + personIdx);
              const key = `${pIdx}-${sIdx}-${qIdx}-${personId}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'gap-match' && Array.isArray(q?.leftItems)) {
            for (let itemIdx = 0; itemIdx < q.leftItems.length; itemIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${itemIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          // draw-lines (MOVERS Part 1): expand into per-name sub-keys (skip idx 0 = example)
          if ((q.questionType === 'draw-lines' || (q.anchors && Object.keys(q.anchors || {}).length > 0)) && Array.isArray(q.leftItems) && q.leftItems.length > 1) {
            let expanded = 0;
            for (let nameIdx = 1; nameIdx < q.leftItems.length; nameIdx++) {
              if (String(q.leftItems[nameIdx] || '').trim()) {
                const subKey = `${pIdx}-${sIdx}-${qIdx}-${nameIdx}`;
                const subNum = globalNumber++;
                partKeys.push({ key: subKey, number: subNum, sectionIndex: sIdx });
                orderedKeys.push({ key: subKey, partIndex: pIdx, number: subNum });
                expanded++;
              }
            }
            if (expanded > 0) continue;
          }

          // letter-matching (MOVERS Part 3): expand into per-person sub-keys (skip idx 0 = example)
          if ((q.questionType === 'letter-matching' || secType === 'letter-matching') && Array.isArray(q.people)) {
            let expanded = 0;
            for (let pi = 1; pi < q.people.length; pi++) {
              if (String(q.people[pi]?.name || '').trim()) {
                const subKey = `${pIdx}-${sIdx}-${qIdx}-${pi}`;
                const subNum = globalNumber++;
                partKeys.push({ key: subKey, number: subNum, sectionIndex: sIdx });
                orderedKeys.push({ key: subKey, partIndex: pIdx, number: subNum });
                expanded++;
              }
            }
            if (expanded > 0) continue;
          }

          const key = `${pIdx}-${sIdx}-${qIdx}`;
          const num = globalNumber++;
          partKeys.push({ key, number: num, sectionIndex: sIdx });
          orderedKeys.push({ key, partIndex: pIdx, number: num });
        }
      }

      const partCount = (part?.sections || []).reduce((sum, sec) => sum + getQuestionCountForSection(sec), 0);
      const end = partCount > 0 ? start + partCount - 1 : globalNumber - 1;
      byPart.push({ partIndex: pIdx, start, end, keys: partKeys });
    }

    return { byPart, orderedKeys };
  }, [test]);

  // Init active question to first question
  useEffect(() => {
    if (!test) return;
    const first = questionIndex?.orderedKeys?.[0]?.key;
    if (first && !activeQuestion) {
      setCurrentPartIndex(questionIndex.orderedKeys[0].partIndex);
      setExpandedPart(questionIndex.orderedKeys[0].partIndex);
      setActiveQuestion(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, questionIndex]);

  // Scroll to active question when changed
  useEffect(() => {
    if (!activeQuestion) return;
    const el = questionRefs.current?.[activeQuestion];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeQuestion]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !test) return;
    if (hasAnyAudio && !testStarted && !endTimeRef.current) return;

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeRemaining * 1000;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeRemaining(0);
        confirmSubmit();
        return;
      }
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, submitted, testStarted, hasAnyAudio, timeRemaining]);

  useEffect(() => {
    if (!test) return;
    const payload = {
      answers,
      currentPartIndex,
      activeQuestion,
      startedAudioByPart,
      testStarted,
      endTime: endTimeRef.current,
      audioCurrentTime: lastAudioTimeRef.current,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [answers, currentPartIndex, activeQuestion, startedAudioByPart, testStarted, storageKey, test]);

  const currentPart = useMemo(() => {
    return test?.parts?.[currentPartIndex] || null;
  }, [test, currentPartIndex]);

  const isSinglePanelPart = useMemo(() => {
    const isPetListening = String(testType || '').toLowerCase().includes('pet');
    if (currentPartIndex === 0) return true;
    if (isPetListening && currentPartIndex === 1) return true;
    if (currentPartIndex >= 2 && currentPartIndex <= 4) {
      // Part 3 letter-matching → 2-panel layout với divider
      if (currentPartIndex === 2) {
        const secs = currentPart?.sections || [];
        const hasLetterMatching = secs.some(
          (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
        );
        if (hasLetterMatching) return false;
      }
      return true;
    }
    const sections = currentPart?.sections || [];
    return sections.some((section) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      return sectionType === 'cloze-test';
    });
  }, [currentPartIndex, currentPart, testType]);

  const currentAudioUrl = useMemo(() => {
    return test?.mainAudioUrl || currentPart?.audioUrl || globalAudioUrl || '';
  }, [test?.mainAudioUrl, currentPart, globalAudioUrl]);

  const resolveAudioSrc = useCallback((url) => {
    if (!url) return '';
    const s = String(url).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return hostPath(s);
    return hostPath(`/${s}`);
  }, []);

  const resolvedAudioSrc = useMemo(() => {
    return resolveAudioSrc(currentAudioUrl);
  }, [currentAudioUrl, resolveAudioSrc]);

  useEffect(() => {
    setAudioError(null);

    const audio = audioRef.current;
    if (!audio) return;

    const prevSrc = lastAudioSrcRef.current;
    const nextSrc = resolvedAudioSrc;
    if (audioMeta.isSingleFile && prevSrc && prevSrc === nextSrc) {
      return;
    }
    lastAudioSrcRef.current = nextSrc;

    // When switching parts/audio, reset playback bookkeeping without the pause-handler forcing replay.
    switchingAudioSrcRef.current = true;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: 0,
    };

    const t = setTimeout(() => {
      switchingAudioSrcRef.current = false;
    }, 0);

    return () => clearTimeout(t);
  }, [resolvedAudioSrc, currentPartIndex, audioMeta.isSingleFile]);

  useEffect(() => {
    if (!audioMeta.isSingleFile) return;
    const audio = audioRef.current;
    if (!audio) return;
    const currentTime = Number(audio.currentTime || 0);
    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: Math.max(
        Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0),
        currentTime
      ),
    };
  }, [currentPartIndex, audioMeta.isSingleFile]);

  const isStartGateVisible = useMemo(() => {
    if (submitted) return false;
    if (!resolvedAudioSrc) return false;
    const isStarted = audioMeta.isSingleFile
      ? testStarted
      : Boolean(startedAudioByPart?.[currentPartIndex]);
    if (!isStarted) return true;
    if (audioEnded) return false;
    if (!isAudioPlaying && hasResumeAudio) return true;
    return false;
  }, [submitted, resolvedAudioSrc, startedAudioByPart, currentPartIndex, audioMeta.isSingleFile, testStarted, isAudioPlaying, hasResumeAudio, audioEnded]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const showGlobalAudioBar = useMemo(() => {
    return Boolean(audioMeta.usesMain && resolvedAudioSrc);
  }, [audioMeta.usesMain, resolvedAudioSrc]);

  const markPartAudioStarted = useCallback((partIndex) => {
    setStartedAudioByPart((prev) => {
      if (prev?.[partIndex]) return prev;
      return { ...(prev || {}), [partIndex]: true };
    });
    setTestStarted(true);
    setAudioEnded(false);
    setHasResumeAudio(false);
    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeRemaining * 1000;
    }
  }, [timeRemaining]);

  const handlePlayGate = useCallback(async () => {
    const audio =
      audioRef.current ||
      (typeof document !== 'undefined'
        ? document.querySelector('audio[data-listening-audio="true"]')
        : null);
    if (!audio) {
      setAudioError('Audio element is not ready yet. Please refresh and try again.');
      return;
    }
    if (!resolvedAudioSrc) {
      setAudioError('Audio source is missing.');
      return;
    }
    try {
      const resumeAt = lastAudioTimeRef.current;

      // Ensure the element picks up the current src before attempting to play.
      audio.load?.();

      const playAfterReady = async () => {
        if (resumeAt > 0 && Number.isFinite(resumeAt)) {
          try {
            audio.currentTime = resumeAt;
          } catch {
            // ignore
          }
        }
        await audio.play();
      };

      if (audio.readyState < 1) {
        const onMeta = () => {
          audio.removeEventListener('loadedmetadata', onMeta);
          playAfterReady().catch((e) => {
            throw e;
          });
        };
        audio.addEventListener('loadedmetadata', onMeta);
      } else {
        await playAfterReady();
      }
      markPartAudioStarted(currentPartIndex);
      setTimeout(() => {
        if (audio.paused) {
          setAudioError('Audio did not start. Please check the audio file or try another browser.');
        }
      }, 300);
    } catch (e) {
      console.error('Audio play failed:', e);
      setAudioError(
        e?.name === 'NotSupportedError'
          ? 'Audio file is not supported or the source URL is invalid.'
          : 'Unable to play audio. Please check your connection or try another browser.'
      );
    }
  }, [currentPartIndex, markPartAudioStarted, resolvedAudioSrc]);

  const handleAudioPlay = useCallback(() => {
    markPartAudioStarted(currentPartIndex);
    setIsAudioPlaying(true);
    setAudioEnded(false);
  }, [currentPartIndex, markPartAudioStarted]);

  const handleAudioEnded = useCallback(() => {
    setIsAudioPlaying(false);
    setAudioEnded(true);
  }, []);

  const handleAudioPause = useCallback(() => {
    if (switchingAudioSrcRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    if (audio.ended) return;
    audio.play().catch(() => {
      // ignore
    });
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    const t = Number(audio.currentTime || 0);
    lastAudioTimeRef.current = t;
    const now = Date.now();
    if (now - lastAudioSaveRef.current > 1000) {
      lastAudioSaveRef.current = now;
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...(saved || {}),
            audioCurrentTime: t,
            updatedAt: now,
          })
        );
      } catch {
        // ignore
      }
    }
    const prevMax = Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    if (t > prevMax) {
      maxPlayedTimeByPartRef.current = {
        ...(maxPlayedTimeByPartRef.current || {}),
        [currentPartIndex]: t,
      };
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted, storageKey]);

  const handleAudioSeeking = useCallback(() => {
    if (ignoreSeekRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;

    const max = Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    const t = Number(audio.currentTime || 0);
    // Block any seeking (rewind or fast-forward). Cambridge flow: no pause/rewind;
    // we also prevent skipping ahead via keyboard/media controls.
    if (Math.abs(t - max) > 0.25) {
      ignoreSeekRef.current = true;
      audio.currentTime = max;
      setTimeout(() => {
        ignoreSeekRef.current = false;
      }, 0);
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionKey, value) => {
      if (submitted) return;
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: value,
      }));
    },
    [submitted]
  );

  const resolveImgSrc = useCallback((url) => {
    if (!url) return "";
    let s = String(url).trim();
    // Normalize common storage formats
    s = s.replace(/\\/g, '/');
    s = s.replace(/^\.\//, '');
    s = s.replace(/^(\.\.\/)+/, '');

    const normalizePathSegments = (path) => {
      const rawParts = String(path || '').split('/').filter(Boolean);
      const out = [];
      const dedupeWhitelist = new Set(['cambridge', 'upload', 'uploads']);
      for (const part of rawParts) {
        const prev = out[out.length - 1];
        if (prev && prev === part && dedupeWhitelist.has(part)) continue;
        out.push(part);
      }
      return `/${out.join('/')}`;
    };

    const rewriteKnownUploadPaths = (path) => {
      let p = String(path || '');
      // Backend serves static assets from /uploads (see backend/server.js).
      // Some older/stored data may reference /upload; normalize to /uploads.
      p = p.replace(/^\/upload\//i, '/uploads/');
      p = p.replace(/^\/upload$/i, '/uploads');
      return p;
    };

    const normalizeUrlLike = (value) => {
      const str = String(value || '');
      const [baseAndPath, hash = ''] = str.split('#');
      const [base, query = ''] = baseAndPath.split('?');

      // Absolute URL: normalize pathname only.
      if (/^https?:\/\//i.test(base)) {
        try {
          const u = new URL(str);
          u.pathname = rewriteKnownUploadPaths(normalizePathSegments(u.pathname));
          return u.toString();
        } catch {
          // fall through
        }
      }

      const normalizedPath = rewriteKnownUploadPaths(normalizePathSegments(base));
      return `${normalizedPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
    };

    if (/^data:/i.test(s)) return s;
    if (/^blob:/i.test(s)) return s;

    s = normalizeUrlLike(s);

    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return hostPath(s);
    return hostPath(`/${s}`);
  }, []);

  const sanitizeBasicHtml = useCallback((html) => {
    const s = String(html || "");
    return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }, []);

  const renderMaybeHtml = useCallback(
    (value) => {
      const s = String(value || "");
      if (!s) return null;
      if (s.includes("<") && s.includes(">")) {
        return <div dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(s) }} />;
      }
      return <div>{s}</div>;
    },
    [sanitizeBasicHtml]
  );

  const renderOpenClozeSection = (section, secIdx, sectionStartNum) => (
    <OpenClozeSectionDisplay
      section={section}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      currentPartIndex={currentPartIndex}
      answers={answers}
      submitted={submitted}
      isDarkMode={isDarkMode}
      flaggedQuestions={flaggedQuestions}
      toggleFlag={toggleFlag}
      handleAnswerChange={handleAnswerChange}
    />
  );
  const renderGapMatchSection = (section, secIdx, sectionStartNum) => (
    <GapMatchSectionDisplay
      section={section}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      currentPartIndex={currentPartIndex}
      answers={answers}
      setAnswers={setAnswers}
      submitted={submitted}
      isDarkMode={isDarkMode}
      flaggedQuestions={flaggedQuestions}
      toggleFlag={toggleFlag}
      questionRefs={questionRefs}
      activeQuestion={activeQuestion}
      styles={styles}
    />
  );

  const renderFillExample = (section, sectionStartNum) => {
    const exampleItem = section?.exampleItem;
    const exampleText = String(exampleItem?.questionText || "").trim();
    const exampleAnswer = String(exampleItem?.correctAnswer || "").trim();
    if (!exampleText && !exampleAnswer) return null;

    return (
      <div
        style={{
          background: isDarkMode ? '#0f172a' : '#f8fafc',
          border: `2px dashed ${isDarkMode ? '#334155' : '#94a3b8'}`,
          borderRadius: '16px',
          padding: '14px 20px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '36px', height: '36px', borderRadius: '50%',
            background: isDarkMode ? '#1e293b' : '#e2e8f0',
            color: isDarkMode ? '#94a3b8' : '#475569',
            fontWeight: 800, fontSize: '13px', flexShrink: 0,
          }}>Ex</span>
          <div style={{
            fontSize: '20px', lineHeight: 1.5, fontWeight: 600,
            color: isDarkMode ? '#94a3b8' : '#64748b', paddingTop: '4px',
          }}>
            {exampleText || `Example before question ${sectionStartNum}`}
            <span style={{ marginLeft: '8px', fontSize: '13px', opacity: 0.6, fontWeight: 400 }}>(example)</span>
          </div>
        </div>
        {/* Ô đáp án mẫu — đọc only, màu xanh */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '18px', pointerEvents: 'none', opacity: 0.45,
          }}>✏️</span>
          <input
            type="text"
            value={exampleAnswer}
            readOnly
            disabled
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 44px',
              border: `2.5px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
              borderRadius: '12px',
              fontSize: '20px', fontWeight: 700,
              background: isDarkMode ? '#1e3a5f' : '#eff6ff',
              color: isDarkMode ? '#e5e7eb' : '#1d4ed8',
              outline: 'none',
            }}
          />
        </div>
      </div>
    );
  };

  // ── MOVERS Part 3: Letter Matching renderer ──────────────────────────────
  // ── Letter Matching drop handler (shared by left panel people rows) ──────
  const handleLetterMatchingDrop = (e, targetKey, questionPeople, secIdx) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.background = '';
    if (submitted) return;
    const letter = e.dataTransfer.getData('text/plain');
    if (!letter) return;
    setAnswers((prev) => {
      const next = { ...prev };
      questionPeople.forEach((_, pi) => {
        const k = `${currentPartIndex}-${secIdx}-0-${pi + 1}`;
        if (next[k] === letter) next[k] = '';
      });
      next[targetKey] = letter;
      return next;
    });
  };

  // ── MOVERS Part 3: Full single-panel Letter Matching (people + tiles) ────
  const renderLetterMatchingSectionFull = (section, secIdx, sectionStartNum) => {
    const q = section.questions?.[0];
    if (!q) return null;
    const qIdx = 0;
    const options = Array.isArray(q.options) ? q.options : [];
    const people = Array.isArray(q.people) ? q.people : [];
    const examplePerson = people[0];
    const questionPeople = people.slice(1).filter((p) => String(p?.name || '').trim());
    const partStart = sectionStartNum;

    const placedLetters = new Set(
      questionPeople
        .map((_, i) => answers[`${currentPartIndex}-${secIdx}-${qIdx}-${i + 1}`])
        .filter(Boolean)
    );

    const handleDragStart = (e, letter) => {
      e.dataTransfer.setData('text/plain', letter);
      e.dataTransfer.effectAllowed = 'move';
    };

    return (
      <div>
        {/* Context instruction */}
        {q.questionText && (
          <div style={{
            fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#6b7280',
            fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5,
            padding: '8px 12px',
            background: isDarkMode ? '#1e293b' : '#fafafa',
            borderRadius: '9px',
            border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
          }}>
            {q.questionText}
          </div>
        )}

        {/* Two-column: people+dropzones left | draggable tiles right */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Left: people rows with drop zones ── */}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            {/* Example row */}
            {examplePerson && String(examplePerson.name || '').trim() && (() => {
              const exOpt = options.find((o) => o.letter === examplePerson.correctAnswer);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', marginBottom: '6px',
                  background: isDarkMode ? '#0f172a' : '#f8fafc',
                  border: `2px dashed ${isDarkMode ? '#334155' : '#94a3b8'}`,
                  borderRadius: '11px',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '28px', height: '28px', borderRadius: '50%',
                    background: isDarkMode ? '#1e293b' : '#e2e8f0',
                    color: isDarkMode ? '#94a3b8' : '#475569',
                    fontWeight: 800, fontSize: '11px', flexShrink: 0,
                  }}>Ex</span>
                  {examplePerson.photoUrl && (
                    <img src={resolveImgSrc(examplePerson.photoUrl)} alt="" draggable={false}
                      style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: isDarkMode ? '#94a3b8' : '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {examplePerson.name}
                  </span>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '9px',
                    border: `3px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: isDarkMode ? '#1e3a5f' : '#eff6ff', overflow: 'hidden', flexShrink: 0,
                  }}>
                    {exOpt?.imageUrl && (
                      <img src={resolveImgSrc(exOpt.imageUrl)} alt="" draggable={false}
                        style={{ width: '100%', height: '40px', objectFit: 'contain' }} />
                    )}
                    <span style={{ fontWeight: 900, fontSize: '13px', color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
                      {examplePerson.correctAnswer}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: isDarkMode ? '#475569' : '#94a3b8', flexShrink: 0 }}>(ex)</span>
                </div>
              );
            })()}

            {/* Question people rows */}
            {questionPeople.map((person, i) => {
              const personIdx = i + 1;
              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${personIdx}`;
              const userAnswer = answers[key] || '';
              const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
              const isActive = activeQuestion === key;
              const placedOpt = userAnswer ? options.find((o) => o.letter === userAnswer) : null;
              const rowBorder = submitted
                ? (isCorrect ? '#22c55e' : '#ef4444')
                : isActive ? '#8b5cf6' : userAnswer ? '#8b5cf6'
                : isDarkMode ? '#334155' : '#e2e8f0';
              const dzBorder = submitted
                ? (isCorrect ? '#22c55e' : '#ef4444')
                : userAnswer ? '#8b5cf6' : (isDarkMode ? '#475569' : '#c4b5fd');

              return (
                <div
                  key={personIdx}
                  id={`question-${partStart + i}`}
                  ref={(el) => { questionRefs.current[key] = el; }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', marginBottom: '5px',
                    background: isDarkMode ? (isActive ? '#1e293b' : '#111827') : (isActive ? '#faf5ff' : '#fff'),
                    border: `2px solid ${rowBorder}`,
                    borderRadius: '11px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: isActive ? `0 0 0 3px ${isDarkMode ? '#7c3aed30' : '#8b5cf630'}` : 'none',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '28px', height: '28px', borderRadius: '50%',
                    background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : '#8b5cf6',
                    color: '#fff', fontWeight: 800, fontSize: '13px', flexShrink: 0,
                  }}>
                    {submitted ? (isCorrect ? '✓' : '✗') : partStart + i}
                  </span>
                  {person.photoUrl && (
                    <img src={resolveImgSrc(person.photoUrl)} alt="" draggable={false}
                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '16px', color: isDarkMode ? '#e2e8f0' : '#1e293b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.name}
                  </span>
                  {/* Drop zone with release button */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {userAnswer && !submitted && (
                      <button
                        type="button"
                        title="Bỏ chọn"
                        onClick={() => setAnswers((prev) => ({ ...prev, [key]: '' }))}
                        style={{
                          position: 'absolute', top: '-9px', right: '-9px',
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: '#ef4444', color: '#fff', border: '2px solid white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 900, lineHeight: 1,
                          boxShadow: '0 1px 5px rgba(239,68,68,0.5)',
                          zIndex: 20, padding: 0,
                        }}
                      >✕</button>
                    )}
                    <div
                      onDragOver={(e) => { e.preventDefault(); if (!submitted) { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = isDarkMode ? '#2d1b69' : '#ede9fe'; } }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
                      onDrop={(e) => handleLetterMatchingDrop(e, key, questionPeople, secIdx)}
                      style={{
                        width: '70px', minWidth: '70px', height: '70px',
                        border: `3px ${userAnswer ? 'solid' : 'dashed'} ${dzBorder}`,
                        borderRadius: '10px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                        background: userAnswer
                          ? (submitted ? (isCorrect ? (isDarkMode ? '#14532d' : '#dcfce7') : (isDarkMode ? '#450a0a' : '#fee2e2')) : (isDarkMode ? '#2d1b69' : '#f5f3ff'))
                          : (isDarkMode ? '#111827' : '#f8fafc'),
                        cursor: submitted ? 'default' : 'copy',
                        overflow: 'hidden',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      {userAnswer ? (
                        <>
                          {placedOpt?.imageUrl && (
                            <img src={resolveImgSrc(placedOpt.imageUrl)} alt="" draggable={false}
                              style={{ width: '100%', height: '52px', objectFit: 'contain', pointerEvents: 'none' }} />
                          )}
                          <span style={{ fontWeight: 900, fontSize: '14px', color: submitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#7c3aed' }}>
                            {userAnswer}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '22px', color: isDarkMode ? '#4b5563' : '#d1d5db', pointerEvents: 'none' }}>?</span>
                      )}
                    </div>
                  </div>
                  {submitted && !isCorrect && (
                    <span style={{ fontSize: '12px', fontWeight: 900, flexShrink: 0, color: '#22c55e' }}>
                      → {results?.answers?.[key]?.correctAnswer || ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Right: draggable option tiles (2 columns, horizontal badge+image) ── */}
          <div style={{ flexShrink: 0, width: '260px' }}>
            <div style={{
              textAlign: 'center', marginBottom: '10px',
              fontSize: '14px', fontWeight: 800,
              color: isDarkMode ? '#a5b4fc' : '#7c3aed',
            }}>
              🖐️ Kéo hình → ô bên trái
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {options.map((opt, tileIdx) => {
                const isPlaced = placedLetters.has(opt.letter);
                return (
                  <div
                    key={opt.letter}
                    draggable={!submitted}
                    onDragStart={(e) => handleDragStart(e, opt.letter)}
                    className={`lm-tile${isPlaced ? '' : ' lm-tile-idle'}`}
                    style={{
                      '--tile-delay': `${tileIdx * 50}ms`,
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px',
                      padding: '8px 10px',
                      border: `3px solid ${isPlaced ? (isDarkMode ? '#312e81' : '#bfdbfe') : (isDarkMode ? '#4f46e5' : '#a5b4fc')}`,
                      borderRadius: '14px',
                      background: isPlaced ? (isDarkMode ? '#0f172a' : '#eff6ff') : (isDarkMode ? '#1e1b4b' : '#f5f3ff'),
                      opacity: isPlaced ? 0.38 : 1,
                      cursor: submitted ? 'default' : 'grab',
                      transition: 'opacity 0.25s, border-color 0.2s, transform 0.15s, box-shadow 0.2s',
                      userSelect: 'none', WebkitUserSelect: 'none',
                      boxShadow: isPlaced ? 'none' : `0 3px 10px ${isDarkMode ? 'rgba(99,102,241,0.22)' : 'rgba(139,92,246,0.2)'}`,
                    }}
                  >
                    {/* Letter badge left */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                      background: isPlaced ? '#64748b' : '#4f46e5',
                      color: '#fff', fontWeight: 900, fontSize: '18px',
                      boxShadow: isPlaced ? 'none' : '0 2px 5px rgba(79,70,229,0.4)',
                    }}>
                      {opt.letter}
                    </div>
                    {/* Image right */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {opt.imageUrl ? (
                        <img
                          src={resolveImgSrc(opt.imageUrl)}
                          alt={opt.letter}
                          draggable={false}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', pointerEvents: 'none', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          height: '100px', width: '100%', borderRadius: '8px',
                          background: isDarkMode ? '#1e1b4b' : '#ede9fe',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isDarkMode ? '#a5b4fc' : '#7c3aed', fontSize: '13px', fontWeight: 700,
                        }}>
                          {opt.description || opt.letter}
                        </div>
                      )}
                      {opt.description && opt.imageUrl && (
                        <div style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '4px', fontWeight: 600, textAlign: 'center', pointerEvents: 'none' }}>
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderLetterMatchingSection = (section, secIdx) => {
    const q = section.questions?.[0];
    if (!q) return null;
    const qIdx = 0;
    const options = Array.isArray(q.options) ? q.options : [];
    const people = Array.isArray(q.people) ? q.people : [];
    const questionPeople = people.slice(1).filter((p) => String(p?.name || '').trim());
    const exampleLetter = people[0]?.correctAnswer;

    const placedLetters = new Set(
      questionPeople
        .map((_, i) => answers[`${currentPartIndex}-${secIdx}-${qIdx}-${i + 1}`])
        .filter(Boolean)
    );

    const handleDragStart = (e, letter) => {
      e.dataTransfer.setData('text/plain', letter);
      e.dataTransfer.effectAllowed = 'move';
    };

    return (
      <div>
        {/* Instruction */}
        <div style={{
          textAlign: 'center', paddingBottom: '16px',
          fontSize: '15px', fontWeight: 800,
          color: isDarkMode ? '#a5b4fc' : '#7c3aed',
          letterSpacing: '0.04em',
        }}>
          🖐️ Kéo hình → ô bên trái
        </div>

        {/* Draggable option tiles 2 columns – letter badge LEFT, image fills rest */}
        {options.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {options.map((opt, tileIdx) => {
              const isPlaced = placedLetters.has(opt.letter);
              const isExample = opt.letter === exampleLetter;
              return (
                <div
                  key={opt.letter}
                  draggable={!submitted && !isExample}
                  onDragStart={(e) => !isExample && handleDragStart(e, opt.letter)}
                  className={`lm-tile${(isPlaced || isExample) ? '' : ' lm-tile-idle'}`}
                  style={{
                    '--tile-delay': `${tileIdx * 60}ms`,
                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    border: `3px solid ${isExample
                      ? (isDarkMode ? '#475569' : '#94a3b8')
                      : isPlaced
                        ? (isDarkMode ? '#312e81' : '#bfdbfe')
                        : (isDarkMode ? '#4f46e5' : '#a5b4fc')}`,
                    borderRadius: '16px',
                    background: isExample
                      ? (isDarkMode ? '#0f172a' : '#f8fafc')
                      : isPlaced
                        ? (isDarkMode ? '#0f172a' : '#eff6ff')
                        : (isDarkMode ? '#1e1b4b' : '#f5f3ff'),
                    opacity: (isPlaced || isExample) ? 0.45 : 1,
                    cursor: (submitted || isExample) ? 'default' : 'grab',
                    position: 'relative',
                    transition: 'opacity 0.25s, border-color 0.2s, transform 0.15s, box-shadow 0.2s',
                    userSelect: 'none', WebkitUserSelect: 'none',
                    boxShadow: isPlaced ? 'none' : `0 3px 12px ${isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.22)'}`,
                  }}
                >
                  {/* Letter badge – left side */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: isExample ? '#94a3b8' : isPlaced ? '#64748b' : '#4f46e5',
                    color: '#fff', fontWeight: 900, fontSize: '20px',
                    boxShadow: (isPlaced || isExample) ? 'none' : '0 2px 6px rgba(79,70,229,0.45)',
                  }}>
                    {opt.letter}
                  </div>
                  {/* Activity image – right side, fills remaining space */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {opt.imageUrl ? (
                      <img
                        src={resolveImgSrc(opt.imageUrl)}
                        alt={opt.letter}
                        draggable={false}
                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', pointerEvents: 'none', display: 'block' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        height: '150px', width: '100%', borderRadius: '10px',
                        background: isDarkMode ? '#1e1b4b' : '#ede9fe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isDarkMode ? '#a5b4fc' : '#7c3aed', fontSize: '14px', fontWeight: 700,
                      }}>
                        {opt.description || opt.letter}
                      </div>
                    )}
                    {opt.description && opt.imageUrl && (
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '5px', pointerEvents: 'none', fontWeight: 600, textAlign: 'center' }}>
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {/* "Ex" badge overlay for example tile */}
                  {isExample && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      background: '#64748b', color: '#fff',
                      fontSize: '11px', fontWeight: 900,
                      padding: '2px 7px', borderRadius: '20px',
                      border: '2px solid #fff',
                      pointerEvents: 'none',
                    }}>Ex</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Part 4: "Listen and tick (✓) the box" – image multiple choice ────────
  const renderImageTickSection = (section, secIdx, sectionStartNum) => (
    <ImageTickSlideSection
      questions={Array.isArray(section.questions) ? section.questions : []}
      exampleItem={section.exampleItem || null}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      answers={answers}
      submitted={submitted}
      results={results}
      isDarkMode={isDarkMode}
      handleAnswerChange={handleAnswerChange}
      currentPartIndex={currentPartIndex}
      questionRefs={questionRefs}
      resolveImgSrc={resolveImgSrc}
      activeQuestion={activeQuestion}
      onSlideChange={(qi) => setActiveQuestion(`${currentPartIndex}-${secIdx}-${qi}`)}
    />
  );

  // ── Part 5: Colour and Write (rendered by ColourWriteStudentSection above) ──
  const renderColourWriteSection = (section, secIdx, sectionStartNum) => (
    <ColourWriteStudentSection
      questions={Array.isArray(section.questions) ? section.questions : []}
      exampleItem={section.exampleItem || null}
      sceneImageUrl={section.sceneImageUrl ? resolveImgSrc(section.sceneImageUrl) : ''}
      secIdx={secIdx}
      sectionStartNum={sectionStartNum}
      answers={answers}
      submitted={submitted}
      results={results}
      isDarkMode={isDarkMode}
      handleAnswerChange={handleAnswerChange}
      currentPartIndex={currentPartIndex}
      questionRefs={questionRefs}
    />
  );

  // Handle checkbox change for multi-select
  /* eslint-disable-next-line no-unused-vars */
  const handleCheckboxChange = useCallback(
    (questionKey, optionIndex, checked, maxSelections = 2) => {
      if (submitted) return;

      setAnswers((prev) => {
        const currentAnswers = prev[questionKey] || [];
        let newAnswers;

        if (checked) {
          if (currentAnswers.length < maxSelections) {
            newAnswers = [...currentAnswers, optionIndex];
          } else {
            return prev;
          }
        } else {
          newAnswers = currentAnswers.filter((idx) => idx !== optionIndex);
        }

        return { ...prev, [questionKey]: newAnswers };
      });
    },
    [submitted]
  );

  // Handle submit
  const handleSubmit = () => setShowConfirm(true);

  const toggleFlag = useCallback((questionKey) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionKey)) next.delete(questionKey);
      else next.add(questionKey);
      return next;
    });
  }, []);

  // Divider resize handlers (match Reading UI)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 20% and 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Part 3 letter-matching: 50/50 split mặc định
  useEffect(() => {
    if (!isSinglePanelPart && currentPartIndex === 2) {
      setLeftWidth(50);
    }
  }, [currentPartIndex, isSinglePanelPart]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const currentKeyIndex = useMemo(() => {
    const list = questionIndex?.orderedKeys || [];
    if (!activeQuestion) return 0;
    const idx = list.findIndex((it) => it.key === activeQuestion);
    return idx >= 0 ? idx : 0;
  }, [questionIndex, activeQuestion]);

  const totalQuestions = useMemo(() => {
    return questionIndex?.orderedKeys?.length || 0;
  }, [questionIndex]);

  const answeredCount = useMemo(() => {
    const list = questionIndex?.orderedKeys || [];
    const isAnswered = (val) => {
      if (Array.isArray(val)) return val.length > 0;
      if (val && typeof val === 'object') return Object.keys(val).length > 0;
      return String(val ?? '').trim() !== '';
    };
    return list.reduce((acc, item) => {
      if (isAnswered(answers[item.key])) return acc + 1;
      // draw-lines sub-answers are stored as `key-nameIdx`; count the block as answered if any sub-answer exists
      const hasSubAnswer = Object.keys(answers).some(
        (k) => k.startsWith(`${item.key}-`) && isAnswered(answers[k])
      );
      return hasSubAnswer ? acc + 1 : acc;
    }, 0);
  }, [questionIndex, answers]);

  const goToKeyIndex = useCallback(
    (idx) => {
      const list = questionIndex?.orderedKeys || [];
      if (idx < 0 || idx >= list.length) return;
      const next = list[idx];
      setCurrentPartIndex(next.partIndex);
      setExpandedPart(next.partIndex);
      setActiveQuestion(next.key);

      // Focus the matching blank/input if it exists (Open Cloze and similar).
      if (next?.number) {
        setTimeout(() => {
          const el = document.getElementById(`question-${next.number}`);
          if (el && typeof el.focus === 'function') {
            el.focus({ preventScroll: true });
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 0);
      }
    },
    [questionIndex]
  );

  // Confirm and submit
  const confirmSubmit = async () => {
    try {
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const initialTime = (testConfig.duration || 30) * 60;
      const timeSpent = initialTime - timeRemaining;

      const res = await fetch(apiPath(`cambridge/listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answers,
          studentName: user.name || user.username || 'Unknown',
          studentPhone: user.phone || null,
          studentEmail: user.email || null,
          classCode: test?.classCode || null,
          userId: user.id || null,
          timeRemaining,
          timeSpent
        }),
      });

      if (!res.ok) throw new Error("Lỗi khi nộp bài");

      const data = await res.json();

      endTimeRef.current = null;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      
      // Navigate to result page with submission data
      navigate(`/cambridge/result/${data.submissionId}`, {
        state: {
          submission: {
            ...data,
            testTitle: test?.title,
            testType: testType,
            timeSpent,
            classCode: test?.classCode,
            submittedAt: new Date().toISOString()
          },
          test
        }
      });
    } catch (err) {
      console.error("Error submitting:", err);
      // For now, calculate locally if backend not ready
      const localResults = calculateLocalResults();
      setResults(localResults);
      setSubmitted(true);
      setShowConfirm(false);
      endTimeRef.current = null;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  };

  // Calculate results locally (fallback)
  const calculateLocalResults = () => {
    let correct = 0;
    let total = 0;

    test?.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        const q0 = section?.questions?.[0] || {};
        const sectionType =
          section?.questionType ||
          q0?.questionType ||
          q0?.type ||
          (Array.isArray(q0?.people) ? 'people-matching' : '') ||
          (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
          (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
          '';
        section.questions?.forEach((q, qIdx) => {
          if (sectionType === 'gap-match' && Array.isArray(q?.leftItems)) {
            q.leftItems.forEach((_, itemIdx) => {
              total++;
              const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
              const userAnswer = answers[key];
              const correctAnswer = Array.isArray(q?.correctAnswers) ? q.correctAnswers[itemIdx] : undefined;
              if (correctAnswer && String(userAnswer || '').trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
                correct++;
              }
            });
            return;
          }

          total++;
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];

          if (q.correctAnswer) {
            if (typeof q.correctAnswer === 'string') {
              if (userAnswer?.toLowerCase?.() === q.correctAnswer.toLowerCase()) {
                correct++;
              }
            } else if (userAnswer === q.correctAnswer) {
              correct++;
            }
          }
        });
      });
    });

    return {
      score: correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  // Calculate question number range for a part
  const getPartQuestionRange = useCallback((partIndex) => {
    const range = questionIndex?.byPart?.[partIndex];
    if (range && typeof range.start === 'number' && typeof range.end === 'number') {
      return { start: range.start, end: range.end };
    }

    if (!test?.parts) return { start: 1, end: 1 };

    let startNum = 1;
    for (let p = 0; p < partIndex; p++) {
      const part = test.parts[p];
      for (const sec of part?.sections || []) {
        startNum += sec.questions?.length || 0;
      }
    }

    let count = 0;
    for (const sec of test.parts[partIndex]?.sections || []) {
      count += sec.questions?.length || 0;
    }

    return { start: startNum, end: startNum + count - 1 };
  }, [questionIndex, test?.parts]);

  // Render question based on type
  const renderQuestion = (question, questionKey, questionNum) => (
    <CambridgeQuestionDisplay
      question={question}
      questionKey={questionKey}
      questionNum={questionNum}
      answers={answers}
      submitted={submitted}
      results={results}
      activeQuestion={activeQuestion}
      styles={styles}
      handleAnswerChange={handleAnswerChange}
      toggleFlag={toggleFlag}
      flaggedQuestions={flaggedQuestions}
      isDarkMode={isDarkMode}
      currentPart={currentPart}
      questionRefs={questionRefs}
      resolveImgSrc={resolveImgSrc}
      DrawLinesComponent={DrawLinesQuestion}
    />
  );
  const renderCompactQuestion = (question, questionKey, questionNum) => (
    <CompactCambridgeQuestionDisplay
      question={question}
      questionKey={questionKey}
      questionNum={questionNum}
      answers={answers}
      submitted={submitted}
      results={results}
      activeQuestion={activeQuestion}
      styles={styles}
      handleAnswerChange={handleAnswerChange}
      questionRefs={questionRefs}
      isDarkMode={isDarkMode}
    />
  );
  // Loading state
  if (loading) {
    return (
      <div className="cambridge-loading">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2>Đang tải đề thi...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cambridge-error">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Lỗi: {error}</h2>
        <button onClick={() => navigate(-1)} className="cambridge-nav-button">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="cambridge-test-container">
      {/* Header */}
      <TestHeader
        title={testConfig.name}
        examType={examType}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={formatTime(timeRemaining)}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        audioStatusText={hasAnyAudio && isAudioPlaying ? 'Audio is playing' : ''}
        onSubmit={handleSubmit}
        submitted={submitted}
      />

      {/* Hidden global audio element (used when a single audio file is provided for the whole test) */}
      {audioMeta.usesMain && resolvedAudioSrc && (
        <audio
          ref={audioRef}
          data-listening-audio="true"
          src={resolvedAudioSrc}
          preload="auto"
          controls={false}
          controlsList="nodownload noplaybackrate"
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onTimeUpdate={handleAudioTimeUpdate}
          onSeeking={handleAudioSeeking}
          onEnded={handleAudioEnded}
          onError={(e) => {
            const mediaErr = e?.currentTarget?.error;
            const code = mediaErr?.code;
            setAudioError(
              `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
            );
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ display: 'none' }}
        >
          Your browser does not support audio.
        </audio>
      )}

      {/* Global audio bar (single audio for whole test) */}
      {showGlobalAudioBar && (
        <div
          className="cambridge-global-audio"
          style={{ padding: '10px 24px', background: isDarkMode ? '#111827' : '#f8fafc', borderBottom: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}` }}
        >
          <div style={styles.audioContainer}>
            <span style={{ marginRight: '12px' }}>🎧</span>
            <div style={{ flex: 1, fontSize: 14, color: isDarkMode ? '#e5e7eb' : '#0f172a' }}>
              Global audio is ready for this test.
            </div>
            <div
              style={styles.audioTipWrap}
              onMouseEnter={() => setShowAudioTip(true)}
              onMouseLeave={() => setShowAudioTip(false)}
            >
              <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                i
              </button>
              {showAudioTip && (
                <div style={styles.audioTipBubble} role="tooltip">
                  No pause / no rewind
                </div>
              )}
            </div>
          </div>

          {audioError && (
            <div style={styles.audioErrorBox} role="alert">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
              <div style={{ marginBottom: 8 }}>{audioError}</div>
              <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                Open audio in a new tab
              </a>
            </div>
          )}
        </div>
      )}

      {/* Cambridge-style Play gate overlay */}
      {isStartGateVisible && (
        <div
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1200, padding: '16px' }}
          role="dialog" aria-modal="true" tabIndex={-1}
        >
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(15,23,42,0.35)' }}>

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #0ea5e9 100%)', padding: '26px 28px 22px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  🎧
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Cambridge {examType}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>Listening Test</div>
                </div>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3, position: 'relative', zIndex: 1, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                {test?.title || testConfig.name || 'Cambridge Listening'}
              </h2>
            </div>

            {/* ── Body ── */}
            <div style={{ background: isDarkMode ? '#1e293b' : '#fff', padding: '22px 24px' }}>

              {/* Info cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: isDarkMode ? '#0c4a6e33' : '#e0f2fe', border: `1px solid ${isDarkMode ? '#0369a1' : '#bae6fd'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1', lineHeight: 1 }}>{Math.round(timeRemaining / 60)}</div>
                  <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>Phút</div>
                </div>
                <div style={{ background: isDarkMode ? '#14532d33' : '#f0fdf4', border: `1px solid ${isDarkMode ? '#16a34a' : '#bbf7d0'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{totalQuestions}</div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>Câu hỏi</div>
                </div>
              </div>

              {/* Audio warning */}
              <div style={{ background: isDarkMode ? '#1c1917' : '#fff7ed', border: `1px solid ${isDarkMode ? '#92400e' : '#fed7aa'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 13, marginBottom: 4 }}>⚠️ Lưu ý quan trọng</div>
                <div style={{ fontSize: 13, color: isDarkMode ? '#fdba74' : '#9a3412', lineHeight: 1.5 }}>
                  Audio sẽ bắt đầu phát ngay khi bạn nhấn Play. Bạn <b>không thể tạm dừng hoặc tua lại</b> trong khi làm bài.
                </div>
              </div>

              {audioError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Lỗi âm thanh</div>
                  <div style={{ marginBottom: 6 }}>{audioError}</div>
                  <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                    Mở audio trong tab mới →
                  </a>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{ padding: '9px 18px', borderRadius: 20, border: `1.5px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, background: isDarkMode ? '#1e293b' : '#fff', fontSize: 13, fontWeight: 600, color: isDarkMode ? '#94a3b8' : '#64748b', cursor: 'pointer' }}
                >
                  Thoát
                </button>
                <button
                  type="button"
                  onClick={handlePlayGate}
                  style={{ padding: '11px 28px', borderRadius: 20, background: 'linear-gradient(135deg, #0369a1, #0ea5e9)', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(3,105,161,0.4)' }}
                >
                  {hasResumeAudio ? '▶ Tiếp tục' : '▶ Play & Bắt đầu'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Letter-matching instruction – sits above both panels */}
      {!isSinglePanelPart && currentPart && (() => {
        const isLetterMatchPart = currentPart?.sections?.some(
          (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
        );
        if (!isLetterMatchPart) return null;
        const range = getPartQuestionRange(currentPartIndex);
        const instructionText = String(currentPart.instruction || '');
        const hasQRange = /question(s)?\s*\d+/i.test(instructionText);
        return (
          <div className="cambridge-part-instruction" style={{ padding: '10px 20px', flexShrink: 0 }}>
            {!hasQRange && <strong>Questions {range.start}–{range.end}</strong>}
            <div style={{ marginTop: 6 }}>
              {renderMaybeHtml(instructionText || 'For each question, choose the correct answer.')}
            </div>
          </div>
        );
      })()}

      {/* Main Content */}
      <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
        {isSinglePanelPart ? (
          // Part 1: single panel (teacher request)
          <div className="cambridge-questions-column" style={{ width: '100%' }}>
            <div className="cambridge-content-wrapper">
              {currentPart && (
                <>
                  {(() => {
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <div className="cambridge-part-instruction" style={{ marginBottom: 14 }}>
                        {!hasQuestionRangeInInstruction && (
                          <strong>Questions {range.start}–{range.end}</strong>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                        </div>
                      </div>
                    );
                  })()}

                  {resolvedAudioSrc && !audioMeta.usesMain && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <span style={{ marginRight: '12px' }}>🎧</span>
                      <audio
                        ref={audioRef}
                        data-listening-audio="true"
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ flex: 1, width: '100%' }}
                      >
                        Your browser does not support audio.
                      </audio>
                      <div
                        style={styles.audioTipWrap}
                        onMouseEnter={() => setShowAudioTip(true)}
                        onMouseLeave={() => setShowAudioTip(false)}
                      >
                        <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                          i
                        </button>
                        {showAudioTip && (
                          <div style={styles.audioTipBubble} role="tooltip">
                            No pause / no rewind
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolvedAudioSrc && audioError && !audioMeta.usesMain && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}

                  {/* Part scene image – hidden for draw-lines parts (image is rendered inside DrawLinesQuestion itself) */}
                  {currentPart?.imageUrl && (() => {
                    const q = currentPart?.sections?.[0]?.questions?.[0];
                    if (q?.questionType === 'draw-lines') return false;
                    if (q?.anchors && Object.keys(q.anchors).length > 0) return false;
                    return true;
                  })() && (
                    <div style={{ margin: '12px 0 18px', textAlign: 'center' }}>
                      <img
                        src={resolveImgSrc(currentPart.imageUrl)}
                        alt="Part illustration"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '480px',
                          objectFit: 'contain',
                          borderRadius: '10px',
                          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {currentPart &&
                currentPart.sections?.map((section, secIdx) => {
                  const partRange = getPartQuestionRange(currentPartIndex);
                  const sectionStartNum =
                    questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                    partRange.start;

                  const isGroupedPart = currentPartIndex === 2 || currentPartIndex === 3; // Parts 3-4

                  // Teacher wants Part 1 displayed one question at a time (like the Cambridge player).
                  // We use the global `activeQuestion` key to decide which question to show.
                  const partKeys = questionIndex?.byPart?.[currentPartIndex]?.keys || [];
                  const defaultActiveKey = partKeys?.[0]?.key;
                  const activeKeyForPart =
                    activeQuestion && String(activeQuestion).startsWith(`${currentPartIndex}-`)
                      ? activeQuestion
                      : defaultActiveKey;

                  // Robust section type detection (some legacy data stores type on question instead of section)
                  const q0 = section?.questions?.[0] || {};
                  const rawSectionType =
                    section?.questionType ||
                    q0?.questionType ||
                    q0?.type ||
                    (Array.isArray(q0?.people) ? 'people-matching' : '') ||
                    (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
                    (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
                    '';
                  // Auto-upgrade: MOVERS Listening Part 4 was previously 'fill' – treat as 'image-tick'
                  // Auto-upgrade: MOVERS Listening Part 5 was previously 'fill' – treat as 'colour-write'
                  const sectionType =
                    rawSectionType === 'fill' &&
                    String(testType || '').includes('movers') &&
                    currentPartIndex === 3
                      ? 'image-tick'
                      : rawSectionType === 'fill' &&
                        String(testType || '').includes('movers') &&
                        currentPartIndex === 4
                        ? 'colour-write'
                        : rawSectionType;

                  return (
                    <div key={secIdx} className="cambridge-section">
                      {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}
                      {sectionType === 'fill' && renderFillExample(section, sectionStartNum)}

                      {/* Section-based types (KET Reading style) */}
                      {sectionType === 'long-text-mc' && section.questions?.[0]?.questions ? (
                        (() => {
                          const qIdx = 0;
                          const container = section.questions[0] || {};
                          const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                          const nested = Array.isArray(container.questions) ? container.questions : [];
                          return (
                            <div>
                              {passageHtml ? (
                                <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                  <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                    {renderMaybeHtml(passageHtml)}
                                  </div>
                                </div>
                              ) : null}

                              {nested.map((nq, nestedIdx) => {
                                const key = `${currentPartIndex}-${secIdx}-${qIdx}-${nestedIdx}`;
                                const num = sectionStartNum + nestedIdx;
                                const opts = nq.options || [];
                                const userAnswer = answers[key] || '';
                                const correct = nq.correctAnswer;
                                const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();
                                return (
                                  <div
                                    key={key}
                                    ref={(el) => (questionRefs.current[key] = el)}
                                    className={
                                      `cambridge-question-wrapper ` +
                                      `${userAnswer ? 'answered' : ''} ` +
                                      `${activeQuestion === key ? 'active-question' : ''}`
                                    }
                                  >
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                    </button>

                                    <div style={{ paddingRight: '50px' }}>
                                      <div className="cambridge-question-header">
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
                                      </div>

                                      <div style={styles.optionsContainer}>
                                        {opts.map((opt, i) => {
                                          const letter = String.fromCharCode(65 + i);
                                          const isSelected = userAnswer === letter;
                                          const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                          return (
                                            <label
                                              key={letter}
                                              style={{
                                                ...styles.optionLabel,
                                                ...(isSelected && styles.optionSelected),
                                                ...(submitted && isCorrectOption && styles.optionCorrect),
                                                ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={key}
                                                checked={isSelected}
                                                onChange={() => handleAnswerChange(key, letter)}
                                                disabled={submitted}
                                                style={{ marginRight: '10px' }}
                                              />
                                              <span style={styles.optionText}>{opt}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      {submitted && correct && !isCorrect && (
                                        <div style={styles.correctAnswer}>✓ Đáp án đúng: {correct}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : sectionType === 'cloze-mc' && section.questions?.[0]?.clozeText ? (
                        (() => {
                          // fall through to existing renderer below in the 2-panel branch
                          return null;
                        })()
                      ) : sectionType === 'gap-match' ? (
                        renderGapMatchSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'cloze-test' ? (
                        renderOpenClozeSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'letter-matching' ? (
                        renderLetterMatchingSectionFull(section, secIdx, sectionStartNum)
                      ) : sectionType === 'image-tick' ? (
                        renderImageTickSection(section, secIdx, sectionStartNum)
                      ) : sectionType === 'colour-write' ? (
                        renderColourWriteSection(section, secIdx, sectionStartNum)
                      ) : isGroupedPart ? (
                        <div
                          className="cambridge-question-wrapper"
                          style={{ padding: '10px 12px' }}
                        >
                          {section.questions?.map((q, qIdx) => {
                            const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;
                            return renderCompactQuestion(q, questionKey, sectionStartNum + qIdx);
                          })}
                        </div>
                      ) : (
                        // Default per-question rendering
                        section.questions?.map((q, qIdx) => {
                          const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;

                          // draw-lines renders all names as one block → always show, never filter by active sub-key
                          const isDrawLinesQ = q.questionType === 'draw-lines' || (q.anchors && Object.keys(q.anchors || {}).length > 0);
                          // Part 1: render only the active question card (except draw-lines which is a single interactive block).
                          if (!isDrawLinesQ && currentPartIndex === 0 && activeKeyForPart && questionKey !== activeKeyForPart) return null;

                          return (
                            <div key={qIdx} ref={(el) => (questionRefs.current[questionKey] = el)}>
                              {renderQuestion(q, questionKey, sectionStartNum + qIdx)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          // Other parts: keep 2-column Cambridge layout
          <>
            {/* Left Column: Audio + Instructions */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              {currentPart && (
                <div className="cambridge-passage-container">
                  {(() => {
                    const isLetterMatchPart = currentPart?.sections?.some(
                      (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
                    );
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <>
                        {!isLetterMatchPart && (
                          <div className="cambridge-part-instruction">
                            {!hasQuestionRangeInInstruction && (
                              <strong>Questions {range.start}–{range.end}</strong>
                            )}
                            <div style={{ marginTop: 6 }}>
                              {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                            </div>
                          </div>
                        )}

                        {/* Part illustration image (e.g. MOVERS Part 2 form picture) */}
                        {currentPart.imageUrl && (
                          <div style={{ marginTop: 12 }}>
                            {/* Tiêu đề hiển thị trên ảnh (lưu tại section.imageTitle) */}
                            {(() => {
                              const sec0 = currentPart?.sections?.[0];
                              const title = String(sec0?.imageTitle || '').trim();
                              if (!title) return null;
                              return (
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: 800,
                                  color: isDarkMode ? '#c7d2fe' : '#4338ca',
                                  marginBottom: '10px',
                                  lineHeight: 1.4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  textAlign: 'center',
                                }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    background: isDarkMode ? '#312e81' : '#e0e7ff',
                                    fontSize: '15px', flexShrink: 0,
                                  }}>📝</span>
                                  {title}
                                </div>
                              );
                            })()}
                            <img
                              src={resolveImgSrc(currentPart.imageUrl)}
                              alt="Part illustration"
                              draggable={false}
                              style={{
                                width: '80%', borderRadius: '10px',
                                border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                display: 'block',
                              }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* LETTER MATCHING: people + drop zones live in left panel */}
                  {(() => {
                    const sec0 = currentPart?.sections?.find(
                      (s) => s?.questionType === 'letter-matching' || s?.questions?.[0]?.questionType === 'letter-matching'
                    );
                    if (!sec0) return null;
                    const q = sec0.questions?.[0];
                    if (!q) return null;
                    const secIdx = currentPart.sections.indexOf(sec0);
                    const qIdx = 0;
                    const people = Array.isArray(q.people) ? q.people : [];
                    const options = Array.isArray(q.options) ? q.options : [];
                    const examplePerson = people[0];
                    const questionPeople = people.slice(1).filter((p) => String(p?.name || '').trim());
                    const partStart = questionIndex.byPart?.[currentPartIndex]?.start ?? 1;

                    return (
                      <div style={{ marginTop: '14px' }}>
                        {/* Context text */}
                        {q.questionText && (
                          <div style={{
                            fontSize: '15px', color: isDarkMode ? '#a5b4fc' : '#4f46e5',
                            fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5,
                            padding: '10px 14px',
                            background: isDarkMode ? '#1e1b4b' : '#f5f3ff',
                            borderRadius: '12px',
                            border: `2px solid ${isDarkMode ? '#4f46e5' : '#c4b5fd'}`,
                            fontWeight: 600,
                          }}>
                            {q.questionText}
                          </div>
                        )}

                        {/* Example row */}
                        {examplePerson && String(examplePerson.name || '').trim() && (() => {
                          const exOpt = options.find((o) => o.letter === examplePerson.correctAnswer);
                          return (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 12px', marginBottom: '8px',
                              background: isDarkMode ? '#0f172a' : '#f8fafc',
                              border: `2px dashed ${isDarkMode ? '#475569' : '#94a3b8'}`,
                              borderRadius: '14px',
                            }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '34px', height: '34px', borderRadius: '50%',
                                background: isDarkMode ? '#1e293b' : '#e2e8f0',
                                color: isDarkMode ? '#94a3b8' : '#475569',
                                fontWeight: 800, fontSize: '13px', flexShrink: 0,
                              }}>Ex</span>
                              {examplePerson.photoUrl && (
                                <img src={resolveImgSrc(examplePerson.photoUrl)} alt="" draggable={false}
                                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                              )}
                              <span style={{ flex: 1, fontWeight: 800, fontSize: '20px', color: isDarkMode ? '#94a3b8' : '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {examplePerson.name}
                              </span>
                              <div style={{
                                width: '76px', height: '76px', borderRadius: '12px',
                                border: `3px solid ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: isDarkMode ? '#1e3a5f' : '#eff6ff', overflow: 'hidden', flexShrink: 0,
                              }}>
                                {exOpt?.imageUrl
                                  ? <img src={resolveImgSrc(exOpt.imageUrl)} alt="" draggable={false}
                                      style={{ width: '100%', height: '56px', objectFit: 'contain' }} />
                                  : null}
                                <span style={{ fontWeight: 900, fontSize: '16px', color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
                                  {examplePerson.correctAnswer}
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', color: isDarkMode ? '#475569' : '#94a3b8', flexShrink: 0, fontWeight: 600 }}>(ex)</span>
                            </div>
                          );
                        })()}

                        {/* Question people rows */}
                        {questionPeople.map((person, i) => {
                          const personIdx = i + 1;
                          const key = `${currentPartIndex}-${secIdx}-${qIdx}-${personIdx}`;
                          const userAnswer = answers[key] || '';
                          const isCorrect = submitted && results?.answers?.[key]?.isCorrect;
                          const isActive = activeQuestion === key;
                          const placedOpt = userAnswer ? options.find((o) => o.letter === userAnswer) : null;
                          const rowBorder = submitted
                            ? (isCorrect ? '#22c55e' : '#ef4444')
                            : isActive ? '#7c3aed' : userAnswer ? '#8b5cf6'
                            : isDarkMode ? '#4f46e5' : '#c4b5fd';
                          const dzBorder = submitted
                            ? (isCorrect ? '#22c55e' : '#ef4444')
                            : userAnswer ? '#8b5cf6' : (isDarkMode ? '#6d28d9' : '#a78bfa');
                          return (
                            <div
                              key={personIdx}
                              id={`question-${partStart + i}`}
                              ref={(el) => { questionRefs.current[key] = el; }}
                              className={`lm-person-row${isCorrect ? ' lm-correct' : ''}`}
                              style={{
                                '--row-delay': `${i * 80}ms`,
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', marginBottom: '8px',
                                background: isDarkMode
                                  ? (isActive ? '#2d1b69' : submitted ? (isCorrect ? '#14532d22' : '#450a0a22') : '#111827')
                                  : (isActive ? '#faf5ff' : submitted ? (isCorrect ? '#f0fdf4' : '#fff1f2') : '#fff'),
                                border: `2.5px solid ${rowBorder}`,
                                borderRadius: '14px',
                                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                                boxShadow: isActive
                                  ? `0 0 0 4px ${isDarkMode ? '#7c3aed44' : '#8b5cf640'}, 0 4px 16px rgba(139,92,246,0.18)`
                                  : userAnswer && !submitted ? `0 2px 10px rgba(139,92,246,0.15)` : 'none',
                              }}
                            >
                              {/* Question number badge */}
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '36px', height: '36px', borderRadius: '50%',
                                background: submitted ? (isCorrect ? '#22c55e' : '#ef4444') : '#7c3aed',
                                color: '#fff', fontWeight: 900, fontSize: '16px', flexShrink: 0,
                                boxShadow: submitted ? 'none' : '0 2px 8px rgba(124,58,237,0.4)',
                              }}>
                                {submitted ? (isCorrect ? '✓' : '✗') : partStart + i}
                              </span>
                              {/* Person photo */}
                              {person.photoUrl && (
                                <img src={resolveImgSrc(person.photoUrl)} alt={person.name} draggable={false}
                                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                              )}
                              {/* Person name */}
                              <span style={{ flex: 1, fontWeight: 800, fontSize: '22px', color: isDarkMode ? '#e2e8f0' : '#1e293b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {person.name}
                              </span>
                              {/* Drop zone wrapper – relative so ✕ button can float above */}
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                {/* Release / clear button */}
                                {userAnswer && !submitted && (
                                  <button
                                    type="button"
                                    title="Bỏ chọn"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [key]: '' }))}
                                    style={{
                                      position: 'absolute', top: '-10px', right: '-10px',
                                      width: '26px', height: '26px', borderRadius: '50%',
                                      background: '#ef4444', color: '#fff', border: '2.5px solid white',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '13px', fontWeight: 900, lineHeight: 1,
                                      boxShadow: '0 2px 8px rgba(239,68,68,0.55)',
                                      zIndex: 20, padding: 0, transition: 'transform 0.15s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                  >✕</button>
                                )}
                                {/* Drop zone – big and inviting */}
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!submitted) {
                                      e.currentTarget.style.borderColor = '#7c3aed';
                                      e.currentTarget.style.background = isDarkMode ? '#2d1b69' : '#ede9fe';
                                      e.currentTarget.style.transform = 'scale(1.08)';
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.background = '';
                                    e.currentTarget.style.transform = '';
                                  }}
                                  onDrop={(e) => { e.currentTarget.style.transform = ''; handleLetterMatchingDrop(e, key, questionPeople, secIdx); }}
                                  className={!userAnswer && !submitted ? 'lm-dropzone-empty' : ''}
                                  style={{
                                    width: '90px', minWidth: '90px', height: '90px',
                                    border: `3px ${userAnswer ? 'solid' : 'dashed'} ${dzBorder}`,
                                    borderRadius: '14px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
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
                                      {placedOpt?.imageUrl && (
                                        <img src={resolveImgSrc(placedOpt.imageUrl)} alt="" draggable={false}
                                          style={{ width: '100%', height: '64px', objectFit: 'contain', pointerEvents: 'none' }} />
                                      )}
                                      <span style={{ fontWeight: 900, fontSize: '17px', color: submitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#7c3aed', lineHeight: 1 }}>
                                        {userAnswer}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '28px', color: isDarkMode ? '#6d28d9' : '#c4b5fd', pointerEvents: 'none', lineHeight: 1 }}>?</span>
                                  )}
                                </div>
                              </div>
                              {submitted && !isCorrect && (
                                <span style={{ fontSize: '14px', fontWeight: 900, flexShrink: 0, color: '#22c55e' }}>
                                  → {results?.answers?.[key]?.correctAnswer || ''}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Audio Player */}
                  {resolvedAudioSrc && !audioMeta.usesMain && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <span style={{ marginRight: '12px' }}>🎧</span>
                      <audio
                        ref={audioRef}
                        data-listening-audio="true"
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ flex: 1, width: '100%' }}
                      >
                        Your browser does not support audio.
                      </audio>
                      <div
                        style={styles.audioTipWrap}
                        onMouseEnter={() => setShowAudioTip(true)}
                        onMouseLeave={() => setShowAudioTip(false)}
                      >
                        <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                          i
                        </button>
                        {showAudioTip && (
                          <div style={styles.audioTipBubble} role="tooltip">
                            No pause / no rewind
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolvedAudioSrc && audioError && !audioMeta.usesMain && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              style={{ left: `${leftWidth}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-ellipsis-v"></i>
              </div>
            </div>

            {/* Right Column: Questions */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper">
                {currentPart &&
                  currentPart.sections?.map((section, secIdx) => {
                const partRange = getPartQuestionRange(currentPartIndex);
                const sectionStartNum =
                  questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                  partRange.start;

                // Robust section type detection (some legacy data stores type on question instead of section)
                const q0 = section?.questions?.[0] || {};
                const sectionType =
                  (q0?.questionType === 'letter-matching' || (Array.isArray(q0?.people) && q0.people.length > 0) ? 'letter-matching' :
                   q0?.questionType === 'draw-lines' || (q0?.anchors && Object.keys(q0?.anchors || {}).length > 0) ? 'draw-lines' :
                   section?.questionType) ||
                  q0?.questionType ||
                  q0?.type ||
                  (Array.isArray(q0?.people) ? 'people-matching' : '') ||
                  (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
                  (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
                  '';

                return (
                  <div key={secIdx} className="cambridge-section">
                    {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}
                    {sectionType === 'fill' && renderFillExample(section, sectionStartNum)}

                    {/* Section-based types (KET Reading style) */}
                    {sectionType === 'long-text-mc' && section.questions?.[0]?.questions ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const nested = Array.isArray(container.questions) ? container.questions : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {nested.map((nq, nestedIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${nestedIdx}`;
                              const num = sectionStartNum + nestedIdx;
                              const opts = nq.options || [];
                              const userAnswer = answers[key] || '';
                              const correct = nq.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div className={`cambridge-question-wrapper ${userAnswer ? 'answered' : ''} ${activeQuestion === key ? 'active-question' : ''}`}>
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                    </button>

                                    <div style={{ paddingRight: '50px' }}>
                                      <div style={styles.questionHeader}>
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
                                      </div>
                                      <div style={styles.optionsContainer}>
                                        {opts.map((opt, optIdx) => {
                                          const letter = String.fromCharCode(65 + optIdx);
                                          const isSelected = userAnswer === letter;
                                          const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                          return (
                                            <label
                                              key={letter}
                                              style={{
                                                ...styles.optionLabel,
                                                ...(isSelected && styles.optionSelected),
                                                ...(submitted && isCorrectOption && styles.optionCorrect),
                                                ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={key}
                                                checked={isSelected}
                                                onChange={() => handleAnswerChange(key, letter)}
                                                disabled={submitted}
                                                style={{ marginRight: '10px' }}
                                              />
                                              <span style={styles.optionText}>{opt}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-mc' && section.questions?.[0]?.blanks ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const blanks = Array.isArray(container.blanks) ? container.blanks : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: isDarkMode ? '#111827' : '#fffbeb', borderColor: isDarkMode ? '#2a3350' : '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {blanks.map((blank, blankIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIdx}`;
                              const num = sectionStartNum + blankIdx;
                              const userAnswer = answers[key] || '';
                              const opts = blank.options || [];
                              const correct = blank.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div style={styles.questionCard}>
                                    <div style={styles.questionHeader}>
                                      <span style={styles.questionNum}>{num}</span>
                                      <span style={styles.questionText}>{blank.questionText || ''}</span>
                                    </div>
                                    <div style={styles.optionsContainer}>
                                      {opts.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const isSelected = userAnswer === letter;
                                        const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                        return (
                                          <label
                                            key={letter}
                                            style={{
                                              ...styles.optionLabel,
                                              ...(isSelected && styles.optionSelected),
                                              ...(submitted && isCorrectOption && styles.optionCorrect),
                                              ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                            }}
                                          >
                                            <input
                                              type="radio"
                                              name={key}
                                              checked={isSelected}
                                              onChange={() => handleAnswerChange(key, letter)}
                                              disabled={submitted}
                                              style={{ marginRight: '10px' }}
                                            />
                                            <span style={styles.optionText}>{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-test' ? (
                      renderOpenClozeSection(section, secIdx, sectionStartNum)
                    ) : sectionType === 'word-form' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const sentences = (Array.isArray(container.sentences) && container.sentences.length > 0)
                          ? container.sentences
                          : [
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                            ];
                        return (
                          <div>
                            {sentences.map((s, sentIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${sentIdx}`;
                              const num = sectionStartNum + sentIdx;
                              const userAnswer = answers[key] || '';
                              const sentenceText = s.sentence || s.text || '';
                              const rootWord = s.rootWord || '';
                              const correct = s.correctAnswer;
                              const isCorrect = submitted && String(userAnswer || '').trim().toLowerCase() === String(correct || '').trim().toLowerCase();

                              return (
                                <div
                                  key={key}
                                  ref={(el) => (questionRefs.current[key] = el)}
                                  className={
                                    `cambridge-question-wrapper ` +
                                    `${userAnswer ? 'answered' : ''} ` +
                                    `${activeQuestion === key ? 'active-question' : ''}`
                                  }
                                >
                                  <button
                                    className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                    onClick={() => toggleFlag(key)}
                                    aria-label="Flag question"
                                    type="button"
                                  >
                                    {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                  </button>

                                  <div style={{ paddingRight: '50px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ fontSize: '15px', lineHeight: 1.7, color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>{sentenceText}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center' }}>
                                      <div style={{ padding: '10px 12px', background: isDarkMode ? '#1f2b47' : '#fef3c7', border: `1px solid ${isDarkMode ? '#2a3350' : '#fbbf24'}`, borderRadius: '6px', color: isDarkMode ? '#e5e7eb' : '#78350f' }}>
                                        Root word: <strong>{rootWord}</strong>
                                      </div>
                                      <input
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        disabled={submitted}
                                        placeholder="Type the correct form..."
                                        style={{
                                          ...styles.input,
                                          ...(submitted && {
                                            backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                                            borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                          }),
                                        }}
                                      />
                                    </div>

                                    {submitted && correct && !isCorrect && (
                                      <div style={styles.correctAnswer}>✓ Đáp án đúng: {correct}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'gap-match' ? (
                      renderGapMatchSection(section, secIdx, sectionStartNum)
                    ) : sectionType === 'people-matching' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const getOptionLabel = (t) => {
                          const id = String(t?.id || '').trim();
                          const content = String(t?.title || t?.content || '').trim();
                          return content ? `${id} ${content}`.trim() : id;
                        };
                        const people = (Array.isArray(container.people) && container.people.length > 0)
                          ? container.people
                          : [
                              { id: 'A', name: '', need: '' },
                              { id: 'B', name: '', need: '' },
                              { id: 'C', name: '', need: '' },
                              { id: 'D', name: '', need: '' },
                              { id: 'E', name: '', need: '' },
                            ];
                        const texts = (Array.isArray(container.texts) && container.texts.length > 0)
                          ? container.texts
                          : [
                              { id: 'A', title: '', content: '' },
                              { id: 'B', title: '', content: '' },
                              { id: 'C', title: '', content: '' },
                              { id: 'D', title: '', content: '' },
                              { id: 'E', title: '', content: '' },
                              { id: 'F', title: '', content: '' },
                              { id: 'G', title: '', content: '' },
                              { id: 'H', title: '', content: '' },
                            ];
                        return (
                          <div>
                            <div className="cambridge-question-wrapper" style={{ marginBottom: '16px' }}>
                              <div >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                  <div style={{ border: `1px solid ${isDarkMode ? '#2a3350' : '#bae6fd'}`, background: isDarkMode ? '#0f172a' : '#f0f9ff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px' }}>People</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {people.map((p, idx) => {
                                        const pid = p?.id || String.fromCharCode(65 + idx);
                                        return (
                                          <div key={pid} style={{ padding: '10px', background: isDarkMode ? '#111827' : '#fff', border: `1px solid ${isDarkMode ? '#2a3350' : '#bae6fd'}`, borderRadius: '8px', color: isDarkMode ? '#e5e7eb' : undefined }}>
                                            <strong>{pid}.</strong> {p?.name || ''} {p?.need ? `— ${p.need}` : ''}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div style={{ border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`, background: isDarkMode ? '#0f172a' : '#fff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px' }}>Texts</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {texts.map((t) => (
                                        <div key={t?.id || t?.title || Math.random()} style={{ padding: '10px', background: isDarkMode ? '#111827' : '#fafafa', border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`, borderRadius: '8px', color: isDarkMode ? '#e5e7eb' : undefined }}>
                                          <strong>{String(t?.id || '').trim()}.</strong>
                                          <span style={{ marginLeft: '6px' }}>{String(t?.title || t?.content || '').trim()}</span>
                                          {t?.title && t?.content ? (
                                            <div style={{ marginTop: '6px' }}>{t?.content || ''}</div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {people.map((p, idx) => {
                                const pid = p?.id || String.fromCharCode(65 + idx);
                                const key = `${currentPartIndex}-${secIdx}-${qIdx}-${pid}`;
                                const num = sectionStartNum + idx;
                                const userAnswer = answers[key] || '';
                                const correct = container?.answers?.[pid];
                                const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();

                                return (
                                  <div
                                    key={key}
                                    ref={(el) => (questionRefs.current[key] = el)}
                                    className={
                                      `cambridge-question-wrapper ` +
                                      `${userAnswer ? 'answered' : ''} ` +
                                      `${activeQuestion === key ? 'active-question' : ''}`
                                    }
                                  >
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                    </button>

                                    <div style={{ paddingRight: '50px', display: 'grid', gridTemplateColumns: '56px 1fr 160px', gap: '12px', alignItems: 'center' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                                        <strong>{pid}.</strong> {p?.name || ''}
                                      </div>
                                      <select
                                        value={userAnswer}
                                        disabled={submitted}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        style={{
                                          padding: '10px 12px',
                                          border: `2px solid ${isDarkMode ? '#3d3d5c' : '#d1d5db'}`,
                                          borderRadius: '8px',
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          background: isDarkMode ? '#1f2b47' : '#fff',
                                          color: isDarkMode ? '#e5e7eb' : undefined,
                                          ...(submitted
                                            ? {
                                                borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                                background: isCorrect ? '#dcfce7' : '#fee2e2',
                                              }
                                            : null),
                                        }}
                                      >
                                        <option value="">—</option>
                                        {texts.map((t) => (
                                          <option key={t?.id} value={String(t?.id || '').trim()}>
                                            {getOptionLabel(t)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : section.questionType === 'short-message' && section.questions?.[0] ? (
                      (() => {
                        const qIdx = 0;
                        const q = section.questions[0] || {};
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        const num = sectionStartNum;
                        const userAnswer = answers[key] || '';
                        return (
                          <div ref={(el) => (questionRefs.current[key] = el)} style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                              <span style={styles.questionNum}>{num}</span>
                              <span style={styles.questionText}>{q.situation || 'Write a short message.'}</span>
                            </div>

                            {Array.isArray(q.bulletPoints) && q.bulletPoints.some(Boolean) && (
                              <ul style={{ marginTop: '8px', marginBottom: '12px', color: '#334155' }}>
                                {q.bulletPoints.filter(Boolean).map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}

                            <textarea
                              value={userAnswer}
                              onChange={(e) => handleAnswerChange(key, e.target.value)}
                              disabled={submitted}
                              rows={6}
                              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #d1d5db', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }}
                              placeholder="Type your answer..."
                            />
                            {submitted && (
                              <div style={{ marginTop: '10px', color: '#64748b', fontSize: '13px' }}>
                                (This question is not auto-scored.)
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : section.questionType === 'sign-message' ? (
                      section.questions?.map((q, qIdx) => {
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                            <div style={styles.questionCard}>
                              <div style={styles.questionHeader}>
                                <span style={styles.questionNum}>{sectionStartNum + qIdx}</span>
                                <span style={styles.questionText}>{q.signText || q.questionText || ''}</span>
                              </div>
                              {q.imageUrl ? (
                                <div style={{ marginBottom: '12px' }}>
                                  <img
                                    src={resolveImgSrc(q.imageUrl)}
                                    alt=""
                                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}
                                  />
                                </div>
                              ) : null}
                              <div style={styles.optionsContainer}>
                                {(q.options || []).slice(0, 3).map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  const isSelected = (answers[key] || '') === letter;
                                  const isCorrectOption = submitted && String(q.correctAnswer || '').toUpperCase() === letter;
                                  return (
                                    <label
                                      key={letter}
                                      style={{
                                        ...styles.optionLabel,
                                        ...(isSelected && styles.optionSelected),
                                        ...(submitted && isCorrectOption && styles.optionCorrect),
                                        ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={key}
                                        checked={isSelected}
                                        onChange={() => handleAnswerChange(key, letter)}
                                        disabled={submitted}
                                        style={{ marginRight: '10px' }}
                                      />
                                      <span style={styles.optionText}>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : sectionType === 'letter-matching' ? (
                      renderLetterMatchingSection(section, secIdx, sectionStartNum)
                    ) : (
                      // Default per-question rendering
                      section.questions?.map((q, qIdx) => {
                        const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={qIdx} ref={(el) => (questionRefs.current[questionKey] = el)}>
                            {renderQuestion(q, questionKey, sectionStartNum + qIdx)}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Navigation (match Cambridge Reading) */}
      <footer className="cambridge-footer">
        {/* Navigation Arrows - Top Right */}
        <div className="cambridge-footer-arrows">
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex - 1)}
            disabled={currentKeyIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex + 1)}
            disabled={currentKeyIndex >= (questionIndex?.orderedKeys?.length || 1) - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>

        {/* Parts Tabs with Question Numbers */}
        <div className="cambridge-parts-container">
          {questionIndex.byPart.map((p) => {
            const total = p.keys.length;
            const answeredInPart = p.keys.reduce((acc, item) => acc + (answers[item.key] ? 1 : 0), 0);
            const isActive = currentPartIndex === p.partIndex;
            const firstKey = p.keys?.[0]?.key;

            return (
              <div key={p.partIndex} className="cambridge-part-wrapper">
                <button
                  className={`cambridge-part-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!firstKey) return;
                    const idx = questionIndex.orderedKeys.findIndex((x) => x.key === firstKey);
                    goToKeyIndex(idx);
                  }}
                >
                  <span className="cambridge-part-label">Part</span>
                  <span className="cambridge-part-number">{p.partIndex + 1}</span>
                </button>

                {isActive && (
                  <div className="cambridge-questions-inline">
                    {p.keys.map((item) => (
                      <button
                        key={item.key}
                        className={`cambridge-question-num-btn ${answers[item.key] ? 'answered' : ''} ${activeQuestion === item.key ? 'active' : ''} ${flaggedQuestions.has(item.key) ? 'flagged' : ''}`}
                        onClick={() => {
                          const idx = questionIndex.orderedKeys.findIndex((x) => x.key === item.key);
                          goToKeyIndex(idx);
                        }}
                      >
                        {item.number}
                      </button>
                    ))}
                  </div>
                )}

                {!isActive && (
                  <span className="cambridge-part-count">
                    {answeredInPart} of {total}
                  </span>
                )}
              </div>
            );
          })}

          {/* <button
            type="button"
            className="cambridge-review-button"
            onClick={handleSubmit}
            aria-label="Review your answers"
            title="Review"
          >
            <i className="fa fa-check"></i>
            Review
          </button> */}
        </div>
      </footer>

      {/* Results Modal */}
      {submitted && results && (
        <div style={styles.resultsOverlay}>
          <div style={styles.resultsModal}>
            <h2 style={{ margin: '0 0 20px', color: '#0e276f' }}>📊 Kết quả bài thi</h2>
            <div style={styles.scoreDisplay}>
              <div style={styles.scoreNumber}>{results.score}/{results.total}</div>
              <div style={styles.scorePercent}>{results.percentage}%</div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
                📋 Chọn đề khác
              </button>
              <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
                🔄 Làm lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div style={styles.resultsOverlay}>
          <div style={styles.confirmModal}>
            <h3 style={{ margin: '0 0 16px' }}>⚠️ Xác nhận nộp bài</h3>
            <p>Bạn có chắc chắn muốn nộp bài?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Đã trả lời: {Object.keys(answers).length} câu
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={confirmSubmit} style={styles.primaryButton}>
                ✓ Nộp bài
              </button>
              <button onClick={() => setShowConfirm(false)} style={styles.secondaryButton}>
                ✕ Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoCambridgeListeningTest;

