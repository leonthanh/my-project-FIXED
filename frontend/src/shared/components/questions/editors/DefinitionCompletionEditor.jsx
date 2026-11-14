import React from 'react';

const EMPTY_ITEM = { questionText: '', correctAnswer: '' };
const getPrimaryAnswer = (answer) => String(answer || '').split(/[|/]/)[0].trim();

const DefinitionCompletionEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const items = Array.isArray(question.items) ? question.items : [EMPTY_ITEM];
  const instruction = question.instruction || '';
  const scoreNote = question.scoreNote || '';

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
          <div style={styles.headerTitle}>Điền từ theo định nghĩa</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · cho sẵn chữ cái đầu
          </div>
        </div>
        <span style={styles.countBadge}>{items.length} câu · 1 điểm/câu</span>
      </div>

      <label style={styles.label}>Hướng dẫn</label>
      <textarea
        value={instruction}
        onChange={(event) => onChange('instruction', event.target.value)}
        rows={2}
        style={styles.textarea}
      />

      <div style={styles.itemsList}>
        {items.map((item, index) => {
          const answer = getPrimaryAnswer(item.correctAnswer);
          const firstLetter = Array.from(answer)[0] || '…';
          const remainingLength = Math.max(Array.from(answer).length - 1, 4);

          return (
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

              <label style={styles.label}>Định nghĩa / cụm từ gợi ý</label>
              <textarea
                value={item.questionText || ''}
                onChange={(event) => updateItem(index, 'questionText', event.target.value)}
                placeholder="a piece of art made from stone or wood"
                rows={2}
                style={styles.textarea}
              />

              <label style={{ ...styles.label, marginTop: 12 }}>Đáp án đúng</label>
              <input
                type="text"
                aria-label={`Đáp án đúng câu ${index + 1}`}
                value={item.correctAnswer || ''}
                onChange={(event) => updateItem(index, 'correctAnswer', event.target.value)}
                placeholder="sculpture"
                style={styles.input}
              />
              <span style={styles.helpText}>Có thể nhập đáp án tương đương, ngăn cách bằng |</span>

              <div style={styles.itemPreview}>
                <span style={styles.previewLabel}>Chữ cái đầu và độ dài hiển thị cho học sinh:</span>
                <div style={styles.previewWord}>
                  <strong>{firstLetter}</strong>
                  <span>{'_'.repeat(remainingLength)}</span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>
        + Thêm câu
      </button>

      <label style={{ ...styles.label, marginTop: 18 }}>Ghi chú điểm hiển thị dưới bài</label>
      <input
        type="text"
        value={scoreNote}
        onChange={(event) => onChange('scoreNote', event.target.value)}
        placeholder="____/5 (1 mark per answer)"
        style={styles.input}
      />

      <section aria-label="Xem trước câu hỏi" style={styles.preview}>
        <h3 style={styles.previewTitle}>Xem trước:</h3>
        {instruction && <p style={styles.previewInstruction}>{instruction}</p>}
        <div style={styles.previewItems}>
          {items.map((item, index) => {
            const answer = getPrimaryAnswer(item.correctAnswer);
            const firstLetter = Array.from(answer)[0] || '…';
            const remainingLength = Math.max(Array.from(answer).length - 1, 4);
            return (
              <div key={index} style={styles.previewItem} id={`question-${startingNumber + index}`}>
                <div style={styles.previewPrompt}>
                  <strong>{startingNumber + index}.</strong>{' '}
                  {item.questionText || 'Nội dung định nghĩa'}
                </div>
                <div style={styles.previewWord}>
                  <strong>{firstLetter}</strong>
                  <span>{'_'.repeat(remainingLength)}</span>
                </div>
              </div>
            );
          })}
          {!items.length && <p style={styles.previewEmpty}>Chưa có câu hỏi để xem trước.</p>}
        </div>
        {scoreNote && <div style={styles.previewScoreNote}>{scoreNote}</div>}
      </section>
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937' },
  headerMeta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  countBadge: { padding: '6px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12 },
  label: { display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  helpText: { display: 'block', marginTop: 5, color: '#64748b', fontSize: 11 },
  itemsList: { display: 'grid', gap: 12, marginTop: 16 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#1f2937' },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', fontWeight: 700 },
  removeButton: { marginLeft: 'auto', padding: '6px 10px', border: 0, borderRadius: 5, background: '#fee2e2', color: '#b91c1c', fontWeight: 600 },
  itemPreview: { marginTop: 12, padding: 10, borderRadius: 6, background: '#f8fafc' },
  previewLabel: { display: 'block', marginBottom: 6, color: '#64748b', fontSize: 11 },
  preview: { marginTop: 20, padding: 16, border: '1px solid #86efac', borderRadius: 8, background: '#f0fdf4' },
  previewTitle: { margin: '0 0 12px', color: '#166534', fontSize: 14 },
  previewInstruction: { margin: '0 0 12px', color: '#374151', fontWeight: 600 },
  previewItems: { display: 'grid', gap: 8 },
  previewItem: { padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' },
  previewPrompt: { color: '#1f2937', lineHeight: 1.7 },
  previewWord: { display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 4, color: '#111827', fontFamily: 'serif', letterSpacing: 1.5 },
  previewScoreNote: { marginTop: 12, color: '#475569', textAlign: 'right', fontWeight: 600, fontSize: 12 },
  previewEmpty: { margin: 0, color: '#64748b', fontStyle: 'italic' },
  addButton: { width: '100%', marginTop: 12, padding: 10, border: 0, borderRadius: 6, background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};

export default DefinitionCompletionEditor;
