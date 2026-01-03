import React, { useState, useEffect, useRef } from "react";
import { AdminNavbar, AutoSaveIndicator } from "../../../shared/components";
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
    { value: 'fill', label: '📝 Fill in the blank', desc: 'Điền từ vào chỗ trống' },
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontSize: "14px",
        backgroundColor: "#f8fafc",
      }}
    >
      <style>{compactCSS(className)}</style>
      <AdminNavbar />

      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#fff",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
            <h2 style={{ margin: 0, fontSize: "18px", color: colors.primaryPurple }}>
              {pageTitle}
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
                  setTemplateLibraryMode('section');
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
            </div>
          </div>

          {/* Form inputs */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <input
              type="text"
              placeholder="Tiêu đề đề thi"
              value={title || ""}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...compactInputStyle, flex: "1 1 40%", minWidth: "200px" }}
            />
            <input
              type="text"
              placeholder="Mã lớp"
              value={classCode || ""}
              onChange={(e) => setClassCode(e.target.value)}
              style={{ ...compactInputStyle, flex: "1 1 20%", minWidth: "120px" }}
            />
            <input
              type="text"
              placeholder="Tên giáo viên"
              value={teacherName || ""}
              onChange={(e) => setTeacherName(e.target.value)}
              style={{ ...compactInputStyle, flex: "1 1 25%", minWidth: "150px" }}
            />
          </div>

          {/* Global Audio Upload */}
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

          {/* Message */}
          {message && (
            <div
              style={{
                textAlign: "center",
                padding: "10px",
                marginTop: "10px",
                backgroundColor: message.includes("❌") ? "#fee2e2" : message.includes("✅") ? "#dcfce7" : "#fef3c7",
                borderRadius: "8px",
                color: message.includes("❌") ? colors.dangerRed : message.includes("✅") ? colors.successGreen : "#92400e",
                fontWeight: 500,
              }}
            >
              {message}
            </div>
          )}
        </div>

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
                  {currentPart.sections?.map((section, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSectionIndex(idx)}
                      style={itemStyle(selectedSectionIndex === idx, colors.sectionOrange)}
                    >
                      <div style={{ flex: 1 }}>
                        <strong>{section.sectionTitle || `Section ${idx + 1}`}</strong>
                        <br />
                        <small style={{ opacity: 0.8 }}>
                          {section.questions?.length || 0} câu • {section.questionType || 'fill'}
                        </small>
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
                  ))}
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
                  {/* Section Header */}
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
                      placeholder="VD: Questions 1-5"
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, color: colors.questionYellow }}>
                        Câu hỏi ({currentSection.questions?.length || 0})
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

                    {currentSection.questions?.map((question, qIdx) => (
                      <ListeningQuestionEditor
                        key={qIdx}
                        question={question}
                        questionIndex={qIdx}
                        questionType={currentSection.questionType || question.questionType}
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
                    ))}
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
      </div>

      {/* REVIEW MODAL */}
      {isReviewing && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <div style={modalHeaderStyles}>
              <span style={{ fontSize: "20px" }}>📋</span>
              <h3 style={{ margin: 0 }}>Xác nhận tạo đề thi</h3>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4>📊 Tổng quan:</h4>
              <ul style={{ lineHeight: 1.8 }}>
                <li><strong>Tiêu đề:</strong> {title || "(Chưa đặt)"}</li>
                <li><strong>Mã lớp:</strong> {classCode || "(Chưa nhập)"}</li>
                <li><strong>Giáo viên:</strong> {teacherName || "(Chưa nhập)"}</li>
                <li><strong>Số Part:</strong> {parts?.length || 0}</li>
                <li><strong>Tổng số câu hỏi:</strong> {totalQuestions}</li>
              </ul>

              <h4 style={{ marginTop: "20px" }}>🎧 Chi tiết từng Part:</h4>
              {parts?.map((part, idx) => (
                <div key={idx} style={{
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  borderLeft: `4px solid ${colors.partBlue}`,
                }}>
                  <strong>{part.title}</strong>
                  <span style={{ ...partTypeBadgeStyle(colors.audioGreen), marginLeft: "8px" }}>
                    {part.audioFile ? "🎵 Có audio" : "⚠️ Chưa có audio"}
                  </span>
                  <div style={{ marginTop: "8px", fontSize: "13px", color: colors.gray }}>
                    {part.sections?.length || 0} sections, {
                      part.sections?.reduce((t, s) => t + (s.questions?.length || 0), 0) || 0
                    } câu hỏi
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
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
                {isSubmitting ? "⏳ Đang tạo..." : "✅ Xác nhận tạo đề"}
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

      {/* TEMPLATE LIBRARY MODAL */}
      <ListeningTemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleSelectTemplate}
        onSelectSectionTemplate={handleSelectSectionTemplate}
        mode={templateLibraryMode}
      />
    </div>
  );
};

export default ListeningTestEditor;
