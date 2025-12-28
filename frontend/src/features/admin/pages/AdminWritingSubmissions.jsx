import React, { useEffect, useState } from "react";
import { AdminNavbar } from "../../../shared/components";

const AdminWritingSubmissions = () => {
  const [data, setData] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [messages, setMessages] = useState({});
  const [aiLoading, setAiLoading] = useState({}); // ✅ Thêm AI loading state
  const [sendLoading, setSendLoading] = useState({}); // ✅ Thêm Send loading state
  const [hasSaved, setHasSaved] = useState({}); // ✅ Track nếu đã save feedback

  // 🔍 Thêm state cho tìm kiếm
  const [searchClassCode, setSearchClassCode] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchStudentName, setSearchStudentName] = useState("");
  const [searchFeedbackBy, setSearchFeedbackBy] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL;
  const teacher = JSON.parse(localStorage.getItem("user")); // 👈 lấy tên giáo viên

  useEffect(() => {
    fetch(`${API_URL}/api/writing/list`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setFilteredData(data); // Khởi tạo filteredData
        // ✅ Khởi tạo hasSaved dựa trên dữ liệu - nếu có feedback thì disable nút
        const savedMap = {};
        data.forEach((item) => {
          if (item.feedback && item.feedbackBy) {
            savedMap[item.id] = true;
          }
        });
        setHasSaved(savedMap);
      })
      .catch((err) => console.error("Lỗi khi lấy dữ liệu:", err));
  }, [API_URL]);

  // 🔍 Hàm lọc dữ liệu khi tìm kiếm thay đổi
  useEffect(() => {
    let filtered = data;

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

    if (searchStudentName.trim()) {
      filtered = filtered.filter((item) =>
        item.userName?.toLowerCase().includes(searchStudentName.toLowerCase())
      );
    }

    if (searchFeedbackBy.trim()) {
      filtered = filtered.filter((item) =>
        item.feedbackBy?.toLowerCase().includes(searchFeedbackBy.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [searchClassCode, searchTeacher, searchStudentName, searchFeedbackBy, data]);

  // ✅ Hàm gửi nhận xét
  const handleSendFeedback = async (submissionId) => {
    const feedback = feedbacks[submissionId];
    if (!feedback || !feedback.trim()) {
      alert("Vui lòng nhập nhận xét.");
      return;
    }

    setSendLoading((prev) => ({ ...prev, [submissionId]: true })); // ✅ Bắt đầu loading

    try {
      const res = await fetch(`${API_URL}/api/writing/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          feedback,
          teacherName: teacher?.name || "Giáo viên ẩn danh",
        }),
      });

      const result = await res.json();
      setMessages((prev) => ({ ...prev, [submissionId]: result.message }));

      // ✅ Cập nhật ngay feedback mới hiển thị
      const updated = data.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              feedback,
              feedbackBy: teacher?.name,
              feedbackAt: new Date().toISOString(),
            }
          : item
      );
      setData(updated);

      // ✅ Clear input & disable nút
      setFeedbacks((prev) => ({ ...prev, [submissionId]: "" }));
      setHasSaved((prev) => ({ ...prev, [submissionId]: true }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => ({
        ...prev,
        [submissionId]: "❌ Gửi nhận xét thất bại",
      }));
    } finally {
      setSendLoading((prev) => ({ ...prev, [submissionId]: false })); // ✅ Kết thúc loading
    }
  };

  // 🤖 Hàm gọi AI để gợi ý nhận xét
  const handleAIComment = async (submission) => {
    setAiLoading((prev) => ({ ...prev, [submission.id]: true })); // ✅ Bắt đầu loading

    try {
      const aiRes = await fetch(`${API_URL}/api/ai/generate-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1: submission.task1,
          task2: submission.task2,
        }),
      });

      const aiData = await aiRes.json();
      if (aiData.suggestion) {
        setFeedbacks((prev) => ({
          ...prev,
          [submission.id]: aiData.suggestion,
        }));
      } else {
        alert(aiData.error || "❌ AI không tạo được nhận xét.");
      }
    } catch (err) {
      console.error("❌ Lỗi AI:", err);
      alert("❌ Không thể kết nối AI.");
    } finally {
      setAiLoading((prev) => ({ ...prev, [submission.id]: false })); // ✅ Kết thúc loading
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return "Không xác định";
    return `${d.getHours()}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")} ngày ${d.getDate()}/${
      d.getMonth() + 1
    }/${d.getFullYear()}`;
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: "30px" }}>
        <h2>📋 Writing Submissions</h2>
        <div style={{ marginTop: 12, marginBottom: 18 }}>
          <button onClick={() => window.location.href = '/admin/reading-submissions'} style={{ padding: '8px 12px', background: '#0e276f', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            🔎 Reading Submissions
          </button>
        </div>

        {/* 🔍 Form tìm kiếm */}
        <div
          style={{
            background: "#f0f0f0",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
            gap: "15px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              👤 Tên học sinh:
            </label>
            <input
              type="text"
              placeholder="Nhập tên học sinh"
              value={searchStudentName}
              onChange={(e) => setSearchStudentName(e.target.value)}
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
              🧾 Mã lớp:
            </label>
            <input
              type="text"
              placeholder="Nhập mã lớp (vd: 148-IX-3A-S1)"
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
              setSearchStudentName("");
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

        {/* Hiển thị kết quả tìm kiếm */}
        <p style={{ color: "#666", marginBottom: "15px" }}>
          📊 Tổng cộng: <strong>{filteredData.length}</strong> bài viết
          {(searchClassCode || searchTeacher || searchStudentName || searchFeedbackBy) && ` (lọc từ ${data.length})`}
        </p>

        {filteredData.length === 0 && (
          <p style={{ color: "#d32f2f", fontWeight: "bold" }}>
            ❌ Không tìm thấy bài viết phù hợp.
          </p>
        )}

        {filteredData.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ccc",
              padding: "20px",
              marginTop: "20px",
              borderRadius: 8,
              background: "#f9f9f9",
            }}
          >
            <p>
              <strong>👤 Học sinh:</strong> {item.userName || "N/A"}
            </p>
            <p>
              <strong>📞 Số điện thoại:</strong> {item.userPhone || "N/A"}
            </p>
            <p>
              <strong>🧾 Mã đề:</strong> Writing{" "}
              {item.WritingTest?.index || "N/A"}
              {item.WritingTest?.classCode
                ? ` – ${item.WritingTest.classCode}`
                : ""}
              {item.WritingTest?.teacherName
                ? ` – ${item.WritingTest.teacherName}`
                : ""}
            </p>
            <p>
              <strong>🕒 Nộp lúc:</strong> {formatDateTime(item.createdAt)}
            </p>
            <p>
              <strong>⏳ Thời gian còn lại:</strong>{" "}
              {item.timeLeft ? Math.floor(item.timeLeft / 60) : 0} phút
            </p>

            <h4>✍️ Task 1:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{item.task1}</p>

            <h4>✍️ Task 2:</h4>
            <p style={{ whiteSpace: "pre-line" }}>{item.task2}</p>

            <div style={{ marginTop: 20 }}>
              {item.feedback && item.feedbackAt && item.feedbackBy && (
                <div
                  style={{
                    background: "#e7f4e4",
                    padding: 10,
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                >
                  <p>
                    🟢 <strong>Đã nhận xét</strong> lúc{" "}
                    {formatDateTime(item.feedbackAt)} bởi{" "}
                    <strong>{item.feedbackBy}</strong>
                  </p>
                  <p style={{ whiteSpace: "pre-line", marginTop: 6 }}>
                    <strong>📋 Nhận xét:</strong>
                    <br />
                    {item.feedback}
                  </p>
                </div>
              )}

              <textarea
                placeholder="Nhận xét của giáo viên..."
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px",
                  boxSizing: "border-box",
                  fontSize: "16px",
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  marginBottom: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                value={feedbacks[item.id] || ""}
                onChange={(e) =>
                  setFeedbacks((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
              />

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => handleSendFeedback(item.id)}
                  disabled={
                    sendLoading[item.id] ||
                    hasSaved[item.id] ||
                    aiLoading[item.id]
                  } // ✅ Disable khi đang gửi, đã gửi, hoặc đang gọi AI
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    backgroundColor:
                      sendLoading[item.id] ||
                      hasSaved[item.id] ||
                      aiLoading[item.id]
                        ? "#ccc"
                        : "#0e276f",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor:
                      sendLoading[item.id] ||
                      hasSaved[item.id] ||
                      aiLoading[item.id]
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 16,
                    opacity:
                      sendLoading[item.id] ||
                      hasSaved[item.id] ||
                      aiLoading[item.id]
                        ? 0.6
                        : 1,
                  }}
                >
                  {sendLoading[item.id]
                    ? "⏳ Đang gửi..."
                    : hasSaved[item.id]
                    ? "✅ Đã gửi"
                    : "📤 Gửi nhận xét"}
                </button>
                <button
                  onClick={() => handleAIComment(item)}
                  disabled={
                    aiLoading[item.id] ||
                    sendLoading[item.id] ||
                    hasSaved[item.id]
                  } // ✅ Disable khi đang xử lý, đang gửi, hoặc đã gửi
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    backgroundColor: aiLoading[item.id] ? "#ccc" : "#e03",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: aiLoading[item.id] ? "not-allowed" : "pointer",
                    fontSize: 16,
                    opacity: aiLoading[item.id] ? 0.6 : 1,
                  }}
                >
                  {aiLoading[item.id]
                    ? "⏳ Đang nhận xét..."
                    : "🤖 StarEdu AI gợi ý nhận xét"}
                </button>
              </div>

              {messages[item.id] && (
                <p style={{ marginTop: 5, color: "#28a745" }}>
                  {messages[item.id]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AdminWritingSubmissions;
