import React from 'react';

const EMPTY_ITEM = {
  sentencePrefix: '',
  sentenceSuffix: '',
  correctAnswer: '',
};

const ReportedSpeechVerbChoiceEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const options = Array.isArray(question.options) ? question.options : [];
  const items = Array.isArray(question.items) ? question.items : [];
  const example = question.example || {};

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const updateExample = (field, value) => {
    onChange('example', { ...example, [field]: value });
  };

  const updateOption = (index, value) => {
    onChange('options', options.map((option, optionIndex) => (
      optionIndex === index ? value : option
    )));
  };

  const addItem = () => {
    onChange('items', [...items, { ...EMPTY_ITEM, correctAnswer: options[0] || '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange('items', items.filter((_, itemIndex) => itemIndex !== index));
  };

  const renderChoices = (answer) => (
    <span style={styles.previewChoices}>
      {options.map((option, index) => (
        <React.Fragment key={`${option}-${index}`}>
          {index > 0 && <span> / </span>}
          <strong style={option === answer ? styles.previewCorrect : undefined}>{option || 'word'}</strong>
        </React.Fragment>
      ))}
    </span>
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Chọn động từ tường thuật đúng</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · 1 điểm/câu
          </div>
        </div>
        <span style={styles.countBadge}>{items.length} câu</span>
      </div>

      <label style={styles.label}>
        Hướng dẫn
        <textarea
          aria-label="Hướng dẫn"
          value={question.instruction || ''}
          onChange={(event) => onChange('instruction', event.target.value)}
          rows={2}
          style={styles.textarea}
        />
      </label>

      <div style={styles.optionsGrid}>
        {options.map((option, index) => (
          <label key={index} style={styles.label}>
            Lựa chọn {index + 1}
            <input
              type="text"
              aria-label={`Lựa chọn ${index + 1}`}
              value={option || ''}
              onChange={(event) => updateOption(index, event.target.value)}
              style={styles.input}
            />
          </label>
        ))}
      </div>

      <section style={styles.exampleCard}>
        <h4 style={styles.sectionTitle}>Câu ví dụ (không tính điểm)</h4>
        <div style={styles.frameGrid}>
          <label style={styles.label}>
            Câu trước lựa chọn
            <input
              type="text"
              aria-label="Câu ví dụ trước lựa chọn"
              value={example.sentencePrefix || ''}
              onChange={(event) => updateExample('sentencePrefix', event.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Câu sau lựa chọn
            <input
              type="text"
              aria-label="Câu ví dụ sau lựa chọn"
              value={example.sentenceSuffix || ''}
              onChange={(event) => updateExample('sentenceSuffix', event.target.value)}
              style={styles.input}
            />
          </label>
        </div>
        <label style={styles.label}>
          Đáp án ví dụ
          <select
            aria-label="Đáp án ví dụ"
            value={example.correctAnswer || ''}
            onChange={(event) => updateExample('correctAnswer', event.target.value)}
            style={styles.input}
          >
            <option value="">Chọn đáp án</option>
            {options.map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}
          </select>
        </label>
      </section>

      <div style={styles.itemsList}>
        {items.map((item, index) => (
          <section key={index} style={styles.itemCard}>
            <div style={styles.itemHeader}>
              <span style={styles.questionNumber}>{startingNumber + index}</span>
              <strong>Câu {index + 1}</strong>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                style={{
                  ...styles.removeButton,
                  opacity: items.length <= 1 ? 0.45 : 1,
                  cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Xóa
              </button>
            </div>

            <div style={styles.frameGrid}>
              <label style={styles.label}>
                Câu trước lựa chọn
                <input
                  type="text"
                  aria-label={`Câu trước lựa chọn ${index + 1}`}
                  value={item.sentencePrefix || ''}
                  onChange={(event) => updateItem(index, 'sentencePrefix', event.target.value)}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Câu sau lựa chọn
                <input
                  type="text"
                  aria-label={`Câu sau lựa chọn ${index + 1}`}
                  value={item.sentenceSuffix || ''}
                  onChange={(event) => updateItem(index, 'sentenceSuffix', event.target.value)}
                  style={styles.input}
                />
              </label>
            </div>

            <label style={styles.label}>
              Đáp án đúng
              <select
                aria-label={`Đáp án câu ${index + 1}`}
                value={item.correctAnswer || ''}
                onChange={(event) => updateItem(index, 'correctAnswer', event.target.value)}
                style={styles.input}
              >
                <option value="">Chọn đáp án</option>
                {options.map((option, optionIndex) => (
                  <option key={`${option}-${optionIndex}`} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </section>
        ))}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>+ Thêm câu</button>

      <label style={{ ...styles.label, marginTop: 16 }}>
        Ghi chú điểm hiển thị dưới bài
        <input
          aria-label="Ghi chú điểm"
          type="text"
          value={question.scoreNote || ''}
          onChange={(event) => onChange('scoreNote', event.target.value)}
          placeholder="____/5 (1 mark per answer)"
          style={styles.input}
        />
      </label>

      <section aria-label="Xem trước câu hỏi" style={styles.preview}>
        <h3 style={styles.previewTitle}>Xem trước:</h3>
        {question.instruction && <p style={styles.previewInstruction}>{question.instruction}</p>}
        {example.sentencePrefix && (
          <p style={styles.examplePreview}>
            <strong>Example.</strong> <em>{example.sentencePrefix}{renderChoices(example.correctAnswer)}{example.sentenceSuffix}</em>
          </p>
        )}
        <div style={styles.previewItems}>
          {items.map((item, index) => (
            <div key={index} id={`question-${startingNumber + index}`} style={styles.previewItem}>
              <span><strong>{startingNumber + index}.</strong> {item.sentencePrefix}</span>
              {renderChoices(item.correctAnswer)}
              <span>{item.sentenceSuffix}</span>
            </div>
          ))}
          {!items.length && <p style={styles.empty}>Chưa có câu hỏi để xem trước.</p>}
        </div>
        {question.scoreNote && <div style={styles.previewScore}>{question.scoreNote}</div>}
      </section>
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937' },
  headerMeta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  countBadge: { padding: '6px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12 },
  label: { display: 'block', marginBottom: 12, color: '#374151', fontWeight: 600, fontSize: 13 },
  textarea: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 },
  optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  exampleCard: { marginTop: 8, padding: 14, border: '1px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc' },
  sectionTitle: { margin: '0 0 12px', color: '#334155', fontSize: 14 },
  frameGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  itemsList: { display: 'grid', gap: 12, marginTop: 14 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1f2937' },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  removeButton: { marginLeft: 'auto', padding: '5px 9px', border: '1px solid #fecaca', borderRadius: 5, background: '#fff', color: '#b91c1c' },
  addButton: { marginTop: 12, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' },
  preview: { marginTop: 18, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1f2937', fontFamily: 'serif', fontSize: 15 },
  previewTitle: { margin: '0 0 10px', fontFamily: 'inherit', fontSize: 15 },
  previewInstruction: { margin: '0 0 14px', fontWeight: 700, fontFamily: 'inherit' },
  examplePreview: { margin: '0 0 12px', paddingLeft: 20, fontFamily: 'inherit' },
  previewItems: { display: 'grid', gap: 8, fontFamily: 'inherit' },
  previewItem: { display: 'flex', gap: 4, alignItems: 'baseline', flexWrap: 'wrap' },
  previewChoices: { whiteSpace: 'pre-wrap' },
  previewCorrect: { fontStyle: 'italic', color: '#334155' },
  previewScore: { marginTop: 16, textAlign: 'right', fontWeight: 700, color: '#475569' },
  empty: { margin: 0, color: '#64748b' },
};

export default ReportedSpeechVerbChoiceEditor;
