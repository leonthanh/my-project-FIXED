import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import QuillEditor from '../components/QuillEditor';
import QuestionSection from '../components/QuestionSection';
import 'react-quill/dist/quill.snow.css';

const EditReadingTest = () => {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const { testId } = useParams();

  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [passages, setPassages] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  
  // 4-column layout state
  const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [collapsedColumns, setCollapsedColumns] = useState({
    col1: false, // Passages
    col2: false, // Content
    col3: false, // Sections
    col4: false  // Questions
  });

  // 🔍 Debug: Log changes to selectedPassageIndex
  useEffect(() => {
    if (passages && passages[selectedPassageIndex]) {
      // Passage selected
    }
  }, [selectedPassageIndex, passages]);
  
  // Column width state for resize
  const [columnWidths, setColumnWidths] = useState({
    col1: 12, // Passages: 12%
    col2: 38, // Content: 38%
    col3: 12, // Sections: 12%
    col4: 38  // Questions: 38%
  });
  
  const [isResizing, setIsResizing] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidths, setStartWidths] = useState(null);

  // Toggle column collapse/expand
  const toggleColumnCollapse = (colName) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [colName]: !prev[colName]
    }));
  };

  const handleMouseDown = (dividerIndex, e) => {
    setIsResizing(dividerIndex);
    setStartX(e.clientX);
    setStartWidths({ ...columnWidths });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing === null || !startWidths) return;
      
      const delta = (e.clientX - startX) / window.innerWidth * 100;
      const newWidths = { ...startWidths };
      
      if (isResizing === 1) {
        newWidths.col1 = Math.max(8, Math.min(20, startWidths.col1 + delta));
        newWidths.col2 = 100 - newWidths.col1 - newWidths.col3 - newWidths.col4;
      } else if (isResizing === 2) {
        newWidths.col2 = Math.max(20, Math.min(50, startWidths.col2 + delta));
        newWidths.col3 = 100 - newWidths.col1 - newWidths.col2 - newWidths.col4;
      } else if (isResizing === 3) {
        newWidths.col3 = Math.max(8, Math.min(20, startWidths.col3 + delta));
        newWidths.col4 = 100 - newWidths.col1 - newWidths.col2 - newWidths.col3;
      }
      
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidths]);

  // Calculate dynamic width for full-screen collapse
  const getColumnWidth = (colName) => {
    if (collapsedColumns[colName]) return '50px';
    
    const openColumns = ['col1', 'col2', 'col3', 'col4'].filter(col => !collapsedColumns[col]);
    
    if (openColumns.length === 1) {
      return '100%';
    } else if (openColumns.length === 2) {
      const totalCollapsedWidth = ['col1', 'col2', 'col3', 'col4']
        .filter(col => collapsedColumns[col])
        .length * 50;
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 2}%`;
    } else if (openColumns.length === 3) {
      const totalCollapsedWidth = 50;
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 3}%`;
    }
    
    return `${columnWidths[colName]}%`;
  };

  // Fetch existing test
  useEffect(() => {
    if (hasLoaded) return; // Prevent duplicate fetches
    
    const fetchTest = async () => {
      try {

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(`${API}/api/reading-tests/${testId}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Không tìm thấy đề thi`);
        }
        const data = await response.json();
        // Data received and loaded
        
        setTitle(data.title || '');
        setClassCode(data.classCode || '');
        setTeacherName(data.teacherName || '');
        setPassages(Array.isArray(data.passages) ? data.passages : (data.passages ? [data.passages] : []));
        setLoading(false);
        setHasLoaded(true);
      } catch (error) {
        console.error('❌ Error:', error);
        setMessage(`❌ ${error.message}`);
        setLoading(false);
        setHasLoaded(true);
      }
    };

    if (testId && API && !hasLoaded) {
      fetchTest();
    } else if (!testId || !API) {

      setLoading(false);
      setHasLoaded(true);
    }
  }, [testId, API, hasLoaded]);

  const stripHtml = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Helper: Calculate actual question count from questionNumber
  // Handles: "38-40" (3 questions), "38" (1 question), "38,39,40" (3 questions)
  const getQuestionCount = (questionNumber) => {
    if (!questionNumber) return 1;
    
    const qNum = String(questionNumber).trim();
    
    // Handle range format: "38-40"
    if (qNum.includes('-') && !qNum.includes(',')) {
      const parts = qNum.split('-').map(p => p.trim());
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          return end - start + 1;
        }
      }
    }
    
    // Handle comma-separated format: "38,39,40"
    if (qNum.includes(',')) {
      const parts = qNum.split(',').map(p => p.trim()).filter(p => p);
      return parts.length;
    }
    
    // Single number: "38"
    return 1;
  };

  // Helper function to calculate total questions
  const calculateTotalQuestions = (passages) => {
    let total = 0;
    let debug = [];
    
    passages.forEach((p, pIdx) => {
      p.sections?.forEach((sec, sIdx) => {
        let sectionTotal = 0;
        sec.questions?.forEach((q) => {
          sectionTotal += getQuestionCount(q.questionNumber);
        });
        total += sectionTotal;
        if (sectionTotal > 0) {
          debug.push(`P${pIdx+1}S${sIdx+1}: ${sectionTotal}`);
        }
      });
    });
    
    console.log(`📊 Total Questions: ${total} (${debug.join(', ')})`);
    return total;
  };

  // Clean up HTML from Quill editor - remove empty paragraphs and extra tags
  const cleanupPassageHTML = (html) => {
    if (!html) return '';
    
    // Remove empty <p><br></p> tags
    let cleaned = html.replace(/<p><br><\/p>/g, '');
    
    // Remove multiple consecutive empty paragraphs
    cleaned = cleaned.replace(/<p><\/p>/g, '');
    
    // Remove excessive whitespace-only paragraphs
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
    
    // Replace multiple <br> with single <br>
    cleaned = cleaned.replace(/<br>\s*<br>/g, '<br>');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };



  const handlePassageChange = useCallback((index, field, value) => {
    const newPassages = [...passages];
    if (newPassages[index]) {
      newPassages[index][field] = value;
      setPassages(newPassages);
    }
  }, [passages]);

  const handleAddPassage = useCallback(() => {
    const newPassages = [...passages, { 
      passageTitle: '', 
      passageText: '', 
      sections: [
        {
          sectionTitle: '',
          sectionInstruction: '',
          sectionImage: null,
          questions: [{ questionNumber: 1, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' }]
        }
      ]
    }];
    setPassages(newPassages);
    setSelectedPassageIndex(newPassages.length - 1);
  }, [passages]);

  const handleDeletePassage = useCallback((passageIndex) => {
    if (passages.length <= 1) {
      return;
    }
    const newPassages = passages.filter((_, idx) => idx !== passageIndex);
    setPassages(newPassages);
    // Reset selected index if needed
    if (selectedPassageIndex >= newPassages.length) {
      setSelectedPassageIndex(Math.max(0, newPassages.length - 1));
    }
    setSelectedSectionIndex(null);
  }, [passages, selectedPassageIndex]);

  const handleAddSection = useCallback((passageIndex) => {
    try {
      if (!passages || !Array.isArray(passages) || !passages[passageIndex]) {
        return;
      }
      const newPassages = [...passages];
      if (!newPassages[passageIndex].sections) {
        newPassages[passageIndex].sections = [];
      }
      newPassages[passageIndex].sections.push({
        sectionTitle: '',
        sectionInstruction: '',
        sectionImage: null,
        questions: [{ questionNumber: 1, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' }]
      });
      setPassages(newPassages);
    } catch (error) {
      console.error('❌ Error in handleAddSection:', error);
    }
  }, [passages]);



  const handleSectionChange = useCallback((passageIndex, sectionIndex, field, value) => {
    const newPassages = [...passages];
    if (newPassages[passageIndex]?.sections?.[sectionIndex]) {
      newPassages[passageIndex].sections[sectionIndex][field] = value;
      setPassages(newPassages);
    }
  }, [passages]);

  const handleAddQuestion = useCallback((passageIndex, sectionIndex) => {
    try {
      if (!passages || !Array.isArray(passages) || !passages[passageIndex]) {
        setMessage('❌ Lỗi: Không tìm thấy passage');
        return;
      }
      const newPassages = [...passages];
      const section = newPassages[passageIndex]?.sections?.[sectionIndex];
      if (!section) {
        setMessage('❌ Lỗi: Không tìm thấy section');
        return;
      }
      const newQuestionNum = (section.questions?.length || 0) + 1;
      section.questions.push({
        questionNumber: newQuestionNum,
        questionType: 'multiple-choice',
        questionText: '',
        options: [''],
        correctAnswer: ''
      });
      setPassages(newPassages);
    } catch (error) {
      console.error('❌ Error in handleAddQuestion:', error);
      setMessage('❌ Lỗi khi thêm câu hỏi');
    }
  }, [passages]);

  const handleDeleteQuestion = useCallback((passageIndex, sectionIndex, questionIndex) => {
    try {
      if (!passages || !Array.isArray(passages) || !passages[passageIndex]) {
        setMessage('❌ Lỗi: Không tìm thấy passage');
        return;
      }
      const newPassages = [...passages];
      const section = newPassages[passageIndex]?.sections?.[sectionIndex];
      if (!section || !Array.isArray(section.questions)) {
        setMessage('❌ Lỗi: Không tìm thấy section hoặc questions');
        return;
      }
      newPassages[passageIndex].sections[sectionIndex].questions = 
        section.questions.filter((_, index) => index !== questionIndex);
      setPassages(newPassages);
    } catch (error) {
      console.error('❌ Error in handleDeleteQuestion:', error);
      setMessage('❌ Lỗi khi xóa câu hỏi');
    }
  }, [passages]);

  const handleCopyQuestion = useCallback((passageIndex, sectionIndex, questionIndex) => {
    try {
      if (!passages || !Array.isArray(passages) || !passages[passageIndex]) {
        setMessage('❌ Lỗi: Không tìm thấy passage');
        return;
      }
      const newPassages = [...passages];
      const passage = newPassages[passageIndex];
      const section = passage?.sections?.[sectionIndex];
      if (!section || !Array.isArray(section.questions)) {
        setMessage('❌ Lỗi: Không tìm thấy section hoặc questions');
        return;
      }
      
      const originalQuestion = section.questions[questionIndex];
      if (!originalQuestion) {
        setMessage('❌ Lỗi: Không tìm thấy câu hỏi');
        return;
      }
      
      // Deep copy the question
      const copiedQuestion = JSON.parse(JSON.stringify(originalQuestion));
      
      // Insert after the original question
      section.questions.splice(questionIndex + 1, 0, copiedQuestion);
      
      setPassages(newPassages);
    } catch (error) {
      console.error('❌ Error in handleCopyQuestion:', error);
      setMessage('❌ Lỗi khi sao chép câu hỏi');
    }
  }, [passages]);

  const handleQuestionChange = useCallback((passageIndex, sectionIndex, questionIndex, field, value) => {
    try {
      if (!passages || !Array.isArray(passages)) {
        console.warn('⚠️ Invalid passages state');
        return;
      }
      
      const newPassages = [...passages];
      if (!newPassages[passageIndex]) {
        console.warn('⚠️ Invalid passageIndex:', passageIndex);
        return;
      }
      
      if (!newPassages[passageIndex].sections || !newPassages[passageIndex].sections[sectionIndex]) {
        console.warn('⚠️ Invalid sectionIndex:', sectionIndex);
        return;
      }
      
      if (!newPassages[passageIndex].sections[sectionIndex].questions || 
          !newPassages[passageIndex].sections[sectionIndex].questions[questionIndex]) {
        console.warn('⚠️ Invalid questionIndex:', questionIndex);
        return;
      }
      
      const questions = newPassages[passageIndex].sections[sectionIndex].questions;
      
      // If field is 'full', replace entire question object
      if (field === 'full') {
        questions[questionIndex] = value;
      } else {
        // Otherwise, update single field
        questions[questionIndex][field] = value;
      }
      
      setPassages(newPassages);
    } catch (error) {
      console.error('❌ Error in handleQuestionChange:', error);
    }
  }, [passages]);

  const createDefaultQuestionByType = (type) => {
    const baseQuestion = {
      questionNumber: 1,
      questionType: type,
      questionText: '',
      correctAnswer: '',
      options: []  // All types need this as fallback
    };

    switch (type) {
      case 'multiple-choice':
        return { ...baseQuestion, options: ['A', 'B', 'C', 'D'] };
      case 'multi-select':
        return { ...baseQuestion, options: ['A', 'B', 'C', 'D'] };
      case 'fill-in-the-blanks':
        return { ...baseQuestion, maxWords: 3, options: [] };
      case 'matching':
        return { ...baseQuestion, leftItems: [], rightItems: [], matches: [], options: [] };
      case 'true-false-not-given':
        return { ...baseQuestion, options: [] };
      case 'yes-no-not-given':
        return { ...baseQuestion, options: [] };
      case 'cloze-test':
        return {
          ...baseQuestion,
          paragraphText: 'Another example of cheap technology helping poor people in the countryside is [BLANK]. Kerosene lamps and conventional bulbs give off less [BLANK] than GSBF lamps.',
          maxWords: 3,
          blanks: [
            { id: 'blank_0', blankNumber: 1, correctAnswer: '' },
            { id: 'blank_1', blankNumber: 2, correctAnswer: '' }
          ],
          options: []
        };
      case 'paragraph-matching':
        return { ...baseQuestion, options: [] };
      case 'sentence-completion':
        return { ...baseQuestion, options: [] };
      case 'paragraph-fill-blanks':
        return { 
          ...baseQuestion, 
          paragraphText: '',
          blanks: [
            { id: 'blank1', correctAnswer: '' },
            { id: 'blank2', correctAnswer: '' },
            { id: 'blank3', correctAnswer: '' }
          ],
          options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
        };
      case 'short-answer':
        return { ...baseQuestion, maxWords: 5, options: [] };
      default:
        return { ...baseQuestion, options: [] };
    }
  };

  const handleReview = (e) => {
    e.preventDefault();
    
    // Validate title
    if (!title || !title.trim()) {
      setMessage('⚠️ Vui lòng nhập tiêu đề đề thi');
      return;
    }
    
    // Validate passages
    if (!passages || passages.length === 0) {
      setMessage('⚠️ Cần có ít nhất 1 passage');
      return;
    }
    
    // Validate each passage has at least 1 section
    for (let i = 0; i < passages.length; i++) {
      if (!passages[i].sections || passages[i].sections.length === 0) {
        setMessage(`⚠️ Passage ${i + 1} phải có ít nhất 1 section`);
        return;
      }
      
      // Validate each section has at least 1 question
      for (let j = 0; j < passages[i].sections.length; j++) {
        if (!passages[i].sections[j].questions || passages[i].sections[j].questions.length === 0) {
          setMessage(`⚠️ Passage ${i + 1}, Section ${j + 1} phải có ít nhất 1 câu hỏi`);
          return;
        }
      }
    }
    
    setIsReviewing(true);
  };

  // Convert File to Base64 string
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);

      // Validate data before sending
      const cleanTitle = stripHtml(title).trim();
      const cleanClassCode = stripHtml(classCode).trim();
      const cleanTeacherName = stripHtml(teacherName).trim();

      if (!cleanTitle) {
        throw new Error('Tiêu đề không được để trống');
      }

      if (!passages || passages.length === 0) {
        throw new Error('Cần có ít nhất 1 passage');
      }

      const cleanedPassages = await Promise.all(passages.map(async (p, pIdx) => {
        if (!p.passageText || !p.passageText.trim()) {
          throw new Error(`Passage ${pIdx + 1} không có nội dung`);
        }
        
        return {
          passageTitle: stripHtml(p.passageTitle || '') || `Passage ${pIdx + 1}`,
          passageText: cleanupPassageHTML(p.passageText || ''),
          sections: await Promise.all(p.sections?.map(async (section, sIdx) => {
            if (!section.questions || section.questions.length === 0) {
              throw new Error(`Passage ${pIdx + 1}, Section ${sIdx + 1} phải có ít nhất 1 câu hỏi`);
            }

            // Note: sectionImage không được gửi qua JSON (quá lớn khi Base64)
            // Chỉ giữ lại sectionImage nếu nó là string (URL)
            const imagesToSend = typeof section.sectionImage === 'string' ? section.sectionImage : null;

            return {
              sectionTitle: stripHtml(section.sectionTitle || '') || `Section ${sIdx + 1}`,
              sectionInstruction: section.sectionInstruction || '',
              sectionImage: imagesToSend,
              questions: section.questions?.map(q => ({
                ...q,
                questionText: q.questionText || '',
                options: q.options ? q.options.map(opt => opt) : undefined
              })) || []
            };
          }) || [])
        };
      }));

      const response = await fetch(`${API}/api/reading-tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: cleanTitle,
          classCode: cleanClassCode,
          teacherName: cleanTeacherName,
          passages: cleanedPassages
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi khi cập nhật');

      setMessage('✅ Đã cập nhật đề thành công!');
      setTimeout(() => {
        navigate('/select-test');
      }, 1500);
    } catch (error) {
      console.error('❌ Error in handleConfirmUpdate:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsUpdating(false);
      setIsReviewing(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <p>⏳ Đang tải dữ liệu...</p>
        </div>
      </>
    );
  }

  if (!passages || passages.length === 0) {
    return (
      <>
        <AdminNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <p style={{ color: 'red' }}>❌ Không có dữ liệu để sửa. Vui lòng quay lại.</p>
          <button onClick={() => navigate('/reading-tests')} style={{
            padding: '10px 20px',
            backgroundColor: '#0e276f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            ← Quay lại
          </button>
        </div>
      </>
    );
  }

  if (message && message.includes('❌')) {
    return (
      <>
        <AdminNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <div style={{
            padding: '15px',
            backgroundColor: '#ffe6e6',
            color: 'red',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            {message}
          </div>
          <button onClick={() => navigate('/reading-tests')} style={{
            padding: '10px 20px',
            backgroundColor: '#0e276f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            ← Quay lại
          </button>
        </div>
      </>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  };

  const modalStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalContentStyles = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '80%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  const primaryBlue = '#0e276f';
  const dangerRed = '#e03';
  const modalHeaderStyles = {
    backgroundColor: primaryBlue,
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '6px 6px 0 0',
    margin: '-20px -20px 12px',
  };
  const confirmButtonStyle = {
    backgroundColor: primaryBlue,
    border: 'none',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(14,39,111,0.25)',
    transition: 'filter 120ms ease',
  };
  const backButtonStyle = {
    backgroundColor: dangerRed,
    border: 'none',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(224,3,51,0.25)',
    transition: 'filter 120ms ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontSize: '13px' }}>
      <style>{`
        /* Compact interface for reading test editor */
        .edit-reading-test {
          font-size: 13px;
        }
        .edit-reading-test h2 {
          font-size: 18px !important;
        }
        .edit-reading-test h3 {
          font-size: 14px !important;
        }
        .edit-reading-test label {
          font-size: 12px !important;
        }
        .edit-reading-test input, .edit-reading-test select, .edit-reading-test textarea {
          font-size: 12px !important;
          padding: 6px 8px !important;
        }
        .edit-reading-test button {
          font-size: 12px !important;
          padding: 8px 12px !important;
        }
        /* Compact column headers */
        .edit-reading-test [style*="borderBottom: 2px"] {
          padding: 8px 10px !important;
          min-height: auto !important;
        }
      `}</style>
      <AdminNavbar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }} className="edit-reading-test">
        <div style={{ padding: '10px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ margin: '6px 0 10px 0', fontSize: '18px', textAlign: 'center' }}>✏️ Sửa Đề Reading IELTS</h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Tiêu đề đề thi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 45%', minWidth: '200px', padding: '6px', fontSize: '12px', marginBottom: 0 }}
            />
            
            <input
              type="text"
              placeholder="Mã lớp"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 20%', minWidth: '120px', padding: '6px', fontSize: '12px', marginBottom: 0 }}
            />
            
            <input
              type="text"
              placeholder="Tên giáo viên"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 25%', minWidth: '150px', padding: '6px', fontSize: '12px', marginBottom: 0 }}
            />
          </div>
        </div>

        <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0px', flex: 1, backgroundColor: '#ddd', overflow: 'hidden', position: 'relative' }}>
            
            {/* COLUMN 1: PASSAGES */}
            <div style={{
              width: getColumnWidth('col1'),
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '2px solid #0e276f', backgroundColor: '#0e276f', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: 'auto', fontSize: '12px' }} onClick={() => toggleColumnCollapse('col1')}>
                {!collapsedColumns.col1 && <span>📚 PASSAGES</span>}
                {collapsedColumns.col1 && <span style={{ fontSize: '14px' }}>📚</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col1 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col1 && (
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  {passages.map((passage, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        backgroundColor: selectedPassageIndex === idx ? '#0e276f' : '#fff',
                        color: selectedPassageIndex === idx ? '#fff' : '#000',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: selectedPassageIndex === idx ? 'bold' : 'normal',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        onClick={() => {

                          setSelectedPassageIndex(idx);
                          setSelectedSectionIndex(null);
                        }}
                        style={{ flex: 1 }}
                      >
                        Passage {idx + 1}
                        <br />
                        <small>{passage.passageTitle || '(Untitled)'}</small>
                      </div>
                      {passages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePassage(idx)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginLeft: '8px'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddPassage}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#0e276f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '8px',
                      fontSize: '12px'
                    }}
                  >
                    ➕ Thêm Passage
                  </button>
                </div>
              )}
            </div>

            {/* RESIZE DIVIDER 1 */}
            <div
              onMouseDown={(e) => handleMouseDown(1, e)}
              style={{
                width: '6px',
                backgroundColor: isResizing === 1 ? '#0e276f' : 'transparent',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background-color 0.2s ease'
              }}
            />

            {/* COLUMN 2: PASSAGE CONTENT */}
            <div style={{
              width: getColumnWidth('col2'),
              backgroundColor: '#fafafa',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '2px solid #28a745', backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: 'auto', fontSize: '12px' }} onClick={() => toggleColumnCollapse('col2')}>
                {!collapsedColumns.col2 && <span>📄 CONTENT</span>}
                {collapsedColumns.col2 && <span style={{ fontSize: '14px' }}>📄</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col2 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col2 && passages && passages[selectedPassageIndex] ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  {/* 🔍 Debug info */}
                  <div style={{ 
                    backgroundColor: '#fffacd', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    marginBottom: '10px', 
                    fontSize: '11px', 
                    border: '1px solid #ddd',
                    display: 'none'
                  }}>
                    <strong>Debug:</strong> Index={selectedPassageIndex}, Title="{passages[selectedPassageIndex].passageTitle}"
                  </div>
                  
                  <label style={{ fontWeight: 'bold', color: '#28a745' }}>📝 Tiêu đề</label>
                  <input
                    type="text"
                    value={passages[selectedPassageIndex]?.passageTitle || ''}
                    onChange={(e) => {

                      handlePassageChange(selectedPassageIndex, 'passageTitle', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginBottom: '15px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <label style={{ fontWeight: 'bold', color: '#28a745' }}>📖 Nội dung</label>
                  <div style={{ marginTop: '10px' }}>
                    {passages[selectedPassageIndex] && (
                      <QuillEditor
                        key={`${selectedPassageIndex}-${passages[selectedPassageIndex].passageTitle}`}
                        value={passages[selectedPassageIndex].passageText || ''}
                        onChange={(value) => {
                          console.log(`✏️ Editing passage ${selectedPassageIndex}: ${value.substring(0, 50)}...`);
                          handlePassageChange(selectedPassageIndex, 'passageText', value);
                        }}
                        placeholder="Nhập nội dung passage..."
                      />
                    )}
                  </div>
                </div>
              ) : (
                !collapsedColumns.col2 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>← Chọn một Passage</div>
              )}
            </div>

            {/* RESIZE DIVIDER 2 */}
            <div
              onMouseDown={(e) => handleMouseDown(2, e)}
              style={{
                width: '6px',
                backgroundColor: isResizing === 2 ? '#0e276f' : 'transparent',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background-color 0.2s ease'
              }}
            />

            {/* COLUMN 3: SECTIONS */}
            <div style={{
              width: getColumnWidth('col3'),
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '2px solid #ff6b6b', backgroundColor: '#ff6b6b', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: 'auto', fontSize: '12px' }} onClick={() => toggleColumnCollapse('col3')}>
                {!collapsedColumns.col3 && <span>📌 SECTIONS</span>}
                {collapsedColumns.col3 && <span style={{ fontSize: '14px' }}>📌</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col3 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col3 && passages && passages[selectedPassageIndex] ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  {passages[selectedPassageIndex].sections?.map((section, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSectionIndex(idx)}
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        backgroundColor: selectedSectionIndex === idx ? '#ff6b6b' : '#fff',
                        color: selectedSectionIndex === idx ? '#fff' : '#000',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedSectionIndex === idx ? 'bold' : 'normal',
                        fontSize: '12px'
                      }}
                    >
                      Section {idx + 1}
                      <br />
                      <small>{section.sectionTitle || '(Untitled)'}</small>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddSection(selectedPassageIndex)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '10px'
                    }}
                  >
                    ➕ Thêm Section
                  </button>
                </div>
              ) : (
                !collapsedColumns.col3 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>← Chọn một Passage</div>
              )}
            </div>

            {/* RESIZE DIVIDER 3 */}
            <div
              onMouseDown={(e) => handleMouseDown(3, e)}
              style={{
                width: '6px',
                backgroundColor: isResizing === 3 ? '#0e276f' : 'transparent',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background-color 0.2s ease'
              }}
            />

            {/* COLUMN 4: QUESTIONS */}
            <div style={{
              width: getColumnWidth('col4'),
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '2px solid #ffc107', backgroundColor: '#ffc107', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: 'auto', fontSize: '12px' }} onClick={() => toggleColumnCollapse('col4')}>
                {!collapsedColumns.col4 && <span>❓ QUESTIONS</span>}
                {collapsedColumns.col4 && <span style={{ fontSize: '14px' }}>❓</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col4 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col4 && passages && passages[selectedPassageIndex] && selectedSectionIndex !== null ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  <QuestionSection
                    passageIndex={selectedPassageIndex}
                    sectionIndex={selectedSectionIndex}
                    section={passages[selectedPassageIndex].sections[selectedSectionIndex]}
                    onSectionChange={handleSectionChange}
                    onAddQuestion={handleAddQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onCopyQuestion={handleCopyQuestion}
                    onCopySection={(pIdx, sIdx) => {
                      try {
                        const newPassages = [...passages];
                        const passage = newPassages[pIdx];
                        const originalSection = passage?.sections?.[sIdx];
                        if (!passage || !originalSection) {
                          setMessage('❌ Lỗi: Không tìm thấy section để sao chép');
                          return;
                        }
                        const copiedSection = JSON.parse(JSON.stringify(originalSection));
                        passage.sections.splice(sIdx + 1, 0, copiedSection);
                        setPassages(newPassages);
                        setSelectedSectionIndex(sIdx + 1);
                      } catch (error) {
                        console.error('❌ Error copying section:', error);
                        setMessage('❌ Lỗi khi sao chép section');
                      }
                    }}
                    onQuestionChange={handleQuestionChange}
                    onDeleteSection={(pIdx, sIdx) => {
                      try {
                        const newPassages = [...passages];
                        if (!newPassages[pIdx]?.sections) return;
                        if (newPassages[pIdx].sections.length <= 1) {
                          setMessage('❌ Phải có ít nhất 1 section');
                          return;
                        }
                        newPassages[pIdx].sections.splice(sIdx, 1);
                        setPassages(newPassages);
                        if (selectedSectionIndex === sIdx) {
                          const newIndex = sIdx > 0 ? sIdx - 1 : null;
                          setSelectedSectionIndex(newIndex);
                        } else if (selectedSectionIndex > sIdx) {
                          setSelectedSectionIndex(selectedSectionIndex - 1);
                        }
                      } catch (error) {
                        console.error('❌ Error deleting section:', error);
                        setMessage('❌ Lỗi khi xóa section');
                      }
                    }}
                    createDefaultQuestionByType={createDefaultQuestionByType}
                  />
                </div>
              ) : (
                !collapsedColumns.col4 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>← Chọn một Section để xem câu hỏi</div>
              )}
            </div>
          </div>
        </form>

        {/* FIXED BUTTONS & STATS */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          padding: '12px 20px',
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 999,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
            <span>📚 Passages: {passages.length}</span>
            <span>📌 Sections: {passages.reduce((sum, p) => sum + (p.sections?.length || 0), 0)}</span>
            <span>❓ Questions: {calculateTotalQuestions(passages)}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              onClick={handleReview}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#0b8e3a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0a7a32'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0b8e3a'}
            >
              📝 Xem & Sửa
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: message.includes('❌') ? '#ffe6e6' : '#e6ffe6',
          color: message.includes('❌') ? 'red' : 'green',
          fontWeight: 'bold',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          {message}
        </div>
      )}

      {isReviewing && (
        <div style={modalStyles}>
          <style>{`
            /* Modal Quill content styles */
            .modal-passage-preview h1, .modal-passage-preview h2, .modal-passage-preview h3 {
              margin: 0.5em 0 !important;
              padding: 0 !important;
            }
            .modal-passage-preview h3 {
              font-size: 1.17em !important;
            }
            
            .modal-passage-preview p {
              margin: 0 0 0.5em 0 !important;
              padding: 0 !important;
            }
            
            /* Size formats in modal - support both classes and span tags */
            .modal-passage-preview .ql-size-small,
            .modal-passage-preview span[style*="font-size"] {
              font-size: 0.75em !important;
            }
            .modal-passage-preview .ql-size-large,
            .modal-passage-preview span[style*="font-size: 1.5"] {
              font-size: 1.5em !important;
            }
            .modal-passage-preview .ql-size-huge,
            .modal-passage-preview span[style*="font-size: 2.5"] {
              font-size: 2.5em !important;
            }
            
            /* Align formats in modal - support all variations */
            .modal-passage-preview .ql-align-center,
            .modal-passage-preview [style*="text-align: center"],
            .modal-passage-preview p[style*="text-align: center"],
            .modal-passage-preview h1[style*="text-align: center"],
            .modal-passage-preview h2[style*="text-align: center"],
            .modal-passage-preview h3[style*="text-align: center"] {
              text-align: center !important;
            }
            .modal-passage-preview .ql-align-right,
            .modal-passage-preview [style*="text-align: right"],
            .modal-passage-preview p[style*="text-align: right"],
            .modal-passage-preview h1[style*="text-align: right"],
            .modal-passage-preview h2[style*="text-align: right"],
            .modal-passage-preview h3[style*="text-align: right"] {
              text-align: right !important;
            }
            .modal-passage-preview .ql-align-justify,
            .modal-passage-preview [style*="text-align: justify"],
            .modal-passage-preview p[style*="text-align: justify"],
            .modal-passage-preview h1[style*="text-align: justify"],
            .modal-passage-preview h2[style*="text-align: justify"],
            .modal-passage-preview h3[style*="text-align: justify"] {
              text-align: justify !important;
            }
          `}</style>
          <div style={modalContentStyles}>
            <div style={modalHeaderStyles}>
              <h2 style={{ margin: 0 }}>🔎 Xem lại & Cập nhật</h2>
            </div>
            <div style={{ padding: '16px' }}>
              <h3>📋 {title}</h3>
              <p><strong>Mã lớp:</strong> {classCode}</p>
              <p><strong>Giáo viên:</strong> {teacherName}</p>
              <hr />
            </div>
            
            {passages.map((p, pIndex) => (
              <div key={pIndex} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ddd', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                <h4 style={{ color: '#0e276f', marginTop: 0 }}>📄 Passage {pIndex + 1}: {p.passageTitle || 'Untitled'}</h4>
                
                {/* Passage Text Preview - Full Content */}
                <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fff', borderLeft: '4px solid #0e276f', borderRadius: '4px', maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
                  <div className="modal-passage-preview" style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: p.passageText || '<em style="color: #999;">(Chưa có nội dung)</em>' }} />
                </div>
                
                {/* Sections */}
                <div style={{ marginBottom: '10px' }}>
                  <strong>Sections: {p.sections?.length || 0}</strong>
                  {p.sections?.map((section, sIndex) => (
                    <div key={sIndex} style={{ marginTop: '12px', marginLeft: '20px', padding: '10px', backgroundColor: '#e8f0fe', borderRadius: '4px' }}>
                      <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                        📌 Section {sIndex + 1}: {section.sectionTitle || 'Untitled'}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                        {section.sectionInstruction ? stripHtml(section.sectionInstruction).substring(0, 100) + '...' : '(Không có hướng dẫn)'}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '13px', fontWeight: '600' }}>
                        Questions: {section.questions?.length || 0}
                      </p>
                      
                      {/* Questions Preview */}
                      {section.questions?.map((q, qIndex) => {
                        let previewText = '';
                        let answersDisplay = null;
                        let additionalInfo = null;
                        let detailedPreview = null;
                        
                        if (q.questionType === 'paragraph-fill-blanks') {
                          previewText = stripHtml(q.paragraphText || '').substring(0, 80);
                          answersDisplay = q.blanks?.map(b => b.correctAnswer).join(', ');
                        } else if (q.questionType === 'cloze-test') {
                          previewText = stripHtml(q.paragraphText || '').substring(0, 80);
                          const blankCount = q.blanks?.length || 0;
                          additionalInfo = `${blankCount} chỗ trống`;
                          
                          // Create detailed preview for cloze-test
                          detailedPreview = (
                            <div style={{ marginTop: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                              <strong style={{ color: '#0e276f', display: 'block', marginBottom: '8px' }}>📖 Đoạn văn:</strong>
                              <p style={{ margin: '0 0 8px 0', lineHeight: '1.6', fontSize: '13px' }}>{stripHtml(q.paragraphText || '')}</p>
                              {q.blanks && q.blanks.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <strong style={{ color: '#0e276f', fontSize: '12px' }}>✍️ Đáp án:</strong>
                                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '12px' }}>
                                    {q.blanks.map((blank, idx) => (
                                      <li key={idx}>Chỗ trống #{blank.blankNumber}: <strong>{blank.correctAnswer || '(chưa nhập)'}</strong></li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                          answersDisplay = q.blanks?.filter(b => b.correctAnswer).length ? `✅ ${q.blanks.length} đáp án` : '❌ Chưa đủ đáp án';
                        } else if (q.questionType === 'heading-matching' || q.questionType === 'matching') {
                          // For matching: show first left item as identifier
                          const firstLeftItem = q.leftItems?.[0] || '';
                          previewText = firstLeftItem.substring(0, 60);
                          const leftCount = q.leftItems?.length || 0;
                          const rightCount = q.rightItems?.length || 0;
                          additionalInfo = `${leftCount} left item(s) → ${rightCount} right item(s)`;
                          
                          // Helper function: convert index to letter (0->A, 1->B, etc)
                          const indexToLetter = (idx) => String.fromCharCode(65 + idx);
                          
                          // Create detailed preview for matching - simple version
                          detailedPreview = (
                            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                              <div>
                                <strong style={{ color: '#0e276f' }}>Left Items:</strong>
                                <ul style={{ margin: '6px 0 0 0', listStyle: 'none', paddingLeft: '0' }}>
                                  {q.leftItems?.map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '3px' }}>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <strong style={{ color: '#0e276f' }}>Answers:</strong>
                                <ul style={{ margin: '6px 0 0 0', listStyle: 'none', paddingLeft: '0' }}>
                                  {q.leftItems?.map((_, idx) => {
                                    const matchValue = q.matches?.[idx];
                                    return (
                                      <li key={idx} style={{ marginBottom: '3px', color: '#27ae60' }}>
                                        {indexToLetter(idx)} → {matchValue || '?'}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          );
                          answersDisplay = q.matches?.filter(m => m).length ? '✅ Match set' : '❌ No match';
                        } else if (q.questionType === 'true-false-not-given') {
                          previewText = stripHtml(q.questionText || '').substring(0, 80);
                          answersDisplay = q.correctAnswer;
                        } else if (q.questionType === 'multiple-choice') {
                          previewText = stripHtml(q.questionText || '').substring(0, 80);
                          answersDisplay = q.correctAnswer;
                        } else if (q.questionType === 'short-answer') {
                          previewText = stripHtml(q.questionText || '').substring(0, 80);
                          answersDisplay = q.correctAnswer;
                        } else if (q.questionType === 'essay') {
                          previewText = stripHtml(q.questionText || '').substring(0, 80);
                          answersDisplay = `${q.wordLimit || 'N/A'} words`;
                        } else {
                          previewText = stripHtml(q.questionText || q.paragraphText || '').substring(0, 80);
                          answersDisplay = q.correctAnswer;
                        }
                        
                        return (
                          <div key={qIndex} style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff', borderLeft: '2px solid #0b8e3a', borderRadius: '3px', fontSize: '12px' }}>
                            <strong>Q{q.questionNumber} ({q.questionType}):</strong> {previewText}...
                            {additionalInfo && (
                              <div style={{ marginTop: '3px', fontSize: '11px', color: '#666' }}>
                                ℹ️ {additionalInfo}
                              </div>
                            )}
                            {detailedPreview && detailedPreview}
                            {answersDisplay && (
                              <div style={{ marginTop: '3px', color: '#0b8e3a' }}>
                                ✅ {answersDisplay}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <button style={backButtonStyle} onClick={() => setIsReviewing(false)}>
                ← Quay lại sửa
              </button>
              <button style={{...confirmButtonStyle, marginLeft: '10px'}} onClick={handleConfirmUpdate} disabled={isUpdating}>
                {isUpdating ? '⏳ Đang cập nhật...' : '✅ Xác nhận cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditReadingTest;
