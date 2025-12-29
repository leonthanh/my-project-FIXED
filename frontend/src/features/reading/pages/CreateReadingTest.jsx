import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReadingTestEditor } from "../components";
import { usePassageHandlers } from "../hooks";
import { stripHtml, cleanupPassageHTML, createNewPassage } from "../utils";
import { normalizeQuestionType } from "../utils/questionHelpers";
import { apiPath } from "../../../shared/utils/api";

/**
 * CreateReadingTest - Trang tạo đề Reading IELTS mới
 * Sử dụng ReadingTestEditor component và usePassageHandlers hook
 */
const CreateReadingTest = () => {
  const navigate = useNavigate();

  // Load saved data from localStorage
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem("readingTestDraft");
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

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use passage handlers hook
  const {
    passages,
    selectedPassageIndex,
    setSelectedPassageIndex,
    selectedSectionIndex,
    setSelectedSectionIndex,
    message,
    setMessage,

    handleAddPassage,
    handleDeletePassage,
    handlePassageChange,
    handleAddSection,
    handleDeleteSection,
    handleSectionChange,
    handleCopySection,
    handleAddQuestion,
    handleDeleteQuestion,
    handleCopyQuestion,
    handleQuestionChange,
  } = usePassageHandlers(savedData?.passages || [createNewPassage()]);

  // Autosave function with indicator
  const saveToLocalStorage = useCallback(() => {
    try {
      setIsSaving(true);
      const dataToSave = {
        title,
        passages,
        classCode,
        teacherName,
      };
      localStorage.setItem("readingTestDraft", JSON.stringify(dataToSave));
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving draft:", error);
      setIsSaving(false);
    }
  }, [title, passages, classCode, teacherName]);

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

  // Handle review
  const handleReview = (e) => {
    if (e) e.preventDefault();

    // Validate title
    if (!title || !title.trim()) {
      setMessage("⚠️ Vui lòng nhập tiêu đề đề thi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate passages
    if (!passages || passages.length === 0) {
      setMessage("⚠️ Cần có ít nhất 1 passage");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate each passage has at least 1 section
    const hasEmptySections = passages.some(
      (p) => !p.sections || p.sections.length === 0
    );
    if (hasEmptySections) {
      setMessage("⚠️ Mỗi passage cần có ít nhất 1 section");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate each section has at least 1 question
    const hasEmptyQuestions = passages.some((p) =>
      p.sections.some((s) => !s.questions || s.questions.length === 0)
    );
    if (hasEmptyQuestions) {
      setMessage("⚠️ Mỗi section cần có ít nhất 1 câu hỏi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsReviewing(true);
  };

  // Handle confirm submit
  const handleConfirmSubmit = async () => {
    try {
      setIsCreating(true);

      // Clean up passages data
      const cleanedPassages = await Promise.all(
        passages.map(async (p) => {
          return {
            passageTitle: stripHtml(p.passageTitle || ""),
            passageText: cleanupPassageHTML(p.passageText || ""),
            sections: await Promise.all(
              p.sections?.map(async (section) => {
                const imagesToSend =
                  typeof section.sectionImage === "string"
                    ? section.sectionImage
                    : null;

                return {
                  sectionTitle: stripHtml(section.sectionTitle || ""),
                  // Preserve HTML/formatting from Quill for section instructions so font sizes, alignment, and images are kept
                  sectionInstruction: cleanupPassageHTML(
                    section.sectionInstruction || ""
                  ),
                  sectionImage: imagesToSend,
                  questions:
                    section.questions?.map((q) => ({
                      ...q,
                      questionType: normalizeQuestionType(
                        q.questionType || q.type || ""
                      ),
                      // For question content we keep raw HTML where needed (some question types use rich text)
                      questionText: q.questionText || "",
                      options: q.options
                        ? q.options.map((opt) => opt)
                        : undefined,
                    })) || [],
                };
              }) || []
            ),
          };
        })
      );

      const response = await fetch(apiPath("reading-tests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: stripHtml(title),
          classCode: stripHtml(classCode),
          teacherName: stripHtml(teacherName),
          passages: cleanedPassages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Lỗi khi tạo đề thi");
      }

      setMessage("✅ Tạo đề thi thành công!");
      localStorage.removeItem("readingTestDraft");

      setTimeout(() => {
        navigate("/reading-tests");
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
    <ReadingTestEditor
      // Page info
      pageTitle="📚 Tạo Đề Reading IELTS"
      className="create-reading-test"
      // Form fields
      title={title}
      setTitle={setTitle}
      classCode={classCode}
      setClassCode={setClassCode}
      teacherName={teacherName}
      setTeacherName={setTeacherName}
      // Passages state
      passages={passages}
      selectedPassageIndex={selectedPassageIndex}
      setSelectedPassageIndex={setSelectedPassageIndex}
      selectedSectionIndex={selectedSectionIndex}
      setSelectedSectionIndex={setSelectedSectionIndex}
      // Passage handlers
      onPassageChange={handlePassageChange}
      onAddPassage={handleAddPassage}
      onDeletePassage={handleDeletePassage}
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
    />
  );
};

export default CreateReadingTest;
