import React, { useMemo, useState } from "react";
import { hostPath } from "../../../shared/utils/api";
import MapLabelingQuestion from "../../../shared/components/MapLabelingQuestion";
import TableCompletion from "../../../shared/components/questions/editors/TableCompletion.jsx";
import createStyles from "../pages/DoListeningTest.styles";

const BLANK_REGEX = /(\d+)\s*[_…]+|[_…]{2,}/g;

const reviewStyles = {
  intro: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px 20px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    color: "#334155",
    lineHeight: 1.7,
  },
  partShell: {
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    marginBottom: "24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
  },
  partHeader: {
    padding: "18px 22px",
    borderBottom: "1px solid #e2e8f0",
    background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)",
  },
  partHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  partEyebrow: {
    color: "#4338ca",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    fontWeight: 700,
    margin: 0,
  },
  partTitle: {
    margin: "4px 0 6px",
    color: "#0f172a",
    fontSize: "24px",
  },
  partMeta: {
    color: "#475569",
    margin: 0,
    lineHeight: 1.6,
  },
  audioWrap: {
    padding: "18px 22px 0",
  },
  audioTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "8px",
  },
  sectionDivider: {
    borderTop: "1px solid #e2e8f0",
    marginTop: "8px",
  },
  feedbackRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
    marginTop: "10px",
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  answerChip: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 600,
  },
  toggleButton: {
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #c7d2fe",
    background: "#ffffff",
    color: "#4338ca",
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
    marginBottom: "16px",
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

const safeParseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stripHtml = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const hasAnswerValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return String(value ?? "").trim() !== "";
};

