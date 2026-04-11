import React, { useMemo, useState } from "react";
import { hostPath } from "../../../shared/utils/api";
import { renderHtmlWithBlankPlaceholders } from "../utils/htmlHelpers";
import {
  countClozeBlanks,
  getActiveClozeTable,
  getClozeText,
  normalizeQuestionType,
} from "../utils/questionHelpers";
import "../styles/do-reading-test.css";

const feedbackStyles = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
    marginTop: "10px",
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  correctAnswer: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 600,
  },
  questionBlock: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    overflow: "hidden",
    marginBottom: "24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
  },
  passageSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "0",
  },
  sectionImage: {
    maxWidth: "100%",
    borderRadius: "12px",
    marginTop: "12px",
    border: "1px solid #cbd5e1",
  },
  reviewIntro: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#334155",
    lineHeight: 1.7,
  },
  passageHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  },
  passageHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  passageTitle: {
    margin: "4px 0 0",
    color: "#0f172a",
    fontSize: "24px",
  },
  passageEyebrow: {
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    fontWeight: 700,
    margin: 0,
  },
  passageMeta: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "0.95rem",
  },
  toggleButton: {
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #bfdbfe",
    background: "#ffffff",
    color: "#1d4ed8",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  bulkActionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "24px",
  },
  bulkActionButton: {
    padding: "9px 16px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontSize: "0.92rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const stripHtml = (html) => String(html || "").replace(/<[^>]+>/g, "").trim();

const safeParseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const hasAnswerValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return String(value ?? "").trim() !== "";
};

const formatCompareValue = (raw, label) => {
  const rawText = String(raw ?? "").trim();
  const labelText = String(label ?? "").trim();
  if (rawText && labelText && normalizeText(rawText) !== normalizeText(labelText)) {
    return `${rawText} (${labelText})`;
  }
  return labelText || rawText || "";
};

const getNumericQuestionNumber = (value, fallback = null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDetailStudentValue = (detail) =>
  detail?.student ?? detail?.studentLabel ?? detail?.studentAnswer ?? "";

const getDetailExpectedRaw = (detail) =>
  detail?.expected ?? detail?.correctAnswer ?? detail?.expectedLabel ?? "";

const getDetailExpectedLabel = (detail) =>
  detail?.expectedLabel ?? detail?.correctAnswer ?? detail?.expected ?? "";

const getQuestionStatus = (detail, fallbackAnswer = "") => {
  if (!detail) {
    if (hasAnswerValue(fallbackAnswer)) {
      return {
        label: "Answered",
        style: { ...feedbackStyles.status, background: "#dbeafe", color: "#1d4ed8" },
        isBlank: false,
        isCorrect: false,
      };
    }
    return {
      label: "Blank",
      style: { ...feedbackStyles.status, background: "#f1f5f9", color: "#64748b" },
      isBlank: true,
      isCorrect: false,
    };
  }

  const hasStudentAnswer = hasAnswerValue(getDetailStudentValue(detail)) || hasAnswerValue(fallbackAnswer);
  if (detail.isCorrect) {
    return {
      label: "Correct",
      style: { ...feedbackStyles.status, background: "#dcfce7", color: "#166534" },
      isBlank: false,
      isCorrect: true,
    };
  }

  if (!hasStudentAnswer) {
    return {
      label: "Blank",
      style: { ...feedbackStyles.status, background: "#f1f5f9", color: "#64748b" },
      isBlank: true,
      isCorrect: false,
    };
  }

  return {
    label: "Wrong",
    style: { ...feedbackStyles.status, background: "#fee2e2", color: "#991b1b" },
    isBlank: false,
    isCorrect: false,
  };
};

const processPassageText = (htmlText) => {
  if (!htmlText) return "";

  let processed = htmlText;
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
    const patterns = [
      new RegExp(`(<p[^>]*>)\\s*<strong>\\s*${letter}\\s*</strong>`, "gi"),
      new RegExp(`(<p[^>]*>)\\s*<b>\\s*${letter}\\s*</b>`, "gi"),
      new RegExp(`(<p[^>]*>)\\s*<span[^>]*>\\s*${letter}\\s*</span>`, "gi"),
      new RegExp(`(<p[^>]*>)\\s*${letter}(?=\\s|[^A-Za-z])`, "gi"),
      new RegExp(`(<p[^>]*>)\\s*<em>\\s*${letter}\\s*</em>`, "gi"),
    ];

    patterns.forEach((pattern) => {
      processed = processed.replace(pattern, (match) => {
        if (match.includes("data-paragraph") || match.includes("paragraph-marker")) return match;
        return `<p data-paragraph="${letter}" class="paragraph-block"><span class="paragraph-marker">${letter}</span> `;
      });
    });
  });

  return processed;
};

