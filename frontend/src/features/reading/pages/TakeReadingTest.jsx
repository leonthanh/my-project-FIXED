import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../../shared/styles/take-test.css";
import { normalizeQuestionType } from "../utils/questionHelpers";
import { apiPath } from "../../../shared/utils/api";

const TakeReadingTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  const [allQuestions, setAllQuestions] = useState([]);
  const [splitPosition, setSplitPosition] = useState(50); // 50% default
  const [isDragging, setIsDragging] = useState(false);

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(apiPath(`reading-tests/${testId}`));
      if (!response.ok) throw new Error("Không tìm thấy đề thi");

      const data = await response.json();
      // Normalize questionType for each question
      const normalizeTest = (t) => {
        if (!t || !Array.isArray(t.passages)) return t;
        return {
          ...t,
          passages: t.passages.map((p) => ({
            ...p,
            sections: p.sections
              ? p.sections.map((s) => ({
                  ...s,
                  questions: s.questions
                    ? s.questions.map((q) => ({
                        ...q,
                        questionType: normalizeQuestionType(
                          q.type || q.questionType || ""
                        ),
                      }))
                    : [],
                }))
              : undefined,
            questions: p.questions
              ? p.questions.map((q) => ({
                  ...q,
                  questionType: normalizeQuestionType(
                    q.type || q.questionType || ""
                  ),
                }))
              : undefined,
          })),
        };
      };
      const normalized = normalizeTest(data);
      setTest(normalized);

      // Flatten all questions into a single array for palette
      const flattened = [];
      const initialAnswers = {};

      data.passages.forEach((passage, pIndex) => {
        if (passage.sections && Array.isArray(passage.sections)) {
          passage.sections.forEach((section, sIndex) => {
            section.questions?.forEach((question, qIndex) => {
              const key = `${pIndex}_${sIndex}_${qIndex}`;
              initialAnswers[key] = "";
              flattened.push({
                ...question,
                key,
                passageIndex: pIndex,
                sectionIndex: sIndex,
                questionIndex: qIndex,
              });
            });
          });
        } else if (passage.questions && Array.isArray(passage.questions)) {
          passage.questions.forEach((question, qIndex) => {
            const key = `${pIndex}_${qIndex}`;
            initialAnswers[key] = "";
            flattened.push({
              ...question,
              key,
              passageIndex: pIndex,
              sectionIndex: null,
              questionIndex: qIndex,
            });
          });
        }
      });

      setAllQuestions(flattened);
      setAnswers(initialAnswers);
    } catch (error) {
      console.error("Error fetching test:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch test on component mount
  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const container = document.querySelector(".split-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      // Limit between 20% and 80%
      if (newPosition >= 20 && newPosition <= 80) {
        setSplitPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const renderQuestionSection = (
    question,
    passageIndex,
    sectionIndex,
    questionIndex
  ) => {
    const key = `${passageIndex}_${sectionIndex}_${questionIndex}`;

    return (
      <div key={key} className="question-section">
        <div className="question-number-title">
          <span className="question-num">{question.questionNumber}.</span>
          {/* Inline combobox for TF/YN types */}
          {normalizeQuestionType(
            question.type || question.questionType || "multiple-choice"
          ) === "true-false-not-given" && (
            <>
              <select
                className={`tfng-select tfng-inline-select ${
                  answers[key] ? "answered" : ""
                }`}
                value={answers[key] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                }
                aria-label="Select True False Not Given"
              >
                <option value="">--- Select ---</option>
                <option value="TRUE">TRUE</option>
                <option value="FALSE">FALSE</option>
                <option value="NOT GIVEN">NOT GIVEN</option>
              </select>
              <span
                className={`tfng-selected-badge ${
                  answers[key] === "TRUE"
                    ? "true"
                    : answers[key] === "FALSE"
                    ? "false"
                    : answers[key] === "NOT GIVEN"
                    ? "not-given"
                    : ""
                }`}
              >
                {answers[key] === "TRUE"
                  ? "✓"
                  : answers[key] === "FALSE"
                  ? "✗"
                  : answers[key] === "NOT GIVEN"
                  ? "?"
                  : ""}
              </span>
              <span
                className="question-text-inline"
                dangerouslySetInnerHTML={{ __html: question.questionText }}
              />
            </>
          )}

          {normalizeQuestionType(
            question.type || question.questionType || "multiple-choice"
          ) === "yes-no-not-given" && (
            <>
              <select
                className={`tfng-select tfng-inline-select ${
                  answers[key] ? "answered" : ""
                }`}
                value={answers[key] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                }
                aria-label="Select Yes No Not Given"
              >
                <option value="">--- Select ---</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
                <option value="NOT GIVEN">NOT GIVEN</option>
              </select>
              <span
                className={`tfng-selected-badge ${
                  answers[key] === "YES"
                    ? "true"
                    : answers[key] === "NO"
                    ? "false"
                    : answers[key] === "NOT GIVEN"
                    ? "not-given"
                    : ""
                }`}
              >
                {answers[key] === "YES"
                  ? "✓"
                  : answers[key] === "NO"
                  ? "✗"
                  : answers[key] === "NOT GIVEN"
                  ? "?"
                  : ""}
              </span>
              <span
                className="question-text-inline"
                dangerouslySetInnerHTML={{ __html: question.questionText }}
              />
            </>
          )}
        </div>

        <div className="question-input-area">
          {question.questionType === "multiple-choice" && (
            <div className="options-group">
              {question.options?.map((option, idx) => (
                <label key={idx} className="option-label">
                  <input
                    type="radio"
                    name={key}
                    value={option}
                    checked={answers[key] === option}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          )}

          {(question.questionType === "fill-in-the-blanks" ||
            question.questionType === "short-answer") && (
            <input
              type="text"
              className="text-input"
              value={answers[key] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder="Type your answer here"
            />
          )}

          {question.questionType === "matching" && (
            <div className="matching-group">
              {question.leftItems?.map((leftItem, idx) => (
                <div key={idx} className="matching-item">
                  <label className="left-item">{leftItem}</label>
                  <select
                    className="match-select"
                    value={answers[`${key}_${idx}`] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [`${key}_${idx}`]: e.target.value,
                      }))
                    }
                  >
                    <option value="">---</option>
                    {question.rightItems?.map((rightItem, ridx) => (
                      <option key={ridx} value={rightItem}>
                        {rightItem}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {question.questionType === "paragraph-matching" && (
            <input
              type="text"
              className="text-input"
              value={answers[key] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [key]: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g., A, B, C..."
              maxLength="3"
            />
          )}

          {question.questionType === "sentence-completion" && (
            <div>
              {question.options && (
                <select
                  className="text-input"
                  value={answers[key] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                >
                  <option value="">-- Select --</option>
                  {question.options.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {question.questionType === "paragraph-fill-blanks" && (
            <div>
              {/* Note: paragraph-fill-blanks rendering has been moved to `DoReadingTest.jsx` to consolidate behavior.
                  Keep this placeholder while the project transitions. */}
              <div
                className="paragraph-fill-redirect"
                style={{
                  padding: "10px",
                  backgroundColor: "#fff7e6",
                  borderRadius: 4,
                }}
              >
                <em>
                  Paragraph-fill-blanks are now rendered in the unified student
                  view.
                </em>
              </div>
            </div>
          )}

          {question.questionType === "multi-select" && (
            <div className="options-group">
              {question.options?.map((option, idx) => (
                <label key={idx} className="option-label">
                  <input
                    type="checkbox"
                    checked={(answers[key] || "").split(",").includes(option)}
                    onChange={(e) => {
                      const current = (answers[key] || "")
                        .split(",")
                        .filter((x) => x);
                      if (e.target.checked && !current.includes(option)) {
                        setAnswers((prev) => ({
                          ...prev,
                          [key]: [...current, option].join(","),
                        }));
                      } else if (!e.target.checked) {
                        setAnswers((prev) => ({
                          ...prev,
                          [key]: current.filter((x) => x !== option).join(","),
                        }));
                      }
                    }}
                  />
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Prepare submission data
      const submissionData = {
        testId,
        passages: test.passages.map((passage, pIndex) => ({
          passageIndex: pIndex,
          questions: passage.questions.map((question, qIndex) => ({
            questionNumber: question.questionNumber,
            questionText: question.questionText,
            studentAnswer: answers[`${pIndex}_${qIndex}`] || "",
            correctAnswer: question.correctAnswer,
            questionType: question.questionType,
            isCorrect: checkAnswer(question, answers[`${pIndex}_${qIndex}`]),
          })),
        })),
      };

      const response = await fetch(apiPath("reading-submissions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Lỗi khi nộp bài");
      }

      // Calculate score
      let correctCount = 0;
      submissionData.passages.forEach((passage) => {
        passage.questions.forEach((q) => {
          if (q.isCorrect) correctCount++;
        });
      });

      const totalQuestions = submissionData.passages.reduce(
        (sum, p) => sum + p.questions.length,
        0
      );
      const score = Math.round((correctCount / totalQuestions) * 100);

      setResults({
        submissionId: data.submissionId,
        correctCount,
        totalQuestions,
        score,
        details: submissionData.passages,
      });
      setSubmitted(true);
      setMessage("✅ Nộp bài thành công!");
    } catch (error) {
      console.error("Error submitting test:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = (question, studentAnswer) => {
    if (!studentAnswer || !question.correctAnswer) return false;

    const normalize = (str) => str.trim().toLowerCase();

    switch (question.questionType) {
      case "multiple-choice":
        return normalize(studentAnswer) === normalize(question.correctAnswer);
      case "fill-in-the-blanks":
        // Check if student answer is in correct answers (can have multiple)
        const correctAnswers = question.correctAnswer
          .split("|")
          .map((a) => normalize(a));
        return correctAnswers.includes(normalize(studentAnswer));
      case "multi-select":
        // For multi-select, check if all selected answers are correct
        const studentAnswers = studentAnswer
          .split(",")
          .map((a) => normalize(a.trim()));
        const correctMultiAnswers = question.correctAnswer
          .split(",")
          .map((a) => normalize(a.trim()));
        return studentAnswers.every((ans) => correctMultiAnswers.includes(ans));
      case "matching":
        // For matching, compare the answer sets
        return normalize(studentAnswer) === normalize(question.correctAnswer);
      default:
        return false;
    }
  };

  if (loading && !test) {
    return (
      <div className="take-test-container">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: "18px" }}>⏳ Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="take-test-container">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#e74c3c", fontSize: "16px" }}>
            {message || "❌ Test not found"}
          </p>
        </div>
      </div>
    );
  }

  if (submitted && results) {
    return (
      <div className="take-test-container">
        <div className="results-container">
          <div className="results-header">
            <h1>📊 Test Results</h1>
          </div>

          <div className="results-score-box">
            <div className="score-circle">
              <div className="score-number">{results.score}</div>
              <div className="score-label">%</div>
            </div>
            <div className="score-details">
              <p>
                <strong>
                  {results.correctCount}/{results.totalQuestions}
                </strong>{" "}
                correct
              </p>
              <p className="submission-id">
                Submission ID: {results.submissionId}
              </p>
            </div>
          </div>

          <h3 style={{ marginTop: "40px", color: "#0e276f" }}>
            Answer Details:
          </h3>
          {results.details.map((passage, pIndex) => (
            <div key={pIndex} style={{ marginBottom: "30px" }}>
              <h4 style={{ color: "#0e276f" }}>
                {test.passages[pIndex].passageTitle || `Passage ${pIndex + 1}`}
              </h4>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Correct Answer</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {passage.questions.map((q, qIndex) => (
                    <tr
                      key={qIndex}
                      className={q.isCorrect ? "correct" : "incorrect"}
                    >
                      <td>{q.questionNumber}</td>
                      <td>{q.studentAnswer || "—"}</td>
                      <td>{q.correctAnswer}</td>
                      <td className="result-cell">
                        {q.isCorrect ? "✅" : "❌"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div
            style={{
              textAlign: "center",
              marginTop: "40px",
              marginBottom: "40px",
            }}
          >
            <button
              onClick={() => navigate("/student-dashboard")}
              className="btn-primary"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPassage = test.passages[currentPassageIndex];
  const questionsInPassage = currentPassage.sections
    ? currentPassage.sections.reduce(
        (sum, s) => sum + (s.questions?.length || 0),
        0
      )
    : currentPassage.questions?.length || 0;

  return (
    <div className="take-test-container">
      {/* Header */}
      <header className="take-test-header">
        <div className="header-left">
          <h1 className="test-title">{test.title || "Reading Test"}</h1>
        </div>
        <div className="header-right">
          <div className="timer-display">
            <span className="timer-icon">⏱️</span>
            <span
              className={`timer-text ${timeRemaining < 300 ? "warning" : ""}`}
            >
              {formatTime(timeRemaining)} remaining
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`btn-submit ${loading ? "disabled" : ""}`}
          >
            <span>📤</span> Submit
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="take-test-body">
        <div className="split-container">
          {/* Left Panel - Passage */}
          <section
            className="split-panel left-panel"
            style={{ flexBasis: `${splitPosition}%` }}
          >
            <div className="passage-content">
              <div className="passage-header">
                <h2 className="passage-title">
                  Passage {currentPassageIndex + 1}:{" "}
                  {currentPassage.passageTitle ||
                    `Passage ${currentPassageIndex + 1}`}
                </h2>
                <p className="passage-meta">
                  {questionsInPassage} questions about this passage
                </p>
              </div>

              {currentPassage.sectionImage && (
                <div className="passage-image">
                  {typeof currentPassage.sectionImage === "string" &&
                  currentPassage.sectionImage.startsWith("http") ? (
                    <img src={currentPassage.sectionImage} alt="Passage" />
                  ) : currentPassage.sectionImage instanceof File ||
                    currentPassage.sectionImage instanceof Blob ? (
                    <img
                      src={URL.createObjectURL(currentPassage.sectionImage)}
                      alt="Passage"
                    />
                  ) : null}
                </div>
              )}

              <div className="passage-text">
                <div
                  dangerouslySetInnerHTML={{
                    __html: currentPassage.passageText,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Divider */}
          <div
            className="split-divider"
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? "col-resize" : "col-resize" }}
          ></div>

          {/* Right Panel - Questions */}
          <section
            className="split-panel right-panel"
            style={{ flexBasis: `${100 - splitPosition}%` }}
          >
            <div className="questions-content">
              <div className="questions-header">
                <h2 className="questions-title">Questions</h2>
              </div>

              <div className="questions-scroll">
                {currentPassage.sections ? (
                  // New structure: sections with questions
                  currentPassage.sections.map((section, sIndex) => (
                    <div key={sIndex} className="question-section-group">
                      {section.sectionTitle && (
                        <h4 className="section-title">
                          {section.sectionTitle}
                        </h4>
                      )}
                      {section.sectionInstruction && (
                        <div className="section-instruction">
                          <em
                            dangerouslySetInnerHTML={{
                              __html: section.sectionInstruction,
                            }}
                          />
                        </div>
                      )}
                      <div className="questions-list">
                        {section.questions?.map((question, qIndex) =>
                          renderQuestionSection(
                            question,
                            currentPassageIndex,
                            sIndex,
                            qIndex
                          )
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Old structure: flat questions
                  <div className="questions-list">
                    {currentPassage.questions?.map((question, qIndex) =>
                      renderQuestionSection(
                        question,
                        currentPassageIndex,
                        null,
                        qIndex
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Navigation & Question Palette */}
      <footer className="take-test-footer">
        <div className="passage-navigation">
          <button
            onClick={() =>
              setCurrentPassageIndex((prev) => Math.max(0, prev - 1))
            }
            disabled={currentPassageIndex === 0}
            className="nav-btn"
          >
            ← Previous Passage
          </button>
          <span className="passage-counter">
            Passage {currentPassageIndex + 1} of {test.passages.length}
          </span>
          <button
            onClick={() =>
              setCurrentPassageIndex((prev) =>
                Math.min(test.passages.length - 1, prev + 1)
              )
            }
            disabled={currentPassageIndex === test.passages.length - 1}
            className="nav-btn"
          >
            Next Passage →
          </button>
        </div>

        {/* Question Palette */}
        <div className="question-palette">
          <div className="palette-header">
            <h4>Question Progress</h4>
            <span className="progress-stat">
              {Object.values(answers).filter((a) => a).length} /{" "}
              {allQuestions.length} answered
            </span>
          </div>
          <div className="palette-grid">
            {allQuestions.map((q, idx) => {
              const isAnswered = !!answers[q.key];
              const inCurrentPassage = q.passageIndex === currentPassageIndex;

              return (
                <button
                  key={idx}
                  className={`palette-item ${
                    isAnswered ? "answered" : "unanswered"
                  } ${inCurrentPassage ? "current" : ""}`}
                  title={`Question ${q.questionNumber}`}
                  onClick={() => {
                    if (q.passageIndex !== currentPassageIndex) {
                      setCurrentPassageIndex(q.passageIndex);
                    }
                  }}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      {/* Status Message */}
      {message && (
        <div
          className={`status-message ${
            message.includes("❌") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default TakeReadingTest;
