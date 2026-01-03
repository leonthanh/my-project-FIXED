import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListeningTestEditor } from "../components";
import { useListeningHandlers, createNewPart } from "../hooks";
import { apiPath } from "../../../shared/utils/api";

/**
 * EditListeningTest - Trang sửa đề Listening IELTS
 * Load dữ liệu từ API và cho phép chỉnh sửa
 */
const EditListeningTest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");

  // Global audio
  const [globalAudioFile, setGlobalAudioFile] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
        setExistingAudioUrl(data.mainAudioUrl);
        
        // Reconstruct parts from partInstructions and questions
        const reconstructedParts = reconstructParts(partInstructions, questions, partAudioUrls);
        console.log("Reconstructed parts:", reconstructedParts);
        setParts(reconstructedParts);
        
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
          leftItems: q.leftItems || [],
          rightItems: q.rightItems || [],
          items: q.items || [],
          wordLimit: q.wordLimit || null,
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
    try {
      setIsUpdating(true);

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

      // Build FormData
      const formData = new FormData();
      formData.append("title", stripHtml(title));
      formData.append("classCode", classCode);
      formData.append("teacherName", teacherName);
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

      const response = await fetch(apiPath(`listening-tests/${id}`), {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Lỗi khi cập nhật đề thi");
      }

      setMessage("✅ Cập nhật đề thi thành công!");

      setTimeout(() => {
        navigate("/select-test");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
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
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      // Global audio
      globalAudioFile={globalAudioFile}
      setGlobalAudioFile={setGlobalAudioFile}
      existingAudioUrl={existingAudioUrl}
      // Total questions
      totalQuestions={totalQuestions}
    />
  );
};

export default EditListeningTest;
