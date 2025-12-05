import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/do-reading-test.css'; // Import styles for 2-column layout

const DoReadingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL;

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0); // Track current part/passage

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

  // For multi-select questions, manage array of answers
  const handleMultiSelectChange = (qKey, value, isChecked) => {
    setAnswers(prev => {
      const current = prev[qKey] ? prev[qKey].split(',').filter(Boolean) : [];
      if (isChecked) {
        return { ...prev, [qKey]: [...current, value].sort().join(',') };
      } else {
        return { ...prev, [qKey]: current.filter(v => v !== value).join(',') };
      }
    });
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

  const currentPassage = test.passages[currentPartIndex];
  let globalQuestionIndex = 0;
  // Calculate question index start for current passage
  for (let i = 0; i < currentPartIndex; i++) {
    globalQuestionIndex += test.passages[i].questions.length;
  }
  const startQuestionNumber = globalQuestionIndex + 1;

  return (
    <div className="reading-test-container">
      {/* Header with Timer */}
      <div className="reading-test-header">
        <div className="header-left">
          <h2 style={{ margin: 0 }}>📖 {test.title || 'Reading Test'}</h2>
        </div>
        <div className="header-right">
          <Timer 
            duration={(test.durationMinutes || 60) * 60} 
            onTimeUp={() => { setTimeUp(true); handleSubmit(); }} 
          />
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div className="reading-test-main">
        {/* Left column: Passage */}
        <div className="reading-passage-column">
          <div className="passage-header">
            <h3>PART {currentPartIndex + 1}</h3>
            {currentPassage.passageTitle && <p className="passage-title">{currentPassage.passageTitle}</p>}
          </div>
          <div className="passage-text" dangerouslySetInnerHTML={{ __html: currentPassage.passageText }} />
          
          {/* Part navigation */}
          <div className="part-navigation">
            <button 
              disabled={currentPartIndex === 0}
              onClick={() => setCurrentPartIndex(p => p - 1)}
              style={{ cursor: currentPartIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              ← Previous
            </button>
            <span>{currentPartIndex + 1} / {test.passages.length}</span>
            <button 
              disabled={currentPartIndex === test.passages.length - 1}
              onClick={() => setCurrentPartIndex(p => p + 1)}
              style={{ cursor: currentPartIndex === test.passages.length - 1 ? 'not-allowed' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right column: Questions */}
        <div className="reading-questions-column">
          <div className="questions-header">
            <h4>Questions {startQuestionNumber}–{startQuestionNumber + currentPassage.questions.length - 1}</h4>
          </div>
          
          <div className="questions-list">
            {currentPassage.questions.map((q, qIndex) => {
              const questionNumber = startQuestionNumber + qIndex;
              const key = `q_${questionNumber}`;
              
              return (
                <div key={key} className="question-item">
                  <div className="question-number">
                    {questionNumber}.
                  </div>
                  <div className="question-content">
                    <div className="question-text" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                    
                    {/* Multiple Choice (Radio) */}
                    {q.questionType === 'multiple-choice' && (
                      <div className="question-options">
                        {q.options && q.options.map((opt, oi) => (
                          <label key={oi} className="option-label">
                            <input
                              type="radio"
                              name={key}
                              value={opt}
                              checked={answers[key] === opt}
                              onChange={(e) => handleAnswerChange(key, e.target.value)}
                              className="option-input"
                            />
                            <span className="option-text" dangerouslySetInnerHTML={{ __html: opt }} />
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Multi-Select (Checkboxes) */}
                    {q.questionType === 'multi-select' && (
                      <div className="question-options">
                        <p className="multi-select-hint">Choose {q.maxSelection || 2}+ letters</p>
                        {q.options && q.options.map((opt, oi) => {
                          const currentAnswers = answers[key] ? answers[key].split(',').filter(Boolean) : [];
                          const isChecked = currentAnswers.includes(opt);
                          return (
                            <label key={oi} className="option-label">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleMultiSelectChange(key, opt, e.target.checked)}
                                className="option-input"
                              />
                              <span className="option-text" dangerouslySetInnerHTML={{ __html: opt }} />
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill in the Blanks */}
                    {q.questionType === 'fill-in-the-blanks' && (
                      <div className="question-fill">
                        <input
                          type="text"
                          className="fill-input"
                          value={answers[key] || ''}
                          onChange={(e) => handleAnswerChange(key, e.target.value)}
                          placeholder={q.maxWords ? `No more than ${q.maxWords} words` : 'Type your answer'}
                        />
                        {q.maxWords && <p className="fill-hint">Max {q.maxWords} words</p>}
                      </div>
                    )}

                    {/* Matching / Combobox */}
                    {q.questionType === 'matching' && (
                      <div className="question-matching">
                        <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                          <p style={{ marginBottom: '10px', fontWeight: '600', color: '#0e276f' }}>
                            Left Items:
                          </p>
                          {q.leftItems && q.leftItems.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', minWidth: '30px' }}>
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <span style={{ flex: 1 }}>{item}</span>
                              <select
                                className="matching-select"
                                value={answers[key] && answers[key].split(',')[idx] ? answers[key].split(',')[idx] : ''}
                                onChange={(e) => {
                                  const currentAnswers = answers[key] ? answers[key].split(',') : new Array(q.leftItems.length).fill('');
                                  currentAnswers[idx] = e.target.value;
                                  handleAnswerChange(key, currentAnswers.join(','));
                                }}
                              >
                                <option value="">Choose...</option>
                                {q.rightItems && q.rightItems.map((_, ri) => (
                                  <option key={ri} value={String(ri + 1)}>
                                    {ri + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                            <p style={{ marginBottom: '10px', fontWeight: '600', color: '#0e276f' }}>
                              Right Items:
                            </p>
                            {q.rightItems && q.rightItems.map((item, idx) => (
                              <div key={idx} style={{ marginBottom: '6px', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{idx + 1}.</span> {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer with Submit button */}
      <div className="reading-test-footer">
        <button 
          onClick={handleSubmit} 
          disabled={submitted}
          className="submit-button"
        >
          {submitted ? '✓ Đã nộp' : '→ Nộp bài'}
        </button>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal 
        isOpen={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        onConfirm={confirmSubmit}
        title={timeUp ? '⏰ Hết giờ' : 'Xác nhận nộp bài'}
        message={timeUp ? 'Hết giờ, bài làm sẽ được nộp.' : 'Bạn có chắc muốn nộp bài? Sau khi nộp không thể sửa.'}
        type={timeUp ? 'warning' : 'info'} 
        confirmText={timeUp ? 'Nộp bài' : 'Xác nhận'} 
      />
    </div>
  );
};

export default DoReadingTest;
