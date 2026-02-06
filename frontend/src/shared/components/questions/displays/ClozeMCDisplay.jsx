import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * ClozeMCDisplay - Display component for cloze-mc questions (KET Part 4)
 * Shows passage with numbered blanks and multiple choice options
 */
const ClozeMCDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted,
  testType,
  answerKeyPrefix
}) => {
  const { passage, blanks = [], sharedOptions } = section;
  const [activeGap, setActiveGap] = useState(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const isPet = String(testType || '').toLowerCase().includes('pet');
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'cloze-mc';
  const maxOptionLength = Math.max(
    0,
    ...blanks.map((b) => (Array.isArray(b?.options) ? b.options.length : 0))
  );
  const isTokenMode = isPet || maxOptionLength > 3;
  const blankIndexByNumber = useMemo(() => {
    const map = new Map();
    blanks.forEach((b, idx) => {
      if (typeof b?.number === 'number') map.set(b.number, idx);
    });
    return map;
  }, [blanks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(max-width: 1024px)');
    const handleChange = (event) => setIsNarrow(event.matches);
    setIsNarrow(media.matches);
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
    } else if (media.addListener) {
      media.addListener(handleChange);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleChange);
      } else if (media.removeListener) {
        media.removeListener(handleChange);
      }
    };
  }, []);

  const handleMouseDown = (event) => {
    event.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((event) => {
    if (!isResizing || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const nextLeft = ((event.clientX - rect.left) / rect.width) * 100;

    if (nextLeft >= 30 && nextLeft <= 70) {
      setLeftWidth(nextLeft);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isResizing]);

  const stripOptionLabel = (raw = '') => String(raw).replace(/^[A-H]\.?\s*/i, '').trim();

  const tokenOptions = useMemo(() => {
    if (!isTokenMode) return [];
    const map = new Map();
    const sourceOptions = Array.isArray(sharedOptions) && sharedOptions.length > 0
      ? sharedOptions
      : null;

    if (sourceOptions) {
      sourceOptions.forEach((opt, idx) => {
        const label = String.fromCharCode(65 + idx);
        const text = stripOptionLabel(opt);
        if (text) map.set(label, text);
      });
    } else {
      blanks.forEach((b) => {
        (b?.options || []).forEach((opt, idx) => {
          const label = String.fromCharCode(65 + idx);
          const text = stripOptionLabel(opt);
          if (!map.has(label) && text) {
            map.set(label, text);
          }
        });
      });
    }
    return Array.from(map.entries()).map(([label, text]) => ({ label, text }));
  }, [blanks, isTokenMode, sharedOptions]);

  const renderGapDropZone = (number) => {
    const blankIdx = blankIndexByNumber.get(number);
    if (blankIdx === undefined) return null;
    const questionKey = `${resolvedKeyPrefix}-${blankIdx}`;
    const selected = answers[questionKey] || '';
    const optionIndex = selected ? selected.charCodeAt(0) - 65 : -1;
    const optionSource = Array.isArray(sharedOptions) && sharedOptions.length > 0
      ? sharedOptions
      : blanks[blankIdx]?.options;
    const selectedText = optionIndex >= 0
      ? stripOptionLabel(optionSource?.[optionIndex] || '')
      : '';

    return (
      <span
        key={`gap-${number}`}
        id={`question-${number}`}
        tabIndex={0}
        role="button"
        aria-label={`Question ${number} answer`}
        style={{
          ...styles.gapDropZone,
          ...(activeGap === number ? styles.gapDropZoneActive : null),
        }}
        onDragEnter={() => {
          if (submitted) return;
          setActiveGap(number);
        }}
        onDragLeave={() => {
          if (submitted) return;
          setActiveGap(null);
        }}
        onDragOver={(e) => {
          if (submitted) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (submitted) return;
          e.preventDefault();
          const picked = e.dataTransfer.getData('text/plain');
          if (picked) {
            onAnswerChange(questionKey, picked);
          }
          setActiveGap(null);
        }}
      >
        <span style={styles.gapNumber}>{number}</span>
        <span style={styles.gapText}>{selectedText || '__________'}</span>
      </span>
    );
  };

  const renderPassageWithGaps = () => {
    if (!passage) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(passage, 'text/html');
    const regex = /\((\d+)\)|\[(\d+)\]/g;

    const parseStyle = (styleText) => {
      if (!styleText) return undefined;
      return styleText.split(';').reduce((acc, decl) => {
        const [prop, val] = decl.split(':').map((s) => s && s.trim());
        if (!prop || !val) return acc;
        const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        acc[camel] = val;
        return acc;
      }, {});
    };

    let nodeKey = 0;
    const transformNode = (node) => {
      if (node.nodeType === 3) {
        const text = node.nodeValue || '';
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
          }
          const num = parseInt(match[1] || match[2], 10);
          parts.push(renderGapDropZone(num));
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
          parts.push(text.slice(lastIndex));
        }
        return parts;
      }

      if (node.nodeType !== 1) return null;

      const tag = node.tagName.toLowerCase();
      const props = { key: `node-${nodeKey++}` };
      for (const attr of Array.from(node.attributes)) {
        if (attr.name === 'class') props.className = attr.value;
        else if (attr.name === 'style') props.style = parseStyle(attr.value);
        else props[attr.name] = attr.value;
      }

      const children = Array.from(node.childNodes).flatMap(transformNode);
      return React.createElement(tag, props, children);
    };

    return Array.from(doc.body.childNodes).flatMap(transformNode);
  };

  return (
    <div style={styles.container}>
      {isTokenMode ? (
        isNarrow ? (
          <div style={styles.tokenModeLayoutNarrow}>
            <div style={{ ...styles.passageContainer, marginBottom: 0 }}>
              <div style={styles.passageContent}>{renderPassageWithGaps()}</div>
            </div>
            <div style={styles.tokenPanelNarrow}>
              {tokenOptions.map((token) => (
                <div
                  key={token.label}
                  style={styles.tokenItem}
                  draggable={!submitted}
                  onDragStart={(e) => {
                    if (submitted) return;
                    e.dataTransfer.setData('text/plain', token.label);
                  }}
                >
                  <span style={styles.tokenLabel}>{token.label}</span>
                  <span style={styles.tokenText}>{token.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={styles.tokenModeSplit}>
            <div style={{ ...styles.passageContainer, marginBottom: 0, width: `${leftWidth}%` }}>
              <div style={styles.passageContent}>{renderPassageWithGaps()}</div>
            </div>
            <div
              className="cambridge-divider"
              onMouseDown={handleMouseDown}
              style={{ left: `${leftWidth}%`, cursor: isResizing ? 'col-resize' : 'col-resize' }}
            >
              <div className="cambridge-resize-handle" />
            </div>
            <div style={{ ...styles.tokenPanel, width: `${100 - leftWidth}%` }}>
              {tokenOptions.map((token) => (
                <div
                  key={token.label}
                  style={styles.tokenItem}
                  draggable={!submitted}
                  onDragStart={(e) => {
                    if (submitted) return;
                    e.dataTransfer.setData('text/plain', token.label);
                  }}
                >
                  <span style={styles.tokenLabel}>{token.label}</span>
                  <span style={styles.tokenText}>{token.text}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Passage with numbered blanks */}
          {passage && (
            <div style={styles.passageContainer}>
              <div 
                style={styles.passageContent}
                dangerouslySetInnerHTML={{ __html: passage }}
              />
            </div>
          )}

          {/* Multiple Choice Options for each blank */}
          <div style={styles.questionsContainer}>
            {blanks.map((blank, idx) => {
              const questionNumber = startingNumber + idx;
              const questionKey = `${resolvedKeyPrefix}-${idx}`;
              const userAnswer = answers[questionKey];
              const { options = [], correctAnswer } = blank;

              return (
                <div key={idx} style={styles.questionCard}>
                  {/* Question Number */}
                  <div style={styles.questionHeader}>
                    <div style={styles.questionNumber}>{questionNumber}</div>
                  </div>

                  {/* Options */}
                  <div style={styles.optionsContainer}>
                    {options.map((option, optIdx) => {
                      const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C
                      const isSelected = userAnswer === optionLabel;
                      const isCorrect = submitted && correctAnswer === optionLabel;
                      const isWrong = submitted && isSelected && correctAnswer !== optionLabel;

                      return (
                        <label
                          key={optIdx}
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
                          <span style={styles.optionLetter}>{optionLabel}</span>
                          <span style={styles.optionText}>{option}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Correct Answer Display (after submission) */}
                  {submitted && correctAnswer && userAnswer !== correctAnswer && (
                    <div style={styles.correctAnswerBox}>
                      ✓ Correct answer: <strong>{correctAnswer}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
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
  tokenModeLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
    gap: '18px',
    alignItems: 'start',
  },
  tokenModeSplit: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '18px',
    position: 'relative',
  },
  tokenModeLayoutNarrow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  passageContainer: {
    padding: '18px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
    marginBottom: '0',
  },
  passageContent: {
    fontSize: '15px',
    lineHeight: 1.9,
    color: '#111827',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  questionHeader: {
    marginBottom: '12px',
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
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
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
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #22c55e',
  },
  tokenPanel: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '64vh',
    overflowY: 'auto',
    position: 'sticky',
    top: '12px',
  },
  tokenPanelNarrow: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: 'none',
    overflowY: 'visible',
    position: 'static',
  },
  tokenItem: {
    border: '1px solid #cbd5f5',
    borderRadius: '8px',
    padding: '8px 10px',
    backgroundColor: '#ffffff',
    cursor: 'grab',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    boxShadow: '0 1px 1px rgba(15, 23, 42, 0.06)',
  },
  tokenLabel: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: '#0f172a',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '12px',
    flexShrink: 0,
  },
  tokenText: {
    fontSize: '14px',
    lineHeight: 1.45,
    color: '#0f172a',
  },
  gapDropZone: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    border: '1.5px dashed #94a3b8',
    borderRadius: '6px',
    minWidth: '150px',
    minHeight: '34px',
    backgroundColor: '#f8fafc',
  },
  gapDropZoneActive: {
    borderColor: '#0f172a',
    backgroundColor: '#e2e8f0',
  },
  gapNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    backgroundColor: '#0f172a',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '11px',
    flexShrink: 0,
  },
  gapText: {
    fontSize: '14px',
    color: '#0f172a',
    lineHeight: 1.45,
  },
};

export default ClozeMCDisplay;
