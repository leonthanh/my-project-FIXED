import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StudentNavbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;

  const [feedbackCount, setFeedbackCount] = useState(0);
  const [newTestCount, setNewTestCount] = useState(0);

  // Lấy thông tin user từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('❌ Lỗi parse user:', e);
        localStorage.removeItem('user');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.phone) return;

    try {
      const [testsRes, submissionsRes] = await Promise.all([
        fetch(`${API_URL}/api/writing-tests`).then(res => res.json()),
        fetch(`${API_URL}/api/writing/list`).then(res => res.json())
      ]);

      const mySubs = submissionsRes.filter(sub => sub.userPhone === user.phone);
      
      // ✅ Đã sửa: Khai báo unseenFeedbacks trước khi sử dụng
      const unseenFeedbacks = mySubs.filter(sub => sub.feedback && !sub.feedbackSeen);

      console.log('📋 Tổng số bài có feedback chưa xem:', unseenFeedbacks.length);
      console.log('📋 Danh sách bài chưa xem:', unseenFeedbacks);


      const submittedTestIds = mySubs.map(sub => String(sub.testId)).filter(Boolean);
      const unsubmittedTests = testsRes.filter(test => !submittedTestIds.includes(String(test.id)));

      setFeedbackCount(unseenFeedbacks.length);
      setNewTestCount(unsubmittedTests.length);

    } catch (err) {
      console.error('❌ Lỗi khi tải thông báo:', err);
    }
  }, [API_URL, user]); // Giữ nguyên dependencies của useCallback

  useEffect(() => {
    if (user?.phone) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // 🔹 Lắng nghe sự kiện từ MyFeedback để cập nhật số chuông
  useEffect(() => {
    const handleFeedbackSeen = () => {
      fetchNotifications(); // ✅ Đồng bộ lại số thông báo
    };
    window.addEventListener('feedbackSeen', handleFeedbackSeen);
    return () => {
      window.removeEventListener('feedbackSeen', handleFeedbackSeen);
    };
  }, [fetchNotifications]);

  // 🔹 Kiểm tra định kỳ sự thay đổi trong localStorage
  useEffect(() => {
    const interval = setInterval(() => {
        console.log('🔄 Đang kiểm tra localStorage');
      const updatedUser = JSON.parse(localStorage.getItem('user'));
      if (updatedUser?.lastFeedbackCheck !== user?.lastFeedbackCheck) {
        setUser(updatedUser);
        fetchNotifications();
      }
    }, 3000); // kiểm tra mỗi 3 giây

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markFeedbackAsSeen = async () => {
    try {
      const res = await fetch(`${API_URL}/api/writing/list`);
      const allSubs = await res.json();
      const mySubs = allSubs.filter(sub => sub.userPhone === user.phone && sub.feedback && !sub.feedbackSeen);
      const unseenIds = mySubs.map(sub => sub.id);

      if (unseenIds.length > 0) {
        await fetch(`${API_URL}/api/writing/mark-feedback-seen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unseenIds })
        });
      }
      setFeedbackCount(0);
    } catch (err) {
      console.error('❌ Lỗi khi đánh dấu đã xem nhận xét:', err);
    }
  };

  const handleNotificationClick = async () => {
    try {
      await markFeedbackAsSeen();
      await fetchNotifications();
      navigate('/my-feedback');
    } catch (err) {
      console.error('❌ Lỗi khi xử lý thông báo:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  const navLinkStyle = {
    color: 'white',
    marginRight: '20px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
  };

  const totalNotifications = feedbackCount + newTestCount;

  return (
    <nav style={{
      padding: '12px 24px',
      background: '#0e276f',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src={`${API_URL}/uploads/staredu.jpg`} alt="Logo" style={{ height: 40, marginRight: 20 }} />
        <Link to="/select-test" style={navLinkStyle}>📝 Chọn đề</Link>
        <Link to="/my-feedback" style={navLinkStyle}>📄 Xem Nhận xét</Link>

        <div
          style={{
            position: 'relative',
            marginRight: '20px',
            cursor: 'pointer',
            fontSize: '20px',
            animation: totalNotifications > 0 ? 'shake 0.5s infinite' : 'none',
          }}
          onClick={handleNotificationClick}
          title="Thông báo mới"
        >
          🔔
          {totalNotifications > 0 && (
            <span style={{
              position: 'absolute',
              top: -6,
              right: -10,
              background: 'red',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 1 // Thêm zIndex để đảm bảo thông báo luôn nằm trên
            }}>
              {totalNotifications}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: 16 }}>👤 {user.name}</span>
        <button
          onClick={handleLogout}
          style={{
            background: '#e03',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.3s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#c0392b')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#e03')}
        >
          🔓 Đăng xuất
        </button>
      </div>

      <style>
        {`
          @keyframes shake {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(10deg); }
            50% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
            100% { transform: rotate(0deg); }
          }
        `}
      </style>
    </nav>
  );
};

export default StudentNavbar;