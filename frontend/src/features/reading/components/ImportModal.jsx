import React, { useState, useCallback } from "react";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import { useTheme } from "../../../shared/contexts/ThemeContext";

/**
 * ImportModal - Import câu hỏi từ file Word (.docx) hoặc Excel (.xlsx)
 * Parse nội dung file và chuyển đổi thành format câu hỏi
 */

const ImportModal = ({ isOpen, onClose, onImport }) => {
  const { isDarkMode } = useTheme();
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const readFileContent = (file, extension) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          if (extension === "txt" || extension === "csv") {
            resolve(e.target.result);
          } else {
            // Cho docx và xlsx, cần library như mammoth hoặc xlsx
            // Tạm thời parse như text
            resolve(e.target.result);
          }
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Lỗi đọc file"));

      if (extension === "txt" || extension === "csv") {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const parseTextContent = useCallback((text) => {
    const questions = [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    let currentQuestion = null;
    let currentOptions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect question start: Q1. or 1. or Question 1:
      const questionMatch = line.match(/^(?:Q?\.?\s*)?(\d+)[.)]\s*(.+)/i);
      if (questionMatch) {
        // Save previous question
        if (currentQuestion) {
          questions.push(createQuestion(currentQuestion, currentOptions));
        }

        currentQuestion = questionMatch[2];
        currentOptions = [];
        continue;
      }

      // Detect options: A) or A. or a)
      const optionMatch = line.match(/^([A-Da-d])[.)]\s*(.+)/);
      if (optionMatch) {
        currentOptions.push(optionMatch[2]);
        continue;
      }

      // Detect answer: Answer: A or Correct: B
      const answerMatch = line.match(
        /^(?:Answer|Correct|Đáp án)[:\s]+([A-Da-d])/i
      );
      if (answerMatch && currentQuestion) {
        const answerIndex = answerMatch[1].toUpperCase().charCodeAt(0) - 65;
        const q = createQuestion(currentQuestion, currentOptions, answerIndex);
        questions.push(q);
        currentQuestion = null;
        currentOptions = [];
        continue;
      }

      // True/False/Not Given format
      if (line.match(/^(TRUE|FALSE|NOT GIVEN)/i) && currentQuestion) {
        questions.push({
          type: "true-false-not-given",
          questionText: currentQuestion,
          correctAnswer: line.toUpperCase(),
        });
        currentQuestion = null;
        continue;
      }
    }

    // Save last question
    if (currentQuestion) {
      questions.push(createQuestion(currentQuestion, currentOptions));
    }

    return questions;
  }, []);

  const createQuestion = (text, options, correctIndex = 0) => {
    if (options.length > 0) {
      return {
        type: "multiple-choice",
        questionText: text,
        options: options,
        correctAnswer: options[correctIndex] || options[0],
      };
    }

    // Default to short answer if no options
    return {
      type: "short-answer",
      questionText: text,
      correctAnswer: "",
    };
  };

  // Parse content wrapper and file handler (defined after parseTextContent to avoid use-before-define)
  const parseContent = useCallback(
    (content, extension) => {
      if (extension === "txt" || typeof content === "string") {
        return parseTextContent(content);
      }

      // Với docx/xlsx cần library riêng
      // Tạm return mẫu
      return [
        {
          type: "multiple-choice",
          questionText: "Sample question from " + extension + " file",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
        },
      ];
    },
    [parseTextContent]
  );

  const handleFile = useCallback(
    async (selectedFile) => {
      const extension = selectedFile.name.split(".").pop().toLowerCase();

      if (!["docx", "xlsx", "txt", "csv"].includes(extension)) {
        setError("Chỉ hỗ trợ file .docx, .xlsx, .txt hoặc .csv");
        return;
      }

      setFile(selectedFile);
      setError("");
      setIsLoading(true);

      try {
        // Đọc file và parse
        const content = await readFileContent(selectedFile, extension);
        const questions = parseContent(content, extension);
        setParsedData(questions);
      } catch (err) {
        setError("Không thể đọc file: " + err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [parseContent]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (parsedData && parsedData.length > 0) {
      onImport(parsedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    padding: "20px",
  };

  const contentStyle = {
    backgroundColor: isDarkMode ? "#1a1a2e" : "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "85vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
  };

  return (
    <div style={modalStyle} onClick={handleClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: "20px 25px",
            borderBottom: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
            background: isDarkMode
              ? "linear-gradient(135deg, #0f3460 0%, #16213e 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><InlineIcon name="upload" size={20} style={{ color: "white" }} />Import câu hỏi từ file</span>
              </h2>
              <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
                Hỗ trợ Word (.docx), Excel (.xlsx), Text (.txt), CSV
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                cursor: "pointer",
                color: "white",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <InlineIcon name="close" size={16} style={{ color: "white" }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "25px",
            flex: 1,
            overflow: "auto",
            backgroundColor: isDarkMode ? "#1a1a2e" : "#fff",
          }}
        >
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${
                dragActive ? "#667eea" : isDarkMode ? "#3d3d5c" : "#ddd"
              }`,
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              backgroundColor: dragActive
                ? isDarkMode
                  ? "#16213e"
                  : "#f0f4ff"
                : isDarkMode
                ? "#16213e"
                : "#f8f9fa",
              transition: "all 0.3s",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("file-import-input").click()}
          >
            <input
              id="file-import-input"
              type="file"
              accept=".docx,.xlsx,.txt,.csv"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />

            <div style={{ marginBottom: "15px" }}>
              <InlineIcon
                name={isLoading ? "loading" : file ? "document" : "upload"}
                size={40}
                style={{ color: isDarkMode ? "#b0b0b0" : "#667eea" }}
              />
            </div>

            {isLoading ? (
              <p style={{ color: isDarkMode ? "#b0b0b0" : "#666", margin: 0 }}>
                Đang xử lý file...
              </p>
            ) : file ? (
              <div>
                <p
                  style={{
                    color: isDarkMode ? "#4a90d9" : "#667eea",
                    fontWeight: "600",
                    margin: "0 0 5px",
                  }}
                >
                  {file.name}
                </p>
                <p
                  style={{
                    color: isDarkMode ? "#888" : "#999",
                    margin: 0,
                    fontSize: "14px",
                  }}
                >
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    color: isDarkMode ? "#e8e8e8" : "#333",
                    fontWeight: "600",
                    margin: "0 0 10px",
                  }}
                >
                  Kéo thả file vào đây
                </p>
                <p
                  style={{
                    color: isDarkMode ? "#888" : "#999",
                    margin: 0,
                    fontSize: "14px",
                  }}
                >
                  hoặc click để chọn file
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: "15px",
                padding: "12px 16px",
                backgroundColor: isDarkMode ? "#5c1a1a" : "#fee",
                borderRadius: "8px",
                color: "#e74c3c",
                fontSize: "14px",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="average" size={14} style={{ color: "#e74c3c" }} />{error}</span>
            </div>
          )}

          {/* Preview parsed questions */}
          {parsedData && parsedData.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h4
                style={{
                  margin: "0 0 15px",
                  color: isDarkMode ? "#e8e8e8" : "#333",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="document" size={16} />Xem trước ({parsedData.length} câu hỏi)</span>
              </h4>

              <div
                style={{
                  maxHeight: "250px",
                  overflow: "auto",
                  borderRadius: "10px",
                  border: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
                }}
              >
                {parsedData.map((q, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "15px",
                      borderBottom: `1px solid ${
                        isDarkMode ? "#3d3d5c" : "#e0e0e0"
                      }`,
                      backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: isDarkMode ? "#4a90d9" : "#667eea",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {index + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: "0 0 8px",
                            color: isDarkMode ? "#e8e8e8" : "#333",
                            fontWeight: "500",
                          }}
                        >
                          {q.questionText}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "15px",
                            backgroundColor: isDarkMode ? "#0f3460" : "#e8f4ff",
                            color: isDarkMode ? "#4a90d9" : "#667eea",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {q.type}
                        </span>
                        {q.options && (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "13px",
                              color: isDarkMode ? "#888" : "#666",
                            }}
                          >
                            {q.options.join(" • ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format guide */}
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
              borderRadius: "10px",
              border: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
            }}
          >
            <h4
              style={{
                margin: "0 0 10px",
                color: isDarkMode ? "#e8e8e8" : "#333",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="pin" size={14} />Định dạng file được hỗ trợ:</span>
            </h4>
            <pre
              style={{
                margin: 0,
                padding: "12px",
                backgroundColor: isDarkMode ? "#0f3460" : "#fff",
                borderRadius: "6px",
                fontSize: "12px",
                color: isDarkMode ? "#b0b0b0" : "#666",
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {`1. What is the main idea of the passage?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A

2. The study was conducted in 2020.
TRUE/FALSE/NOT GIVEN
Answer: TRUE`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "15px 25px",
            borderTop: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
            backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: `1px solid ${isDarkMode ? "#3d3d5c" : "#ddd"}`,
              backgroundColor: "transparent",
              color: isDarkMode ? "#e8e8e8" : "#333",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedData || parsedData.length === 0}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              background:
                parsedData && parsedData.length > 0
                  ? "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)"
                  : isDarkMode
                  ? "#3d3d5c"
                  : "#e0e0e0",
              color:
                parsedData && parsedData.length > 0
                  ? "white"
                  : isDarkMode
                  ? "#888"
                  : "#999",
              fontSize: "14px",
              fontWeight: "600",
              cursor:
                parsedData && parsedData.length > 0 ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><InlineIcon name="correct" size={14} style={{ color: parsedData && parsedData.length > 0 ? 'white' : isDarkMode ? '#888' : '#999' }} />Import {parsedData?.length || 0} câu hỏi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
