import React from 'react';
import { PREPARE_GRAMMAR_SENTENCE_TEMPLATES } from '../../../config/questionTypes';

const EMPTY_ITEM = { questionText: '', blankAnswers: ['', ''] };
const renderSentence = (text, renderBlank) => String(text || '').split(/(\{[12]\})/g).map((part, index) => {
  const match = part.match(/^\{([12])\}$/);
  return match ? renderBlank(Number(match[1]) - 1, index) : part;
});

const ConditionalSentenceCompletionEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const items = Array.isArray(question.items) ? question.items : [];
  const instruction = question.instruction || '';
  const scoreNote = question.scoreNote || '';

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const updateAnswer = (item, itemIndex, blankIndex, value) => {
    const blankAnswers = Array.isArray(item.blankAnswers) ? [...item.blankAnswers] : ['', ''];
    blankAnswers[blankIndex] = value;
    updateItem(itemIndex, 'blankAnswers', blankAnswers);
  };

  const applyTemplate = (templateId) => {
    const template = PREPARE_GRAMMAR_SENTENCE_TEMPLATES[templateId];
    if (!template) return;
    onChange('templateId', templateId);
    onChange('instruction', template.instruction);
    onChange('items', template.items.map((item) => ({
      ...item,
      blankAnswers: [...item.blankAnswers],
    })));
  };

  const addItem = () => {
    onChange('items', [...items, { ...EMPTY_ITEM, blankAnswers: [...EMPTY_ITEM.blankAnswers] }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange('items', items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Hoàn thành câu điều kiện</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · 2 ô/câu · 0,5 điểm/ô
          </div>
        </div>
        <span style={styles.countBadge}>{items.length} câu · {items.length * 2} ô</span>
      </div>

      <div style={styles.templates}>
        <strong style={styles.templateLabel}>Nạp nội dung mẫu:</strong>
        {Object.entries(PREPARE_GRAMMAR_SENTENCE_TEMPLATES).map(([templateId, template]) => (
          <button
            key={templateId}
            type="button"
            aria-pressed={question.templateId === templateId}
            onClick={() => applyTemplate(templateId)}
            style={{
              ...styles.templateButton,
              ...(question.templateId === templateId ? styles.activeTemplateButton : {}),
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      <label style={styles.label}>Hướng dẫn</label>
      <textarea
        aria-label="Hướng dẫn"
        value={instruction}
        onChange={(event) => onChange('instruction', event.target.value)}
        rows={2}
        style={styles.textarea}
      />

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
            <label style={styles.label}>Câu hỏi — chèn {'{1}'} và {'{2}'} vào chỗ trống</label>
            <textarea
              aria-label={`Nội dung câu ${index + 1}`}
              value={item.questionText || ''}
              onChange={(event) => updateItem(index, 'questionText', event.target.value)}
              placeholder="If you {1} (go) to Peru, you {2} (see) Machu Picchu."
              rows={2}
              style={styles.textarea}
            />
            <div style={styles.answerFields}>
              {[0, 1].map((blankIndex) => (
                <label key={blankIndex} style={styles.answerLabel}>
                  Đáp án ô {blankIndex + 1}
                  <input
                    type="text"
                    aria-label={`Đáp án ô ${blankIndex + 1} câu ${index + 1}`}
                    value={item.blankAnswers?.[blankIndex] || ''}
                    onChange={(event) => updateAnswer(item, index, blankIndex, event.target.value)}
                    placeholder={blankIndex === 0 ? 'go' : 'will see'}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>Chấp nhận đáp án tương đương, ngăn cách bằng |</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>+ Thêm câu</button>

      <label style={{ ...styles.label, marginTop: 16 }}>Ghi chú điểm hiển thị dưới bài</label>
      <input
        aria-label="Ghi chú điểm"
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
          {items.map((item, index) => (
            <div key={index} id={`question-${startingNumber + index}`} style={styles.previewItem}>
              <strong>{startingNumber + index}.</strong>{' '}
              {renderSentence(item.questionText, (blankIndex, key) => (
                <span key={key} style={styles.previewBlank} aria-label={`Ô trả lời ${blankIndex + 1}`}>
                  ______________
                </span>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937' },
  headerMeta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  countBadge: { padding: '6px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12 },
  templates: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16, padding: 10, border: '1px solid #dbeafe', borderRadius: 8, background: '#f8fafc' },
  templateLabel: { color: '#334155', fontSize: 12 },
  templateButton: { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 12 },
  activeTemplateButton: { borderColor: '#2563eb', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  label: { display: 'block', margin: '0 0 6px', color: '#374151', fontWeight: 600, fontSize: 13 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  itemsList: { display: 'grid', gap: 12, marginTop: 16 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1f2937' },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  removeButton: { marginLeft: 'auto', padding: '5px 9px', border: '1px solid #fecaca', borderRadius: 5, background: '#fff', color: '#b91c1c' },
  answerFields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 },
  answerLabel: { display: 'block', color: '#374151', fontWeight: 600, fontSize: 12 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 },
  helpText: { display: 'block', marginTop: 5, color: '#64748b', fontSize: 11 },
  addButton: { marginTop: 12, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' },
  preview: { marginTop: 18, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' },
  previewTitle: { margin: '0 0 10px', color: '#1f2937', fontSize: 15 },
  previewInstruction: { margin: '0 0 10px', fontWeight: 700, lineHeight: 1.6 },
  previewItems: { display: 'grid', gap: 6 },
  previewItem: { color: '#1f2937', fontFamily: 'serif', fontSize: 15, lineHeight: 2 },
  previewBlank: { display: 'inline-block', minWidth: 130, margin: '0 4px', borderBottom: '1px solid #334155', textAlign: 'center', color: 'transparent' },
  previewScoreNote: { marginTop: 12, textAlign: 'right', color: '#475569', fontWeight: 700 },
  previewEmpty: { color: '#64748b' },
};

export default ConditionalSentenceCompletionEditor;
