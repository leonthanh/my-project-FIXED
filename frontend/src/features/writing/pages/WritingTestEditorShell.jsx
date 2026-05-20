import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import "react-quill/dist/quill.snow.css";
import "../../../shared/styles/WritingEditorForm.css";

const stripRichText = (value = "") =>
  String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasContent = (value) => stripRichText(value).length > 0;

const renderPreviewHtml = (value, fallback) => {
  if (hasContent(value)) {
    return { __html: value };
  }

  return { __html: `<em>${fallback}</em>` };
};

const WritingTestEditorShell = ({
  pageTitle,
  pageDescription,
  submitLabel,
  submitIconName,
  onSubmit,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
  isTeacherNameLocked = false,
  task1,
  setTask1,
  task2,
  setTask2,
  task1Quill,
  task2Quill,
  imageFile,
  existingImageUrl = "",
  removeExistingImage = false,
  onImageChange,
  onRemoveImage,
  onUndoRemoveImage,
  message,
  messageTone = "success",
  notice = null,
  previewTitle = "Preview IX Writing",
}) => {
  const [activeTask, setActiveTask] = useState("task1");
  const [showPreview, setShowPreview] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState("");
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (!(imageFile instanceof File)) {
      setGeneratedImagePreview("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(imageFile);
    setGeneratedImagePreview(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [imageFile]);

  const currentImagePreview = imageFile
    ? generatedImagePreview
    : removeExistingImage
      ? ""
      : existingImageUrl;

  const sidebarTasks = [
    {
      key: "task1",
      title: "Task 1",
      pill: currentImagePreview ? "Có ảnh" : "Ảnh",
    },
    {
      key: "task2",
      title: "Task 2",
      pill: "Đề bài",
    },
  ];

  const isTask1Active = activeTask === "task1";
  const imageStatusText = imageFile?.name
    ? imageFile.name
    : currentImagePreview
      ? "Ảnh minh họa hiện tại"
      : "Chưa chọn file";

  return (
    <div className="create-writing-container ix-writing-editor-shell">
      {notice ? <div className="ix-writing-editor-notice">{notice}</div> : null}

      <div className="ix-writing-editor-header-card">
        <div className="ix-writing-editor-header-top">
          <div>
            <h2 className="ix-writing-editor-title">
              <span className="ix-writing-editor-title-icon">
                <InlineIcon name="writing" size={18} style={{ color: "currentColor" }} />
              </span>
              {pageTitle}
            </h2>
            <p className="ix-writing-editor-subtitle">{pageDescription}</p>
          </div>

          <div className="ix-writing-editor-summary-pill">
            <span>Ảnh minh họa đặt ở Task 1</span>
          </div>
        </div>

        <div className="ix-writing-editor-meta-grid">
          <label className="ix-writing-editor-field">
            <span className="ix-writing-editor-field-label">Mã lớp</span>
            <input
              type="text"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              placeholder="VD: PRE-IX-1A"
            />
          </label>

          <label className="ix-writing-editor-field">
            <span className="ix-writing-editor-field-label">Tên giáo viên</span>
            <input
              type="text"
              value={teacherName}
              onChange={(event) => setTeacherName(event.target.value)}
              disabled={isTeacherNameLocked}
              placeholder="Nhập tên giáo viên"
            />
          </label>
        </div>

        {message ? (
          <div className={`ix-writing-editor-message is-${messageTone}`}>
            {message}
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="ix-writing-editor-workspace">
        <aside className="ix-writing-editor-sidebar">
          <div className="ix-writing-editor-sidebar-header">Tasks</div>

          <div className="ix-writing-editor-sidebar-list">
            {sidebarTasks.map((task) => (
              <button
                key={task.key}
                type="button"
                className={`ix-writing-editor-sidebar-card ${activeTask === task.key ? "is-active" : ""}`}
                onClick={() => setActiveTask(task.key)}
              >
                <div className="ix-writing-editor-sidebar-card-top">
                  <span className="ix-writing-editor-sidebar-card-title">{task.title}</span>
                  <span className="ix-writing-editor-sidebar-card-pill">{task.pill}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="ix-writing-editor-main">
          <div className="ix-writing-editor-panel">
            <div className="ix-writing-editor-panel-header">
              <div>
                <div className="ix-writing-editor-panel-badge">
                  {isTask1Active ? "Khu vực Task 1" : "Khu vực Task 2"}
                </div>
                <h3 className="ix-writing-editor-panel-heading">
                  {isTask1Active ? "Task 1: đề bài và ảnh minh họa" : "Task 2: đề bài"}
                </h3>
              </div>

              <div className="ix-writing-editor-panel-note">
                {isTask1Active ? "Ảnh minh họa ở đây" : "Chỉ có đề bài"}
              </div>
            </div>

            <div className="ix-writing-editor-panel-body">
              {isTask1Active ? (
                <div className="ix-writing-editor-task-layout ix-writing-editor-task1-layout">
                  <div className="ix-writing-editor-card ix-writing-editor-editor-card">
                    <div className="ix-writing-editor-section-label">
                      <InlineIcon name="writing" size={14} style={{ color: "currentColor" }} />
                      Đề bài Task 1
                    </div>

                    <div className="create-writing-quill ix-writing-editor-quill">
                      <ReactQuill
                        ref={task1Quill.quillRef}
                        theme="snow"
                        value={task1}
                        onChange={setTask1}
                        placeholder="Nhập đề bài Task 1"
                        modules={task1Quill.modules}
                      />
                    </div>
                  </div>

                  <div className="ix-writing-editor-card ix-writing-editor-image-card">
                    <div className="ix-writing-editor-section-label">
                      <InlineIcon name="image" size={14} style={{ color: "currentColor" }} />
                      Ảnh minh họa Task 1
                    </div>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => onImageChange(event.target.files?.[0] || null)}
                      className="ix-writing-editor-hidden-input"
                    />

                    <div className="ix-writing-editor-upload-row">
                      <button
                        type="button"
                        className="ix-writing-editor-upload-button"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <InlineIcon name="image" size={14} style={{ color: "currentColor" }} />
                        {currentImagePreview ? "Đổi ảnh minh họa" : "Chọn ảnh minh họa"}
                      </button>

                      <span className="ix-writing-editor-upload-filename">{imageStatusText}</span>
                    </div>

                    {currentImagePreview ? (
                      <div className="ix-writing-editor-image-preview">
                        <img src={currentImagePreview} alt="Task 1 illustration" />

                        <div className="ix-writing-editor-image-actions">
                          <button
                            type="button"
                            className="ix-writing-editor-danger-btn"
                            onClick={onRemoveImage}
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ix-writing-editor-image-empty">
                        <InlineIcon name="image" size={24} style={{ color: "currentColor" }} />
                        <span>Chưa có ảnh minh họa cho Task 1.</span>
                      </div>
                    )}

                    {removeExistingImage && !imageFile ? (
                      <div className="ix-writing-editor-warning">
                        <span>Ảnh hiện tại sẽ bị xóa khi bạn lưu đề.</span>
                        {onUndoRemoveImage ? (
                          <button
                            type="button"
                            className="ix-writing-editor-ghost-btn"
                            onClick={onUndoRemoveImage}
                          >
                            Hoàn tác
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="ix-writing-editor-card ix-writing-editor-editor-card ix-writing-editor-task2-card">
                  <div className="ix-writing-editor-section-label">
                    <InlineIcon name="document" size={14} style={{ color: "currentColor" }} />
                    Đề bài Task 2
                  </div>

                  <div className="create-writing-quill ix-writing-editor-quill">
                    <ReactQuill
                      ref={task2Quill.quillRef}
                      theme="snow"
                      value={task2}
                      onChange={setTask2}
                      placeholder="Nhập đề bài Task 2"
                      modules={task2Quill.modules}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ix-writing-editor-actions">
            <button
              type="button"
              className="ix-writing-editor-secondary-btn"
              onClick={() => setShowPreview(true)}
            >
              <InlineIcon name="eye" size={14} style={{ color: "currentColor" }} />
              Preview
            </button>

            <button type="submit" className="ix-writing-editor-primary-btn">
              <InlineIcon name={submitIconName} size={14} style={{ color: "currentColor" }} />
              {submitLabel}
            </button>
          </div>
        </section>
      </form>

      {showPreview ? (
        <div className="ix-writing-editor-preview-backdrop" onClick={() => setShowPreview(false)}>
          <div className="ix-writing-editor-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ix-writing-editor-preview-header">
              <h3>
                <InlineIcon name="document" size={18} style={{ color: "currentColor" }} />
                {previewTitle}
              </h3>

              <button
                type="button"
                className="ix-writing-editor-preview-close"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
            </div>

            <div className="ix-writing-editor-preview-meta">
              <span>Lớp: {classCode || "(Không có)"}</span>
              <span>Giáo viên: {teacherName || "(Không có)"}</span>
            </div>

            <div className="ix-writing-editor-preview-section">
              <div className="ix-writing-editor-preview-section-header">Task 1</div>

              {currentImagePreview ? (
                <div className="ix-writing-editor-preview-image-wrap">
                  <img src={currentImagePreview} alt="Task 1 preview" />
                </div>
              ) : null}

              <div
                className="ix-writing-editor-preview-html"
                dangerouslySetInnerHTML={renderPreviewHtml(task1, "Task 1 prompt is empty.")}
              />
            </div>

            <div className="ix-writing-editor-preview-section">
              <div className="ix-writing-editor-preview-section-header">Task 2</div>
              <div
                className="ix-writing-editor-preview-html"
                dangerouslySetInnerHTML={renderPreviewHtml(task2, "Task 2 prompt is empty.")}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WritingTestEditorShell;