import React, { useState, useRef, useEffect } from "react";
import { hostPath } from "../../../../shared/utils/api";
import LineIcon from "../../../../shared/components/LineIcon.jsx";
import AnchoredImageStage from "./AnchoredImageStage";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

const resolveImg = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return hostPath(url);
};

export const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "14px",
  marginBottom: "8px",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "12px",
  color: "#6b7280",
};

export const PartTab = ({ cfg, isActive, isComplete, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      width: "100%",
      padding: "12px 14px",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      background: isActive ? cfg.bg : "transparent",
      borderLeft: isActive ? `4px solid ${cfg.color}` : "4px solid transparent",
      marginBottom: "6px",
      textAlign: "left",
      transition: "all 0.15s",
    }}
  >
    <InlineIcon name={cfg.iconName || "questions"} size={20} style={{ color: isActive ? cfg.color : "#475569" }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: "13px",
          color: isActive ? cfg.color : "#374151",
        }}
      >
        Part {cfg.part}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {cfg.titleVi}
      </div>
    </div>
    {isComplete && (
      <InlineIcon name="correct" size={14} style={{ color: "#10b981" }} />
    )}
  </button>
);

export const TipBox = ({ cfg }) => (
  <div
    style={{
      padding: "12px 16px",
      background: cfg.bg,
      border: `1px solid ${cfg.color}40`,
      borderRadius: "10px",
      marginBottom: "20px",
    }}
  >
    <strong style={{ color: cfg.color, fontSize: "13px" }}>
      Huong dan Part {cfg.part}
    </strong>
    <p
      style={{
        margin: "6px 0 0",
        fontSize: "12px",
        color: "#374151",
        lineHeight: 1.6,
      }}
    >
      {cfg.tip}
    </p>
  </div>
);

