import React, { useMemo, useState } from 'react';
import { hostPath } from '../../../utils/api';

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
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const choices = Array.isArray(questionData.choices) ? questionData.choices : [];
  const prompts = Array.isArray(questionData.prompts) ? questionData.prompts : [];
  const examplePrompt = questionData.examplePrompt || '';
  const exampleAnswer = questionData.exampleAnswer || '';
  const description = questionData.description || '';
  const [activePromptIndex, setActivePromptIndex] = useState(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState('');
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: '18px' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        {description && (
          <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: 1.6, color: '#374151' }}>
            {description}
          </div>
        )}

        {examplePrompt && (
          <div style={{ marginBottom: '18px', padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
            <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '8px' }}>Example</div>
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#1f2937', marginBottom: '8px' }}>{examplePrompt}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '999px', background: '#fff', border: '1px solid #93c5fd' }}>
              {choiceMap[exampleAnswer]?.imageUrl ? (
                <img src={resolveImgSrc(choiceMap[exampleAnswer].imageUrl)} alt={choiceMap[exampleAnswer]?.label || exampleAnswer} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '999px' }} />
              ) : null}
              <strong style={{ color: '#1e40af' }}>{choiceMap[exampleAnswer]?.label || exampleAnswer}</strong>
            </div>
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
                  <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#0e276f', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    {startingNumber + idx}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#1f2937', marginBottom: '10px' }}>{prompt.text}</div>
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
                        minHeight: '64px',
                        borderRadius: '12px',
                        border: `2px dashed ${activePromptIndex === idx ? '#2563eb' : isWrong ? '#ef4444' : isCorrect ? '#22c55e' : '#93c5fd'}`,
                        background: activePromptIndex === idx ? '#eff6ff' : '#fff',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {answerChoice ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {answerChoice.imageUrl ? (
                            <img src={resolveImgSrc(answerChoice.imageUrl)} alt={answerChoice.label || answerChoice.id} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                          ) : null}
                          <strong style={{ color: '#0f172a' }}>{answerChoice.label || answerChoice.id}</strong>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Drop picture here</span>
                      )}
                    </div>
                    {submitted && isWrong && correctChoice && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#166534' }}>
                        Correct: <strong>{correctChoice.label || correctChoice.id}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Picture Bank</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
          Kéo-thả ảnh vào chỗ trống. Trên màn hình cảm ứng, có thể chạm vào ảnh rồi chạm vào ô cần điền.
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {choices.map((choice) => {
            const selected = selectedChoiceId === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                draggable={!submitted}
                onDragStart={(e) => {
                  if (submitted) return;
                  e.dataTransfer.setData('text/plain', choice.id);
                }}
                onClick={() => {
                  if (submitted) return;
                  setSelectedChoiceId((prev) => (prev === choice.id ? '' : choice.id));
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  textAlign: 'left',
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
                  background: selected ? '#eff6ff' : '#fff',
                  cursor: submitted ? 'default' : 'grab',
                }}
              >
                {choice.imageUrl ? (
                  <img src={resolveImgSrc(choice.imageUrl)} alt={choice.label || choice.id} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '11px' }}>
                    No image
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, color: '#1f2937' }}>{choice.label || choice.id}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{choice.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchingPicturesDisplay;
