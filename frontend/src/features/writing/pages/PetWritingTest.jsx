import React, { useCallback, useEffect, useRef, useState } from "react";
import Split from "react-split";
import { apiPath, hostPath } from "../../../shared/utils/api";
import "./PetWritingTest.css";

const DURATION_SECONDS = 45 * 60;

const PetWritingTest = () => {
  const [task1Answer, setTask1Answer] = useState(
    localStorage.getItem("pet_writing_task1") || ""
  );
  const [task2Answer2, setTask2Answer2] = useState(
    localStorage.getItem("pet_writing_task2_q2") || ""
  );
  const [task2Answer3, setTask2Answer3] = useState(
    localStorage.getItem("pet_writing_task2_q3") || ""
  );
  const [selectedQuestion, setSelectedQuestion] = useState(
    localStorage.getItem("pet_writing_selected_q") || "2"
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("pet_writing_timeLeft");
    if (!saved) return DURATION_SECONDS;
    return Math.min(parseInt(saved, 10), DURATION_SECONDS);
  });
  const [endAt, setEndAt] = useState(() => {
    const saved = localStorage.getItem("pet_writing_endAt");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [started, setStarted] = useState(
    localStorage.getItem("pet_writing_started") === "true"
  );
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [activePanel, setActivePanel] = useState("part1");
  const [testData, setTestData] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  );

  const normalizeHtmlImages = (html) => {
    if (!html) return "";
    return html.replace(
      /src=(['"])(\/?uploads\/[^'\"]+)\1/g,
      (_match, quote, path) => `src=${quote}${hostPath(path)}${quote}`
    );
  };

  const user = JSON.parse(localStorage.getItem("user"));
  const selectedTestId =
    localStorage.getItem("selectedPetWritingTestId") ||
    localStorage.getItem("selectedTestId");

  useEffect(() => {
    localStorage.setItem("pet_writing_task1", task1Answer);
  }, [task1Answer]);

  useEffect(() => {
    localStorage.setItem("pet_writing_task2_q2", task2Answer2);
  }, [task2Answer2]);

  useEffect(() => {
    localStorage.setItem("pet_writing_task2_q3", task2Answer3);
  }, [task2Answer3]);

  useEffect(() => {
    localStorage.setItem("pet_writing_selected_q", selectedQuestion);
  }, [selectedQuestion]);

  useEffect(() => {
    localStorage.setItem("pet_writing_timeLeft", timeLeft.toString());
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem("pet_writing_started", started.toString());
  }, [started]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      setMessage("Cannot find selected test.");
      return;
    }

    const fetchTestData = async () => {
      try {
        const res = await fetch(apiPath(`writing-tests/detail/${selectedTestId}`));
        if (!res.ok) {
          throw new Error(`Error ${res.status}: Test not found.`);
        }
        const data = await res.json();
        setTestData(data);
      } catch (err) {
        console.error("Failed to load PET writing test:", err);
        setMessage("Cannot load the test. Please select again.");
      }
    };

    fetchTestData();
  }, [selectedTestId]);

  useEffect(() => {
    if (testData && !started) {
      setStarted(true);
    }
  }, [testData, started]);

  // persist endAt for resume
  useEffect(() => {
    if (endAt) {
      localStorage.setItem("pet_writing_endAt", endAt.toString());
    } else {
      localStorage.removeItem("pet_writing_endAt");
    }
  }, [endAt]);

  useEffect(() => {
    if (started && !endAt) {
      const nextEndAt = Date.now() + timeLeft * 1000;
      setEndAt(nextEndAt);
    }
  }, [started, endAt, timeLeft]);

  const getSelectedAnswer = () => {
    const chosen = selectedQuestion === "3" ? "3" : "2";
    const primary = chosen === "2" ? task2Answer2 : task2Answer3;
    if (primary.trim()) {
      return { answer: primary, chosen };
    }
    if (task2Answer2.trim() && !task2Answer3.trim()) {
      return { answer: task2Answer2, chosen: "2" };
    }
    if (task2Answer3.trim() && !task2Answer2.trim()) {
      return { answer: task2Answer3, chosen: "3" };
    }
    return { answer: "", chosen };
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedTestId) {
      setMessage("Cannot find test ID.");
      return;
    }

    const { answer } = getSelectedAnswer();
    if (!task1Answer.trim() || !answer.trim()) {
      setMessage("Please complete Part 1 and Part 2 before submitting.");
      return;
    }

    setSubmitted(true);

    try {
      const res = await fetch(apiPath("writing/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1: task1Answer,
          task2: answer,
          timeLeft,
          user,
          testId: parseInt(selectedTestId, 10),
        }),
      });

      const data = await res.json();
      setMessage(data.message || "Submission complete.");

      localStorage.removeItem("pet_writing_task1");
      localStorage.removeItem("pet_writing_task2_q2");
      localStorage.removeItem("pet_writing_task2_q3");
      localStorage.removeItem("pet_writing_selected_q");
      localStorage.removeItem("pet_writing_timeLeft");
      localStorage.removeItem("pet_writing_started");
      localStorage.removeItem("pet_writing_endAt");
      localStorage.removeItem("selectedPetWritingTestId");
      localStorage.removeItem("selectedTestId");
      localStorage.removeItem("user");

      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      console.error("Submit error:", err);
      setMessage("Failed to submit. Please try again.");
      setSubmitted(false);
    }
  }, [selectedTestId, task1Answer, timeLeft, user, task2Answer2, task2Answer3, selectedQuestion]);

  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (!started || submitted || !endAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        submitRef.current();
      }
    };

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [started, submitted, endAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const countWords = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const renderPrompt = () => {
    if (!testData) return null;

    if (activePanel === "part1") {
      return (
        <div className="pet-writing-prompt">
          <div className="pet-writing-section-label">Part 1</div>
          <p className="pet-writing-instruction">
            You must answer this question. Write about 100 words.
          </p>
          <div
            className="pet-writing-rich"
            dangerouslySetInnerHTML={{
              __html: normalizeHtmlImages(testData.task1 || ""),
            }}
          />
          {testData.task1Image && (
            <div className="pet-writing-image-frame">
              <img
                src={hostPath(testData.task1Image)}
                alt="Task visual"
                className="pet-writing-image"
              />
            </div>
          )}
        </div>
      );
    }

    const isQuestion2 = activePanel === "q2";
    const questionHtml = isQuestion2
      ? testData.part2Question2
      : testData.part2Question3;

    return (
      <div className="pet-writing-prompt">
        <div className="pet-writing-section-label">Part 2</div>
        <p className="pet-writing-instruction">
          Answer one of the questions (2 or 3). Write about 100 words.
        </p>
        <div className="pet-writing-question-chip">
          Question {isQuestion2 ? "2" : "3"}
        </div>
        <div
          className="pet-writing-rich"
          dangerouslySetInnerHTML={{
            __html: normalizeHtmlImages(questionHtml || ""),
          }}
        />
      </div>
    );
  };

  const renderAnswerArea = () => {
    if (activePanel === "part1") {
      return (
        <div className="pet-writing-answer-area">
          <div className="pet-writing-answer-header">
            <span>Part 1 response</span>
            <span className="pet-writing-word-count">
              {countWords(task1Answer)} words
            </span>
          </div>
          <textarea
            value={task1Answer}
            onChange={(e) => setTask1Answer(e.target.value)}
            className="pet-writing-textarea"
            placeholder="Write your answer here..."
          />
        </div>
      );
    }

    const isQuestion2 = activePanel === "q2";
    const activeAnswer = isQuestion2 ? task2Answer2 : task2Answer3;

    return (
      <div className="pet-writing-answer-area">
        <div className="pet-writing-answer-header">
          <span>Part 2 response (Question {isQuestion2 ? "2" : "3"})</span>
          <span className="pet-writing-word-count">
            {countWords(activeAnswer)} words
          </span>
        </div>
        <textarea
          value={activeAnswer}
          onChange={(e) =>
            isQuestion2
              ? setTask2Answer2(e.target.value)
              : setTask2Answer3(e.target.value)
          }
          className="pet-writing-textarea"
          placeholder="Write your answer here..."
        />
        <div className="pet-writing-choice-hint">
          Selected: Question {isQuestion2 ? "2" : "3"}
        </div>
      </div>
    );
  };

  const layout = isMobile ? "vertical" : "horizontal";

  return (
    <div className="pet-writing-page">
      <header className="pet-writing-header">
        <div className="pet-writing-header-left">
          <div className="pet-writing-title">
            <span className="pet-writing-kicker">B1 Preliminary</span>
            <h1>PET Writing</h1>
          </div>
          <div className="pet-writing-meta">
            <span>Time allowed: 45 minutes</span>
            <span>
              Test {testData?.index || ""}
              {testData?.classCode ? ` · ${testData.classCode}` : ""}
            </span>
          </div>
        </div>
        <div className="pet-writing-header-right">
          <div className="pet-writing-timer">
            <span className="pet-writing-timer-label">Time left</span>
            <span className="pet-writing-timer-value">
              {formatTime(timeLeft)}
            </span>
          </div>
          <button
            className="pet-writing-submit"
            onClick={handleSubmit}
            disabled={submitted}
          >
            {submitted ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      <div className="pet-writing-body">
        <div className="pet-writing-panel">
          <div className="pet-writing-tasklist">
            <button
              className={`pet-writing-taskbtn ${
                activePanel === "part1" ? "active" : ""
              }`}
              onClick={() => setActivePanel("part1")}
            >
              Part 1
            </button>
            <button
              className={`pet-writing-taskbtn ${
                activePanel === "q2" ? "active" : ""
              }`}
              onClick={() => {
                setActivePanel("q2");
                setSelectedQuestion("2");
              }}
            >
              Question 2
            </button>
            <button
              className={`pet-writing-taskbtn ${
                activePanel === "q3" ? "active" : ""
              }`}
              onClick={() => {
                setActivePanel("q3");
                setSelectedQuestion("3");
              }}
            >
              Question 3
            </button>
          </div>

          <div className="pet-writing-split">
            {isMobile ? (
              <>
                <div className="pet-writing-pane">{renderPrompt()}</div>
                <div className="pet-writing-pane">{renderAnswerArea()}</div>
              </>
            ) : (
              <Split
                className="split"
                sizes={[48, 52]}
                minSize={[260, 320]}
                gutterSize={12}
                direction={layout}
              >
                <div className="pet-writing-pane">{renderPrompt()}</div>
                <div className="pet-writing-pane">{renderAnswerArea()}</div>
              </Split>
            )}
          </div>
        </div>
      </div>

      {message && <div className="pet-writing-toast">{message}</div>}
    </div>
  );
};

export default PetWritingTest;
