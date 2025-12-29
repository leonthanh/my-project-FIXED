import React, { useState, useEffect, useCallback } from "react";
import Split from "react-split";
import { apiPath, hostPath } from "../../../shared/utils/api";

// ====== STYLE FOR HEADER & MODAL ======
const writingHeaderStyle = {
  background: "linear-gradient(135deg, #0e276f 0%, #1a3a8f 100%)",
  color: "white",
  padding: "0 16px",
  height: 50,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 10px rgba(14, 39, 111, 0.2)",
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  position: "sticky",
  top: 0,
  zIndex: 100,
};
const writingHeaderLeft = { display: "flex", alignItems: "center", gap: 10 };
const writingHeaderRight = { display: "flex", alignItems: "center", gap: 10 };
const writingBadge = {
  background: "linear-gradient(135deg, #e03 0%, #ff6b6b 100%)",
  padding: "4px 10px",
  borderRadius: 12,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
};
const writingTimer = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(255,255,255,0.15)",
  padding: "0 10px",
  borderRadius: 8,
  backdropFilter: "blur(10px)",
  fontSize: 15,
};
const writingLogoutBtn = {
  background: "#e03",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 15,
};
const progressRingStyle = {
  width: 40,
  height: 40,
  position: "relative",
  marginLeft: 10,
};
const progressTextStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  fontSize: 13,
  lineHeight: 1,
  color: "white",
};

// Modal style
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.35)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const modalBox = {
  background: "linear-gradient(135deg, #6f42c1 0%, #a084e8 100%)",
  color: "white",
  borderRadius: 18,
  boxShadow: "0 8px 32px rgba(111,66,193,0.25)",
  padding: "40px 32px 32px 32px",
  minWidth: 320,
  maxWidth: 400,
  textAlign: "center",
  animation: "fadeIn 0.5s",
};
const modalBtn = {
  background: "#fff",
  color: "#6f42c1",
  border: "none",
  padding: "12px 32px",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 18,
  marginTop: 24,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(111,66,193,0.15)",
  transition: "background 0.2s, color 0.2s",
};
const modalBtnHover = {
  background: "#e0d7fa",
  color: "#4b2e83",
};

