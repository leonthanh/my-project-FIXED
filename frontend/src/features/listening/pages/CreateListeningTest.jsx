import React, { useState, useCallback } from 'react';
import { AdminNavbar, PreviewSection } from '../../../shared/components';
import { ListeningPart } from '../components';
import '../../../shared/styles/create-listening.css';

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

  // passages: array of { title, audioFile, instruction, partType, questions: [] }
  const [passages, setPassages] = useState(savedData?.passages || [
    {
      title: 'Part 1',
      audioFile: null,
      instruction: '',
      partType: 'fill',
      questions: [
        { questionType: 'fill', questionText: '', options: [], correctAnswer: '' }
      ]
    }
  ]);

  // history stack for undo
  const [actionHistory, setActionHistory] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const _useActionHistory = actionHistory; // Keep for potential future use

  const [classCode, setClassCode] = useState(savedData?.classCode || '');
  const [teacherName, setTeacherName] = useState(savedData?.teacherName || '');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Autosave function
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        passages,
        classCode,
        teacherName
      };
      localStorage.setItem('listeningTestDraft', JSON.stringify(dataToSave));
      // Draft saved (debug log removed)
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [passages, classCode, teacherName]);

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

  const handlePassageChange = (pIndex, field, value) => {
    setPassages(prev => {
      const next = [...prev];
      next[pIndex] = { ...next[pIndex], [field]: value };
      return next;
    });
  };

  const handleAddPassage = () => {
    const newPassage = {
      title: `Part ${passages.length + 1}`,
      audioFile: null,
      instruction: '',
      partType: 'fill',
      questions: [{ questionType: 'fill', questionText: '', options: [], correctAnswer: '' }]
    };
    setPassages(prev => {
      setActionHistory(h => [...h, { type: 'addPassage' }]);
      return [...prev, newPassage];
    });
  };

  const handleRemovePassage = (pIndex) => {
    setPassages(prev => {
      const removed = prev[pIndex];
      setActionHistory(h => [...h, { type: 'removePassage', pIndex, passage: removed }]);
      const next = prev.filter((_, i) => i !== pIndex).map((p, i) => ({ ...p, title: `Part ${i+1}`}));
      return next;
    });
  };

  const handleAddQuestion = (pIndex) => {
    setPassages(prev => {
      const next = [...prev];
      const q = { questionType: next[pIndex].partType || 'fill', questionText: '', options: [], correctAnswer: '' };
      next[pIndex] = { ...next[pIndex], questions: [...next[pIndex].questions, q] };
      setActionHistory(h => [...h, { type: 'addQuestion', pIndex }]);
      return next;
    });
  };

  const handleRemoveQuestion = (pIndex, qIndex) => {
    setPassages(prev => {
      const next = [...prev];
      const removed = next[pIndex].questions[qIndex];
      next[pIndex] = { ...next[pIndex], questions: next[pIndex].questions.filter((_, i) => i !== qIndex) };
      setActionHistory(h => [...h, { type: 'removeQuestion', pIndex, qIndex, question: removed }]);
      return next;
    });
  };

  const handleReplaceQuestion = (pIndex, qIndex, updatedQuestion) => {
    setPassages(prev => {
      const next = [...prev];
      next[pIndex] = { ...next[pIndex], questions: next[pIndex].questions.map((qq, i) => i === qIndex ? updatedQuestion : qq) };
      return next;
    });
  };

  const handleAddOptionToQuestion = (pIndex, qIndex) => {
    setPassages(prev => {
      const next = [...prev];
      const q = { ...next[pIndex].questions[qIndex] };
      q.options = q.options ? [...q.options, ''] : [''];
      next[pIndex] = { ...next[pIndex], questions: next[pIndex].questions.map((qq, i) => i === qIndex ? q : qq) };
      setActionHistory(h => [...h, { type: 'addOption', pIndex, qIndex }]);
      return next;
    });
  };

  const handleRemoveOptionFromQuestion = (pIndex, qIndex) => {
    setPassages(prev => {
      const next = [...prev];
      const q = { ...next[pIndex].questions[qIndex] };
      if (!q.options || q.options.length === 0) return prev;
      const removed = q.options[q.options.length - 1];
      q.options = q.options.slice(0, -1);
      next[pIndex] = { ...next[pIndex], questions: next[pIndex].questions.map((qq, i) => i === qIndex ? q : qq) };
      setActionHistory(h => [...h, { type: 'removeOption', pIndex, qIndex, value: removed }]);
      return next;
    });
  };

  const handlePassageAudioChange = (pIndex, file) => {
    setPassages(prev => {
      const next = [...prev];
      next[pIndex] = { ...next[pIndex], audioFile: file };
      return next;
    });
  };

  const handleUndo = () => {
    setActionHistory(prev => {
      const nextHist = [...prev];
      const last = nextHist.pop();
      if (!last) return prev;
      // apply reverse
      setPassages(current => {
        let next = [...current];
        if (last.type === 'addPassage') {
          next = next.slice(0, -1);
        } else if (last.type === 'removePassage') {
          const arr = [...next.slice(0, last.pIndex), last.passage, ...next.slice(last.pIndex)];
          next = arr.map((p, i) => ({ ...p, title: `Part ${i+1}`}));
        } else if (last.type === 'addQuestion') {
          const p = { ...next[last.pIndex] };
          p.questions = p.questions.slice(0, -1);
          next[last.pIndex] = p;
        } else if (last.type === 'addOption') {
          const p = { ...next[last.pIndex] };
          const q = { ...p.questions[last.qIndex] };
          q.options = q.options ? q.options.slice(0, -1) : [];
          p.questions = p.questions.map((qq, i) => i === last.qIndex ? q : qq);
          next[last.pIndex] = p;
        } else if (last.type === 'removeOption') {
          const p = { ...next[last.pIndex] };
          const q = { ...p.questions[last.qIndex] };
          q.options = q.options ? [...q.options, last.value] : [last.value];
          p.questions = p.questions.map((qq, i) => i === last.qIndex ? q : qq);
          next[last.pIndex] = p;
        }
        return next;
      });
      return nextHist;
    });
  };


  // eslint-disable-next-line no-unused-vars
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

  // When submitting, show a review modal first
  const handleSubmit = (e) => {
    e.preventDefault();
    // basic validation: ensure audio exists globally or in any passage
    const hasPassageAudio = passages.some(p => p.audioFile);
    if (!audioFile && !hasPassageAudio) {
      setMessage('❌ Vui lòng tải lên ít nhất một file audio cho bài thi hoặc cho mỗi phần.');
      return;
    }
    setIsReviewing(true);
  };

  const [isCreating, setIsCreating] = useState(false);

  // Confirmed create -> actually send to server
  const handleConfirmCreate = async () => {
    try {
      setIsCreating(true);
      
      // Validate file sizes (max 50MB per file)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      
      if (audioFile && audioFile.size > MAX_FILE_SIZE) {
        throw new Error(`❌ File audio chung quá lớn (>${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB). Vui lòng chọn file nhỏ hơn.`);
      }
      
      for (let i = 0; i < passages.length; i++) {
        const file = passages[i].audioFile;
        if (file && file.size > MAX_FILE_SIZE) {
          throw new Error(`❌ File audio phần ${i + 1} quá lớn (>${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB). Vui lòng chọn file nhỏ hơn.`);
        }
      }
      
      // Clean up passages data before submitting
      const cleanedPassages = passages.map(p => ({
        title: p.title,
        instruction: stripHtml(p.instruction || ''),
        partType: p.partType,
        questions: p.questions.map(q => ({
          ...q,
          questionText: stripHtml(q.questionText || ''),
          options: q.options ? q.options.map(opt => stripHtml(opt)) : undefined
        }))
      }));

      const formData = new FormData();
      if (audioFile) formData.append('audioFile', audioFile);
      // per-passage audio
      cleanedPassages.forEach((p, i) => {
        const file = passages[i].audioFile;
        if (file) formData.append(`audioFile_passage_${i}`, file);
      });

      formData.append('passages', JSON.stringify(cleanedPassages));
      formData.append('classCode', classCode);
      formData.append('teacherName', teacherName);

      const res = await fetch(`${API}/api/listening-tests`, { method: 'POST', body: formData });
      const data = await res.text();
      let jsonData;
      try { jsonData = JSON.parse(data); } catch (err) { console.error('Error parsing response:', err); throw new Error('Invalid response from server'); }
      if (!res.ok) throw new Error(jsonData.message || 'Lỗi khi tạo đề thi');

      setMessage(jsonData.message || '✅ Đã tạo đề thành công!');
      localStorage.removeItem('listeningTestDraft');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Error:', err);
      setMessage(`❌ ${err.message || 'Lỗi khi tạo đề thi'}`);
    } finally {
      setIsReviewing(false);
      setIsCreating(false);
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
              <small>Hoặc bạn có thể tải audio cho từng phần trực tiếp trong từng phần (Passage) bên dưới.</small>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
              <div style={{ padding: '20px' }}>
                {passages.map((p, pIndex) => {
                  // compute startFromNumber as sum of previous questions + 1
                  const startFrom = passages.slice(0, pIndex).reduce((acc, cur) => acc + (cur.questions?.length || 0), 0) + 1;
                  return (
                    <div key={pIndex} style={{ marginBottom: '26px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: '#0e276f' }}>{p.title}</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleAddQuestion(pIndex)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              backgroundColor: '#0e276f',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            ➕ Thêm câu
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleRemovePassage(pIndex)}
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
                            🗑 Xóa phần
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <input type="text" value={p.title} onChange={e => handlePassageChange(pIndex, 'title', e.target.value)} style={inputStyle} />
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label><b>Audio cho phần này:</b></label><br />
                        <input type="file" accept="audio/*" onChange={e => handlePassageAudioChange(pIndex, e.target.files[0])} />
                        {p.audioFile && (
                          <audio controls style={{ width: '100%', marginTop: '8px' }}>
                            <source src={URL.createObjectURL(p.audioFile)} />
                          </audio>
                        )}
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label><b>Hướng dẫn phần</b></label>
                        <textarea value={p.instruction} onChange={e => handlePassageChange(pIndex, 'instruction', e.target.value)} style={inputStyle} />
                      </div>

                      <ListeningPart
                        partNumber={pIndex + 1}
                        partType={p.partType}
                        questions={p.questions}
                        instruction={p.instruction}
                        onTypeChange={(newType) => handlePassageChange(pIndex, 'partType', newType)}
                        onInstructionChange={(content) => handlePassageChange(pIndex, 'instruction', content)}
                        onQuestionChange={(index, updatedQuestion) => handleReplaceQuestion(pIndex, index, updatedQuestion)}
                        onAddOption={(qIndex) => handleAddOptionToQuestion(pIndex, qIndex)}
                        onRemoveOption={(qIndex) => handleRemoveOptionFromQuestion(pIndex, qIndex)}
                        onRemoveQuestion={(qIndex) => handleRemoveQuestion(pIndex, qIndex)}
                        startFromNumber={startFrom}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
              ➕ Thêm phần (Passage)
            </button>

            <button
              type="button"
              onClick={handleUndo}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#f0ad4e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ⎌ Thu hồi
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
                cursor: 'pointer'
              }}
            >
              🔎 Xem lại & Tạo
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
              {passages.map((p, pIndex) => {
                const startFrom = passages.slice(0, pIndex).reduce((acc, cur) => acc + (cur.questions?.length || 0), 0) + 1;
                return (
                  <div key={pIndex}>
                    <h4>{p.title || `Part ${pIndex + 1}`}</h4>
                    <div>{p.instruction}</div>
                    <PreviewSection
                      part={pIndex + 1}
                      questions={p.questions}
                      startFromNumber={startFrom}
                      type={p.partType === 'fill' ? 'form' : p.partType}
                      audioFiles={p.audioFile || audioFile}
                    />
                  </div>
                );
              })}
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

        {isReviewing && (
          <div className="review-modal-overlay">
            <div className="review-modal">
              <div className="review-modal-header">
                <h3 style={{ margin: 0 }}>🔎 Xem lại đề Listening</h3>
                <button onClick={() => setIsReviewing(false)} style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              <div className="review-modal-body">
                <div style={{ marginBottom: '12px' }}>
                  <strong>Mã lớp:</strong> {classCode || '—'}<br />
                  <strong>Người ra đề:</strong> {teacherName || '—'}<br />
                  <strong>Audio chung:</strong> {audioFile ? audioFile.name : 'Không có'}<br />
                </div>

                {passages.map((p, pIndex) => {
                  const startFrom = passages.slice(0, pIndex).reduce((acc, cur) => acc + (cur.questions?.length || 0), 0) + 1;
                  return (
                    <div key={pIndex} style={{ marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                      <h4 style={{ margin: '6px 0' }}>{p.title || `Part ${pIndex + 1}`}</h4>
                      <div>{p.instruction}</div>
                      <PreviewSection
                        part={pIndex + 1}
                        questions={p.questions}
                        startFromNumber={startFrom}
                        type={p.partType === 'fill' ? 'form' : p.partType}
                        audioFiles={p.audioFile || audioFile}
                      />
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button onClick={() => setIsReviewing(false)} className="btn-secondary">Quay lại chỉnh sửa</button>

                  <button onClick={handleConfirmCreate} className="btn-primary" disabled={isCreating}>
                    {isCreating ? <span className="spinner" aria-hidden="true" /> : '✅'} Xác nhận & Tạo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateListeningTest;
