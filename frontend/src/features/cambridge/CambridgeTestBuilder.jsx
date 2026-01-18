import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { apiPath, hostPath } from "../../shared/utils/api";

/**
 * CambridgeTestBuilder - Component cho việc tạo đề Cambridge tests
 * Có thể dùng cho: KET, PET, FLYERS, MOVERS, STARTERS
 */
const CambridgeTestBuilder = ({ testType = 'ket-listening', editId = null, initialData = null, resetDraftOnLoad = false }) => {
  const navigate = useNavigate();
  const testConfig = getTestConfig(testType);
  const availableTypes = getQuestionTypesForTest(testType);
  const isListeningTest = testType.includes('listening');

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
        sections: [
          {
            sectionTitle: '',
            questionType: availableTypes[0]?.id || 'fill',
            questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
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
  }, [initialData, normalizePeopleMatchingIds]);

  // State - Load from savedData if available
  const [parts, setParts] = useState(getInitialParts());
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  
  // Collapse/Expand state
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  
  // Copy state
  const [copiedQuestion, setCopiedQuestion] = useState(null);
  
  // Drag & Drop state
  const [draggedQuestion, setDraggedQuestion] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  // Audio upload state (listening only)
  const [uploadingAudioPartIndex, setUploadingAudioPartIndex] = useState(null);
  const [audioUploadError, setAudioUploadError] = useState('');
  const [uploadingMainAudio, setUploadingMainAudio] = useState(false);
  const [mainAudioUploadError, setMainAudioUploadError] = useState('');

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];

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
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questionType = newType;
    // Reset questions with default data for new type
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions = [
      getDefaultQuestionData(newType)
    ];
    setParts(newParts);
  };

  const handleQuestionChange = (field, value) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions[0] = {
      ...newParts[selectedPartIndex].sections[selectedSectionIndex].questions[0],
      [field]: value,
    };
    setParts(newParts);
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
        sections: [
          {
            sectionTitle: '',
            questionType: availableTypes[0]?.id || 'fill',
            questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
          }
        ]
      }
    ]);
    setSelectedPartIndex(parts.length);
    setSelectedSectionIndex(0);
  };

  const handleAddSection = () => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections.push({
      sectionTitle: '',
      questionType: availableTypes[0]?.id || 'fill',
      questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
    });
    setParts(newParts);
    setSelectedSectionIndex(newParts[selectedPartIndex].sections.length - 1);
  };

  const handleAddQuestion = () => {
    const newParts = [...parts];
    const currentType = currentSection.questionType;
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions.push(
      getDefaultQuestionData(currentType)
    );
    setParts(newParts);
  };

  const handleDeleteQuestion = (qIndex) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions.splice(qIndex, 1);
    setParts(newParts);
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
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions.push({
      ...JSON.parse(JSON.stringify(copiedQuestion)) // Deep copy
    });
    setParts(newParts);
  };

  // Drag start handler
  const handleDragStart = (qIdx, e) => {
    setDraggedQuestion(qIdx);
    setDragSource({ partIdx: selectedPartIndex, sectionIdx: selectedSectionIndex, qIdx });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag over handler
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Drop handler
  const handleDrop = (targetQIdx, e) => {
    e.preventDefault();
    if (!dragSource) return;

    const sourcePartIdx = dragSource.partIdx;
    const sourceSectionIdx = dragSource.sectionIdx;
    const sourceQIdx = dragSource.qIdx;

    // Only allow reordering within same section for now
    if (sourcePartIdx !== selectedPartIndex || sourceSectionIdx !== selectedSectionIndex) {
      alert('Chỉ có thể sắp xếp lại câu hỏi trong cùng một section!');
      setDraggedQuestion(null);
      setDragSource(null);
      return;
    }

    if (sourceQIdx === targetQIdx) {
      setDraggedQuestion(null);
      setDragSource(null);
      return;
    }

    const newParts = [...parts];
    const questions = newParts[selectedPartIndex].sections[selectedSectionIndex].questions;
    const [movedQuestion] = questions.splice(sourceQIdx, 1);
    questions.splice(targetQIdx, 0, movedQuestion);
    
    setParts(newParts);
    setDraggedQuestion(null);
    setDragSource(null);
  };
  // Calculate starting question number
  const calculateStartingNumber = (partIdx, sectionIdx, questionIdx) => {
    let count = 1;
    for (let p = 0; p < partIdx; p++) {
      for (const section of parts[p].sections) {
        count += section.questions.length;
      }
    }
    for (let s = 0; s < sectionIdx; s++) {
      count += parts[partIdx].sections[s].questions.length;
    }
    return count + questionIdx;
  };

  // Calculate starting number for a section (for multi-question types like long-text-mc, cloze-mc, cloze-test, short-message)
  const calculateSectionStartingNumber = (partIdx, sectionIdx) => {
    let count = 1;
    // Đếm tất cả câu hỏi từ các part trước
    for (let p = 0; p < partIdx; p++) {
      for (const section of parts[p].sections) {
        count += getQuestionCountForSection(section);
      }
    }
    // Đếm các section trước trong cùng part
    for (let s = 0; s < sectionIdx; s++) {
      const section = parts[partIdx].sections[s];
      count += getQuestionCountForSection(section);
    }
    return count;
  };

  // Helper function to count questions in a section
  const getQuestionCountForSection = (section) => {
    // Long text MC: đếm số câu hỏi trong questions array
    if (section.questionType === 'long-text-mc' && section.questions[0]?.questions) {
      return section.questions[0].questions.length;
    } 
    // Cloze MC: đếm số blanks
    else if (section.questionType === 'cloze-mc' && section.questions[0]?.blanks) {
      return section.questions[0].blanks.length;
    }
    // Open Cloze: đếm số blanks từ answers object
    else if (section.questionType === 'cloze-test' && section.questions[0]?.answers) {
      return Object.keys(section.questions[0].answers).length;
    }
    // Short Message/Writing Task: chỉ tính 1 câu (không đếm bulletPoints)
    else if (section.questionType === 'short-message') {
      return 1; // Writing Task là 1 câu duy nhất
    }
    // People Matching: 5 people (A-E)
    else if (section.questionType === 'people-matching' && section.questions[0]?.people) {
      return section.questions[0].people.length; // Usually 5
    }
    // Gap Match (drag & drop): count left items
    else if (section.questionType === 'gap-match' && section.questions[0]?.leftItems) {
      return section.questions[0].leftItems.length;
    }
    // Word Formation: đếm số sentences
    else if (section.questionType === 'word-form' && section.questions[0]?.sentences) {
      return section.questions[0].sentences.length;
    }
    // Default: single question types (sign-message, etc.)
    else {
      return section.questions.length;
    }
  };

  // Autosave function
  const saveToLocalStorage = useCallback(() => {
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
      localStorage.setItem(`cambridgeTestDraft-${testType}`, JSON.stringify(dataToSave));
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving draft:', error);
      setIsSaving(false);
    }
  }, [title, classCode, teacherName, mainAudioUrl, parts, testType]);

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

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType,
        mainAudioUrl,
        parts,
        totalQuestions: parts.reduce(
          (sum, part) => sum + part.sections.reduce((sSum, sec) => sSum + getQuestionCountForSection(sec), 0),
          0
        ),
      };

      // Determine API endpoint based on test type
      const isListening = testType.includes('listening');
      const endpoint = isListening ? 'cambridge/listening-tests' : 'cambridge/reading-tests';

      // If editId is provided, update instead of create
      if (editId) {
        const res = await fetch(apiPath(`${endpoint}/${editId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Lỗi khi cập nhật đề');
        }
        setMessage({ type: 'success', text: '✅ Cập nhật đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      } else {
        const response = await fetch(apiPath(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Lỗi khi lưu đề thi');
        }

        const result = await response.json();
        setMessage({ type: 'success', text: '✅ Tạo đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      }

      // Redirect after success
      setTimeout(() => {
        navigate('/select-test');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: '❌ Lỗi: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            🎓 {testConfig.name}
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
              🎓 {testConfig.name}
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
                  theme="snow"
                  value={currentPart.instruction || ''}
                  onChange={(content) => {
                    const newParts = [...parts];
                    newParts[selectedPartIndex].instruction = content;
                    setParts(newParts);
                  }}
                  placeholder="Nhập hướng dẫn cho part này..."
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ color: [] }, { background: [] }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      [{ align: [] }],
                      ['link', 'image'],
                      ['clean'],
                    ],
                  }}
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
                            const newParts = [...parts];
                            newParts[selectedPartIndex].audioUrl = '';
                            setParts(newParts);
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
                    const isDragging = draggedQuestion === qIdx;
                    const startNum = calculateStartingNumber(selectedPartIndex, selectedSectionIndex, qIdx);
                    
                    // For multi-question types (like long-text-mc), use section-based starting number
                    const sectionStartNum = calculateSectionStartingNumber(selectedPartIndex, selectedSectionIndex);
                    
                    // Generate question preview text
                    const getQuestionPreview = () => {
                      if (question.questionText) return question.questionText;
                      if (question.items?.length) return `${question.items.length} matching items`;
                      if (question.options?.length) return `${question.options.length} options`;
                      return 'Empty question';
                    };
                    
                    return (
                      <div 
                        key={qIdx} 
                        draggable
                        onDragStart={(e) => handleDragStart(qIdx, e)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(qIdx, e)}
                        style={{
                          marginBottom: '16px',
                          paddingBottom: '16px',
                          borderBottom: qIdx < currentSection.questions.length - 1 ? '2px dashed #e5e7eb' : 'none',
                          opacity: isDragging ? 0.5 : 1,
                          transition: 'all 0.2s',
                          cursor: 'grab',
                          border: isDragging ? '2px solid #3b82f6' : 'none',
                          borderRadius: '6px',
                          padding: isDragging ? '12px' : '0',
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
                            {/* Drag Handle Icon */}
                            <span style={{
                              cursor: 'grab',
                              fontSize: '18px',
                              color: '#9ca3af',
                            }}>
                              ⋮⋮
                            </span>
                            
                            {/* Chỉ hiện số câu hỏi cho question types đơn giản, không hiện cho multi-question types */}
                            {!['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'word-form'].includes(currentSection.questionType) && (
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
                              onChange={(field, value) => {
                                const newParts = [...parts];
                                newParts[selectedPartIndex].sections[selectedSectionIndex].questions[qIdx] = {
                                  ...question,
                                  [field]: value,
                                };
                                setParts(newParts);
                              }}
                              questionIndex={qIdx}
                              startingNumber={['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'word-form'].includes(currentSection.questionType) ? sectionStartNum : startNum}
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

        {/* Part Structure Reference */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#f0f9ff',
          borderRadius: '12px',
          border: '1px solid #bae6fd',
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#0369a1' }}>
            📖 Cấu trúc đề chuẩn {testConfig.name}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#e0f2fe' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Part</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Questions</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {testConfig.partStructure?.map((ps, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f0f9ff' }}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Part {ps.part}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>{ps.questions}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>{ps.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
