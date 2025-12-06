
import React, { useEffect, useState } from 'react';
import AdminNavbar from '../components/AdminNavbar';

const AdminSubmissions = () => {
  const [data, setData] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [messages, setMessages] = useState({});
  const [aiLoading, setAiLoading] = useState({}); // ✅ Thêm AI loading state
  const [sendLoading, setSendLoading] = useState({}); // ✅ Thêm Send loading state
  const [hasSaved, setHasSaved] = useState({}); // ✅ Track nếu đã save feedback

  const API_URL = process.env.REACT_APP_API_URL;
  const teacher = JSON.parse(localStorage.getItem('user')); // 👈 lấy tên giáo viên

  useEffect(() => {
    fetch(`${API_URL}/api/writing/list`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error('Lỗi khi lấy dữ liệu:', err));
  }, [API_URL]);

  // ✅ Hàm gửi nhận xét
  const handleSendFeedback = async (submissionId) => {
    const feedback = feedbacks[submissionId];
    if (!feedback || !feedback.trim()) {
      alert('Vui lòng nhập nhận xét.');
      return;
    }

    setSendLoading(prev => ({ ...prev, [submissionId]: true })); // ✅ Bắt đầu loading

    try {
      const res = await fetch(`${API_URL}/api/writing/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          feedback,
          teacherName: teacher?.name || 'Giáo viên ẩn danh'
        })
      });

      const result = await res.json();
      setMessages(prev => ({ ...prev, [submissionId]: result.message }));

      // ✅ Cập nhật ngay feedback mới hiển thị
      const updated = data.map(item =>
        item.id === submissionId
          ? { ...item, feedback, feedbackBy: teacher?.name, feedbackAt: new Date().toISOString() }
          : item
      );
      setData(updated);

      // ✅ Clear input & disable nút
      setFeedbacks(prev => ({ ...prev, [submissionId]: '' }));
      setHasSaved(prev => ({ ...prev, [submissionId]: true }));
    } catch (err) {
      console.error(err);
      setMessages(prev => ({ ...prev, [submissionId]: '❌ Gửi nhận xét thất bại' }));
    } finally {
      setSendLoading(prev => ({ ...prev, [submissionId]: false })); // ✅ Kết thúc loading
    }
  };

  // 🤖 Hàm gọi AI để gợi ý nhận xét
  const handleAIComment = async (submission) => {
    setAiLoading(prev => ({ ...prev, [submission.id]: true })); // ✅ Bắt đầu loading

    try {
      const aiRes = await fetch(`${API_URL}/api/ai/generate-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task1: submission.task1,
          task2: submission.task2
        })
      });

      const aiData = await aiRes.json();
      if (aiData.suggestion) {
        setFeedbacks(prev => ({ ...prev, [submission.id]: aiData.suggestion }));
      } else {
        alert(aiData.error || '❌ AI không tạo được nhận xét.');
      }
    } catch (err) {
      console.error('❌ Lỗi AI:', err);
      alert('❌ Không thể kết nối AI.');
    } finally {
      setAiLoading(prev => ({ ...prev, [submission.id]: false })); // ✅ Kết thúc loading
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return 'Không xác định';
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: '30px' }}>
        <h2>📋 Danh sách bài viết đã nộp</h2>
        {data.length === 0 && <p>Chưa có bài nào được nộp.</p>}

        {data.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #ccc',
              padding: '20px',
              marginTop: '20px',
              borderRadius: 8,
              background: '#f9f9f9'
            }}
          >
            <p><strong>👤 Học sinh:</strong> {item.userName || 'N/A'}</p>
            <p><strong>📞 Số điện thoại:</strong> {item.userPhone || 'N/A'}</p>
            <p><strong>🧾 Mã đề:</strong> {item.WritingTest?.index ? `Writing ${item.WritingTest.index}` : 'Không rõ'}</p>
            <p><strong>🕒 Nộp lúc:</strong> {formatDateTime(item.createdAt)}</p>
            <p><strong>⏳ Thời gian còn lại:</strong> {item.timeLeft ? Math.floor(item.timeLeft / 60) : 0} phút</p>

            <h4>✍️ Task 1:</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{item.task1}</p>

            <h4>✍️ Task 2:</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{item.task2}</p>

            <div style={{ marginTop: 20 }}>
              {item.feedback && item.feedbackAt && item.feedbackBy && (
                <div style={{ background: '#e7f4e4', padding: 10, borderRadius: 6, marginBottom: 10 }}>
                  <p>
                    🟢 <strong>Đã nhận xét</strong> lúc {formatDateTime(item.feedbackAt)} bởi <strong>{item.feedbackBy}</strong>
                  </p>
                  <p style={{ whiteSpace: 'pre-line', marginTop: 6 }}>
                    <strong>📋 Nhận xét:</strong><br />{item.feedback}
                  </p>
                </div>
              )}

              <textarea
                placeholder="Nhận xét của giáo viên..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  marginBottom: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                value={feedbacks[item.id] || ''}
                onChange={e =>
                  setFeedbacks(prev => ({ ...prev, [item.id]: e.target.value }))
                }
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => handleSendFeedback(item.id)}
                  disabled={sendLoading[item.id] || hasSaved[item.id]} // ✅ Disable khi đang gửi hoặc đã gửi
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: (sendLoading[item.id] || hasSaved[item.id]) ? '#ccc' : '#0e276f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: (sendLoading[item.id] || hasSaved[item.id]) ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                    opacity: (sendLoading[item.id] || hasSaved[item.id]) ? 0.6 : 1
                  }}
                >
                  {sendLoading[item.id] ? '⏳ Đang gửi...' : hasSaved[item.id] ? '✅ Đã gửi' : '📤 Gửi nhận xét'}
                </button>
                <button
                  onClick={() => handleAIComment(item)}
                  disabled={aiLoading[item.id]} // ✅ Disable khi đang xử lý
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: aiLoading[item.id] ? '#ccc' : '#e03',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: aiLoading[item.id] ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                    opacity: aiLoading[item.id] ? 0.6 : 1
                  }}
                >
                  {aiLoading[item.id] ? '⏳ Đang nhận xét...' : '🤖 StarEdu AI gợi ý nhận xét'}
                </button>
              </div>

              {messages[item.id] && (
                <p style={{ marginTop: 5, color: '#28a745' }}>{messages[item.id]}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AdminSubmissions;
