import React, { useState, useRef, useEffect } from "react";
import { IeltsTestEditorShell } from "../../../shared/components";
import { useColumnLayout } from "../hooks";
import ListeningQuestionEditor from "./ListeningQuestionEditor";
import TableCompletion from "../../../shared/components/questions/editors/TableCompletion.jsx";

import {
  colors,
  compactInputStyle,
  modalStyles,
  modalContentStyles,
  modalHeaderStyles,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  columnHeaderStyle,
  itemStyle,
  deleteButtonSmallStyle,
  addButtonStyle,
  resizeDividerStyle,
  audioUploadStyle,
  audioUploadActiveStyle,
  partTypeBadgeStyle,
  compactCSS,
} from "../utils/styles";
import { calculateTotalQuestions, computeQuestionStarts } from "../hooks/useListeningHandlers";

/**
 * Đếm số câu hỏi thực tế của một section
 * Tính đến các loại câu hỏi đặc biệt: matching, form-completion, multi-select, notes-completion
 */
const stripHtml = (html) => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

const countTableCompletionBlanks = (question) => {
  const rowsArr = question?.rows || [];
  const cols = question?.columns || [];
  const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/g;
  let blanksCount = 0;

  rowsArr.forEach((row) => {
    const r = Array.isArray(row?.cells)
      ? row
      : {
          cells: [
            row?.vehicle || '',
            row?.cost || '',
            Array.isArray(row?.comments) ? row.comments.join('\n') : row?.comments || '',
          ],
        };

    const cells = Array.isArray(r.cells) ? r.cells : [];
    const maxCols = cols.length ? cols.length : cells.length;
    for (let c = 0; c < maxCols; c++) {
      const text = String(cells[c] || '');
      const matches = text.match(BLANK_REGEX) || [];
      blanksCount += matches.length;
    }
  });

  if (blanksCount === 0) {
    return rowsArr.length || 0;
  }

  return blanksCount;
};

const countSectionQuestions = (section) => {
  if (!section?.questions) return 0;
  
  const questionType = section.questionType || 'fill';
  
  // Matching: Số câu = số leftItems
  if (questionType === 'matching') {
    return section.questions[0]?.leftItems?.length || 0;
  }
  
  // Form-completion: Số câu = số ô trống (isBlank)
  if (questionType === 'form-completion') {
    return section.questions[0]?.formRows?.filter(r => r.isBlank)?.length || 0;
  }
  
  // Notes-completion: Số câu = số blanks trong notesText
  if (questionType === 'notes-completion') {
    const notesText = stripHtml(section.questions[0]?.notesText || '');
    const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
    return blanks.length;
  }

  // Table-completion: số câu = số blanks trong table
  if (questionType === 'table-completion') {
    return countTableCompletionBlanks(section.questions[0] || {});
  }

  // Map-labeling: số câu = số items
  if (questionType === 'map-labeling') {
    const items = section.questions[0]?.items || [];
    return items.length;
  }
  
  // Multi-select: Mỗi câu tính theo số đáp án cần chọn (requiredAnswers)
  // VD: "Choose TWO" = 2 câu hỏi, "Choose THREE" = 3 câu hỏi
  if (questionType === 'multi-select') {
    return section.questions.reduce((sum, q) => {
      return sum + (q.requiredAnswers || 2); // Mặc định là 2
    }, 0);
  }
  
  // Các loại khác (fill, abc, abcd): 1 câu = 1 question
  return section.questions.length;
};

