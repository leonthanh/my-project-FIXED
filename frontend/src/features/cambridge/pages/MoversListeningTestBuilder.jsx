/**
 * MoversListeningTestBuilder.jsx
 * Specialized builder for Cambridge MOVERS Listening (A1)
 * Fixed 5-part structure with per-part guided editors.
 *
 * Part 1 – Draw Lines   (matching: names ↔ positions)
 * Part 2 – Write Names  (fill: name/word blanks)
 * Part 3 – Tick a Box   (multiple-choice-pictures: A/B/C images)
 * Part 4 – Fill a Form  (fill: info form blanks)
 * Part 5 – Colour/Write (fill: colour + word instructions)
 */
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiPath, authFetch, hostPath } from "../../../shared/utils/api";
import { AdminNavbar } from "../../../shared/components";
import {
  inputStyle,
  labelStyle,
  PartTab,
  TipBox,
  FillQuestionsEditor,
  MatchingPartEditor,
  PictureQuestionsEditor,
  LetterMatchingEditor,
} from "../components/MoversListeningEditorComponents";

const resolveImg = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return hostPath(url);
};

// ── Part configuration ─────────────────────────────────────────────────────
const PART_CONFIGS = [
  {
    part: 1,
    emoji: "🔗",
    title: "Part 1 – Draw Lines",
    titleVi: "Nối tên với vị trí trong tranh",
    instruction: "Listen and draw lines. There is one example.",
    questionType: "matching",
    questionCount: 5,
    tip: "Học sinh nghe và nối 5 tên người với vị trí trong tranh. Nhập tên ở cột trái (dòng đầu = Example), vị trí A–F ở cột phải, rồi chọn chữ cái đúng cho từng tên.",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    part: 2,
    emoji: "✏️",
    title: "Part 2 – Write Names",
    titleVi: "Nghe và điền tên / thông tin",
    instruction: "Listen and write. There is one example.",
    questionType: "fill",
    questionCount: 5,
    tip: "Học sinh nghe hội thoại và điền tên người / tên đồ vật / màu sắc vào chỗ trống. Mỗi câu = 1 blank.",
    color: "#10b981",
    bg: "#f0fdf4",
  },
  {
    part: 3,
    emoji: "🎯",
    title: "Part 3 – Letter Matching",
    titleVi: "Nghe và điền chữ cái vào ô",
    instruction: "Listen and write a letter in each box. There is one example.",
    questionType: "letter-matching",
    questionCount: 5,
    tip: "Học sinh nghe và điền chữ cái (A–H) ứng với hoạt động mỗi người sẽ làm. Nhập tên nhân vật, URL ảnh (tùy chọn), đáp án chữ cái đúng, và mô tả lựa chọn A–H.",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    part: 4,
    emoji: "📋",
    title: "Part 4 – Write in a Form",
    titleVi: "Nghe và điền thông tin vào form",
    instruction: "Listen and write. There is one example.",
    questionType: "fill",
    questionCount: 5,
    tip: "Học sinh nghe hội thoại và điền thông tin (tên, số, thứ, màu, …) vào các ô form/bảng.",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    part: 5,
    emoji: "🎨",
    title: "Part 5 – Colour and Write",
    titleVi: "Nghe và tô màu / viết từ vào tranh",
    instruction: "Listen and colour and write. There is one example.",
    questionType: "fill",
    questionCount: 5,
    tip: "Học sinh nghe hướng dẫn và tô màu vào vật trong tranh hoặc viết từ vào vị trí được chỉ định.",
    color: "#ef4444",
    bg: "#fef2f2",
  },
];

// ── Default question templates ────────────────────────────────────────────
const defaultMatchingData = () => ({
  questionType: "draw-lines",
  questionText: "Match the names with the correct positions in the picture.",
  leftTitle: "Names",
  rightTitle: "Positions",
  leftItems: ["(Example)", "", "", "", "", ""],
  rightItems: ["A. ", "B. ", "C. ", "D. ", "E. ", "F. "],
  answers: {},
  anchors: {}, // { nameIndex: { x: %, y: %, label: name } }
});

