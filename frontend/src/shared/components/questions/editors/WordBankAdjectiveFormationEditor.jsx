import React from 'react';

const EMPTY_ITEM = { questionText: '', correctAnswer: '' };
const renderPrompt = (text, renderBlank) => String(text || '').split(/(\{1\})/g).map((part, index) => (
  part === '{1}' ? renderBlank(index) : part
));

const WordBankAdjectiveFormationEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const wordBank = Array.isArray(question.wordBank) ? question.wordBank : [];
  const items = Array.isArray(question.items) ? question.items : [EMPTY_ITEM];
  const instruction = question.instruction || '';
  const scoreNote = question.scoreNote || '';

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const updateWordBank = (value) => {
    onChange(
      'wordBank',
      value.split(/[\n,★]+/).map((word) => word.trim()).filter(Boolean)
    );
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
          <div style={styles.headerTitle}>Tạo tính từ từ word bank</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · 1 từ thừa · 1 điểm/câu
          </div>
        </div>
        <span style={styles.countBadge}>{wordBank.length} từ · {items.length} câu</span>
      </div>

      <label style={styles.label}>Hướng dẫn</label>
      <textarea
        value={instruction}
        onChange={(event) => onChange('instruction', event.target.value)}
        rows={2}
        style={styles.textarea}
      />

      <label style={{ ...styles.label, marginTop: 16 }}>Word bank — các từ gốc</label>
      <textarea
        aria-label="Word bank"
        value={wordBank.join(', ')}
        onChange={(event) => updateWordBank(event.target.value)}
        placeholder="history, stress, colour, pain, origin, nature"
        rows={2}
        style={styles.textarea}
      />
      <p style={styles.helpText}>
        Nhập các từ, ngăn cách bằng dấu phẩy hoặc xuống dòng. Số từ cần nhiều hơn số câu đúng một từ.
      </p>

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

            <label style={styles.label}>Câu có chỗ trống — dùng {'{1}'}</label>
            <textarea
              value={item.questionText || ''}
              onChange={(event) => updateItem(index, 'questionText', event.target.value)}
              placeholder="Doing exams every day for a month is very {1}."
              rows={2}
              style={styles.textarea}
            />

            <label style={{ ...styles.label, marginTop: 12 }}>Tính từ đúng</label>
            <input
              type="text"
              aria-label={`Tính từ đúng câu ${index + 1}`}
              value={item.correctAnswer || ''}
              onChange={(event) => updateItem(index, 'correctAnswer', event.target.value)}
              placeholder="stressful"
              style={styles.input}
            />
            <span style={styles.helpText}>Có thể nhập đáp án tương đương, ngăn cách bằng |</span>
          </section>
        ))}
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
        <div style={styles.previewWordBank}>
          {wordBank.length
            ? wordBank.map((word, index) => (
              <React.Fragment key={`${word}-${index}`}>
                {index > 0 && <span style={styles.wordSeparator}>★</span>}
                <strong>{word}</strong>
              </React.Fragment>
            ))
            : <span style={styles.previewEmpty}>Chưa có từ trong word bank.</span>}
        </div>
        <div style={styles.previewItems}>
          {items.map((item, index) => (
            <div key={index} id={`question-${startingNumber + index}`} style={styles.previewItem}>
              <strong>{startingNumber + index}.</strong>{' '}
              {renderPrompt(item.questionText || 'Nội dung câu hỏi {1}.', (key) => (
                <span key={key} style={styles.previewBlank}>________________</span>
              ))}
            </div>
          ))}
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
  preview: { marginTop: 20, padding: 16, border: '1px solid #86efac', borderRadius: 8, background: '#f0fdf4' },
  previewTitle: { margin: '0 0 12px', color: '#166534', fontSize: 14 },
  previewInstruction: { margin: '0 0 12px', color: '#1f2937', fontFamily: 'serif', fontWeight: 700, lineHeight: 1.7 },
  previewWordBank: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 10px', background: '#fff', borderRadius: 6, color: '#1f2937', fontFamily: 'serif' },
  wordSeparator: { color: '#334155' },
  previewItems: { display: 'grid', gap: 8 },
  previewItem: { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#1f2937', fontFamily: 'serif', lineHeight: 1.8 },
  previewBlank: { display: 'inline-block', minWidth: 140, color: '#111827', letterSpacing: 1.4, whiteSpace: 'nowrap' },
  previewScoreNote: { marginTop: 12, color: '#475569', textAlign: 'right', fontWeight: 600, fontSize: 12 },
  previewEmpty: { margin: 0, color: '#64748b', fontStyle: 'italic' },
  addButton: { width: '100%', marginTop: 12, padding: 10, border: 0, borderRadius: 6, background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};

export default WordBankAdjectiveFormationEditor;
