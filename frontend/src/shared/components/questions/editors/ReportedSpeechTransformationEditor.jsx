import React from 'react';

const EMPTY_ITEM = {
  sourceText: '',
  targetPrefix: '',
  targetSuffix: '',
  correctAnswer: '',
};

const ReportedSpeechTransformationEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const items = Array.isArray(question.items) ? question.items : [];

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const addItem = () => {
    onChange('items', [...items, { ...EMPTY_ITEM }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange('items', items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Chuyển đổi Direct Speech / Reported Speech</div>
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

            <label style={styles.label}>
              Câu gốc
              <textarea
                aria-label={`Câu gốc câu ${index + 1}`}
                value={item.sourceText || ''}
                onChange={(event) => updateItem(index, 'sourceText', event.target.value)}
                rows={2}
                style={styles.textarea}
              />
            </label>

            <div style={styles.frameGrid}>
              <label style={styles.label}>
                Phần câu trước chỗ trống
                <input
                  type="text"
                  aria-label={`Phần trước câu ${index + 1}`}
                  value={item.targetPrefix || ''}
                  onChange={(event) => updateItem(index, 'targetPrefix', event.target.value)}
                  placeholder="Alice said "
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Phần câu sau chỗ trống
                <input
                  type="text"
                  aria-label={`Phần sau câu ${index + 1}`}
                  value={item.targetSuffix || ''}
                  onChange={(event) => updateItem(index, 'targetSuffix', event.target.value)}
                  placeholder="."
                  style={styles.input}
                />
              </label>
            </div>

            <label style={styles.label}>
              Đáp án đúng — phần học sinh cần viết
              <input
                type="text"
                aria-label={`Đáp án đúng câu ${index + 1}`}
                value={item.correctAnswer || ''}
                onChange={(event) => updateItem(index, 'correctAnswer', event.target.value)}
                placeholder="she loved reading fashion magazines"
                style={styles.answerInput}
              />
              <span style={styles.helpText}>Có thể nhập đáp án tương đương, ngăn cách bằng |</span>
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
        <div style={styles.previewItems}>
          {items.map((item, index) => (
            <div key={index} id={`question-${startingNumber + index}`} style={styles.previewItem}>
              <div><strong>{startingNumber + index}.</strong> {item.sourceText || 'Câu gốc'}</div>
              <div style={styles.targetSentence}>
                <span>{item.targetPrefix || '...'}</span>
                <span style={styles.blank} aria-label={`Ô trả lời câu ${index + 1}`}>________________________</span>
                <span>{item.targetSuffix}</span>
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
  helpText: { display: 'block', marginTop: 5, color: '#64748b', fontSize: 11 },
  frameGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  itemsList: { display: 'grid', gap: 12, marginTop: 14 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1f2937' },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  removeButton: { marginLeft: 'auto', padding: '5px 9px', border: '1px solid #fecaca', borderRadius: 5, background: '#fff', color: '#b91c1c' },
  addButton: { marginTop: 12, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' },
  preview: { marginTop: 18, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1f2937', fontFamily: 'serif' },
  previewTitle: { margin: '0 0 10px', fontFamily: 'inherit', fontSize: 15 },
  previewInstruction: { margin: '0 0 12px', fontWeight: 700 },
  previewItems: { display: 'grid', gap: 10 },
  previewItem: { lineHeight: 1.8 },
  targetSentence: { marginLeft: 20, color: '#334155', whiteSpace: 'pre-wrap' },
  blank: { display: 'inline-block', minWidth: 180, borderBottom: '1px solid #334155', color: 'transparent', whiteSpace: 'nowrap' },
  previewScore: { marginTop: 12, textAlign: 'right', color: '#475569', fontWeight: 700 },
  empty: { color: '#64748b' },
};

export default ReportedSpeechTransformationEditor;
