import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { apiPath, hostPath } from "../utils/api";
import { canManageCategory } from "../utils/permissions";
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
        <Link to="/select-test" className="adminNavbar__logoLink" title="Danh sách đề">
          <img
            src={hostPath("uploads/staredu.jpg")}
            alt="Logo"
            className="adminNavbar__logo"
          />
        </Link>

        {/* Cambridge Tests Dropdown */}
        <div className="adminNavbar__dropdown" ref={cambridgeDropdownRef}>
          <span
            className="adminNavbar__link adminNavbar__dropdownToggle"
            onClick={() => setCambridgeDropdownVisible((prev) => !prev)}
            title="Orange"
          >
            <span className="adminNavbar__icon">🍊</span>
            <span className="adminNavbar__label">Orange</span>
            <span className="adminNavbar__caret">▼</span>
          </span>
          {cambridgeDropdownVisible && (
            <div className="adminNavbar__menu">
              <div className="adminNavbar__menuHeader">📚 KET (A2 Key)</div>

              {canManageCategory(user, 'listening') && (
                <Link
                  to="/admin/create-ket-listening"
                  className="adminNavbar__menuItem"
                  onClick={() => setCambridgeDropdownVisible(false)}
                >
                  🎧 KET Listening
                </Link>
              )}
              {canManageCategory(user, 'reading') && (
                <Link
                  to="/admin/create-ket-reading"
                  className="adminNavbar__menuItem"
                  onClick={() => setCambridgeDropdownVisible(false)}
                >
                  📖 KET Reading
                </Link>
              )}

              <div className="adminNavbar__menuHeader adminNavbar__menuHeader--spaced">
                📚 PET (B1 Preliminary)
              </div>
              {canManageCategory(user, 'listening') && (
                <Link
                  to="/admin/create-pet-listening"
                  className="adminNavbar__menuItem"
                  onClick={() => setCambridgeDropdownVisible(false)}
                >
                  🎧 PET Listening
                </Link>
              )}
              {canManageCategory(user, 'reading') && (
                <Link
                  to="/admin/create-pet-reading"
                  className="adminNavbar__menuItem"
                  onClick={() => setCambridgeDropdownVisible(false)}
                >
                  📖 PET Reading
                </Link>
              )}
              <Link
                to="/admin/create-pet-writing"
                className="adminNavbar__menuItem"
                onClick={() => setCambridgeDropdownVisible(false)}
              >
                ✍️ PET Writing
              </Link>

              <div className="adminNavbar__menuHeader adminNavbar__menuHeader--spaced">
                📊 Management
              </div>
              <Link
                to="/admin/cambridge-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setCambridgeDropdownVisible(false)}
              >
                📋 View submissions
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
            title="IELTS"
          >
            <span className="adminNavbar__icon">📚</span>
            <span className="adminNavbar__label">IX</span>
            <span className="adminNavbar__caret">▼</span>
          </span>
          {submissionDropdownVisible && (
            <div className="adminNavbar__menu adminNavbar__menu--wide">
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
              {canManageCategory(user, 'reading') && (
                <Link
                  to="/admin/create-reading"
                  className="adminNavbar__menuItem"
                  onClick={() => setSubmissionDropdownVisible(false)}
                >
                  📖 Reading
                </Link>
              )}
              {canManageCategory(user, 'listening') && (
                <Link
                  to="/admin/create-listening"
                  className="adminNavbar__menuItem"
                  onClick={() => setSubmissionDropdownVisible(false)}
                >
                  🎧 Listening
                </Link>
              )}
              
              <div className="adminNavbar__menuHeader">📥 Submissions</div>
              <Link
                to="/admin/writing-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                ✍️ Writing 
              </Link>
              <Link
                to="/admin/reading-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                📖 Reading
              </Link>
              <Link
                to="/admin/listening-submissions"
                className="adminNavbar__menuItem"
                onClick={() => setSubmissionDropdownVisible(false)}
              >
                🎧 Listening
              </Link>
              

            </div>
          )}
        </div>
        <Link to="/select-test" className="adminNavbar__link" title="Test list">
          <span className="adminNavbar__icon">🧾</span>
          <span className="adminNavbar__label">Test list</span>
        </Link>

        <Link to="/review" className="adminNavbar__link" title="Review">
          <span className="adminNavbar__icon">✍️</span>
          <span className="adminNavbar__label">Review</span>
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
          title="Unreviewed"
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
              <div>✅ No unreviewed submissions</div>
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
        <span className="adminNavbar__teacherName">👨‍🏫 {user?.name || "Teacher"}</span>
        <button
          onClick={handleLogout}
          className="adminNavbar__logout"
          title="Logout"
        >
          <span className="adminNavbar__icon">🔓</span>
          <span className="adminNavbar__logoutLabel">Logout</span>
        </button>
      </div>

    </nav>
  );
};

export default AdminNavbar;
