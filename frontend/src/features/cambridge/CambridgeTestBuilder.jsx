import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AdminNavbar } from "../../shared/components";
import { 
  QuestionTypeSelector, 
  QuestionEditorFactory,
} from "../../shared/components/questions";
import { 
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
  TEST_CONFIGS,
} from "../../shared/config/questionTypes";
import { apiPath, hostPath, authFetch } from "../../shared/utils/api";
import useQuillImageUpload from "../../shared/hooks/useQuillImageUpload";
import { canManageCategory } from '../../shared/utils/permissions';
import { computeQuestionStarts, getQuestionCountForSection } from "./utils/questionNumbering";
import { buildMoversPracticeTest1Template } from "./utils/moversPracticeTest1Template";


/**
 * CambridgeTestBuilder - Component cho việc tạo đề Cambridge tests
 * Có thể dùng cho: KET, PET, FLYERS, MOVERS, STARTERS
 */
const CambridgeTestBuilder = ({ testType = 'ket-listening', editId = null, initialData = null, resetDraftOnLoad = false }) => {
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
    if (testType === 'movers') return 'Cambridge Movers Reading & Writing';
    return testConfig?.name || 'Cambridge Test';
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
  const [mainAudioUrl, setMainAudioUrl] = useState(savedData?.mainAudioUrl || '');
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
      return normalizePeopleMatchingIds(savedData.parts);
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
      setMainAudioUrl(initialData.mainAudioUrl || '');

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
        setParts(normalizePeopleMatchingIds(partsData));
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

      setParts(prev => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], audioUrl: url };

        // Teacher workflow: Cambridge/KET Listening usually uses ONE mp3 for the whole test.
        // If user uploads audio to Part 1, reuse it for other parts that are still empty.
        if (isListeningTest && partIndex === 0) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]?.audioUrl) {
              next[i] = { ...next[i], audioUrl: url };
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

      setMainAudioUrl(url);
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
    const inheritedAudioUrl = isListeningTest ? (mainAudioUrl ? '' : (parts?.[0]?.audioUrl || '')) : '';
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
    setMainAudioUrl(template.mainAudioUrl || '');
    setParts(Array.isArray(template.parts) && template.parts.length > 0 ? template.parts : getInitialParts());
    setSelectedPartIndex(0);
    setSelectedSectionIndex(0);
    setMessage({ type: 'success', text: '✅ Da nap Movers Practice Test 1. Ban co the chinh sua noi dung ngay tren builder.' });
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
      const dataToSave = {
        title,
        classCode,
        teacherName,
        mainAudioUrl,
        parts,
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
      setMessage({ type: 'error', text: '❌ Vui lòng nhập tiêu đề đề thi!' });
      return;
    }
    if (!classCode.trim()) {
      setMessage({ type: 'error', text: '❌ Vui lòng nhập mã lớp!' });
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

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType,
        duration: testConfig.duration || 60,
        mainAudioUrl,
        parts: cleanedParts,
        totalQuestions: cleanedParts.reduce(
          (sum, part) => sum + part.sections.reduce((sSum, sec) => sSum + getQuestionCountForSection(sec), 0),
          0
        ),
      };

      // Determine API endpoint based on test type
      const isListening = testType.includes('listening');
      const endpoint = isListening ? 'cambridge/listening-tests' : 'cambridge/reading-tests';

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
            setMessage({ type: 'error', text: '❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || 'Lỗi khi cập nhật đề');
        }
        setMessage({ type: 'success', text: '✅ Cập nhật đề thành công!' });
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
            setMessage({ type: 'error', text: '❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          throw new Error('Lỗi khi lưu đề thi');
        }

        /* eslint-disable-next-line no-unused-vars */
        const result = await response.json();
        setMessage({ type: 'success', text: '✅ Tạo đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      }

      // Redirect after success
      setTimeout(() => {
        if (['movers', 'flyers', 'starters'].includes(testType)) {
          navigate(`/select-test?platform=orange&type=${testType}&tab=reading`);
          return;
        }
        navigate('/select-test');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: '❌ Lỗi: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>⚠️ Bạn không có quyền tạo/sửa đề {category === 'listening' ? 'Listening' : 'Reading'}</h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

  if (!testConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>❌ Test type không hợp lệ: {testType}</h2>
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* AdminNavbar */}
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, margin: '12px auto', maxWidth: 1000 }}>
          <strong>⚠️ Bạn cần đăng nhập lại để hoàn tất thao tác.</strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { localStorage.setItem('postLoginRedirect', window.location.pathname); window.location.href = '/login'; }}>Đăng nhập lại</button>
          </div>
        </div>
      )}
      <AdminNavbar />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '280px 1fr', 
        minHeight: 'calc(100vh - 60px)',
      }}>
      {/* Sidebar - Fixed/Sticky */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 100,
      }}>
        {/* Test Info */}
        <div style={{
          padding: '16px',
          backgroundColor: '#334155',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>
            🎓 {builderDisplayName}
          </h3>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            <p style={{ margin: '4px 0' }}>📊 {testConfig.totalQuestions} câu hỏi</p>
            <p style={{ margin: '4px 0' }}>📖 {testConfig.parts} parts</p>
            <p style={{ margin: '4px 0' }}>⏱️ {testConfig.duration} phút</p>
          </div>
        </div>

        {/* Parts Navigation */}
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
          📋 Parts
        </h4>
        {parts.map((part, idx) => (
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
        ))}

        <button
          onClick={handleAddPart}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            marginTop: '12px',
          }}
        >
          ➕ Thêm Part
        </button>

        {/* Sections in current Part */}
        {currentPart && currentPart.sections.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
              📑 Sections trong Part {selectedPartIndex + 1}
            </h4>
            {currentPart.sections.map((sec, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedSectionIndex(idx)}
                style={{
                  padding: '10px',
                  marginBottom: '6px',
                  backgroundColor: selectedSectionIndex === idx ? '#6366f1' : '#475569',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Section {idx + 1}: {sec.questionType}
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                  {sec.questions.length} câu hỏi
                </div>
              </div>
            ))}
            <button
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
              ➕ Thêm Section
            </button>
          </div>
        )}

        {/* Available Question Types */}
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
            📝 Loại câu hỏi hỗ trợ
          </h4>
          <div style={{ fontSize: '12px' }}>
            {availableTypes.map(qt => (
              <div key={qt.id} style={{
                padding: '6px 10px',
                backgroundColor: '#475569',
                borderRadius: '4px',
                marginBottom: '4px',
              }}>
                {qt.icon} {qt.labelVi || qt.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: '24px',
        overflowY: 'auto',
        height: '100vh',
      }}>
        {/* Header with Title and Save - Compact */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: 600 }}>
              🎓 {builderDisplayName}
            </h1>
            {/* Auto-save indicator */}
            <div style={{
              fontSize: '11px',
              color: isSaving ? '#f59e0b' : lastSaved ? '#22c55e' : '#9ca3af',
              fontStyle: 'italic',
            }}>
              {isSaving ? '💾' : lastSaved ? `✅ ${lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '○'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMoversReading && (
              <button
                type="button"
                onClick={handleLoadMoversTemplate}
                disabled={isSubmitting}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
                title="Nạp nhanh bo Movers Practice Test 1"
              >
                ⚡ Nạp Template Movers
              </button>
            )}
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
              {isSubmitting ? '⏳' : '💾 Lưu'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
          }}>
            {message.text}
          </div>
        )}

        {/* Test Info Form - Compact */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                Tiêu đề đề thi *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: KET Test 1"
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
                placeholder="VD: KET-631-A"
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
                Tên giáo viên
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
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
              color: '#374151',
              fontSize: '13px',
            }}>
              🎧 Audio chung (toàn bài)
            </label>

            {mainAudioUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <audio controls src={hostPath(mainAudioUrl)} style={{ width: '100%' }}>
                  Your browser does not support audio.
                </audio>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={hostPath(mainAudioUrl)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                  >
                    Mở file audio
                  </a>
                  <button
                    type="button"
                    onClick={() => setMainAudioUrl('')}
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
                    Xoá audio
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Chưa có audio chung cho bài listening.
              </div>
            )}

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
                  ❌ {mainAudioUploadError}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                💡 Audio chung sẽ phát xuyên suốt khi học sinh chuyển part.
              </div>
            </div>
          </div>
        )}

        {/* Current Part Editor */}
        {currentPart && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ margin: '0 0 20px', color: '#0e276f' }}>
              📌 {currentPart.title}
            </h2>

            {/* Part Instruction */}
            <div style={{ marginBottom: '20px' }} className="part-instruction-editor">
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                color: '#374151',
              }}>
                Hướng dẫn Part:
              </label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}>
                <ReactQuill
                  key={`part-instruction-${selectedPartIndex}`}
                  ref={partInstructionRef}
                  theme="snow"
                  value={typeof currentPart?.instruction === 'string' ? currentPart.instruction : ''}
                  onChange={(content) => {
                    setParts(prevParts => prevParts.map((part, pIdx) => {
                      if (pIdx !== selectedPartIndex) return part;
                      return { ...part, instruction: content || '' };
                    }));
                  }}
                  placeholder="Nhập hướng dẫn cho part này..."
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
                💡 Có thể thêm hình ảnh, định dạng text, màu sắc...
              </p>
            </div>

            {/* Part Audio (Listening only) */}
            {isListeningTest && (
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
                  {currentPart.audioUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <audio
                        controls
                        src={hostPath(currentPart.audioUrl)}
                        style={{ width: '100%' }}
                      >
                        Your browser does not support audio.
                      </audio>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <a
                          href={hostPath(currentPart.audioUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                        >
                          Mở file audio
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setParts(prevParts => prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return { ...part, audioUrl: '' };
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
                          Xoá audio
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Chưa có audio cho part này.
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="file"
                      accept="audio/*"
                      disabled={uploadingAudioPartIndex === selectedPartIndex}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        // allow re-uploading same file
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
                        ❌ {audioUploadError}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      💡 Hỗ trợ file audio (mp3/wav/m4a/ogg...). Backend giới hạn 50MB.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Part Image (Reading/non-listening only) */}
            {!isListeningTest && (
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
                        src={hostPath(currentPart.imageUrl)}
                        alt="Part image"
                        style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <a
                          href={hostPath(currentPart.imageUrl)}
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
                        ❌ {imageUploadError}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      💡 Hỗ trợ file ảnh (jpg/png/webp...). Nên dùng ảnh rõ nét, tỉ lệ phù hợp với bài thi.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Example Block (abc type only) - placed under part image area */}
            {currentSection && currentSection.questionType === 'abc' && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '12px', fontSize: '14px' }}>
                  ⭐ Câu mẫu (Example)
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
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: '#f8fafc',
              }}>
                <h3 style={{ margin: '0 0 16px', color: '#374151' }}>
                  📝 Section {selectedSectionIndex + 1}
                </h3>

                {/* Question Type Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600,
                    color: '#374151',
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
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
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
                          borderBottom: qIdx < currentSection.questions.length - 1 ? '2px dashed #e5e7eb' : 'none',
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
                              {isCollapsed ? '👁️ Mở' : '👁️ Ẩn'}
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
                              📋 Copy
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
                                📌 Paste
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
                                🗑️ Xóa
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
                    ➕ Thêm câu hỏi
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
