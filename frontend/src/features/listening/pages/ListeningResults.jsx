import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { apiPath, getStoredUser } from "../../../shared/utils/api";
import { isAdmin, isTeacher } from "../../../shared/utils/permissions";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import ListeningStudentStyleReview from "../components/ListeningStudentStyleReview";
import LineIcon from "../../../shared/components/LineIcon";
import { getFlowchartBlankEntries } from "../utils/flowchart";
import {
  getListeningSectionType,
  getListeningTableBlankEntries,
  LISTENING_CLOZE_TYPE,
} from "../utils/clozeTableSchema";

// ===== STYLES =====
const styles = {
  container: {
    padding: "24px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  adminShell: {
    padding: "30px 16px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "100%",
    width: "100%",
    margin: "0 auto",
    background: "#f8fafc",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1e293b",
    margin: 0,
  },
  backBtn: {
    padding: "8px 16px",
    background: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  // Summary Cards
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
    marginBottom: "24px",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  cardLabel: {
    fontSize: "0.85rem",
    color: "#64748b",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cardValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1e293b",
  },
  // Progress Circle
  progressCircle: {
    position: "relative",
    width: "80px",
    height: "80px",
    margin: "0 auto 8px",
  },
  // Analysis Section
  analysisSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  // Feedback Box
  feedbackBox: {
    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    border: "1px solid #f59e0b",
  },
  feedbackHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  // Table styles
  tableContainer: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "24px",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  filterBtnActive: {
    background: "#3b82f6",
    color: "#fff",
    borderColor: "#3b82f6",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    padding: "12px",
    background: "#1e293b",
    color: "#fff",
    fontWeight: 600,
    textAlign: "left",
    borderBottom: "2px solid #334155",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
  },
  rowCorrect: {
    background: "#f0fdf4",
  },
  rowWrong: {
    background: "#fef2f2",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  // Part Group
  partHeader: {
    background: "#e2e8f0",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "6px",
    marginTop: "8px",
  },
  // Actions
  actionsBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  actionBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  primaryBtn: {
    background: "#3b82f6",
    color: "#fff",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  // Meta info
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
    background: "#fff",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metaLabel: {
    color: "#64748b",
    fontSize: "0.85rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  metaValue: {
    fontWeight: 600,
    color: "#1e293b",
  },
  tabContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  tabActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
  },
  reviewPromptCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  reviewPromptTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "4px",
  },
  reviewPromptText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
    maxWidth: "680px",
  },
  questionSummary: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "24px",
  },
  questionGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
  questionBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "14px",
    border: "1px solid rgba(148, 163, 184, 0.25)",
  },
  legendRow: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    fontSize: "0.9rem",
  },
  legendDot: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    display: "inline-block",
    border: "1px solid rgba(148, 163, 184, 0.25)",
  },
  subSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
};

const iconWrapStyle = (size, style = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: size,
  height: size,
  lineHeight: 0,
  flex: "0 0 auto",
  ...style,
});

const InlineIcon = ({ name, size = 18, style }) => (
  <span style={iconWrapStyle(size, style)} aria-hidden="true">
    <LineIcon name={name} size={size} />
  </span>
);

// ===== HELPER COMPONENTS =====
const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const config = {
    good: { bg: "#dcfce7", color: "#166534", icon: "good", text: "Good" },
    average: { bg: "#fef3c7", color: "#92400e", icon: "average", text: "Average" },
    weak: { bg: "#fee2e2", color: "#991b1b", icon: "weak", text: "Needs Work" },
  };
  const c = config[status] || config.average;
  return (
    <span style={{ ...styles.badge, background: c.bg, color: c.color }}>
      <InlineIcon name={c.icon} size={14} />
      <span>{c.text}</span>
    </span>
  );
};

// Band score calculation for Listening
const bandFromCorrect = (c) => {
  if (c >= 39) return 9;
  if (c >= 37) return 8.5;
  if (c >= 35) return 8;
  if (c >= 32) return 7.5;
  if (c >= 30) return 7;
  if (c >= 26) return 6.5;
  if (c >= 23) return 6;
  if (c >= 18) return 5.5;
  if (c >= 16) return 5;
  if (c >= 13) return 4.5;
  if (c >= 11) return 4;
  return 3.5;
};

const safeParseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

/* eslint-disable-next-line no-unused-vars */
const parseLeadingNumber = (text) => {
  const m = String(text || "")
    .trim()
    .match(/^(\d+)\b/);
  return m ? parseInt(m[1], 10) : null;
};

const normalizeText = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isNumericThousands = (s) => /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(String(s).trim());