const countQuestionsInSection = (questions) =>
  (questions || []).reduce((total, q) => {
    const qType = normalizeQuestionType(q.type || q.questionType || "multiple-choice");

    if (qType === "ielts-matching-headings") {
      return total + ((q.paragraphs || q.answers || []).length || 1);
    }

    if (qType === "cloze-test" || qType === "summary-completion") {
      const blankCount = countClozeBlanks(q);
      return total + (blankCount || 1);
    }

    if (qType === "paragraph-matching") {
      const paragraphBlankCount = q.questionText ? (q.questionText.match(/(\.{3,}|…+)/g) || []).length : 0;
      if (paragraphBlankCount > 0) return total + paragraphBlankCount;
    }

    if (qType === "multi-select") {
      return total + (q.requiredAnswers || 2);
    }

    return total + 1;
  }, 0);

const getParagraphOptions = (passage, question) => {
  if (Array.isArray(passage?.paragraphs) && passage.paragraphs.length > 0) {
    return passage.paragraphs.map((p) =>
      typeof p === "object"
        ? {
            id: (p.id || p.label || p.paragraphId || "").toString(),
            excerpt: stripHtml(p.text || p.content || p.excerpt || "").slice(0, 120),
          }
        : { id: String(p), excerpt: "" }
    );
  }

  if (Array.isArray(question?.paragraphs) && question.paragraphs.length > 0) {
    return question.paragraphs.map((p) =>
      typeof p === "object"
        ? {
            id: (p.id || p.label || p.paragraphId || "").toString(),
            excerpt: stripHtml(p.text || p.content || p.excerpt || "").slice(0, 120),
          }
        : { id: String(p), excerpt: "" }
    );
  }

  return "ABCDEFGHI".split("").map((id) => ({ id, excerpt: "" }));
};

const extractInlineAnswer = (answers, key, fallbackDetail) => {
  const answer = answers?.[key] ?? answers?.[key.replace("q_", "q")] ?? "";
  if (hasAnswerValue(answer)) return answer;
  return fallbackDetail?.studentLabel ?? fallbackDetail?.student ?? "";
};

const getMatchingValues = (answers, key) => {
  const raw = safeParseJson(answers?.[key] ?? answers?.[key.replace("q_", "q")] ?? "");
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? ""));
  if (typeof raw === "string") return raw.split(",").map((part) => part.trim());
  return [];
};

const getMatchingHeadingMap = (answers, key) => {
  const raw = safeParseJson(answers?.[key] ?? answers?.[key.replace("q_", "q")] ?? {});
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
};

