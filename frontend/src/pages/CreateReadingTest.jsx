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
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      console.log('Draft saved:', new Date().toLocaleTimeString());
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

  const handleAddPassage = () => {
    setPassages([...passages, { 
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
    }]);
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
          maxWords: 3
        };
      case 'matching':
        return {
          questionType: 'matching',
          questionText: 'Match the items:',
          leftItems: ['Item A', 'Item B', 'Item C'],
          rightItems: ['Item 1', 'Item 2', 'Item 3'],
          matches: ['1', '2', '3']
        };
      case 'true-false-not-given':
        return {
          questionType: 'true-false-not-given',
          questionText: '',
          correctAnswer: 'TRUE'
        };
      case 'paragraph-matching':
        return {
          questionType: 'paragraph-matching',
          questionText: '',
          correctAnswer: 'A'
        };
      case 'sentence-completion':
        return {
          questionType: 'sentence-completion',
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 'A'
        };
      case 'short-answer':
        return {
          questionType: 'short-answer',
          questionText: '',
          correctAnswer: '',
          maxWords: 3
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

  const handleDeletePassage = (passageIndex) => {
    if (passages.length <= 1) {
      setMessage('❌ Phải có ít nhất 1 passage');
      return;
    }
    const newPassages = passages.filter((_, idx) => idx !== passageIndex);
    setPassages(newPassages);
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
      setMessage('❌ Không có section để xóa');
      return;
    }
    if (newPassages[passageIndex].sections.length <= 1) {
      setMessage('❌ Phải có ít nhất 1 section');
      return;
    }
    newPassages[passageIndex].sections.splice(sectionIndex, 1);
    setPassages(newPassages);
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
    
    // Tính question number dựa trên tất cả sections + questions trước đó
    let questionNumber = 1;
    for (let i = 0; i < sectionIndex; i++) {
      questionNumber += passage.sections[i].questions.length;
    }
    questionNumber += section.questions.length + 1;
    
    section.questions.push({
      questionNumber: questionNumber,
      questionType: 'multiple-choice',
      questionText: '',
      options: [''],
      correctAnswer: ''
    });
    setPassages(newPassages);
  };

  const handleDeleteQuestion = (passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    const section = newPassages[passageIndex].sections[sectionIndex];
    section.questions.splice(questionIndex, 1);
    // Renumber remaining questions
    section.questions.forEach((q, idx) => {
      q.questionNumber = idx + 1;
    });
    setPassages(newPassages);
  };

  const handleQuestionChange = (passageIndex, sectionIndex, questionIndex, updatedQuestion) => {
    const newPassages = [...passages];
    newPassages[passageIndex].sections[sectionIndex].questions[questionIndex] = updatedQuestion;
    setPassages(newPassages);
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('❌ Vui lòng nhập tiêu đề đề thi');
      return;
    }
    if (!classCode.trim()) {
      setMessage('❌ Vui lòng nhập mã lớp');
      return;
    }
    if (!teacherName.trim()) {
      setMessage('❌ Vui lòng nhập tên giáo viên');
      return;
    }
    setMessage('');
    setIsReviewing(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setIsCreating(true);
      
      // Clean up passages data before submitting
      const cleanedPassages = passages.map(p => ({
        passageTitle: stripHtml(p.passageTitle || ''),
        passageText: stripHtml(p.passageText || ''),
        questions: p.questions.map(q => ({
          ...q,
          questionText: stripHtml(q.questionText || ''),
          options: q.options ? q.options.map(opt => stripHtml(opt)) : undefined
        }))
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

      setMessage('✅ Đã tạo đề thành công!');
      localStorage.removeItem('readingTestDraft');
      setTimeout(() => {
        navigate('/reading-tests');
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ ${error.message || 'Lỗi khi tạo đề thi'}`);
    } finally {
      setIsCreating(false);
      setIsReviewing(false);
    }
  };

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
    <div>
      <AdminNavbar />
      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
        <h2>📚 Tạo Đề Reading IELTS</h2>
        
        <form onSubmit={handleReview}>
          <input
            type="text"
            placeholder="Tiêu đề đề thi (VD: IELTS Reading Test 1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
          
          <input
            type="text"
            placeholder="Mã lớp (VD: 317S3)"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            style={inputStyle}
          />
          
          <input
            type="text"
            placeholder="Tên giáo viên ra đề"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          {passages.map((passage, passageIndex) => (
            <div key={passageIndex} className="card mb-4">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Passage {passageIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => handleDeletePassage(passageIndex)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    backgroundColor: '#e03',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🗑 Xóa Passage
                </button>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Tiêu đề đoạn văn</label>
                  <input
                    type="text"
                    className="form-control"
                    value={passage.passageTitle}
                    onChange={(e) => handlePassageChange(passageIndex, 'passageTitle', e.target.value)}
                  />
                </div>
                <div className="mb-3">
                    <label className="form-label">Nội dung đoạn văn</label>
                    <QuillEditor
                        value={passage.passageText}
                        onChange={(value) => handlePassageChange(passageIndex, 'passageText', value)}
                    />
                </div>

                {/* SECTIONS */}
                <h4 className="mt-4">📌 Phần câu hỏi (Sections)</h4>
                {passage.sections?.map((section, sectionIndex) => (
                  <QuestionSection
                    key={sectionIndex}
                    passageIndex={passageIndex}
                    sectionIndex={sectionIndex}
                    section={section}
                    onSectionChange={handleSectionChange}
                    onAddQuestion={handleAddQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onQuestionChange={handleQuestionChange}
                    onDeleteSection={handleDeleteSection}
                    createDefaultQuestionByType={createDefaultQuestionByType}
                  />
                ))}
                <button 
                  type="button" 
                  onClick={() => handleAddSection(passageIndex)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: '#0e276f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginBottom: '20px'
                  }}
                >
                  ➕ Thêm Section
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleAddPassage}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ➕ Thêm Passage
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              👁 Preview
            </button>

            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#e03',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✏️ Xem lại & Tạo
            </button>
          </div>
        </form>

        {message && (
          <p style={{
            marginTop: 20,
            fontWeight: 'bold',
            color: message.includes('❌') ? 'red' : 'green',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: message.includes('❌') ? '#ffe6e6' : '#e6ffe6'
          }}>
            {message}
          </p>
        )}
      </div>

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
                <h4>Câu hỏi:</h4>
                {p.questions.map((q, qIndex) => (
                  <div key={qIndex} style={{ marginBottom: '10px', paddingLeft: '15px' }}>
                    <p><strong>{q.questionNumber}. {q.questionText}</strong></p>
                    {q.options && q.options.length > 0 && (
                      <ul style={{ marginLeft: '20px' }}>
                        {q.options.map((opt, optIndex) => opt && <li key={optIndex}>{opt}</li>)}
                      </ul>
                    )}
                    <p style={{ color: '#666', marginTop: '5px' }}>
                      <strong>Đáp án:</strong> {q.correctAnswer}
                    </p>
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
                <h5 className="mt-3">Câu hỏi:</h5>
                {p.questions.map((q, qIndex) => (
                  <div key={qIndex} className="pl-3 mb-2">
                    <p><strong>{q.questionNumber}. {q.questionText}</strong> ({q.questionType})</p>
                    {q.questionType === 'multiple-choice' && (
                      <ul>
                        {q.options.map((opt, optIndex) => <li key={optIndex}>{opt}</li>)}
                      </ul>
                    )}
                    <p style={{ color: '#0b8e3a' }}><strong>Đáp án:</strong> {q.correctAnswer}</p>
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
