import React, { useEffect, useState } from "react";
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
import WritingTestEditorShell from "./WritingTestEditorShell.jsx";

const EditWritingTest = () => {
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

  const loginNotice = requiresLogin ? (
    <div className="ix-writing-editor-alert-card">
      <strong className="ix-writing-editor-alert-title">
        <InlineIcon name="average" size={16} style={{ color: "#d97706" }} />
        You need to sign in again to complete this action.
      </strong>

      <div className="ix-writing-editor-alert-body">
        <span>Your draft has been saved.</span>
        <button
          type="button"
          className="ix-writing-editor-alert-button"
          onClick={() => {
            redirectToLogin({ rememberPath: true, replace: true });
          }}
        >
          Sign in again
        </button>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="create-writing-container ix-writing-editor-loading">
          <InlineIcon name="loading" size={16} />
          Loading...
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <WritingTestEditorShell
        pageTitle="Edit IX Writing"
        pageDescription="Bố cục gọn cho chỉnh sửa đề IX Writing."
        submitLabel="Save changes"
        submitIconName="save"
        onSubmit={handleSubmit}
        classCode={classCode}
        setClassCode={setClassCode}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        isTeacherNameLocked
        task1={task1}
        setTask1={setTask1}
        task2={task2}
        setTask2={setTask2}
        task1Quill={task1Quill}
        task2Quill={task2Quill}
        imageFile={image}
        existingImageUrl={existingImage ? hostPath(existingImage) : ""}
        removeExistingImage={removeExistingImage}
        onImageChange={handleImageSelection}
        onRemoveImage={handleRemoveImage}
        onUndoRemoveImage={handleUndoRemoveImage}
        message={message}
        messageTone={messageTone}
        notice={loginNotice}
        previewTitle="Preview IX Writing"
      />
    </>
  );
};

export default EditWritingTest;