const parseEnglishNumber = (raw) => {
  const s = normalizeText(raw)
    .replace(/-/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;

  const small = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
  };
  const tens = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };
  const scales = {
    thousand: 1000,
    million: 1000000,
    billion: 1000000000,
  };

  const tokens = s.split(" ").filter(Boolean);
  let total = 0;
  let current = 0;
  let seenAny = false;

  for (const tok of tokens) {
    if (small[tok] != null) {
      current += small[tok];
      seenAny = true;
      continue;
    }
    if (tens[tok] != null) {
      current += tens[tok];
      seenAny = true;
      continue;
    }
    if (tok === "hundred") {
      if (!seenAny) return null;
      current *= 100;
      continue;
    }
    if (scales[tok] != null) {
      if (!seenAny) return null;
      total += current * scales[tok];
      current = 0;
      continue;
    }
    return null;
  }

  if (!seenAny) return null;
  return total + current;
};

const tryParseNumber = (raw) => {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  const s0 = normalizeText(raw);
  if (!s0) return null;

  const compactDigits = s0
    .replace(/,/g, "")
    .replace(/(?<=\d)\s+(?=\d)/g, "");

  if (/^\d+(\.\d+)?$/.test(compactDigits)) {
    const n = Number(compactDigits);
    return Number.isFinite(n) ? n : null;
  }

  const m = compactDigits.match(/^(\d+(?:\.\d+)?)\s*(thousand|million|billion)$/);
  if (m) {
    const base = Number(m[1]);
    if (!Number.isFinite(base)) return null;
    const unit = m[2];
    const mult = unit === "thousand" ? 1000 : unit === "million" ? 1000000 : 1000000000;
    return base * mult;
  }

  const words = parseEnglishNumber(compactDigits);
  return words != null ? words : null;
};

const explodeAccepted = (raw) => {
  if (raw == null) return [];
  const parsed = safeParseJson(raw);
  if (Array.isArray(parsed)) return parsed.flatMap((x) => explodeAccepted(x));
  if (typeof parsed === "string") {
    const s = parsed.trim();
    if (!s) return [];
    // Prioritize explicit variant separators (|, /, ;).
    if (s.includes("|")) return s.split("|").map((t) => t.trim()).filter(Boolean);
    if (s.includes("/")) return s.split("/").map((t) => t.trim()).filter(Boolean);
    if (s.includes(";")) return s.split(";").map((t) => t.trim()).filter(Boolean);

    // Avoid splitting numeric thousands separators like "10,000".
    if (s.includes(",") && !isNumericThousands(s)) {
      return s.split(",").map((t) => t.trim()).filter(Boolean);
    }

    return [s];
  }
  return [parsed];
};

const candidateKeys = (raw) => {
  const text = normalizeText(raw);
  const keys = text ? [text] : [];
  const num = tryParseNumber(raw);
  if (num != null) keys.push(`#num:${num}`);
  return keys;
};

const isAnswerMatch = (student, expectedRaw) => {
  const studentKeys = new Set(candidateKeys(student));
  const variants = explodeAccepted(expectedRaw);
  for (const v of variants) {
    for (const k of candidateKeys(v)) {
      if (studentKeys.has(k)) return true;
    }
  }
  return false;
};

const setEq = (a, b) => {
  if (!(a instanceof Set) || !(b instanceof Set)) return false;
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
};

const idxToLetter = (idx) => {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0) return "";
  return String.fromCharCode(65 + n);
};

const formatChoiceList = (indices) => {
  const arr = Array.isArray(indices)
    ? indices
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)
    : [];
  return arr.map(idxToLetter).filter(Boolean).join(", ");
};

const hasDetailAnswer = (detail) => {
  const raw = detail?.studentAnswer ?? detail?.studentLabel ?? detail?.student;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw ?? "").trim() !== "";
};

const parseQuestionsDeep = (questions) => {
  let parsed = safeParseJson(questions);
  if (!Array.isArray(parsed)) return parsed;
  return parsed.map((q) => ({
    ...q,
    formRows: safeParseJson(q?.formRows),
    leftItems: safeParseJson(q?.leftItems),
    rightItems: safeParseJson(q?.rightItems),
    options: safeParseJson(q?.options),
    answers: safeParseJson(q?.answers),
    steps: safeParseJson(q?.steps),
    clozeTable: safeParseJson(q?.clozeTable),
  }));
};

