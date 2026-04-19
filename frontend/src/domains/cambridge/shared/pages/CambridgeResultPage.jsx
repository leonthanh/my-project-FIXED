import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiPath, getStoredUser, hostPath } from "../../../../shared/utils/api";
import AdminNavbar from "../../../../shared/components/AdminNavbar";
import StudentNavbar from "../../../../shared/components/StudentNavbar";
import { useTheme } from "../../../../shared/contexts/ThemeContext";
import { isAdmin, isTeacher } from "../../../../shared/utils/permissions";
import CambridgeStudentStyleReview from "../components/CambridgeStudentStyleReview";

function resolveAsset(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(String(url))) return String(url);
  return hostPath(String(url));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePromptHtml(rawHtml = '') {
  const source = String(rawHtml || '').trim();
  if (!source) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(source).replace(/\n/g, '<br />');
  }

  try {
    const doc = new DOMParser().parseFromString(source, 'text/html');

    doc
      .querySelectorAll('script, style, iframe, object, embed, form, link, meta')
      .forEach((node) => node.remove());

    doc.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith('on')) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === 'IMG') {
        const rawSrc = String(element.getAttribute('src') || '').trim();
        if (!rawSrc) {
          element.remove();
          return;
        }

        element.setAttribute('src', resolveAsset(rawSrc));
        element.setAttribute('alt', element.getAttribute('alt') || 'Writing prompt image');
        element.setAttribute('loading', 'lazy');
        element.setAttribute(
          'style',
          'display:block;max-width:100%;height:auto;border-radius:12px;margin:10px 0;border:1px solid #dbe3f0;background:#fff;'
        );
      }
    });

    doc.querySelectorAll('p').forEach((paragraph) => {
      const text = String(paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasMedia = paragraph.querySelector('img, video, audio');
      if (!text && !hasMedia) {
        paragraph.remove();
        return;
      }
      paragraph.setAttribute('style', 'margin:0 0 8px;line-height:1.7;');
    });

    const html = String(doc.body.innerHTML || '').trim();
    return html || escapeHtml(source).replace(/\n/g, '<br />');
  } catch {
    return escapeHtml(source).replace(/\n/g, '<br />');
  }
}

function buildWritingPromptHtml(sectionType, question, detailedResult) {
  const detailedPrompt =
    typeof detailedResult?.questionText === 'string' ? detailedResult.questionText.trim() : '';

  if (detailedPrompt) {
    return sanitizePromptHtml(detailedPrompt);
  }

  if (sectionType === 'short-message') {
    const fallback =
      question?.situation ||
      question?.questionText ||
      question?.prompt ||
      '';
    return fallback ? sanitizePromptHtml(fallback) : '';
  }

  if (sectionType === 'story-writing') {
    const promptParts = [];

    if (typeof question?.prompt === 'string' && question.prompt.trim()) {
      promptParts.push(`<p>${escapeHtml(question.prompt.trim())}</p>`);
    }

    const images = Array.isArray(question?.images)
      ? question.images.filter(Boolean)
      : Array.isArray(question?.imageUrls)
        ? question.imageUrls.filter(Boolean)
        : [];

    if (images.length) {
      promptParts.push(
        `<div>${images
          .map((imageUrl) => `<img src="${escapeHtml(resolveAsset(imageUrl))}" alt="Story prompt" />`)
          .join('')}</div>`
      );
    }

    const bulletPoints = Array.isArray(question?.bulletPoints)
      ? question.bulletPoints.map((point) => String(point || '').trim()).filter(Boolean)
      : [];

    if (bulletPoints.length) {
      promptParts.push(
        `<div><strong>Write about:</strong><ul>${bulletPoints
          .map((point) => `<li>${escapeHtml(point)}</li>`)
          .join('')}</ul></div>`
      );
    }

    if (!promptParts.length && question?.questionText) {
      promptParts.push(`<p>${escapeHtml(question.questionText)}</p>`);
    }

    return sanitizePromptHtml(promptParts.join(''));
  }

  const fallback =
    question?.questionText ||
    question?.prompt ||
    question?.situation ||
    question?.openingSentence ||
    '';

  return fallback ? sanitizePromptHtml(`<p>${escapeHtml(fallback)}</p>`) : '';
}

/**
 * CambridgeResultPage - Trang xem kết quả chi tiết sau khi nộp bài Cambridge test
 * Hiển thị:
 * - Điểm số tổng quan
 * - Danh sách câu hỏi với đánh dấu đúng/sai
 * - Đáp án đúng cho từng câu
 */
const CambridgeResultPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 520 : false
  );
  const styles = useMemo(() => createStyles(isDarkMode, isCompactLayout), [isDarkMode, isCompactLayout]);
  const currentUser = useMemo(() => getStoredUser(), []);
  const canViewDetailedReview = useMemo(
    () => isAdmin(currentUser) || isTeacher(currentUser),
    [currentUser]
  );
  const ResultNavbar = canViewDetailedReview ? AdminNavbar : StudentNavbar;
  const legendColors = useMemo(() => (
    isDarkMode
      ? {
          correct: '#0f2a1a',
          wrong: '#2a1515',
          blank: '#1f2b47',
          pending: '#0b1d2e',
        }
      : {
          correct: '#dcfce7',
          wrong: '#fee2e2',
          blank: '#f1f5f9',
          pending: '#e0f2fe',
        }
  ), [isDarkMode]);
  const correctAnswerStyle = useMemo(() => (
    isDarkMode
      ? { color: '#a7f3d0', backgroundColor: '#0f2a1a' }
      : { color: '#166534', backgroundColor: '#dcfce7' }
  ), [isDarkMode]);

  const getDetailedResult = (primaryKey, legacyKey) => {
    const dr = submission?.detailedResults;
    if (!dr || typeof dr !== 'object') return null;
    if (primaryKey && Object.prototype.hasOwnProperty.call(dr, primaryKey)) return dr[primaryKey];
    if (legacyKey && Object.prototype.hasOwnProperty.call(dr, legacyKey)) return dr[legacyKey];
    return null;
  };

  const getResultStatus = (result) => {
    const isUnanswered = !result || result.userAnswer === null || result.userAnswer === undefined || result.userAnswer === '';
    if (result?.isCorrect === null && !isUnanswered) {
      return isDarkMode
        ? { label: 'Pending Review', color: '#38bdf8', bg: '#0b1d2e', text: '#7dd3fc', iconName: 'loading' }
        : { label: 'Pending Review', color: '#0ea5e9', bg: '#e0f2fe', text: '#075985', iconName: 'loading' };
    }
    if (result?.isCorrect === true) {
      return isDarkMode
        ? { label: 'Correct', color: '#22c55e', bg: '#0f2a1a', text: '#a7f3d0', iconName: 'correct' }
        : { label: 'Correct', color: '#22c55e', bg: '#dcfce7', text: '#166534', iconName: 'correct' };
    }
    if (isUnanswered) {
      return isDarkMode
        ? { label: 'Blank', color: '#94a3b8', bg: '#1f2b47', text: '#94a3b8', iconName: 'blank' }
        : { label: 'Blank', color: '#94a3b8', bg: '#f1f5f9', text: '#64748b', iconName: 'blank' };
    }
    return isDarkMode
      ? { label: 'Wrong', color: '#ef4444', bg: '#2a1515', text: '#fecaca', iconName: 'wrong' }
      : { label: 'Wrong', color: '#ef4444', bg: '#fee2e2', text: '#991b1b', iconName: 'wrong' };
  };

  const canShowCorrectAnswer = (result) => {
    if (!result || typeof result !== 'object') return false;
    if (result.isCorrect === null) return false; // pending grading (writing)
    const ca = result.correctAnswer;
    return ca !== undefined && ca !== null && String(ca).trim() !== '';
  };

  const hasOwnKeys = (value) => (
    !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
  );

  const rebuildAnswersFromDetailedResults = (detailedResults) => {
    if (!detailedResults || typeof detailedResults !== 'object' || Array.isArray(detailedResults)) {
      return {};
    }

    return Object.entries(detailedResults).reduce((acc, [key, result]) => {
      const userAnswer = result?.userAnswer;
      if (userAnswer === undefined || userAnswer === null) return acc;
      if (typeof userAnswer === 'string' && userAnswer.trim() === '') return acc;
      acc[key] = userAnswer;
      return acc;
    }, {});
  };

  const normalizeSubmission = (raw) => {
    if (!raw) return null;
    const normalized = { ...raw };

    // Backend may return JSON columns as stringified JSON
    if (typeof normalized.answers === 'string') {
      try {
        normalized.answers = JSON.parse(normalized.answers);
      } catch {
        // keep as-is
      }
    }
    if (typeof normalized.detailedResults === 'string') {
      try {
        normalized.detailedResults = JSON.parse(normalized.detailedResults);
      } catch {
        // keep as-is
      }
    }

    if (!hasOwnKeys(normalized.answers) && hasOwnKeys(normalized.detailedResults)) {
      normalized.answers = rebuildAnswersFromDetailedResults(normalized.detailedResults);
    }

    return normalized;
  };

  // State from navigation (if available) or fetch from API
  const [submission, setSubmission] = useState(() => normalizeSubmission(location.state?.submission) || null);
  const [test, setTest] = useState(location.state?.test || null);
  const [loading, setLoading] = useState(!location.state?.submission);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, review
  const [expandedParts, setExpandedParts] = useState({});
  const [showLegacyDetails, setShowLegacyDetails] = useState(false);
  const lastFetchedTestKeyRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsCompactLayout(window.innerWidth <= 520);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canViewDetailedReview && activeTab === 'review') {
      setActiveTab('overview');
    }
  }, [activeTab, canViewDetailedReview]);

  const testNeedsRefresh = (t) => {
    if (!t || !Array.isArray(t.parts)) return true;
    // If any cloze-test question is missing blanks (or blanks empty), the UI can't render Part 5 properly
    for (const part of t.parts) {
      for (const section of (part?.sections || [])) {
        if (section?.questionType !== 'cloze-test') continue;
        for (const q of (section?.questions || [])) {
          if (!Array.isArray(q?.blanks) || q.blanks.length === 0) return true;
        }
      }
    }
    return false;
  };

  // Always fetch fresh submission data from API (navSubmission is just initial placeholder)
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        // Don't show loading spinner if we already have nav state data (avoid flicker)
        if (!location.state?.submission) setLoading(true);
        setError(null);
        const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), { signal: controller.signal });
        if (!res.ok) throw new Error("Result not found");
        const data = await res.json();
        if (!cancelled) setSubmission(normalizeSubmission(data));
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'AbortError') return;
        console.error("Error fetching submission:", err);
        setError(err.message || 'Failed to load results');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submissionId]);

  // Ensure we have test data for rendering Part 5 + mapping keys
  useEffect(() => {
    const sub = normalizeSubmission(location.state?.submission) || submission;
    if (!sub?.testId || !sub?.testType) return;

    const category = sub.testType.includes('listening') ? 'listening' : 'reading';
    const fetchKey = `${category}:${sub.testId}`;
    const shouldFetch = !test || String(test.id) !== String(sub.testId) || testNeedsRefresh(test);
    if (!shouldFetch) return;
    if (lastFetchedTestKeyRef.current === fetchKey) return;
    lastFetchedTestKeyRef.current = fetchKey;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const testRes = await fetch(apiPath(`cambridge/${category}-tests/${sub.testId}`), { signal: controller.signal });
        if (!testRes.ok) return;
        const testData = await testRes.json();
        testData.parts = typeof testData.parts === 'string' ? JSON.parse(testData.parts) : testData.parts;
        if (!cancelled) setTest(testData);
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'AbortError') return;
        console.error('Error fetching test:', err);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submission, location.state?.submission, test]);

  const formatQuestionLabel = (questionNum) => {
    if (!questionNum || questionNum <= 0) return '';
    return String(questionNum);
  };

  const getSectionType = (section) => {
    const q0 = section?.questions?.[0] || {};
    return (
      section?.questionType ||
      q0?.questionType ||
      q0?.type ||
      (Array.isArray(q0?.people) ? 'people-matching' : '') ||
      (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
      (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
      ''
    );
  };

  const parseClozeBlanks = (passageText, startNum = 1) => {
    if (!passageText) return [];
    let plainText = passageText;
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');
      temp.innerHTML = passageText;
      plainText = temp.textContent || temp.innerText || passageText;
    } else {
      plainText = String(passageText).replace(/<[^>]*>/g, ' ');
    }

    const blanks = [];
    const numbered = /\((\d+)\)|\[(\d+)\]/g;
    let match;
    while ((match = numbered.exec(plainText)) !== null) {
      const num = parseInt(match[1] || match[2], 10);
      blanks.push({ questionNum: num, fullMatch: match[0], index: match.index });
    }

    if (blanks.length > 0) {
      return blanks.sort((a, b) => a.questionNum - b.questionNum);
    }

    const underscorePattern = /[_…]{3,}/g;
    let blankIndex = 0;
    while ((match = underscorePattern.exec(plainText)) !== null) {
      blanks.push({
        questionNum: startNum + blankIndex,
        fullMatch: match[0],
        index: match.index,
      });
      blankIndex++;
    }

    return blanks;
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!submission) return null;
    
    const { score, percentage, detailedResults } = submission;
    
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let totalCount = 0;

    if (detailedResults && typeof detailedResults === 'object') {
      Object.values(detailedResults).forEach(result => {
        if (!result || typeof result !== 'object') return;

        // Only count questions with isCorrect !== null (exclude skipped/missing answers)
        if (result.isCorrect !== null) {
          totalCount++;
          if (result.isCorrect) correctCount++;
          else if (result.userAnswer === null || result.userAnswer === '') unansweredCount++;
          else wrongCount++;
        }
      });
    }

    // If no valid results, use submission.totalQuestions as fallback
    const total = totalCount > 0 ? totalCount : (submission.totalQuestions || 0);

    return {
      score: score || 0,
      total: total,
      percentage: percentage || 0,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      grade: getGrade(percentage || 0)
    };
  }, [submission]);

  // Build mapping of answer keys to question numbers
  const questionNumberMap = useMemo(() => {
    const map = {};
    let questionNum = 0;

    if (!test?.parts) return map;

    test.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        const sectionType = getSectionType(section);

        section.questions?.forEach((question, qIdx) => {
          if (sectionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
            question.questions.forEach((nestedQ, nestedIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${nestedIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${nestedIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'cloze-mc' && question.blanks && Array.isArray(question.blanks)) {
            question.blanks.forEach((blank, blankIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'inline-choice' && question.blanks && Array.isArray(question.blanks)) {
            question.blanks.forEach((blank, blankIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'cloze-test') {
            const passageText = question?.passageText || question?.passage || '';
            const blanks = Array.isArray(question?.blanks) && question.blanks.length > 0
              ? question.blanks
              : parseClozeBlanks(passageText, questionNum + 1);

            if (Array.isArray(blanks) && blanks.length > 0) {
              blanks.forEach((blank, blankIdx) => {
                const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
                const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
                const explicitNum = Number(blank?.questionNum);
                const assignedNum = Number.isFinite(explicitNum) ? explicitNum : questionNum + 1;
                map[key] = assignedNum;
                map[legacyKey] = assignedNum;
                questionNum = Math.max(questionNum + 1, assignedNum);
              });
              return;
            }
          }

          if (sectionType === 'people-matching' && Array.isArray(question.people)) {
            question.people.forEach((person, personIdx) => {
              const pid = person?.id || String.fromCharCode(65 + personIdx);
              const key = `${partIdx}-${secIdx}-${qIdx}-${pid}`;
              const legacyKey = `${partIdx}-${secIdx}-${pid}`;
              const legacyIndexKey = `${partIdx}-${secIdx}-${personIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              map[legacyIndexKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'gap-match' && Array.isArray(question.leftItems)) {
            question.leftItems.forEach((_, itemIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${itemIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'word-form' && Array.isArray(question.sentences)) {
            question.sentences.forEach((s, sentIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${sentIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${sentIdx}`;
              map[key] = questionNum + 1;
              map[legacyKey] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'matching-pictures' && Array.isArray(question.prompts)) {
            question.prompts.forEach((prompt) => {
              const promptId = String(prompt.id || prompt.number || 0);
              const key = `${partIdx}-${secIdx}-${promptId}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'image-cloze') {
            const passageText = question.passageText || '';
            const blankRe = /\(\s*(\d+)\s*\)/g;
            let blankMatch;
            while ((blankMatch = blankRe.exec(passageText)) !== null) {
              const blankNum = parseInt(blankMatch[1], 10);
              const key = `${partIdx}-${secIdx}-blank-${blankNum}`;
              map[key] = questionNum + 1;
              questionNum++;
            }
            if (question.titleQuestion && question.titleQuestion.enabled) {
              map[`${partIdx}-${secIdx}-title`] = questionNum + 1;
              questionNum++;
            }
            return;
          }

          if (sectionType === 'word-drag-cloze' && Array.isArray(question.blanks)) {
            question.blanks.forEach((blank) => {
              const key = `${partIdx}-${secIdx}-blank-${blank.number}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'story-completion' && Array.isArray(question.items)) {
            question.items.forEach((item, itemIdx) => {
              const key = `${partIdx}-${secIdx}-item-${itemIdx + 1}`;
              map[key] = questionNum + 1;
              questionNum++;
            });
            return;
          }

          if (sectionType === 'look-read-write' && Array.isArray(question.groups)) {
            question.groups.forEach((group, groupIdx) => {
              (group.items || []).forEach((item, itemIdx) => {
                const key = `${partIdx}-${secIdx}-g${groupIdx}-item${itemIdx}`;
                map[key] = questionNum + 1;
                questionNum++;
              });
            });
            return;
          }

          // short-message / story-writing: one numbered manual-review question
          if (sectionType === 'short-message' || sectionType === 'story-writing') {
            const key = `${partIdx}-${secIdx}-${qIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-0`;
            map[key] = questionNum + 1;
            map[legacyKey] = questionNum + 1;
            questionNum++;
            return;
          }

          // draw-lines (Movers Part 1): sub-keys per name, skip index 0 (example)
          if ((sectionType === 'draw-lines' || question.questionType === 'draw-lines' ||
               (question.anchors && Object.keys(question.anchors || {}).length > 0)) &&
              Array.isArray(question.leftItems) && question.leftItems.length > 1) {
            let expanded = 0;
            for (let nameIdx = 1; nameIdx < question.leftItems.length; nameIdx++) {
              if (String(question.leftItems[nameIdx] || '').trim()) {
                const key = `${partIdx}-${secIdx}-${qIdx}-${nameIdx}`;
                map[key] = questionNum + 1;
                questionNum++;
                expanded++;
              }
            }
            if (expanded > 0) return;
          }

          // letter-matching (Movers Part 3): sub-keys per person, skip index 0 (example)
          if ((sectionType === 'letter-matching' || question.questionType === 'letter-matching') &&
              Array.isArray(question.people) && question.people.length > 1) {
            let expanded = 0;
            for (let pi = 1; pi < question.people.length; pi++) {
              if (String(question.people[pi]?.name || '').trim()) {
                const key = `${partIdx}-${secIdx}-${qIdx}-${pi}`;
                map[key] = questionNum + 1;
                questionNum++;
                expanded++;
              }
            }
            if (expanded > 0) return;
          }

          const key = `${partIdx}-${secIdx}-${qIdx}`;
          map[key] = questionNum + 1;
          questionNum++;
        });
      });
    });

    return map;
  }, [test?.parts]);

  // Get grade based on percentage
  function getGrade(percentage) {
    if (percentage >= 90) return { label: 'Excellent', color: '#22c55e', iconName: 'good' };
    if (percentage >= 80) return { label: 'Strong', color: '#3b82f6', iconName: 'good' };
    if (percentage >= 70) return { label: 'Good', color: '#8b5cf6', iconName: 'good' };
    if (percentage >= 60) return { label: 'Average', color: '#f59e0b', iconName: 'average' };
    if (percentage >= 50) return { label: 'Pass', color: '#f97316', iconName: 'average' };
    return { label: 'Needs Work', color: '#ef4444', iconName: 'weak' };
  }

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle part expansion
  const togglePart = (partIdx) => {
    setExpandedParts(prev => ({
      ...prev,
      [partIdx]: !prev[partIdx]
    }));
  };

  const renderClozeTestPassageWithResults = ({ passageText, blanks, partIdx, secIdx, qIdx }) => {
    if (!passageText || typeof passageText !== 'string') return null;
    const safeBlanks = Array.isArray(blanks) ? blanks : [];

    const blankIndexByQuestionNum = new Map(
      safeBlanks
        .map((b, idx) => [Number(b?.questionNum), idx])
        .filter(([n]) => Number.isFinite(n))
    );

    const buildBlankPill = (blankIdx, explicitQuestionNum) => {
      const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
      const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
      const result = getDetailedResult(key, legacyKey) || {};
      const status = getResultStatus(result);

      const mappedNum = questionNumberMap[key];
      const blankNum =
        Number(explicitQuestionNum) ||
        Number(safeBlanks?.[blankIdx]?.questionNum) ||
        Number(mappedNum);

      const label = Number.isFinite(blankNum) ? `(${blankNum})` : '(?)';
      const userAnswer = (result?.userAnswer ?? '').toString();
      const correctAnswer = (result?.correctAnswer ?? '').toString();
      const title = `${label} ${status.label}\nYou: ${userAnswer || '(No answer)'}${canShowCorrectAnswer(result) ? `\nCorrect: ${correctAnswer}` : ''}`;

      return (
        <span
          key={`blank-pill-${blankIdx}-${label}`}
          title={title}
          style={{
            ...styles.clozeBlankPill,
            borderColor: status.color,
            backgroundColor: status.bg,
            color: status.text,
          }}
        >
          <span style={styles.clozeBlankNum}>{label}</span>
          <span style={styles.clozeBlankAns}>{userAnswer || '____'}</span>
        </span>
      );
    };

    const renderInline = () => {
      const elements = [];
      let lastIndex = 0;

      // Prefer numbered placeholders: (25) or [25]
      const numberedRegex = /\((\d+)\)|\[(\d+)\]/g;
      let match;
      let foundNumbered = false;

      while ((match = numberedRegex.exec(passageText)) !== null) {
        const questionNum = parseInt(match[1] || match[2], 10);
        if (!Number.isFinite(questionNum)) continue;

        const blankIdx = blankIndexByQuestionNum.has(questionNum)
          ? blankIndexByQuestionNum.get(questionNum)
          : null;
        if (blankIdx === null || blankIdx === undefined) continue;

        foundNumbered = true;

        if (match.index > lastIndex) {
          elements.push(
            <span
              key={`text-${lastIndex}`}
              dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex, match.index) }}
            />
          );
        }

        elements.push(buildBlankPill(blankIdx, questionNum));
        lastIndex = match.index + match[0].length;
      }

      if (foundNumbered) {
        if (lastIndex < passageText.length) {
          elements.push(
            <span
              key={`text-${lastIndex}-end`}
              dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex) }}
            />
          );
        }
        return elements;
      }

      // Fallback: underscore/ellipsis placeholders (___ or ………)
      const underscoreRegex = /[_…]{3,}/g;
      let underscoreMatch;
      let blankIdx = 0;
      lastIndex = 0;

      while ((underscoreMatch = underscoreRegex.exec(passageText)) !== null) {
        if (underscoreMatch.index > lastIndex) {
          elements.push(
            <span
              key={`text2-${lastIndex}`}
              dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex, underscoreMatch.index) }}
            />
          );
        }

        if (blankIdx < safeBlanks.length) {
          elements.push(buildBlankPill(blankIdx, safeBlanks?.[blankIdx]?.questionNum));
        } else {
          elements.push(
            <span
              key={`blank-missing-${blankIdx}`}
              style={{
                ...styles.clozeBlankPill,
                borderColor: isDarkMode ? '#3d3d5c' : '#94a3b8',
                backgroundColor: isDarkMode ? '#1f2b47' : '#f1f5f9',
                color: isDarkMode ? '#94a3b8' : '#64748b',
              }}
            >
              <span style={styles.clozeBlankNum}>(?)</span>
              <span style={styles.clozeBlankAns}>____</span>
            </span>
          );
        }

        blankIdx++;
        lastIndex = underscoreMatch.index + underscoreMatch[0].length;
      }

      if (elements.length === 0) return null;
      if (lastIndex < passageText.length) {
        elements.push(
          <span
            key={`text2-${lastIndex}-end`}
            dangerouslySetInnerHTML={{ __html: passageText.substring(lastIndex) }}
          />
        );
      }
      return elements;
    };

    const inline = renderInline();
    if (!inline) return null;

    return (
      <div style={styles.clozePassageCard}>
        <div style={styles.clozePassageBody}>{inline}</div>

        {safeBlanks.length > 0 && (
          <div style={styles.clozeAnswerGrid}>
            {safeBlanks.map((b, blankIdx) => {
              const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
              const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
              const result = getDetailedResult(key, legacyKey) || {};
              const status = getResultStatus(result);
              const qNum =
                Number(questionNumberMap[key]) ||
                Number(b?.questionNum);
              const label = Number.isFinite(qNum) ? qNum : '?';

              return (
                <div
                  key={`blank-summary-${blankIdx}`}
                  style={{
                    ...styles.clozeAnswerItem,
                    borderLeftColor: status.color,
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                  }}
                >
                  <div style={styles.clozeAnswerItemHeader}>
                    <span style={{ ...styles.clozeAnswerNum, backgroundColor: status.bg, color: status.text }}>
                      {label}
                    </span>
                    <span style={styles.clozeAnswerStatus}>{status.label}</span>
                  </div>
                  <div style={styles.clozeAnswerRow}>
                    <span style={styles.answerLabel}>Bạn:</span>
                    <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>
                      {result.userAnswer || '(Không trả lời)'}
                    </span>
                  </div>
                  {canShowCorrectAnswer(result) && (
                    <div style={styles.clozeAnswerRow}>
                      <span style={styles.answerLabel}>Đúng:</span>
                      <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                        {result.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderLegacyWritingReviewCard = ({ partIdx, secIdx, qIdx, question, sectionType }) => {
    const key = `${partIdx}-${secIdx}-${qIdx}`;
    const legacyKey = `${partIdx}-${secIdx}-0`;
    const result = getDetailedResult(key, legacyKey) || {};
    const questionNum = questionNumberMap[key] || questionNumberMap[legacyKey];
    const label = questionNum ? formatQuestionLabel(questionNum) : '?';
    const status = getResultStatus(result);
    const promptHtml = buildWritingPromptHtml(sectionType, question, result);
    const userAnswer =
      result?.userAnswer ??
      submission?.answers?.[key] ??
      submission?.answers?.[legacyKey] ??
      '';

    return (
      <div
        key={key}
        style={{
          ...styles.questionReviewCard,
          borderLeftColor: status.color,
        }}
      >
        <div style={styles.questionReviewHeader}>
          <span style={{ ...styles.questionNum, backgroundColor: status.color }}>
            {label}
          </span>
          <span style={styles.questionStatus}>{status.label}</span>
        </div>

        <div style={styles.questionText}>
          {promptHtml ? (
            <div
              style={{ lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: promptHtml }}
            />
          ) : (
            question?.questionText || 'Writing task'
          )}
        </div>

        <div style={styles.answersCompare}>
          <div style={styles.answerRow}>
            <span style={styles.answerLabel}>Bài làm của học sinh:</span>
            <div
              style={{
                ...styles.answerValue,
                color: status.text,
                backgroundColor: status.bg,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                width: '100%',
              }}
            >
              {userAnswer || '(Không trả lời)'}
            </div>
          </div>

          <div style={styles.answerRow}>
            <span style={styles.answerLabel}>Loại chấm:</span>
            <span
              style={{
                ...styles.answerValue,
                color: isDarkMode ? '#7dd3fc' : '#075985',
                backgroundColor: isDarkMode ? '#0b1d2e' : '#e0f2fe',
              }}
            >
              Câu tự luận, chấm thủ công
            </span>
          </div>

          {question?.sampleAnswer ? (
            <div style={styles.answerRow}>
              <span style={styles.answerLabel}>Sample answer:</span>
              <div
                style={{
                  ...styles.answerValue,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  width: '100%',
                }}
              >
                {question.sampleAnswer}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <ResultNavbar />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <ResultNavbar />
        <div style={styles.errorContainer}>
          <h2 style={{ margin: 0 }}>{error}</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // No submission
  if (!submission) {
    return (
      <div style={styles.container}>
        <ResultNavbar />
        <div style={styles.errorContainer}>
          <h2 style={{ margin: 0 }}>No result found</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ResultNavbar />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button 
            onClick={() => navigate('/cambridge')} 
            style={styles.backButton}
          >
            Back
          </button>
          <div>
            <h1 style={styles.title}>Orange Test Results</h1>
            <p style={styles.subtitle}>{submission.testTitle || 'Orange Test'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {canViewDetailedReview && (
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' && styles.tabActive)
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('review')}
            style={{
              ...styles.tab,
              ...(activeTab === 'review' && styles.tabActive)
            }}
          >
            Question Review
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div style={styles.overviewGrid}>
            
            {/* Score Card */}
            <div style={styles.scoreCard}>
              <div style={styles.scoreCircle}>
                <div style={styles.scoreValue}>{stats.score}</div>
                <div style={styles.scoreTotal}>/ {stats.total}</div>
              </div>
              <div style={styles.percentageBar}>
                <div 
                  style={{
                    ...styles.percentageFill,
                    width: `${stats.percentage}%`,
                    backgroundColor: stats.grade.color
                  }}
                />
              </div>
              <div style={{ ...styles.gradeLabel, color: stats.grade.color }}>
                {stats.grade.label} - {stats.percentage}%
              </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderLeftColor: '#22c55e' }}>
                <div style={styles.statNumber}>{stats.correct}</div>
                <div style={styles.statLabel}>Correct</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#ef4444' }}>
                <div style={styles.statNumber}>{stats.wrong}</div>
                <div style={styles.statLabel}>Wrong</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#94a3b8' }}>
                <div style={styles.statNumber}>{stats.unanswered}</div>
                <div style={styles.statLabel}>Blank</div>
              </div>
            </div>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>Test Information</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Type:</span>
                  <span style={styles.infoValue}>{submission.testType?.toUpperCase()}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Time Spent:</span>
                  <span style={styles.infoValue}>{formatTime(submission.timeSpent)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Class:</span>
                  <span style={styles.infoValue}>{submission.classCode || '--'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Submitted:</span>
                  <span style={styles.infoValue}>
                    {new Date(submission.submittedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionsCard}>
              {canViewDetailedReview && (
                <button 
                  onClick={() => setActiveTab('review')} 
                  style={styles.primaryButton}
                >
                  Open Question Review
                </button>
              )}
              <button 
                onClick={() => navigate('/cambridge')} 
                style={canViewDetailedReview ? styles.secondaryButton : styles.primaryButton}
              >
                Choose Another Test
              </button>
            </div>
          </div>
        )}

        {/* Review Tab */}
        {canViewDetailedReview && activeTab === 'review' && (
          <div style={styles.reviewContainer}>
            
            {/* Question Summary */}
            <div style={styles.questionSummary}>
              <h3 style={styles.summaryTitle}>Question Summary</h3>
              <div style={styles.questionGrid}>
                {submission.detailedResults && Object.entries(submission.detailedResults).map(([key, result]) => {
                  const questionNum = questionNumberMap[key];
                  if (!questionNum) return null; // Skip non-numbered question (short-message, story-writing...)
                  const label = formatQuestionLabel(questionNum);
                  const status = getResultStatus(result);

                  return (
                    <div
                      key={key}
                      style={{
                        ...styles.questionBadge,
                        backgroundColor: status.bg,
                        color: status.text
                      }}
                      title={status.label}
                    >
                        {label}
                    </div>
                  );
                })}
              </div>
              <div style={styles.legendRow}>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.correct}}></span> Correct</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.wrong}}></span> Wrong</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.blank}}></span> Blank</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.pending}}></span> Pending Review</span>
              </div>
            </div>

            <CambridgeStudentStyleReview
              test={test}
              submission={submission}
            />

            {/* Back to Overview */}
            <div style={styles.reviewActions}>
              <button 
                onClick={() => setActiveTab('overview')} 
                style={styles.secondaryButton}
              >
                Back to Overview
              </button>
              <button 
                onClick={() => navigate('/cambridge')} 
                style={styles.primaryButton}
              >
                Choose Another Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const createStyles = (isDarkMode = false, isCompactLayout = false) => {
  const colors = isDarkMode
    ? {
        pageBg: '#0f172a',
        surface: '#111827',
        surfaceAlt: '#1f2b47',
        text: '#e5e7eb',
        muted: '#94a3b8',
        border: '#2a3350',
        header: '#0b1d2e',
        accent: '#4a90d9',
        shadow: '0 2px 8px rgba(0,0,0,0.35)',
        softShadow: '0 1px 4px rgba(0,0,0,0.35)',
      }
    : {
        pageBg: '#f8fafc',
        surface: '#ffffff',
        surfaceAlt: '#f8fafc',
        text: '#1e293b',
        muted: '#64748b',
        border: '#e5e7eb',
        header: '#0e276f',
        accent: '#0e276f',
        shadow: '0 2px 8px rgba(0,0,0,0.08)',
        softShadow: '0 1px 4px rgba(0,0,0,0.06)',
      };

  return {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.pageBg,
      paddingTop: isCompactLayout ? '52px' : 0,
      boxSizing: 'border-box',
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      color: colors.text,
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `4px solid ${colors.border}`,
      borderTopColor: colors.accent,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    errorContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      gap: '20px',
      color: colors.text,
    },
    header: {
      backgroundColor: colors.header,
      color: 'white',
      padding: isCompactLayout ? '14px 14px 16px' : '20px 24px',
    },
    headerContent: {
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      alignItems: isCompactLayout ? 'flex-start' : 'center',
      flexDirection: isCompactLayout ? 'column' : 'row',
      gap: isCompactLayout ? '12px' : '20px',
    },
    backButton: {
      padding: isCompactLayout ? '7px 12px' : '8px 16px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: isCompactLayout ? '13px' : '14px',
      alignSelf: isCompactLayout ? 'flex-start' : 'auto',
    },
    title: {
      margin: 0,
      fontSize: isCompactLayout ? '20px' : '24px',
      fontWeight: 700,
    },
    subtitle: {
      margin: '4px 0 0',
      opacity: 0.8,
      fontSize: isCompactLayout ? '13px' : '14px',
      wordBreak: 'break-word',
    },
    tabContainer: {
      backgroundColor: colors.pageBg,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 16px',
      display: 'flex',
      gap: '4px',
      maxWidth: '100%',
      margin: '0 auto',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    },
    tab: {
      padding: isCompactLayout ? '14px 12px' : '16px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: isCompactLayout ? '14px' : '15px',
      fontWeight: 500,
      color: colors.muted,
      borderBottom: '3px solid transparent',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap',
      flex: isCompactLayout ? '1 0 auto' : '0 0 auto',
    },
    tabActive: {
      color: colors.accent,
      borderBottomColor: colors.accent,
    },
    mainContent: {
      maxWidth: '100%',
      margin: '0 auto',
      padding: isCompactLayout ? '16px 12px 24px' : '30px 16px',
    },

    // Cloze-test (Part 5) passage styles
    clozePassageTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: colors.text,
      margin: '12px 0 10px',
    },
    clozePassageCard: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: colors.softShadow,
    },
    clozePassageBody: {
      fontSize: '16px',
      lineHeight: 1.9,
      color: colors.text,
      wordBreak: 'break-word',
    },
    clozeBlankPill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 10px',
      margin: '0 4px',
      borderRadius: '999px',
      border: `2px solid ${colors.border}`,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      verticalAlign: 'baseline',
    },
    clozeBlankNum: {
      fontSize: '13px',
      fontWeight: 800,
      opacity: 0.9,
    },
    clozeBlankAns: {
      fontSize: '14px',
      fontWeight: 700,
    },
    clozeAnswerGrid: {
      marginTop: '14px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '10px',
    },
    clozeAnswerItem: {
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      borderLeft: `6px solid ${colors.border}`,
      padding: '10px 12px',
    },
    clozeAnswerItemHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      marginBottom: '8px',
    },
    clozeAnswerNum: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '34px',
      height: '26px',
      borderRadius: '999px',
      fontSize: '13px',
      fontWeight: 800,
    },
    clozeAnswerStatus: {
      fontSize: '13px',
      fontWeight: 600,
      color: colors.muted,
    },
    clozeAnswerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      marginTop: '6px',
    },
    
    // Overview styles
    overviewGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: isCompactLayout ? '16px' : '24px',
    },
    scoreCard: {
      backgroundColor: colors.surface,
      borderRadius: '16px',
      padding: isCompactLayout ? '20px 16px' : '32px',
      textAlign: 'center',
      boxShadow: colors.shadow,
    },
    scoreCircle: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '20px',
    },
    scoreValue: {
      fontSize: isCompactLayout ? '48px' : '64px',
      fontWeight: 700,
      color: colors.accent,
    },
    scoreTotal: {
      fontSize: isCompactLayout ? '22px' : '28px',
      color: colors.muted,
    },
    percentageBar: {
      height: '12px',
      backgroundColor: colors.border,
      borderRadius: '6px',
      overflow: 'hidden',
      marginBottom: '16px',
    },
    percentageFill: {
      height: '100%',
      borderRadius: '6px',
      transition: 'width 0.5s ease-out',
    },
    gradeLabel: {
      fontSize: isCompactLayout ? '16px' : '20px',
      fontWeight: 600,
      color: colors.text,
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: isCompactLayout ? '8px' : '16px',
      alignItems: 'stretch',
    },
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: isCompactLayout ? '12px 8px' : '20px',
      textAlign: 'center',
      boxShadow: colors.shadow,
      borderLeftStyle: 'solid',
      borderLeftWidth: isCompactLayout ? '3px' : '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isCompactLayout ? '112px' : '136px',
    },
    statIcon: {
      fontSize: isCompactLayout ? '18px' : '24px',
      marginBottom: isCompactLayout ? '6px' : '8px',
    },
    statNumber: {
      fontSize: isCompactLayout ? '22px' : '32px',
      fontWeight: 700,
      color: colors.text,
      lineHeight: 1.1,
    },
    statLabel: {
      fontSize: isCompactLayout ? '12px' : '14px',
      color: colors.muted,
      marginTop: '4px',
      lineHeight: 1.3,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: isCompactLayout ? '18px 14px' : '24px',
      boxShadow: colors.shadow,
    },
    infoTitle: {
      margin: '0 0 16px',
      fontSize: '18px',
      color: colors.text,
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(2, 1fr)',
      gap: isCompactLayout ? '12px' : '16px',
    },
    infoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px',
      backgroundColor: colors.surfaceAlt,
      borderRadius: '8px',
    },
    infoLabel: {
      color: colors.muted,
      fontSize: '14px',
    },
    infoValue: {
      fontWeight: 600,
      color: colors.text,
    },
    actionsCard: {
      display: 'flex',
      gap: isCompactLayout ? '10px' : '16px',
      flexDirection: isCompactLayout ? 'column' : 'row',
      justifyContent: 'center',
    },

    // Review styles
    reviewContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    questionSummary: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: colors.shadow,
    },
    summaryTitle: {
      margin: '0 0 16px',
      fontSize: '18px',
      color: colors.text,
    },
    questionGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    },
    questionBadge: {
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '14px',
    },
    legendRow: {
      display: 'flex',
      gap: '24px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${colors.border}`,
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: colors.muted,
    },
    legendDot: {
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      border: `1px solid ${colors.border}`,
    },
    reviewToggleCard: {
      display: 'flex',
      alignItems: isCompactLayout ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: isCompactLayout ? '12px' : '16px',
      flexDirection: isCompactLayout ? 'column' : 'row',
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: isCompactLayout ? '16px 14px' : '18px 20px',
      boxShadow: colors.shadow,
    },
    reviewToggleTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: colors.text,
      marginBottom: '4px',
    },
    reviewToggleText: {
      fontSize: '14px',
      lineHeight: 1.6,
      color: colors.muted,
      maxWidth: isCompactLayout ? '100%' : '680px',
    },
    partCard: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      boxShadow: colors.shadow,
      overflow: 'hidden',
    },
    partHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      backgroundColor: colors.surfaceAlt,
      cursor: 'pointer',
      borderBottom: `1px solid ${colors.border}`,
    },
    partTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: colors.text,
    },
    expandIcon: {
      color: colors.muted,
      fontSize: '12px',
    },
    partContent: {
      padding: '20px',
    },
    sectionBlock: {
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: colors.muted,
      marginBottom: '12px',
      padding: '8px 12px',
      backgroundColor: colors.surfaceAlt,
      borderRadius: '6px',
    },
    questionReviewCard: {
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: colors.surfaceAlt,
      borderRadius: '8px',
      borderLeft: '4px solid',
    },
    questionReviewHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    },
    questionNum: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      color: 'white',
      fontWeight: 600,
      fontSize: '13px',
    },
    questionStatus: {
      fontSize: '14px',
      fontWeight: 600,
      color: colors.text,
    },
    questionText: {
      fontSize: '15px',
      color: colors.text,
      marginBottom: '12px',
      lineHeight: 1.5,
    },
    answersCompare: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    answerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    answerLabel: {
      fontSize: '13px',
      color: colors.muted,
      minWidth: '140px',
    },
    answerValue: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
    },
    optionsList: {
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      borderRadius: '6px',
      border: `1px solid ${colors.border}`,
      fontSize: '14px',
      color: colors.text,
    },
    optionLabel: {
      fontWeight: 600,
      color: colors.muted,
    },
    correctMark: {
      marginLeft: 'auto',
      color: '#22c55e',
      fontWeight: 700,
    },
    wrongMark: {
      marginLeft: 'auto',
      color: '#ef4444',
      fontWeight: 700,
    },
    reviewActions: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      marginTop: '24px',
    },

    // Buttons
    primaryButton: {
      padding: '14px 28px',
      backgroundColor: '#0e276f',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '15px',
      transition: 'all 0.2s',
    },
    secondaryButton: {
      padding: '14px 28px',
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '15px',
      transition: 'all 0.2s',
    },
  };
};

export default CambridgeResultPage;

