import React, { useMemo, useState } from "react";
import PropTypes from 'prop-types';

const BLANK_REGEX = /_{2,}|[\u2026]+/g; // match ____ or … sequences

function splitIntoParts(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = BLANK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    parts.push({ type: "blank", raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts;
}

function validateAnswer(value, maxWords = 2) {
  const trimmed = String(value || '').trim();
  if (trimmed === '') return { ok: true };
  // Count word tokens (words with letters or numbers)
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > maxWords) return { ok: false, reason: `Không quá ${maxWords} từ.` };
  // Allowed token pattern: starts with alnum then allow - , . / % ()
  const allowed = /^[A-Za-z0-9][A-Za-z0-9\-.,/%()]*$/u;
  const allOk = tokens.every(t => allowed.test(t));
  if (!allOk) return { ok: false, reason: "Chỉ nhập chữ/số/ký tự đơn giản (-,./%)." };
  return { ok: true };
}

export default function TableCompletion({ data, onChange, startingQuestionNumber = 1, maxWords = 2 }) {
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  // Number blanks sequentially across table rows
  const numbered = useMemo(() => {
    let q = startingQuestionNumber;
    return (data.rows || []).map(row => {
      const costParts = splitIntoParts(row.cost).map(p => (p.type === "blank" ? { ...p, q: q++ } : p));
      const commentLines = (row.comments || []).map(line =>
        splitIntoParts(line).map(p => (p.type === "blank" ? { ...p, q: q++ } : p))
      );
      return { ...row, costParts, commentLines };
    });
  }, [data, startingQuestionNumber]);

  function handleInput(qNum, value) {
    const v = value;
    const { ok, reason } = validateAnswer(v, maxWords);
    const nextAns = { ...answers, [qNum]: v };
    const nextErr = { ...errors, [qNum]: ok ? undefined : reason };
    setAnswers(nextAns);
    setErrors(nextErr);
    onChange?.(nextAns, nextErr);
  }

  function renderParts(parts) {
    return parts.map((p, idx) =>
      p.type === "text" ? (
        <span key={idx}>{p.value}</span>
      ) : (
        <span key={idx} className="blank">
          <input
            aria-label={`Question ${p.q}`}
            value={answers[p.q] ?? ""}
            onChange={(e) => handleInput(p.q, e.target.value)}
            maxLength={60}
            className={`blank-input ${errors[p.q] ? "has-error" : ""}`}
            placeholder={`${p.q}`}
          />
          {errors[p.q] && <small className="error" role="alert">{errors[p.q]}</small>}
        </span>
      )
    );
  }

  return (
    <div className="listening-part">
      <h3>PART {data.part} – Questions {data.rangeStart ?? '1'}–{data.rangeEnd ?? 'N'}</h3>
      <p className="instruction">{data.instruction}</p>
      <h4 style={{ textAlign: "center" }}>{data.title}</h4>
      <table className="ielts-table">
        <thead>
          <tr>
            {data.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numbered.map((row, idx) => (
            <tr key={idx}>
              <td>{row.vehicle}</td>
              <td>{renderParts(row.costParts)}</td>
              <td>
                <ul className="comments">
                  {row.commentLines.map((lineParts, i) => (
                    <li key={i}>{renderParts(lineParts)}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .instruction { margin-bottom: 8px; font-style: italic; }
        table.ielts-table { width: 100%; border-collapse: collapse; }
        .ielts-table th, .ielts-table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; }
        .comments { margin: 0; padding-left: 18px; }
        .blank-input { width: 140px; padding: 4px 6px; margin: 0 4px; }
        .has-error { border-color: #d33; }
        .error { color: #d33; margin-left: 6px; }
      `}</style>
    </div>
  );
}

TableCompletion.propTypes = {
  data: PropTypes.shape({
    part: PropTypes.number,
    title: PropTypes.string,
    instruction: PropTypes.string,
    columns: PropTypes.arrayOf(PropTypes.string),
    rows: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  onChange: PropTypes.func,
  startingQuestionNumber: PropTypes.number,
  maxWords: PropTypes.number,
};
