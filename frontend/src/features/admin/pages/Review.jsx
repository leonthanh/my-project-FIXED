// frontend/src/features/admin/pages/Review.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavbar } from '../../../shared/components';

const Review = () => {
  const [unreviewed, setUnreviewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnreviewed = async () => {
      try {
        const res = await fetch(`${API_URL}/api/writing/list`);
        const all = await res.json();

        // lọc bài chưa có nhận xét
        const filtered = all.filter(sub => !sub.feedback);
        setUnreviewed(filtered);
      } catch (err) {
        console.error('❌ Lỗi khi tải bài chưa chấm:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreviewed();
  }, [API_URL]);

  return (
    <>
      <AdminNavbar />
      <h3 style={{ marginTop: '20px' }}>📝 Danh sách bài chưa nhận xét</h3>

      {loading && <p>⏳ Đang tải dữ liệu...</p>}
      {!loading && unreviewed.length === 0 && <p>✅ Không có bài viết nào cần chấm.</p>}
      {!loading && unreviewed.length > 0 && (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          fontSize: '15px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={cellStyle}>#</th>
              <th style={cellStyle}>👤 Học sinh</th>
              <th style={cellStyle}>📞 SĐT</th>
              <th style={cellStyle}>🧾 Mã đề</th>
              <th style={cellStyle}>⏱ Thời gian nộp</th>
              <th style={cellStyle}>✏️</th>
            </tr>
          </thead>
          <tbody>
            {unreviewed.map((sub, idx) => {
              const writingTest = sub.writing_test || sub.WritingTest || {};
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>{sub.userName || sub.user?.name || 'N/A'}</td>
                  <td style={cellStyle}>{sub.userPhone || sub.user?.phone || 'N/A'}</td>
                  <td style={cellStyle}>
                    Writing {writingTest.index || 'N/A'}
                    {writingTest.classCode ? ` – ${writingTest.classCode}` : ''}
                    {writingTest.teacherName ? ` – ${writingTest.teacherName}` : ''}
                  </td>
                  <td style={cellStyle}>
                    {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => navigate(`/review/${sub.id}`)}
                      style={{
                        background: '#e03',
                        color: 'white',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Nhận xét
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
};

// CSS cho từng ô trong bảng
const cellStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left'
};

export default Review;
