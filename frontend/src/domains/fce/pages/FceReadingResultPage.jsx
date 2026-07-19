import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import { apiPath } from '../../../shared/utils/api';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import CambridgeStudentStyleReview from '../../cambridge/shared/components/CambridgeStudentStyleReview';
import { parseClozeBlanksFromText } from '../../cambridge/shared/utils/questionNumbering';

const hasOwnKeys = (value) => (
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
);

const parseJsonIfString = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

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

  const normalized = {
    ...raw,
    answers: parseJsonIfString(raw.answers),
    detailedResults: parseJsonIfString(raw.detailedResults),
    breakdown: parseJsonIfString(raw.breakdown),
  };

  if (!hasOwnKeys(normalized.answers) && hasOwnKeys(normalized.detailedResults)) {
    normalized.answers = rebuildAnswersFromDetailedResults(normalized.detailedResults);
  }

  return normalized;
};

const getStructuredSectionPrimaryQuestionIndex = (section) => {
  const sectionQuestions = Array.isArray(section?.questions) ? section.questions : [];
  if (sectionQuestions.length <= 1) return 0;

  if (section?.questionType === 'long-text-mc') {
    const matchIndex = sectionQuestions.findIndex(
      (question) => Array.isArray(question?.questions) && question.questions.length > 0
    );
    return matchIndex >= 0 ? matchIndex : 0;
  }

  if (section?.questionType === 'cloze-test') {
    const matchIndex = sectionQuestions.findIndex((question) => {
      if (Array.isArray(question?.blanks) && question.blanks.length > 0) return true;
      return Boolean(String(question?.passageText || question?.passage || question?.clozeText || '').trim());
    });
    return matchIndex >= 0 ? matchIndex : 0;
  }

  return 0;
};

const getClozeQuestionNumbersFromText = (text) => {
  const numbers = [];
  const seen = new Set();
  const regex = /\((\d+)\)\s*(?:[_…]+)?|\[(\d+)\]\s*(?:[_…]+)?/g;
  let match;

  while ((match = regex.exec(String(text || ''))) !== null) {
    const questionNum = Number(match[1] || match[2]);
    if (Number.isFinite(questionNum) && questionNum > 0 && !seen.has(questionNum)) {
      seen.add(questionNum);
      numbers.push(questionNum);
    }
  }

  return numbers;
};

const normalizeClozeTestBlanks = (question, fallbackStart) => {
  const passageText = question?.passageText || question?.passage || question?.clozeText || '';
  const passageNumbers = getClozeQuestionNumbersFromText(passageText);
  const rawBlanks = Array.isArray(question?.blanks) ? question.blanks : [];
  const rawBlankNumbers = new Set(
    rawBlanks
      .map((blank) => Number(blank?.questionNum || blank?.number))
      .filter((questionNum) => Number.isFinite(questionNum) && questionNum > 0)
  );
  const rawBlanksMatchPassage = passageNumbers.some((questionNum) => rawBlankNumbers.has(questionNum));

  if (passageNumbers.length > 0 && (!rawBlanks.length || !rawBlanksMatchPassage)) {
    return passageNumbers.map((questionNum) => ({ questionNum }));
  }

  if (rawBlanks.length > 0) return rawBlanks;

  if (question?.answers && !Array.isArray(question.answers)) {
    const answerNumbers = Object.keys(question.answers)
      .map((questionNum) => Number(questionNum))
      .filter((questionNum) => Number.isFinite(questionNum) && questionNum > 0)
      .sort((left, right) => left - right);
    if (answerNumbers.length > 0) {
      return answerNumbers.map((questionNum) => ({ questionNum }));
    }
  }

  return parseClozeBlanksFromText(passageText, fallbackStart);
};

