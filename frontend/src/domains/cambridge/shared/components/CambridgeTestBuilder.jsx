import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import AdminNavbar from "../../../../shared/components/AdminNavbar";
import { 
  QuestionTypeSelector, 
  QuestionEditorFactory,
} from "../../../../shared/components/questions";
import { 
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
  TEST_CONFIGS,
} from "../../../../shared/config/questionTypes";
import { getOrangeSelectTestPathForTestType } from '../../config/navigation';
import { apiPath, hostPath, authFetch, redirectToLogin } from "../../../../shared/utils/api";
import useQuillImageUpload from "../../../../shared/hooks/useQuillImageUpload";
import { canManageCategory } from '../../../../shared/utils/permissions';
import AudioPreviewBlock from "../../../../shared/components/AudioPreviewBlock";
import LineIcon from "../../../../shared/components/LineIcon.jsx";
import "./CambridgeTestBuilder.css";
import { computeQuestionStarts, getQuestionCountForSection } from "../utils/questionNumbering";
import { buildMoversPracticeTest1Template } from "../utils/moversPracticeTest1Template";
import { normalizeAudioReference, normalizeListeningPartsAudio } from "../../../../shared/utils/audioUrls";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

const QUESTION_TYPE_ICONS = {
  fill: "fill",
  abc: "choice",
  abcd: "choice",
  "long-text-mc": "reading",
  "cloze-mc": "selector",
  "cloze-test": "form",
  "short-message": "writing",
  "people-matching": "matching",
  "word-form": "edit",
  "matching-pictures": "image",
  "image-cloze": "image",
  "word-drag-cloze": "flowchart",
  "story-completion": "reading",
  "look-read-write": "writing",
  "gap-match": "matching",
  "draw-lines": "target",
  "letter-matching": "matching",
  "image-tick": "correct",
  "colour-write": "palette",
};


/**
 * CambridgeTestBuilder - Component cho việc tạo đề Cambridge tests
 * Có thể dùng cho: KET, PET, FLYERS, MOVERS, STARTERS
 */
