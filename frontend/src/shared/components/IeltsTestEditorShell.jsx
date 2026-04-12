import React from "react";
import AdminNavbar from "./AdminNavbar";
import AutoSaveIndicator from "./AutoSaveIndicator";
import InlineIcon from "./InlineIcon.jsx";

const LEGACY_ERROR_MARK = "\u274C";
const LEGACY_SUCCESS_MARK = "\u2705";
const LEGACY_WARNING_MARK = "\u26A0\uFE0F";
const LEGACY_LOADING_MARK = "\u23F3";

const getMessageTone = (message = "") => {
  if (message?.includes(LEGACY_ERROR_MARK) || /^(error|lỗi)\s*:/i.test(message)) {
    return "error";
  }
  if (message?.includes(LEGACY_SUCCESS_MARK) || /^(success|thành công)\s*:/i.test(message)) {
    return "success";
  }
  return "warning";
};

const getDisplayMessage = (message = "") =>
  String(message)
    .replace(new RegExp(`^(?:${LEGACY_SUCCESS_MARK}|${LEGACY_ERROR_MARK}|${LEGACY_WARNING_MARK}|${LEGACY_LOADING_MARK})\\s*`, "u"), "")
    .replace(/^(error|lỗi|success|thành công|warning|cảnh báo|loading)\s*:\s*/i, "");

const defaultMessageStyle = (message) => ({
  textAlign: "center",
  padding: "8px",
  marginTop: "8px",
  backgroundColor: getMessageTone(message) === "error"
    ? "#ffe6e6"
    : getMessageTone(message) === "success"
    ? "#e6ffe6"
    : "#fff3cd",
  borderRadius: "4px",
  color: getMessageTone(message) === "error"
    ? "red"
    : getMessageTone(message) === "success"
    ? "green"
    : "#856404",
});

const IeltsTestEditorShell = ({
  className,
  pageTitle,
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
  showResultModal,
  setShowResultModal,
  lastSaved,
  isSaving,
  message,
  renderMessage,
  leftControls,
  rightControls,
  afterInputs,
  shellStyle,
  containerStyle,
  headerStyle,
  topBarStyle,
  titleStyle,
  inputLayoutStyle,
  titleInputStyle,
  classCodeInputStyle,
  teacherInputStyle,
  headerCollapsed = false,
  onToggleHeader,
  children,
}) => {
  const handleChange = (setter) => (e) => setter(e.target.value);

  return (
    <div style={shellStyle}>
      <AdminNavbar />
      <div className={className} style={containerStyle}>
        <div style={headerStyle}>
          <div style={topBarStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
              {leftControls}
            </div>
            <h2 style={titleStyle}>{pageTitle}</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {rightControls}
              {onToggleHeader && (
                <button
                  type="button"
                  onClick={onToggleHeader}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <InlineIcon name={headerCollapsed ? "chevron-down" : "chevron-up"} size={12} />
                    {headerCollapsed ? "Mở rộng" : "Thu gọn"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {!headerCollapsed && (
            <>
              <div style={inputLayoutStyle}>
                <input
                  type="text"
                  placeholder="Tiêu đề đề thi"
                  value={title || ""}
                  onChange={handleChange(setTitle)}
                  style={titleInputStyle}
                />
                <input
                  type="text"
                  placeholder="Mã lớp"
                  value={classCode || ""}
                  onChange={handleChange(setClassCode)}
                  style={classCodeInputStyle}
                />
                <input
                  type="text"
                  placeholder="Tên giáo viên"
                  value={teacherName || ""}
                  onChange={handleChange(setTeacherName)}
                  style={teacherInputStyle}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showResultModal ?? true}
                    onChange={(e) => setShowResultModal(e.target.checked)}
                  />
                  Hiển thị kết quả
                </label>
              </div>

              {afterInputs}

              {message && (renderMessage ? renderMessage(message) : (
                <div style={defaultMessageStyle(message)}>
                  {getDisplayMessage(message)}
                </div>
              ))}
            </>
          )}
        </div>

        {children}
      </div>
    </div>
  );
};

export default IeltsTestEditorShell;
