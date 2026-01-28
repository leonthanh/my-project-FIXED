import React, { useState, useEffect, useRef } from 'react';
import QuillEditor from './QuillEditor';

// SummaryCompletionQuestion
// Teacher editor for "Complete the summary using the list of words A-L".
// - question.questionText contains the summary with [BLANK] placeholders
// - question.options is an array of option texts (A, B, C...)
// - question.blanks is an array of { id, blankNumber, correctAnswer } where correctAnswer is letter(s) like 'B' or 'B|C'
// Câu hỏi Tóm tắt Hoàn thành
// Trình soạn thảo dành cho giáo viên cho câu hỏi "Hoàn thành phần tóm tắt bằng cách sử dụng danh sách các từ A-L".
// - question.questionText chứa phần tóm tắt với các chỗ trống [BLANK]
// - question.options là một mảng các văn bản lựa chọn (A, B, C...)
// - question.blanks là một mảng gồm { id, blankNumber, correctAnswer } trong đó correctAnswer là chữ cái (hoặc các chữ cái) như 'B' hoặc 'B|C'

const SummaryCompletionQuestion = ({ question = {}, onChange }) => {
  const [summary, setSummary] = useState(question.questionText || '');
  const [options, setOptions] = useState(Array.isArray(question.options) ? question.options : ['','']);
  const [blanks, setBlanks] = useState(Array.isArray(question.blanks) ? question.blanks : []);
  const quillRef = useRef(null);

  useEffect(() => {
    // ensure blanks reflect occurrences of [BLANK]
    const plain = (summary || '').replace(/<[^>]+>/g, '');
    const matches = (plain.match(/\[BLANK\]/g) || []);
    const next = matches.map((_, idx) => ({ id: `blank_${idx}`, blankNumber: idx+1, correctAnswer: blanks[idx]?.correctAnswer || '' }));
    setBlanks(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  useEffect(() => {
    if (onChange) {
      onChange({ ...question, questionText: summary, options, blanks, questionType: 'summary-completion' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, options, blanks]);

  const handleOptionChange = (idx, value) => {
    const next = [...options]; next[idx] = value; setOptions(next);
  };
  const addOption = () => setOptions((s) => [...s, '']);
  const removeOption = (idx) => setOptions((s) => s.filter((_, i) => i !== idx));

  const handleBlankChange = (idx, value) => {
    const next = [...blanks]; next[idx] = { ...next[idx], correctAnswer: value }; setBlanks(next);
  };

  return (
    <div style={{ padding: 20, borderRadius: 8, backgroundColor: '#ecfdf5', border: '2px solid #34d399' }}>
      <h4 style={{ color: '#065f46' }}>Summary Completion</h4>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Summary text (use <code>[BLANK]</code> for blanks)</label>
        <QuillEditor editorRef={quillRef} value={summary} onChange={(v) => setSummary(v)} placeholder="Enter summary with [BLANK] placeholders" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Options (A, B, C...)</label>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{String.fromCharCode(65+idx)}</div>
              <input value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65+idx)}`} style={{ flex: 1, padding: '8px 12px' }} />
              {options.length > 2 && <button type="button" onClick={() => removeOption(idx)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 6 }}>×</button>}
            </div>
          ))}
          {options.length < 26 && (
            <button type="button" onClick={addOption} style={{ gridColumn: '1 / -1', padding: '10px', background: '#0e7490', color: 'white', borderRadius: 6 }}>+ Thêm option</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Answers for blanks (use letters A-L, separate variants with |)</label>
        {blanks.length === 0 ? (
          <p style={{ color: '#555' }}>No blanks found in summary. Add <code>[BLANK]</code> in the summary text.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blanks.map((b, idx) => (
              <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 44, textAlign: 'center', fontWeight: 700, color: '#065f46' }}>Câu {b.blankNumber}</div>
                <input value={b.correctAnswer} onChange={(e) => handleBlankChange(idx, e.target.value)} placeholder="Ví dụ: B hoặc B|C" style={{ flex: 1, padding: '8px 12px' }} />
                <div style={{ fontSize: 12, color: '#666' }}>Letters A..{String.fromCharCode(65 + Math.max(0, options.length-1))}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 6 }}>
        <strong>Tip:</strong> Enter the letter(s) corresponding to the option(s). Students should write the letter (A–L) next to each blank. Use <code>|</code> to separate multiple correct letters.
      </div>
    </div>
  );
};

export default SummaryCompletionQuestion;