const CambridgeTestBuilder = ({ testType = 'ket-listening', editId = null, initialData = null, resetDraftOnLoad = false, apiBasePath = null }) => {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }

  const testConfig = getTestConfig(testType);
  const isListeningTest = testType.includes('listening');
  const youngLearnerSupportedTypeMap = {
    movers: ['matching-pictures', 'image-cloze', 'word-drag-cloze', 'story-completion', 'look-read-write', 'fill', 'abc', 'cloze-mc', 'word-form', 'short-message'],
  };
  const supportedTypeIds = youngLearnerSupportedTypeMap[testType] || null;
  const availableTypes = useMemo(() => {
    const baseTypes = getQuestionTypesForTest(testType);
    if (!supportedTypeIds) return baseTypes;
    return baseTypes.filter((type) => supportedTypeIds.includes(type.id));
  }, [supportedTypeIds, testType]);
  const defaultQuestionType = availableTypes[0]?.id || 'fill';
  const builderDisplayName = useMemo(() => {
    if (testType === 'movers') return 'Orange Movers Reading & Writing';
    return testConfig?.name || 'Orange Test';
  }, [testConfig?.name, testType]);

  // Hooks (must run unconditionally)
  const { quillRef: partInstructionRef, modules: partInstructionModules } = useQuillImageUpload();
  const normalizePeopleMatchingIds = useCallback((partsData) => {
    if (!Array.isArray(partsData)) return partsData;

    const isNumericId = (id) => typeof id === 'string' && /^\d+$/.test(id.trim());

    const detectSectionType = (section) => {
      const q0 = section?.questions?.[0];
      return (
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '')
      );
    };

    const mapNumericIdsToLetters = (texts) => {
      const ids = (texts || []).map(t => String(t?.id || '').trim()).filter(Boolean);
      if (ids.length === 0) return null;
      if (!ids.every(isNumericId)) return null;
      if (texts.length > 26) return null;

      const uniqueSorted = Array.from(new Set(ids)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      if (uniqueSorted.length > 26) return null;

      const mapping = {};
      for (let i = 0; i < uniqueSorted.length; i++) {
        mapping[uniqueSorted[i]] = String.fromCharCode(65 + i);
      }
      return mapping;
    };

    const normalizeQuestion = (question) => {
      const texts = Array.isArray(question?.texts) ? question.texts : [];
      const mapping = mapNumericIdsToLetters(texts);
      if (!mapping) return question;

      const nextTexts = texts.map(t => {
        const oldId = String(t?.id || '').trim();
        const mapped = mapping[oldId];
        return mapped ? { ...t, id: mapped } : t;
      });

      const answers = question?.answers && typeof question.answers === 'object' ? question.answers : {};
      const nextAnswers = Object.fromEntries(
        Object.entries(answers).map(([personId, chosenId]) => {
          const chosen = String(chosenId || '').trim();
          return [personId, mapping[chosen] || chosenId];
        })
      );

      return { ...question, texts: nextTexts, answers: nextAnswers };
    };

    let changed = false;
    const nextParts = partsData.map(part => {
      const nextSections = (part?.sections || []).map(section => {
        const sectionType = detectSectionType(section);
        if (sectionType !== 'people-matching') return section;

        const nextQuestions = (section?.questions || []).map(q => normalizeQuestion(q));
        const sectionChanged = nextQuestions.some((q, idx) => q !== section.questions[idx]);
        if (!sectionChanged) return section;
        changed = true;
        return { ...section, questions: nextQuestions };
      });

      const partChanged = nextSections.some((s, idx) => s !== part.sections?.[idx]);
      if (!partChanged) return part;
      changed = true;
      return { ...part, sections: nextSections };
    });

    return changed ? nextParts : partsData;
  }, []);

  // Evaluate permission early but do not return yet (hooks must run first)
  const category = testType.includes('listening') ? 'listening' : 'reading';
  const allowedToManage = canManageCategory(user, category);

  const didResetDraftRef = useRef(false);

  useEffect(() => {
    if (!resetDraftOnLoad || didResetDraftRef.current) return;
    try {
      localStorage.removeItem(`cambridgeTestDraft-${testType}`);
    } catch {
      // ignore
    }
    didResetDraftRef.current = true;
  }, [resetDraftOnLoad, testType]);

  // Load saved data from localStorage
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem(`cambridgeTestDraft-${testType}`);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return null;
  };

  const shouldUseDraft = !resetDraftOnLoad && !editId && !initialData;
  const savedData = shouldUseDraft ? loadSavedData() : null;

  // Form fields
  const [title, setTitle] = useState(savedData?.title || '');
  const [classCode, setClassCode] = useState(savedData?.classCode || '');
  const [teacherName, setTeacherName] = useState(savedData?.teacherName || '');
  const [mainAudioUrl, setMainAudioUrl] = useState(normalizeAudioReference(savedData?.mainAudioUrl || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Show login banner when refresh fails
  const [requiresLogin, setRequiresLogin] = useState(false);
  
  // Initial parts from savedData or default
  const getInitialParts = () => {
    if (savedData?.parts && Array.isArray(savedData.parts)) {
      return normalizePeopleMatchingIds(normalizeListeningPartsAudio(savedData.parts));
    }
    return [
      {
        partNumber: 1,
        title: 'Part 1',
        instruction: '',
        audioUrl: '',
        imageUrl: '',
        sections: [
          {
            sectionTitle: '',
            questionType: defaultQuestionType,
            questions: [getDefaultQuestionData(defaultQuestionType)],
          }
        ]
      }
    ];
  };

  // Support edit mode via props
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClassCode(initialData.classCode || '');
      setTeacherName(initialData.teacherName || '');
      setMainAudioUrl(normalizeAudioReference(initialData.mainAudioUrl || ''));

      // parts may be stored as string in older records -> parse safely
      let partsData = initialData.parts;
      if (typeof partsData === 'string') {
        try {
          partsData = JSON.parse(partsData);
        } catch (err) {
          console.warn('Could not parse parts JSON - falling back to default:', err);
          partsData = null;
        }
      }

      if (Array.isArray(partsData)) {
        setParts(normalizePeopleMatchingIds(normalizeListeningPartsAudio(partsData)));
      }
    }
  }, [defaultQuestionType, initialData, normalizePeopleMatchingIds]);

  // State - Load from savedData if available
  const [parts, setParts] = useState(getInitialParts());
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  
  // Collapse/Expand state
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  
  // Copy state
  const [copiedQuestion, setCopiedQuestion] = useState(null);
  
  // Audio upload state (listening only)
  const [uploadingAudioPartIndex, setUploadingAudioPartIndex] = useState(null);
  const [audioUploadError, setAudioUploadError] = useState('');
  const [uploadingMainAudio, setUploadingMainAudio] = useState(false);
  const [mainAudioUploadError, setMainAudioUploadError] = useState('');

  // Image upload state (reading/non-listening)
  const [uploadingImagePartIndex, setUploadingImagePartIndex] = useState(null);
  const [imageUploadError, setImageUploadError] = useState('');

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];
  const isMoversReading = !isListeningTest && String(testType || '').toLowerCase() === 'movers';
  const moversReadingPartThemes = useMemo(() => ([
    { color: '#3b82f6', bg: '#eff6ff' },
    { color: '#10b981', bg: '#f0fdf4' },
    { color: '#8b5cf6', bg: '#f5f3ff' },
    { color: '#f59e0b', bg: '#fffbeb' },
    { color: '#ef4444', bg: '#fef2f2' },
    { color: '#06b6d4', bg: '#ecfeff' },
  ]), []);

  const getMoversReadingPartTheme = useCallback((part, idx) => {
    const fallback = moversReadingPartThemes[idx % moversReadingPartThemes.length] || moversReadingPartThemes[0];
    const sectionType = part?.sections?.[0]?.questionType || '';

    const typeThemeMap = {
      'matching-pictures': { color: '#3b82f6', bg: '#eff6ff' },
      'image-cloze': { color: '#10b981', bg: '#f0fdf4' },
      'word-drag-cloze': { color: '#8b5cf6', bg: '#f5f3ff' },
      'story-completion': { color: '#f59e0b', bg: '#fffbeb' },
      'look-read-write': { color: '#ef4444', bg: '#fef2f2' },
      'fill': { color: '#06b6d4', bg: '#ecfeff' },
      abc: { color: '#f97316', bg: '#fff7ed' },
      'cloze-mc': { color: '#dc2626', bg: '#fef2f2' },
      'word-form': { color: '#0ea5e9', bg: '#f0f9ff' },
      'short-message': { color: '#6366f1', bg: '#eef2ff' },
    };

    return typeThemeMap[sectionType] || fallback;
  }, [moversReadingPartThemes]);

  const getMoversReadingPartSummary = useCallback((part) => {
    const sections = Array.isArray(part?.sections) ? part.sections : [];
    if (sections.length === 0) return 'Chưa có section';

    const questionCount = sections.reduce((sum, section) => sum + getQuestionCountForSection(section), 0);
    if (questionCount > 0) {
      return `${questionCount} câu hỏi`;
    }
    return `${sections.length} section(s)`;
  }, []);

  const uploadAudioForPart = async (partIndex, file) => {
    if (!file) return;

    setAudioUploadError('');
    setUploadingAudioPartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(apiPath('upload/audio'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload audio';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL audio');
      const normalizedUrl = normalizeAudioReference(url);

      setParts(prev => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], audioUrl: normalizedUrl };

        // Teacher workflow: Cambridge/KET Listening usually uses ONE mp3 for the whole test.
        // If user uploads audio to Part 1, reuse it for other parts that are still empty.
        if (isListeningTest && partIndex === 0) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]?.audioUrl) {
              next[i] = { ...next[i], audioUrl: normalizedUrl };
            }
          }
        }
        return next;
      });
    } catch (err) {
      setAudioUploadError(err?.message || 'Lỗi khi upload audio');
    } finally {
      setUploadingAudioPartIndex(null);
    }
  };

  const uploadImageForPart = async (partIndex, file) => {
    if (!file) return;

    setImageUploadError('');
    setUploadingImagePartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(apiPath('upload/cambridge-image'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload hình ảnh';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL hình ảnh');

      setParts(prev => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], imageUrl: url };
        return next;
      });
    } catch (err) {
      setImageUploadError(err?.message || 'Lỗi khi upload hình ảnh');
    } finally {
      setUploadingImagePartIndex(null);
    }
  };

  const uploadMainAudio = async (file) => {
    if (!file) return;

    setMainAudioUploadError('');
    setUploadingMainAudio(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(apiPath('upload/audio'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload audio';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL audio');

      setMainAudioUrl(normalizeAudioReference(url));
    } catch (err) {
      setMainAudioUploadError(err?.message || 'Lỗi khi upload audio');
    } finally {
      setUploadingMainAudio(false);
    }
  };

  // Handlers
  const handleQuestionTypeChange = (newType) => {
    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        return {
          ...section,
          questionType: newType,
          questions: [getDefaultQuestionData(newType)],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  /* eslint-disable-next-line no-unused-vars */
  const handleQuestionChange = (field, value) => {
    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        if (prevQuestions.length === 0) return { ...section, questions: [{ [field]: value }] };
        const nextQuestions = prevQuestions.map((q, qIdx) => {
          if (qIdx !== 0) return q;
          return { ...q, [field]: value };
        });
        return { ...section, questions: nextQuestions };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const handleAddPart = () => {
    const inheritedAudioUrl = isListeningTest ? (mainAudioUrl ? '' : normalizeAudioReference(parts?.[0]?.audioUrl || '')) : '';
    setParts([
      ...parts,
      {
        partNumber: parts.length + 1,
        title: `Part ${parts.length + 1}`,
        instruction: '',
        audioUrl: inheritedAudioUrl,
        imageUrl: '',
        sections: [
          {
            sectionTitle: '',
            questionType: defaultQuestionType,
            questions: [getDefaultQuestionData(defaultQuestionType)],
          }
        ]
      }
    ]);
    setSelectedPartIndex(parts.length);
    setSelectedSectionIndex(0);
  };

  const handleAddSection = () => {
    const nextSection = {
      sectionTitle: '',
      questionType: defaultQuestionType,
      questions: [getDefaultQuestionData(defaultQuestionType)],
    };

    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = [...(part.sections || []), nextSection];
      return { ...part, sections: nextSections };
    }));

    setSelectedSectionIndex((currentPart?.sections?.length || 0));
  };

  const handleAddQuestion = () => {
    const currentType = currentSection?.questionType;
    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        return {
          ...section,
          questions: [...prevQuestions, getDefaultQuestionData(currentType)],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const handleLoadMoversTemplate = () => {
    const hasMeaningfulDraft =
      title.trim() ||
      classCode.trim() ||
      teacherName.trim() ||
      (Array.isArray(parts) && parts.length > 1);

    if (hasMeaningfulDraft) {
      const confirmed = window.confirm('Nạp template sẽ ghi đe phan noi dung dang tao. Ban co muon tiep tuc khong?');
      if (!confirmed) return;
    }

    const template = buildMoversPracticeTest1Template();
    setTitle(template.title || 'Movers Reading & Writing Practice Test 1');
    setTeacherName(template.teacherName || '');
    setMainAudioUrl(normalizeAudioReference(template.mainAudioUrl || ''));
    setParts(Array.isArray(template.parts) && template.parts.length > 0 ? normalizeListeningPartsAudio(template.parts) : getInitialParts());
    setSelectedPartIndex(0);
    setSelectedSectionIndex(0);
    setMessage({ type: 'success', text: 'Da nap Movers Practice Test 1. Ban co the chinh sua noi dung ngay tren builder.' });
  };

  const handleDeleteQuestion = (qIndex) => {
    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        return {
          ...section,
          questions: prevQuestions.filter((_, idx) => idx !== qIndex),
        };
      });
      return { ...part, sections: nextSections };
    }));
  };
  // Toggle collapse/expand for a question
  const toggleCollapseQuestion = (qIdx) => {
    const key = `${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`;
    setCollapsedQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Copy a question
  const handleCopyQuestion = (qIdx) => {
    const questionToCopy = {
      ...parts[selectedPartIndex].sections[selectedSectionIndex].questions[qIdx]
    };
    setCopiedQuestion(questionToCopy);
  };

  // Paste copied question
  const handlePasteQuestion = () => {
    if (!copiedQuestion) return;
    setParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        return {
          ...section,
          questions: [
            ...(section.questions || []),
            { ...JSON.parse(JSON.stringify(copiedQuestion)) },
          ],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const questionStarts = useMemo(() => computeQuestionStarts(parts), [parts]);

  // Autosave function
  const sanitizeDraftData = useCallback((value) => {
    const dataUrlRegex = /data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g;
    const walk = (input) => {
      if (typeof input === 'string') {
        const withoutDataUrls = input.replace(dataUrlRegex, '[image]');
        return withoutDataUrls.length > 200000 ? withoutDataUrls.slice(0, 200000) : withoutDataUrls;
      }
      if (Array.isArray(input)) {
        return input.map(walk);
      }
      if (input && typeof input === 'object') {
        return Object.entries(input).reduce((acc, [key, val]) => {
          if (typeof val === 'string' && /data:image\//i.test(val)) {
            acc[key] = '[image]';
            return acc;
          }
          acc[key] = walk(val);
          return acc;
        }, {});
      }
      return input;
    };
    return walk(value);
  }, []);

  const saveToLocalStorage = useCallback(() => {
    const storageKey = `cambridgeTestDraft-${testType}`;
    try {
      setIsSaving(true);
      const normalizedParts = normalizeListeningPartsAudio(parts);
      const dataToSave = {
        title,
        classCode,
        teacherName,
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedParts,
        testType,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (error) {
        const isQuota =
          error?.name === 'QuotaExceededError' ||
          /quota/i.test(error?.message || '');
        if (isQuota) {
          try {
            const trimmed = sanitizeDraftData(dataToSave);
            localStorage.setItem(storageKey, JSON.stringify(trimmed));
            setLastSaved(new Date());
            console.warn('Draft trimmed to fit localStorage quota.');
          } catch (secondaryError) {
            localStorage.removeItem(storageKey);
            console.warn('Draft disabled due to storage quota limits.');
          }
        } else {
          console.error('Error saving draft:', error);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [title, classCode, teacherName, mainAudioUrl, parts, testType, sanitizeDraftData]);

  const handleManualDraftSave = useCallback(() => {
    saveToLocalStorage();
    setMessage({ type: 'success', text: 'Đã lưu nháp trên trình duyệt.' });
  }, [saveToLocalStorage]);

  // Auto save every 30 seconds and on page unload
  useEffect(() => {
    const autosaveInterval = setInterval(saveToLocalStorage, 30000);

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage]);

  // Save handler
  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề đề thi!' });
      return;
    }
    if (!classCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã lớp!' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    const cleanupClozeHtml = (html) => {
      if (!html) return '';
      let cleaned = String(html);
      cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
      cleaned = cleaned.replace(/<p><\/p>/gi, '');
      cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
      cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
      return cleaned.trim();
    };

    const cleanedParts = parts.map((part) => ({
      ...part,
      sections: (part.sections || []).map((section) => ({
        ...section,
        questions: (section.questions || []).map((q) => {
          if (section.questionType === 'cloze-test' || q.questionType === 'cloze-test') {
            return { ...q, passageText: cleanupClozeHtml(q.passageText) };
          }
          return q;
        }),
      })),
    }));
    const normalizedCleanedParts = normalizeListeningPartsAudio(cleanedParts);

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType,
        duration: testConfig.duration || 60,
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedCleanedParts,
        totalQuestions: normalizedCleanedParts.reduce(
          (sum, part) => sum + part.sections.reduce((sSum, sec) => sSum + getQuestionCountForSection(sec), 0),
          0
        ),
      };

      // Determine API endpoint based on test type
      const isListening = testType.includes('listening');
      const endpoint = apiBasePath || (isListening ? 'cambridge/listening-tests' : 'cambridge/reading-tests');

      // If editId is provided, update instead of create
      if (editId) {
        const res = await authFetch(apiPath(`${endpoint}/${editId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 401) {
            // Save draft and prompt re-login
            try { saveToLocalStorage(); } catch (e) {}
            setMessage({ type: 'error', text: 'Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || 'Lỗi khi cập nhật đề');
        }
        setMessage({ type: 'success', text: 'Cập nhật đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      } else {
        const response = await authFetch(apiPath(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 401) {
            try { saveToLocalStorage(); } catch (e) {}
            setMessage({ type: 'error', text: 'Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          throw new Error('Lỗi khi lưu đề thi');
        }

        /* eslint-disable-next-line no-unused-vars */
        const result = await response.json();
        setMessage({ type: 'success', text: 'Tạo đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      }

      // Redirect after success
      setTimeout(() => {
        navigate(getOrangeSelectTestPathForTestType(testType));
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <InlineIcon name="average" size={20} style={{ color: '#d97706' }} />
          Bạn không có quyền tạo/sửa đề {category === 'listening' ? 'Listening' : 'Reading'}
        </h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

  if (!testConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <InlineIcon name="error" size={20} style={{ color: '#dc2626' }} />
          Test type không hợp lệ: {testType}
        </h2>
        <p>Các test types hỗ trợ:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.keys(TEST_CONFIGS).map(key => (
            <li key={key} style={{ padding: '4px' }}>
              <code>{key}</code> - {TEST_CONFIGS[key].name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const activeMoversReadingPartTheme = isMoversReading
    ? getMoversReadingPartTheme(currentPart, selectedPartIndex)
    : null;
  const showMoversReadingSectionNav = !isMoversReading || (currentPart?.sections?.length || 0) > 1;
  const saveButtonLabel = editId ? 'Cập nhật đề' : 'Lưu đề';
  const sidebarFooterBackground = isMoversReading ? 'var(--ctb-sidebar-bg, #f6f8fc)' : '#1e293b';
  const sidebarFooterBorder = isMoversReading ? 'var(--ctb-sidebar-border, #dbe3ef)' : 'rgba(148, 163, 184, 0.25)';
  const sidebarStatusColor = isSubmitting
    ? '#cbd5e1'
    : isSaving
      ? '#fbbf24'
      : lastSaved
        ? '#86efac'
        : (isMoversReading ? 'var(--ctb-sidebar-subtext, #64748b)' : '#94a3b8');
  const sidebarMessageBg = message.type === 'success'
    ? (isMoversReading ? '#f0fdf4' : 'rgba(34, 197, 94, 0.14)')
    : (isMoversReading ? '#fef2f2' : 'rgba(239, 68, 68, 0.14)');
  const sidebarMessageColor = message.type === 'success'
    ? '#22c55e'
    : '#fca5a5';

  const renderSidebarSavePanel = () => (
    <div
      className="ctb-sidebar-footer"
      style={{
        marginTop: 'auto',
        paddingTop: '16px',
        paddingBottom: '12px',
        borderTop: `1px solid ${sidebarFooterBorder}`,
        position: 'sticky',
        bottom: 0,
        background: sidebarFooterBackground,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: sidebarStatusColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        {isSubmitting
          ? <InlineIcon name="loading" size={12} />
          : isSaving
            ? <InlineIcon name="save" size={12} />
            : lastSaved
              ? <InlineIcon name="correct" size={12} />
              : <InlineIcon name="clock" size={12} />}
        {isSubmitting
          ? 'Đang lưu đề...'
          : isSaving
            ? 'Đang lưu nháp tự động...'
            : lastSaved
              ? `Tự lưu ${lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Chưa có bản lưu gần đây'}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: isMoversReading ? '9px' : '8px',
          border: 'none',
          background: isSubmitting ? '#94a3b8' : (isMoversReading ? '#6366f1' : '#3b82f6'),
          color: 'white',
          fontWeight: 700,
          fontSize: '14px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
          boxShadow: isMoversReading ? 'none' : '0 8px 20px rgba(59, 130, 246, 0.22)',
        }}
      >
        {isSubmitting
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />{saveButtonLabel}</span>}
      </button>

      <button
        type="button"
        onClick={handleManualDraftSave}
        disabled={isSubmitting}
        className="ctb-btn-draft"
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: isMoversReading ? '9px' : '8px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          background: isMoversReading ? '#ffffff' : '#334155',
          color: isMoversReading ? '#334155' : 'white',
          border: isMoversReading ? '1px solid #cbd5e1' : '1px solid rgba(148, 163, 184, 0.3)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} />Lưu nháp</span>
      </button>

      {message.text && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: sidebarMessageBg,
            color: sidebarMessageColor,
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.4,
            border: isMoversReading ? 'none' : `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );

  return (
    <div className={`ctb-page${isMoversReading ? ' ctb-page--movers' : ''}`} style={{ minHeight: '100vh' }}>
      {/* AdminNavbar */}
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, margin: '12px auto', maxWidth: 1000 }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <InlineIcon name="average" size={16} style={{ color: '#d97706' }} />
            Bạn cần đăng nhập lại để hoàn tất thao tác.
          </strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { redirectToLogin({ rememberPath: true, replace: true }); }}>Đăng nhập lại</button>
          </div>
        </div>
      )}
      <AdminNavbar />

      <div style={{ 
        display: isMoversReading ? 'flex' : 'grid', 
        gridTemplateColumns: isMoversReading ? undefined : '280px 1fr', 
        minHeight: 'calc(100vh - 60px)',
      }}>
      {/* Sidebar - Fixed/Sticky */}
      <div className={isMoversReading ? 'ctb-sidebar--movers' : ''} style={{
        backgroundColor: isMoversReading ? 'var(--ctb-sidebar-bg, #f6f8fc)' : '#1e293b',
        color: isMoversReading ? 'var(--ctb-sidebar-text, #1f2937)' : 'white',
        width: isMoversReading ? '244px' : undefined,
        flexShrink: 0,
        padding: isMoversReading ? '20px 14px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 100,
        borderRight: isMoversReading ? '1px solid var(--ctb-sidebar-border, #dbe3ef)' : 'none',
      }}>
        {/* Test Info */}
        {isMoversReading ? (
          <>
            <h2 className="ctb-sidebar-title" style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <InlineIcon name="graduation" size={18} style={{ color: 'var(--ctb-sidebar-title-icon, #2563eb)' }} />
                {builderDisplayName}
              </span>
            </h2>
            <p className="ctb-sidebar-sub" style={{ fontSize: '11px', margin: '0 0 18px' }}>
              {testConfig.totalQuestions} câu hỏi · {testConfig.parts} parts · {testConfig.duration} phút
            </p>
          </>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: '#334155',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <InlineIcon name="graduation" size={18} style={{ color: '#fff' }} />
              {builderDisplayName}
            </h3>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="questions" size={14} />{testConfig.totalQuestions} câu hỏi</p>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="reading" size={14} />{testConfig.parts} parts</p>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="clock" size={14} />{testConfig.duration} phút</p>
            </div>
          </div>
        )}

        {/* Parts Navigation */}
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <InlineIcon name="document" size={14} />
          Parts
        </h4>
        {parts.map((part, idx) => {
          const isActive = selectedPartIndex === idx;
          const partTheme = getMoversReadingPartTheme(part, idx);
          const partIcon = QUESTION_TYPE_ICONS[part?.sections?.[0]?.questionType] || 'questions';

          if (isMoversReading) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedPartIndex(idx);
                  setSelectedSectionIndex(0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isActive ? `${partTheme.color}20` : 'transparent',
                  borderLeft: isActive ? `4px solid ${partTheme.color}` : '4px solid transparent',
                  marginBottom: '6px',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <InlineIcon name={partIcon} size={20} style={{ color: isActive ? partTheme.color : 'var(--ctb-sidebar-muted, #475569)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: isActive ? partTheme.color : 'var(--ctb-sidebar-text, #374151)' }}>
                    {part.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ctb-sidebar-subtext, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getMoversReadingPartSummary(part)}
                  </div>
                </div>
              </button>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => {
                setSelectedPartIndex(idx);
                setSelectedSectionIndex(0);
              }}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: selectedPartIndex === idx ? '#3b82f6' : '#475569',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <strong>{part.title}</strong>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                {part.sections.length} section(s)
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddPart}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isMoversReading ? 'var(--ctb-sidebar-button-bg, #ffffff)' : '#22c55e',
            color: isMoversReading ? 'var(--ctb-sidebar-button-text, #334155)' : 'white',
            border: isMoversReading ? '1px solid var(--ctb-sidebar-button-border, #cbd5e1)' : 'none',
            borderRadius: isMoversReading ? '9px' : '6px',
            cursor: 'pointer',
            fontWeight: 600,
            marginTop: '12px',
            fontSize: isMoversReading ? '13px' : undefined,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: isMoversReading ? 'var(--ctb-sidebar-button-text, #334155)' : 'white' }} />Thêm Part</span>
        </button>

        {/* Sections in current Part */}
        {currentPart && currentPart.sections.length > 0 && showMoversReadingSectionNav && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <InlineIcon name="document" size={14} />
              Sections trong Part {selectedPartIndex + 1}
            </h4>
            {currentPart.sections.map((sec, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedSectionIndex(idx)}
                style={{
                  padding: '10px',
                  marginBottom: '6px',
                  backgroundColor: isMoversReading
                    ? (selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-bg, #eaf1ff)' : 'var(--ctb-sidebar-section-bg, rgba(255, 255, 255, 0.82))')
                    : (selectedSectionIndex === idx ? '#6366f1' : '#475569'),
                  color: isMoversReading
                    ? (selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-text, #2563eb)' : 'var(--ctb-sidebar-text, #1f2937)')
                    : 'white',
                  border: isMoversReading ? `1px solid ${selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-border, #93c5fd)' : 'var(--ctb-sidebar-section-border, #d7dee8)'}` : 'none',
                  borderRadius: isMoversReading ? '10px' : '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Section {idx + 1}: {sec.questionType}
                <div style={{ fontSize: '11px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#cbd5e1', marginTop: '2px' }}>
                  {sec.questions.length} câu hỏi
                </div>
              </div>
            ))}
            {!isMoversReading && (
              <button
                type="button"
                onClick={handleAddSection}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: '8px',
                  fontSize: '13px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: 'white' }} />Thêm Section</span>
              </button>
            )}
          </div>
        )}

        {/* Available Question Types */}
        {false && !isMoversReading && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <InlineIcon name="writing" size={14} />
            Loại câu hỏi hỗ trợ
          </h4>
          <div style={{ fontSize: '12px' }}>
            {availableTypes.map(qt => (
              <div key={qt.id} style={{
                padding: '6px 10px',
                backgroundColor: isMoversReading ? '#f8fafc' : '#475569',
                color: isMoversReading ? 'var(--ctb-sidebar-text, #374151)' : 'white',
                border: isMoversReading ? '1px solid #e5e7eb' : 'none',
                borderRadius: isMoversReading ? '8px' : '4px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <InlineIcon name={QUESTION_TYPE_ICONS[qt.id] || 'questions'} size={14} style={{ color: isMoversReading ? 'var(--ctb-sidebar-muted, #475569)' : '#fff' }} />
                {qt.labelVi || qt.label}
              </div>
            ))}
          </div>
        </div>
        )}

        {isMoversReading && <div style={{ flex: 1 }} />}

        {false && isMoversReading && (
          <div className="ctb-sidebar-footer" style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--ctb-sidebar-border, #dbe3ef)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '9px',
                border: 'none',
                background: isSubmitting ? '#9ca3af' : '#6366f1',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginBottom: '8px',
              }}
            >
              {isSubmitting
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />{editId ? 'Cập nhật' : 'Lưu đề'}</span>}
            </button>
            <button
              type="button"
              onClick={handleManualDraftSave}
              disabled={isSubmitting}
              className="ctb-btn-draft"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '9px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} />Lưu nháp</span>
            </button>

            {message.text && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: message.type === 'success' ? '#15803d' : '#dc2626',
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: 1.4,
              }}>
                {message.text}
              </div>
            )}
          </div>
        )}
        {renderSidebarSavePanel()}
      </div>

      {/* Main Content */}
      <div className={`ctb-main${isMoversReading ? ' ctb-main--movers' : ''}`} style={{ 
        flex: 1,
        padding: isMoversReading ? '24px 28px' : '24px',
        overflowY: 'auto',
        height: '100vh',
      }}>
        {/* Header with Title and Save - Compact */}
        {!isMoversReading && (
          <div className="ctb-card" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="ctb-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <InlineIcon name="graduation" size={18} style={{ color: '#0f172a' }} />
                {builderDisplayName}
              </h1>
              {/* Auto-save indicator */}
              <div style={{
                fontSize: '11px',
                color: isSaving ? '#f59e0b' : lastSaved ? '#22c55e' : '#9ca3af',
                fontStyle: 'italic',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {isSaving ? <InlineIcon name="save" size={12} /> : lastSaved ? <InlineIcon name="correct" size={12} /> : null}
                {lastSaved ? lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : isSaving ? 'Đang lưu' : 'Chưa lưu'}
              </div>
            </div>
            {false && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSubmitting ? '#94a3b8' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {isSubmitting ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />Lưu</span>}
              </button>
            </div>}
          </div>
        )}

        {/* Message */}
        {false && !isMoversReading && message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <InlineIcon name={message.type === 'error' ? 'error' : 'correct'} size={16} />
            {message.text}
          </div>
        )}

        {/* Test Info Form - Compact */}
        <div className={`ctb-card${isMoversReading ? ' ctb-card--movers' : ''}`} style={{
          borderRadius: isMoversReading ? '12px' : '8px',
          padding: isMoversReading ? '20px 24px' : '12px 16px',
          marginBottom: isMoversReading ? '24px' : '12px',
          boxShadow: isMoversReading ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : 'none',
        }}>
          {isMoversReading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h3 className="ctb-card-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <InlineIcon name="document" size={16} />
                Thông tin đề thi
              </h3>
              <div style={{
                fontSize: '12px',
                color: isSaving ? '#f59e0b' : lastSaved ? '#22c55e' : '#9ca3af',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}>
                {isSaving ? <InlineIcon name="save" size={12} /> : lastSaved ? <InlineIcon name="correct" size={12} /> : null}
                {lastSaved ? `Đã lưu ${lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : isSaving ? 'Đang lưu...' : 'Chưa lưu nháp'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMoversReading ? '14px' : '10px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                {isMoversReading ? 'Tiêu đề *' : 'Tiêu đề đề thi *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isMoversReading ? 'VD: MOVERS Reading Test – Tháng 10' : 'VD: KET Test 1'}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                Mã lớp *
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder={isMoversReading ? 'VD: Practice Test Plus 2' : 'VD: KET-631-A'}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                {isMoversReading ? 'Giáo viên' : 'Tên giáo viên'}
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="VD: Cô Lan"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Global Audio (Listening only) */}
        {isListeningTest && (
          <div className="ctb-card" style={{
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <label style={{
              marginBottom: '8px',
              fontWeight: 600,
              color: '#374151',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <InlineIcon name="listening" size={14} />
              Audio chung (toàn bài)
            </label>

            <AudioPreviewBlock
              audioUrl={mainAudioUrl}
              emptyText="Chưa có audio chung cho bài listening."
              onClear={() => setMainAudioUrl('')}
              buttonStyle={{
                border: '1px solid #ef4444',
                background: 'white',
                color: '#ef4444',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            />

            <div style={{ marginTop: '12px' }}>
              <input
                type="file"
                accept="audio/*"
                disabled={uploadingMainAudio}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  await uploadMainAudio(file);
                }}
              />
              {uploadingMainAudio && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                  Đang upload audio...
                </div>
              )}
              {mainAudioUploadError && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{mainAudioUploadError}</span>
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Audio chung sẽ phát xuyên suốt khi học sinh chuyển part.</span>
              </div>
            </div>
          </div>
        )}

        {selectedPartIndex !== -1 && currentPart && (
          <div className={`ctb-card${isMoversReading ? ' ctb-card--movers' : ''}`} style={{
            borderRadius: isMoversReading ? '12px' : '8px',
            padding: isMoversReading ? '20px 24px' : '16px',
            marginBottom: '20px',
            boxShadow: isMoversReading ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
            border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : 'none',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
              }}>
                Tiêu đề Part:
              </label>
              <input
                type="text"
                value={currentPart.title || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setParts(prevParts => prevParts.map((part, pIdx) => {
                    if (pIdx !== selectedPartIndex) return part;
                    return { ...part, title: value };
                  }));
                }}
                placeholder={`VD: Part ${selectedPartIndex + 1}`}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
              }}>
                Hướng dẫn cho Part:
              </label>
              <div className="part-instruction-editor">
                <ReactQuill
                  ref={partInstructionRef}
                  theme="snow"
                  value={currentPart.instruction || ''}
                  onChange={(value) => {
                    setParts(prevParts => prevParts.map((part, pIdx) => {
                      if (pIdx !== selectedPartIndex) return part;
                      return { ...part, instruction: value };
                    }));
                  }}
                  modules={partInstructionModules}
                  formats={[
                    'header',
                    'bold',
                    'italic',
                    'underline',
                    'color',
                    'background',
                    'list',
                    'bullet',
                    'align',
                    'link',
                    'image',
                  ]}
                  style={{
                    minHeight: '100px',
                    backgroundColor: 'white',
                  }}
                />
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Có thể thêm hình ảnh, định dạng text, màu sắc...</span>
              </p>
            </div>

            {/* Part Audio (Listening only) */}
            {isListeningTest ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Audio (file nghe cho Part này):
                </label>

                <div
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: 'white',
                  }}
                >
                  <AudioPreviewBlock
                    audioUrl={currentPart.audioUrl}
                    emptyText="Chưa có audio cho part này."
                    onClear={() => {
                      setParts(prevParts => prevParts.map((part, pIdx) => {
                        if (pIdx !== selectedPartIndex) return part;
                        return { ...part, audioUrl: '' };
                      }));
                    }}
                    buttonStyle={{
                      border: '1px solid #ef4444',
                      background: 'white',
                      color: '#ef4444',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  />

                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="file"
                      accept="audio/*"
                      disabled={uploadingAudioPartIndex === selectedPartIndex}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        await uploadAudioForPart(selectedPartIndex, file);
                      }}
                    />
                    {uploadingAudioPartIndex === selectedPartIndex && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                        Đang upload audio...
                      </div>
                    )}
                    {audioUploadError && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{audioUploadError}</span>
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Hỗ trợ file audio (mp3/wav/m4a/ogg...). Backend giới hạn 50MB.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Hình ảnh minh hoạ cho Part này:
                </label>

                <div
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: 'white',
                  }}
                >
                  {currentPart.imageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <img
                        src={/^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : hostPath(currentPart.imageUrl)}
                        alt="Part image"
                        style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <a
                          href={/^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : hostPath(currentPart.imageUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                        >
                          Mở hình ảnh
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setParts(prevParts => prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return { ...part, imageUrl: '' };
                            }));
                          }}
                          style={{
                            border: '1px solid #ef4444',
                            background: 'white',
                            color: '#ef4444',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Xoá hình
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Chưa có hình ảnh cho part này.
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <InlineIcon name="link" size={14} />
                      Nhập URL ảnh/GIF từ internet
                    </div>
                    <input
                      type="text"
                      value={currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : ''}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        setParts(prevParts => prevParts.map((part, pIdx) => {
                          if (pIdx !== selectedPartIndex) return part;
                          return { ...part, imageUrl: value };
                        }));
                      }}
                      placeholder="https://example.com/image.gif"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        color: currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl) ? '#1d4ed8' : '#374151',
                      }}
                    />
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                      Dán link GIF từ Giphy, Tenor, hoặc bất kỳ URL ảnh nào (jpg/png/gif/webp...)
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <InlineIcon name="upload" size={14} />
                      Hoặc upload từ máy
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImagePartIndex === selectedPartIndex}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        await uploadImageForPart(selectedPartIndex, file);
                      }}
                    />
                    {uploadingImagePartIndex === selectedPartIndex && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                        Đang upload hình ảnh...
                      </div>
                    )}
                    {imageUploadError && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{imageUploadError}</span>
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Hỗ trợ file ảnh (jpg/png/gif/webp...). Nên dùng ảnh rõ nét, tỉ lệ phù hợp với bài thi.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Example Block (abc type only) - placed under part image area */}
            {currentSection && currentSection.questionType === 'abc' && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <InlineIcon name="starters" size={14} />
                  Câu mẫu (Example)
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    Nội dung câu mẫu (ví dụ: đoạn hội thoại mẫu):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Nick: What did you do at the weekend? / Paul: ..."
                    value={currentSection.exampleText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParts(prevParts => prevParts.map((part, pIdx) => {
                        if (pIdx !== selectedPartIndex) return part;
                        return {
                          ...part,
                          sections: part.sections.map((sec, sIdx) => {
                            if (sIdx !== selectedSectionIndex) return sec;
                            return { ...sec, exampleText: val };
                          }),
                        };
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    Đáp án đúng của câu mẫu:
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {['A', 'B', 'C'].map(letter => (
                      <label key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        <input
                          type="radio"
                          name={`example-answer-${selectedPartIndex}-${selectedSectionIndex}`}
                          value={letter}
                          checked={(currentSection.exampleAnswer || '') === letter}
                          onChange={() => {
                            setParts(prevParts => prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return {
                                ...part,
                                sections: part.sections.map((sec, sIdx) => {
                                  if (sIdx !== selectedSectionIndex) return sec;
                                  return { ...sec, exampleAnswer: letter };
                                }),
                              };
                            }));
                          }}
                        />
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: (currentSection.exampleAnswer || '') === letter ? '#0e276f' : '#e5e7eb',
                          color: (currentSection.exampleAnswer || '') === letter ? 'white' : '#374151',
                          fontWeight: 700,
                        }}>
                          {letter}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section */}
            {currentSection && (
              <div style={{
                border: isMoversReading ? '2px solid var(--builder-border, #d7dee8)' : '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: isMoversReading ? 'var(--builder-surface, #ffffff)' : '#f8fafc',
              }}>
                <h3 style={{ margin: '0 0 16px', color: isMoversReading ? 'var(--builder-text, #1f2937)' : '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InlineIcon name="writing" size={16} />
                  Section {selectedSectionIndex + 1}
                </h3>

                {/* Question Type Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600,
                    color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
                  }}>
                    Loại câu hỏi:
                  </label>
                  <QuestionTypeSelector
                    testType={testType}
                    questionTypes={availableTypes}
                    value={currentSection.questionType}
                    onChange={handleQuestionTypeChange}
                    style={{ maxWidth: '400px' }}
                  />
                </div>

                {/* Question Editor */}
                <div style={{
                  backgroundColor: isMoversReading ? 'var(--builder-input-muted-bg, #f3f6fa)' : 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : '1px solid #e5e7eb',
                }}>
                  {currentSection.questions.map((question, qIdx) => {
                    const isCollapsed = collapsedQuestions[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`];
                    const startNum = questionStarts.questionStart[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`] || 1;
                    
                    // For multi-question types (like long-text-mc), use section-based starting number
                    const sectionStartNum = questionStarts.sectionStart[`${selectedPartIndex}-${selectedSectionIndex}`] || 1;
                    
                    // Generate question preview text
                    const getQuestionPreview = () => {
                      if (question.questionText) return question.questionText;
                      if (question.items?.length) return `${question.items.length} matching items`;
                      if (question.options?.length) return `${question.options.length} options`;
                      return 'Empty question';
                    };
                    
                    return (
                      <div 
                        key={`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`}
                        style={{
                          marginBottom: '16px',
                          paddingBottom: '16px',
                          borderBottom: qIdx < currentSection.questions.length - 1
                            ? (isMoversReading ? '2px dashed var(--builder-border, #d7dee8)' : '2px dashed #e5e7eb')
                            : 'none',
                        }}
                      >
                        {/* Question Header with Controls */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: isCollapsed ? '0' : '12px',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flex: 1,
                          }}>
                            {/* Chỉ hiện số câu hỏi cho question types đơn giản, không hiện cho multi-question types */}
                            {!['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'word-form', 'matching-pictures', 'image-cloze', 'word-drag-cloze'].includes(currentSection.questionType) && (
                              <span style={{ 
                                fontWeight: 600, 
                                color: '#6366f1',
                                fontSize: '14px',
                              }}>
                                Câu hỏi #{startNum}
                              </span>
                            )}
                            
                            {/* Collapsed Preview */}
                            {isCollapsed && (
                              <span style={{
                                fontSize: '13px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                              }}>
                                {getQuestionPreview().substring(0, 50)}...
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}>
                            {/* Collapse/Expand Button */}
                            <button
                              onClick={() => toggleCollapseQuestion(qIdx)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: isCollapsed ? '#3b82f6' : '#e0e7ff',
                                color: isCollapsed ? 'white' : '#4f46e5',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                              title={isCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <InlineIcon name={isCollapsed ? 'eye' : 'chevron-up'} size={14} style={{ color: isCollapsed ? 'white' : '#4f46e5' }} />
                                {isCollapsed ? 'Mở' : 'Ẩn'}
                              </span>
                            </button>
                            
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyQuestion(qIdx)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                              title="Sao chép câu hỏi"
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="copy" size={14} style={{ color: 'white' }} />Copy</span>
                            </button>
                            
                            {/* Paste Button - only show if something is copied */}
                            {copiedQuestion && (
                              <button
                                onClick={handlePasteQuestion}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#8b5cf6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                                title="Dán câu hỏi đã copy"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="pin" size={14} style={{ color: 'white' }} />Paste</span>
                              </button>
                            )}
                            
                            {/* Delete Button */}
                            {currentSection.questions.length > 1 && (
                              <button
                                onClick={() => handleDeleteQuestion(qIdx)}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                                title="Xóa câu hỏi"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="trash" size={14} style={{ color: 'white' }} />Xóa</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Question Details - shown when NOT collapsed */}
                        {!isCollapsed && (
                          <div style={{
                            backgroundColor: '#f9fafb',
                            padding: '16px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                          }}>
                            <QuestionEditorFactory
                              questionType={currentSection.questionType}
                              question={question}
                              testType={testType}
                              onChange={(field, value) => {
                                setParts(prevParts => prevParts.map((part, pIdx) => {
                                  if (pIdx !== selectedPartIndex) return part;
                                  const nextSections = (part.sections || []).map((section, sIdx) => {
                                    if (sIdx !== selectedSectionIndex) return section;
                                    const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
                                    const prevQuestion = prevQuestions[qIdx] || {};
                                    const nextQuestions = prevQuestions.map((q, idx) => {
                                      if (idx !== qIdx) return q;
                                      return { ...prevQuestion, [field]: value };
                                    });
                                    return { ...section, questions: nextQuestions };
                                  });
                                  return { ...part, sections: nextSections };
                                }));
                              }}
                              questionIndex={qIdx}
                              startingNumber={['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'word-form', 'matching-pictures', 'image-cloze', 'word-drag-cloze', 'story-completion', 'look-read-write'].includes(currentSection.questionType) ? sectionStartNum : startNum}
                              partIndex={selectedPartIndex}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <button
                    onClick={handleAddQuestion}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: 'white' }} />Thêm câu hỏi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      {/* End grid */}
    </div>
    </div>
  );
};

// Custom styles for ReactQuill in Part Instruction
const quillStyles = `
  .part-instruction-editor .ql-container {
    min-height: 100px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .part-instruction-editor .ql-editor {
    min-height: 100px;
    background-color: #ffffff;
  }
  .part-instruction-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .part-instruction-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .part-instruction-editor .ql-container.ql-snow:focus-within {
    background-color: #fef3c7;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  .part-instruction-editor .ql-editor:focus {
    background-color: #fef3c7;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .part-instruction-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .part-instruction-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #fef9e7;
    border-color: #f59e0b;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'part-instruction-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default CambridgeTestBuilder;

