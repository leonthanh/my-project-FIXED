import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { apiPath, authFetch, hostPath } from "../../../shared/utils/api";
import {
  buildCambridgeResponseFeedbackEntries,
  buildCambridgeResponseFeedbackDraftMap,
  countMissingCambridgeResponseFeedback,
  getCambridgeResponseFeedbackText,
  hasResolvedSubmissionFeedback,
  upsertCambridgeResponseFeedback,
} from "../../../shared/utils/cambridgeFeedback";
import AttemptExtensionControls from "../components/AttemptExtensionControls";
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from "../components/AdminStickySidebarLayout";
import {
  ExpandableSubmissionList,
  SubmissionStatCards,
  getSubmissionTone,
} from "../components/SubmissionCardList";
import AdminConfirmModal from "../components/AdminConfirmModal";
import SubmissionFilterPanel from "../components/SubmissionFilterPanel";
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

const omitRecordKey = (record, key) => {
  const next = { ...record };
  const keys = Array.isArray(key) ? key : [key];
  keys.forEach((entryKey) => {
    delete next[entryKey];
  });
  return next;
};

const omitResponseStateKeys = (record, submissionIds) => {
  const keys = new Set((Array.isArray(submissionIds) ? submissionIds : [submissionIds]).map(String));
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => {
      const submissionId = String(entryKey || '').split(':')[0];
      return !keys.has(submissionId);
    })
  );
};

const stopSelectionEvent = (event) => {
  event.stopPropagation();
};

/**
 * CambridgeSubmissionsPage - Trang giáo viên xem danh sách bài làm Cambridge
 * Hiển thị submissions từ tất cả Cambridge tests (Listening + Reading)
 */
const CambridgeSubmissionsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
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
  const [deepLinkedSubmission, setDeepLinkedSubmission] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [detailById, setDetailById] = useState({});
  const [detailLoadingById, setDetailLoadingById] = useState({});
  const [feedbackDraftById, setFeedbackDraftById] = useState({});
  const [aiLoadingById, setAiLoadingById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [statusMessageById, setStatusMessageById] = useState({});
  const [responseStatusByKey, setResponseStatusByKey] = useState({});
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const feedbackInputRef = useRef(null);
  const deepLinkHandledRef = useRef('');
  const canDeleteSubmissions = teacher?.role === 'admin';

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
        if (!res.ok) throw new Error("Could not load submissions.");

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
    refreshTick,
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

  const clearDeepLinkParams = () => {
    if (!searchParams.get('submissionId') && !searchParams.get('action')) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('submissionId');
    nextParams.delete('action');
    setSearchParams(nextParams, { replace: true });
  };

  const hasReview = (submission) =>
    hasResolvedSubmissionFeedback(submission);

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

  const visiblePendingCount = filteredSubmissions.filter(
    (submission) => !hasReview(submission)
  ).length;
  const visibleReviewedCount = filteredSubmissions.filter((submission) =>
    hasReview(submission)
  ).length;
  const filteredSubmissionIds = filteredSubmissions.map((submission) => submission.id);
  const selectedVisibleIds = filteredSubmissionIds.filter((submissionId) =>
    selectedSubmissionIds.has(submissionId)
  );
  const allVisibleSelected =
    filteredSubmissionIds.length > 0 &&
    filteredSubmissionIds.every((submissionId) => selectedSubmissionIds.has(submissionId));

  useEffect(() => {
    setSelectedSubmissionIds((prev) => {
      const visibleIds = new Set(filteredSubmissionIds);
      const next = new Set([...prev].filter((submissionId) => visibleIds.has(submissionId)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSubmissionIds]);

  const toggleExpand = (submissionId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });
  };

  const toggleSelection = (submissionId) => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) next.delete(submissionId);
      else next.add(submissionId);
      return next;
    });
  };

  const toggleAllVisibleSelections = () => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredSubmissionIds.forEach((submissionId) => next.delete(submissionId));
      } else {
        filteredSubmissionIds.forEach((submissionId) => next.add(submissionId));
      }
      return next;
    });
  };

  const openDeleteConfirmation = (submission) => {
    if (!canDeleteSubmissions || deletingId === submission.id || bulkDeleting) {
      return;
    }
    setDeleteConfirm({ mode: 'single', submission });
  };

  const openBulkDeleteConfirmation = () => {
    if (!canDeleteSubmissions || bulkDeleting || selectedVisibleIds.length === 0) {
      return;
    }
    setDeleteConfirm({ mode: 'bulk', ids: [...selectedVisibleIds] });
  };

  const closeDeleteConfirmation = () => {
    if (bulkDeleting || (deleteConfirm?.mode === 'single' && deletingId === deleteConfirm?.submission?.id)) {
      return;
    }
    setDeleteConfirm(null);
  };

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

  const getFeedbackStateKey = (submissionId, responseKey) =>
    `${submissionId}:${responseKey}`;

  const getPendingManualCount = (submission) => {
    const count = Number(submission?.pendingManualCount);
    if (Number.isFinite(count) && count >= 0) {
      return count;
    }

    const detail = submission?.id ? detailById[submission.id] : null;
    return detail
      ? countMissingCambridgeResponseFeedback(
          getPendingManualAnswers(detail),
          detail?.responseFeedback || submission?.responseFeedback
        )
      : 0;
  };

  const loadSubmissionDetail = async (submissionId) => {
    if (detailById[submissionId]) {
      return detailById[submissionId];
    }

    if (detailLoadingById[submissionId]) {
      return null;
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
        [submissionId]: prev[submissionId] || buildCambridgeResponseFeedbackDraftMap(detail?.responseFeedback),
      }));
      return detail;
    } catch (err) {
      console.error('Failed to load Cambridge submission detail:', err);
      setStatusMessageById((prev) => ({
        ...prev,
        [submissionId]: err.message || 'Could not load submission details.',
      }));
      return null;
    } finally {
      setDetailLoadingById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const openEssayReview = async (submission) => {
    setDeepLinkedSubmission(null);
    setActiveReviewSubmissionId(submission.id);
    await loadSubmissionDetail(submission.id);
  };

  const closeEssayReview = () => {
    setActiveReviewSubmissionId(null);
    setDeepLinkedSubmission(null);
    clearDeepLinkParams();
  };

  useEffect(() => {
    if (!searchParams.get('submissionId')) {
      deepLinkHandledRef.current = '';
      setDeepLinkedSubmission(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const submissionId = searchParams.get('submissionId');
    const action = searchParams.get('action');

    if (!submissionId || (action && action !== 'review')) {
      return;
    }

    const deepLinkKey = `${action || 'review'}:${submissionId}`;
    if (deepLinkHandledRef.current === deepLinkKey) {
      return;
    }

    deepLinkHandledRef.current = deepLinkKey;

    const openDeepLinkedSubmission = async () => {
      const matchedSubmission = submissions.find(
        (submission) => String(submission.id) === String(submissionId)
      );

      if (matchedSubmission) {
        setDeepLinkedSubmission(null);
        await openEssayReview(matchedSubmission);
        return;
      }

      const detail = await loadSubmissionDetail(submissionId);
      if (!detail) {
        clearDeepLinkParams();
        return;
      }

      setDeepLinkedSubmission(detail);
      setActiveReviewSubmissionId(detail.id);
    };

    openDeepLinkedSubmission();
  }, [searchParams, submissions]);

  useEffect(() => {
    if (!activeReviewSubmissionId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeEssayReview();
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
    if (
      !activeReviewSubmissionId ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      document
        .getElementById(`cambridge-submission-row-${activeReviewSubmissionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeReviewSubmissionId]);

  useEffect(() => {
    if (!activeReviewSubmissionId) {
      return;
    }

    setExpandedItems((prev) => {
      if (prev.has(activeReviewSubmissionId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(activeReviewSubmissionId);
      return next;
    });
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

  const handleGenerateEssayFeedback = async (submission, responseItem) => {
    const detail = detailById[submission.id];
    const stateKey = getFeedbackStateKey(submission.id, responseItem.key);
    if (!responseItem?.userAnswer?.trim()) {
      alert('No open-ended responses were found for AI feedback.');
      return;
    }

    try {
      setAiLoadingById((prev) => ({ ...prev, [stateKey]: true }));
      setResponseStatusByKey((prev) => ({ ...prev, [stateKey]: '' }));

      const res = await fetch(apiPath('ai/generate-cambridge-feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: submission.studentName || 'N/A',
          testType: submission.testType || 'Orange',
          classCode: submission.classCode || '',
          responses: [
            {
              label: responseItem.label,
              prompt: responseItem.prompt,
              answer: responseItem.userAnswer,
              questionType: responseItem.questionType,
            },
          ],
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
        [submission.id]: {
          ...(prev[submission.id] || {}),
          [responseItem.key]: data.suggestion,
        },
      }));
      setResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: data.warning
          ? data.warning
          : data.cached
          ? `${responseItem.label || 'Response'} loaded cached AI feedback.`
          : `${responseItem.label || 'Response'} AI feedback generated.`,
      }));
    } catch (err) {
      console.error('Failed to generate Cambridge AI feedback:', err);
      setResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: err.message || 'AI feedback failed.',
      }));
      alert(err.message || 'AI feedback failed.');
    } finally {
      setAiLoadingById((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleSaveEssayFeedback = async (submissionId, responseItem) => {
    const stateKey = getFeedbackStateKey(submissionId, responseItem.key);
    const feedback = String(feedbackDraftById[submissionId]?.[responseItem.key] || '').trim();
    if (!feedback) return;

    const reviewerName =
      teacher?.name || teacher?.username || teacher?.fullName || 'Teacher';
    const detail = detailById[submissionId];
    const submission = submissions.find((item) => item.id === submissionId);
    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];
    const existingResponseFeedback = getCambridgeResponseFeedbackText(
      detail?.responseFeedback || submission?.responseFeedback,
      responseItem.key
    );

    try {
      setSavingById((prev) => ({ ...prev, [stateKey]: true }));
      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackBy: reviewerName,
          responseFeedbackPatch: {
            key: responseItem.key,
            label: responseItem.label,
            prompt: responseItem.prompt,
            questionType: responseItem.questionType,
            feedback,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Could not save feedback.');
      }

      const payload = await res.json().catch(() => ({}));
      const savedSubmission = payload?.submission || {};
      const nextResponseFeedback =
        savedSubmission.responseFeedback ||
        upsertCambridgeResponseFeedback({
          existingValue: detail?.responseFeedback || submission?.responseFeedback,
          responseKey: responseItem.key,
          feedback,
          feedbackBy: reviewerName,
          feedbackAt: savedSubmission.feedbackAt || new Date().toISOString(),
          label: responseItem.label,
          prompt: responseItem.prompt,
          questionType: responseItem.questionType,
        });
      const hasLegacyOverallFeedback = Boolean(
        String(savedSubmission.feedback || detail?.feedback || submission?.feedback || '').trim()
      );
      const nextPendingManualCount = hasLegacyOverallFeedback
        ? 0
        : countMissingCambridgeResponseFeedback(pendingAnswers, nextResponseFeedback);
      const nextStatus = hasLegacyOverallFeedback || nextPendingManualCount === 0
        ? 'reviewed'
        : 'submitted';
      const savedFeedbackAt = savedSubmission.feedbackAt || new Date().toISOString();

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                responseFeedback: nextResponseFeedback,
                feedback: savedSubmission.feedback ?? item.feedback,
                feedbackBy: nextStatus === 'reviewed' ? reviewerName : item.feedbackBy,
                status: savedSubmission.status || nextStatus,
                feedbackAt: nextStatus === 'reviewed' ? savedFeedbackAt : item.feedbackAt,
                pendingManualCount: nextPendingManualCount,
              }
            : item
        )
      );
      setDetailById((prev) => ({
        ...prev,
        [submissionId]: prev[submissionId]
          ? {
              ...prev[submissionId],
              responseFeedback: nextResponseFeedback,
              feedback: savedSubmission.feedback ?? prev[submissionId].feedback,
              feedbackBy:
                savedSubmission.status === 'reviewed' || nextStatus === 'reviewed'
                  ? reviewerName
                  : prev[submissionId].feedbackBy,
              feedbackAt:
                savedSubmission.status === 'reviewed' || nextStatus === 'reviewed'
                  ? savedFeedbackAt
                  : prev[submissionId].feedbackAt,
              status: savedSubmission.status || nextStatus,
            }
          : prev[submissionId],
      }));
      setFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]: {
          ...(prev[submissionId] || {}),
          [responseItem.key]: feedback,
        },
      }));
      setResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: existingResponseFeedback
          ? `${responseItem.label || 'Response'} updated.`
          : nextPendingManualCount === 0
          ? `${responseItem.label || 'Response'} saved. Submission marked reviewed.`
          : `${responseItem.label || 'Response'} saved. ${nextPendingManualCount} response(s) still pending.`,
      }));
    } catch (err) {
      console.error('Failed to save Cambridge feedback:', err);
      setResponseStatusByKey((prev) => ({
        ...prev,
        [stateKey]: err.message || 'Could not save feedback.',
      }));
      alert(err.message || 'Could not save feedback.');
    } finally {
      setSavingById((prev) => ({ ...prev, [stateKey]: false }));
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
    return new Date(dateStr).toLocaleString('en-GB', {
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
        throw new Error(data?.message || "Could not extend time.");
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
      alert(data?.message || "Time extended successfully.");
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setExtendingId(null);
    }
  };

  const handleDeleteSubmission = async (submission) => {
    if (!canDeleteSubmissions || deletingId === submission.id || bulkDeleting) {
      return false;
    }

    setDeletingId(submission.id);
    try {
      const res = await authFetch(apiPath(`admin/submissions/cambridge/${submission.id}`), {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Could not delete submission.');
      }

      setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
      setExpandedItems((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
      setDetailById((prev) => omitRecordKey(prev, submission.id));
      setDetailLoadingById((prev) => omitRecordKey(prev, submission.id));
      setFeedbackDraftById((prev) => omitRecordKey(prev, submission.id));
      setAiLoadingById((prev) => omitResponseStateKeys(prev, submission.id));
      setSavingById((prev) => omitResponseStateKeys(prev, submission.id));
      setStatusMessageById((prev) => omitRecordKey(prev, submission.id));
      setResponseStatusByKey((prev) => omitResponseStateKeys(prev, submission.id));

      if (activeReviewSubmissionId === submission.id) {
        closeEssayReview();
      } else if (deepLinkedSubmission?.id === submission.id) {
        setDeepLinkedSubmission(null);
        clearDeepLinkParams();
      }

      setPagination((prev) => {
        const nextTotal = Math.max(0, prev.total - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / prev.limit));
        const nextPage = prev.page > nextTotalPages ? nextTotalPages : prev.page;

        return {
          ...prev,
          page: nextPage,
          total: nextTotal,
          totalPages: nextTotalPages,
        };
      });
      setRefreshTick((prev) => prev + 1);

      return true;
    } catch (err) {
      alert(err.message || 'Could not delete submission.');
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async (submissionIds = selectedVisibleIds) => {
    if (!canDeleteSubmissions || bulkDeleting || submissionIds.length === 0) {
      return false;
    }

    setBulkDeleting(true);
    try {
      const res = await authFetch(apiPath('admin/submissions/bulk'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: submissionIds.map((submissionId) => ({
            type: 'cambridge',
            id: submissionId,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Could not delete selected submissions.');
      }

      const deletedIds = new Set(submissionIds);
      setSubmissions((prev) => prev.filter((item) => !deletedIds.has(item.id)));
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });
      setExpandedItems((prev) => {
        const next = new Set(prev);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });
      setDetailById((prev) => omitRecordKey(prev, submissionIds));
      setDetailLoadingById((prev) => omitRecordKey(prev, submissionIds));
      setFeedbackDraftById((prev) => omitRecordKey(prev, submissionIds));
      setAiLoadingById((prev) => omitResponseStateKeys(prev, submissionIds));
      setSavingById((prev) => omitResponseStateKeys(prev, submissionIds));
      setStatusMessageById((prev) => omitRecordKey(prev, submissionIds));
      setResponseStatusByKey((prev) => omitResponseStateKeys(prev, submissionIds));

      if (activeReviewSubmissionId && deletedIds.has(activeReviewSubmissionId)) {
        closeEssayReview();
      } else if (deepLinkedSubmission?.id && deletedIds.has(deepLinkedSubmission.id)) {
        setDeepLinkedSubmission(null);
        clearDeepLinkParams();
      }

      setPagination((prev) => {
        const nextTotal = Math.max(0, prev.total - submissionIds.length);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / prev.limit));
        const nextPage = prev.page > nextTotalPages ? nextTotalPages : prev.page;

        return {
          ...prev,
          page: nextPage,
          total: nextTotal,
          totalPages: nextTotalPages,
        };
      });
      setRefreshTick((prev) => prev + 1);

      alert(data?.message || `Deleted ${submissionIds.length} submissions.`);
      return true;
    } catch (err) {
      alert(err.message || 'Could not delete selected submissions.');
      return false;
    } finally {
      setBulkDeleting(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) {
      return false;
    }

    const didDelete =
      deleteConfirm.mode === 'single'
        ? await handleDeleteSubmission(deleteConfirm.submission)
        : await handleBulkDelete(deleteConfirm.ids);

    if (didDelete) {
      setDeleteConfirm(null);
    }

    return didDelete;
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const activeReviewSubmission = activeReviewSubmissionId
    ? submissions.find((item) => item.id === activeReviewSubmissionId) ||
      (deepLinkedSubmission?.id === activeReviewSubmissionId ? deepLinkedSubmission : null)
    : null;
  const workspaceLinks = buildAdminWorkspaceLinks(navigate, "cambridge");
  const submissionViewLinks = CAMBRIDGE_SUBMISSION_TABS.map((tab) => ({
    key: tab.key,
    label: tab.shortLabel || tab.label,
    hint: tab.label,
    tone:
      tab.key === "reading"
        ? "violet"
        : tab.key === "listening"
        ? "green"
        : "orange",
    active: activeTab === tab.key,
    onClick: () => setActiveTab(tab.key),
  }));
  const sidebarStats = [
    {
      key: "visible",
      label: "Visible",
      value: filteredSubmissions.length,
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    {
      key: "pending",
      label: "Pending",
      value: visiblePendingCount,
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    },
    {
      key: "reviewed",
      label: "Reviewed",
      value: visibleReviewedCount,
      bg: "#f0fdf4",
      border: "#bbf7d0",
      color: "#166534",
    },
    {
      key: "pages",
      label: "Pages",
      value: pagination.totalPages || 1,
      bg: "#fff7ed",
      border: "#fed7aa",
      color: "#c2410c",
    },
  ];

  const renderEssayReviewContent = (submission) => {
    const detail = detailById[submission.id];
    const isLoadingDetail = !!detailLoadingById[submission.id];
    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];
    const legacyFeedback = String(detail?.feedback || submission?.feedback || '').trim();
    const responseDrafts = feedbackDraftById[submission.id] || {};

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

                      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                        <div style={styles.drawerSectionTitle}>
                          Feedback for {item.label || `Response ${index + 1}`}
                        </div>
                        <textarea
                          ref={
                            submission.id === activeReviewSubmissionId && index === 0
                              ? feedbackInputRef
                              : null
                          }
                          rows={4}
                          value={responseDrafts[item.key] || ''}
                          onChange={(e) =>
                            setFeedbackDraftById((prev) => ({
                              ...prev,
                              [submission.id]: {
                                ...(prev[submission.id] || {}),
                                [item.key]: e.target.value,
                              },
                            }))
                          }
                          placeholder={`Enter feedback for ${item.label || `response ${index + 1}`}...`}
                          style={styles.feedbackTextarea}
                        />

                        <div style={styles.feedbackActions}>
                          <button
                            onClick={() => handleGenerateEssayFeedback(submission, item)}
                            style={styles.secondaryActionButton}
                            disabled={
                              !item.userAnswer ||
                              aiLoadingById[getFeedbackStateKey(submission.id, item.key)] ||
                              savingById[getFeedbackStateKey(submission.id, item.key)]
                            }
                          >
                            {aiLoadingById[getFeedbackStateKey(submission.id, item.key)]
                              ? 'Generating...'
                              : 'AI Feedback'}
                          </button>
                          <button
                            onClick={() => handleSaveEssayFeedback(submission.id, item)}
                            style={styles.saveActionButton}
                            disabled={
                              !(responseDrafts[item.key] || '').trim() ||
                              savingById[getFeedbackStateKey(submission.id, item.key)] ||
                              aiLoadingById[getFeedbackStateKey(submission.id, item.key)]
                            }
                          >
                            {savingById[getFeedbackStateKey(submission.id, item.key)]
                              ? 'Saving...'
                              : getCambridgeResponseFeedbackText(
                                  detail?.responseFeedback || submission?.responseFeedback,
                                  item.key
                                )
                              ? 'Update Feedback'
                              : 'Save Feedback'}
                          </button>
                        </div>

                        {responseStatusByKey[getFeedbackStateKey(submission.id, item.key)] && (
                          <div style={styles.statusMessage}>
                            {responseStatusByKey[getFeedbackStateKey(submission.id, item.key)]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.drawerSection}>
              {legacyFeedback ? (
                <>
                  <div style={styles.drawerSectionTitle}>Existing overall feedback</div>
                  <div style={{ ...styles.answerCard, whiteSpace: 'pre-wrap' }}>
                    {legacyFeedback}
                  </div>
                </>
              ) : null}

              <div style={styles.feedbackActions}>
                <button
                  onClick={() => handleViewDetail(submission.id)}
                  style={styles.ghostActionButton}
                >
                  Open Full Result
                </button>
              </div>

              <div style={styles.drawerHint}>
                Each open-ended response is reviewed and saved separately. The submission only moves to reviewed after all responses are marked.
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

      <div style={styles.content} className="admin-page admin-submission-page">
        <AdminStickySidebarLayout
          eyebrow="Orange"
          title="Cambridge submissions"
          description="Review Orange Reading and Listening attempts, open essay review, and manage result actions from one sticky sidebar."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Workspace" title="Admin pages" meta="Quick jump">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel eyebrow="View" title="Submission type" meta={activeTab}>
                <AdminSidebarNavList items={submissionViewLinks} ariaLabel="Cambridge submission filters" />
              </AdminSidebarPanel>

              <AdminSidebarPanel eyebrow="Summary" title="Result queue" meta={`Page ${pagination.page}`}>
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Use the filter panel on the right to narrow students, phones, classes, and review state before opening a row.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
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
            <p>Loading submissions...</p>
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
              Retry
            </button>
          </div>
        )}

        {/* Submissions List */}
        {!loading && !error && (
          <>
            <SubmissionStatCards
              stats={[
                {
                  label: 'Visible',
                  count: filteredSubmissions.length,
                  bg: '#eff6ff',
                  color: '#1d4ed8',
                  border: '#bfdbfe',
                },
                {
                  label: 'Pending',
                  count: visiblePendingCount,
                  bg: '#fffbeb',
                  color: '#92400e',
                  border: '#fde68a',
                },
                {
                  label: 'Reviewed',
                  count: visibleReviewedCount,
                  bg: '#f0fdf4',
                  color: '#166534',
                  border: '#bbf7d0',
                },
              ]}
            />

            {canDeleteSubmissions && (
              <>
                <div style={styles.selectionToolbar}>
                  <span style={styles.selectionSummary}>
                    Showing <strong>{filteredSubmissions.length}</strong> visible submissions
                  </span>
                  <div style={styles.selectionActions}>
                    {filteredSubmissions.length > 0 ? (
                      <button
                        type="button"
                        onClick={toggleAllVisibleSelections}
                        style={styles.btnGray}
                        disabled={bulkDeleting}
                      >
                        {allVisibleSelected ? 'Unselect all' : 'Select all visible'}
                      </button>
                    ) : null}
                    {selectedVisibleIds.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedSubmissionIds(new Set())}
                        style={styles.btnGray}
                        disabled={bulkDeleting}
                      >
                        Clear selection
                      </button>
                    ) : null}
                  </div>
                </div>

                {selectedVisibleIds.length > 0 && (
                  <div style={styles.bulkBar}>
                    <span style={{ fontSize: 12.5, lineHeight: 1.25 }}>
                      Selected <strong>{selectedVisibleIds.length}</strong> submissions
                    </span>
                    <button
                      type="button"
                      onClick={openBulkDeleteConfirmation}
                      style={styles.btnRed}
                      disabled={bulkDeleting}
                    >
                      {bulkDeleting
                        ? 'Deleting...'
                        : `Delete Selected (${selectedVisibleIds.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionIds(new Set())}
                      style={styles.btnGray}
                      disabled={bulkDeleting}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </>
            )}

            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: 12 }}>
              Showing <strong>{filteredSubmissions.length}</strong>
              {pagination.total !== filteredSubmissions.length ? ` / ${pagination.total}` : ''} submissions
              {'  '}
              <span style={{ color: '#9ca3af' }}>
                Click a row to view the score summary, feedback, and actions.
              </span>
            </p>

            {filteredSubmissions.length === 0 ? (
              <div style={styles.emptyCell}>No submissions found.</div>
            ) : (
              <ExpandableSubmissionList
                items={filteredSubmissions}
                expandedItems={expandedItems}
                onToggle={toggleExpand}
                selectedId={activeReviewSubmissionId}
                getItemDomId={(submission) => `cambridge-submission-row-${submission.id}`}
                getTone={(submission) =>
                  getSubmissionTone(
                    submission.finished === false
                      ? 'active'
                      : hasReview(submission)
                      ? 'reviewed'
                      : 'pending'
                  )
                }
                renderHeader={({ item: submission, index, tone }) => {
                  const typeBadge = getTestTypeBadge(submission.testType);
                  const timingMeta = submission.finished === false ? getAttemptTimingMeta(submission.expiresAt) : null;
                  const pendingManualCount = getPendingManualCount(submission);
                  const canReviewEssay =
                    String(submission.testType || '').toLowerCase().includes('reading') &&
                    submission.finished !== false &&
                    pendingManualCount > 0;

                  return (
                    <>
                      {canDeleteSubmissions && (
                        <label
                          style={styles.selectionCheckboxLabel}
                          onClick={stopSelectionEvent}
                          onMouseDown={stopSelectionEvent}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select submission #${submission.id}`}
                            checked={selectedSubmissionIds.has(submission.id)}
                            onChange={() => toggleSelection(submission.id)}
                            onClick={stopSelectionEvent}
                          />
                        </label>
                      )}
                      <span style={{ fontSize: '12px', color: tone.subtleText, minWidth: 28 }}>
                        #{(pagination.page - 1) * pagination.limit + index + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          whiteSpace: 'nowrap',
                          background: tone.chipBg,
                          color: tone.chipColor,
                        }}
                      >
                        {submission.finished === false
                          ? 'Active'
                          : hasReview(submission)
                          ? 'Reviewed'
                          : 'Pending'}
                      </span>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: typeBadge.bgColor,
                          color: typeBadge.color,
                        }}
                      >
                        <InlineIcon name={typeBadge.iconName} size={15} />
                        {typeBadge.label}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120, color: tone.primaryText }}>
                        {submission.studentName || '--'}
                      </span>
                      <span style={{ fontSize: 13, color: tone.mutedText, minWidth: 110 }}>
                        {submission.studentPhone || '--'}
                      </span>
                      <span style={{ fontSize: 13, color: tone.secondaryText, flex: 1, minWidth: 220 }}>
                        {[submission.testTitle || '--', submission.classCode || null, submission.teacherName || null]
                          .filter(Boolean)
                          .join(' - ')}
                      </span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: tone.panelBg,
                          color: submission.finished === false ? '#1d4ed8' : getScoreColor(submission.percentage),
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {submission.finished === false
                          ? 'In Progress'
                          : `${submission.score}/${submission.totalQuestions} (${submission.percentage}%)`}
                      </span>
                      {canReviewEssay && (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: '#fff7ed',
                            color: '#c2410c',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {pendingManualCount} pending essay
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: tone.subtleText, whiteSpace: 'nowrap' }}>
                        {submission.finished === false && timingMeta
                          ? `${timingMeta.label} • ${formatAttemptTimestamp(submission.lastSavedAt || submission.createdAt)}`
                          : formatDate(submission.submittedAt)}
                      </span>
                    </>
                  );
                }}
                renderExpanded={({ item: submission, tone }) => {
                  const typeBadge = getTestTypeBadge(submission.testType);
                  const timingMeta = submission.finished === false ? getAttemptTimingMeta(submission.expiresAt) : null;
                  const pendingManualCount = getPendingManualCount(submission);
                  const canReviewEssay =
                    String(submission.testType || '').toLowerCase().includes('reading') &&
                    submission.finished !== false &&
                    pendingManualCount > 0;
                  const isReviewing = activeReviewSubmissionId === submission.id;

                  return (
                    <>
                      {submission.finished === false && (
                        <div
                          style={{
                            background: tone.calloutBg,
                            border: `1px solid ${tone.calloutBorder}`,
                            borderRadius: 7,
                            padding: 12,
                            marginTop: 12,
                            color: tone.calloutText,
                            fontSize: 13,
                          }}
                        >
                          This attempt is still open. The student has not submitted it yet.
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                            {timingMeta && (
                              <span style={{ fontWeight: 700, color: timingMeta.color }}>
                                {timingMeta.label}
                              </span>
                            )}
                            <span style={{ color: tone.secondaryText }}>
                              Saved: {formatAttemptTimestamp(submission.lastSavedAt || submission.createdAt)}
                            </span>
                            <AttemptExtensionControls
                              isLoading={extendingId === submission.id}
                              onExtend={(minutes) => handleExtendTime(submission, minutes)}
                              buttonStyle={{
                                ...styles.viewButton,
                                background: '#0284c7',
                              }}
                              submitButtonStyle={{
                                ...styles.viewButton,
                                background: '#0369a1',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 12,
                          marginTop: 14,
                        }}
                      >
                        {[
                          {
                            label: 'Type',
                            value: typeBadge.label,
                            color: typeBadge.color,
                            custom: (
                              <span
                                style={{
                                  ...styles.badge,
                                  backgroundColor: typeBadge.bgColor,
                                  color: typeBadge.color,
                                  justifyContent: 'center',
                                }}
                              >
                                <InlineIcon name={typeBadge.iconName} size={15} />
                                {typeBadge.label}
                              </span>
                            ),
                          },
                          {
                            label: 'Score',
                            value:
                              submission.finished === false
                                ? 'In Progress'
                                : `${submission.score}/${submission.totalQuestions}`,
                            color:
                              submission.finished === false
                                ? '#1d4ed8'
                                : getScoreColor(submission.percentage),
                          },
                          {
                            label: 'Accuracy',
                            value:
                              submission.finished === false ? '--' : `${submission.percentage}%`,
                            color:
                              submission.finished === false
                                ? '#1d4ed8'
                                : getScoreColor(submission.percentage),
                          },
                          {
                            label: 'Time Spent',
                            value:
                              submission.finished === false
                                ? '--:--'
                                : formatTime(submission.timeSpent),
                            color: tone.primaryText,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            style={{
                              background: tone.panelBg,
                              borderRadius: 7,
                              padding: 12,
                              border: `1px solid ${tone.panelBorder}`,
                              textAlign: 'center',
                            }}
                          >
                            {stat.custom ? (
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                {stat.custom}
                              </div>
                            ) : (
                              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                                {stat.value}
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: tone.mutedText }}>
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: 12,
                          marginTop: 12,
                        }}
                      >
                        {[
                          { label: 'Test Title', value: submission.testTitle || '--' },
                          { label: 'Teacher', value: submission.teacherName || '--' },
                          { label: 'Student', value: submission.studentName || '--' },
                          { label: 'Phone', value: submission.studentPhone || '--' },
                          { label: 'Class Code', value: submission.classCode || '--' },
                          {
                            label: 'Submitted',
                            value:
                              submission.finished === false
                                ? formatAttemptTimestamp(submission.lastSavedAt || submission.createdAt)
                                : formatDate(submission.submittedAt),
                          },
                        ].map((entry) => (
                          <div
                            key={entry.label}
                            style={{
                              background: tone.panelBg,
                              borderRadius: 7,
                              padding: 12,
                              border: `1px solid ${tone.panelBorder}`,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: tone.mutedText, marginBottom: 4 }}>
                              {entry.label}
                            </div>
                            <div style={{ fontSize: 14, color: tone.primaryText }}>
                              {entry.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {canReviewEssay && (
                        <div
                          style={{
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            borderRadius: 7,
                            padding: 12,
                            marginTop: 12,
                          }}
                        >
                          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9a3412' }}>
                            <strong>{pendingManualCount}</strong> open-ended responses are waiting for review.
                          </p>
                          <p style={{ margin: 0, fontSize: 13, color: '#7c2d12' }}>
                            Use Review Essay to open the marking drawer and save teacher feedback.
                          </p>
                        </div>
                      )}

                      {hasReview(submission) && (submission.feedback || buildCambridgeResponseFeedbackEntries(submission.responseFeedback).length) ? (
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 7,
                            padding: 12,
                            marginTop: 12,
                          }}
                        >
                          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#166534' }}>
                            <strong>Reviewed</strong> by <strong>{submission.feedbackBy || '--'}</strong>
                          </p>
                          {submission.feedback ? (
                            <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14, color: tone.primaryText }}>
                              {submission.feedback}
                            </p>
                          ) : (
                            <p style={{ margin: 0, fontSize: 14, color: tone.primaryText }}>
                              Saved response feedback for{' '}
                              <strong>
                                {buildCambridgeResponseFeedbackEntries(submission.responseFeedback).length}
                              </strong>{' '}
                              response(s).
                            </p>
                          )}
                        </div>
                      ) : !canReviewEssay ? (
                        <p style={{ margin: '12px 0 0', color: tone.mutedText, fontSize: 13 }}>
                          No teacher feedback yet.
                        </p>
                      ) : null}

                      {isReviewing && (
                        <div style={{ marginTop: 12, fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                          The essay review drawer is currently open for this submission.
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        {canReviewEssay && (
                          <button
                            onClick={() => openEssayReview(submission)}
                            style={{
                              ...styles.reviewEssayButton,
                              ...(isReviewing ? styles.reviewEssayButtonActive : null),
                            }}
                          >
                            <span>{detailLoadingById[submission.id] && isReviewing ? 'Loading...' : 'Review Essay'}</span>
                            <span style={styles.reviewEssayBadge}>{pendingManualCount}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetail(submission.id)}
                          style={styles.viewButton}
                          className="admin-view-button"
                        >
                          <span className="admin-view-button__icon"><InlineIcon name="eye" size={15} /></span>
                          <span className="admin-view-button__label">View</span>
                        </button>
                        {submission.finished === false && (
                          <AttemptExtensionControls
                            isLoading={extendingId === submission.id}
                            onExtend={(minutes) => handleExtendTime(submission, minutes)}
                            buttonStyle={{
                              ...styles.viewButton,
                              background: '#0284c7',
                            }}
                            submitButtonStyle={{
                              ...styles.viewButton,
                              background: '#0369a1',
                            }}
                          />
                        )}
                        {canDeleteSubmissions && (
                          <button
                            onClick={() => openDeleteConfirmation(submission)}
                            style={{
                              ...styles.viewButton,
                              backgroundColor: '#dc2626',
                              opacity:
                                deletingId === submission.id || bulkDeleting ? 0.72 : 1,
                              cursor:
                                deletingId === submission.id || bulkDeleting
                                  ? 'default'
                                  : 'pointer',
                            }}
                            disabled={deletingId === submission.id || bulkDeleting}
                            title="Delete submission permanently"
                          >
                            <InlineIcon name="trash" size={15} />
                            {deletingId === submission.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </>
                  );
                }}
              />
            )}

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
                  <span>Previous</span>
                </button>
                <span style={styles.pageInfo}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{
                    ...styles.pageButton,
                    ...(pagination.page === pagination.totalPages && styles.pageButtonDisabled)
                  }}
                >
                  <span>Next</span>
                  <InlineIcon name="chevron-right" size={16} />
                </button>
              </div>
            )}
          </>
        )}
        </AdminStickySidebarLayout>

        <AdminConfirmModal
          open={Boolean(deleteConfirm)}
          title={
            deleteConfirm?.mode === 'bulk'
              ? `Delete ${deleteConfirm?.ids?.length || 0} Cambridge submissions?`
              : 'Delete Cambridge submission?'
          }
          description={
            deleteConfirm?.mode === 'bulk'
              ? 'This removes the selected Cambridge submissions from the queue immediately and cannot be undone.'
              : 'This permanently removes the selected Cambridge submission, including saved feedback and review drawer state for that record.'
          }
          confirmLabel="Delete Permanently"
          busy={
            deleteConfirm?.mode === 'bulk'
              ? bulkDeleting
              : deletingId === deleteConfirm?.submission?.id
          }
          busyLabel="Deleting..."
          onCancel={closeDeleteConfirmation}
          onConfirm={confirmDeleteAction}
          iconName="trash"
        >
          {deleteConfirm?.mode === 'bulk' ? (
            <>
              <p style={styles.confirmMetaHeading}>Selection summary</p>
              <p style={styles.confirmMetaText}>
                <strong>{deleteConfirm?.ids?.length || 0}</strong> visible Cambridge submissions will be deleted.
              </p>
              <p style={styles.confirmMetaText}>The current filtered selection will be removed from this page and the list will refresh to keep pagination in sync.</p>
            </>
          ) : (
            <>
              <p style={styles.confirmMetaHeading}>Submission summary</p>
              <p style={styles.confirmMetaText}>
                <strong>Student:</strong> {deleteConfirm?.submission?.studentName || '--'}
              </p>
              <p style={styles.confirmMetaText}>
                <strong>Test:</strong> {deleteConfirm?.submission?.testTitle || '--'}
              </p>
              <p style={styles.confirmMetaText}>
                <strong>Submission ID:</strong> #{deleteConfirm?.submission?.id || '--'}
              </p>
            </>
          )}
        </AdminConfirmModal>

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
    maxWidth: '100%',
    margin: '0 auto',
    padding: '30px 16px',
    boxSizing: 'border-box',
  },
  switcherWrap: {
    width: '100%',
    maxWidth: '620px',
    margin: '0 auto 18px',
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
  trFocused: {
    backgroundColor: '#fff7cc',
    boxShadow: 'inset 4px 0 0 #f59e0b',
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
  btnRed: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12.5,
    lineHeight: 1.05,
  },
  btnGray: {
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12.5,
    lineHeight: 1.05,
  },
  statusMessage: {
    color: '#1d4ed8',
    fontSize: '13px',
  },
  selectionToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '12px',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#f8fafc',
  },
  selectionSummary: {
    fontSize: '14px',
    color: '#475569',
  },
  selectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  selectionCheckboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'pointer',
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '12px',
    padding: '12px 14px',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    background: '#fff1f2',
    color: '#7f1d1d',
  },
  confirmMetaHeading: {
    margin: '0 0 10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'inherit',
  },
  confirmMetaText: {
    margin: '6px 0 0',
    fontSize: 14,
    lineHeight: 1.55,
    color: 'inherit',
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


