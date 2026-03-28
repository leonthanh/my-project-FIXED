import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart } from "../hooks";
import { apiPath, authFetch, redirectToLogin } from "../../../shared/utils/api";

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
        if (data.teacherName) setTeacherName(data.teacherName);      if (data.showResultModal !== undefined) setShowResultModal(data.showResultModal);        if (data.parts && data.parts.length > 0) setParts(data.parts);
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
        showResultModal,
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
  }, [title, classCode, teacherName, showResultModal, parts]);

  // Local state to show login banner when refresh fails
  const [requiresLogin, setRequiresLogin] = useState(false);

  // Auto-save every 30 seconds + on page unload
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    const handleBeforeUnload = () => saveDraft();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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

      const response = await authFetch(apiPath("listening-tests"), {
        method: "POST",
        // Don't set Content-Type; browser will set multipart boundary for FormData
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Save draft and prompt re-login
          try { saveDraft(); } catch (e) { /* ignore */ }
          setMessage('❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.');
          setRequiresLogin(true);
          return;
        }
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
    const stripHtml = (html) => {
      if (!html) return '';
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };

    const countTableCompletionBlanks = (question) => {
      const rowsArr = question?.rows || [];
      const cols = question?.columns || [];
      const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/g;
      let blanksCount = 0;

      rowsArr.forEach((row) => {
        const r = Array.isArray(row?.cells)
          ? row
          : {
              cells: [
                row?.vehicle || '',
                row?.cost || '',
                Array.isArray(row?.comments) ? row.comments.join('\n') : row?.comments || '',
              ],
            };

        const cells = Array.isArray(r.cells) ? r.cells : [];
        const maxCols = cols.length ? cols.length : cells.length;
        for (let c = 0; c < maxCols; c++) {
          const text = String(cells[c] || '');
          const matches = text.match(BLANK_REGEX) || [];
          blanksCount += matches.length;
        }
      });

      if (blanksCount === 0) return rowsArr.length || 0;
      return blanksCount;
    };

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
          const notesText = stripHtml(section.questions[0]?.notesText || '');
          const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
          return sTotal + blanks.length;
        }
        if (qType === 'table-completion') {
          return sTotal + countTableCompletionBlanks(section.questions[0] || {});
        }
        if (qType === 'map-labeling') {
          return sTotal + (section.questions[0]?.items?.length || 0);
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
    <div>
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, marginBottom: 12 }}>
          <strong>⚠️ Bạn cần đăng nhập lại để hoàn tất thao tác.</strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { redirectToLogin({ rememberPath: true, replace: true }); }}>Đăng nhập lại</button>
          </div>
        </div>
      )}

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
        // Global audio
        globalAudioFile={globalAudioFile}
        setGlobalAudioFile={setGlobalAudioFile}
        // Total questions
        totalQuestions={totalQuestions}
      />
    </div>
  );
};

export default CreateListeningTestNew;