const defaultFillQuestion = (num) => ({
  questionNumber: num,
  questionText: "",
  correctAnswer: "",
});

const defaultFillExample = () => ({
  questionText: "",
  correctAnswer: "",
});

const defaultLetterMatchingData = () => ({
  questionType: "letter-matching",
  questionText: "",
  people: Array.from({ length: 6 }, (_, i) => ({
    name: "",
    photoUrl: "",
    correctAnswer: "",
    isExample: i === 0,
  })),
  options: "ABCDEFGH".split("").map((l) => ({ letter: l, description: "", imageUrl: "" })),
});

const defaultPictureQuestion = (num) => ({
  questionNumber: num,
  questionText: "",
  imageOptions: [
    { imageUrl: "", text: "A" },
    { imageUrl: "", text: "B" },
    { imageUrl: "", text: "C" },
  ],
  correctAnswer: "",
});

const getPartStartNumber = (partIdx) =>
  PART_CONFIGS.slice(0, partIdx).reduce((sum, cfg) => sum + Number(cfg.questionCount || 0), 1);

const getDefaultQuestions = (qt, count, startNumber = 1) => {
  if (qt === "letter-matching") return [defaultLetterMatchingData()];
  if (qt === "matching") return [defaultMatchingData()];
  if (qt === "multiple-choice-pictures")
    return Array.from({ length: count }, (_, i) => defaultPictureQuestion(startNumber + i));
  return Array.from({ length: count }, (_, i) => defaultFillQuestion(startNumber + i));
};

const buildInitialParts = () =>
  PART_CONFIGS.map((cfg, partIdx) => ({
    partNumber: cfg.part,
    title: cfg.title,
    instruction: cfg.instruction,
    audioUrl: "",
    imageUrl: "",
    sections: [
      {
        sectionTitle: "",
        questionType: cfg.questionType,
        questions: getDefaultQuestions(cfg.questionType, cfg.questionCount, getPartStartNumber(partIdx)),
        ...(cfg.part === 2 ? { exampleItem: defaultFillExample() } : {}),
      },
    ],
  }));

const normalizeDrawLineQuestion = (question) => {
  if (!question || typeof question !== "object") return question;
  const hasAnchors = question.anchors && typeof question.anchors === "object";
  const isDrawLines = question.questionType === "draw-lines" || hasAnchors;
  if (!isDrawLines) return question;

  const leftItems = Array.isArray(question.leftItems) ? question.leftItems : ["(Example)", "", "", "", "", ""];
  const answerCount = Math.max(0, leftItems.length - 1);
  const normalizedAnswers = {};
  for (let i = 1; i <= answerCount; i += 1) {
    normalizedAnswers[String(i)] = String.fromCharCode(64 + i);
  }

  const existingRightItems = Array.isArray(question.rightItems) ? question.rightItems : [];
  const normalizedRightItems = Array.from({ length: answerCount }, (_, idx) => {
    const fallback = `${String.fromCharCode(65 + idx)}. `;
    const current = existingRightItems[idx];
    if (!current) return fallback;
    return String(current).match(/^[A-Z]\.\s*/)
      ? String(current)
      : `${String.fromCharCode(65 + idx)}. ${String(current).replace(/^[A-Z]\.\s*/, "")}`;
  });

  return {
    ...question,
    questionType: "draw-lines",
    rightItems: normalizedRightItems,
    answers: normalizedAnswers,
  };
};

