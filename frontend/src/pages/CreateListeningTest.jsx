import React, { useState, useCallback } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import PreviewSection from '../components/PreviewSection';
import ListeningPart from '../components/ListeningPart';

const CreateListeningTest = () => {
  // Load saved data from localStorage if available
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem('listeningTestDraft');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return null;
  };

  const savedData = loadSavedData();

  const [audioFile, setAudioFile] = useState(null);
  const [partTypes, setPartTypes] = useState(savedData?.partTypes || {
    part1: 'fill',
    part2: 'radio',
    part3: 'mixed',
    part4: 'radio'
  });

  const [partInstructions, setPartInstructions] = useState(savedData?.partInstructions || {
    part1: '',
    part2: '',
    part3: '',
    part4: ''
  });

  const [questions, setQuestions] = useState(savedData?.questions || {
    part1: Array(10).fill().map(() => ({
      questionType: 'fill',
      questionText: '',
      correctAnswer: ''
    })),
    part2: Array(10).fill().map(() => ({
      questionType: 'radio',
      questionText: '',
      options: ['', '', ''],
      correctAnswer: ''
    })),
    part3: Array(10).fill().map(() => ({
      questionType: 'mixed',
      questionText: '',
      options: ['', '', '', '', ''],
      correctAnswer: ''
    })),
    part4: Array(10).fill().map(() => ({
      questionType: 'radio',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    }))
  });

  const [classCode, setClassCode] = useState(savedData?.classCode || '');
  const [teacherName, setTeacherName] = useState(savedData?.teacherName || '');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [partAudioFiles, setPartAudioFiles] = useState({
    part1: null,
    part2: null,
    part3: null,
    part4: null
  });

  // Autosave function
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        partTypes,
        partInstructions,
        questions,
        classCode,
        teacherName
      };
      localStorage.setItem('listeningTestDraft', JSON.stringify(dataToSave));
      console.log('Draft saved:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [partTypes, partInstructions, questions, classCode, teacherName]);

  // Auto save every 30 seconds
  React.useEffect(() => {
    const autosaveInterval = setInterval(saveToLocalStorage, 30000);
    
    // Save when user leaves the page
    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage]);


  const API = process.env.REACT_APP_API_URL;

  const handlePartTypeChange = (part, newType) => {
    setPartTypes(prev => ({
      ...prev,
      [part]: newType
    }));
    setQuestions(prev => ({
      ...prev,
      [part]: Array(10).fill().map(() => createDefaultQuestion(newType))
    }));
  };

  const handleQuestionChange = (part, index, updatedQuestion) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].map((q, i) => i === index ? updatedQuestion : q)
    }));
  };

  const handlePartInstructionChange = (part, newContent) => {
    setPartInstructions(prev => ({
      ...prev,
      [part]: newContent
    }));
  };

  const createDefaultQuestion = (type) => {
    switch(type) {
      case 'fill':
        return {
          questionType: 'fill',
          questionText: '',
          correctAnswer: ''
        };
      case 'radio':
        return {
          questionType: 'radio',
          questionText: '',
          options: ['', '', ''],
          correctAnswer: ''
        };
      case 'checkbox':
        return {
          questionType: 'checkbox',
          questionText: '',
          options: ['', '', '', '', ''],
          correctAnswer: ''
        };
      default:
        return {
          questionType: type,
          questionText: '',
          options: ['', '', ''],
          correctAnswer: ''
        };
    }
  };

  const stripHtml = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!audioFile && !Object.values(partAudioFiles).some(file => file)) {
        setMessage('❌ Vui lòng tải lên ít nhất một file audio cho bài thi.');
        return;
      }

      // Clean up the questions data before submitting
      const cleanedQuestions = {};
      Object.entries(questions).forEach(([part, partQuestions]) => {
        cleanedQuestions[part] = partQuestions.map(q => ({
          ...q,
          questionText: stripHtml(q.questionText || ''),
          formTemplate: q.formTemplate ? stripHtml(q.formTemplate) : undefined,
          options: q.options ? q.options.map(opt => stripHtml(opt)) : undefined
        }));
      });

      console.log('Sending questions:', cleanedQuestions);

      const formData = new FormData();
      if (audioFile) {
        formData.append('audioFile', audioFile);
      }

      Object.entries(partAudioFiles).forEach(([part, file]) => {
        if (file) {
          formData.append(`audioFile_${part}`, file);
        }
      });

      // Append other form data
      formData.append('questions', JSON.stringify(cleanedQuestions));
      formData.append('partTypes', JSON.stringify(partTypes));
      
      // Convert part instructions from HTML to text
      const cleanedInstructions = {};
      Object.entries(partInstructions).forEach(([part, instruction]) => {
        cleanedInstructions[part] = stripHtml(instruction || '');
      });
      formData.append('partInstructions', JSON.stringify(cleanedInstructions));
      formData.append('classCode', classCode);
      formData.append('teacherName', teacherName);

      // Log form data for debugging
      for (let [key, value] of formData.entries()) {
        console.log('Form data:', key, value instanceof File ? value.name : value);
      }

      const res = await fetch(`${API}/api/listening-tests`, {
        method: 'POST',
        body: formData
      });

      const data = await res.text();
      console.log('Raw response:', data);

      let jsonData;
      try {
        jsonData = JSON.parse(data);
      } catch (err) {
        console.error('Error parsing response:', err);
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        throw new Error(jsonData.message || 'Lỗi khi tạo đề thi');
      }

      setMessage(jsonData.message || '✅ Đã tạo đề thành công!');
      localStorage.removeItem('listeningTestDraft');
      setTimeout(() => window.location.reload(), 2000);

    } catch (err) {
      console.error('Error:', err);
      setMessage(`❌ ${err.message || 'Lỗi khi tạo đề thi'}`);
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

  return (
    <>
      <AdminNavbar />
      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
        <h2>🎧 Thêm đề Listening</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Mã lớp (VD: 317S3)"
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Tên giáo viên ra đề"
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div>
                <label><b>📂 File audio chung:</b></label><br />
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setAudioFile(e.target.files[0])}
                  style={{ margin: '10px 0' }}
                />
                {audioFile && (
                  <audio controls style={{ width: '100%', marginTop: '10px' }}>
                    <source src={URL.createObjectURL(audioFile)} />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            </div>

            <div>
              <label><b>📂 File audio riêng cho từng phần:</b></label>
              {[1, 2, 3, 4].map(partNumber => (
                <div key={partNumber} style={{ marginTop: '10px' }}>
                  <label>Part {partNumber}:</label><br />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={e => {
                      setPartAudioFiles(prev => ({
                        ...prev,
                        [`part${partNumber}`]: e.target.files[0]
                      }))
                    }}
                    style={{ margin: '5px 0' }}
                  />
                  {partAudioFiles[`part${partNumber}`] && (
                    <audio controls style={{ width: '100%', marginTop: '5px' }}>
                      <source src={URL.createObjectURL(partAudioFiles[`part${partNumber}`])} />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
              {(
                <div style={{ padding: '20px' }}>
                  {[1, 2, 3, 4].map(partNumber => (
                    <ListeningPart
                      key={partNumber}
                      partNumber={partNumber}
                      partType={partTypes[`part${partNumber}`]}
                      questions={questions[`part${partNumber}`]}
                      instruction={partInstructions[`part${partNumber}`]}
                      onTypeChange={(newType) => handlePartTypeChange(`part${partNumber}`, newType)}
                      onInstructionChange={(content) => handlePartInstructionChange(`part${partNumber}`, content)}
                      onQuestionChange={(index, updatedQuestion) => 
                        handleQuestionChange(`part${partNumber}`, index, updatedQuestion)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#e03',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ➕ Tạo đề
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
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
              👁 Preview
            </button>
          </div>
        </form>

        {message && (
          <p style={{
            marginTop: 10,
            fontWeight: 'bold',
            color: message.includes('❌') ? 'red' : 'green'
          }}>
            {message}
          </p>
        )}

        {showPreview && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3>Preview</h3>
              {[1, 2, 3, 4].map(partNumber => (
                <div key={partNumber}>
                  <h4>Part {partNumber}</h4>
                  <div dangerouslySetInnerHTML={{ 
                    __html: partInstructions[`part${partNumber}`] 
                  }} />
                  <PreviewSection
                    part={partNumber}
                    questions={questions[`part${partNumber}`]}
                    startFromNumber={1 + (partNumber - 1) * 10}
                    type={(() => {
                      switch(partTypes[`part${partNumber}`]) {
                        case 'fill': return 'form';
                        case 'radio': return partNumber === 4 ? 'abcd' : 'abc';
                        case 'checkbox': return 'select';
                        default: return partTypes[`part${partNumber}`];
                      }
                    })()}
                    audioFiles={partAudioFiles[`part${partNumber}`] || audioFile}
                  />
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e03',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateListeningTest;
