import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart } from "../hooks";
import { apiPath, authFetch } from "../../../shared/utils/api";

/**
 * EditListeningTest - Trang sửa đề Listening IELTS
 * Load dữ liệu từ API và cho phép chỉnh sửa
 */
import { canManageCategory } from '../../../shared/utils/permissions';

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

  // Auto-save state (reserved for future use)
  const [lastSaved] = useState(null);
  const [isSaving] = useState(false);

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
        const res = await fetch(apiPath(`listening-tests/${id}`));
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
        
        // Set form fields
        setTitle(data.title || "");
        setClassCode(data.classCode || "");
        setTeacherName(data.teacherName || "");
        setShowResultModal(data.showResultModal ?? true);
        setExistingAudioUrl(data.mainAudioUrl);
        
        // Reconstruct parts from partInstructions and questions
        const reconstructedParts = reconstructParts(partInstructions, questions, partAudioUrls);
        console.log("Reconstructed parts:", reconstructedParts);
        setParts(reconstructedParts);

        // If there's a local draft (from a failed update), offer to restore it
        try {
          const savedDraft = localStorage.getItem(`listeningTestDraftEdit-${id}`);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            if (window.confirm("Tìm thấy bản nháp cục bộ. Khôi phục bản nháp?")) {
              setTitle(draft.title || (data.title || ""));
              setClassCode(draft.classCode || (data.classCode || ""));
              setTeacherName(draft.teacherName || (data.teacherName || ""));
              setShowResultModal(draft.showResultModal ?? (data.showResultModal ?? true));
              if (draft.parts) setParts(draft.parts);
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
        <h2>⚠️ Bạn không có quyền sửa đề Listening</h2>
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
    
    return partInstructions.map((partInfo, partIndex) => {
      // Get sections for this part
      const sections = partInfo.sections?.map((sectionInfo, sectionIndex) => {
        // Get questions for this section
        const sectionQuestions = questions?.filter(q => 
          q.partIndex === partIndex && q.sectionIndex === sectionIndex
        ) || [];
        
        // Transform questions back to editor format
        const editorQuestions = sectionQuestions.map(q => ({
          questionType: q.questionType || sectionInfo.questionType || "fill",
          questionText: q.questionText || "",
          correctAnswer: q.correctAnswer || "",
          options: q.options || [],
          formTitle: q.formTitle || "",
          formRows: q.formRows || [],
          questionRange: q.questionRange || "",
          answers: q.answers || {},
          // Table completion fields
          columns: q.columns || [],
          rows: q.rows || [],
          // Map labeling fields (keep positions and image URL so editor can show markers)
          items: q.items || [],
          mapImageUrl: q.mapImageUrl || q.imageUrl || '',
        }));
        
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
        audioFile: partAudioUrls?.[partIndex] || null,
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
      setMessage("⚠️ Vui lòng nhập mã lớp");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!teacherName || !teacherName.trim()) {
      setMessage("⚠️ Vui lòng nhập tên giáo viên");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsReviewing(true);
  };

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

      // Clean up parts data for submission
      const cleanedParts = parts.map((part) => ({
        title: part.title,
        instruction: stripHtml(part.instruction || ""),
        transcript: part.transcript || "",
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

      // Before sending, ensure per-blank answers from editor (row.commentBlankAnswers / row.correct) are merged
      // into the question answers map so backend receives them.
      const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/g;
      let globalQ = 1;
      cleanedParts.forEach((part) => {
        part.sections.forEach((section) => {
          section.questions.forEach((q) => {
            if (q.questionType === 'table-completion') {
              q.answers = q.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? { ...q.answers } : {};

              const cols = q.columns || [];
              const rowsArr = q.rows || [];
              const before = globalQ;

              const getFlatCommentAnswer = (commentBlankAnswers, flatIdx) => {
                if (!Array.isArray(commentBlankAnswers)) return undefined;
                let acc = 0;
                for (let li = 0; li < commentBlankAnswers.length; li++) {
                  const arr = commentBlankAnswers[li] || [];
                  if (flatIdx < acc + (arr.length || 0)) return arr[flatIdx - acc];
                  acc += (arr.length || 0);
                }
                return undefined;
              };

              rowsArr.forEach((rawRow) => {
                const r = Array.isArray(rawRow.cells)
                  ? rawRow
                  : (() => {
                      const cells = [];
                      cells[0] = rawRow.vehicle || '';
                      cells[1] = rawRow.cost || '';
                      cells[2] = Array.isArray(rawRow.comments) ? rawRow.comments.join('\n') : rawRow.comments || '';
                      while (cells.length < cols.length) cells.push('');
                      return { ...rawRow, cells, cellBlankAnswers: rawRow.cellBlankAnswers || [], commentBlankAnswers: rawRow.commentBlankAnswers || [] };
                    })();

                for (let c = 0; c < cols.length; c++) {
                  const text = String((r.cells && r.cells[c]) || '');
                  let match;
                  BLANK_REGEX.lastIndex = 0;
                  let localIdx = 0;
                  const isCommentsCol = /comment/i.test((q.columns || [])[c]);
                  while ((match = BLANK_REGEX.exec(text)) !== null) {
                    const num = String(globalQ++);
                    const cbVal = isCommentsCol ? (getFlatCommentAnswer(r.commentBlankAnswers, localIdx) || '') : ((r.cellBlankAnswers && r.cellBlankAnswers[c] && r.cellBlankAnswers[c][localIdx]) || '');
                    if (!q.answers[num] && cbVal) q.answers[num] = cbVal;
                    // fallback for cost-like column: prefer row.correct
                    if (!q.answers[num] && c === 1 && r.correct) q.answers[num] = r.correct;
                    localIdx++;
                  }
                }
              });

              // If no explicit blanks were found, fall back to old behavior (one blank per row using cost/correct)
              if (globalQ === before) {
                (q.rows || []).forEach((row) => {
                  const num = String(globalQ++);
                  if (!q.answers[num]) q.answers[num] = row?.correct ?? row?.cost ?? '';
                });
              }
            } else if (q.questionType === 'form-completion') {
              // form-completion counts blanks too
              const rows = Array.isArray(q.formRows) ? q.formRows : [];
              rows.forEach((r) => {
                if (r && r.isBlank) {
                  globalQ++;
                }
              });
            } else if (q.questionType === 'matching') {
              globalQ += (q.leftItems?.length || 1);
            } else if (q.questionType === 'notes-completion') {
              const notesText = q.notesText || '';
              const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
              globalQ += blanks.length || 1;
            } else if (q.questionType === 'multi-select') {
              globalQ += (q.requiredAnswers || 2);
            } else {
              globalQ += 1;
            }
          });
        });
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
          setMessage('❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.');
          setRequiresLogin(true);
          return;
        }
        throw new Error(data.message || "Lỗi khi cập nhật đề thi");
      }

      setMessage("✅ Cập nhật đề thi thành công!");
      try { localStorage.removeItem(`listeningTestDraftEdit-${id}`); } catch (e) { /* ignore */ }

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
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsUpdating(false);
      setIsReviewing(false);
    }
  };

  // Calculate total questions
  const totalQuestions = parts.reduce((total, part) => {
    return total + part.sections.reduce((sTotal, section) => {
      if (section.questionType === "matching") {
        return sTotal + (section.questions[0]?.leftItems?.length || 0);
      } else if (section.questionType === "form-completion") {
        return sTotal + (section.questions[0]?.formRows?.filter(r => r.isBlank)?.length || 0);
      }
      return sTotal + (section.questions?.length || 0);
    }, 0);
  }, 0);

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
        ⏳ Đang tải dữ liệu đề thi...
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
        <h2>❌ Lỗi</h2>
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
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, marginBottom: 12 }}>
          <strong>⚠️ Bạn cần đăng nhập lại để hoàn tất thao tác.</strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { localStorage.setItem('postLoginRedirect', window.location.pathname); window.location.href = '/login'; }}>Đăng nhập lại</button>
          </div>
        </div>
      )}

      <ListeningTestEditor
        // Page info
        pageTitle={`✏️ Sửa Đề Listening - ID: ${id}`}
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
      onManualSave={() => {}}
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