const normalizeMoversParts = (parts) => {
  if (!Array.isArray(parts)) return buildInitialParts();
  return parts.map((part, partIdx) => ({
    ...part,
    sections: Array.isArray(part?.sections)
      ? part.sections.map((section, secIdx) => ({
          ...section,
          questions: Array.isArray(section?.questions)
            ? section.questions.map((question, qIdx) => (
                partIdx === 0 && secIdx === 0 && qIdx === 0
                  ? normalizeDrawLineQuestion(question)
                  : {
                      ...question,
                      ...((PART_CONFIGS[partIdx]?.questionType === "fill" ||
                        PART_CONFIGS[partIdx]?.questionType === "multiple-choice-pictures")
                        ? { questionNumber: getPartStartNumber(partIdx) + qIdx }
                        : {}),
                    }
              ))
            : getDefaultQuestions(
                PART_CONFIGS[partIdx]?.questionType,
                PART_CONFIGS[partIdx]?.questionCount || 0,
                getPartStartNumber(partIdx)
              ),
          ...(partIdx === 1 && secIdx === 0
            ? {
                exampleItem: {
                  ...defaultFillExample(),
                  ...(section?.exampleItem || {}),
                },
              }
            : {}),
        }))
      : part?.sections,
  }));
};

// ── Shared styles ─────────────────────────────────────────────────────────

