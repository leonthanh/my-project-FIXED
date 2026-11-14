import React from "react";

const PrepareQuestionsDisplay = ({ section, startingNumber, onAnswerChange, answers, submitted }) => {
  const question = section.questions[0];
  const mode = question.exerciseMode;
  const sectionId = section.id;

  const renderInput = (key, label) => (
    <input
      aria-label={label}
      value={answers[key] || ""}
      onChange={(event) => onAnswerChange(key, event.target.value)}
      disabled={submitted}
      style={{ minWidth: 100, maxWidth: 200, padding: 8, border: "1px solid #94a3b8", borderRadius: 5 }}
    />
  );

  return (
    <div>
      {question.instruction && <p>{question.instruction}</p>}
      {(question.wordBanks || []).map((bank, index) => bank && <p key={index}><strong>{String.fromCharCode(65 + index)}:</strong> {bank}</p>)}
      {question.example && <p><strong>Example:</strong> {question.example}</p>}
      {(question.items || []).map((item, index) => {
        const number = startingNumber + index;
        const key = `${sectionId}-${index}`;
        const chunks = mode === "two-blanks" ? String(item.questionText || "").split(/(\{[12]\})/g) : [];
        return (
          <div key={index} id={`question-${number}`} tabIndex={-1} style={{ padding: 14, marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 8, lineHeight: 2 }}>
            <span className="gateway-question-number">{number}</span>{" "}
            {mode === "two-blanks" ? chunks.map((chunk, chunkIndex) => {
              const match = /^\{([12])\}$/.exec(chunk);
              return match ? <React.Fragment key={chunkIndex}>{renderInput(`${key}-${Number(match[1]) - 1}`, `Câu ${number}, ô ${match[1]}`)}</React.Fragment> : <React.Fragment key={chunkIndex}>{chunk}</React.Fragment>;
            }) : (
              <>
                <span>{item.questionText}</span>
                <div>
                  {mode === "choice" ? (item.options || []).map((option, optionIndex) => (
                    <label key={optionIndex} style={{ marginRight: 18 }}>
                      <input type="radio" name={key} value={option} checked={answers[key] === option} onChange={() => onAnswerChange(key, option)} disabled={submitted} /> {option}
                    </label>
                  )) : (
                    <>{item.answerPrefix && <span>{item.answerPrefix}{mode === "rewrite" ? " " : ""}</span>}{renderInput(key, `Câu ${number}`)}{item.answerSuffix && <span> {item.answerSuffix}</span>}</>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrepareQuestionsDisplay;
