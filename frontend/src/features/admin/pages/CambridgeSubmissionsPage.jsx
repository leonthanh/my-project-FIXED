import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { apiPath, authFetch, hostPath } from "../../../shared/utils/api";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
import SubmissionTypeTabs from "../components/SubmissionTypeTabs";
import {
  formatAttemptTimestamp,
  getAttemptTimingMeta,
} from "../utils/attemptTiming";

const CAMBRIDGE_SUBMISSION_TABS = [
  {
    key: 'all',
    shortLabel: 'All',
    label: 'All Submissions',
  },
  {
    key: 'listening',
    shortLabel: 'Listening',
    label: 'Listening Submissions',
  },
  {
    key: 'reading',
    shortLabel: 'Reading',
    label: 'Reading Submissions',
  },
];

const parseJsonIfString = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizePromptHtml = (rawPrompt = "") => {
  const prompt = String(rawPrompt || "").trim();
  if (!prompt) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return escapeHtml(prompt).replace(/\n/g, "<br />");
  }

  try {
    const doc = new DOMParser().parseFromString(prompt, "text/html");

    doc
      .querySelectorAll("script, style, iframe, object, embed, form, link, meta")
      .forEach((node) => node.remove());

    doc.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith("on")) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === "IMG") {
        const rawSrc = String(element.getAttribute("src") || "").trim();
        if (!rawSrc) {
          element.remove();
          return;
        }

        const normalizedSrc =
          /^https?:\/\//i.test(rawSrc) || /^data:/i.test(rawSrc) || /^blob:/i.test(rawSrc)
            ? rawSrc
            : hostPath(rawSrc);

        element.setAttribute("src", normalizedSrc);
        element.setAttribute("alt", element.getAttribute("alt") || "Prompt illustration");
        element.setAttribute("loading", "lazy");
        element.setAttribute(
          "style",
          "display:block;max-width:100%;height:auto;border-radius:10px;margin:10px 0;border:1px solid #e5e7eb;"
        );
      }

      if (element.tagName === "A") {
        const href = String(element.getAttribute("href") || "").trim();
        if (!href) {
          element.removeAttribute("href");
          return;
        }

        const safeHref = /^(https?:|mailto:|tel:|\/)/i.test(href) ? href : null;
        if (!safeHref) {
          element.removeAttribute("href");
          return;
        }

        element.setAttribute("href", safeHref.startsWith("/") ? hostPath(safeHref) : safeHref);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noreferrer noopener");
      }
    });

    doc.querySelectorAll("p").forEach((paragraph) => {
      const text = String(paragraph.textContent || "").replace(/\u00a0/g, " ").trim();
      const hasMedia = paragraph.querySelector("img, video, audio, iframe");
      if (!text && !hasMedia) {
        paragraph.remove();
        return;
      }
      paragraph.setAttribute("style", "margin:0 0 8px;line-height:1.6;");
    });

    const html = String(doc.body.innerHTML || "").trim();
    return html || escapeHtml(prompt).replace(/\n/g, "<br />");
  } catch {
    return escapeHtml(prompt).replace(/\n/g, "<br />");
  }
};

const InlineIcon = ({ name, size = 18, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      lineHeight: 0,
      flex: "0 0 auto",
      ...style,
    }}
    aria-hidden="true"
  >
    <LineIcon name={name} size={size} />
  </span>
);

/**
 * CambridgeSubmissionsPage - Trang giáo viên xem danh sách bài làm Cambridge
 * Hiển thị submissions từ tất cả Cambridge tests (Listening + Reading)
 */
