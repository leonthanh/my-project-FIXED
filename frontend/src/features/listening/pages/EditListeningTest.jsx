import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart, calculateTotalQuestions } from "../hooks";
import {
  normalizeListeningParts,
  prepareListeningPartsForSubmit,
} from "../utils/clozeTableSchema";
import { apiPath, authFetch, redirectToLogin } from "../../../shared/utils/api";

/**
 * EditListeningTest - Trang sửa đề Listening IELTS
 * Load dữ liệu từ API và cho phép chỉnh sửa
 */
import { canManageCategory } from '../../../shared/utils/permissions';

const promptedEditDrafts = new Map();

const shouldPromptForDraftRestore = (testId, savedDraft) => {
  const key = String(testId || '');
  if (!key || !savedDraft) return true;

  if (promptedEditDrafts.get(key) === savedDraft) {
    return false;
  }

  promptedEditDrafts.set(key, savedDraft);
  return true;
};

const clearDraftRestorePrompt = (testId) => {
  const key = String(testId || '');
  if (!key) return;
  promptedEditDrafts.delete(key);
};

const FILEISH_KEYS = new Set(['audioFile', 'imageFile', 'mapImageFile']);

const canonicalizeDraftValue = (value, currentKey = '') => {
  if (value == null) return value;

  if (typeof File !== 'undefined' && value instanceof File) {
    return '__file__';
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return '__blob__';
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeDraftValue(item));
  }

  if (typeof value === 'object') {
    if (FILEISH_KEYS.has(currentKey)) {
      return '__file__';
    }

    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        if (key === 'savedAt') return accumulator;

        const nextValue = canonicalizeDraftValue(value[key], key);
        if (nextValue !== undefined) {
          accumulator[key] = nextValue;
        }
        return accumulator;
      }, {});
  }

  if (FILEISH_KEYS.has(currentKey) && typeof value !== 'string' && value !== '') {
    return '__file__';
  }

  return value;
};

const buildEditDraftSnapshot = ({ title, classCode, teacherName, showResultModal, parts }) =>
  canonicalizeDraftValue({
    title: title || '',
    classCode: classCode || '',
    teacherName: teacherName || '',
    showResultModal: showResultModal ?? true,
    parts: normalizeListeningParts(Array.isArray(parts) ? parts : []),
  });

const shouldOfferDraftRestore = ({ serverState, draftState }) => {
  const serverSnapshot = JSON.stringify(buildEditDraftSnapshot(serverState));
  const draftSnapshot = JSON.stringify(buildEditDraftSnapshot(draftState));
  return serverSnapshot !== draftSnapshot;
};

