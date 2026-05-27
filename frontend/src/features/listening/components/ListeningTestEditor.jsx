import React, { useState, useRef, useEffect } from "react";
import { IeltsTestEditorShell } from "../../../shared/components";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import { useColumnLayout } from "../hooks";
import ListeningQuestionEditor from "./ListeningQuestionEditor";
import TableCompletion from "../../../shared/components/questions/editors/TableCompletion.jsx";
import {
  countFlowchartQuestionSlots,
  getConfiguredFlowchartOptionEntries,
  getFlowchartBlankEntries,
  getFlowchartOptionTableRows,
  splitFlowchartStepText,
} from "../utils/flowchart";
import {
  countListeningSectionQuestions,
  getListeningSectionType,
  getListeningTableBlankEntries,
  getListeningTableQuestionData,
  LISTENING_CLOZE_TYPE,
} from "../utils/clozeTableSchema";

import {
  colors,
  compactInputStyle,
  modalStyles,
  modalContentStyles,
  modalHeaderStyles,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  audioUploadStyle,
  audioUploadActiveStyle,
  compactCSS,
} from "../utils/styles";
import { calculateTotalQuestions, computeQuestionStarts } from "../hooks/useListeningHandlers";
import { useTheme } from "../../../shared/contexts/ThemeContext";

const countSectionQuestions = (section) => {
  return countListeningSectionQuestions(section);
};

const formatNotesHtml = (notesText = '') => {
  if (!notesText) return '';
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(notesText);
  if (hasHtml) return notesText;
  return String(notesText).replace(/\n/g, '<br/>');
};

const questionTypeFieldShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: "240px",
};

const questionTypeFieldSelectWrapStyle = {
  position: "relative",
  flex: "1 1 auto",
  minWidth: 0,
};

const questionTypeFieldSelectStyle = {
  ...compactInputStyle,
  width: "100%",
  marginBottom: 0,
  paddingLeft: "12px",
  paddingRight: "42px",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundColor: "#fff",
  cursor: "pointer",
  color: "#111827",
  fontWeight: 600,
};

const questionTypeFieldLeadingStyle = {
  flexShrink: 0,
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#b45309",
  backgroundColor: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: "8px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  pointerEvents: "none",
};

const questionTypeFieldTrailingStyle = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: colors.gray,
  pointerEvents: "none",
};

const QuestionTypeSelectField = ({ value, onChange, options, style }) => {
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div style={{ ...questionTypeFieldShellStyle, ...style }}>
      <span style={questionTypeFieldLeadingStyle}>
        <LineIcon name={selected?.icon || "questions"} size={18} strokeWidth={2.2} />
      </span>
      <div style={questionTypeFieldSelectWrapStyle}>
        <select value={value} onChange={(event) => onChange(event.target.value)} style={questionTypeFieldSelectStyle}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={questionTypeFieldTrailingStyle}>
          <LineIcon name="chevron-down" size={18} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
};

/**
 * Tính số câu hỏi bắt đầu cho một section cụ thể
 * Dựa trên tổng số câu hỏi của tất cả parts/sections trước đó
 */
const calculateStartingQuestionNumber = (parts, partIndex, sectionIndex) => {
  let total = 1; // Bắt đầu từ câu 1
  
  // Đếm tất cả câu hỏi từ các Part trước
  for (let p = 0; p < partIndex; p++) {
    const part = parts[p];
    if (part?.sections) {
      for (const section of part.sections) {
        total += countSectionQuestions(section);
      }
    }
  }
  
  // Đếm câu hỏi từ các Section trước trong Part hiện tại
  const currentPart = parts[partIndex];
  if (currentPart?.sections) {
    for (let s = 0; s < sectionIndex; s++) {
      total += countSectionQuestions(currentPart.sections[s]);
    }
  }
  
  return total;
};

/**
 * ListeningTestEditor - Component chính cho Create/Edit Listening Test
 * Layout 4 cột: Parts → Part Content (Audio) → Sections → Questions
 */
