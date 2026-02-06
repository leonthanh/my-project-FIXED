import React, { useMemo } from 'react';

/**
 * InlineChoiceDisplay - PET Part 5 style inline dropdowns in passage
 */
const InlineChoiceDisplay = ({
  section,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  answerKeyPrefix,
}) => {
  const { passage, blanks = [] } = section;
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'inline-choice';

  const blankIndexByNumber = useMemo(() => {
    const map = new Map();
    blanks.forEach((blank, idx) => {
      if (typeof blank?.number === 'number') {
        map.set(blank.number, idx);
      }
    });
    return map;
  }, [blanks]);

  const stripOptionLabel = (raw = '') => String(raw).replace(/^[A-H]\.?\s*/i, '').trim();

  const renderInlineChoice = (number) => {
    const blankIdx = blankIndexByNumber.get(number);
    if (blankIdx === undefined) return null;

    const blank = blanks[blankIdx] || {};
    const questionKey = `${resolvedKeyPrefix}-${blankIdx}`;
    const userAnswer = answers[questionKey] || '';
    const options = Array.isArray(blank.options) ? blank.options : [];
    const correctAnswer = blank.correctAnswer || '';
    const normalizedUser = String(userAnswer || '').trim().toLowerCase();
    const normalizedCorrect = String(correctAnswer || '').trim().toLowerCase();
    const isCorrect = submitted && normalizedUser && normalizedUser === normalizedCorrect;
    const isWrong = submitted && normalizedUser && normalizedUser !== normalizedCorrect;

    return (
      <span key={`inline-${number}`} style={styles.inlineWrapper}>
        <span style={styles.inlineNumber}>{number}</span>
        <select
          id={`question-${number}`}
          value={userAnswer}
          onChange={(event) => onAnswerChange(questionKey, event.target.value)}
          disabled={submitted}
          style={{
            ...styles.inlineSelect,
            ...(submitted && isCorrect ? styles.inlineSelectCorrect : null),
            ...(submitted && isWrong ? styles.inlineSelectWrong : null),
          }}
        >
          <option value="">({number})</option>
          {options.map((opt, optIdx) => {
            const label = String.fromCharCode(65 + optIdx);
            const cleanOpt = stripOptionLabel(opt);
            return (
              <option key={`${label}-${optIdx}`} value={cleanOpt}>
                {label} {cleanOpt}
              </option>
            );
          })}
        </select>
        {submitted && isWrong && correctAnswer && (
          <span style={styles.inlineCorrect}>✓ {stripOptionLabel(correctAnswer)}</span>
        )}
      </span>
    );
  };

  const renderPassageWithChoices = () => {
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
          parts.push(renderInlineChoice(num));
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
      <div style={styles.passageContainer}>
        <div style={styles.passageContent}>{renderPassageWithChoices()}</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  passageContainer: {
    padding: '18px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },
  passageContent: {
    fontSize: '15px',
    lineHeight: 1.9,
    color: '#111827',
  },
  inlineWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    margin: '0 4px',
    flexWrap: 'wrap',
  },
  inlineNumber: {
    minWidth: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: '#0e276f',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '12px',
  },
  inlineSelect: {
    minWidth: '160px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5f5',
    backgroundColor: '#fff',
    color: '#0e276f',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    scrollMarginTop: '100px',
  },
  inlineSelectCorrect: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  inlineSelectWrong: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  inlineCorrect: {
    fontSize: '12px',
    color: '#166534',
    backgroundColor: '#dcfce7',
    border: '1px solid #22c55e',
    borderRadius: '6px',
    padding: '4px 8px',
    fontWeight: 600,
  },
};

export default InlineChoiceDisplay;
