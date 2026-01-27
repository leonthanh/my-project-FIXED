import React, { useState, useRef } from "react";
import { IeltsTestEditorShell } from "../../../shared/components";
import { useColumnLayout } from "../hooks";
import ListeningQuestionEditor from "./ListeningQuestionEditor";
import ListeningTemplateLibrary from "./ListeningTemplateLibrary";
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
import { calculateTotalQuestions } from "../hooks/useListeningHandlers";

/**
 * Đếm số câu hỏi thực tế của một section
 * Tính đến các loại câu hỏi đặc biệt: matching, form-completion, multi-select, notes-completion
 */
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
    const notesText = section.questions[0]?.notesText || '';
    const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
    return blanks.length;
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

  // Messages & Preview
  message,
  showPreview,
  setShowPreview,

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

  // Audio input refs
  const globalAudioRef = useRef(null);
  const partAudioRef = useRef(null);

  // Bulk add modal state
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkAddCount, setBulkAddCount] = useState(5);
  const [bulkAddType, setBulkAddType] = useState('fill');

  // Template library modal state
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [templateLibraryMode, setTemplateLibraryMode] = useState('question'); // 'question' | 'section'

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
    { value: 'notes-completion', label: '📝 Notes Completion', desc: 'Paste notes có ___ tự tách câu hỏi' },
    { value: 'abc', label: '🔘 Multiple Choice (A/B/C)', desc: '3 lựa chọn' },
    { value: 'abcd', label: '🔘 Multiple Choice (A/B/C/D)', desc: '4 lựa chọn' },
    { value: 'matching', label: '🔗 Matching', desc: 'Nối cột A-B' },
    { value: 'multi-select', label: '✅ Multi Select', desc: 'Chọn 2+ đáp án' },
    { value: 'map-labeling', label: '🗺️ Map/Plan Labeling', desc: 'Gắn nhãn bản đồ' },
    { value: 'flowchart', label: '📊 Flowchart Completion', desc: 'Hoàn thành sơ đồ' },
  ];

  // Handle template selection (single question)
  const handleSelectTemplate = (template) => {
    if (selectedPartIndex !== null && selectedSectionIndex !== null) {
      // Add the template as a new question
      onAddQuestion(selectedPartIndex, selectedSectionIndex, template.questionType);
      // Update the last added question with template data
      const newQuestionIndex = currentSection?.questions?.length || 0;
      Object.entries(template).forEach(([key, value]) => {
        if (key !== 'questionType') {
          onQuestionChange(selectedPartIndex, selectedSectionIndex, newQuestionIndex, key, value);
        }
      });
    }
  };

  // Handle section template selection
  const handleSelectSectionTemplate = (sectionTemplate) => {
    if (selectedPartIndex !== null) {
      // Add a new section with the template
      onAddSection(selectedPartIndex);
      const newSectionIndex = currentPart?.sections?.length || 0;
      
      // Update section properties
      onSectionChange(selectedPartIndex, newSectionIndex, 'sectionTitle', sectionTemplate.title);
      onSectionChange(selectedPartIndex, newSectionIndex, 'sectionInstruction', sectionTemplate.instructions);
      onSectionChange(selectedPartIndex, newSectionIndex, 'questionType', sectionTemplate.questionType);
      
      // Add template questions
      sectionTemplate.questions.forEach((q, idx) => {
        if (idx === 0) {
          // First question already exists, update it
          Object.entries(q).forEach(([key, value]) => {
            onQuestionChange(selectedPartIndex, newSectionIndex, 0, key, value);
          });
        } else {
          // Add more questions
          onAddQuestion(selectedPartIndex, newSectionIndex, sectionTemplate.questionType);
          Object.entries(q).forEach(([key, value]) => {
            onQuestionChange(selectedPartIndex, newSectionIndex, idx, key, value);
          });
        }
      });
      
      // Select the new section
      setSelectedSectionIndex(newSectionIndex);
    }
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
              onClick={() => {
                setTemplateLibraryMode("section");
                setShowTemplateLibrary(true);
              }}
              style={{
                ...primaryButtonStyle,
                padding: "6px 14px",
                fontSize: "13px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              📚 Template Library
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              style={secondaryButtonStyle}
            >
              👁️ Preview
            </button>
          </>
        }
        afterInputs={
          <div style={{ marginTop: "12px", maxWidth: "900px", margin: "12px auto 0" }}>
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
        }
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
        headerStyle={{
          padding: "12px 20px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
        topBarStyle={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
        titleStyle={{ margin: 0, fontSize: "18px", color: colors.primaryPurple }}
        inputLayoutStyle={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          maxWidth: "900px",
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
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateLibraryMode('section');
                      setShowTemplateLibrary(true);
                    }}
                    style={{
                      ...addButtonStyle(colors.primaryPurple),
                      marginTop: "8px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                    }}
                  >
                    📚 Section từ Template
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
                                onClick={() => {
                                  setTemplateLibraryMode('question');
                                  setShowTemplateLibrary(true);
                                }}
                                style={{ ...secondaryButtonStyle, padding: "6px 10px", fontSize: "11px" }}
                              >
                                📚 Template
                              </button>
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
              {parts?.map((part, partIdx) => {
                // Calculate starting question number for this part
                let partStartQ = 1;
                for (let p = 0; p < partIdx; p++) {
                  // eslint-disable-next-line no-loop-func
                  parts[p].sections?.forEach(s => {
                    partStartQ += countSectionQuestions(s);
                  });
                }

                return (
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
                      // Calculate starting question for this section
                      let sectionStartQ = partStartQ;
                      for (let s = 0; s < sIdx; s++) {
                        sectionStartQ += countSectionQuestions(part.sections[s]);
                      }

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
                                  whiteSpace: "pre-wrap",
                                  lineHeight: "1.8",
                                  fontSize: "13px",
                                  border: "1px solid #e5e7eb",
                                }}>
                                  <strong style={{ display: "block", marginBottom: "8px", color: "#1f2937" }}>
                                    {section.questions[0].notesTitle || "Notes"}
                                  </strong>
                                  {section.questions[0].notesText}
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

                            {/* MATCHING */}
                            {section.questionType === 'matching' && section.questions[0] && (
                              <div>
                                <div style={{ display: "flex", gap: "30px", marginBottom: "12px" }}>
                                  <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>Items:</strong>
                                    {section.questions[0].leftItems?.map((item, i) => (
                                      <div key={i} style={{ padding: "4px 0", fontSize: "12px" }}>
                                        <strong>{sectionStartQ + i}.</strong> {item}
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>Options:</strong>
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
                );
              })}
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
                onClick={onConfirmSubmit}
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
      {showPreview && (
        <div style={modalStyles}>
          <div style={{ ...modalContentStyles, maxWidth: "900px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ ...modalHeaderStyles, position: "sticky", top: 0, backgroundColor: "white", zIndex: 10 }}>
              <span style={{ fontSize: "20px" }}>👁️</span>
              <h3 style={{ margin: 0 }}>Xem trước đề thi</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{
                  marginLeft: "auto",
                  padding: "6px 12px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                ✕ Đóng
              </button>
            </div>

            <div style={{ padding: "20px 0" }}>
              {/* Test Header */}
              <div style={{
                textAlign: "center",
                marginBottom: "30px",
                padding: "20px",
                backgroundColor: "#f0f9ff",
                borderRadius: "12px",
              }}>
                <h2 style={{ margin: "0 0 10px 0", color: "#1e40af" }}>
                  🎧 {title || "LISTENING TEST"}
                </h2>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  {classCode && `Mã lớp: ${classCode}`} {teacherName && `| Giáo viên: ${teacherName}`}
                </p>
                <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#6b7280" }}>
                  Tổng: {totalQuestions} câu hỏi | {parts?.length || 0} parts
                </p>
              </div>

              {/* Parts Preview */}
              {parts?.map((part, partIdx) => {
                let questionCounter = 1;
                // Calculate starting question for this part
                for (let p = 0; p < partIdx; p++) {
                  // eslint-disable-next-line no-loop-func
                  parts[p].sections?.forEach(s => {
                    questionCounter += countSectionQuestions(s);
                  });
                }
                const partStartQ = questionCounter;
                
                return (
                  <div key={partIdx} style={{
                    marginBottom: "30px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}>
                    {/* Part Header */}
                    <div style={{
                      padding: "16px 20px",
                      backgroundColor: colors.partBlue,
                      color: "white",
                    }}>
                      <h3 style={{ margin: 0 }}>
                        {part.title || `PART ${partIdx + 1}`}
                      </h3>
                      {part.audioFile && (
                        <span style={{ fontSize: "12px", opacity: 0.9 }}>🎵 Có audio</span>
                      )}
                    </div>

                    {/* Part Instruction */}
                    {part.instruction && (
                      <div style={{
                        padding: "12px 20px",
                        backgroundColor: "#f8fafc",
                        borderBottom: "1px solid #e5e7eb",
                        fontStyle: "italic",
                        fontSize: "14px",
                      }}>
                        {part.instruction}
                      </div>
                    )}

                    {/* Sections */}
                    {part.sections?.map((section, sIdx) => {
                      const sectionQCount = countSectionQuestions(section);
                      // Calculate starting question for this section
                      let sectionStartQ = partStartQ;
                      for (let s = 0; s < sIdx; s++) {
                        sectionStartQ += countSectionQuestions(part.sections[s]);
                      }
                      
                      return (
                        <div key={sIdx} style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                          <h4 style={{
                            margin: "0 0 12px 0",
                            color: colors.sectionOrange,
                            fontSize: "16px",
                          }}>
                            {section.sectionTitle || `Questions ${sectionStartQ}-${sectionStartQ + sectionQCount - 1}`}
                          </h4>
                          
                          {section.sectionInstruction && (
                            <p style={{
                              margin: "0 0 16px 0",
                              padding: "10px",
                              backgroundColor: "#fffbeb",
                              borderRadius: "8px",
                              fontSize: "14px",
                              whiteSpace: "pre-wrap",
                            }}>
                              {section.sectionInstruction}
                            </p>
                          )}

                          {/* Questions based on type */}
                          <div style={{ paddingLeft: "10px" }}>
                            {section.questionType === 'notes-completion' && section.questions[0]?.notesText && (
                              <div style={{
                                padding: "16px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                whiteSpace: "pre-wrap",
                                lineHeight: "1.8",
                                fontFamily: "Georgia, serif",
                              }}>
                                <strong style={{ display: "block", marginBottom: "12px" }}>
                                  {section.questions[0].notesTitle || "Notes"}
                                </strong>
                                {section.questions[0].notesText}
                              </div>
                            )}
                            
                            {section.questionType === 'form-completion' && section.questions[0]?.formRows && (
                              <div style={{
                                padding: "16px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}>
                                <strong style={{ display: "block", marginBottom: "12px" }}>
                                  {section.questions[0].formTitle || "Form"}
                                </strong>
                                {section.questions[0].formRows.map((row, rIdx) => (
                                  <div key={rIdx} style={{
                                    display: "flex",
                                    gap: "8px",
                                    padding: "6px 0",
                                    borderBottom: "1px dashed #e5e7eb",
                                  }}>
                                    <span style={{ minWidth: "150px" }}>{row.label}</span>
                                    <span>{row.prefix}</span>
                                    {row.isBlank ? (
                                      <span style={{
                                        padding: "2px 16px",
                                        backgroundColor: "#fef3c7",
                                        borderRadius: "4px",
                                        fontWeight: "bold",
                                      }}>
                                        {row.blankNumber}. ________
                                      </span>
                                    ) : (
                                      <span>{row.suffix}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {section.questionType === 'matching' && section.questions[0] && (
                              <div style={{ display: "flex", gap: "40px" }}>
                                <div>
                                  <strong>Items:</strong>
                                  {section.questions[0].leftItems?.map((item, i) => (
                                    <div key={i} style={{ padding: "4px 0" }}>
                                      {sectionStartQ + i}. {item}
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <strong>Options:</strong>
                                  {section.questions[0].rightItems?.map((item, i) => (
                                    <div key={i} style={{ padding: "4px 0" }}>
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(section.questionType === 'abc' || section.questionType === 'abcd') && (
                              <div>
                                {section.questions?.map((q, qIdx) => (
                                  <div key={qIdx} style={{ marginBottom: "16px" }}>
                                    <strong>{sectionStartQ + qIdx}.</strong> {q.questionText}
                                    <div style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                      {q.options?.map((opt, oIdx) => (
                                        <div key={oIdx} style={{ padding: "4px 0" }}>
                                          {opt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {section.questionType === 'multi-select' && (
                              <div>
                                {section.questions?.map((q, qIdx) => {
                                  const qStartNum = sectionStartQ + (qIdx * (q.requiredAnswers || 2));
                                  const qEndNum = qStartNum + (q.requiredAnswers || 2) - 1;
                                  return (
                                    <div key={qIdx} style={{ marginBottom: "20px" }}>
                                      <strong>Questions {qStartNum} and {qEndNum}</strong>
                                      <p style={{ margin: "8px 0" }}>{q.questionText}</p>
                                      <div style={{ paddingLeft: "20px" }}>
                                        {q.options?.map((opt, oIdx) => (
                                          <div key={oIdx} style={{ padding: "4px 0" }}>
                                            ☐ {opt}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {section.questionType === 'fill' && (
                              <div>
                                {section.questions?.map((q, qIdx) => (
                                  <div key={qIdx} style={{ marginBottom: "12px" }}>
                                    <strong>{sectionStartQ + qIdx}.</strong> {q.questionText || "________"}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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

      {/* TEMPLATE LIBRARY MODAL */}
      <ListeningTemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleSelectTemplate}
        onSelectSectionTemplate={handleSelectSectionTemplate}
        mode={templateLibraryMode}
      />
    </IeltsTestEditorShell>
  </>
  );
};

export default ListeningTestEditor;
