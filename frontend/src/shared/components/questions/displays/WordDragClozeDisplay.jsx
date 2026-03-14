import React, { useState, useCallback } from "react";
import { hostPath } from "../../../utils/api";

/**
 * WordDragClozeDisplay – Cambridge Movers Part 4
 * "Read the text. Choose the right words and write them on the lines."
 *
 * Layout:
 *   Left   : passage với các ô blank tương tác
 *   Right  : bảng từ lựa chọn (3 từ × N hàng)
 *
 * Tương tác học sinh (không cần bàn phím):
 *   – Click blank → focus (viền xanh)
 *   – Double-click từ trong bảng → điền vào blank đang focus
 *   – Kéo thả từ vào blank
 *   – Double-click ô đã điền → xoá
 *
 * Answers keys: `${prefix}-blank-${n}` → string (từ đã chọn)
 *
 * passageText có thể là HTML (ReactQuill) hoặc plain text.
 */

const resolveImg = (url) => {
  if (!url) return "";
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return hostPath(s);
  return s;
};

/**
 * Chuyển HTML từ ReactQuill thành danh sách "lines" (mỗi <p>/<br> = 1 dòng).
 * Mỗi line là chuỗi plain text còn giữ (0)(1)... markers.
 *
 * Trả về: Array<string> – mỗi phần tử là 1 dòng plain text
 */
const htmlToLines = (html = "") => {
  if (!html || !html.includes("<")) {
    // plain text fallback
    return html.split("\n");
  }
  // Thay </p> và <br> bằng newline, rồi strip HTML
  const text = html
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
  return text.split("\n");
};

/**
 * Parse 1 dòng text thành segments: { type: 'text', value } | { type: 'blank', number }
 */
