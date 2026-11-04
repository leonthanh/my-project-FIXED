import React from "react";

const fieldStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: 8,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
};

const PrepareQuestionsEditor = ({ question, onChange, startingNumber }) => {
  const items = question.items || [];
  const mode = question.exerciseMode;
  const updateItem = (index, updates) => {
    onChange("items", items.map((item, current) => current === index ? { ...item, ...updates } : item));
  };

  return (
    <div>
      <label>
        Hướng dẫn
        <textarea value={question.instruction || ""} onChange={(event) => onChange("instruction", event.target.value)} style={fieldStyle} />
      </label>
      {(question.wordBanks || []).map((bank, index) => (
        <label key={index} style={{ display: "block", marginTop: 12 }}>
          Danh sách từ {String.fromCharCode(65 + index)}
          <input value={bank} onChange={(event) => onChange("wordBanks", question.wordBanks.map((value, i) => i === index ? event.target.value : value))} style={fieldStyle} />
        </label>
      ))}
      <label style={{ display: "block", marginTop: 12 }}>
        Ví dụ (không tính điểm)
        <textarea value={question.example || ""} onChange={(event) => onChange("example", event.target.value)} style={fieldStyle} />
      </label>
      {mode === "two-blanks" && <p>Đặt {"{1}"} và {"{2}"} vào vị trí hai ô trong câu. Mỗi ô đúng được 0,5 điểm.</p>}
      {items.map((item, index) => (
        <section key={index} style={{ marginTop: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <strong>Câu {startingNumber + index}</strong>
          <label style={{ display: "block", marginTop: 10 }}>
            Nội dung câu hỏi
            <textarea value={item.questionText || ""} onChange={(event) => updateItem(index, { questionText: event.target.value })} rows={2} style={fieldStyle} />
          </label>
          {(mode === "rewrite" || mode === "single") && (
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <label style={{ flex: 1 }}>Chữ gợi ý trước ô trả lời<input value={item.answerPrefix || ""} onChange={(event) => updateItem(index, { answerPrefix: event.target.value })} style={fieldStyle} /></label>
              {mode === "rewrite" && <label style={{ flex: 1 }}>Chữ cho sẵn sau ô trả lời<input value={item.answerSuffix || ""} onChange={(event) => updateItem(index, { answerSuffix: event.target.value })} style={fieldStyle} /></label>}
            </div>
          )}
          {mode === "two-blanks" ? (
            (item.blankAnswers || ["", ""]).map((answer, blankIndex) => (
              <label key={blankIndex} style={{ display: "block", marginTop: 10 }}>
                Đáp án ô {blankIndex + 1}
                <input value={answer} onChange={(event) => updateItem(index, {
                  blankAnswers: (item.blankAnswers || ["", ""]).map((value, i) => i === blankIndex ? event.target.value : value),
                })} style={fieldStyle} />
              </label>
            ))
          ) : mode === "choice" ? (
            <>
              {(item.options || ["", ""]).map((option, optionIndex) => (
                <label key={optionIndex} style={{ display: "block", marginTop: 10 }}>
                  Lựa chọn {optionIndex + 1}
                  <input value={option} onChange={(event) => {
                    const options = (item.options || ["", ""]).map((value, i) => i === optionIndex ? event.target.value : value);
                    updateItem(index, { options, correctAnswer: item.correctAnswer === option ? event.target.value : item.correctAnswer });
                  }} style={fieldStyle} />
                </label>
              ))}
              <label style={{ display: "block", marginTop: 10 }}>Đáp án đúng
                <select value={item.correctAnswer || ""} onChange={(event) => updateItem(index, { correctAnswer: event.target.value })} style={fieldStyle}>
                  <option value="">Chọn đáp án</option>
                  {(item.options || []).filter(Boolean).map((option, i) => <option key={i} value={option}>{option}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label style={{ display: "block", marginTop: 10 }}>Đáp án đúng
              <input value={item.correctAnswer || ""} onChange={(event) => updateItem(index, { correctAnswer: event.target.value })} style={fieldStyle} />
            </label>
          )}
          {mode !== "choice" && <small>Nhập nội dung học sinh cần gõ vào ô, không gồm chữ cho sẵn. Các đáp án thay thế ngăn cách bằng dấu |.</small>}
        </section>
      ))}
    </div>
  );
};

export default PrepareQuestionsEditor;
