import React, { useMemo, useState } from "react";
import PropTypes from 'prop-types';

const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/gi; // match [BLANK] or ____ or … sequences

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
  return { ok: true };
}

export default function TableCompletion({
  data,
  onChange,
  startingQuestionNumber = 1,
  maxWords = 2,
  answers: externalAnswers,
  registerQuestionRef,
  onFocusQuestion,
  showHeader = true,
}) {
  const [localAnswers, setLocalAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const answers = externalAnswers ?? localAnswers;

  // Number blanks sequentially across table - ROW-major (rows outer, columns left→right)
  const numbered = useMemo(() => {
    const rowsArr = data.rows || [];
    const colsArr = data.columns || [];
    // parts matrix [row][col]
    const partsMatrix = rowsArr.map(() => colsArr.map(() => []));
    let q = startingQuestionNumber;
    const getCellText = (row, idx) => {
      if (Array.isArray(row.cells) && row.cells[idx] != null) return String(row.cells[idx] || '');
      if (idx === 0) return String(row.vehicle || '');
      if (idx === 1) return String(row.cost || '');
      if (idx === 2) return Array.isArray(row.comments) ? row.comments.join('\n') : String(row.comments || '');
      return '';
    };

    for (let r = 0; r < rowsArr.length; r++) {
      for (let c = 0; c < colsArr.length; c++) {
        const text = getCellText(rowsArr[r], c);
        const isComments = /comment/i.test(colsArr[c]);

        if (isComments) {
          // split into lines and assign q numbers across lines (top-down within the comments column for this row)
          const lines = String(text || '').split('\n');
          const linePartsArr = lines.map((line) => {
            const raw = splitIntoParts(line);
            const parts = [];
            for (const rp of raw) {
              if (rp.type === 'blank') parts.push({ ...rp, q: q++ });
              else parts.push(rp);
            }
            return parts;
          });
          partsMatrix[r][c] = linePartsArr; // array of lines (each an array of parts)
        } else {
          const rawParts = splitIntoParts(text);
          const parts = [];
          for (const rp of rawParts) {
            if (rp.type === 'blank') parts.push({ ...rp, q: q++ });
            else parts.push(rp);
          }
          partsMatrix[r][c] = parts;
        }
      }
    }

    return rowsArr.map((row, rIdx) => ({ ...row, partsByCell: partsMatrix[rIdx] }));
  }, [data, startingQuestionNumber]);

  function handleInput(qNum, value) {
    const v = value;
    const { ok, reason } = validateAnswer(v, maxWords);
    const nextAns = { ...answers, [qNum]: v };
    const nextErr = { ...errors, [qNum]: ok ? undefined : reason };
    if (externalAnswers == null) setLocalAnswers(nextAns);
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
            onFocus={() => onFocusQuestion?.(p.q)}
            ref={(el) => registerQuestionRef?.(p.q, el)}
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
      {showHeader && (
        <>
          <h3>PART {data.part} – Questions {data.rangeStart ?? '1'}–{data.rangeEnd ?? 'N'}</h3>
          <p className="instruction">{data.instruction}</p>
          <h4 style={{ textAlign: "center" }}>{data.title}</h4>
        </>
      )}
      <table className="ielts-table">
        <thead>
          <tr>
            {data.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numbered.map((row, rIdx) => (
            <tr key={rIdx}>
              {(data.columns || []).map((col, cIdx) => {
                const cellParts = (row.partsByCell && row.partsByCell[cIdx]) || [];
                // If this is an array-of-lines (comments column), render as list
                if (Array.isArray(cellParts) && cellParts.length && Array.isArray(cellParts[0])) {
                  return (
                    <td key={cIdx}>
                      <ul className="comments">
                        {cellParts.map((lineParts, li) => (
                          <li key={li}>{renderParts(lineParts)}</li>
                        ))}
                      </ul>
                    </td>
                  );
                }
                return <td key={cIdx}>{renderParts(cellParts)}</td>;
              })}
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
  answers: PropTypes.object,
  registerQuestionRef: PropTypes.func,
  onFocusQuestion: PropTypes.func,
  showHeader: PropTypes.bool,
};
