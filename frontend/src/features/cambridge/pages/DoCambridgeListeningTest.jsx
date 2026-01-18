import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import { styles } from "./DoCambridgeListeningTest.styles";
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
  const [audioError, setAudioError] = useState(null);

  const audioRef = useRef(null);
  const questionRefs = useRef({});
  const maxPlayedTimeByPartRef = useRef({});
  const ignoreSeekRef = useRef(false);
  const switchingAudioSrcRef = useRef(false);

  // Cambridge Reading-like splitter
  const [leftWidth, setLeftWidth] = useState(42);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

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

    const countClozeBlanks = (question) => {
      if (Array.isArray(question?.blanks) && question.blanks.length) return question.blanks.length;
      const passageHtml = question?.passageText || question?.passage || '';
      if (!passageHtml) return 0;

      let plainText = passageHtml;
      if (typeof document !== 'undefined') {
        const temp = document.createElement('div');
        temp.innerHTML = passageHtml;
        plainText = temp.textContent || temp.innerText || passageHtml;
      } else {
        plainText = String(passageHtml).replace(/<[^>]*>/g, ' ');
      }

      const numbered = plainText.match(/\((\d+)\)|\[(\d+)\]/g);
      if (numbered && numbered.length) return numbered.length;

      const underscores = plainText.match(/[_…]{3,}/g);
      return underscores ? underscores.length : 0;
    };

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

          if (secType === 'cloze-mc' && Array.isArray(q?.blanks)) {
            for (let blankIdx = 0; blankIdx < q.blanks.length; blankIdx++) {
              const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
              const num = globalNumber++;
              partKeys.push({ key, number: num, sectionIndex: sIdx });
              orderedKeys.push({ key, partIndex: pIdx, number: num });
            }
            continue;
          }

          if (secType === 'cloze-test') {
            const blanksCount = countClozeBlanks(q);
            if (blanksCount > 0) {
              for (let blankIdx = 0; blankIdx < blanksCount; blankIdx++) {
                const key = `${pIdx}-${sIdx}-${qIdx}-${blankIdx}`;
                const num = globalNumber++;
                partKeys.push({ key, number: num, sectionIndex: sIdx });
                orderedKeys.push({ key, partIndex: pIdx, number: num });
              }
              continue;
            }
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

  const isSinglePanelPart = useMemo(() => {
    if (currentPartIndex === 0) return true;
    const sections = currentPart?.sections || [];
    return sections.some((section) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      return sectionType === 'cloze-test';
    });
  }, [currentPartIndex, currentPart]);

  const currentAudioUrl = useMemo(() => {
    return currentPart?.audioUrl || globalAudioUrl || '';
  }, [currentPart, globalAudioUrl]);

  const resolveAudioSrc = useCallback((url) => {
    if (!url) return '';
    const s = String(url).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return hostPath(s);
    return hostPath(`/${s}`);
  }, []);

  const resolvedAudioSrc = useMemo(() => {
    return resolveAudioSrc(currentAudioUrl);
  }, [currentAudioUrl, resolveAudioSrc]);

  useEffect(() => {
    setAudioError(null);

    const audio = audioRef.current;
    if (!audio) return;

    // When switching parts/audio, reset playback bookkeeping without the pause-handler forcing replay.
    switchingAudioSrcRef.current = true;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    maxPlayedTimeByPartRef.current = {
      ...(maxPlayedTimeByPartRef.current || {}),
      [currentPartIndex]: 0,
    };

    const t = setTimeout(() => {
      switchingAudioSrcRef.current = false;
    }, 0);

    return () => clearTimeout(t);
  }, [resolvedAudioSrc, currentPartIndex]);

  const isStartGateVisible = useMemo(() => {
    if (submitted) return false;
    if (!resolvedAudioSrc) return false;
    // If only one audio file for whole test, show gate once at the beginning.
    if (audioMeta.isSingleFile) return !testStarted;
    return !startedAudioByPart?.[currentPartIndex];
  }, [submitted, resolvedAudioSrc, startedAudioByPart, currentPartIndex, audioMeta.isSingleFile, testStarted]);

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
    if (!resolvedAudioSrc) {
      setAudioError('Audio source is missing.');
      return;
    }
    try {
      // Ensure the element picks up the current src before attempting to play.
      audio.load?.();
      await audio.play();
      markPartAudioStarted(currentPartIndex);
    } catch (e) {
      console.error('Audio play failed:', e);
      setAudioError(
        e?.name === 'NotSupportedError'
          ? 'Audio file is not supported or the source URL is invalid.'
          : 'Unable to play audio. Please check your connection or try another browser.'
      );
    }
  }, [currentPartIndex, markPartAudioStarted, resolvedAudioSrc]);

  const handleAudioPlay = useCallback(() => {
    markPartAudioStarted(currentPartIndex);
  }, [currentPartIndex, markPartAudioStarted]);

  const handleAudioPause = useCallback(() => {
    if (switchingAudioSrcRef.current) return;
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
    let s = String(url).trim();
    // Normalize common storage formats
    s = s.replace(/\\/g, '/');
    s = s.replace(/^\.\//, '');
    s = s.replace(/^(\.\.\/)+/, '');

    const normalizePathSegments = (path) => {
      const rawParts = String(path || '').split('/').filter(Boolean);
      const out = [];
      const dedupeWhitelist = new Set(['cambridge', 'upload', 'uploads']);
      for (const part of rawParts) {
        const prev = out[out.length - 1];
        if (prev && prev === part && dedupeWhitelist.has(part)) continue;
        out.push(part);
      }
      return `/${out.join('/')}`;
    };

    const rewriteKnownUploadPaths = (path) => {
      let p = String(path || '');
      // Backend serves static assets from /uploads (see backend/server.js).
      // Some older/stored data may reference /upload; normalize to /uploads.
      p = p.replace(/^\/upload\//i, '/uploads/');
      p = p.replace(/^\/upload$/i, '/uploads');
      return p;
    };

    const normalizeUrlLike = (value) => {
      const str = String(value || '');
      const [baseAndPath, hash = ''] = str.split('#');
      const [base, query = ''] = baseAndPath.split('?');

      // Absolute URL: normalize pathname only.
      if (/^https?:\/\//i.test(base)) {
        try {
          const u = new URL(str);
          u.pathname = rewriteKnownUploadPaths(normalizePathSegments(u.pathname));
          return u.toString();
        } catch {
          // fall through
        }
      }

      const normalizedPath = rewriteKnownUploadPaths(normalizePathSegments(base));
      return `${normalizedPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
    };

    if (/^data:/i.test(s)) return s;
    if (/^blob:/i.test(s)) return s;

    s = normalizeUrlLike(s);

    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return hostPath(s);
    return hostPath(`/${s}`);
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

  const normalizeClozeHtml = useCallback((html) => {
    const s = String(html || '');
    return s
      .replace(/<\s*br\s*\/?>/gi, ' ')
      .replace(/<\s*\/\s*p\s*>/gi, '</span>')
      .replace(/<\s*p[^>]*>/gi, '<span>')
      .replace(/<\s*\/\s*div\s*>/gi, '</span>')
      .replace(/<\s*div[^>]*>/gi, '<span>');
  }, []);

  const renderOpenClozeSection = (section, secIdx, sectionStartNum) => {
    const qIdx = 0;
    const container = section.questions[0] || {};
    const passageText = container.passageText || container.passage || '';
    const normalizedPassageText = normalizeClozeHtml(passageText);
    const passageTitle = container.passageTitle || '';
    let blanks = Array.isArray(container.blanks) ? container.blanks : [];

    // Fallback: parse blanks from passage if backend didn't provide them.
    if (!blanks.length && passageText) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = passageText;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      const blankMatches = [];
      const regex = /\((\d+)\)|\[(\d+)\]/g;
      let match;

      while ((match = regex.exec(plainText)) !== null) {
        const num = parseInt(match[1] || match[2]);
        blankMatches.push({
          questionNum: num,
          fullMatch: match[0],
          index: match.index,
        });
      }

      if (!blankMatches.length) {
        const underscorePattern = /[_…]{3,}/g;
        let blankIndex = 0;
        while ((match = underscorePattern.exec(plainText)) !== null) {
          blankMatches.push({
            questionNum: sectionStartNum + blankIndex,
            fullMatch: match[0],
            index: match.index,
          });
          blankIndex++;
        }
      }

      blanks = blankMatches.sort((a, b) => a.questionNum - b.questionNum);
    }

    const renderInlineWithInputs = (html, lineKeyPrefix, firstNumberInPassage) => {
      if (!html) return [];

      const elements = [];
      let lastIndex = 0;
      const regex = /\((\d+)\)|\[(\d+)\]/g;
      let match;
      let matchedAnyNumber = false;

      while ((match = regex.exec(html)) !== null) {
        matchedAnyNumber = true;
        const questionNumber = parseInt(match[1] || match[2]);
        const blankIndex = questionNumber - firstNumberInPassage;

        if (blankIndex >= 0 && blankIndex < blanks.length) {
          if (match.index > lastIndex) {
            elements.push(
              <span
                key={`${lineKeyPrefix}-text-${lastIndex}`}
                dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, match.index) }}
              />
            );
          }

          const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIndex}`;
          const userAnswer = answers[questionKey] || '';

          elements.push(
            <input
              key={`${lineKeyPrefix}-input-${questionNumber}`}
              id={`question-${questionNumber}`}
              type="text"
              value={userAnswer}
              onChange={(e) => handleAnswerChange(questionKey, e.target.value.trim())}
              disabled={submitted}
              placeholder={`(${questionNumber})`}
              style={{
                display: 'inline-block',
                margin: '0 4px',
                padding: '6px 10px',
                fontSize: '15px',
                fontWeight: '600',
                border: '2px solid #0284c7',
                borderRadius: '4px',
                backgroundColor: userAnswer ? '#f0f9ff' : 'white',
                color: '#0e7490',
                width: '120px',
                textAlign: 'center',
                scrollMarginTop: '100px',
              }}
            />
          );

          lastIndex = match.index + match[0].length;
        }
      }

      if (!matchedAnyNumber) {
        const underscorePattern = /[_…]{3,}/g;
        let blankIndex = 0;
        lastIndex = 0;
        let um;

        while ((um = underscorePattern.exec(html)) !== null) {
          if (um.index > lastIndex) {
            elements.push(
              <span
                key={`${lineKeyPrefix}-text-${lastIndex}`}
                dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, um.index) }}
              />
            );
          }

          if (blankIndex < blanks.length) {
            const questionNumber = sectionStartNum + blankIndex;
            const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}-${blankIndex}`;
            const userAnswer = answers[questionKey] || '';

            elements.push(
              <input
                key={`${lineKeyPrefix}-input-${questionNumber}`}
                id={`question-${questionNumber}`}
                type="text"
                value={userAnswer}
                onChange={(e) => handleAnswerChange(questionKey, e.target.value.trim())}
                disabled={submitted}
                placeholder={`(${questionNumber})`}
                style={{
                  display: 'inline-block',
                  margin: '0 4px',
                  padding: '6px 10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: '2px solid #0284c7',
                  borderRadius: '4px',
                  backgroundColor: userAnswer ? '#f0f9ff' : 'white',
                  color: '#0e7490',
                  width: '120px',
                  textAlign: 'center',
                  scrollMarginTop: '100px',
                }}
              />
            );
            blankIndex++;
          }

          lastIndex = um.index + um[0].length;
        }
      }

      if (lastIndex < html.length) {
        elements.push(
          <span
            key={`${lineKeyPrefix}-text-${lastIndex}`}
            dangerouslySetInnerHTML={{ __html: html.substring(lastIndex) }}
          />
        );
      }

      return elements;
    };

    const renderPassageWithInputs = () => {
      if (!normalizedPassageText) return null;

      const listContainer = document.createElement('div');
      listContainer.innerHTML = passageText;
      const listItems = Array.from(listContainer.querySelectorAll('li'));

      const regex = /\((\d+)\)|\[(\d+)\]/g;
      const firstNumberMatch = regex.exec(normalizedPassageText);
      const firstNumberInPassage = firstNumberMatch
        ? parseInt(firstNumberMatch[1] || firstNumberMatch[2])
        : sectionStartNum;
      regex.lastIndex = 0;

      if (listItems.length > 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {listItems.map((li, idx) => (
              <div
                key={`cloze-line-${idx}`}
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}
              >
                {renderInlineWithInputs(li.innerHTML, `line-${idx}`, firstNumberInPassage)}
              </div>
            ))}
          </div>
        );
      }

      return renderInlineWithInputs(normalizedPassageText, 'inline', firstNumberInPassage);
    };

    const sectionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;

    return (
      <div className={`cambridge-question-wrapper ${flaggedQuestions.has(sectionKey) ? 'flagged-section' : ''}`} style={{ position: 'relative' }}>
        <button
          className={`cambridge-flag-button ${flaggedQuestions.has(sectionKey) ? 'flagged' : ''}`}
          onClick={() => toggleFlag(sectionKey)}
          aria-label="Flag question"
          style={{ position: 'absolute', top: 0, right: 0 }}
        >
          {flaggedQuestions.has(sectionKey) ? '🚩' : '⚐'}
        </button>

        {passageTitle ? (
          <h3
            style={{
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#0c4a6e',
            }}
            dangerouslySetInnerHTML={{ __html: passageTitle }}
          />
        ) : null}

        <div
          className="cambridge-passage-content"
          style={{
            padding: '20px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0284c7',
            borderRadius: '12px',
            fontSize: '15px',
            lineHeight: 2,
          }}
        >
          {renderPassageWithInputs()}
        </div>
      </div>
    );
  };

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

  // Divider resize handlers (match Reading UI)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit between 20% and 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const currentKeyIndex = useMemo(() => {
    const list = questionIndex?.orderedKeys || [];
    if (!activeQuestion) return 0;
    const idx = list.findIndex((it) => it.key === activeQuestion);
    return idx >= 0 ? idx : 0;
  }, [questionIndex, activeQuestion]);

  const goToKeyIndex = useCallback(
    (idx) => {
      const list = questionIndex?.orderedKeys || [];
      if (idx < 0 || idx >= list.length) return;
      const next = list[idx];
      setCurrentPartIndex(next.partIndex);
      setExpandedPart(next.partIndex);
      setActiveQuestion(next.key);

      // Focus the matching blank/input if it exists (Open Cloze and similar).
      if (next?.number) {
        setTimeout(() => {
          const el = document.getElementById(`question-${next.number}`);
          if (el && typeof el.focus === 'function') {
            el.focus({ preventScroll: true });
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 0);
      }
    },
    [questionIndex]
  );

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
    const isActive = activeQuestion === questionKey;
    const isAnswered = (() => {
      if (Array.isArray(userAnswer)) return userAnswer.length > 0;
      if (userAnswer && typeof userAnswer === 'object') return Object.keys(userAnswer).length > 0;
      return String(userAnswer ?? '').trim() !== '';
    })();

    const wrapperClassName = `cambridge-question-wrapper ${isAnswered ? 'answered' : ''} ${isActive ? 'active-question' : ''}`;

    switch (qType) {
      case 'fill':
        return (
          <div className={wrapperClassName}>
            <div style={styles.questionHeader}>
              <span className="cambridge-question-number">{questionNum}</span>
              <div className="cambridge-question-text">{question.questionText}</div>
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
          <div className={wrapperClassName}>
            <div style={styles.questionHeader}>
              <span className="cambridge-question-number">{questionNum}</span>
              <div className="cambridge-question-text">{question.questionText}</div>
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
        const rawImageOptions = (() => {
          if (Array.isArray(question.imageOptions) && question.imageOptions.length) return question.imageOptions;
          if (Array.isArray(question.options) && question.options.length) return question.options;
          if (Array.isArray(question.images) && question.images.length) return question.images;
          return [];
        })();

        const imageOptions = rawImageOptions
          .map((opt) => {
            if (!opt) return {};
            if (typeof opt === 'string') return { imageUrl: opt };
            if (typeof opt === 'object') {
              return {
                ...opt,
                imageUrl: opt.imageUrl || opt.image || opt.url || opt.src || opt.path,
                label: opt.label || opt.text || opt.caption || opt.title,
              };
            }
            return {};
          });

        return (
          <div className={wrapperClassName} style={styles.pictureQuestionCard}>
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
                <span className="cambridge-question-number">{questionNum}</span>
                <div className="cambridge-question-text">{question.questionText}</div>
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

                const imgSrc = opt.imageUrl ? resolveImgSrc(opt.imageUrl) : '';

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
                      <div
                        style={{
                          position: 'relative',
                          width: styles.pictureChoiceImagePlaceholder.width,
                          height: styles.pictureChoiceImagePlaceholder.height,
                          overflow: 'hidden',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          background: '#f8fafc',
                        }}
                      >
                        <div style={{ ...styles.pictureChoiceImagePlaceholder, width: '100%', height: '100%' }}>
                          {imgSrc ? 'Loading…' : `No image (${optionLabel})`}
                        </div>

                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt=""
                            style={{
                              ...styles.pictureChoiceImage,
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              background: '#ffffff',
                            }}
                            onLoad={(e) => {
                              // If it loads, hide the placeholder text behind.
                              // (We keep it in DOM to avoid layout shift.)
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onError={(e) => {
                              const el = e.currentTarget;
                              // If backend serves from /upload/cambridge but data has /uploads/cambridge (or vice-versa),
                              // try the alternate once before giving up.
                              if (el?.dataset?.fallbackTried !== '1') {
                                const current = String(el.currentSrc || el.src || '');
                                const swapped = current.includes('/uploads/')
                                  ? current.replace('/uploads/', '/upload/')
                                  : current.includes('/upload/')
                                    ? current.replace('/upload/', '/uploads/')
                                    : '';

                                if (swapped && swapped !== current) {
                                  el.dataset.fallbackTried = '1';
                                  el.src = swapped;
                                  return;
                                }
                              }

                              // Keep the placeholder visible if the image fails.
                              el.style.display = 'none';
                            }}
                          />
                        ) : null}

                        <div
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '10px',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#0e276f',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                          }}
                        >
                          {optionLabel}
                        </div>
                      </div>

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

                      {opt.label ? (
                        <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center' }}>{opt.label}</div>
                      ) : null}
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
          <div className={wrapperClassName}>
            <div style={styles.questionHeader}>
              <span className="cambridge-question-number">{questionNum}</span>
              <div className="cambridge-question-text">{question.questionText || 'Match the items'}</div>
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
          <div className={wrapperClassName}>
            <div style={styles.questionHeader}>
              <span className="cambridge-question-number">{questionNum}</span>
              <div className="cambridge-question-text">{question.questionText}</div>
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
      <div className="cambridge-loading">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2>Đang tải đề thi...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cambridge-error">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Lỗi: {error}</h2>
        <button onClick={() => navigate(-1)} className="cambridge-nav-button">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="cambridge-test-container">
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

            {audioError && (
              <div style={{ ...styles.audioErrorBox, marginTop: 12, marginBottom: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Audio issue</div>
                <div style={{ marginBottom: 8 }}>{audioError}</div>
                <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                  Open audio in a new tab
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="cambridge-main-content" ref={containerRef} style={{ position: 'relative' }}>
        {isSinglePanelPart ? (
          // Part 1: single panel (teacher request)
          <div className="cambridge-questions-column" style={{ width: '100%' }}>
            <div className="cambridge-content-wrapper">
              {currentPart && (
                <>
                  {(() => {
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <div className="cambridge-part-instruction" style={{ marginBottom: 14 }}>
                        {!hasQuestionRangeInInstruction && (
                          <strong>Questions {range.start}–{range.end}</strong>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                        </div>
                      </div>
                    );
                  })()}

                  {resolvedAudioSrc && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <span style={{ marginRight: '12px' }}>🎧</span>
                      <audio
                        ref={audioRef}
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
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

                  {resolvedAudioSrc && audioError && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}
                </>
              )}

              {currentPart &&
                currentPart.sections?.map((section, secIdx) => {
                  const partRange = getPartQuestionRange(currentPartIndex);
                  const sectionStartNum =
                    questionIndex.byPart?.[currentPartIndex]?.keys?.find((k) => k.sectionIndex === secIdx)?.number ||
                    partRange.start;

                  // Teacher wants Part 1 displayed one question at a time (like the Cambridge player).
                  // We use the global `activeQuestion` key to decide which question to show.
                  const partKeys = questionIndex?.byPart?.[currentPartIndex]?.keys || [];
                  const defaultActiveKey = partKeys?.[0]?.key;
                  const activeKeyForPart =
                    activeQuestion && String(activeQuestion).startsWith(`${currentPartIndex}-`)
                      ? activeQuestion
                      : defaultActiveKey;

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
                    <div key={secIdx} className="cambridge-section">
                      {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}

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

                                    <div style={{ paddingRight: '50px' }}>
                                      <div className="cambridge-question-header">
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
                                      </div>

                                      <div style={styles.optionsContainer}>
                                        {opts.map((opt, i) => {
                                          const letter = String.fromCharCode(65 + i);
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
                      ) : sectionType === 'cloze-mc' && section.questions?.[0]?.clozeText ? (
                        (() => {
                          // fall through to existing renderer below in the 2-panel branch
                          return null;
                        })()
                      ) : sectionType === 'cloze-test' ? (
                        renderOpenClozeSection(section, secIdx, sectionStartNum)
                      ) : (
                        // Default per-question rendering
                        section.questions?.map((q, qIdx) => {
                          const questionKey = `${currentPartIndex}-${secIdx}-${qIdx}`;

                          // Part 1: render only the active question card.
                          if (activeKeyForPart && questionKey !== activeKeyForPart) return null;

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
            </div>
          </div>
        ) : (
          // Other parts: keep 2-column Cambridge layout
          <>
            {/* Left Column: Audio + Instructions */}
            <div className="cambridge-passage-column" style={{ width: `${leftWidth}%` }}>
              {currentPart && (
                <div className="cambridge-passage-container">
                  {(() => {
                    const range = getPartQuestionRange(currentPartIndex);
                    const instructionText = String(currentPart.instruction || '');
                    const hasQuestionRangeInInstruction = /question(s)?\s*\d+/i.test(instructionText);
                    return (
                      <>
                        <div className="cambridge-part-instruction">
                          {!hasQuestionRangeInInstruction && (
                            <strong>Questions {range.start}–{range.end}</strong>
                          )}
                          <div style={{ marginTop: 6 }}>
                            {renderMaybeHtml(currentPart.instruction || 'For each question, choose the correct answer.')}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Audio Player */}
                  {resolvedAudioSrc && (
                    <div style={{ ...styles.audioContainer, marginBottom: 12 }}>
                      <span style={{ marginRight: '12px' }}>🎧</span>
                      <audio
                        ref={audioRef}
                        src={resolvedAudioSrc}
                        preload="auto"
                        controls={false}
                        controlsList="nodownload noplaybackrate"
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onSeeking={handleAudioSeeking}
                        onError={(e) => {
                          const mediaErr = e?.currentTarget?.error;
                          const code = mediaErr?.code;
                          setAudioError(
                            `Audio failed to load${code ? ` (code ${code})` : ''}. Please verify the uploaded file and URL.`
                          );
                        }}
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

                  {resolvedAudioSrc && audioError && (
                    <div style={styles.audioErrorBox} role="alert">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Audio issue</div>
                      <div style={{ marginBottom: 8 }}>{audioError}</div>
                      <a href={resolvedAudioSrc} target="_blank" rel="noreferrer" style={styles.audioOpenLink}>
                        Open audio in a new tab
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Draggable Divider */}
            <div
              className="cambridge-divider"
              style={{ left: `${leftWidth}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="cambridge-resize-handle">
                <i className="fa fa-ellipsis-v"></i>
              </div>
            </div>

            {/* Right Column: Questions */}
            <div className="cambridge-questions-column" style={{ width: `${100 - leftWidth}%` }}>
              <div className="cambridge-content-wrapper">
                {currentPart &&
                  currentPart.sections?.map((section, secIdx) => {
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
                  <div key={secIdx} className="cambridge-section">
                    {section.sectionTitle && <h3 className="cambridge-section-title">{section.sectionTitle}</h3>}

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
                                  <div className={`cambridge-question-wrapper ${userAnswer ? 'answered' : ''} ${activeQuestion === key ? 'active-question' : ''}`}>
                                    <button
                                      className={`cambridge-flag-button ${flaggedQuestions.has(key) ? 'flagged' : ''}`}
                                      onClick={() => toggleFlag(key)}
                                      aria-label="Flag question"
                                      type="button"
                                    >
                                      {flaggedQuestions.has(key) ? '🚩' : '⚐'}
                                    </button>

                                    <div style={{ paddingRight: '50px' }}>
                                      <div style={styles.questionHeader}>
                                        <span className="cambridge-question-number">{num}</span>
                                        <div className="cambridge-question-text">{nq.questionText || ''}</div>
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
                    ) : sectionType === 'cloze-test' ? (
                      renderOpenClozeSection(section, secIdx, sectionStartNum)
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
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Navigation (match Cambridge Reading) */}
      <footer className="cambridge-footer">
        {/* Navigation Arrows - Top Right */}
        <div className="cambridge-footer-arrows">
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex - 1)}
            disabled={currentKeyIndex === 0}
            aria-label="Previous"
            title="Previous question"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <button
            className="cambridge-nav-arrow-btn"
            onClick={() => goToKeyIndex(currentKeyIndex + 1)}
            disabled={currentKeyIndex >= (questionIndex?.orderedKeys?.length || 1) - 1}
            aria-label="Next"
            title="Next question"
          >
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>

        {/* Parts Tabs with Question Numbers */}
        <div className="cambridge-parts-container">
          {questionIndex.byPart.map((p) => {
            const total = p.keys.length;
            const answeredInPart = p.keys.reduce((acc, item) => acc + (answers[item.key] ? 1 : 0), 0);
            const isActive = currentPartIndex === p.partIndex;
            const firstKey = p.keys?.[0]?.key;

            return (
              <div key={p.partIndex} className="cambridge-part-wrapper">
                <button
                  className={`cambridge-part-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!firstKey) return;
                    const idx = questionIndex.orderedKeys.findIndex((x) => x.key === firstKey);
                    goToKeyIndex(idx);
                  }}
                >
                  <span className="cambridge-part-label">Part</span>
                  <span className="cambridge-part-number">{p.partIndex + 1}</span>
                </button>

                {isActive && (
                  <div className="cambridge-questions-inline">
                    {p.keys.map((item) => (
                      <button
                        key={item.key}
                        className={`cambridge-question-num-btn ${answers[item.key] ? 'answered' : ''} ${activeQuestion === item.key ? 'active' : ''} ${flaggedQuestions.has(item.key) ? 'flagged' : ''}`}
                        onClick={() => {
                          const idx = questionIndex.orderedKeys.findIndex((x) => x.key === item.key);
                          goToKeyIndex(idx);
                        }}
                      >
                        {item.number}
                      </button>
                    ))}
                  </div>
                )}

                {!isActive && (
                  <span className="cambridge-part-count">
                    {answeredInPart} of {total}
                  </span>
                )}
              </div>
            );
          })}

          {/* <button
            type="button"
            className="cambridge-review-button"
            onClick={handleSubmit}
            aria-label="Review your answers"
            title="Review"
          >
            <i className="fa fa-check"></i>
            Review
          </button> */}
        </div>
      </footer>

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

export default DoCambridgeListeningTest;
