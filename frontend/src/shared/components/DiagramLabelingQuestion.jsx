import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import QuillEditor from './QuillEditor';
import { hostPath } from '../utils/api';

const clampPercent = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const clampWidth = (value, fallback = 240) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(140, Math.min(420, parsed));
};

const getStartNumber = (questionNumber, fallback = 1) => {
  const match = String(questionNumber || '').match(/\d+/);
  if (!match) return fallback;
  const parsed = parseInt(match[0], 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildDefaultBlank = (index = 0) => ({
  id: `blank_${Date.now()}_${index}`,
  blankNumber: index + 1,
  promptHtml: '[NUMBER] [BLANK]',
  correctAnswer: '',
  labelX: 10,
  labelY: 10 + index * 8,
  anchorX: 50,
  anchorY: 50,
  width: 220,
  textAlign: 'left',
});

const normalizeBlank = (blank, index) => ({
  ...buildDefaultBlank(index),
  ...(blank || {}),
  id: blank?.id || `blank_${Date.now()}_${index}`,
  blankNumber: index + 1,
  promptHtml:
    typeof blank?.promptHtml === 'string' && blank.promptHtml.trim()
      ? blank.promptHtml
      : '[NUMBER] [BLANK]',
  labelX: clampPercent(blank?.labelX, 10),
  labelY: clampPercent(blank?.labelY, 10 + index * 8),
  anchorX: clampPercent(blank?.anchorX, 50),
  anchorY: clampPercent(blank?.anchorY, 50),
  width: clampWidth(blank?.width, 220),
  textAlign: ['left', 'center', 'right'].includes(blank?.textAlign)
    ? blank.textAlign
    : 'left',
});

const getDetailForNumber = (detailMap, questionNumber) => {
  if (!detailMap) return null;
  if (detailMap instanceof Map) return detailMap.get(questionNumber) || null;
  return detailMap[questionNumber] || null;
};

const normalizePromptTemplate = (promptHtml) => {
  const raw = String(promptHtml || '').trim();
  if (!raw) return ['[NUMBER]', ' ', '[BLANK]'];

  const withBlank = raw.includes('[BLANK]') ? raw : `${raw} [BLANK]`;
  return withBlank.split(/(\[NUMBER\]|\[BLANK\])/g).filter(Boolean);
};

const resolveImageUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^data:/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return raw;
  return hostPath(raw);
};

const DiagramLabelingQuestion = ({
  question,
  onChange,
  mode = 'edit',
  questionNumber = 1,
  answers = {},
  onAnswerChange,
  detailMap,
  showCorrect = true,
  registerQuestionRef,
  onFocusQuestion,
}) => {
  const fileInputRef = useRef(null);
  const boardRef = useRef(null);
  const arrowMarkerId = useId().replace(/:/g, '');
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState(null);

  const blanks = useMemo(
    () => (Array.isArray(question?.blanks) ? question.blanks : []).map(normalizeBlank),
    [question?.blanks]
  );
  const baseQuestionNumber = getStartNumber(question?.questionNumber, questionNumber);
  const imageUrl = resolveImageUrl(question?.diagramImageUrl || question?.imageUrl || '');

  useEffect(() => {
    if (activeBlankIndex > blanks.length - 1) {
      setActiveBlankIndex(Math.max(0, blanks.length - 1));
    }
  }, [activeBlankIndex, blanks.length]);

  const emitQuestion = (patch) => {
    if (!onChange) return;
    onChange({
      ...question,
      questionType: 'diagram-labeling',
      blanks,
      ...patch,
    });
  };

  const commitBlanks = (nextBlanks) => {
    emitQuestion({
      blanks: nextBlanks.map((blank, index) => normalizeBlank(blank, index)),
    });
  };

  const updateBlank = (index, field, value) => {
    const nextBlanks = blanks.map((blank, blankIndex) =>
      blankIndex === index ? { ...blank, [field]: value } : blank
    );
    commitBlanks(nextBlanks);
  };

  const handleBoardClick = (event) => {
    if (mode !== 'edit' || selectionMode === null || !boardRef.current || !blanks[activeBlankIndex]) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (selectionMode === 'label') {
      updateBlank(activeBlankIndex, 'labelX', clampPercent(x, 10));
      updateBlank(activeBlankIndex, 'labelY', clampPercent(y, 10));
    }

    if (selectionMode === 'anchor') {
      updateBlank(activeBlankIndex, 'anchorX', clampPercent(x, 50));
      updateBlank(activeBlankIndex, 'anchorY', clampPercent(y, 50));
    }

    setSelectionMode(null);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      emitQuestion({ diagramImageUrl: reader.result || '' });
    };
    reader.readAsDataURL(file);
  };

  const handleAddBlank = () => {
    const nextBlanks = [...blanks, buildDefaultBlank(blanks.length)];
    commitBlanks(nextBlanks);
    setActiveBlankIndex(nextBlanks.length - 1);
  };

  const handleRemoveBlank = (index) => {
    const nextBlanks = blanks.filter((_, blankIndex) => blankIndex !== index);
    commitBlanks(nextBlanks);
    setActiveBlankIndex((current) => Math.max(0, Math.min(current, nextBlanks.length - 1)));
  };

  const renderPromptWithBlank = (blank, blankIndex) => {
    const absoluteQuestionNumber = baseQuestionNumber + blankIndex;
    const answerKey = `q_${baseQuestionNumber}_${blankIndex}`;
    const detail = getDetailForNumber(detailMap, absoluteQuestionNumber);
    const promptParts = normalizePromptTemplate(blank.promptHtml);

    const answerValue =
      mode === 'review'
        ? answers?.[answerKey] || ''
        : answers?.[answerKey] || '';

    const blankNode = (() => {
      if (mode === 'edit') {
        return (
          <span
            style={{
              display: 'inline-block',
              minWidth: '84px',
              borderBottom: '2px dashed #0e276f',
              margin: '0 4px',
              height: '1.2em',
              verticalAlign: 'bottom',
            }}
          />
        );
      }

      if (mode === 'review') {
        const reviewBorder = detail
          ? detail.isCorrect
            ? '2px solid #16a34a'
            : '2px solid #dc2626'
          : '2px solid #cbd5e1';
        const reviewBackground = detail
          ? detail.isCorrect
            ? '#f0fdf4'
            : '#fef2f2'
          : '#f8fafc';

        return (
          <input
            ref={(element) => registerQuestionRef?.(absoluteQuestionNumber, element)}
            type="text"
            value={answerValue}
            readOnly
            style={{
              width: '92px',
              padding: '4px 6px',
              margin: '0 4px',
              borderRadius: '6px',
              border: reviewBorder,
              backgroundColor: reviewBackground,
              fontWeight: 700,
              fontSize: '12px',
            }}
          />
        );
      }

      return (
        <input
          ref={(element) => registerQuestionRef?.(absoluteQuestionNumber, element)}
          type="text"
          value={answerValue}
          onChange={(event) => onAnswerChange?.(answerKey, event.target.value)}
          onFocus={() => onFocusQuestion?.(absoluteQuestionNumber)}
          style={{
            width: '92px',
            padding: '4px 6px',
            margin: '0 4px',
            borderRadius: '6px',
            border: answerValue ? '2px solid #0e276f' : '2px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
          }}
        />
      );
    })();

    const containsNumberToken = promptParts.includes('[NUMBER]');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {!containsNumberToken && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '28px',
              height: '28px',
              borderRadius: '999px',
              backgroundColor: '#0e276f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {absoluteQuestionNumber}
          </div>
        )}

        <div style={{ lineHeight: 1.5 }}>
          {promptParts.map((part, partIndex) => {
            if (part === '[NUMBER]') {
              return (
                <span
                  key={`${blank.id}-number-${partIndex}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '999px',
                    backgroundColor: '#0e276f',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    marginRight: '6px',
                  }}
                >
                  {absoluteQuestionNumber}
                </span>
              );
            }

            if (part === '[BLANK]') {
              return <React.Fragment key={`${blank.id}-blank-${partIndex}`}>{blankNode}</React.Fragment>;
            }

            return <span key={`${blank.id}-text-${partIndex}`}>{part}</span>;
          })}
        </div>

        {mode === 'review' && showCorrect && detail && !detail.isCorrect && detail.correctAnswer && (
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '8px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Correct: {detail.correctAnswer}
          </div>
        )}
      </div>
    );
  };

  const boardContent = (
    <div
      ref={boardRef}
      onClick={handleBoardClick}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: mode === 'edit' ? '760px' : '720px',
        minHeight: '520px',
        borderRadius: '12px',
        overflow: 'visible',
        background:
          imageUrl
            ? '#ffffff'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        border: imageUrl ? '1px solid #cbd5e1' : '2px dashed #94a3b8',
        cursor: mode === 'edit' && selectionMode ? 'crosshair' : 'default',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={question?.diagramImageAlt || 'Diagram'}
          style={{ width: '100%', display: 'block', borderRadius: '12px' }}
        />
      ) : (
        <div
          style={{
            minHeight: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            textAlign: 'center',
            padding: '24px',
            lineHeight: 1.6,
          }}
        >
          Tải ảnh diagram lên để bắt đầu đặt text và mũi tên.
        </div>
      )}

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="#0f172a" />
          </marker>
        </defs>

        {blanks.map((blank, blankIndex) => (
          <g key={`${blank.id}-line`}>
            <line
              x1={blank.labelX}
              y1={blank.labelY}
              x2={blank.anchorX}
              y2={blank.anchorY}
              stroke={activeBlankIndex === blankIndex ? '#dc2626' : '#0f172a'}
              strokeWidth="0.45"
              markerEnd={`url(#${arrowMarkerId})`}
            />
            <circle
              cx={blank.anchorX}
              cy={blank.anchorY}
              r="1.1"
              fill={activeBlankIndex === blankIndex ? '#dc2626' : '#0f172a'}
            />
          </g>
        ))}
      </svg>

      {blanks.map((blank, blankIndex) => (
        <div
          key={blank.id}
          style={{
            position: 'absolute',
            top: `${blank.labelY}%`,
            left: `${blank.labelX}%`,
            width: `${blank.width}px`,
            transform: 'translate(-2px, -2px)',
            backgroundColor: 'rgba(255,255,255,0.96)',
            border: `2px solid ${activeBlankIndex === blankIndex ? '#dc2626' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.14)',
            textAlign: blank.textAlign,
            pointerEvents: mode === 'edit' ? 'none' : 'auto',
            zIndex: activeBlankIndex === blankIndex ? 2 : 1,
          }}
        >
          {renderPromptWithBlank(blank, blankIndex)}
        </div>
      ))}
    </div>
  );

  if (mode === 'answer' || mode === 'review') {
    return (
      <div
        style={{
          padding: '16px',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          <span
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              backgroundColor: '#0e276f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            Questions {baseQuestionNumber}
            {blanks.length > 1 ? `-${baseQuestionNumber + blanks.length - 1}` : ''}
          </span>

          {question?.maxWords ? (
            <span
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              No more than {question.maxWords} word(s)
            </span>
          ) : null}
        </div>

        {question?.questionText ? (
          <div
            style={{ marginBottom: '12px', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: question.questionText }}
          />
        ) : null}

        {question?.diagramTitle ? (
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>
            {question.diagramTitle}
          </div>
        ) : null}

        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>{boardContent}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '14px',
        border: '2px solid #0e276f',
        backgroundColor: '#f8fbff',
        marginTop: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ margin: 0, color: '#0e276f', fontSize: '18px' }}>Diagram Labeling</h4>
          <p style={{ margin: '6px 0 0 0', color: '#475569', fontSize: '12px' }}>
            Dùng token [NUMBER] và [BLANK] trong mỗi prompt. Bấm lên ảnh để đặt vị trí text hoặc đầu mũi tên.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectionMode('label')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: selectionMode === 'label' ? '#0e276f' : '#dbeafe',
              color: selectionMode === 'label' ? '#ffffff' : '#1d4ed8',
            }}
          >
            Đặt text box
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('anchor')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: selectionMode === 'anchor' ? '#dc2626' : '#fee2e2',
              color: selectionMode === 'anchor' ? '#ffffff' : '#b91c1c',
            }}
          >
            Đặt đầu mũi tên
          </button>
          <button
            type="button"
            onClick={handleAddBlank}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: '#16a34a',
              color: '#ffffff',
            }}
          >
            Thêm label
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)', gap: '18px', alignItems: 'start' }}>
        <div style={{ overflowX: 'auto', paddingBottom: '6px' }}>
          {question?.diagramTitle ? (
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>
              {question.diagramTitle}
            </div>
          ) : null}
          {boardContent}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '14px' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
              Hướng dẫn / Question Text
            </label>
            <QuillEditor
              value={question?.questionText || ''}
              onChange={(value) => emitQuestion({ questionText: value })}
              placeholder="Ví dụ: Label the diagram below. Choose ONE WORD ONLY for each answer."
              editorMinHeight="100px"
            />
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Tiêu đề diagram
                </label>
                <input
                  type="text"
                  value={question?.diagramTitle || ''}
                  onChange={(event) => emitQuestion({ diagramTitle: event.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  placeholder="Ví dụ: How a boat is lifted"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Giới hạn từ
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={question?.maxWords || 1}
                  onChange={(event) => emitQuestion({ maxWords: Math.max(1, Number(event.target.value) || 1) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#0e276f',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                Tải ảnh lên
              </button>
              <input
                type="text"
                value={question?.diagramImageUrl || ''}
                onChange={(event) => emitQuestion({ diagramImageUrl: event.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="Hoặc dán URL ảnh"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '640px', overflowY: 'auto', paddingRight: '4px' }}>
            {blanks.map((blank, blankIndex) => {
              const absoluteQuestionNumber = baseQuestionNumber + blankIndex;

              return (
                <div
                  key={blank.id}
                  style={{
                    border: `2px solid ${activeBlankIndex === blankIndex ? '#dc2626' : '#dbeafe'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveBlankIndex(blankIndex)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        backgroundColor: activeBlankIndex === blankIndex ? '#dc2626' : '#e2e8f0',
                        color: activeBlankIndex === blankIndex ? '#ffffff' : '#0f172a',
                      }}
                    >
                      Q{absoluteQuestionNumber}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveBlank(blankIndex)}
                      disabled={blanks.length <= 1}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: blanks.length <= 1 ? 'not-allowed' : 'pointer',
                        backgroundColor: blanks.length <= 1 ? '#cbd5e1' : '#fee2e2',
                        color: blanks.length <= 1 ? '#64748b' : '#b91c1c',
                        fontWeight: 700,
                      }}
                    >
                      Xóa
                    </button>
                  </div>

                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                    Prompt
                  </label>
                  <textarea
                    value={blank.promptHtml}
                    onChange={(event) => updateBlank(blankIndex, 'promptHtml', event.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="Ví dụ: A pair of [NUMBER] [BLANK] are lifted in order to shut out water from canal basin"
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                        Đáp án đúng
                      </label>
                      <input
                        type="text"
                        value={blank.correctAnswer || ''}
                        onChange={(event) => updateBlank(blankIndex, 'correctAnswer', event.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        placeholder="Ví dụ: gates"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                        Width
                      </label>
                      <input
                        type="number"
                        min="140"
                        max="420"
                        value={blank.width}
                        onChange={(event) => updateBlank(blankIndex, 'width', clampWidth(event.target.value, 220))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                        Text X / Y
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="number"
                          value={blank.labelX}
                          min="0"
                          max="100"
                          onChange={(event) => updateBlank(blankIndex, 'labelX', clampPercent(event.target.value, 10))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <input
                          type="number"
                          value={blank.labelY}
                          min="0"
                          max="100"
                          onChange={(event) => updateBlank(blankIndex, 'labelY', clampPercent(event.target.value, 10))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                        Arrow X / Y
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="number"
                          value={blank.anchorX}
                          min="0"
                          max="100"
                          onChange={(event) => updateBlank(blankIndex, 'anchorX', clampPercent(event.target.value, 50))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <input
                          type="number"
                          value={blank.anchorY}
                          min="0"
                          max="100"
                          onChange={(event) => updateBlank(blankIndex, 'anchorY', clampPercent(event.target.value, 50))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                    <select
                      value={blank.textAlign}
                      onChange={(event) => updateBlank(blankIndex, 'textAlign', event.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>

                    <div style={{ color: '#475569', fontSize: '12px', lineHeight: 1.6 }}>
                      `[NUMBER]` chèn số câu, `[BLANK]` chèn ô điền. Nếu thiếu `[BLANK]`, hệ thống sẽ tự thêm ở cuối prompt.
                    </div>
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

export default DiagramLabelingQuestion;