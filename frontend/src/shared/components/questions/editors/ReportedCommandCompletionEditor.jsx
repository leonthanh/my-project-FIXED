import React from 'react';

const EMPTY_ITEM = {
  sourceText: '',
  sentenceStarter: '',
  reportingVerb: '',
  correctAnswer: '',
};

const ReportedCommandCompletionEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const items = Array.isArray(question.items) ? question.items : [];
  const example = question.example || { ...EMPTY_ITEM };

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const updateExample = (field, value) => {
    onChange('example', { ...example, [field]: value });
  };

  const addItem = () => {
    onChange('items', [...items, { ...EMPTY_ITEM }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange('items', items.filter((_, itemIndex) => itemIndex !== index));
  };

  const renderItemFields = (item, onFieldChange, prefix) => (
    <>
      <label style={styles.label}>
        Câu gốc
        <textarea
          aria-label={`${prefix}, câu gốc`}
          value={item.sourceText || ''}
          onChange={(event) => onFieldChange('sourceText', event.target.value)}
          placeholder="Dad said to us, 'You mustn't open that email.'"
          rows={2}
          style={styles.textarea}
        />
      </label>
      <div style={styles.fieldGrid}>
        <label style={styles.label}>
          Phần đầu câu viết lại
          <input
            type="text"
            aria-label={`${prefix}, phần đầu câu`}
            value={item.sentenceStarter || ''}
            onChange={(event) => onFieldChange('sentenceStarter', event.target.value)}
            placeholder="Dad"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Reporting verb gợi ý
          <input
            type="text"
            aria-label={`${prefix}, reporting verb`}
            value={item.reportingVerb || ''}
            onChange={(event) => onFieldChange('reportingVerb', event.target.value)}
            placeholder="warn"
            style={styles.input}
          />
        </label>
      </div>
      <label style={styles.label}>
        Đáp án đúng (phần sau phần đầu câu)
        <input
          type="text"
          aria-label={`${prefix}, đáp án đúng`}
          value={item.correctAnswer || ''}
          onChange={(event) => onFieldChange('correctAnswer', event.target.value)}
          placeholder="warned us not to open that email"
          style={styles.answerInput}
        />
      </label>
    </>
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Viết lại câu mệnh lệnh gián tiếp</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · 1 điểm/câu · ví dụ không tính điểm
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

      <section style={styles.exampleCard}>
        <div style={styles.cardTitle}>Ví dụ (không tính điểm)</div>
        {renderItemFields(example, updateExample, 'Ví dụ')}
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
            {renderItemFields(item, (field, value) => updateItem(index, field, value), `Câu ${index + 1}`)}
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
        {example.sourceText && (
          <div style={styles.previewExample}>
            <span style={styles.exampleLabel}>0.</span>
            <div>
              <div>{example.sourceText}</div>
              <div style={styles.previewResponse}>
                ↳ {example.sentenceStarter}{' '}
                <strong>{example.correctAnswer || '__________'}</strong>.{' '}
                ({example.reportingVerb})
              </div>
            </div>
          </div>
        )}
        <div style={styles.previewItems}>
          {items.map((item, index) => (
            <div key={index} id={`question-${startingNumber + index}`} style={styles.previewItem}>
              <div style={styles.sourceText}>
                <strong>{startingNumber + index}.</strong> {item.sourceText || 'Câu gốc'}
              </div>
              <div style={styles.previewResponse}>
                ↳ {item.sentenceStarter || '________'}{' '}
                <span style={styles.blank} aria-label={`Ô trả lời câu ${index + 1}`}>_____________________</span>.{' '}
                ({item.reportingVerb || 'verb'})
              </div>
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
  answerInput: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '8px 10px', border: '1px solid #86efac', borderRadius: 6, background: '#f0fdf4', fontSize: 13 },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  exampleCard: { marginTop: 14, padding: 14, border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb' },
  cardTitle: { marginBottom: 12, color: '#92400e', fontWeight: 700, fontSize: 13 },
  itemsList: { display: 'grid', gap: 12, marginTop: 16 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1f2937' },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  removeButton: { marginLeft: 'auto', padding: '5px 9px', border: '1px solid #fecaca', borderRadius: 5, background: '#fff', color: '#b91c1c' },
  addButton: { marginTop: 12, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' },
  preview: { marginTop: 18, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1f2937', fontFamily: 'serif' },
  previewTitle: { margin: '0 0 10px', fontFamily: 'inherit', fontSize: 15 },
  previewInstruction: { margin: '0 0 12px', fontWeight: 700 },
  previewExample: { display: 'flex', gap: 8, marginBottom: 12, color: '#475569', fontStyle: 'italic', lineHeight: 1.8 },
  exampleLabel: { fontWeight: 700 },
  previewItems: { display: 'grid', gap: 10 },
  previewItem: { lineHeight: 1.8 },
  sourceText: { color: '#1f2937' },
  previewResponse: { marginLeft: 18, color: '#334155' },
  blank: { display: 'inline-block', minWidth: 210, borderBottom: '1px solid #334155', color: 'transparent' },
  previewScore: { marginTop: 12, textAlign: 'right', color: '#475569', fontWeight: 700 },
  empty: { color: '#64748b' },
};

export default ReportedCommandCompletionEditor;
