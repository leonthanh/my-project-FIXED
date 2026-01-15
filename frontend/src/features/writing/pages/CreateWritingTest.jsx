// src/features/writing/pages/CreateWritingTest.jsx
import React, { useState } from "react";
import ReactQuill from "react-quill";
import { AdminNavbar } from "../../../shared/components";
import { apiPath } from "../../../shared/utils/api";

import "./CreateWritingTest.css";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

const CreateWritingTest = () => {
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task1.trim() || !task2.trim()) {
      setMessage("❌ Vui lòng nhập đầy đủ nội dung Task 1 và Task 2.");
      return;
    }

    try {
      const endpoint = image ? apiPath("writing-tests/with-image") : apiPath("writing-tests");

      let res;
      if (image) {
        const formData = new FormData();
        formData.append("task1", task1);
        formData.append("task2", task2);
        formData.append("classCode", classCode);
        formData.append("teacherName", teacherName);
        formData.append("image", image);

        res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task1,
            task2,
            classCode,
            teacherName,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.message || "❌ Lỗi khi tạo đề");
        return;
      }

      setMessage(data.message || "✅ Đã tạo đề");

      setTask1("");
      setTask2("");
      setClassCode("");
      setTeacherName("");
      setImage(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi tạo đề");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };

  return (
    <>
      <AdminNavbar />
      <div className="create-writing-container">
        <h2>📝 Create Writing</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Mã lớp (VD: 317S3)"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Tên giáo viên ra đề"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: "20px" }}>
            <label>
              <b>Nội dung Task 1:</b>
            </label>
            <div className="create-writing-quill">
              <ReactQuill
                theme="snow"
                value={task1}
                onChange={setTask1}
                placeholder="Nhập nội dung Task 1"
                modules={quillModules}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <b>Nội dung Task 2:</b>
            </label>
            <div className="create-writing-quill">
              <ReactQuill
                theme="snow"
                value={task2}
                onChange={setTask2}
                placeholder="Nhập nội dung Task 2"
                modules={quillModules}
              />
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            style={{ margin: "10px 0" }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#e03",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ➕ Tạo đề
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#0e276f",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              👁 Preview
            </button>
          </div>
        </form>

        {message && (
          <p
            style={{
              marginTop: 10,
              fontWeight: "bold",
              color: message.includes("❌") ? "red" : "green",
            }}
          >
            {message}
          </p>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowPreview(false)}
          >
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "80%",
                maxHeight: "80%",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>📄 Xem trước đề</h3>

              {image && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Hình minh họa:</h4>
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              )}

              <div>
                <h4>Task 1:</h4>
                <div dangerouslySetInnerHTML={{ __html: task1 }} />
              </div>

              <div style={{ marginTop: "15px" }}>
                <h4>Task 2:</h4>
                <div dangerouslySetInnerHTML={{ __html: task2 }} />
              </div>

              <div style={{ textAlign: "right", marginTop: "20px" }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#e03",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateWritingTest;