const parseLine = (line = "") => {
  const segments = [];
  const combined = /\(\s*(\d+)\s*\)_{0,}/g;
  let lastIndex = 0;
  let match;
  while ((match = combined.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    segments.push({ type: "blank", number: parseInt(match[1], 10) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ type: "text", value: line.slice(lastIndex) });
  }
  return segments;
};

export default function WordDragClozeDisplay({
  section,
  startingNumber = 1,
  answerKeyPrefix,
  onAnswerChange,
  answers = {},
  submitted = false,
  partImage = "",
  renderMode = "full", // "passage" | "wordbank" | "full"
  sharedFocusedBlank = null,
  onSharedFocusChange = null,
}) {
  const q = section?.questions?.[0] || {};
  const {
    passageTitle = "",
    passageImage = "",
    passageText = "",
    exampleAnswer = "",
    exampleOptions = [],
    blanks = [],
  } = q;

  const prefix = answerKeyPrefix || section?.id || "wdc";
  const blankKey = (n) => `${prefix}-blank-${n}`;

  const [_localFocusedBlank, _setLocalFocusedBlank] = useState(null);
  const focusedBlank = onSharedFocusChange !== null ? sharedFocusedBlank : _localFocusedBlank;
  const setFocusedBlank = onSharedFocusChange !== null ? onSharedFocusChange : _setLocalFocusedBlank;
  const [dragOver, setDragOver] = useState(null);

  /* ─── Helpers ─── */
  const getAnswer = (n) => answers[blankKey(n)] || "";

  const setAnswer = useCallback(
    (n, word) => {
      if (submitted) return;
      onAnswerChange(blankKey(n), word);
    },
    [submitted, answers, onAnswerChange, blankKey]
  );

  const clearBlank = useCallback(
    (n) => {
      if (submitted) return;
      onAnswerChange(blankKey(n), "");
      setFocusedBlank(null);
    },
    [submitted, onAnswerChange, blankKey]
  );

  /* ─── Drag handlers (Bank → Blank) ─── */
  const handleDragStart = (e, word) => {
    e.dataTransfer.setData("text/plain", word);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e, blankNum) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(blankNum);
  };

  const handleDrop = (e, blankNum) => {
    e.preventDefault();
    const word = e.dataTransfer.getData("text/plain");
    if (word) setAnswer(blankNum, word);
    setDragOver(null);
  };

  const handleDragLeave = () => setDragOver(null);

  /* ─── Double-click word → fill focused blank ─── */
  const handleWordDoubleClick = (word) => {
    if (submitted) return;
    if (focusedBlank !== null) {
      setAnswer(focusedBlank, word);
    }
  };

  /* ─── Single-click word → fill focused blank (mobile friendly) ─── */
  const handleWordClick = (word) => {
    if (submitted) return;
    if (focusedBlank !== null) {
      setAnswer(focusedBlank, word);
    }
  };

  /* ─── Build passage rows: one row per blank number ─── */
  const buildPassageRows = () => {
    const fullText = htmlToLines(passageText).join(" ");
    const allSegs = parseLine(fullText);
    const rows = [];
    let pending = []; // text segs before the next blank
    for (let i = 0; i < allSegs.length; i++) {
      const seg = allSegs[i];
      if (seg.type === "blank") {
        const rowSegs = [...pending, seg];
        pending = [];
        // Consume all trailing text until the next blank
        while (i + 1 < allSegs.length && allSegs[i + 1].type !== "blank") {
          i++;
          rowSegs.push(allSegs[i]);
        }
        rows.push({ blankNum: seg.number, segs: rowSegs });
      } else {
        pending.push(seg);
      }
    }
    // Orphan trailing text (after all blanks) → append to last row
    if (pending.length > 0 && rows.length > 0) {
      rows[rows.length - 1].segs.push(...pending);
    }
    return rows;
  };

  /* ─── Passed data ─── */
  const correctAnswerFor = (n) => {
    const b = blanks.find((bl) => bl.number === n);
    return b?.correctAnswer || "";
  };

  /* ─── Submitted state ─── */
  const blankStatus = (n) => {
    if (!submitted) return "normal";
    const userAns = (getAnswer(n) || "").trim().toLowerCase();
    const correct = (correctAnswerFor(n) || "").trim().toLowerCase();
    if (!userAns) return "empty";
    return userAns === correct ? "correct" : "wrong";
  };

  /* ─── Re-usable blank slot ─── */
  const renderBlankSlot = (n) => {
    if (n === 0) {
      // Example – always show filled answer
      return (
        <span
          style={{
            display: "inline-block",
            minWidth: 80,
            padding: "1px 10px",
            border: "2px solid #374151",
            borderRadius: 4,
            background: "#f3f4f6",
            fontWeight: 700,
            fontSize: "inherit",
            textAlign: "center",
            verticalAlign: "baseline",
            lineHeight: 1.6,
          }}
        >
          {exampleAnswer || "———"}
        </span>
      );
    }

    const answer = getAnswer(n);
    const isFocused = focusedBlank === n;
    const isOver = dragOver === n;
    const status = blankStatus(n);

    let bg = "#fff";
    let border = "2px dashed #9ca3af";
    let color = "#374151";

    if (isFocused || isOver) { bg = "#eff6ff"; border = "2px solid #3b82f6"; }
    if (answer && !submitted)  { bg = "#e0f2fe"; border = "2px solid #0ea5e9"; }
    if (status === "correct")  { bg = "#dcfce7"; border = "2px solid #22c55e"; color = "#15803d"; }
    if (status === "wrong")    { bg = "#fee2e2"; border = "2px solid #ef4444"; color = "#b91c1c"; }
    if (status === "empty")    { bg = "#fef9c3"; border = "2px dashed #f59e0b"; }

    return (
      <span
        id={`question-${startingNumber + n - 1}`}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (submitted) return;
          if (answer) {
            // Filled blank: clear it and keep focused so user can refill immediately
            clearBlank(n);
            setFocusedBlank(n);
          } else {
            // Empty blank: toggle focus
            setFocusedBlank(isFocused ? null : n);
          }
        }}
        onDragOver={(e) => handleDragOver(e, n)}
        onDrop={(e) => handleDrop(e, n)}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => {
          if ((e.key === "Delete" || e.key === "Backspace") && !submitted) { clearBlank(n); setFocusedBlank(n); }
        }}
        title={answer ? "Click để xoá và chọn lại" : isFocused ? "Đang chọn — click từ bên phải để điền" : "Click để chọn ô này"}
        style={{
          display: "inline-block",
          minWidth: 90,
          padding: "1px 10px",
          border,
          borderRadius: 4,
          background: bg,
          color,
          fontWeight: answer ? 700 : 400,
          fontSize: "inherit",
          textAlign: "center",
          verticalAlign: "baseline",
          lineHeight: 1.6,
          cursor: submitted ? "default" : "pointer",
          transition: "all 0.15s",
          userSelect: "none",
          outline: isFocused ? "2px solid #60a5fa" : "none",
          outlineOffset: 1,
        }}
      >
        {answer || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>………</span>}
        {submitted && status === "wrong" && (
          <span
            style={{
              display: "block",
              fontSize: "0.75em",
              color: "#166534",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            ✓ {correctAnswerFor(n)}
          </span>
        )}
      </span>
    );
  };

  /* ─── Word chip in bank ─── */
  const renderWordChip = (word, blankNum, isExample = false) => {
    if (isExample) {
      return (
        <span
          key={word}
          style={{
            display: "block",
            width: "100%",
            padding: "8px 6px",
            border: "2px solid #374151",
            borderRadius: 10,
            background: "#f3f4f6",
            fontWeight: 700,
            fontSize: "inherit",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {word}
        </span>
      );
    }

    const isSelected = getAnswer(blankNum) === word;

    let chipBg = "#fff";
    let chipColor = "#1e3a5f";
    let chipBorder = "2px solid #bfdbfe";
    let chipShadow = "0 2px 4px rgba(0,0,0,0.07)";

    if (isSelected && !submitted) { chipBg = "#0ea5e9"; chipColor = "#fff"; chipBorder = "2px solid #0284c7"; chipShadow = "0 2px 8px rgba(14,165,233,0.35)"; }
    if (submitted && isSelected && blankStatus(blankNum) === "correct") { chipBg = "#22c55e"; chipColor = "#fff"; chipBorder = "2px solid #16a34a"; chipShadow = "0 2px 8px rgba(34,197,94,0.35)"; }
    if (submitted && isSelected && blankStatus(blankNum) === "wrong")   { chipBg = "#ef4444"; chipColor = "#fff"; chipBorder = "2px solid #dc2626"; chipShadow = "0 2px 8px rgba(239,68,68,0.35)"; }

    return (
      <span
        key={word}
        draggable={!submitted}
        onClick={() => handleWordClick(word)}
        onDoubleClick={() => handleWordDoubleClick(word)}
        onDragStart={(e) => handleDragStart(e, word)}
        title={
          submitted
            ? undefined
            : focusedBlank !== null
            ? `Click để điền vào câu ${focusedBlank}`
            : "Kéo vào ô trống, hoặc click ô trống trước rồi click từ này"
        }
        style={{
          display: "block",
          width: "100%",
          padding: "8px 6px",
          borderRadius: 10,
          border: chipBorder,
          background: chipBg,
          color: chipColor,
          fontWeight: 700,
          fontSize: "inherit",
          cursor: submitted ? "default" : "grab",
          userSelect: "none",
          transition: "all 0.15s",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          boxSizing: "border-box",
          boxShadow: chipShadow,
        }}
      >
        {word}
      </span>
    );
  };

  /* ─── RENDER ─── */
  const displayImage = partImage || passageImage || (() => {
    const m = passageText.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : "";
  })();

  const passageRows = buildPassageRows();
  const exampleRow = passageRows.find((r) => r.blankNum === 0);
  const mainRows = passageRows.filter((r) => r.blankNum !== 0 && r.blankNum !== null);

  /* ── Passage panel content ── */
  const passageContent = (
    <>
      {displayImage && (
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src={resolveImg(displayImage)} alt="passage" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        </div>
      )}
      {passageTitle && (
        <h3 style={{ textAlign: "center", color: "#dc2626", fontWeight: 700, fontSize: "1.1em", margin: "0 0 12px" }}>
          {passageTitle}
        </h3>
      )}
      {!submitted && focusedBlank !== null && (
        <div style={{ marginBottom: 10, padding: "5px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: "0.78em", color: "#1d4ed8" }}>
          ✏️ Đang chọn ô <strong>{focusedBlank}</strong> — click hoặc kéo thả từ bên phải vào
        </div>
      )}
      <div style={{ lineHeight: 2.1, fontSize: "inherit", color: "#1f2937" }}>
        {exampleRow && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <span style={{ minWidth: 64, fontWeight: 700, color: "#0052cc", fontSize: "0.9em", flexShrink: 0 }}>Example</span>
            <span>
              {exampleRow.segs.map((seg, si) =>
                seg.type === "blank"
                  ? <React.Fragment key={si}>{renderBlankSlot(seg.number)}</React.Fragment>
                  : <React.Fragment key={si}>{seg.value}</React.Fragment>
              )}
            </span>
          </div>
        )}
        {mainRows.map((row) => (
          <div key={row.blankNum} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ minWidth: 64, fontWeight: 700, color: "#0052cc", fontSize: "0.9em", flexShrink: 0 }}>{row.blankNum}</span>
            <span>
              {row.segs.map((seg, si) => {
                if (seg.type === "text") return <React.Fragment key={si}>{seg.value}</React.Fragment>;
                if (seg.type === "blank") return <React.Fragment key={si}>{renderBlankSlot(seg.number)}</React.Fragment>;
                return null;
              })}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  /* ── Word bank panel content ── */
  const wordbankContent = (
    <div style={{ padding: "12px 16px", boxSizing: "border-box" }}>
      {/* Header hint */}
      <div style={{ fontSize: "0.75em", color: "#6b7280", marginBottom: 14, lineHeight: 1.5, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
        {submitted ? "✅ Kết quả đã nộp" : "👉 Click ô trống trong đoạn văn, rồi click hoặc kéo thả từ vào ô"}
      </div>

      {/* Column headers A / B / C */}
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: "2px solid #e5e7eb" }}>
        <span></span>
        {["A", "B", "C"].map((lbl) => (
          <span key={lbl} style={{ textAlign: "center", fontWeight: 800, fontSize: "0.75em", color: "#9ca3af", letterSpacing: "0.05em" }}>{lbl}</span>
        ))}
      </div>

      {/* Example row */}
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr", gap: 8, alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #e5e7eb" }}>
        <span style={{ fontWeight: 800, color: "#0052cc", fontSize: "0.85em", textAlign: "center" }}>Ex</span>
        {[0, 1, 2].map((wi) => {
          const word = exampleOptions[wi];
          return (
            <div key={wi}>
              {word && word.trim() ? renderWordChip(word, 0, true) : (
                <div style={{ height: 36 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Question rows */}
      {blanks.map((blank, rowIdx) => {
        const opts = (blank.options || []).filter((o) => o && o.trim() !== "");
        const isFocusedRow = focusedBlank === blank.number;
        return (
          <div
            key={blank.number}
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr 1fr 1fr",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              padding: "6px 8px",
              borderRadius: 10,
              background: isFocusedRow ? "#eff6ff" : (rowIdx % 2 === 0 ? "#fafafa" : "#fff"),
              border: isFocusedRow ? "1.5px solid #93c5fd" : "1.5px solid transparent",
              transition: "background 0.15s, border 0.15s",
            }}
          >
            <span style={{ fontWeight: 800, color: isFocusedRow ? "#1d4ed8" : "#0052cc", fontSize: "1em", textAlign: "center" }}>
              {blank.number}
            </span>
            {[0, 1, 2].map((wi) => (
              <div key={wi}>
                {opts[wi] ? renderWordChip(opts[wi], blank.number) : (
                  <div style={{ height: 36, borderRadius: 10, background: "#f3f4f6", border: "1.5px dashed #e5e7eb" }} />
                )}
              </div>
            ))}
          </div>
        );
      })}    
      
    </div>
  );

  if (renderMode === "passage") return passageContent;
  if (renderMode === "wordbank") return wordbankContent;

  /* renderMode === "full" — standalone fallback (no divider) */
  return (
    <div style={{ display: "flex", gap: 0, width: "100%", minHeight: 300, fontSize: "inherit" }}>
    <div style={{ flex: "0 0 56%", padding: "16px 20px", borderRight: "1px solid #e5e7eb", overflowY: "auto", minWidth: 0 }}>
        {passageContent}
      </div>
      <div style={{ flex: 1, padding: "16px 12px", overflowY: "auto", minWidth: 0 }}>
        {wordbankContent}
      </div>
    </div>
  );
}
