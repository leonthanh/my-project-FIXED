import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { hostPath } from "../../../utils/api";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";

/**
 * WordDragClozeEditor – Cambridge Movers Part 4
 * "Read the text. Choose the right words and write them on the lines."
 *
 * Teacher creates:
 *  1. Passage title (hiển thị màu đỏ ở đầu đoạn)
 *  2. Upload / URL ảnh minh hoạ (không bắt buộc)
 *  3. Đoạn văn qua ReactQuill – dùng (0) cho example, (1)–(5) cho các blank
 *  4. Đáp án example (hiển thị sẵn)
 *  5. Với mỗi blank 1-5: 3 từ lựa chọn + đáp án đúng
 *
 * Data shape:
 * {
 *   passageTitle: 'Libraries',
 *   passageImage: '',
 *   passageText:  '<p>Every city has a library and most small towns have (0)___.</p>…',
 *   exampleAnswer: 'one',
 *   blanks: [
 *     { number: 1, options: ['There','They','Their'], correctAnswer: 'There' },
 *     …
 *   ]
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

/** Strip HTML tags nhưng GIỮ LẠI (0)(1) markers để detect blank numbers */
const htmlToPlainForDetect = (html = "") => {
  if (!html || !html.includes("<")) return html;
  return html
    .replace(/<\/p>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const extractBlankNumbers = (html = "") => {
  const plain = htmlToPlainForDetect(html);
  const matches = [...plain.matchAll(/\(\s*(\d+)\s*\)/g)];
  const nums = matches.map((m) => parseInt(m[1], 10)).sort((a, b) => a - b);
  return [...new Set(nums)].filter((n) => n > 0);
};

export default function WordDragClozeEditor({
  question = {},
  onChange,
  startingNumber = 1,
}) {
  const { quillRef, modules: quillModules } = useQuillImageUpload();

  const passageTitle = question.passageTitle || "";
  const passageImage = question.passageImage || "";
  const passageText = question.passageText || "";
  const exampleAnswer = question.exampleAnswer || "";
  const exampleOptions = Array.isArray(question.exampleOptions) && question.exampleOptions.length === 3
    ? question.exampleOptions
    : ["", "", ""];
  const blanks = Array.isArray(question.blanks) ? question.blanks : [];

  const detectedNumbers = useMemo(() => extractBlankNumbers(passageText), [passageText]);

  /** Khi Quill thay đổi → đồng bộ blanks */
  const handlePassageChange = (html) => {
    const nums = extractBlankNumbers(html);
    const updatedBlanks = nums.map((n) => {
      const existing = blanks.find((b) => b.number === n);
      return existing || { number: n, options: ["", "", ""], correctAnswer: "" };
    });
    onChange("passageText", html);
    onChange("blanks", updatedBlanks);
  };

  const updateExampleOption = (optIdx, value) => {
    const updated = [...exampleOptions];
    updated[optIdx] = value;
    onChange("exampleOptions", updated);
    // If correct answer was this option, clear it
    if (exampleAnswer === exampleOptions[optIdx]) onChange("exampleAnswer", "");
  };

  const updateBlank = (blankIndex, field, value) => {
    const updated = blanks.map((b, i) => (i === blankIndex ? { ...b, [field]: value } : b));
    onChange("blanks", updated);
  };

  const updateOption = (blankIndex, optIdx, value) => {
    const updated = blanks.map((b, i) => {
      if (i !== blankIndex) return b;
      const newOpts = [...(b.options || ["", "", ""])];
      newOpts[optIdx] = value;
      return { ...b, options: newOpts };
    });
    onChange("blanks", updated);
  };

  const addBlankRow = () => {
    const nextNum = blanks.length > 0 ? Math.max(...blanks.map((b) => b.number)) + 1 : 1;
    onChange("blanks", [...blanks, { number: nextNum, options: ["", "", ""], correctAnswer: "" }]);
  };

  const removeBlank = (idx) => {
    onChange("blanks", blanks.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
      {/* ── Header ── */}
      <div
        style={{
          padding: "10px 14px",
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          borderRadius: 8,
          marginBottom: 14,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            background: "#fff",
            color: "#7c3aed",
            padding: "3px 10px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Word Drag & Drop Cloze
        </span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          Câu {startingNumber} – {startingNumber + blanks.length - 1}
        </span>
      </div>

      {/* ── Tiêu đề và ảnh ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={LABEL}>Tiêu đề đoạn văn (hiển thị màu đỏ)</label>
          <input
            style={INPUT}
            value={passageTitle}
            placeholder="VD: Libraries"
            onChange={(e) => onChange("passageTitle", e.target.value)}
          />
        </div>
        <div>
          <label style={LABEL}>URL ảnh minh hoạ (không bắt buộc)</label>
          <input
            style={INPUT}
            value={passageImage}
            placeholder="https://… hoặc /uploads/…"
            onChange={(e) => onChange("passageImage", e.target.value)}
          />
        </div>
      </div>

      {/* Xem trước ảnh */}
      {passageImage && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={passageImage.startsWith("/") ? hostPath(passageImage) : passageImage}
            alt="preview"
            style={{
              maxHeight: 140,
              maxWidth: "100%",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* ── Đoạn văn (ReactQuill) ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>
          Đoạn văn{" "}
          <span
            style={{
              fontWeight: 400,
              textTransform: "none",
              color: "#6b7280",
              letterSpacing: 0,
            }}
          >
            — gõ <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>(0)</code> cho
            Example,{" "}
            <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>(1)</code>
            -{" "}
            <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>(5)</code>{" "}
            cho các câu hỏi
          </span>
        </label>

        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#fff",
          }}
          className="word-drag-cloze-quill"
        >
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={passageText}
            onChange={handlePassageChange}
            modules={quillModules}
            formats={QUILL_FORMATS}
            placeholder={
              "Every city has a library and most small towns have (0)___.\n" +
              "(1)___ are lots of books in the library and you can take them out for one or two weeks.\n" +
              "When you are in the library, you (2)___ to talk quietly and you can't shout…"
            }
            style={{ minHeight: 160 }}
          />
        </div>

        {/* Blank detection badge */}
        {detectedNumbers.length > 0 ? (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#6b7280" }}>Phát hiện:</span>
            {detectedNumbers.map((n) => (
              <span
                key={n}
                style={{
                  background: "#ede9fe",
                  color: "#6d28d9",
                  borderRadius: 10,
                  padding: "1px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ({n})
              </span>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
            Chưa phát hiện blank nào — hãy nhập <code>(1)</code>, <code>(2)</code>… vào đoạn văn
          </div>
        )}
      </div>

      {/* ── Bảng từ lựa chọn ── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <label style={LABEL}>Bảng từ lựa chọn (3 từ mỗi câu)</label>
          <button
            type="button"
            onClick={addBlankRow}
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
            + Thêm dòng
          </button>
        </div>

        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 1fr 1fr 130px 28px",
            gap: 6,
            marginBottom: 6,
            padding: "4px 8px",
            background: "#f3f4f6",
            borderRadius: 4,
            fontSize: 11,
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          <span>STT</span>
          <span>Từ 1</span>
          <span>Từ 2</span>
          <span>Từ 3</span>
          <span>Đáp án đúng</span>
          <span />
        </div>

        {/* Example row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 1fr 1fr 130px 28px",
            gap: 6,
            padding: "6px 8px",
            marginBottom: 4,
            background: "#fef9c3",
            borderRadius: 4,
            alignItems: "center",
            border: "1px solid #fde68a",
          }}
        >
          <span style={{ fontWeight: 700, color: "#0052cc", fontSize: 13 }}>Ex</span>
          {[0, 1, 2].map((optIdx) => (
            <input
              key={optIdx}
              style={{ ...INPUT, background: "#fef9c3" }}
              value={exampleOptions[optIdx] || ""}
              placeholder={`Từ ${optIdx + 1}`}
              onChange={(e) => updateExampleOption(optIdx, e.target.value)}
            />
          ))}
          <select
            style={{ ...INPUT, background: "#fef9c3" }}
            value={exampleAnswer}
            onChange={(e) => onChange("exampleAnswer", e.target.value)}
          >
            <option value="">— đáp án —</option>
            {exampleOptions.filter((o) => o && o.trim() !== "").map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <span />
        </div>

        {blanks.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 12,
              border: "1px dashed #e5e7eb",
              borderRadius: 6,
            }}
          >
            Nhập <code>(1)</code>, <code>(2)</code>… vào đoạn văn để tự tạo dòng, hoặc nhấn "+ Thêm dòng"
          </div>
        )}

        {blanks.map((blank, i) => {
          const opts = blank.options?.length >= 3 ? blank.options : ["", "", ""];
          const validOptions = opts.filter((o) => o && o.trim() !== "");
          return (
            <div
              key={blank.number}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 1fr 1fr 130px 28px",
                gap: 6,
                marginBottom: 4,
                padding: "6px 8px",
                background: i % 2 === 0 ? "#fff" : "#f9fafb",
                borderRadius: 4,
                alignItems: "center",
                border: "1px solid #f0f0f0",
              }}
            >
              {/* Number */}
              <input
                type="number"
                min={1}
                style={{ ...INPUT, textAlign: "center", fontWeight: 700, color: "#0052cc" }}
                value={blank.number}
                onChange={(e) =>
                  updateBlank(i, "number", parseInt(e.target.value, 10) || blank.number)
                }
              />

              {/* Options 1-3 */}
              {[0, 1, 2].map((optIdx) => (
                <input
                  key={optIdx}
                  style={INPUT}
                  value={opts[optIdx] || ""}
                  placeholder={`Từ ${optIdx + 1}`}
                  onChange={(e) => updateOption(i, optIdx, e.target.value)}
                />
              ))}

              {/* Correct answer */}
              <select
                style={INPUT}
                value={blank.correctAnswer || ""}
                onChange={(e) => updateBlank(i, "correctAnswer", e.target.value)}
              >
                <option value="">— chọn —</option>
                {validOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeBlank(i)}
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div
        style={{
          marginTop: 16,
          padding: "8px 12px",
          background: "#f5f3ff",
          borderRadius: 6,
          border: "1px solid #ddd6fe",
          fontSize: 11,
          color: "#6d28d9",
          lineHeight: 1.6,
        }}
      >
        <strong>Giao diện học sinh:</strong> Học sinh kéo thả (hoặc click ô → click từ) từ bảng
        bên phải vào ô trong đoạn văn. Không cần bàn phím.
      </div>
    </div>
  );
}
