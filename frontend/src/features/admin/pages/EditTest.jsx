import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminNavbar, FormQuestion } from "../../../shared/components";
import ReactQuill from "react-quill";
import { apiPath, authFetch } from "../../../shared/utils/api";
import "react-quill/dist/quill.snow.css";
// import ReactQuill from 'react-quill'; // Thay thế CKEditor bằng ReactQuill
import "react-quill/dist/quill.snow.css"; // Import CSS cho ReactQuill

// 🎨 Thêm CSS tùy chỉnh cho ReactQuill - nền xám nhạt để dễ nhìn
const quillStyles = `
  .ql-container {
    font-size: 16px;
  }
  .ql-editor {
    background-color: #f8f8f8 !important;
    color: #000 !important;
    caret-color: #000 !important;
    cursor: text !important;
    min-height: 200px;
    border-radius: 4px;
  }
  .ql-editor:focus {
    background-color: #f5f5f5 !important;
    box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
  }
  .ql-editor.ql-blank::before {
    color: #999;
    font-style: italic;
  }
  .ql-toolbar {
    background-color: #fff !important;
    border: 1px solid #ddd !important;
    border-radius: 4px 4px 0 0;
  }
  .ql-toolbar.ql-snow {
    padding: 8px;
  }
`;

// Thêm style vào head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = quillStyles;
  document.head.appendChild(style);
}

const EditTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch (err) {
      localStorage.removeItem("user");
      user = null;
    }
    if (!user || user.role !== "teacher") {
      navigate("/");
      return;
    }
  }, [navigate]);

  // Lấy thông tin đề thi
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(apiPath(`writing-tests/${id}`));
        if (!response.ok) {
          throw new Error("Không tìm thấy đề thi");
        }
        const data = await response.json();
        setTest(data);
      } catch (error) {
        console.error("❌ Lỗi khi lấy thông tin đề:", error);
        alert("Không thể tải thông tin đề thi. Vui lòng thử lại sau.");
        navigate("/select-test");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, navigate]);

  const saveDraft = () => {
    try {
      const payload = { classCode: test.classCode, teacherName: test.teacherName, task1: test.task1, task2: test.task2, questions: test.questions };
      localStorage.setItem(`writingTestDraftEdit-${id}`, JSON.stringify(payload));
    } catch (e) { console.error('Error saving writing edit draft', e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await authFetch(apiPath(`writing-tests/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classCode: test.classCode,
          teacherName: test.teacherName,
          task1: test.task1,
          task2: test.task2,
          questions: test.questions,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          try { saveDraft(); } catch (e) {}
          alert('❌ Token đã hết hạn hoặc không hợp lệ. Bản nháp đã được lưu. Vui lòng đăng nhập lại.');
          localStorage.setItem('postLoginRedirect', window.location.pathname);
          window.location.href = '/login';
          return;
        }
        throw new Error(data.message || "Lỗi khi cập nhật đề thi");
      }

      alert("✅ Cập nhật đề thi thành công!");
      navigate("/select-test");
    } catch (error) {
      console.error("❌ Lỗi:", error);
      alert("Có lỗi xảy ra khi cập nhật đề thi. Vui lòng thử lại.");
    }
  };

  const handleQuestionChange = (index, updatedQuestion) => {
    setTest((prev) => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === index ? updatedQuestion : q
        ),
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
      <div
        style={{
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h2>✏️ Sửa đề thi Writing {test.index}</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Mã lớp:
            </label>
            <input
              type="text"
              value={test.classCode || ""}
              onChange={(e) => {
                const updatedTest = { ...test, classCode: e.target.value };
                setTest(updatedTest);
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Giáo viên:
            </label>
            <input
              type="text"
              value={test.teacherName || ""}
              onChange={(e) => {
                const updatedTest = { ...test, teacherName: e.target.value };
                setTest(updatedTest);
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Task 1:
            </label>
            <ReactQuill
              value={test.task1 || ""}
              onChange={(content) =>
                setTest((prev) => ({ ...prev, task1: content }))
              }
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ color: [] }, { background: [] }],
                  [{ list: "ordered" }, { list: "bullet" }],
                  [{ align: [] }],
                  ["link", "image"],
                  ["clean"],
                ],
              }}
              theme="snow"
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Task 2:
            </label>
            <ReactQuill
              value={test.task2 || ""}
              onChange={(content) =>
                setTest((prev) => ({ ...prev, task2: content }))
              }
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ color: [] }, { background: [] }],
                  [{ list: "ordered" }, { list: "bullet" }],
                  [{ align: [] }],
                  ["link", "image"],
                  ["clean"],
                ],
              }}
              theme="snow"
            />
          </div>

          <h3>Câu hỏi:</h3>
          {test.questions &&
            test.questions.map((question, index) => (
              <div key={index} style={{ marginBottom: "30px" }}>
                <h4>Câu {index + 1}</h4>
                <FormQuestion
                  question={question}
                  onChange={(updatedQuestion) =>
                    handleQuestionChange(index, updatedQuestion)
                  }
                />
              </div>
            ))}

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "#0e276f",
                color: "white",
                border: "none",
                padding: "10px 30px",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
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

