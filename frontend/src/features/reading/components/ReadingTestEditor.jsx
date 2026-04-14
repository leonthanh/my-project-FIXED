import React, { useState } from "react";
import {
  IeltsTestEditorShell,
  QuillEditor,
  QuestionSection,
} from "../../../shared/components";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import { useColumnLayout } from "../hooks";
import { calculateTotalQuestions, createDefaultQuestionByType } from "../utils";
import {
  getActiveClozeTable,
  getImpliedQuestionCount,
  getQuestionCount,
} from "../utils/questionHelpers";
import {
  getClozeTableCellLines,
  isClozeCommentsColumn,
} from "../../../shared/utils/clozeTable";
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

const getMessageTone = (message) => {
  const normalized = String(message || "").trim().toLowerCase();

  if (!normalized) return "info";
  if (
    normalized.startsWith("lỗi") ||
    normalized.includes("không có quyền") ||
    normalized.includes("không hợp lệ") ||
    normalized.includes("đăng nhập lại") ||
    normalized.includes("không tìm thấy")
  ) {
    return "error";
  }
  if (normalized.startsWith("đã") || normalized.includes("thành công")) {
    return "success";
  }

  return "warning";
};

const getMessageColors = (message) => {
  const tone = getMessageTone(message);

  if (tone === "error") {
    return { backgroundColor: "#ffe6e6", color: "#b91c1c" };
  }
  if (tone === "success") {
    return { backgroundColor: "#e6ffe6", color: "#166534" };
  }

  return { backgroundColor: "#fff3cd", color: "#856404" };
};

