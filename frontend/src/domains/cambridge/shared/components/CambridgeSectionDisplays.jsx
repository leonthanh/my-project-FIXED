import React from "react";
import LineIcon from "../../../../shared/components/LineIcon.jsx";

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

const sanitizeBasicHtml = (html) => {
  const s = String(html || '');
  return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const normalizeClozeHtml = (html) => {
  const s = String(html || '');
  return s
    .replace(/<\s*br\s*\/?>/gi, '<br/>')
    .replace(/<\s*\/\s*p\s*>/gi, '<br/>')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<\s*\/\s*div\s*>/gi, '<br/>')
    .replace(/<\s*div[^>]*>/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>');
};

export const OpenClozeSectionDisplay = ({
  section,
  secIdx,
  sectionStartNum,
  currentPartIndex,
  answers,
  submitted,
  isDarkMode,
  flaggedQuestions,
  toggleFlag,
  handleAnswerChange,
}) => {
  const qIdx = 0;
  const container = section.questions[0] || {};
  const passageText = container.passageText || container.passage || '';
  const normalizedPassageText = normalizeClozeHtml(passageText);
  const passageTitle = container.passageTitle || '';
  let blanks = Array.isArray(container.blanks) ? container.blanks : [];

  if (!blanks.length && passageText) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = passageText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    const blankMatches = [];
    const regex = /\((\d+)\)|\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(plainText)) !== null) {
      const num = parseInt(match[1] || match[2], 10);
      blankMatches.push({
        questionNum: num,
        fullMatch: match[0],
        index: match.index,
      });
    }

    if (!blankMatches.length) {
      const underscorePattern = /[_\u2026]{3,}/g;
      let blankIndex = 0;
      while ((match = underscorePattern.exec(plainText)) !== null) {
        blankMatches.push({
          questionNum: sectionStartNum + blankIndex,
          fullMatch: match[0],
          index: match.index,
        });
        blankIndex += 1;
      }
    }

    blanks = blankMatches.sort((a, b) => a.questionNum - b.questionNum);
  }

  const renderInlineWithInputs = (html, lineKeyPrefix, firstNumberInPassage) => {
    if (!html) return [];

    const elements = [];
    let lastIndex = 0;
    const regex = /\((\d+)\)|\[(\d+)\]/g;
    let match;
    let matchedAnyNumber = false;

    while ((match = regex.exec(html)) !== null) {
      matchedAnyNumber = true;
      const questionNumber = parseInt(match[1] || match[2], 10);
      const blankIndex = questionNumber - firstNumberInPassage;

      if (blankIndex >= 0 && blankIndex < blanks.length) {
        if (match.index > lastIndex) {
          elements.push(
            <span
              key={`${lineKeyPrefix}-text-${lastIndex}`}
              dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, match.index) }}
            />
          );
        }

        const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIndex}`;
        const userAnswer = answers[questionKey] || '';

        elements.push(
          <input
            key={`${lineKeyPrefix}-input-${questionNumber}`}
            id={`question-${questionNumber}`}
            type="text"
            value={userAnswer}
            onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
            disabled={submitted}
            placeholder={`(${questionNumber})`}
            style={{
              display: 'inline-block',
              margin: '0 4px',
              padding: '6px 10px',
              fontSize: '15px',
              fontWeight: '600',
              border: `2px solid ${isDarkMode ? '#4f6db6' : '#0284c7'}`,
              borderRadius: '4px',
              backgroundColor: isDarkMode ? (userAnswer ? '#1e3a5f' : '#1f2b47') : (userAnswer ? '#f0f9ff' : 'white'),
              color: isDarkMode ? '#e5e7eb' : '#0e7490',
              width: 'clamp(120px, 48vw, 150px)',
              textAlign: 'center',
              scrollMarginTop: '100px',
            }}
          />
        );

        lastIndex = match.index + match[0].length;
      }
    }

    if (!matchedAnyNumber) {
      const underscorePattern = /[_\u2026]{3,}/g;
      let blankIndex = 0;
      lastIndex = 0;
      let underscoreMatch;

      while ((underscoreMatch = underscorePattern.exec(html)) !== null) {
        if (underscoreMatch.index > lastIndex) {
          elements.push(
            <span
              key={`${lineKeyPrefix}-text-${lastIndex}`}
              dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, underscoreMatch.index) }}
            />
          );
        }

        if (blankIndex < blanks.length) {
          const questionNumber = sectionStartNum + blankIndex;
          const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIndex}`;
          const userAnswer = answers[questionKey] || '';

          elements.push(
            <input
              key={`${lineKeyPrefix}-input-${questionNumber}`}
              id={`question-${questionNumber}`}
              type="text"
              value={userAnswer}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
              disabled={submitted}
              placeholder={`(${questionNumber})`}
              style={{
                display: 'inline-block',
                margin: '0 4px',
                padding: '6px 10px',
                fontSize: '15px',
                fontWeight: '600',
                border: `2px solid ${isDarkMode ? '#4f6db6' : '#0284c7'}`,
                borderRadius: '4px',
                backgroundColor: isDarkMode ? (userAnswer ? '#1e3a5f' : '#1f2b47') : (userAnswer ? '#f0f9ff' : 'white'),
                color: isDarkMode ? '#e5e7eb' : '#0e7490',
                width: 'clamp(120px, 48vw, 150px)',
                textAlign: 'center',
                scrollMarginTop: '100px',
              }}
            />
          );
          blankIndex += 1;
        }

        lastIndex = underscoreMatch.index + underscoreMatch[0].length;
      }
    }

    if (lastIndex < html.length) {
      elements.push(
        <span
          key={`${lineKeyPrefix}-text-${lastIndex}`}
          dangerouslySetInnerHTML={{ __html: html.substring(lastIndex) }}
        />
      );
    }

    return elements;
  };

  const renderPassageWithInputs = () => {
    if (!normalizedPassageText) return null;

    const listContainer = document.createElement('div');
    listContainer.innerHTML = passageText;
    const listItems = Array.from(listContainer.querySelectorAll('li'));

    const regex = /\((\d+)\)|\[(\d+)\]/g;
    const firstNumberMatch = regex.exec(normalizedPassageText);
    const firstNumberInPassage = firstNumberMatch
      ? parseInt(firstNumberMatch[1] || firstNumberMatch[2], 10)
      : sectionStartNum;
    regex.lastIndex = 0;

    if (listItems.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listItems.map((li, idx) => (
            <div
              key={`cloze-line-${idx}`}
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}
            >
              {renderInlineWithInputs(li.innerHTML, `line-${idx}`, firstNumberInPassage)}
            </div>
          ))}
        </div>
      );
    }

    return renderInlineWithInputs(normalizedPassageText, 'inline', firstNumberInPassage);
  };

  const sectionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;

  return (
    <div className={`cambridge-question-wrapper ${flaggedQuestions.has(sectionKey) ? 'flagged-section' : ''}`} style={{ position: 'relative' }}>
      <button
        className={`cambridge-flag-button ${flaggedQuestions.has(sectionKey) ? 'flagged' : ''}`}
        onClick={() => toggleFlag(sectionKey)}
        aria-label="Flag question"
        style={{ position: 'absolute', top: 0, right: 0 }}
      >
        <InlineIcon name="flag" size={14} />
      </button>

      {passageTitle ? (
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '18px',
            fontWeight: 600,
            color: isDarkMode ? '#e5e7eb' : '#0c4a6e',
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(passageTitle) }}
        />
      ) : null}

      <div
        className="cambridge-passage-content"
        style={{
          padding: '20px',
          backgroundColor: isDarkMode ? '#111827' : '#f0f9ff',
          border: `2px solid ${isDarkMode ? '#2a3350' : '#0284c7'}`,
          borderRadius: '12px',
          fontSize: '15px',
          lineHeight: 2,
        }}
      >
        {renderPassageWithInputs()}
      </div>
    </div>
  );
};

