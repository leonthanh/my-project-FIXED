import React from 'react';

const EMPTY_ANSWER = ['', ''];
const normalizeBankWords = (words) => (Array.isArray(words) ? words : []);
const renderSentence = (text, renderBlank) => String(text || '').split(/(\{[12]\})/g).map((part, index) => {
  const blankMatch = part.match(/^\{([12])\}$/);
  return blankMatch ? renderBlank(Number(blankMatch[1]) - 1, index) : part;
});

const WordBankCompletionEditor = ({ question = {}, onChange, startingNumber = 1 }) => {
  const wordBanks = Array.isArray(question.wordBanks) ? question.wordBanks : [];
  const example = question.example || { questionText: '', blankAnswers: EMPTY_ANSWER };
  const items = Array.isArray(question.items) ? question.items : [];
  const instruction = question.instruction || '';
  const scoreNote = question.scoreNote || '';
  const usedExampleWords = new Set((Array.isArray(example.blankAnswers) ? example.blankAnswers : []).map((answer) => (
    String(answer || '').trim().toLowerCase()
  )));

  const renderPrompt = (text) => renderSentence(text, (blankIndex, key) => (
    <span key={key} aria-label={`Ô trả lời ${blankIndex + 1}`} style={styles.previewPromptBlank}>________</span>
  ));
  const renderAnswer = (item) => renderSentence(item.questionText, (blankIndex, key) => (
    <strong key={key} style={styles.previewAnswer}>
      {String(item.blankAnswers?.[blankIndex] || '').split(/[|/]/)[0].trim() || '________'}
    </strong>
  ));

  const updateItem = (index, field, value) => {
    onChange('items', items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const updateAnswer = (item, index, value) => {
    const answers = Array.isArray(item.blankAnswers) ? [...item.blankAnswers] : [...EMPTY_ANSWER];
    answers[index] = value;
    return answers;
  };

  const updateExample = (field, value) => {
    onChange('example', { ...example, [field]: value });
  };

  const updateExampleAnswer = (index, value) => {
    updateExample('blankAnswers', updateAnswer(example, index, value));
  };

  const updateBank = (index, value) => {
    const nextBanks = wordBanks.map((bank, bankIndex) => (
      bankIndex === index ? { ...bank, words: value.split(/[\n,]/).map((word) => word.trim()).filter(Boolean) } : bank
    ));
    onChange('wordBanks', nextBanks);
  };

  const addItem = () => {
    onChange('items', [...items, { questionText: '', blankAnswers: [...EMPTY_ANSWER] }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange('items', items.filter((_, itemIndex) => itemIndex !== index));
  };

  const renderAnswerFields = (item, onAnswerChange, prefix) => (
    <div style={styles.answerFields}>
      {[0, 1].map((answerIndex) => (
        <label key={`${prefix}-${answerIndex}`} style={styles.answerLabel}>
          Đáp án ô {answerIndex + 1}
          <input
            type="text"
            aria-label={`Đáp án ô ${answerIndex + 1}`}
            value={item.blankAnswers?.[answerIndex] || ''}
            onChange={(event) => onAnswerChange(answerIndex, event.target.value)}
            placeholder={answerIndex === 0 ? 'Từ trong danh sách A' : 'Từ trong danh sách B'}
            style={styles.input}
          />
          <span style={styles.helpText}>Có thể nhập đáp án tương đương, ngăn cách bằng |</span>
        </label>
      ))}
    </div>
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Hoàn thành câu với hai nhóm từ</div>
          <div style={styles.headerMeta}>
            Questions {startingNumber}-{startingNumber + items.length - 1} · mỗi câu có hai ô trả lời
          </div>
        </div>
        <span style={styles.countBadge}>{items.length} câu · {items.length * 2} ô</span>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Hướng dẫn</label>
        <textarea
          value={instruction}
          onChange={(event) => onChange('instruction', event.target.value)}
          placeholder="Complete each sentence with a word from list A and a word from list B."
          rows={2}
          style={styles.textarea}
        />
      </div>

      <div style={styles.bankGrid}>
        {[0, 1].map((bankIndex) => {
          const bank = wordBanks[bankIndex] || { label: bankIndex === 0 ? 'A' : 'B', words: [] };
          return (
            <label key={bankIndex} style={styles.bankCard}>
              <span style={styles.label}>Danh sách {bank.label || (bankIndex === 0 ? 'A' : 'B')}</span>
              <textarea
                value={normalizeBankWords(bank.words).join(', ')}
                onChange={(event) => updateBank(bankIndex, event.target.value)}
                placeholder="Nhập các từ, ngăn cách bằng dấu phẩy"
                rows={3}
                style={styles.textarea}
              />
              <span style={styles.helpText}>Phân cách các từ bằng dấu phẩy hoặc xuống dòng.</span>
            </label>
          );
        })}
      </div>

      <section style={styles.exampleCard}>
        <div style={styles.itemHeader}>
          <strong>Ví dụ (không tính điểm)</strong>
        </div>
        <label style={styles.label}>Câu ví dụ — dùng {'{1}'} và {'{2}'} tại vị trí cần điền</label>
        <textarea
          value={example.questionText || ''}
          onChange={(event) => updateExample('questionText', event.target.value)}
          rows={2}
          style={styles.textarea}
        />
        {renderAnswerFields(example, updateExampleAnswer, 'example')}
      </section>

      <div style={styles.itemsList}>
        {items.map((item, index) => (
          <section key={index} style={styles.itemCard}>
            <div style={styles.itemHeader}>
              <span style={styles.questionNumber}>{startingNumber + index}</span>
              <strong style={{ color: '#1f2937' }}>Câu {index + 1}</strong>
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
            <label style={styles.label}>Nội dung câu — chèn {'{1}'} và {'{2}'} vào chỗ trống</label>
            <textarea
              value={item.questionText || ''}
              onChange={(event) => updateItem(index, 'questionText', event.target.value)}
              placeholder="Now {1} {2} these two numbers."
              rows={2}
              style={styles.textarea}
            />
            {renderAnswerFields(item, (answerIndex, value) => (
              updateItem(index, 'blankAnswers', updateAnswer(item, answerIndex, value))
            ), `item-${index}`)}
          </section>
        ))}
      </div>

      <button type="button" onClick={addItem} style={styles.addButton}>
        + Thêm câu
      </button>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Ghi chú điểm hiển thị dưới bài</label>
        <input
          type="text"
          value={scoreNote}
          onChange={(event) => onChange('scoreNote', event.target.value)}
          placeholder="____/5 (1 mark per answer)"
          style={styles.input}
        />
      </div>

      <section aria-label="Xem trước câu hỏi" style={styles.preview}>
        <h3 style={styles.previewTitle}>Xem trước:</h3>
        {instruction && <p style={styles.previewInstruction}>{instruction}</p>}
        <div style={styles.previewBanks}>
          {wordBanks.map((bank, bankIndex) => (
            <div key={`${bank.label || bankIndex}-${bankIndex}`} style={styles.previewBank}>
              <strong>{bank.label || String.fromCharCode(65 + bankIndex)}.</strong>
              <span>
                {(bank.words || []).map((word, wordIndex) => (
                  <React.Fragment key={`${word}-${wordIndex}`}>
                    {wordIndex > 0 && ' | '}
                    <span style={usedExampleWords.has(String(word || '').trim().toLowerCase())
                      ? styles.previewUsedWord
                      : undefined}
                    >
                      {word || 'Từ trong danh sách'}
                    </span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
        {example.questionText && (
          <div style={styles.previewExample}>
            <strong>0.</strong>
            <span>{renderAnswer(example)}</span>
          </div>
        )}
        <div style={styles.previewItems}>
          {items.map((item, index) => (
            <div key={index} style={styles.previewItem}>
              <div style={styles.previewPrompt}>
                <strong>{startingNumber + index}.</strong>{' '}
                {renderPrompt(item.questionText || 'Nội dung câu hỏi {1} {2}.')}
              </div>
              <div style={styles.previewAnswerLine}>{renderAnswer(item)}</div>
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
  fieldGroup: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  helpText: { display: 'block', marginTop: 5, color: '#64748b', fontSize: 11 },
  bankGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 },
  bankCard: { display: 'block', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc' },
  exampleCard: { padding: 14, marginBottom: 16, border: '1px dashed #94a3b8', borderRadius: 8, background: '#f8fafc' },
  itemsList: { display: 'grid', gap: 12 },
  itemCard: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  questionNumber: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', fontWeight: 700 },
  answerFields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 },
  answerLabel: { color: '#475569', fontWeight: 600, fontSize: 12 },
  removeButton: { marginLeft: 'auto', padding: '6px 10px', border: 0, borderRadius: 5, background: '#fee2e2', color: '#b91c1c', fontWeight: 600 },
  addButton: { width: '100%', marginTop: 12, padding: 10, border: 0, borderRadius: 6, background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  preview: { marginTop: 20, padding: 16, border: '1px solid #86efac', borderRadius: 8, background: '#f0fdf4' },
  previewTitle: { margin: '0 0 12px', color: '#166534', fontSize: 14 },
  previewInstruction: { margin: '0 0 12px', color: '#374151', fontWeight: 600 },
  previewBanks: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 },
  previewBank: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', lineHeight: 1.7 },
  previewUsedWord: { color: '#64748b', textDecoration: 'line-through' },
  previewExample: { display: 'flex', gap: 8, marginBottom: 10, padding: '8px 10px', borderRadius: 6, background: '#fff', color: '#475569', lineHeight: 1.8 },
  previewItems: { display: 'grid', gap: 8 },
  previewItem: { padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' },
  previewPrompt: { color: '#1f2937', lineHeight: 1.7 },
  previewPromptBlank: { color: '#64748b', textDecoration: 'underline' },
  previewAnswerLine: { marginTop: 4, color: '#166534', fontWeight: 600, lineHeight: 1.7 },
  previewAnswer: { margin: '0 2px', color: '#166534', textDecoration: 'underline' },
  previewEmpty: { margin: 0, color: '#64748b', fontStyle: 'italic' },
  previewScoreNote: { marginTop: 12, color: '#475569', textAlign: 'right', fontWeight: 600, fontSize: 12 },
};

export default WordBankCompletionEditor;
