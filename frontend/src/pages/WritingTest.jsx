import React, { useState, useEffect, useCallback } from "react";
import Split from "react-split";

const WritingTest = () => {
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
  const API_URL = process.env.REACT_APP_API_URL;

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
          `${API_URL}/api/writing-tests/detail/${selectedTestId}`
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
  }, [selectedTestId, API_URL]);

  const handleSubmit = useCallback(async () => {
    const numericTestId = parseInt(selectedTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) {
      setMessage("❌ Không tìm thấy mã đề để nộp.");
      return;
    }

    setSubmitted(true);

    try {
      const res = await fetch(`${API_URL}/api/writing/submit`, {
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
  }, [task1, task2, timeLeft, user, selectedTestId, API_URL]);

  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  useEffect(() => {
    if (!user || !user.phone) return;

    fetch(`${API_URL}/api/writing/list`)
      .then((res) => res.json())
      .then((list) => {
        const last = list.find((item) => item.user?.phone === user.phone);
        if (last) setFeedback(last.feedback || "");
      })
      .catch((err) => console.error("❌ Lỗi lấy feedback:", err));
  }, [submitted, API_URL, user]);

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

  if (!started) {
    return (
      <div style={{ padding: 50, textAlign: "center" }}>
        <h2>Bắt đầu bài viết IELTS</h2>
        <p>Bạn có 60 phút để làm cả Task 1 và Task 2</p>
        <button
          style={{
            backgroundColor: "#e03",
            border: "none",
            padding: "2%",
            fontSize: "large",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={() => setStarted(true)}
        >
          Bắt đầu làm bài
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: 10,
          background: "#f0f0f0",
          borderBottom: "1px solid #ccc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            ⏳ <b>Thời gian:</b>{" "}
            <span style={{ color: "red" }}>{formatTime(timeLeft)}</span>
            <br />
            👤 {user?.name} — Đề {selectedTestId}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            style={{
              background: "#e03",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: 4,
            }}
          >
            🔓 Đăng xuất
          </button>
        </div>
      </div>

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
                  src={`${API_URL}${testData.task1Image}`}
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
