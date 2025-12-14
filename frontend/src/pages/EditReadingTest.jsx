import React, { useState, useEffect } from 'react';
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
  const [expandedPassages, setExpandedPassages] = useState({}); // Track expanded passages
  const [expandedSections, setExpandedSections] = useState({}); // Track expanded sections

  // Fetch existing test
  useEffect(() => {
    if (hasLoaded) return; // Prevent duplicate fetches
    
    const fetchTest = async () => {
      try {
        console.log('🔄 Fetching test:', testId, 'API:', API);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(`${API}/api/reading-tests/${testId}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('📦 Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Không tìm thấy đề thi`);
        }
        const data = await response.json();
        console.log('✅ Data received:', data);
        
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
      console.warn('⚠️ Missing testId or API:', { testId, API });
      setLoading(false);
      setHasLoaded(true);
    }
  }, [testId, API, hasLoaded]);

  const stripHtml = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const togglePassage = (index) => {
    setExpandedPassages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleSection = (passageIndex, sectionIndex) => {
    const key = `${passageIndex}-${sectionIndex}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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

  const handleDeletePassage = (passageIndex) => {
    if (passages.length === 1) {
      setMessage('⚠️ Phải có ít nhất 1 passage');
      return;
    }
    setPassages(passages.filter((_, index) => index !== passageIndex));
  };

  const handlePassageChange = (index, field, value) => {
    const newPassages = [...passages];
    if (newPassages[index]) {
      newPassages[index][field] = value;
      setPassages(newPassages);
    }
  };

  const handleAddSection = (passageIndex) => {
    const newPassages = [...passages];
    newPassages[passageIndex].sections.push({
      sectionTitle: '',
      sectionInstruction: '',
      sectionImage: null,
      questions: [{ questionNumber: 1, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' }]
    });
    setPassages(newPassages);
  };

  const handleDeleteSection = (passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    if (newPassages[passageIndex].sections.length === 1) {
      setMessage('⚠️ Phải có ít nhất 1 section');
      return;
    }
    newPassages[passageIndex].sections = newPassages[passageIndex].sections.filter(
      (_, index) => index !== sectionIndex
    );
    setPassages(newPassages);
  };

  const handleSectionChange = (passageIndex, sectionIndex, field, value) => {
    const newPassages = [...passages];
    if (newPassages[passageIndex]?.sections?.[sectionIndex]) {
      newPassages[passageIndex].sections[sectionIndex][field] = value;
      setPassages(newPassages);
    }
  };

  const handleAddQuestion = (passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    const newQuestionNum = (newPassages[passageIndex].sections[sectionIndex].questions?.length || 0) + 1;
    newPassages[passageIndex].sections[sectionIndex].questions.push({
      questionNumber: newQuestionNum,
      questionType: 'multiple-choice',
      questionText: '',
      options: [''],
      correctAnswer: ''
    });
    setPassages(newPassages);
  };

  const handleDeleteQuestion = (passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    newPassages[passageIndex].sections[sectionIndex].questions = 
      newPassages[passageIndex].sections[sectionIndex].questions.filter(
        (_, index) => index !== questionIndex
      );
    setPassages(newPassages);
  };

  const handleQuestionChange = (passageIndex, sectionIndex, questionIndex, field, value) => {
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
  };

  const createDefaultQuestionByType = (type) => {
    const baseQuestion = {
      questionNumber: 1,
      questionType: type,
      questionText: '',
      correctAnswer: ''
    };

    switch (type) {
      case 'multiple-choice':
        return { ...baseQuestion, options: ['A', 'B', 'C', 'D'] };
      case 'multi-select':
        return { ...baseQuestion, options: ['A', 'B', 'C', 'D'] };
      case 'fill-in-the-blanks':
        return { ...baseQuestion, maxWords: 3 };
      case 'matching':
        return { ...baseQuestion, leftItems: [], rightItems: [], matches: [] };
      case 'true-false-not-given':
        return baseQuestion;
      case 'yes-no-not-given':
        return baseQuestion;
      case 'paragraph-matching':
        return baseQuestion;
      case 'sentence-completion':
        return { ...baseQuestion, options: [] };
      case 'short-answer':
        return { ...baseQuestion, maxWords: 5 };
      default:
        return baseQuestion;
    }
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('⚠️ Vui lòng nhập tiêu đề đề thi');
      return;
    }
    setIsReviewing(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);

      const cleanedPassages = passages.map(p => ({
        passageTitle: stripHtml(p.passageTitle || ''),
        passageText: p.passageText || '', // Keep HTML formatting
        sections: p.sections?.map(section => ({
          sectionTitle: stripHtml(section.sectionTitle || ''),
          sectionInstruction: section.sectionInstruction || '', // Keep HTML formatting
          sectionImage: section.sectionImage,
          questions: section.questions?.map(q => ({
            ...q,
            questionText: q.questionText || '', // Keep HTML formatting
            options: q.options ? q.options.map(opt => opt) : undefined // Keep options as-is
          })) || []
        })) || []
      }));

      const response = await fetch(`${API}/api/reading-tests/${testId}`, {
        method: 'PUT',
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
      if (!response.ok) throw new Error(data.message || 'Lỗi khi cập nhật');

      setMessage('✅ Đã cập nhật đề thành công!');
      setTimeout(() => {
        navigate('/select-test');
      }, 1500);
    } catch (error) {
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
    <div>
      <AdminNavbar />
      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
        <h2>✏️ Sửa Đề Reading IELTS</h2>

        <form onSubmit={handleReview}>
          <input
            type="text"
            placeholder="Tiêu đề đề thi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Mã lớp"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Tên giáo viên"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          {passages && passages.length > 0 && passages.map((passage, passageIndex) => (
            passage && passage.sections && (
              <div key={passageIndex} style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginBottom: '15px',
                borderRadius: '6px',
                backgroundColor: '#f9f9f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => togglePassage(passageIndex)}>
                    {expandedPassages[passageIndex] ? '▼' : '▶'} 📄 Passage {passageIndex + 1}
                  </h4>
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
                    ✕ Xóa Passage
                  </button>
                </div>

                {expandedPassages[passageIndex] && (
                  <>
                    <input
                      type="text"
                      placeholder="Tiêu đề passage"
                      value={passage.passageTitle || ''}
                      onChange={(e) => handlePassageChange(passageIndex, 'passageTitle', e.target.value)}
                      style={inputStyle}
                    />

                    <QuillEditor
                      value={passage.passageText || ''}
                      onChange={(value) => handlePassageChange(passageIndex, 'passageText', value)}
                      placeholder="Nội dung passage"
                    />

                    <h5>Các Section trong Passage này ({passage.sections?.length || 0})</h5>
                    {passage.sections && passage.sections.map((section, sectionIndex) => (
                      <div key={`${passageIndex}-${sectionIndex}`}>
                        <div style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#e8f0fe', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#0e276f' }} onClick={() => toggleSection(passageIndex, sectionIndex)}>
                          {expandedSections[`${passageIndex}-${sectionIndex}`] ? '▼' : '▶'} 📌 Section {sectionIndex + 1}: {section.sectionTitle || 'Untitled'}
                        </div>
                        
                        {expandedSections[`${passageIndex}-${sectionIndex}`] && (
                          <QuestionSection
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
                        )}
                      </div>
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
                  </>
                )}
              </div>
            )
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
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ➕ Thêm Passage Mới
            </button>

            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0b8e3a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📝 Xem & Sửa
            </button>
          </div>
        </form>

        {message && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: message.includes('❌') ? '#ffe6e6' : '#e6ffe6',
            color: message.includes('❌') ? 'red' : 'green',
            fontWeight: 'bold'
          }}>
            {message}
          </div>
        )}

        {isReviewing && (
          <div style={modalStyles}>
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
                    <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: p.passageText || '<em style="color: #999;">(Chưa có nội dung)</em>' }} />
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
                        {section.questions?.map((q, qIndex) => (
                          <div key={qIndex} style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff', borderLeft: '2px solid #0b8e3a', borderRadius: '3px', fontSize: '12px' }}>
                            <strong>Q{q.questionNumber}:</strong> {stripHtml(q.questionText || '').substring(0, 80)}...
                            {q.correctAnswer && <div style={{ marginTop: '3px', color: '#0b8e3a' }}>✅ Đáp án: {q.correctAnswer}</div>}
                          </div>
                        ))}
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
    </div>
  );
};

export default EditReadingTest;
