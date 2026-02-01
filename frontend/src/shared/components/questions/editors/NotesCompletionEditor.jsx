import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * NotesCompletionEditor - Paste text với ___ hoặc số câu, hệ thống tự tách
 * Dùng cho: IELTS Listening Notes Completion
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu (default: 1)
 * @param {Object} props.styles - Custom styles (optional)
 */
const NotesCompletionEditor = ({
  question,
  onChange,
  startingNumber = 1,
  styles = {},
}) => {
  // Default styles
  const defaultStyles = {
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      marginBottom: "8px",
      boxSizing: "border-box",
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontWeight: 600,
      fontSize: "12px",
      color: "#6b7280",
    },
    ...styles,
  };

  const notesText = question.notesText || '';
  const notesTitle = question.notesTitle || '';
  const wordLimit = question.wordLimit || 'ONE WORD ONLY';
  const answers = question.answers || {};

  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };
  
  // Parse blanks from text - matches "31 ___" or "___" or "………"
  const parseBlankPattern = /(\d+)\s*[_…]+|[_…]{2,}/g;
  const startQ = startingNumber;

  const plainText = stripHtml(notesText);

  const blanks = useMemo(() => {
    const text = plainText;
    const result = [];
    let match;
    let blankIndex = 0;
    while ((match = parseBlankPattern.exec(text)) !== null) {
      const questionNum = match[1] ? parseInt(match[1], 10) : startQ + blankIndex;
      result.push({
        questionNum,
        fullMatch: match[0],
      });
      blankIndex++;
    }
    return result;
  }, [plainText, startQ]);
  
  // Generate preview with highlighted blanks
  const generatePreview = () => {
    if (!notesText) return null;

    let idx = 0;
    const previewHtml = notesText.replace(parseBlankPattern, () => {
      const blank = blanks[idx++];
      const qNum = blank?.questionNum ?? '';
      const answer = answers[qNum] || '';
      return `<span style="background:#fef3c7;padding:2px 8px;border-radius:4px;font-weight:bold;border:1px dashed #f59e0b;">${qNum}. ${answer || '________'}</span>`;
    });

    return previewHtml;
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

  return (
    <div>
      {/* Question Range Badge */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#e0f2fe",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #7dd3fc",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, color: "#0369a1" }}>
          📝 Notes Completion: {blanks.length > 0 ? `Questions ${startQ} - ${startQ + blanks.length - 1}` : 'Chưa có câu hỏi'}
        </span>
        <span style={{
          padding: "4px 10px",
          backgroundColor: "#0ea5e9",
          color: "white",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "bold",
        }}>
          {blanks.length} câu
        </span>
      </div>

      {/* Instructions */}
      <div style={{
        padding: "10px 12px",
        backgroundColor: "#dcfce7",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid #86efac",
        fontSize: "13px",
      }}>
        <strong>💡 Hướng dẫn:</strong> Paste notes vào ô bên dưới. Dùng <code>___</code> hoặc <code>31 ___</code> để đánh dấu chỗ trống.
        <br/>
        VD: <code>People moved to cities to work in the 31 ___</code>
      </div>

      {/* Title */}
      <label style={defaultStyles.label}>Tiêu đề Notes</label>
      <input
        type="text"
        value={notesTitle}
        onChange={(e) => onChange("notesTitle", e.target.value)}
        placeholder="VD: History of Music in Britain"
        style={defaultStyles.input}
      />

      {/* Word Limit */}
      <label style={defaultStyles.label}>Giới hạn từ</label>
      <select
        value={wordLimit}
        onChange={(e) => onChange("wordLimit", e.target.value)}
        style={{ ...defaultStyles.input, width: "300px" }}
      >
        <option value="ONE WORD ONLY">ONE WORD ONLY</option>
        <option value="NO MORE THAN TWO WORDS">NO MORE THAN TWO WORDS</option>
        <option value="NO MORE THAN THREE WORDS">NO MORE THAN THREE WORDS</option>
        <option value="ONE WORD AND/OR A NUMBER">ONE WORD AND/OR A NUMBER</option>
        <option value="NO MORE THAN TWO WORDS AND/OR A NUMBER">NO MORE THAN TWO WORDS AND/OR A NUMBER</option>
      </select>

      {/* Notes Text Input */}
      <label style={defaultStyles.label}>Nội dung Notes (paste từ đề)</label>
      <ReactQuill
        theme="snow"
        value={notesText}
        onChange={(value) => onChange("notesText", value)}
        modules={quillModules}
        placeholder={`Paste nội dung notes ở đây. Dùng ___ để đánh dấu chỗ trống.

VD:
– During the Industrial Revolution people moved to cities to work in the 31 ___
– In the 1850s, the 32 ___ was also influenced greatly by immigration.
– Originally music reflected the work life of different 33 ___ in those days.`}
        style={{
          background: "white",
          borderRadius: "8px",
        }}
      />

      {/* Quick Parse Button */}
      {plainText && blanks.length === 0 && (
        <div style={{
          padding: "10px",
          backgroundColor: "#fef2f2",
          borderRadius: "8px",
          marginTop: "8px",
          border: "1px solid #fecaca",
          fontSize: "13px",
        }}>
          ⚠️ Không tìm thấy chỗ trống. Hãy thêm <code>___</code> hoặc <code>31 ___</code> vào text.
        </div>
      )}

      {/* Answers Section */}
      {blanks.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <label style={defaultStyles.label}>Đáp án ({blanks.length} câu)</label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
          }}>
            {blanks.map((blank, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}>
                <span style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  minWidth: "40px",
                  textAlign: "center",
                }}>
                  {blank.questionNum}
                </span>
                <input
                  type="text"
                  value={answers[blank.questionNum] || ""}
                  onChange={(e) => {
                    const newAnswers = { ...answers, [blank.questionNum]: e.target.value };
                    onChange("answers", newAnswers);
                  }}
                  placeholder="Đáp án"
                  style={{
                    ...defaultStyles.input,
                    flex: 1,
                    marginBottom: 0,
                    fontSize: "13px",
                  }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>
            💡 Tip: Dùng <code>|</code> để có nhiều đáp án đúng. VD: <code>factories|factory</code>
          </p>
        </div>
      )}

      {/* Preview */}
      {plainText && blanks.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <label style={defaultStyles.label}>👁️ Preview (như học sinh nhìn thấy)</label>
          <div style={{
            padding: "16px",
            backgroundColor: "#fffbeb",
            borderRadius: "8px",
            border: "1px solid #fcd34d",
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#92400e" }}>
              {notesTitle || "Notes"}
            </h4>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#b45309", fontStyle: "italic" }}>
              Write {wordLimit} for each answer.
            </p>
            <div 
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: "1.8",
                fontSize: "14px",
              }}
              dangerouslySetInnerHTML={{ __html: generatePreview() }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesCompletionEditor;