const resolveExplicitQuestionNumber = (entry) => {
  const sectionType = entry?.section?.questionType;
  const ignoreItemNumber =
    sectionType === 'preposition-gap-fill' ||
    sectionType === 'odd-one-out' ||
    sectionType === 'sentence-correction' ||
    sectionType === 'reading-open-questions' ||
    sectionType === 'matching';

  const candidates = [
    entry?.blank?.questionNum,
    entry?.blank?.number,
    entry?.nestedQuestion?.questionNumber,
    entry?.nestedQuestion?.number,
    ...(ignoreItemNumber ? [] : [entry?.item?.questionNumber, entry?.item?.number]),
    entry?.question?.questionNumber,
    entry?.question?.number,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const buildFceReadingQuestionEntries = (parts = []) => {
  const questions = [];
  let qNum = 1;

  parts.forEach((part, partIdx) => {
    (part.sections || []).forEach((section, secIdx) => {
      (section.questions || []).forEach((question, qIdx) => {
        const shouldRestrictToPrimaryStructuredQuestion =
          section.questionType === 'long-text-mc' ||
          section.questionType === 'cloze-test' ||
          section.questionType === 'preposition-gap-fill' ||
          section.questionType === 'odd-one-out' ||
          section.questionType === 'sentence-correction' ||
          section.questionType === 'reading-open-questions';

        if (
          shouldRestrictToPrimaryStructuredQuestion &&
          qIdx !== getStructuredSectionPrimaryQuestionIndex(section)
        ) {
          return;
        }

        const pushEntry = (entry) => {
          questions.push({
            questionNumber: qNum++,
            legacyKeys: [],
            ...entry,
          });
        };

        if (section.questionType === 'long-text-mc' && Array.isArray(question.questions)) {
          question.questions.forEach((nestedQuestion, nestedIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${nestedIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${nestedIdx}`],
              nestedQuestion,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'preposition-gap-fill' && Array.isArray(question.items)) {
          question.items.forEach((item, itemIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${itemIdx}`],
              item,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'odd-one-out' && Array.isArray(question.groups)) {
          question.groups.forEach((group, groupIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${groupIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${groupIdx}`],
              group,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'sentence-correction' && Array.isArray(question.items)) {
          question.items.forEach((item, itemIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${itemIdx}`],
              item,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'reading-open-questions' && Array.isArray(question.items)) {
          question.items.forEach((item, itemIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${itemIdx}`],
              item,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'matching' && Array.isArray(question.leftItems)) {
          question.leftItems.forEach((leftItem, itemIdx) => {
            pushEntry({
              key: `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`,
              legacyKeys: [`${partIdx}-${secIdx}-${itemIdx}`],
              item: leftItem,
              question,
              section,
            });
          });
          return;
        }

        if (section.questionType === 'cloze-test') {
          const blanks = normalizeClozeTestBlanks(question, qNum);

          if (blanks.length > 0) {
            blanks.forEach((blank, blankIdx) => {
              pushEntry({
                key: `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`,
                legacyKeys: [`${partIdx}-${secIdx}-${blankIdx}`],
                blank,
                question,
                section,
              });
            });
            return;
          }
        }

        pushEntry({
          key: `${partIdx}-${secIdx}-${qIdx}`,
          question,
          section,
        });
      });
    });
  });

  const explicitNumbers = new Set(
    questions
      .map((entry) => resolveExplicitQuestionNumber(entry))
      .filter((value) => Number.isFinite(value) && value > 0)
  );

  if (explicitNumbers.size === 0) {
    return questions.filter((entry) => Number.isFinite(entry.questionNumber));
  }

  const maxExplicitNumber = Math.max(...explicitNumbers);
  const assignedNumbers = new Set();
  let nextFallbackNumber = 1;

  return questions.reduce((normalizedEntries, entry) => {
    const explicitQuestionNumber = resolveExplicitQuestionNumber(entry);

    if (Number.isFinite(explicitQuestionNumber) && explicitQuestionNumber > 0) {
      assignedNumbers.add(explicitQuestionNumber);
      nextFallbackNumber = Math.max(nextFallbackNumber, explicitQuestionNumber + 1);
      normalizedEntries.push({
        ...entry,
        questionNumber: explicitQuestionNumber,
      });
      return normalizedEntries;
    }

    while (explicitNumbers.has(nextFallbackNumber) || assignedNumbers.has(nextFallbackNumber)) {
      nextFallbackNumber += 1;
    }

    const isWritingTask =
      entry?.section?.questionType === 'short-message' ||
      entry?.section?.questionType === 'story-writing';

    if (isWritingTask && nextFallbackNumber > maxExplicitNumber) {
      return normalizedEntries;
    }

    assignedNumbers.add(nextFallbackNumber);
    normalizedEntries.push({
      ...entry,
      questionNumber: nextFallbackNumber,
    });
    nextFallbackNumber += 1;
    return normalizedEntries;
  }, []);
};

const getResultStatus = (result) => {
  const userAnswer = result?.userAnswer;
  const isUnanswered =
    !result ||
    userAnswer === null ||
    userAnswer === undefined ||
    (typeof userAnswer === 'string' && userAnswer.trim() === '');

  if (result?.isCorrect === true) return 'correct';
  if (result?.isCorrect === false) return isUnanswered ? 'blank' : 'wrong';
  if (result?.isCorrect === null && !isUnanswered) return 'pending';
  return 'blank';
};

const getGradeMeta = (percentage) => {
  if (percentage >= 90) return { label: 'Excellent', color: '#16a34a' };
  if (percentage >= 80) return { label: 'Strong', color: '#2563eb' };
  if (percentage >= 70) return { label: 'Good', color: '#7c3aed' };
  if (percentage >= 60) return { label: 'Average', color: '#f59e0b' };
  if (percentage >= 50) return { label: 'Pass', color: '#f97316' };
  return { label: 'Needs Work', color: '#ef4444' };
};

const formatTime = (seconds) => {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return '--:--';
  const totalSeconds = Number(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-GB');
};

const FceReadingResultPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const [submission, setSubmission] = useState(() => normalizeSubmission(location.state?.submission) || null);
  const [test, setTest] = useState(() => {
    const rawTest = location.state?.test;
    if (!rawTest) return null;
    return {
      ...rawTest,
      parts: parseJsonIfString(rawTest.parts),
    };
  });
  const [loading, setLoading] = useState(!location.state?.submission);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const isFceReading60 = useMemo(
    () => String(submission?.testType || '').trim().toLowerCase() === 'fce-reading-60',
    [submission?.testType]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(apiPath(`cambridge/submissions/${submissionId}`), { signal: controller.signal });
        if (!res.ok) throw new Error('Result not found');
        const data = await res.json();
        if (!cancelled) {
          setSubmission(normalizeSubmission(data));
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load result');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submissionId]);

  useEffect(() => {
    if (!submission?.testId || !isFceReading60) return;
    if (test && String(test.id) === String(submission.testId) && Array.isArray(test.parts)) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(apiPath(`cambridge/reading-tests/${submission.testId}`), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load test');
        const data = await res.json();
        if (!cancelled) {
          setTest({
            ...data,
            parts: parseJsonIfString(data.parts),
          });
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load test');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isFceReading60, submission?.testId, test]);

  const questionEntries = useMemo(() => {
    if (!isFceReading60 || !Array.isArray(test?.parts)) return [];
    return buildFceReadingQuestionEntries(test.parts)
      .filter((entry) => Number.isFinite(entry.questionNumber) && entry.questionNumber > 0)
      .sort((left, right) => left.questionNumber - right.questionNumber);
  }, [isFceReading60, test?.parts]);

  const questionResults = useMemo(() => {
    if (!isFceReading60) return [];

    const detailedResults = submission?.detailedResults;
    if (!detailedResults || typeof detailedResults !== 'object') {
      return questionEntries.map((entry) => ({
        questionNumber: entry.questionNumber,
        result: null,
        key: entry.key,
      }));
    }

    return questionEntries.map((entry) => {
      const keyCandidates = [entry.key, ...(entry.legacyKeys || [])];
      const matchedKey = keyCandidates.find((candidate) =>
        Object.prototype.hasOwnProperty.call(detailedResults, candidate)
      );

      return {
        questionNumber: entry.questionNumber,
        key: matchedKey || entry.key,
        result: matchedKey ? detailedResults[matchedKey] : null,
      };
    });
  }, [isFceReading60, questionEntries, submission?.detailedResults]);

  const stats = useMemo(() => {
    if (!submission) return null;

    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let pending = 0;

    questionResults.forEach(({ result }) => {
      const status = getResultStatus(result);
      if (status === 'correct') correct += 1;
      else if (status === 'wrong') wrong += 1;
      else if (status === 'pending') pending += 1;
      else blank += 1;
    });

    const percentage = Number(submission.percentage) || 0;
    return {
      score: Number(submission.score) || 0,
      total: Number(submission.totalQuestions) || questionResults.length || 0,
      percentage,
      correct,
      wrong,
      blank,
      pending,
      grade: getGradeMeta(percentage),
    };
  }, [questionResults, submission]);

  const breakdownGroups = useMemo(() => {
    const groups = Array.isArray(submission?.breakdown?.groups) ? submission.breakdown.groups : [];
    return groups
      .map((group) => ({
        key: group?.key || '',
        label: group?.label || '',
        score: Number(group?.score) || 0,
        total: Number(group?.total) || 0,
      }))
      .filter((group) => group.label && group.total > 0);
  }, [submission?.breakdown]);

  const colors = useMemo(() => (
    isDarkMode
      ? {
          page: '#08111f',
          surface: '#0f172a',
          surfaceAlt: '#111c33',
          border: '#24324a',
          text: '#e5eefc',
          muted: '#9fb0cc',
          accent: '#38bdf8',
          correct: '#22c55e',
          correctBg: 'rgba(34, 197, 94, 0.14)',
          wrong: '#ef4444',
          wrongBg: 'rgba(239, 68, 68, 0.14)',
          blank: '#94a3b8',
          blankBg: 'rgba(148, 163, 184, 0.14)',
          pending: '#38bdf8',
          pendingBg: 'rgba(56, 189, 248, 0.14)',
        }
      : {
          page: '#f8fbff',
          surface: '#ffffff',
          surfaceAlt: '#f8fafc',
          border: '#dbe4f0',
          text: '#0f172a',
          muted: '#64748b',
          accent: '#1d4ed8',
          correct: '#16a34a',
          correctBg: '#dcfce7',
          wrong: '#dc2626',
          wrongBg: '#fee2e2',
          blank: '#64748b',
          blankBg: '#f1f5f9',
          pending: '#0369a1',
          pendingBg: '#e0f2fe',
        }
  ), [isDarkMode]);

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div style={{ minHeight: '100vh', background: colors.page, padding: '32px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', color: colors.text }}>Loading FCE result...</div>
        </div>
      </>
    );
  }

  if (error || !submission) {
    return (
      <>
        <AdminNavbar />
        <div style={{ minHeight: '100vh', background: colors.page, padding: '32px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gap: '16px' }}>
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', color: colors.text }}>
              {error || 'No result found.'}
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/fce-submissions')}
              style={{ width: 'fit-content', padding: '10px 16px', borderRadius: '999px', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, cursor: 'pointer' }}
            >
              Back to FCE submissions
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!isFceReading60) {
    return (
      <>
        <AdminNavbar />
        <div style={{ minHeight: '100vh', background: colors.page, padding: '32px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gap: '16px' }}>
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', color: colors.text }}>
              This FCE result page currently supports `fce-reading-60` submissions only.
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate(`/cambridge/result/${submission.id}`)}
                style={{ padding: '10px 16px', borderRadius: '999px', border: 'none', background: colors.accent, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Open shared result page
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/fce-submissions')}
                style={{ padding: '10px 16px', borderRadius: '999px', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, cursor: 'pointer' }}
              >
                Back to FCE submissions
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <div style={{ minHeight: '100vh', background: colors.page, padding: '24px 16px 40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gap: '20px' }}>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '20px 22px', boxShadow: isDarkMode ? '0 20px 40px rgba(2, 6, 23, 0.22)' : '0 18px 36px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/fce-submissions')}
                  style={{ padding: '8px 14px', borderRadius: '999px', border: `1px solid ${colors.border}`, background: colors.surfaceAlt, color: colors.text, cursor: 'pointer', fontWeight: 600, marginBottom: '14px' }}
                >
                  Back to FCE submissions
                </button>
                <h1 style={{ margin: 0, fontSize: '2rem', color: colors.text }}>FCE Result Review</h1>
                <p style={{ margin: '10px 0 0', color: colors.muted, lineHeight: 1.7 }}>
                  {submission.testTitle || 'FCE Reading & Writing'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{ padding: '10px 16px', borderRadius: '999px', border: activeTab === 'overview' ? 'none' : `1px solid ${colors.border}`, background: activeTab === 'overview' ? colors.accent : colors.surfaceAlt, color: activeTab === 'overview' ? '#fff' : colors.text, cursor: 'pointer', fontWeight: 700 }}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('review')}
                  style={{ padding: '10px 16px', borderRadius: '999px', border: activeTab === 'review' ? 'none' : `1px solid ${colors.border}`, background: activeTab === 'review' ? colors.accent : colors.surfaceAlt, color: activeTab === 'review' ? '#fff' : colors.text, cursor: 'pointer', fontWeight: 700 }}
                >
                  Question Review
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'overview' && stats ? (
            <>
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '28px', boxShadow: isDarkMode ? '0 16px 34px rgba(2, 6, 23, 0.2)' : '0 16px 32px rgba(15, 23, 42, 0.07)' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '4rem', lineHeight: 1, fontWeight: 800, color: colors.accent }}>{stats.score}</div>
                  <div style={{ fontSize: '2rem', color: colors.muted, marginTop: '4px' }}>/ {stats.total}</div>
                </div>
                <div style={{ width: '100%', height: '12px', borderRadius: '999px', background: colors.blankBg, overflow: 'hidden' }}>
                  <div style={{ width: `${stats.percentage}%`, height: '100%', background: stats.grade.color }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: '14px', color: stats.grade.color, fontWeight: 700, fontSize: '1.05rem' }}>
                  {stats.grade.label} - {stats.percentage}%
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
                {[
                  { label: 'Correct', value: stats.correct, color: colors.correct },
                  { label: 'Wrong', value: stats.wrong, color: colors.wrong },
                  { label: 'Blank', value: stats.blank, color: colors.blank },
                  { label: 'Pending', value: stats.pending, color: colors.pending },
                ].map((item) => (
                  <div key={item.label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${item.color}`, borderRadius: '20px', padding: '22px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: colors.text }}>{item.value}</div>
                    <div style={{ marginTop: '8px', color: colors.muted, fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {breakdownGroups.length > 0 ? (
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px' }}>
                  <h2 style={{ margin: '0 0 16px', color: colors.text, fontSize: '1.2rem' }}>FCE Score Groups</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {breakdownGroups.map((group) => (
                      <div key={group.key || group.label} style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '18px' }}>
                        <div style={{ color: colors.muted, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{group.label}</div>
                        <div style={{ marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: colors.text }}>{group.score}/{group.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px' }}>
                <h2 style={{ margin: '0 0 16px', color: colors.text, fontSize: '1.2rem' }}>Test Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Type', value: submission.testType?.toUpperCase() || '--' },
                    { label: 'Time Spent', value: formatTime(submission.timeSpent) },
                    { label: 'Class', value: submission.classCode || '--' },
                    { label: 'Submitted', value: formatDate(submission.submittedAt) },
                    { label: 'Student', value: submission.studentName || '--' },
                    { label: 'Teacher', value: submission.teacherName || '--' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '16px 18px' }}>
                      <div style={{ color: colors.muted, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{item.label}</div>
                      <div style={{ marginTop: '8px', color: colors.text, fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'review' ? (
            <>
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px', boxShadow: isDarkMode ? '0 16px 34px rgba(2, 6, 23, 0.2)' : '0 16px 32px rgba(15, 23, 42, 0.07)' }}>
                <h2 style={{ margin: '0 0 16px', color: colors.text, fontSize: '1.35rem' }}>Question Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: '10px' }}>
                  {questionResults.map(({ key, questionNumber, result }) => {
                    const status = getResultStatus(result);
                    const styleMap = {
                      correct: { background: colors.correctBg, color: colors.correct },
                      wrong: { background: colors.wrongBg, color: colors.wrong },
                      blank: { background: colors.blankBg, color: colors.blank },
                      pending: { background: colors.pendingBg, color: colors.pending },
                    };

                    return (
                      <div
                        key={`${key}-${questionNumber}`}
                        title={`Question ${questionNumber}`}
                        style={{
                          minHeight: '38px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          ...styleMap[status],
                        }}
                      >
                        {questionNumber}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '18px', borderTop: `1px solid ${colors.border}`, color: colors.muted }}>
                  {[
                    { label: 'Correct', color: colors.correctBg },
                    { label: 'Wrong', color: colors.wrongBg },
                    { label: 'Blank', color: colors.blankBg },
                    { label: 'Pending Review', color: colors.pendingBg },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '5px', background: item.color, border: `1px solid ${colors.border}` }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '10px 10px 24px' }}>
                <CambridgeStudentStyleReview test={test} submission={submission} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default FceReadingResultPage;