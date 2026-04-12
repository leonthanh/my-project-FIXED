import React, { useMemo, useState } from 'react';
import { hostPath } from '../../../utils/api';

/** Animated picture-bank card for MatchingPictures */
function PictureBankItem({ choice, selected, isUsed, isExample, submitted, startingNumber, usedAtIdx, onDragStart, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  const active = !isExample && !submitted;
  const scale = selected ? 1.08 : (hovered && active && !isUsed) ? 1.05 : 1;
  const translateY = selected ? -3 : (hovered && active && !isUsed) ? -2 : 0;
  const shadow = selected
    ? '0 8px 22px rgba(37,99,235,0.38), 0 0 0 3px rgba(37,99,235,0.2)'
    : hovered && active && !isUsed
      ? '0 4px 14px rgba(0,0,0,0.14)'
      : 'none';
  const border = isExample ? '2.5px solid #93c5fd'
    : selected ? '2.5px solid #2563eb'
    : isUsed ? '2.5px solid #22c55e'
    : hovered && active ? '2.5px solid #93c5fd'
    : '2.5px solid #e5e7eb';
  return (
    <button
      type="button"
      draggable={!submitted && !isExample}
      onDragStart={onDragStart}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        padding: '10px 8px 12px', borderRadius: '12px', border,
        background: isExample ? '#eff6ff' : selected ? '#eff6ff' : isUsed ? '#f0fdf4' : hovered && active ? '#f0f9ff' : '#fff',
        cursor: isExample ? 'not-allowed' : submitted ? 'default' : 'grab',
        position: 'relative', opacity: isExample ? 0.75 : 1,
        transition: 'transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease, border-color 0.15s ease, background 0.15s ease',
        transform: `scale(${scale}) translateY(${translateY}px)`,
        boxShadow: shadow,
      }}
    >
      {children}
    </button>
  );
}

const resolveImgSrc = (url) => {
  if (!url) return '';
  const value = String(url);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return hostPath(value);
  return value;
};

const MatchingPicturesDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  answerKeyPrefix,
  // Split-view support: 'combined' (default) | 'questions' | 'picturebank'
  renderMode = 'combined',
  // External shared state for split-view (both sides must share drag/selection state)
  sharedSelectedChoiceId,
  onSharedChoiceSelect,
  sharedActivePromptIndex,
  onSharedActivePromptChange,
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const choices = Array.isArray(questionData.choices) ? questionData.choices : [];
  const prompts = Array.isArray(questionData.prompts) ? questionData.prompts : [];
  const examplePrompt = questionData.examplePrompt || '';
  const exampleAnswer = questionData.exampleAnswer || '';
  const description = questionData.description || '';

  // Internal state (used when renderMode='combined', i.e. not split)
  const [internalSelectedChoiceId, setInternalSelectedChoiceId] = useState('');
  const [internalActivePromptIndex, setInternalActivePromptIndex] = useState(null);

  // Use external shared state when provided (split-view mode), otherwise use internal
  const selectedChoiceId = sharedSelectedChoiceId !== undefined ? sharedSelectedChoiceId : internalSelectedChoiceId;
  const setSelectedChoiceId = onSharedChoiceSelect || setInternalSelectedChoiceId;
  const activePromptIndex = sharedActivePromptIndex !== undefined ? sharedActivePromptIndex : internalActivePromptIndex;
  const setActivePromptIndex = onSharedActivePromptChange || setInternalActivePromptIndex;

  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'matching-pictures';

  const choiceMap = useMemo(() => {
    return Object.fromEntries(choices.map((choice) => [String(choice.id), choice]));
  }, [choices]);

  const getPromptId = (prompt, idx) => String(prompt?.id || prompt?.number || idx + 1);
  const getAnswerKey = (prompt, idx) => `${resolvedKeyPrefix}-${getPromptId(prompt, idx)}`;
  const getUserAnswer = (prompt, idx) => answers[getAnswerKey(prompt, idx)] || '';

  const assignChoice = (prompt, idx, choiceId) => {
    if (!choiceId || submitted) return;
    prompts.forEach((otherPrompt, otherIdx) => {
      const otherKey = getAnswerKey(otherPrompt, otherIdx);
      if (otherIdx !== idx && answers[otherKey] === choiceId) {
        onAnswerChange(otherKey, '');
      }
    });
    onAnswerChange(getAnswerKey(prompt, idx), choiceId);
    setSelectedChoiceId('');
    setActivePromptIndex(null);
  };

  // ── Questions panel (prompts + drop zones) ────────────────────────────────
  const questionsPanel = (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', height: '100%', overflowY: 'auto' }}>
      {description && (
        <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: 1.6, color: '#374151' }}>
          {description}
        </div>
      )}

      {examplePrompt && (
        <div style={{ marginBottom: '18px', padding: '14px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{
              background: '#1d4ed8', color: '#fff',
              fontWeight: 800, fontSize: '13px',
              padding: '3px 12px', borderRadius: '999px',
              letterSpacing: '0.5px',
            }}>EXAMPLE</span>
            <span style={{ fontSize: '12px', color: '#3b82f6', fontStyle: 'italic' }}>(câu mẫu — không cần trả lời)</span>
          </div>
          {/* Prompt text */}
          <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#1f2937', marginBottom: '12px' }}>{examplePrompt}</div>
          {/* Answer display */}
          {choiceMap[exampleAnswer] && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 14px', borderRadius: '12px',
              background: '#fff', border: '2px solid #93c5fd',
            }}>
              {choiceMap[exampleAnswer].imageUrl && (
                <img
                  src={resolveImgSrc(choiceMap[exampleAnswer].imageUrl)}
                  alt={choiceMap[exampleAnswer].label || exampleAnswer}
                  style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #bfdbfe', flexShrink: 0 }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '38px', height: '38px', borderRadius: '8px',
                  background: '#1d4ed8', color: '#fff',
                  fontWeight: 900, fontSize: '22px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                }}>
                  {choiceMap[exampleAnswer].id || exampleAnswer}
                </span>
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>{choiceMap[exampleAnswer].label || exampleAnswer}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Questions</div>
      <div style={{ display: 'grid', gap: '12px' }}>
        {prompts.map((prompt, idx) => {
          const answerId = getUserAnswer(prompt, idx);
          const answerChoice = choiceMap[answerId];
          const correctChoice = choiceMap[prompt.correctAnswer];
          const isCorrect = submitted && answerId && answerId === prompt.correctAnswer;
          const isWrong = submitted && answerId && answerId !== prompt.correctAnswer;
          return (
            <div key={getAnswerKey(prompt, idx)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fafafa' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {/* Question number badge */}
                <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: '#0e276f', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                  {startingNumber + idx}
                </div>

                <div style={{ flex: 1 }}>
                  {/* Prompt text */}
                  <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#1f2937', marginBottom: '10px' }}>{prompt.text}</div>

                  {/* Drop zone */}
                  <div
                    id={`question-${startingNumber + idx}`}
                    tabIndex={0}
                    onClick={() => {
                      if (selectedChoiceId && !submitted) assignChoice(prompt, idx, selectedChoiceId);
                    }}
                    onDragOver={(e) => {
                      if (submitted) return;
                      e.preventDefault();
                      setActivePromptIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (submitted) return;
                      setActivePromptIndex(null);
                    }}
                    onDrop={(e) => {
                      if (submitted) return;
                      e.preventDefault();
                      const choiceId = e.dataTransfer.getData('text/plain');
                      assignChoice(prompt, idx, choiceId);
                    }}
                    style={{
                      minHeight: '110px',
                      borderRadius: '12px',
                      border: `2px dashed ${
                        activePromptIndex === idx ? '#2563eb'
                        : isWrong ? '#ef4444'
                        : isCorrect ? '#22c55e'
                        : answerId ? '#93c5fd'
                        : '#f59e0b'
                      }`,
                      background: activePromptIndex === idx ? '#eff6ff' : answerId ? '#fff' : '#fffbeb',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    {answerChoice ? (
                      <>
                        {answerChoice.imageUrl && (
                          <img src={resolveImgSrc(answerChoice.imageUrl)} alt={answerChoice.label || answerChoice.id} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #e5e7eb', flexShrink: 0 }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Letter badge of the chosen answer */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '38px', height: '38px', borderRadius: '8px',
                            background: '#0e276f', color: '#fff',
                            fontWeight: 900, fontSize: '22px', flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                          }}>
                            {answerChoice.id}
                          </span>
                          <strong style={{ color: '#0f172a', fontSize: '14px', lineHeight: 1.3 }}>{answerChoice.label}</strong>
                        </div>
                        {!submitted && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onAnswerChange(getAnswerKey(prompt, idx), ''); }}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: '2px 4px', lineHeight: 1 }}
                            title="Xóa đáp án"
                          ><InlineIcon name="close" size={12} style={{ color: 'currentColor' }} /></button>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#b45309', fontStyle: 'italic', fontSize: '14px' }}>Chưa trả lời — kéo ảnh vào đây</span>
                      </>
                    )}
                  </div>

                  {submitted && isWrong && correctChoice && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Đáp án đúng:</span>
                      {correctChoice.imageUrl && <img src={resolveImgSrc(correctChoice.imageUrl)} alt={correctChoice.label} style={{ width: '28px', height: '22px', objectFit: 'cover', borderRadius: '4px' }} />}
                      <strong>{correctChoice.label || correctChoice.id}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Picture Bank panel ─────────────────────────────────────────────────────
  // Map: choiceId → which prompt index is currently using it (to show "used" badge)
  const usedByPromptIndex = useMemo(() => {
    const map = {};
    prompts.forEach((prompt, idx) => {
      const val = getUserAnswer(prompt, idx);
      if (val) map[String(val)] = idx;
    });
    return map;
  }, [prompts, answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const pictureBankPanel = (
    <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: '#0e276f' }}>Picture Bank</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>({choices.length} ảnh)</div>
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>
        Kéo-thả ảnh vào chỗ trống. Trên màn hình cảm ứng, chạm vào ảnh rồi chạm vào ô cần điền.
      </div>

      {/* Grid: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {choices.map((choice) => {
          const selected = selectedChoiceId === String(choice.id);
          const usedAtIdx = usedByPromptIndex[String(choice.id)];
          const isUsed = usedAtIdx !== undefined;
          const isExample = String(choice.id) === String(exampleAnswer);

          return (
            <PictureBankItem
              key={choice.id}
              choice={choice}
              selected={selected}
              isUsed={isUsed}
              isExample={isExample}
              submitted={submitted}
              startingNumber={startingNumber}
              usedAtIdx={usedAtIdx}
              onDragStart={(e) => {
                if (submitted || isExample) return;
                e.dataTransfer.setData('text/plain', choice.id);
              }}
              onClick={() => {
                if (submitted || isExample) return;
                setSelectedChoiceId((prev) => (prev === String(choice.id) ? '' : String(choice.id)));
              }}
            >
              {/* "Example" badge */}
              {isExample && (
                <span style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: '#1d4ed8', color: '#fff',
                  borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                  padding: '1px 8px', lineHeight: '18px',
                }}>Example</span>
              )}
              {/* "Used" badge */}
              {!isExample && isUsed && (
                <span style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: '#22c55e', color: '#fff',
                  borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                  padding: '1px 7px', lineHeight: '18px',
                }}>Q{startingNumber + usedAtIdx}</span>
              )}

              {/* Image */}
              {choice.imageUrl ? (
                <img
                  src={resolveImgSrc(choice.imageUrl)}
                  alt={choice.label || choice.id}
                  style={{
                    width: '200px', height: '160px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: `2px solid ${selected ? '#93c5fd' : '#e5e7eb'}`,
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '200px', height: '160px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px', border: '2px dashed #cbd5e1',
                  color: '#64748b', fontSize: '13px', background: '#f1f5f9',
                }}>
                  No image
                </div>
              )}

              {/* Letter badge + label row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '38px', height: '38px', borderRadius: '8px',
                  background: selected ? '#2563eb' : isUsed ? '#16a34a' : '#0e276f',
                  color: '#fff',
                  fontWeight: 900, fontSize: '22px', flexShrink: 0,
                  letterSpacing: '-0.5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                }}>
                  {choice.id}
                </span>
                {choice.label && (
                  <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px', lineHeight: 1.3, textAlign: 'left' }}>
                    {choice.label}
                  </span>
                )}
              </div>
            </PictureBankItem>
          );
        })}
      </div>
    </div>
  );

  // ── Render based on mode ───────────────────────────────────────────────────
  if (renderMode === 'questions') return questionsPanel;
  if (renderMode === 'picturebank') return pictureBankPanel;

  // 'combined' (default): two-column grid — original behaviour
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: '18px' }}>
      {questionsPanel}
      {pictureBankPanel}
    </div>
  );
};

export default MatchingPicturesDisplay;
