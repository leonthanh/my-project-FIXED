import React, { useState, useEffect } from "react";
import {
  IeltsTestEditorShell,
  QuillEditor,
  QuestionSection,
  KeyboardShortcutsHelp,
} from "../../../shared/components";
import { useColumnLayout } from "../hooks";
import useKeyboardShortcuts from "../../../shared/hooks/useKeyboardShortcuts";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import TemplateLibrary from "../../reading-test/components/TemplateLibrary";
import ImportModal from "../../reading-test/components/ImportModal";
import { calculateTotalQuestions, createDefaultQuestionByType } from "../utils";
import {
  colors,
  compactInputStyle,
  modalStyles,
  modalContentStyles,
  modalHeaderStyles,
  confirmButtonStyle,
  backButtonStyle,
  columnHeaderStyle,
  itemStyle,
  deleteButtonSmallStyle,
  addButtonStyle,
  resizeDividerStyle,
  compactCSS,
} from "../utils/styles";
import "react-quill/dist/quill.snow.css";
import "../styles/reading-test-editor.css";

/**
 * ReadingTestEditor - Base component cho Create và Edit Reading Test
 *
 * @param {Object} props
 * @param {string} props.pageTitle - Tiêu đề trang (VD: "📚 Tạo Đề Reading IELTS")
 * @param {string} props.pageIcon - Icon (mặc định từ pageTitle)
 * @param {string} props.className - CSS class name
 *
 * @param {string} props.title - Tiêu đề đề thi
 * @param {Function} props.setTitle - Setter cho title
 * @param {string} props.classCode - Mã lớp
 * @param {Function} props.setClassCode - Setter cho classCode
 * @param {string} props.teacherName - Tên giáo viên
 * @param {Function} props.setTeacherName - Setter cho teacherName
 *
 * @param {Array} props.passages - Mảng passages
 * @param {number} props.selectedPassageIndex - Index passage đang chọn
 * @param {Function} props.setSelectedPassageIndex - Setter
 * @param {number|null} props.selectedSectionIndex - Index section đang chọn
 * @param {Function} props.setSelectedSectionIndex - Setter
 *
 * @param {Function} props.onPassageChange - Handler thay đổi passage
 * @param {Function} props.onAddPassage - Handler thêm passage
 * @param {Function} props.onDeletePassage - Handler xóa passage
 * @param {Function} props.onSectionChange - Handler thay đổi section
 * @param {Function} props.onAddSection - Handler thêm section
 * @param {Function} props.onDeleteSection - Handler xóa section
 * @param {Function} props.onCopySection - Handler copy section
 * @param {Function} props.onQuestionChange - Handler thay đổi question
 * @param {Function} props.onAddQuestion - Handler thêm question
 * @param {Function} props.onDeleteQuestion - Handler xóa question
 * @param {Function} props.onCopyQuestion - Handler copy question
 *
 * @param {boolean} props.isReviewing - Đang review?
 * @param {Function} props.setIsReviewing - Setter
 * @param {Function} props.onReview - Handler khi click Review
 * @param {Function} props.onConfirmSubmit - Handler khi confirm submit
 * @param {boolean} props.isSubmitting - Đang submit?
 * @param {string} props.submitButtonText - Text nút submit (VD: "Tạo đề", "Cập nhật")
 *
 * @param {string} props.message - Thông báo
 * @param {boolean} props.showPreview - Hiển thị preview?
 * @param {Function} props.setShowPreview - Setter
 *
 * @param {Date} props.lastSaved - Thời gian lưu gần nhất
 * @param {boolean} props.isSaving - Đang lưu?
 * @param {Function} props.onManualSave - Handler lưu thủ công
 *
 * @param {React.ReactNode} props.children - Nội dung bổ sung (loading state, etc.)
 */
