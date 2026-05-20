import React, { useEffect, useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, redirectToLogin } from "../../../shared/utils/api";
import resolveAuthUserDisplayName, { readStoredAuthUser } from '../../../shared/utils/authUserDisplayName';
import useQuillImageUpload from "../../../shared/hooks/useQuillImageUpload";
import WritingTestEditorShell from "./WritingTestEditorShell.jsx";

const CreateWritingTest = () => {
  const currentTeacherName = resolveAuthUserDisplayName(readStoredAuthUser());
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState(currentTeacherName);
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const task1Quill = useQuillImageUpload();
  const task2Quill = useQuillImageUpload();

  useEffect(() => {
    setTeacherName(currentTeacherName);
  }, [currentTeacherName]);

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
      setTeacherName(currentTeacherName);
      setImage(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error(error);
      updateMessage("error", "Unable to create the writing test.");
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

  return (
    <>
      <AdminNavbar />
      <WritingTestEditorShell
        pageTitle="Create IX Writing"
        pageDescription="Bố cục gọn cho tạo đề IX Writing."
        submitLabel="Create test"
        submitIconName="create"
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
        onImageChange={setImage}
        onRemoveImage={clearSelectedImage}
        message={message}
        messageTone={messageTone}
        notice={loginNotice}
        previewTitle="Preview IX Writing"
      />
    </>
  );
};

export default CreateWritingTest;
