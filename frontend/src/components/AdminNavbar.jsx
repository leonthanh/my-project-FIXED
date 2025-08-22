import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;

  const [unreviewed, setUnreviewed] = useState([]);
  const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);
  const [createTestDropdownVisible, setCreateTestDropdownVisible] = useState(false);
  const notificationDropdownRef = useRef(null);
  const createTestDropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchUnreviewed = async () => {
      try {
        const res = await fetch(`${API_URL}/api/writing/list`);
        const all = await res.json();

        // ✅ Lọc bài chưa chấm (feedback null hoặc rỗng)
        const notReviewed = all.filter(sub => !sub.feedback || sub.feedback.trim() === '');
        setUnreviewed(notReviewed);
      } catch (err) {
        console.error('❌ Lỗi khi tải thông báo GV:', err);
      }
    };

    fetchUnreviewed();
    const interval = setInterval(fetchUnreviewed, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setNotificationDropdownVisible(false);
      }
      if (createTestDropdownRef.current && !createTestDropdownRef.current.contains(event.target)) {
        setCreateTestDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const linkStyle = {
    color: 'white',
    marginRight: '20px',
    textDecoration: 'none',
    fontWeight: 'bold',
  };

  return (
    <nav style={{
      padding: '12px 24px',
      background: '#0e276f',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
      <img src={`${API_URL}/uploads/staredu.jpg`} alt="Logo" style={{ height: 40, marginRight: 20 }} />
        <Link to="/admin" style={linkStyle}>📄 Bài viết</Link>
        <div style={{ display: 'inline-block', position: 'relative', marginRight: '20px' }}>
          <span 
            style={{ 
              ...linkStyle, 
              cursor: 'pointer',
              marginRight: '0'
            }} 
            onClick={() => setCreateTestDropdownVisible(prev => !prev)}
          >
            ✏️ Tạo đề ▼
          </span>
          {createTestDropdownVisible && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              minWidth: '150px'
            }}>
              <Link 
                to="/admin/create-writing" 
                style={{
                  display: 'block',
                  padding: '10px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  borderBottom: '1px solid #eee',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                ✍️ Writing
              </Link>
              <Link 
                to="/admin/create-listening" 
                style={{
                  display: 'block',
                  padding: '10px 15px',
                  color: '#333',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                🎧 Listening
              </Link>
            </div>
          )}
        </div>
        <Link to="/review" style={linkStyle}>📝 Nhận xét bài</Link>

        <div
          style={{
            position: 'relative',
            marginRight: '20px',
            cursor: 'pointer',
            fontSize: '20px',
            animation: unreviewed.length > 0 ? 'shake 0.5s infinite' : 'none'
          }}
          onClick={() => setNotificationDropdownVisible(!notificationDropdownVisible)}
          title="Bài chưa chấm"
        >
          🔔
          {unreviewed.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -6,
              right: -10,
              background: 'red',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {unreviewed.length}
            </span>
          )}
        </div>

        {notificationDropdownVisible && (
          <div
            ref={notificationDropdownRef}
            style={{
              position: 'absolute',
              top: '60px',
              right: '20px',
              background: 'white',
              color: 'black',
              border: '1px solid #ccc',
              borderRadius: 6,
              padding: 10,
              zIndex: 1000,
              width: 320,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {unreviewed.length === 0 ? (
              <div>✅ Không có bài chưa chấm</div>
            ) : (
              unreviewed.map((sub, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => {
                    setNotificationDropdownVisible(false);
                    navigate(`/review/${sub.id}`);
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  👤 {sub.User?.name || sub.userName || 'N/A'} - 📞 {sub.User?.phone || sub.userPhone || 'N/A'}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 👨‍🏫 Hiển thị tên giáo viên và nút logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 'bold' }}>👨‍🏫 {user?.name || 'Giáo viên'}</span>
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
          onMouseOver={e => e.currentTarget.style.background = '#c0392b'}
          onMouseOut={e => e.currentTarget.style.background = '#e03'}
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

export default AdminNavbar;
