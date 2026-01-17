import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import './DoCambridgeReadingTest.css';

/**
 * DoCambridgeListeningTest - Trang làm bài thi Listening Cambridge (KET, PET, etc.)
 * Support: KET, PET, FLYERS, MOVERS, STARTERS
 */
const DoCambridgeListeningTest = () => {
  const { testType, id } = useParams(); // testType: ket-listening, pet-listening, etc.
  const navigate = useNavigate();

  const examType = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("ket")) return "KET";
    if (s.includes("pet")) return "PET";
    if (s.includes("flyers")) return "FLYERS";
    if (s.includes("movers")) return "MOVERS";
    if (s.includes("starters")) return "STARTERS";
    // fallback to Cambridge style if unknown
    return "CAMBRIDGE";
  }, [testType]);

  // States
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [expandedPart, setExpandedPart] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [activeQuestion, setActiveQuestion] = useState(null);

  // Cambridge-style start gate (must click Play)
  const [testStarted, setTestStarted] = useState(false);
  const [startedAudioByPart, setStartedAudioByPart] = useState({});
  const [showAudioTip, setShowAudioTip] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => new Set());

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const maxPlayedTimeByPartRef = useRef({});
  const ignoreSeekRef = useRef(false);

  // Get test config
  const testConfig = useMemo(() => {
    return TEST_CONFIGS[testType] || TEST_CONFIGS['ket-listening'];
  }, [testType]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`cambridge/listening-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        const data = await res.json();

        // Parse parts JSON
        let parsedParts = typeof data.parts === "string"
          ? JSON.parse(data.parts)
          : data.parts;

        const parsedData = {
          ...data,
          parts: parsedParts,
        };

        setTest(parsedData);
        setTimeRemaining((testConfig.duration || 30) * 60);
      } catch (err) {
        console.error("Error fetching test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id, testConfig.duration]);

  const hasAnyAudio = useMemo(() => {
    return Boolean(test?.parts?.some((p) => p?.audioUrl));
  }, [test]);

  // If teacher uploads only one mp3 (usually in Part 1), treat it as global audio.
  const globalAudioUrl = useMemo(() => {
    const parts = test?.parts || [];
    const first = parts.find((p) => p?.audioUrl)?.audioUrl;
    return first || '';
  }, [test]);

  const audioMeta = useMemo(() => {
    const urls = new Set(
      (test?.parts || [])
        .map((p) => (p?.audioUrl ? String(p.audioUrl).trim() : ''))
        .filter(Boolean)
    );
    return {
      hasAudio: urls.size > 0,
      uniqueCount: urls.size,
      isSingleFile: urls.size === 1,
    };
  }, [test]);

  // Build global question order + ranges (for footer nav)
  const questionIndex = useMemo(() => {
    const parts = test?.parts || [];
    let globalNumber = 1;
    const byPart = [];
    const orderedKeys = [];

    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const partKeys = [];
      const start = globalNumber;

      const sections = part?.sections || [];
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const q0 = sec?.questions?.[0] || {};
        const secType =
          sec?.questionType ||
          q0?.questionType ||
          q0?.type ||
          (Array.isArray(q0?.people) ? 'people-matching' : '') ||
          (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
          '';
        const questions = sec?.questions || [];

        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx];

          // Nested / multi-item section types
          if (secType === 'long-text-mc' && Array.isArray(q?.questions)) {
            for (let nestedIdx = 0; nestedIdx < q.questions.length; nestedIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${nestedIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if ((secType === 'cloze-mc' || secType === 'cloze-test') && Array.isArray(q?.blanks)) {
            for (let blankIdx = 0; blankIdx < q.blanks.length; blankIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'word-form' && Array.isArray(q?.sentences)) {
            for (let sentIdx = 0; sentIdx < q.sentences.length; sentIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${sentIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'people-matching' && Array.isArray(q?.people)) {
            for (let personIdx = 0; personIdx < q.people.length; personIdx++) {
              const person = q.people[personIdx];
              const personId = person?.id || String.fromCharCode(65 + personIdx);
              const key = `${pIdx}-${sIdx}-${qIdx}-${personId}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          // Regular question
          const key = `${pIdx}-${sIdx}-${qIdx}`;
          const num = globalNumber++;
          partKeys.push({ key, number: num, sectionIndex: sIdx });
          orderedKeys.push({ key, partIndex: pIdx, number: num });
        }
      }

      const end = globalNumber - 1;
      byPart.push({ partIndex: pIdx, start, end, keys: partKeys });
    }

    return { byPart, orderedKeys };
  }, [test]);

  // Init active question to first question
  useEffect(() => {
    if (!test) return;
    const first = questionIndex?.orderedKeys?.[0]?.key;
    if (first && !activeQuestion) {
      setCurrentPartIndex(questionIndex.orderedKeys[0].partIndex);
      setExpandedPart(questionIndex.orderedKeys[0].partIndex);
      setActiveQuestion(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, questionIndex]);

  // Scroll to active question when changed
  useEffect(() => {
    if (!activeQuestion) return;
    const el = questionRefs.current?.[activeQuestion];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeQuestion]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !test) return;
    if (hasAnyAudio && !testStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          confirmSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, submitted]);

  const currentPart = useMemo(() => {
    return test?.parts?.[currentPartIndex] || null;
  }, [test, currentPartIndex]);

  const currentAudioUrl = useMemo(() => {
    return currentPart?.audioUrl || globalAudioUrl || '';
  }, [currentPart, globalAudioUrl]);

  const isStartGateVisible = useMemo(() => {
    if (submitted) return false;
    if (!currentAudioUrl) return false;
    // If only one audio file for whole test, show gate once at the beginning.
    if (audioMeta.isSingleFile) return !testStarted;
    return !startedAudioByPart?.[currentPartIndex];
  }, [submitted, currentAudioUrl, startedAudioByPart, currentPartIndex, audioMeta.isSingleFile, testStarted]);

  const markPartAudioStarted = useCallback((partIndex) => {
    setStartedAudioByPart((prev) => {
      if (prev?.[partIndex]) return prev;
      return { ...(prev || {}), [partIndex]: true };
    });
    setTestStarted(true);
  }, []);

  const handlePlayGate = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      markPartAudioStarted(currentPartIndex);
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  }, [currentPartIndex, markPartAudioStarted]);

  const handleAudioPlay = useCallback(() => {
    markPartAudioStarted(currentPartIndex);
  }, [currentPartIndex, markPartAudioStarted]);

  const handleAudioPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    if (audio.ended) return;
    audio.play().catch(() => {
      // ignore
    });
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;
    const t = Number(audio.currentTime || 0);
    const prevMax = Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    if (t > prevMax) {
      maxPlayedTimeByPartRef.current = {
        ...(maxPlayedTimeByPartRef.current || {}),
        [currentPartIndex]: t,
      };
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  const handleAudioSeeking = useCallback(() => {
    if (ignoreSeekRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const isStarted = audioMeta.isSingleFile ? testStarted : startedAudioByPart?.[currentPartIndex];
    if (!isStarted) return;

    const max = Number(maxPlayedTimeByPartRef.current?.[currentPartIndex] || 0);
    const t = Number(audio.currentTime || 0);
    // Block any seeking (rewind or fast-forward). Cambridge flow: no pause/rewind;
    // we also prevent skipping ahead via keyboard/media controls.
    if (Math.abs(t - max) > 0.25) {
      ignoreSeekRef.current = true;
      audio.currentTime = max;
      setTimeout(() => {
        ignoreSeekRef.current = false;
      }, 0);
    }
  }, [currentPartIndex, startedAudioByPart, audioMeta.isSingleFile, testStarted]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionKey, value) => {
      if (submitted) return;
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: value,
      }));
    },
    [submitted]
  );

  const resolveImgSrc = useCallback((url) => {
    if (!url) return "";
    const s = String(url);
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return hostPath(s);
    return s;
  }, []);

  const sanitizeBasicHtml = useCallback((html) => {
    const s = String(html || "");
    return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }, []);

  const renderMaybeHtml = useCallback(
    (value) => {
      const s = String(value || "");
      if (!s) return null;
      if (s.includes("<") && s.includes(">")) {
        return <div dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(s) }} />;
      }
      return <div>{s}</div>;
    },
    [sanitizeBasicHtml]
  );

  // Handle checkbox change for multi-select
  const handleCheckboxChange = useCallback(
    (questionKey, optionIndex, checked, maxSelections = 2) => {
      if (submitted) return;

      setAnswers((prev) => {
        const currentAnswers = prev[questionKey] || [];
        let newAnswers;

        if (checked) {
          if (currentAnswers.length < maxSelections) {
            newAnswers = [...currentAnswers, optionIndex];
          } else {
            return prev;
          }
        } else {
          newAnswers = currentAnswers.filter((idx) => idx !== optionIndex);
        }

        return { ...prev, [questionKey]: newAnswers };
      });
    },
    [submitted]
  );

  // Handle submit
  const handleSubmit = () => setShowConfirm(true);

  const toggleFlag = useCallback((questionKey) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionKey)) next.delete(questionKey);
      else next.add(questionKey);
      return next;
    });
  }, []);

  // Confirm and submit
  const confirmSubmit = async () => {
    try {
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const initialTime = (testConfig.duration || 30) * 60;
      const timeSpent = initialTime - timeRemaining;

      const res = await fetch(apiPath(`cambridge/listening-tests/${id}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answers,
          studentName: user.name || user.username || 'Unknown',
          studentPhone: user.phone || null,
          studentEmail: user.email || null,
          classCode: test?.classCode || null,
          userId: user.id || null,
          timeRemaining,
          timeSpent
        }),
      });

      if (!res.ok) throw new Error("Lỗi khi nộp bài");

      const data = await res.json();
      
      // Navigate to result page with submission data
      navigate(`/cambridge/result/${data.submissionId}`, {
        state: {
          submission: {
            ...data,
            testTitle: test?.title,
            testType: testType,
            timeSpent,
            classCode: test?.classCode,
            submittedAt: new Date().toISOString()
          },
          test
        }
      });
    } catch (err) {
      console.error("Error submitting:", err);
      // For now, calculate locally if backend not ready
      const localResults = calculateLocalResults();
      setResults(localResults);
      setSubmitted(true);
      setShowConfirm(false);
    }
  };

  // Calculate results locally (fallback)
  const calculateLocalResults = () => {
    let correct = 0;
    let total = 0;

    test?.parts?.forEach((part, partIdx) => {
      part.sections?.forEach((section, secIdx) => {
        section.questions?.forEach((q, qIdx) => {
          total++;
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];
          
          if (q.correctAnswer) {
            if (typeof q.correctAnswer === 'string') {
              if (userAnswer?.toLowerCase?.() === q.correctAnswer.toLowerCase()) {
                correct++;
              }
            } else if (userAnswer === q.correctAnswer) {
              correct++;
            }
          }
        });
      });
    });

    return {
      score: correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  // Calculate question number range for a part
  const getPartQuestionRange = useCallback((partIndex) => {
    if (!test?.parts) return { start: 1, end: 1 };
    
    let startNum = 1;
    for (let p = 0; p < partIndex; p++) {
      const part = test.parts[p];
      part?.sections?.forEach((sec) => {
        startNum += sec.questions?.length || 0;
      });
    }

    let count = 0;
    test.parts[partIndex]?.sections?.forEach((sec) => {
      count += sec.questions?.length || 0;
    });

    return { start: startNum, end: startNum + count - 1 };
  }, [test?.parts]);

  // Render question based on type
  const renderQuestion = (question, questionKey, questionNum) => {
    const qType = question.questionType || 'fill';
    const userAnswer = answers[questionKey];
    const isCorrect = submitted && results?.answers?.[questionKey]?.isCorrect;

    switch (qType) {
      case 'fill':
        return (
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNum}>{questionNum}</span>
              <span style={styles.questionText}>{question.questionText}</span>
            </div>
            <input
              type="text"
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
              disabled={submitted}
              placeholder="Nhập đáp án..."
              style={{
                ...styles.input,
                ...(submitted && {
                  backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                  borderColor: isCorrect ? '#22c55e' : '#ef4444',
                }),
              }}
            />
            {submitted && question.correctAnswer && (
              <div style={styles.correctAnswer}>
                ✓ Đáp án đúng: {question.correctAnswer}
              </div>
            )}
          </div>
        );

      case 'abc':
      case 'abcd':
        const options = question.options || [];
        return (
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNum}>{questionNum}</span>
              <span style={styles.questionText}>{question.questionText}</span>
            </div>
            <div style={styles.optionsContainer}>
              {options.map((opt, idx) => {
                const optionLabel = String.fromCharCode(65 + idx);
                const isSelected = userAnswer === optionLabel;
                const isCorrectOption = submitted && question.correctAnswer === optionLabel;

                return (
                  <label
                    key={idx}
                    style={{
                      ...styles.optionLabel,
                      ...(isSelected && styles.optionSelected),
                      ...(submitted && isCorrectOption && styles.optionCorrect),
                      ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                    }}
                  >
                    <input
                      type="radio"
                      name={questionKey}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(questionKey, optionLabel)}
                      disabled={submitted}
                      style={{ marginRight: '10px' }}
                    />
                    <span style={styles.optionText}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'multiple-choice-pictures':
        const imageOptions = Array.isArray(question.imageOptions) ? question.imageOptions : [];
        return (
          <div style={styles.pictureQuestionCard}>
            <div style={styles.pictureQuestionHeader}>
              <div
                style={{
                  ...styles.questionHeader,
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 0,
                }}
              >
                <span style={styles.questionNum}>{questionNum}</span>
                <span style={styles.questionText}>{question.questionText}</span>
              </div>

              <button
                type="button"
                aria-label={`Flag question ${questionNum}`}
                onClick={() => toggleFlag(questionKey)}
                style={{
                  ...styles.flagButton,
                  ...(flaggedQuestions.has(questionKey) ? styles.flagButtonActive : null),
                }}
              >
                {flaggedQuestions.has(questionKey) ? '⚑' : '⚐'}
              </button>
            </div>

            <div style={styles.pictureChoicesRow} role="radiogroup" aria-label={`Question ${questionNum}`}> 
              {[0, 1, 2].map((idx) => {
                const optionLabel = String.fromCharCode(65 + idx); // A/B/C
                const opt = imageOptions[idx] || {};
                const isSelected = userAnswer === optionLabel;
                const isCorrectOption = submitted && question.correctAnswer === optionLabel;

                return (
                  <div key={idx} style={styles.pictureChoiceItem}>
                    <label
                      style={{
                        ...styles.pictureChoiceLabelWrap,
                        ...(isSelected ? styles.pictureChoiceSelected : null),
                        ...(submitted && isCorrectOption ? styles.pictureChoiceCorrect : null),
                        ...(submitted && isSelected && !isCorrectOption ? styles.pictureChoiceWrong : null),
                      }}
                    >
                      {opt.imageUrl ? (
                        <img
                          src={resolveImgSrc(opt.imageUrl)}
                          alt=""
                          style={styles.pictureChoiceImage}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={styles.pictureChoiceImagePlaceholder} />
                      )}
                      <input
                        type="radio"
                        name={questionKey}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(questionKey, optionLabel)}
                        disabled={submitted}
                        style={styles.pictureChoiceRadio}
                        aria-label={`Option ${optionLabel}`}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'matching':
        const leftItems = question.leftItems || [];
        const rightItems = question.rightItems || [];
        return (
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNum}>{questionNum}</span>
              <span style={styles.questionText}>{question.questionText || 'Match the items'}</span>
            </div>
            <div style={styles.matchingContainer}>
              {leftItems.map((item, idx) => (
                <div key={idx} style={styles.matchingRow}>
                  <span style={styles.matchingItem}>{idx + 1}. {item}</span>
                  <select
                    value={answers[`${questionKey}-${idx}`] || ''}
                    onChange={(e) => handleAnswerChange(`${questionKey}-${idx}`, e.target.value)}
                    disabled={submitted}
                    style={styles.matchingSelect}
                  >
                    <option value="">-- Chọn --</option>
                    {rightItems.map((right, rIdx) => (
                      <option key={rIdx} value={String.fromCharCode(65 + rIdx)}>
                        {String.fromCharCode(65 + rIdx)}. {right}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {/* Right items reference */}
            <div style={styles.rightItemsRef}>
              <strong>Options:</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {rightItems.map((item, idx) => (
                  <span key={idx} style={styles.rightItemBadge}>
                    {String.fromCharCode(65 + idx)}. {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNum}>{questionNum}</span>
              <span style={styles.questionText}>{question.questionText}</span>
            </div>
            <input
              type="text"
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
              disabled={submitted}
              placeholder="Nhập đáp án..."
              style={styles.input}
            />
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2>Đang tải đề thi...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Lỗi: {error}</h2>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <TestHeader
        title={testConfig.name}
        examType={examType}
        classCode={test?.classCode}
        teacherName={test?.teacherName}
        timeRemaining={formatTime(timeRemaining)}
        onSubmit={handleSubmit}
        submitted={submitted}
      />

      {/* Cambridge-style Play gate overlay */}
      {isStartGateVisible && (
        <div style={styles.playGateOverlay} role="dialog" aria-modal="true" tabIndex={-1}>
          <div style={styles.playGateCard}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🎧</div>
            <p style={{ margin: '0 0 8px', lineHeight: 1.4 }}>
              You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.
            </p>
            <p style={{ margin: '0 0 16px', lineHeight: 1.4 }}>
              To continue, click Play.
            </p>
            <button type="button" onClick={handlePlayGate} style={styles.playGateButton}>
              ▶ Play
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Main Question Area */}
        <div style={styles.questionArea}>
          {currentPart && (
            <>
              {/* Rubric block (Cambridge-style) */}
              {(() => {
                const range = getPartQuestionRange(currentPartIndex);
                return (
                  <div style={styles.rubricBlock}>
                    <h3 style={styles.rubricTitle}>Questions {range.start}–{range.end}</h3>
                    <div style={styles.rubricText}>
                      {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                    </div>
                  </div>
                );
              })()}

              {/* Part Header */}
              <div style={styles.partHeader}>
                <h2 style={{ margin: 0, color: '#0e276f' }}>
                  {currentPart.title || `Part ${currentPartIndex + 1}`}
                </h2>
              </div>

              {/* Audio Player */}
              {currentAudioUrl && (
                <div style={styles.audioContainer}>
                  <span style={{ marginRight: '12px' }}>🎧</span>
                  <audio
                    ref={audioRef}
                    src={hostPath(currentAudioUrl)}
                    preload="auto"
                    controls={false}
                    controlsList="nodownload noplaybackrate"
                    onPlay={handleAudioPlay}
                    onPause={handleAudioPause}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onSeeking={handleAudioSeeking}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ flex: 1, width: '100%' }}
                  >
                    Your browser does not support audio.
                  </audio>
                  <div
                    style={styles.audioTipWrap}
                    onMouseEnter={() => setShowAudioTip(true)}
                    onMouseLeave={() => setShowAudioTip(false)}
                  >
                    <button type="button" style={styles.audioTipButton} aria-label="Audio restrictions">
                      i
                    </button>
                    {showAudioTip && (
                      <div style={styles.audioTipBubble} role="tooltip">
                        No pause / no rewind
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sections & Questions */}
              {currentPart.sections?.map((section, secIdx) => {
                const partRange = getPartQuestionRange(currentPartIndex);
                const sectionStartNum =
                  questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                  partRange.start;

                // Robust section type detection (some legacy data stores type on question instead of section)
                const q0 = section?.questions?.[0] || {};
                const sectionType =
                  section?.questionType ||
                  q0?.questionType ||
                  q0?.type ||
                  (Array.isArray(q0?.people) ? 'people-matching' : '') ||
                  (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
                  '';

                return (
                  <div key={secIdx} style={styles.section}>
                    {section.sectionTitle && (
                      <h3 style={styles.sectionTitle}>{section.sectionTitle}</h3>
                    )}

                    {/* Section-based types (KET Reading style) */}
                    {sectionType === 'long-text-mc' && section.questions?.[0]?.questions ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const nested = Array.isArray(container.questions) ? container.questions : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: '#fffbeb', borderColor: '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {nested.map((nq, nestedIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${nestedIdx}`;
                              const num = sectionStartNum + nestedIdx;
                              const opts = nq.options || [];
                              const userAnswer = answers[key] || '';
                              const correct = nq.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div style={styles.questionCard}>
                                    <div style={styles.questionHeader}>
                                      <span style={styles.questionNum}>{num}</span>
                                      <span style={styles.questionText}>{nq.questionText || ''}</span>
                                    </div>
                                    <div style={styles.optionsContainer}>
                                      {opts.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const isSelected = userAnswer === letter;
                                        const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                        return (
                                          <label
                                            key={letter}
                                            style={{
                                              ...styles.optionLabel,
                                              ...(isSelected && styles.optionSelected),
                                              ...(submitted && isCorrectOption && styles.optionCorrect),
                                              ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                            }}
                                          >
                                            <input
                                              type="radio"
                                              name={key}
                                              checked={isSelected}
                                              onChange={() => handleAnswerChange(key, letter)}
                                              disabled={submitted}
                                              style={{ marginRight: '10px' }}
                                            />
                                            <span style={styles.optionText}>{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-mc' && section.questions?.[0]?.blanks ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const blanks = Array.isArray(container.blanks) ? container.blanks : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: '#fffbeb', borderColor: '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {blanks.map((blank, blankIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIdx}`;
                              const num = sectionStartNum + blankIdx;
                              const userAnswer = answers[key] || '';
                              const opts = blank.options || [];
                              const correct = blank.correctAnswer;

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div style={styles.questionCard}>
                                    <div style={styles.questionHeader}>
                                      <span style={styles.questionNum}>{num}</span>
                                      <span style={styles.questionText}>{blank.questionText || ''}</span>
                                    </div>
                                    <div style={styles.optionsContainer}>
                                      {opts.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const isSelected = userAnswer === letter;
                                        const isCorrectOption = submitted && String(correct || '').toUpperCase() === letter;
                                        return (
                                          <label
                                            key={letter}
                                            style={{
                                              ...styles.optionLabel,
                                              ...(isSelected && styles.optionSelected),
                                              ...(submitted && isCorrectOption && styles.optionCorrect),
                                              ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                            }}
                                          >
                                            <input
                                              type="radio"
                                              name={key}
                                              checked={isSelected}
                                              onChange={() => handleAnswerChange(key, letter)}
                                              disabled={submitted}
                                              style={{ marginRight: '10px' }}
                                            />
                                            <span style={styles.optionText}>{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'cloze-test' && section.questions?.[0]?.blanks ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const passageHtml = container.passage || container.passageText || container.passageTitle || '';
                        const blanks = Array.isArray(container.blanks) ? container.blanks : [];
                        return (
                          <div>
                            {passageHtml ? (
                              <div style={{ ...styles.questionCard, background: '#fffbeb', borderColor: '#fcd34d' }}>
                                <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                  {renderMaybeHtml(passageHtml)}
                                </div>
                              </div>
                            ) : null}

                            {blanks.map((blank, blankIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIdx}`;
                              const num = sectionStartNum + blankIdx;
                              const userAnswer = answers[key] || '';
                              const correct = blank.correctAnswer;
                              const isCorrect = submitted && String(userAnswer || '').trim().toLowerCase() === String(correct || '').trim().toLowerCase();

                              return (
                                <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                                  <div style={styles.questionCard}>
                                    <div style={styles.questionHeader}>
                                      <span style={styles.questionNum}>{num}</span>
                                      <span style={styles.questionText}>{blank.questionText || ''}</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={userAnswer}
                                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                                      disabled={submitted}
                                      placeholder="Type your answer..."
                                      style={{
                                        ...styles.input,
                                        ...(submitted && {
                                          backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                                          borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                        }),
                                      }}
                                    />
                                    {submitted && correct && !isCorrect && (
                                      <div style={styles.correctAnswer}>✓ Đáp án đúng: {correct}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'word-form' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const sentences = (Array.isArray(container.sentences) && container.sentences.length > 0)
                          ? container.sentences
                          : [
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                              { sentence: '', rootWord: '', correctAnswer: '' },
                            ];
                        return (
                          <div>
                            {sentences.map((s, sentIdx) => {
                              const key = `${currentPartIndex}-${secIdx}-${qIdx}-${sentIdx}`;
                              const num = sectionStartNum + sentIdx;
                              const userAnswer = answers[key] || '';
                              const sentenceText = s.sentence || s.text || '';
                              const rootWord = s.rootWord || '';
                              const correct = s.correctAnswer;
                              const isCorrect = submitted && String(userAnswer || '').trim().toLowerCase() === String(correct || '').trim().toLowerCase();

                              return (
                                <div
                                  key={key}
                                  ref={(el) => (questionRefs.current[key] = el)}
                                  className={
                                    `cambridge-question-wrapper ` +
                                    `${userAnswer ? 'answered' : ''} ` +
                                    `${activeQuestion === key ? 'active-question' : ''}`
                                  }
                                >
                                  <button
                                    className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                    onClick={() => toggleFlag(key)}
                                    aria-label="Flag question"
                                    type="button"
                                  >
                                    {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                  </button>

                                  <div style={{ paddingRight: '50px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#1f2937' }}>{sentenceText}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center' }}>
                                      <div style={{ padding: '10px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', color: '#78350f' }}>
                                        Root word: <strong>{rootWord}</strong>
                                      </div>
                                      <input
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        disabled={submitted}
                                        placeholder="Type the correct form..."
                                        style={{
                                          ...styles.input,
                                          ...(submitted && {
                                            backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                                            borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                          }),
                                        }}
                                      />
                                    </div>

                                    {submitted && correct && !isCorrect && (
                                      <div style={styles.correctAnswer}>✓ Đáp án đúng: {correct}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : sectionType === 'people-matching' ? (
                      (() => {
                        const qIdx = 0;
                        const container = section.questions[0] || {};
                        const getOptionLabel = (t) => {
                          const id = String(t?.id || '').trim();
                          const content = String(t?.title || t?.content || '').trim();
                          return content ? `${id} ${content}`.trim() : id;
                        };
                        const people = (Array.isArray(container.people) && container.people.length > 0)
                          ? container.people
                          : [
                              { id: 'A', name: '', need: '' },
                              { id: 'B', name: '', need: '' },
                              { id: 'C', name: '', need: '' },
                              { id: 'D', name: '', need: '' },
                              { id: 'E', name: '', need: '' },
                            ];
                        const texts = (Array.isArray(container.texts) && container.texts.length > 0)
                          ? container.texts
                          : [
                              { id: 'A', title: '', content: '' },
                              { id: 'B', title: '', content: '' },
                              { id: 'C', title: '', content: '' },
                              { id: 'D', title: '', content: '' },
                              { id: 'E', title: '', content: '' },
                              { id: 'F', title: '', content: '' },
                              { id: 'G', title: '', content: '' },
                              { id: 'H', title: '', content: '' },
                            ];
                        return (
                          <div>
                            <div className="cambridge-question-wrapper" style={{ marginBottom: '16px' }}>
                              <div style={{ paddingRight: '50px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                  <div style={{ border: '1px solid #bae6fd', background: '#f0f9ff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: '#0e276f', marginBottom: '8px' }}>People</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {people.map((p, idx) => {
                                        const pid = p?.id || String.fromCharCode(65 + idx);
                                        return (
                                          <div key={pid} style={{ padding: '10px', background: '#fff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                                            <strong>{pid}.</strong> {p?.name || ''} {p?.need ? `— ${p.need}` : ''}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontWeight: 700, color: '#0e276f', marginBottom: '8px' }}>Texts</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {texts.map((t) => (
                                        <div key={t?.id || t?.title || Math.random()} style={{ padding: '10px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                          <strong>{String(t?.id || '').trim()}.</strong>
                                          <span style={{ marginLeft: '6px' }}>{String(t?.title || t?.content || '').trim()}</span>
                                          {t?.title && t?.content ? (
                                            <div style={{ marginTop: '6px' }}>{t?.content || ''}</div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {people.map((p, idx) => {
                                const pid = p?.id || String.fromCharCode(65 + idx);
                                const key = `${currentPartIndex}-${secIdx}-${qIdx}-${pid}`;
                                const num = sectionStartNum + idx;
                                const userAnswer = answers[key] || '';
                                const correct = container?.answers?.[pid];
                                const isCorrect = submitted && String(userAnswer || '').trim() === String(correct || '').trim();

                                return (
                                  <div
                                    key={key}
                                    ref={(el) => (questionRefs.current[key] = el)}
                                    className={
                                      `cambridge-question-wrapper ` +
                                      `${userAnswer ? 'answered' : ''} ` +
                                      `${activeQuestion === key ? 'active-question' : ''}`
                                    }
                                  >
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                    </button>

                                    <div style={{ paddingRight: '50px', display: 'grid', gridTemplateColumns: '56px 1fr 160px', gap: '12px', alignItems: 'center' }}>
                                      <span className="cambridge-question-number">{num}</span>
                                      <div style={{ color: '#1f2937' }}>
                                        <strong>{pid}.</strong> {p?.name || ''}
                                      </div>
                                      <select
                                        value={userAnswer}
                                        disabled={submitted}
                                        onChange={(e) => handleAnswerChange(key, e.target.value)}
                                        style={{
                                          padding: '10px 12px',
                                          border: '2px solid #d1d5db',
                                          borderRadius: '8px',
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          background: '#fff',
                                          ...(submitted
                                            ? {
                                                borderColor: isCorrect ? '#22c55e' : '#ef4444',
                                                background: isCorrect ? '#dcfce7' : '#fee2e2',
                                              }
                                            : null),
                                        }}
                                      >
                                        <option value="">—</option>
                                        {texts.map((t) => (
                                          <option key={t?.id} value={String(t?.id || '').trim()}>
                                            {getOptionLabel(t)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : section.questionType === 'short-message' && section.questions?.[0] ? (
                      (() => {
                        const qIdx = 0;
                        const q = section.questions[0] || {};
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        const num = sectionStartNum;
                        const userAnswer = answers[key] || '';
                        return (
                          <div ref={(el) => (questionRefs.current[key] = el)} style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                              <span style={styles.questionNum}>{num}</span>
                              <span style={styles.questionText}>{q.situation || 'Write a short message.'}</span>
                            </div>

                            {Array.isArray(q.bulletPoints) && q.bulletPoints.some(Boolean) && (
                              <ul style={{ marginTop: '8px', marginBottom: '12px', color: '#334155' }}>
                                {q.bulletPoints.filter(Boolean).map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}

                            <textarea
                              value={userAnswer}
                              onChange={(e) => handleAnswerChange(key, e.target.value)}
                              disabled={submitted}
                              rows={6}
                              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #d1d5db', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }}
                              placeholder="Type your answer..."
                            />
                            {submitted && (
                              <div style={{ marginTop: '10px', color: '#64748b', fontSize: '13px' }}>
                                (This question is not auto-scored.)
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : section.questionType === 'sign-message' ? (
                      section.questions?.map((q, qIdx) => {
                        const key = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={key} ref={(el) => (questionRefs.current[key] = el)}>
                            <div style={styles.questionCard}>
                              <div style={styles.questionHeader}>
                                <span style={styles.questionNum}>{sectionStartNum + qIdx}</span>
                                <span style={styles.questionText}>{q.signText || q.questionText || ''}</span>
                              </div>
                              {q.imageUrl ? (
                                <div style={{ marginBottom: '12px' }}>
                                  <img
                                    src={resolveImgSrc(q.imageUrl)}
                                    alt=""
                                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}
                                  />
                                </div>
                              ) : null}
                              <div style={styles.optionsContainer}>
                                {(q.options || []).slice(0, 3).map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  const isSelected = (answers[key] || '') === letter;
                                  const isCorrectOption = submitted && String(q.correctAnswer || '').toUpperCase() === letter;
                                  return (
                                    <label
                                      key={letter}
                                      style={{
                                        ...styles.optionLabel,
                                        ...(isSelected && styles.optionSelected),
                                        ...(submitted && isCorrectOption && styles.optionCorrect),
                                        ...(submitted && isSelected && !isCorrectOption && styles.optionWrong),
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={key}
                                        checked={isSelected}
                                        onChange={() => handleAnswerChange(key, letter)}
                                        disabled={submitted}
                                        style={{ marginRight: '10px' }}
                                      />
                                      <span style={styles.optionText}>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Default per-question rendering
                      section.questions?.map((q, qIdx) => {
                        const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;
                        return (
                          <div key={qIdx} ref={(el) => (questionRefs.current[questionKey] = el)}>
                            {renderQuestion(q, questionKey, sectionStartNum + qIdx)}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Navigation Buttons */}
          <div style={styles.navButtons}>
            <button
              onClick={() => setCurrentPartIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPartIndex === 0}
              style={{
                ...styles.navButton,
                ...(currentPartIndex === 0 && styles.navButtonDisabled),
              }}
            >
              ← Previous Part
            </button>
            <button
              onClick={() => setCurrentPartIndex((prev) => Math.min((test?.parts?.length || 1) - 1, prev + 1))}
              disabled={currentPartIndex === (test?.parts?.length || 1) - 1}
              style={{
                ...styles.navButton,
                ...(currentPartIndex === (test?.parts?.length || 1) - 1 && styles.navButtonDisabled),
              }}
            >
              Next Part →
            </button>
          </div>
        </div>
      </div>

      {/* Footer navigation (Cambridge-style) */}
      {test && (
        <footer style={styles.footerBar} aria-label="Questions">
          <div style={styles.footerNavButtons} role="navigation" aria-label="Previous / next question">
            <button
              type="button"
              aria-label="Previous"
              style={styles.footerArrowBtn}
              disabled={!activeQuestion || questionIndex.orderedKeys.findIndex((x) => x.key === activeQuestion) <= 0}
              onClick={() => {
                const idx = questionIndex.orderedKeys.findIndex((x) => x.key === activeQuestion);
                if (idx > 0) {
                  const prev = questionIndex.orderedKeys[idx - 1];
                  setCurrentPartIndex(prev.partIndex);
                  setExpandedPart(prev.partIndex);
                  setActiveQuestion(prev.key);
                }
              }}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next"
              style={styles.footerArrowBtn}
              disabled={!activeQuestion || questionIndex.orderedKeys.findIndex((x) => x.key === activeQuestion) >= (questionIndex.orderedKeys.length - 1)}
              onClick={() => {
                const idx = questionIndex.orderedKeys.findIndex((x) => x.key === activeQuestion);
                if (idx >= 0 && idx < questionIndex.orderedKeys.length - 1) {
                  const next = questionIndex.orderedKeys[idx + 1];
                  setCurrentPartIndex(next.partIndex);
                  setExpandedPart(next.partIndex);
                  setActiveQuestion(next.key);
                }
              }}
            >
              →
            </button>
          </div>

          <div style={styles.footerPartsRow} role="tablist" aria-label="Parts">
            {questionIndex.byPart.map((p) => {
              const total = p.keys.length;
              const attempted = p.keys.reduce((acc, item) => acc + (answers[item.key] ? 1 : 0), 0);
              const isExpanded = expandedPart === p.partIndex;
              return (
                <div key={p.partIndex} style={styles.footerPartWrapper}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={currentPartIndex === p.partIndex}
                    onClick={() => {
                      setExpandedPart(p.partIndex);
                      const firstKey = p.keys?.[0]?.key;
                      if (firstKey) {
                        setCurrentPartIndex(p.partIndex);
                        setActiveQuestion(firstKey);
                      } else {
                        setCurrentPartIndex(p.partIndex);
                      }
                    }}
                    style={{
                      ...styles.footerPartBtn,
                      ...(currentPartIndex === p.partIndex ? styles.footerPartBtnActive : null),
                    }}
                  >
                    <span style={{ opacity: 0.85 }}>Part </span>
                    <span style={{ fontWeight: 700 }}>{p.partIndex + 1}</span>
                    <span style={styles.footerAttemptedCount} aria-hidden="true">
                      {attempted}/{total}
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={styles.footerSubquestions} role="group" aria-label={`Part ${p.partIndex + 1} questions`}>
                      {p.keys.map((item) => {
                        const isAnswered = !!answers[item.key];
                        const isActive = activeQuestion === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setCurrentPartIndex(p.partIndex);
                              setActiveQuestion(item.key);
                            }}
                            style={{
                              ...styles.footerSubquestionBtn,
                              ...(isAnswered ? styles.footerSubquestionAnswered : null),
                              ...(isActive ? styles.footerSubquestionActive : null),
                            }}
                          >
                            {item.number}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              id="deliver-button"
              type="button"
              aria-label="Review your answers"
              onClick={() => setShowConfirm(true)}
              style={styles.footerDeliverBtn}
            >
              ✓
            </button>
          </div>
        </footer>
      )}

      {/* Results Modal */}
      {submitted && results && (
        <div style={styles.resultsOverlay}>
          <div style={styles.resultsModal}>
            <h2 style={{ margin: '0 0 20px', color: '#0e276f' }}>📊 Kết quả bài thi</h2>
            <div style={styles.scoreDisplay}>
              <div style={styles.scoreNumber}>{results.score}/{results.total}</div>
              <div style={styles.scorePercent}>{results.percentage}%</div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/cambridge')} style={styles.primaryButton}>
                📋 Chọn đề khác
              </button>
              <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
                🔄 Làm lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div style={styles.resultsOverlay}>
          <div style={styles.confirmModal}>
            <h3 style={{ margin: '0 0 16px' }}>⚠️ Xác nhận nộp bài</h3>
            <p>Bạn có chắc chắn muốn nộp bài?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Đã trả lời: {Object.keys(answers).length} câu
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={confirmSubmit} style={styles.primaryButton}>
                ✓ Nộp bài
              </button>
              <button onClick={() => setShowConfirm(false)} style={styles.secondaryButton}>
                ✕ Hủy
              </button>
            </div>
          </div>
        </div>
      )}
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
    paddingBottom: '130px',
  },
  playGateOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  playGateCard: {
    width: '100%',
    maxWidth: '520px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '22px 20px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  playGateButton: {
    background: '#0e276f',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: '160px',
  },
  rubricBlock: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '14px',
  },
  rubricTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#0f172a',
  },
  rubricText: {
    marginTop: '6px',
    fontSize: '14px',
    color: '#475569',
  },
  pictureQuestionCard: {
    padding: '10px 0 18px',
    marginBottom: '18px',
    backgroundColor: 'transparent',
    borderBottom: '1px solid #e5e7eb',
  },
  pictureQuestionHeader: {
    position: 'relative',
    marginBottom: '10px',
  },
  flagButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.85,
  },
  flagButtonActive: {
    opacity: 1,
  },
  pictureChoicesRow: {
    display: 'flex',
    gap: '34px',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    padding: '12px 0 6px',
    overflowX: 'auto',
  },
  pictureChoiceItem: {
    width: '295px',
    flex: '0 0 295px',
  },
  pictureChoiceLabelWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: '8px',
    padding: '6px',
  },
  pictureChoiceSelected: {
    outline: '2px solid rgba(14,39,111,0.22)',
    outlineOffset: '2px',
  },
  pictureChoiceCorrect: {
    outline: '2px solid rgba(34,197,94,0.35)',
    outlineOffset: '2px',
  },
  pictureChoiceWrong: {
    outline: '2px solid rgba(239,68,68,0.35)',
    outlineOffset: '2px',
  },
  pictureChoiceImage: {
    width: '295px',
    height: 'auto',
    display: 'block',
    borderRadius: '0px',
  },
  pictureChoiceImagePlaceholder: {
    width: '295px',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    background: '#f8fafc',
    borderRadius: '0px',
    fontSize: '12px',
  },
  pictureChoiceRadio: {
    marginTop: '6px',
  },
  audioTipWrap: {
    position: 'relative',
    marginLeft: '10px',
    flex: '0 0 auto',
  },
  audioTipButton: {
    width: '22px',
    height: '22px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  audioTipBubble: {
    position: 'absolute',
    right: 0,
    top: '28px',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: '12px',
    padding: '8px 10px',
    borderRadius: '10px',
    whiteSpace: 'nowrap',
    boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
    zIndex: 10,
  },
  footerBar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    zIndex: 1000,
    padding: '10px 12px',
  },
  footerNavButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  footerArrowBtn: {
    width: '40px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: 1,
  },
  footerPartsRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  footerPartWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '140px',
  },
  footerPartBtn: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '8px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    fontSize: '13px',
    color: '#0f172a',
  },
  footerPartBtnActive: {
    background: '#ffffff',
    borderColor: '#0e276f',
    boxShadow: '0 0 0 2px rgba(14,39,111,0.08)',
  },
  footerAttemptedCount: {
    fontSize: '12px',
    color: '#64748b',
    marginLeft: 'auto',
  },
  footerSubquestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  footerSubquestionBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#0f172a',
  },
  footerSubquestionAnswered: {
    background: '#ecfeff',
    borderColor: '#06b6d4',
  },
  footerSubquestionActive: {
    background: '#0e276f',
    borderColor: '#0e276f',
    color: '#ffffff',
  },
  footerDeliverBtn: {
    marginLeft: 'auto',
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    background: '#0e276f',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
    flex: '0 0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  questionArea: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  partHeader: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  partInstruction: {
    margin: '12px 0 0',
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: 1.6,
    backgroundColor: '#f0f9ff',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6',
  },
  audioContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
  },
  questionCard: {
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  questionNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '13px',
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  correctAnswer: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '14px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  optionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  optionCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionText: {
    flex: 1,
    fontSize: '14px',
  },
  matchingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  matchingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  matchingItem: {
    flex: 1,
    fontSize: '14px',
  },
  matchingSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
  },
  rightItemsRef: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
  },
  rightItemBadge: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    fontSize: '13px',
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  navButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  resultsOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  resultsModal: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '16px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
  },
  confirmModal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '360px',
    width: '90%',
  },
  scoreDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '24px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0e276f',
  },
  scorePercent: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#22c55e',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  backButton: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default DoCambridgeListeningTest;