// Main builder component
const MoversListeningTestBuilder = ({ editId = null, initialData = null }) => {
  const navigate = useNavigate();
  const isEditMode = Boolean(editId);

  const [title, setTitle] = useState(initialData?.title || "");
  const [classCode, setClassCode] = useState(initialData?.classCode || "");
  const [teacherName, setTeacherName] = useState(() => {
    if (initialData?.teacherName) return initialData.teacherName;
    try { return JSON.parse(localStorage.getItem("user"))?.name || ""; } catch { return ""; }
  });
  const [mainAudioUrl, setMainAudioUrl] = useState(initialData?.mainAudioUrl || "");
  const [parts, setParts] = useState(() => {
    if (initialData?.parts && Array.isArray(initialData.parts) && initialData.parts.length === 5) {
      return normalizeMoversParts(initialData.parts);
    }
    return buildInitialParts();
  });
  const [activePartIdx, setActivePartIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Re-hydrate if initialData arrives late (edit page async fetch)
  React.useEffect(() => {
    if (!initialData) return;
    setTitle(initialData.title || "");
    setClassCode(initialData.classCode || "");
    setTeacherName(initialData.teacherName || "");
    setMainAudioUrl(initialData.mainAudioUrl || "");
    if (Array.isArray(initialData.parts) && initialData.parts.length === 5) {
      setParts(normalizeMoversParts(initialData.parts));
    }
  }, [initialData]);

  const cfg = PART_CONFIGS[activePartIdx];
  const activePart = parts[activePartIdx];

  // Update a field on the active part
  const updatePart = useCallback(
    (field, val) => {
      setParts((prev) => {
        const next = [...prev];
        next[activePartIdx] = { ...next[activePartIdx], [field]: val };
        return next;
      });
    },
    [activePartIdx]
  );

  // Update questions in the first section of the active part
  const updateQuestions = useCallback(
    (newQuestions) => {
      setParts((prev) => {
        const next = [...prev];
        const part = { ...next[activePartIdx] };
        part.sections = part.sections.map((sec, si) =>
          si === 0 ? { ...sec, questions: newQuestions } : sec
        );
        next[activePartIdx] = part;
        return next;
      });
    },
    [activePartIdx]
  );

  const updateFirstSection = useCallback(
    (patch) => {
      setParts((prev) => {
        const next = [...prev];
        const part = { ...next[activePartIdx] };
        part.sections = part.sections.map((sec, si) =>
          si === 0 ? { ...sec, ...patch } : sec
        );
        next[activePartIdx] = part;
        return next;
      });
    },
    [activePartIdx]
  );

  const currentSection = activePart?.sections?.[0] || {};
  const currentQuestions = currentSection?.questions || [];
  const currentExampleItem = currentSection?.exampleItem || defaultFillExample();
  const currentStartNumber = getPartStartNumber(activePartIdx);

  // Completion check for sidebar indicator
  const isPartComplete = (partIdx) => {
    const p = parts[partIdx];
    const qs = p?.sections?.[0]?.questions || [];
    const qt = PART_CONFIGS[partIdx]?.questionType;
    if (qt === "matching") {
      const d = qs[0];
      return (
        (d?.leftItems?.filter((n, i) => i > 0 && n.trim()).length || 0) >= 3
      );
    }
    if (qt === "letter-matching") {
      const q0 = qs[0] || {};
      const people = Array.isArray(q0.people) ? q0.people : [];
      return people.slice(1).filter((p) => p.name && p.correctAnswer).length >= 5;
    }
    return qs.filter((q) => q.correctAnswer).length >= 3;
  };

  // Audio upload helper
  const handleAudioUpload = async (file, isGlobal) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("audio", file);
    setUploadingAudio(true);
    try {
      const res = await authFetch(apiPath("upload/audio"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload thất bại");
      const { url } = await res.json();
      if (isGlobal) {
        setMainAudioUrl(url);
      } else {
        updatePart("audioUrl", url);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSubmit = async (status = "published") => {
    if (!title.trim())
      return setMessage({ type: "error", text: "Vui lòng nhập tiêu đề đề thi!" });
    if (!classCode.trim())
      return setMessage({ type: "error", text: "Vui lòng nhập mã lớp!" });

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        title: title.trim(),
        classCode: classCode.trim(),
        teacherName: teacherName.trim(),
        testType: "movers-listening",
        mainAudioUrl: mainAudioUrl || null,
        parts: normalizeMoversParts(parts),
        totalQuestions: 25,
        status,
      };

      const url = isEditMode
        ? apiPath(`cambridge/listening-tests/${editId}`)
        : apiPath("cambridge/listening-tests");
      const method = isEditMode ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || (isEditMode ? "Lỗi khi cập nhật đề thi" : "Lỗi khi tạo đề thi"));
      }

      setMessage({
        type: "success",
        text: isEditMode
          ? `✅ Đề thi "${title}" đã được cập nhật!`
          : `✅ Đề thi "${title}" đã được tạo thành công!`,
      });
      setTimeout(() => navigate("/select-test"), 1500);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <AdminNavbar />
      <div style={{ display: "flex", flex: 1 }}>
      {/* ── Left sidebar ── */}
      <div
        style={{
          width: "244px",
          flexShrink: 0,
          background: "white",
          borderRight: "1px solid #e5e7eb",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 800,
            color: "#1e293b",
            margin: "0 0 2px",
          }}
        >
          🚗 MOVERS Listening
        </h2>
        <p
          style={{
            fontSize: "11px",
            color: "#6b7280",
            margin: "0 0 18px",
          }}
        >
          25 câu · 5 parts · 25 phút
        </p>

        {PART_CONFIGS.map((c, i) => (
          <PartTab
            key={i}
            cfg={c}
            isActive={activePartIdx === i}
            isComplete={isPartComplete(i)}
            onClick={() => setActivePartIdx(i)}
          />
        ))}

        <div style={{ flex: 1 }} />

        <div
          style={{
            borderTop: "1px solid #f1f5f9",
            paddingTop: "16px",
            marginTop: "16px",
          }}
        >
          <button
            onClick={() => handleSubmit("published")}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: isSubmitting ? "#9ca3af" : "#6366f1",
              color: "white",
              fontWeight: 700,
              fontSize: "14px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              marginBottom: "8px",
            }}
          >
            {isSubmitting ? "Đang lưu…" : isEditMode ? "💾 Cập nhật" : "🚀 Xuất bản"}
          </button>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "9px",
              border: "2px solid #e5e7eb",
              background: "white",
              color: "#374151",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            💾 Lưu nháp
          </button>

          {message.text && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                background:
                  message.type === "success" ? "#f0fdf4" : "#fef2f2",
                color: message.type === "success" ? "#15803d" : "#dc2626",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
        {/* Test metadata card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px 24px",
            border: "1px solid #e5e7eb",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "15px",
              fontWeight: 800,
              color: "#1e293b",
            }}
          >
            📄 Thông tin đề thi
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "14px",
              marginBottom: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>Tiêu đề *</label>
              <input
                type="text"
                placeholder="VD: MOVERS Listening Test – Tháng 10"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mã lớp *</label>
              <input
                type="text"
                placeholder="VD: 5A / OCT2025"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Giáo viên</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Global audio */}
          <div>
            <label style={labelStyle}>
              🎵 Audio chính (toàn bài — hoặc upload riêng cho từng Part bên
              dưới)
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Paste URL mp3 (https://...) hoặc upload file"
                value={mainAudioUrl}
                onChange={(e) => setMainAudioUrl(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <label
                style={{
                  padding: "9px 16px",
                  borderRadius: "7px",
                  cursor: uploadingAudio ? "not-allowed" : "pointer",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  color: "#374151",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {uploadingAudio ? "⏳ Đang upload…" : "📤 Upload"}
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleAudioUpload(e.target.files[0], true)
                  }
                />
              </label>
            </div>
            {mainAudioUrl && (
              <audio
                controls
                src={mainAudioUrl}
                style={{ marginTop: "10px", width: "100%" }}
              />
            )}
          </div>
        </div>

        {/* Active part editor card */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: `2px solid ${cfg.color}30`,
            overflow: "hidden",
          }}
        >
          {/* Part header bar */}
          <div
            style={{
              padding: "18px 24px",
              background: cfg.bg,
              borderBottom: `1px solid ${cfg.color}30`,
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "32px" }}>{cfg.emoji}</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 800,
                  color: cfg.color,
                }}
              >
                {cfg.title}
              </h2>
              <p
                style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}
              >
                {cfg.titleVi} · {cfg.questionCount} câu hỏi
              </p>
            </div>
          </div>

          <div style={{ padding: "24px" }}>
            <TipBox cfg={cfg} />

            {/* Part settings row */}
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <label style={labelStyle}>📝 Lời dẫn (instruction cho học sinh)</label>
              <input
                type="text"
                value={activePart.instruction || ""}
                onChange={(e) => updatePart("instruction", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Part scene image — full width, with upload */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                ...labelStyle,
                fontSize: "13px",
                color: cfg.color,
                fontWeight: 800,
              }}>
                🖼️ {cfg.part === 1 ? "Hình minh hoạ Part 1 (scene picture — bắt buộc)" : "URL hình minh hoạ cho Part (nếu có)"}
              </label>
              {cfg.part === 1 && (
                <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 8px", lineHeight: 1.5 }}>
                  Đây là bức tranh toàn cảnh mà học sinh nhìn vào để nối tên (VD: khu vườn có nhiều nhân vật). Paste URL hoặc upload file ảnh.
                </p>
              )}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="https://... hoặc /uploads/..."
                  value={activePart.imageUrl || ""}
                  onChange={(e) => updatePart("imageUrl", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                <label style={{
                  padding: "9px 16px",
                  borderRadius: "7px",
                  cursor: uploadingAudio ? "not-allowed" : "pointer",
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}60`,
                  fontSize: "13px",
                  color: cfg.color,
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  🖼️ Upload ảnh
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("image", file);
                      setUploadingAudio(true);
                      try {
                        const res = await authFetch(apiPath("upload/cambridge-image"), { method: "POST", body: fd });
                        if (!res.ok) throw new Error("Upload thất bại");
                        const { url } = await res.json();
                        updatePart("imageUrl", url);
                      } catch (err) {
                        setMessage({ type: "error", text: err.message });
                      } finally {
                        setUploadingAudio(false);
                      }
                    }}
                  />
                </label>
              </div>
              {activePart.imageUrl && (
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <img
                    src={resolveImg(activePart.imageUrl)}
                    alt="Part scene"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "320px",
                      objectFit: "contain",
                      borderRadius: "10px",
                      border: `2px solid ${cfg.color}40`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Per-part audio override */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>
                🎵 Audio riêng Part {cfg.part} (tuỳ chọn – ghi đè audio
                chính)
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Để trống = dùng audio chính ở trên"
                  value={activePart.audioUrl || ""}
                  onChange={(e) => updatePart("audioUrl", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                <label
                  style={{
                    padding: "9px 16px",
                    borderRadius: "7px",
                    cursor: "pointer",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    color: "#374151",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  📤 Upload
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleAudioUpload(e.target.files[0], false)
                    }
                  />
                </label>
              </div>
              {activePart.audioUrl && (
                <audio
                  controls
                  src={activePart.audioUrl}
                  style={{ marginTop: "10px", width: "100%" }}
                />
              )}
            </div>

            {/* Question editor — switches by questionType */}
            <div>
              <h4
                style={{
                  margin: "0 0 16px",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "4px",
                    height: "18px",
                    background: cfg.color,
                    borderRadius: "2px",
                  }}
                />
                ✏️ Câu hỏi Part {cfg.part}
              </h4>

              {cfg.questionType === "fill" && (
                <FillQuestionsEditor
                  questions={currentQuestions}
                  onChange={updateQuestions}
                  color={cfg.color}
                  startNumber={currentStartNumber}
                  exampleItem={cfg.part === 2 ? currentExampleItem : null}
                  onExampleChange={cfg.part === 2 ? (exampleItem) => updateFirstSection({ exampleItem }) : null}
                  imageTitle={cfg.part === 2 ? (currentSection?.imageTitle || '') : undefined}
                  onImageTitleChange={cfg.part === 2 ? (imageTitle) => updateFirstSection({ imageTitle }) : null}
                />
              )}

              {cfg.questionType === "matching" && (
                <MatchingPartEditor
                  data={currentQuestions[0] || defaultMatchingData()}
                  onChange={(newData) => updateQuestions([newData])}
                  partImageUrl={activePart.imageUrl || ""}
                />
              )}

              {cfg.questionType === "multiple-choice-pictures" && (
                <PictureQuestionsEditor
                  questions={currentQuestions}
                  onChange={updateQuestions}
                  startNumber={currentStartNumber}
                />
              )}

              {cfg.questionType === "letter-matching" && (
                <LetterMatchingEditor
                  data={currentQuestions[0] || defaultLetterMatchingData()}
                  onChange={(newData) => updateQuestions([newData])}
                  onUploadImage={async (file) => {
                    const fd = new FormData();
                    fd.append("image", file);
                    const res = await authFetch(apiPath("upload/cambridge-image"), { method: "POST", body: fd });
                    if (!res.ok) throw new Error("Upload thất bại");
                    const { url } = await res.json();
                    return url;
                  }}
                />
              )}
            </div>

            {/* Part navigation footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <button
                onClick={() =>
                  setActivePartIdx(Math.max(0, activePartIdx - 1))
                }
                disabled={activePartIdx === 0}
                style={{
                  padding: "10px 22px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "white",
                  cursor: activePartIdx === 0 ? "not-allowed" : "pointer",
                  color: activePartIdx === 0 ? "#9ca3af" : "#374151",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                ← Part {cfg.part > 1 ? cfg.part - 1 : ""}
              </button>
              <button
                onClick={() =>
                  setActivePartIdx(Math.min(4, activePartIdx + 1))
                }
                disabled={activePartIdx === 4}
                style={{
                  padding: "10px 22px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    activePartIdx === 4 ? "#e5e7eb" : cfg.color,
                  cursor: activePartIdx === 4 ? "not-allowed" : "pointer",
                  color: activePartIdx === 4 ? "#9ca3af" : "white",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                Part {cfg.part < 5 ? cfg.part + 1 : ""} →
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MoversListeningTestBuilder;
