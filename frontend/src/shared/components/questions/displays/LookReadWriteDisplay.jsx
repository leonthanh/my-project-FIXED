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

const GROUP_THEMES = {
  complete: {
    icon: '🖊️',
    headerBg: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    cardBg: '#eef2ff',
    cardBorder: '#a5b4fc',
    numBg: '#4f46e5',
  },
  answer: {
    icon: '💬',
    headerBg: 'linear-gradient(135deg, #9333ea, #a855f7)',
    cardBg: '#faf5ff',
    cardBorder: '#d8b4fe',
    numBg: '#9333ea',
  },
  write: {
    icon: '✍️',
    headerBg: 'linear-gradient(135deg, #059669, #10b981)',
    cardBg: '#f0fdf4',
    cardBorder: '#86efac',
    numBg: '#059669',
  },
};

export default function LookReadWriteDisplay({
  section,
  startingNumber = 1,
  startGroupIndex = 0,
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

  const itemKey = (groupIdx, itemIdx) => `${prefix}-g${startGroupIndex + groupIdx}-item${itemIdx}`;

  const getTypedValue = useCallback(
    (groupIdx, itemIdx) => {
      const stored = answers[`${prefix}-g${startGroupIndex + groupIdx}-item${itemIdx}`];
      if (typeof stored === "string") return stored;
      return "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, prefix, startGroupIndex]
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
          src={/^https?:\/\//i.test(partImage) ? partImage : hostPath(partImage)}
          alt="Part illustration"
          style={{
            width: "100%",
            maxHeight: 500,
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

  // ── RIGHT panel: question groups (one group at a time) ──────────────
  const questionsPanel = (
    <div style={{ padding: '24px 20px 24px' }}>
      {/* CSS animations */}
      <style>{`
        @keyframes lrwFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lrw-group-enter { animation: lrwFadeUp 0.38s cubic-bezier(.4,0,.2,1) both; }
        .lrw-item-enter  { animation: lrwFadeUp 0.30s cubic-bezier(.4,0,.2,1) both; }
        .lrw-item-enter:nth-child(1) { animation-delay: 0.06s; }
        .lrw-item-enter:nth-child(2) { animation-delay: 0.13s; }
        .lrw-item-enter:nth-child(3) { animation-delay: 0.20s; }
        .lrw-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.20) !important;
          outline: none !important;
        }
      `}</style>

      {/* Hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.88em', color: '#6b7280', marginBottom: 20,
        paddingBottom: 12, borderBottom: '1.5px dashed #e5e7eb',
      }}>
        <span style={{ fontSize: '1.1em' }}>🖼️</span>
        <span>{submitted ? '✅ Kết quả đã nộp' : 'Nhìn tranh và viết câu trả lời.'}</span>
      </div>

      {groupsWithNums.map((group, gIdx) => {
        const theme = GROUP_THEMES[group.type] || GROUP_THEMES.complete;
        const doneCnt = group.itemsWithNums.filter((_, iIdx) => {
          const v = getTypedValue(gIdx, iIdx);
          return v && v.trim().length > 0;
        }).length;
        const total = group.itemsWithNums.length;

        return (
          <div key={gIdx} className="lrw-group-enter" style={{ marginBottom: 24 }}>
            {/* Group header */}
            {group.instruction && (
              <div style={{
                background: theme.headerBg,
                borderRadius: '14px 14px 0 0',
                padding: '11px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.35em' }}>{theme.icon}</span>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.0em', letterSpacing: '0.01em' }}>
                    {group.instruction}
                  </span>
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.25)', borderRadius: 20,
                  padding: '2px 11px', fontSize: '0.8em', color: '#fff', fontWeight: 700,
                }}>
                  {doneCnt}/{total}
                </span>
              </div>
            )}

            {/* Items container */}
            <div style={{
              background: theme.cardBg,
              border: `2px solid ${theme.cardBorder}`,
              borderTop: group.instruction ? 'none' : `2px solid ${theme.cardBorder}`,
              borderRadius: group.instruction ? '0 0 14px 14px' : 14,
              padding: '16px 16px',
            }}>
              {group.itemsWithNums.map((item, iIdx) => {
                const correct = isCorrect(gIdx, iIdx);
                const typedValue = getTypedValue(gIdx, iIdx);
                const onChange = (val) => !submitted && onAnswerChange?.(itemKey(gIdx, iIdx), val);
                const onClear  = () => !submitted && onAnswerChange?.(itemKey(gIdx, iIdx), '');

                return (
                  <div
                    key={iIdx}
                    id={`question-${item.qNum}`}
                    className="lrw-item-enter"
                    style={{
                      marginBottom: iIdx < group.itemsWithNums.length - 1 ? 14 : 0,
                      padding: '14px 14px',
                      borderRadius: 10,
                      background: submitted
                        ? correct ? '#dcfce7' : '#fee2e2'
                        : '#fff',
                      border: submitted
                        ? correct ? '2px solid #22c55e' : '2px solid #ef4444'
                        : `1.5px solid ${theme.cardBorder}`,
                      boxShadow: submitted ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Number badge */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 32, height: 32, borderRadius: '50%',
                        background: submitted
                          ? correct ? '#22c55e' : '#ef4444'
                          : theme.numBg,
                        color: '#fff', fontWeight: 900, fontSize: '0.95em', flexShrink: 0,
                        marginTop: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}>
                        {item.qNum}
                      </span>

                      <div style={{ flex: 1, fontSize: '1.0em', lineHeight: 1.9, color: '#1e293b', fontWeight: 500 }}>
                        {group.type === 'complete' ? (
                          <InlineInput
                            sentence={item.sentence}
                            typedValue={typedValue}
                            submitted={submitted}
                            correct={correct}
                            onChange={onChange}
                            onClear={onClear}
                          />
                        ) : group.type === 'answer' ? (
                          <div>
                            <div style={{ marginBottom: 8, color: '#374151' }}>{item.sentence}</div>
                            <AnswerInput typedValue={typedValue} submitted={submitted} correct={correct}
                              onChange={onChange} onClear={onClear} />
                          </div>
                        ) : (
                          <AnswerInput typedValue={typedValue} submitted={submitted} correct={correct}
                            onChange={onChange} onClear={onClear}
                            placeholder="Write your sentence here..." />
                        )}
                      </div>
                    </div>

                    {submitted && !correct && item.answer && (
                      <div style={{
                        marginTop: 8, marginLeft: 42,
                        fontSize: '0.88em', color: '#166534', fontWeight: 700,
                        background: '#dcfce7', borderRadius: 7, padding: '3px 10px',
                        display: 'inline-block',
                      }}>
                        ✓ {parseFlexibleAnswer(item.answer).join(' / ') || item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
  const parts = sentence.split('___');
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginInline: 5, verticalAlign: 'middle' }}>
              <input
                type="text"
                className="lrw-input"
                disabled={submitted}
                value={typedValue}
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: 165,
                  padding: '6px 12px',
                  border: submitted
                    ? correct ? '2.5px solid #22c55e' : '2.5px solid #ef4444'
                    : '2.5px solid #a5b4fc',
                  borderRadius: 9,
                  fontSize: '1em',
                  fontWeight: 700,
                  background: submitted ? (correct ? '#f0fdf4' : '#fef2f2') : '#fff',
                  color: submitted ? (correct ? '#166534' : '#b91c1c') : '#1e293b',
                  verticalAlign: 'middle',
                  transition: 'border-color 0.15s',
                }}
              />
              {!submitted && typedValue && (
                <button type="button" onClick={onClear} style={{
                  padding: '4px 8px', fontSize: '0.75em', color: '#9ca3af',
                  background: 'none', border: '1.5px solid #e5e7eb',
                  borderRadius: 6, cursor: 'pointer',
                }}>✕</button>
              )}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function AnswerInput({ typedValue, submitted, correct, onChange, onClear, placeholder = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="text"
        className="lrw-input"
        disabled={submitted}
        value={typedValue}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        style={{
          flex: 1,
          padding: '7px 14px',
          border: submitted
            ? correct ? '2.5px solid #22c55e' : '2.5px solid #ef4444'
            : '2.5px solid #a5b4fc',
          borderRadius: 9,
          fontSize: '1em',
          fontWeight: 700,
          background: submitted ? (correct ? '#f0fdf4' : '#fef2f2') : '#fff',
          color: submitted ? (correct ? '#166534' : '#b91c1c') : '#1e293b',
          transition: 'border-color 0.15s',
        }}
      />
      {!submitted && typedValue && (
        <button type="button" onClick={onClear} style={{
          padding: '4px 8px', fontSize: '0.75em', color: '#9ca3af',
          background: 'none', border: '1.5px solid #e5e7eb',
          borderRadius: 6, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>
      )}
    </div>
  );
}