const ReadingTestEditor = ({
  // Page info
  pageTitle = "📚 Reading Test Editor",
  className = "reading-test-editor",

  // Form fields
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,

  // Passages state
  passages,
  selectedPassageIndex,
  // (optional) test id (for edit page previews)
  testId,
  setSelectedPassageIndex,
  selectedSectionIndex,
  setSelectedSectionIndex,

  // Passage handlers
  onPassageChange,
  onAddPassage,
  onDeletePassage,

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

  // Review & Submit
  isReviewing,
  setIsReviewing,
  onReview,
  onConfirmSubmit,
  isSubmitting,
  submitButtonText = "Xác nhận",

  // Messages & Preview
  message,
  showPreview,
  setShowPreview,

  // Auto-save
  lastSaved,
  isSaving,
  onManualSave,

  // Children for custom content
  children,
}) => {
  // State for keyboard shortcuts help
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // State for new modals
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Theme context
  const { isDarkMode } = useTheme();

  // Use column layout hook
  const {
    collapsedColumns,
    isResizing,
    toggleColumnCollapse,
    handleMouseDown,
    getColumnWidth,
  } = useColumnLayout();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (onManualSave) {
        onManualSave();
      }
      if (onReview) {
        onReview();
      }
    },
    onAddQuestion: () => {
      if (
        selectedPassageIndex !== null &&
        selectedSectionIndex !== null &&
        onAddQuestion
      ) {
        onAddQuestion(selectedPassageIndex, selectedSectionIndex);
      }
    },
    onCloseModal: () => {
      if (isReviewing) {
        setIsReviewing(false);
      }
      if (showShortcutsHelp) {
        setShowShortcutsHelp(false);
      }
    },
  });

  // Listen for '?' key to show shortcuts help
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isInput) {
          setShowShortcutsHelp((prev) => !prev);
        }
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, []);

  // Current passage and section
  const currentPassage = passages?.[selectedPassageIndex];
  const currentSection = currentPassage?.sections?.[selectedSectionIndex];

  return (
    <>
      <style>{compactCSS(className)}</style>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      <IeltsTestEditorShell
        className={className}
        pageTitle={pageTitle}
        title={title}
        setTitle={setTitle}
        classCode={classCode}
        setClassCode={setClassCode}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        lastSaved={lastSaved}
        isSaving={isSaving}
        message={message}
        renderMessage={(currentMessage) => (
          <div
            style={{
              textAlign: "center",
              padding: "8px",
              marginTop: "8px",
              backgroundColor: currentMessage.includes("❌")
                ? "#ffe6e6"
                : currentMessage.includes("✅")
                ? "#e6ffe6"
                : "#fff3cd",
              borderRadius: "4px",
              color: currentMessage.includes("❌")
                ? "red"
                : currentMessage.includes("✅")
                ? "green"
                : "#856404",
            }}
          >
            {currentMessage}
          </div>
        )}
        leftControls={
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(true)}
            title="Keyboard Shortcuts (?)"
            style={{
              padding: "6px 10px",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ⌨️ ?
          </button>
        }
        rightControls={
          <>
            <button
              type="button"
              onClick={() => setShowTemplateLibrary(true)}
              title="Thư viện mẫu câu hỏi"
              style={{
                padding: "6px 12px",
                backgroundColor: isDarkMode ? "#3d3d5c" : "#e6ffe6",
                border: `1px solid ${isDarkMode ? "#27ae60" : "#27ae60"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                color: "#27ae60",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s",
              }}
            >
              📚 Templates
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              title="Import từ Word/Excel"
              style={{
                padding: "6px 12px",
                backgroundColor: isDarkMode ? "#3d3d5c" : "#fff3e6",
                border: `1px solid ${isDarkMode ? "#e67e22" : "#e67e22"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                color: "#e67e22",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s",
              }}
            >
              📥 Import
            </button>
          </>
        }
        shellStyle={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontSize: "13px",
        }}
        containerStyle={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
        headerStyle={{
          padding: "10px 15px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #ddd",
          overflowY: "auto",
          flexShrink: 0,
        }}
        topBarStyle={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
        titleStyle={{ margin: 0, fontSize: "18px" }}
        inputLayoutStyle={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: "800px",
          margin: "0 auto",
        }}
        titleInputStyle={{
          ...compactInputStyle,
          flex: "1 1 45%",
          minWidth: "200px",
        }}
        classCodeInputStyle={{
          ...compactInputStyle,
          flex: "1 1 20%",
          minWidth: "120px",
        }}
        teacherInputStyle={{
          ...compactInputStyle,
          flex: "1 1 25%",
          minWidth: "150px",
        }}
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
              gap: "0px",
              flex: 1,
              backgroundColor: "#ddd",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* COLUMN 1: PASSAGES */}
            <div
              style={{
                width: getColumnWidth("col1"),
                backgroundColor: "#f5f5f5",
                borderRight: "1px solid #ddd",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.primaryBlue)}
                onClick={() => toggleColumnCollapse("col1")}
              >
                {!collapsedColumns.col1 && <span>📚 PASSAGES</span>}
                {collapsedColumns.col1 && (
                  <span style={{ fontSize: "14px" }}>📚</span>
                )}
                <span style={{ fontSize: "11px" }}>
                  {collapsedColumns.col1 ? "▶" : "◀"}
                </span>
              </div>

              {!collapsedColumns.col1 && (
                <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
                  {passages?.map((passage, idx) => (
                    <div
                      key={idx}
                      style={itemStyle(
                        selectedPassageIndex === idx,
                        colors.primaryBlue
                      )}
                    >
                      <div
                        onClick={() => {
                          setSelectedPassageIndex(idx);
                          setSelectedSectionIndex(null);
                        }}
                        style={{ flex: 1, cursor: "pointer" }}
                      >
                        Passage {idx + 1}
                        <br />
                        <small>{passage.passageTitle || "(Untitled)"}</small>
                      </div>
                      {passages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeletePassage(idx)}
                          style={deleteButtonSmallStyle}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={onAddPassage}
                    style={addButtonStyle(colors.successGreen)}
                  >
                    ➕ Thêm Passage
                  </button>
                </div>
              )}
            </div>

            {/* RESIZE DIVIDER 1 */}
            <div
              onMouseDown={(e) => handleMouseDown(1, e)}
              style={resizeDividerStyle(isResizing === 1)}
            />

            {/* COLUMN 2: PASSAGE CONTENT */}
            <div
              style={{
                width: getColumnWidth("col2"),
                backgroundColor: "#fafafa",
                borderRight: "1px solid #ddd",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.successGreen)}
                onClick={() => toggleColumnCollapse("col2")}
              >
                {!collapsedColumns.col2 && <span>📄 CONTENT</span>}
                {collapsedColumns.col2 && (
                  <span style={{ fontSize: "14px" }}>📄</span>
                )}
                <span style={{ fontSize: "11px" }}>
                  {collapsedColumns.col2 ? "▶" : "◀"}
                </span>
              </div>

              {!collapsedColumns.col2 && currentPassage ? (
                <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
                  <label
                    style={{ fontWeight: "bold", color: colors.successGreen }}
                  >
                    📝 Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={currentPassage.passageTitle || ""}
                    onChange={(e) =>
                      onPassageChange(
                        selectedPassageIndex,
                        "passageTitle",
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "15px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      boxSizing: "border-box",
                    }}
                  />

                  <label
                    style={{ fontWeight: "bold", color: colors.successGreen }}
                  >
                    📖 Nội dung
                  </label>
                  <div style={{ marginTop: "10px" }}>
                    <QuillEditor
                      key={`${selectedPassageIndex}-${currentPassage.passageTitle}`}
                      value={currentPassage.passageText || ""}
                      onChange={(value) =>
                        onPassageChange(
                          selectedPassageIndex,
                          "passageText",
                          value
                        )
                      }
                      placeholder="Nhập nội dung passage..."
                    />
                  </div>
                </div>
              ) : (
                !collapsedColumns.col2 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    ← Chọn một Passage
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
                backgroundColor: "#f5f5f5",
                borderRight: "1px solid #ddd",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.sectionRed)}
                onClick={() => toggleColumnCollapse("col3")}
              >
                {!collapsedColumns.col3 && <span>📌 SECTIONS</span>}
                {collapsedColumns.col3 && (
                  <span style={{ fontSize: "14px" }}>📌</span>
                )}
                <span style={{ fontSize: "11px" }}>
                  {collapsedColumns.col3 ? "▶" : "◀"}
                </span>
              </div>

              {!collapsedColumns.col3 && currentPassage ? (
                <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
                  {currentPassage.sections?.map((section, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSectionIndex(idx)}
                      style={itemStyle(
                        selectedSectionIndex === idx,
                        colors.sectionRed
                      )}
                    >
                      <div style={{ flex: 1 }}>
                        Section {idx + 1}
                        <br />
                        <small>{section.sectionTitle || "(Untitled)"}</small>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onAddSection(selectedPassageIndex)}
                    style={addButtonStyle(colors.sectionRed)}
                  >
                    ➕ Thêm Section
                  </button>
                </div>
              ) : (
                !collapsedColumns.col3 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    ← Chọn một Passage
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
                backgroundColor: "#fafafa",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                transition: isResizing ? "none" : "width 0.3s ease",
              }}
            >
              <div
                style={columnHeaderStyle(colors.warningYellow, colors.black)}
                onClick={() => toggleColumnCollapse("col4")}
              >
                {!collapsedColumns.col4 && <span>❓ QUESTIONS</span>}
                {collapsedColumns.col4 && (
                  <span style={{ fontSize: "14px" }}>❓</span>
                )}
                <span style={{ fontSize: "11px" }}>
                  {collapsedColumns.col4 ? "▶" : "◀"}
                </span>
              </div>

              {!collapsedColumns.col4 && currentSection ? (
                <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
                  <QuestionSection
                    passageIndex={selectedPassageIndex}
                    sectionIndex={selectedSectionIndex}
                    section={currentSection}
                    onSectionChange={onSectionChange}
                    onAddQuestion={onAddQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    onCopyQuestion={onCopyQuestion}
                    onCopySection={onCopySection}
                    onQuestionChange={onQuestionChange}
                    onDeleteSection={onDeleteSection}
                    createDefaultQuestionByType={createDefaultQuestionByType}
                  />
                </div>
              ) : (
                !collapsedColumns.col4 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    ← Chọn một Section để xem câu hỏi
                  </div>
                )
              )}
            </div>
          </div>
        </form>

        {/* FIXED BUTTONS & STATS */}
        <div
          style={{
            display: "flex",
            gap: "15px",
            padding: "12px 20px",
            backgroundColor: "#fff",
            borderTop: "1px solid #ddd",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 999,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "20px",
              fontSize: "12px",
              color: "#666",
            }}
          >
            <span>📚 Passages: {passages?.length || 0}</span>
            <span>
              📌 Sections:{" "}
              {passages?.reduce(
                (sum, p) => sum + (p.sections?.length || 0),
                0
              ) || 0}
            </span>
            <span>❓ Questions: {calculateTotalQuestions(passages)}</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {setShowPreview && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  backgroundColor: colors.gray,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s ease",
                }}
              >
                👁 Preview
              </button>
            )}

            <button
              type="button"
              onClick={onReview}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                backgroundColor: colors.dangerRed,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
              }}
            >
              ✅ Review & {submitButtonText}
            </button>
          </div>
        </div>

        {/* REVIEW MODAL - Full Preview */}
        {isReviewing && (
          <div style={modalStyles}>
            <div
              style={{
                ...modalContentStyles,
                width: "95%",
                maxWidth: "1200px",
                maxHeight: "95vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal Header with Close Button */}
              <div
                style={{
                  ...modalHeaderStyles,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0 }}>📋 Xác nhận {submitButtonText}</h3>
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
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "20px",
                }}
              >
                <div>
                  <strong>📝 Tiêu đề:</strong> {title}
                </div>
                <div>
                  <strong>🏫 Mã lớp:</strong> {classCode || "(Không có)"}
                </div>
                <div>
                  <strong>👨‍🏫 Giáo viên:</strong> {teacherName || "(Không có)"}
                </div>
                <div>
                  <strong>📚 Passages:</strong> {passages?.length || 0}
                </div>
                <div>
                  <strong>📌 Sections:</strong>{" "}
                  {passages?.reduce(
                    (sum, p) => sum + (p.sections?.length || 0),
                    0
                  ) || 0}
                </div>
                <div>
                  <strong>❓ Tổng câu hỏi:</strong>{" "}
                  {calculateTotalQuestions(passages)}
                </div>
              </div>

              {/* Full Preview Content - Scrollable */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  marginBottom: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                }}
              >
                {passages?.map((passage, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      borderBottom:
                        pIdx < passages.length - 1
                          ? "2px solid #0e276f"
                          : "none",
                    }}
                  >
                    {/* Passage Header */}
                    <div
                      style={{
                        backgroundColor: "#0e276f",
                        color: "white",
                        padding: "10px 15px",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      📚 Passage {pIdx + 1}:{" "}
                      {passage.passageTitle || "(Untitled)"}
                    </div>

                    {/* Passage Content */}
                    <div
                      style={{ padding: "15px", backgroundColor: "#fafafa" }}
                    >
                      <div
                        style={{
                          backgroundColor: "white",
                          padding: "15px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          maxHeight: "200px",
                          overflowY: "auto",
                          marginBottom: "15px",
                          fontSize: "13px",
                          lineHeight: "1.6",
                        }}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              passage.passageText ||
                              "<em>(Chưa có nội dung)</em>",
                          }}
                        />
                      </div>

                      {/* Sections */}
                      {passage.sections?.map((section, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            marginBottom: "15px",
                            border: "1px solid #ff6b6b",
                            borderRadius: "6px",
                            overflow: "hidden",
                          }}
                        >
                          {/* Section Header */}
                          <div
                            style={{
                              backgroundColor: "#ff6b6b",
                              color: "white",
                              padding: "8px 12px",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            📌 Section {sIdx + 1}:{" "}
                            {section.sectionTitle || "(Untitled)"}
                            <span
                              style={{
                                fontWeight: "normal",
                                marginLeft: "10px",
                              }}
                            >
                              ({section.questions?.length || 0} câu hỏi)
                            </span>
                          </div>

                          {/* Section Instruction */}
                          {section.sectionInstruction && (
                            <div
                              style={{
                                padding: "10px 12px",
                                backgroundColor: "#fff5f5",
                                borderBottom: "1px solid #fdd",
                                fontSize: "12px",
                                /* Don't italicize the content - only the label should be italic */
                              }}
                            >
                              <strong
                                style={{
                                  fontStyle: "italic",
                                  display: "block",
                                  marginBottom: "8px",
                                }}
                              >
                                Hướng dẫn:
                              </strong>
                              <div
                                style={{ fontStyle: "normal" }}
                                dangerouslySetInnerHTML={{
                                  __html: section.sectionInstruction,
                                }}
                              />
                            </div>
                          )}

                          {/* Questions */}
                          <div style={{ padding: "10px 12px" }}>
                            {section.questions?.map((q, qIdx) => {
                              const isClozeType =
                                q.questionType === "cloze-test" ||
                                q.questionType === "paragraph-fill-blanks";
                              const isMatchingType =
                                q.questionType === "matching" ||
                                q.questionType === "matching-headings";
                              const isIELTSMatchingHeadings =
                                q.questionType === "ielts-matching-headings";
                              const isMultipleChoice =
                                q.questionType === "multiple-choice" ||
                                q.questionType === "mcq";

                              // Check for content based on question type
                              const hasQuestionText =
                                q.questionText &&
                                q.questionText.trim() &&
                                q.questionText !== "<p><br></p>";
                              const hasParagraphText =
                                q.paragraphText && q.paragraphText.trim(); // For cloze-test
                              const hasMatchingItems =
                                (q.leftItems && q.leftItems.length > 0) ||
                                (q.rightItems && q.rightItems.length > 0);
                              const hasIELTSMatchingData =
                                q.paragraphs &&
                                q.paragraphs.length > 0 &&
                                q.headings &&
                                q.headings.length > 0;

                              // Determine if question has content
                              const hasContent = isClozeType
                                ? hasParagraphText || hasQuestionText
                                : isMatchingType
                                ? hasMatchingItems || hasQuestionText
                                : isIELTSMatchingHeadings
                                ? hasIELTSMatchingData
                                : hasQuestionText;

                              // Helper function to highlight blanks in text
                              const highlightBlanks = (text) => {
                                if (!text) return "";
                                return text
                                  .replace(
                                    /\[BLANK\]/g,
                                    '<span style="background:#fff3cd;padding:2px 8px;border-radius:3px;border:1px dashed #ffc107;font-weight:bold;">______</span>'
                                  )
                                  .replace(
                                    /_{3,}/g,
                                    '<span style="background:#fff3cd;padding:2px 8px;border-radius:3px;border:1px dashed #ffc107;font-weight:bold;">______</span>'
                                  )
                                  .replace(
                                    /\((\d+)\)/g,
                                    '<span style="background:#17a2b8;color:white;padding:1px 6px;border-radius:3px;font-size:10px;margin:0 2px;">$1</span>'
                                  );
                              };

                              // Get border color based on question type
                              const getBorderStyle = () => {
                                if (isClozeType) return "2px solid #17a2b8";
                                if (isMatchingType || isIELTSMatchingHeadings)
                                  return "2px solid #6f42c1";
                                if (isMultipleChoice)
                                  return "2px solid #fd7e14";
                                return "1px solid #eee";
                              };

                              // Get badge color based on question type
                              const getBadgeColor = () => {
                                if (isClozeType) return "#17a2b8";
                                if (isMatchingType || isIELTSMatchingHeadings)
                                  return "#6f42c1";
                                if (isMultipleChoice) return "#fd7e14";
                                return "#ffc107";
                              };

                              return (
                                <div
                                  key={qIdx}
                                  style={{
                                    padding: "10px 12px",
                                    marginBottom: "10px",
                                    backgroundColor: "white",
                                    borderRadius: "6px",
                                    border: getBorderStyle(),
                                    fontSize: "12px",
                                  }}
                                >
                                  {/* Question Header */}
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "10px",
                                      alignItems: "center",
                                      marginBottom: "8px",
                                      paddingBottom: "8px",
                                      borderBottom: "1px solid #eee",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        backgroundColor: getBadgeColor(),
                                        color: "white",
                                        padding: "3px 10px",
                                        borderRadius: "4px",
                                        fontWeight: "bold",
                                        fontSize: "11px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Q{q.questionNumber || qIdx + 1}
                                    </span>
                                    <span
                                      style={{
                                        backgroundColor: "#6c757d",
                                        color: "white",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "10px",
                                      }}
                                    >
                                      {q.questionType}
                                    </span>
                                    {isClozeType && q.blanks && (
                                      <span
                                        style={{
                                          backgroundColor: "#28a745",
                                          color: "white",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {q.blanks.length} chỗ trống
                                      </span>
                                    )}
                                    {isMatchingType && hasMatchingItems && (
                                      <span
                                        style={{
                                          backgroundColor: "#28a745",
                                          color: "white",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {q.rightItems?.length || 0} items
                                      </span>
                                    )}
                                    {/* Warning if no content */}
                                    {!hasContent && (
                                      <span
                                        style={{
                                          backgroundColor: "#dc3545",
                                          color: "white",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ⚠️ Chưa có nội dung
                                      </span>
                                    )}
                                  </div>

                                  {/* Question Content */}
                                  <div style={{ flex: 1 }}>
                                    {/* Cloze-test: Show paragraphText OR questionText */}
                                    {isClozeType && (
                                      <div
                                        style={{
                                          marginBottom: "10px",
                                          padding: "12px",
                                          backgroundColor:
                                            hasParagraphText || hasQuestionText
                                              ? "#e8f4fc"
                                              : "#fff3cd",
                                          borderRadius: "6px",
                                          border:
                                            hasParagraphText || hasQuestionText
                                              ? "1px solid #bee5eb"
                                              : "2px dashed #ffc107",
                                          lineHeight: "1.8",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: "11px",
                                            color:
                                              hasParagraphText ||
                                              hasQuestionText
                                                ? "#17a2b8"
                                                : "#856404",
                                            marginBottom: "6px",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          📝 Đoạn văn câu hỏi:
                                        </div>
                                        {hasParagraphText ? (
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html: highlightBlanks(
                                                q.paragraphText
                                              ),
                                            }}
                                            style={{ fontSize: "13px" }}
                                          />
                                        ) : hasQuestionText ? (
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html: highlightBlanks(
                                                q.questionText
                                              ),
                                            }}
                                            style={{ fontSize: "13px" }}
                                          />
                                        ) : (
                                          <div
                                            style={{
                                              color: "#856404",
                                              fontStyle: "italic",
                                            }}
                                          >
                                            ⚠️{" "}
                                            <strong>
                                              Chưa nhập đoạn văn câu hỏi!
                                            </strong>
                                            <br />
                                            <span style={{ fontSize: "11px" }}>
                                              Vui lòng quay lại và nhập đoạn văn
                                              có chứa các chỗ trống [BLANK] để
                                              học sinh điền.
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Matching: Show leftItems/rightItems OR questionText */}
                                    {isMatchingType && (
                                      <>
                                        {/* Show matching items if available */}
                                        {hasMatchingItems && (
                                          <div
                                            style={{
                                              marginBottom: "10px",
                                              padding: "12px",
                                              backgroundColor: "#f3e8ff",
                                              borderRadius: "6px",
                                              border: "1px solid #d4b5ff",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "11px",
                                                color: "#6f42c1",
                                                marginBottom: "8px",
                                                fontWeight: "bold",
                                              }}
                                            >
                                              🔗 Danh sách Matching:
                                            </div>

                                            {/* Right Items (Headings to match) */}
                                            {q.rightItems &&
                                              q.rightItems.length > 0 && (
                                                <div
                                                  style={{
                                                    marginBottom: "10px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      fontSize: "10px",
                                                      color: "#6c757d",
                                                      marginBottom: "4px",
                                                    }}
                                                  >
                                                    📋 Danh sách
                                                    headings/options:
                                                  </div>
                                                  {q.rightItems.map(
                                                    (item, i) => (
                                                      <div
                                                        key={i}
                                                        style={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: "8px",
                                                          marginBottom: "4px",
                                                          padding: "6px 10px",
                                                          backgroundColor:
                                                            "#6f42c1",
                                                          color: "white",
                                                          borderRadius: "4px",
                                                          fontSize: "11px",
                                                        }}
                                                      >
                                                        <span
                                                          style={{
                                                            backgroundColor:
                                                              "rgba(255,255,255,0.3)",
                                                            padding: "2px 8px",
                                                            borderRadius: "3px",
                                                            fontWeight: "bold",
                                                            minWidth: "30px",
                                                            textAlign: "center",
                                                          }}
                                                        >
                                                          {item.label || i + 1}
                                                        </span>
                                                        <span>
                                                          {item.text || item}
                                                        </span>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}

                                            {/* Left Items if any */}
                                            {q.leftItems &&
                                              q.leftItems.length > 0 && (
                                                <div>
                                                  <div
                                                    style={{
                                                      fontSize: "10px",
                                                      color: "#6c757d",
                                                      marginBottom: "4px",
                                                    }}
                                                  >
                                                    📌 Các đoạn văn
                                                    (Paragraphs):
                                                  </div>
                                                  {q.leftItems.map(
                                                    (item, i) => (
                                                      <div
                                                        key={i}
                                                        style={{
                                                          display:
                                                            "inline-block",
                                                          margin: "2px 4px",
                                                          padding: "4px 10px",
                                                          backgroundColor:
                                                            "#17a2b8",
                                                          color: "white",
                                                          borderRadius: "4px",
                                                          fontSize: "11px",
                                                        }}
                                                      >
                                                        {item.label ||
                                                          String.fromCharCode(
                                                            65 + i
                                                          )}
                                                        . {item.text || item}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                          </div>
                                        )}

                                        {/* Show questionText if available */}
                                        {hasQuestionText && (
                                          <div
                                            style={{
                                              marginBottom: "10px",
                                              padding: "12px",
                                              backgroundColor: "#f3e8ff",
                                              borderRadius: "6px",
                                              border: "1px solid #d4b5ff",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "11px",
                                                color: "#6f42c1",
                                                marginBottom: "6px",
                                                fontWeight: "bold",
                                              }}
                                            >
                                              🔗 Nội dung câu hỏi:
                                            </div>
                                            <div
                                              dangerouslySetInnerHTML={{
                                                __html: q.questionText,
                                              }}
                                              style={{ fontSize: "13px" }}
                                            />
                                          </div>
                                        )}

                                        {/* Warning if no content */}
                                        {!hasMatchingItems &&
                                          !hasQuestionText && (
                                            <div
                                              style={{
                                                marginBottom: "10px",
                                                padding: "12px",
                                                backgroundColor: "#fff3cd",
                                                borderRadius: "6px",
                                                border: "2px dashed #ffc107",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  color: "#856404",
                                                  fontStyle: "italic",
                                                }}
                                              >
                                                ⚠️{" "}
                                                <strong>
                                                  Chưa nhập nội dung matching!
                                                </strong>
                                                <br />
                                                <span
                                                  style={{ fontSize: "11px" }}
                                                >
                                                  Vui lòng quay lại và nhập danh
                                                  sách headings/statements cần
                                                  match.
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                      </>
                                    )}

                                    {/* IELTS Matching Headings */}
                                    {isIELTSMatchingHeadings && (
                                      <div
                                        style={{
                                          marginBottom: "10px",
                                          padding: "12px",
                                          backgroundColor: "#f0f7ff",
                                          borderRadius: "6px",
                                          border: "2px solid #0e276f",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: "12px",
                                            color: "#0e276f",
                                            marginBottom: "10px",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          🔗 IELTS Matching Headings
                                        </div>

                                        {/* Headings List */}
                                        {q.headings &&
                                          q.headings.length > 0 && (
                                            <div
                                              style={{ marginBottom: "12px" }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: "11px",
                                                  color: "#6c757d",
                                                  marginBottom: "6px",
                                                  fontWeight: "bold",
                                                }}
                                              >
                                                📋 List of Headings:
                                              </div>
                                              {q.headings.map((h, i) => (
                                                <div
                                                  key={i}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    marginBottom: "4px",
                                                    padding: "6px 10px",
                                                    backgroundColor: "#6f42c1",
                                                    color: "white",
                                                    borderRadius: "4px",
                                                    fontSize: "11px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      backgroundColor:
                                                        "rgba(255,255,255,0.3)",
                                                      padding: "2px 8px",
                                                      borderRadius: "3px",
                                                      fontWeight: "bold",
                                                      minWidth: "30px",
                                                      textAlign: "center",
                                                    }}
                                                  >
                                                    {h.label}
                                                  </span>
                                                  <span>{h.text}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                        {/* Answer Table */}
                                        {q.paragraphs &&
                                          q.paragraphs.length > 0 && (
                                            <div>
                                              <div
                                                style={{
                                                  fontSize: "11px",
                                                  color: "#6c757d",
                                                  marginBottom: "6px",
                                                  fontWeight: "bold",
                                                }}
                                              >
                                                ✅ Đáp án:
                                              </div>
                                              <table
                                                style={{
                                                  width: "100%",
                                                  borderCollapse: "collapse",
                                                  fontSize: "11px",
                                                }}
                                              >
                                                <thead>
                                                  <tr>
                                                    <th
                                                      style={{
                                                        padding: "6px",
                                                        backgroundColor:
                                                          "#0e276f",
                                                        color: "white",
                                                        textAlign: "left",
                                                      }}
                                                    >
                                                      Câu
                                                    </th>
                                                    <th
                                                      style={{
                                                        padding: "6px",
                                                        backgroundColor:
                                                          "#0e276f",
                                                        color: "white",
                                                        textAlign: "left",
                                                      }}
                                                    >
                                                      Paragraph
                                                    </th>
                                                    <th
                                                      style={{
                                                        padding: "6px",
                                                        backgroundColor:
                                                          "#0e276f",
                                                        color: "white",
                                                        textAlign: "left",
                                                      }}
                                                    >
                                                      Đáp án
                                                    </th>
                                                    <th
                                                      style={{
                                                        padding: "6px",
                                                        backgroundColor:
                                                          "#0e276f",
                                                        color: "white",
                                                        textAlign: "left",
                                                      }}
                                                    >
                                                      Heading
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {q.paragraphs.map((p, i) => {
                                                    const answer =
                                                      q.answers?.[p.id];
                                                    const heading =
                                                      q.headings?.find(
                                                        (h) =>
                                                          h.label === answer
                                                      );
                                                    return (
                                                      <tr
                                                        key={i}
                                                        style={{
                                                          backgroundColor:
                                                            i % 2 === 0
                                                              ? "#f8f9fa"
                                                              : "white",
                                                        }}
                                                      >
                                                        <td
                                                          style={{
                                                            padding: "6px",
                                                            borderBottom:
                                                              "1px solid #ddd",
                                                          }}
                                                        >
                                                          <strong>
                                                            Q{i + 1}
                                                          </strong>
                                                        </td>
                                                        <td
                                                          style={{
                                                            padding: "6px",
                                                            borderBottom:
                                                              "1px solid #ddd",
                                                          }}
                                                        >
                                                          <span
                                                            style={{
                                                              backgroundColor:
                                                                "#0e276f",
                                                              color: "white",
                                                              padding:
                                                                "2px 8px",
                                                              borderRadius:
                                                                "4px",
                                                            }}
                                                          >
                                                            {p.label}
                                                          </span>
                                                        </td>
                                                        <td
                                                          style={{
                                                            padding: "6px",
                                                            borderBottom:
                                                              "1px solid #ddd",
                                                          }}
                                                        >
                                                          {answer ? (
                                                            <div
                                                              style={{
                                                                display: "flex",
                                                                flexDirection:
                                                                  "column",
                                                                gap: 6,
                                                              }}
                                                            >
                                                              <small
                                                                style={{
                                                                  color: "#666",
                                                                }}
                                                              >
                                                                Raw:{" "}
                                                                {String(answer)}
                                                              </small>
                                                              <span
                                                                style={{
                                                                  backgroundColor:
                                                                    "#28a745",
                                                                  color:
                                                                    "white",
                                                                  padding:
                                                                    "2px 10px",
                                                                  borderRadius:
                                                                    "4px",
                                                                  fontWeight:
                                                                    "bold",
                                                                }}
                                                              >
                                                                {String(answer)}
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span
                                                              style={{
                                                                color: "#999",
                                                              }}
                                                            >
                                                              --
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td
                                                          style={{
                                                            padding: "6px",
                                                            borderBottom:
                                                              "1px solid #ddd",
                                                            color: "#495057",
                                                          }}
                                                        >
                                                          {(() => {
                                                            // attempt to resolve numeric indices to headings for legacy data
                                                            const raw = answer;
                                                            let resolved =
                                                              heading;
                                                            if (
                                                              !resolved &&
                                                              raw !==
                                                                undefined &&
                                                              raw !== null
                                                            ) {
                                                              const s =
                                                                String(
                                                                  raw
                                                                ).trim();
                                                              if (
                                                                /^\d+$/.test(
                                                                  s
                                                                ) &&
                                                                Array.isArray(
                                                                  q.headings
                                                                ) &&
                                                                q.headings
                                                                  .length
                                                              ) {
                                                                const n =
                                                                  Number(s);
                                                                // try 0-based first then 1-based
                                                                if (
                                                                  q.headings[n]
                                                                )
                                                                  resolved =
                                                                    q.headings[
                                                                      n
                                                                    ];
                                                                else if (
                                                                  q.headings[
                                                                    n - 1
                                                                  ]
                                                                )
                                                                  resolved =
                                                                    q.headings[
                                                                      n - 1
                                                                    ];
                                                              }
                                                            }
                                                            return resolved ? (
                                                              resolved.text
                                                            ) : (
                                                              <span
                                                                style={{
                                                                  color: "#999",
                                                                }}
                                                              >
                                                                Chưa chọn
                                                              </span>
                                                            );
                                                          })()}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}

                                        {/* Warning if no data */}
                                        {!hasIELTSMatchingData && (
                                          <div
                                            style={{
                                              color: "#856404",
                                              fontStyle: "italic",
                                              fontSize: "11px",
                                            }}
                                          >
                                            ⚠️ Chưa nhập dữ liệu Matching
                                            Headings
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Regular question text (non-cloze, non-matching) */}
                                    {!isClozeType &&
                                      !isMatchingType &&
                                      !isIELTSMatchingHeadings && (
                                        <div
                                          style={{
                                            marginBottom: "10px",
                                            padding: hasQuestionText
                                              ? "10px"
                                              : "12px",
                                            backgroundColor: hasQuestionText
                                              ? "#f8f9fa"
                                              : "#fff3cd",
                                            borderRadius: "6px",
                                            border: hasQuestionText
                                              ? "1px solid #dee2e6"
                                              : "2px dashed #ffc107",
                                          }}
                                        >
                                          {hasQuestionText ? (
                                            <>
                                              <strong
                                                style={{ color: "#495057" }}
                                              >
                                                Câu hỏi:
                                              </strong>{" "}
                                              <span
                                                dangerouslySetInnerHTML={{
                                                  __html: q.questionText,
                                                }}
                                              />
                                            </>
                                          ) : (
                                            <div
                                              style={{
                                                color: "#856404",
                                                fontStyle: "italic",
                                                fontSize: "11px",
                                              }}
                                            >
                                              ⚠️{" "}
                                              <strong>
                                                Chưa nhập nội dung câu hỏi!
                                              </strong>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                    {/* Options for multiple choice (not matching - matching uses leftItems/rightItems) */}
                                    {!isMatchingType &&
                                      !isIELTSMatchingHeadings &&
                                      q.options &&
                                      q.options.length > 0 &&
                                      q.options.some((o) => o) && (
                                        <div
                                          style={{
                                            marginBottom: "10px",
                                            padding: "10px",
                                            backgroundColor: "#fff8e6",
                                            borderRadius: "6px",
                                            border: "1px solid #dee2e6",
                                          }}
                                        >
                                          <strong
                                            style={{
                                              color: "#495057",
                                              fontSize: "11px",
                                            }}
                                          >
                                            📋 Các lựa chọn:
                                          </strong>
                                          <div style={{ marginTop: "6px" }}>
                                            {q.options
                                              .filter((o) => o)
                                              .map((opt, i) => (
                                                <div
                                                  key={i}
                                                  style={{
                                                    display: "inline-block",
                                                    margin: "3px 6px 3px 0",
                                                    padding: "4px 10px",
                                                    backgroundColor: "#fd7e14",
                                                    color: "white",
                                                    borderRadius: "4px",
                                                    fontSize: "11px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      backgroundColor:
                                                        "rgba(255,255,255,0.3)",
                                                      padding: "1px 5px",
                                                      borderRadius: "3px",
                                                      marginRight: "6px",
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    {String.fromCharCode(
                                                      65 + i
                                                    )}
                                                  </span>
                                                  {opt}
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}

                                    {/* Answers - Skip for IELTS Matching Headings (already shown above) */}
                                    {!isIELTSMatchingHeadings && (
                                      <div
                                        style={{
                                          backgroundColor: "#d4edda",
                                          padding: "8px 12px",
                                          borderRadius: "4px",
                                          marginTop: "8px",
                                        }}
                                      >
                                        <strong style={{ color: "#155724" }}>
                                          ✅ Đáp án:
                                        </strong>
                                        {isClozeType && q.blanks ? (
                                          <div style={{ marginTop: "6px" }}>
                                            {q.blanks.map((b, i) => (
                                              <div
                                                key={i}
                                                style={{
                                                  display: "inline-block",
                                                  margin: "3px 6px 3px 0",
                                                  padding: "4px 10px",
                                                  backgroundColor: "#28a745",
                                                  color: "white",
                                                  borderRadius: "4px",
                                                  fontSize: "11px",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(255,255,255,0.3)",
                                                    padding: "1px 5px",
                                                    borderRadius: "3px",
                                                    marginRight: "6px",
                                                  }}
                                                >
                                                  {i + 1}
                                                </span>
                                                {b.correctAnswer || "(trống)"}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span
                                            style={{
                                              color: "#155724",
                                              fontWeight: "bold",
                                              marginLeft: "8px",
                                            }}
                                          >
                                            {q.correctAnswer || "(Chưa có)"}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  paddingTop: "15px",
                  borderTop: "1px solid #ddd",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  style={backButtonStyle}
                  disabled={isSubmitting}
                >
                  ← Quay lại chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={onConfirmSubmit}
                  style={{
                    ...confirmButtonStyle,
                    padding: "12px 24px",
                    fontSize: "15px",
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "⏳ Đang xử lý..."
                    : `✅ Xác nhận ${submitButtonText}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Library Modal */}
        <TemplateLibrary
          isOpen={showTemplateLibrary}
          onClose={() => setShowTemplateLibrary(false)}
          onSelectTemplate={(template) => {
            // Add template as new question to current section
            if (
              selectedPassageIndex !== null &&
              selectedSectionIndex !== null &&
              onAddQuestion
            ) {
              // Add question then update it with template data
              onAddQuestion(
                selectedPassageIndex,
                selectedSectionIndex,
                template.type
              );

              // Get the newly added question index
              const currentQuestions =
                passages?.[selectedPassageIndex]?.sections?.[
                  selectedSectionIndex
                ]?.questions || [];
              const newQuestionIndex = currentQuestions.length; // After adding, it will be at this index

              // Update the question with template data (slight delay to ensure state update)
              setTimeout(() => {
                if (onQuestionChange) {
                  onQuestionChange(
                    selectedPassageIndex,
                    selectedSectionIndex,
                    newQuestionIndex,
                    template
                  );
                }
              }, 100);
            } else {
              alert(
                "Vui lòng chọn một Section trước khi thêm câu hỏi từ template!"
              );
            }
          }}
        />

        {/* Import Modal */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={(importedQuestions) => {
            // Add imported questions to current section
            if (
              selectedPassageIndex !== null &&
              selectedSectionIndex !== null &&
              onAddQuestion
            ) {
              importedQuestions.forEach((q, index) => {
                // Add question with template
                setTimeout(() => {
                  onAddQuestion(
                    selectedPassageIndex,
                    selectedSectionIndex,
                    q.type
                  );

                  // Get the newly added question index
                  const currentQuestions =
                    passages?.[selectedPassageIndex]?.sections?.[
                      selectedSectionIndex
                    ]?.questions || [];
                  const newQuestionIndex = currentQuestions.length + index;

                  // Update with imported data
                  setTimeout(() => {
                    if (onQuestionChange) {
                      onQuestionChange(
                        selectedPassageIndex,
                        selectedSectionIndex,
                        newQuestionIndex,
                        q
                      );
                    }
                  }, 50);
                }, index * 100);
              });

              alert(`✅ Đã import ${importedQuestions.length} câu hỏi!`);
            } else {
              alert("Vui lòng chọn một Section trước khi import câu hỏi!");
            }
          }}
        />

        {/* Custom children (loading state, etc.) */}
        {children}
      </IeltsTestEditorShell>
    </>
  );
};

export default ReadingTestEditor;
