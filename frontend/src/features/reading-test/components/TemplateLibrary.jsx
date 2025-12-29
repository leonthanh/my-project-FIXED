import React, { useState } from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

/**
 * TemplateLibrary - Thư viện mẫu câu hỏi IELTS Reading
 * Cho phép giáo viên chọn mẫu câu hỏi có sẵn để thêm nhanh vào đề thi
 */

// Định nghĩa các template mẫu
const QUESTION_TEMPLATES = {
  "multiple-choice": [
    {
      name: "Câu hỏi về ý chính",
      template: {
        type: "multiple-choice",
        questionText: "What is the main idea of the passage?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option A",
      },
    },
    {
      name: "Câu hỏi về chi tiết",
      template: {
        type: "multiple-choice",
        questionText:
          "According to the passage, which of the following is TRUE?",
        options: ["Statement A", "Statement B", "Statement C", "Statement D"],
        correctAnswer: "Statement A",
      },
    },
    {
      name: "Câu hỏi về từ vựng",
      template: {
        type: "multiple-choice",
        questionText: 'The word "___" in paragraph X is closest in meaning to:',
        options: ["synonym A", "synonym B", "synonym C", "synonym D"],
        correctAnswer: "synonym A",
      },
    },
  ],
  "true-false-not-given": [
    {
      name: "Statement về số liệu",
      template: {
        type: "true-false-not-given",
        questionText: "The study was conducted with over 500 participants.",
        correctAnswer: "TRUE",
      },
    },
    {
      name: "Statement về quan điểm",
      template: {
        type: "true-false-not-given",
        questionText:
          "The author believes that technology has improved education.",
        correctAnswer: "NOT GIVEN",
      },
    },
    {
      name: "Statement về sự kiện",
      template: {
        type: "true-false-not-given",
        questionText: "The experiment was completed in 2020.",
        correctAnswer: "FALSE",
      },
    },
  ],
  "fill-in-blank": [
    {
      name: "Điền từ trong bảng",
      template: {
        type: "fill-in-blank",
        questionText:
          "Complete the table below using NO MORE THAN TWO WORDS from the passage.",
        correctAnswer: "",
      },
    },
    {
      name: "Điền từ trong summary",
      template: {
        type: "fill-in-blank",
        questionText: "The research found that __________ was the main factor.",
        correctAnswer: "",
      },
    },
  ],
  matching: [
    {
      name: "Matching người - phát biểu",
      template: {
        type: "matching",
        questionText: "Match each statement with the correct researcher.",
        matchingPairs: [
          { left: "Statement 1", right: "" },
          { left: "Statement 2", right: "" },
          { left: "Statement 3", right: "" },
        ],
        matchingOptions: [
          "Researcher A",
          "Researcher B",
          "Researcher C",
          "Researcher D",
        ],
      },
    },
    {
      name: "Matching đặc điểm",
      template: {
        type: "matching",
        questionText: "Match each feature with the correct category.",
        matchingPairs: [
          { left: "Feature 1", right: "" },
          { left: "Feature 2", right: "" },
          { left: "Feature 3", right: "" },
        ],
        matchingOptions: ["Category A", "Category B", "Category C"],
      },
    },
  ],
  "ielts-matching-headings": [
    {
      name: "Matching Headings 5 đoạn",
      template: {
        type: "ielts-matching-headings",
        questionText: "Choose the correct heading for each paragraph.",
        paragraphs: [
          { id: "A", content: "Paragraph A content..." },
          { id: "B", content: "Paragraph B content..." },
          { id: "C", content: "Paragraph C content..." },
          { id: "D", content: "Paragraph D content..." },
          { id: "E", content: "Paragraph E content..." },
        ],
        headings: [
          "i. Introduction to the topic",
          "ii. Historical background",
          "iii. Current developments",
          "iv. Future predictions",
          "v. Conclusion",
          "vi. Case studies",
          "vii. Challenges faced",
        ],
        answers: [
          { paragraphId: "A", headingIndex: null },
          { paragraphId: "B", headingIndex: null },
          { paragraphId: "C", headingIndex: null },
          { paragraphId: "D", headingIndex: null },
          { paragraphId: "E", headingIndex: null },
        ],
      },
    },
    {
      name: "Matching Headings 7 đoạn",
      template: {
        type: "ielts-matching-headings",
        questionText: "Choose the correct heading for paragraphs A-G.",
        paragraphs: [
          { id: "A", content: "" },
          { id: "B", content: "" },
          { id: "C", content: "" },
          { id: "D", content: "" },
          { id: "E", content: "" },
          { id: "F", content: "" },
          { id: "G", content: "" },
        ],
        headings: [
          "i. Heading option 1",
          "ii. Heading option 2",
          "iii. Heading option 3",
          "iv. Heading option 4",
          "v. Heading option 5",
          "vi. Heading option 6",
          "vii. Heading option 7",
          "viii. Heading option 8",
          "ix. Heading option 9",
        ],
        answers: [],
      },
    },
  ],
  "short-answer": [
    {
      name: "Câu hỏi trả lời ngắn",
      template: {
        type: "short-answer",
        questionText: "What does the author suggest as a solution?",
        correctAnswer: "",
      },
    },
    {
      name: "Câu hỏi về nguyên nhân",
      template: {
        type: "short-answer",
        questionText: "What was the main reason for the decline?",
        correctAnswer: "",
      },
    },
  ],
  "cloze-test": [
    {
      name: "Summary completion với word bank",
      template: {
        type: "cloze-test",
        passage:
          "The study found that {{1}} was crucial for {{2}}. Researchers concluded that {{3}} played a significant role.",
        blanks: [
          { id: 1, correctAnswer: "" },
          { id: 2, correctAnswer: "" },
          { id: 3, correctAnswer: "" },
        ],
        wordBank: [
          "education",
          "development",
          "technology",
          "communication",
          "innovation",
        ],
      },
    },
  ],
};

