import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";
import { StudentNavbar } from "../../../shared/components";
import { useTheme } from "../../../shared/contexts/ThemeContext";

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
  const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);
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
        ? { label: '⏳ Chờ chấm', color: '#38bdf8', bg: '#0b1d2e', text: '#7dd3fc' }
        : { label: '⏳ Chờ chấm', color: '#0ea5e9', bg: '#e0f2fe', text: '#075985' };
    }
    if (result?.isCorrect === true) {
      return isDarkMode
        ? { label: '✓ Đúng', color: '#22c55e', bg: '#0f2a1a', text: '#a7f3d0' }
        : { label: '✓ Đúng', color: '#22c55e', bg: '#dcfce7', text: '#166534' };
    }
    if (isUnanswered) {
      return isDarkMode
        ? { label: '○ Bỏ trống', color: '#94a3b8', bg: '#1f2b47', text: '#94a3b8' }
        : { label: '○ Bỏ trống', color: '#94a3b8', bg: '#f1f5f9', text: '#64748b' };
    }
    return isDarkMode
      ? { label: '✕ Sai', color: '#ef4444', bg: '#2a1515', text: '#fecaca' }
      : { label: '✕ Sai', color: '#ef4444', bg: '#fee2e2', text: '#991b1b' };
  };

  const canShowCorrectAnswer = (result) => {
    if (!result || typeof result !== 'object') return false;
    if (result.isCorrect === null) return false; // pending grading (writing)
    const ca = result.correctAnswer;
    return ca !== undefined && ca !== null && String(ca).trim() !== '';
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

    return normalized;
  };

  // State from navigation (if available) or fetch from API
  const [submission, setSubmission] = useState(() => normalizeSubmission(location.state?.submission) || null);
  const [test, setTest] = useState(location.state?.test || null);
  const [loading, setLoading] = useState(!location.state?.submission);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, review
  const [expandedParts, setExpandedParts] = useState({});
  const lastFetchedTestKeyRef = useRef(null);

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

  // Fetch submission data only once per submissionId (avoid refetch loops)
  useEffect(() => {
    const navSubmission = location.state?.submission;
    if (navSubmission) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), { signal: controller.signal });
        if (!res.ok) throw new Error("Không tìm thấy kết quả");
        const data = await res.json();
        if (!cancelled) setSubmission(normalizeSubmission(data));
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'AbortError') return;
        console.error("Error fetching submission:", err);
        setError(err.message || 'Lỗi khi tải kết quả');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submissionId, location.state?.submission]);

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

          // short-message / story-writing: free writing, không đánh số
          if (sectionType === 'short-message' || sectionType === 'story-writing') return;

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
    if (percentage >= 90) return { label: 'Xuất sắc', color: '#22c55e', icon: '🏆' };
    if (percentage >= 80) return { label: 'Giỏi', color: '#3b82f6', icon: '⭐' };
    if (percentage >= 70) return { label: 'Khá', color: '#8b5cf6', icon: '👍' };
    if (percentage >= 60) return { label: 'Trung bình', color: '#f59e0b', icon: '📝' };
    if (percentage >= 50) return { label: 'Đạt', color: '#f97316', icon: '✓' };
    return { label: 'Cần cố gắng', color: '#ef4444', icon: '💪' };
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
      const title = `${label} ${status.label}\nBạn: ${userAnswer || '(Không trả lời)'}${canShowCorrectAnswer(result) ? `\nĐúng: ${correctAnswer}` : ''}`;

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

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.errorContainer}>
          <h2>❌ {error}</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  // No submission
  if (!submission) {
    return (
      <div style={styles.container}>
        <StudentNavbar />
        <div style={styles.errorContainer}>
          <h2>Không tìm thấy kết quả</h2>
          <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <StudentNavbar />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button 
            onClick={() => navigate('/cambridge')} 
            style={styles.backButton}
          >
            ← Quay lại
          </button>
          <div>
            <h1 style={styles.title}>📊 Kết quả bài thi</h1>
            <p style={styles.subtitle}>{submission.testTitle || 'Cambridge Test'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' && styles.tabActive)
          }}
        >
          📈 Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('review')}
          style={{
            ...styles.tab,
            ...(activeTab === 'review' && styles.tabActive)
          }}
        >
          📝 Chi tiết từng câu
        </button>
      </div>

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
                {stats.grade.icon} {stats.grade.label} - {stats.percentage}%
              </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderLeftColor: '#22c55e' }}>
                <div style={styles.statIcon}>✓</div>
                <div style={styles.statNumber}>{stats.correct}</div>
                <div style={styles.statLabel}>Đúng</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#ef4444' }}>
                <div style={styles.statIcon}>✕</div>
                <div style={styles.statNumber}>{stats.wrong}</div>
                <div style={styles.statLabel}>Sai</div>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#94a3b8' }}>
                <div style={styles.statIcon}>○</div>
                <div style={styles.statNumber}>{stats.unanswered}</div>
                <div style={styles.statLabel}>Bỏ trống</div>
              </div>
            </div>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>📋 Thông tin bài thi</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Loại bài:</span>
                  <span style={styles.infoValue}>{submission.testType?.toUpperCase()}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Thời gian làm:</span>
                  <span style={styles.infoValue}>{formatTime(submission.timeSpent)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Lớp:</span>
                  <span style={styles.infoValue}>{submission.classCode || '--'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Ngày nộp:</span>
                  <span style={styles.infoValue}>
                    {new Date(submission.submittedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionsCard}>
              <button 
                onClick={() => setActiveTab('review')} 
                style={styles.primaryButton}
              >
                📝 Xem chi tiết từng câu
              </button>
              <button 
                onClick={() => navigate('/cambridge')} 
                style={styles.secondaryButton}
              >
                📋 Chọn đề khác
              </button>
            </div>
          </div>
        )}

        {/* Review Tab */}
        {activeTab === 'review' && (
          <div style={styles.reviewContainer}>
            
            {/* Question Summary */}
            <div style={styles.questionSummary}>
              <h3 style={styles.summaryTitle}>Tóm tắt kết quả</h3>
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
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.correct}}></span> Đúng</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.wrong}}></span> Sai</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.blank}}></span> Bỏ trống</span>
                <span style={styles.legendItem}><span style={{...styles.legendDot, backgroundColor: legendColors.pending}}></span> Chờ chấm</span>
              </div>
            </div>

            {/* Detailed Review by Part */}
            {test?.parts?.map((part, partIdx) => (
              <div key={partIdx} style={styles.partCard}>
                <div 
                  style={styles.partHeader}
                  onClick={() => togglePart(partIdx)}
                >
                  <div style={styles.partTitle}>
                    📖 {part.partTitle || `Part ${partIdx + 1}`}
                  </div>
                  <span style={styles.expandIcon}>
                    {expandedParts[partIdx] ? '▼' : '▶'}
                  </span>
                </div>

                {expandedParts[partIdx] && (
                  <div style={styles.partContent}>
                    {part.sections?.map((section, secIdx) => {
                      const sectionType = getSectionType(section);
                      return (
                      <div key={secIdx} style={styles.sectionBlock}>
                        {section.sectionTitle && (
                          <div style={styles.sectionTitle}>{section.sectionTitle}</div>
                        )}
                        
                        {section.questions?.map((question, qIdx) => {
                          // Handle long-text-mc with nested questions
                          if (sectionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {question.questions.map((nestedQ, nestedIdx) => {
                                  const key = `${partIdx}-${secIdx}-${qIdx}-${nestedIdx}`;
                                  const result = getDetailedResult(key, `${partIdx}-${secIdx}-${nestedIdx}`) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                  const status = getResultStatus(result);

                                  return (
                                    <div 
                                      key={`${qIdx}-${nestedIdx}`}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: status.color
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: status.color
                                        }}>
                                          {label}
                                        </span>
                                        <span style={styles.questionStatus}>
                                          {status.label}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.questionText}>
                                        {nestedQ.questionText || 'Question'}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: status.text,
                                            backgroundColor: status.bg
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer(result) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                              {result.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Handle people-matching
                          else if (sectionType === 'people-matching' && Array.isArray(question.people)) {
                            const people = question.people || [];
                            const correctMap = question.answers && typeof question.answers === 'object' ? question.answers : {};
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {people.map((person, personIdx) => {
                                  const pid = person?.id || String.fromCharCode(65 + personIdx);
                                  const key = `${partIdx}-${secIdx}-${qIdx}-${pid}`;
                                  const result = getDetailedResult(key, `${partIdx}-${secIdx}-${pid}`) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                  const status = getResultStatus(result);
                                  const correctAnswer = correctMap?.[pid] ?? result.correctAnswer;

                                  return (
                                    <div
                                      key={key}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: status.color,
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: status.color
                                        }}>
                                          {label}
                                        </span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>

                                      <div style={styles.questionText}>
                                        {person?.name ? `${pid}. ${person.name}` : `Person ${pid}`}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: status.text,
                                            backgroundColor: status.bg
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer({ ...result, correctAnswer }) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                              {correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Handle gap-match (drag & drop matching)
                          else if (sectionType === 'gap-match' && Array.isArray(question.leftItems)) {
                            const leftItems = question.leftItems || [];
                            const correctList = Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {leftItems.map((item, itemIdx) => {
                                  const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
                                  const result = getDetailedResult(key, `${partIdx}-${secIdx}-${itemIdx}`) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                  const status = getResultStatus(result);
                                  const correctAnswer = correctList[itemIdx] ?? result.correctAnswer;

                                  return (
                                    <div
                                      key={key}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: status.color
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: status.color
                                        }}>
                                          {label}
                                        </span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>

                                      <div style={styles.questionText}>
                                        {item || 'Question'}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: status.text,
                                            backgroundColor: status.bg
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer({ ...result, correctAnswer }) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                              {correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Handle cloze-test: show full passage with inline blanks
                          else if (sectionType === 'cloze-test') {
                            const passageText = question.passageText || question.passage || '';
                            const firstKey = `${partIdx}-${secIdx}-${qIdx}-0`;
                            const startNum = Number(questionNumberMap[firstKey]) || 1;
                            const derivedBlanks = Array.isArray(question?.blanks) && question.blanks.length > 0
                              ? question.blanks
                              : parseClozeBlanks(passageText, startNum);
                            const rendered = renderClozeTestPassageWithResults({
                              passageText,
                              blanks: derivedBlanks,
                              partIdx,
                              secIdx,
                              qIdx,
                            });

                            // Fallback to old per-blank cards if passage can't be rendered
                            if (!rendered && derivedBlanks && Array.isArray(derivedBlanks)) {
                              return (
                                <React.Fragment key={`section-${qIdx}`}>
                                  {derivedBlanks.map((blank, blankIdx) => {
                                    const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
                                    const result = getDetailedResult(key, `${partIdx}-${secIdx}-${blankIdx}`) || {};
                                    const questionNum = questionNumberMap[key];
                                    const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                    const status = getResultStatus(result);

                                    return (
                                      <div
                                        key={`${qIdx}-${blankIdx}`}
                                        style={{
                                          ...styles.questionReviewCard,
                                          borderLeftColor: status.color
                                        }}
                                      >
                                        <div style={styles.questionReviewHeader}>
                                          <span style={{
                                            ...styles.questionNum,
                                            backgroundColor: status.color
                                          }}>
                                            {label}
                                          </span>
                                          <span style={styles.questionStatus}>
                                            {status.label}
                                          </span>
                                        </div>

                                        <div style={styles.questionText}>
                                          {blank.questionText || 'Question'}
                                        </div>

                                        <div style={styles.answersCompare}>
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                            <span style={{
                                              ...styles.answerValue,
                                              color: status.text,
                                              backgroundColor: status.bg
                                            }}>
                                              {result.userAnswer || '(Không trả lời)'}
                                            </span>
                                          </div>
                                          {canShowCorrectAnswer(result) && (
                                            <div style={styles.answerRow}>
                                              <span style={styles.answerLabel}>Đáp án đúng:</span>
                                              <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                                {result.correctAnswer}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            }

                            return (
                              <div key={qIdx}>
                                {question.passageTitle && (
                                  <div style={styles.clozePassageTitle}>{question.passageTitle}</div>
                                )}
                                {rendered}
                              </div>
                            );
                          }
                          // Handle inline-choice (PET Part 5)
                          else if (sectionType === 'inline-choice' &&
                                   question.blanks && Array.isArray(question.blanks)) {
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {question.blanks.map((blank, blankIdx) => {
                                  const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
                                  const result = getDetailedResult(key, `${partIdx}-${secIdx}-${blankIdx}`) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                  const status = getResultStatus(result);
                                  const correctAnswer = blank.correctAnswer || result.correctAnswer;

                                  return (
                                    <div
                                      key={`${qIdx}-${blankIdx}`}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: status.color
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: status.color
                                        }}>
                                          {label}
                                        </span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>

                                      <div style={styles.questionText}>
                                        Inline choice
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Cau tra loi cua ban:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: status.text,
                                            backgroundColor: status.bg
                                          }}>
                                            {result.userAnswer || '(Khong tra loi)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer({ ...result, correctAnswer }) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Dap an dung:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                              {correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // Handle cloze-mc and cloze-test with blanks
                          else if (sectionType === 'cloze-mc' && 
                                   question.blanks && Array.isArray(question.blanks)) {
                            return (
                              <React.Fragment key={`section-${qIdx}`}>
                                {question.blanks.map((blank, blankIdx) => {
                                  const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
                                  const result = getDetailedResult(key, `${partIdx}-${secIdx}-${blankIdx}`) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                                  const status = getResultStatus(result);

                                  return (
                                    <div 
                                      key={`${qIdx}-${blankIdx}`}
                                      style={{
                                        ...styles.questionReviewCard,
                                        borderLeftColor: status.color
                                      }}
                                    >
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{
                                          ...styles.questionNum,
                                          backgroundColor: status.color
                                        }}>
                                          {label}
                                        </span>
                                        <span style={styles.questionStatus}>
                                          {status.label}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.questionText}>
                                        {blank.questionText || 'Question'}
                                      </div>

                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{
                                            ...styles.answerValue,
                                            color: status.text,
                                            backgroundColor: status.bg
                                          }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer(result) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>
                                              {result.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // matching-pictures: key = {partIdx}-{secIdx}-{promptId}
                          else if (sectionType === 'matching-pictures' && Array.isArray(question.prompts)) {
                            return (
                              <React.Fragment key={`mp-${qIdx}`}>
                                {question.prompts.map((prompt) => {
                                  const promptId = String(prompt.id || prompt.number || 0);
                                  const key = `${partIdx}-${secIdx}-${promptId}`;
                                  const result = getDetailedResult(key) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : promptId;
                                  const status = getResultStatus(result);
                                  const choiceWord = result.userAnswer && Array.isArray(question.choices)
                                    ? (question.choices.find(c => c.id === result.userAnswer)?.label || result.userAnswer)
                                    : (result.userAnswer || '');
                                  const correctWord = result.correctAnswer && Array.isArray(question.choices)
                                    ? (question.choices.find(c => c.id === result.correctAnswer)?.label || result.correctAnswer)
                                    : result.correctAnswer;
                                  return (
                                    <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>
                                      <div style={styles.questionText}>{prompt.text || `Prompt ${prompt.number}`}</div>
                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>
                                            {choiceWord || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer({ ...result, correctAnswer: correctWord || result.correctAnswer }) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{correctWord || result.correctAnswer}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // image-cloze: keys = {partIdx}-{secIdx}-blank-{blankNum} + -title
                          else if (sectionType === 'image-cloze') {
                            const passageText = question.passageText || '';
                            const imageBank = Array.isArray(question.imageBank) ? question.imageBank : [];
                            const cards = [];
                            const blankNums = [];
                            { const blankRe = /\(\s*(\d+)\s*\)/g; let bm; while ((bm = blankRe.exec(passageText)) !== null) blankNums.push(parseInt(bm[1], 10)); }
                            blankNums.forEach((qNum) => {
                                const key = `${partIdx}-${secIdx}-blank-${qNum}`;
                                const result = getDetailedResult(key) || {};
                                const qN = questionNumberMap[key];
                                const label = qN ? formatQuestionLabel(qN) : String(qNum);
                                const status = getResultStatus(result);
                                const resolveWord = (id) => id ? (imageBank.find(b => b.id === id)?.word || id) : id;
                                const displayUser = resolveWord(result.userAnswer) || result.userAnswer || '';
                                cards.push(
                                  <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                    <div style={styles.questionReviewHeader}>
                                      <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                      <span style={styles.questionStatus}>{status.label}</span>
                                    </div>
                                    <div style={styles.questionText}>{`Câu (${qNum})`}</div>
                                    <div style={styles.answersCompare}>
                                      <div style={styles.answerRow}>
                                        <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                        <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>{displayUser || '(Không trả lời)'}</span>
                                      </div>
                                      {canShowCorrectAnswer(result) && (
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Đáp án đúng:</span>
                                          <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{result.correctAnswer}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            if (question.titleQuestion?.enabled) {
                              const key = `${partIdx}-${secIdx}-title`;
                              const result = getDetailedResult(key) || {};
                              const qN = questionNumberMap[key];
                              const label = qN ? formatQuestionLabel(qN) : '?';
                              const status = getResultStatus(result);
                              cards.push(
                                <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                  <div style={styles.questionReviewHeader}>
                                    <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                    <span style={styles.questionStatus}>{status.label}</span>
                                  </div>
                                  <div style={styles.questionText}>{question.titleQuestion.text || 'Best name for the story'}</div>
                                  <div style={styles.answersCompare}>
                                    <div style={styles.answerRow}>
                                      <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                      <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>{result.userAnswer || '(Không trả lời)'}</span>
                                    </div>
                                    {canShowCorrectAnswer(result) && (
                                      <div style={styles.answerRow}>
                                        <span style={styles.answerLabel}>Đáp án đúng:</span>
                                        <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{result.correctAnswer}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return <React.Fragment key={`ic-${qIdx}`}>{cards}</React.Fragment>;
                          }
                          // word-drag-cloze: key = {partIdx}-{secIdx}-blank-{blank.number}
                          else if (sectionType === 'word-drag-cloze' && Array.isArray(question.blanks)) {
                            return (
                              <React.Fragment key={`wdc-${qIdx}`}>
                                {question.blanks.map((blank) => {
                                  const key = `${partIdx}-${secIdx}-blank-${blank.number}`;
                                  const result = getDetailedResult(key) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : String(blank.number || '?');
                                  const status = getResultStatus(result);
                                  return (
                                    <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>
                                      <div style={styles.questionText}>{blank.questionText || `Blank ${blank.number}`}</div>
                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer(result) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{result.correctAnswer}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // story-completion: key = {partIdx}-{secIdx}-item-{itemIdx+1}
                          else if (sectionType === 'story-completion' && Array.isArray(question.items)) {
                            return (
                              <React.Fragment key={`story-${qIdx}`}>
                                {question.items.map((item, itemIdx) => {
                                  const key = `${partIdx}-${secIdx}-item-${itemIdx + 1}`;
                                  const result = getDetailedResult(key) || {};
                                  const questionNum = questionNumberMap[key];
                                  const label = questionNum ? formatQuestionLabel(questionNum) : String(itemIdx + 1);
                                  const status = getResultStatus(result);
                                  return (
                                    <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                      <div style={styles.questionReviewHeader}>
                                        <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                        <span style={styles.questionStatus}>{status.label}</span>
                                      </div>
                                      <div style={styles.questionText}>{item.sentence || item.questionText || `Item ${itemIdx + 1}`}</div>
                                      <div style={styles.answersCompare}>
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                          <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>
                                            {result.userAnswer || '(Không trả lời)'}
                                          </span>
                                        </div>
                                        {canShowCorrectAnswer(result) && (
                                          <div style={styles.answerRow}>
                                            <span style={styles.answerLabel}>Đáp án đúng:</span>
                                            <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{result.correctAnswer}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                          // look-read-write: key = {partIdx}-{secIdx}-g{groupIdx}-item{itemIdx}
                          else if (sectionType === 'look-read-write' && Array.isArray(question.groups)) {
                            const lrwCards = [];
                            question.groups.forEach((group, groupIdx) => {
                              (group.items || []).forEach((item, itemIdx) => {
                                const key = `${partIdx}-${secIdx}-g${groupIdx}-item${itemIdx}`;
                                const result = getDetailedResult(key) || {};
                                const questionNum = questionNumberMap[key];
                                const label = questionNum ? formatQuestionLabel(questionNum) : `${groupIdx + 1}.${itemIdx + 1}`;
                                const status = getResultStatus(result);
                                lrwCards.push(
                                  <div key={key} style={{ ...styles.questionReviewCard, borderLeftColor: status.color }}>
                                    <div style={styles.questionReviewHeader}>
                                      <span style={{ ...styles.questionNum, backgroundColor: status.color }}>{label}</span>
                                      <span style={styles.questionStatus}>{status.label}</span>
                                    </div>
                                    <div style={styles.questionText}>{item.sentence || item.questionText || `Group ${groupIdx + 1} item ${itemIdx + 1}`}</div>
                                    <div style={styles.answersCompare}>
                                      <div style={styles.answerRow}>
                                        <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                        <span style={{ ...styles.answerValue, color: status.text, backgroundColor: status.bg }}>
                                          {result.userAnswer || '(Không trả lời)'}
                                        </span>
                                      </div>
                                      {canShowCorrectAnswer(result) && (
                                        <div style={styles.answerRow}>
                                          <span style={styles.answerLabel}>Đáp án đúng:</span>
                                          <span style={{ ...styles.answerValue, ...correctAnswerStyle }}>{result.correctAnswer}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            });
                            return <React.Fragment key={`lrw-${qIdx}`}>{lrwCards}</React.Fragment>;
                          }
                          // short-message / story-writing: hiển thị nhãn "Free writing", không chấm điểm
                          else if (sectionType === 'short-message' || sectionType === 'story-writing') {
                            return null;
                          }
                          // Regular questions
                          else {
                            const key = `${partIdx}-${secIdx}-${qIdx}`;
                            const result = getDetailedResult(key) || {};
                            const questionNum = questionNumberMap[key];
                            const label = questionNum ? formatQuestionLabel(questionNum) : '?';
                            const status = getResultStatus(result);

                            return (
                              <div 
                                key={qIdx} 
                                style={{
                                  ...styles.questionReviewCard,
                                  borderLeftColor: status.color
                                }}
                              >
                                <div style={styles.questionReviewHeader}>
                                  <span style={{
                                    ...styles.questionNum,
                                    backgroundColor: status.color
                                  }}>
                                    {label}
                                  </span>
                                  <span style={styles.questionStatus}>
                                    {status.label}
                                  </span>
                                </div>
                                
                                <div style={styles.questionText}>
                                  {question.questionText || 'Question'}
                                </div>

                                <div style={styles.answersCompare}>
                                  <div style={styles.answerRow}>
                                    <span style={styles.answerLabel}>Câu trả lời của bạn:</span>
                                    <span style={{
                                      ...styles.answerValue,
                                      color: status.text,
                                      backgroundColor: status.bg
                                    }}>
                                      {result.userAnswer || '(Không trả lời)'}
                                    </span>
                                  </div>
                                  {canShowCorrectAnswer(result) && (
                                    <div style={styles.answerRow}>
                                      <span style={styles.answerLabel}>Đáp án đúng:</span>
                                      <span style={{
                                        ...styles.answerValue,
                                        color: '#166534',
                                        backgroundColor: '#dcfce7'
                                      }}>
                                        {result.correctAnswer}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Show options for multiple choice */}
                                {(question.questionType === 'abc' || question.questionType === 'abcd') && question.options && (
                                  <div style={styles.optionsList}>
                                    {question.options.map((opt, optIdx) => {
                                      const optLabel = String.fromCharCode(65 + optIdx);
                                      const isSelected = result.userAnswer === optLabel;
                                      const isCorrectOpt = result.correctAnswer === optLabel;
                                      
                                      return (
                                        <div 
                                          key={optIdx}
                                          style={{
                                            ...styles.optionItem,
                                              backgroundColor: isCorrectOpt
                                                ? (isDarkMode ? '#0f2a1a' : '#dcfce7')
                                                : (isSelected && !isCorrectOpt)
                                                  ? (isDarkMode ? '#2a1515' : '#fee2e2')
                                                  : (isDarkMode ? '#111827' : '#f8fafc'),
                                              borderColor: isCorrectOpt
                                                ? '#22c55e'
                                                : (isSelected && !isCorrectOpt)
                                                  ? '#ef4444'
                                                  : (isDarkMode ? '#2a3350' : '#e5e7eb')
                                          }}
                                        >
                                          <span style={styles.optionLabel}>{optLabel}.</span>
                                          <span>{opt}</span>
                                          {isCorrectOpt && <span style={styles.correctMark}>✓</span>}
                                          {isSelected && !isCorrectOpt && <span style={styles.wrongMark}>✕</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Back to Overview */}
            <div style={styles.reviewActions}>
              <button 
                onClick={() => setActiveTab('overview')} 
                style={styles.secondaryButton}
              >
                ← Quay lại tổng quan
              </button>
              <button 
                onClick={() => navigate('/cambridge')} 
                style={styles.primaryButton}
              >
                📋 Chọn đề khác
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
const createStyles = (isDarkMode = false) => {
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
      padding: '20px 24px',
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    title: {
      margin: 0,
      fontSize: '24px',
      fontWeight: 700,
    },
    subtitle: {
      margin: '4px 0 0',
      opacity: 0.8,
      fontSize: '14px',
    },
    tabContainer: {
      backgroundColor: colors.pageBg,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 24px',
      display: 'flex',
      gap: '4px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    tab: {
      padding: '16px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: 500,
      color: colors.muted,
      borderBottom: '3px solid transparent',
      transition: 'all 0.2s',
    },
    tabActive: {
      color: colors.accent,
      borderBottomColor: colors.accent,
    },
    mainContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
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
      gap: '24px',
    },
    scoreCard: {
      backgroundColor: colors.surface,
      borderRadius: '16px',
      padding: '32px',
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
      fontSize: '64px',
      fontWeight: 700,
      color: colors.accent,
    },
    scoreTotal: {
      fontSize: '28px',
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
      fontSize: '20px',
      fontWeight: 600,
      color: colors.text,
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
    },
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: colors.shadow,
      borderLeft: '4px solid',
    },
    statIcon: {
      fontSize: '24px',
      marginBottom: '8px',
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: 700,
      color: colors.text,
    },
    statLabel: {
      fontSize: '14px',
      color: colors.muted,
      marginTop: '4px',
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: colors.shadow,
    },
    infoTitle: {
      margin: '0 0 16px',
      fontSize: '18px',
      color: colors.text,
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
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
      gap: '16px',
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
