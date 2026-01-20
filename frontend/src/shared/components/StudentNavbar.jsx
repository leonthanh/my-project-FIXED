import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPath, hostPath } from "../utils/api";
import "./StudentNavbar.css";

const StudentNavbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [writingFeedbackCount, setWritingFeedbackCount] = useState(0);
  const [readingFeedbackCount, setReadingFeedbackCount] = useState(0);
  const [cambridgeFeedbackCount, setCambridgeFeedbackCount] = useState(0);
  const [newTestCount, setNewTestCount] = useState(0);
  const [moreDropdownVisible, setMoreDropdownVisible] = useState(false);
  const moreDropdownRef = useRef(null);

  // Lấy thông tin user từ localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("❌ Lỗi parse user:", e);
        localStorage.removeItem("user");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.phone) return;

    try {
      // Fetch Writing notifications
      const [testsRes, submissionsRes] = await Promise.all([
        fetch(apiPath("writing-tests")).then((res) => res.json()),
        fetch(apiPath("writing/list")).then((res) => res.json()),
      ]);

      const mySubs = submissionsRes.filter(
        (sub) => sub.userPhone === user.phone
      );

      const unseenWritingFeedbacks = mySubs.filter(
        (sub) => sub.feedback && !sub.feedbackSeen
      );

      const submittedTestIds = mySubs
        .map((sub) => String(sub.testId))
        .filter(Boolean);
      const unsubmittedTests = testsRes.filter(
        (test) => !submittedTestIds.includes(String(test.id))
      );

      setWritingFeedbackCount(unseenWritingFeedbacks.length);
      setNewTestCount(unsubmittedTests.length);

      // Fetch Reading notifications
      try {
        const readingRes = await fetch(apiPath(`reading-submissions/unseen-count/${user.phone}`));
        if (readingRes.ok) {
          const { count } = await readingRes.json();
          setReadingFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải Reading notifications:", err);
        setReadingFeedbackCount(0);
      }

      // Fetch Cambridge notifications
      try {
        const camRes = await fetch(apiPath(`cambridge/submissions/unseen-count/${user.phone}`));
        if (camRes.ok) {
          const { count } = await camRes.json();
          setCambridgeFeedbackCount(count || 0);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải Cambridge notifications:", err);
        setCambridgeFeedbackCount(0);
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải thông báo:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.phone) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // 🔹 Lắng nghe sự kiện từ MyFeedback để cập nhật số chuông
  useEffect(() => {
    const handleFeedbackSeen = () => {
      fetchNotifications(); // ✅ Đồng bộ lại số thông báo
    };
    window.addEventListener("feedbackSeen", handleFeedbackSeen);
    return () => {
      window.removeEventListener("feedbackSeen", handleFeedbackSeen);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(event.target)
      ) {
        setMoreDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 Kiểm tra định kỳ sự thay đổi trong localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      if (updatedUser?.lastFeedbackCheck !== user?.lastFeedbackCheck) {
        setUser(updatedUser);
        fetchNotifications();
      }
    }, 3000); // kiểm tra mỗi 3 giây

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markFeedbackAsSeen = async () => {
    try {
      // Mark Writing feedback as seen
      const res = await fetch(apiPath("writing/list"));
      const allSubs = await res.json();
      const mySubs = allSubs.filter(
        (sub) =>
          sub.userPhone === user.phone && sub.feedback && !sub.feedbackSeen
      );
      const writingUnseenIds = mySubs.map((sub) => sub.id);

      if (writingUnseenIds.length > 0) {
        await fetch(apiPath("writing/mark-feedback-seen"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: writingUnseenIds }),
        });
      }

      // Mark Reading feedback as seen
      try {
        const readingRes = await fetch(apiPath(`reading-submissions/user/${user.phone}`));
        if (readingRes.ok) {
          const readingSubs = await readingRes.json();
          const readingUnseenIds = readingSubs
            .filter((sub) => sub.feedback && !sub.feedbackSeen)
            .map((sub) => sub.id);

          if (readingUnseenIds.length > 0) {
            await fetch(apiPath("reading-submissions/mark-feedback-seen"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: readingUnseenIds }),
            });
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi đánh dấu Reading đã xem:", err);
      }

      // Mark Cambridge feedback as seen
      try {
        const camRes = await fetch(apiPath(`cambridge/submissions/user/${user.phone}`));
        if (camRes.ok) {
          const camSubs = await camRes.json();
          const camUnseenIds = (Array.isArray(camSubs) ? camSubs : [])
            .filter((sub) => sub.feedback && !sub.feedbackSeen)
            .map((sub) => sub.id);

          if (camUnseenIds.length > 0) {
            await fetch(apiPath("cambridge/submissions/mark-feedback-seen"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: user.phone, ids: camUnseenIds }),
            });
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi đánh dấu Cambridge đã xem:", err);
      }

      setWritingFeedbackCount(0);
      setReadingFeedbackCount(0);
      setCambridgeFeedbackCount(0);
    } catch (err) {
      console.error("❌ Lỗi khi đánh dấu đã xem nhận xét:", err);
    }
  };

  const handleNotificationClick = async () => {
    try {
      await markFeedbackAsSeen();
      await fetchNotifications();
      navigate("/my-feedback");
    } catch (err) {
      console.error("❌ Lỗi khi xử lý thông báo:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const feedbackCount = writingFeedbackCount + readingFeedbackCount + cambridgeFeedbackCount;
  const totalNotifications = feedbackCount + newTestCount;

  return (
    <nav className="studentNavbar">
      <div className="studentNavbar__left">
        <Link to="/select-test" className="studentNavbar__logoLink" title="Danh sách đề">
          <img
            src={hostPath("uploads/staredu.jpg")}
            alt="Logo"
            className="studentNavbar__logo"
          />
        </Link>
        <Link to="/select-test" className="studentNavbar__link" title="IELTS">
          <span className="studentNavbar__icon">📚</span>
          <span className="studentNavbar__label">IELTS</span>
        </Link>
        <Link to="/cambridge" className="studentNavbar__link" title="Orange">
          <span className="studentNavbar__icon">🍊</span>
          <span className="studentNavbar__label">Orange</span>
        </Link>

        <Link to="/my-feedback" className="studentNavbar__link studentNavbar__link--desktop" title="Xem nhận xét">
          <span className="studentNavbar__icon">📄</span>
          <span className="studentNavbar__label">Xem nhận xét</span>
        </Link>

        <div className="studentNavbar__more" ref={moreDropdownRef}>
          <span
            className="studentNavbar__moreToggle"
            onClick={() => setMoreDropdownVisible((prev) => !prev)}
            title="Thêm"
          >
            <span className="studentNavbar__icon">⋯</span>
            <span className="studentNavbar__label">Thêm</span>
          </span>
          {moreDropdownVisible && (
            <div className="studentNavbar__menu">
              <Link
                to="/select-test"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                📚 IELTS
              </Link>
              <Link
                to="/cambridge"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                🍊 Orange
              </Link>
              <Link
                to="/my-feedback"
                className="studentNavbar__menuItem"
                onClick={() => setMoreDropdownVisible(false)}
              >
                📄 Xem nhận xét
              </Link>
            </div>
          )}
        </div>

        <div
          className={
            totalNotifications > 0
              ? "studentNavbar__bell studentNavbar__bell--shake"
              : "studentNavbar__bell"
          }
          onClick={handleNotificationClick}
          title="Thông báo mới"
        >
          🔔
          {totalNotifications > 0 && (
            <span className="studentNavbar__badge">
              {totalNotifications}
            </span>
          )}
        </div>
      </div>

      <div className="studentNavbar__right">
        <span className="studentNavbar__user">👤 {user.name}</span>
        <button
          onClick={handleLogout}
          className="studentNavbar__logout"
          title="Đăng xuất"
        >
          <span className="studentNavbar__icon">🔓</span>
          <span className="studentNavbar__logoutLabel">Đăng xuất</span>
        </button>
      </div>

      <style>
        {`
          @keyframes shake {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(10deg); }
            50% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
            100% { transform: rotate(0deg); }
          }
        `}
      </style>
    </nav>
  );
};

export default StudentNavbar;