const WritingTest = () => {
  // Đặt useState cho btnHover lên đầu function component để không bị gọi conditionally
  const [btnHover, setBtnHover] = useState(false);
  const [task1, setTask1] = useState(
    localStorage.getItem("writing_task1") || ""
  );
  const [task2, setTask2] = useState(
    localStorage.getItem("writing_task2") || ""
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("writing_timeLeft");
    return saved ? parseInt(saved, 10) : 60 * 60;
  });
  const [started, setStarted] = useState(
    localStorage.getItem("writing_started") === "true"
  );
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTask, setActiveTask] = useState("task1");
  const [testData, setTestData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const user = JSON.parse(localStorage.getItem("user"));
  const selectedTestId = localStorage.getItem("selectedTestId");

  useEffect(() => {
    localStorage.setItem("writing_task1", task1);
  }, [task1]);

  useEffect(() => {
    localStorage.setItem("writing_task2", task2);
  }, [task2]);

  useEffect(() => {
    localStorage.setItem("writing_timeLeft", timeLeft.toString());
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem("writing_started", started.toString());
  }, [started]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      setMessage("❌ Không tìm thấy đề thi đã chọn.");
      return;
    }

    const fetchTestData = async () => {
      try {
        const res = await fetch(
          apiPath(`writing-tests/detail/${selectedTestId}`)
        );
        if (!res.ok) {
          throw new Error(`Lỗi ${res.status}: Đề không tồn tại.`);
        }
        const data = await res.json();
        setTestData(data);
      } catch (err) {
        console.error("❌ Lỗi khi tải đề:", err);
        setMessage("❌ Không thể tải đề. Vui lòng quay lại trang chọn đề.");
      }
    };

    fetchTestData();
  }, [selectedTestId]);

  const handleSubmit = useCallback(async () => {
    const numericTestId = parseInt(selectedTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) {
      setMessage("❌ Không tìm thấy mã đề để nộp.");
      return;
    }

    setSubmitted(true);

    try {
      const res = await fetch(apiPath("writing/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1,
          task2,
          timeLeft,
          user,
          testId: numericTestId,
        }),
      });

      const data = await res.json();
      setMessage(data.message || "✅ Đã nộp bài!");

      localStorage.removeItem("writing_task1");
      localStorage.removeItem("writing_task2");
      localStorage.removeItem("writing_timeLeft");
      localStorage.removeItem("writing_started");
      localStorage.removeItem("selectedTestId");
      localStorage.removeItem("user");

      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      console.error("Lỗi nộp bài:", err);
      setMessage("❌ Lỗi khi gửi bài.");
    }
  }, [task1, task2, timeLeft, user, selectedTestId]);

  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft, handleSubmit]);

  useEffect(() => {
    if (!user || !user.phone) return;

    fetch(apiPath("writing/list"))
      .then((res) => res.json())
      .then((list) => {
        const last = list.find((item) => item.user?.phone === user.phone);
        if (last) setFeedback(last.feedback || "");
      })
      .catch((err) => console.error("❌ Lỗi lấy feedback:", err));
  }, [submitted, user]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  if (message && !testData) {
    return <div style={{ padding: 50 }}>{message}</div>;
  }

  if (!testData) return <div style={{ padding: 50 }}>⏳ Đang tải đề...</div>;

  if (submitted) {
    return (
      <div style={{ padding: 50 }}>
        <h2>✅ Bài làm đã nộp</h2>
        <p>{message}</p>

        <div style={{ marginTop: 30 }}>
          <h3>✍️ Task 1:</h3>
          <p
            style={{
              whiteSpace: "pre-line",
              border: "1px solid #ccc",
              padding: 10,
            }}
          >
            {task1}
          </p>
        </div>

        <div style={{ marginTop: 30 }}>
          <h3>✍️ Task 2:</h3>
          <p
            style={{
              whiteSpace: "pre-line",
              border: "1px solid #ccc",
              padding: 10,
            }}
          >
            {task2}
          </p>
        </div>

        {feedback && (
          <div style={{ marginTop: 30 }}>
            <h3>🗒️ Nhận xét từ giáo viên:</h3>
            <p style={{ whiteSpace: "pre-line" }}>{feedback}</p>
          </div>
        )}
      </div>
    );
  }

  // Modal bắt đầu làm bài
  if (!started) {
    return (
      <div style={modalOverlay}>
        <div style={modalBox}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
          <h2 style={{ fontWeight: 700, marginBottom: 10 }}>
            Bắt đầu bài viết IELTS
          </h2>
          <p style={{ fontSize: 16, marginBottom: 18 }}>
            Bạn có <b>60 phút</b> để làm cả Task 1 và Task 2.
            <br />
            Hãy chuẩn bị sẵn sàng trước khi bắt đầu!
          </p>
          <button
            style={btnHover ? { ...modalBtn, ...modalBtnHover } : modalBtn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            onClick={() => setStarted(true)}
          >
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  // Tính progress cho vòng tròn
  const totalWords = countWords(task1) + countWords(task2);
  const minWords = 150 + 250;
  const progress = Math.min(totalWords / minWords, 1);
  // Header đồng bộ với Reading
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={writingHeaderStyle}>
        <div style={writingHeaderLeft}>
          <div style={writingBadge}>IELTS</div>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            IELTS - WRITING TEST
          </span>
        </div>
        <div style={writingHeaderRight}>
          <div style={writingTimer}>
            <span style={{ fontSize: 18, marginRight: 4 }}>⏱️</span>
            <span
              style={{
                fontWeight: 700,
                fontFamily: "Courier New, monospace",
                fontSize: 18,
              }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 13, marginLeft: 6, opacity: 0.7 }}>
              REMAINING
            </span>
          </div>
          {/* Progress Ring giống Reading */}
          <div style={progressRingStyle}>
            <svg viewBox="0 0 36 36" style={{ width: 40, height: 40 }}>
              <path
                style={{
                  fill: "none",
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 3,
                }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                style={{
                  fill: "none",
                  stroke: "#2ecc71",
                  strokeWidth: 3,
                  strokeLinecap: "round",
                }}
                strokeDasharray={`${Math.round(progress * 100)}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div style={progressTextStyle}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {totalWords}
              </span>
              <span style={{ opacity: 0.7, fontSize: 12 }}>/400</span>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            style={writingLogoutBtn}
          >
            🔓 Đăng xuất
          </button>
        </div>
      </header>

      <Split
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction={isMobile ? "vertical" : "horizontal"}
        gutter={() => {
          const gutter = document.createElement("div");
          gutter.style.backgroundColor = "#e03";
          gutter.style.backgroundRepeat = "no-repeat";
          gutter.style.backgroundPosition = "50%";
          return gutter;
        }}
        style={{
          flexGrow: 1,
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div
          style={{
            padding: "20px",
            height: "auto",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
          }}
        >
          {activeTask === "task1" && (
            <>
              <h2>WRITING TASK 1</h2>
              <div dangerouslySetInnerHTML={{ __html: testData.task1 }} />
              {testData.task1Image && (
                <img
                  src={hostPath(testData.task1Image)}
                  alt="Task 1"
                  style={{ maxWidth: "80%" }}
                />
              )}
              <p>
                <i>Write at least 150 words.</i>
              </p>
            </>
          )}

          {activeTask === "task2" && (
            <>
              <h2>WRITING TASK 2</h2>
              <div dangerouslySetInnerHTML={{ __html: testData.task2 }} />
              <p>
                <i>Write at least 250 words.</i>
              </p>
            </>
          )}
        </div>

        <div style={{ padding: 20 }}>
          <h3>
            Your Answer – {activeTask.toUpperCase()} (
            {countWords(activeTask === "task1" ? task1 : task2)} từ)
          </h3>
          <textarea
            rows={25}
            style={{
              width: "100%",
              padding: 10,
              overflow: "auto",
              boxSizing: "border-box",
              fontSize: "18px",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              marginBottom: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            value={activeTask === "task1" ? task1 : task2}
            onChange={(e) => {
              if (activeTask === "task1") setTask1(e.target.value);
              else setTask2(e.target.value);
            }}
          />
        </div>
      </Split>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 10,
          background: "#fafafa",
          borderTop: "1px solid #ccc",
        }}
      >
        <button
          onClick={() => setActiveTask("task1")}
          style={taskBtnStyle(activeTask === "task1")}
        >
          Task 1
        </button>
        <button
          onClick={() => setActiveTask("task2")}
          style={taskBtnStyle(activeTask === "task2")}
        >
          Task 2
        </button>
        <button
          onClick={handleSubmit}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            backgroundColor: "#e03",
            color: "white",
            cursor: "pointer",
          }}
        >
          📩 Submit
        </button>
      </div>
    </div>
  );
};

const taskBtnStyle = (isActive) => ({
  margin: "0 10px",
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  backgroundColor: isActive ? "#0e276f" : "#e0e0e0",
  color: isActive ? "white" : "#333",
  cursor: "pointer",
});

export default WritingTest;
