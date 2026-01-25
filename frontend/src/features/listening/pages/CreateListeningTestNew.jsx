import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart } from "../hooks";
import { apiPath } from "../../../shared/utils/api";

/**
 * CreateListeningTestNew - Trang tạo đề Listening IELTS với 4-column editor
 */
import { canManageCategory } from '../../../shared/utils/permissions';

const CreateListeningTestNew = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const allowedToManage = canManageCategory(user, 'listening');

  // Form fields
  const [title, setTitle] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [showResultModal, setShowResultModal] = useState(true);

  // Global audio
  const [globalAudioFile, setGlobalAudioFile] = useState(null);

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
  } = useListeningHandlers([createNewPart(1)]);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("listeningTestDraftNew");
      if (savedDraft) {
        const data = JSON.parse(savedDraft);
        if (data.title) setTitle(data.title);
        if (data.classCode) setClassCode(data.classCode);
        if (data.teacherName) setTeacherName(data.teacherName);
        if (data.parts && data.parts.length > 0) setParts(data.parts);
        console.log("Loaded draft from localStorage");
      }
    } catch (err) {
      console.error("Error loading draft:", err);
    }
  }, [setParts]);

  // Auto-save to localStorage
  const saveDraft = useCallback(() => {
    try {
      setIsSaving(true);
      const draftData = {
        title,
        classCode,
        teacherName,
        parts,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("listeningTestDraftNew", JSON.stringify(draftData));
      setLastSaved(new Date());
      console.log("Draft saved");
    } catch (err) {
      console.error("Error saving draft:", err);
    } finally {
      setIsSaving(false);
    }
  }, [title, classCode, teacherName, parts]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>⚠️ Bạn không có quyền tạo đề Listening</h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

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

    if (!classCode || !classCode.trim()) {
      setMessage("⚠️ Vui lòng nhập mã lớp");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!teacherName || !teacherName.trim()) {
      setMessage("⚠️ Vui lòng nhập tên giáo viên");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Check if there are any questions
    let hasQuestions = false;
    parts.forEach(part => {
      part.sections?.forEach(section => {
        if (section.questions?.length > 0) {
          hasQuestions = true;
        }
      });
    });

    if (!hasQuestions) {
      setMessage("⚠️ Vui lòng thêm ít nhất 1 câu hỏi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsReviewing(true);
  };

  // Handle confirm submit
  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Clean up parts data for submission
      const cleanedParts = parts.map((part) => ({
        title: part.title,
        instruction: stripHtml(part.instruction || ""),
        transcript: part.transcript || "",
        audioFile: part.audioFile,
        sections: part.sections.map((section) => ({
          sectionTitle: section.sectionTitle || "",
          sectionInstruction: stripHtml(section.sectionInstruction || ""),
          questionType: section.questionType || "fill",
          startingQuestionNumber: section.startingQuestionNumber || null,
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
      formData.append("showResultModal", showResultModal);
      // Backend expects 'passages' not 'parts'
      formData.append("passages", JSON.stringify(cleanedParts));

      // Add global audio if selected
      if (globalAudioFile?.file) {
        formData.append("audioFile", globalAudioFile.file);
      }

      // Add per-part audio files
      parts.forEach((part, idx) => {
        if (part.audioFile && part.audioFile instanceof File) {
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

      // Clear draft on success
      localStorage.removeItem("listeningTestDraftNew");

      setMessage("✅ Tạo đề thi thành công!");

      setTimeout(() => {
        navigate("/select-test");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setIsReviewing(false);
    }
  };

  // Calculate total questions
  const calculateTotalQuestions = () => {
    return parts.reduce((total, part) => {
      return total + (part.sections || []).reduce((sTotal, section) => {
        const qType = section.questionType || 'fill';
        
        if (qType === 'matching') {
          return sTotal + (section.questions[0]?.leftItems?.length || 0);
        }
        if (qType === 'form-completion') {
          return sTotal + (section.questions[0]?.formRows?.filter(r => r.isBlank)?.length || 0);
        }
        if (qType === 'notes-completion') {
          const notesText = section.questions[0]?.notesText || '';
          const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
          return sTotal + blanks.length;
        }
        if (qType === 'multi-select') {
          return sTotal + section.questions.reduce((sum, q) => sum + (q.requiredAnswers || 2), 0);
        }
        
        return sTotal + (section.questions?.length || 0);
      }, 0);
    }, 0);
  };

  const totalQuestions = calculateTotalQuestions();

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
      showResultModal={showResultModal}
      setShowResultModal={setShowResultModal}
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
      isSubmitting={isSubmitting}
      submitButtonText="Tạo đề"
      // Auto-save
      lastSaved={lastSaved}
      isSaving={isSaving}
      onManualSave={saveDraft}
      // Messages & Preview
      message={message}
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      // Global audio
      globalAudioFile={globalAudioFile}
      setGlobalAudioFile={setGlobalAudioFile}
      // Total questions
      totalQuestions={totalQuestions}
    />
  );
};

export default CreateListeningTestNew;
