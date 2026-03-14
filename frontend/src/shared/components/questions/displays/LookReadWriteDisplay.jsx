import React, { useCallback } from "react";
import { hostPath } from "../../../utils/api";

/**
 * LookReadWriteDisplay – Cambridge Movers Part 6 (student view)
 *
 * renderMode:
 *   "picture"   → cột trái: ảnh lớn + examples
 *   "questions" → cột phải: 3 nhóm câu hỏi
 *   "full"      → toàn bộ (không split)
 *
 * Cấu trúc:
 *   - examples: 2 câu mẫu điền sẵn
 *   - groups[0] complete: câu điền vào chỗ trống (inline input thay ___)
 *   - groups[1] answer:   câu hỏi + ô trả lời bên dưới
 *   - groups[2] write:    học sinh tự viết câu tự do
 *
 * Đáp án linh hoạt: (từ tùy chọn) / lựa chọn A / lựa chọn B
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

export default function LookReadWriteDisplay({
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
  const { examples = [], groups = [] } = q;
  const prefix = answerKeyPrefix || section?.id || "lrw";

  const itemKey = (groupIdx, itemIdx) => `${prefix}-g${groupIdx}-item${itemIdx}`;

  const getTypedValue = useCallback(
    (groupIdx, itemIdx) => {
      const stored = answers[itemKey(groupIdx, itemIdx)];
      if (typeof stored === "string") return stored;
      return "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, prefix]
  );

  const isCorrect = (groupIdx, itemIdx) => {
    if (!submitted) return null;
    const group = groups[groupIdx];
    if (!group) return null;
    const item = group.items?.[itemIdx];
    if (!item) return null;
    const answer = item.answer || "";
    const typed = getTypedValue(groupIdx, itemIdx).toLowerCase().trim().replace(/\.+$/, "");
    // write type with no answer key: any non-empty answer = correct
    if (!answer.trim()) return typed.length > 0;
    const accepted = parseFlexibleAnswer(answer);
    if (accepted.length === 0) return typed === answer.toLowerCase().trim().replace(/\.+$/, "");
    return accepted.includes(typed);
  };

  // Attach question numbers to groups + items
  let qCounter = startingNumber;
  const groupsWithNums = groups.map((group) => ({
    ...group,
    itemsWithNums: (group.items || []).map((item) => ({ ...item, qNum: qCounter++ })),
  }));

  // ── LEFT panel: image + examples ──────────────────────────────────
  const picturePanel = (
    <div style={{ padding: "0 4px" }}>
      {partImage && (
        <img
          src={hostPath(partImage)}
          alt="Part illustration"
          style={{
            width: "100%",
            maxHeight: 340,
            objectFit: "contain",
            borderRadius: 8,
            marginBottom: 14,
            border: "1px solid #e5e7eb",
          }}
        />
      )}

      {/* Examples box */}
      {examples.filter((ex) => ex.sentence || ex.answer).length > 0 && (
        <div
          style={{
            background: "#f0f7ff",
            borderRadius: 8,
            padding: "12px 14px",
            border: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#1d4ed8",
              fontSize: "0.85em",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Examples
          </div>
          {examples.map((ex, i) =>
            ex.sentence ? (
              <div
                key={i}
                style={{ marginBottom: 8, fontSize: "0.9em", color: "#1e293b", lineHeight: 1.7 }}
              >
                <ExampleItem sentence={ex.sentence} answer={ex.answer} />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );

  // ── RIGHT panel: 3 question groups ────────────────────────────────
  const questionsPanel = (
    <div style={{ padding: "12px 16px" }}>
      <div
        style={{
          fontSize: "0.75em",
          color: "#6b7280",
          marginBottom: 12,
          lineHeight: 1.5,
          paddingBottom: 8,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {submitted ? "✅ Kết quả đã nộp" : "✏️ Nhìn tranh và viết câu trả lời."}
      </div>

      {groupsWithNums.map((group, gIdx) => (
        <div key={gIdx} style={{ marginBottom: 20 }}>
          {group.instruction && (
            <div
              style={{ fontWeight: 700, color: "#374151", fontSize: "0.88em", marginBottom: 10 }}
            >
              {group.instruction}
            </div>
          )}

          {group.itemsWithNums.map((item, iIdx) => {
            const correct = isCorrect(gIdx, iIdx);
            const typedValue = getTypedValue(gIdx, iIdx);
            const onChange = (val) => !submitted && onAnswerChange?.(itemKey(gIdx, iIdx), val);
            const onClear = () => !submitted && onAnswerChange?.(itemKey(gIdx, iIdx), "");

            return (
              <div
                key={iIdx}
                id={`question-${item.qNum}`}
                style={{
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: submitted
                    ? correct
                      ? "#dcfce7"
                      : "#fee2e2"
                    : "#fafafa",
                  border: submitted
                    ? correct
                      ? "1.5px solid #22c55e"
                      : "1.5px solid #ef4444"
                    : "1.5px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#0052cc",
                      fontSize: "0.95em",
                      flexShrink: 0,
                    }}
                  >
                    {item.qNum}
                  </span>

                  {group.type === "complete" ? (
                    // Inline input replacing ___
                    <span style={{ fontSize: "0.9em", lineHeight: 1.8, color: "#1e293b" }}>
                      <InlineInput
                        sentence={item.sentence}
                        typedValue={typedValue}
                        submitted={submitted}
                        correct={correct}
                        onChange={onChange}
                        onClear={onClear}
                      />
                    </span>
                  ) : group.type === "answer" ? (
                    // Question text + answer input below
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.9em", color: "#1e293b", marginBottom: 6 }}>
                        {item.sentence}
                      </div>
                      <AnswerInput
                        typedValue={typedValue}
                        submitted={submitted}
                        correct={correct}
                        onChange={onChange}
                        onClear={onClear}
                        maxWidth={300}
                      />
                    </div>
                  ) : (
                    // Free write
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <AnswerInput
                        typedValue={typedValue}
                        submitted={submitted}
                        correct={correct}
                        onChange={onChange}
                        onClear={onClear}
                        maxWidth={"100%"}
                      />
                    </div>
                  )}
                </div>

                {/* Show correct answer on wrong submission */}
                {submitted && !correct && item.answer && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: "0.78em",
                      color: "#166534",
                      fontWeight: 600,
                    }}
                  >
                    ✓{" "}
                    {parseFlexibleAnswer(item.answer).join(" / ") || item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (renderMode === "picture") return picturePanel;
  if (renderMode === "questions") return questionsPanel;
  return (
    <div>
      <div style={{ paddingBottom: 12 }}>{picturePanel}</div>
      {questionsPanel}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function ExampleItem({ sentence, answer }) {
  const parts = sentence.split("___");
  if (parts.length === 1) {
    // Q&A style (no blank)
    return (
      <span>
        {sentence}
        {answer && (
          <span
            style={{
              marginLeft: 8,
              fontWeight: 700,
              color: "#1d4ed8",
              fontStyle: "italic",
            }}
          >
            {answer}
          </span>
        )}
      </span>
    );
  }
  // Inline fill style
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              style={{
                fontWeight: 700,
                color: "#1d4ed8",
                fontStyle: "italic",
                marginInline: 4,
              }}
            >
              {answer}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function InlineInput({ sentence, typedValue, submitted, correct, onChange, onClear }) {
  if (!sentence) return null;
  const parts = sentence.split("___");
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginInline: 4,
                verticalAlign: "middle",
              }}
            >
              <input
                type="text"
                disabled={submitted}
                value={typedValue}
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: 180,
                  padding: "3px 8px",
                  border: submitted
                    ? correct
                      ? "2px solid #22c55e"
                      : "2px solid #ef4444"
                    : "2px solid #9ca3af",
                  borderRadius: 5,
                  fontSize: "0.92em",
                  fontWeight: 600,
                  background: submitted
                    ? correct
                      ? "#f0fdf4"
                      : "#fef2f2"
                    : "#fff",
                  color: submitted
                    ? correct
                      ? "#166534"
                      : "#b91c1c"
                    : "#1e293b",
                  outline: "none",
                  verticalAlign: "middle",
                }}
              />
              {!submitted && typedValue && (
                <button
                  type="button"
                  onClick={onClear}
                  style={{
                    padding: "1px 5px",
                    fontSize: "0.65em",
                    color: "#9ca3af",
                    background: "none",
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
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

function AnswerInput({ typedValue, submitted, correct, onChange, onClear, maxWidth = 300 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text"
        disabled={submitted}
        value={typedValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        style={{
          flex: 1,
          maxWidth,
          padding: "5px 10px",
          border: submitted
            ? correct
              ? "2px solid #22c55e"
              : "2px solid #ef4444"
            : "2px solid #9ca3af",
          borderRadius: 6,
          fontSize: "0.92em",
          fontWeight: 600,
          background: submitted
            ? correct
              ? "#f0fdf4"
              : "#fef2f2"
            : "#fff",
          color: submitted
            ? correct
              ? "#166534"
              : "#b91c1c"
            : "#1e293b",
          outline: "none",
        }}
      />
      {!submitted && typedValue && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: "2px 7px",
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
  );
}
