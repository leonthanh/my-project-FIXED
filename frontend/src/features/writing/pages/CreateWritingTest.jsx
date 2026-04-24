import React, { useState } from "react";
import ReactQuill from "react-quill";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, redirectToLogin } from "../../../shared/utils/api";
import useQuillImageUpload from "../../../shared/hooks/useQuillImageUpload";

import "../../../shared/styles/WritingEditorForm.css";

const CreateWritingTest = () => {
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [showPreview, setShowPreview] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const task1Quill = useQuillImageUpload();
  const task2Quill = useQuillImageUpload();

  const saveDraft = () => {
    try {
      const draft = { task1, task2, classCode, teacherName };
      localStorage.setItem("writingTestDraft", JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving writing draft", error);
    }
  };

  const updateMessage = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
  };

  const clearSelectedImage = () => {
    setImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task1.trim() || !task2.trim()) {
      updateMessage("error", "Please enter both Task 1 and Task 2.");
      return;
    }

    try {
      const endpoint = image
        ? apiPath("writing-tests/with-image")
        : apiPath("writing-tests");

      let res;
      if (image) {
        const formData = new FormData();
        formData.append("task1", task1);
        formData.append("task2", task2);
        formData.append("classCode", classCode);
        formData.append("teacherName", teacherName);
        formData.append("testType", "writing");
        formData.append("image", image);

        res = await authFetch(endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await authFetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task1,
            task2,
            classCode,
            teacherName,
            testType: "writing",
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          try {
            saveDraft();
          } catch (_error) {
            // ignore local draft failures
          }
          updateMessage(
            "error",
            "Your session has expired or is invalid. Please sign in again. Your draft has been saved."
          );
          setRequiresLogin(true);
          return;
        }

        updateMessage("error", data.message || "Unable to create the writing test.");
        return;
      }

      updateMessage("success", data.message || "Writing test created successfully.");

      setTask1("");
      setTask2("");
      setClassCode("");
      setTeacherName("");
      setImage(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error(error);
      updateMessage("error", "Unable to create the writing test.");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };

  return (
    <>
      <AdminNavbar />
      <div className="create-writing-container">
        {requiresLogin && (
          <div
            style={{
              padding: 12,
              background: "#fff0f0",
              border: "1px solid #ffcccc",
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <strong
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <InlineIcon name="average" size={16} style={{ color: "#d97706" }} />
              You need to sign in again to complete this action.
            </strong>
            <div style={{ marginTop: 8 }}>
              Your draft has been saved.
              <button
                style={{ marginLeft: 8, padding: "6px 10px" }}
                onClick={() => {
                  redirectToLogin({ rememberPath: true, replace: true });
                }}
              >
                Sign in again
              </button>
            </div>
          </div>
        )}

        <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <InlineIcon name="writing" size={18} />
          Create IX Writing
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Class code (e.g. 317S3)"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Teacher name"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: "20px" }}>
            <label>
              <b>Task 1 prompt:</b>
            </label>
            <div style={{ margin: "6px 0 10px", color: "#4b5563", fontSize: "14px" }}>
              Use the image button in the toolbar to insert images directly into the
              prompt. If you want a separate illustration image for Task 1, choose
              a file below.
            </div>
            <div className="create-writing-quill">
              <ReactQuill
                ref={task1Quill.quillRef}
                theme="snow"
                value={task1}
                onChange={setTask1}
                placeholder="Enter the Task 1 prompt"
                modules={task1Quill.modules}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <b>Task 2 prompt:</b>
            </label>
            <div className="create-writing-quill">
              <ReactQuill
                ref={task2Quill.quillRef}
                theme="snow"
                value={task2}
                onChange={setTask2}
                placeholder="Enter the Task 2 prompt"
                modules={task2Quill.modules}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Task 1 illustration image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              style={{ margin: "0 0 10px" }}
            />
            {image && (
              <div
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fff",
                  maxWidth: 560,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  Selected image preview
                </div>
                <img
                  src={URL.createObjectURL(image)}
                  alt="Selected Task 1 illustration"
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    marginBottom: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: "#fff",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#e03",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <InlineIcon name="create" size={14} style={{ color: "white" }} />
                Create test
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#0e276f",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <InlineIcon name="eye" size={14} style={{ color: "white" }} />
                Preview
              </span>
            </button>
          </div>
        </form>

        {message && (
          <p
            style={{
              marginTop: 10,
              fontWeight: "bold",
              color: messageTone === "error" ? "red" : "green",
            }}
          >
            {message}
          </p>
        )}

        {showPreview && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowPreview(false)}
          >
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "80%",
                maxHeight: "80%",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <InlineIcon name="document" size={18} />
                Preview IX Writing
              </h3>

              {image && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Illustration image:</h4>
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              )}

              <div>
                <h4>Task 1:</h4>
                <div dangerouslySetInnerHTML={{ __html: task1 }} />
              </div>

              <div style={{ marginTop: "15px" }}>
                <h4>Task 2:</h4>
                <div dangerouslySetInnerHTML={{ __html: task2 }} />
              </div>

              <div style={{ textAlign: "right", marginTop: "20px" }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#e03",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateWritingTest;