const generateDetailsFromSections = (test, answers) => {
  const questions = Array.isArray(test?.questions) ? test.questions : [];
  const parts = Array.isArray(test?.partInstructions) ? test.partInstructions : [];
  const normalizedAnswers = answers && typeof answers === "object" ? answers : {};

  const details = [];

  const getSectionQuestions = (partIndex, sectionIndex) =>
    questions
      .filter((q) => Number(q?.partIndex) === Number(partIndex) && Number(q?.sectionIndex) === Number(sectionIndex))
      .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));

  // Maintain a running counter for question numbering across sections/parts when no explicit startingQuestionNumber is provided
  let runningStart = 1;

  for (let pIdx = 0; pIdx < parts.length; pIdx++) {
    const p = parts[pIdx];
    const sections = Array.isArray(p?.sections) ? p.sections : [];
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx] || {};
      const sectionQuestions = getSectionQuestions(pIdx, sIdx);
      if (!sectionQuestions.length) continue;

      const firstQ = sectionQuestions[0];
      const sectionType = getListeningSectionType(section, firstQ);

      // Determine sectionStart: prefer explicit override, otherwise runningStart
      const explicitSectionStart = Number(section?.startingQuestionNumber);
      const hasExplicitStart = Number.isFinite(explicitSectionStart) && explicitSectionStart > 0;
      const sectionStart = hasExplicitStart ? explicitSectionStart : runningStart;

      // FORM / NOTES: score using answers map keyed by questionNumber
      if (sectionType === "form-completion" || sectionType === "notes-completion") {
        const map =
          firstQ?.answers && typeof firstQ.answers === "object" && !Array.isArray(firstQ.answers)
            ? firstQ.answers
            : null;
        if (map) {
          const keys = Object.keys(map)
            .map((k) => parseInt(k, 10))
            .filter((n) => Number.isFinite(n))
            .sort((a, b) => a - b);

          for (const num of keys) {
            const expected = map[String(num)];
            const student = normalizedAnswers[`q${num}`];
            const ok = isAnswerMatch(student, expected);
            details.push({
              questionNumber: num,
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionType: sectionType,
              studentAnswer: student ?? "",
              correctAnswer: expected ?? "",
              isCorrect: ok,
            });
          }
          runningStart = Math.max(runningStart, sectionStart + keys.length);
          continue;
        }

        if (sectionType === "notes-completion") {
          const matches = String(firstQ?.notesText || "").match(/(\d+)\s*[_…]+|[_…]{2,}/g) || [];
          let autoNum = sectionStart;
          matches.forEach((token) => {
            const m = String(token).match(/^(\d+)/);
            const num = m ? parseInt(m[1], 10) : autoNum++;
            if (!Number.isFinite(num)) return;
            const student = normalizedAnswers[`q${num}`];
            details.push({
              questionNumber: num,
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionType: sectionType,
              studentAnswer: student ?? "",
              correctAnswer: "",
              isCorrect: false,
            });
          });
          runningStart = Math.max(runningStart, sectionStart + matches.length);
          continue;
        }

        continue;
      }

      // MATCHING: answers map keyed by questionNumber => correct letter
      if (sectionType === "matching") {
        const map =
          firstQ?.answers && typeof firstQ.answers === "object" && !Array.isArray(firstQ.answers)
            ? firstQ.answers
            : null;
        if (map) {
          const keys = Object.keys(map)
            .map((k) => parseInt(k, 10))
            .filter((n) => Number.isFinite(n))
            .sort((a, b) => a - b);
          for (const num of keys) {
            const expected = map[String(num)];
            const student = normalizedAnswers[`q${num}`];
            const ok = expected ? isAnswerMatch(student, expected) : false;
            details.push({
              questionNumber: num,
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionType: sectionType,
              studentAnswer: student ?? "",
              correctAnswer: expected ?? "",
              isCorrect: ok,
            });
          }
          runningStart = Math.max(runningStart, sectionStart + keys.length);
          continue;
        }

        const start = sectionStart;
        const left = Array.isArray(firstQ?.leftItems)
          ? firstQ.leftItems
          : Array.isArray(firstQ?.items)
            ? firstQ.items
            : [];
        for (let i = 0; i < left.length; i++) {
          const num = start + i;
          const expected = "";
          const student = normalizedAnswers[`q${num}`];
          details.push({
            questionNumber: num,
            partIndex: pIdx,
            sectionIndex: sIdx,
            questionType: sectionType,
            studentAnswer: student ?? "",
            correctAnswer: expected,
            isCorrect: false,
          });
        }
        runningStart = Math.max(runningStart, sectionStart + left.length);
        continue;
      }

      // MULTI-SELECT: expand group into requiredAnswer slots (so table reaches 40 rows)
      if (sectionType === "multi-select") {
        let groupStart = sectionStart;
        let totalCount = 0;
        for (const q of sectionQuestions) {
          const required = Number(q?.requiredAnswers) || 2;
          const studentRaw = normalizedAnswers[`q${groupStart}`];
          const expectedRaw = q?.correctAnswer ?? q?.answers;

          const studentIndicesArr = Array.isArray(studentRaw)
            ? studentRaw.map((x) => Number(x)).filter((n) => Number.isFinite(n))
            : explodeAccepted(studentRaw)
                .map((x) => {
                  const t = String(x).trim();
                  if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                  const n = Number(t);
                  return Number.isFinite(n) ? n : null;
                })
                .filter((n) => n != null);

          const expectedIndicesArr = explodeAccepted(expectedRaw)
            .map((x) => {
              const t = String(x).trim();
              if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
              const n = Number(t);
              return Number.isFinite(n) ? n : null;
            })
            .filter((n) => n != null);

          const ok = expectedIndicesArr.length
            ? setEq(new Set(studentIndicesArr), new Set(expectedIndicesArr))
            : false;

          const studentDisplay = formatChoiceList(studentIndicesArr);
          const expectedDisplay = formatChoiceList(expectedIndicesArr) || String(expectedRaw ?? "");

          for (let i = 0; i < required; i++) {
            details.push({
              questionNumber: groupStart + i,
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionType: sectionType,
              studentAnswer: studentDisplay || (Array.isArray(studentRaw) ? "" : String(studentRaw ?? "")),
              correctAnswer: expectedDisplay,
              isCorrect: ok,
            });
          }

          groupStart += required;
          totalCount += required;
        }
        runningStart = Math.max(runningStart, sectionStart + totalCount);
        continue;
      }

      if (sectionType === LISTENING_CLOZE_TYPE) {
        const entries = getListeningTableBlankEntries(firstQ, sectionStart);
        entries.forEach(({ num, expected }) => {
          const student = normalizedAnswers[`q${num}`];
          const ok = expected ? isAnswerMatch(student, expected) : false;
          details.push({
            questionNumber: num,
            partIndex: pIdx,
            sectionIndex: sIdx,
            questionType: sectionType,
            studentAnswer: student ?? "",
            correctAnswer: expected ?? "",
            isCorrect: ok,
          });
        });
        runningStart = Math.max(runningStart, sectionStart + entries.length);
        continue;
      }

      if (sectionType === "flowchart") {
        const entries = getFlowchartBlankEntries(firstQ, sectionStart);
        entries.forEach(({ num, expected }) => {
          const student = normalizedAnswers[`q${num}`];
          const ok = expected ? isAnswerMatch(student, expected) : false;
          details.push({
            questionNumber: num,
            partIndex: pIdx,
            sectionIndex: sIdx,
            questionType: sectionType,
            studentAnswer: student ?? "",
            correctAnswer: expected ?? "",
            isCorrect: ok,
          });
        });
        runningStart = Math.max(runningStart, sectionStart + entries.length);
        continue;
      }

      if (sectionType === "map-labeling") {
        const items = Array.isArray(firstQ?.items) ? firstQ.items : [];
        items.forEach((item, idx) => {
          const num = sectionStart + idx;
          const expected = item?.correctAnswer ?? "";
          const student = normalizedAnswers[`q${num}`];
          const ok = expected ? isAnswerMatch(student, expected) : false;
          details.push({
            questionNumber: num,
            partIndex: pIdx,
            sectionIndex: sIdx,
            questionType: sectionType,
            studentAnswer: student ?? "",
            correctAnswer: expected ?? "",
            isCorrect: ok,
          });
        });
        runningStart = Math.max(runningStart, sectionStart + items.length);
        continue;
      }

      // DEFAULT (abc/abcd/fill): sequential numbering from sectionStart
      const startNum = sectionStart;
      // If still invalid, try fallback to first question's globalNumber
      const fallbackStart = Number(sectionQuestions[0]?.globalNumber) || null;
      const finalStart = Number.isFinite(startNum) && startNum > 0 ? startNum : fallbackStart;
      if (!Number.isFinite(finalStart)) continue;

      sectionQuestions.forEach((q, idx) => {
        const num = finalStart + idx;
        const expected = q?.correctAnswer;
        const student = normalizedAnswers[`q${num}`];
        const ok = isAnswerMatch(student, expected);

        details.push({
          questionNumber: num,
          partIndex: pIdx,
          sectionIndex: sIdx,
          questionType: String(sectionType || q?.questionType || "fill").toLowerCase(),
          studentAnswer: student ?? "",
          correctAnswer: expected ?? "",
          isCorrect: ok,
        });
      });

      // advance runningStart
      runningStart = Math.max(runningStart, sectionStart + sectionQuestions.length);
    }
  }

  details.sort((a, b) => (Number(a?.questionNumber) || 0) - (Number(b?.questionNumber) || 0));
  return details;
};

