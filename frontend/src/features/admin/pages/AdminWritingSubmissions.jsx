import React, { useEffect, useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";

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
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState(''); // '' | 'pending' | 'done'

  let teacher = null;
  try {
    teacher = JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    localStorage.removeItem("user");
    teacher = null;
  } // 👈 lấy tên giáo viên

  useEffect(() => {
    fetch(apiPath("writing/list?includeDrafts=1"))
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
  }, []);

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

    if (filterStatus === 'pending') {
      filtered = filtered.filter((item) => !item.feedback || !item.feedbackBy);
    }
    if (filterStatus === 'done') {
      filtered = filtered.filter((item) => !!(item.feedback && item.feedbackBy));
    }

    setFilteredData(filtered);
  }, [searchClassCode, searchTeacher, searchStudentName, searchFeedbackBy, filterStatus, data]);

  const toggleExpand = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchClassCode('');
    setSearchTeacher('');
    setSearchStudentName('');
    setSearchFeedbackBy('');
    setFilterStatus('');
  };

  // ✅ Hàm gửi nhận xét
  const handleSendFeedback = async (submissionId) => {
    const feedback = feedbacks[submissionId];
    if (!feedback || !feedback.trim()) {
      alert("Vui lòng nhập nhận xét.");
      return;
    }

    setSendLoading((prev) => ({ ...prev, [submissionId]: true })); // ✅ Bắt đầu loading

    try {
      const res = await fetch(apiPath("writing/comment"), {
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
      const aiRes = await fetch(apiPath("ai/generate-feedback"), {
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
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '30px 16px' }} className="admin-page">

        {/* Tiêu đề + nút navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 Writing Submissions</h2>
          <button
            onClick={() => (window.location.href = '/admin/reading-submissions')}
            style={{ padding: '8px 14px', background: '#0e276f', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            🔎 Reading Submissions
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: 'Tổng cộng', count: data.length,                                                       bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
            { label: 'Chưa chấm', count: data.filter((i) => !i.feedback || !i.feedbackBy).length,           bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
            { label: 'Đã chấm',   count: data.filter((i) => !!(i.feedback && i.feedbackBy)).length,         bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '8px 18px', minWidth: 110, textAlign: 'center', cursor: 'default' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: s.color, opacity: 0.85 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bộ lọc */}
        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}>
            {[
              { label: '👤 Tên học sinh',   ph: 'Tên học sinh',        val: searchStudentName, set: setSearchStudentName },
              { label: '🧾 Mã lớp',         ph: 'vd: 148-IX-3A-S1',   val: searchClassCode,   set: setSearchClassCode },
              { label: '👨‍🏫 Giáo viên đề',  ph: 'Tên giáo viên',      val: searchTeacher,     set: setSearchTeacher },
              { label: '✍️ GV chấm',        ph: 'Tên giáo viên chấm', val: searchFeedbackBy,  set: setSearchFeedbackBy },
            ].map((f) => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>{f.label}</label>
                <input
                  type="text" placeholder={f.ph} value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>📌 Trạng thái</label>
              <select
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">Tất cả</option>
                <option value="pending">⏳ Chưa chấm</option>
                <option value="done">✅ Đã chấm</option>
              </select>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button onClick={resetFilters} style={{ width: '100%', padding: '7px 10px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Hiển thị <strong>{filteredData.length}</strong>{data.length !== filteredData.length ? ` / ${data.length}` : ''} bài viết
          &nbsp;—&nbsp;<span style={{ color: '#9ca3af' }}>Click vào hàng để xem bài & nhận xét</span>
        </p>

        {filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 15 }}>
            ❌ Không tìm thấy bài viết phù hợp.
          </div>
        )}

        {/* Danh sách dạng accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredData.map((item, idx) => {
            const isDone = !!(item.feedback && item.feedbackBy) || !!hasSaved[item.id];
            const isDraft = !!item.isDraft;
            const isExpanded = expandedItems.has(item.id);
            const testLabel = [
              item.WritingTest?.testType === 'pet-writing' ? 'PET Writing' : 'Writing',
              item.WritingTest?.index,
              item.WritingTest?.classCode,
              item.WritingTest?.teacherName,
            ].filter(Boolean).join(' – ');

            return (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${isDraft ? '#bfdbfe' : (isDone ? '#bbf7d0' : '#fed7aa')}`,
                  borderLeft: `4px solid ${isDraft ? '#2563eb' : (isDone ? '#16a34a' : '#f59e0b')}`,
                  borderRadius: 8,
                  background: '#fff',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Header row – luôn hiển thị, click để mở/đóng */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' }}
                  onClick={() => toggleExpand(item.id)}
                >
                  <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 28 }}>#{idx + 1}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                    background: isDraft ? '#dbeafe' : (isDone ? '#dcfce7' : '#fef3c7'),
                    color: isDraft ? '#1e3a8a' : (isDone ? '#166534' : '#92400e'),
                  }}>
                    {isDraft ? 'Draft chua nop' : (isDone ? 'Da cham' : 'Chua cham')}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, minWidth: 120 }}>{item.userName || 'N/A'}</span>
                  <span style={{ fontSize: 13, color: '#6b7280', minWidth: 100 }}>{item.userPhone || 'N/A'}</span>
                  <span style={{ fontSize: 13, color: '#374151', flex: 1, minWidth: 180 }}>{testLabel || 'N/A'}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDateTime(item.createdAt)}</span>
                  <span style={{ fontSize: 16, color: '#9ca3af', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Nội dung mở rộng */}
                {isExpanded && (
                  <div style={{ padding: '0 14px 16px 14px', borderTop: '1px solid #f3f4f6' }}>
                    {isDraft && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: 12, marginTop: 12, color: '#1e3a8a', fontSize: 13 }}>
                        Day la ban autosave chua submit. Hoc sinh can dang nhap lai va bam Submit de chot bai.
                      </div>
                    )}
                    {/* Task 1 & Task 2 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }} className="admin-task-grid">
                      <div style={{ background: '#f8fafc', borderRadius: 7, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>✍️ Task 1</div>
                        <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.65, color: '#1f2937' }}>{item.task1 || '(trống)'}</p>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: 7, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>✍️ Task 2</div>
                        <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.65, color: '#1f2937' }}>{item.task2 || '(trống)'}</p>
                      </div>
                    </div>

                    {/* Feedback đã có */}
                    {item.feedback && item.feedbackAt && item.feedbackBy && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: 12, marginTop: 12 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#166534' }}>
                          🟢 <strong>Đã nhận xét</strong> lúc {formatDateTime(item.feedbackAt)} bởi <strong>{item.feedbackBy}</strong>
                        </p>
                        <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14 }}>{item.feedback}</p>
                      </div>
                    )}

                    {/* Form nhận xét */}
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        placeholder={isDraft ? "Ban nhap chua submit - tam thoi khong gui nhan xet." : "Nhan xet cua giao vien..."}
                        rows={4}
                        style={{ width: '100%', padding: 10, boxSizing: 'border-box', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                        value={feedbacks[item.id] || ''}
                        disabled={isDraft}
                        onChange={(e) => setFeedbacks((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} className="admin-button-row">
                        <button
                          onClick={() => handleSendFeedback(item.id)}
                          disabled={isDraft || sendLoading[item.id] || hasSaved[item.id] || aiLoading[item.id]}
                          style={{
                            flex: 1, padding: '9px 16px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14,
                            cursor: (isDraft || hasSaved[item.id] || sendLoading[item.id]) ? 'default' : 'pointer',
                            background: (isDraft || sendLoading[item.id] || hasSaved[item.id] || aiLoading[item.id]) ? '#9ca3af' : '#0e276f',
                            color: '#fff',
                          }}
                        >
                          {isDraft ? 'Cho hoc sinh submit' : (sendLoading[item.id] ? 'Dang gui...' : hasSaved[item.id] ? 'Da gui' : 'Gui nhan xet')}
                        </button>
                        <button
                          onClick={() => handleAIComment(item)}
                          disabled={isDraft || aiLoading[item.id] || sendLoading[item.id] || hasSaved[item.id]}
                          style={{
                            flex: 1, padding: '9px 16px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14,
                            cursor: (isDraft || aiLoading[item.id]) ? 'not-allowed' : 'pointer',
                            background: (isDraft || aiLoading[item.id] || sendLoading[item.id] || hasSaved[item.id]) ? '#9ca3af' : '#ee0033',
                            color: '#fff',
                          }}
                        >
                          {isDraft ? 'Cho hoc sinh submit' : (aiLoading[item.id] ? 'Dang nhan xet...' : 'StarEdu AI goi y nhan xet')}
                        </button>
                      </div>
                      {messages[item.id] && (
                        <p style={{ marginTop: 6, color: '#16a34a', fontSize: 13 }}>{messages[item.id]}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AdminWritingSubmissions;

