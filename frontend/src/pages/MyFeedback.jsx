import React, { useEffect, useState } from 'react';
import StudentNavbar from '../components/StudentNavbar';

const MyFeedback = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔍 Thêm state cho tìm kiếm
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchFeedbackBy, setSearchFeedbackBy] = useState("");
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);

  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/writing/list`);
        const allSubs = await res.json();

        // ✅ Lọc bài của học sinh đang đăng nhập
        const userSubs = allSubs.filter(sub =>
          sub.User?.phone === user.phone || sub.userPhone === user.phone
        );

        // ✅ Lấy ID các bài có feedback nhưng chưa xem
        const unseenIds = userSubs
          .filter(sub => sub.feedback && !sub.feedbackSeen)
          .map(sub => sub.id);

        if (unseenIds.length > 0) {
          await fetch(`${API_URL}/api/writing/mark-feedback-seen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unseenIds })
          });

          // 🔹 Cập nhật localStorage để StudentNavbar cũng thấy thay đổi
          const updatedUser = { ...user, lastFeedbackCheck: new Date().toISOString() };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // 🔹 Thông báo cho StudentNavbar cập nhật số chuông ngay lập tức
            window.dispatchEvent(new Event('feedbackSeen'));
        }

        // ✅ Cập nhật state để hiển thị
        const updatedSubs = userSubs.map(sub =>
          unseenIds.includes(sub.id) ? { ...sub, feedbackSeen: true } : sub
        );
        setSubmissions(updatedSubs);

      } catch (err) {
        console.error('❌ Lỗi khi tải bài viết:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, API_URL]);

  // 🔍 Hàm lọc dữ liệu khi tìm kiếm thay đổi
  useEffect(() => {
    let filtered = submissions;

    if (searchClassCode.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.classCode
          ?.toLowerCase()
          .includes(searchClassCode.toLowerCase())
      );
    }

    if (searchTeacher.trim()) {
      filtered = filtered.filter((item) =>
        item.WritingTest?.teacherName
          ?.toLowerCase()
          .includes(searchTeacher.toLowerCase())
      );
    }

    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  }, [searchClassCode, searchTeacher, searchFeedbackBy, submissions]);

  if (!user) return <p style={{ padding: 40 }}>❌ Bạn chưa đăng nhập.</p>;

  return (
    <>
      <StudentNavbar />
      <div style={{ padding: '30px' }}>
        <h2>📝 Bài viết & Nhận xét</h2>

        {/* 🔍 Form tìm kiếm */}
        <div
          style={{
            background: "#f0f0f0",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: "15px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              🧾 Mã lớp:
            </label>
            <input
              type="text"
              placeholder="Nhập mã lớp"
              value={searchClassCode}
              onChange={(e) => setSearchClassCode(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              👨‍🏫 Giáo viên đề:
            </label>
            <input
              type="text"
              placeholder="Nhập tên giáo viên"
              value={searchTeacher}
              onChange={(e) => setSearchTeacher(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              ✍️ Giáo viên chấm:
            </label>
            <input
              type="text"
              placeholder="Nhập tên giáo viên chấm"
              value={searchFeedbackBy}
              onChange={(e) => setSearchFeedbackBy(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={() => {
              setSearchClassCode("");
              setSearchTeacher("");
              setSearchFeedbackBy("");
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            🔄 Reset
          </button>
        </div>

        {/* Hiển thị kết quả */}
        <p style={{ color: "#666", marginBottom: "15px" }}>
          📊 Tổng cộng: <strong>{filteredSubmissions.length}</strong> bài viết
          {(searchClassCode || searchTeacher || searchFeedbackBy) && ` (lọc từ ${submissions.length})`}
        </p>

        {filteredSubmissions.length === 0 && !loading && (
          <p style={{ color: "#d32f2f", fontWeight: "bold" }}>
            ❌ Không tìm thấy bài viết phù hợp.
          </p>
        )}
        {loading && <p>⏳ Đang tải dữ liệu...</p>}
        {!loading && submissions.length === 0 && <p>🙁 Bạn chưa nộp bài viết nào.</p>}

        {filteredSubmissions.map((sub, idx) => (
          <div
            key={sub.id || idx}
            style={{
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '20px',
              marginBottom: '20px',
              backgroundColor: '#f9f9f9'
            }}
          >
            <p>
              <strong>📋 Mã đề:</strong> Writing {sub.WritingTest?.index || '?'} – {sub.WritingTest?.classCode || '(Không xác định)'} – {sub.WritingTest?.teacherName || '(Không xác định)'}
            </p>
            <p>
              <strong>⏰ Nộp lúc:</strong>{' '}
              {new Date(sub.submittedAt || sub.createdAt).toLocaleString('vi-VN')}
            </p>
            <p><strong>⏳ Thời gian còn lại:</strong> {Math.floor(sub.timeLeft / 60)} phút</p>

            {/* ✅ Hiển thị ảnh đề thi nếu có */}
            {sub.WritingTest?.task1Image && (
              <div style={{ marginBottom: 10 }}>
                <img
                  src={`${API_URL}${sub.WritingTest.task1Image}`}
                  alt="Task 1"
                  style={{ maxWidth: '80%', borderRadius: 6 }}
                />
              </div>
            )}

            <h4>✍️ Bài làm Task 1:</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{sub.task1}</p>

            <h4>✍️ Bài làm Task 2:</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{sub.task2}</p>

            <h4 style={{ marginTop: 20 }}>📩 Nhận xét từ giáo viên: <span style={{ color: '#0e276f', fontWeight: 'bold' }}>{sub.feedbackBy || 'Không xác định'}</span></h4>
            {sub.feedback ? (
              <div style={{ background: '#e7f4e4', padding: 10, borderRadius: 6 }}>
                <p style={{ marginBottom: 8, whiteSpace: 'pre-line' }}>{sub.feedback}</p>
                <p style={{ fontSize: '14px', color: '#555' }}>
                  � <strong>Thời gian nhận xét:</strong>{' '}
                  {sub.feedbackAt ? new Date(sub.feedbackAt).toLocaleString('vi-VN') : 'Không rõ'}
                </p>
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#999' }}>Chưa có nhận xét nào.</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default MyFeedback;