// ===== MAIN COMPONENT =====
const ListeningResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navResult = location.state;
  const currentUser = useMemo(() => getStoredUser(), []);
  const canViewDetailedReview = useMemo(
    () => isAdmin(currentUser) || isTeacher(currentUser),
    [currentUser]
  );

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [test, setTest] = useState(null);
  const [details, setDetails] = useState([]);
  const [filter, setFilter] = useState("all");
  const [collapsedParts, setCollapsedParts] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [showLegacyTable, setShowLegacyTable] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Preferred: id is a DB submissionId
        const subRes = await fetch(apiPath(`listening-submissions/${id}`));
        if (subRes.ok) {
          const payload = await subRes.json();
          const dbSub = payload?.submission || null;
          const dbTest = payload?.test || null;

          if (dbSub) {
            const parsedSub = {
              ...dbSub,
              answers: safeParseJson(dbSub.answers),
              details: safeParseJson(dbSub.details),
            };

            const parsedTest = dbTest
              ? {
                  ...dbTest,
                  partInstructions: safeParseJson(dbTest.partInstructions),
                  partTypes: safeParseJson(dbTest.partTypes),
                  partAudioUrls: safeParseJson(dbTest.partAudioUrls),
                  questions: parseQuestionsDeep(dbTest.questions),
                }
              : null;

            setSubmission(parsedSub);
            setTest(parsedTest);

            const parsedDetails = Array.isArray(parsedSub.details) ? parsedSub.details : [];
            const totalTarget = Number(parsedSub.total) || 40;

            // Prefer stored details when they look complete; otherwise regenerate to ensure a full 1..40 table.
            if (parsedTest && parsedSub.answers && typeof parsedSub.answers === "object") {
              const generated = generateDetailsFromSections(parsedTest, parsedSub.answers);
              // Prefer generated details when parsed/stored details look incomplete
              if (generated.length && (parsedDetails.length !== totalTarget || parsedDetails.length < generated.length)) {
                setDetails(generated);
              } else {
                setDetails(parsedDetails);
              }
            } else {
              setDetails(parsedDetails);
            }
            return;
          }
        }

        // If we have navigation state with score, use it
        if (navResult?.score !== undefined) {
          setSubmission({
            correct: navResult.score,
            total: navResult.answers ? Object.keys(navResult.answers).length : 40,
            answers: navResult.answers,
          });
        }

        // Legacy fallback: treat id as testId
        const testRes = await fetch(apiPath(`listening-tests/${id}`));
        if (testRes.ok) {
          const testDataRaw = await testRes.json();
          const testData = {
            ...testDataRaw,
            partInstructions: safeParseJson(testDataRaw.partInstructions),
            partTypes: safeParseJson(testDataRaw.partTypes),
            partAudioUrls: safeParseJson(testDataRaw.partAudioUrls),
            questions: parseQuestionsDeep(testDataRaw.questions),
          };
          setTest(testData);
          
          // Generate details from answers and test data
          if (navResult?.answers && testData.questions) {
            const generatedDetails = generateDetailsFromSections(testData, navResult.answers);
            setDetails(generatedDetails.length ? generatedDetails : generateDetails(testData.questions, navResult.answers));
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navResult]);

  // Generate answer details
  const generateDetails = (questions, answers) => {
    const details = [];
    let questionNumber = 1;

    // Support both legacy object-by-part and newer flat array questions
    if (Array.isArray(questions)) {
      questions.forEach((q) => {
        const qNum = q.globalNumber || questionNumber;
        const studentAnswer = answers?.[`q${qNum}`];
        const expected = q.correctAnswer || q.answer || q.answers;
        const isCorrect =
          studentAnswer != null && expected != null
            ? String(studentAnswer).trim().toLowerCase() === String(expected).trim().toLowerCase()
            : false;

        details.push({
          questionNumber: qNum,
          part: (q.partIndex != null ? Number(q.partIndex) + 1 : 1),
          questionType: q.questionType || 'fill',
          studentAnswer: studentAnswer || '',
          correctAnswer: expected || '',
          isCorrect,
          questionText: q.questionText || q.text || '',
        });
        questionNumber = Math.max(questionNumber, qNum + 1);
      });
      return details;
    }

    Object.entries(questions || {}).forEach(([partKey, partQuestions]) => {
      const partNum = parseInt(partKey.replace('part', ''));

      (partQuestions || []).forEach((q, idx) => {
        const answerKey = `${partKey}_${idx}`;
        const studentAnswer = answers[answerKey] || '';
        const correctAnswer = q.correctAnswer || '';
        const isCorrect =
          studentAnswer.toString().toLowerCase().trim() ===
          correctAnswer.toString().toLowerCase().trim();

        details.push({
          questionNumber,
          part: partNum,
          questionType: q.questionType || 'fill',
          studentAnswer,
          correctAnswer,
          isCorrect,
          questionText: q.questionText || '',
        });
        questionNumber++;
      });
    });

    return details;
  };

  // Group details by part
  const groupedDetails = useMemo(() => {
    if (!details.length) return {};
    const groups = {};
    details.forEach((d) => {
      const partNum =
        d.part != null
          ? Number(d.part)
          : d.partIndex != null
          ? Number(d.partIndex) + 1
          : 1;
      const part = `Part ${partNum}`;
      if (!groups[part]) groups[part] = [];
      groups[part].push(d);
    });
    return groups;
  }, [details]);

  // Filtered details
  const filteredDetails = useMemo(() => {
    if (filter === "all") return details;
    if (filter === "correct") return details.filter((d) => d.isCorrect);
    if (filter === "wrong") return details.filter((d) => !d.isCorrect);
    return details;
  }, [details, filter]);

  // Analysis by part - must be before early return
  const partAnalysis = useMemo(() => {
    const analysis = {};
    details.forEach(d => {
      const partNum =
        d.part != null
          ? Number(d.part)
          : d.partIndex != null
          ? Number(d.partIndex) + 1
          : 1;
      const part = `Part ${partNum}`;
      if (!analysis[part]) {
        analysis[part] = { correct: 0, total: 0 };
      }
      analysis[part].total++;
      if (d.isCorrect) analysis[part].correct++;
    });
    return Object.entries(analysis).map(([part, data]) => ({
      part,
      ...data,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      status: data.total > 0 
        ? (data.correct / data.total >= 0.7 ? 'good' : data.correct / data.total >= 0.5 ? 'average' : 'weak')
        : 'weak'
    }));
  }, [details]);

  const togglePart = (part) => {
    setCollapsedParts((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  useEffect(() => {
    if (!canViewDetailedReview && activeTab === "review") {
      setActiveTab("overview");
    }
  }, [activeTab, canViewDetailedReview]);

  useEffect(() => {
    if (activeTab !== "review") {
      setShowLegacyTable(false);
    }
  }, [activeTab]);

  const pageShellStyle = canViewDetailedReview
    ? styles.adminShell
    : styles.container;
  const pageShellClassName = canViewDetailedReview
    ? "admin-page admin-submission-page"
    : undefined;

  // Loading state
  if (loading) {
    return (
      <>
        {canViewDetailedReview && <AdminNavbar />}
        <div
          className={pageShellClassName}
          style={{
            ...pageShellStyle,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "16px", display: "inline-flex", color: "#3b82f6" }}>
              <InlineIcon name="loading" size={48} />
            </div>
            <p style={{ color: "#64748b" }}>Loading results...</p>
          </div>
        </div>
      </>
    );
  }

  // Prefer computed values from `details` when available to avoid showing stale stored fields
  const computedCorrect = details.filter((d) => d.isCorrect).length;
  const computedTotal = details.length > 0 ? details.length : (submission?.total ?? 40);

  // Use computed values when we have details, otherwise fall back to stored submission fields
  const correct = details.length > 0
    ? computedCorrect
    : (Number.isFinite(Number(submission?.correct)) ? Number(submission.correct) : computedCorrect);

  const total = computedTotal;

  // Score percentage: prefer computed when details exist
  const scorePercentage = details.length > 0
    ? (total > 0 ? Math.round((computedCorrect / total) * 100) : 0)
    : (submission?.scorePercentage != null ? Number(submission.scorePercentage) : 0);

  // Band: prefer stored band only when we don't have detailed computed results
  const band = details.length > 0
    ? bandFromCorrect(correct)
    : (submission?.band != null && Number.isFinite(Number(submission.band)) ? Number(submission.band) : bandFromCorrect(correct));

  const wrongCount = details.filter((d) => !d.isCorrect).length;
  const legendColors = {
    correct: "#dcfce7",
    wrong: "#fee2e2",
    blank: "#f1f5f9",
  };

  const getDetailStatus = (detail) => {
    if (detail?.isCorrect) {
      return { label: "Correct", bg: legendColors.correct, text: "#166534" };
    }
    if (!hasDetailAnswer(detail)) {
      return { label: "Blank", bg: legendColors.blank, text: "#64748b" };
    }
    return { label: "Wrong", bg: legendColors.wrong, text: "#991b1b" };
  };

  const retryTestId = test?.id || submission?.testId || id;
  const submittedAt = submission?.submittedAt || submission?.createdAt;

  return (
    <>
      {canViewDetailedReview && <AdminNavbar />}
      <div className={pageShellClassName} style={pageShellStyle}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={{ ...styles.title, display: "flex", alignItems: "center", gap: "10px" }}>
          <InlineIcon name="listening" size={22} />
          <span>Listening Test Results</span>
        </h1>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <InlineIcon name="arrow-left" size={16} />
          <span>Back</span>
        </button>
      </div>

      {canViewDetailedReview && (
        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            style={{
              ...styles.tab,
              ...(activeTab === "overview" ? styles.tabActive : {}),
            }}
          >
            <InlineIcon name="overview" size={16} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            style={{
              ...styles.tab,
              ...(activeTab === "review" ? styles.tabActive : {}),
            }}
          >
            <InlineIcon name="review" size={16} />
            <span>Question Review</span>
          </button>
        </div>
      )}

      {/* Meta Info */}
      {activeTab === "overview" && test && (
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}><InlineIcon name="tests" size={15} />Test:</span>
            <span style={styles.metaValue}>{test.title || `Listening Test #${test.id || submission?.testId || ""}`}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}><InlineIcon name="class" size={15} />Class Code:</span>
            <span style={styles.metaValue}>{test.classCode || "N/A"}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}><InlineIcon name="teacher" size={15} />Teacher:</span>
            <span style={styles.metaValue}>{test.teacherName || "N/A"}</span>
          </div>
          {submission?.userName && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}><InlineIcon name="student" size={15} />Student:</span>
              <span style={styles.metaValue}>{submission.userName}</span>
            </div>
          )}
          {submittedAt && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}><InlineIcon name="calendar" size={15} />Submitted:</span>
              <span style={styles.metaValue}>
                {new Date(submittedAt).toLocaleString("en-GB")}
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === "overview" && submission?.feedback && (
        <div style={styles.feedbackBox}>
          <div style={styles.feedbackHeader}>
            <strong style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <InlineIcon name="feedback" size={16} />
              <span>Teacher Feedback</span>
            </strong>
            {submission.feedbackBy && (
              <span style={{ color: "#92400e" }}>({submission.feedbackBy})</span>
            )}
          </div>
          <div style={{ whiteSpace: "pre-wrap", color: "#111827" }}>{submission.feedback}</div>
        </div>
      )}

      {/* Summary Cards */}
      {activeTab === "overview" && (
        <>
      <div style={styles.summaryGrid}>
        {/* Score Circle */}
        <div style={styles.summaryCard}>
          <div style={styles.progressCircle}>
            <CircularProgress percentage={scorePercentage} />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(0deg)",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: scorePercentage >= 70 ? "#22c55e" : scorePercentage >= 50 ? "#f59e0b" : "#ef4444",
              }}
            >
              {scorePercentage}%
            </div>
          </div>
          <div style={styles.cardLabel}>Accuracy</div>
        </div>

        {/* Band Score */}
        <div style={styles.summaryCard}>
          <div
            style={{
              ...styles.cardValue,
              fontSize: "2.5rem",
              color: "#1e293b",
              background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {band}
          </div>
          <div style={styles.cardLabel}>Band IX</div>
        </div>

        {/* Correct Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#22c55e" }}>
            {correct}
            <span style={{ fontSize: "1rem", color: "#64748b" }}>/{total}</span>
          </div>
          <div style={styles.cardLabel}>Correct Answers</div>
        </div>

        {/* Wrong Count */}
        <div style={styles.summaryCard}>
          <div style={{ ...styles.cardValue, color: "#ef4444" }}>{wrongCount}</div>
          <div style={styles.cardLabel}>Wrong Answers</div>
        </div>
      </div>

      {/* Part Analysis */}
      {partAnalysis.length > 0 && (
        <div style={styles.analysisSection}>
          <h3 style={styles.sectionTitle}>
            <InlineIcon name="overview" size={18} />
            <span>Part Analysis</span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {partAnalysis.map((p) => (
              <div key={p.part} style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#0e276f" }}>{p.part}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {p.correct}/{p.total} ({p.percentage}%)
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {canViewDetailedReview && details.length > 0 && (
        <div style={styles.reviewPromptCard}>
          <div>
            <div style={styles.reviewPromptTitle}>Open the question-by-question review</div>
            <p style={styles.reviewPromptText}>
              Review each answer in the original order so teachers can explain mistakes and compare responses during class.
            </p>
          </div>
          <button
            type="button"
            style={{ ...styles.actionBtn, ...styles.primaryBtn }}
            onClick={() => setActiveTab("review")}
          >
            <InlineIcon name="review" size={16} />
            <span>Open Question Review</span>
          </button>
        </div>
      )}
        </>
      )}

      {/* Answer Comparison Table */}
      {canViewDetailedReview && activeTab === "review" && details.length > 0 && (
        <>
        <div style={styles.questionSummary}>
          <h3 style={styles.sectionTitle}>Question-by-question Summary</h3>
          <div style={styles.questionGrid}>
            {details.map((detail, idx) => {
              const status = getDetailStatus(detail);
              return (
                <div
                  key={`${detail.questionNumber}-${idx}`}
                  style={{
                    ...styles.questionBadge,
                    backgroundColor: status.bg,
                    color: status.text,
                  }}
                  title={`Question ${detail.questionNumber}: ${status.label}`}
                >
                  {detail.questionNumber}
                </div>
              );
            })}
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.correct }}></span> Correct</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.wrong }}></span> Wrong</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: legendColors.blank }}></span> Blank</span>
          </div>
        </div>

        {test && submission ? (
          <ListeningStudentStyleReview
            test={test}
            submission={submission}
            details={details}
          />
        ) : (
          <div style={styles.reviewPromptCard}>
            <div>
              <div style={styles.reviewPromptTitle}>The original test view is not ready</div>
              <p style={styles.reviewPromptText}>
                The source test or submission payload is incomplete, so the page is showing the fallback comparison table below.
              </p>
            </div>
          </div>
        )}

        <div style={styles.tableContainer}>
          <div style={styles.subSectionHeader}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
              <InlineIcon name="review" size={18} />
              <span>Answer Details</span>
            </h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...styles.actionBtn, ...styles.secondaryBtn, padding: "8px 14px" }}
                onClick={() => setShowLegacyTable((prev) => !prev)}
              >
                {showLegacyTable ? "Hide Comparison Table" : "Show Comparison Table"}
              </button>
              <div style={styles.filterBar}>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "all" ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter("all")}
              >
                All ({details.length})
              </button>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "correct" ? { ...styles.filterBtnActive, background: "#22c55e", borderColor: "#22c55e" } : {}),
                }}
                onClick={() => setFilter("correct")}
              >
                <InlineIcon name="correct" size={15} />
                <span>Correct ({details.filter((d) => d.isCorrect).length})</span>
              </button>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(filter === "wrong" ? { ...styles.filterBtnActive, background: "#ef4444", borderColor: "#ef4444" } : {}),
                }}
                onClick={() => setFilter("wrong")}
              >
                <InlineIcon name="wrong" size={15} />
                <span>Wrong ({wrongCount})</span>
              </button>
            </div>
            </div>
          </div>

          {showLegacyTable && (
            <>

          {/* Grouped by Part */}
          {Object.keys(groupedDetails).length > 1 ? (
            Object.entries(groupedDetails).map(([part, items]) => {
              const partFiltered = items.filter((d) =>
                filter === "all" ? true : filter === "correct" ? d.isCorrect : !d.isCorrect
              );
              if (partFiltered.length === 0) return null;

              const partCorrect = items.filter((d) => d.isCorrect).length;
              return (
                <div key={part} style={{ marginBottom: "12px" }}>
                  <div style={styles.partHeader} onClick={() => togglePart(part)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <InlineIcon name="listening" size={16} />
                      <span>{part} ({partCorrect}/{items.length} correct)</span>
                    </span>
                    <InlineIcon name={collapsedParts[part] ? "chevron-right" : "chevron-down"} size={16} />
                  </div>
                  {!collapsedParts[part] && (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Question</th>
                          <th style={styles.th}>Correct Answer</th>
                          <th style={styles.th}>Your Answer</th>
                          <th style={styles.th}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partFiltered.map((r, idx) => (
                          <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                            <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                            <td style={styles.td}>
                              <span style={{ color: "#166534", fontWeight: 500 }}>
                                {r.correctAnswer}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                                {r.studentAnswer || <em style={{ color: "#94a3b8" }}>No answer</em>}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {r.isCorrect ? (
                                <InlineIcon name="correct" size={18} style={{ color: "#22c55e" }} />
                              ) : (
                                <InlineIcon name="wrong" size={18} style={{ color: "#ef4444" }} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Question</th>
                  <th style={styles.th}>Part</th>
                  <th style={styles.th}>Correct Answer</th>
                  <th style={styles.th}>Your Answer</th>
                  <th style={styles.th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.map((r, idx) => (
                  <tr key={idx} style={r.isCorrect ? styles.rowCorrect : styles.rowWrong}>
                    <td style={styles.td}><strong>{r.questionNumber}</strong></td>
                    <td style={styles.td}>
                      Part {r.part != null ? r.part : r.partIndex != null ? Number(r.partIndex) + 1 : 1}
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: "#166534", fontWeight: 500 }}>
                        {r.correctAnswer}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: r.isCorrect ? "#166534" : "#991b1b", fontWeight: 500 }}>
                        {r.studentAnswer || <em style={{ color: "#94a3b8" }}>No answer</em>}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.isCorrect ? (
                        <InlineIcon name="correct" size={18} style={{ color: "#22c55e" }} />
                      ) : (
                        <InlineIcon name="wrong" size={18} style={{ color: "#ef4444" }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
            </>
          )}
        </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={styles.actionsBar}>
        {canViewDetailedReview && activeTab === "review" && (
          <button
            style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
            onClick={() => setActiveTab("overview")}
          >
            <InlineIcon name="arrow-left" size={16} />
            <span>Back to Overview</span>
          </button>
        )}
        <button
          style={{ ...styles.actionBtn, ...styles.primaryBtn }}
          onClick={() => navigate(`/listening/${retryTestId}`)}
        >
          <InlineIcon name="retry" size={16} />
          <span>Retake This Test</span>
        </button>
        <button
          style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
          onClick={() => navigate("/select-test")}
        >
          <InlineIcon name="tests" size={16} />
          <span>Choose Another Test</span>
        </button>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>
            <InlineIcon name="home" size={16} />
            <span>Home</span>
          </button>
        </Link>
      </div>
      </div>
    </>
  );
};

export { generateDetailsFromSections };
export default ListeningResults;