/**
 * ReadingTestEditor - Base component cho Create và Edit Reading Test
 *
 * @param {Object} props
 * @param {string} props.pageTitle - Tiêu đề trang (VD: "Tạo đề Reading IELTS")
 * @param {string} props.pageIcon - Icon (mặc định từ pageTitle)
 * @param {string} props.className - CSS class name
 *
 * @param {string} props.title - Tiêu đề đề thi
 * @param {Function} props.setTitle - Setter cho title
 * @param {string} props.classCode - Mã lớp
 * @param {Function} props.setClassCode - Setter cho classCode
 * @param {string} props.teacherName - Tên giáo viên
 * @param {Function} props.setTeacherName - Setter cho teacherName
 * @param {boolean} props.showResultModal - Hiển thị modal kết quả sau khi nộp bài?
 * @param {Function} props.setShowResultModal - Setter cho showResultModal
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
  pageTitle = "Reading Test Editor",
  className = "reading-test-editor",

  // Form fields
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
  showResultModal,
  setShowResultModal,

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
  // Header collapse (top title/classCode/teacher inputs bar)
  const [collapsedHeader, setCollapsedHeader] = useState(false);
  // Passage panel collapse (separate from top header)
  const [collapsedPassage, setCollapsedPassage] = useState(false);
  // Questions panel collapse
  const [collapsedQuestions, setCollapsedQuestions] = useState(false);

  // Use column layout hook
  const {
    isResizing,
    handleMouseDown,
  } = useColumnLayout();

  // Current passage and section
  const currentPassage = passages?.[selectedPassageIndex];
  const currentSection = currentPassage?.sections?.[selectedSectionIndex];

  // Compute starting question numbers for preview modal (handles blanks and explicit ranges)
  const computeQuestionStarts = (passagesArr) => {
    const starts = {};
    let counter = 1;
    if (!Array.isArray(passagesArr)) return starts;

    passagesArr.forEach((p) => {
      p.sections?.forEach((sec) => {
        sec.questions?.forEach((q, qIdx) => {
          const key = `${sec.id}-${qIdx}`;
          const countFromNumber = q.questionNumber ? getQuestionCount(q.questionNumber) : null;
          const impliedCount = Math.max(1, getImpliedQuestionCount(q));

          if (q.questionNumber) {
            const firstPart = String(q.questionNumber).trim().split(/[,\-]/)[0];
            const start = parseInt(firstPart, 10) || counter;
            starts[key] = start;
            counter = start + (countFromNumber || impliedCount || 1);
          } else {
            starts[key] = counter;
            counter += impliedCount || 1;
          }
        });
      });
    });

    return starts;
  };

  const questionStarts = computeQuestionStarts(passages);

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
        renderMessage={(currentMessage) => {
          const colors = getMessageColors(currentMessage);

          return (
            <div
              style={{
                textAlign: "center",
                padding: "8px",
                marginTop: "8px",
                borderRadius: "4px",
                ...colors,
              }}
            >
              {currentMessage}
            </div>
          );
        }}
        shellStyle={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontSize: "13px",
          backgroundColor: "#f8fafc",
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
          gap: "8px",
          padding: "5px 12px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          flexShrink: 0,
        }}
        topBarStyle={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}
        titleStyle={{ display: "none" }}
        inputLayoutStyle={{
          display: "flex",
          flex: 1,
          gap: "6px",
          alignItems: "center",
        }}
        titleInputStyle={{
          ...compactInputStyle,
          flex: "1 1 0",
        }}
        classCodeInputStyle={{
          ...compactInputStyle,
          flex: "1 1 0",
        }}
        teacherInputStyle={{
          ...compactInputStyle,
          flex: "1 1 0",
        }}
        headerCollapsed={false}
      >
        {/* SIDEBAR + 2-PANEL LAYOUT (redesigned like KET/PET) */}
        <form
          onSubmit={onReview}
          style={{ display: "flex", flex: 1, overflow: "hidden" }}
        >
          {/* === LEFT SIDEBAR === */}
          <div
            style={{
              width: "280px",
              minWidth: "220px",
              backgroundColor: "#1e293b",
              color: "white",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
              borderRight: "1px solid #0f172a",
            }}
          >
            {/* Passages header */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #334155", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Passages ({passages?.length || 0})
              </span>
            </div>
            {/* Passages list - scrollable, button stays outside */}
            <div style={{ overflow: "auto", padding: "8px 8px 0 8px", flexShrink: 0, maxHeight: "38%" }}>
              {passages?.map((passage, idx) => (
                <div
                  key={idx}
                  onClick={() => { setSelectedPassageIndex(idx); setSelectedSectionIndex(0); }}
                  style={{
                    padding: "9px 10px",
                    marginBottom: "4px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: selectedPassageIndex === idx ? "#3b82f6" : "#475569",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Passage {idx + 1}</div>
                    <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {passage.passageTitle || "(Chưa có tiêu đề)"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {passage.sections?.length || 0} section · {passage.sections?.reduce((s, sec) => s + (sec.questions?.length || 0), 0) || 0} câu
                    </div>
                  </div>
                  {passages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeletePassage(idx); }}
                      style={{
                        background: "rgba(239,68,68,0.2)", border: "none", color: "#fca5a5",
                        width: "22px", height: "22px", borderRadius: "4px", cursor: "pointer",
                        fontSize: "12px", flexShrink: 0, marginLeft: "6px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            {/* Add Passage button - always visible, never scrolls away */}
            <div style={{ padding: "6px 8px 8px 8px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={onAddPassage}
                style={{
                  width: "100%", padding: "7px", backgroundColor: "#22c55e", color: "white",
                  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
                  fontSize: "12px",
                }}
              >Thêm Passage</button>
            </div>

            {/* Sections header */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid #334155", borderBottom: "1px solid #334155", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Sections {currentPassage ? `(P${selectedPassageIndex + 1})` : ""}
              </span>
            </div>
            {/* Sections list - scrollable, button stays outside */}
            <div style={{ flex: 1, overflow: "auto", padding: "8px 8px 0 8px" }}>
              {currentPassage ? (
                currentPassage.sections?.map((section, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedSectionIndex(idx)}
                    style={{
                      padding: "9px 10px",
                      marginBottom: "4px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: selectedSectionIndex === idx ? "#6366f1" : "#475569",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Section {idx + 1}</div>
                    <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {section.sectionTitle || "(Untitled)"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {section.questions?.length || 0} câu hỏi
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748b", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
                  Chọn một Passage
                </div>
              )}
            </div>
            {/* Add Section button - always visible at bottom of sidebar */}
            {currentPassage && (
              <div style={{ padding: "6px 8px 8px 8px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => onAddSection(selectedPassageIndex)}
                  style={{
                    width: "100%", padding: "7px", backgroundColor: "#8b5cf6", color: "white",
                    border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
                    fontSize: "12px",
                  }}
                >Thêm Section</button>
              </div>
            )}
          </div>

          {/* === MAIN AREA: Passage (top, collapsible) + Questions (bottom) === */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* TOP: Passage Content (collapsible) */}
            <div
              style={{
                // When passage collapsed → just header height; when questions collapsed → fill space; otherwise use a more compact default height.
                flex: collapsedPassage ? "0 0 auto" : collapsedQuestions ? "1" : "0 0 34%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: "flex 0.3s ease",
                borderBottom: "2px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              {/* Passage panel header – always visible, click to collapse */}
              <div
                onClick={() => setCollapsedPassage((v) => !v)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#16a34a",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <span>
                  Nội dung{currentPassage ? " - Passage " + (selectedPassageIndex + 1) : ""}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 500, opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <InlineIcon name={collapsedPassage ? "chevron-down" : "chevron-up"} size={13} style={{ color: "currentColor" }} />
                  {collapsedPassage ? "Mở rộng" : "Thu nhỏ"}
                </span>
              </div>

              {/* Passage body */}
              {!collapsedPassage && (
                <div className="reading-passage-panel-body" style={{ flex: 1, overflow: "auto", padding: "12px", minHeight: 0 }}>
                  {currentPassage ? (
                    <div className="reading-passage-editor-card">
                      <label style={{ fontWeight: 700, color: "#28a745", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                        Tiêu đề
                      </label>
                      <input
                        className="reading-passage-title-input"
                        type="text"
                        value={currentPassage.passageTitle || ""}
                        onChange={(e) => onPassageChange(selectedPassageIndex, "passageTitle", e.target.value)}
                        placeholder="Nhập tiêu đề passage..."
                        style={{
                          width: "100%", padding: "7px 10px", marginBottom: "12px",
                          border: "1px solid #ccc", borderRadius: "4px",
                          boxSizing: "border-box", fontSize: "13px",
                        }}
                      />
                      <label style={{ fontWeight: 700, color: "#28a745", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                        Nội dung bài đọc
                      </label>
                      <QuillEditor
                        key={selectedPassageIndex + "-" + currentPassage.passageTitle}
                        className="reading-passage-quill"
                        stickyToolbar
                        editorMinHeight="340px"
                        value={currentPassage.passageText || ""}
                        onChange={(value) => onPassageChange(selectedPassageIndex, "passageText", value)}
                        placeholder="Nhập nội dung passage..."
                      />
                    </div>
                  ) : (
                    <div style={{ color: "#999", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      Chọn một Passage để nhập nội dung
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RESIZE DIVIDER (horizontal) */}
            <div
              onMouseDown={(e) => handleMouseDown(2, e)}
              style={{
                height: "5px",
                backgroundColor: isResizing === 2 ? "#3b82f6" : "#e2e8f0",
                cursor: "row-resize",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            />

            {/* BOTTOM: Questions (collapsible, takes remaining space) */}
            <div
              style={{
                flex: collapsedQuestions ? "0 0 auto" : "1",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minHeight: 0,
              }}
            >
              {/* Questions header – always visible, click to collapse */}
              <div
                onClick={() => setCollapsedQuestions((v) => !v)}
                style={{
                  padding: "10px 16px", backgroundColor: "#d97706", color: "white",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <span>
                  Câu hỏi{currentSection ? " - Section " + (selectedSectionIndex + 1) : ""}
                </span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {currentSection && (
                    <span style={{ fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>
                      {currentSection.questions?.length || 0} câu
                    </span>
                  )}
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.8)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineIcon name={collapsedQuestions ? "chevron-down" : "chevron-up"} size={13} style={{ color: "currentColor" }} />
                    {collapsedQuestions ? "Mở rộng" : "Thu nhỏ"}
                  </span>
                </div>
              </div>
              {!collapsedQuestions && (
                currentSection ? (
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
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "13px" }}>
                    Chọn một Section trong sidebar để xem câu hỏi
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
            gap: "12px",
            padding: "12px 20px",
            backgroundColor: "#fff",
            borderTop: "1px solid #e2e8f0",
            boxShadow: "0 -2px 6px rgba(0,0,0,0.06)",
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
            <span>Passages: {passages?.length || 0}</span>
            <span>
              Sections:{" "}
              {passages?.reduce(
                (sum, p) => sum + (p.sections?.length || 0),
                0
              ) || 0}
            </span>
            <span>Questions: {calculateTotalQuestions(passages)}</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onReview}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 6px -1px rgba(59,130,246,0.3)",
              }}
            >
                Review & {submitButtonText}
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
                <h3 style={{ margin: 0, fontSize: "18px" }}>Xác nhận {submitButtonText}</h3>
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
                  <strong>Tiêu đề:</strong> {title}
                </div>
                <div>
                  <strong>Mã lớp:</strong> {classCode || "(Không có)"}
                </div>
                <div>
                  <strong>Giáo viên:</strong> {teacherName || "(Không có)"}
                </div>
                <div>
                  <strong>Passages:</strong> {passages?.length || 0}
                </div>
                <div>
                  <strong>Sections:</strong>{" "}
                  {passages?.reduce(
                    (sum, p) => sum + (p.sections?.length || 0),
                    0
                  ) || 0}
                </div>
                <div>
                  <strong>Tổng câu hỏi:</strong>{" "}
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
                      Passage {pIdx + 1}:{" "}
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
                            Section {sIdx + 1}:{" "}
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
                              const isClozeType = q.questionType === "cloze-test"; 
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
                              const clozeTable = isClozeType ? getActiveClozeTable(q) : null;
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

                              // Compute starting number for this question (used for blanks numbering)
                              const startNumber = questionStarts?.[`${section.id}-${qIdx}`] || (q.questionNumber ? String(q.questionNumber).trim().split(/[, -]/)[0] : null);

                              // Special summary-completion preview: show teacher answers and continuous numbering
                              if (q.questionType === 'summary-completion') {
                                const passageHtml = q.questionText || '';
                                const plainText = (passageHtml || '').replace(/<[^>]+>/g, '');
                                const blankCount = (plainText.match(/\[BLANK\]/g) || []).length || 0;
                                const opts = Array.isArray(q.options) ? q.options : [];

                                // Local helpers so we don't rely on functions that are defined later in the file
                                const localHighlight = (text) => {
                                  if (!text) return '';
                                  return text
                                    .replace(/\[BLANK\]/g, '<span style="background:#fff3cd;padding:2px 8px;border-radius:3px;border:1px dashed #ffc107;font-weight:bold;">______</span>')
                                    .replace(/_{3,}/g, '<span style="background:#fff3cd;padding:2px 8px;border-radius:3px;border:1px dashed #ffc107;font-weight:bold;">______</span>')
                                    .replace(/\((\d+)\)/g, '<span style="background:#17a2b8;color:white;padding:1px 6px;border-radius:3px;font-size:10px;margin:0 2px;">$1</span>');
                                };

                                const localBorder = '1px solid #eee';
                                const localBadgeColor = '#ffc107';

                                // Prefer explicit questionNumber when present (e.g. "27-31"); otherwise fall back to computed start
                                let baseStart = null;
                                if (q.questionNumber) {
                                  const firstPart = String(q.questionNumber).trim().split(/[, -]/)[0];
                                  const parsed = parseInt(firstPart, 10);
                                  baseStart = isNaN(parsed) ? null : parsed;
                                }
                                if (!baseStart) baseStart = questionStarts?.[`${section.id}-${qIdx}`] || (qIdx + 1);

                                return (
                                  <div key={qIdx} style={{ padding: '10px 12px', marginBottom: '10px', backgroundColor: 'white', borderRadius: '6px', border: localBorder, fontSize: '12px' }}>
                                    {/* Question Header */}
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
                                      <span style={{ backgroundColor: localBadgeColor, color: 'white', padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                        Q{q.questionNumber || baseStart || qIdx + 1}
                                      </span>
                                      <span style={{ backgroundColor: '#6c757d', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{q.questionType}</span>
                                      <span style={{ backgroundColor: '#28a745', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{blankCount} chỗ trống</span>
                                    </div>

                                    <div style={{ marginBottom: '10px', padding: '12px', backgroundColor: '#e8f4fc', borderRadius: '6px', border: '1px solid #bee5eb', lineHeight: '1.8' }}>
                                      <div dangerouslySetInnerHTML={{ __html: localHighlight(passageHtml) }} style={{ fontSize: '13px' }} />
                                    </div>

                                    {/* Blanks and teacher answers */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                      {Array.from({ length: blankCount }).map((_, bi) => {
                                        const number = (baseStart || (questionStarts?.[`${section.id}-${qIdx}`] || qIdx + 1)) + bi;
                                        const teacherAnswer = q.blanks && q.blanks[bi] ? q.blanks[bi].correctAnswer : '';

                                        return (
                                          <div key={bi} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 16, background: '#0e276f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{number}</div>
                                            <div style={{ padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: 6, minHeight: 36 }}>{teacherAnswer || <em style={{ color: '#666' }}>(chưa có đáp án)</em>}</div>
                                            <div style={{ padding: '8px 12px', backgroundColor: teacherAnswer ? '#dcfce7' : '#fff7ed', color: teacherAnswer ? '#166534' : '#92400e', borderRadius: 6, fontWeight: 700 }}>
                                              {teacherAnswer ? 'Đáp án GV' : 'Chưa có'}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Options list */}
                                    {opts.length > 0 && (
                                      <div style={{ marginTop: 12 }}>
                                        <strong>Options:</strong>
                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                          {opts.map((opt, idx) => (
                                            <div key={idx} style={{ background: '#fff7ed', padding: '6px 10px', borderRadius: 20, border: '1px solid #fcd34d', color: '#92400e' }}>
                                              <strong style={{ marginRight: 6 }}>{String.fromCharCode(65 + idx)}</strong>{opt}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                );
                              }

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
                                      Q{q.questionNumber || startNumber || qIdx + 1}
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
                                        Chưa có nội dung
                                      </span>
                                    )}
                                  </div>

                                  {/* Question Content */}
                                  <div style={{ flex: 1 }}>
                                    {/* Cloze-test: Show paragraphText OR questionText */}
                                    {isClozeType && clozeTable ? (
                                      <>
                                        {(() => {
                                          const tableStartNum = q.startQuestion
                                            ? parseInt(String(q.startQuestion).trim().split(/[,\-]/)[0], 10)
                                            : startNumber || 1;
                                          let tableBlankCounter = 0;
                                          const renderPreviewCellParts = (parts, ri, ci, lineIndex) =>
                                            parts.map((part, partIndex) => {
                                              if (part.type === "text") {
                                                return <span key={`${ri}-${ci}-${lineIndex}-${partIndex}`}>{part.value}</span>;
                                              }

                                              const blankNum = tableStartNum + tableBlankCounter;
                                              tableBlankCounter += 1;
                                              return (
                                                <strong
                                                  key={`${ri}-${ci}-${lineIndex}-blank-${partIndex}`}
                                                  style={{ backgroundColor: "#fff3cd", padding: "2px 6px", borderRadius: "4px", margin: "0 3px", fontSize: "12px" }}
                                                >
                                                  {blankNum}
                                                </strong>
                                              );
                                            });
                                          return (
                                            <div
                                              style={{
                                                marginBottom: "10px",
                                                padding: "12px",
                                                backgroundColor: "#e8f4fc",
                                                borderRadius: "6px",
                                                border: "1px solid #bee5eb",
                                                lineHeight: "1.8",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: "11px",
                                                  color: "#17a2b8",
                                                  marginBottom: "6px",
                                                  fontWeight: "bold",
                                                }}
                                              >
                                                Cloze table:
                                              </div>
                                              {clozeTable.instruction && (
                                                <div style={{ fontStyle: "italic", marginBottom: "6px", color: "#0f172a" }}>
                                                  {clozeTable.instruction}
                                                </div>
                                              )}
                                              {clozeTable.title && (
                                                <div style={{ textAlign: "center", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
                                                  {clozeTable.title}
                                                </div>
                                              )}
                                              <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                                  <thead>
                                                    <tr>
                                                      {clozeTable.columns.map((col, ci) => (
                                                        <th
                                                          key={ci}
                                                          style={{
                                                            border: "1px solid #cbd5e1",
                                                            backgroundColor: "#e0f2fe",
                                                            padding: "8px",
                                                            textAlign: "left",
                                                          }}
                                                        >
                                                          {col}
                                                        </th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {clozeTable.rows.map((row, ri) => (
                                                      <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? "white" : "#f8fafc" }}>
                                                        {clozeTable.columns.map((col, ci) => {
                                                          const cellValue = row.cells?.[ci] || "";
                                                          const lineParts = getClozeTableCellLines(cellValue, col);

                                                          return (
                                                            <td
                                                              key={ci}
                                                              style={{
                                                                border: "1px solid #cbd5e1",
                                                                padding: "8px",
                                                                verticalAlign: "top",
                                                              }}
                                                            >
                                                              {isClozeCommentsColumn(col) ? (
                                                                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                                                  {lineParts.map((parts, lineIndex) => (
                                                                    <li key={`${ri}-${ci}-${lineIndex}`}>
                                                                      {renderPreviewCellParts(parts, ri, ci, lineIndex)}
                                                                    </li>
                                                                  ))}
                                                                </ul>
                                                              ) : (
                                                                lineParts.map((parts, lineIndex) => (
                                                                  <React.Fragment key={`${ri}-${ci}-${lineIndex}`}>
                                                                    {lineIndex > 0 ? <br /> : null}
                                                                    {renderPreviewCellParts(parts, ri, ci, lineIndex)}
                                                                  </React.Fragment>
                                                                ))
                                                              )}
                                                            </td>
                                                          );
                                                        })}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                    </>
                                    ) : isClozeType ? (
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
                                          Đoạn văn câu hỏi:
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
                                    ) : null}
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
                                              Danh sách Matching:
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
                                                    Danh sách
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
                                                    Các đoạn văn
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
                                              Nội dung câu hỏi:
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
                                          IELTS Matching Headings
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
                                                List of Headings:
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
                                                Đáp án:
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
                                            Chưa nhập dữ liệu Matching Headings
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
                                            Các lựa chọn:
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
                                          Đáp án:
                                        </strong>
                                        {isClozeType && q.blanks ? (
                                          <div style={{ marginTop: "6px" }}>
                                            {q.blanks.map((b, i) => {
                                              const baseQNum =
                                                q.questionNumber
                                                  ? parseInt(
                                                      String(q.questionNumber)
                                                        .trim()
                                                        .split(/[,\-]/)[0],
                                                      10
                                                    )
                                                  : startNumber || 1;
                                              const displayNum = (Number.isNaN(baseQNum) ? 1 : baseQNum) + i;
                                              return (
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
                                                    {displayNum}
                                                  </span>
                                                  {b.correctAnswer || "(trống)"}
                                                </div>
                                              );
                                            })}
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
                  Quay lại chỉnh sửa
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
                    ? "Đang xử lý..."
                    : `Xác nhận ${submitButtonText}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom children (loading state, etc.) */}
        {children}
      </IeltsTestEditorShell>
    </>
  );
};

export default ReadingTestEditor;
