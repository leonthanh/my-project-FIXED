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
  if (tokens.length > maxWords) return { ok: false, reason: `Use no more than ${maxWords} words.` };
  return { ok: true };
}

function stripCommentPrefix(line) {
  return String(line || '')
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
    .trimEnd();
}

function renderTextValue(value, keyPrefix) {
  const segments = String(value || '').split('\n');

  return segments.map((segment, index) => (
    <React.Fragment key={`${keyPrefix}-${index}`}>
      {index > 0 ? <br /> : null}
      <span>{segment}</span>
    </React.Fragment>
  ));
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
  readOnly = false,
  detailMap,
  renderBlankPrefix,
  getBlankPlaceholder,
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
          const lines = String(text || '')
            .split('\n')
            .map(stripCommentPrefix)
            .filter((line) => line.trim() !== '');
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
    if (readOnly) return;
    const v = value;
    const { ok, reason } = validateAnswer(v, maxWords);
    const nextAns = { ...answers, [qNum]: v };
    const nextErr = { ...errors, [qNum]: ok ? undefined : reason };
    if (externalAnswers == null) setLocalAnswers(nextAns);
    setErrors(nextErr);
    onChange?.(nextAns, nextErr);
  }

  function getDetail(qNum) {
    if (!detailMap) return null;
    if (detailMap instanceof Map) return detailMap.get(qNum) || null;
    return detailMap[qNum] || null;
  }

  function getStatusStyle(detail) {
    if (!detail) return null;
    if (detail.isCorrect) {
      return {
        borderColor: '#22c55e',
        backgroundColor: '#f0fdf4',
      };
    }
    if (String(detail.studentAnswer || '').trim()) {
      return {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
      };
    }
    return {
      borderColor: '#cbd5e1',
      backgroundColor: '#f8fafc',
    };
  }

  function renderParts(parts) {
    return parts.map((p, idx) =>
      p.type === "text" ? (
        <React.Fragment key={idx}>{renderTextValue(p.value, `text-${idx}`)}</React.Fragment>
      ) : (
        <span key={idx} className="blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {renderBlankPrefix ? renderBlankPrefix(p.q) : null}
          <input
            aria-label={`Question ${p.q}`}
            value={answers[p.q] ?? ""}
            onChange={(e) => handleInput(p.q, e.target.value)}
            onFocus={() => onFocusQuestion?.(p.q)}
            ref={(el) => registerQuestionRef?.(p.q, el)}
            maxLength={60}
            className={`blank-input ${errors[p.q] ? "has-error" : ""}`}
            placeholder={getBlankPlaceholder ? getBlankPlaceholder(p.q) : `${p.q}`}
            readOnly={readOnly}
            disabled={readOnly}
            style={readOnly ? getStatusStyle(getDetail(p.q)) : undefined}
          />
          {readOnly && (() => {
            const detail = getDetail(p.q);
            if (!detail || detail.isCorrect || !String(detail.correctAnswer || '').trim()) return null;
            return (
              <small
                style={{
                  color: '#166534',
                  fontWeight: 600,
                  background: '#dcfce7',
                  borderRadius: '999px',
                  padding: '4px 8px',
                }}
              >
                Correct answer: {detail.correctAnswer}
              </small>
            );
          })()}
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
        .listening-part {
          width: 100%;
          padding: 16px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,255,0.98) 100%);
          border: 1px solid rgba(191, 219, 254, 0.85);
          box-shadow: 0 20px 60px rgba(30, 64, 175, 0.08);
          overflow: hidden;
        }
        .instruction {
          margin: 0 0 10px;
          font-style: italic;
          color: #475569;
          line-height: 1.6;
        }
        table.ielts-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
          table-layout: fixed;
        }
        .ielts-table thead tr {
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
        }
        .ielts-table th {
          padding: 14px 16px;
          border-right: 1px solid #bfdbfe;
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: left;
        }
        .ielts-table th:last-child,
        .ielts-table td:last-child {
          border-right: none;
        }
        .ielts-table td {
          padding: 16px 14px;
          border-top: 1px solid #dbe3f0;
          border-right: 1px solid #e2e8f0;
          vertical-align: top;
          color: #0f172a;
          line-height: 1.7;
          background: rgba(255,255,255,0.92);
        }
        .comments {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .comments li::marker {
          color: #2563eb;
        }
        .blank-input {
          width: 148px;
          min-height: 42px;
          padding: 9px 12px;
          margin: 0 4px;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .blank-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.14);
        }
        .blank-input[readonly],
        .blank-input:disabled {
          cursor: default;
        }
        .has-error {
          border-color: #dc2626;
          box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.12);
        }
        .error {
          color: #b91c1c;
          margin-left: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .listening-part {
            padding: 12px;
            border-radius: 18px;
          }
          table.ielts-table {
            display: block;
            overflow-x: auto;
            white-space: normal;
          }
          .blank-input {
            width: 132px;
          }
        }
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
  readOnly: PropTypes.bool,
  detailMap: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.instanceOf(Map),
  ]),
  renderBlankPrefix: PropTypes.func,
  getBlankPlaceholder: PropTypes.func,
};
