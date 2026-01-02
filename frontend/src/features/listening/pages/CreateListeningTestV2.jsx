import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart } from "../hooks";
import { apiPath } from "../../../shared/utils/api";

/**
 * CreateListeningTest - Trang tạo đề Listening IELTS mới
 * Sử dụng ListeningTestEditor component với layout 4 cột
 */
const CreateListeningTest = () => {
  const navigate = useNavigate();

  // Load saved data from localStorage
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem("listeningTestDraftV2");
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
    return null;
  };

  const savedData = loadSavedData();

  // Form fields
  const [title, setTitle] = useState(savedData?.title || "");
  const [classCode, setClassCode] = useState(savedData?.classCode || "");
  const [teacherName, setTeacherName] = useState(savedData?.teacherName || "");

  // Global audio
  const [globalAudioFile, setGlobalAudioFile] = useState(null);

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with 4 parts (IELTS standard) or saved data
  const initialParts = savedData?.parts || [
    createNewPart(1),
    createNewPart(2),
    createNewPart(3),
    createNewPart(4),
  ];

  // Use listening handlers hook
  const {
    parts,
    setParts,
    selectedPartIndex,
    setSelectedPartIndex,
    selectedSectionIndex,
    setSelectedSectionIndex,
    message,
    setMessage,

    handleAddPart,
    handleDeletePart,
    handlePartChange,
    handleAddSection,
    handleDeleteSection,
    handleSectionChange,
    handleCopySection,
    handleAddQuestion,
    handleDeleteQuestion,
    handleQuestionChange,
    handleCopyQuestion,
    handleBulkAddQuestions,
  } = useListeningHandlers(initialParts);

  // Autosave function
  const saveToLocalStorage = useCallback(() => {
    try {
      setIsSaving(true);
      const dataToSave = {
        title,
        parts,
        classCode,
        teacherName,
      };
      localStorage.setItem("listeningTestDraftV2", JSON.stringify(dataToSave));
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving draft:", error);
      setIsSaving(false);
    }
  }, [title, parts, classCode, teacherName]);

  // Auto save every 30 seconds and on page unload
  useEffect(() => {
    const autosaveInterval = setInterval(saveToLocalStorage, 30000);

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveToLocalStorage]);

  // Helper to strip HTML
  const stripHtml = (html) => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  // Handle review - validate before showing review modal
  const handleReview = (e) => {
    if (e) e.preventDefault();

    // Validate title
    if (!title || !title.trim()) {
      setMessage("⚠️ Vui lòng nhập tiêu đề đề thi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate parts
    if (!parts || parts.length === 0) {
      setMessage("⚠️ Cần có ít nhất 1 Part");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Check audio exists (global or per-part)
    const hasGlobalAudio = globalAudioFile?.file;
    const hasPartAudio = parts.some((p) => p.audioFile);
    if (!hasGlobalAudio && !hasPartAudio) {
      setMessage("⚠️ Vui lòng tải lên audio chung hoặc audio cho từng Part");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate each part has at least 1 section with questions
    const invalidParts = parts.filter(
      (p) =>
        !p.sections ||
        p.sections.length === 0 ||
        p.sections.some((s) => !s.questions || s.questions.length === 0)
    );
    if (invalidParts.length > 0) {
      setMessage("⚠️ Mỗi Part cần có ít nhất 1 Section với ít nhất 1 câu hỏi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsReviewing(true);
  };

  // Handle confirm submit
  const handleConfirmSubmit = async () => {
    try {
      setIsCreating(true);

      // Validate file sizes (max 50MB per file)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      if (globalAudioFile?.file && globalAudioFile.file.size > MAX_FILE_SIZE) {
        throw new Error("❌ File audio chung quá lớn (>50MB)");
      }

      for (let i = 0; i < parts.length; i++) {
        if (parts[i].audioFile && parts[i].audioFile.size > MAX_FILE_SIZE) {
          throw new Error(`❌ File audio Part ${i + 1} quá lớn (>50MB)`);
        }
      }

      // Clean up parts data for submission
      const cleanedParts = parts.map((part) => ({
        title: part.title,
        instruction: stripHtml(part.instruction || ""),
        transcript: part.transcript || "",
        sections: part.sections.map((section) => ({
          sectionTitle: section.sectionTitle || "",
          sectionInstruction: stripHtml(section.sectionInstruction || ""),
          questionType: section.questionType || "fill",
          questions: section.questions.map((q) => ({
            ...q,
            questionText: stripHtml(q.questionText || ""),
            options: q.options
              ? q.options.map((opt) => (typeof opt === "string" ? opt : opt))
              : undefined,
          })),
        })),
      }));

      // Build FormData
      const formData = new FormData();
      formData.append("title", stripHtml(title));
      formData.append("classCode", classCode);
      formData.append("teacherName", teacherName);
      formData.append("parts", JSON.stringify(cleanedParts));

      // Add global audio if exists
      if (globalAudioFile?.file) {
        formData.append("audioFile", globalAudioFile.file);
      }

      // Add per-part audio files
      parts.forEach((part, idx) => {
        if (part.audioFile) {
          formData.append(`audioFile_part_${idx}`, part.audioFile);
        }
      });

      const response = await fetch(apiPath("listening-tests"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Lỗi khi tạo đề thi");
      }

      setMessage("✅ Tạo đề thi Listening thành công!");
      localStorage.removeItem("listeningTestDraftV2");

      setTimeout(() => {
        navigate("/select-test");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsCreating(false);
      setIsReviewing(false);
    }
  };

  return (
    <ListeningTestEditor
      // Page info
      pageTitle="🎧 Tạo Đề Listening IELTS"
      className="create-listening-test"
      // Form fields
      title={title}
      setTitle={setTitle}
      classCode={classCode}
      setClassCode={setClassCode}
      teacherName={teacherName}
      setTeacherName={setTeacherName}
      // Parts state
      parts={parts}
      selectedPartIndex={selectedPartIndex}
      setSelectedPartIndex={setSelectedPartIndex}
      selectedSectionIndex={selectedSectionIndex}
      setSelectedSectionIndex={setSelectedSectionIndex}
      // Part handlers
      onPartChange={handlePartChange}
      onAddPart={handleAddPart}
      onDeletePart={handleDeletePart}
      // Section handlers
      onSectionChange={handleSectionChange}
      onAddSection={handleAddSection}
      onDeleteSection={handleDeleteSection}
      onCopySection={handleCopySection}
      // Question handlers
      onQuestionChange={handleQuestionChange}
      onAddQuestion={handleAddQuestion}
      onDeleteQuestion={handleDeleteQuestion}
      onCopyQuestion={handleCopyQuestion}
      onBulkAddQuestions={handleBulkAddQuestions}
      // Review & Submit
      isReviewing={isReviewing}
      setIsReviewing={setIsReviewing}
      onReview={handleReview}
      onConfirmSubmit={handleConfirmSubmit}
      isSubmitting={isCreating}
      submitButtonText="Tạo đề"
      // Auto-save
      lastSaved={lastSaved}
      isSaving={isSaving}
      onManualSave={saveToLocalStorage}
      // Messages & Preview
      message={message}
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      // Global audio
      globalAudioFile={globalAudioFile}
      setGlobalAudioFile={setGlobalAudioFile}
    />
  );
};

export default CreateListeningTest;
