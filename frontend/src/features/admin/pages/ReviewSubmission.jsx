// frontend/src/features/admin/pages/ReviewSubmission.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";

const ReviewSubmission = () => {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [aiLoading, setAiLoading] = useState(false); // ✅ Thêm AI loading state
  const [saveLoading, setSaveLoading] = useState(false); // ✅ Thêm Save loading state
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false); // ✅ Track nếu đã save feedback

  // 🔹 Lấy thông tin bài viết
  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(apiPath("writing/list"));
      const allSubs = await res.json();
      const found = allSubs.find((s) => String(s.id) === String(id));
      setSubmission(found || null);

      // ✅ Nếu có nhận xét của học sinh này, hiển thị
      if (found?.feedback) {
        setFeedback(found.feedback);
        setTeacherName(found.feedbackBy || "");
        setHasSavedFeedback(true); // ✅ Đã có feedback rồi
      } else {
        // ✅ Nếu không có nhận xét (hs mới), clear form
        setFeedback("");
        setTeacherName("");
        setHasSavedFeedback(false); // ✅ Chưa có feedback
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải bài:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  // 🔹 Lưu nhận xét
  const handleSaveFeedback = async () => {
    if (!feedback.trim()) {
      alert("❌ Vui lòng nhập nhận xét trước khi lưu.");
      return;
    }
    if (!teacherName.trim()) {
      alert("❌ Vui lòng nhập tên giáo viên.");
      return;
    }

    setSaveLoading(true); // ✅ Bắt đầu save loading

    try {
      const res = await fetch(apiPath("writing/comment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          feedback,
          teacherName,
        }),
      });

      const data = await res.json();
      alert(data.message || "✅ Đã lưu nhận xét!");

      // ✅ Reset input & set flag
      setTeacherName("");
      setFeedback("");
      setHasSavedFeedback(true); // ✅ Đánh dấu đã save

      // Load lại bài để hiển thị nhận xét mới
      fetchSubmission();
    } catch (err) {
      console.error("❌ Lỗi khi lưu nhận xét:", err);
      alert("❌ Lỗi khi lưu nhận xét.");
    } finally {
      setSaveLoading(false); // ✅ Kết thúc save loading
    }
  };

  // 🔹 Gọi AI Gemini để gợi ý nhận xét
  const handleAIComment = async () => {
    if (!submission) return;

    setAiLoading(true); // ✅ Bắt đầu loading

    try {
      const aiRes = await fetch(apiPath("ai/generate-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1: submission.task1,
          task2: submission.task2,
        }),
      });
      const aiData = await aiRes.json();

      // AI response received (debug log removed)

      if (aiData.suggestion) {
        setFeedback(aiData.suggestion);
      } else {
        const errorMsg = aiData.detail
          ? `${aiData.error}\n\n${aiData.detail}`
          : aiData.error || "❌ AI không tạo được nhận xét.";
        alert(errorMsg);
      }
    } catch (err) {
      console.error("❌ Lỗi AI:", err);
      alert("❌ Không thể kết nối AI: " + err.message);
    } finally {
      setAiLoading(false); // ✅ Kết thúc loading
    }
  };

  if (loading) return <p style={{ padding: 40 }}>⏳ Đang tải...</p>;
  if (!submission)
    return <p style={{ padding: 40 }}>❌ Không tìm thấy bài viết.</p>;

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: "30px", maxWidth: 800, margin: "auto" }} className="admin-page">
        <h2>📄 Chi tiết bài viết</h2>
        <p>
          <strong>👤 Học sinh:</strong>{" "}
          {submission.user?.name || submission.userName || "N/A"}
        </p>
        <p>
          <strong>📞 Số điện thoại:</strong>{" "}
          {submission.user?.phone || submission.userPhone || "N/A"}
        </p>
        <p>
          <strong>🧾 Mã đề:</strong> Writing{" "}
          {submission.WritingTest?.index || "N/A"}
          {submission.WritingTest?.classCode
            ? ` – ${submission.WritingTest.classCode}`
            : ""}
          {submission.WritingTest?.teacherName
            ? ` – ${submission.WritingTest.teacherName}`
            : ""}
        </p>
        <p>
          <strong>🕒 Nộp lúc:</strong>{" "}
          {new Date(
            submission.submittedAt || submission.createdAt
          ).toLocaleString()}
        </p>

        <h4>✍️ Task 1:</h4>
        <p
          style={{
            whiteSpace: "pre-line",
            border: "1px solid #ccc",
            padding: 10,
          }}
        >
          {submission.task1}
        </p>

        <h4>✍️ Task 2:</h4>
        <p
          style={{
            whiteSpace: "pre-line",
            border: "1px solid #ccc",
            padding: 10,
          }}
        >
          {submission.task2}
        </p>

        <h3 style={{ marginTop: 30 }}>📝 Nhận xét của giáo viên</h3>
        {submission.feedback && (
          <p
            style={{
              whiteSpace: "pre-line",
              background: "#e7f4e4",
              padding: 10,
              borderRadius: 6,
            }}
          >
            <b>{submission.feedbackBy || "Giáo viên"}:</b> {submission.feedback}
          </p>
        )}

        <input
          type="text"
          placeholder="Tên giáo viên"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "16px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
        />
        <textarea
          rows={10}
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
          placeholder="Nhập nhận xét..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSaveFeedback}
            disabled={saveLoading || hasSavedFeedback || aiLoading} // ✅ Disable nếu đang save, đã save, hoặc đang gọi AI
            style={{
              flex: 1,
              padding: "10px 20px",
              border: "none",
              borderRadius: 6,
              backgroundColor:
                saveLoading || hasSavedFeedback || aiLoading
                  ? "#ccc"
                  : "#0e276f", // ✅ Đổi màu
              color: "white",
              cursor:
                saveLoading || hasSavedFeedback || aiLoading
                  ? "not-allowed"
                  : "pointer", // ✅ Đổi cursor
              fontSize: 16,
              opacity: saveLoading || hasSavedFeedback || aiLoading ? 0.6 : 1, // ✅ Giảm opacity
            }}
          >
            {saveLoading
              ? "⏳ Đang lưu..."
              : hasSavedFeedback
              ? "✅ Đã lưu"
              : "💾 Lưu nhận xét"}{" "}
            {/* ✅ Thay đổi text */}
          </button>
          <button
            onClick={handleAIComment}
            disabled={aiLoading || saveLoading || hasSavedFeedback} // ✅ Disable khi đang xử lý, đang lưu, hoặc đã save
            style={{
              flex: 1,
              padding: "10px 20px",
              border: "none",
              borderRadius: 6,
              backgroundColor: aiLoading ? "#ccc" : "#e03", // ✅ Đổi màu khi disable
              color: "white",
              cursor: aiLoading ? "not-allowed" : "pointer", // ✅ Đổi cursor
              fontSize: 16,
              opacity: aiLoading ? 0.6 : 1, // ✅ Giảm opacity
            }}
          >
            {aiLoading ? "⏳ Đang nhận xét..." : "🤖 StarEdu AI gợi ý nhận xét"}{" "}
            {/* ✅ Thay đổi text */}
          </button>
        </div>
      </div>
    </>
  );
};

export default ReviewSubmission;

