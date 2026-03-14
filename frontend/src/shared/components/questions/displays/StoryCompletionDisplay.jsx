import React, { useState, useCallback } from "react";
import { hostPath } from "../../../utils/api";

/**
 * StoryCompletionDisplay – Cambridge Movers Part 5 (student view)
 *
 * renderMode:
 *   "story"    → cột trái: ảnh + đoạn văn + examples
 *   "questions" → cột phải: danh sách câu hỏi với ô chữ cái
 *   "full"     → toàn bộ (không split)
 *
 * Letter-box design:
 *   Mỗi câu trả lời được chia thành từng ô chữ cái riêng.
 *   Chữ đầu và chữ cuối hiển thị làm gợi ý (màu xanh).
 *   Các ô giữa để trống cho học sinh gõ.
 *   Ô đang focus có viền xanh đậm.
 */

const buildLetterSlots = (answer = "") => {
  // Tạo mảng slot cho từng chữ cái
  // answer có thể là multi-word: "red boat" → 8 ký tự (bao gồm cả dấu cách)
  return answer.split("").map((ch, i) => ({ char: ch, isSpace: ch === " " }));
};

export default function StoryCompletionDisplay({
  section,
  startingNumber = 1,
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
  const itemKey = (i) => `${prefix}-item-${i + 1}`;

  // State lưu giá trị từng ô chữ cho mỗi item
  // answers[itemKey] = mảng ký tự đã nhập, e.g. ['r','i','v','e','r']
  const getLetterArray = useCallback((itemIdx) => {
    const key = itemKey(itemIdx);
    const stored = answers[key];
    if (Array.isArray(stored)) return stored;
    if (typeof stored === "string") return stored.split("");
    return [];
  }, [answers, prefix]);

  const setLetter = (itemIdx, charIdx, value) => {
    const key = itemKey(itemIdx);
    const item = items[itemIdx];
    if (!item) return;
    const slots = buildLetterSlots(item.answer);
    const current = getLetterArray(itemIdx);
    const next = [...current];
    // Pad mảng nếu cần
    while (next.length < slots.length) next.push("");

    // Không cho gõ vào ô dấu cách hoặc ô gợi ý (đầu/cuối)
    if (slots[charIdx]?.isSpace) return;

    next[charIdx] = value.slice(-1).toLowerCase();
    onAnswerChange?.(key, next);
  };

  const clearItem = (itemIdx) => {
    onAnswerChange?.(itemKey(itemIdx), []);
  };

  const isCorrect = (itemIdx) => {
    if (!submitted) return null;
    const item = items[itemIdx];
    if (!item) return null;
    const letters = getLetterArray(itemIdx);
    const typed = letters.join("").toLowerCase().trim();
    return typed === (item.answer || "").toLowerCase().trim();
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
    <div style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: "0.75em", color: "#6b7280", marginBottom: 12, lineHeight: 1.5, paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
        {submitted ? "✅ Kết quả đã nộp" : "✏️ Gõ từng chữ cái vào các ô. Chữ xanh là gợi ý sẵn."}
      </div>

      {items.map((item, i) => {
        const correct = isCorrect(i);
        const letters = getLetterArray(i);
        const slots = buildLetterSlots(item.answer || "");
        const qNum = startingNumber + i;

        return (
          <div
            key={i}
            id={`question-${qNum}`}
            data-item={i}
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: submitted
                ? correct ? "#dcfce7" : "#fee2e2"
                : "#fafafa",
              border: submitted
                ? correct ? "1.5px solid #22c55e" : "1.5px solid #ef4444"
                : "1.5px solid #e5e7eb",
              transition: "background 0.15s",
            }}
          >
            {/* Số câu + câu văn */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: "#0052cc", fontSize: "0.95em", flexShrink: 0, paddingTop: 1 }}>
                {qNum}
              </span>
              <span style={{ fontSize: "0.9em", lineHeight: 1.6, color: "#1e293b" }}>
                <ItemSentence sentence={item.sentence} />
              </span>
            </div>

            {/* Ô chữ cái */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center", paddingLeft: 22 }}>
              {slots.map((slot, ci) => {
                const isHint = ci === 0 || ci === slots.length - 1;
                const isSpaceSlot = slot.isSpace;
                const typedChar = letters[ci] || "";

                if (isSpaceSlot) {
                  // Dấu cách → khoảng trắng nhỏ giữa các từ
                  return <div key={ci} style={{ width: 8 }} />;
                }

                if (isHint) {
                  // Chữ gợi ý: hiển thị sẵn, không cho sửa
                  return (
                    <div
                      key={ci}
                      style={{
                        width: 28,
                        height: 32,
                        border: "2px solid #3b82f6",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1em",
                        color: "#1d4ed8",
                        background: "#eff6ff",
                        userSelect: "none",
                      }}
                    >
                      {slot.char}
                    </div>
                  );
                }

                // Ô nhập chữ cái của học sinh
                return (
                  <input
                    key={ci}
                    type="text"
                    maxLength={1}
                    disabled={submitted}
                    value={typedChar}
                    onChange={(e) => {
                      if (!submitted) setLetter(i, ci, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !typedChar) {
                        // Lùi về ô trước
                        const prev = e.target.closest("[data-item]")
                          ?.querySelectorAll("input[type=text]");
                        if (prev) {
                          const inputs = Array.from(prev);
                          const idx = inputs.indexOf(e.target);
                          if (idx > 0) inputs[idx - 1].focus();
                        }
                      } else if (e.target.value && e.key !== "Backspace") {
                        // Tự động chuyển ô tiếp theo
                        const container = e.target.closest("[data-item]");
                        if (container) {
                          const inputs = Array.from(container.querySelectorAll("input[type=text]"));
                          const idx = inputs.indexOf(e.target);
                          let next = idx + 1;
                          while (next < inputs.length && inputs[next].disabled) next++;
                          if (next < inputs.length) inputs[next].focus();
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    data-letter-idx={ci}
                    style={{
                      width: 28,
                      height: 32,
                      border: submitted
                        ? correct ? "2px solid #22c55e" : "2px solid #ef4444"
                        : "2px solid #9ca3af",
                      borderRadius: 4,
                      textAlign: "center",
                      fontSize: "1em",
                      fontWeight: 700,
                      color: submitted ? (correct ? "#166534" : "#b91c1c") : "#1e293b",
                      background: submitted ? (correct ? "#f0fdf4" : "#fef2f2") : "#fff",
                      outline: "none",
                      caretColor: "#3b82f6",
                      padding: 0,
                      cursor: submitted ? "default" : "text",
                      transition: "border 0.1s",
                    }}
                    onFocusCapture={(e) => {
                      if (!submitted) e.target.style.border = "2px solid #3b82f6";
                    }}
                    onBlur={(e) => {
                      if (!submitted) e.target.style.border = "2px solid #9ca3af";
                    }}
                  />
                );
              })}

              {/* Nút xóa (khi chưa nộp) */}
              {!submitted && letters.some(Boolean) && (
                <button
                  type="button"
                  onClick={() => clearItem(i)}
                  style={{
                    marginLeft: 4,
                    padding: "2px 8px",
                    fontSize: "0.7em",
                    color: "#9ca3af",
                    background: "none",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Hiện đáp án đúng khi sai */}
            {submitted && !correct && (
              <div style={{ marginTop: 6, paddingLeft: 22, fontSize: "0.78em", color: "#166534", fontWeight: 600 }}>
                ✓ {item.answer}
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

// ── Câu hỏi: thay ___ bằng chỗ trống hiển thị ──
function ItemSentence({ sentence }) {
  if (!sentence) return null;
  const parts = sentence.split("___");
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{
              display: "inline-block",
              width: 60,
              borderBottom: "2px solid #374151",
              marginInline: 4,
              verticalAlign: "bottom",
            }} />
          )}
        </React.Fragment>
      ))}
    </>
  );
}
