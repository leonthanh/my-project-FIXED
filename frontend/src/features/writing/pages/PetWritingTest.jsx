import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TestHeader } from "../../../shared/components";
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
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const [questionPick, setQuestionPick] = useState(() => {
    try {
      const raw = localStorage.getItem("pet_writing_question_pick");
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        q2: parsed?.q2 || "UNDECIDED",
        q3: parsed?.q3 || "UNDECIDED",
      };
    } catch (e) {
      return { q2: "UNDECIDED", q3: "UNDECIDED" };
    }
  });

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
    localStorage.setItem("pet_writing_question_pick", JSON.stringify(questionPick));
  }, [questionPick]);

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

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
    if (newLeftWidth >= 25 && newLeftWidth <= 75) {
      setLeftWidth(newLeftWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const getSelectedAnswer = () => {
    const picked = questionPick.q2 === "YES" ? "2" : questionPick.q3 === "YES" ? "3" : null;
    const chosen = picked || (selectedQuestion === "3" ? "3" : "2");
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
      localStorage.removeItem("pet_writing_question_pick");
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

  const countWords = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const steps = ["part1", "q2", "q3"];
  const currentStepIndex = Math.max(0, steps.indexOf(activePanel));
  const part2YesCount = [questionPick.q2, questionPick.q3].filter(
    (value) => value === "YES"
  ).length;
  const part1Answered = task1Answer.trim().length > 0;
  const part2Answered = getSelectedAnswer().answer.trim().length > 0;
  const answeredCount = (part1Answered ? 1 : 0) + (part2Answered ? 1 : 0);
  const totalQuestions = 2;

  const goToStep = (index) => {
    const next = steps[index];
    if (!next) return;
    setActivePanel(next);
    if (next === "q2") setSelectedQuestion("2");
    if (next === "q3") setSelectedQuestion("3");
  };

  const handleQuestionPickChange = (key, value) => {
    setQuestionPick((prev) => {
      const next = { ...prev, [key]: value };
      if (value === "YES") {
        const otherKey = key === "q2" ? "q3" : "q2";
        next[otherKey] = "NO";
        setSelectedQuestion(key === "q2" ? "2" : "3");
      }
      return next;
    });
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
        <div className="QuestionDisplay__questionDisplayWrapper___1n_b0 question-wrapper current numbering-per-interaction wide-and-left-align multiple-inline-gap-match gap-match-multi-interaction-view">
          <div className="QuestionDisplay__question___89pdZ question desktop hidden-title" role="main" dir="ltr">
            <div className="QuestionDisplay__questionBody___ZOMJ7">
              <div className="QuestionDisplay__mainQuestionWrapper___3P0CZ" role="group">
                <div className="QTIAssessmentItem__QTIAssessmentItemWrapper___3W6-C">
                  <div className="QTIAssessmentItem__QTIAssessmentItem___cfGlV preRender" lang="en-US">
                    <div className="pet-writing-answer-header">
                      <span>Part 1 response</span>
                      <span className="WordCountText__wordCountText___3QyIr">
                        Words: {countWords(task1Answer)}
                      </span>
                    </div>
                    <div className="interaction-container">
                      <div className="interaction allowed-break-inside">
                        <div id="scorableItem-pet-writing-1">
                          <textarea
                            aria-label="You are currently on the text editor. The text will be saved automatically"
                            className="plainTextWrapper__plainText____1GRn"
                            rows={17}
                            spellCheck={false}
                            value={task1Answer}
                            onChange={(e) => setTask1Answer(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="QuestionDisplay__footer___1uARt"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const isQuestion2 = activePanel === "q2";
    const activeAnswer = isQuestion2 ? task2Answer2 : task2Answer3;

    return (
      <div className="QuestionDisplay__questionDisplayWrapper___1n_b0 question-wrapper current numbering-per-interaction wide-and-left-align multiple-inline-gap-match gap-match-multi-interaction-view">
        <div className="QuestionDisplay__question___89pdZ question desktop hidden-title" role="main" dir="ltr">
          <div className="QuestionDisplay__questionBody___ZOMJ7">
            <div className="QuestionDisplay__mainQuestionWrapper___3P0CZ" role="group">
              <div className="QTIAssessmentItem__QTIAssessmentItemWrapper___3W6-C">
                <div className="QTIAssessmentItem__QTIAssessmentItem___cfGlV preRender" lang="en-US">
                  <div className="QuestionDisplay__questionPickContent___2hu68">
                    <div className="QuestionDisplay__questionPickStatus___oaKDN">
                      <p>Answering this question?</p>
                      <span>{part2YesCount}</span> of <span>1 </span>questions selected.
                    </div>
                    <div className="QuestionDisplay__questionPickSelectorWrapper___3DKva">
                      <select
                        className="questionPickSelector"
                        value={isQuestion2 ? questionPick.q2 : questionPick.q3}
                        onChange={(e) =>
                          handleQuestionPickChange(isQuestion2 ? "q2" : "q3", e.target.value)
                        }
                      >
                        <option value="YES">Yes</option>
                        <option value="NO">No</option>
                        <option value="UNDECIDED">Undecided</option>
                      </select>
                      <i className="fa fa-2x fa-question status-icon" aria-hidden="true"></i>
                    </div>
                  </div>

                  <div className="pet-writing-answer-header">
                    <span>Part 2 response (Question {isQuestion2 ? "2" : "3"})</span>
                    <span className="WordCountText__wordCountText___3QyIr">
                      Words: {countWords(activeAnswer)}
                    </span>
                  </div>
                  <div className="interaction-container">
                    <div className="interaction allowed-break-inside">
                      <div id={`scorableItem-pet-writing-${isQuestion2 ? "2" : "3"}`}>
                        <textarea
                          aria-label="You are currently on the text editor. The text will be saved automatically"
                          className="plainTextWrapper__plainText____1GRn"
                          rows={17}
                          spellCheck={false}
                          value={activeAnswer}
                          onChange={(e) =>
                            isQuestion2
                              ? setTask2Answer2(e.target.value)
                              : setTask2Answer3(e.target.value)
                          }
                        />
                        <div>
                          <span className="WordCountText__wordCountText___3QyIr">
                            Words: {countWords(activeAnswer)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="QuestionDisplay__footer___1uARt"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pet-writing-page cambridge-test-container">
      <TestHeader
        title="PET Writing"
        classCode={testData?.classCode}
        teacherName={testData?.teacherName}
        timeRemaining={timeLeft}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onSubmit={handleSubmit}
        submitted={submitted}
        examType="PET"
        timerWarning={timeLeft > 0 && timeLeft <= 300}
        timerCritical={timeLeft > 0 && timeLeft <= 60}
      />

      <div className="cambridge-main-content pet-writing-main" ref={containerRef}>
        <div
          className="cambridge-passage-column pet-writing-passage"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="pet-writing-left-content">
            {renderPrompt()}
          </div>
        </div>

        {!isMobile && (
          <div
            className="cambridge-divider"
            onMouseDown={handleMouseDown}
            style={{ left: `${leftWidth}%` }}
          >
            <div className="cambridge-resize-handle">
              <i className="fa fa-arrows-h"></i>
            </div>
          </div>
        )}

        <div
          className="cambridge-questions-column pet-writing-questions"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {renderAnswerArea()}
        </div>
      </div>

      <footer className="footer__footer___1NlzQ pet-writing-footer">
        <div
          className="footer__navButtons___Gtvxu"
          role="navigation"
          aria-label="Previous / next question"
        >
          <button
            className="footer__previousBtn___3pfYh footer__arrowIconBtn___3AiJS"
            aria-label="Previous"
            onClick={() => goToStep(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
          >
            <i className="fa fa-arrow-left" aria-hidden="true"></i>
          </button>
          <button
            className="footer__promotedNextBtn___Qf9LU footer__arrowIconBtn___3AiJS"
            aria-label="Next"
            onClick={() => goToStep(currentStepIndex + 1)}
            disabled={currentStepIndex === steps.length - 1}
          >
            <i className="fa fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>

        <nav className="nav-row perScorableItem" aria-label="Questions">
          <div className="footer__questionWrapper___1tZ46 single" role="tablist">
            <button
              role="tab"
              className="footer__questionNo___3WNct"
              tabIndex={activePanel === "part1" ? 0 : -1}
              onClick={() => goToStep(0)}
            >
              <span>
                <span aria-hidden="true" className="section-prefix">Part </span>
                <span className="sectionNr" aria-hidden="true">1</span>
                <span className="attemptedCount" aria-hidden="true">
                  {part1Answered ? 1 : 0} of 1
                </span>
              </span>
            </button>
          </div>

          <div
            className={`footer__questionWrapper___1tZ46 ${
              activePanel !== "part1" ? "selected" : ""
            } multiple`}
            role="tablist"
          >
            <button
              role="tab"
              className="footer__questionNo___3WNct"
              tabIndex={activePanel !== "part1" ? 0 : -1}
              onClick={() => goToStep(1)}
            >
              <span>
                <span aria-hidden="true" className="section-prefix">Part </span>
                <span className="sectionNr" aria-hidden="true">2</span>
              </span>
            </button>
            <div className="footer__subquestionWrapper___9GgoP">
              {[2, 3].map((num) => (
                <button
                  key={num}
                  className={`subQuestion scorable-item ${
                    activePanel === `q${num}` ? "active" : ""
                  }`}
                  tabIndex={0}
                  onClick={() => goToStep(num === 2 ? 1 : 2)}
                >
                  <span aria-hidden="true">{num}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            id="deliver-button"
            aria-label="Review your answers"
            className="footer__deliverButton___3FM07"
            onClick={handleSubmit}
          >
            <i className="fa fa fa-check" aria-hidden="true"></i>
          </button>
        </nav>
      </footer>

      {message && <div className="pet-writing-toast">{message}</div>}
    </div>
  );
};

export default PetWritingTest;
