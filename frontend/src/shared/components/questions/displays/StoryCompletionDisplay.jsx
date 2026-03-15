import React, { useCallback } from "react";
import { hostPath } from "../../../utils/api";

/**
 * StoryCompletionDisplay – Cambridge Movers Part 5 (student view)
 *
 * renderMode:
 *   "story"    → cột trái: ảnh + đoạn văn + examples
 *   "questions" → cột phải: danh sách câu hỏi với text input
 *   "full"     → toàn bộ (không split)
 *
 * Học sinh gõ tự do vào ô text (inline trong câu, thay thế ___).
 * Đáp án linh hoạt: (từ tùy chọn) / lựa chọn A / lựa chọn B
 */

/**
 * Chuyển ký hiệu linh hoạt → danh sách tất cả đáp án được chấp nhận.
 *  "(vegetable) soup"                     → ["soup", "vegetable soup"]
 *  "bowls (and glasses) / glasses (and bowls)" → ["bowls", "bowls and glasses", "glasses", "glasses and bowls"]
 */
const parseFlexibleAnswer = (answer) => {
  if (!answer || typeof answer !== "string") return [];
  const alts = answer.split("/").map((s) => s.trim()).filter(Boolean);
  const variants = new Set();
  alts.forEach((alt) => {
    const without = alt.replace(/\s*\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
    const withOpt = alt.replace(/\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
    [without, withOpt].forEach((v) => {
      if (!v) return;
      const vLow = v.toLowerCase();
      variants.add(vLow);
      // Accept with OR without trailing period
      variants.add(vLow.replace(/\.+$/, "").trim());
    });
  });
  return [...variants].filter(Boolean);
};

/** Đáp án chính (bỏ ngoặc tùy chọn, lấy lựa chọn đầu tiên) – dùng cho gợi ý chữ đầu. */
const getPrimaryAnswer = (answer) => {
  if (!answer) return "";
  const firstAlt = answer.split("/")[0].trim();
  return firstAlt.replace(/\s*\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
};

export default function StoryCompletionDisplay({
  section,
  startingNumber = 1,
  startItemIndex = 0,
  answerKeyPrefix,
  onAnswerChange,
  answers = {},
  submitted = false,
  partImage = "",
  renderMode = "full",
}) {
  const q = section?.questions?.[0] || {};
  const {
    storyTitle = "",
    storyImages = [],
    storyText = "",
    examples = [],
    items = [],
  } = q;

  const prefix = answerKeyPrefix || section?.id || "sc";
  const itemKey = (i) => `${prefix}-item-${startItemIndex + i + 1}`;

  // State lưu giá trị từng ô chữ cho mỗi item
  // answers[itemKey] = mảng ký tự đã nhập, e.g. ['r','i','v','e','r']
  const getTypedValue = useCallback((itemIdx) => {
    const stored = answers[`${prefix}-item-${startItemIndex + itemIdx + 1}`];
    if (typeof stored === "string") return stored;
    if (Array.isArray(stored)) return stored.join(""); // backward compat
    return "";
  }, [answers, prefix, startItemIndex]);

  const clearItem = (itemIdx) => {
    onAnswerChange?.(itemKey(itemIdx), "");
  };

  const isCorrect = (itemIdx) => {
    if (!submitted) return null;
    const item = items[itemIdx];
    if (!item) return null;
    const answer = item.answer || "";
    const accepted = parseFlexibleAnswer(answer);
    const typed = getTypedValue(itemIdx).toLowerCase().trim().replace(/\.+$/, "");
    if (accepted.length === 0) return typed === answer.toLowerCase().trim().replace(/\.+$/, "");
    return accepted.includes(typed);
  };

  // ── Render đoạn văn HTML (sanitized) ──
  const storyPassage = (
    <div>
      {/* Ảnh minh hoạ */}
      {(partImage || storyImages[0]) && (
        <img
          src={hostPath(partImage || storyImages[0])}
          alt="story illustration 1"
          style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, marginBottom: 10 }}
        />
      )}
      {!partImage && storyImages[1] && (
        <img
          src={hostPath(storyImages[1])}
          alt="story illustration 2"
          style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, marginBottom: 10 }}
        />
      )}

      {/* Tiêu đề */}
      {storyTitle && (
        <div style={{ color: "#dc2626", fontWeight: 700, fontSize: "1.05em", textAlign: "center", marginBottom: 10 }}>
          {storyTitle}
        </div>
      )}

      {/* Đoạn văn */}
      {storyText && (
        <div
          style={{ fontSize: "0.9em", lineHeight: 1.7, color: "#1e293b", marginBottom: 14 }}
          dangerouslySetInnerHTML={{ __html: storyText }}
        />
      )}

      {/* Examples – điền sẵn */}
      {examples.filter((ex) => ex.sentence || ex.answer).length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, color: "#0052cc", fontSize: "0.85em", marginBottom: 6 }}>Examples</div>
          {examples.map((ex, i) =>
            ex.sentence ? (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6, fontSize: "0.9em" }}>
                <ExampleSentence sentence={ex.sentence} answer={ex.answer} />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );

  // ── Render danh sách câu hỏi ──
  const questionsPanel = (
    <div style={{ padding: "60px 24px 24px" }}>
      {/* Hint text */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: "0.88em", color: "#6b7280", marginBottom: 18,
        paddingBottom: 12, borderBottom: "1.5px dashed #e5e7eb",
      }}>
        <span style={{ fontSize: "1.1em" }}>✏️</span>
        <span>{submitted ? "✅ Kết quả đã nộp" : "Gõ đáp án vào ô trống trong câu."}</span>
      </div>

      {items.map((item, i) => {
        const correct = isCorrect(i);
        const typedValue = getTypedValue(i);
        const qNum = startingNumber + i;

        return (
          <div
            key={i}
            id={`question-${qNum}`}
            data-item={i}
            style={{
              marginBottom: 20,
              padding: "20px 20px 18px",
              borderRadius: 16,
              background: submitted
                ? correct ? "#dcfce7" : "#fee2e2"
                : "#f0f6ff",
              border: submitted
                ? correct ? "2px solid #22c55e" : "2px solid #ef4444"
                : "2px solid #bfdbfe",
              boxShadow: submitted ? "none" : "0 2px 8px rgba(0,82,204,0.07)",
              transition: "background 0.15s",
            }}
          >
            {/* Số câu badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%",
                background: submitted ? (correct ? "#22c55e" : "#ef4444") : "#0052cc",
                color: "#fff", fontWeight: 900, fontSize: "1.05em", flexShrink: 0,
              }}>
                {qNum}
              </span>
              {submitted && (
                <span style={{ fontWeight: 700, fontSize: "1em", color: correct ? "#166534" : "#b91c1c" }}>
                  {correct ? "✓ Đúng!" : "✗ Sai"}
                </span>
              )}
            </div>

            {/* Câu văn với ô input inline */}
            <div style={{ fontSize: "1.05em", lineHeight: 2, color: "#1e293b", fontWeight: 500 }}>
              <InlineInputSentence
                sentence={item.sentence}
                typedValue={typedValue}
                submitted={submitted}
                correct={correct}
                onAnswerChange={(val) => !submitted && onAnswerChange?.(itemKey(i), val)}
                onClear={() => clearItem(i)}
              />
            </div>

            {/* Đáp án đúng khi sai */}
            {submitted && !correct && (
              <div style={{ marginTop: 8, fontSize: "0.9em", color: "#166534", fontWeight: 700,
                background: "#dcfce7", borderRadius: 8, padding: "4px 10px", display: "inline-block" }}>
                ✓ {parseFlexibleAnswer(item.answer).join(" / ") || item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (renderMode === "story") return storyPassage;
  if (renderMode === "questions") return questionsPanel;

  // full
  return (
    <div>
      <div style={{ padding: "0 4px 12px", boxSizing: "border-box" }}>
        {storyPassage}
      </div>
      {questionsPanel}
    </div>
  );
}

// ── Câu ví dụ: thay ___ bằng đáp án điền sẵn ──
function ExampleSentence({ sentence, answer }) {
  if (!sentence) return null;
  const parts = sentence.split("___");
  return (
    <span>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{
              display: "inline-block",
              padding: "0 8px",
              border: "1.5px solid #374151",
              borderRadius: 4,
              fontWeight: 700,
              color: "#1e293b",
              background: "#fff",
              marginInline: 2,
              fontSize: "0.95em",
            }}>
              {answer || "___"}
            </span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

// ── Câu hỏi: thay ___ bằng ô input inline ──
function InlineInputSentence({ sentence, typedValue, submitted, correct, onAnswerChange, onClear }) {
  if (!sentence) return null;
  const parts = sentence.split("___");
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginInline: 6, verticalAlign: "middle" }}>
              <input
                type="text"
                disabled={submitted}
                value={typedValue}
                onChange={(e) => onAnswerChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: 180,
                  padding: "7px 14px",
                  border: submitted
                    ? correct ? "2.5px solid #22c55e" : "2.5px solid #ef4444"
                    : "2.5px solid #93c5fd",
                  borderRadius: 10,
                  fontSize: "1.05em",
                  fontWeight: 700,
                  background: submitted ? (correct ? "#f0fdf4" : "#fef2f2") : "#fff",
                  color: submitted ? (correct ? "#166534" : "#b91c1c") : "#1e293b",
                  outline: "none",
                  verticalAlign: "middle",
                  boxShadow: submitted ? "none" : "0 2px 6px rgba(59,130,246,0.13)",
                }}
                onFocusCapture={(e) => { e.target.select(); if (!submitted) e.target.style.border = "2.5px solid #3b82f6"; }}
                onBlur={(e) => { if (!submitted) e.target.style.border = "2.5px solid #93c5fd"; }}
              />
              {!submitted && typedValue && (
                <button
                  type="button"
                  onClick={onClear}
                  style={{ padding: "4px 8px", fontSize: "0.75em", color: "#9ca3af", background: "none",
                    border: "1.5px solid #e5e7eb", borderRadius: 6, cursor: "pointer", verticalAlign: "middle" }}
                >
                  ✕
                </button>
              )}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}
