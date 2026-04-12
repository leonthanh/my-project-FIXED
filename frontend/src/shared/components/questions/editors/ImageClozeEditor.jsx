import React, { useState, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useQuillImageUpload from "../../../hooks/useQuillImageUpload";
import { apiPath, hostPath } from "../../../utils/api";
import InlineIcon from "../../InlineIcon.jsx";

/**
 * ImageClozeEditor – Dạng điền ảnh vào chỗ trống (Cambridge Movers Part 3)
 *
 * Teacher sets up:
 *  1. Passage text with blanks written as (1)(2)...(5)
 *  2. Image bank: upload images (typically 9, incl. 1 example)
 *  3. For each img: word label + isExample flag
 *  4. Correct answer per blank (img id → blank number)
 *  5. Optional title question (radio A/B/C)
 *
 * Data shape stored on question object:
 * {
 *   passageTitle: '',
 *   passageText: '',           // raw text, blanks as "(1)" "(2)" ...
 *   imageBank: [{ id, url, word, isExample }],
 *   answers: { '1': 'imgId', '2': 'imgId', ... },
 *   titleQuestion: { enabled, text, options: ['','',''], correctAnswer:'' }
 * }
 */

const LABEL_STYLE = {
  display: "block",
  marginBottom: "5px",
  fontWeight: 700,
  fontSize: "12px",
  color: "#374151",
};
const INPUT_STYLE = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  boxSizing: "border-box",
};
const TEXTAREA_STYLE = {
  ...INPUT_STYLE,
  resize: "vertical",
  minHeight: "100px",
  lineHeight: 1.6,
  fontFamily: "inherit",
};

const countBlanks = (text = "") => {
  const matches = text.match(/\(\s*\d+\s*\)/g);
  return matches ? matches.length : 0;
};

const extractBlankNumbers = (text = "") => {
  const matches = [...text.matchAll(/\(\s*(\d+)\s*\)/g)];
  return matches.map((m) => parseInt(m[1], 10)).sort((a, b) => a - b);
};

const genId = () => Math.random().toString(36).slice(2, 9);

const resolveImgSrc = (url) => {
  if (!url) return "";
  const value = String(url);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return hostPath(value);
  return value;
};

const QUILL_FORMATS = [
  "bold", "italic", "underline", "color", "background",
  "list", "bullet", "align", "link", "image",
];

