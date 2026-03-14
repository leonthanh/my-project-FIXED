import React from "react";

/**
 * LookReadWriteEditor – Cambridge Movers Part 6
 * "Look and read and write."
 *
 * Cấu trúc cố định:
 *  - 2 câu mẫu Examples
 *  - Nhóm 1 (complete): 2 câu điền vào chỗ trống (có ___)
 *  - Nhóm 2 (answer):   2 câu hỏi, học sinh viết câu trả lời
 *  - Nhóm 3 (write):    2 câu học sinh tự viết tự do
 * Tổng: 6 câu hỏi
 *
 * Ảnh minh hoạ: upload ở cấp Part (partImage).
 *
 * Data shape:
 * {
 *   examples: [{ sentence, answer }, { sentence, answer }],
 *   groups: [
 *     { instruction, type: 'complete', items: [{sentence, answer}, {sentence, answer}] },
 *     { instruction, type: 'answer',   items: [{sentence, answer}, {sentence, answer}] },
 *     { instruction, type: 'write',    items: [{sentence, answer}, {sentence, answer}] },
 *   ]
 * }
 *
 * Đáp án linh hoạt: (từ tùy chọn) và / phân cách các lựa chọn.
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
      variants.add(vLow.replace(/\.+$/, "").trim());
    });
  });
  return [...variants].filter(Boolean);
};

const LABEL = {
  display: "block",
  marginBottom: 4,
  fontWeight: 700,
  fontSize: 12,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const INPUT = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const GROUP_META = {
  complete: {
    bg: "#f0f9ff", border: "#bae6fd", label: "#0369a1", badge: "#e0f2fe",
    icon: "✏️", name: "COMPLETE",
    hint: "Câu điền chỗ trống – dùng ___ trong nội dung câu.",
    sentencePlaceholder: "VD: The doctor is wearing blue ___.",
    answerPlaceholder: "VD: trousers",
  },
  answer: {
    bg: "#fdf4ff", border: "#e9d5ff", label: "#7c3aed", badge: "#f3e8ff",
    icon: "❓", name: "ANSWER",
    hint: "Câu hỏi – học sinh viết câu trả lời đầy đủ.",
    sentencePlaceholder: "VD: What is the nurse giving the child?",
    answerPlaceholder: "VD: (She is giving him) a glass of water",
  },
  write: {
    bg: "#f0fdf4", border: "#bbf7d0", label: "#047857", badge: "#dcfce7",
    icon: "📝", name: "FREE WRITE",
    hint: "Học sinh tự viết câu tự do về bức tranh.",
    sentencePlaceholder: "",
    answerPlaceholder: "Đáp án mẫu – VD: There are three grown-ups in the picture.",
  },
};

const DEFAULT_GROUPS = [
  { instruction: "Complete the sentences.", type: "complete", items: [{ sentence: "", answer: "" }, { sentence: "", answer: "" }] },
  { instruction: "Answer the questions.", type: "answer", items: [{ sentence: "", answer: "" }, { sentence: "", answer: "" }] },
  { instruction: "Now write two sentences about the picture.", type: "write", items: [{ sentence: "", answer: "" }, { sentence: "", answer: "" }] },
];

export default function LookReadWriteEditor({ question = {}, onChange, startingNumber = 1 }) {
  const examples =
    Array.isArray(question.examples) && question.examples.length === 2
      ? question.examples
      : [{ sentence: "", answer: "" }, { sentence: "", answer: "" }];

  const groups =
    Array.isArray(question.groups) && question.groups.length === 3
      ? question.groups
      : DEFAULT_GROUPS;

  const updateExample = (idx, field, value) => {
    const next = examples.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex));
    onChange("examples", next);
  };

  const updateGroupInstruction = (gIdx, value) => {
    const next = groups.map((g, i) => (i === gIdx ? { ...g, instruction: value } : g));
    onChange("groups", next);
  };

  const updateItem = (gIdx, iIdx, field, value) => {
    const next = groups.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, items: g.items.map((item, j) => (j === iIdx ? { ...item, [field]: value } : item)) };
    });
    onChange("groups", next);
  };

  // Compute starting question number per group
  let qCounter = startingNumber;
  const groupsWithNums = groups.map((g) => {
    const startQ = qCounter;
    qCounter += g.items?.length || 0;
    return { ...g, startQ };
  });

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        borderRadius: 8,
        marginBottom: 14,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ background: "#fff", color: "#7c3aed", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
          🖼️ Look, Read & Write
        </span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          Câu {startingNumber} – {startingNumber + 5} &nbsp;·&nbsp; Ảnh upload ở cấp Part
        </span>
      </div>

      {/* Examples */}
      <div style={{ marginBottom: 16, padding: "14px 16px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 10, fontSize: 13 }}>
          ⭐ Câu mẫu (Examples) – điền sẵn đáp án, học sinh chỉ xem
        </div>
        {examples.map((ex, i) => (
          <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
            <div style={{ fontWeight: 600, color: "#0052cc", fontSize: 12, marginBottom: 4 }}>Example {i + 1}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 8 }}>
              <div>
                <label style={{ ...LABEL, textTransform: "none", fontWeight: 600 }}>
                  Nội dung câu (dùng ___ nếu điền vào chỗ trống)
                </label>
                <input
                  style={INPUT}
                  value={ex.sentence}
                  placeholder={i === 0 ? "VD: The man is giving the girl some ___." : "VD: What is the blonde girl wearing?"}
                  onChange={(e) => updateExample(i, "sentence", e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...LABEL, textTransform: "none", fontWeight: 600 }}>Đáp án</label>
                <input
                  style={INPUT}
                  value={ex.answer}
                  placeholder={i === 0 ? "flowers" : "a purple dress"}
                  onChange={(e) => updateExample(i, "answer", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Groups */}
      {groupsWithNums.map((group, gIdx) => {
        const meta = GROUP_META[group.type] || GROUP_META.complete;
        return (
          <div key={gIdx} style={{ marginBottom: 14, padding: "14px 16px", background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8 }}>
            {/* Group header badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ background: meta.badge, color: meta.label, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {meta.icon} {meta.name}
              </span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{meta.hint}</span>
            </div>

            {/* Editable instruction */}
            <div style={{ marginBottom: 10 }}>
              <label style={LABEL}>Tiêu đề nhóm (hiển thị cho học sinh)</label>
              <input
                style={{ ...INPUT, fontWeight: 700 }}
                value={group.instruction}
                onChange={(e) => updateGroupInstruction(gIdx, e.target.value)}
              />
            </div>

            {/* Column header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: group.type === "write" ? "36px 1fr" : "36px 1fr 200px",
              gap: 8,
              padding: "3px 6px",
              background: "rgba(0,0,0,0.04)",
              borderRadius: 4,
              fontSize: 11,
              color: "#6b7280",
              fontWeight: 700,
              marginBottom: 4,
            }}>
              <span>STT</span>
              {group.type === "write"
                ? <span>Đáp án mẫu</span>
                : <><span>{group.type === "complete" ? "Nội dung câu (dùng ___ cho chỗ trống)" : "Câu hỏi"}</span><span>Đáp án</span></>
              }
            </div>

            {/* Items */}
            {group.items.map((item, iIdx) => (
              <div key={iIdx} style={{
                display: "grid",
                gridTemplateColumns: group.type === "write" ? "36px 1fr" : "36px 1fr 200px",
                gap: 8,
                marginBottom: 6,
                alignItems: "flex-start",
              }}>
                <div style={{ fontWeight: 700, color: meta.label, fontSize: 14, paddingTop: 8 }}>
                  {group.startQ + iIdx}
                </div>

                {group.type === "write" ? (
                  /* Free write: just answer */
                  <div>
                    <input
                      style={INPUT}
                      value={item.answer}
                      placeholder={meta.answerPlaceholder}
                      onChange={(e) => updateItem(gIdx, iIdx, "answer", e.target.value)}
                    />
                    {item.answer && item.answer.includes("/") && (
                      <div style={{ marginTop: 3, fontSize: 10, color: "#059669", background: "#f0fdf4", padding: "2px 6px", borderRadius: 4, lineHeight: 1.6 }}>
                        ✓ Chấp nhận: {parseFlexibleAnswer(item.answer).join(" | ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Sentence / Question */}
                    <input
                      style={INPUT}
                      value={item.sentence}
                      placeholder={meta.sentencePlaceholder}
                      onChange={(e) => updateItem(gIdx, iIdx, "sentence", e.target.value)}
                    />
                    {/* Answer */}
                    <div>
                      <input
                        style={INPUT}
                        value={item.answer}
                        placeholder={meta.answerPlaceholder}
                        onChange={(e) => updateItem(gIdx, iIdx, "answer", e.target.value)}
                      />
                      {item.answer && (item.answer.includes("(") || item.answer.includes("/")) && (
                        <div style={{ marginTop: 3, fontSize: 10, color: "#059669", background: "#f0fdf4", padding: "2px 6px", borderRadius: 4, lineHeight: 1.6 }}>
                          ✓ Chấp nhận: {parseFlexibleAnswer(item.answer).join(" | ")}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Tip box */}
      <div style={{ marginTop: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 11, color: "#166534", lineHeight: 1.7 }}>
        <strong>💡 Cấu trúc Part 6:</strong> Ảnh lớn (upload ở cấp Part) + 2 ví dụ mẫu + 3 nhóm × 2 câu = 6 câu hỏi.<br />
        <strong>📝 Đáp án linh hoạt:</strong>{" "}
        <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>(từ tùy chọn)</code> → chấp nhận có hoặc không.{" "}
        <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>A / B</code> → chấp nhận một trong hai.<br />
        <strong>Q5–Q6 (Free write):</strong> Bất kỳ câu hợp lý nào đều được chấp nhận trong thi thật. Điền đáp án mẫu để hệ thống chấm tương đối.
      </div>
    </div>
  );
}