const ListeningTestEditor = ({
  // Page info
  pageTitle = "Listening Test Editor",
  className = "listening-test-editor",

  // Form fields
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
  isTeacherNameLocked = false,
  showResultModal,
  setShowResultModal,

  // Parts state (thay vì passages)
  parts,
  selectedPartIndex,
  setSelectedPartIndex,
  selectedSectionIndex,
  setSelectedSectionIndex,

  // Part handlers
  onPartChange,
  onAddPart,
  onDeletePart,

  // Section handlers
  onSectionChange,
  onAddSection,
  onDeleteSection,
  onCopySection,

  // Question handlers
  onQuestionChange,
  onAddQuestion,
  onDeleteQuestion,
  onCopyQuestion,
  onBulkAddQuestions,

  // Review & Submit
  isReviewing,
  setIsReviewing,
  onReview,
  onConfirmSubmit,
  isSubmitting,
  submitButtonText = "Tạo đề",

  // Messages
  message,

  // Auto-save
  lastSaved,
  isSaving,
  onManualSave,

  // Global audio
  globalAudioFile,
  setGlobalAudioFile,
  existingAudioUrl = null,
}) => {
  const { isDarkMode } = useTheme();
  // Column layout hook
  const {
    isResizing,
    handleMouseDown,
  } = useColumnLayout();

  // Header collapse state: auto-collapses on scroll or toggled manually
  const [, setCollapsedHeader] = useState(false);
  const [manualHeaderOverride, setManualHeaderOverride] = useState(false);

  // Panel collapse states (like Reading editor)
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [collapsedAudio, setCollapsedAudio] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState(false);

  // Runtime import guards (log if important components are missing)
  useEffect(() => {
    if (typeof TableCompletion !== 'function') {
      console.error('ListeningTestEditor: TableCompletion component is undefined (import failed?)', TableCompletion);
    }
  }, []);

  useEffect(() => {
    const onScrollWindow = () => {
      if (manualHeaderOverride) {
        setManualHeaderOverride(false);
        return;
      }
      if (window.scrollY > 80) setCollapsedHeader(true);
      else if (window.scrollY < 40) setCollapsedHeader(false);
    };

    // Also listen to scroll on the editor container (possible internal scroll)
    const editorEl = document.querySelector(`.${className}`);
    const onScrollEl = () => {
      if (manualHeaderOverride) {
        setManualHeaderOverride(false);
        return;
      }
      const top = editorEl?.scrollTop || 0;
      if (top > 80) setCollapsedHeader(true);
      else if (top < 40) setCollapsedHeader(false);
    };

    window.addEventListener('scroll', onScrollWindow, { passive: true });
    if (editorEl) editorEl.addEventListener('scroll', onScrollEl, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScrollWindow);
      if (editorEl) editorEl.removeEventListener('scroll', onScrollEl);
    };
  }, [manualHeaderOverride, className]);

  // Audio input refs
  const globalAudioRef = useRef(null);
  const partAudioRef = useRef(null);

  // Bulk add modal state
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkAddCount, setBulkAddCount] = useState(5);
  const [bulkAddType, setBulkAddType] = useState('fill');


  // Current part and section
  const currentPart = parts?.[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];

  // Total questions count
  const totalQuestions = calculateTotalQuestions(parts || []);
  const activeGlobalAudioUrl = globalAudioFile?.url || existingAudioUrl || "";
  const sidebarWidth = collapsedSidebar ? "68px" : "clamp(196px, 21vw, 252px)";
  const sidebarMinWidth = collapsedSidebar ? "68px" : "clamp(184px, 18vw, 214px)";
  const editorChrome = isDarkMode
    ? {
        shellBackground: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
        headerBackground: "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(17, 24, 39, 0.96) 100%)",
        headerBorder: "1px solid rgba(51, 65, 85, 0.92)",
        headerShadow: "0 12px 32px rgba(2, 6, 23, 0.32)",
        inputBackground: "rgba(15, 23, 42, 0.98)",
        inputBorder: "#334155",
        inputColor: "#e2e8f0",
        inputShadow: "inset 0 1px 2px rgba(2, 6, 23, 0.36)",
        countPillBackground: "linear-gradient(135deg, rgba(79, 70, 229, 0.24) 0%, rgba(37, 99, 235, 0.18) 100%)",
        countPillBorder: "1px solid rgba(129, 140, 248, 0.32)",
        countPillColor: "#c7d2fe",
        countPillShadow: "0 10px 22px rgba(30, 41, 59, 0.26)",
      }
    : {
        shellBackground: "linear-gradient(180deg, #eef4ff 0%, #f8fbff 42%, #f8fafc 100%)",
        headerBackground: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
        headerBorder: "1px solid rgba(203, 213, 225, 0.85)",
        headerShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        inputBackground: "rgba(255, 255, 255, 0.98)",
        inputBorder: "#cbd5e1",
        inputColor: "#0f172a",
        inputShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.05)",
        countPillBackground: "linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(59, 130, 246, 0.12) 100%)",
        countPillBorder: "1px solid rgba(124, 58, 237, 0.18)",
        countPillColor: colors.primaryPurple,
        countPillShadow: "0 10px 22px rgba(59, 130, 246, 0.08)",
      };
  const themedAudioUploadStyle = isDarkMode
    ? {
        ...audioUploadStyle,
        background: "rgba(15, 23, 42, 0.98)",
        border: "1px dashed rgba(96, 165, 250, 0.34)",
        boxShadow: "inset 0 1px 1px rgba(148, 163, 184, 0.08)",
      }
    : audioUploadStyle;
  const themedAudioUploadActiveStyle = isDarkMode
    ? {
        ...audioUploadActiveStyle,
        background: "rgba(15, 23, 42, 0.98)",
        border: "1px solid rgba(96, 165, 250, 0.34)",
        boxShadow: "0 10px 24px rgba(2, 6, 23, 0.22)",
      }
    : audioUploadActiveStyle;

  const getSectionActionButtonStyle = (variant) => {
    const variants = {
      add: {
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        border: "1px solid rgba(251, 191, 36, 0.35)",
        boxShadow: "0 10px 18px rgba(217, 119, 6, 0.18)",
      },
      copy: {
        background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        boxShadow: "0 10px 18px rgba(71, 85, 105, 0.16)",
      },
      delete: {
        background: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
        border: "1px solid rgba(251, 113, 133, 0.28)",
        boxShadow: "0 10px 18px rgba(225, 29, 72, 0.16)",
      },
    };

    return {
      width: "100%",
      minHeight: "44px",
      padding: "10px 14px",
      borderRadius: "12px",
      cursor: "pointer",
      color: "white",
      fontWeight: 700,
      fontSize: "12px",
      letterSpacing: "0.01em",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      ...variants[variant],
    };
  };

  const getMessageTone = (currentMessage = "") => {
    if (currentMessage.includes("\u274C") || /^(error|lỗi)\s*:/i.test(currentMessage)) return "error";
    if (currentMessage.includes("\u2705") || /^(success|thành công)\s*:/i.test(currentMessage)) return "success";
    return "warning";
  };

  const getDisplayMessage = (currentMessage = "") =>
    currentMessage
      .replace(/^(?:\u2705|\u274C|\u26A0\uFE0F|\u23F3)\s*/u, "")
      .replace(/^(?:error|lỗi|success|thành công|warning|cảnh báo|loading)\s*:\s*/i, "");

  // Handle audio file upload
  const handleAudioUpload = (file, isGlobal = false, partIndex = null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    if (isGlobal) {
      setGlobalAudioFile({ file, url });
    } else if (partIndex !== null) {
      onPartChange(partIndex, 'audioFile', file);
      onPartChange(partIndex, 'audioUrl', url);
    }
  };

  // Question types for Listening
  const questionTypes = [
    { value: 'fill', label: 'Fill in the Blank', icon: 'fill', desc: 'Điền từ vào chỗ trống theo từng câu.' },
    { value: 'form-completion', label: 'Form Completion', icon: 'form', desc: 'Form có nhiều blank được đánh số tự động.' },
    { value: LISTENING_CLOZE_TYPE, label: 'Cloze Test (Table)', icon: 'table', desc: 'Schema dùng chung với IX Reading cloze table.' },
    { value: 'notes-completion', label: 'Notes Completion', icon: 'questions', desc: 'Dán notes có blank để tách câu hỏi.' },
    { value: 'abc', label: 'Multiple Choice (A/B/C)', icon: 'choice', desc: '3 lựa chọn.' },
    { value: 'abcd', label: 'Multiple Choice (A/B/C/D)', icon: 'choice', desc: '4 lựa chọn.' },
    { value: 'matching', label: 'Matching', icon: 'matching', desc: 'Nối mục bên trái với đáp án chữ cái.' },
    { value: 'multi-select', label: 'Multi Select', icon: 'multi-select', desc: 'Một câu chiếm nhiều slot theo số đáp án cần chọn.' },
    { value: 'map-labeling', label: 'Map / Plan Labeling', icon: 'map', desc: 'Gắn nhãn vào sơ đồ hoặc bản đồ.' },
    { value: 'flowchart', label: 'Flowchart Completion', icon: 'flowchart', desc: 'Flowchart có blank chọn đáp án A-G.' },
  ];

  // Small helper component used in the review modal to render map image with pixel-accurate markers
  const MapPreview = ({ q }) => {
    const imgRef = useRef(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
      const update = () => {
        if (imgRef.current) {
          setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
        }
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, []);

    if (!q || !(q.mapImageUrl || q.imageUrl)) return null;

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto 20px', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <img
            ref={imgRef}
            src={q.mapImageUrl || q.imageUrl}
            alt="Map preview"
            style={{ width: '100%', display: 'block' }}
            onLoad={() => { if (imgRef.current) setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight }); }}
          />

          {(q.items || []).map((item, idx) => {
            const pos = item?.position || null;
            if (!pos) return null;
            const leftPx = size.w ? Math.round((pos.x / 100) * size.w) : null;
            const topPx = size.h ? Math.round((pos.y / 100) * size.h) : null;
            return (
              <div key={`marker-${idx}`} title={`Item ${idx + 1}: ${item.label || ''}`} style={{ position: 'absolute', left: leftPx !== null ? `${leftPx}px` : `${pos.x}%`, top: topPx !== null ? `${topPx}px` : `${pos.y}%`, transform: 'translate(-50%, -50%)', zIndex: 40, willChange: 'transform' }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{item.correctAnswer || '?'}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{compactCSS(className)}</style>

      <IeltsTestEditorShell
        className={className}
        pageTitle={pageTitle}
        title={title}
        setTitle={setTitle}
        classCode={classCode}
        setClassCode={setClassCode}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        isTeacherNameLocked={isTeacherNameLocked}
        showResultModal={showResultModal}
        setShowResultModal={setShowResultModal}
        lastSaved={lastSaved}
        isSaving={isSaving}
        message={message}
        renderMessage={(currentMessage) => {
          const tone = getMessageTone(currentMessage);
          return (
            <div
              className="listening-editor-banner-message"
              style={{
                textAlign: "center",
                padding: "10px 14px",
                marginTop: "10px",
                backgroundColor: tone === "error"
                  ? "#fee2e2"
                  : tone === "success"
                  ? "#dcfce7"
                  : "#fef3c7",
                borderRadius: "999px",
                border: "1px solid rgba(148, 163, 184, 0.24)",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                color: tone === "error"
                  ? colors.dangerRed
                  : tone === "success"
                  ? colors.successGreen
                  : "#92400e",
                fontWeight: 600,
              }}
            >
              {getDisplayMessage(currentMessage)}
            </div>
          );
        }}
        rightControls={
          <span
            className="listening-editor-right-pill"
            style={{
              padding: "8px 14px",
              background: editorChrome.countPillBackground,
              color: editorChrome.countPillColor,
              border: editorChrome.countPillBorder,
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: editorChrome.countPillShadow,
            }}
          >
            Tổng: {totalQuestions} câu hỏi
          </span>
        }
        afterInputs={(
          <div style={{ flexShrink: 0 }}>
            <div
              className={`listening-editor-global-audio ${activeGlobalAudioUrl ? "is-active" : ""}`}
              style={activeGlobalAudioUrl ? { ...themedAudioUploadActiveStyle, padding: "6px 12px", margin: 0, borderRadius: "6px" } : { ...themedAudioUploadStyle, padding: "6px 12px", margin: 0, borderRadius: "6px" }}
              onClick={() => globalAudioRef.current?.click()}
            >
              <input
                type="file"
                ref={globalAudioRef}
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e.target.files[0], true)}
                style={{ display: "none" }}
              />
              {activeGlobalAudioUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: colors.audioGreen, fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap" }}>
                    {globalAudioFile?.url ? "Audio chung mới đã chọn" : "Audio chung hiện tại"}
                  </span>
                  <audio controls src={activeGlobalAudioUrl} style={{ height: "28px", maxWidth: "200px" }} />
                </div>
              ) : (
                <span style={{ color: isDarkMode ? "#94a3b8" : colors.gray, fontSize: "12px", whiteSpace: "nowrap" }}>
                  Tải audio chung (tùy chọn)
                </span>
              )}
            </div>
          </div>
        )}
        shellStyle={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontSize: "13px",
          background: editorChrome.shellBackground,
        }}
        containerStyle={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
        headerStyle={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          background: editorChrome.headerBackground,
          borderBottom: editorChrome.headerBorder,
          boxShadow: editorChrome.headerShadow,
          color: editorChrome.inputColor,
          backdropFilter: "blur(16px)",
          flexShrink: 0,
        }}
        topBarStyle={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 0",
          flexShrink: 0,
        }}
        titleStyle={{ display: "none" }}
        inputLayoutStyle={{
          display: "flex",
          flex: 1,
          gap: "10px",
          alignItems: "center",
        }}
        titleInputStyle={{ ...compactInputStyle, flex: "1 1 0", marginBottom: 0, padding: "11px 14px", minHeight: "44px", border: `1px solid ${editorChrome.inputBorder}`, borderRadius: "14px", backgroundColor: editorChrome.inputBackground, color: editorChrome.inputColor, boxShadow: editorChrome.inputShadow }}
        classCodeInputStyle={{ ...compactInputStyle, flex: "1 1 0", marginBottom: 0, padding: "11px 14px", minHeight: "44px", border: `1px solid ${editorChrome.inputBorder}`, borderRadius: "14px", backgroundColor: editorChrome.inputBackground, color: editorChrome.inputColor, boxShadow: editorChrome.inputShadow }}
        teacherInputStyle={{ ...compactInputStyle, flex: "1 1 0", marginBottom: 0, padding: "11px 14px", minHeight: "44px", border: `1px solid ${editorChrome.inputBorder}`, borderRadius: "14px", backgroundColor: editorChrome.inputBackground, color: editorChrome.inputColor, boxShadow: editorChrome.inputShadow }}
        headerCollapsed={false}
      >
        {/* SIDEBAR + VERTICAL LAYOUT (like Reading editor) */}
        <form
          className="listening-editor-workspace"
          onSubmit={onReview}
          style={{ display: "flex", flex: 1, overflow: "hidden" }}
        >
          {/* ===== LEFT SIDEBAR: Parts + Sections ===== */}
          <div
            className={`listening-editor-sidebar ${collapsedSidebar ? "is-collapsed" : ""}`}
            style={{
              width: sidebarWidth,
              minWidth: sidebarMinWidth,
              backgroundColor: "#1e293b",
              color: "white",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
              borderRight: "1px solid #0f172a",
              transition: "width 0.25s ease, min-width 0.25s ease",
            }}
          >
            <div
              className="listening-editor-sidebar-block-header"
              style={{
                padding: collapsedSidebar ? "8px 6px" : "8px 10px",
                borderBottom: "1px solid #334155",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                className="listening-editor-sidebar-block-label"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`Parts (${parts?.length || 0})`}
              >
                {collapsedSidebar ? `P${parts?.length || 0}` : `Parts (${parts?.length || 0})`}
              </span>
              <button
                className="listening-editor-sidebar-toggle"
                type="button"
                onClick={() => setCollapsedSidebar((value) => !value)}
                title={collapsedSidebar ? "Mở rộng sidebar Parts/Sections" : "Thu nhỏ sidebar Parts/Sections"}
                aria-label={collapsedSidebar ? "Mở rộng sidebar Parts/Sections" : "Thu nhỏ sidebar Parts/Sections"}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  border: "1px solid #475569",
                  backgroundColor: "rgba(148, 163, 184, 0.12)",
                  color: "white",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <InlineIcon name={collapsedSidebar ? "chevron-right" : "chevron-left"} size={14} style={{ color: "currentColor" }} />
              </button>
            </div>

            <div className="listening-editor-sidebar-scroll listening-editor-sidebar-scroll-parts" style={{ overflow: "auto", padding: collapsedSidebar ? "6px 4px 0 4px" : "6px 6px 0 6px", flexShrink: 0, maxHeight: "38%" }}>
                {parts?.map((part, idx) => (
                  <div
                    key={idx}
                    className={`listening-editor-nav-card listening-editor-nav-card-part ${selectedPartIndex === idx ? "is-active" : ""} ${collapsedSidebar ? "is-collapsed" : ""}`}
                    onClick={() => { setSelectedPartIndex(idx); setSelectedSectionIndex(part.sections?.length > 0 ? 0 : null); }}
                    title={`Part ${idx + 1}${part.title ? ` - ${part.title}` : ""}`}
                    style={{
                      padding: collapsedSidebar ? "8px 4px" : "8px 8px",
                      marginBottom: "3px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: collapsedSidebar ? "center" : "space-between",
                      alignItems: collapsedSidebar ? "center" : "flex-start",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, textAlign: collapsedSidebar ? "center" : "left" }}>
                      <div className="listening-editor-nav-card-title" style={{ fontSize: "12px", fontWeight: 600, color: "white" }}>
                        {collapsedSidebar ? `P${idx + 1}` : `Part ${idx + 1}`}
                      </div>
                      {!collapsedSidebar && (
                        <>
                          <div className="listening-editor-nav-card-subtitle" style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {part.title || "(Chưa có tiêu đề)"}
                          </div>
                          <div className="listening-editor-nav-card-meta" style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                            {part.sections?.length || 0} section · {part.sections?.reduce((total, section) => total + countSectionQuestions(section), 0) || 0} câu
                            {Boolean(part.audioUrl || part.audioFile) && <span style={{ marginLeft: 4, color: "#a7f3d0" }}>Audio</span>}
                          </div>
                        </>
                      )}
                    </div>
                    {!collapsedSidebar && parts.length > 1 && (
                      <button
                        className="listening-editor-delete-icon-btn"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeletePart(idx); }}
                        style={{
                          background: "rgba(239,68,68,0.2)",
                          border: "none",
                          color: "#fca5a5",
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          flexShrink: 0,
                          marginLeft: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title={`Xóa part ${idx + 1}`}
                        aria-label={`Xóa part ${idx + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
            </div>

            <div style={{ padding: "4px 6px 6px 6px", flexShrink: 0 }}>
              <button
                className="listening-editor-sidebar-action listening-editor-sidebar-action-part"
                type="button"
                onClick={onAddPart}
                title="Thêm Part"
                style={{
                  width: "100%",
                  padding: "6px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                {collapsedSidebar ? "+" : "Thêm part"}
              </button>
            </div>

            <div className="listening-editor-sidebar-block-header" style={{ padding: collapsedSidebar ? "8px 6px" : "8px 10px", borderTop: "1px solid #334155", borderBottom: "1px solid #334155", flexShrink: 0 }}>
              <span className="listening-editor-sidebar-block-label" style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {collapsedSidebar ? "S" : `Sections ${currentPart ? `(P${selectedPartIndex + 1})` : ""}`}
              </span>
            </div>

            <div className="listening-editor-sidebar-scroll listening-editor-sidebar-scroll-sections" style={{ flex: 1, overflow: "auto", padding: collapsedSidebar ? "6px 4px 0 4px" : "6px 6px 0 6px" }}>
                {currentPart ? (
                  currentPart.sections?.map((section, idx) => {
                    const startQ = calculateStartingQuestionNumber(parts, selectedPartIndex, idx);
                    const sectionQCount = countSectionQuestions(section);
                    const endQ = startQ + sectionQCount - 1;
                    return (
                      <div
                        key={idx}
                        className={`listening-editor-nav-card listening-editor-nav-card-section ${selectedSectionIndex === idx ? "is-active" : ""} ${collapsedSidebar ? "is-collapsed" : ""}`}
                        onClick={() => setSelectedSectionIndex(idx)}
                        title={`Section ${idx + 1}${section.sectionTitle ? ` - ${section.sectionTitle}` : ""}`}
                        style={{
                          padding: collapsedSidebar ? "8px 4px" : "8px 8px",
                          marginBottom: "3px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          textAlign: collapsedSidebar ? "center" : "left",
                        }}
                      >
                        <div className="listening-editor-nav-card-title" style={{ fontSize: "12px", fontWeight: 600, color: "white" }}>
                          {collapsedSidebar ? `S${idx + 1}` : `Section ${idx + 1}`}
                        </div>
                        {!collapsedSidebar && (
                          <>
                            <div className="listening-editor-nav-card-subtitle" style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {section.sectionTitle || `Q${startQ}–${endQ}`}
                            </div>
                            <div className="listening-editor-nav-card-meta" style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                              {sectionQCount} câu hỏi
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: "#64748b", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
                    {collapsedSidebar ? "-" : "Chọn một part"}
                  </div>
                )}
            </div>

            {currentPart && (
              <div style={{ padding: "4px 6px 6px 6px", flexShrink: 0 }}>
                <button
                  className="listening-editor-sidebar-action listening-editor-sidebar-action-section"
                  type="button"
                  onClick={() => onAddSection(selectedPartIndex)}
                  title="Thêm Section"
                  style={{
                    width: "100%",
                    padding: "6px",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "11px",
                  }}
                >
                  {collapsedSidebar ? "+" : "Thêm section"}
                </button>
              </div>
            )}
          </div>

          {/* ===== MAIN AREA: Audio/Content (top) + Questions (bottom) ===== */}
          <div className="listening-editor-main-shell" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="listening-editor-main" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", position: "relative" }}>
            {/* ===== TOP: Part Audio & Content (collapsible) ===== */}
            <div
              className={`listening-editor-panel listening-editor-panel-audio ${collapsedAudio ? "is-collapsed" : ""}`}
              style={{
                flex: collapsedAudio ? "0 0 auto" : collapsedQuestions ? "1" : "0 0 40%",
                display: "flex", flexDirection: "column", overflow: "hidden",
                transition: "flex 0.3s ease", borderBottom: "2px solid #e2e8f0",
              }}
            >
              {/* Header – always visible */}
              <div
                className="listening-editor-panel-header listening-editor-panel-header-audio"
                onClick={() => setCollapsedAudio(v => !v)}
                style={{
                  padding: "10px 16px", backgroundColor: colors.audioGreen, color: "white",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <span className="listening-editor-panel-title">Audio và nội dung{currentPart ? ` – ${currentPart.title}` : ""}</span>
                <span className="listening-editor-panel-toggle" style={{ fontSize: "12px", fontWeight: 500, opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <InlineIcon name={collapsedAudio ? "chevron-down" : "chevron-up"} size={13} style={{ color: "currentColor" }} />
                  {collapsedAudio ? "Mở rộng" : "Thu nhỏ"}
                </span>
              </div>

              {/* Body */}
              {!collapsedAudio && (
                <div className="listening-editor-panel-body" style={{ flex: 1, overflow: "auto", padding: "12px" }}>
                  {currentPart ? (
                    <div className="listening-editor-content-card">
                      {/* Part Title */}
                      <label style={{ color: colors.audioGreen, fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "4px" }}>Tiêu đề part</label>
                      <input
                        type="text"
                        value={currentPart.title || ""}
                        onChange={(e) => onPartChange(selectedPartIndex, "title", e.target.value)}
                        style={{ ...compactInputStyle, marginBottom: "12px" }}
                      />

                      {/* Part Audio */}
                      <label style={{ color: colors.audioGreen, fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "4px" }}>Audio cho part này</label>
                      <div
                        className={`listening-editor-audio-dropzone ${currentPart.audioUrl ? "is-active" : ""}`}
                        style={currentPart.audioUrl ? audioUploadActiveStyle : audioUploadStyle}
                        onClick={() => partAudioRef.current?.click()}
                      >
                        <input type="file" ref={partAudioRef} accept="audio/*" onChange={(e) => handleAudioUpload(e.target.files[0], false, selectedPartIndex)} style={{ display: "none" }} />
                        {currentPart.audioUrl ? (
                          <div>
                            <p style={{ margin: "0 0 8px", color: colors.audioGreen, fontWeight: 500 }}>
                              {currentPart.audioFile instanceof File ? "Audio mới đã chọn" : "Audio hiện tại"}
                            </p>
                            <audio controls src={currentPart.audioUrl} style={{ width: "100%" }} />
                            {currentPart.audioFile instanceof File && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); onPartChange(selectedPartIndex, 'audioFile', null); onPartChange(selectedPartIndex, 'audioUrl', ''); }} style={{ ...dangerButtonStyle, marginTop: "8px", padding: "6px 12px" }}>Xóa audio vừa chọn</button>
                            )}
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: colors.gray }}>Tải audio cho part {selectedPartIndex + 1}</p>
                        )}
                      </div>

                      {/* Instructions */}
                      <div style={{ marginTop: "12px" }}>
                        <label style={{ color: colors.audioGreen, fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "4px" }}>Hướng dẫn part</label>
                        <textarea
                          value={currentPart.instruction || ""}
                          onChange={(e) => onPartChange(selectedPartIndex, "instruction", e.target.value)}
                          placeholder="VD: You will hear a conversation between a student and a tutor..."
                          style={{ ...compactInputStyle, minHeight: "80px", resize: "vertical" }}
                        />
                      </div>

                      {/* Transcript */}
                      <div style={{ marginTop: "12px" }}>
                        <label style={{ color: colors.audioGreen, fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "4px" }}>Transcript (tùy chọn)</label>
                        <textarea
                          value={currentPart.transcript || ""}
                          onChange={(e) => onPartChange(selectedPartIndex, "transcript", e.target.value)}
                          placeholder="Nhập transcript audio nếu có..."
                          style={{ ...compactInputStyle, minHeight: "100px", resize: "vertical", fontFamily: "monospace", fontSize: "12px" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="listening-editor-empty-state listening-editor-empty-state-audio">
                      <div className="listening-editor-empty-badge">
                        <InlineIcon name="create" size={16} style={{ color: "currentColor" }} />
                      </div>
                      <div className="listening-editor-empty-title">Chọn một part để bắt đầu</div>
                      <div className="listening-editor-empty-description">Sidebar bên trái sẽ điều hướng part đang chỉnh. Sau khi chọn, bạn có thể thêm audio, hướng dẫn và transcript ở đây.</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Horizontal resize divider */}
            <div
              className="listening-editor-divider"
              onMouseDown={(e) => handleMouseDown(2, e)}
              style={{ height: "5px", backgroundColor: isResizing === 2 ? "#3b82f6" : "#e2e8f0", cursor: "row-resize", flexShrink: 0, transition: "background 0.15s" }}
            />

            {/* ===== BOTTOM: Questions (collapsible) ===== */}
            <div
              className={`listening-editor-panel listening-editor-panel-questions ${collapsedQuestions ? "is-collapsed" : ""}`}
              style={{
                flex: collapsedQuestions ? "0 0 auto" : "1",
                backgroundColor: "#fff", display: "flex", flexDirection: "column",
                overflow: "hidden", minHeight: 0,
              }}
            >
              {/* Header – always visible */}
              <div
                className="listening-editor-panel-header listening-editor-panel-header-questions"
                onClick={() => setCollapsedQuestions(v => !v)}
                style={{
                  padding: "10px 16px", backgroundColor: "#d97706", color: "white",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <span className="listening-editor-panel-title">Câu hỏi{currentSection ? ` — Section ${selectedSectionIndex + 1}` : ""}</span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {currentSection && <span style={{ fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>{countSectionQuestions(currentSection)} câu</span>}
                  <span className="listening-editor-panel-toggle" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.8)", display: "inline-flex", alignItems: "center", gap: 6 }}><InlineIcon name={collapsedQuestions ? "chevron-down" : "chevron-up"} size={13} style={{ color: "currentColor" }} />{collapsedQuestions ? "Mở rộng" : "Thu nhỏ"}</span>
                </div>
              </div>



              {!collapsedQuestions && (
                currentSection ? (
                <div className="listening-editor-panel-body" style={{ flex: 1, overflow: "auto", padding: "14px" }}>
                  {/* Section Header with auto Question Range */}
                  {(() => {
                    const autoStartQ = calculateStartingQuestionNumber(parts, selectedPartIndex, selectedSectionIndex);
                    // Use override if set, otherwise auto-calculate
                    const startQ = currentSection.startingQuestionNumber || autoStartQ;
                    const sectionQCount = countSectionQuestions(currentSection);
                    const endQ = startQ + sectionQCount - 1;
                    const suggestedTitle = `Questions ${startQ}-${endQ}`;
                    
                    return (
                      <>
                        {/* Auto Question Range Banner */}
                        <div style={{
                          padding: "8px 12px",
                          backgroundColor: "#dbeafe",
                          borderRadius: "8px",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <span style={{ fontSize: "13px", color: "#1e40af" }}>
                            <strong>Phạm vi câu hỏi:</strong> {startQ} - {endQ}
                            <span style={{ opacity: 0.7, marginLeft: "8px" }}>
                              (tự động tính)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onSectionChange(selectedPartIndex, selectedSectionIndex, "sectionTitle", suggestedTitle)}
                            style={{
                              padding: "4px 10px",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            Áp dụng tên "{suggestedTitle}"
                          </button>
                        </div>
                        
                        {/* Override starting question number */}
                        <div style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "12px",
                          alignItems: "center",
                          padding: "8px 12px",
                          backgroundColor: "#fef3c7",
                          borderRadius: "8px",
                          border: "1px solid #fcd34d",
                        }}>
                          <label style={{ fontSize: "12px", color: "#92400e", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Số câu bắt đầu:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="40"
                            value={currentSection.startingQuestionNumber || startQ}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || startQ;
                              onSectionChange(selectedPartIndex, selectedSectionIndex, "startingQuestionNumber", val);
                            }}
                            style={{ 
                              ...compactInputStyle, 
                              width: "80px", 
                              marginBottom: 0,
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          />
                          <span style={{ fontSize: "11px", color: "#92400e" }}>
                            (Nhập số để override, hoặc để trống để tự động tính)
                          </span>
                          {currentSection.startingQuestionNumber && (
                            <button
                              type="button"
                              onClick={() => onSectionChange(selectedPartIndex, selectedSectionIndex, "startingQuestionNumber", null)}
                              style={{
                                padding: "2px 8px",
                                backgroundColor: "#fca5a5",
                                color: "#991b1b",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "10px",
                                cursor: "pointer",
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        
                        <div style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "16px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}>
                          <input
                            type="text"
                            value={currentSection.sectionTitle || ""}
                            onChange={(e) => onSectionChange(selectedPartIndex, selectedSectionIndex, "sectionTitle", e.target.value)}
                            placeholder={suggestedTitle}
                            style={{ ...compactInputStyle, flex: 1, minWidth: "150px" }}
                          />
                          <QuestionTypeSelectField
                            value={currentSection.questionType || "fill"}
                            onChange={(nextType) => onSectionChange(selectedPartIndex, selectedSectionIndex, "questionType", nextType)}
                            options={questionTypes}
                            style={{ minWidth: "260px" }}
                          />
                        </div>
                      </>
                    );
                  })()}

                  {/* Section Instructions */}
                  <textarea
                    value={currentSection.sectionInstruction || ""}
                    onChange={(e) => onSectionChange(selectedPartIndex, selectedSectionIndex, "sectionInstruction", e.target.value)}
                    placeholder="Hướng dẫn cho section này (VD: Complete the notes below. Write NO MORE THAN TWO WORDS...)"
                    style={{
                      ...compactInputStyle,
                      minHeight: "60px",
                      resize: "vertical",
                      marginBottom: "16px",
                    }}
                  />

                  {/* Questions List */}
                  <div style={{ marginBottom: "16px" }}>
                    {(() => {
                      const autoSectionStartQ = calculateStartingQuestionNumber(parts, selectedPartIndex, selectedSectionIndex);
                      // Use override if set
                      const sectionStartQ = currentSection.startingQuestionNumber || autoSectionStartQ;
                      const sectionType = currentSection.questionType || "fill";
                      
                      // For matching type, we show different UI
                      const isMatchingType = sectionType === "matching";
                      // For form-completion type, show similar to matching (range of questions)
                      const isFormCompletionType = sectionType === "form-completion";
                      const isFlowchartType = sectionType === "flowchart";
                      
                      // Calculate total questions for this section
                      let totalSubQuestions = 0;
                      if (isMatchingType) {
                        totalSubQuestions = currentSection.questions?.[0]?.leftItems?.length || 0;
                      } else if (isFormCompletionType) {
                        // Count blanks in form-completion
                        totalSubQuestions = currentSection.questions?.[0]?.formRows?.filter(r => r.isBlank)?.length || 0;
                      } else if (isFlowchartType) {
                        totalSubQuestions = countFlowchartQuestionSlots(currentSection.questions?.[0] || {});
                      } else {
                        totalSubQuestions = currentSection.questions?.length || 0;
                      }
                      
                      // Show range for multi-question types (matching, form-completion)
                      const showRange = isMatchingType || isFormCompletionType || isFlowchartType;
                      
                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h4 style={{ margin: 0, color: colors.questionYellow }}>
                              {showRange 
                                ? `${isMatchingType ? 'Matching' : isFormCompletionType ? 'Form Completion' : 'Flowchart'} Block (${totalSubQuestions} câu: ${sectionStartQ}-${sectionStartQ + totalSubQuestions - 1})`
                                : `Câu hỏi (${currentSection.questions?.length || 0})`
                              }
                            </h4>
                            <div style={{ display: "flex", gap: "6px" }}>

                              <button
                                type="button"
                                onClick={() => setShowBulkAddModal(true)}
                                style={{ ...secondaryButtonStyle, padding: "6px 10px", fontSize: "11px" }}
                              >
                                Thêm nhiều
                              </button>
                            </div>
                          </div>

                          {currentSection.questions?.map((question, qIdx) => {
                            // Calculate questions before this one in section (for multi-select)
                            let questionsBeforeInSection = 0;
                            if (currentSection.questionType === 'multi-select') {
                              for (let i = 0; i < qIdx; i++) {
                                questionsBeforeInSection += currentSection.questions[i]?.requiredAnswers || 2;
                              }
                            }
                            
                            return (
                              <ListeningQuestionEditor
                                key={qIdx}
                                question={question}
                                questionIndex={qIdx}
                                questionType={currentSection.questionType || question.questionType}
                                globalQuestionNumber={sectionStartQ + qIdx}
                                sectionStartingNumber={sectionStartQ}
                                questionsBeforeInSection={questionsBeforeInSection}
                                onChange={(field, value) => 
                                  onQuestionChange(selectedPartIndex, selectedSectionIndex, qIdx, field, value)
                                }
                                onDelete={() => 
                                  onDeleteQuestion(selectedPartIndex, selectedSectionIndex, qIdx)
                                }
                                onCopy={() =>
                                  onCopyQuestion(selectedPartIndex, selectedSectionIndex, qIdx)
                                }
                                canDelete={currentSection.questions.length > 1}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      borderRadius: "16px",
                      border: "1px solid #fed7aa",
                      background: "linear-gradient(180deg, #fffaf3 0%, #ffffff 100%)",
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#b45309",
                      }}
                    >
                      Tác vụ section
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => onAddQuestion(selectedPartIndex, selectedSectionIndex, currentSection.questionType)}
                        style={getSectionActionButtonStyle("add")}
                      >
                        Thêm câu hỏi
                      </button>

                      <button
                        type="button"
                        onClick={() => onCopySection(selectedPartIndex, selectedSectionIndex)}
                        style={getSectionActionButtonStyle("copy")}
                      >
                        Sao chép section này
                      </button>

                      {(currentPart?.sections?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSection(selectedPartIndex, selectedSectionIndex)}
                          style={getSectionActionButtonStyle("delete")}
                        >
                          Xóa section này
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                  <div className="listening-editor-empty-state listening-editor-empty-state-question">
                    <div className="listening-editor-empty-badge">
                      <InlineIcon name="create" size={16} style={{ color: "currentColor" }} />
                    </div>
                    <div className="listening-editor-empty-title">Chọn một section để chỉnh câu hỏi</div>
                    <div className="listening-editor-empty-description">Sau khi chọn section ở sidebar, toàn bộ block câu hỏi và công cụ thêm nhanh sẽ hiện trong vùng này.</div>
                  </div>
                </div>
              )
              )}
            </div>
          </div>

          {/* FOOTER - Submit buttons */}
          <div
            className="listening-editor-footer-bar"
            style={{
              padding: "12px 20px",
              backgroundColor: "#fff",
              borderTop: "1px solid #e2e8f0",
              boxShadow: "0 -2px 6px rgba(0,0,0,0.06)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button type="button" onClick={onManualSave} className="listening-editor-secondary-cta" style={secondaryButtonStyle}>
              Lưu nháp
            </button>
            <button type="submit" className="listening-editor-primary-cta" style={{ ...primaryButtonStyle, backgroundColor: "#3b82f6", boxShadow: "0 4px 6px -1px rgba(59,130,246,0.3)" }} disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : submitButtonText}
            </button>
          </div>
          </div>{/* /main area */}
        </form>

      {/* REVIEW MODAL */}
      {isReviewing && (
        <div style={modalStyles}>
          <div style={{
            ...modalContentStyles,
            maxWidth: "1000px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              ...modalHeaderStyles,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h3 style={{ margin: 0 }}>Xác nhận {submitButtonText === "Cập nhật" ? "cập nhật" : "tạo"} đề thi</h3>
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "0 8px",
                  lineHeight: 1,
                }}
                title="Đóng"
              >
                X
              </button>
            </div>

            {/* Test Info Summary */}
            <div style={{
              padding: "15px",
              backgroundColor: "#f0f9ff",
              borderRadius: "6px",
              marginBottom: "15px",
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
            }}>
              <div><strong>Tiêu đề:</strong> {title || "(Chưa đặt)"}</div>
              <div><strong>Mã lớp:</strong> {classCode || "(Không có)"}</div>
              <div><strong>Giáo viên:</strong> {teacherName || "(Không có)"}</div>
              <div><strong>Parts:</strong> {parts?.length || 0}</div>
              <div><strong>Tổng câu hỏi:</strong> {totalQuestions}</div>
            </div>

            {/* Full Preview Content - Scrollable */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "15px",
              border: "1px solid #ddd",
              borderRadius: "6px",
            }}>

              {(() => {
                const sectionStarts = computeQuestionStarts(parts || []);
                return (parts || []).map((part, partIdx) => (
                  <div key={partIdx} style={{
                    borderBottom: partIdx < parts.length - 1 ? "2px solid #3b82f6" : "none",
                  }}>
                      {/* Part Header */}
                      <div style={{
                        backgroundColor: colors.partBlue,
                        color: "white",
                        padding: "10px 15px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span>{part.title || `Part ${partIdx + 1}`}</span>
                        <span style={{
                          padding: "3px 10px",
                          backgroundColor: (part.audioUrl || part.audioFile) ? "#22c55e" : "#ef4444",
                          borderRadius: "20px",
                          fontSize: "11px",
                        }}>
                          {(part.audioUrl || part.audioFile) ? "Có audio" : "Chưa có audio"}
                        </span>
                      </div>

                      {/* Part Instruction */}
                      {part.instruction && (
                        <div style={{
                          padding: "10px 15px",
                          backgroundColor: "#f8fafc",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "13px",
                          fontStyle: "italic",
                        }}>
                          {part.instruction}
                        </div>
                      )}

                      {/* Sections */}
                      {part.sections?.map((section, sIdx) => {
                        const sectionQCount = countSectionQuestions(section);
                        const sectionStartQ = sectionStarts?.[partIdx]?.[sIdx] || 1;

                        return (
                          <div key={sIdx} style={{
                            margin: "10px",
                            border: `1px solid ${colors.sectionOrange}`,
                            borderRadius: "6px",
                            overflow: "hidden",
                          }}>
                            {/* Section Header */}
                            <div style={{
                              backgroundColor: colors.sectionOrange,
                              color: "white",
                              padding: "8px 12px",
                              fontWeight: "bold",
                              fontSize: "13px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}>
                              <span>{section.sectionTitle || `Questions ${sectionStartQ}-${sectionStartQ + sectionQCount - 1}`}</span>
                              <span style={{ fontWeight: "normal" }}>
                                {sectionQCount} câu | {section.questionType}
                              </span>
                            </div>

                            {/* Section Instruction */}
                            {section.sectionInstruction && (
                              <div style={{
                                padding: "10px 12px",
                                backgroundColor: "#fffbeb",
                                borderBottom: "1px solid #fcd34d",
                                fontSize: "12px",
                                whiteSpace: "pre-wrap",
                              }}>
                                <strong>Hướng dẫn:</strong><br/>
                                {section.sectionInstruction}
                              </div>
                            )}

                            {/* Questions based on type */}
                            <div style={{ padding: "10px 12px", backgroundColor: "white" }}>

                            {/* NOTES COMPLETION */}
                            {section.questionType === 'notes-completion' && section.questions[0] && (
                              <div>
                                <div style={{
                                  padding: "12px",
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "6px",
                                  marginBottom: "12px",
                                  lineHeight: "1.8",
                                  fontSize: "13px",
                                  border: "1px solid #e5e7eb",
                                }}>
                                  <strong style={{ display: "block", marginBottom: "8px", color: "#1f2937" }}>
                                    {section.questions[0].notesTitle || "Notes"}
                                  </strong>
                                    <div
                                      className="ql-editor"
                                      dangerouslySetInnerHTML={{ __html: formatNotesHtml(section.questions[0].notesText) }}
                                    />
                                </div>
                                {/* Show answers */}
                                <div style={{
                                  padding: "10px",
                                  backgroundColor: "#dcfce7",
                                  borderRadius: "6px",
                                  border: "1px solid #86efac",
                                }}>
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>Đáp án:</strong>
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}>
                                    {Object.entries(section.questions[0].answers || {}).map(([num, ans]) => (
                                      <span key={num} style={{
                                        padding: "4px 8px",
                                        backgroundColor: "white",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}>
                                        <strong>{num}.</strong> {ans}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* FORM COMPLETION */}
                            {section.questionType === 'form-completion' && section.questions[0] && (
                              <div>
                                <div style={{
                                  padding: "12px",
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "6px",
                                  marginBottom: "12px",
                                  border: "1px solid #e5e7eb",
                                }}>
                                  <strong style={{ display: "block", marginBottom: "10px" }}>
                                    {section.questions[0].formTitle || "Form"}
                                  </strong>
                                  {section.questions[0].formRows?.map((row, rIdx) => (
                                    <div key={rIdx} style={{
                                      display: "flex",
                                      gap: "8px",
                                      padding: "4px 0",
                                      borderBottom: "1px dashed #e5e7eb",
                                      fontSize: "12px",
                                    }}>
                                      <span style={{ minWidth: "120px", color: "#6b7280" }}>{row.label}</span>
                                      <span>{row.prefix}</span>
                                      {row.isBlank ? (
                                        <span style={{
                                          padding: "2px 12px",
                                          backgroundColor: "#fef3c7",
                                          borderRadius: "4px",
                                          fontWeight: "bold",
                                          border: "1px dashed #f59e0b",
                                        }}>
                                          {row.blankNumber}. ________
                                        </span>
                                      ) : (
                                        <span>{row.suffix}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* Show answers */}
                                <div style={{
                                  padding: "10px",
                                  backgroundColor: "#dcfce7",
                                  borderRadius: "6px",
                                  border: "1px solid #86efac",
                                }}>
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>Đáp án:</strong>
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}>
                                    {Object.entries(section.questions[0].answers || {}).map(([num, ans]) => (
                                      <span key={num} style={{
                                        padding: "4px 8px",
                                        backgroundColor: "white",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}>
                                        <strong>{num}.</strong> {ans}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TABLE COMPLETION */}
                            {getListeningSectionType(section, section.questions[0]) === LISTENING_CLOZE_TYPE && section.questions[0] && (() => {
                              const tableQuestion = getListeningTableQuestionData(section.questions[0]);
                              const tableAnswerEntries = getListeningTableBlankEntries(
                                section.questions[0],
                                sectionStartQ
                              );

                              return (
                                <div>
                                <div style={{
                                  padding: "12px",
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "6px",
                                  marginBottom: "12px",
                                  border: "1px solid #e5e7eb",
                                }}>
                                  <strong style={{ display: "block", marginBottom: "10px" }}>
                                    {tableQuestion.title || "Table"}
                                  </strong>
                                  {typeof TableCompletion === 'function' ? (
                                    <TableCompletion data={{
                                      part: partIdx + 1,
                                      title: tableQuestion.title || "",
                                      instruction: tableQuestion.instruction || "",
                                      columns: tableQuestion.columns || [],
                                      rows: tableQuestion.rows || [],
                                      rangeStart: sectionStartQ,
                                      rangeEnd: sectionStartQ + (countListeningSectionQuestions(section) ? countListeningSectionQuestions(section) - 1 : 0),
                                    }} startingQuestionNumber={sectionStartQ} />
                                  ) : (
                                    <div style={{ padding: 12, background: '#fee2e2', borderRadius: 6, color: '#7f1d1d' }}>
                                      Component <strong>TableCompletion</strong> not available. Check imports.
                                    </div>
                                  )}
                                </div>

                                {/* Show answers */}
                                <div style={{
                                  padding: "10px",
                                  backgroundColor: "#dcfce7",
                                  borderRadius: "6px",
                                  border: "1px solid #86efac",
                                }}>
                                  <strong style={{ fontSize: "12px", color: "#166534", display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="correct" size={12} style={{ color: "#166534" }} />Đáp án:</strong>
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}>
                                    {tableAnswerEntries.length > 0 ? (
                                      tableAnswerEntries.map(({ num, expected }) => {
                                        const value = expected || '';
                                        const handleChange = (nextValue) => {
                                          const newMap = { ...(section.questions[0].answers || {}) };
                                          newMap[String(num)] = nextValue;
                                          onQuestionChange(partIdx, sIdx, 0, 'answers', newMap);
                                        };

                                        return (
                                          <div key={`tbl-${num}`} style={{ padding: '4px 8px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
                                            <strong style={{ display: 'block', marginBottom: 6 }}>{num}.</strong>
                                            <input
                                              type="text"
                                              value={value}
                                              placeholder="(Chưa có)"
                                              onChange={(e) => handleChange(e.target.value)}
                                              style={{ ...compactInputStyle, width: '100%' }}
                                            />
                                            {typeof value === 'string' && /\|/.test(value) && (
                                              <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>
                                                <em>Accepted variants:</em> {String(value).split(/\|/).map((entry) => entry.trim()).filter(Boolean).join(' | ')}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span style={{ padding: '4px 8px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                                        (Chưa có đáp án)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              );
                            })()}

                            {/* MATCHING */}
                            {section.questionType === 'matching' && section.questions[0] && (
                              <div>
                                <div style={{ display: "flex", gap: "30px", marginBottom: "12px" }}>
                                  <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                                      {section.questions[0].leftTitle || 'Items'}:
                                    </strong>
                                    {section.questions[0].leftItems?.map((item, i) => (
                                      <div key={i} style={{ padding: "4px 0", fontSize: "12px" }}>
                                        <strong>{sectionStartQ + i}.</strong> {item}
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                                      {section.questions[0].rightTitle || 'Options'}:
                                    </strong>
                                    {section.questions[0].rightItems?.map((item, i) => (
                                      <div key={i} style={{ padding: "4px 0", fontSize: "12px" }}>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Show answers */}
                                <div style={{
                                  padding: "10px",
                                  backgroundColor: "#dcfce7",
                                  borderRadius: "6px",
                                  border: "1px solid #86efac",
                                }}>
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>Đáp án:</strong>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                                    {Object.entries(section.questions[0].answers || {}).map(([num, ans]) => (
                                      <span key={num} style={{
                                        padding: "4px 10px",
                                        backgroundColor: "white",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}>
                                        <strong>{num}.</strong> {ans}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* MAP LABELING (preview for teacher) */}
                            {section.questionType === 'map-labeling' && section.questions[0] && (() => {
                              const q = section.questions[0];
                              return (
                                <div>
                                  <MapPreview q={q} />

                                  {/* List items */}
                                  <div style={{ padding: '8px 0', fontSize: 13 }}>
                                    <strong>Các địa điểm:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                      {(q.items || []).map((item, i) => {
                                        const baseNumber = section.startingQuestionNumber || sectionStartQ;
                                        return (
                                          <div key={i} style={{ padding: '6px 10px', background: 'white', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                            <strong>{baseNumber + i}.</strong> {item.label} <span style={{ marginLeft: 8, fontWeight: 700, color: '#ef4444' }}>{item.correctAnswer}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {section.questionType === 'flowchart' && section.questions[0] && (() => {
                              const q = section.questions[0];
                              const flowchartEntries = getFlowchartBlankEntries(q, sectionStartQ);
                              const entryByStepIndex = new Map(flowchartEntries.map((entry) => [entry.stepIndex, entry]));
                              const optionEntries = getConfiguredFlowchartOptionEntries(q.options || []);
                              const optionRows = getFlowchartOptionTableRows(optionEntries);
                              const steps = Array.isArray(q.steps) ? q.steps : [];

                              return (
                                <div>
                                  {optionRows.length > 0 && (
                                    <div style={{
                                      maxWidth: '760px',
                                      margin: '0 auto 18px',
                                      border: '1px solid #94a3b8',
                                      borderRadius: '10px',
                                      overflow: 'hidden',
                                      backgroundColor: 'white',
                                    }}>
                                      {optionRows.map((row, rowIndex) => (
                                        <div
                                          key={`flowchart-preview-option-row-${rowIndex}`}
                                          style={{
                                            display: 'grid',
                                            gridTemplateColumns: '52px minmax(0, 1fr) 52px minmax(0, 1fr)',
                                            borderTop: rowIndex === 0 ? 'none' : '1px solid #cbd5e1',
                                          }}
                                        >
                                          {row.map((option, columnIndex) => {
                                            if (!option) {
                                              return (
                                                <React.Fragment key={`flowchart-preview-empty-${rowIndex}-${columnIndex}`}>
                                                  <div style={{ borderLeft: columnIndex === 1 ? '1px solid #cbd5e1' : 'none', backgroundColor: '#f8fafc' }}></div>
                                                  <div style={{ borderLeft: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}></div>
                                                </React.Fragment>
                                              );
                                            }

                                            return (
                                              <React.Fragment key={`flowchart-preview-option-${option.value}`}>
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontWeight: 700,
                                                  backgroundColor: '#fff7ed',
                                                  color: '#9a3412',
                                                  borderLeft: columnIndex === 1 ? '1px solid #cbd5e1' : 'none',
                                                  borderRight: '1px solid #cbd5e1',
                                                  minHeight: '44px',
                                                }}>
                                                  {option.value}
                                                </div>
                                                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                                  {option.label || option.raw}
                                                </div>
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div style={{ maxWidth: '760px', margin: '0 auto', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', marginBottom: '14px' }}>
                                      {q.questionText || 'Flowchart Preview'}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      {steps.map((step, stepIndex) => {
                                        const blankEntry = entryByStepIndex.get(stepIndex);
                                        const textParts = splitFlowchartStepText(step?.text || '');
                                        const previewBefore = blankEntry
                                          ? (textParts.hasPlaceholder ? textParts.before : String(step?.text || ''))
                                          : String(step?.text || '');
                                        const previewAfter = blankEntry && textParts.hasPlaceholder ? textParts.after : '';

                                        return (
                                          <React.Fragment key={`flow-step-${stepIndex}`}>
                                            <div style={{ width: '100%', padding: '6px 0', lineHeight: 1.8, fontSize: '1rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                <span>{previewBefore}</span>
                                                {blankEntry && (
                                                  <>
                                                    <span style={{ fontWeight: 700 }}>{blankEntry.num}</span>
                                                    <span style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      minWidth: '86px',
                                                      padding: '5px 12px',
                                                      margin: '0 4px',
                                                      borderRadius: '8px',
                                                      backgroundColor: '#fef3c7',
                                                      border: '1px solid #fcd34d',
                                                      fontWeight: 700,
                                                      color: '#92400e',
                                                    }}>
                                                      {blankEntry.expected || '...'}
                                                    </span>
                                                    <span>{previewAfter}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            {stepIndex < steps.length - 1 && (
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 2px' }}>
                                                <div style={{ width: '2px', height: '26px', backgroundColor: '#1d4ed8' }}></div>
                                                <LineIcon name="chevron-down" size={18} />
                                              </div>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}



                            {/* MULTI-SELECT */}
                            {section.questionType === 'multi-select' && (
                              <div>
                                {section.questions?.map((q, qIdx) => {
                                  const qNum = sectionStartQ + (section.questions.slice(0, qIdx).reduce((sum, prevQ) => sum + (prevQ.requiredAnswers || 2), 0));
                                  const qEnd = qNum + (q.requiredAnswers || 2) - 1;
                                  
                                  return (
                                    <div key={qIdx} style={{
                                      padding: "10px",
                                      marginBottom: "10px",
                                      backgroundColor: "#f8fafc",
                                      borderRadius: "6px",
                                      border: "1px solid #e5e7eb",
                                    }}>
                                      <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "13px" }}>
                                        Questions {qNum} and {qEnd}
                                      </div>
                                      <div style={{ marginBottom: "8px", fontSize: "13px" }}>{q.questionText}</div>
                                      <div style={{ paddingLeft: "12px" }}>
                                        {q.options?.map((opt, oIdx) => (
                                          <div key={oIdx} style={{
                                            padding: "3px 0",
                                            fontSize: "12px",
                                            color: q.correctAnswer?.includes(String.fromCharCode(65 + oIdx)) ? "#16a34a" : "#4b5563",
                                            fontWeight: q.correctAnswer?.includes(String.fromCharCode(65 + oIdx)) ? "bold" : "normal",
                                          }}>
                                            {q.correctAnswer?.includes(String.fromCharCode(65 + oIdx)) ? "Đúng: " : ""}{opt}
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{
                                        marginTop: "8px",
                                        padding: "6px 10px",
                                        backgroundColor: "#dcfce7",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}>
                                        <strong>Đáp án:</strong> {q.correctAnswer || "(Chưa có)"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* ABC / ABCD */}
                            {(section.questionType === 'abc' || section.questionType === 'abcd') && (
                              <div>
                                {section.questions?.map((q, qIdx) => {
                                  const qNum = sectionStartQ + qIdx;
                                  
                                  return (
                                    <div key={qIdx} style={{
                                      padding: "10px",
                                      marginBottom: "8px",
                                      backgroundColor: "#f8fafc",
                                      borderRadius: "6px",
                                      border: "1px solid #e5e7eb",
                                    }}>
                                      <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>
                                        <span style={{
                                          backgroundColor: "#3b82f6",
                                          color: "white",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          marginRight: "8px",
                                        }}>Q{qNum}</span>
                                        {q.questionText}
                                      </div>
                                      <div style={{ paddingLeft: "12px" }}>
                                        {q.options?.map((opt, oIdx) => (
                                          <div key={oIdx} style={{
                                            padding: "3px 0",
                                            fontSize: "12px",
                                            color: q.correctAnswer === String.fromCharCode(65 + oIdx) ? "#16a34a" : "#4b5563",
                                            fontWeight: q.correctAnswer === String.fromCharCode(65 + oIdx) ? "bold" : "normal",
                                          }}>
                                            {q.correctAnswer === String.fromCharCode(65 + oIdx) ? "Đúng: " : ""}{opt}
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{
                                        marginTop: "6px",
                                        padding: "4px 8px",
                                        backgroundColor: "#dcfce7",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        display: "inline-block",
                                      }}>
                                        Đáp án: <strong>{q.correctAnswer || "(Chưa có)"}</strong>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* FILL */}
                            {section.questionType === 'fill' && (
                              <div>
                                {section.questions?.map((q, qIdx) => {
                                  const qNum = sectionStartQ + qIdx;
                                  
                                  return (
                                    <div key={qIdx} style={{
                                      padding: "8px 10px",
                                      marginBottom: "6px",
                                      backgroundColor: "#f8fafc",
                                      borderRadius: "6px",
                                      border: "1px solid #e5e7eb",
                                      fontSize: "12px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}>
                                      <div>
                                        <span style={{
                                          backgroundColor: "#3b82f6",
                                          color: "white",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          marginRight: "8px",
                                          fontSize: "11px",
                                        }}>Q{qNum}</span>
                                        {q.questionText || "________"}
                                      </div>
                                      <span style={{
                                        padding: "4px 10px",
                                        backgroundColor: "#dcfce7",
                                        borderRadius: "4px",
                                        color: "#166534",
                                        fontWeight: "bold",
                                      }}>
                                        {q.correctAnswer || "(Chưa có đáp án)"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      })}
                  </div>
                ));
              })()}
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "15px",
              borderTop: "1px solid #e5e7eb",
            }}>
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                style={secondaryButtonStyle}
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Review confirm clicked');
                  try { console.log('Current parts at confirm:', parts); } catch (e) { console.error('Could not log parts', e); }
                  if (typeof onConfirmSubmit === 'function') {
                    onConfirmSubmit();
                  } else {
                    console.warn('onConfirmSubmit is not a function');
                  }
                }}
                style={primaryButtonStyle}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xử lý..." : `Xác nhận ${submitButtonText || "tạo đề"}`}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* BULK ADD MODAL */}
      {showBulkAddModal && (
        <div style={modalStyles}>
          <div style={{ ...modalContentStyles, maxWidth: "400px" }}>
            <div style={modalHeaderStyles}>
              <h3 style={{ margin: 0 }}>Thêm nhiều câu hỏi</h3>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Số lượng câu hỏi
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={bulkAddCount}
                onChange={(e) => setBulkAddCount(parseInt(e.target.value) || 1)}
                style={compactInputStyle}
              />

              <label style={{ display: "block", marginBottom: "8px", marginTop: "16px", fontWeight: 600 }}>
                Loại câu hỏi
              </label>
              <QuestionTypeSelectField
                value={bulkAddType}
                onChange={setBulkAddType}
                options={questionTypes}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowBulkAddModal(false)}
                style={secondaryButtonStyle}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkAddQuestions(selectedPartIndex, selectedSectionIndex, bulkAddCount, bulkAddType);
                  setShowBulkAddModal(false);
                }}
                style={primaryButtonStyle}
              >
                Thêm {bulkAddCount} câu
              </button>
            </div>
          </div>
        </div>
      )}


    </IeltsTestEditorShell>
  </>
  );
};

export default ListeningTestEditor;
