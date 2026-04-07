import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath } from "../../../shared/utils/api";
import SubmissionTypeTabs from "../components/SubmissionTypeTabs";

const DEFAULT_REVIEW_FILTERS = {
  studentName: "",
  classCode: "",
  teacherName: "",
  reviewedBy: "",
  status: "pending",
};

const cloneReviewFilters = () => ({ ...DEFAULT_REVIEW_FILTERS });

const normalizeFilterValue = (value) => String(value ?? "").trim().toLowerCase();

const matchesFilterValue = (value, search) => {
  const query = normalizeFilterValue(search);
  return !query || normalizeFilterValue(value).includes(query);
};

const Review = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const teacher = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("writing");
  const [filtersByTab, setFiltersByTab] = useState(() => ({
    writing: cloneReviewFilters(),
    reading: cloneReviewFilters(),
    listening: cloneReviewFilters(),
    cambridge: cloneReviewFilters(),
  }));

  const [unreviewedWriting, setUnreviewedWriting] = useState([]);
  const [unreviewedPetWriting, setUnreviewedPetWriting] = useState([]);
  const [loadingWriting, setLoadingWriting] = useState(true);

  const [unreviewedReading, setUnreviewedReading] = useState([]);
  const [loadingReading, setLoadingReading] = useState(true);

  const [unreviewedListening, setUnreviewedListening] = useState([]);
  const [loadingListening, setLoadingListening] = useState(true);

  const [cambridgeSubmissions, setCambridgeSubmissions] = useState([]);
  const [loadingCambridge, setLoadingCambridge] = useState(true);
  const [cambridgeError, setCambridgeError] = useState(null);
  const [expandedCambridge, setExpandedCambridge] = useState(() => new Set());
  const [cambridgeDetailsById, setCambridgeDetailsById] = useState({});
  const [cambridgeLoadingDetailById, setCambridgeLoadingDetailById] = useState(
    {}
  );
  const [cambridgeFeedbackDraftById, setCambridgeFeedbackDraftById] = useState(
    {}
  );
  const [cambridgeAiLoadingById, setCambridgeAiLoadingById] = useState({});
  const [cambridgeSavingById, setCambridgeSavingById] = useState({});
  const [cambridgeStatusById, setCambridgeStatusById] = useState({});
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const hasFeedback = (submission) =>
    String(submission?.feedback || "")
      .trim()
      .length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsCompactLayout(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUnreviewedWriting = async () => {
      setLoadingWriting(true);
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();
        const filtered = Array.isArray(all) ? all : [];

        const petWriting = filtered.filter((sub) =>
          String(
            sub?.writing_test?.testType ||
              sub?.WritingTest?.testType ||
              sub?.testType ||
              ""
          )
            .toLowerCase()
            .includes("pet-writing")
        );

        const writingIelts = filtered.filter((sub) => !petWriting.includes(sub));
        setUnreviewedPetWriting(petWriting);
        setUnreviewedWriting(writingIelts);
      } catch (err) {
        console.error("Failed to load writing submissions:", err);
        setUnreviewedWriting([]);
        setUnreviewedPetWriting([]);
      } finally {
        setLoadingWriting(false);
      }
    };

    const fetchUnreviewedReading = async () => {
      setLoadingReading(true);
      try {
        const res = await fetch(apiPath("reading-submissions/admin/list"));
        if (!res.ok) {
          throw new Error("Could not load Reading submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data) ? data : [];
        setUnreviewedReading(submissions);
      } catch (err) {
        console.error("Failed to load reading submissions:", err);
        setUnreviewedReading([]);
      } finally {
        setLoadingReading(false);
      }
    };

    const fetchUnreviewedListening = async () => {
      setLoadingListening(true);
      try {
        const res = await fetch(apiPath("listening-submissions/admin/list"));
        if (!res.ok) {
          throw new Error("Could not load Listening submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data) ? data : [];
        setUnreviewedListening(submissions);
      } catch (err) {
        console.error("Failed to load listening submissions:", err);
        setUnreviewedListening([]);
      } finally {
        setLoadingListening(false);
      }
    };

    const fetchCambridgeSubmissions = async () => {
      try {
        setLoadingCambridge(true);
        setCambridgeError(null);
        const res = await fetch(apiPath("cambridge/submissions?page=1&limit=100"));
        if (!res.ok) {
          throw new Error("Could not load Orange submissions.");
        }

        const data = await res.json();
        const submissions = Array.isArray(data?.submissions)
          ? data.submissions
          : Array.isArray(data)
          ? data
          : [];
        setCambridgeSubmissions(submissions);
      } catch (err) {
        console.error("Failed to load Cambridge submissions:", err);
        setCambridgeError(err.message);
        setCambridgeSubmissions([]);
      } finally {
        setLoadingCambridge(false);
      }
    };

    fetchUnreviewedWriting();
    fetchUnreviewedReading();
    fetchUnreviewedListening();
    fetchCambridgeSubmissions();
  }, []);

  const parseJsonIfString = (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const getPendingManualAnswers = (submissionDetail) => {
    const detailedResults = parseJsonIfString(submissionDetail?.detailedResults);
    if (!detailedResults || typeof detailedResults !== "object") return [];

    return Object.entries(detailedResults)
      .filter(([, result]) => result && typeof result === "object" && result.isCorrect === null)
      .map(([key, result], index) => ({
        key,
        label: `Response ${index + 1}`,
        prompt:
          typeof result.questionText === "string" ? result.questionText.trim() : "",
        userAnswer:
          typeof result.userAnswer === "string" ? result.userAnswer.trim() : "",
        questionType:
          typeof result.questionType === "string"
            ? result.questionType.trim()
            : "",
      }))
      .filter((item) => item.userAnswer.length > 0);
  };

  const mergedCambridgeRows = useMemo(() => {
    const petRows = unreviewedPetWriting.map((sub) => ({
      source: "pet-writing",
      sub,
      submittedAt: sub.submittedAt || sub.createdAt || 0,
    }));

    const cambridgeRows = cambridgeSubmissions.map((sub) => ({
      source: "cambridge",
      sub,
      submittedAt: sub.submittedAt || 0,
    }));

    return [...petRows, ...cambridgeRows].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [unreviewedPetWriting, cambridgeSubmissions]);

  const handleToggleCambridgeDetail = async (submissionId) => {
    setExpandedCambridge((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });

    if (
      cambridgeDetailsById[submissionId] ||
      cambridgeLoadingDetailById[submissionId]
    ) {
      return;
    }

    try {
      setCambridgeLoadingDetailById((prev) => ({
        ...prev,
        [submissionId]: true,
      }));

      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`));
      if (!res.ok) {
        throw new Error("Could not load submission details.");
      }

      const detail = await res.json();
      setCambridgeDetailsById((prev) => ({ ...prev, [submissionId]: detail }));
      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submissionId]:
          typeof detail?.feedback === "string" ? detail.feedback : prev[submissionId] || "",
      }));
    } catch (err) {
      console.error("Failed to load Cambridge submission detail:", err);
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submissionId]: err.message || "Could not load submission details.",
      }));
    } finally {
      setCambridgeLoadingDetailById((prev) => ({
        ...prev,
        [submissionId]: false,
      }));
    }
  };

  const handleGenerateCambridgeFeedback = async (submission) => {
    const detail = cambridgeDetailsById[submission.id];
    const responses = getPendingManualAnswers(detail);

    if (!responses.length) {
      alert("No open-ended responses were found for AI feedback.");
      return;
    }

    try {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [submission.id]: true }));
      setCambridgeStatusById((prev) => ({ ...prev, [submission.id]: "" }));

      const res = await fetch(apiPath("ai/generate-cambridge-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: submission.studentName || "N/A",
          testType: submission.testType || "Orange",
          classCode: submission.classCode || "",
          responses: responses.map((item) => ({
            label: item.label,
            prompt: item.prompt,
            answer: item.userAnswer,
            questionType: item.questionType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI could not generate Orange feedback.");
      }

      if (!data?.suggestion) {
        throw new Error("AI returned an empty Orange feedback result.");
      }

      setCambridgeFeedbackDraftById((prev) => ({
        ...prev,
        [submission.id]: data.suggestion,
      }));
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submission.id]: data.warning
          ? data.warning
          : data.cached
          ? "Loaded cached AI feedback."
          : "AI feedback generated.",
      }));
    } catch (err) {
      console.error("Failed to generate Cambridge AI feedback:", err);
      setCambridgeStatusById((prev) => ({
        ...prev,
        [submission.id]: err.message || "AI feedback failed.",
      }));
      alert(err.message || "AI feedback failed.");
    } finally {
      setCambridgeAiLoadingById((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleSaveCambridgeFeedback = async (submissionId) => {
    const feedback = (cambridgeFeedbackDraftById[submissionId] || "").trim();
    if (!feedback) return;

    try {
      setCambridgeSavingById((prev) => ({ ...prev, [submissionId]: true }));

      const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          feedbackBy:
            teacher?.name || teacher?.username || teacher?.fullName || "Teacher",
          status: "reviewed",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Could not save feedback.");
      }

      setCambridgeSubmissions((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                feedback,
                feedbackBy:
                  teacher?.name || teacher?.username || teacher?.fullName || "Teacher",
                status: "reviewed",
              }
            : item
        )
      );
      setExpandedCambridge((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    } catch (err) {
      console.error("Failed to save Cambridge feedback:", err);
      alert(err.message || "Could not save feedback.");
    } finally {
      setCambridgeSavingById((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const formatDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("en-GB");
  };

  const getReviewStatus = (submission) => {
    const explicitStatus = normalizeFilterValue(submission?.status);
    if (explicitStatus === "reviewed" || explicitStatus === "done") {
      return "done";
    }

    if (hasFeedback(submission) || normalizeFilterValue(submission?.feedbackBy)) {
      return "done";
    }

    return "pending";
  };

  const getSubmissionStudentName = (submission) =>
    submission?.studentName ||
    submission?.userName ||
    submission?.user?.name ||
    submission?.User?.name ||
    "N/A";

  const getSubmissionPhone = (submission) =>
    submission?.studentPhone ||
    submission?.userPhone ||
    submission?.user?.phone ||
    submission?.User?.phone ||
    "N/A";

  const getReadingTestLabel = (submission) => {
    const test = submission?.ReadingTest || {};
    return [test.title || `Reading #${submission?.testId || "N/A"}`, test.classCode || "", test.teacherName || ""]
      .filter(Boolean)
      .join(" - ");
  };

  const getListeningTestLabel = (submission) => {
    const test = submission?.ListeningTest || {};
    return [test.title || `Listening #${submission?.testId || "N/A"}`, test.classCode || "", test.teacherName || ""]
      .filter(Boolean)
      .join(" - ");
  };

  const getWritingFilterMeta = (submission) => {
    const test = submission?.writing_test || submission?.WritingTest || {};
    return {
      studentName: submission?.userName || submission?.user?.name || submission?.User?.name || "",
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getReadingFilterMeta = (submission) => {
    const test = submission?.ReadingTest || {};
    return {
      studentName: getSubmissionStudentName(submission),
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getListeningFilterMeta = (submission) => {
    const test = submission?.ListeningTest || {};
    return {
      studentName: getSubmissionStudentName(submission),
      classCode: test?.classCode || "",
      teacherName: test?.teacherName || "",
      reviewedBy: submission?.feedbackBy || "",
      status: getReviewStatus(submission),
    };
  };

  const getCambridgeFilterMeta = (row) => {
    if (row?.source === "pet-writing") {
      const sub = row?.sub || {};
      const test = sub?.writing_test || sub?.WritingTest || {};

      return {
        studentName: sub?.userName || sub?.user?.name || sub?.User?.name || "",
        classCode: test?.classCode || "",
        teacherName: test?.teacherName || "",
        reviewedBy: sub?.feedbackBy || "",
        status: getReviewStatus(sub),
      };
    }

    const sub = row?.sub || {};
    return {
      studentName: sub?.studentName || sub?.userName || "",
      classCode: sub?.classCode || "",
      teacherName: sub?.teacherName || "",
      reviewedBy: sub?.feedbackBy || "",
      status: getReviewStatus(sub),
    };
  };

  const applyQueueFilters = (items, filters, getMeta) =>
    items.filter((item) => {
      const meta = getMeta(item);

      if (!matchesFilterValue(meta.studentName, filters.studentName)) return false;
      if (!matchesFilterValue(meta.classCode, filters.classCode)) return false;
      if (!matchesFilterValue(meta.teacherName, filters.teacherName)) return false;
      if (!matchesFilterValue(meta.reviewedBy, filters.reviewedBy)) return false;
      if (filters.status === "pending" && meta.status !== "pending") return false;
      if (filters.status === "done" && meta.status !== "done") return false;

      return true;
    });

  const countPendingItems = (items, getMeta) =>
    items.reduce(
      (count, item) => count + (getMeta(item).status === "pending" ? 1 : 0),
      0
    );

  const filteredWriting = applyQueueFilters(
    unreviewedWriting,
    filtersByTab.writing,
    getWritingFilterMeta
  );
  const filteredReading = applyQueueFilters(
    unreviewedReading,
    filtersByTab.reading,
    getReadingFilterMeta
  );
  const filteredListening = applyQueueFilters(
    unreviewedListening,
    filtersByTab.listening,
    getListeningFilterMeta
  );
  const filteredCambridgeRows = applyQueueFilters(
    mergedCambridgeRows,
    filtersByTab.cambridge,
    getCambridgeFilterMeta
  );

  const writingNeedsReviewCount = countPendingItems(
    unreviewedWriting,
    getWritingFilterMeta
  );
  const readingNeedsReviewCount = countPendingItems(
    unreviewedReading,
    getReadingFilterMeta
  );
  const listeningNeedsReviewCount = countPendingItems(
    unreviewedListening,
    getListeningFilterMeta
  );
  const cambridgeNeedsReviewCount = countPendingItems(
    mergedCambridgeRows,
    getCambridgeFilterMeta
  );
  const reviewTabs = [
    {
      key: "writing",
      shortLabel: "Writing",
      label: "Writing Review Queue",
      badge: writingNeedsReviewCount,
    },
    {
      key: "reading",
      shortLabel: "Reading",
      label: "Reading Review Queue",
      badge: readingNeedsReviewCount,
    },
    {
      key: "listening",
      shortLabel: "Listening",
      label: "Listening Review Queue",
      badge: listeningNeedsReviewCount,
    },
    {
      key: "cambridge",
      shortLabel: "Orange",
      label: "Orange Review Queue",
      badge: cambridgeNeedsReviewCount,
    },
  ];

  const activeFilters = filtersByTab[activeTab] || cloneReviewFilters();
  const activeTotalCount =
    activeTab === "writing"
      ? unreviewedWriting.length
      : activeTab === "reading"
      ? unreviewedReading.length
      : activeTab === "listening"
      ? unreviewedListening.length
      : mergedCambridgeRows.length;
  const activeFilteredCount =
    activeTab === "writing"
      ? filteredWriting.length
      : activeTab === "reading"
      ? filteredReading.length
      : activeTab === "listening"
      ? filteredListening.length
      : filteredCambridgeRows.length;

  const updateTabFilter = (tabKey, field, value) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: {
        ...(prev[tabKey] || cloneReviewFilters()),
        [field]: value,
      },
    }));
  };

  const resetTabFilters = (tabKey) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: cloneReviewFilters(),
    }));
  };

  const renderObjectiveQueueDesktop = (items, buildTestLabel, onReview) => (
    <table style={tableStyle}>
      <thead>
        <tr style={{ backgroundColor: "#f2f2f2" }}>
          <th style={cellStyle}>#</th>
          <th style={cellStyle}>Student</th>
          <th style={cellStyle}>Phone</th>
          <th style={cellStyle}>Test</th>
          <th style={cellStyle}>Submitted</th>
          <th style={cellStyle}>Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((sub, idx) => (
          <tr key={sub.id} style={{ borderBottom: "1px solid #ccc" }}>
            <td style={cellStyle}>{idx + 1}</td>
            <td style={cellStyle}>{getSubmissionStudentName(sub)}</td>
            <td style={cellStyle}>{getSubmissionPhone(sub)}</td>
            <td style={cellStyle}>{buildTestLabel(sub)}</td>
            <td style={cellStyle}>{formatDateTime(sub.submittedAt || sub.createdAt)}</td>
            <td style={cellStyle}>
              <button onClick={() => onReview(sub)} style={primaryButtonStyle}>
                Review
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderObjectiveQueueMobile = (items, buildTitle, buildMeta, onReview) => (
    <div style={mobileListStyle}>
      {items.map((sub, idx) => (
        <div key={sub.id} style={mobileCardStyle(isDarkMode)}>
          <div style={mobileCardHeaderStyle}>
            <div style={mobileCardIndexStyle(isDarkMode)}>#{idx + 1}</div>
            <div style={mobileCardTitleStyle(isDarkMode)}>{buildTitle(sub)}</div>
          </div>

          <div style={mobileFieldsGridStyle}>
            {renderMobileField("Student", getSubmissionStudentName(sub))}
            {renderMobileField("Phone", getSubmissionPhone(sub))}
            {renderMobileField("Test", buildMeta(sub))}
            {renderMobileField("Submitted", formatDateTime(sub.submittedAt || sub.createdAt))}
          </div>

          <button
            onClick={() => onReview(sub)}
            style={{ ...primaryButtonStyle, width: "100%", marginTop: 12 }}
          >
            Review Submission
          </button>
        </div>
      ))}
    </div>
  );

  const renderMobileField = (label, value) => (
    <div key={label} style={mobileFieldRowStyle}>
      <div style={mobileFieldLabelStyle(isDarkMode)}>{label}</div>
      <div style={mobileFieldValueStyle(isDarkMode)}>{value}</div>
    </div>
  );

  const renderCambridgeExpandedContent = (
    sub,
    detail,
    pendingAnswers,
    isLoadingDetail
  ) => (
    <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
      {isLoadingDetail && <div>Loading submission details...</div>}

      {!isLoadingDetail && detail && (
        <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
          <div style={{ display: "grid", gap: isCompactLayout ? 6 : 8 }}>
            <div style={{ fontWeight: 700 }}>Open-ended responses to review</div>

            {pendingAnswers.length === 0 ? (
              <div
                style={{
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                No pending open-ended responses were found in this submission. You can still
                open the full result to inspect it manually.
              </div>
            ) : (
              <div style={{ display: "grid", gap: isCompactLayout ? 8 : 10 }}>
                {pendingAnswers.map((item, answerIndex) => (
                  <div key={item.key} style={answerBoxStyle(isDarkMode, isCompactLayout)}>
                    <div style={{ fontWeight: 700 }}>
                      {item.label || `Response ${answerIndex + 1}`}
                    </div>
                    {item.prompt && (
                      <div
                        style={{
                          marginTop: 6,
                          marginBottom: 8,
                          color: isDarkMode ? "#cbd5e1" : "#4b5563",
                          fontSize: 13,
                        }}
                      >
                        Prompt: {item.prompt}
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>{item.userAnswer}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: isCompactLayout ? 6 : 8, marginTop: isCompactLayout ? 2 : 6 }}>
            <div style={{ fontWeight: 700 }}>Teacher Feedback</div>
            <textarea
              rows={4}
              value={cambridgeFeedbackDraftById[sub.id] || ""}
              onChange={(e) =>
                setCambridgeFeedbackDraftById((prev) => ({
                  ...prev,
                  [sub.id]: e.target.value,
                }))
              }
              placeholder="Enter feedback..."
              style={{
                width: "100%",
                padding: isCompactLayout ? 9 : 10,
                border: `1px solid ${isDarkMode ? "#2a3350" : "#d1d5db"}`,
                borderRadius: 8,
                fontSize: 14,
                background: isDarkMode ? "#0f172a" : "#fff",
                color: isDarkMode ? "#e5e7eb" : "#111827",
                boxSizing: "border-box",
              }}
            />

            <div
              style={feedbackActionRowStyle(isCompactLayout)}
            >
              <button
                onClick={() => handleGenerateCambridgeFeedback(sub)}
                style={
                  isCompactLayout
                    ? { ...mobileSecondaryButtonStyle, padding: "10px 12px" }
                    : secondaryButtonStyle
                }
                disabled={
                  !pendingAnswers.length ||
                  cambridgeAiLoadingById[sub.id] ||
                  cambridgeSavingById[sub.id]
                }
              >
                {cambridgeAiLoadingById[sub.id] ? "Generating..." : "AI Feedback"}
              </button>
              <button
                onClick={() => handleSaveCambridgeFeedback(sub.id)}
                style={
                  isCompactLayout
                    ? { ...primaryButtonStyle, width: "100%", padding: "10px 12px" }
                    : primaryButtonStyle
                }
                disabled={
                  !(cambridgeFeedbackDraftById[sub.id] || "").trim() ||
                  cambridgeSavingById[sub.id] ||
                  cambridgeAiLoadingById[sub.id]
                }
              >
                {cambridgeSavingById[sub.id] ? "Saving..." : "Save Feedback"}
              </button>
              <span
                style={{
                  gridColumn: isCompactLayout ? "1 / -1" : undefined,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: isCompactLayout ? 12 : 13,
                  lineHeight: 1.45,
                }}
              >
                Saving will move this submission to the reviewed state.
              </span>
            </div>

            {cambridgeStatusById[sub.id] && (
              <div
                style={{
                  color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                  fontSize: 13,
                }}
              >
                {cambridgeStatusById[sub.id]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderFilterToolbar = (tabKey) => (
    <div style={filterPanelStyle(isDarkMode)}>
      <div style={filterGridStyle}>
        {[
          {
            key: "studentName",
            label: "Student Name",
            placeholder: "Student name",
          },
          {
            key: "classCode",
            label: "Class Code",
            placeholder: "e.g. 148-IX-3A-S1",
          },
          {
            key: "teacherName",
            label: "Test Teacher",
            placeholder: "Teacher name",
          },
          {
            key: "reviewedBy",
            label: "Reviewed By",
            placeholder: "Reviewer name",
          },
        ].map((field) => (
          <div key={field.key}>
            <label style={filterFieldLabelStyle(isDarkMode)}>{field.label}</label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={activeFilters[field.key] || ""}
              onChange={(e) => updateTabFilter(tabKey, field.key, e.target.value)}
              style={filterInputStyle(isDarkMode)}
            />
          </div>
        ))}

        <div>
          <label style={filterFieldLabelStyle(isDarkMode)}>Status</label>
          <select
            value={activeFilters.status || ""}
            onChange={(e) => updateTabFilter(tabKey, "status", e.target.value)}
            style={filterInputStyle(isDarkMode)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="done">Reviewed</option>
          </select>
        </div>

        <div style={{ alignSelf: "end" }}>
          <button
            onClick={() => resetTabFilters(tabKey)}
            style={filterResetButtonStyle}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={filterSummaryStyle(isDarkMode)}>
        Showing <strong>{activeFilteredCount}</strong>
        {activeTotalCount !== activeFilteredCount ? ` / ${activeTotalCount}` : ""} submissions
      </div>
    </div>
  );

  return (
    <>
      <AdminNavbar />
      <div
        className="admin-page admin-submission-page"
        style={{ maxWidth: "100%", width: "100%", margin: "0 auto", padding: "30px 16px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 0,
          }}
          className="admin-header-row"
        >
          <h3 style={{ margin: 0 }}>Review Queue</h3>
        </div>

        <div style={{ width: "100%", maxWidth: 760, margin: "14px auto 0" }}>
          <SubmissionTypeTabs
            title={null}
            items={reviewTabs}
            activeKey={activeTab}
            onSelect={setActiveTab}
            allowMobileWrap
            buttonFlex="1 1 0"
          />
        </div>

        {renderFilterToolbar(activeTab)}

        {activeTab === "writing" && (
          <>
            {loadingWriting && <p>Loading writing submissions...</p>}
            {!loadingWriting && filteredWriting.length === 0 && (
              <p>
                {unreviewedWriting.length === 0
                  ? "No writing submissions found."
                  : "No writing submissions match the current filters."}
              </p>
            )}

            {!loadingWriting && filteredWriting.length > 0 && !isCompactLayout && (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f2f2f2" }}>
                    <th style={cellStyle}>#</th>
                    <th style={cellStyle}>Student</th>
                    <th style={cellStyle}>Phone</th>
                    <th style={cellStyle}>Test</th>
                    <th style={cellStyle}>Submitted</th>
                    <th style={cellStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWriting.map((sub, idx) => {
                    const writingTest = sub.writing_test || sub.WritingTest || {};
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={cellStyle}>{idx + 1}</td>
                        <td style={cellStyle}>{sub.userName || sub.user?.name || "N/A"}</td>
                        <td style={cellStyle}>{sub.userPhone || sub.user?.phone || "N/A"}</td>
                        <td style={cellStyle}>
                          Writing {writingTest.index || "N/A"}
                          {writingTest.classCode ? ` - ${writingTest.classCode}` : ""}
                          {writingTest.teacherName ? ` - ${writingTest.teacherName}` : ""}
                        </td>
                        <td style={cellStyle}>
                          {formatDateTime(sub.submittedAt || sub.createdAt)}
                        </td>
                        <td style={cellStyle}>
                          <button
                            onClick={() => navigate(`/review/${sub.id}`)}
                            style={primaryButtonStyle}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loadingWriting && filteredWriting.length > 0 && isCompactLayout && (
              <div style={mobileListStyle}>
                {filteredWriting.map((sub, idx) => {
                  const writingTest = sub.writing_test || sub.WritingTest || {};
                  return (
                    <div key={sub.id} style={mobileCardStyle(isDarkMode)}>
                      <div style={mobileCardHeaderStyle}>
                        <div style={mobileCardIndexStyle(isDarkMode)}>#{idx + 1}</div>
                        <div style={mobileCardTitleStyle(isDarkMode)}>
                          Writing {writingTest.index || "N/A"}
                        </div>
                      </div>

                      <div style={mobileFieldsGridStyle}>
                        {renderMobileField("Student", sub.userName || sub.user?.name || "N/A")}
                        {renderMobileField("Phone", sub.userPhone || sub.user?.phone || "N/A")}
                        {renderMobileField(
                          "Test",
                          [
                            writingTest.classCode || null,
                            writingTest.teacherName || null,
                          ]
                            .filter(Boolean)
                            .join(" - ") || "N/A"
                        )}
                        {renderMobileField(
                          "Submitted",
                          formatDateTime(sub.submittedAt || sub.createdAt)
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/review/${sub.id}`)}
                        style={{ ...primaryButtonStyle, width: "100%", marginTop: 12 }}
                      >
                        Review Submission
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "reading" && (
          <>
            {loadingReading && <p>Loading reading submissions...</p>}
            {!loadingReading && filteredReading.length === 0 && (
              <p>
                {unreviewedReading.length === 0
                  ? "No reading submissions found."
                  : "No reading submissions match the current filters."}
              </p>
            )}

            {!loadingReading && filteredReading.length > 0 && !isCompactLayout &&
              renderObjectiveQueueDesktop(
                filteredReading,
                getReadingTestLabel,
                (sub) => navigate(`/reading-results/${sub.id}`)
              )}

            {!loadingReading && filteredReading.length > 0 && isCompactLayout &&
              renderObjectiveQueueMobile(
                filteredReading,
                () => "Reading",
                getReadingTestLabel,
                (sub) => navigate(`/reading-results/${sub.id}`)
              )}
          </>
        )}

        {activeTab === "listening" && (
          <>
            {loadingListening && <p>Loading listening submissions...</p>}
            {!loadingListening && filteredListening.length === 0 && (
              <p>
                {unreviewedListening.length === 0
                  ? "No listening submissions found."
                  : "No listening submissions match the current filters."}
              </p>
            )}

            {!loadingListening && filteredListening.length > 0 && !isCompactLayout &&
              renderObjectiveQueueDesktop(
                filteredListening,
                getListeningTestLabel,
                (sub) => navigate(`/listening-results/${sub.id}`)
              )}

            {!loadingListening && filteredListening.length > 0 && isCompactLayout &&
              renderObjectiveQueueMobile(
                filteredListening,
                () => "Listening",
                getListeningTestLabel,
                (sub) => navigate(`/listening-results/${sub.id}`)
              )}
          </>
        )}

        {activeTab === "cambridge" && (
          <>
            {loadingWriting && <p>Loading PET writing submissions...</p>}
            {loadingCambridge && <p>Loading Orange submissions...</p>}
            {!loadingCambridge && cambridgeError && (
              <p style={{ color: "#dc2626" }}>{cambridgeError}</p>
            )}
            {!loadingWriting &&
              !loadingCambridge &&
              !cambridgeError &&
              filteredCambridgeRows.length === 0 && (
                <p>
                  {mergedCambridgeRows.length === 0
                    ? "No Orange submissions found."
                    : "No Orange submissions match the current filters."}
                </p>
              )}

            {!loadingCambridge && !cambridgeError && filteredCambridgeRows.length > 0 && !isCompactLayout && (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f2f2f2" }}>
                    <th style={cellStyle}>#</th>
                    <th style={cellStyle}>Type</th>
                    <th style={cellStyle}>Student</th>
                    <th style={cellStyle}>Phone</th>
                    <th style={cellStyle}>Class</th>
                    <th style={cellStyle}>Score</th>
                    <th style={cellStyle}>Submitted</th>
                    <th style={cellStyle}>Essay</th>
                    <th style={cellStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCambridgeRows.map((row, idx) => {
                    if (row.source === "pet-writing") {
                      const sub = row.sub;
                      const writingTest = sub.writing_test || sub.WritingTest || {};

                      return (
                        <tr key={`pet-${sub.id}`} style={{ borderBottom: "1px solid #ccc" }}>
                          <td style={cellStyle}>{idx + 1}</td>
                          <td style={cellStyle}>pet-writing</td>
                          <td style={cellStyle}>{sub.userName || sub.user?.name || "N/A"}</td>
                          <td style={cellStyle}>{sub.userPhone || sub.user?.phone || "N/A"}</td>
                          <td style={cellStyle}>{writingTest.classCode || "N/A"}</td>
                          <td style={cellStyle}>--</td>
                          <td style={cellStyle}>
                            {formatDateTime(sub.submittedAt || sub.createdAt)}
                          </td>
                          <td style={cellStyle}>--</td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => navigate(`/review/${sub.id}`)}
                              style={primaryButtonStyle}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const sub = row.sub;
                    const isExpanded = expandedCambridge.has(sub.id);
                    const detail = cambridgeDetailsById[sub.id];
                    const isLoadingDetail = !!cambridgeLoadingDetailById[sub.id];
                    const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];

                    return (
                      <React.Fragment key={`cam-${sub.id}`}>
                        <tr style={{ borderBottom: "1px solid #ccc" }}>
                          <td style={cellStyle}>{idx + 1}</td>
                          <td style={cellStyle}>{String(sub.testType || "Orange")}</td>
                          <td style={cellStyle}>{sub.studentName || "N/A"}</td>
                          <td style={cellStyle}>{sub.studentPhone || "N/A"}</td>
                          <td style={cellStyle}>{sub.classCode || "N/A"}</td>
                          <td style={cellStyle}>
                            {typeof sub.score === "number" &&
                            typeof sub.totalQuestions === "number"
                              ? `${sub.score}/${sub.totalQuestions}`
                              : "--"}
                          </td>
                          <td style={cellStyle}>
                            {formatDateTime(sub.submittedAt)}
                          </td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => handleToggleCambridgeDetail(sub.id)}
                              style={secondaryButtonStyle}
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                          <td style={cellStyle}>
                            <button
                              onClick={() => navigate(`/cambridge/result/${sub.id}`)}
                              style={secondaryButtonStyle}
                            >
                              View Result
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td
                              style={{
                                ...cellStyle,
                                background: isDarkMode ? "#0f172a" : "#fafafa",
                                color: isDarkMode ? "#e5e7eb" : "inherit",
                                borderColor: isDarkMode ? "#1f2b47" : cellStyle.border,
                              }}
                              colSpan={9}
                            >
                              {renderCambridgeExpandedContent(
                                sub,
                                detail,
                                pendingAnswers,
                                isLoadingDetail
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loadingCambridge && !cambridgeError && filteredCambridgeRows.length > 0 && isCompactLayout && (
              <div style={mobileListStyle}>
                {filteredCambridgeRows.map((row, idx) => {
                  if (row.source === "pet-writing") {
                    const sub = row.sub;
                    const writingTest = sub.writing_test || sub.WritingTest || {};

                    return (
                      <div key={`pet-${sub.id}`} style={mobileCardStyle(isDarkMode)}>
                        <div style={mobileCardHeaderStyle}>
                          <div style={mobileCardIndexStyle(isDarkMode)}>#{idx + 1}</div>
                          <div style={mobileCardTitleStyle(isDarkMode)}>PET Writing</div>
                        </div>

                        <div style={mobileFieldsGridStyle}>
                          {renderMobileField("Student", sub.userName || sub.user?.name || "N/A")}
                          {renderMobileField("Phone", sub.userPhone || sub.user?.phone || "N/A")}
                          {renderMobileField("Class", writingTest.classCode || "N/A")}
                          {renderMobileField("Submitted", formatDateTime(sub.submittedAt || sub.createdAt))}
                        </div>

                        <button
                          onClick={() => navigate(`/review/${sub.id}`)}
                          style={{ ...primaryButtonStyle, width: "100%", marginTop: 12 }}
                        >
                          Review Submission
                        </button>
                      </div>
                    );
                  }

                  const sub = row.sub;
                  const isExpanded = expandedCambridge.has(sub.id);
                  const detail = cambridgeDetailsById[sub.id];
                  const isLoadingDetail = !!cambridgeLoadingDetailById[sub.id];
                  const pendingAnswers = detail ? getPendingManualAnswers(detail) : [];

                  return (
                    <div key={`cam-${sub.id}`} style={mobileCardStyle(isDarkMode)}>
                      <div style={mobileCardHeaderStyle}>
                        <div style={mobileCardIndexStyle(isDarkMode)}>#{idx + 1}</div>
                        <div style={mobileCardTitleStyle(isDarkMode)}>
                          {String(sub.testType || "Orange")}
                        </div>
                      </div>

                      <div style={mobileFieldsGridStyle}>
                        {renderMobileField("Student", sub.studentName || "N/A")}
                        {renderMobileField("Phone", sub.studentPhone || "N/A")}
                        {renderMobileField("Class", sub.classCode || "N/A")}
                        {renderMobileField(
                          "Score",
                          typeof sub.score === "number" && typeof sub.totalQuestions === "number"
                            ? `${sub.score}/${sub.totalQuestions}`
                            : "--"
                        )}
                        {renderMobileField("Submitted", formatDateTime(sub.submittedAt))}
                      </div>

                      <div style={mobileButtonRowStyle}>
                        <button
                          onClick={() => handleToggleCambridgeDetail(sub.id)}
                          style={mobileSecondaryButtonStyle}
                        >
                          {isExpanded ? "Hide Details" : "Review Essay"}
                        </button>
                        <button
                          onClick={() => navigate(`/cambridge/result/${sub.id}`)}
                          style={mobileSecondaryButtonStyle}
                        >
                          View Result
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={mobileExpandedPanelStyle(isDarkMode)}>
                          {renderCambridgeExpandedContent(
                            sub,
                            detail,
                            pendingAnswers,
                            isLoadingDetail
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
  fontSize: "15px",
};

const cellStyle = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "left",
};

const filterPanelStyle = (isDarkMode) => ({
  marginTop: 18,
  marginBottom: 18,
  border: `1px solid ${isDarkMode ? "#243047" : "#e5e7eb"}`,
  borderRadius: 14,
  padding: "14px 16px",
  background: isDarkMode ? "#0f172a" : "#fff",
  boxShadow: isDarkMode
    ? "0 10px 30px rgba(2, 6, 23, 0.32)"
    : "0 8px 20px rgba(15, 23, 42, 0.04)",
});

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const filterFieldLabelStyle = (isDarkMode) => ({
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: isDarkMode ? "#cbd5e1" : "#374151",
});

const filterInputStyle = (isDarkMode) => ({
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${isDarkMode ? "#334155" : "#d1d5db"}`,
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  background: isDarkMode ? "#111827" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "#111827",
});

const filterResetButtonStyle = {
  width: "100%",
  padding: "7px 10px",
  background: "#6b7280",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const filterSummaryStyle = (isDarkMode) => ({
  marginTop: 10,
  fontSize: 13,
  color: isDarkMode ? "#9ca3af" : "#6b7280",
});

const primaryButtonStyle = {
  background: "#e03",
  color: "white",
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "#fff",
  color: "#111827",
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
};

const answerBoxStyle = (isDarkMode, isCompactLayout = false) => ({
  border: `1px solid ${isDarkMode ? "#2a3350" : "#e5e7eb"}`,
  borderRadius: 10,
  background: isDarkMode ? "#111827" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "inherit",
  padding: isCompactLayout ? 10 : 12,
});

const feedbackActionRowStyle = (isCompactLayout) => ({
  display: "grid",
  gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, max-content)",
  gap: isCompactLayout ? 8 : 10,
  alignItems: "center",
});

const mobileListStyle = {
  display: "grid",
  gap: 14,
  marginTop: 20,
};

const mobileCardStyle = (isDarkMode) => ({
  border: `1px solid ${isDarkMode ? "#2a3350" : "#e5e7eb"}`,
  borderRadius: 16,
  background: isDarkMode ? "#0f172a" : "#fff",
  color: isDarkMode ? "#e5e7eb" : "#111827",
  padding: 12,
  boxShadow: isDarkMode
    ? "0 8px 24px rgba(2, 6, 23, 0.35)"
    : "0 8px 24px rgba(15, 23, 42, 0.06)",
});

const mobileCardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const mobileCardIndexStyle = (isDarkMode) => ({
  minWidth: 34,
  height: 34,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: isDarkMode ? "#1e293b" : "#eef2ff",
  color: isDarkMode ? "#bfdbfe" : "#1d4ed8",
  fontSize: 13,
  fontWeight: 700,
});

const mobileCardTitleStyle = (isDarkMode) => ({
  fontSize: 15,
  fontWeight: 800,
  color: isDarkMode ? "#f8fafc" : "#111827",
  wordBreak: "break-word",
});

const mobileFieldsGridStyle = {
  display: "grid",
  gap: 10,
};

const mobileFieldRowStyle = {
  display: "grid",
  gap: 4,
};

const mobileFieldLabelStyle = (isDarkMode) => ({
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: isDarkMode ? "#93c5fd" : "#64748b",
});

const mobileFieldValueStyle = (isDarkMode) => ({
  fontSize: 14,
  lineHeight: 1.5,
  color: isDarkMode ? "#e5e7eb" : "#111827",
  wordBreak: "break-word",
});

const mobileButtonRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  marginTop: 10,
};

const mobileSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  width: "100%",
  padding: "9px 12px",
  fontWeight: 700,
};

const mobileExpandedPanelStyle = (isDarkMode) => ({
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  background: isDarkMode ? "#111827" : "#f8fafc",
  border: `1px solid ${isDarkMode ? "#1f2b47" : "#e5e7eb"}`,
});

export default Review;
