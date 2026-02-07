import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate, useParams } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { apiPath, authFetch, hostPath } from "../../../shared/utils/api";
import useQuillImageUpload from "../../../shared/hooks/useQuillImageUpload";
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

const EditPetWritingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task1, setTask1] = useState("");
  const [part2Question2, setPart2Question2] = useState("");
  const [part2Question3, setPart2Question3] = useState("");
  const [classCode, setClassCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("part1");
  const [part2Tab, setPart2Tab] = useState("q2");
  const [loading, setLoading] = useState(true);

  const task1Quill = useQuillImageUpload();
  const part2Q2Quill = useQuillImageUpload();
  const part2Q3Quill = useQuillImageUpload();

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(apiPath(`writing-tests/${id}`));
        if (!res.ok) throw new Error("Không tìm thấy đề thi");
        const data = await res.json();
        setTask1(data.task1 || "");
        setPart2Question2(data.part2Question2 || "");
        setPart2Question3(data.part2Question3 || "");
        setClassCode(data.classCode || "");
        setTeacherName(data.teacherName || "");
        setExistingImage(data.task1Image || "");
      } catch (err) {
        console.error("❌ Lỗi khi tải đề PET Writing:", err);
        setMessage("❌ Không thể tải đề. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  const saveDraft = () => {
    try {
      const draft = {
        task1,
        part2Question2,
        part2Question3,
        classCode,
        teacherName,
      };
      localStorage.setItem(`petWritingTestEditDraft-${id}`, JSON.stringify(draft));
    } catch (e) {
      console.error("Error saving PET writing draft", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task1.trim() || !part2Question2.trim() || !part2Question3.trim()) {
      setMessage("❌ Vui lòng nhập đầy đủ Part 1 và Part 2 (Q2/Q3).");
      return;
    }

    try {
      let res;
      if (image) {
        const formData = new FormData();
        formData.append("task1", task1);
        formData.append("task2", "");
        formData.append("part2Question2", part2Question2);
        formData.append("part2Question3", part2Question3);
        formData.append("classCode", classCode);
        formData.append("teacherName", teacherName);
        formData.append("testType", "pet-writing");
        formData.append("image", image);

        res = await authFetch(apiPath(`writing-tests/${id}/with-image`), {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await authFetch(apiPath(`writing-tests/${id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task1,
            task2: "",
            part2Question2,
            part2Question3,
            classCode,
            teacherName,
            testType: "pet-writing",
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          try {
            saveDraft();
          } catch (e) {}
          setMessage(
            "❌ Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại. Bản nháp đã được lưu."
          );
          setRequiresLogin(true);
          return;
        }
        setMessage(data.message || "❌ Lỗi khi cập nhật đề");
        return;
      }

      setMessage(data.message || "✅ Đã cập nhật đề PET Writing");
      setImage(null);
      if (data.test?.task1Image) {
        setExistingImage(data.test.task1Image);
      }
      setTimeout(() => navigate("/cambridge"), 1200);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi cập nhật đề");
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

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="create-writing-container">⏳ Đang tải...</div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <div className="create-writing-container">
        {requiresLogin && (
          <div
            style={{
              padding: 12,
              background: "#fff0f0",
              border: "1px solid #ffcccc",
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <strong>⚠️ Bạn cần đăng nhập lại để hoàn tất thao tác.</strong>
            <div style={{ marginTop: 8 }}>
              Bản nháp đã được lưu.
              <button
                style={{ marginLeft: 8, padding: "6px 10px" }}
                onClick={() => {
                  localStorage.setItem("postLoginRedirect", window.location.pathname);
                  window.location.href = "/login";
                }}
              >
                Đăng nhập lại
              </button>
            </div>
          </div>
        )}
        <h2>📝 Edit PET Writing</h2>
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

          <div className="create-writing-tabs">
            <button
              type="button"
              className={`create-writing-tab ${activeTab === "part1" ? "active" : ""}`}
              onClick={() => setActiveTab("part1")}
            >
              Part 1
            </button>
            <button
              type="button"
              className={`create-writing-tab ${activeTab === "part2" ? "active" : ""}`}
              onClick={() => setActiveTab("part2")}
            >
              Part 2
            </button>
          </div>

          {activeTab === "part1" && (
            <div style={{ marginBottom: "20px" }}>
              <label>
                <b>Part 1 (Email instructions):</b>
              </label>
              <div className="create-writing-quill">
                <ReactQuill
                  ref={task1Quill.quillRef}
                  theme="snow"
                  value={task1}
                  onChange={setTask1}
                  placeholder="Nhập nội dung Part 1"
                  modules={task1Quill.modules}
                />
              </div>

              {existingImage && (
                <div style={{ margin: "12px 0" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Ảnh hiện tại:</div>
                  <img
                    src={hostPath(existingImage)}
                    alt="Current"
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                style={{ margin: "10px 0" }}
              />
            </div>
          )}

          {activeTab === "part2" && (
            <div style={{ marginBottom: "20px" }}>
              <div className="create-writing-subtabs">
                <button
                  type="button"
                  className={`create-writing-subtab ${part2Tab === "q2" ? "active" : ""}`}
                  onClick={() => setPart2Tab("q2")}
                >
                  Question 2
                </button>
                <button
                  type="button"
                  className={`create-writing-subtab ${part2Tab === "q3" ? "active" : ""}`}
                  onClick={() => setPart2Tab("q3")}
                >
                  Question 3
                </button>
              </div>

              {part2Tab === "q2" && (
                <div>
                  <label>
                    <b>Part 2 - Question 2:</b>
                  </label>
                  <div className="create-writing-quill">
                    <ReactQuill
                      ref={part2Q2Quill.quillRef}
                      theme="snow"
                      value={part2Question2}
                      onChange={setPart2Question2}
                      placeholder="Nhập nội dung câu hỏi số 2"
                      modules={part2Q2Quill.modules}
                    />
                  </div>
                </div>
              )}

              {part2Tab === "q3" && (
                <div>
                  <label>
                    <b>Part 2 - Question 3:</b>
                  </label>
                  <div className="create-writing-quill">
                    <ReactQuill
                      ref={part2Q3Quill.quillRef}
                      theme="snow"
                      value={part2Question3}
                      onChange={setPart2Question3}
                      placeholder="Nhập nội dung câu hỏi số 3"
                      modules={part2Q3Quill.modules}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              💾 Lưu cập nhật
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
              <h3>📄 Xem trước đề PET Writing</h3>
              {(image || existingImage) && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Hình minh họa:</h4>
                  <img
                    src={image ? URL.createObjectURL(image) : hostPath(existingImage)}
                    alt="Preview"
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                </div>
              )}
              <h4>Part 1</h4>
              <div dangerouslySetInnerHTML={{ __html: task1 }} />
              <h4>Part 2 - Question 2</h4>
              <div dangerouslySetInnerHTML={{ __html: part2Question2 }} />
              <h4>Part 2 - Question 3</h4>
              <div dangerouslySetInnerHTML={{ __html: part2Question3 }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EditPetWritingTest;
