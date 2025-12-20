import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, ConfirmModal, PreviewSection } from '../../../shared/components';
import { AudioPlayer } from '../components';

const DoListeningTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  
  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`${API}/api/listening-tests/${id}`);
        if (!res.ok) throw new Error('Failed to fetch test');
        const data = await res.json();
        setTest(data);
      } catch (err) {
        console.error('Error fetching test:', err);
        // Hiển thị thông báo lỗi cho người dùng
      }
    };
    fetchTest();
  }, [id, API]);

  const handleAnswerChange = (part, questionIndex, value) => {
    const key = `${part}_${questionIndex}`;
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateAnswers = () => {
    // Kiểm tra xem đã trả lời hết các câu hỏi chưa
    let unansweredQuestions = [];
    
    Object.entries(test.questions).forEach(([part, questions]) => {
      questions.forEach((_, index) => {
        const key = `${part}_${index}`;
        if (!answers[key]) {
          const questionNumber = part === 'part1' ? index + 1 :
                               part === 'part2' ? index + 11 :
                               part === 'part3' ? index + 21 : index + 31;
          unansweredQuestions.push(questionNumber);
        }
      });
    });

    return unansweredQuestions;
  };

  const handleSubmit = async () => {
    const unanswered = validateAnswers();
    if (unanswered.length > 0) {
      alert(`⚠️ Bạn chưa trả lời các câu: ${unanswered.join(', ')}`);
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      const res = await fetch(`${API}/api/listening-tests/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers })
      });

      if (!res.ok) throw new Error('Failed to submit test');
      
      const data = await res.json();
      setSubmitted(true);
      // Chuyển đến trang kết quả
      navigate(`/listening-results/${id}`, { 
        state: { score: data.score, answers: data.answers } 
      });
    } catch (err) {
      console.error('Error submitting test:', err);
      alert('❌ Có lỗi xảy ra khi nộp bài. Vui lòng thử lại!');
    } finally {
      setShowConfirm(false);
    }
  };

  if (!test) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.2rem'
    }}>
      ⏳ Đang tải đề thi...
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
      <div style={{ 
        position: 'sticky', 
        top: 0,
        backgroundColor: 'white',
        padding: '10px 0',
        zIndex: 100,
        borderBottom: '1px solid #eee'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0 }}>🎧 {test.title || 'Bài thi Listening'}</h2>
          <Timer 
            duration={40 * 60} // 40 minutes
            onTimeUp={() => {
              setTimeUp(true);
              handleSubmit();
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>📝 Hướng dẫn:</h3>
        <div dangerouslySetInnerHTML={{ __html: test.instructions }} />
      </div>

      <div className="test-sections">
        {/* Part 1 */}
        <PreviewSection
          part={1}
          questions={test.questions.part1}
          startFromNumber={1}
          type="form"
          audioFiles={test.audioFiles?.part1 || test.audioFile}
          audioStartTimes={test.audioStartTimes?.part1}
          onAnswerChange={(questionIndex, value) => 
            handleAnswerChange('part1', questionIndex, value)}
          answers={answers}
          isSubmitted={submitted}
        />

        {/* Part 2 */}
        <PreviewSection
          part={2}
          questions={test.questions.part2}
          startFromNumber={11}
          type="abc"
          audioFiles={test.audioFiles?.part2 || test.audioFile}
          audioStartTimes={test.audioStartTimes?.part2}
          onAnswerChange={(questionIndex, value) => 
            handleAnswerChange('part2', questionIndex, value)}
          answers={answers}
          isSubmitted={submitted}
        />

        {/* Part 3 */}
        <PreviewSection
          part={3}
          questions={test.questions.part3}
          startFromNumber={21}
          type="select"
          audioFiles={test.audioFiles?.part3 || test.audioFile}
          audioStartTimes={test.audioStartTimes?.part3}
          onAnswerChange={(questionIndex, value) => 
            handleAnswerChange('part3', questionIndex, value)}
          answers={answers}
          isSubmitted={submitted}
        />

        {/* Part 4 */}
        <PreviewSection
          part={4}
          questions={test.questions.part4}
          startFromNumber={31}
          type="abcd"
          audioFiles={test.audioFiles?.part4 || test.audioFile}
          audioStartTimes={test.audioStartTimes?.part4}
          onAnswerChange={(questionIndex, value) => 
            handleAnswerChange('part4', questionIndex, value)}
          answers={answers}
          isSubmitted={submitted}
        />
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
        padding: '20px 0',
        borderTop: '1px solid #eee',
        textAlign: 'center'
      }}>
        <button
          onClick={handleSubmit}
          disabled={submitted}
          style={{
            padding: '12px 30px',
            fontSize: '1.1rem',
            backgroundColor: submitted ? '#ccc' : '#0e276f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: submitted ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {submitted ? '✅ Đã nộp bài' : '📤 Nộp bài'}
        </button>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title={timeUp ? "⏰ Hết giờ làm bài!" : "Xác nhận nộp bài"}
        message={
          timeUp 
            ? "Đã hết thời gian làm bài. Bài làm của bạn sẽ được nộp tự động."
            : "Bạn có chắc chắn muốn nộp bài? Sau khi nộp bài bạn sẽ không thể chỉnh sửa."
        }
        type={timeUp ? "warning" : "info"}
        confirmText={timeUp ? "Nộp bài" : "Xác nhận"}
      />
    </div>
  );
};

export default DoListeningTest;
