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
const DRAWLINE_SNAP_RADIUS_PX = 28;
const DRAWLINE_ANCHOR_HIT_AREA_PX = 44;

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
            const dotSize = hasAnswer ? 28 : 24;

            const isClickableAnchor = !submitted && selectedNameIdx !== null && i !== 0 && Boolean(anchorLetter);
            // Kích thước chấm hiển thị lớn hơn khi đang chọn tên → dễ bấm hơn
            const activeDotSize = isClickableAnchor ? Math.max(dotSize, 32) : dotSize;
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
    return `cambridgeListeningProgress-${testType || 'listening'}-${id || 'unknown'}`;
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
    if (currentPartIndex >= 2 && currentPartIndex <= 4) return true; // Parts 3-5
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
                  const sectionType =
                    section?.questionType ||
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
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <>
                        <div className="cambridge-part-instruction">
                          {!hasQuestionRangeInInstruction && (
                            <strong>Questions {range.start}–{range.end}</strong>
                          )}
                          <div style={{ marginTop: 6 }}>
                            {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                          </div>
                        </div>

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
                                width: '100%', borderRadius: '10px',
                                border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                display: 'block',
                              }}
                            />
                          </div>
                        )}
                      </>
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
                  section?.questionType ||
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