const normalizeAnswerObject = (rawAnswers) => {
  const parsed = safeParseJson(rawAnswers);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const countTableCompletionBlanks = (question) => {
  const rowsArr = question?.rows || [];
  const cols = question?.columns || [];
  const blankRegex = /\[BLANK\]|_{2,}|[\u2026]+/g;
  let blanksCount = 0;

  rowsArr.forEach((row) => {
    const normalizedRow = Array.isArray(row?.cells)
      ? row
      : {
          cells: [
            row?.vehicle || "",
            row?.cost || "",
            Array.isArray(row?.comments) ? row.comments.join("\n") : row?.comments || "",
          ],
        };

    const cells = Array.isArray(normalizedRow.cells) ? normalizedRow.cells : [];
    const maxCols = cols.length ? cols.length : cells.length;
    for (let c = 0; c < maxCols; c += 1) {
      const text = String(cells[c] || "");
      const matches = text.match(blankRegex) || [];
      blanksCount += matches.length;
    }
  });

  return blanksCount === 0 ? rowsArr.length || 0 : blanksCount;
};

const getQuestionCount = (question) => {
  if (!question) return 0;

  if (Array.isArray(question.formRows) && question.formRows.length > 0) {
    return Math.max(1, question.formRows.filter((row) => row.isBlank).length);
  }

  if ((question.columns && question.columns.length > 0) || (question.rows && question.rows.length > 0)) {
    return Math.max(1, countTableCompletionBlanks(question));
  }

  if (typeof question.notesText === "string" && question.notesText.trim()) {
    return Math.max(1, (stripHtml(question.notesText).match(BLANK_REGEX) || []).length);
  }

  if (question.leftItems && question.leftItems.length > 0) {
    return Math.max(1, question.leftItems.length);
  }

  if (question.items && question.items.length > 0) {
    return Math.max(1, question.items.length);
  }

  if ((question.questionType === "multi-select" || Number(question?.requiredAnswers)) && question.requiredAnswers) {
    return Math.max(1, Number(question.requiredAnswers));
  }

  return 1;
};

const getSectionQuestionCount = (section, sectionQuestions) => {
  if (!section) return 0;
  const sectionType = String(section?.questionType || "fill").toLowerCase();
  const firstQuestion = sectionQuestions[0] || {};

  if (sectionType === "form-completion") {
    const keys =
      firstQuestion?.answers && typeof firstQuestion.answers === "object" && !Array.isArray(firstQuestion.answers)
        ? Object.keys(firstQuestion.answers).filter((key) => Number.isFinite(parseInt(key, 10)))
        : [];
    if (keys.length) return keys.length;
    return (firstQuestion.formRows || []).filter((row) => row?.isBlank).length || 0;
  }

  if (sectionType === "notes-completion") {
    const keys =
      firstQuestion?.answers && typeof firstQuestion.answers === "object" && !Array.isArray(firstQuestion.answers)
        ? Object.keys(firstQuestion.answers).filter((key) => Number.isFinite(parseInt(key, 10)))
        : [];
    if (keys.length) return keys.length;
    return (stripHtml(String(firstQuestion.notesText || "")).match(BLANK_REGEX) || []).length || 0;
  }

  if (sectionType === "matching") {
    const keys =
      firstQuestion?.answers && typeof firstQuestion.answers === "object" && !Array.isArray(firstQuestion.answers)
        ? Object.keys(firstQuestion.answers).filter((key) => Number.isFinite(parseInt(key, 10)))
        : [];
    if (keys.length) return keys.length;
    return (firstQuestion.leftItems || firstQuestion.items || []).length || 0;
  }

  if (sectionType === "multi-select") {
    return sectionQuestions.reduce((sum, question) => sum + (Number(question?.requiredAnswers) || 2), 0);
  }

  if (sectionType === "table-completion") {
    return countTableCompletionBlanks(firstQuestion) || 0;
  }

  if (sectionType === "map-labeling") {
    return (firstQuestion.items || []).length || 0;
  }

  return sectionQuestions.length;
};

const getStatusConfig = (detail) => {
  if (!detail) {
    return {
      label: "Bo trong",
      style: { ...reviewStyles.statusChip, background: "#f1f5f9", color: "#64748b" },
      isCorrect: false,
    };
  }

  if (detail.isCorrect) {
    return {
      label: "Dung",
      style: { ...reviewStyles.statusChip, background: "#dcfce7", color: "#166534" },
      isCorrect: true,
    };
  }

  if (!hasAnswerValue(detail.studentAnswer ?? detail.student ?? detail.studentLabel)) {
    return {
      label: "Bo trong",
      style: { ...reviewStyles.statusChip, background: "#f1f5f9", color: "#64748b" },
      isCorrect: false,
    };
  }

  return {
    label: "Sai",
    style: { ...reviewStyles.statusChip, background: "#fee2e2", color: "#991b1b" },
    isCorrect: false,
  };
};

function Feedback({ detail }) {
  const status = getStatusConfig(detail);
  const correctAnswer = String(detail?.correctAnswer || "").trim();

  return (
    <div style={reviewStyles.feedbackRow}>
      <span style={status.style}>{status.label}</span>
      {!status.isCorrect && correctAnswer ? (
        <span style={reviewStyles.answerChip}>Dap an dung: {correctAnswer}</span>
      ) : null}
    </div>
  );
}

export default function ListeningStudentStyleReview({ test, submission, details }) {
  const [collapsedParts, setCollapsedParts] = useState({});
  const styles = useMemo(() => createStyles(false), []);
  const answers = useMemo(() => normalizeAnswerObject(submission?.answers), [submission?.answers]);
  const questions = useMemo(() => (Array.isArray(test?.questions) ? test.questions : []), [test?.questions]);
  const partInstructions = useMemo(
    () => (Array.isArray(test?.partInstructions) ? test.partInstructions : []),
    [test?.partInstructions]
  );

  const detailMap = useMemo(() => {
    const map = new Map();
    (details || []).forEach((detail) => {
      const key = Number(detail?.questionNumber);
      if (Number.isFinite(key)) map.set(key, detail);
    });
    return map;
  }, [details]);

  const getPartQuestionRange = (partIndex) => {
    let startNum = 1;

    for (let previousPart = 0; previousPart < partIndex; previousPart += 1) {
      const partInfo = partInstructions[previousPart] || {};
      const sections = Array.isArray(partInfo?.sections) ? partInfo.sections : [];
      for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx += 1) {
        const section = sections[sectionIdx] || {};
        const sectionQuestions = questions.filter(
          (question) => Number(question.partIndex) === previousPart && Number(question.sectionIndex) === sectionIdx
        );
        startNum += getSectionQuestionCount(section, sectionQuestions);
      }
    }

    const partQuestions = questions.filter((question) => Number(question.partIndex) === partIndex);
    if (!partQuestions.length) {
      return { start: 0, end: 0, questions: [] };
    }

    const sections = Array.isArray(partInstructions[partIndex]?.sections)
      ? partInstructions[partIndex].sections
      : [];

    let totalCount = 0;
    if (sections.length) {
      for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx += 1) {
        const section = sections[sectionIdx] || {};
        const sectionQuestions = questions.filter(
          (question) => Number(question.partIndex) === partIndex && Number(question.sectionIndex) === sectionIdx
        );
        totalCount += getSectionQuestionCount(section, sectionQuestions);
      }
    } else {
      partQuestions.forEach((question) => {
        totalCount += getQuestionCount(question);
      });
    }

    return {
      start: startNum,
      end: startNum + totalCount - 1,
      questions: partQuestions,
    };
  };

  const getSectionQuestions = (partIndex, sectionIndex) =>
    questions
      .filter(
        (question) => Number(question.partIndex) === partIndex && Number(question.sectionIndex) === Number(sectionIndex)
      )
      .sort((left, right) => (Number(left?.questionIndex) || 0) - (Number(right?.questionIndex) || 0));

  const buildTableAnswerSubset = (startNumber, endNumber) => {
    const subset = {};
    for (let number = startNumber; number <= endNumber; number += 1) {
      if (answers[`q${number}`] != null) {
        subset[number] = answers[`q${number}`];
      }
    }
    return subset;
  };

  const buildTableDetailMap = (startNumber, endNumber) => {
    const map = new Map();
    for (let number = startNumber; number <= endNumber; number += 1) {
      const detail = detailMap.get(number);
      if (detail) map.set(number, detail);
    }
    return map;
  };

  const matchesChoice = (choiceLetter, optionText, expected) => {
    const normalizedExpected = normalizeText(expected);
    return (
      normalizedExpected === normalizeText(choiceLetter) ||
      normalizedExpected === normalizeText(optionText)
    );
  };

  const parseSelectedMultiAnswers = (startNumber) => {
    const raw = safeParseJson(answers[`q${startNumber}`] || []);
    if (Array.isArray(raw)) {
      return raw.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    }
    return String(raw || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        if (/^[A-Z]$/i.test(part)) return part.toUpperCase().charCodeAt(0) - 65;
        const parsed = Number(part);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value) => value !== null);
  };

  const getSectionType = (section, firstQuestion) => {
    let type = section?.questionType || firstQuestion?.questionType || "fill";
    if (type === "fill") {
      if (firstQuestion?.formRows?.length) {
        type = "form-completion";
      } else if (firstQuestion?.notesText) {
        type = "notes-completion";
      } else if (firstQuestion?.leftItems?.length) {
        type = "matching";
      } else if ((firstQuestion?.columns?.length || 0) > 0 || (firstQuestion?.rows?.length || 0) > 0) {
        type = "table-completion";
      } else if (firstQuestion?.options?.length) {
        type = firstQuestion.options.length === 3 ? "abc" : "abcd";
      }
    }
    return String(type || "fill").toLowerCase();
  };

  const renderMultipleChoice = (question, globalNumber) => {
    const options = question.options || [];
    const selectedAnswer = answers[`q${globalNumber}`];
    const detail = detailMap.get(globalNumber);

    return (
      <div key={globalNumber} style={styles.questionItem}>
        <div style={styles.questionHeader}>
          <div style={styles.questionNumber}>{globalNumber}</div>
          <div style={styles.questionText}>{question.questionText}</div>
        </div>
        <ul style={styles.optionsList}>
          {options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const isSelected = selectedAnswer === optionLetter;
            const isCorrectOption = matchesChoice(optionLetter, option, detail?.correctAnswer);

            return (
              <li key={index} style={styles.optionItem}>
                <label
                  style={{
                    ...styles.optionLabel,
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                    borderColor: isCorrectOption ? "#22c55e" : styles.optionLabel.border,
                    boxShadow: isCorrectOption ? "0 0 0 1px rgba(34, 197, 94, 0.25)" : undefined,
                  }}
                >
                  <input type="radio" style={styles.radioInput} checked={isSelected} readOnly disabled />
                  <span style={styles.optionText}>{option}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <Feedback detail={detail} />
      </div>
    );
  };

  const renderMultipleChoiceMany = (question, startNumber, count = 2) => {
    const options = question.options || [];
    const selectedAnswers = parseSelectedMultiAnswers(startNumber);
    const endNumber = startNumber + count - 1;
    const detail = detailMap.get(startNumber);
    const expectedLetters = String(detail?.correctAnswer || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    return (
      <div key={startNumber} style={styles.multiSelectContainer}>
        <div style={styles.multiSelectHeader}>
          <span style={styles.multiSelectBadge}>{startNumber}-{endNumber}</span>
          <span style={styles.multiSelectQuestionText}>{question.questionText}</span>
        </div>
        <div style={styles.multiSelectOptions}>
          {options.map((option, index) => {
            const hasPrefix = /^[A-Z][.\s]/.test(String(option || ""));
            const letterLabel = String.fromCharCode(65 + index);
            const isSelected = selectedAnswers.includes(index);
            const isExpected = expectedLetters.includes(letterLabel);

            return (
              <label
                key={index}
                style={{
                  ...styles.multiSelectOption,
                  backgroundColor: isSelected ? "#dbeafe" : styles.multiSelectOption.backgroundColor,
                  borderColor: isExpected ? "#22c55e" : styles.multiSelectOption.border.split(" ").pop(),
                }}
              >
                <input type="checkbox" style={styles.multiSelectCheckbox} checked={isSelected} readOnly disabled />
                <span style={styles.multiSelectOptionText}>
                  {!hasPrefix && <strong>{letterLabel}. </strong>}
                  {option}
                </span>
              </label>
            );
          })}
        </div>
        <Feedback detail={detail} />
      </div>
    );
  };

  const renderFillQuestion = (question, globalNumber) => {
    const detail = detailMap.get(globalNumber);

    return (
      <div key={globalNumber} style={styles.fillQuestionItem}>
        <span style={styles.fillQuestionNumber}>{globalNumber}</span>
        <div style={{ flex: 1 }}>
          {question.questionText ? <div style={{ marginBottom: "8px", color: styles.questionText.color }}>{question.questionText}</div> : null}
          <input
            type="text"
            value={answers[`q${globalNumber}`] || ""}
            readOnly
            disabled
            style={{
              ...styles.fillInput,
              borderColor: detail?.isCorrect ? "#22c55e" : hasAnswerValue(answers[`q${globalNumber}`]) ? "#ef4444" : styles.fillInput.border,
              backgroundColor: detail?.isCorrect ? "#f0fdf4" : hasAnswerValue(answers[`q${globalNumber}`]) ? "#fef2f2" : styles.fillInput.backgroundColor,
            }}
            placeholder="Type your answer..."
          />
          <Feedback detail={detail} />
        </div>
      </div>
    );
  };

  const renderMatching = (question, startNumber) => {
    const leftItems = question.leftItems || question.items || [];
    const leftTitle = question.leftTitle || "Items";
    const rightTitle = question.rightTitle || "Options";
    let rightItems = question.options && question.options.length > 0 ? question.options : question.rightItems || [];

    if (rightItems.length > 0 && typeof rightItems[0] === "object") {
      rightItems = rightItems.map((option) => option.text || option.label || option);
    }

    return (
      <div style={styles.matchingContainer}>
        <div style={styles.matchingLeft}>
          <div style={styles.optionsTitle}>{leftTitle}</div>
          <div style={styles.matchingItemsList}>
            {leftItems.map((item, index) => {
              const questionNumber = startNumber + index;
              const selectedValue = answers[`q${questionNumber}`];
              const itemText = typeof item === "object" ? item.text || item.label || item : item;
              return (
                <div key={questionNumber} style={styles.matchingRow}>
                  <span style={styles.matchingQuestionNum}>{questionNumber}</span>
                  <span style={styles.matchingItemText}>{itemText}</span>
                  <div style={styles.matchingDropdownWrapper}>
                    <select value={selectedValue || ""} disabled style={styles.matchingSelect}>
                      <option value="">--</option>
                      {rightItems.map((_, optionIndex) => {
                        const optionLetter = String.fromCharCode(65 + optionIndex);
                        return (
                          <option key={optionLetter} value={optionLetter}>
                            {optionLetter}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Feedback detail={detailMap.get(questionNumber)} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.matchingRight}>
          <div style={styles.optionsTitle}>{rightTitle}</div>
          <div style={styles.optionsContainer}>
            {rightItems.map((option, index) => {
              const optionText = typeof option === "object" ? option.text || option.label || JSON.stringify(option) : option;
              const hasPrefix = /^[A-Z][.\s]/.test(String(optionText || ""));
              return (
                <div key={index} style={styles.optionCard}>
                  {!hasPrefix && <strong style={{ marginRight: "8px" }}>{String.fromCharCode(65 + index)}</strong>}
                  {optionText}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderFormCompletion = (question, startNumber) => {
    const formTitle = question?.formTitle || "";
    const formRows = question?.formRows || [];

    if (!formRows.length) return null;

    const renderBlankInput = (row, rowIndex) => {
      const questionNumber = row.blankNumber ? startNumber + row.blankNumber - 1 : startNumber + rowIndex;
      const answerValue = answers[`q${questionNumber}`] || "";
      const detail = detailMap.get(questionNumber);

      return (
        <span key={`blank-${rowIndex}`} style={styles.formGapWrapper}>
          <input
            type="text"
            value={answerValue}
            readOnly
            disabled
            placeholder={`${questionNumber}`}
            style={{
              ...styles.formGapInput,
              borderColor: detail?.isCorrect ? "#22c55e" : hasAnswerValue(answerValue) ? "#ef4444" : "#d1d5db",
              boxShadow: detail?.isCorrect ? "0 0 0 1px rgba(34, 197, 94, 0.2)" : "none",
              backgroundColor: detail?.isCorrect ? "#f0fdf4" : hasAnswerValue(answerValue) ? "#fef2f2" : styles.formGapInput.backgroundColor,
            }}
          />
          <Feedback detail={detail} />
        </span>
      );
    };

    return (
      <div style={styles.formContainer}>
        {formTitle && <div style={styles.formTitle}>{formTitle}</div>}
        <div style={styles.formContent}>
          {formRows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ ...styles.formRow, paddingLeft: row.isSubRow ? "24px" : "0" }}>
              {row.label && <span style={styles.formLabel}>{row.label}</span>}
              <span style={styles.formValue}>
                {row.prefix && <span>{row.prefix} </span>}
                {row.isBlank ? renderBlankInput(row, rowIndex) : <span style={styles.formFixedValue}>{row.suffix || row.value || ""}</span>}
                {row.isBlank && row.suffix && <span> {row.suffix}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTableCompletion = (question, startNumber, endNumber, partNumber) => {
    const title = question?.title || "";
    const instruction = question?.instruction || "";

    return (
      <div style={{ width: "100%" }}>
        {instruction && <div style={{ fontStyle: "italic", marginBottom: 8 }}>{instruction}</div>}
        {title && <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 8 }}>{title}</div>}
        <TableCompletion
          data={{
            part: partNumber,
            title,
            instruction,
            columns: question?.columns || [],
            rows: question?.rows || [],
            rangeStart: startNumber,
            rangeEnd: endNumber,
          }}
          startingQuestionNumber={startNumber}
          answers={buildTableAnswerSubset(startNumber, endNumber)}
          showHeader={false}
          readOnly
          detailMap={buildTableDetailMap(startNumber, endNumber)}
        />
      </div>
    );
  };

  const renderMapLabeling = (question, startNumber) => {
    const safeQuestion = {
      ...(question || {}),
      mapImageUrl: question?.mapImageUrl
        ? String(question.mapImageUrl).startsWith("http")
          ? question.mapImageUrl
          : hostPath(question.mapImageUrl)
        : question?.imageUrl
        ? String(question.imageUrl).startsWith("http")
          ? question.imageUrl
          : hostPath(question.imageUrl)
        : "",
    };

    return (
      <MapLabelingQuestion
        question={safeQuestion}
        mode="review"
        questionNumber={startNumber}
        studentAnswer={answers}
        showCorrect
      />
    );
  };

  const renderNotesCompletion = (question, startNumber) => {
    const notesText = question.notesText || "";
    const notesTitle = question.notesTitle || "";

    const styleStringToObject = (styleString) => {
      if (!styleString) return undefined;
      return styleString
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((accumulator, declaration) => {
          const [property, value] = declaration.split(":").map((entry) => entry.trim());
          if (!property || !value) return accumulator;
          const camelProperty = property.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
          accumulator[camelProperty] = value;
          return accumulator;
        }, {});
    };

    const renderTextWithGaps = (text, keyPrefix, counter) => {
      const parts = text.split(/(\d+\s*[_…]+|[_…]{2,})/g);
      return parts.map((part, index) => {
        const key = `${keyPrefix}-text-${index}`;
        const match = part.match(/^(\d+)\s*[_…]+$/);
        if (match || /^[_…]{2,}$/.test(part)) {
          let questionNumber = null;
          if (match) {
            questionNumber = parseInt(match[1], 10);
            if (Number.isFinite(questionNumber)) counter.value = Math.max(counter.value, questionNumber + 1);
          } else {
            questionNumber = counter.value;
            counter.value += 1;
          }

          const detail = detailMap.get(questionNumber);
          const answerValue = answers[`q${questionNumber}`] || "";

          return (
            <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <input
                type="text"
                value={answerValue}
                readOnly
                disabled
                style={{
                  ...styles.gapInput,
                  borderColor: detail?.isCorrect ? "#22c55e" : hasAnswerValue(answerValue) ? "#ef4444" : "#d1d5db",
                  backgroundColor: detail?.isCorrect ? "#f0fdf4" : hasAnswerValue(answerValue) ? "#fef2f2" : styles.gapInput.backgroundColor,
                }}
              />
              {!answerValue && <span style={styles.gapPlaceholder}>{questionNumber}</span>}
              <Feedback detail={detail} />
            </span>
          );
        }
        return <span key={key}>{part}</span>;
      });
    };

    const renderRichNotes = () => {
      if (!notesText) return null;
      if (typeof DOMParser === "undefined") return stripHtml(notesText);

      const parser = new DOMParser();
      const doc = parser.parseFromString(notesText, "text/html");
      const counter = { value: startNumber };

      const walk = (node, keyPrefix) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return renderTextWithGaps(node.textContent || "", keyPrefix, counter);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const tag = node.tagName.toLowerCase();
        if (tag === "br") return <br key={keyPrefix} />;

        const children = Array.from(node.childNodes)
          .map((child, index) => walk(child, `${keyPrefix}-${index}`))
          .flat()
          .filter(Boolean);

        return React.createElement(tag, {
          key: keyPrefix,
          style: styleStringToObject(node.getAttribute("style")),
          className: node.getAttribute("class") || undefined,
        }, children);
      };

      return Array.from(doc.body.childNodes)
        .map((child, index) => walk(child, `node-${index}`))
        .filter(Boolean);
    };

    return (
      <div style={styles.notesContainer}>
        {notesTitle && <div style={styles.notesTitle}>{notesTitle}</div>}
        <div style={styles.notesContent} className="ql-editor">
          {renderRichNotes()}
        </div>
      </div>
    );
  };

  const renderSection = (section, sectionIndex, partIndex, partRange) => {
    const sectionQuestions = getSectionQuestions(partIndex, sectionIndex);
    if (!sectionQuestions.length) return null;

    const firstQuestion = sectionQuestions[0];
    const questionType = getSectionType(section, firstQuestion);

    let startNumber =
      typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0
        ? section.startingQuestionNumber
        : partRange.start;

    if (!(typeof section.startingQuestionNumber === "number" && section.startingQuestionNumber > 0)) {
      const previousSections = Array.isArray(partInstructions[partIndex]?.sections)
        ? partInstructions[partIndex].sections
        : [];
      for (let previousSectionIndex = 0; previousSectionIndex < sectionIndex; previousSectionIndex += 1) {
        const previousSection = previousSections[previousSectionIndex] || {};
        const previousQuestions = getSectionQuestions(partIndex, previousSectionIndex);
        startNumber += getSectionQuestionCount(previousSection, previousQuestions);
      }
    }

    const actualQuestionCount = sectionQuestions.reduce((sum, question) => sum + getQuestionCount(question), 0);
    const displayEndNumber = startNumber + actualQuestionCount - 1;

    return (
      <div key={`section-${partIndex}-${sectionIndex}`} style={styles.sectionContainer}>
        <div style={reviewStyles.sectionDivider}></div>
        <div style={{ padding: "18px 22px 0" }}>
          <div style={styles.sectionTitle}>{section.sectionTitle || `Questions ${startNumber}-${displayEndNumber}`}</div>
          {(section.sectionInstruction || section.instruction) && (
            <div
              style={styles.sectionInstruction}
              dangerouslySetInnerHTML={{ __html: section.sectionInstruction || section.instruction }}
            />
          )}
        </div>

        <div style={{ ...styles.questionsWrapper, padding: "0 22px 22px" }}>
          {(questionType === "multiple-choice" || questionType === "abc" || questionType === "abcd") &&
            sectionQuestions.map((question, questionIndex) => renderMultipleChoice(question, startNumber + questionIndex))}

          {questionType === "multi-select" && (() => {
            let currentNumber = startNumber;
            return sectionQuestions.map((question) => {
              const block = renderMultipleChoiceMany(question, currentNumber, question.requiredAnswers || 2);
              currentNumber += question.requiredAnswers || 2;
              return block;
            });
          })()}

          {questionType === "matching" && renderMatching(firstQuestion, startNumber)}
          {questionType === "form-completion" && renderFormCompletion(firstQuestion, startNumber)}
          {questionType === "notes-completion" && renderNotesCompletion(firstQuestion, startNumber)}
          {questionType === "map-labeling" && renderMapLabeling(firstQuestion, startNumber)}
          {questionType === "table-completion" && renderTableCompletion(firstQuestion, startNumber, displayEndNumber, partIndex + 1)}

          {!["multiple-choice", "abc", "abcd", "multi-select", "matching", "form-completion", "notes-completion", "map-labeling", "table-completion"].includes(questionType) &&
            sectionQuestions.map((question, questionIndex) => renderFillQuestion(question, startNumber + questionIndex))}
        </div>
      </div>
    );
  };

  if (!partInstructions.length) {
    return <div style={reviewStyles.intro}>Chua co du lieu de dung lai giao dien Listening goc.</div>;
  }

  const togglePart = (partIndex) => {
    setCollapsedParts((prev) => ({
      ...prev,
      [partIndex]: !prev[partIndex],
    }));
  };

  const collapseAllParts = () => {
    const next = {};
    partInstructions.forEach((_, index) => {
      next[index] = true;
    });
    setCollapsedParts(next);
  };

  const expandAllParts = () => {
    setCollapsedParts({});
  };

  const allCollapsed =
    partInstructions.length > 0 &&
    partInstructions.every((_, index) => Boolean(collapsedParts[index]));
  const allExpanded =
    partInstructions.length > 0 &&
    partInstructions.every((_, index) => !collapsedParts[index]);

  return (
    <div>
      <div style={reviewStyles.intro}>
        Phan nay dung lai bo cuc Listening ma hoc sinh da mo luc lam bai. Giao vien co the bat lai file audio, xem dap an hoc sinh da chon, va doi chieu dap an dung ngay tai tung section.
      </div>

      {partInstructions.length > 1 && (
        <div style={reviewStyles.bulkActionRow}>
          <button
            type="button"
            style={reviewStyles.bulkActionButton}
            onClick={collapseAllParts}
            disabled={allCollapsed}
          >
            Thu gon tat ca
          </button>
          <button
            type="button"
            style={reviewStyles.bulkActionButton}
            onClick={expandAllParts}
            disabled={allExpanded}
          >
            Mo rong tat ca
          </button>
        </div>
      )}

      {partInstructions.map((part, partIndex) => {
        const partRange = getPartQuestionRange(partIndex);
        const audioUrl = Array.isArray(test?.partAudioUrls) ? test.partAudioUrls[partIndex] : null;
        const isCollapsed = Boolean(collapsedParts[partIndex]);
        return (
          <div key={`part-${partIndex}`} style={reviewStyles.partShell}>
            <div style={reviewStyles.partHeader}>
              <div style={reviewStyles.partHeaderRow}>
                <div>
                  <p style={reviewStyles.partEyebrow}>Listening Review</p>
                  <h2 style={reviewStyles.partTitle}>PART {partIndex + 1}</h2>
                  <p style={reviewStyles.partMeta}>
                    Questions {partRange.start}-{partRange.end}
                    {part?.description ? ` • ${part.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  style={reviewStyles.toggleButton}
                  onClick={() => togglePart(partIndex)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? "Mo rong" : "Thu gon"}
                </button>
              </div>
            </div>

            {!isCollapsed && audioUrl && (
              <div style={reviewStyles.audioWrap}>
                <div style={reviewStyles.audioTitle}>Audio goc</div>
                <audio controls style={styles.audioPlayer} src={String(audioUrl).startsWith("http") ? audioUrl : hostPath(audioUrl)} />
              </div>
            )}

            {!isCollapsed && <div style={{ paddingBottom: "18px" }}>
              {(part.sections || []).map((section, sectionIndex) => renderSection(section, sectionIndex, partIndex, partRange))}
            </div>}
          </div>
        );
      })}
    </div>
  );
}