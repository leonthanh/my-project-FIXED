import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SelectWritingTest = () => {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/writing-tests`)
      .then(res => res.json())
      .then(data => setTests(data))
      .catch(err => console.error('❌ Lỗi khi tải đề:', err));
  }, [API_URL]);

  const handleSelect = (id) => {
    const numericId = parseInt(id, 10); // ✅ Ép sang số
    if (!numericId || isNaN(numericId)) {
      console.error('❌ ID đề không hợp lệ:', id);
      return;
    }
    console.log('📌 Đã chọn đề:', numericId);
    localStorage.setItem('selectedTestId', numericId);
    navigate('/writing-test'); // ✅ Chuyển đến trang làm bài
  };

  return (
    <div style={{ padding: '50px' }}>
      <h2>📋 Chọn đề viết</h2>
      {tests.length === 0 && <p>⏳ Đang tải đề...</p>}
      {tests.map(test => (
        <div key={test.id} style={{ marginBottom: '20px' }}>
          <strong>
  📝 Writing {test.index} – {test.classCode || 'N/A'} – {test.teacherName || 'N/A'}
</strong>

          <button
            onClick={() => handleSelect(test.id)}
            style={{ marginLeft: '10px' }}
          >
            Làm bài
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectWritingTest;
