import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';

const SelectTest = () => {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/writing-tests`)
      .then(res => res.json())
      .then(data => setTests(data))
      .catch(err => {
        console.error('❌ Lỗi khi tải đề:', err);
        setTests([]);
      });
  }, [API_URL]);

  const handleSelect = (testId) => {
    const numericId = parseInt(testId, 10); // ✅ Ép sang số
    if (!numericId || isNaN(numericId)) {
      console.error('❌ Test ID không hợp lệ:', testId);
      return;
    }
    console.log('📌 Đã chọn đề:', numericId);
    localStorage.setItem('selectedTestId', numericId);
    navigate('/writing-test');
  };

  return (
    <>
      <StudentNavbar />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '50px 20px',
        fontFamily: 'sans-serif',
        backgroundColor: '#f4f8ff',
        minHeight: '100vh'
      }}>
        <div style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          padding: '30px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <img src={`${API_URL}/uploads/staredu.jpg`} alt="StarEdu" style={{ height: 60, marginBottom: 10 }} />
            <h2 style={{ margin: 0 }}>📋 IX Writing</h2>
          </div>

          {tests.length === 0 ? (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>⏳ Đang tải đề...</p>
          ) : (
            tests.map((test, index) => (
              <div key={test.id} style={{
                border: '1px solid #eee',
                padding: '10px',
                borderRadius: '10px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
              }}>
                <button
                  onClick={() => handleSelect(test.id)}
                  style={{
                    backgroundColor: '#0e276f',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    width: '100%'
                  }}
                >
                  <h3 style={{ margin: '0px' }}>
  📝 Writing {test.index || index + 1} – {test.classCode || 'N/A'} – {test.teacherName || 'N/A'}
</h3>

                </button>
              </div>
            ))
          )}

          <button
            onClick={() => window.location.href = '/my-feedback'}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#e03',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📄 Xem nhận xét
          </button>
        </div>
      </div>
    </>
  );
};

export default SelectTest;
