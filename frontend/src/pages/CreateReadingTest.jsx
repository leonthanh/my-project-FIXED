import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import QuillEditor from '../components/QuillEditor';
import QuestionSection from '../components/QuestionSection';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

const CreateReadingTest = () => {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  // Load saved data from localStorage if available
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem('readingTestDraft');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return null;
  };

  const savedData = loadSavedData();

  const [title, setTitle] = useState(savedData?.title || '');
  const [classCode, setClassCode] = useState(savedData?.classCode || '');
  const [teacherName, setTeacherName] = useState(savedData?.teacherName || '');
  const [passages, setPassages] = useState(savedData?.passages || [
    { 
      passageTitle: '', 
      passageText: '', 
      sections: []
    }
  ]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState('');
  
  // 4-column layout state
  const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [collapsedColumns, setCollapsedColumns] = useState({
    col1: false, // Passages
    col2: false, // Content
    col3: false, // Sections
    col4: false  // Questions
  });

  useEffect(() => {
    // Track passage selection
    if (passages && passages[selectedPassageIndex]) {
      // Selected passage updated
    }
  }, [selectedPassageIndex, passages]);

  // Toggle column collapse/expand
  const toggleColumnCollapse = (colName) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [colName]: !prev[colName]
    }));
  };

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
      
      // Adjust adjacent columns based on which divider is being dragged
      if (isResizing === 1) { // Between col1 and col2
        newWidths.col1 = Math.max(8, Math.min(20, startWidths.col1 + delta));
        newWidths.col2 = 100 - newWidths.col1 - newWidths.col3 - newWidths.col4;
      } else if (isResizing === 2) { // Between col2 and col3
        newWidths.col2 = Math.max(20, Math.min(50, startWidths.col2 + delta));
        newWidths.col3 = 100 - newWidths.col1 - newWidths.col2 - newWidths.col4;
      } else if (isResizing === 3) { // Between col3 and col4
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
    if (collapsedColumns[colName]) return '50px'; // collapsed
    
    // Count how many columns are NOT collapsed
    const openColumns = ['col1', 'col2', 'col3', 'col4'].filter(col => !collapsedColumns[col]);
    
    if (openColumns.length === 1) {
      // Full width for single open column
      return '100%';
    } else if (openColumns.length === 2) {
      // Split remaining space between 2 open columns
      const totalCollapsedWidth = ['col1', 'col2', 'col3', 'col4']
        .filter(col => collapsedColumns[col])
        .length * 50; // 50px per collapsed column
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 2}%`;
    } else if (openColumns.length === 3) {
      // Distribute space among 3 open columns
      const totalCollapsedWidth = 50; // 50px for 1 collapsed column
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 3}%`;
    }
    
    // Default: use columnWidths state (4 columns open)
    return `${columnWidths[colName]}%`;
  };

  // Autosave function
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        title,
        passages,
        classCode,
        teacherName
      };
      localStorage.setItem('readingTestDraft', JSON.stringify(dataToSave));

    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [title, passages, classCode, teacherName]);

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

  // Strip HTML tags from text
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

  const handleAddPassage = () => {
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
  };

  const handleDeletePassage = (passageIndex) => {
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
  };

  const handlePassageChange = (index, field, value) => {
    const newPassages = [...passages];
    newPassages[index][field] = value;
    setPassages(newPassages);
  };


  const createDefaultQuestionByType = (type) => {
    switch(type) {
      case 'multiple-choice':
        return {
          questionType: 'multiple-choice',
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: ''
        };
      case 'multi-select':
        return {
          questionType: 'multi-select',
          questionText: '',
          options: ['', '', '', '', ''],
          correctAnswer: '',
          maxSelection: 2
        };
      case 'fill-in-the-blanks':
        return {
          questionType: 'fill-in-the-blanks',
          questionText: '',
          correctAnswer: '',
          maxWords: 3,
          options: []
        };
      case 'matching':
        return {
          questionType: 'matching',
          questionText: 'Match the items:',
          leftItems: ['Item A', 'Item B', 'Item C'],
          rightItems: ['Item 1', 'Item 2', 'Item 3'],
          matches: ['1', '2', '3'],
          options: []
        };
      case 'true-false-not-given':
        return {
          questionType: 'true-false-not-given',
          questionText: '',
          correctAnswer: 'TRUE',
          options: []
        };
      case 'yes-no-not-given':
        return {
          questionType: 'yes-no-not-given',
          questionText: '',
          correctAnswer: 'YES',
          options: []
        };
      case 'cloze-test':
        return {
          questionType: 'cloze-test',
          paragraphText: 'Another example of cheap technology helping poor people in the countryside is [BLANK]. Kerosene lamps and conventional bulbs give off less [BLANK] than GSBF lamps.',
          maxWords: 3,
          blanks: [
            { id: 'blank_0', blankNumber: 1, correctAnswer: '' },
            { id: 'blank_1', blankNumber: 2, correctAnswer: '' }
          ],
          options: []
        };
      case 'paragraph-matching':
        return {
          questionType: 'paragraph-matching',
          questionText: '',
          correctAnswer: 'A',
          options: []
        };
      case 'sentence-completion':
        return {
          questionType: 'sentence-completion',
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 'A'
        };
      case 'paragraph-fill-blanks':
        return {
          questionType: 'paragraph-fill-blanks',
          paragraphText: '',
          blanks: [
            { id: 'blank1', correctAnswer: '' },
            { id: 'blank2', correctAnswer: '' },
            { id: 'blank3', correctAnswer: '' }
          ],
          options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
        };
      case 'short-answer':
        return {
          questionType: 'short-answer',
          questionText: '',
          correctAnswer: '',
          maxWords: 3,
          options: []
        };
      default:
        return {
          questionType: 'multiple-choice',
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: ''
        };
    }
  };

  // ===== SECTION HANDLERS =====
  const handleAddSection = (passageIndex) => {
    const newPassages = [...passages];
    // Ensure sections exist (for old data without sections)
    if (!newPassages[passageIndex].sections) {
      newPassages[passageIndex].sections = [];
    }
    const newSectionNumber = newPassages[passageIndex].sections.length + 1;
    newPassages[passageIndex].sections.push({
      sectionTitle: `Section ${newSectionNumber}`,
      sectionInstruction: '',
      sectionImage: null,
      questions: [] // Trống, giáo viên sẽ tự thêm câu hỏi
    });
    setPassages(newPassages);
  };

  const handleDeleteSection = (passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    if (!newPassages[passageIndex].sections) {
      return;
    }
    if (newPassages[passageIndex].sections.length <= 1) {
      return;
    }
    newPassages[passageIndex].sections.splice(sectionIndex, 1);
    setPassages(newPassages);
    
    // Reset selectedSectionIndex to prevent undefined error
    if (selectedSectionIndex === sectionIndex) {
      // If deleted section was selected, select the previous one or null
      const newIndex = sectionIndex > 0 ? sectionIndex - 1 : null;
      setSelectedSectionIndex(newIndex);
    } else if (selectedSectionIndex > sectionIndex) {
      // If deleted section was before selected, shift index down
      setSelectedSectionIndex(selectedSectionIndex - 1);
    }
  };

  const handleSectionChange = (passageIndex, sectionIndex, field, value) => {
    const newPassages = [...passages];
    newPassages[passageIndex].sections[sectionIndex][field] = value;
    setPassages(newPassages);
  };

  const handleAddQuestion = (passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    const passage = newPassages[passageIndex];
    const section = passage.sections[sectionIndex];
    
    // Giáo viên sẽ tự nhập questionNumber - không auto-calculate
    section.questions.push({
      questionNumber: 1, // Mặc định 1, giáo viên sẽ chỉnh lại
      questionType: 'multiple-choice',
      questionText: '',
      options: [''],
      correctAnswer: ''
    });
    setPassages(newPassages);
  };

  const handleDeleteQuestion = (passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    const passage = newPassages[passageIndex];
    const section = passage.sections[sectionIndex];
    section.questions.splice(questionIndex, 1);
    
    // NOTE: Không auto-renumber - cho giáo viên tự nhập questionNumber
    
    setPassages(newPassages);
  };

  const handleCopyQuestion = (passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    const passage = newPassages[passageIndex];
    const section = passage.sections[sectionIndex];
    const originalQuestion = section.questions[questionIndex];
    
    // Deep copy the question
    const copiedQuestion = JSON.parse(JSON.stringify(originalQuestion));
    
    // Insert after the original question
    section.questions.splice(questionIndex + 1, 0, copiedQuestion);
    
    setPassages(newPassages);
  };

  const handleCopySection = (passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    const passage = newPassages[passageIndex];
    const originalSection = passage.sections[sectionIndex];
    
    // Deep copy the section
    const copiedSection = JSON.parse(JSON.stringify(originalSection));
    
    // Insert after the original section
    passage.sections.splice(sectionIndex + 1, 0, copiedSection);
    
    setPassages(newPassages);
    setSelectedSectionIndex(sectionIndex + 1);
  };

  const handleQuestionChange = (passageIndex, sectionIndex, questionIndex, field, updatedQuestion) => {
    const newPassages = [...passages];
    if (field === 'full') {
      newPassages[passageIndex].sections[sectionIndex].questions[questionIndex] = updatedQuestion;
    } else {
      newPassages[passageIndex].sections[sectionIndex].questions[questionIndex][field] = updatedQuestion;
    }
    setPassages(newPassages);
  };

  const handleReview = (e) => {
    e.preventDefault();
    
    // Validate title
    if (!title || !title.trim()) {
      setMessage('⚠️ Vui lòng nhập tiêu đề đề thi');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Validate passages
    if (!passages || passages.length === 0) {
      setMessage('⚠️ Cần có ít nhất 1 passage');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Validate each passage has at least 1 section
    const hasEmptySections = passages.some(p => !p.sections || p.sections.length === 0);
    if (hasEmptySections) {
      setMessage('⚠️ Mỗi passage cần có ít nhất 1 section');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Validate each section has at least 1 question
    const hasEmptyQuestions = passages.some(p => 
      p.sections.some(s => !s.questions || s.questions.length === 0)
    );
    if (hasEmptyQuestions) {
      setMessage('⚠️ Mỗi section cần có ít nhất 1 câu hỏi');
      setTimeout(() => setMessage(''), 3000);
      return;
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

  const handleConfirmSubmit = async () => {
    try {
      setIsCreating(true);
      
      // Clean up passages data before submitting
      const cleanedPassages = await Promise.all(passages.map(async (p) => {
        // Flatten questions from all sections
        const allQuestions = [];
        p.sections?.forEach(section => {
          section.questions?.forEach(q => {
            allQuestions.push({
              ...q,
              questionText: stripHtml(q.questionText || ''),
              options: q.options ? q.options.map(opt => stripHtml(opt)) : undefined
            });
          });
        });
        
        return {
          passageTitle: stripHtml(p.passageTitle || ''),
          passageText: cleanupPassageHTML(p.passageText || ''),
          sections: await Promise.all(p.sections?.map(async (section) => {
            // Note: sectionImage không được gửi qua JSON (quá lớn khi Base64)
            // Chỉ giữ lại sectionImage nếu nó là string (URL)
            const imagesToSend = typeof section.sectionImage === 'string' ? section.sectionImage : null;
            
            return {
              sectionTitle: stripHtml(section.sectionTitle || ''),
              sectionInstruction: stripHtml(section.sectionInstruction || ''),
              sectionImage: imagesToSend,
              questions: section.questions?.map(q => ({
                ...q,
                questionText: stripHtml(q.questionText || ''),
                options: q.options ? q.options.map(opt => stripHtml(opt)) : undefined
              })) || []
            };
          }) || [])
        };
      }));

      const response = await fetch(`${API}/api/reading-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: stripHtml(title),
          classCode: stripHtml(classCode),
          teacherName: stripHtml(teacherName),
          passages: cleanedPassages
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi tạo đề thi');
      }

      localStorage.removeItem('readingTestDraft');
      setTimeout(() => {
        navigate('/reading-tests');
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsCreating(false);
      setIsReviewing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '2px solid #0e276f',
    backgroundColor: '#fff',
    cursor: 'text',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 5,
    transition: 'border-color 0.2s'
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

  // Theme colors from the app
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
        /* Compact interface for reading test creation */
        .create-reading-test {
          font-size: 13px;
        }
        .create-reading-test h2 {
          font-size: 18px !important;
        }
        .create-reading-test h3 {
          font-size: 14px !important;
        }
        .create-reading-test label {
          font-size: 12px !important;
        }
        .create-reading-test input, .create-reading-test select, .create-reading-test textarea {
          font-size: 12px !important;
          padding: 6px 8px !important;
        }
        .create-reading-test button {
          font-size: 12px !important;
          padding: 8px 12px !important;
        }
      `}</style>
      <AdminNavbar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }} className="create-reading-test">
        <div style={{ padding: '10px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ margin: '6px 0 10px 0', fontSize: '18px', textAlign: 'center' }}>📚 Tạo Đề Reading IELTS</h2>
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

          {/* 4-COLUMN LAYOUT */}
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
                      padding: '10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '10px'
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
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
              
              {!collapsedColumns.col2 && passages[selectedPassageIndex] && (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
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

                          handlePassageChange(selectedPassageIndex, 'passageText', value);
                        }}
                        placeholder="Nhập nội dung passage..."
                      />
                    )}
                  </div>
                </div>
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
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
              
              {!collapsedColumns.col3 && passages[selectedPassageIndex] && (
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
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
              
              {!collapsedColumns.col4 && passages[selectedPassageIndex] && selectedSectionIndex !== null && (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  <QuestionSection
                    passageIndex={selectedPassageIndex}
                    sectionIndex={selectedSectionIndex}
                    section={passages[selectedPassageIndex].sections[selectedSectionIndex]}
                    onSectionChange={handleSectionChange}
                    onAddQuestion={handleAddQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onCopyQuestion={handleCopyQuestion}
                    onCopySection={handleCopySection}
                    onQuestionChange={handleQuestionChange}
                    onDeleteSection={handleDeleteSection}
                    createDefaultQuestionByType={createDefaultQuestionByType}
                  />
                </div>
              )}
              {!collapsedColumns.col4 && selectedSectionIndex === null && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  ← Chọn một Section để xem câu hỏi
                </div>
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
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              👁 Preview
            </button>

            <button
              type="submit"
              onClick={handleReview}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#e03',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c60'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e03'}
            >
              ✏️ Xem lại & Tạo
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
          color: message.includes('❌') || message.includes('⚠️') ? '#d32f2f' : 'green',
          fontWeight: 'bold',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          {message}
        </div>
      )}

      {showPreview && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <div style={modalHeaderStyles}>
              <h2 style={{ margin: 0 }}>👁 Preview Đề Reading</h2>
            </div>
            {passages.map((p, pIndex) => (
              <div key={pIndex} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
                <h3 style={{ color: '#0e276f' }}>{p.passageTitle || `Passage ${pIndex + 1}`}</h3>
                <div style={{ 
                  backgroundColor: '#f9f9f9',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  lineHeight: '1.8'
                }} dangerouslySetInnerHTML={{ __html: p.passageText }} />
                {p.sections?.map((section, sectionIndex) => (
                  <div key={sectionIndex} style={{ marginBottom: '15px', paddingLeft: '10px', borderLeft: '3px solid #0e276f' }}>
                    {section.sectionTitle && <h5 style={{ color: '#0e276f', marginTop: '10px' }}>{section.sectionTitle}</h5>}
                    {section.sectionInstruction && (
                      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: section.sectionInstruction }} />
                    )}
                    {section.sectionImage && (
                      <div style={{ marginBottom: '15px' }}>
                        <img
                          src={typeof section.sectionImage === 'string' 
                            ? section.sectionImage 
                            : section.sectionImage instanceof File || section.sectionImage instanceof Blob
                              ? URL.createObjectURL(section.sectionImage)
                              : ''}
                          alt="Section"
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {section.questions && section.questions.length > 0 && (
                      <>
                        <h6 style={{ marginTop: '10px' }}>Câu hỏi:</h6>
                        {section.questions.map((q, qIndex) => (
                          <div key={qIndex} style={{ marginBottom: '10px', paddingLeft: '15px' }}>
                            <p><strong>{q.questionNumber}. {q.questionText}</strong></p>
                            {q.options && q.options.length > 0 && (
                              <ul style={{ marginLeft: '20px' }}>
                                {q.options.map((opt, optIndex) => opt && <li key={optIndex}>{opt}</li>)}
                              </ul>
                            )}
                            {q.questionType === 'cloze-test' && q.paragraphText && (
                              <div style={{ marginBottom: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                                <strong>Đoạn văn:</strong>
                                <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{q.paragraphText}</p>
                                {q.blanks && q.blanks.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong>Đáp án các chỗ trống:</strong>
                                    <ul style={{ marginLeft: '20px' }}>
                                      {q.blanks.map((blank, idx) => (
                                        <li key={idx}>Chỗ trống #{blank.blankNumber}: <strong>{blank.correctAnswer || '(chưa nhập)'}</strong></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            {q.leftItems && q.rightItems && q.questionType === 'matching' && (
                              <div style={{ marginBottom: '10px' }}>
                                <strong>Left Items:</strong>
                                <ul style={{ marginLeft: '20px' }}>
                                  {q.leftItems.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                                <strong>Right Items:</strong>
                                <ul style={{ marginLeft: '20px' }}>
                                  {q.rightItems.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </div>
                            )}
                            {q.questionType === 'paragraph-fill-blanks' && q.paragraphText && (
                              <div style={{ marginBottom: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                                <strong>Đoạn văn:</strong>
                                <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{q.paragraphText}</p>
                                {q.blanks && q.blanks.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong>Các chỗ trống:</strong>
                                    <ul style={{ marginLeft: '20px' }}>
                                      {q.blanks.map((blank, idx) => (
                                        <li key={idx}>Blank {idx + 1}: <strong>{blank.correctAnswer || '(chưa nhập)'}</strong></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            <p style={{ color: '#666', marginTop: '5px' }}>
                              <strong>Đáp án:</strong> {q.correctAnswer}
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <hr />
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e03',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕ Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {isReviewing && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <div style={modalHeaderStyles}>
              <h2 style={{ margin: 0 }}>🔎 Xem lại đề Reading</h2>
            </div>
            <div style={{ padding: '16px 0' }}>
              <p><strong>Tiêu đề:</strong> {title}</p>
              <p><strong>Mã lớp:</strong> {classCode}</p>
              <p><strong>Giáo viên:</strong> {teacherName}</p>
            </div>
            <hr />
            {passages.map((p, pIndex) => (
              <div key={pIndex} className="mb-4">
                <h4>{p.passageTitle || `Passage ${pIndex + 1}`}</h4>
                <div className="p-2 border rounded" dangerouslySetInnerHTML={{ __html: p.passageText }} />
                {p.sections?.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="mt-3 pl-3 border-left">
                    {section.sectionTitle && <h5 className="mb-2">{section.sectionTitle}</h5>}
                    {section.sectionInstruction && (
                      <div className="p-2 bg-light rounded mb-2" dangerouslySetInnerHTML={{ __html: section.sectionInstruction }} />
                    )}
                    {section.questions && section.questions.length > 0 && (
                      <>
                        <h6 className="mt-2">Câu hỏi:</h6>
                        {section.questions.map((q, qIndex) => (
                          <div key={qIndex} className="pl-3 mb-2">
                            <p><strong>{q.questionNumber}. {q.questionText}</strong> ({q.questionType})</p>
                            {q.questionType === 'multiple-choice' && (
                              <ul>
                                {q.options?.map((opt, optIndex) => <li key={optIndex}>{opt}</li>)}
                              </ul>
                            )}
                            {q.questionType === 'cloze-test' && q.paragraphText && (
                              <div className="mb-2 p-2 bg-light rounded">
                                <strong>Đoạn văn:</strong>
                                <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{q.paragraphText}</p>
                                {q.blanks && q.blanks.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong>Đáp án:</strong>
                                    <ul>
                                      {q.blanks.map((blank, idx) => (
                                        <li key={idx}>Chỗ trống #{blank.blankNumber}: <strong>{blank.correctAnswer || '(chưa nhập)'}</strong></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            {q.questionType === 'paragraph-fill-blanks' && q.paragraphText && (
                              <div className="mb-2 p-2 bg-light rounded">
                                <strong>Đoạn văn:</strong>
                                <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{q.paragraphText}</p>
                                {q.blanks && q.blanks.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong>Các chỗ trống:</strong>
                                    <ul>
                                      {q.blanks.map((blank, idx) => (
                                        <li key={idx}>Blank {idx + 1}: <strong>{blank.correctAnswer || '(chưa nhập)'}</strong></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            {q.leftItems && q.rightItems && q.questionType === 'matching' && (
                              <div className="mb-2">
                                <strong>Left Items:</strong>
                                <ul>
                                  {q.leftItems.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                                <strong>Right Items:</strong>
                                <ul>
                                  {q.rightItems.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </div>
                            )}
                            <p style={{ color: '#0b8e3a' }}><strong>Đáp án:</strong> {q.correctAnswer}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-end gap-2">
              <button style={backButtonStyle} onClick={() => setIsReviewing(false)}>← Quay lại chỉnh sửa</button>
              <button style={confirmButtonStyle} onClick={handleConfirmSubmit} disabled={isCreating}>
                {isCreating ? '⏳ Đang tạo...' : '✅ Xác nhận & Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReadingTest;
