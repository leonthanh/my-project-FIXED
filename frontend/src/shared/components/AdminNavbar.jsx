import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { apiPath, hostPath } from "../utils/api";
import "./AdminNavbar.css";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const [unreviewed, setUnreviewed] = useState([]);
  const [notificationDropdownVisible, setNotificationDropdownVisible] =
    useState(false);
  const [submissionDropdownVisible, setSubmissionDropdownVisible] =
    useState(false);
  const [cambridgeDropdownVisible, setCambridgeDropdownVisible] =
    useState(false);
  const notificationDropdownRef = useRef(null);
  const submissionDropdownRef = useRef(null);
  const cambridgeDropdownRef = useRef(null);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  useEffect(() => {
    const fetchUnreviewed = async () => {
      try {
        const res = await fetch(apiPath("writing/list"));
        const all = await res.json();

        // ✅ Lọc bài chưa chấm (feedback null hoặc rỗng)
        const notReviewed = all.filter(
          (sub) => !sub.feedback || sub.feedback.trim() === ""
        );
        setUnreviewed(notReviewed);
      } catch (err) {
        console.error("❌ Lỗi khi tải thông báo GV:", err);
      }
    };

    fetchUnreviewed();
    const interval = setInterval(fetchUnreviewed, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setNotificationDropdownVisible(false);
      }
      if (
        submissionDropdownRef.current &&
        !submissionDropdownRef.current.contains(event.target)
      ) {
        setSubmissionDropdownVisible(false);
      }
      if (
        cambridgeDropdownRef.current &&
        !cambridgeDropdownRef.current.contains(event.target)
      ) {
        setCambridgeDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="adminNavbar">
      <div className="adminNavbar__left">
        <img
          src={hostPath("uploads/staredu.jpg")}
          alt="Logo"
          className="adminNavbar__logo"
        />

        {/* Cambridge Tests Dropdown */}
        <div className="adminNavbar__dropdown" ref={cambridgeDropdownRef}>
          <span
            className="adminNavbar__link adminNavbar__dropdownToggle"
            onClick={() => setCambridgeDropdownVisible((prev) => !prev)}
          >
            🎓 Cambridge ▼
          </span>
          {cambridgeDropdownVisible && (
            <div className="adminNavbar__menu">
              <div className="adminNavbar__menuHeader">📚 KET (A2 Key)</div>

              <Link
                to="/admin/create-ket-listening"
                className="adminNavbar__menuItem"
                onClick={() => setCambridgeDropdownVisible(false)}
              >
                🎧 KET Listening
              </Link>
              <Link
                to="/admin/create-ket-reading"
                className="adminNavbar__menuItem"
                onClick={() => setCambridgeDropdownVisible(false)}
              >
                📖 KET Reading
              </Link>

              <div className="adminNavbar__menuHeader adminNavbar__menuHeader--spaced">
                📚 PET (B1 Preliminary)
              </div>
              <Link
                to="/admin/create-pet-listening"
                className="adminNavbar__menuItem adminNavbar__menuItem--disabled"
                onClick={(e) => e.preventDefault()}
              >
                🎧 PET Listening (Sắp ra)
              </Link>
              <Link
                to="/admin/create-pet-reading"
                className="adminNavbar__menuItem adminNavbar__menuItem--disabled"
                onClick={(e) => e.preventDefault()}
              >
                📖 PET Reading (Sắp ra)
              </Link>

              <div className="adminNavbar__menuHeader adminNavbar__menuHeader--spaced">
                📊 Quản lý
              </div>
              <Link
                to="/admin/cambridge-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setCambridgeDropdownVisible(false)}
              >
                📋 Xem bài làm
              </Link>
            </div>
          )}
        </div>

        <div
          className="adminNavbar__dropdown"
          ref={submissionDropdownRef}
        >
          <span
            className="adminNavbar__link adminNavbar__dropdownToggle"
            onClick={() => setSubmissionDropdownVisible((prev) => !prev)}
          >
            📁 Ielts ▼
          </span>
          {submissionDropdownVisible && (
            <div className="adminNavbar__menu adminNavbar__menu--wide">
              <div className="adminNavbar__menuHeader">📥 Submissions</div>
              <Link
                to="/admin/reading-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                🔍 Reading
              </Link>
              <Link
                to="/admin/writing-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                ✍️ Writing 
              </Link>

              <div className="adminNavbar__menuHeader adminNavbar__menuHeader--spaced">
                ✏️ Create
              </div>
              <Link
                to="/admin/create-writing"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                ✍️ Writing
              </Link>
              <Link
                to="/admin/create-listening"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                🎧 Listening
              </Link>
              <Link
                to="/admin/create-reading"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                📖 Reading
              </Link>
            </div>
          )}
        </div>
        <Link to="/select-test" className="adminNavbar__link">
          📋 Danh sách đề
        </Link>

        <Link to="/review" className="adminNavbar__link">
          📝 Nhận xét bài
        </Link>

        <div
          className={
            unreviewed.length > 0
              ? "adminNavbar__bell adminNavbar__bell--shake"
              : "adminNavbar__bell"
          }
          onClick={() =>
            setNotificationDropdownVisible(!notificationDropdownVisible)
          }
          title="Bài chưa chấm"
        >
          🔔
          {unreviewed.length > 0 && (
            <span className="adminNavbar__badge">
              {unreviewed.length}
            </span>
          )}
        </div>

        {notificationDropdownVisible && (
          <div ref={notificationDropdownRef} className="adminNavbar__notifyMenu">
            {unreviewed.length === 0 ? (
              <div>✅ Không có bài chưa chấm</div>
            ) : (
              unreviewed.map((sub, i) => (
                <div
                  key={i}
                  className="adminNavbar__notifyItem"
                  onClick={() => {
                    setNotificationDropdownVisible(false);
                    navigate(`/review/${sub.id}`);
                  }}
                >
                  👤 {sub.User?.name || sub.userName || "N/A"} - 📞{" "}
                  {sub.User?.phone || sub.userPhone || "N/A"}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 👨‍🏫 Hiển thị tên giáo viên và nút logout */}
      <div className="adminNavbar__right">
        <ThemeToggle />
        <span className="adminNavbar__teacherName">👨‍🏫 {user?.name || "Giáo viên"}</span>
        <button
          onClick={handleLogout}
          className="adminNavbar__logout"
        >
          🔓 Đăng xuất
        </button>
      </div>

    </nav>
  );
};

export default AdminNavbar;