const CambridgeSubmissionsPage = () => {
  const navigate = useNavigate();
  /* eslint-disable-next-line no-unused-vars */
  let teacher = null;
  try {
    teacher = JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    localStorage.removeItem("user");
    teacher = null;
  }

  // States
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extendingId, setExtendingId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    classCode: '',
    studentName: '',
    studentPhone: '',
    teacherName: '',
    reviewedBy: '',
  });
  const [activeTab, setActiveTab] = useState('all'); // all, listening, reading
  const [reviewStatus, setReviewStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [activeReviewSubmissionId, setActiveReviewSubmissionId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingById, setDetailLoadingById] = useState({});
  const [feedbackDraftById, setFeedbackDraftById] = useState({});
  const [aiLoadingById, setAiLoadingById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [statusMessageById, setStatusMessageById] = useState({});
  const feedbackInputRef = useRef(null);

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `cambridge/submissions?page=${pagination.page}&limit=${pagination.limit}&includeActive=1`;
        
        // Apply test type filter based on tab
        if (activeTab === 'listening') {
          url += '&testType=listening';
        } else if (activeTab === 'reading') {
          url += '&testType=reading';
        }
        
        if (filters.classCode) {
          url += `&classCode=${encodeURIComponent(filters.classCode)}`;
        }
        if (filters.studentName) {
          url += `&studentName=${encodeURIComponent(filters.studentName)}`;
        }
        if (filters.studentPhone) {
          url += `&studentPhone=${encodeURIComponent(filters.studentPhone)}`;
        }
        if (filters.teacherName) {
          url += `&teacherName=${encodeURIComponent(filters.teacherName)}`;
        }
        if (filters.reviewedBy) {
          url += `&feedbackBy=${encodeURIComponent(filters.reviewedBy)}`;
        }
        if (reviewStatus !== 'all') {
          url += `&reviewStatus=${encodeURIComponent(reviewStatus)}`;
        }
        if (sortOrder) {
          url += `&sortOrder=${encodeURIComponent(sortOrder)}`;
        }

        const res = await fetch(apiPath(url));
        if (!res.ok) throw new Error("Không thể tải danh sách bài nộp");

        const data = await res.json();
        setSubmissions(data.submissions || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [
    activeTab,
    filters.classCode,
    filters.reviewedBy,
    filters.studentName,
    filters.studentPhone,
    filters.teacherName,
    pagination.limit,
    pagination.page,
    reviewStatus,
    sortOrder,
  ]);

  useEffect(() => {
    setPagination((prev) =>
      prev.page === 1 ? prev : { ...prev, page: 1 }
    );
  }, [
    activeTab,
    filters.classCode,
    filters.reviewedBy,
    filters.studentName,
    filters.studentPhone,
    filters.teacherName,
    reviewStatus,
    sortOrder,
  ]);

  const resetFilters = () => {
    setFilters({
      classCode: '',
      studentName: '',
      studentPhone: '',
      teacherName: '',
      reviewedBy: '',
    });
    setReviewStatus('all');
    setSortOrder('newest');
  };

  const hasReview = (submission) =>
    Boolean(
      String(submission?.feedback || '').trim() ||
        String(submission?.feedbackBy || '').trim() ||
        String(submission?.status || '').toLowerCase() === 'reviewed'
    );

  const filteredSubmissions = submissions.filter((submission) => {
    const normalizedStudentName = String(submission?.studentName || '').toLowerCase();
    const normalizedPhone = String(submission?.studentPhone || '').toLowerCase();
    const normalizedClassCode = String(submission?.classCode || '').toLowerCase();
    const normalizedTeacher = String(submission?.teacherName || '').toLowerCase();
    const normalizedReviewedBy = String(submission?.feedbackBy || '').toLowerCase();

    if (filters.studentName && !normalizedStudentName.includes(filters.studentName.toLowerCase())) {
      return false;
    }

    if (filters.studentPhone && !normalizedPhone.includes(filters.studentPhone.toLowerCase())) {
      return false;
    }

    if (filters.classCode && !normalizedClassCode.includes(filters.classCode.toLowerCase())) {
      return false;
    }

    if (filters.teacherName && !normalizedTeacher.includes(filters.teacherName.toLowerCase())) {
      return false;
    }

    if (filters.reviewedBy && !normalizedReviewedBy.includes(filters.reviewedBy.toLowerCase())) {
      return false;
    }

    if (reviewStatus === 'pending' && hasReview(submission)) {
      return false;
    }

    if (reviewStatus === 'reviewed' && !hasReview(submission)) {
      return false;
    }

    return true;
  });

  const getPendingManualAnswers = (submissionDetail) => {
    const detailedResults = parseJsonIfString(submissionDetail?.detailedResults);
    if (!detailedResults || typeof detailedResults !== 'object' || Array.isArray(detailedResults)) {
      return [];
    }

    return Object.entries(detailedResults)
      .filter(([, result]) => result && typeof result === 'object' && result.isCorrect === null)
      .map(([key, result], index) => ({
        key,
        label: `Response ${index + 1}`,
        prompt:
          typeof result.questionText === 'string' ? result.questionText.trim() : '',
        userAnswer:
          typeof result.userAnswer === 'string'
            ? result.userAnswer.trim()
            : String(result.userAnswer || '').trim(),
        questionType:
          typeof result.questionType === 'string' ? result.questionType.trim() : '',
      }))
      .filter((item) => item.userAnswer.length > 0);
  };

  const getPendingManualCount = (submission) => {
    const count = Number(submission?.pendingManualCount);
    if (Number.isFinite(count) && count >= 0) {
      return count;
    }

    if (hasReview(submission)) {
      return 0;
    }

    const detail = submission?.id ? detailById[submission.id] : null;
    return detail ? getPendingManualAnswers(detail).length : 0;
  };

  const loadSubmissionDetail = async (submissionId) => {
    if (detailById[submissionId] || detailLoadingById[submissionId]) {
      return;
    }

    try {
      setDetailLoadingById((prev) => ({ ...prev, [submissionId]: true }));
      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`));
      if (!res.ok) {
        throw new Error('Could not load submission details.');
      }

      const detail = await res.json();
      setDetailById((prev) => ({ ...prev, [submissionId]: detail }));
      setFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]:
          typeof detail?.feedback === 'string' ? detail.feedback : prev[submissionId] || '',
      }));
    } catch (err) {
      console.error('Failed to load Cambridge submission detail:', err);
      setStatusMessageById((prev) => ({
        ...prev,
        [submissionId]: err.message || 'Could not load submission details.',
      }));
    } finally {
      setDetailLoadingById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const openEssayReview = async (submission) => {
    setActiveReviewSubmissionId(submission.id);
    await loadSubmissionDetail(submission.id);
  };

  const closeEssayReview = () => {
    setActiveReviewSubmissionId(null);
  };

  useEffect(() => {
    if (!activeReviewSubmissionId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveReviewSubmissionId(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeReviewSubmissionId]);

  useEffect(() => {
    if (!activeReviewSubmissionId) {
      return undefined;
    }

    if (detailLoadingById[activeReviewSubmissionId]) {
      return undefined;
    }

    const detail = detailById[activeReviewSubmissionId];
    if (!detail || !getPendingManualAnswers(detail).length) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      feedbackInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeReviewSubmissionId, detailById, detailLoadingById]);

  const handleGenerateEssayFeedback = async (submission) => {
    const detail = detailById[submission.id];
    const pendingAnswers = getPendingManualAnswers(detail);
    if (!pendingAnswers.length) {
      alert('No open-ended responses were found for AI feedback.');
      return;
    }

    try {
      setAiLoadingById((prev) => ({ ...prev, [submission.id]: true }));
      setStatusMessageById((prev) => ({ ...prev, [submission.id]: '' }));

      const res = await fetch(apiPath('ai/generate-cambridge-feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: submission.studentName || 'N/A',
          testType: submission.testType || 'Orange',
          classCode: submission.classCode || '',
          responses: pendingAnswers.map((item) => ({
            label: item.label,
            prompt: item.prompt,
            answer: item.userAnswer,
            questionType: item.questionType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'AI could not generate Orange feedback.');
      }

      if (!data?.suggestion) {
        throw new Error('AI returned an empty Orange feedback result.');
      }

      setFeedbackDraftById((prev) => ({
        ...prev,
        [submission.id]: data.suggestion,
      }));
      setStatusMessageById((prev) => ({
        ...prev,
        [submission.id]: data.warning
          ? data.warning
          : data.cached
          ? 'Loaded cached AI feedback.'
          : 'AI feedback generated.',
      }));
    } catch (err) {
      console.error('Failed to generate Cambridge AI feedback:', err);
      setStatusMessageById((prev) => ({
        ...prev,
        [submission.id]: err.message || 'AI feedback failed.',
      }));
      alert(err.message || 'AI feedback failed.');
    } finally {
      setAiLoadingById((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleSaveEssayFeedback = async (submissionId) => {
    const feedback = String(feedbackDraftById[submissionId] || '').trim();
    if (!feedback) return;

    const reviewerName =
      teacher?.name || teacher?.username || teacher?.fullName || 'Teacher';

    try {
      setSavingById((prev) => ({ ...prev, [submissionId]: true }));
      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          feedbackBy: reviewerName,
          status: 'reviewed',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Could not save feedback.');
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                feedback,
                feedbackBy: reviewerName,
                status: 'reviewed',
                feedbackAt: new Date().toISOString(),
                pendingManualCount: 0,
              }
            : item
        )
      );
      setActiveReviewSubmissionId(null);
      setStatusMessageById((prev) => ({
        ...prev,
        [submissionId]: 'Feedback saved.',
      }));
    } catch (err) {
      console.error('Failed to save Cambridge feedback:', err);
      setStatusMessageById((prev) => ({
        ...prev,
        [submissionId]: err.message || 'Could not save feedback.',
      }));
      alert(err.message || 'Could not save feedback.');
    } finally {
      setSavingById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get score color
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  // Get test type badge
  const getTestTypeBadge = (testType) => {
    const isListening = testType?.includes('listening');
    const level = testType?.split('-')[0]?.toUpperCase() || 'KET';
    
    return {
      iconName: isListening ? 'listening' : 'reading',
      label: `${level} ${isListening ? 'Listening' : 'Reading'}`,
      color: isListening ? '#3b82f6' : '#8b5cf6',
      bgColor: isListening ? '#dbeafe' : '#ede9fe'
    };
  };

  // View submission detail
  const handleViewDetail = (submissionId) => {
    navigate(`/cambridge/result/${submissionId}`);
  };

  const handleExtendTime = async (sub, extraMinutes) => {
    setExtendingId(sub.id);
    try {
      const res = await authFetch(apiPath(`cambridge/submissions/${sub.id}/extend-time`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMinutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gia hạn thất bại");
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === sub.id
            ? {
                ...item,
                finished: false,
                expiresAt: data?.expiresAt || item.expiresAt,
                lastSavedAt: new Date().toISOString(),
              }
            : item
        )
      );
      alert(data?.message || "Đã gia hạn thời gian.");
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const activeReviewSubmission = activeReviewSubmissionId
    ? submissions.find((item) => item.id === activeReviewSubmissionId) || null
    : null;

  const renderEssayReviewContent = (submission) => {
    const detail = detailById[submission.id];
    const isLoadingDetail = !!detailLoadingById[submission.id];
    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];

    return (
      <div style={styles.drawerContent}>
        {isLoadingDetail && <div>Loading submission details...</div>}

        {!isLoadingDetail && detail && (
          <div style={styles.drawerGrid}>
            <div style={styles.drawerSection}>
              <div style={styles.drawerSectionTitle}>Open-ended responses to review</div>

              {pendingAnswers.length === 0 ? (
                <div style={styles.drawerHint}>
                  No pending open-ended responses were found in this submission. You can still
                  open the full result to inspect it manually.
                </div>
              ) : (
                <div style={styles.answerList}>
                  {pendingAnswers.map((item, index) => (
                    <div key={item.key} style={styles.answerCard}>
                      <div style={styles.answerCardTitle}>
                        {item.label || `Response ${index + 1}`}
                      </div>
                      {item.prompt && (
                        <div style={styles.answerPromptWrap}>
                          <div style={styles.answerPromptLabel}>Prompt</div>
                          <div
                            style={styles.answerPromptHtml}
                            dangerouslySetInnerHTML={{
                              __html: sanitizePromptHtml(item.prompt),
                            }}
                          />
                        </div>
                      )}
                      <div style={styles.answerBody}>{item.userAnswer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.drawerSection}>
              <div style={styles.drawerSectionTitle}>Teacher Feedback</div>
              <textarea
                ref={submission.id === activeReviewSubmissionId ? feedbackInputRef : null}
                rows={4}
                value={feedbackDraftById[submission.id] || ''}
                onChange={(e) =>
                  setFeedbackDraftById((prev) => ({
                    ...prev,
                    [submission.id]: e.target.value,
                  }))
                }
                placeholder="Enter feedback..."
                style={styles.feedbackTextarea}
              />

              <div style={styles.feedbackActions}>
                <button
                  onClick={() => handleGenerateEssayFeedback(submission)}
                  style={styles.secondaryActionButton}
                  disabled={
                    !pendingAnswers.length ||
                    aiLoadingById[submission.id] ||
                    savingById[submission.id]
                  }
                >
                  {aiLoadingById[submission.id] ? 'Generating...' : 'AI Feedback'}
                </button>
                <button
                  onClick={() => handleSaveEssayFeedback(submission.id)}
                  style={styles.saveActionButton}
                  disabled={
                    !(feedbackDraftById[submission.id] || '').trim() ||
                    savingById[submission.id] ||
                    aiLoadingById[submission.id]
                  }
                >
                  {savingById[submission.id] ? 'Saving...' : 'Save Feedback'}
                </button>
                <button
                  onClick={() => handleViewDetail(submission.id)}
                  style={styles.ghostActionButton}
                >
                  Open Full Result
                </button>
              </div>

              <div style={styles.drawerHint}>
                Saving will move this submission to the reviewed state.
              </div>

              {statusMessageById[submission.id] && (
                <div style={styles.statusMessage}>{statusMessageById[submission.id]}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <AdminNavbar />

      <div style={styles.content} className="admin-page cambridge-page">
        <SubmissionTypeTabs
          title="Submissions Orange"
          items={CAMBRIDGE_SUBMISSION_TABS}
          activeKey={activeTab}
          onSelect={setActiveTab}
        />

        <SubmissionFilterPanel
          fields={[
            {
              key: 'studentName',
              label: 'Student Name',
              placeholder: 'Student name',
              value: filters.studentName,
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, studentName: value })),
            },
            {
              key: 'studentPhone',
              label: 'Phone',
              placeholder: 'Phone number',
              value: filters.studentPhone,
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, studentPhone: value })),
            },
            {
              key: 'classCode',
              label: 'Class Code',
              placeholder: 'e.g. 148-IX-3A-S1',
              value: filters.classCode,
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, classCode: value })),
            },
            {
              key: 'teacherName',
              label: 'Test Teacher',
              placeholder: 'Teacher name',
              value: filters.teacherName,
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, teacherName: value })),
            },
            {
              key: 'reviewedBy',
              label: 'Reviewed By',
              placeholder: 'Reviewer name',
              value: filters.reviewedBy,
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, reviewedBy: value })),
            },
          ]}
          sortValue={sortOrder}
          onSortChange={setSortOrder}
          statusValue={reviewStatus}
          onStatusChange={setReviewStatus}
          onReset={resetFilters}
          filteredCount={filteredSubmissions.length}
          totalCount={pagination.total}
          summaryLabel="submissions"
        />

        {/* Loading */}
        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorContainer}>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <InlineIcon name="error" size={16} />
              <span>{error}</span>
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={styles.retryButton}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Submissions Table */}
        {!loading && !error && (
          <>
            <div style={styles.tableContainer} className="admin-table-wrap">
              <table style={styles.table} className="admin-table">
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Loại bài</th>
                    <th style={styles.th}>Tên đề</th>
                    <th style={styles.th}>Học sinh</th>
                    <th style={styles.th}>Lớp</th>
                    <th style={styles.th}>Điểm</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Thời gian</th>
                    <th style={styles.th}>Ngày nộp</th>
                    <th style={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={styles.emptyCell}>
                        Không có bài nộp nào
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, index) => {
                      const typeBadge = getTestTypeBadge(sub.testType);
                      const timingMeta = sub.finished === false ? getAttemptTimingMeta(sub.expiresAt) : null;
                      const pendingManualCount = getPendingManualCount(sub);
                      const canReviewEssay =
                        String(sub.testType || '').toLowerCase().includes('reading') &&
                        sub.finished !== false &&
                        pendingManualCount > 0;
                      const isReviewing = activeReviewSubmissionId === sub.id;
                      return (
                        <React.Fragment key={sub.id}>
                          <tr style={styles.tr}>
                            <td style={styles.td}>
                              {(pagination.page - 1) * pagination.limit + index + 1}
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.badge,
                                backgroundColor: typeBadge.bgColor,
                                color: typeBadge.color
                              }}>
                                <InlineIcon name={typeBadge.iconName} size={15} />
                                {typeBadge.label}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.testTitleWrap}>
                                <span style={styles.testTitle}>{sub.testTitle || '--'}</span>
                                <span style={styles.testMeta}>{sub.teacherName || '--'}</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.studentInfo}>
                                <span style={styles.studentName}>{sub.studentName}</span>
                                {sub.studentPhone && (
                                  <span style={styles.studentPhone}>{sub.studentPhone}</span>
                                )}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.classCode}>{sub.classCode || '--'}</span>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.scoreContainer}>
                                {sub.finished === false ? (
                                  <>
                                    <span style={{ ...styles.score, color: "#1d4ed8" }}>
                                      Đang làm
                                    </span>
                                    <span style={{
                                      ...styles.percentage,
                                      backgroundColor: "#dbeafe",
                                      color: timingMeta?.color || "#1d4ed8"
                                    }}>
                                      {timingMeta?.label || "Chưa nộp"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span style={{
                                      ...styles.score,
                                      color: getScoreColor(sub.percentage)
                                    }}>
                                      {sub.score}/{sub.totalQuestions}
                                    </span>
                                    <span style={{
                                      ...styles.percentage,
                                      backgroundColor: getScoreColor(sub.percentage) + '20',
                                      color: getScoreColor(sub.percentage)
                                    }}>
                                      {sub.percentage}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.statusCell}>
                                <span
                                  style={{
                                    ...styles.statusBadge,
                                    ...(sub.status === 'reviewed' || sub.feedbackBy
                                      ? styles.statusBadgeReviewed
                                      : styles.statusBadgePending),
                                  }}
                                >
                                  {sub.finished === false
                                    ? 'Active'
                                    : sub.status === 'reviewed' || sub.feedbackBy
                                    ? 'Reviewed'
                                    : 'Pending'}
                                </span>
                                <span style={styles.statusMeta}>{sub.feedbackBy || '--'}</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.timeSpent}>
                                {sub.finished === false ? "--:--" : formatTime(sub.timeSpent)}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {sub.finished === false ? (
                                <div>
                                  <div style={{ ...styles.date, fontWeight: 700, color: "#1d4ed8" }}>Đang làm</div>
                                  <div style={{ ...styles.date, color: timingMeta?.color || "#64748b", fontSize: 12 }}>
                                    {timingMeta?.label || "Chưa có deadline"}
                                  </div>
                                  <div style={{ ...styles.date, fontSize: 11 }}>
                                    Lưu: {formatAttemptTimestamp(sub.lastSavedAt || sub.createdAt)}
                                  </div>
                                </div>
                              ) : (
                                <span style={styles.date}>
                                  {formatDate(sub.submittedAt)}
                                </span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {canReviewEssay && (
                                  <button
                                    onClick={() => openEssayReview(sub)}
                                    style={{
                                      ...styles.reviewEssayButton,
                                      ...(isReviewing ? styles.reviewEssayButtonActive : null),
                                    }}
                                  >
                                    <span>{detailLoadingById[sub.id] && isReviewing ? 'Loading...' : 'Review Essay'}</span>
                                    <span style={styles.reviewEssayBadge}>{pendingManualCount}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleViewDetail(sub.id)}
                                  style={styles.viewButton}
                                  className="admin-view-button"
                                >
                                  <span className="admin-view-button__icon"><InlineIcon name="eye" size={15} /></span>
                                  <span className="admin-view-button__label">Xem</span>
                                </button>
                                {sub.finished === false && (
                                  <AttemptExtensionControls
                                    isLoading={extendingId === sub.id}
                                    onExtend={(minutes) => handleExtendTime(sub, minutes)}
                                    buttonStyle={{
                                      ...styles.viewButton,
                                      background: "#0284c7",
                                    }}
                                    submitButtonStyle={{
                                      ...styles.viewButton,
                                      background: "#0369a1",
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={{
                    ...styles.pageButton,
                    ...(pagination.page === 1 && styles.pageButtonDisabled)
                  }}
                >
                  <InlineIcon name="chevron-left" size={16} />
                  <span>Trước</span>
                </button>
                <span style={styles.pageInfo}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{
                    ...styles.pageButton,
                    ...(pagination.page === pagination.totalPages && styles.pageButtonDisabled)
                  }}
                >
                  <span>Sau</span>
                  <InlineIcon name="chevron-right" size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {activeReviewSubmission && (
          <div style={styles.drawerOverlay} onClick={closeEssayReview}>
            <aside style={styles.drawerPanel} onClick={(event) => event.stopPropagation()}>
              <div style={styles.drawerHeader}>
                <div>
                  <div style={styles.drawerEyebrow}>Orange Essay Review</div>
                  <h2 style={styles.drawerTitle}>{activeReviewSubmission.testTitle || 'Reading Submission'}</h2>
                  <div style={styles.drawerMetaRow}>
                    <span style={styles.drawerMetaChip}>{activeReviewSubmission.studentName || '--'}</span>
                    {activeReviewSubmission.classCode && (
                      <span style={styles.drawerMetaChip}>{activeReviewSubmission.classCode}</span>
                    )}
                    <span style={styles.drawerMetaChipAccent}>
                      {getPendingManualCount(activeReviewSubmission)} pending
                    </span>
                  </div>
                </div>

                <button onClick={closeEssayReview} style={styles.drawerCloseButton} aria-label="Close review drawer">
                  <InlineIcon name="close" size={18} />
                </button>
              </div>

              <div style={styles.drawerBody}>
                {renderEssayReviewContent(activeReviewSubmission)}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '24px',
    width: '100%',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: '15px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
    width: '100%',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#0e276f',
    color: 'white',
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
  },
  filterInput: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '180px',
  },
  filterStats: {
    marginLeft: 'auto',
    color: '#64748b',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#ef4444',
  },
  retryButton: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  tableContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  testTitle: {
    fontWeight: 500,
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
  testTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  studentName: {
    fontWeight: 500,
  },
  studentPhone: {
    fontSize: '12px',
    color: '#64748b',
  },
  classCode: {
    padding: '4px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  score: {
    fontWeight: 700,
    fontSize: '15px',
  },
  percentage: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  statusBadgeReviewed: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  timeSpent: {
    color: '#64748b',
    fontSize: '13px',
  },
  date: {
    fontSize: '13px',
    color: '#64748b',
  },
  viewButton: {
    padding: '8px 14px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  reviewEssayButton: {
    padding: '8px 12px',
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fdba74',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'grid',
    alignItems: 'center',
    gap: '8px',
  },
  reviewEssayButtonActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fb923c',
    color: '#9a3412',
  },
  reviewEssayBadge: {
    minWidth: '22px',
    height: '22px',
    padding: '0 6px',
    borderRadius: '999px',
    backgroundColor: '#ea580c',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
  },
  drawerOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    backdropFilter: 'blur(3px)',
    zIndex: 1200,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawerPanel: {
    width: 'min(680px, 100vw)',
    height: '100vh',
    backgroundColor: '#ffffff',
    boxShadow: '-24px 0 48px rgba(15, 23, 42, 0.18)',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    padding: '24px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '16px',
    alignItems: 'start',
  },
  drawerEyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9a3412',
  },
  drawerTitle: {
    margin: '6px 0 0',
    fontSize: '22px',
    lineHeight: 1.3,
    color: '#0f172a',
  },
  drawerMetaRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '14px',
  },
  drawerMetaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: '#f1f5f9',
    color: '#334155',
  },
  drawerMetaChipAccent: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: '#fff7ed',
    color: '#c2410c',
  },
  drawerCloseButton: {
    width: '40px',
    height: '40px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '24px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '22px 24px 28px',
  },
  drawerContent: {
    display: 'grid',
    gap: '18px',
  },
  drawerGrid: {
    display: 'grid',
    gap: '18px',
  },
  drawerSection: {
    display: 'grid',
    gap: '12px',
  },
  drawerSectionTitle: {
    fontWeight: 700,
    color: '#111827',
  },
  drawerHint: {
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  answerList: {
    display: 'grid',
    gap: '10px',
  },
  answerCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    background: '#fff',
    padding: '12px 14px',
  },
  answerCardTitle: {
    fontWeight: 700,
    color: '#111827',
  },
  answerPromptWrap: {
    marginTop: '6px',
    marginBottom: '8px',
  },
  answerPromptLabel: {
    marginBottom: '6px',
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  answerPromptHtml: {
    color: '#4b5563',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  answerBody: {
    whiteSpace: 'pre-wrap',
    color: '#111827',
  },
  feedbackTextarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '120px',
  },
  feedbackActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  secondaryActionButton: {
    padding: '8px 14px',
    backgroundColor: '#fff',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  saveActionButton: {
    padding: '8px 14px',
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
  },
  ghostActionButton: {
    padding: '8px 14px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
  },
  statusMessage: {
    color: '#1d4ed8',
    fontSize: '13px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
    padding: '16px',
  },
  pageButton: {
    padding: '10px 20px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  pageButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
};

export default CambridgeSubmissionsPage;


