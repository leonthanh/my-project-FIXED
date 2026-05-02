import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useQuillImageUpload from '../../../hooks/useQuillImageUpload';
import InlineIcon from '../../InlineIcon.jsx';
import InlineChoiceDisplay from '../displays/InlineChoiceDisplay';

/**
 * InlineChoiceEditor - PET Part 5: Inline choice dropdowns in passage
 */
const InlineChoiceEditor = ({
  question = {},
  onChange,
  startingNumber = 21,
  partIndex = 4,
}) => {
  const { quillRef, modules } = useQuillImageUpload();
  const [previewAnswers, setPreviewAnswers] = useState({});
  const passageTitle = question?.passageTitle || '';
  const passage = question?.passage || '';
  const passageValue = typeof passage === 'string' ? passage : '';

  const buildDefaultOptions = () => ['', '', '', ''];
  const normalizeOptions = (options = []) => {
    const nextOptions = Array.isArray(options)
      ? options.slice(0, 4).map((option) => (typeof option === 'string' ? option : ''))
      : [];

    while (nextOptions.length < 4) {
      nextOptions.push('');
    }

    return nextOptions;
  };

  const blanks = Array.isArray(question?.blanks) && question.blanks.length > 0
    ? question.blanks
    : [
        { number: startingNumber, options: buildDefaultOptions(), correctAnswer: '' },
        { number: startingNumber + 1, options: buildDefaultOptions(), correctAnswer: '' },
        { number: startingNumber + 2, options: buildDefaultOptions(), correctAnswer: '' },
        { number: startingNumber + 3, options: buildDefaultOptions(), correctAnswer: '' },
        { number: startingNumber + 4, options: buildDefaultOptions(), correctAnswer: '' },
        { number: startingNumber + 5, options: buildDefaultOptions(), correctAnswer: '' },
      ];

  useEffect(() => {
    const normalized = blanks.map((blank) => {
      const nextOptions = normalizeOptions(blank?.options);
      const nextCorrectAnswer = nextOptions.includes(blank?.correctAnswer) ? blank.correctAnswer : '';

      return {
        ...blank,
        options: nextOptions,
        correctAnswer: nextCorrectAnswer,
      };
    });

    const needsNormalize = normalized.some((blank, index) => {
      const original = blanks[index] || {};
      const originalOptions = Array.isArray(original?.options) ? original.options : [];

      if (originalOptions.length !== 4) return true;
      if (original?.correctAnswer !== blank.correctAnswer) return true;

      return blank.options.some((option, optionIndex) => option !== (originalOptions[optionIndex] ?? ''));
    });

    if (!needsNormalize) return;

    onChange('blanks', normalized);
  }, [blanks, onChange]);

  useEffect(() => {
    setPreviewAnswers((prev) => {
      const next = {};

      blanks.forEach((blank, blankIdx) => {
        const answerKey = `inline-choice-preview-${blankIdx}`;
        const existingAnswer = prev[answerKey];
        const availableOptions = normalizeOptions(blank?.options).filter((option) => option.trim());

        if (existingAnswer && availableOptions.includes(existingAnswer)) {
          next[answerKey] = existingAnswer;
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const unchanged = prevKeys.length === nextKeys.length
        && prevKeys.every((key) => prev[key] === next[key]);

      return unchanged ? prev : next;
    });
  }, [blanks]);

  const handleBlankChange = (index, field, value) => {
    const next = [...blanks];
    next[index] = { ...next[index], [field]: value };
    onChange('blanks', next);
  };

  const handleOptionChange = (blankIdx, optIdx, value) => {
    const next = [...blanks];
    const options = Array.isArray(next[blankIdx]?.options)
      ? normalizeOptions(next[blankIdx].options)
      : buildDefaultOptions();
    const previousValue = options[optIdx];

    options[optIdx] = value;
    next[blankIdx] = {
      ...next[blankIdx],
      options,
      correctAnswer: next[blankIdx]?.correctAnswer === previousValue ? value : next[blankIdx]?.correctAnswer || '',
    };

    onChange('blanks', next);
  };

  const addBlank = () => {
    const lastNum = blanks.length > 0 ? blanks[blanks.length - 1].number : startingNumber - 1;
    onChange('blanks', [
      ...blanks,
      { number: lastNum + 1, options: buildDefaultOptions(), correctAnswer: '' },
    ]);
  };

  const removeBlank = (index) => {
    if (blanks.length <= 2) return;
    const next = blanks.filter((_, i) => i !== index);
    onChange('blanks', next);
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'color',
    'background',
    'list',
    'bullet',
    'align',
    'link',
    'image',
  ];

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <span style={styles.partTag}>Part {partIndex + 1}</span>
          <span style={styles.headerTitle}>Inline Choice (PET Part 5)</span>
          <span style={styles.headerRange}>
            Questions {startingNumber}-{startingNumber + blanks.length - 1}
          </span>
        </div>
      </div>

      <div style={styles.helpBox}>
        <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a' }}>
          Dán đoạn văn có số trong ngoặc như (21), (22)... để đánh dấu chỗ trống. Mỗi blank có 4 lựa chọn.
        </p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Tiêu đề (tùy chọn)</label>
        <input
          type="text"
          value={passageTitle}
          onChange={(e) => onChange('passageTitle', e.target.value)}
          placeholder="VD: The Coconut Tree"
          style={styles.input}
        />
      </div>

      <div style={{ marginBottom: '20px' }} className="inline-choice-editor">
        <label style={styles.label}>Đoạn văn với chỗ trống *</label>
        <div style={styles.quillWrapper}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={passageValue}
            onChange={(content) => onChange('passage', content || '')}
            placeholder={`VD: It is mostly found by the sea where there is a hot and wet (${startingNumber}).`}
            modules={modules}
            formats={formats}
            style={{ minHeight: '180px', backgroundColor: 'white' }}
          />
        </div>
        <p style={styles.tip}>Dùng (21), (22)... để đánh dấu chỗ trống.</p>
      </div>

      {(passageTitle || passageValue) && (
        <div style={styles.previewBox}>
          <h4 style={styles.previewHeading}>Xem trước giao diện học sinh</h4>
          <div style={styles.previewCard}>
            {passageTitle && (
              <h3
                style={styles.previewTitle}
                dangerouslySetInnerHTML={{ __html: passageTitle }}
              />
            )}

            <InlineChoiceDisplay
              section={{
                id: 'inline-choice-preview',
                passage: passageValue,
                blanks,
              }}
              startingNumber={startingNumber}
              onAnswerChange={(key, value) => {
                setPreviewAnswers((prev) => ({
                  ...prev,
                  [key]: value,
                }));
              }}
              answers={previewAnswers}
              submitted={false}
              answerKeyPrefix="inline-choice-preview"
            />
          </div>
        </div>
      )}

      <div style={styles.blankBox}>
        <div style={styles.blankHeader}>
          <h3 style={styles.blankTitle}>Lựa chọn cho từng blank</h3>
          <button type="button" onClick={addBlank} style={styles.addBtn}>+ Thêm blank</button>
        </div>

        <div style={styles.blankGrid}>
          {blanks.map((blank, blankIdx) => (
            <div key={`blank-${blankIdx}`} style={styles.blankCard}>
              {blanks.length > 2 && (
                <button type="button" onClick={() => removeBlank(blankIdx)} style={styles.removeBtn}>
                  <InlineIcon name="close" size={12} style={{ color: 'currentColor' }} />
                </button>
              )}

              <div style={styles.blankNumberRow}>
                <span style={styles.blankBadge}>Câu</span>
                <input
                  type="number"
                  value={blank.number}
                  onChange={(e) => handleBlankChange(blankIdx, 'number', Number(e.target.value))}
                  style={styles.numberInput}
                />
              </div>

              {normalizeOptions(blank.options).map((opt, optIdx) => {
                const label = String.fromCharCode(65 + optIdx);
                return (
                  <div key={`${blankIdx}-${optIdx}`} style={styles.optionRow}>
                    <span style={styles.optionLabel}>{label}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(blankIdx, optIdx, e.target.value)}
                      placeholder={`Câu ${blank.number} - lựa chọn ${label}`}
                      style={styles.input}
                    />
                  </div>
                );
              })}

              <div style={styles.correctRow}>
                <span style={styles.correctLabel}>Đáp án:</span>
                <select
                  value={blank.correctAnswer || ''}
                  onChange={(e) => handleBlankChange(blankIdx, 'correctAnswer', e.target.value)}
                  style={styles.correctSelect}
                >
                  <option value="">-- Chọn đáp án --</option>
                  {normalizeOptions(blank.options)
                    .filter((opt) => opt.trim())
                    .map((opt, optIdx) => {
                      const label = String.fromCharCode(65 + optIdx);
                      return (
                        <option key={`${blankIdx}-ans-${optIdx}`} value={opt}>
                          {label}. {opt}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  header: {
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #0e276f 0%, #2563eb 100%)',
    borderRadius: '8px',
    marginBottom: '16px',
    color: 'white',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  partTag: {
    backgroundColor: 'white',
    color: '#0e276f',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 700,
  },
  headerTitle: {
    fontWeight: 600,
  },
  headerRange: {
    marginLeft: 'auto',
    fontSize: '13px',
    opacity: 0.9,
  },
  helpBox: {
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #bfdbfe',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    fontSize: '13px',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    boxSizing: 'border-box',
  },
  quillWrapper: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
  },
  tip: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px',
  },
  previewBox: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe',
  },
  previewHeading: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#1d4ed8',
  },
  previewCard: {
    padding: '18px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #dbeafe',
  },
  previewTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0e276f',
  },
  blankBox: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  blankHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  blankTitle: {
    margin: 0,
    fontSize: '14px',
    color: '#1e3a8a',
  },
  addBtn: {
    padding: '6px 12px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  blankGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
  },
  blankCard: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '2px 6px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
  },
  blankNumberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  blankBadge: {
    padding: '4px 8px',
    borderRadius: '8px',
    backgroundColor: '#e0e7ff',
    color: '#1e3a8a',
    fontWeight: 600,
    fontSize: '11px',
  },
  numberInput: {
    width: '80px',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  optionLabel: {
    minWidth: '22px',
    height: '22px',
    borderRadius: '4px',
    backgroundColor: '#0e276f',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
  },
  correctRow: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  correctLabel: {
    fontSize: '12px',
    color: '#475569',
  },
  correctSelect: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '12px',
  },
};

export default InlineChoiceEditor;
