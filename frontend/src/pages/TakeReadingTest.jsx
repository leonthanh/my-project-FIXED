import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import '../styles/take-test.css';

const TakeReadingTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL;

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/reading-tests/${testId}`);
      if (!response.ok) throw new Error('Không tìm thấy đề thi');
      
      const data = await response.json();
      setTest(data);
      
      // Initialize answers object
      const initialAnswers = {};
      data.passages.forEach((passage, pIndex) => {
        passage.questions.forEach((question, qIndex) => {
          initialAnswers[`${pIndex}_${qIndex}`] = '';
        });
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching test:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (passageIndex, questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [`${passageIndex}_${questionIndex}`]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Prepare submission data
      const submissionData = {
        testId,
        passages: test.passages.map((passage, pIndex) => ({
          passageIndex: pIndex,
          questions: passage.questions.map((question, qIndex) => ({
            questionNumber: question.questionNumber,
            questionText: question.questionText,
            studentAnswer: answers[`${pIndex}_${qIndex}`] || '',
            correctAnswer: question.correctAnswer,
            questionType: question.questionType,
            isCorrect: checkAnswer(question, answers[`${pIndex}_${qIndex}`])
          }))
        }))
      };

      const response = await fetch(`${API}/api/reading-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi nộp bài');
      }

      // Calculate score
      let correctCount = 0;
      submissionData.passages.forEach(passage => {
        passage.questions.forEach(q => {
          if (q.isCorrect) correctCount++;
        });
      });
      
      const totalQuestions = submissionData.passages.reduce(
        (sum, p) => sum + p.questions.length,
        0
      );
      const score = Math.round((correctCount / totalQuestions) * 100);

      setResults({
        submissionId: data.submissionId,
        correctCount,
        totalQuestions,
        score,
        details: submissionData.passages
      });
      setSubmitted(true);
      setMessage('✅ Nộp bài thành công!');
    } catch (error) {
      console.error('Error submitting test:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = (question, studentAnswer) => {
    if (!studentAnswer || !question.correctAnswer) return false;
    
    const normalize = (str) => str.trim().toLowerCase();
    
    switch (question.questionType) {
      case 'multiple-choice':
        return normalize(studentAnswer) === normalize(question.correctAnswer);
      case 'fill-in-the-blanks':
        // Check if student answer is in correct answers (can have multiple)
        const correctAnswers = question.correctAnswer.split('|').map(a => normalize(a));
        return correctAnswers.includes(normalize(studentAnswer));
      case 'multi-select':
        // For multi-select, check if all selected answers are correct
        const studentAnswers = studentAnswer.split(',').map(a => normalize(a.trim()));
        const correctMultiAnswers = question.correctAnswer.split(',').map(a => normalize(a.trim()));
        return studentAnswers.every(ans => correctMultiAnswers.includes(ans));
      case 'matching':
        // For matching, compare the answer sets
        return normalize(studentAnswer) === normalize(question.correctAnswer);
      default:
        return false;
    }
  };

  if (loading && !test) {
    return (
      <>
        <StudentNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <p>⏳ Đang tải đề thi...</p>
        </div>
      </>
    );
  }

  if (!test) {
    return (
      <>
        <StudentNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <p style={{ color: 'red' }}>{message || '❌ Không tìm thấy đề thi'}</p>
        </div>
      </>
    );
  }

  if (submitted && results) {
    return (
      <>
        <StudentNavbar />
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
          <div style={{
            backgroundColor: '#f0f8ff',
            border: '2px solid #0e276f',
            borderRadius: '8px',
            padding: '30px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <h2>📊 Kết Quả Bài Làm</h2>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#0e276f', margin: '20px 0' }}>
              {results.score}%
            </div>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>
              <strong>{results.correctCount}/{results.totalQuestions}</strong> câu đúng
            </p>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Submission ID: {results.submissionId}
            </p>
          </div>

          <h3>Chi tiết đáp án:</h3>
          {results.details.map((passage, pIndex) => (
            <div key={pIndex} style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#0e276f' }}>
                {test.passages[pIndex].passageTitle || `Passage ${pIndex + 1}`}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead style={{ backgroundColor: '#0e276f', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Câu</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Đáp án của bạn</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Đáp án đúng</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {passage.questions.map((q, qIndex) => (
                    <tr key={qIndex} style={{
                      backgroundColor: q.isCorrect ? '#e6ffe6' : '#ffe6e6'
                    }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{q.questionNumber}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{q.studentAnswer || '—'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{q.correctAnswer}</td>
                      <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 'bold' }}>
                        {q.isCorrect ? '✅' : '❌'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              onClick={() => navigate('/student-dashboard')}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              ← Quay lại Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  const currentPassage = test.passages[currentPassageIndex];

  return (
    <>
      <StudentNavbar />
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left side: Passage */}
          <div>
            <h3 style={{ color: '#0e276f' }}>
              {currentPassage.passageTitle || `Passage ${currentPassageIndex + 1}`}
            </h3>
            <div style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              maxHeight: '600px',
              overflowY: 'auto',
              lineHeight: '1.8'
            }} dangerouslySetInnerHTML={{ __html: currentPassage.passageText }} />

            {/* Passage Navigation */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setCurrentPassageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentPassageIndex === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: currentPassageIndex === 0 ? '#ccc' : '#0e276f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPassageIndex === 0 ? 'default' : 'pointer'
                }}
              >
                ← Trước
              </button>
              <span style={{ padding: '10px', fontWeight: 'bold' }}>
                Passage {currentPassageIndex + 1}/{test.passages.length}
              </span>
              <button
                onClick={() => setCurrentPassageIndex(prev => Math.min(test.passages.length - 1, prev + 1))}
                disabled={currentPassageIndex === test.passages.length - 1}
                style={{
                  padding: '10px 16px',
                  backgroundColor: currentPassageIndex === test.passages.length - 1 ? '#ccc' : '#0e276f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPassageIndex === test.passages.length - 1 ? 'default' : 'pointer'
                }}
              >
                Tiếp →
              </button>
            </div>
          </div>

          {/* Right side: Questions */}
          <div>
            <h3 style={{ color: '#0e276f' }}>Câu hỏi</h3>
            <div style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {currentPassage.questions.map((question, qIndex) => (
                <div key={qIndex} style={{
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: qIndex < currentPassage.questions.length - 1 ? '1px solid #ddd' : 'none'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    Q{question.questionNumber}: {question.questionText}
                  </p>

                  {question.questionType === 'multiple-choice' && (
                    <div>
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} style={{ display: 'block', marginBottom: '8px' }}>
                          <input
                            type="radio"
                            name={`q_${currentPassageIndex}_${qIndex}`}
                            value={option}
                            checked={answers[`${currentPassageIndex}_${qIndex}`] === option}
                            onChange={(e) => handleAnswerChange(currentPassageIndex, qIndex, e.target.value)}
                            style={{ marginRight: '8px' }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.questionType === 'fill-in-the-blanks' && (
                    <input
                      type="text"
                      value={answers[`${currentPassageIndex}_${qIndex}`] || ''}
                      onChange={(e) => handleAnswerChange(currentPassageIndex, qIndex, e.target.value)}
                      placeholder="Nhập đáp án"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    />
                  )}

                  {question.questionType === 'multi-select' && (
                    <div>
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} style={{ display: 'block', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            value={option}
                            checked={(answers[`${currentPassageIndex}_${qIndex}`] || '').includes(option)}
                            onChange={(e) => {
                              const current = answers[`${currentPassageIndex}_${qIndex}`] || '';
                              let newAnswer;
                              if (e.target.checked) {
                                newAnswer = current ? `${current}, ${option}` : option;
                              } else {
                                newAnswer = current.split(',').map(a => a.trim()).filter(a => a !== option).join(', ');
                              }
                              handleAnswerChange(currentPassageIndex, qIndex, newAnswer);
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.questionType === 'matching' && (
                    <select
                      value={answers[`${currentPassageIndex}_${qIndex}`] || ''}
                      onChange={(e) => handleAnswerChange(currentPassageIndex, qIndex, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Chọn đáp án --</option>
                      {question.options && question.options.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '30px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 30px',
              fontSize: '18px',
              backgroundColor: '#0b8e3a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'default' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Đang xử lý...' : '✅ Nộp bài'}
          </button>
        </div>

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
      </div>
    </>
  );
};

export default TakeReadingTest;
