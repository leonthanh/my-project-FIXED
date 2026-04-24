import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import {
  apiPath,
  authFetch,
  getStoredUser,
  hostPath,
  redirectToLogin,
} from "../../../shared/utils/api";
import useQuillImageUpload from "../../../shared/hooks/useQuillImageUpload";
import "react-quill/dist/quill.snow.css";
import "../../../shared/styles/WritingEditorForm.css";

const EditTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [showPreview, setShowPreview] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const task1Quill = useQuillImageUpload();
  const task2Quill = useQuillImageUpload();

  const updateMessage = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !["teacher", "admin"].includes(user.role)) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(apiPath(`writing-tests/${id}`));
        if (!response.ok) {
          throw new Error("Unable to find the writing test.");
        }

        const data = await response.json();
        setTask1(data.task1 || "");
        setTask2(data.task2 || "");
        setClassCode(data.classCode || "");
        setTeacherName(data.teacherName || "");
        setExistingImage(data.task1Image || "");
        setRemoveExistingImage(false);
      } catch (error) {
        console.error("Error loading writing test:", error);
        updateMessage("error", "Unable to load the writing test. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  const saveDraft = () => {
    try {
      const payload = {
        classCode,
        teacherName,
        task1,
        task2,
        removeExistingImage,
      };
      localStorage.setItem(`writingTestDraftEdit-${id}`, JSON.stringify(payload));
    } catch (error) {
      console.error("Error saving writing edit draft", error);
    }
  };

  const handleImageSelection = (nextFile) => {
    setImage(nextFile || null);
    if (nextFile) {
      setRemoveExistingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (image) {
      setImage(null);
      return;
    }

    if (existingImage && !removeExistingImage) {
      setRemoveExistingImage(true);
    }
  };

  const handleUndoRemoveImage = () => {
    setRemoveExistingImage(false);
  };

  const currentImagePreview = image
    ? URL.createObjectURL(image)
    : existingImage && !removeExistingImage
      ? hostPath(existingImage)
      : "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task1.trim() || !task2.trim()) {
      updateMessage("error", "Please enter both Task 1 and Task 2.");
      return;
    }

    try {
      let response;

      if (image) {
        const formData = new FormData();
        formData.append("classCode", classCode);
        formData.append("teacherName", teacherName);
        formData.append("task1", task1);
        formData.append("task2", task2);
        formData.append("testType", "writing");
        formData.append("image", image);
        formData.append("removeTask1Image", removeExistingImage ? "true" : "false");

        response = await authFetch(apiPath(`writing-tests/${id}/with-image`), {
          method: "PUT",
          body: formData,
        });
      } else {
        response = await authFetch(apiPath(`writing-tests/${id}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classCode,
            teacherName,
            task1,
            task2,
            testType: "writing",
            removeTask1Image: removeExistingImage,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
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

        updateMessage("error", data.message || "Unable to update the writing test.");
        return;
      }

      updateMessage("success", data.message || "Writing test updated successfully.");
      setImage(null);
      setExistingImage(data.test?.task1Image || "");
      setRemoveExistingImage(false);

      setTimeout(() => navigate("/select-test"), 1200);
    } catch (error) {
      console.error("Error updating writing test:", error);
      updateMessage("error", "Unable to update the writing test. Please try again.");
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

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div
          className="create-writing-container"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <InlineIcon name="loading" size={16} />
          Loading...
        </div>
      </>
    );
  }

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
              <InlineIcon
                name="average"
                size={16}
                style={{ color: "#d97706" }}
              />
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
          Edit IX Writing
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

          {currentImagePreview && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Task 1 illustration image:
              </div>
              <img
                src={currentImagePreview}
                alt="Task 1 illustration"
                style={{
                  width: "100%",
                  maxWidth: 560,
                  height: "auto",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={handleRemoveImage}
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
            </div>
          )}

          {!image && existingImage && removeExistingImage && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: 8,
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#9a3412",
              }}
            >
              The current illustration image will be removed when you save this test.
              <button
                type="button"
                onClick={handleUndoRemoveImage}
                style={{
                  marginLeft: 10,
                  padding: "8px 14px",
                  backgroundColor: "#fff",
                  color: "#0e276f",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Undo
              </button>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Replace Task 1 illustration image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageSelection(e.target.files?.[0] || null)}
              style={{ margin: "0 0 10px" }}
            />
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
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <InlineIcon name="save" size={14} style={{ color: "white" }} />
                Save changes
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
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
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

              {currentImagePreview && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Illustration image:</h4>
                  <img
                    src={currentImagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxWidth: 560,
                      height: "auto",
                      border: "1px solid #d1d5db",
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

export default EditTest;
