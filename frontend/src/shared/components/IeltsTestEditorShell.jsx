import React from "react";
import AdminNavbar from "./AdminNavbar";
import AutoSaveIndicator from "./AutoSaveIndicator";

const defaultMessageStyle = (message) => ({
  textAlign: "center",
  padding: "8px",
  marginTop: "8px",
  backgroundColor: message?.includes("❌")
    ? "#ffe6e6"
    : message?.includes("✅")
    ? "#e6ffe6"
    : "#fff3cd",
  borderRadius: "4px",
  color: message?.includes("❌")
    ? "red"
    : message?.includes("✅")
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
                  {headerCollapsed ? "▼ Mở rộng" : "▲ Thu gọn"}
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={showResultModal ?? true}
                    onChange={(e) => setShowResultModal(e.target.checked)}
                  />
                  Hiển thị kết quả sau khi nộp bài
                </label>
              </div>

              {afterInputs}

              {message && (renderMessage ? renderMessage(message) : (
                <div style={defaultMessageStyle(message)}>
                  {message}
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
