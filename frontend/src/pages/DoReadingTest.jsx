import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import ConfirmModal from '../components/ConfirmModal';

const DoReadingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL;

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`${API}/api/reading-tests/${id}`);
        if (!res.ok) throw new Error('Failed to fetch test');
        const data = await res.json();
        setTest(data);
      } catch (err) {
        console.error('Error fetching reading test:', err);
      }
    };
    fetchTest();
  }, [id, API]);

  const handleAnswerChange = (qKey, value) => {
    setAnswers(prev => ({ ...prev, [qKey]: value }));
  };

  const validateAnswers = () => {
    if (!test) return [];
    const unanswered = [];
    let counter = 1;
    test.passages.forEach((p) => {
      p.questions.forEach((q) => {
        const key = `q_${counter}`;
        if (!answers[key] || answers[key].toString().trim() === '') unanswered.push(counter);
        counter += 1;
      });
    });
    return unanswered;
  };

  const handleSubmit = () => {
    const unanswered = validateAnswers();
    if (unanswered.length > 0) {
      alert(`Bạn chưa trả lời các câu: ${unanswered.join(', ')}`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      // POST answers to backend (endpoint should be implemented server-side)
      const res = await fetch(`${API}/api/reading-tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      setSubmitted(true);
      navigate(`/reading-results/${id}`, { state: { result: data } });
    } catch (err) {
      console.error('Error submitting reading test:', err);
      alert('Có lỗi khi nộp bài. Vui lòng thử lại.');
    } finally {
      setShowConfirm(false);
    }
  };

  if (!test) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      ⏳ Đang tải đề đọc...
    </div>
  );

  // render question input depending on type
  let globalIndex = 0;
  return (
    <div style={{ maxWidth: 1000, margin: '20px auto', padding: '0 20px' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', padding: '10px 0', zIndex: 100, borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>📖 {test.title || 'Reading Test'}</h2>
          <Timer duration={(test.durationMinutes || 60) * 60} onTimeUp={() => { setTimeUp(true); handleSubmit(); }} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>📝 Hướng dẫn</h4>
        <div dangerouslySetInnerHTML={{ __html: test.instructions || '' }} />
      </div>

      <div style={{ marginTop: 20 }}>
        {test.passages.map((p, pIndex) => (
          <div key={pIndex} style={{ marginBottom: 30 }}>
            <h3>Passage {pIndex + 1}: {p.passageTitle}</h3>
            <div className="p-3" dangerouslySetInnerHTML={{ __html: p.passageText }} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12 }} />

            <div style={{ marginTop: 12 }}>
              {p.questions.map((q, qIndex) => {
                globalIndex += 1;
                const key = `q_${globalIndex}`;
                return (
                  <div key={key} style={{ padding: 12, background: '#fff', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 10 }}>
                    <div style={{ fontWeight: 'bold', color: '#0e276f' }}>{globalIndex}. <span dangerouslySetInnerHTML={{ __html: q.questionText }} /></div>
                    {q.questionType === 'multiple-choice' && (
                      <div style={{ marginTop: 8 }}>
                        {q.options.map((opt, oi) => (
                          <label key={oi} style={{ display: 'block', marginBottom: 6 }}>
                            <input
                              type="radio"
                              name={key}
                              value={opt}
                              checked={answers[key] === opt}
                              onChange={(e) => handleAnswerChange(key, e.target.value)}
                            /> {' '}
                            <span dangerouslySetInnerHTML={{ __html: opt }} />
                          </label>
                        ))}
                      </div>
                    )}

                    {q.questionType === 'fill-in-the-blanks' && (
                      <div style={{ marginTop: 8 }}>
                        <input type="text" value={answers[key] || ''} onChange={(e) => handleAnswerChange(key, e.target.value)} style={{ width: '60%', padding: '8px' }} />
                      </div>
                    )}

                    {q.questionType === 'matching' && (
                      <div style={{ marginTop: 8 }}>
                        <select value={answers[key] || ''} onChange={(e) => handleAnswerChange(key, e.target.value)}>
                          <option value="">-- Chọn --</option>
                          {q.options.map((opt, oi) => (
                            <option value={opt} key={oi}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', padding: '18px 0', borderTop: '1px solid #eee', textAlign: 'center' }}>
        <button onClick={handleSubmit} disabled={submitted} style={{ padding: '12px 26px', backgroundColor: submitted ? '#ccc' : '#0e276f', color: 'white', border: 'none', borderRadius: 8, cursor: submitted ? 'not-allowed' : 'pointer' }}>{submitted ? 'Đã nộp' : 'Nộp bài'}</button>
      </div>

      <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmSubmit}
        title={timeUp ? '⏰ Hết giờ' : 'Xác nhận nộp bài'}
        message={timeUp ? 'Hết giờ, bài làm sẽ được nộp.' : 'Bạn có chắc muốn nộp bài? Sau khi nộp không thể sửa.'}
        type={timeUp ? 'warning' : 'info'} confirmText={timeUp ? 'Nộp bài' : 'Xác nhận'} />
    </div>
  );
};

export default DoReadingTest;
