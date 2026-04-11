import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { hostPath } from "../../../utils/api";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";

/**
 * StoryCompletionEditor – Cambridge Movers Part 5
 * "Look at the pictures and read the story. Write some words to complete the sentences."
 *
 * Teacher creates:
 *  1. Story title (hiển thị màu đỏ)
 *  2. Upload 1-2 ảnh minh hoạ (mỗi đoạn truyện một ảnh)
 *  3. Đoạn văn qua ReactQuill
 *  4. 2 câu mẫu Examples (câu + đáp án điền sẵn)
 *  5. 7 câu hỏi – mỗi câu có: nội dung câu + đáp án đúng
 *     → hệ thống tự sinh ô chữ cái theo độ dài đáp án
 *
 * Data shape:
 * {
 *   storyTitle: 'Vicky\'s holiday on the farm',
 *   storyImages: ['/uploads/img1.jpg', '/uploads/img2.jpg'],
 *   storyText: '<p>Last week, Vicky went...</p>',
 *   examples: [
 *     { sentence: 'Vicky took a ___ to her grandparents\' house.', answer: 'train' },
 *     { sentence: 'Vicky\'s grandparents live on a ___.', answer: 'farm' },
 *   ],
 *   items: [
 *     { sentence: 'Her grandparents\' house is near a ___.', answer: 'river' },
 *     ...7 items
 *   ],
 * }
 */

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
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const QUILL_FORMATS = [
  "bold", "italic", "underline", "color", "background",
  "size", "align", "list", "bullet", "link", "image",
];

