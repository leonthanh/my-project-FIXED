import React, { useState, useEffect, useRef } from 'react';
import QuillEditor from './QuillEditor';

/**
 * IELTS Cloze Test Question Component
 * 
 * Dạng điền chỗ trống trong đoạn văn:
 * - Học sinh đọc đoạn văn có các chỗ trống
 * - Điền từ/cụm từ phù hợp vào mỗi chỗ trống
 * - Thường có giới hạn số từ
 */

const ClozeTestQuestion = ({ question, onChange }) => {
  const [paragraphText, setParagraphText] = useState(question?.paragraphText || '');
  const [maxWords, setMaxWords] = useState(question?.maxWords || 3);
  const [blanks, setBlanks] = useState(question?.blanks || []);
  const quillRef = useRef(null);

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentCyan = '#0891b2';

  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Phát hiện [BLANK] và tạo blanks array
  useEffect(() => {
    const plainText = stripHtml(paragraphText);
    const blankMatches = plainText.match(/\[BLANK\]/g) || [];
    const newBlanks = blankMatches.map((_, idx) => ({
      id: `blank_${idx}`,
      blankNumber: idx + 1,
      correctAnswer: blanks[idx]?.correctAnswer || ''
    }));
    setBlanks(newBlanks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphText]);

  // Cập nhật question object
  useEffect(() => {
    if (onChange) {
      onChange({
        ...question,
        paragraphText,
        maxWords,
        blanks
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphText, maxWords, blanks]);

  const handleBlankChange = (idx, value) => {
    const newBlanks = [...blanks];
    newBlanks[idx].correctAnswer = value;
    setBlanks(newBlanks);
  };

  // Insert [BLANK] at cursor position
  const insertBlank = () => {
    const editor = quillRef.current?.getEditor?.();
    if (editor) {
      const cursorPosition = editor.getSelection()?.index ?? editor.getLength();
      editor.insertText(cursorPosition, '[BLANK]');
      editor.setSelection(cursorPosition + '[BLANK]'.length);
      return;
    }
    setParagraphText((prev) => `${prev || ''} [BLANK]`);
  };

  // Hiển thị preview đoạn văn với input fields
  const renderPreview = () => {
    if (!paragraphText) return null;

    let questionNum = parseInt(question?.questionNumber) || 1;
    let blankIndex = 0;
    const blankStyle = `display:inline-block;min-width:130px;padding:6px 12px;border:2px solid ${accentCyan};border-radius:6px;background:#f0fdfa;text-align:center;font-size:14px;color:${accentCyan};font-weight:bold;`;
    const htmlWithBlanks = (paragraphText || '').replace(/\[BLANK\]/g, () => {
      const label = questionNum + blankIndex;
      blankIndex += 1;
      return `<span style="${blankStyle}">${label}</span>`;
    });
    
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        lineHeight: '2.2',
        fontSize: '15px',
        border: '1px solid #e0e0e0'
      }}>
        <div dangerouslySetInnerHTML={{ __html: htmlWithBlanks }} />
      </div>
    );
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#ecfeff',
      borderRadius: '12px',
      border: `2px solid ${accentCyan}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentCyan}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentCyan,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentCyan,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      marginLeft: 'auto'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 10px 0',
      color: primaryBlue,
      fontSize: '14px',
      fontWeight: 'bold'
    },
    textarea: {
      width: '100%',
      minHeight: '140px',
      padding: '15px',
      border: `2px solid ${accentCyan}`,
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      lineHeight: '1.6',
      resize: 'vertical'
    },
    tip: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '10px',
      padding: '10px 15px',
      backgroundColor: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#c2410c'
    },
    insertButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: accentCyan,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      marginTop: '10px'
    },
    wordLimitBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '15px 20px',
      backgroundColor: '#fef3c7',
      border: '2px solid #fbbf24',
      borderRadius: '8px',
      fontSize: '14px'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#cffafe',
      borderRadius: '8px',
      border: '1px solid #a5f3fc'
    },
    previewTitle: {
      margin: '0 0 15px 0',
      color: '#0e7490',
      fontSize: '14px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    answersSection: {
      marginTop: '20px',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: `2px solid ${accentCyan}`
    },
    answerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '12px',
      padding: '12px 15px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    blankBadge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '80px',
      padding: '8px 12px',
      backgroundColor: accentCyan,
      color: 'white',
      borderRadius: '6px',
      fontWeight: 'bold',
      fontSize: '13px',
      flexShrink: 0
    },
    answerInput: {
      flex: 1,
      padding: '10px 15px',
      border: '2px solid #e2e8f0',
      borderRadius: '6px',
      fontSize: '14px',
      transition: 'border-color 0.3s'
    },
    helpSection: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#f0fdfa',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#0f766e',
      borderLeft: `4px solid ${accentCyan}`
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📄</span>
        <h4 style={styles.headerTitle}>Cloze Test (Điền chỗ trống trong đoạn văn)</h4>
        <span style={styles.headerBadge}>IELTS Reading/Listening</span>
      </div>

      {/* Paragraph Input */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>📖</span> Nhập đoạn văn (Đánh dấu chỗ trống bằng [BLANK]):
        </h5>
        <QuillEditor
          editorRef={quillRef}
          value={paragraphText}
          onChange={(value) => setParagraphText(value)}
          placeholder="VD: The machinery used in the process of making the snow consumes a lot of 11 [BLANK] which is damaging to the environment. Artificial snow is used in agriculture as a type of 12 [BLANK] for plants in cold conditions."
          insertBlankText="[BLANK]"
        />
        
        {/* Insert BLANK button */}
        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            insertBlank();
          }}
          style={styles.insertButton}
        >
          ➕ Chèn [BLANK]
        </button>

        {/* Tip */}
        <div style={styles.tip}>
          <span>💡</span>
          <span><strong>Tip:</strong> Sử dụng <code style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>[BLANK]</code> để đánh dấu mỗi chỗ trống trong đoạn văn</span>
        </div>
      </div>

      {/* Max Words */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>
          <span>🔢</span> Số từ tối đa cho mỗi chỗ trống:
        </h5>
        <div style={styles.wordLimitBox}>
          <span>Write <strong>NO MORE THAN</strong></span>
          <input
            type="number"
            value={maxWords}
            onChange={(e) => setMaxWords(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            style={{
              width: '60px',
              padding: '8px',
              border: '2px solid #fbbf24',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          />
          <span><strong>WORDS</strong> for each answer</span>
        </div>
      </div>

      {/* Preview */}
      {paragraphText && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>
            <span>👁</span> Preview - Học sinh sẽ thấy:
          </h5>
          {renderPreview()}
        </div>
      )}

      {/* Blank Answers */}
      {blanks.length > 0 && (
        <div style={styles.answersSection}>
          <h5 style={styles.sectionTitle}>
            <span>✍️</span> Đáp án cho mỗi chỗ trống:
          </h5>
          
          {blanks.map((blank, idx) => {
            const questionNum = parseInt(question?.questionNumber) || 1;
            return (
              <div key={idx} style={styles.answerRow}>
                <div style={styles.blankBadge}>
                  Câu {questionNum + idx}
                </div>
                <input
                  type="text"
                  value={blank.correctAnswer}
                  onChange={(e) => handleBlankChange(idx, e.target.value)}
                  placeholder={`Nhập đáp án (tối đa ${maxWords} từ)`}
                  style={styles.answerInput}
                />
                {blank.correctAnswer && (
                  <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <div style={styles.helpSection}>
        <strong>💡 Hướng dẫn sử dụng:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Nhập/paste đoạn văn gốc vào ô text</li>
          <li>Đặt con trỏ vào vị trí cần tạo chỗ trống, nhấn nút <strong>"Chèn [BLANK]"</strong></li>
          <li>Hệ thống sẽ tự động tạo các ô nhập đáp án bên dưới</li>
          <li>Số câu hỏi sẽ nối tiếp từ số câu hỏi hiện tại (VD: câu 11 → 11, 12, 13...)</li>
        </ul>
      </div>
    </div>
  );
};

export default ClozeTestQuestion;