export const GapMatchSectionDisplay = ({
  section,
  secIdx,
  sectionStartNum,
  currentPartIndex,
  answers,
  setAnswers,
  submitted,
  isDarkMode,
  flaggedQuestions,
  toggleFlag,
  questionRefs,
  activeQuestion,
  styles,
}) => {
  const qIdx = 0;
  const container = section.questions[0] || {};
  const leftTitle = container.leftTitle || 'People';
  const rightTitle = container.rightTitle || 'Options';
  const studentTitle = String(container.studentTitle || '').trim();
  const exampleText = String(container.exampleText || '').trim();
  const exampleAnswer = String(container.exampleAnswer || '').trim();
  const hasExample = Boolean(exampleText || exampleAnswer);
  const leftItems = Array.isArray(container.leftItems) ? container.leftItems : [];
  const options = Array.isArray(container.options) ? container.options : [];
  const correctAnswers = Array.isArray(container.correctAnswers) ? container.correctAnswers : [];
  const optionsStickyTop = '12px';
  const optionsMaxHeight = 'calc(100vh - 132px)';

  const usedMap = {};
  leftItems.forEach((_, idx) => {
    const key = `${currentPartIndex}-${secIdx}-${qIdx}-${idx}`;
    const val = answers[key];
    if (val) usedMap[val] = key;
  });

  const setGapAnswer = (key, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (value && usedMap[value] && usedMap[value] !== key) {
        next[usedMap[value]] = '';
      }
      return next;
    });
  };

  return (
    <div className="cambridge-question-wrapper">
      {studentTitle ? (
        <div
          style={{
            marginBottom: '16px',
            textAlign: 'center',
            fontSize: 'clamp(20px, 2.2vw, 30px)',
            fontWeight: 800,
            lineHeight: 1.2,
            color: isDarkMode ? '#c4b5fd' : '#8b5cf6',
            letterSpacing: '-0.01em',
          }}
        >
          {studentTitle}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
        <div style={{ border: `1px solid ${isDarkMode ? '#2a3350' : '#bae6fd'}`, background: isDarkMode ? '#0f172a' : '#f0f9ff', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px' }}>{leftTitle}</div>
          {hasExample ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                padding: '8px 10px',
                marginBottom: '10px',
                borderRadius: '8px',
                border: `1px dashed ${isDarkMode ? '#4f6db6' : '#93c5fd'}`,
                background: isDarkMode ? '#111827' : '#ffffff',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: isDarkMode ? '#1e3a5f' : '#dbeafe',
                  color: isDarkMode ? '#bfdbfe' : '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                Example
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
                {exampleText || '0'}
              </span>
              {exampleAnswer ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: isDarkMode ? '#123c2c' : '#dcfce7',
                    color: isDarkMode ? '#bbf7d0' : '#166534',
                    border: `1px solid ${isDarkMode ? '#166534' : '#86efac'}`,
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {exampleAnswer}
                </span>
              ) : null}
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leftItems.map((item, idx) => {
              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${idx}`;
              const num = sectionStartNum + idx;
              const userAnswer = answers[key] || '';
              const correct = correctAnswers?.[idx];
              const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();

              return (
                <div
                  key={key}
                  ref={(el) => {
                    questionRefs.current[key] = el;
                  }}
                  className={`cambridge-question-wrapper ${userAnswer ? 'answered' : ''} ${activeQuestion === key ? 'active-question' : ''}`}
                  style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#2a3350' : '#dbeafe'}`, background: isDarkMode ? '#111827' : '#fff' }}
                >
                  <button
                    className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(key)}
                    aria-label="Flag question"
                    type="button"
                  >
                    <InlineIcon name="flag" size={14} />
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '10px', alignItems: 'center' }}>
                    <span className="cambridge-question-number">{num}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: isDarkMode ? '#e5e7eb' : '#1f2937', marginBottom: 8 }}>{item || `Item ${idx + 1}`}</div>
                      <div
                        role="button"
                        tabIndex={0}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          if (submitted) return;
                          const value = e.dataTransfer.getData('text/plain');
                          if (value) setGapAnswer(key, value);
                        }}
                        onClick={() => {
                          if (submitted) return;
                          if (userAnswer) setGapAnswer(key, '');
                        }}
                        style={{
                          minHeight: 36,
                          border: '2px dashed #93c5fd',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 10px',
                          fontWeight: 700,
                          color: userAnswer ? (isDarkMode ? '#e5e7eb' : '#0f172a') : '#94a3b8',
                          background: userAnswer ? (isDarkMode ? '#1e3a5f' : '#e0f2fe') : (isDarkMode ? '#1f2b47' : '#f8fafc'),
                          cursor: submitted ? 'default' : 'pointer',
                          ...(submitted
                            ? {
                                borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                background: isCorrect ? (isDarkMode ? '#0f2a1a' : '#dcfce7') : (isDarkMode ? '#2a1515' : '#fee2e2'),
                                color: isDarkMode ? '#e5e7eb' : '#0f172a',
                              }
                            : null),
                        }}
                      >
                        {userAnswer || `Drop ${num}`}
                      </div>
                      {submitted && correct && !isCorrect && (
                        <div style={styles.correctAnswer}>
                          <InlineIcon name="correct" size={14} style={{ marginRight: 6 }} />
                          Dap an dung: {correct}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start' }}>
          <div
            style={{
              position: 'sticky',
              top: optionsStickyTop,
              alignSelf: 'flex-start',
              width: '100%',
              maxHeight: optionsMaxHeight,
              overflowY: 'auto',
              padding: '12px',
              border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`,
              background: isDarkMode ? '#0f172a' : '#fff',
              borderRadius: '10px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontWeight: 700, color: isDarkMode ? '#e5e7eb' : '#0e276f', marginBottom: '8px', textAlign: 'center' }}>{rightTitle}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((opt, optIdx) => {
                const usedBy = usedMap[opt];
                const isUsed = Boolean(usedBy);
                return (
                  <div
                    key={`${opt}-${optIdx}`}
                    draggable={!submitted && !isUsed}
                    onDragStart={(e) => {
                      if (submitted || isUsed) return;
                      e.dataTransfer.setData('text/plain', opt);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#2a3350' : '#e5e7eb'}`,
                      background: isUsed ? (isDarkMode ? '#1f2b47' : '#f1f5f9') : (isDarkMode ? '#111827' : '#fafafa'),
                      opacity: isUsed ? 0.45 : 1,
                      cursor: submitted || isUsed ? 'default' : 'grab',
                      fontWeight: 600,
                      color: isDarkMode ? '#e5e7eb' : undefined,
                    }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