/** Tạo hint preview: "r..." (chữ đầu + ba chấm) */
const buildHintPreview = (answer = "") => {
  const firstAlt = (answer || "").split("/")[0].trim();
  const primary = firstAlt.replace(/\s*\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
  const s = primary || answer.trim();
  if (!s) return "";
  return s[0].toLowerCase() + "...";
};

/** Parse ký hiệu linh hoạt → tất cả đáp án được chấp nhận */
const parseFlexibleAnswer = (answer) => {
  if (!answer || typeof answer !== "string") return [];
  const alts = answer.split("/").map((s) => s.trim()).filter(Boolean);
  const variants = new Set();
  alts.forEach((alt) => {
    const without = alt.replace(/\s*\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
    const withOpt = alt.replace(/\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
    if (without) variants.add(without.toLowerCase());
    if (withOpt) variants.add(withOpt.toLowerCase());
  });
  return [...variants].filter(Boolean);
};

export default function StoryCompletionEditor({
  question = {},
  onChange,
  startingNumber = 1,
}) {
  const { quillRef: quillRef0, modules: quillModules0 } = useQuillImageUpload();
  const { quillRef: quillRef1, modules: quillModules1 } = useQuillImageUpload();
  const { quillRef: quillRef2, modules: quillModules2 } = useQuillImageUpload();

  const storyTitle = question.storyTitle || "";
  const storyImages = (() => {
    const arr = Array.isArray(question.storyImages) ? [...question.storyImages] : [];
    while (arr.length < 3) arr.push('');
    return arr;
  })();
  const storyTexts = Array.isArray(question.storyTexts) && question.storyTexts.length >= 3
    ? question.storyTexts
    : [question.storyText || '', '', ''];
  const examples = Array.isArray(question.examples) && question.examples.length === 2
    ? question.examples
    : [{ sentence: "", answer: "" }, { sentence: "", answer: "" }];
  const items = Array.isArray(question.items) ? question.items : [];

  const updateImage = (idx, url) => {
    const next = [...storyImages];
    next[idx] = url;
    onChange("storyImages", next);
  };

  const updateExample = (idx, field, value) => {
    const next = examples.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex);
    onChange("examples", next);
  };

  const updateItem = (idx, field, value) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    onChange("items", next);
  };

  const updateText = (idx, val) => {
    const next = [...storyTexts];
    next[idx] = val;
    onChange("storyTexts", next);
  };

  const addItem = () => {
    onChange("items", [...items, { sentence: "", answer: "" }]);
  };

  const removeItem = (idx) => {
    onChange("items", items.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
      {/* ── Header ── */}
      <div style={{
        padding: "10px 14px",
        background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        borderRadius: 8,
        marginBottom: 14,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{
          background: "#fff",
          color: "#059669",
          padding: "3px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
        }}>
          Story Completion
        </span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          Câu {startingNumber} – {startingNumber + items.length - 1}
        </span>
      </div>

      {/* ── Tiêu đề câu chuyện ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Tiêu đề câu chuyện (hiển thị màu đỏ)</label>
        <input
          style={INPUT}
          value={storyTitle}
          placeholder="VD: Vicky's holiday on the farm"
          onChange={(e) => onChange("storyTitle", e.target.value)}
        />
      </div>

      {/* ── 3 đoạn: mỗi đoạn có ảnh + nội dung ── */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          marginBottom: 14,
          padding: "12px 14px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: i % 2 === 0 ? "#f9fafb" : "#fff",
        }}>
          <div style={{ fontWeight: 700, color: "#0052cc", fontSize: 13, marginBottom: 10 }}>
            Đoạn {i + 1}{i > 0 ? " (không bắt buộc)" : ""}
          </div>

          {/* Ảnh đoạn */}
          <div style={{ marginBottom: 10 }}>
            <label style={LABEL}>Ảnh minh hoạ đoạn {i + 1}{i === 0 ? " (bắt buộc)" : " (không bắt buộc)"}</label>
            <input
              style={INPUT}
              value={storyImages[i] || ""}
              placeholder="https://... hoặc /uploads/…"
              onChange={(e) => updateImage(i, e.target.value)}
            />
            {storyImages[i] && (
              <img
                src={/^https?:\/\//i.test(storyImages[i]) ? storyImages[i] : (storyImages[i].startsWith("/") ? hostPath(storyImages[i]) : storyImages[i])}
                alt={`preview ${i + 1}`}
                style={{ marginTop: 6, maxHeight: 120, maxWidth: "100%", borderRadius: 6, border: "1px solid #e5e7eb" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
          </div>

          {/* Nội dung đoạn */}
          <div>
            <label style={LABEL}>Nội dung đoạn {i + 1}</label>
            <div style={{ border: "1px solid #d1d5db", borderRadius: 6, background: "#fff" }}>
              <ReactQuill
                ref={[quillRef0, quillRef1, quillRef2][i]}
                theme="snow"
                value={storyTexts[i] || ''}
                onChange={(val) => updateText(i, val)}
                modules={[quillModules0, quillModules1, quillModules2][i]}
                formats={QUILL_FORMATS}
                placeholder={`Nhập nội dung đoạn ${i + 1}...`}
                style={{ minHeight: 120 }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* ── 2 câu mẫu Examples ── */}
      <div style={{
        marginBottom: 16,
        padding: "14px 16px",
        background: "#fef9c3",
        border: "1px solid #fde68a",
        borderRadius: 8,
      }}>
        <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 10, fontSize: 13 }}>
          Câu mẫu (Examples) – sẽ điền sẵn đáp án cho học sinh xem
        </div>
        {examples.map((ex, i) => (
          <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
            <div style={{ fontWeight: 600, color: "#0052cc", fontSize: 12, marginBottom: 4 }}>
              Example {i + 1}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 8, alignItems: "flex-start" }}>
              <div>
                <label style={{ ...LABEL, textTransform: "none", fontWeight: 600 }}>
                  Nội dung câu (dùng ___ cho chỗ trống)
                </label>
                <input
                  style={INPUT}
                  value={ex.sentence}
                  placeholder="VD: Vicky took a ___ to her grandparents' house."
                  onChange={(e) => updateExample(i, "sentence", e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...LABEL, textTransform: "none", fontWeight: 600 }}>Đáp án</label>
                <input
                  style={INPUT}
                  value={ex.answer}
                  placeholder="VD: train"
                  onChange={(e) => updateExample(i, "answer", e.target.value)}
                />
                {ex.answer && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                    → {ex.answer}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Câu hỏi 1-7 ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={LABEL}>Câu hỏi ({items.length} câu)</label>
          <button
            type="button"
            onClick={addItem}
            style={{
              padding: "4px 12px",
              background: "#0052cc",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + Thêm câu
          </button>
        </div>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 180px 28px",
          gap: 8,
          padding: "4px 8px",
          background: "#f3f4f6",
          borderRadius: 4,
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
          marginBottom: 6,
        }}>
          <span>STT</span>
          <span>Nội dung câu (dùng ___ cho chỗ trống)</span>
          <span>Đáp án + xem trước ô</span>
          <span />
        </div>

        {items.length === 0 && (
          <div style={{
            padding: 16,
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
            border: "1px dashed #e5e7eb",
            borderRadius: 6,
          }}>
            Nhấn "+ Thêm câu" để thêm câu hỏi
          </div>
        )}

        {items.map((item, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 180px 28px",
            gap: 8,
            marginBottom: 6,
            padding: "8px",
            background: i % 2 === 0 ? "#fff" : "#f9fafb",
            borderRadius: 4,
            alignItems: "flex-start",
            border: "1px solid #f0f0f0",
          }}>
            <div style={{ fontWeight: 700, color: "#0052cc", fontSize: 14, paddingTop: 8 }}>
              {startingNumber + i}
            </div>
            <input
              style={INPUT}
              value={item.sentence}
              placeholder="VD: Her grandparents' house is near a ___."
              onChange={(e) => updateItem(i, "sentence", e.target.value)}
            />
            <div>
              <input
                style={INPUT}
                value={item.answer}
                placeholder="river | (vegetable) soup | bowls / glasses"
                onChange={(e) => updateItem(i, "answer", e.target.value)}
              />
              {item.answer && (item.answer.includes("(") || item.answer.includes("/")) && (
                <div style={{ marginTop: 4, fontSize: 10, color: "#059669", background: "#f0fdf4", padding: "3px 6px", borderRadius: 4, lineHeight: 1.6 }}>
                  Chấp nhận: {parseFlexibleAnswer(item.answer).join(" | ")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              style={{ width: 24, height: 24, border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, padding: 0, paddingTop: 6 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: 16,
        padding: "8px 12px",
        background: "#f0fdf4",
        borderRadius: 6,
        border: "1px solid #bbf7d0",
        fontSize: 11,
        color: "#166534",
        lineHeight: 1.6,
      }}>
        <strong>Giao diện học sinh:</strong> Panel trái: 3 đoạn (ảnh + nội dung) + ví dụ mẫu. Panel phải: từng câu hỏi với ô text tự do. Gợi ý: chữ đầu tiên hiển thị (r...).<br/><br/>
        <strong>Ký hiệu đáp án linh hoạt:</strong> <code style={{background:"#dcfce7",padding:"1px 4px",borderRadius:3}}>(từ tùy chọn) đáp án</code> → chấp nhận có hoặc không có từ trong ngoặc.&nbsp;
        <code style={{background:"#dcfce7",padding:"1px 4px",borderRadius:3}}>đáp án A / đáp án B</code> → chấp nhận một trong hai.
      </div>
    </div>
  );
}