export const FillQuestionsEditor = ({
  questions,
  onChange,
  color = "#10b981",
  startNumber = 1,
  exampleItem = null,
  onExampleChange = null,
  imageTitle = "",
  onImageTitleChange = null,
}) => {
  // Draft buffer: key = `${qIdx}-${aIdx}` → raw string while the field is focused.
  // This prevents re-render from trimming/stripping characters mid-typing.
  const [answerDrafts, setAnswerDrafts] = useState({});

  const updateQ = (idx, field, val) => {
    const next = [...questions];
    next[idx] = { ...next[idx], questionNumber: startNumber + idx, [field]: val };
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Tiêu đề cho hình ảnh (hiển thị to đẹp bên UI học sinh) */}
      {onImageTitleChange !== null && (
        <div style={{
          padding: "12px 14px",
          border: "1.5px solid #c7d2fe",
          borderRadius: "10px",
          background: "#eef2ff",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
            <InlineIcon name="tag" size={14} />
            Tiêu đề hình ảnh — hiển thị to bên UI học sinh
          </div>
          <input
            type="text"
            placeholder="Ví dụ: Listen and write."
            value={imageTitle || ""}
            onChange={(e) => onImageTitleChange(e.target.value)}
            style={{ ...inputStyle, borderColor: imageTitle ? "#6366f1" : "#c7d2fe", background: "#fff" }}
          />
        </div>
      )}
      {onExampleChange && (
        <div
          style={{
            padding: "14px",
            border: "1px dashed #cbd5e1",
            borderRadius: "10px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "44px",
                  height: "28px",
                  borderRadius: "999px",
                  background: "#e2e8f0",
                  color: "#475569",
                  fontWeight: 800,
                  fontSize: "12px",
                  padding: "0 10px",
                }}
              >
                Vi du
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                Cau mau - khong tinh diem
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
              Hien truoc cau {startNumber}
            </span>
          </div>
          <input
            type="text"
            placeholder="Cau vi du / ngu canh"
            value={exampleItem?.questionText || ""}
            onChange={(e) =>
              onExampleChange({
                ...(exampleItem || {}),
                questionText: e.target.value,
              })
            }
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Dap an vi du hien san cho hoc sinh"
            value={exampleItem?.correctAnswer || ""}
            onChange={(e) =>
              onExampleChange({
                ...(exampleItem || {}),
                correctAnswer: e.target.value,
              })
            }
            style={{
              ...inputStyle,
              marginBottom: 0,
              borderColor: exampleItem?.correctAnswer ? color : "#d1d5db",
            }}
          />
        </div>
      )}

      {questions.map((q, idx) => {
        // Parse correctAnswer string (slash‑separated) — NO trim() here so stored spaces are preserved.
        const rawParts = String(q.correctAnswer || '').split('/');
        const answerParts = rawParts.length && rawParts.some(Boolean) ? rawParts : [''];
        // Strip '/' from each part (it's our storage separator), then join with '/'
        const setAnswerParts = (parts) =>
          updateQ(idx, 'correctAnswer', parts.map((s) => s.replace(/\//g, '')).join('/'));
        return (
          <div
            key={idx}
            style={{
              padding: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: `${color}20`,
                  color,
                  fontWeight: 800,
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                {startNumber + idx}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
                Câu {startNumber + idx}
              </span>
            </div>

            {/* Nội dung câu hỏi */}
            <input
              type="text"
              placeholder="Nội dung câu hỏi / ngữ cảnh"
              value={q.questionText || ""}
              onChange={(e) => updateQ(idx, "questionText", e.target.value)}
              style={inputStyle}
            />

            {/* Multi‑answer block */}
            <div style={{ marginTop: "4px" }}>
              <div style={{
                fontSize: "11px", fontWeight: 700, color: "#6b7280",
                marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                Đáp án — học sinh đúng khi khớp <em>bất kỳ</em> đáp án nào bên dưới
              </div>

              {answerParts.map((ans, aIdx) => {
                const draftKey = `${idx}-${aIdx}`;
                const isDrafting = answerDrafts[draftKey] !== undefined;
                const displayVal = isDrafting ? answerDrafts[draftKey] : ans;
                return (
                <div key={aIdx} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{
                    minWidth: "22px", fontSize: "11px", fontWeight: 700,
                    color: aIdx === 0 ? color : "#94a3b8", textAlign: "center",
                  }}>
                    {aIdx === 0 ? "①" : `②③④⑤`[aIdx - 1] ?? `${aIdx + 1}.`}
                  </span>
                  <input
                    type="text"
                    placeholder={aIdx === 0 ? "Đáp án chính (gõ '/' hoặc '|' để tách đáp án)" : `Đáp án thay thế ${aIdx + 1}`}
                    value={displayVal}
                    onChange={(e) => {
                      // Buffer raw value locally — no stripping during typing
                      setAnswerDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      // Clear draft
                      setAnswerDrafts((prev) => { const n = { ...prev }; delete n[draftKey]; return n; });
                      // Split on ' / ', ' | ', '/', or '|'
                      const splitParts = raw.split(/\s*[|/]\s*/).map((s) => s.trim()).filter(Boolean);
                      if (splitParts.length > 1) {
                        // Distribute into multiple answer slots
                        const newParts = [...answerParts];
                        newParts.splice(aIdx, 1, ...splitParts);
                        setAnswerParts(newParts.slice(0, 5));
                      } else {
                        const next = [...answerParts];
                        next[aIdx] = raw; // Keep value as-is (spaces preserved)
                        setAnswerParts(next);
                      }
                    }}
                    style={{
                      ...inputStyle,
                      marginBottom: 0,
                      flex: 1,
                      borderColor: displayVal ? color : "#d1d5db",
                    }}
                  />
                  {aIdx > 0 && (
                    <button
                      onClick={() => setAnswerParts(answerParts.filter((_, i) => i !== aIdx))}
                      style={{
                        padding: "5px 9px", border: "1px solid #fca5a5",
                        background: "#fef2f2", color: "#dc2626",
                        borderRadius: "6px", cursor: "pointer", fontSize: "14px", lineHeight: 1,
                        flexShrink: 0,
                      }}
                      title="Xóa đáp án này"
                    ><InlineIcon name="close" size={14} style={{ color: "currentColor" }} /></button>
                  )}
                </div>
              );
            })}

              {answerParts.length < 5 && (
                <button
                  onClick={() => setAnswerParts([...answerParts, ''])}
                  style={{
                    fontSize: "12px", color, background: `${color}12`,
                    border: `1.5px dashed ${color}`, borderRadius: "7px",
                    padding: "5px 12px", cursor: "pointer", fontWeight: 700,
                    marginTop: "2px",
                  }}
                >+ Thêm đáp án chấp nhận</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const MatchingPartEditor = ({ data, onChange, partImageUrl }) => {
  const leftItems = data.leftItems || ["", "", "", "", "", ""];
  const answers = data.answers || {};
  const anchors = data.anchors || {};
  const [pendingIdx, setPendingIdx] = useState(null);
  const [imageReady, setImageReady] = useState(false);
  const imgRef = useRef(null);

  const setLeft = (i, val) => onChange({ ...data, leftItems: leftItems.map((v, idx) => idx === i ? val : v) });

  const getAnswer = (nameIdx) => {
    const byIdx = answers[String(nameIdx)];
    if (byIdx) return byIdx;
    const name = leftItems[nameIdx];
    return name ? (answers[name] || "") : "";
  };

  const addName = () => onChange({ ...data, leftItems: [...leftItems, ""] });

  const removeName = (i) => {
    if (i === 0) return;
    const next = leftItems.filter((_, idx) => idx !== i);
    const nextAnswers = {};
    const nextAnchors = {};

    Object.entries(answers).forEach(([k, v]) => {
      const n = parseInt(k, 10);
      if (Number.isNaN(n)) {
        nextAnswers[k] = v;
        return;
      }
      if (n < i) nextAnswers[k] = v;
      else if (n > i) nextAnswers[String(n - 1)] = v;
    });

    Object.entries(anchors).forEach(([k, v]) => {
      const n = parseInt(k, 10);
      if (Number.isNaN(n)) {
        nextAnchors[k] = v;
        return;
      }
      if (n < i) nextAnchors[k] = v;
      else if (n > i) nextAnchors[String(n - 1)] = v;
    });

    onChange({ ...data, leftItems: next, answers: nextAnswers, anchors: nextAnchors });
  };

  const handleImageClick = (e) => {
    if (pendingIdx === null || !imgRef.current || !imageReady) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    const nextAnswers = pendingIdx > 0
      ? { ...data.answers, [String(pendingIdx)]: String.fromCharCode(64 + pendingIdx) }
      : data.answers;
    onChange({ ...data, anchors: { ...anchors, [String(pendingIdx)]: { x, y } }, answers: nextAnswers });
    setPendingIdx(null);
  };

  const clearAnchor = (idx) => {
    const next = { ...anchors };
    delete next[String(idx)];
    onChange({ ...data, anchors: next });
  };

  const questionCount = leftItems.length - 1;
  const hasImage = Boolean(partImageUrl);
  const anchorColors = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

  return (
    <div>
      <div
        style={{
          padding: "10px 14px",
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          borderRadius: "10px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#1e40af",
          lineHeight: 1.6,
        }}
      >
        <strong>Cach dat anchor tren anh:</strong><br />
        1. Nhap ten nhan vat<br />
        2. Bam nut dat diem ben canh ten<br />
        3. Click vao dung vi tri tren tranh
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#374151" }}>
              Names - {questionCount} cau hoi
            </p>
            <button
              onClick={addName}
              style={{
                padding: "4px 10px",
                border: "1px dashed #3b82f6",
                borderRadius: "6px",
                background: "#eff6ff",
                color: "#2563eb",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              + Them ten
            </button>
          </div>

          {leftItems.map((name, i) => {
            const anchor = anchors[String(i)];
            const isPending = pendingIdx === i;
            const color = anchorColors[i % anchorColors.length];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: i === 0 ? "#9ca3af" : color, fontWeight: 700, width: "52px", flexShrink: 0 }}>
                  {i === 0 ? "Example" : `Cau ${i}`}
                </span>
                <input
                  type="text"
                  placeholder={i === 0 ? "Ten vi du" : `Ten nguoi ${i}`}
                  value={name}
                  onChange={(e) => setLeft(i, e.target.value)}
                  style={{
                    ...inputStyle,
                    marginBottom: 0,
                    flex: 1,
                    fontSize: "13px",
                    background: i === 0 ? "#f3f4f6" : "white",
                  }}
                />
                {hasImage && (
                  <button
                    type="button"
                    title={anchor ? "Da dat - click de dat lai" : "Click roi click anh de dat diem"}
                    onClick={() => setPendingIdx(isPending ? null : i)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "7px",
                      border: "2px solid",
                      borderColor: isPending ? color : (anchor ? color : "#d1d5db"),
                      background: isPending ? color : (anchor ? `${color}20` : "#f9fafb"),
                      color: isPending ? "white" : color,
                      cursor: "pointer",
                      fontSize: "14px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <InlineIcon name={anchor ? "target" : "pin"} size={14} style={{ color: isPending ? "white" : color }} />
                  </button>
                )}
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeName(i)}
                    title="Xoa"
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "6px",
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "14px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <InlineIcon name="close" size={14} style={{ color: "currentColor" }} />
                  </button>
                ) : (
                  <div style={{ width: hasImage ? "36px" : "6px", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasImage ? (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>
            Anh - {pendingIdx !== null ? `Dang cho click cho "${leftItems[pendingIdx] || `Cau ${pendingIdx}`}"` : "Click nut dat diem roi click vao anh"}
          </p>
          <div
            style={{ marginBottom: "20px" }}
          >
            <AnchoredImageStage
              src={resolveImg(partImageUrl)}
              alt="Part scene"
              imageRef={imgRef}
              maxWidth="640px"
              cursor={pendingIdx !== null && imageReady ? "crosshair" : "default"}
              onClick={handleImageClick}
              onReadyChange={setImageReady}
            >
              {imageReady ? Object.entries(anchors).map(([idxStr, pos]) => {
                const i = parseInt(idxStr, 10);
                const name = leftItems[i] || (i === 0 ? "(Example)" : "?");
                const color = anchorColors[i % anchorColors.length];
                return (
                  <div
                    key={idxStr}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "auto",
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: color,
                        border: "2px solid white",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "16px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: color,
                        color: "white",
                        borderRadius: "4px",
                        padding: "1px 6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      {name}
                      <span
                        style={{ marginLeft: "4px", cursor: "pointer", opacity: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAnchor(i);
                        }}
                        title="Xoa diem nay"
                      >
                        <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
                      </span>
                    </div>
                  </div>
                );
              }) : null}
              {pendingIdx !== null && imageReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "10px",
                    border: `3px dashed ${anchorColors[pendingIdx % anchorColors.length]}`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </AnchoredImageStage>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "16px",
            background: "#fef9c3",
            border: "1px solid #fde047",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "12px",
            color: "#854d0e",
          }}
        >
          Chua co anh - upload anh de dat diem anchor.
        </div>
      )}

      <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
        <strong style={{ fontSize: "12px", color: "#1d4ed8" }}>Dap an + anchor:</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          {leftItems.slice(1).map((name, i) => {
            const ans = getAnswer(i + 1);
            const anchor = anchors[String(i + 1)];
            return name ? (
              <span
                key={i}
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: (ans && (!hasImage || anchor)) ? "#dbeafe" : "#fee2e2",
                  color: (ans && (!hasImage || anchor)) ? "#1d4ed8" : "#dc2626",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {name} {"->"} {ans || "?"}{hasImage ? (anchor ? " [anchor]" : " [missing anchor]") : ""}
              </span>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
};

export const PictureQuestionsEditor = ({ questions, onChange, startNumber = 1 }) => {
  const updateQ = (idx, field, val) => {
    const next = [...questions];
    next[idx] = { ...next[idx], questionNumber: startNumber + idx, [field]: val };
    onChange(next);
  };

  const updateOption = (qIdx, optIdx, field, val) => {
    const next = [...questions];
    const opts = [...(next[qIdx].imageOptions || [])];
    opts[optIdx] = { ...opts[optIdx], [field]: val };
    next[qIdx] = { ...next[qIdx], imageOptions: opts };
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {questions.map((q, idx) => (
        <div
          key={idx}
          style={{
            padding: "16px",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            background: "#f9fafb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "#ede9fe",
                color: "#7c3aed",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              {startNumber + idx}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
              Cau {startNumber + idx}
            </span>
          </div>

          <input
            type="text"
            placeholder="Cau hoi"
            value={q.questionText || ""}
            onChange={(e) => updateQ(idx, "questionText", e.target.value)}
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "4px" }}>
            {["A", "B", "C"].map((letter, optIdx) => {
              const opt = q.imageOptions?.[optIdx] || { imageUrl: "", text: letter };
              const isCorrect = q.correctAnswer === letter;
              return (
                <div
                  key={optIdx}
                  style={{
                    border: `2px solid ${isCorrect ? "#7c3aed" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    padding: "10px",
                    background: isCorrect ? "#f5f3ff" : "white",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 800, fontSize: "15px", color: isCorrect ? "#7c3aed" : "#374151" }}>
                      {letter}
                    </span>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600, color: isCorrect ? "#7c3aed" : "#6b7280" }}>
                      <input
                        type="radio"
                        name={`correct_${idx}`}
                        checked={isCorrect}
                        onChange={() => updateQ(idx, "correctAnswer", letter)}
                      />
                      Dung
                    </label>
                  </div>
                  {opt.imageUrl && (
                    <img
                      src={resolveImg(opt.imageUrl)}
                      alt={letter}
                      style={{
                        width: "100%",
                        height: "72px",
                        objectFit: "contain",
                        borderRadius: "6px",
                        marginBottom: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  )}
                  <input
                    type="text"
                    placeholder="URL hinh"
                    value={opt.imageUrl || ""}
                    onChange={(e) => updateOption(idx, optIdx, "imageUrl", e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, fontSize: "11px" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const LetterMatchingEditor = ({ data, onChange, onUploadImage }) => {
  const [uploading, setUploading] = useState({});

  const people =
    Array.isArray(data?.people) && data.people.length
      ? data.people
      : Array.from({ length: 6 }, (_, i) => ({
          name: "",
          photoUrl: "",
          correctAnswer: "",
          isExample: i === 0,
        }));
  const options =
    Array.isArray(data?.options) && data.options.length
      ? data.options
      : "ABCDEFGH".split("").map((l) => ({ letter: l, description: "", imageUrl: "" }));

  const updatePerson = (idx, field, value) => {
    const newPeople = people.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    onChange({ ...data, people: newPeople });
  };

  const updateOption = (idx, field, value) => {
    const newOptions = options.map((o, i) => (i === idx ? { ...o, [field]: value } : o));
    onChange({ ...data, options: newOptions });
  };

  const handleUpload = async (file, slotKey, applyUrl) => {
    if (!file || !onUploadImage) return;
    setUploading((prev) => ({ ...prev, [slotKey]: true }));
    try {
      const url = await onUploadImage(file);
      if (url) applyUrl(url);
    } finally {
      setUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  return (
    <div>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px", lineHeight: 1.6 }}>
        Nhập tên nhân vật, ảnh minh họa (tùy chọn), và chữ cái đáp án đúng (A–H). Hàng đầu tiên là{" "}
        <strong>ví dụ (example)</strong>, không tính điểm.
      </p>

      {/* Context prompt text */}
      <div style={{ marginBottom: "18px" }}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px" }}><InlineIcon name="writing" size={14} />Câu hỏi / nội dung giới thiệu (tùy chọn)</label>
        <input
          type="text"
          value={data?.questionText || ""}
          onChange={(e) => onChange({ ...data, questionText: e.target.value })}
          placeholder="VD: What are they going to do at the weekend?"
          style={inputStyle}
        />
      </div>

      {/* People list */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px" }}><InlineIcon name="user" size={14} />Danh sách nhân vật (hàng 1 = ví dụ)</label>
        {people.map((person, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "8px",
              padding: "10px 14px",
              border: `2px solid ${idx === 0 ? "#94a3b8" : "#6d28d9"}`,
              borderRadius: "12px",
              background: idx === 0 ? "#f8fafc" : "#faf5ff",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "34px",
                height: "34px",
                borderRadius: "50%",
                background: idx === 0 ? "#e2e8f0" : "#7c3aed",
                color: idx === 0 ? "#475569" : "#fff",
                fontWeight: 800,
                fontSize: "13px",
                flexShrink: 0,
              }}
            >
              {idx === 0 ? "Ex" : idx}
            </span>
            <input
              type="text"
              value={person.name || ""}
              onChange={(e) => updatePerson(idx, "name", e.target.value)}
              placeholder={idx === 0 ? "Tên ví dụ (VD: Ann)" : `Tên nhân vật ${idx}`}
              style={{ ...inputStyle, marginBottom: 0, flex: 2, minWidth: 0 }}
            />
            {/* Person photo: url + upload + preview */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 3, minWidth: 0 }}>
              {person.photoUrl && (
                <img
                  src={resolveImg(person.photoUrl)}
                  alt=""
                  style={{ width: "36px", height: "36px", borderRadius: "7px", objectFit: "cover", flexShrink: 0, border: "1.5px solid #d1d5db" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <input
                type="text"
                value={person.photoUrl || ""}
                onChange={(e) => updatePerson(idx, "photoUrl", e.target.value)}
                placeholder="URL ảnh / GIF..."
                style={{ ...inputStyle, marginBottom: 0, flex: 1, minWidth: 0, fontSize: "11px" }}
              />
              <label
                title="Upload từ máy"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer",
                  padding: "5px 9px", borderRadius: "7px",
                  background: uploading[`person-${idx}`] ? "#e5e7eb" : "#ede9fe",
                  color: "#7c3aed", fontSize: "11px", fontWeight: 700, flexShrink: 0,
                  border: "1.5px solid #c4b5fd", whiteSpace: "nowrap",
                }}
              >
                {uploading[`person-${idx}`] ? <InlineIcon name="loading" size={12} /> : <InlineIcon name="upload" size={12} />}
                <input
                  type="file" accept="image/*,image/gif" style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleUpload(file, `person-${idx}`, (url) => updatePerson(idx, "photoUrl", url));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <input
              type="text"
              maxLength={1}
              value={person.correctAnswer || ""}
              onChange={(e) => updatePerson(idx, "correctAnswer", e.target.value.toUpperCase())}
              placeholder="A–H"
              style={{
                ...inputStyle,
                marginBottom: 0,
                width: "48px",
                flexShrink: 0,
                minWidth: 0,
                textAlign: "center",
                fontWeight: 900,
                fontSize: "14px",
                background: idx === 0 ? "#eff6ff" : "#f5f3ff",
                border: `2px solid ${idx === 0 ? "#93c5fd" : "#a78bfa"}`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Options A–H: 2-column with image upload + preview */}
      <div>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px" }}><InlineIcon name="image" size={14} />Hình lựa chọn (A – H) — học sinh kéo thả</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "10px 12px",
                border: opt.imageUrl ? "2px solid #7c3aed" : "1.5px solid #e5e7eb",
                borderRadius: "12px",
                background: opt.imageUrl ? "#faf5ff" : "#f9fafb",
              }}
            >
              {/* Letter + image preview */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "30px", height: "30px", borderRadius: "6px",
                    background: "#1e3a8a", color: "#fff", fontWeight: 900, fontSize: "15px",
                    flexShrink: 0,
                  }}
                >
                  {opt.letter}
                </span>
                {opt.imageUrl ? (
                  <img
                    src={resolveImg(opt.imageUrl)}
                    alt={opt.letter}
                    style={{ flex: 1, height: "80px", objectFit: "contain", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    flex: 1, height: "80px", borderRadius: "8px",
                    background: "#f1f5f9", border: "2px dashed #cbd5e1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#94a3b8", fontSize: "12px", fontWeight: 600,
                  }}>
                    Chưa có hình
                  </div>
                )}
              </div>
              {/* URL input (GIF / external) + Upload button */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="text"
                  value={opt.imageUrl || ""}
                  onChange={(e) => updateOption(idx, "imageUrl", e.target.value)}
                  placeholder="URL hình / GIF..."
                  style={{ ...inputStyle, marginBottom: 0, flex: 1, minWidth: 0, fontSize: "12px" }}
                />
                <label
                  title="Hoặc upload từ máy"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px",
                    cursor: "pointer", padding: "6px 10px", borderRadius: "8px",
                    background: uploading[`opt-${idx}`] ? "#e5e7eb" : "#1e3a8a",
                    color: uploading[`opt-${idx}`] ? "#6b7280" : "#fff",
                    fontSize: "11px", fontWeight: 700, border: "none",
                    transition: "background 0.15s", flexShrink: 0, whiteSpace: "nowrap",
                  }}
                >
                  {uploading[`opt-${idx}`] ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="loading" size={12} />Uploading...</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="upload" size={12} />Upload</span>}
                  <input
                    type="file" accept="image/*,image/gif" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleUpload(file, `opt-${idx}`, (url) => updateOption(idx, "imageUrl", url));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {/* Description (optional) */}
              <input
                type="text"
                value={opt.description || ""}
                onChange={(e) => updateOption(idx, "description", e.target.value)}
                placeholder={`Mô tả ngắn (tùy chọn)`}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "12px" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── ImageTickEditor ────────────────────────────────────────────────────────
// Part 4: "Listen and tick the box" – 3-image multiple choice per question
export const ImageTickEditor = ({
  questions,
  onChange,
  startNumber = 1,
  exampleItem = null,
  onExampleChange = null,
  onUploadImage,
}) => {
  const [uploading, setUploading] = useState({});

  const doUpload = async (file, slotKey, applyUrl) => {
    if (!file || !onUploadImage) return;
    setUploading((p) => ({ ...p, [slotKey]: true }));
    try {
      const url = await onUploadImage(file);
      if (url) applyUrl(url);
    } catch (err) {
      console.error("ImageTickEditor upload error:", err);
    } finally {
      setUploading((p) => ({ ...p, [slotKey]: false }));
    }
  };

  const updateQ = (idx, field, val) => {
    const next = [...questions];
    next[idx] = { ...next[idx], questionNumber: startNumber + idx, [field]: val };
    onChange(next);
  };

  const updateQOpt = (qIdx, optIdx, val) => {
    const next = [...questions];
    const opts = [...(next[qIdx].imageOptions || [{}, {}, {}])];
    opts[optIdx] = { ...opts[optIdx], imageUrl: val };
    next[qIdx] = { ...next[qIdx], imageOptions: opts };
    onChange(next);
  };

  const updateExOpt = (optIdx, val) => {
    if (!onExampleChange) return;
    const opts = [...(exampleItem?.imageOptions || [{}, {}, {}])];
    opts[optIdx] = { ...opts[optIdx], imageUrl: val };
    onExampleChange({ ...(exampleItem || {}), imageOptions: opts });
  };

  /** Renders three A/B/C image slots for a question or example */
  const renderSlots = (q, isExample, correctLabel, onCorrectChange, getOptUrl, setOptUrl, keyPrefix) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "12px" }}>
      {["A", "B", "C"].map((letter, optIdx) => {
        const isCorrect = correctLabel === letter;
        const imgUrl = getOptUrl(optIdx) || "";
        const slotKey = `${keyPrefix}-${letter}`;
        return (
          <div
            key={letter}
            style={{
              border: `2.5px solid ${isExample ? (isCorrect ? "#0284c7" : "#d1d5db") : isCorrect ? "#f59e0b" : "#e5e7eb"}`,
              borderRadius: "14px",
              padding: "14px",
              background: isExample ? (isCorrect ? "#f0f9ff" : "white") : isCorrect ? "#fffbeb" : "white",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: isCorrect ? (isExample ? "0 0 0 3px #bae6fd55" : "0 0 0 3px #fde68a55") : "none",
            }}
          >
            {/* Letter + correct radio */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900, fontSize: "20px", color: isCorrect ? (isExample ? "#0284c7" : "#b45309") : "#374151" }}>
                {letter}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 700, color: isCorrect ? (isExample ? "#0284c7" : "#b45309") : "#6b7280" }}>
                <input
                  type="radio"
                  name={`correct_${keyPrefix}`}
                  checked={isCorrect}
                  onChange={() => onCorrectChange(letter)}
                  style={{ width: "16px", height: "16px", accentColor: isExample ? "#0284c7" : "#f59e0b" }}
                />
                Đúng
              </label>
            </div>
            {/* Preview */}
            <div style={{ width: "100%", height: "150px", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {imgUrl
                ? <img src={resolveImg(imgUrl)} alt={letter} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <InlineIcon name="image" size={28} style={{ color: "#d1d5db" }} />
              }
            </div>
            {/* URL input */}
            <input
              type="text"
              placeholder="URL hình..."
              value={imgUrl}
              onChange={(e) => setOptUrl(optIdx, e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, fontSize: "13px" }}
            />
            {/* Upload */}
            {onUploadImage && (
              <label style={{ display: "block", cursor: "pointer", textAlign: "center", fontSize: "13px", fontWeight: 700, padding: "8px 6px", borderRadius: "8px", background: uploading[slotKey] ? "#e5e7eb" : "#eef2ff", color: uploading[slotKey] ? "#9ca3af" : "#6366f1" }}>
                {uploading[slotKey] ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="loading" size={12} />Uploading...</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="upload" size={12} />Upload hình</span>}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) doUpload(f, slotKey, (url) => setOptUrl(optIdx, url));
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Example card ── */}
      {onExampleChange && (
        <div style={{ padding: "18px", border: "2px dashed #cbd5e1", borderRadius: "14px", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "52px", height: "30px", borderRadius: "999px", background: "#e2e8f0", color: "#475569", fontWeight: 800, fontSize: "13px", padding: "0 12px" }}>
              Ví dụ
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>Câu mẫu — không tính điểm</span>
          </div>
          <input
            type="text"
            placeholder="Câu hỏi mẫu (vd: Which fruit does Alex want?)"
            value={exampleItem?.questionText || ""}
            onChange={(e) => onExampleChange({ ...(exampleItem || {}), questionText: e.target.value })}
            style={inputStyle}
          />
          {renderSlots(
            exampleItem || {},
            true,
            exampleItem?.correctAnswer || "",
            (letter) => onExampleChange({ ...(exampleItem || {}), correctAnswer: letter }),
            (optIdx) => (exampleItem?.imageOptions?.[optIdx]?.imageUrl || ""),
            (optIdx, url) => updateExOpt(optIdx, url),
            "ex"
          )}
        </div>
      )}

      {/* ── Real questions ── */}
      {questions.map((q, idx) => (
        <div key={idx} style={{ padding: "20px", border: "1.5px solid #e5e7eb", borderRadius: "14px", background: "#f9fafb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "10px", background: "#fffbeb", color: "#b45309", fontWeight: 900, fontSize: "16px", border: "1.5px solid #fde68a" }}>
              {startNumber + idx}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#6b7280" }}>Câu {startNumber + idx}</span>
          </div>
          <input
            type="text"
            placeholder="Câu hỏi (vd: How did Lucy's cousin go to town?)"
            value={q.questionText || ""}
            onChange={(e) => updateQ(idx, "questionText", e.target.value)}
            style={inputStyle}
          />
          {renderSlots(
            q,
            false,
            q.correctAnswer || "",
            (letter) => updateQ(idx, "correctAnswer", letter),
            (optIdx) => (q.imageOptions?.[optIdx]?.imageUrl || ""),
            (optIdx, url) => updateQOpt(idx, optIdx, url),
            `q${idx}`
          )}
        </div>
      ))}
    </div>
  );
};

// ─── ColourWriteEditor ───────────────────────────────────────────────────────
// Part 5: "Listen and colour/write" – click-to-position approach.
// Teacher clicks the scene image inside each question card to mark WHERE the
// object is, then picks the correct colour from the palette. No free-drawing.
const COLOUR_PALETTE_EDITOR = [
  { label: "red",    hex: "#ef4444" },
  { label: "orange", hex: "#f97316" },
  { label: "yellow", hex: "#eab308" },
  { label: "green",  hex: "#22c55e" },
  { label: "blue",   hex: "#3b82f6" },
  { label: "purple", hex: "#a855f7" },
  { label: "pink",   hex: "#ec4899" },
  { label: "brown",  hex: "#92400e" },
  { label: "black",  hex: "#171717" },
  { label: "grey",   hex: "#6b7280" },
  { label: "white",  hex: "#f9fafb", border: "#d1d5db" },
];

export const ColourWriteEditor = ({
  questions,
  onChange,
  startNumber = 21,
  exampleItem = null,
  onExampleChange = null,
  sceneImageUrl = "",
  onSceneImageUrlChange = null,
  decoyPositions = [],
  onDecoyPositionsChange = null,
  onUploadImage,
}) => {
  const [uploading, setUploading] = useState({});
  const [addingDecoy, setAddingDecoy] = useState(false);
  const [decoyType, setDecoyType] = useState('colour'); // 'colour' | 'write'

  const updateQ = (idx, field, val) => {
    const next = [...questions];
    next[idx] = { ...next[idx], questionNumber: startNumber + idx, [field]: val };
    onChange(next);
  };

  const doUpload = async (file, slotKey, applyUrl) => {
    if (!file || !onUploadImage) return;
    setUploading((p) => ({ ...p, [slotKey]: true }));
    try {
      const url = await onUploadImage(file);
      if (url) applyUrl(url);
    } catch (err) {
      console.error("ColourWriteEditor upload error:", err);
    } finally {
      setUploading((p) => ({ ...p, [slotKey]: false }));
    }
  };

  // ── Position picker: teacher clicks image to mark where the object is ───
  const renderPositionPicker = ({ pos, onSet, onClear, color, label, isColour }) => {
    if (!sceneImageUrl) return (
      <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="image" size={12} />Upload hình đề thi ở trên trước để đánh dấu vị trí.</span>
      </p>
    );
    return (
      <div style={{ marginTop: "12px" }}>
        <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
          <InlineIcon name="pin" size={12} />
          Click vào hình để đánh dấu vị trí {isColour ? "đối tượng cần tô" : "chỗ cần viết"}:
        </div>
        <div
          style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "crosshair", border: "1.5px solid #e5e7eb", userSelect: "none" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSet({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
          }}
        >
          <img src={resolveImg(sceneImageUrl)} alt="scene" draggable={false}
            style={{ width: "100%", display: "block", objectFit: "contain", background: "#f8fafc" }} />
          {pos ? (
            isColour ? (
              <div style={{
                position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                width: "38px", height: "38px", borderRadius: "50%",
                background: color || "#94a3b8",
                border: "3px solid #fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "12px",
                color: ["white", "yellow"].includes(label) ? "#374151" : "#fff",
                pointerEvents: "none",
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}>{label}</div>
            ) : (
              <div style={{
                position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                background: "rgba(255,255,200,0.95)", border: "2px solid #1e293b",
                borderRadius: "7px", padding: "3px 10px",
                fontWeight: 800, fontSize: "13px", color: "#1e293b",
                pointerEvents: "none", whiteSpace: "nowrap",
                boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
                display: "inline-flex", alignItems: "center", gap: "6px",
              }}><InlineIcon name="writing" size={12} />{label}</div>
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.20)", pointerEvents: "none" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "13px", textShadow: "0 1px 3px rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: "8px" }}>
                Click để đánh dấu vị trí
              </span>
            </div>
          )}
        </div>
        {pos && (
          <button type="button" onClick={onClear}
            style={{ marginTop: "5px", fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="close" size={12} />Xóa vị trí</span>
          </button>
        )}
      </div>
    );
  };

  // ── Per-question card ────────────────────────────────────────────────────
  const renderCard = (q, isExample, idx) => {
    const correctAnswer = (isExample ? exampleItem?.correctAnswer : q?.correctAnswer) || "";
    const questionText  = (isExample ? exampleItem?.questionText  : q?.questionText)  || "";
    const taskType      = (isExample ? exampleItem?.taskType      : q?.taskType)      || "colour";
    const colorPos      = (isExample ? exampleItem?.colorPosition : q?.colorPosition) || null;
    const textPos       = (isExample ? exampleItem?.textPosition  : q?.textPosition)  || null;
    const activeHex     = COLOUR_PALETTE_EDITOR.find((c) => c.label === correctAnswer)?.hex;
    const qLabel        = isExample ? "VD" : String(startNumber + idx);

    const setField = (field, val) => {
      if (isExample) onExampleChange?.({ ...(exampleItem || {}), [field]: val });
      else updateQ(idx, field, val);
    };

    return (
      <div
        key={isExample ? "ex" : `q${idx}`}
        style={{
          padding: "16px",
          border: isExample ? "2px dashed #cbd5e1" : "1.5px solid #e5e7eb",
          borderRadius: "14px",
          background: isExample ? "#f8fafc" : "#f9fafb",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          {isExample ? (
            <span style={{ padding: "3px 12px", borderRadius: "999px", background: "#e2e8f0", color: "#475569", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>Ví dụ</span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "50%", background: "#fef2f2", color: "#b91c1c", fontWeight: 900, fontSize: "15px", border: "2px solid #fecaca", flexShrink: 0 }}>
              {startNumber + idx}
            </span>
          )}
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", flex: 1 }}>
            {isExample ? "Câu mẫu — không tính điểm" : `Câu ${startNumber + idx}`}
          </span>
        </div>

        {/* Question text */}
        <input
          type="text"
          placeholder={taskType === "colour" ? "Mô tả vật cần tô (vd: Colour the ball green)" : "Mô tả vị trí cần viết (vd: Write 'SCHOOL' on the girl's book)"}
          value={questionText}
          onChange={(e) => setField("questionText", e.target.value)}
          style={inputStyle}
        />

        {/* Task type toggle */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          {["colour", "write"].map((type) => (
            <label key={type} style={{
              display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
              fontSize: "13px", fontWeight: taskType === type ? 800 : 600,
              color: taskType === type ? (type === "colour" ? "#b91c1c" : "#1d4ed8") : "#6b7280",
              padding: "6px 14px", borderRadius: "8px",
              border: `2px solid ${taskType === type ? (type === "colour" ? "#fca5a5" : "#93c5fd") : "#e5e7eb"}`,
              background: taskType === type ? (type === "colour" ? "#fef2f2" : "#eff6ff") : "white",
              transition: "all 0.15s",
            }}>
              <input
                type="radio"
                name={`taskType_${isExample ? "ex" : `q${idx}`}`}
                checked={taskType === type}
                onChange={() => {
                  if (isExample) {
                    onExampleChange?.({ ...(exampleItem || {}), taskType: type, correctAnswer: "" });
                  } else {
                    const next = [...questions];
                    next[idx] = { ...next[idx], questionNumber: startNumber + idx, taskType: type, correctAnswer: "" };
                    onChange(next);
                  }
                }}
                style={{ accentColor: type === "colour" ? "#ef4444" : "#3b82f6" }}
              />
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name={type === "colour" ? "palette" : "writing"} size={14} />{type === "colour" ? "Tô màu" : "Viết từ"}</span>
            </label>
          ))}
        </div>

        {/* Answer + position picker */}
        {taskType === "colour" ? (
          <>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "7px", display: "flex", alignItems: "center", gap: "6px" }}><InlineIcon name="target" size={12} />Màu đúng:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
              {COLOUR_PALETTE_EDITOR.map((c) => (
                <button key={c.label} type="button" title={c.label}
                  onClick={() => setField("correctAnswer", c.label)}
                  style={{
                    width: correctAnswer === c.label ? "36px" : "28px",
                    height: correctAnswer === c.label ? "36px" : "28px",
                    borderRadius: "50%", background: c.hex, flexShrink: 0,
                    border: correctAnswer === c.label ? "3px solid #1e293b" : `2px solid ${c.border || "#e5e7eb"}`,
                    boxShadow: correctAnswer === c.label ? "0 0 0 2px #fff, 0 0 0 4px #1e293b" : "none",
                    transform: correctAnswer === c.label ? "scale(1.18)" : "scale(1)",
                    cursor: "pointer",
                    transition: "all 0.15s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
              ))}
              {correctAnswer && (
                <span style={{ padding: "4px 14px", borderRadius: "20px", background: activeHex || "#e2e8f0", color: ["white", "yellow"].includes(correctAnswer) ? "#374151" : "#fff", fontWeight: 800, fontSize: "13px", border: !activeHex ? "1px solid #d1d5db" : "none" }}>
                  {correctAnswer}
                </span>
              )}
            </div>
            {renderPositionPicker({ pos: colorPos, onSet: (p) => setField("colorPosition", p), onClear: () => setField("colorPosition", null), color: activeHex || "#94a3b8", label: qLabel, isColour: true })}
          </>
        ) : (
          <>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "7px", display: "flex", alignItems: "center", gap: "6px" }}><InlineIcon name="target" size={12} />Từ đúng:</div>
            <input
              type="text"
              placeholder="Từ cần viết (vd: SCHOOL)"
              value={correctAnswer}
              onChange={(e) => setField("correctAnswer", e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, fontWeight: 700, fontSize: "15px" }}
            />
            {renderPositionPicker({ pos: textPos, onSet: (p) => setField("textPosition", p), onClear: () => setField("textPosition", null), color: null, label: correctAnswer || "?", isColour: false })}
          </>
        )}
      </div>
    );
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Scene image overview with all markers */}
      <div style={{ padding: "18px", border: "1.5px solid #e5e7eb", borderRadius: "14px", background: "#f9fafb" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <InlineIcon name="image" size={16} />
          Hình đề thi
        </div>
        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
          {sceneImageUrl ? (
            <>
              <img
                src={resolveImg(sceneImageUrl)} alt="Scene" draggable={false}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "12px", cursor: addingDecoy ? "crosshair" : "default" }}
                onClick={(e) => {
                  if (!addingDecoy) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  onDecoyPositionsChange?.([...decoyPositions, { x, y, type: decoyType }]);
                  setAddingDecoy(false);
                }}
              />
              {/* Example marker */}
              {exampleItem?.colorPosition && (() => {
                const pos = exampleItem.colorPosition;
                const col = COLOUR_PALETTE_EDITOR.find((c) => c.label === exampleItem?.correctAnswer);
                return (
                  <div style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", width: "32px", height: "32px", borderRadius: "50%", background: col?.hex || "#94a3b8", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "10px", color: "#fff", pointerEvents: "none" }}>VD</div>
                );
              })()}
              {exampleItem?.textPosition && (
                <div style={{ position: "absolute", left: `${exampleItem.textPosition.x}%`, top: `${exampleItem.textPosition.y}%`, transform: "translate(-50%, -50%)", background: "rgba(255,255,200,0.95)", border: "2px solid #1e293b", borderRadius: "7px", padding: "3px 8px", fontWeight: 800, fontSize: "12px", color: "#1e293b", pointerEvents: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="writing" size={12} />VD</div>
              )}
              {/* Question markers */}
              {questions.map((q, idx) => {
                const pos = q.colorPosition || q.textPosition;
                if (!pos) return null;
                const col = COLOUR_PALETTE_EDITOR.find((c) => c.label === q.correctAnswer);
                const isColour = (q.taskType || "colour") !== "write";
                return (
                  <div key={idx} style={{
                    position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "30px", height: "30px",
                    borderRadius: isColour ? "50%" : "6px",
                    background: isColour ? (col?.hex || "#94a3b8") : "rgba(255,255,200,0.95)",
                    border: isColour ? "2px solid #fff" : "2px solid #1e293b",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "11px",
                    color: isColour ? "#fff" : "#1e293b",
                    pointerEvents: "none",
                    textShadow: isColour ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                  }}>
                    {startNumber + idx}
                  </div>
                );
              })}
              {/* Decoy markers */}
              {decoyPositions.map((pos, di) => {
                const dType = pos.type || 'colour';
                return dType === 'write' ? (
                  <div key={`decoy-${di}`} title={`Decoy chữ ${di + 1} — click để xóa`}
                    onClick={(e) => { e.stopPropagation(); onDecoyPositionsChange?.(decoyPositions.filter((_, i) => i !== di)); }}
                    style={{
                      position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)", zIndex: 10,
                      background: "rgba(255,255,200,0.88)", border: "2px dashed #f59e0b",
                      borderRadius: "7px", padding: "3px 8px", cursor: "pointer",
                      fontWeight: 800, fontSize: "11px", color: "#92400e",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.20)", whiteSpace: "nowrap",
                      display: "inline-flex", alignItems: "center", gap: "4px",
                    }}><InlineIcon name="writing" size={11} />mồi x</div>
                ) : (
                  <div key={`decoy-${di}`} title={`Decoy màu ${di + 1} — click để xóa`}
                    onClick={(e) => { e.stopPropagation(); onDecoyPositionsChange?.(decoyPositions.filter((_, i) => i !== di)); }}
                    style={{
                      position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(100,116,139,0.7)", border: "2px dashed #fff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: "14px", color: "#fff",
                      cursor: "pointer", zIndex: 10,
                    }}><InlineIcon name="close" size={14} style={{ color: "#fff" }} /></div>
                );
              })}
              {/* Overlay hint when in decoy-adding mode */}
              {addingDecoy && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "14px", pointerEvents: "none" }}>
                  <span style={{ background: "rgba(124,58,237,0.85)", color: "#fff", fontWeight: 800, fontSize: "13px", padding: "6px 18px", borderRadius: "20px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="target" size={12} style={{ color: "#fff" }} />Click vào hình để đặt {decoyType === 'write' ? 'ô chữ mồi' : 'vòng tròn mồi'}</span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ minHeight: "160px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "12px" }}>
              <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="image" size={14} />Chưa có hình — Upload hình bên dưới</span>
            </div>
          )}
        </div>

        {/* URL + upload */}
        <input
          type="text"
          placeholder="URL hình đề thi..."
          value={sceneImageUrl}
          onChange={(e) => onSceneImageUrlChange?.(e.target.value)}
          style={{ ...inputStyle, marginBottom: "10px" }}
        />
        {onUploadImage && (
          <label style={{ display: "inline-block", cursor: "pointer", fontSize: "13px", fontWeight: 700, padding: "8px 18px", borderRadius: "8px", background: uploading["scene"] ? "#e5e7eb" : "#eef2ff", color: uploading["scene"] ? "#9ca3af" : "#6366f1" }}>
            {uploading["scene"] ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="loading" size={12} />Uploading...</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><InlineIcon name="upload" size={12} />Upload hình đề</span>}
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f, "scene", (url) => onSceneImageUrlChange?.(url)); e.target.value = ""; }}
            />
          </label>
        )}

        {/* Decoy circle controls */}
        {sceneImageUrl && onDecoyPositionsChange && (
          <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "10px", background: "#faf5ff", border: "1.5px dashed #a78bfa" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <InlineIcon name="target" size={12} />
              Vòng tròn mồi (Decoy) — học sinh sẽ thấy nhưng không phải câu hỏi thật
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Decoy type toggle */}
              {[{ val: 'colour', label: 'Vòng tròn', iconName: 'palette' }, { val: 'write', label: 'Ô chữ', iconName: 'writing' }].map(opt => (
                <button key={opt.val} type="button" onClick={() => setDecoyType(opt.val)}
                  style={{ padding: "5px 12px", borderRadius: "7px", fontWeight: 700, fontSize: "11px", cursor: "pointer",
                    border: `1.5px solid ${decoyType === opt.val ? '#7c3aed' : '#d1d5db'}`,
                    background: decoyType === opt.val ? '#ede9fe' : '#fff',
                    color: decoyType === opt.val ? '#7c3aed' : '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name={opt.iconName} size={12} />{opt.label}</button>
              ))}
              <button type="button"
                onClick={() => setAddingDecoy((v) => !v)}
                style={{ padding: "6px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer", border: addingDecoy ? "2px solid #7c3aed" : "1.5px solid #a78bfa", background: addingDecoy ? "#ede9fe" : "#fff", color: "#7c3aed" }}>
                {addingDecoy ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="close" size={12} />Hủy</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="create" size={12} />Thêm {decoyType === 'write' ? 'ô chữ mồi' : 'vòng tròn mồi'}</span>}
              </button>
              {decoyPositions.length > 0 && (
                <>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{decoyPositions.length} decoy đã đặt ({decoyPositions.filter(d => (d.type||'colour') === 'write').length} ô chữ, {decoyPositions.filter(d => (d.type||'colour') !== 'write').length} vòng tròn)</span>
                  <button type="button" onClick={() => onDecoyPositionsChange?.([])}
                    style={{ padding: "4px 10px", borderRadius: "7px", fontWeight: 700, fontSize: "11px", cursor: "pointer", border: "1px solid #fca5a5", background: "#fef2f2", color: "#ef4444" }}>
                    Xóa tất cả
                  </button>
                </>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
              Click "+ Thêm decoy" rồi click vào hình để đặt. Trong thi sinh xem vòng tròn mồi trông giống hệt vòng tròn câu hỏi.
            </div>
          </div>
        )}
      </div>

      {/* Example */}
      {onExampleChange && renderCard(exampleItem || {}, true, -1)}

      {/* Questions */}
      {questions.map((q, idx) => renderCard(q, false, idx))}
    </div>
  );
};
