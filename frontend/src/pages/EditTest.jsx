import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import FormQuestion from '../components/FormQuestion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// import ReactQuill from 'react-quill'; // Thay thế CKEditor bằng ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import CSS cho ReactQuill

const EditTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;

  // Kiểm tra quyền truy cập
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'teacher') {
      navigate('/');
      return;
    }
  }, [navigate]);

  // Lấy thông tin đề thi
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`${API_URL}/api/writing-tests/${id}`);
        if (!response.ok) {
          throw new Error('Không tìm thấy đề thi');
        }
        const data = await response.json();
        setTest(data);
      } catch (error) {
        console.error('❌ Lỗi khi lấy thông tin đề:', error);
        alert('Không thể tải thông tin đề thi. Vui lòng thử lại sau.');
        navigate('/select-test');
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, API_URL, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Submitting test data:', test);

      const response = await fetch(`${API_URL}/api/writing-tests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classCode: test.classCode,
          teacherName: test.teacherName,
          task1: test.task1,
          task2: test.task2,
          questions: test.questions
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi khi cập nhật đề thi');
      }

      alert('✅ Cập nhật đề thi thành công!');
      navigate('/select-test');
    } catch (error) {
      console.error('❌ Lỗi:', error);
      alert('Có lỗi xảy ra khi cập nhật đề thi. Vui lòng thử lại.');
    }
  };

  const handleQuestionChange = (index, updatedQuestion) => {
    setTest(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q, i) => 
          i === index ? updatedQuestion : q
        )
      };
    });
  };

  if (loading) {
    return <div>⏳ Đang tải...</div>;
  }

  if (!test) {
    return <div>❌ Không tìm thấy đề thi</div>;
  }

  return (
    <>
      <AdminNavbar />
      <div style={{
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h2>✏️ Sửa đề thi Writing {test.index}</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Mã lớp:
            </label>
            <input
              type="text"
              value={test.classCode || ''}
              onChange={(e) => {
                const updatedTest = { ...test, classCode: e.target.value };
                console.log('Updated test:', updatedTest);
                setTest(updatedTest);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Giáo viên:
            </label>
            <input
              type="text"
              value={test.teacherName || ''}
              onChange={(e) => {
                const updatedTest = { ...test, teacherName: e.target.value };
                console.log('Updated test:', updatedTest);
                setTest(updatedTest);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Task 1:
            </label>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
              <ReactQuill
                value={test.task1 || ''}
                onChange={(content) => setTest(prev => ({ ...prev, task1: content }))}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
                style={{ height: '200px', marginBottom: '40px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Task 2:
            </label>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
              <ReactQuill
                value={test.task2 || ''}
                onChange={(content) => setTest(prev => ({ ...prev, task2: content }))}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
                style={{ height: '200px', marginBottom: '40px' }}
              />
            </div>
          </div>

          <h3>Câu hỏi:</h3>
          {test.questions && test.questions.map((question, index) => (
            <div key={index} style={{ marginBottom: '30px' }}>
              <h4>Câu {index + 1}</h4>
              <FormQuestion
                question={question}
                onChange={(updatedQuestion) => handleQuestionChange(index, updatedQuestion)}
              />
            </div>
          ))}

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                padding: '10px 30px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              💾 Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditTest;
