import React, { useState, useEffect } from 'react';

const ClozeTestQuestion = ({ question, onChange }) => {
  const [paragraphText, setParagraphText] = useState(question.paragraphText || '');
  const [maxWords, setMaxWords] = useState(question.maxWords || 3);
  const [blanks, setBlanks] = useState(question.blanks || []);

  // Phát hiện [BLANK] và tạo blanks array
  useEffect(() => {
    const blankMatches = paragraphText.match(/\[BLANK\]/g) || [];
    const newBlanks = blankMatches.map((_, idx) => ({
      id: `blank_${idx}`,
      blankNumber: idx + 1,
      correctAnswer: blanks[idx]?.correctAnswer || ''
    }));
    setBlanks(newBlanks);
  }, [paragraphText]);

  // Cập nhật question object
  useEffect(() => {
    onChange({
      ...question,
      paragraphText,
      maxWords,
      blanks
    });
  }, [paragraphText, maxWords, blanks]);

  const handleBlankChange = (idx, value) => {
    const newBlanks = [...blanks];
    newBlanks[idx].correctAnswer = value;
    setBlanks(newBlanks);
  };

  // Hiển thị preview đoạn văn với input fields
  const renderPreview = () => {
    if (!paragraphText) return null;

    const parts = paragraphText.split(/\[BLANK\]/);
    return (
      <div style={{ 
        backgroundColor: '#f9f9f9', 
        padding: '12px', 
        borderRadius: '4px',
        marginTop: '10px',
        lineHeight: '1.8',
        fontSize: '14px'
      }}>
        {parts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <span style={{ 
                display: 'inline-block',
                width: '120px',
                height: '28px',
                border: '2px solid #0e276f',
                borderRadius: '4px',
                margin: '0 4px',
                backgroundColor: '#fff',
                textAlign: 'center',
                fontSize: '12px',
                color: '#999'
              }}>
                {blanks[idx]?.blankNumber || idx + 1}
              </span>
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '6px', marginTop: '10px' }}>
      <h6 style={{ margin: '0 0 12px 0', color: '#0e276f' }}>📝 Cloze Test (Điền chỗ trống trong đoạn văn)</h6>

      {/* Paragraph Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          📖 Nhập đoạn văn (Đánh dấu chỗ trống bằng [BLANK]):
        </label>
        <textarea
          value={paragraphText}
          onChange={(e) => setParagraphText(e.target.value)}
          placeholder="VD: Another example of cheap technology helping poor people in the countryside is [BLANK]. Kerosene lamps and conventional bulbs give off less [BLANK] than GSBF lamps."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '10px',
            border: '2px solid #0e276f',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box'
          }}
        />
        <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
          💡 Tip: Sử dụng [BLANK] để đánh dấu mỗi chỗ trống trong đoạn văn
        </small>
      </div>

      {/* Max Words */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          🔢 Số từ tối đa cho mỗi chỗ trống:
        </label>
        <input
          type="number"
          value={maxWords}
          onChange={(e) => setMaxWords(parseInt(e.target.value) || 1)}
          min="1"
          max="10"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Preview */}
      {paragraphText && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px' }}>
            👁 Preview:
          </label>
          {renderPreview()}
        </div>
      )}

      {/* Blank Answers */}
      {blanks.length > 0 && (
        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
          <h6 style={{ margin: '0 0 10px 0', color: '#0e276f' }}>✍️ Đáp án cho mỗi chỗ trống:</h6>
          {blanks.map((blank, idx) => (
            <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < blanks.length - 1 ? '1px solid #eee' : 'none' }}>
              <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Chỗ trống #{blank.blankNumber}:
              </label>
              <input
                type="text"
                value={blank.correctAnswer}
                onChange={(e) => handleBlankChange(idx, e.target.value)}
                placeholder={`Nhập đáp án (tối đa ${maxWords} từ)`}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px', fontSize: '12px', color: '#0e276f', borderLeft: '3px solid #0e276f' }}>
        <strong>ℹ️ Thông tin:</strong> Hệ thống đã phát hiện <strong>{blanks.length}</strong> chỗ trống trong đoạn văn
      </div>
    </div>
  );
};

export default ClozeTestQuestion;