const CATEGORY_INFO = {
  "multiple-choice": { icon: "🔘", label: "Multiple Choice", color: "#3498db" },
  "true-false-not-given": {
    icon: "✅",
    label: "True/False/Not Given",
    color: "#27ae60",
  },
  "fill-in-blank": { icon: "📝", label: "Fill in Blank", color: "#9b59b6" },
  matching: { icon: "🔗", label: "Matching", color: "#e67e22" },
  "ielts-matching-headings": {
    icon: "📑",
    label: "Matching Headings",
    color: "#e74c3c",
  },
  "short-answer": { icon: "✍️", label: "Short Answer", color: "#1abc9c" },
  "cloze-test": { icon: "📋", label: "Cloze Test", color: "#f39c12" },
};

const TemplateLibrary = ({ isOpen, onClose, onSelectTemplate }) => {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("multiple-choice");
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const handleSelectTemplate = (template) => {
    // Deep clone template để tránh mutation
    const clonedTemplate = JSON.parse(JSON.stringify(template.template));
    onSelectTemplate(clonedTemplate);
    onClose();
  };

  const filteredTemplates =
    QUESTION_TEMPLATES[selectedCategory]?.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.template.questionText
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    ) || [];

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
    maxWidth: "900px",
    maxHeight: "85vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
  };

  return (
    <div style={modalStyle} onClick={onClose}>
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
                📚 Thư viện mẫu câu hỏi IELTS
              </h2>
              <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
                Chọn mẫu có sẵn để thêm nhanh vào đề thi
              </p>
            </div>
            <button
              onClick={onClose}
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
              ✕
            </button>
          </div>

          {/* Search */}
          <div style={{ marginTop: "15px" }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm mẫu câu hỏi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "14px",
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar - Categories */}
          <div
            style={{
              width: "220px",
              borderRight: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
              padding: "15px",
              backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
              overflow: "auto",
            }}
          >
            <h4
              style={{
                margin: "0 0 15px",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#888" : "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Loại câu hỏi
            </h4>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  backgroundColor:
                    selectedCategory === key
                      ? isDarkMode
                        ? "#3d3d5c"
                        : info.color + "20"
                      : "transparent",
                  color:
                    selectedCategory === key
                      ? info.color
                      : isDarkMode
                      ? "#b0b0b0"
                      : "#555",
                  fontWeight: selectedCategory === key ? "600" : "400",
                  fontSize: "14px",
                  textAlign: "left",
                  transition: "all 0.2s",
                  borderLeft:
                    selectedCategory === key
                      ? `3px solid ${info.color}`
                      : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: "18px" }}>{info.icon}</span>
                <span>{info.label}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "12px",
                    backgroundColor: isDarkMode ? "#0f3460" : "#e0e0e0",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {QUESTION_TEMPLATES[key]?.length || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Main - Templates */}
          <div
            style={{
              flex: 1,
              padding: "20px",
              overflow: "auto",
              backgroundColor: isDarkMode ? "#1a1a2e" : "#fff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "15px",
              }}
            >
              {filteredTemplates.map((template, index) => {
                const categoryInfo = CATEGORY_INFO[selectedCategory];
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectTemplate(template)}
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      border: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
                      backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      ":hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      },
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0,0,0,0.15)";
                      e.currentTarget.style.borderColor = categoryInfo.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = isDarkMode
                        ? "#3d3d5c"
                        : "#e0e0e0";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          backgroundColor: categoryInfo.color + "20",
                          fontSize: "18px",
                        }}
                      >
                        {categoryInfo.icon}
                      </span>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "15px",
                          fontWeight: "600",
                          color: isDarkMode ? "#e8e8e8" : "#333",
                        }}
                      >
                        {template.name}
                      </h4>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        color: isDarkMode ? "#b0b0b0" : "#666",
                        lineHeight: "1.5",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {template.template.questionText ||
                        "Template cho " + categoryInfo.label}
                    </p>

                    <div
                      style={{
                        marginTop: "15px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: categoryInfo.color,
                          fontWeight: "500",
                        }}
                      >
                        {categoryInfo.label}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: isDarkMode ? "#4a90d9" : "#667eea",
                          fontWeight: "600",
                        }}
                      >
                        + Thêm vào đề →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: isDarkMode ? "#888" : "#999",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "15px" }}>🔍</div>
                <p style={{ margin: 0 }}>Không tìm thấy mẫu phù hợp</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "15px 25px",
            borderTop: `1px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
            backgroundColor: isDarkMode ? "#16213e" : "#f8f9fa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
            color: isDarkMode ? "#b0b0b0" : "#666",
          }}
        >
          <span>💡 Click vào mẫu để thêm vào đề thi</span>
          <span>
            Tổng: {Object.values(QUESTION_TEMPLATES).flat().length} mẫu
          </span>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
