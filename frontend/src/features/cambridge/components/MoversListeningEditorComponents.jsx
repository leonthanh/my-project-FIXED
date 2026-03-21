import React, { useState, useRef } from "react";
import { hostPath } from "../../../shared/utils/api";

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
    <span style={{ fontSize: "20px" }}>{cfg.emoji}</span>
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
      <span style={{ fontSize: "14px", color: "#10b981" }}>✓</span>
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
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            🏷️ Tiêu đề hình ảnh — hiển thị to bên UI học sinh
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
        // Parse correctAnswer string (slash‑separated) thành mảng để hiển thị từng row
        const rawParts = String(q.correctAnswer || '').split('/').map((s) => s.trim());
        const answerParts = rawParts.length && rawParts.some(Boolean) ? rawParts : [''];
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

              {answerParts.map((ans, aIdx) => (
                <div key={aIdx} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{
                    minWidth: "22px", fontSize: "11px", fontWeight: 700,
                    color: aIdx === 0 ? color : "#94a3b8", textAlign: "center",
                  }}>
                    {aIdx === 0 ? "①" : `②③④⑤`[aIdx - 1] ?? `${aIdx + 1}.`}
                  </span>
                  <input
                    type="text"
                    placeholder={aIdx === 0 ? "Đáp án chính" : `Đáp án thay thế ${aIdx + 1}`}
                    value={ans}
                    onChange={(e) => {
                      const next = [...answerParts];
                      next[aIdx] = e.target.value.replace(/\//g, '');
                      setAnswerParts(next);
                    }}
                    style={{
                      ...inputStyle,
                      marginBottom: 0,
                      flex: 1,
                      borderColor: ans ? color : "#d1d5db",
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
                    >×</button>
                  )}
                </div>
              ))}

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
    if (pendingIdx === null || !imgRef.current) return;
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
                    {anchor ? "●" : "📍"}
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
                    ×
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
            style={{ position: "relative", display: "inline-block", width: "100%", cursor: pendingIdx !== null ? "crosshair" : "default" }}
            onClick={handleImageClick}
          >
            <img
              ref={imgRef}
              src={resolveImg(partImageUrl)}
              alt="Part scene"
              style={{ width: "100%", display: "block", borderRadius: "10px", border: "2px solid #e2e8f0", userSelect: "none" }}
              draggable={false}
            />
            {Object.entries(anchors).map(([idxStr, pos]) => {
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
                      ×
                    </span>
                  </div>
                </div>
              );
            })}
            {pendingIdx !== null && (
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

