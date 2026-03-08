import React, { useState, useCallback } from "react";
import { hostPath } from "../../../utils/api";

/**
 * ImageClozeDisplay – Student view for Cambridge Movers Part 3
 *
 * Layout:
 *   Left  : passage with blank drop-zones (drop images here)
 *   Right : image bank grid (drag/click images from here)
 *   Below : title question as radio group
 *
 * Answers stored using answerKeyPrefix:
 *   `${answerKeyPrefix}-blank-N`  → imgId
 *   `${answerKeyPrefix}-title`    → letter ('A'|'B'|'C')
 *
 * Props:
 *   section         – { questions: [{ passageTitle, passageText, imageBank, answers (correct), titleQuestion }] }
 *   startingNumber  – first question number assigned to this section
 *   answerKeyPrefix – unique string for keys
 *   onAnswerChange(key, value)
 *   answers         – current answers object
 *   submitted       – boolean
 */

const resolveImg = (url) => {
  if (!url) return "";
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return hostPath(s);
  return s;
};

/**
 * Strip HTML tags từ ReactQuill output nhưng GIỮ LẠI vị trí blank (1)(2)...
 * Trả về plain text để parsePassage có thể tách blank slots.
 * <p>...</p> → text + newline, <br> → newline.
 */
const htmlToPlainWithBlanks = (html = "") => {
  if (!html || !html.includes("<")) return html;
  return html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const extractBlanks = (text = "") => {
  const matches = [...text.matchAll(/\(\s*(\d+)\s*\)/g)];
  return matches.map((m) => parseInt(m[1], 10)).sort((a, b) => a - b);
};

export default function ImageClozeDisplay({
  section,
  startingNumber = 1,
  answerKeyPrefix,
  onAnswerChange,
  answers = {},
  submitted = false,
  renderMode = "full",       // "full" | "passage" | "picturebank"
  sharedSelectedImgId,       // controlled from parent in split mode
  onSharedImgSelect,         // setter from parent in split mode
}) {
  const q = section?.questions?.[0] || {};
  const {
    passageTitle = "",
    passageText = "",
    imageBank = [],
    titleQuestion = {},
  } = q;
  const correctAnswers = q.answers || {}; // { '1': imgId, ... }

  const [localSelectedImgId, setLocalSelectedImgId] = useState(null);
  const [dragOverBlank, setDragOverBlank] = useState(null);
  // In split panel mode the parent controls selection state; locally managed otherwise.
  const effectiveSelectedImgId = onSharedImgSelect !== undefined ? sharedSelectedImgId : localSelectedImgId;
  const setEffectiveSelectedImgId = onSharedImgSelect !== undefined ? onSharedImgSelect : setLocalSelectedImgId;

  const prefix = answerKeyPrefix || section?.id || "ic";

  const blankKey = (n) => `${prefix}-blank-${n}`;
  const titleKey = `${prefix}-title`;

  const blanks = extractBlanks(htmlToPlainWithBlanks(passageText));

  // Which images are already placed (excluding example)
  const placedIds = blanks.map((n) => answers[blankKey(n)]).filter(Boolean);

  // Image in bank
  const getPlacedImg = (blankN) => {
    const id = answers[blankKey(blankN)];
    return id ? imageBank.find((img) => img.id === id) : null;
  };

  // Place selected / dragged image into blank
  const placeImage = useCallback(
    (blankN, imgId) => {
      if (submitted) return;
      // If blank already has this image, clear it
      if (answers[blankKey(blankN)] === imgId) {
        onAnswerChange(blankKey(blankN), "");
        return;
      }
      // If that image was elsewhere, clear it first
      blanks.forEach((n) => {
        if (answers[blankKey(n)] === imgId) {
          onAnswerChange(blankKey(n), "");
        }
      });
      onAnswerChange(blankKey(blankN), imgId);
      setEffectiveSelectedImgId(null);
    },
    [submitted, answers, blanks, blankKey, onAnswerChange, setEffectiveSelectedImgId]
  );

  // Drag handlers
  const handleImgDragStart = (e, imgId) => {
    e.dataTransfer.setData("imgId", imgId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleBlankDragOver = (e, blankN) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverBlank(blankN);
  };
  const handleBlankDrop = (e, blankN) => {
    e.preventDefault();
    const imgId = e.dataTransfer.getData("imgId");
    if (imgId) placeImage(blankN, imgId);
    setDragOverBlank(null);
  };
  const handleBlankDragLeave = () => setDragOverBlank(null);

  // Click-to-place: click image → select; click blank → place
  const handleImgClick = (img) => {
    if (submitted || img.isExample) return;
    setEffectiveSelectedImgId(effectiveSelectedImgId === img.id ? null : img.id);
  };
  const handleBlankClick = (blankN) => {
    if (submitted) return;
    if (effectiveSelectedImgId) {
      placeImage(blankN, effectiveSelectedImgId);
    } else if (answers[blankKey(blankN)]) {
      // click on filled blank to clear it
      onAnswerChange(blankKey(blankN), "");
    }
  };

  // Parse passage into parts: text segments + blank slots
  const parsePassage = () => {
    const plain = htmlToPlainWithBlanks(passageText);
    if (!plain) return [{ type: "text", content: "" }];
    const parts = [];
    const regex = /\(\s*(\d+)\s*\)/g;
    let match;
    let lastIndex = 0;
    regex.lastIndex = 0;
    while ((match = regex.exec(plain)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: plain.slice(lastIndex, match.index) });
      }
      parts.push({ type: "blank", num: parseInt(match[1], 10) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < plain.length) {
      parts.push({ type: "text", content: plain.slice(lastIndex) });
    }
    return parts;
  };

  const passageParts = parsePassage();

  // Correct blank check after submit
  const isBlankCorrect = (n) => {
    if (!submitted) return null;
    const userImgId = answers[blankKey(n)];
    const correctImgId = correctAnswers[String(n)];
    if (!userImgId || !correctImgId) return false;
    return userImgId === correctImgId;
  };

  // Example image (pre-filled, shown greyed out in bank)
  const exampleImg = imageBank.find((img) => img.isExample);

  // Title question
  const titleEnabled = titleQuestion?.enabled;
  const titleOptions = titleQuestion?.options || [];
  const titleCorrect = String(titleQuestion?.correctAnswer || "").toUpperCase();

  // ── Image bank grid (shared between "full" and "picturebank" modes) ──────────
  const imageBankGrid = imageBank.map((img) => {
    const isPlaced = placedIds.includes(img.id);
    const isSelected = effectiveSelectedImgId === img.id;
    const isExample = img.isExample;
    let border = "2px solid #e5e7eb";
    let opacity = 1;
    let cursor = submitted ? "default" : "grab";
    if (isExample) { border = "2px solid #fde047"; opacity = 0.7; cursor = "not-allowed"; }
    else if (isPlaced) { border = "2px solid #86efac"; opacity = 0.55; }
    else if (isSelected) { border = "2px solid #3b82f6"; }
    return (
      <div
        key={img.id}
        draggable={!submitted && !isExample && !isPlaced}
        onDragStart={(e) => handleImgDragStart(e, img.id)}
        onClick={() => handleImgClick(img)}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
          padding: "8px 6px", borderRadius: "8px", border,
          background: isSelected ? "#eff6ff" : "#fff", opacity, cursor,
          userSelect: "none", transition: "all 0.15s", position: "relative",
        }}
        title={isExample ? `${img.word} (Example – đã dùng)` : isPlaced ? `${img.word} (đã đặt)` : `Kéo hoặc click: ${img.word}`}
      >
        {img.url ? (
          <img
            src={resolveImg(img.url)}
            alt={img.word}
            draggable={false}
            style={{ width: "100%", maxWidth: "140px", height: "auto", aspectRatio: "5/4", objectFit: "contain", borderRadius: "6px", pointerEvents: "none", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", maxWidth: "140px", aspectRatio: "5/4", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9ca3af" }}>
            No img
          </div>
        )}
        <span style={{ fontSize: "11px", fontWeight: 600, color: isPlaced ? "#6b7280" : "#111827", textAlign: "center" }}>
          {img.word}
        </span>
        {isExample && (
          <span style={{ position: "absolute", top: "2px", left: "2px", fontSize: "9px", fontWeight: 700, background: "#fde047", color: "#78350f", borderRadius: "3px", padding: "1px 4px" }}>
            Example
          </span>
        )}
        {isPlaced && !isExample && (
          <span style={{ position: "absolute", top: "2px", right: "2px", fontSize: "9px", background: "#bbf7d0", color: "#15803d", borderRadius: "3px", padding: "1px 4px", fontWeight: 700 }}>
            ✓
          </span>
        )}
        {isSelected && (
          <span style={{ position: "absolute", top: "2px", right: "2px", fontSize: "9px", background: "#3b82f6", color: "#fff", borderRadius: "3px", padding: "1px 4px", fontWeight: 700 }}>
            Selected
          </span>
        )}
      </div>
    );
  });

  // ── Picturebank-only mode (rendered in the right split panel column) ──────────
  if (renderMode === "picturebank") {
    return (
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "14px", height: "100%", boxSizing: "border-box" }}>
        <div style={{ fontWeight: 700, fontSize: "12px", color: "#0369a1", marginBottom: "12px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          🖼️ Picture Bank
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {imageBankGrid}
        </div>
        {effectiveSelectedImgId && !submitted && (
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#1d4ed8", fontWeight: 600, textAlign: "center", background: "#dbeafe", borderRadius: "6px", padding: "4px 6px" }}>
            👆 Click vào ô trống trong đoạn văn để đặt ảnh
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Passage + Optional Image Bank ────────────────────────────── */}
      <div style={renderMode === "full" ? { display: "flex", gap: 0, alignItems: "stretch" } : {}}>
        {/* Left – Passage with blank slots */}
        <div style={renderMode === "full" ? {
          flex: "1 1 0",
          minWidth: 0,
          paddingRight: "20px",
          borderRight: "2px solid #cbd5e1",
          alignSelf: "stretch",
        } : {
          flex: "1 1 0",
          minWidth: 0,
        }}>
          {passageTitle && (
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "#1e3a8a",
                marginBottom: "10px",
              }}
            >
              {passageTitle}
            </div>
          )}

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px 18px",
              fontSize: "15px",
              lineHeight: 2.2,
              color: "#111827",
            }}
          >
            {/* Example answer shown at top if any */}
            {exampleImg && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#fef9c3",
                  border: "1px solid #fde047",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "#92400e", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  Example →
                </span>
                <img
                  src={resolveImg(exampleImg.url)}
                  alt={exampleImg.word}
                  style={{ width: "36px", height: "28px", objectFit: "contain" }}
                />
                <span style={{ color: "#1e40af" }}>{exampleImg.word}</span>
              </div>
            )}

            {/* Passage with inline blank slots */}
            {passageParts.map((part, idx) => {
              if (part.type === "text") {
                return (
                  <span key={idx} style={{ whiteSpace: "pre-wrap" }}>
                    {part.content}
                  </span>
                );
              }
              // Blank slot
              const n = part.num;
              const placed = getPlacedImg(n);
              const isOver = dragOverBlank === n;
              const correct = isBlankCorrect(n);
              const qNum = startingNumber + blanks.indexOf(n);

              let borderColor = "#d1d5db";
              let bg = "#fff";
              if (isOver) { borderColor = "#3b82f6"; bg = "#eff6ff"; }
              else if (submitted && correct === true) { borderColor = "#22c55e"; bg = "#f0fdf4"; }
              else if (submitted && correct === false) { borderColor = "#ef4444"; bg = "#fef2f2"; }
              else if (placed) { borderColor = "#0e276f"; bg = "#eff6ff"; }
              else if (!answers[blankKey(n)]) { borderColor = "#f59e0b"; bg = "#fffbeb"; }

              return (
                <span
                  key={idx}
                  onDragOver={(e) => handleBlankDragOver(e, n)}
                  onDrop={(e) => handleBlankDrop(e, n)}
                  onDragLeave={handleBlankDragLeave}
                  onClick={() => handleBlankClick(n)}
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    verticalAlign: "middle",
                    width: placed ? "90px" : "80px",
                    minHeight: "64px",
                    border: `2px ${placed || isOver ? "solid" : "dashed"} ${borderColor}`,
                    borderRadius: "8px",
                    background: bg,
                    cursor: submitted ? "default" : (effectiveSelectedImgId ? "copy" : placed ? "pointer" : "default"),
                    margin: "0 4px",
                    transition: "all 0.15s",
                    padding: "3px",
                    position: "relative",
                  }}
                  title={submitted ? "" : placed ? "Click để bỏ ảnh" : effectiveSelectedImgId ? "Click để đặt ảnh vào đây" : "Kéo hoặc chọn ảnh rồi click vào đây"}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#6b7280",
                      marginBottom: "2px",
                    }}
                  >
                    ({n}) Q{qNum}
                  </span>
                  {placed ? (
                    <>
                      <img
                        src={resolveImg(placed.url)}
                        alt={placed.word}
                        style={{
                          width: "64px",
                          height: "44px",
                          objectFit: "contain",
                          borderRadius: "4px",
                        }}
                      />
                      <span
                        style={{ fontSize: "11px", fontWeight: 600, color: "#1e40af", marginTop: "2px" }}
                      >
                        {placed.word}
                      </span>
                      {!submitted && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnswerChange(blankKey(n), "");
                          }}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            fontSize: "11px",
                            color: "#ef4444",
                            cursor: "pointer",
                            lineHeight: 1,
                            fontWeight: 700,
                          }}
                          title="Bỏ ảnh này"
                        >
                          ✕
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>
                      ⬇ thả vào đây
                    </span>
                  )}
                  {/* After submit: show correct answer if wrong */}
                  {submitted && correct === false && correctAnswers[String(n)] && (
                    <div style={{ marginTop: "3px", fontSize: "10px", color: "#15803d", fontWeight: 600 }}>
                      ✓ {imageBank.find((img) => img.id === correctAnswers[String(n)])?.word}
                    </div>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right – Image Bank (full mode only) */}
        {renderMode === "full" && (
          <div
            style={{
              flex: "0 0 300px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "12px",
              padding: "12px",
              marginLeft: "20px",
              alignSelf: "flex-start",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#0369a1", marginBottom: "10px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🖼️ Picture Bank
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {imageBankGrid}
            </div>
            {effectiveSelectedImgId && !submitted && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#1d4ed8", fontWeight: 600, textAlign: "center", background: "#dbeafe", borderRadius: "6px", padding: "4px 6px" }}>
                👆 Click vào ô trống trong đoạn văn để đặt ảnh
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Title Question ─────────────────────────────────────────────── */}
      {titleEnabled && titleOptions.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            background: "#faf5ff",
            border: "1px solid #e9d5ff",
            borderRadius: "10px",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "14px",
              color: "#6b21a8",
              marginBottom: "10px",
            }}
          >
            ({startingNumber + blanks.length}) {titleQuestion.text || "Now choose the best name for the story. Tick one box."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {titleOptions.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const selected = answers[titleKey] === letter;
              const showCorrect = submitted && letter === titleCorrect;
              const showWrong = submitted && selected && letter !== titleCorrect;

              return (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: showCorrect
                      ? "2px solid #22c55e"
                      : showWrong
                      ? "2px solid #ef4444"
                      : selected
                      ? "2px solid #7c3aed"
                      : "1px solid #e5e7eb",
                    background: showCorrect
                      ? "#f0fdf4"
                      : showWrong
                      ? "#fef2f2"
                      : selected
                      ? "#f5f3ff"
                      : "#fff",
                    cursor: submitted ? "default" : "pointer",
                    fontSize: "14px",
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name={`title-${prefix}`}
                    value={letter}
                    checked={selected}
                    disabled={submitted}
                    onChange={() => onAnswerChange(titleKey, letter)}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: showCorrect ? "#22c55e" : selected ? "#7c3aed" : "#e5e7eb",
                      color: (showCorrect || selected) ? "#fff" : "#374151",
                      fontWeight: 700,
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </span>
                  <span>{opt}</span>
                  {showCorrect && <span style={{ marginLeft: "auto", color: "#22c55e", fontWeight: 700 }}>✓ Đúng</span>}
                  {showWrong && <span style={{ marginLeft: "auto", color: "#ef4444", fontWeight: 700 }}>✗</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
