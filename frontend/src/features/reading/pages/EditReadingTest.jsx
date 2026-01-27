import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReadingTestEditor } from "../components";
import { usePassageHandlers } from "../hooks";
import { stripHtml, cleanupPassageHTML } from "../utils";
import { normalizeQuestionType } from "../utils/questionHelpers";
import { AdminNavbar } from "../../../shared/components";

/**
 * EditReadingTest - Trang sửa đề Reading IELTS
 * Sử dụng ReadingTestEditor component và usePassageHandlers hook
 */
import { apiPath, authFetch } from "../../../shared/utils/api";

import { canManageCategory } from '../../../shared/utils/permissions';

const EditReadingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const user = JSON.parse(localStorage.getItem('user'));
  const allowedToManage = canManageCategory(user, 'reading');

  // Form fields
  const [title, setTitle] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [showResultModal, setShowResultModal] = useState(true);

  // Loading & Error state
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Review & Submit state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  // Track if re-login is required (used to show banner and save draft)
  const [requiresLogin, setRequiresLogin] = useState(false);

  // Use passage handlers hook
  const {
    passages,
    setPassages,
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
  } = usePassageHandlers([]);

  // Fetch existing test
  useEffect(() => {
    if (hasLoaded) return;

    const fetchTest = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(apiPath(`reading-tests/${testId}`), {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Không tìm thấy đề thi`);
        }

        const data = await response.json();

        setTitle(data.title || "");
        setClassCode(data.classCode || "");
        setTeacherName(data.teacherName || "");
        setShowResultModal(data.showResultModal ?? true);
        setPassages(
          Array.isArray(data.passages)
            ? data.passages
            : data.passages
            ? [data.passages]
            : []
        );
        setLoading(false);
        setHasLoaded(true);
      } catch (err) {
        console.error("❌ Error:", err);
        setError(err.message);
        setLoading(false);
        setHasLoaded(true);
      }
    };

    if (testId && !hasLoaded) {
      fetchTest();
    } else if (!testId) {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [testId, hasLoaded, setPassages]);

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>⚠️ Bạn không có quyền sửa đề Reading</h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

  // Handle review
  const handleReview = (e) => {
    if (e) e.preventDefault();

    // Validate title
    if (!title || !title.trim()) {
      setMessage("⚠️ Vui lòng nhập tiêu đề đề thi");
      return;
    }

    // Validate passages
    if (!passages || passages.length === 0) {
      setMessage("⚠️ Cần có ít nhất 1 passage");
      return;
    }

    // Validate each passage has sections and questions
    for (let i = 0; i < passages.length; i++) {
      if (!passages[i].sections || passages[i].sections.length === 0) {
        setMessage(`⚠️ Passage ${i + 1} phải có ít nhất 1 section`);
        return;
      }

      for (let j = 0; j < passages[i].sections.length; j++) {
        if (
          !passages[i].sections[j].questions ||
          passages[i].sections[j].questions.length === 0
        ) {
          setMessage(
            `⚠️ Passage ${i + 1}, Section ${j + 1} phải có ít nhất 1 câu hỏi`
          );
          return;
        }
      }
    }

    setIsReviewing(true);
  };

  const saveToLocalStorage = () => {
    try {
      const dataToSave = {
        title,
        passages,
        classCode,
        teacherName,
        showResultModal,
      };
      localStorage.setItem("readingTestDraft", JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  };

  // Handle confirm update
  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);

      // Validate data
      const cleanTitle = stripHtml(title).trim();
      const cleanClassCode = stripHtml(classCode).trim();
      const cleanTeacherName = stripHtml(teacherName).trim();

      if (!cleanTitle) {
        throw new Error("Tiêu đề không được để trống");
      }

      if (!passages || passages.length === 0) {
        throw new Error("Cần có ít nhất 1 passage");
      }

      // Clean passages data
      const cleanedPassages = await Promise.all(
        passages.map(async (p, pIdx) => {
          if (!p.passageText || !p.passageText.trim()) {
            throw new Error(`Passage ${pIdx + 1} không có nội dung`);
          }

          return {
            passageTitle:
              stripHtml(p.passageTitle || "") || `Passage ${pIdx + 1}`,
            passageText: cleanupPassageHTML(p.passageText || ""),
            sections: await Promise.all(
              p.sections?.map(async (section, sIdx) => {
                if (!section.questions || section.questions.length === 0) {
                  throw new Error(
                    `Passage ${pIdx + 1}, Section ${
                      sIdx + 1
                    } phải có ít nhất 1 câu hỏi`
                  );
                }

                const imagesToSend =
                  typeof section.sectionImage === "string"
                    ? section.sectionImage
                    : null;

                return {
                  sectionTitle:
                    stripHtml(section.sectionTitle || "") ||
                    `Section ${sIdx + 1}`,
                  // Preserve HTML formatting for instructions and sanitize empty tags
                  sectionInstruction: cleanupPassageHTML(
                    section.sectionInstruction || ""
                  ),
                  sectionImage: imagesToSend,
                  questions:
                    section.questions?.map((q) => {
                      const qType = normalizeQuestionType(q.questionType || q.type || "");
                      const questionObj = {
                        ...q,
                        questionType: qType,
                        questionText: q.questionText || "",
                        options: q.options
                          ? q.options.map((opt) => opt)
                          : undefined,
                      };
                      // Preserve requiredAnswers for multi-select questions
                      if (qType === "multi-select" && (q.requiredAnswers || q.maxSelection)) {
                        questionObj.requiredAnswers = q.requiredAnswers || q.maxSelection || 2;
                      }
                      return questionObj;
                    }) || [],
                };
              }) || []
            ),
          };
        })
      );

      const response = await authFetch(apiPath(`reading-tests/${testId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title: cleanTitle,
          classCode: cleanClassCode,
          teacherName: cleanTeacherName,
          showResultModal,
          passages: cleanedPassages,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          // Save draft before prompting user to log in again
          try { saveToLocalStorage(); } catch (e) { /* ignore */ }
          setMessage('❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.');
          setRequiresLogin(true);
          return;
        }

        if (response.status === 403) {
          setMessage('❌ Bạn không có quyền cập nhật đề thi.');
          return;
        }

        throw new Error(data.message || "Lỗi khi cập nhật");
      }

      setMessage("✅ Đã cập nhật đề thành công!");
      localStorage.removeItem("readingTestDraft");
      setTimeout(() => {
        navigate("/select-test");
      }, 1500);
    } catch (err) {
      console.error("❌ Error in handleConfirmUpdate:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setIsUpdating(false);
      setIsReviewing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div
          style={{ maxWidth: "1000px", margin: "20px auto", padding: "0 20px" }}
        >
          <p>⏳ Đang tải dữ liệu...</p>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <AdminNavbar />
        <div
          style={{ maxWidth: "1000px", margin: "20px auto", padding: "0 20px" }}
        >
          <div
            style={{
              padding: "15px",
              backgroundColor: "#ffe6e6",
              color: "red",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            ❌ {error}
          </div>
          <button
            onClick={() => navigate("/reading-tests")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0e276f",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Quay lại
          </button>
        </div>
      </>
    );
  }

  // No data state
  if (!passages || passages.length === 0) {
    return (
      <>
        <AdminNavbar />
        <div
          style={{ maxWidth: "1000px", margin: "20px auto", padding: "0 20px" }}
        >
          <p style={{ color: "red" }}>
            ❌ Không có dữ liệu để sửa. Vui lòng quay lại.
          </p>
          <button
            onClick={() => navigate("/reading-tests")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0e276f",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Quay lại
          </button>
        </div>
      </>
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

      <ReadingTestEditor
        // Page info
        pageTitle="✏️ Sửa Đề Reading IELTS"
        className="edit-reading-test"
        // Form fields
        title={title}
        setTitle={setTitle}
        classCode={classCode}
        setClassCode={setClassCode}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        showResultModal={showResultModal}
        setShowResultModal={setShowResultModal}
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
        onConfirmSubmit={handleConfirmUpdate}
        isSubmitting={isUpdating}
        submitButtonText="Cập nhật"
        testId={testId}
        // Messages
        message={message}
      />
    </div>
  );
};

export default EditReadingTest;
