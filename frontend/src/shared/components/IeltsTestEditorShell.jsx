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
            </div>
          </div>

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
          </div>

          {afterInputs}

          {message && (renderMessage ? renderMessage(message) : (
            <div style={defaultMessageStyle(message)}>
              {message}
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
};

export default IeltsTestEditorShell;