const getMultiSelectIndices = (answers, key) => {
  const raw = safeParseJson(answers?.[key] ?? answers?.[key.replace("q_", "q")] ?? []);
  if (Array.isArray(raw)) {
    return raw.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }

  const parts = String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .map((part) => {
      if (/^[A-Z]$/i.test(part)) return part.toUpperCase().charCodeAt(0) - 65;
      const parsed = Number(part);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((item) => item !== null);
};

function Feedback({ detail, answerValue = "" }) {
  const status = getQuestionStatus(detail, answerValue);
  const correctDisplay = formatCompareValue(getDetailExpectedRaw(detail), getDetailExpectedLabel(detail));

  return (
    <div style={feedbackStyles.container}>
      <span style={status.style}>{status.label}</span>
      {!status.isCorrect && correctDisplay ? (
        <span style={feedbackStyles.correctAnswer}>Correct answer: {correctDisplay}</span>
      ) : null}
    </div>
  );
}

export default function ReadingStudentStyleReview({ test, submission, details }) {
  const [collapsedPassages, setCollapsedPassages] = useState({});

  const passages = useMemo(() => {
    const raw = safeParseJson(test?.passages);
    return Array.isArray(raw) ? raw : [];
  }, [test?.passages]);

  const answers = useMemo(() => {
    const raw = safeParseJson(submission?.answers);
    if (raw && typeof raw === "object" && !Array.isArray(raw) && !raw.passages) return raw;
    return {};
  }, [submission?.answers]);

  const detailMap = useMemo(() => {
    const map = new Map();
    let nextDerivedNumber = null;

    (details || []).forEach((detail) => {
      const baseNumber = getNumericQuestionNumber(detail?.questionNumber);
      if (!Number.isFinite(baseNumber)) return;

      let key = baseNumber;
      if (map.has(key)) {
        key = nextDerivedNumber && nextDerivedNumber > key ? nextDerivedNumber : key;
        while (map.has(key)) key += 1;
      }

      map.set(key, detail);
      nextDerivedNumber = key + 1;
    });

    return map;
  }, [details]);

  const renderQuestionFeedback = (number, answerValue = "") => (
    <Feedback detail={detailMap.get(number)} answerValue={answerValue} />
  );

  const togglePassage = (passageIndex) => {
    setCollapsedPassages((prev) => ({
      ...prev,
      [passageIndex]: !prev[passageIndex],
    }));
  };

  const collapseAllPassages = () => {
    const next = {};
    passages.forEach((_, index) => {
      next[index] = true;
    });
    setCollapsedPassages(next);
  };

  const expandAllPassages = () => {
    setCollapsedPassages({});
  };

  const renderMultipleChoiceMany = (question, startNumber, count = 2) => {
    const questionKey = `q_${startNumber}`;
    const selectedAnswers = getMultiSelectIndices(answers, questionKey);
    const endNumber = startNumber + count - 1;
    const detail = detailMap.get(startNumber) || detailMap.get(endNumber);

    return (
      <div key={startNumber} className="multi-select-container" style={{ pointerEvents: "none" }}>
        <div className="multi-select-header">
          <span className="multi-select-badge">{startNumber}-{endNumber}</span>
          <span className="multi-select-question-text">{question.questionText}</span>
        </div>
        <div className="multi-select-options">
          {(question.options || []).map((opt, idx) => {
            const hasPrefix = /^[A-Z][.\s]/.test(String(opt || ""));
            const letterLabel = String.fromCharCode(65 + idx);
            const isSelected = selectedAnswers.includes(idx);

            return (
              <label key={idx} className={`multi-select-option ${isSelected ? "selected" : ""}`}>
                <input type="checkbox" className="multi-select-checkbox" checked={isSelected} readOnly />
                <span className="multi-select-option-text">
                  {!hasPrefix && <strong>{letterLabel}. </strong>}
                  {typeof opt === "object" ? opt.text || opt.label || "" : opt}
                </span>
              </label>
            );
          })}
        </div>
        <Feedback detail={detail} answerValue={selectedAnswers} />
      </div>
    );
  };

  const renderQuestion = (question, questionNumber, passage) => {
    const key = `q_${questionNumber}`;
    const qType = normalizeQuestionType(question.type || question.questionType || "multiple-choice");
    const detail = detailMap.get(questionNumber);
    const isMatchingHeadings = qType === "ielts-matching-headings";
    const paragraphCount = isMatchingHeadings ? (question.paragraphs || question.answers || []).length : 0;
    const isParagraphMatching = qType === "paragraph-matching";
    const paragraphBlankCount =
      isParagraphMatching && question.questionText
        ? (question.questionText.match(/(\.{3,}|…+)/g) || []).length
        : 0;
    const isClozeTest = qType === "cloze-test" || qType === "summary-completion";
    const clozeTable = isClozeTest ? getActiveClozeTable(question) : null;
    const clozeText = isClozeTest ? getClozeText(question) : null;
    const blankCount = isClozeTest ? countClozeBlanks(question) : 0;
    const isShortAnswerInline =
      (qType === "fill-in-blank" || qType === "short-answer" || qType === "fill-in-the-blanks") &&
      question.questionText &&
      (question.questionText.includes("…") || question.questionText.includes("....") || /_{2,}/.test(question.questionText));
    const isMultiQuestionBlock =
      isMatchingHeadings ||
      (isClozeTest && blankCount > 0) ||
      (isParagraphMatching && paragraphBlankCount > 0) ||
      qType === "multi-select";
    const isInlineAnswerType = qType === "true-false-not-given" || qType === "yes-no-not-given";

    if (qType === "multi-select") {
      return renderMultipleChoiceMany(question, questionNumber, question.requiredAnswers || 2);
    }

    return (
      <div
        key={key}
        className={`question-item ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "answered" : ""} ${
          isMultiQuestionBlock ? "matching-headings-block" : ""
        } ${isInlineAnswerType ? "inline-answer" : ""}`}
        style={{ pointerEvents: "none" }}
      >
        {!isMultiQuestionBlock && <div className="question-number">{questionNumber}</div>}
        <div className={`question-content ${isMultiQuestionBlock ? "full-width" : ""}`}>
          {question.questionText &&
            !isShortAnswerInline &&
            !(isClozeTest && clozeText) &&
            qType !== "paragraph-matching" &&
            !isInlineAnswerType && (
              <div className="question-text" dangerouslySetInnerHTML={{ __html: question.questionText }} />
            )}

          {qType === "multiple-choice" && (
            <div className="question-options">
              {(question.options || []).map((opt, oi) => {
                const optText = typeof opt === "object" ? opt.text || opt.label || "" : opt;
                const optValue = typeof opt === "object" ? opt.id || opt.label || optText : opt;
                const selectedValue = extractInlineAnswer(answers, key, detail);
                const isSelected = normalizeText(selectedValue) === normalizeText(optValue);
                const expectedRaw = detail?.expected;
                const expectedLabel = detail?.expectedLabel;
                const isExpected =
                  normalizeText(expectedRaw) === normalizeText(optValue) ||
                  normalizeText(expectedRaw) === normalizeText(optText) ||
                  normalizeText(expectedLabel) === normalizeText(optText) ||
                  normalizeText(expectedLabel) === normalizeText(optValue);

                return (
                  <label
                    key={oi}
                    className={`option-label ${isSelected ? "selected" : ""}`}
                    style={{
                      borderColor: isExpected ? "#22c55e" : undefined,
                      boxShadow: isExpected ? "0 0 0 1px rgba(34, 197, 94, 0.25)" : undefined,
                      backgroundColor: isSelected && !detail?.isCorrect ? "#fef2f2" : undefined,
                    }}
                  >
                    <input type="radio" className="option-input" checked={isSelected} readOnly />
                    <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                    <span className="option-text" dangerouslySetInnerHTML={{ __html: optText }} />
                  </label>
                );
              })}
            </div>
          )}

          {qType === "sentence-completion" && (
            <div className="question-sentence-completion">
              <div className="sentence-completion-inline">
                <select className={`sentence-select ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "answered" : ""}`} value={extractInlineAnswer(answers, key, detail)} disabled>
                  <option value="">-- Select --</option>
                  {(question.options || []).map((opt, oi) => (
                    <option key={oi} value={String.fromCharCode(65 + oi)}>
                      {`${String.fromCharCode(65 + oi)}. ${stripHtml(typeof opt === "object" ? opt.text || opt.label || "" : opt)}`}
                    </option>
                  ))}
                </select>
                <span className={`sentence-selected-badge ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "selected" : ""}`}>
                  {extractInlineAnswer(answers, key, detail)}
                </span>
              </div>
              {renderQuestionFeedback(questionNumber, extractInlineAnswer(answers, key, detail))}
            </div>
          )}

          {(qType === "true-false-not-given" || qType === "yes-no-not-given") && (
            <div className="tfng-inline">
              <select className={`tfng-select tfng-inline-select ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "answered" : ""}`} value={extractInlineAnswer(answers, key, detail)} disabled>
                <option value="">--- Select ---</option>
                {qType === "true-false-not-given" ? (
                  <>
                    <option value="TRUE">TRUE</option>
                    <option value="FALSE">FALSE</option>
                    <option value="NOT GIVEN">NOT GIVEN</option>
                  </>
                ) : (
                  <>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    <option value="NOT GIVEN">NOT GIVEN</option>
                  </>
                )}
              </select>
              <span
                className={`tfng-selected-badge ${
                  extractInlineAnswer(answers, key, detail) === "TRUE" || extractInlineAnswer(answers, key, detail) === "YES"
                    ? "true"
                    : extractInlineAnswer(answers, key, detail) === "FALSE" || extractInlineAnswer(answers, key, detail) === "NO"
                    ? "false"
                    : extractInlineAnswer(answers, key, detail) === "NOT GIVEN"
                    ? "not-given"
                    : ""
                }`}
              >
                {extractInlineAnswer(answers, key, detail) === "TRUE" || extractInlineAnswer(answers, key, detail) === "YES"
                  ? "✓"
                  : extractInlineAnswer(answers, key, detail) === "FALSE" || extractInlineAnswer(answers, key, detail) === "NO"
                  ? "✗"
                  : extractInlineAnswer(answers, key, detail) === "NOT GIVEN"
                  ? "?"
                  : ""}
              </span>
              <span className="question-text-inline" dangerouslySetInnerHTML={{ __html: question.questionText || "" }} />
              {renderQuestionFeedback(questionNumber, extractInlineAnswer(answers, key, detail))}
            </div>
          )}

          {qType === "paragraph-matching" && (
            <div className="question-paragraph-matching">
              {(() => {
                const options = getParagraphOptions(passage, question);
                if (question.questionText) {
                  const cleanText = question.questionText
                    .replace(/<p[^>]*>/gi, "")
                    .replace(/<\/p>/gi, " ")
                    .replace(/<br\s*\/?>/gi, " ")
                    .trim();

                  if (/\.{3,}|…+/.test(cleanText)) {
                    const parts = cleanText.split(/(\.{3,}|…+)/);
                    let blankCounter = 0;
                    return (
                      <div className="paragraph-matching-inline">
                        {parts.map((part, idx) => {
                          if ((part || "").match(/\.{3,}|…+/)) {
                            const thisIndex = blankCounter++;
                            const qNum = questionNumber + thisIndex;
                            const thisKey = `${key}_${thisIndex}`;
                            const value = extractInlineAnswer(answers, thisKey, detailMap.get(qNum));
                            const sentence = (parts[idx + 1] || "").trim();
                            parts[idx + 1] = "";

                            return (
                              <div key={`blank-${thisIndex}`} className={`paragraph-match-row ${value ? "answered" : ""}`}>
                                <span className="paragraph-question-number">{qNum}</span>
                                <div className="paragraph-row-inner">
                                  <select className={`heading-select ${value ? "answered" : ""}`} value={value} disabled>
                                    <option value="">Choose...</option>
                                    {options.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.id}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="paragraph-text" dangerouslySetInnerHTML={{ __html: sentence }} />
                                  <Feedback detail={detailMap.get(qNum)} answerValue={value} />
                                </div>
                              </div>
                            );
                          }

                          return part ? <span key={idx} dangerouslySetInnerHTML={{ __html: part }} /> : null;
                        })}
                      </div>
                    );
                  }
                }

                const qDetail = detailMap.get(questionNumber);
                const value = extractInlineAnswer(answers, `${key}_0`, qDetail);

                return (
                  <div className="paragraph-matching-row">
                    {question.questionText && <div className="paragraph-question-text" dangerouslySetInnerHTML={{ __html: question.questionText }} />}
                    <select className={`heading-select ${value ? "answered" : ""}`} value={value} disabled>
                      <option value="">Choose...</option>
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.id}
                        </option>
                      ))}
                    </select>
                    {renderQuestionFeedback(questionNumber, value)}
                  </div>
                );
              })()}
            </div>
          )}

          {(qType === "fill-in-blank" || qType === "short-answer" || qType === "fill-in-the-blanks") && (
            <div className="question-fill-inline">
              {isShortAnswerInline ? (
                <div className="inline-fill-text">
                  {question.questionText
                    .replace(/<p[^>]*>/gi, "")
                    .replace(/<\/p>/gi, " ")
                    .replace(/<br\s*\/?>/gi, " ")
                    .trim()
                    .split(/(\.{3,}|…+|_{2,})/)
                    .map((part, idx) => {
                      if (part.match(/\.{3,}|…+|_{2,}/)) {
                        return (
                          <input
                            key={idx}
                            type="text"
                            className={`inline-fill-input ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "answered" : ""}`}
                            value={extractInlineAnswer(answers, key, detail)}
                            readOnly
                          />
                        );
                      }
                      return part.trim() ? <span key={idx}>{part}</span> : null;
                    })}
                  {renderQuestionFeedback(questionNumber, extractInlineAnswer(answers, key, detail))}
                </div>
              ) : (
                <>
                  <input type="text" className={`fill-input ${hasAnswerValue(extractInlineAnswer(answers, key, detail)) ? "answered" : ""}`} value={extractInlineAnswer(answers, key, detail)} readOnly />
                  {renderQuestionFeedback(questionNumber, extractInlineAnswer(answers, key, detail))}
                </>
              )}
            </div>
          )}

          {qType === "matching" && (
            <div className="question-matching">
              <div className="matching-items">
                {(question.leftItems || question.matchingPairs || []).map((item, idx) => {
                  const leftText = typeof item === "string" ? item : item.left || item.paragraph || "";
                  const currentValues = getMatchingValues(answers, key);
                  const rowNum = questionNumber + idx;
                  return (
                    <div key={idx} className="matching-row" style={{ alignItems: "center" }}>
                      <span className="matching-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="matching-left">{leftText}</span>
                      <span className="matching-arrow">→</span>
                      <select className={`matching-select ${currentValues[idx] ? "answered" : ""}`} value={currentValues[idx] || ""} disabled>
                        <option value="">Choose...</option>
                        {(question.rightItems || question.matchingOptions || []).map((right, ri) => (
                          <option key={ri} value={ri + 1}>
                            {ri + 1}
                          </option>
                        ))}
                      </select>
                      <Feedback detail={detailMap.get(rowNum)} answerValue={currentValues[idx]} />
                    </div>
                  );
                })}
              </div>
              {question.rightItems && (
                <div className="matching-options-list">
                  <p className="matching-options-title">Options:</p>
                  {question.rightItems.map((item, idx) => (
                    <div key={idx} className="matching-option">
                      <span className="matching-option-number">{idx + 1}.</span>
                      <span>{typeof item === "object" ? item.text || item.label || "" : item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {qType === "ielts-matching-headings" && (
            <div className="question-matching-headings">
              <div className="matching-headings-header">
                <span className="matching-range-badge">
                  Questions {question.startQuestion || questionNumber}–{(question.startQuestion || questionNumber) + paragraphCount - 1}
                </span>
              </div>
              <div className="headings-list">
                <p className="headings-title">List of Headings</p>
                {(question.headings || []).map((heading, hi) => {
                  const headingText = typeof heading === "object" ? heading.text || heading.label || "" : heading;
                  const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][hi] || hi + 1;
                  return (
                    <div key={hi} className="heading-item">
                      <span className="heading-number">{roman}.</span>
                      <span className="heading-text">{headingText}</span>
                    </div>
                  );
                })}
              </div>
              <div className="paragraphs-match">
                {(question.paragraphs || question.answers || []).map((para, pi) => {
                  const paragraphId = typeof para === "object" ? para.id || para.paragraphId : para;
                  const selectedMap = getMatchingHeadingMap(answers, key);
                  const selectedHeading = selectedMap[paragraphId] || "";
                  const actualQuestionNum = (question.startQuestion || questionNumber) + pi;
                  return (
                    <div key={pi} className={`paragraph-match-row ${selectedHeading ? "answered" : ""}`}>
                      <span className="paragraph-question-number">{actualQuestionNum}</span>
                      <span className="paragraph-label">Paragraph {paragraphId}</span>
                      <select className={`heading-select ${selectedHeading ? "answered" : ""}`} value={selectedHeading} disabled>
                        <option value="">Choose a heading...</option>
                        {(question.headings || []).map((heading, hi) => {
                          const headingText = typeof heading === "object" ? heading.text || heading.label || "" : heading;
                          const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][hi] || hi + 1;
                          return (
                            <option key={hi} value={roman}>
                              {roman}. {headingText}
                            </option>
                          );
                        })}
                      </select>
                      <Feedback detail={detailMap.get(actualQuestionNum)} answerValue={selectedHeading} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(qType === "cloze-test" || qType === "summary-completion") && (
            <div className="question-cloze">
              {blankCount > 0 && (
                <div className="cloze-header">
                  <span className="cloze-range-badge">
                    Questions {question.startQuestion || questionNumber}–{(question.startQuestion || questionNumber) + blankCount - 1}
                  </span>
                  {question.maxWords && <span className="cloze-max-words">No more than {question.maxWords} word(s)</span>}
                </div>
              )}

              {question.wordBank && question.wordBank.length > 0 && (
                <div className="word-bank">
                  <p className="word-bank-title">Word Bank:</p>
                  <div className="word-bank-items">
                    {question.wordBank.map((word, wi) => (
                      <span key={wi} className="word-bank-item">
                        {typeof word === "object" ? word.text || word.label || "" : word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {clozeTable ? (
                <div className="cloze-table-wrapper" style={{ overflowX: "auto" }}>
                  {(() => {
                    let blankIndex = 0;

                    return (
                  <table className="cloze-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {(clozeTable.columns || []).map((col, ci) => (
                          <th key={ci} style={{ border: "1px solid #cbd5e1", padding: "8px", background: "#e0f2fe" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(clozeTable.rows || []).map((row, ri) => (
                        <tr key={ri}>
                          {(row.cells || []).map((cell, ci) => {
                            return (
                              <td key={ci} style={{ border: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
                                {String(cell || "").split(/\[BLANK\]/gi).map((part, idx, arr) => {
                                  if (idx === arr.length - 1) return <span key={`${ri}-${ci}-${idx}`}>{part}</span>;
                                  const currentBlankIdx = blankIndex++;
                                  const blankNum = (question.startQuestion || questionNumber) + currentBlankIdx;
                                  const blankKey = `${key}_${currentBlankIdx}`;
                                  return (
                                    <React.Fragment key={`${ri}-${ci}-${idx}`}>
                                      <span>{part}</span>
                                      <span className="blank">
                                        <input className="blank-input" value={extractInlineAnswer(answers, blankKey, detailMap.get(blankNum))} readOnly />
                                      </span>
                                      <Feedback detail={detailMap.get(blankNum)} answerValue={extractInlineAnswer(answers, blankKey, detailMap.get(blankNum))} />
                                    </React.Fragment>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    );
                  })()}
                </div>
              ) : clozeText ? (
                <div className="cloze-passage">
                  {renderHtmlWithBlankPlaceholders(
                    clozeText,
                    (blankIndex, blankElementKey) => {
                      const qNum = (question.startQuestion || questionNumber) + blankIndex;
                      const blankKey = `${key}_${blankIndex}`;
                      const answerValue = extractInlineAnswer(answers, blankKey, detailMap.get(qNum));

                      return (
                        <span key={blankElementKey} className="blank">
                          <input className="blank-input" value={answerValue} readOnly />
                          <Feedback detail={detailMap.get(qNum)} answerValue={answerValue} />
                        </span>
                      );
                    },
                    `${key}-review-cloze`
                  )}
                </div>
              ) : null}
            </div>
          )}

          {![
            "multiple-choice",
            "sentence-completion",
            "true-false-not-given",
            "yes-no-not-given",
            "paragraph-matching",
            "fill-in-blank",
            "short-answer",
            "fill-in-the-blanks",
            "matching",
            "ielts-matching-headings",
            "cloze-test",
            "summary-completion",
            "multi-select",
          ].includes(qType) && renderQuestionFeedback(questionNumber)}
        </div>
      </div>
    );
  };

  if (!passages.length) {
    return (
      <div style={feedbackStyles.reviewIntro}>
        The original test payload is not available, so the IX Reading student layout cannot be reconstructed.
      </div>
    );
  }

  let runningStart = 1;
  const allCollapsed = passages.length > 0 && passages.every((_, index) => Boolean(collapsedPassages[index]));
  const allExpanded = passages.length > 0 && passages.every((_, index) => !collapsedPassages[index]);

  return (
    <div>
      <div style={feedbackStyles.reviewIntro}>
        This view recreates the Reading layout students saw during the test so teachers can compare each response against the correct answer in context.
      </div>

      {passages.length > 1 && (
        <div style={feedbackStyles.bulkActionRow}>
          <button
            type="button"
            style={feedbackStyles.bulkActionButton}
            onClick={collapseAllPassages}
            disabled={allCollapsed}
          >
            Collapse All
          </button>
          <button
            type="button"
            style={feedbackStyles.bulkActionButton}
            onClick={expandAllPassages}
            disabled={allExpanded}
          >
            Expand All
          </button>
        </div>
      )}

      {passages.map((passage, passageIdx) => {
        const currentSections = passage.sections || [{ questions: passage.questions || [] }];
        const startQuestionNumber = runningStart;
        const totalQuestionsInPassage = currentSections.reduce(
          (sum, section) => sum + countQuestionsInSection(section.questions || []),
          0
        );
        runningStart += totalQuestionsInPassage;
        let currentQuestionNumber = startQuestionNumber;
        const isCollapsed = Boolean(collapsedPassages[passageIdx]);

        return (
          <div key={`passage-${passageIdx}`} style={feedbackStyles.questionBlock}>
            <div style={feedbackStyles.passageHeader}>
              <div style={feedbackStyles.passageHeaderRow}>
                <div>
                  <p style={feedbackStyles.passageEyebrow}>Passage {passageIdx + 1}</p>
                  <h2 style={feedbackStyles.passageTitle}>{passage.passageTitle || `Passage ${passageIdx + 1}`}</h2>
                  <p style={feedbackStyles.passageMeta}>
                    Questions {startQuestionNumber}-{startQuestionNumber + totalQuestionsInPassage - 1}
                  </p>
                </div>
                <button
                  type="button"
                  style={feedbackStyles.toggleButton}
                  onClick={() => togglePassage(passageIdx)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            {!isCollapsed && <div style={feedbackStyles.passageSplit}>
              <div className="reading-passage-column" style={{ width: "100%" }}>
                <div className="passage-header">
                  <div className="passage-part">PASSAGE {passageIdx + 1}</div>
                  {passage.passageTitle && <h2 className="passage-title">{passage.passageTitle}</h2>}
                </div>
                <div className="passage-content">
                  <div className="passage-text" dangerouslySetInnerHTML={{ __html: processPassageText(passage.passageText || "") }} />
                </div>
              </div>

              <div className="reading-questions-column" style={{ width: "100%" }}>
                <div className="questions-header">
                  <h3>Questions</h3>
                  <span className="questions-range">
                    {startQuestionNumber}-{startQuestionNumber + totalQuestionsInPassage - 1}
                  </span>
                </div>

                <div className="questions-list">
                  {currentSections.map((section, sectionIdx) => {
                    const sectionQuestions = section.questions || [];
                    const extractSectionStartNumber = (instruction) => {
                      if (!instruction) return null;
                      const plainText = instruction.replace(/<[^>]*>/g, "");
                      const match = plainText.match(/[Qq]uestions?\s+(\d+)/);
                      return match ? parseInt(match[1], 10) : null;
                    };

                    const sectionStartNumber = extractSectionStartNumber(section.sectionInstruction);
                    let sectionQuestionNumber = sectionStartNumber || currentQuestionNumber;

                    const renderedQuestions = sectionQuestions.map((question) => {
                      let qNum = sectionQuestionNumber;
                      if (question && question.questionNumber) {
                        const firstPart = String(question.questionNumber).trim().split(/[, -]/)[0];
                        const parsed = parseInt(firstPart, 10);
                        if (!Number.isNaN(parsed)) {
                          qNum = parsed;
                          sectionQuestionNumber = parsed;
                        }
                      }

                      const qType = normalizeQuestionType(question.type || question.questionType || "multiple-choice");
                      if (qType === "ielts-matching-headings") {
                        sectionQuestionNumber += (question.paragraphs || question.answers || []).length || 1;
                      } else if (qType === "paragraph-matching") {
                        const clean = (question.questionText || "")
                          .replace(/<p[^>]*>/gi, "")
                          .replace(/<\/p>/gi, " ")
                          .replace(/<br\s*\/?/gi, " ")
                          .trim();
                        const parts = clean ? clean.split(/(\.{3,}|…+)/) : [];
                        const blankMatches = parts.filter((part) => part && part.match(/\.{3,}|…+/));
                        sectionQuestionNumber += blankMatches.length || 1;
                      } else if (qType === "multi-select") {
                        sectionQuestionNumber += question.requiredAnswers || 2;
                      } else if (qType === "cloze-test" || qType === "summary-completion") {
                        const blankCount = countClozeBlanks(question);
                        sectionQuestionNumber += blankCount || 1;
                      } else {
                        sectionQuestionNumber += 1;
                      }

                      return renderQuestion(question, qNum, passage);
                    });

                    currentQuestionNumber = sectionQuestionNumber;

                    return (
                      <div key={`section-${passageIdx}-${sectionIdx}`} className="question-section">
                        {(section.sectionTitle || section.sectionInstruction || section.sectionImage) && (
                          <div className="section-header">
                            {section.sectionTitle && <h4 className="section-title">{section.sectionTitle}</h4>}
                            {section.sectionInstruction && (
                              <p className="section-instruction" dangerouslySetInnerHTML={{ __html: section.sectionInstruction }} />
                            )}
                            {section.sectionImage && (
                              <img
                                src={String(section.sectionImage).startsWith("http") ? section.sectionImage : hostPath(section.sectionImage)}
                                alt="Section"
                                className="section-image"
                                style={feedbackStyles.sectionImage}
                              />
                            )}
                          </div>
                        )}
                        {renderedQuestions}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>}
          </div>
        );
      })}
    </div>
  );
}