const formatNotesHtml = (notesText = '') => {
  if (!notesText) return '';
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(notesText);
  if (hasHtml) return notesText;
  return String(notesText).replace(/\n/g, '<br/>');
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
  pageTitle = "🎧 Listening Test Editor",
  className = "listening-test-editor",

  // Form fields
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
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
}) => {
  // Column layout hook
  const {
    collapsedColumns,
    isResizing,
    toggleColumnCollapse,
    handleMouseDown,
    getColumnWidth,
  } = useColumnLayout();

  // Header collapse state: auto-collapses on scroll or toggled manually
  const [collapsedHeader, setCollapsedHeader] = useState(false);
  const [manualHeaderOverride, setManualHeaderOverride] = useState(false);

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

  const toggleHeader = () => {
    setCollapsedHeader((p) => !p);
    setManualHeaderOverride(true);
  }; 

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
    { value: 'fill', label: '📝 Fill in the blank', desc: 'Điền từ vào chỗ trống (từng câu)' },
    { value: 'form-completion', label: '📋 Form/Table Completion', desc: 'Form có bảng với nhiều blank' },
    { value: 'table-completion', label: '🧾 Table Completion (Vehicles / Cost / Comments)', desc: '3-column table / notes completion (Part 1)' },
    { value: 'notes-completion', label: '📝 Notes Completion', desc: 'Paste notes có ___ tự tách câu hỏi' },
    { value: 'abc', label: '🔘 Multiple Choice (A/B/C)', desc: '3 lựa chọn' },
    { value: 'abcd', label: '🔘 Multiple Choice (A/B/C/D)', desc: '4 lựa chọn' },
    { value: 'matching', label: '🔗 Matching', desc: 'Nối cột A-B' },
    { value: 'multi-select', label: '✅ Multi Select', desc: 'Chọn 2+ đáp án' },
    { value: 'map-labeling', label: '🗺️ Map/Plan Labeling', desc: 'Gắn nhãn bản đồ' },
    { value: 'flowchart', label: '📊 Flowchart Completion', desc: 'Hoàn thành sơ đồ' },
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
            // Convert percent -> pixel and round to nearest integer for crisp rendering
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
        showResultModal={showResultModal}
        setShowResultModal={setShowResultModal}
        lastSaved={lastSaved}
        isSaving={isSaving}
        message={message}
        renderMessage={(currentMessage) => (
          <div
            style={{
              textAlign: "center",
              padding: "10px",
              marginTop: "10px",
              backgroundColor: currentMessage.includes("❌")
                ? "#fee2e2"
                : currentMessage.includes("✅")
                ? "#dcfce7"
                : "#fef3c7",
              borderRadius: "8px",
              color: currentMessage.includes("❌")
                ? colors.dangerRed
                : currentMessage.includes("✅")
                ? colors.successGreen
                : "#92400e",
              fontWeight: 500,
            }}
          >
            {currentMessage}
          </div>
        )}
        rightControls={
          <>
            <span
              style={{
                padding: "6px 12px",
                backgroundColor: colors.primaryPurple + "15",
                color: colors.primaryPurple,
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              📊 {totalQuestions} câu hỏi
            </span>

            <button
              type="button"
              onClick={toggleHeader}
              title={collapsedHeader ? "Mở rộng header" : "Thu nhỏ header"}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: collapsedHeader ? "#f3f4f6" : "transparent", marginLeft: 8 }}
            >
              {collapsedHeader ? "▼" : "▲"}
            </button>
          </>
        }
        afterInputs={!collapsedHeader && (
          <div style={{ marginTop: "12px", maxWidth: "1200px", margin: "12px auto 0" }}>
            <div
              style={globalAudioFile?.url ? audioUploadActiveStyle : audioUploadStyle}
              onClick={() => globalAudioRef.current?.click()}
            >
              <input
                type="file"
                ref={globalAudioRef}
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e.target.files[0], true)}
                style={{ display: "none" }}
              />
              {globalAudioFile?.url ? (
                <div>
                  <p style={{ margin: "0 0 8px", color: colors.audioGreen, fontWeight: 600 }}>
                    🎵 Audio chung đã tải lên
                  </p>
                  <audio controls src={globalAudioFile.url} style={{ width: "100%", maxWidth: "400px" }} />
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, color: colors.gray }}>
                    🎵 Click để tải audio chung cho toàn bài thi (optional)
                  </p>
                  <small style={{ color: "#9ca3af" }}>Hoặc upload audio riêng cho từng Part</small>
                </div>
              )}
            </div>
          </div>
        )}
        shellStyle={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontSize: "14px",
          backgroundColor: "#f8fafc",
        }}
        containerStyle={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
        headerStyle={collapsedHeader ? {
          padding: "6px 12px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        } : {
          padding: "8px 12px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }} 
      
        topBarStyle={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: collapsedHeader ? "4px" : "8px",
        }} 
      
        titleStyle={{ margin: 0, fontSize: collapsedHeader ? "14px" : "16px", color: colors.primaryPurple }} 
      
        inputLayoutStyle={collapsedHeader ? {
          display: "none",
          gap: "12px",
          flexWrap: "wrap",
          maxWidth: "1200px",
          margin: "0 auto",
        } : {
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      
        titleInputStyle={{ ...compactInputStyle, flex: "1 1 40%", minWidth: "200px" }}
        classCodeInputStyle={{ ...compactInputStyle, flex: "1 1 20%", minWidth: "120px" }}
        teacherInputStyle={{ ...compactInputStyle, flex: "1 1 25%", minWidth: "150px" }}
      >
        {/* 4-COLUMN LAYOUT */}
        <form
          onSubmit={onReview}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* COLUMN 1: PARTS */}
            <div
              style={{
                width: getColumnWidth("col1"),
                backgroundColor: "#f8fafc",
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.partBlue)}
                onClick={() => toggleColumnCollapse("col1")}
              >
                {!collapsedColumns.col1 && <span>🎧 PARTS</span>}
                {collapsedColumns.col1 && <span style={{ fontSize: "16px" }}>🎧</span>}
                <span style={{ fontSize: "11px" }}>{collapsedColumns.col1 ? "▶" : "◀"}</span>
              </div>

              {!collapsedColumns.col1 && (
                <div style={{ flex: 1, overflow: "auto", padding: "10px" }}>
                  {parts?.map((part, idx) => (
                    <div
                      key={idx}
                      style={itemStyle(selectedPartIndex === idx, colors.partBlue)}
                    >
                      <div
                        onClick={() => {
                          setSelectedPartIndex(idx);
                          setSelectedSectionIndex(part.sections?.length > 0 ? 0 : null);
                        }}
                        style={{ flex: 1, cursor: "pointer" }}
                      >
                        <strong>{part.title}</strong>
                        <br />
                        <small style={{ opacity: 0.8 }}>
                          {part.sections?.length || 0} sections • {
                            part.sections?.reduce((t, s) => t + (s.questions?.length || 0), 0) || 0
                          } questions
                        </small>
                        {part.audioFile && (
                          <span style={{ ...partTypeBadgeStyle(colors.audioGreen), marginLeft: "6px" }}>
                            🎵 Audio
                          </span>
                        )}
                      </div>
                      {parts.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeletePart(idx); }}
                          style={deleteButtonSmallStyle}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={onAddPart}
                    style={addButtonStyle(colors.partBlue)}
                  >
                    ➕ Thêm Part
                  </button>
                </div>
              )}
            </div>

            {/* RESIZE DIVIDER 1 */}
            <div
              onMouseDown={(e) => handleMouseDown(1, e)}
              style={resizeDividerStyle(isResizing === 1)}
            />

            {/* COLUMN 2: PART CONTENT (Audio + Instructions) */}
            <div
              style={{
                width: getColumnWidth("col2"),
                backgroundColor: "#fff",
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.audioGreen)}
                onClick={() => toggleColumnCollapse("col2")}
              >
                {!collapsedColumns.col2 && <span>🎵 AUDIO & CONTENT</span>}
                {collapsedColumns.col2 && <span style={{ fontSize: "16px" }}>🎵</span>}
                <span style={{ fontSize: "11px" }}>{collapsedColumns.col2 ? "▶" : "◀"}</span>
              </div>

              {!collapsedColumns.col2 && currentPart ? (
                <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
                  {/* Part Title */}
                  <label style={{ color: colors.audioGreen, fontWeight: 600 }}>📌 Tiêu đề Part</label>
                  <input
                    type="text"
                    value={currentPart.title || ""}
                    onChange={(e) => onPartChange(selectedPartIndex, "title", e.target.value)}
                    style={{ ...compactInputStyle, marginBottom: "16px" }}
                  />

                  {/* Part Audio */}
                  <label style={{ color: colors.audioGreen, fontWeight: 600 }}>🎵 Audio cho Part này</label>
                  <div
                    style={currentPart.audioUrl ? audioUploadActiveStyle : audioUploadStyle}
                    onClick={() => partAudioRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={partAudioRef}
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload(e.target.files[0], false, selectedPartIndex)}
                      style={{ display: "none" }}
                    />
                    {currentPart.audioUrl ? (
                      <div>
                        <p style={{ margin: "0 0 8px", color: colors.audioGreen, fontWeight: 500 }}>
                          ✅ Audio đã tải lên
                        </p>
                        <audio controls src={currentPart.audioUrl} style={{ width: "100%" }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPartChange(selectedPartIndex, 'audioFile', null);
                            onPartChange(selectedPartIndex, 'audioUrl', '');
                          }}
                          style={{ ...dangerButtonStyle, marginTop: "8px", padding: "6px 12px" }}
                        >
                          🗑️ Xóa audio
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: colors.gray }}>
                        Click để tải audio cho Part {selectedPartIndex + 1}
                      </p>
                    )}
                  </div>

                  {/* Instructions */}
                  <div style={{ marginTop: "20px" }}>
                    <label style={{ color: colors.audioGreen, fontWeight: 600 }}>📝 Hướng dẫn Part</label>
                    <textarea
                      value={currentPart.instruction || ""}
                      onChange={(e) => onPartChange(selectedPartIndex, "instruction", e.target.value)}
                      placeholder="VD: You will hear a conversation between a student and a tutor..."
                      style={{
                        ...compactInputStyle,
                        minHeight: "100px",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Transcript (optional) */}
                  <div style={{ marginTop: "16px" }}>
                    <label style={{ color: colors.audioGreen, fontWeight: 600 }}>
                      📜 Transcript (Optional)
                    </label>
                    <textarea
                      value={currentPart.transcript || ""}
                      onChange={(e) => onPartChange(selectedPartIndex, "transcript", e.target.value)}
                      placeholder="Nhập transcript audio nếu có..."
                      style={{
                        ...compactInputStyle,
                        minHeight: "150px",
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                </div>
              ) : (
                !collapsedColumns.col2 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                    ← Chọn một Part
                  </div>
                )
              )}
            </div>

            {/* RESIZE DIVIDER 2 */}
            <div
              onMouseDown={(e) => handleMouseDown(2, e)}
              style={resizeDividerStyle(isResizing === 2)}
            />

            {/* COLUMN 3: SECTIONS */}
            <div
              style={{
                width: getColumnWidth("col3"),
                backgroundColor: "#f8fafc",
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.sectionOrange)}
                onClick={() => toggleColumnCollapse("col3")}
              >
                {!collapsedColumns.col3 && <span>📌 SECTIONS</span>}
                {collapsedColumns.col3 && <span style={{ fontSize: "16px" }}>📌</span>}
                <span style={{ fontSize: "11px" }}>{collapsedColumns.col3 ? "▶" : "◀"}</span>
              </div>

              {!collapsedColumns.col3 && currentPart ? (
                <div style={{ flex: 1, overflow: "auto", padding: "10px" }}>
                  {currentPart.sections?.map((section, idx) => {
                    // Tính số câu bắt đầu cho section này
                    const startQ = calculateStartingQuestionNumber(parts, selectedPartIndex, idx);
                    const sectionQCount = countSectionQuestions(section);
                    const endQ = startQ + sectionQCount - 1;
                    const questionRange = sectionQCount > 0 
                      ? `Q${startQ}-${endQ}` 
                      : `Q${startQ}`;
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedSectionIndex(idx)}
                        style={itemStyle(selectedSectionIndex === idx, colors.sectionOrange)}
                      >
                        <div style={{ flex: 1 }}>
                          <strong>{section.sectionTitle || `Questions ${startQ}-${endQ}`}</strong>
                          <br />
                          <small style={{ opacity: 0.8 }}>
                            {sectionQCount} câu • {section.questionType || 'fill'}
                          </small>
                          <span style={{
                            marginLeft: "6px",
                            padding: "2px 6px",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}>
                            {questionRange}
                          </span>
                        </div>
                        {currentPart.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteSection(selectedPartIndex, idx); }}
                            style={deleteButtonSmallStyle}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onAddSection(selectedPartIndex)}
                    style={addButtonStyle(colors.sectionOrange)}
                  >
                    ➕ Thêm Section
                  </button>

                </div>
              ) : (
                !collapsedColumns.col3 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                    ← Chọn một Part
                  </div>
                )
              )}
            </div>

            {/* RESIZE DIVIDER 3 */}
            <div
              onMouseDown={(e) => handleMouseDown(3, e)}
              style={resizeDividerStyle(isResizing === 3)}
            />

            {/* COLUMN 4: QUESTIONS */}
            <div
              style={{
                width: getColumnWidth("col4"),
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.questionYellow, "#1f2937")}
                onClick={() => toggleColumnCollapse("col4")}
              >
                {!collapsedColumns.col4 && <span>❓ QUESTIONS</span>}
                {collapsedColumns.col4 && <span style={{ fontSize: "16px" }}>❓</span>}
                <span style={{ fontSize: "11px" }}>{collapsedColumns.col4 ? "▶" : "◀"}</span>
              </div>

              {!collapsedColumns.col4 && currentSection ? (
                <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
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
                            📊 <strong>Phạm vi câu hỏi:</strong> {startQ} - {endQ} 
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
                            🔢 Số câu bắt đầu:
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
                          <select
                            value={currentSection.questionType || "fill"}
                            onChange={(e) => onSectionChange(selectedPartIndex, selectedSectionIndex, "questionType", e.target.value)}
                            style={{ ...compactInputStyle, width: "auto" }}
                          >
                            {questionTypes.map(qt => (
                              <option key={qt.value} value={qt.value}>{qt.label}</option>
                            ))}
                          </select>
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
                      
                      // Calculate total questions for this section
                      let totalSubQuestions = 0;
                      if (isMatchingType) {
                        totalSubQuestions = currentSection.questions?.[0]?.leftItems?.length || 0;
                      } else if (isFormCompletionType) {
                        // Count blanks in form-completion
                        totalSubQuestions = currentSection.questions?.[0]?.formRows?.filter(r => r.isBlank)?.length || 0;
                      } else {
                        totalSubQuestions = currentSection.questions?.length || 0;
                      }
                      
                      // Show range for multi-question types (matching, form-completion)
                      const showRange = isMatchingType || isFormCompletionType;
                      
                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h4 style={{ margin: 0, color: colors.questionYellow }}>
                              {showRange 
                                ? `${isMatchingType ? 'Matching' : 'Form Completion'} Block (${totalSubQuestions} câu: ${sectionStartQ}-${sectionStartQ + totalSubQuestions - 1})`
                                : `Câu hỏi (${currentSection.questions?.length || 0})`
                              }
                            </h4>
                            <div style={{ display: "flex", gap: "6px" }}>

                              <button
                                type="button"
                                onClick={() => setShowBulkAddModal(true)}
                                style={{ ...secondaryButtonStyle, padding: "6px 10px", fontSize: "11px" }}
                              >
                                ➕ Thêm nhiều
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

                  {/* Add Question Button */}
                  <button
                    type="button"
                    onClick={() => onAddQuestion(selectedPartIndex, selectedSectionIndex, currentSection.questionType)}
                    style={addButtonStyle(colors.questionYellow)}
                  >
                    ➕ Thêm câu hỏi
                  </button>

                  {/* Copy Section Button */}
                  <button
                    type="button"
                    onClick={() => onCopySection(selectedPartIndex, selectedSectionIndex)}
                    style={{ ...addButtonStyle(colors.gray), marginTop: "8px" }}
                  >
                    📋 Copy Section này
                  </button>
                </div>
              ) : (
                !collapsedColumns.col4 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                    ← Chọn một Section
                  </div>
                )
              )}
            </div>
          </div>

          {/* FOOTER - Submit buttons */}
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#fff",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button type="button" onClick={onManualSave} style={secondaryButtonStyle}>
              💾 Lưu nháp
            </button>
            <button type="submit" style={primaryButtonStyle} disabled={isSubmitting}>
              {isSubmitting ? "⏳ Đang xử lý..." : `✅ ${submitButtonText}`}
            </button>
          </div>
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
              <h3 style={{ margin: 0 }}>📋 Xác nhận {submitButtonText === "Cập nhật" ? "cập nhật" : "tạo"} đề thi</h3>
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
                ✕
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
              <div><strong>📝 Tiêu đề:</strong> {title || "(Chưa đặt)"}</div>
              <div><strong>🏫 Mã lớp:</strong> {classCode || "(Không có)"}</div>
              <div><strong>👨‍🏫 Giáo viên:</strong> {teacherName || "(Không có)"}</div>
              <div><strong>🎧 Parts:</strong> {parts?.length || 0}</div>
              <div><strong>❓ Tổng câu hỏi:</strong> {totalQuestions}</div>
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
                        <span>🎧 {part.title || `Part ${partIdx + 1}`}</span>
                        <span style={{
                          padding: "3px 10px",
                          backgroundColor: part.audioFile ? "#22c55e" : "#ef4444",
                          borderRadius: "20px",
                          fontSize: "11px",
                        }}>
                          {part.audioFile ? "🎵 CÓ AUDIO" : "⚠️ CHƯA CÓ AUDIO"}
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
                          📝 {part.instruction}
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
                              <span>📌 {section.sectionTitle || `Questions ${sectionStartQ}-${sectionStartQ + sectionQCount - 1}`}</span>
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
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>✅ Đáp án:</strong>
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
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>✅ Đáp án:</strong>
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
                            {section.questionType === 'table-completion' && section.questions[0] && (
                              <div>
                                <div style={{
                                  padding: "12px",
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "6px",
                                  marginBottom: "12px",
                                  border: "1px solid #e5e7eb",
                                }}>
                                  <strong style={{ display: "block", marginBottom: "10px" }}>
                                    {section.questions[0].title || "Table"}
                                  </strong>
                                  {typeof TableCompletion === 'function' ? (
                                    <TableCompletion data={{
                                      part: partIdx + 1,
                                      title: section.questions[0].title || "",
                                      instruction: section.questions[0].instruction || "",
                                      columns: section.questions[0].columns || [],
                                      rows: section.questions[0].rows || [],
                                      rangeStart: sectionStartQ,
                                      rangeEnd: sectionStartQ + ((section.questions[0].rows || []).length ? (section.questions[0].rows || []).length - 1 : 0),
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
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>✅ Đáp án:</strong>
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}>
                                    {/* Render blanks (cost + comment lines) numbered sequentially and show editable inputs when no answers map provided */}
                                    {(() => {
                                      const BLANK_REGEX = /_{2,}|[\u2026]+/g;
                                      function splitIntoParts(text = '') {
                                        const parts = [];
                                        let lastIndex = 0;
                                        let match;
                                        while ((match = BLANK_REGEX.exec(text)) !== null) {
                                          if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
                                          parts.push({ type: 'blank', raw: match[0] });
                                          lastIndex = match.index + match[0].length;
                                        }
                                        if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
                                        return parts;
                                      }

                                      // Build a live preview answers map from current rows/cells (ROW-major: left→right within row, then next row)
                                      const buildPreviewAnswers = () => {
                                        const map = {};
                                        const BLANK_DETECT = /\[BLANK\]|_{2,}|[\u2026]+/g;
                                        let num = sectionStartQ;
                                        const cols2 = section.questions[0].columns || [];
                                        const rows2 = section.questions[0].rows || [];
                                        let foundAny = false;

                                        const getFlatCommentAnswer = (commentBlankAnswers, flatIdx) => {
                                          if (!Array.isArray(commentBlankAnswers)) return undefined;
                                          let acc = 0;
                                          for (let li = 0; li < commentBlankAnswers.length; li++) {
                                            const arr = commentBlankAnswers[li] || [];
                                            if (flatIdx < acc + (arr.length || 0)) return arr[flatIdx - acc];
                                            acc += (arr.length || 0);
                                          }
                                          return undefined;
                                        };

                                        for (let r = 0; r < rows2.length; r++) {
                                          const rawRow = rows2[r];
                                          const row = Array.isArray(rawRow.cells)
                                            ? rawRow
                                            : { cells: [rawRow.vehicle || '', rawRow.cost || '', Array.isArray(rawRow.comments) ? rawRow.comments.join('\n') : rawRow.comments || ''], cellBlankAnswers: rawRow.cellBlankAnswers || [], commentBlankAnswers: rawRow.commentBlankAnswers || [], correct: rawRow.correct };

                                          for (let c = 0; c < cols2.length; c++) {
                                            const isCommentsCol = /comment/i.test(cols2[c]);
                                            const text = String(row.cells[c] || '');
                                            BLANK_DETECT.lastIndex = 0;
                                            let localIdx = 0;

                                            while (BLANK_DETECT.exec(text) !== null) {
                                              foundAny = true;
                                              const key = String(num++);
                                              let cbVal = '';
                                              if (isCommentsCol) {
                                                cbVal = getFlatCommentAnswer(row.commentBlankAnswers, localIdx) || '';
                                              } else {
                                                cbVal = (row.cellBlankAnswers && row.cellBlankAnswers[c] && row.cellBlankAnswers[c][localIdx]) || '';
                                              }

                                              if (cbVal) map[key] = cbVal;
                                              else if (c === 1 && row.correct) map[key] = row.correct;
                                              localIdx++;
                                            }
                                          }
                                        }

                                        if (!foundAny) {
                                          // fallback: one blank per row
                                          for (let r = 0; r < (section.questions[0].rows || []).length; r++) {
                                            const key = String(num++);
                                            const row = section.questions[0].rows[r];
                                            map[key] = (row?.correct ?? row?.cost ?? '') || '';
                                          }
                                        }

                                        return map;
                                      };

                                      const previewMap = buildPreviewAnswers();

                                      // Build editable inputs for each blank in table (ROW-major: left→right in row then next row)
                                      const map = previewMap;
                                      let qnum = sectionStartQ;
                                      const cols = section.questions[0].columns || [];
                                      const rowsArr = section.questions[0].rows || [];
                                      const inputs = [];

                                      for (let rIdx = 0; rIdx < rowsArr.length; rIdx++) {
                                        const rawRow = rowsArr[rIdx];
                                        const row = Array.isArray(rawRow.cells)
                                          ? rawRow
                                          : { cells: [rawRow.vehicle || '', rawRow.cost || '', Array.isArray(rawRow.comments) ? rawRow.comments.join('\n') : rawRow.comments || ''], cellBlankAnswers: rawRow.cellBlankAnswers || rawRow.commentBlankAnswers || [], commentBlankAnswers: rawRow.commentBlankAnswers || [] };

                                        for (let c = 0; c < cols.length; c++) {
                                          const parts = splitIntoParts(String(row.cells[c] || ''));
                                          let localIdx = 0;
                                          for (const p of parts) {
                                            if (p.type !== 'blank') continue;
                                            const qNum = qnum++;

                                            // handle commentBlankAnswers (per-line) by flattening index when needed
                                            const getFlatCommentAnswer = (commentBlankAnswers, flatIdx) => {
                                              if (!Array.isArray(commentBlankAnswers)) return undefined;
                                              let acc = 0;
                                              for (let li = 0; li < commentBlankAnswers.length; li++) {
                                                const arr = commentBlankAnswers[li] || [];
                                                if (flatIdx < acc + (arr.length || 0)) return arr[flatIdx - acc];
                                                acc += (arr.length || 0);
                                              }
                                              return undefined;
                                            };

                                            const cbVal = /comment/i.test((section.questions[0].columns || [])[c])
                                              ? (getFlatCommentAnswer(row.commentBlankAnswers, localIdx) || '')
                                              : ((row.cellBlankAnswers && row.cellBlankAnswers[c] && row.cellBlankAnswers[c][localIdx]) || '');
                                            const value = map[String(qNum)] ?? cbVal ?? (c === 1 ? (row.correct ?? '') : '');

                                            const onChange = (v) => {
                                              const newMap = { ...(section.questions[0].answers || {}) };
                                              newMap[String(qNum)] = v;
                                              onQuestionChange(partIdx, sIdx, 0, 'answers', newMap);
                                            };

                                            inputs.push(
                                              <div key={`tbl-${qNum}`} style={{ padding: '4px 8px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
                                                <strong style={{ display: 'block', marginBottom: 6 }}>{qNum}.</strong>
                                                <input type="text" value={value} placeholder="(Chưa có)" onChange={(e) => onChange(e.target.value)} style={{ ...compactInputStyle, width: '100%' }} />
                                                {/* If teacher entered multiple variants (separated by | / ;), show them as visual hint */}
                                                {typeof value === 'string' && /\||\//.test(value) && (
                                                  <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>
                                                    <em>Accepted variants:</em> {String(value).split(/\||\//).map(s => s.trim()).filter(Boolean).join(' | ')}
                                                  </div>
                                                )}
                                              </div>
                                            );

                                            localIdx++;
                                          }
                                        }
                                      }

                                      return inputs;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}

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
                                  <strong style={{ fontSize: "12px", color: "#166534" }}>✅ Đáp án:</strong>
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
                                    <strong>📍 Các địa điểm:</strong>
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
                                            {q.correctAnswer?.includes(String.fromCharCode(65 + oIdx)) ? "✓ " : "☐ "}{opt}
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
                                        <strong>✅ Đáp án:</strong> {q.correctAnswer || "(Chưa có)"}
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
                                            {q.correctAnswer === String.fromCharCode(65 + oIdx) ? "✓ " : ""}{opt}
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
                                        ✅ Đáp án: <strong>{q.correctAnswer || "(Chưa có)"}</strong>
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
                ← Quay lại chỉnh sửa
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
                {isSubmitting ? "⏳ Đang xử lý..." : `✅ Xác nhận ${submitButtonText || "tạo đề"}`}
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
              <span style={{ fontSize: "20px" }}>➕</span>
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
              <select
                value={bulkAddType}
                onChange={(e) => setBulkAddType(e.target.value)}
                style={compactInputStyle}
              >
                {questionTypes.map(qt => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
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
                ➕ Thêm {bulkAddCount} câu
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