export default function ImageClozeEditor({ question = {}, onChange, startingNumber = 1, partIndex = 0 }) {
  const [uploading, setUploading] = useState(null); // imgId being uploaded
  const [uploadErr, setUploadErr] = useState("");
  const { quillRef, modules: quillModules } = useQuillImageUpload();

  const passageTitle = question.passageTitle || "";
  const passageText = question.passageText || "";
  const imageBank = Array.isArray(question.imageBank) ? question.imageBank : [];
  const answers = question.answers || {};
  const titleQ = question.titleQuestion || {
    enabled: false,
    text: "Now choose the best name for the story. Tick one box.",
    options: ["", "", ""],
    correctAnswer: "",
  };

  const blankNumbers = useMemo(() => extractBlankNumbers(passageText), [passageText]);

  const set = (field, value) => onChange(field, value);

  // ── Image bank helpers ──────────────────────────────────────────────────
  const addImage = () => {
    const newImg = { id: genId(), url: "", word: "", isExample: false };
    set("imageBank", [...imageBank, newImg]);
  };

  const updateImage = (id, patch) => {
    set("imageBank", imageBank.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  };

  const removeImage = (id) => {
    set("imageBank", imageBank.filter((img) => img.id !== id));
    // clean up answers
    const nextAnswers = { ...answers };
    Object.keys(nextAnswers).forEach((k) => {
      if (nextAnswers[k] === id) delete nextAnswers[k];
    });
    set("answers", nextAnswers);
  };

  const uploadImage = async (imgId, file) => {
    if (!file) return;
    setUploadErr("");
    setUploading(imgId);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(apiPath("upload/cambridge-image"), {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload thất bại");
      const data = await res.json();
      if (!data?.url) throw new Error("Không nhận được URL");
      updateImage(imgId, { url: data.url });
    } catch (err) {
      setUploadErr(err?.message || "Lỗi upload");
    } finally {
      setUploading(null);
    }
  };

  // ── Title question helpers ──────────────────────────────────────────────
  const updateTitleQ = (patch) => set("titleQuestion", { ...titleQ, ...patch });
  const updateTitleOption = (idx, val) => {
    const next = [...(titleQ.options || ["", "", ""])];
    next[idx] = val;
    updateTitleQ({ options: next });
  };

  const titleEnabled = titleQ.enabled;
  const totalQuestions = blankNumbers.length + (titleEnabled ? 1 : 0);
  const endNumber = startingNumber + totalQuestions - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        borderRadius: "8px",
        color: "white",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{
          backgroundColor: "white",
          color: "#7c3aed",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 700,
        }}>Part {partIndex + 1}</span>
        <span style={{ fontWeight: 600 }}>Image Cloze (Drag &amp; Drop)</span>
        {totalQuestions > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "13px", opacity: 0.9 }}>
            Questions {startingNumber}{totalQuestions > 1 ? `–${endNumber}` : ""}
          </span>
        )}
      </div>
      {/* ── Passage ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "14px",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e40af", marginBottom: "12px" }}>
          Đoạn văn
        </div>

        <label style={LABEL_STYLE}>Tiêu đề đoạn văn (tuỳ chọn)</label>
        <input
          style={{ ...INPUT_STYLE, marginBottom: "12px" }}
          value={passageTitle}
          onChange={(e) => set("passageTitle", e.target.value)}
          placeholder="VD: Jane's Birthday Party"
        />

        <label style={LABEL_STYLE}>
          Đoạn văn &nbsp;
          <span style={{ fontWeight: 400, color: "#6b7280" }}>
            — đánh dấu ô trống bằng <code>(1)</code> <code>(2)</code>...
          </span>
        </label>
        <div style={{ border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
          <ReactQuill
            ref={quillRef}
            value={passageText}
            onChange={(val) => set("passageText", val)}
            modules={quillModules}
            formats={QUILL_FORMATS}
            placeholder={`'What did you do for your birthday, Jane?' Lucy asked.\n'I had a (0) party on Saturday,' Jane said.\n'We drove to the (1) and sailed to the island,' Lucy said.`}
            style={{ minHeight: "140px" }}
          />
        </div>
        {blankNumbers.length > 0 && (
          <div
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#059669",
              fontWeight: 600,
            }}
          >
            {blankNumbers.length} blank{blankNumbers.length !== 1 ? "s" : ""} detected: {blankNumbers.map((n) => `(${n})`).join("  ")}
          </div>
        )}
      </div>

      {/* ── Image Bank ────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e40af" }}>
            Image Bank ({imageBank.length} ảnh)
          </div>
          <button
            type="button"
            onClick={addImage}
            style={{
              padding: "6px 14px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            + Thêm ảnh
          </button>
        </div>

        {uploadErr && (
          <div style={{ marginBottom: "8px", fontSize: "12px", color: "#ef4444" }}>
            Error: {uploadErr}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          {imageBank.map((img) => (
            <div
              key={img.id}
              style={{
                border: img.isExample
                  ? "2px solid #f59e0b"
                  : "1px solid #d1d5db",
                borderRadius: "10px",
                padding: "10px",
                background: img.isExample ? "#fffbeb" : "#fff",
                position: "relative",
              }}
            >
              {/* Delete */}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "11px",
                  cursor: "pointer",
                  lineHeight: "20px",
                  padding: 0,
                  textAlign: "center",
                }}
              >
                <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
              </button>

              {/* Image preview */}
              {img.url ? (
                <img
                  src={resolveImgSrc(img.url)}
                  alt={img.word || "image"}
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "contain",
                    borderRadius: "6px",
                    background: "#f3f4f6",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100px",
                    background: "#f3f4f6",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    color: "#9ca3af",
                  }}
                >
                  Chưa có ảnh
                </div>
              )}

              {/* URL input (link ảnh từ mạng / GIF) */}
              <input
                style={{
                  ...INPUT_STYLE,
                  padding: "4px 7px",
                  fontSize: "11px",
                  marginTop: "6px",
                  color: img.url && /^https?:\/\//i.test(img.url) ? "#1d4ed8" : undefined,
                }}
                value={img.url}
                onChange={(e) => updateImage(img.id, { url: e.target.value })}
                placeholder="https://... (URL ảnh/GIF từ mạng)"
              />

              {/* Upload từ máy */}
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px", fontWeight: 600 }}>Hoặc upload từ máy:</div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading === img.id}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadImage(img.id, f);
                }}
                style={{ width: "100%", marginTop: "2px", fontSize: "11px" }}
              />
              {uploading === img.id && (
                <div style={{ fontSize: "11px", color: "#6b7280" }}>Đang upload…</div>
              )}

              {/* Word label */}
              <input
                style={{
                  ...INPUT_STYLE,
                  padding: "5px 8px",
                  fontSize: "12px",
                  marginTop: "6px",
                  textAlign: "center",
                  fontWeight: 600,
                }}
                value={img.word}
                onChange={(e) => updateImage(img.id, { word: e.target.value })}
                placeholder="Label (ví dụ: party)"
              />

              {/* Example checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginTop: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  color: "#92400e",
                  fontWeight: img.isExample ? 700 : 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!img.isExample}
                  onChange={(e) => updateImage(img.id, { isExample: e.target.checked })}
                />
                Ảnh ví dụ (Example)
              </label>
            </div>
          ))}

          {imageBank.length === 0 && (
            <div
              style={{
                gridColumn: "1/-1",
                textAlign: "center",
                padding: "24px",
                color: "#9ca3af",
                fontSize: "13px",
                border: "2px dashed #e5e7eb",
                borderRadius: "10px",
              }}
            >
              Chưa có ảnh. Nhấn "+ Thêm ảnh" để bắt đầu.
            </div>
          )}
        </div>
      </div>

      {/* ── Correct Answers ───────────────────────────────────────────── */}
      {blankNumbers.length > 0 && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#15803d", marginBottom: "12px" }}>
            Đáp án đúng cho từng ô trống
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            {blankNumbers.map((n) => {
              const chosen = answers[String(n)];
              const chosenImg = imageBank.find((img) => img.id === chosen);
              return (
                <div key={n} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ ...LABEL_STYLE, color: "#15803d" }}>
                    Blank ({n})
                  </label>
                  <select
                    value={chosen || ""}
                    onChange={(e) => {
                      set("answers", { ...answers, [String(n)]: e.target.value });
                    }}
                    style={{ ...INPUT_STYLE, padding: "7px 8px" }}
                  >
                    <option value="">— chọn ảnh —</option>
                    {imageBank.map((img) => (
                      <option key={img.id} value={img.id}>
                        {img.word || `Ảnh ${img.id}`}
                        {img.isExample ? " (Example)" : ""}
                      </option>
                    ))}
                  </select>
                  {chosenImg?.url && (
                    <img
                      src={resolveImgSrc(chosenImg.url)}
                      alt={chosenImg.word}
                      style={{
                        width: "50px",
                        height: "40px",
                        objectFit: "contain",
                        border: "1px solid #86efac",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Title Question ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "#faf5ff",
          border: "1px solid #e9d5ff",
          borderRadius: "10px",
          padding: "14px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
            fontSize: "14px",
            color: "#7e22ce",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={!!titleQ.enabled}
            onChange={(e) => updateTitleQ({ enabled: e.target.checked })}
          />
          Câu hỏi tiêu đề (Now choose the best name...)
        </label>

        {titleQ.enabled && (
          <>
            <label style={LABEL_STYLE}>Nội dung câu hỏi</label>
            <input
              style={{ ...INPUT_STYLE, marginBottom: "12px" }}
              value={titleQ.text}
              onChange={(e) => updateTitleQ({ text: e.target.value })}
              placeholder="Now choose the best name for the story. Tick one box."
            />

            <label style={{ ...LABEL_STYLE, marginBottom: "8px" }}>
              Các lựa chọn tiêu đề (click radio để đánh dấu đúng):
            </label>
            {(titleQ.options || ["", "", ""]).map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isCorrect = titleQ.correctAnswer === letter;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: isCorrect ? "#7e22ce" : "#e9d5ff",
                      color: isCorrect ? "#fff" : "#7e22ce",
                      fontWeight: 700,
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </span>
                  <input
                    style={{ ...INPUT_STYLE, flex: 1, marginBottom: 0 }}
                    value={opt}
                    onChange={(e) => updateTitleOption(idx, e.target.value)}
                    placeholder={`Lựa chọn ${letter}`}
                  />
                  <input
                    type="radio"
                    name={`title-correct-${question.id || "q"}`}
                    checked={isCorrect}
                    onChange={() => updateTitleQ({ correctAnswer: letter })}
                    title="Đáp án đúng"
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </div>
              );
            })}

            <button
              type="button"
              onClick={() =>
                updateTitleQ({ options: [...(titleQ.options || []), ""] })
              }
              style={{
                marginTop: "4px",
                padding: "5px 12px",
                background: "transparent",
                border: "1px dashed #c084fc",
                borderRadius: "6px",
                color: "#7e22ce",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              + Thêm lựa chọn
            </button>

            <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
              Đáp án đúng:{" "}
              <strong>{titleQ.correctAnswer || "(Chưa chọn)"}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