const EditListeningTest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem('user'));
  const allowedToManage = canManageCategory(user, 'listening');
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [showResultModal, setShowResultModal] = useState(true);

  // Global audio
  const [globalAudioFile, setGlobalAudioFile] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Show login banner when refresh fails
  const [requiresLogin, setRequiresLogin] = useState(false);

  // Use listening handlers hook with empty initial
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

  // Fetch existing test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await authFetch(apiPath(`listening-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        
        const data = await res.json();
        console.log("Loaded test data:", data);
        
        // Parse JSON strings if needed
        const partInstructions = typeof data.partInstructions === 'string' 
          ? JSON.parse(data.partInstructions) 
          : data.partInstructions;
        const questions = typeof data.questions === 'string' 
          ? JSON.parse(data.questions) 
          : data.questions;
        const partAudioUrls = typeof data.partAudioUrls === 'string' 
          ? JSON.parse(data.partAudioUrls) 
          : data.partAudioUrls;
        const sharedPartAudioUrl = (() => {
          const values = Object.values(partAudioUrls || {}).filter(Boolean);
          const uniqueValues = Array.from(new Set(values));
          return uniqueValues.length === 1 ? uniqueValues[0] : null;
        })();
        
        // Set form fields
        setTitle(data.title || "");
        setClassCode(data.classCode || "");
        setTeacherName(data.teacherName || "");
        setShowResultModal(data.showResultModal ?? true);
        setExistingAudioUrl(data.mainAudioUrl || sharedPartAudioUrl);
        
        // Reconstruct parts from partInstructions and questions
        const reconstructedParts = reconstructParts(partInstructions, questions, partAudioUrls);
        console.log("Reconstructed parts:", reconstructedParts);
        const normalizedReconstructedParts = normalizeListeningParts(reconstructedParts);
        setParts(normalizedReconstructedParts);

        // If there's a local draft (from a failed update), offer to restore it
        try {
          const savedDraft = localStorage.getItem(`listeningTestDraftEdit-${id}`);
          if (!savedDraft) {
            clearDraftRestorePrompt(id);
          }

          if (savedDraft && shouldPromptForDraftRestore(id, savedDraft)) {
            const draft = JSON.parse(savedDraft);
            const hasMeaningfulDraftDiff = shouldOfferDraftRestore({
              serverState: {
                title: data.title || '',
                classCode: data.classCode || '',
                teacherName: data.teacherName || '',
                showResultModal: data.showResultModal ?? true,
                parts: normalizedReconstructedParts,
              },
              draftState: {
                title: draft.title,
                classCode: draft.classCode,
                teacherName: draft.teacherName,
                showResultModal: draft.showResultModal,
                parts: draft.parts,
              },
            });

            if (hasMeaningfulDraftDiff && window.confirm("Tìm thấy bản nháp cục bộ. Khôi phục bản nháp?")) {
              setTitle(draft.title || (data.title || ""));
              setClassCode(draft.classCode || (data.classCode || ""));
              setTeacherName(draft.teacherName || (data.teacherName || ""));
              setShowResultModal(draft.showResultModal ?? (data.showResultModal ?? true));
              if (draft.parts) setParts(normalizeListeningParts(draft.parts));
            }
          }
        } catch (e) {
          console.error("Error loading edit draft", e);
        }
        
      } catch (err) {
        console.error("Error fetching test:", err);
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTest();
    }
  }, [id, setParts]);

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Bạn không có quyền sửa đề Listening</h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

  // Reconstruct parts from database format to editor format
  const reconstructParts = (partInstructions, questions, partAudioUrls) => {
    if (!partInstructions || !Array.isArray(partInstructions)) {
      return [createNewPart(1)];
    }

    const safeParseJson = (value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (_err) {
        return value;
      }
    };
    
    return partInstructions.map((partInfo, partIndex) => {
      // Get sections for this part
      const sections = partInfo.sections?.map((sectionInfo, sectionIndex) => {
        // Get questions for this section
        const sectionQuestions = questions?.filter(q => 
          q.partIndex === partIndex && q.sectionIndex === sectionIndex
        ) || [];
        
        // Transform questions back to editor format
        const editorQuestions = sectionQuestions.map((q) => {
          const parsedClozeTable = safeParseJson(q.clozeTable) || null;

          return {
            questionType: q.questionType || sectionInfo.questionType || "fill",
            questionText: q.questionText || "",
            correctAnswer: q.correctAnswer || "",
            requiredAnswers: q.requiredAnswers || undefined,
            title: q.title || parsedClozeTable?.title || "",
            instruction: q.instruction || parsedClozeTable?.instruction || "",
            clozeTable: parsedClozeTable,
            leftTitle: q.leftTitle || q.itemsTitle || q.itemsLabel || '',
            rightTitle: q.rightTitle || q.optionsTitle || q.optionsLabel || '',
            leftItems: safeParseJson(q.leftItems) || safeParseJson(q.items) || [],
            rightItems: safeParseJson(q.rightItems) || safeParseJson(q.options) || [],
            options: safeParseJson(q.options) || [],
            formTitle: q.formTitle || "",
            formRows: safeParseJson(q.formRows) || [],
            questionRange: q.questionRange || "",
            answers: safeParseJson(q.answers) || {},
            notesText: q.notesText || "",
            notesTitle: q.notesTitle || "",
            wordLimit: q.wordLimit || "ONE WORD ONLY",
            steps: safeParseJson(q.steps) || [],
            // Table completion fields
            columns: safeParseJson(q.columns) || [],
            rows: safeParseJson(q.rows) || [],
            // Map labeling fields (keep positions and image URL so editor can show markers in both editors)
            items: safeParseJson(q.items) || [],
            mapImageUrl: q.mapImageUrl || q.imageUrl || '',
            imageUrl: q.imageUrl || q.mapImageUrl || '',
          };
        });
        
        return {
          sectionTitle: sectionInfo.sectionTitle || "",
          sectionInstruction: sectionInfo.sectionInstruction || "",
          questionType: sectionInfo.questionType || "fill",
          startingQuestionNumber: sectionInfo.startingQuestionNumber || null,
          questions: editorQuestions.length > 0 ? editorQuestions : [{
            questionType: sectionInfo.questionType || "fill",
            questionText: "",
            correctAnswer: "",
          }],
        };
      }) || [];
      
      return {
        title: partInfo.title || `Part ${partIndex + 1}`,
        instruction: partInfo.instruction || "",
        transcript: partInfo.transcript || "",
        audioFile: partAudioUrls?.[partIndex] || partInfo.audioFile || '',
        audioUrl: partAudioUrls?.[partIndex] || partInfo.audioFile || '',
        sections: sections.length > 0 ? sections : [{
          sectionTitle: "",
          sectionInstruction: "",
          questionType: "fill",
          questions: [{ questionType: "fill", questionText: "", correctAnswer: "" }],
        }],
      };
    });
  };

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
      setMessage("Warning: Vui lòng nhập mã lớp");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!teacherName || !teacherName.trim()) {
      setMessage("Warning: Vui lòng nhập tên giáo viên");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (calculateTotalQuestions(parts) === 0) {
      setMessage("Warning: Vui lòng thêm ít nhất 1 câu hỏi");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsReviewing(true);
  };

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      setIsSaving(true);
      const draftKey = `listeningTestDraftEdit-${id}`;
      const dataToSave = { title, classCode, teacherName, parts, showResultModal, savedAt: new Date().toISOString() };
      localStorage.setItem(draftKey, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    } catch (e) {
      console.error('Error saving draft:', e);
    } finally {
      setIsSaving(false);
    }
  }, [id, title, classCode, teacherName, parts, showResultModal]);

  // Auto-save every 30 seconds + on page unload (only after data is loaded)
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(saveToLocalStorage, 30000);
    const handleBeforeUnload = () => saveToLocalStorage();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage, loading]);

  // Handle confirm update
  const handleConfirmUpdate = async () => {
    console.log("handleConfirmUpdate called");

    // Tiny delay to allow any pending state updates (e.g. marker positions) to flush to `parts`
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      setIsUpdating(true);
      console.log('Parts at start of confirm:', parts);

      // Save a local draft now so user doesn't lose work if network/save fails
      try {
        localStorage.setItem(`listeningTestDraftEdit-${id}`, JSON.stringify({
          title, classCode, teacherName, parts, showResultModal, savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.error("Error saving edit draft", e);
      }

      const cleanedParts = prepareListeningPartsForSubmit(parts, stripHtml).map((part) => {
        const persistedAudioRef = typeof part.audioUrl === "string" && part.audioUrl && !/^blob:/i.test(part.audioUrl)
          ? part.audioUrl
          : "";

        return {
          title: part.title,
          instruction: stripHtml(part.instruction || ""),
          transcript: part.transcript || "",
          audioFile: part.audioFile instanceof File ? "" : (part.audioFile || persistedAudioRef || ""),
          sections: part.sections,
        };
      });

      console.log("Submitting cleanedParts:", JSON.stringify(cleanedParts));

      // Build FormData
      const formData = new FormData();
      formData.append("title", stripHtml(title));
      formData.append("classCode", classCode);
      formData.append("teacherName", teacherName);
      formData.append("showResultModal", showResultModal);
      formData.append("passages", JSON.stringify(cleanedParts));

      // Add global audio if new file selected
      if (globalAudioFile?.file) {
        formData.append("audioFile", globalAudioFile.file);
      }

      // Add per-part audio files
      parts.forEach((part, idx) => {
        if (part.audioFile && part.audioFile instanceof File) {
          formData.append(`audioFile_part_${idx}`, part.audioFile);
        }

        // Add map image files for any questions in this part
        (part.sections || []).forEach((section, sIdx) => {
          (section.questions || []).forEach((q, qIdx) => {
            // Support both keys used by MapLabelingQuestion
            const imgFile = q?.mapImageFile || q?.imageFile || null;
            if (imgFile && imgFile instanceof File) {
              formData.append(`mapImage_part_${idx}_section_${sIdx}_q_${qIdx}`, imgFile);
            }
          });
        });
      });

      const response = await authFetch(apiPath(`listening-tests/${id}`), {
        method: "PUT",
        body: formData,
      });

      console.log("PUT response status:", response.status);
      const data = await response.json().catch(() => ({}));
      console.log("PUT response body:", data);

      if (!response.ok) {
        if (response.status === 401) {
          try { localStorage.setItem(`listeningTestDraftEdit-${id}`, JSON.stringify({ title, classCode, teacherName, parts, showResultModal })); } catch (e) {}
          setMessage('Error: Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.');
          setRequiresLogin(true);
          return;
        }
        throw new Error(data.message || "Lỗi khi cập nhật đề thi");
      }

      setMessage("Success: Cập nhật đề thi thành công!");
      try {
        localStorage.removeItem(`listeningTestDraftEdit-${id}`);
        clearDraftRestorePrompt(id);
      } catch (e) { /* ignore */ }

      setTimeout(() => {
        navigate("/select-test");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      // Save current state as a draft to avoid data loss
      try {
        localStorage.setItem(`listeningTestDraftEdit-${id}`, JSON.stringify({
          title, classCode, teacherName, parts, showResultModal, savedAt: new Date().toISOString()
        }));
      } catch (e) { console.error("Error saving edit draft after failure", e); }
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsUpdating(false);
      setIsReviewing(false);
    }
  };

  const totalQuestions = calculateTotalQuestions(parts);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.2rem",
      }}>
        Đang tải dữ liệu đề thi...
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
      }}>
        <h2>Lỗi</h2>
        <p>{loadError}</p>
        <button
          onClick={() => navigate("/select-test")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, marginBottom: 12 }}>
          <strong>Bạn cần đăng nhập lại để hoàn tất thao tác.</strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { redirectToLogin({ rememberPath: true, replace: true }); }}>Đăng nhập lại</button>
          </div>
        </div>
      )}

      <ListeningTestEditor
        // Page info
        pageTitle={`Sửa đề Listening - ID: ${id}`}
        className="edit-listening-test"
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
      onConfirmSubmit={handleConfirmUpdate}
      isSubmitting={isUpdating}
      submitButtonText="Cập nhật"
      // Auto-save
      lastSaved={lastSaved}
      isSaving={isSaving}
      onManualSave={saveToLocalStorage}
      // Messages & Preview
      message={message}
      // Global audio
      globalAudioFile={globalAudioFile}
      setGlobalAudioFile={setGlobalAudioFile}
      existingAudioUrl={existingAudioUrl}
      // Total questions
      totalQuestions={totalQuestions}
    />
    </div>
  );
};

export default EditListeningTest;
