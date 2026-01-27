import React from 'react';

const letterToIndex = (letter) => {
  if (!letter) return -1;
  const L = String(letter).trim().toUpperCase();
  return L.charCodeAt(0) - 65;
};

const SummaryCompletionDisplay = ({ section, startingNumber, onAnswerChange, answers, submitted }) => {
  const questions = section.questions || [];

  return (
    <div style={{ marginBottom: 24 }}>
      {questions.map((q, qIdx) => {
        const passage = q.questionText || '';
        // plain text used to count blanks
        const plain = passage.replace(/<[^>]+>/g, '');
        const blankCount = (plain.match(/\[BLANK\]/g) || []).length;
        const opts = Array.isArray(q.options) ? q.options : [];

        return (
          <div key={qIdx} style={{ marginBottom: 20 }}>
            <div style={{ padding: 20, backgroundColor: '#fffbeb', borderRadius: 12, border: '2px solid #fcd34d', marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: passage.replace(/\[BLANK\]/g, '<span style="display:inline-block;padding:2px 16px;background:#fff3cd;border:2px dashed #ffc107;border-radius:4px;">______</span>') }} />

            {/* Blanks inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: blankCount }).map((_, bi) => {
                const questionNumber = startingNumber + bi;
                const questionKey = `${section.id}-${qIdx}-${bi}`;
                const userAnswer = answers[questionKey] || '';
                const submittedLetter = userAnswer && typeof userAnswer === 'string' ? userAnswer.trim().toUpperCase() : '';

                return (
                  <div key={bi} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: '#0e276f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{questionNumber}</div>
                    <input type="text" value={userAnswer} onChange={(e) => onAnswerChange(questionKey, e.target.value)} disabled={submitted} placeholder="Viết chữ cái (A-L)" style={{ padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: 6 }} />
                    {submitted && (
                      <div style={{ padding: '8px 12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 6, fontWeight: 700 }}>
                        {submittedLetter || '(no answer)'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Options list */}
            {opts.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong>Options:</strong>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {opts.map((opt, idx) => (
                    <div key={idx} style={{ background: '#fff7ed', padding: '6px 10px', borderRadius: 20, border: '1px solid #fcd34d', color: '#92400e' }}>
                      <strong style={{ marginRight: 6 }}>{String.fromCharCode(65 + idx)}</strong>{opt}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};

export default SummaryCompletionDisplay;
