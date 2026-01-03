import React, { useState } from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

/**
 * ListeningTemplateLibrary - Thư viện mẫu câu hỏi IELTS Listening
 * Tương tự TemplateLibrary của Reading để giáo viên dễ sử dụng
 * 
 * Features:
 * - Single Question Templates: Thêm từng câu hỏi
 * - Section Templates: Thêm cả section với nhiều câu hỏi theo format IELTS
 */

// ==================== SINGLE QUESTION TEMPLATES ====================
const QUESTION_TEMPLATES = {
  "form-completion": [
    {
      name: "📋 Form cá nhân (Personal Details)",
      template: {
        questionType: "form-completion",
        formTitle: "PERSONAL DETAILS FOR HOMESTAY APPLICATION",
        questionRange: "Questions 1-5",
        formRows: [
          { label: "First name", value: "", isBlank: true, blankNumber: 1 },
          { label: "Family name", value: "Yuichini", isBlank: false, blankNumber: null },
          { label: "Gender", value: "Female", isBlank: false, blankNumber: null },
          { label: "Age", value: "28", isBlank: false, blankNumber: null },
          { label: "Passport number", value: "", isBlank: true, blankNumber: 2 },
          { label: "Nationality", value: "Japanese", isBlank: false, blankNumber: null },
          { label: "Course enrolled", value: "", isBlank: true, blankNumber: 3 },
          { label: "Length of the course", value: "", isBlank: true, blankNumber: 4 },
          { label: "Homestay time", value: "", isBlank: true, blankNumber: 5 },
        ],
        answers: { 1: "", 2: "", 3: "", 4: "", 5: "" },
      },
    },
    {
      name: "📋 Form thuê văn phòng (Office Rental)",
      template: {
        questionType: "form-completion",
        formTitle: "OFFICE RENTAL",
        questionRange: "Questions 1-10",
        formRows: [
          { label: "Address", value: "21 North Avenue", isBlank: false, blankNumber: null },
          { label: "Type of company", value: "", isBlank: true, blankNumber: 1 },
          { label: "Full name", value: "Jonathan Smith", isBlank: false, blankNumber: null },
          { label: "Position", value: "", isBlank: true, blankNumber: 2 },
          { label: "Preferred location", value: "", isBlank: true, blankNumber: 3 },
          { label: "No. of people", value: "30", isBlank: false, blankNumber: null },
          { label: "Preferred size of the area (ft²)", value: "", isBlank: true, blankNumber: 4 },
          { label: "Requirements: 24-hour", value: "", isBlank: true, blankNumber: 5 },
          { label: "Ground floor", value: "", isBlank: true, blankNumber: 6 },
          { label: "Preferred facilities (for employees)", value: "", isBlank: true, blankNumber: 7 },
          { label: "Preferred facilities (away from workspace)", value: "", isBlank: true, blankNumber: 8 },
          { label: "No. of power sockets", value: "40", isBlank: false, blankNumber: null },
          { label: "Daily exercise at", value: "", isBlank: true, blankNumber: 9 },
          { label: "Unnecessary", value: "furniture", isBlank: false, blankNumber: null },
          { label: "Other requirements", value: "WIFI", isBlank: false, blankNumber: null },
          { label: "Arrangement of viewing (Thursday)", value: "", isBlank: true, blankNumber: 10 },
        ],
        answers: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "" },
      },
    },
    {
      name: "📋 Form đặt phòng khách sạn (Hotel Booking)",
      template: {
        questionType: "form-completion",
        formTitle: "HOTEL BOOKING FORM",
        questionRange: "Questions 1-8",
        formRows: [
          { label: "Guest name", value: "", isBlank: true, blankNumber: 1 },
          { label: "Email", value: "", isBlank: true, blankNumber: 2 },
          { label: "Phone number", value: "", isBlank: true, blankNumber: 3 },
          { label: "Check-in date", value: "", isBlank: true, blankNumber: 4 },
          { label: "Check-out date", value: "", isBlank: true, blankNumber: 5 },
          { label: "Room type", value: "", isBlank: true, blankNumber: 6 },
          { label: "Number of guests", value: "", isBlank: true, blankNumber: 7 },
          { label: "Special requests", value: "", isBlank: true, blankNumber: 8 },
        ],
        answers: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "" },
      },
    },
    {
      name: "📋 Form đăng ký khóa học (Course Registration)",
      template: {
        questionType: "form-completion",
        formTitle: "COURSE REGISTRATION",
        questionRange: "Questions 1-6",
        formRows: [
          { label: "Student name", value: "", isBlank: true, blankNumber: 1 },
          { label: "Student ID", value: "", isBlank: true, blankNumber: 2 },
          { label: "Course name", value: "", isBlank: true, blankNumber: 3 },
          { label: "Course code", value: "ENG101", isBlank: false, blankNumber: null },
          { label: "Start date", value: "", isBlank: true, blankNumber: 4 },
          { label: "Duration", value: "", isBlank: true, blankNumber: 5 },
          { label: "Tuition fee", value: "", isBlank: true, blankNumber: 6 },
          { label: "Payment method", value: "Bank transfer", isBlank: false, blankNumber: null },
        ],
        answers: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
      },
    },
  ],
  "fill-blank": [
    {
      name: "Fill blank - Tên/Name",
      template: {
        questionType: "fill",
        questionText: "Name: _____",
        correctAnswer: "",
        wordLimit: 1,
      },
    },
    {
      name: "Fill blank - Số điện thoại",
      template: {
        questionType: "fill",
        questionText: "Phone number: _____",
        correctAnswer: "",
        wordLimit: 1,
      },
    },
    {
      name: "Fill blank - Địa chỉ",
      template: {
        questionType: "fill",
        questionText: "Address: _____ Street",
        correctAnswer: "",
        wordLimit: 2,
      },
    },
    {
      name: "Fill blank - Ngày tháng",
      template: {
        questionType: "fill",
        questionText: "Date: _____",
        correctAnswer: "",
        wordLimit: 1,
      },
    },
    {
      name: "Fill blank - Giá tiền",
      template: {
        questionType: "fill",
        questionText: "Price: $ _____",
        correctAnswer: "",
        wordLimit: 1,
      },
    },
  ],
  "multiple-choice": [
    {
      name: "Multiple Choice 3 options (ABC)",
      template: {
        questionType: "abc",
        questionText: "What is the main purpose of the talk?",
        options: ["A. To inform", "B. To persuade", "C. To entertain"],
        correctAnswer: "A",
      },
    },
    {
      name: "Multiple Choice 4 options (ABCD)",
      template: {
        questionType: "abcd",
        questionText: "According to the speaker, what is the problem?",
        options: ["A. Option A", "B. Option B", "C. Option C", "D. Option D"],
        correctAnswer: "A",
      },
    },
    {
      name: "Câu hỏi về địa điểm",
      template: {
        questionType: "abc",
        questionText: "Where does the conversation take place?",
        options: ["A. At a hotel", "B. At an office", "C. At a restaurant"],
        correctAnswer: "A",
      },
    },
    {
      name: "Câu hỏi về thời gian",
      template: {
        questionType: "abc",
        questionText: "When will the event start?",
        options: ["A. 9:00 AM", "B. 10:00 AM", "C. 11:00 AM"],
        correctAnswer: "A",
      },
    },
  ],
  "matching": [
    {
      name: "Matching người - quan điểm",
      template: {
        questionType: "matching",
        questionText: "Match each person with their opinion.",
        leftItems: ["Speaker 1", "Speaker 2", "Speaker 3"],
        rightItems: ["A. Agree with the proposal", "B. Disagree", "C. Neutral", "D. Not mentioned"],
        correctAnswer: "1-A, 2-B, 3-C",
      },
    },
    {
      name: "Matching địa điểm - hoạt động",
      template: {
        questionType: "matching",
        questionText: "Match each place with the activity.",
        leftItems: ["Room A", "Room B", "Room C", "Room D"],
        rightItems: ["A. Meeting room", "B. Storage", "C. Kitchen", "D. Office", "E. Reception"],
        correctAnswer: "1-A, 2-B, 3-C, 4-D",
      },
    },
    {
      name: "Matching ngày - sự kiện",
      template: {
        questionType: "matching",
        questionText: "Match each day with the scheduled event.",
        leftItems: ["Monday", "Tuesday", "Wednesday"],
        rightItems: ["A. Team meeting", "B. Training", "C. Presentation", "D. Workshop", "E. Review"],
        correctAnswer: "1-A, 2-B, 3-C",
      },
    },
  ],
  "multi-select": [
    {
      name: "Choose TWO letters (A-E)",
      template: {
        questionType: "multi-select",
        questionText: "Which TWO features does the speaker mention?",
        options: ["A. Feature 1", "B. Feature 2", "C. Feature 3", "D. Feature 4", "E. Feature 5"],
        correctAnswer: "A,B",
        requiredAnswers: 2,
      },
    },
    {
      name: "Choose TWO advantages",
      template: {
        questionType: "multi-select",
        questionText: "Which TWO advantages are mentioned?",
        options: ["A. Cost effective", "B. Time saving", "C. Easy to use", "D. Flexible", "E. Reliable"],
        correctAnswer: "A,C",
        requiredAnswers: 2,
      },
    },
    {
      name: "Choose THREE items",
      template: {
        questionType: "multi-select",
        questionText: "Which THREE items should students bring?",
        options: ["A. Notebook", "B. Calculator", "C. Dictionary", "D. Laptop", "E. Textbook", "F. ID card"],
        correctAnswer: "A,C,E",
        requiredAnswers: 3,
      },
    },
  ],
  "note-completion": [
    {
      name: "Ghi chú lecture",
      template: {
        questionType: "fill",
        questionText: "The main topic of the lecture is _____",
        correctAnswer: "",
        wordLimit: 2,
      },
    },
    {
      name: "Ghi chú số liệu",
      template: {
        questionType: "fill",
        questionText: "The study involved _____ participants",
        correctAnswer: "",
        wordLimit: 1,
      },
    },
    {
      name: "Ghi chú kết luận",
      template: {
        questionType: "fill",
        questionText: "The researcher concluded that _____",
        correctAnswer: "",
        wordLimit: 3,
      },
    },
  ],
  "map-labeling": [
    {
      name: "Map labeling cơ bản",
      template: {
        questionType: "map-labeling",
        questionText: "Label the map below. Write the correct letter, A-H.",
        imageUrl: "",
        questionRange: "11-15",
        items: [
          { label: "A", text: "Entrance" },
          { label: "B", text: "Reception" },
          { label: "C", text: "Library" },
          { label: "D", text: "Cafeteria" },
        ],
        correctAnswer: "11-A, 12-B, 13-C, 14-D, 15-E",
      },
    },
    {
      name: "Plan labeling (building)",
      template: {
        questionType: "map-labeling",
        questionText: "Label the plan of the building. Write the correct letter, A-F.",
        imageUrl: "",
        questionRange: "16-20",
        items: [
          { label: "A", text: "Office" },
          { label: "B", text: "Meeting room" },
          { label: "C", text: "Storage" },
        ],
        correctAnswer: "",
      },
    },
  ],
  "flowchart": [
    {
      name: "Flowchart quy trình",
      template: {
        questionType: "flowchart",
        questionText: "Complete the flowchart below.",
        questionRange: "31-35",
        steps: [
          { text: "Step 1: Register online", hasBlank: false },
          { text: "Step 2: Submit _____", hasBlank: true },
          { text: "Step 3: Wait for _____", hasBlank: true },
          { text: "Step 4: Attend interview", hasBlank: false },
        ],
        correctAnswer: "",
      },
    },
    {
      name: "Flowchart sản xuất",
      template: {
        questionType: "flowchart",
        questionText: "Complete the diagram showing the production process.",
        questionRange: "26-30",
        steps: [
          { text: "Raw materials collected", hasBlank: false },
          { text: "Materials _____ and sorted", hasBlank: true },
          { text: "Process in _____", hasBlank: true },
          { text: "Quality check", hasBlank: false },
          { text: "Final _____ completed", hasBlank: true },
        ],
        correctAnswer: "",
      },
    },
  ],
};

// ==================== SECTION TEMPLATES (IELTS Format) ====================
const SECTION_TEMPLATES = {
  "part1-form-table": {
    name: "📋 Part 1: Form/Table Completion (IELTS)",
    description: "Form đầy đủ với bảng - Q1-10 (Recommended)",
    icon: "📋",
    color: "#3b82f6",
    section: {
      title: "Part 1: Form Completion",
      instructions: "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      questionType: "form-completion",
      questions: [{
        id: "q1-10",
        questionType: "form-completion",
        formTitle: "PERSONAL DETAILS",
        questionRange: "Questions 1-10",
        formRows: [
          { label: "First name", value: "", isBlank: true, blankNumber: 1 },
          { label: "Family name", value: "Smith", isBlank: false, blankNumber: null },
          { label: "Date of birth", value: "", isBlank: true, blankNumber: 2 },
          { label: "Address", value: "", isBlank: true, blankNumber: 3 },
          { label: "Postcode", value: "", isBlank: true, blankNumber: 4 },
          { label: "Phone number", value: "", isBlank: true, blankNumber: 5 },
          { label: "Email", value: "", isBlank: true, blankNumber: 6 },
          { label: "Occupation", value: "", isBlank: true, blankNumber: 7 },
          { label: "Department", value: "", isBlank: true, blankNumber: 8 },
          { label: "Start date", value: "", isBlank: true, blankNumber: 9 },
          { label: "Reference number", value: "", isBlank: true, blankNumber: 10 },
        ],
        answers: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "" },
      }],
    },
  },
  "part1-form": {
    name: "📝 Part 1: Fill Blanks riêng lẻ (10 câu)",
    description: "10 câu fill riêng biệt - Q1-10",
    icon: "📝",
    color: "#3498db",
    section: {
      title: "Part 1: Form Completion",
      instructions: "Complete the form below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer.",
      questionType: "fill",
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: `q${i + 1}`,
        questionType: "fill",
        questionText: `Question ${i + 1}: _____`,
        correctAnswer: "",
        wordLimit: 1,
      })),
    },
  },
  "part2-mc": {
    name: "🔘 Part 2A: Multiple Choice (4 câu)",
    description: "Câu hỏi trắc nghiệm - Q11-14",
    icon: "🔘",
    color: "#27ae60",
    section: {
      title: "Part 2A: Multiple Choice",
      instructions: "Choose the correct letter, A, B or C.",
      questionType: "abc",
      questions: Array.from({ length: 4 }, (_, i) => ({
        id: `q${i + 11}`,
        questionType: "abc",
        questionText: `Question ${i + 11}`,
        options: ["A. ", "B. ", "C. "],
        correctAnswer: "",
      })),
    },
  },
  "part2-matching": {
    name: "🔗 Part 2B: Matching (6 câu)",
    description: "Nối thông tin - Q15-20",
    icon: "🔗",
    color: "#e67e22",
    section: {
      title: "Part 2B: Matching",
      instructions: "Match each item with the correct option, A-H.",
      questionType: "matching",
      questions: [{
        id: "q15-20",
        questionType: "matching",
        questionText: "Match the items with the correct options.",
        leftItems: ["15", "16", "17", "18", "19", "20"],
        rightItems: ["A. ", "B. ", "C. ", "D. ", "E. ", "F. ", "G. ", "H. "],
        correctAnswer: "",
      }],
    },
  },
  "part3-matching": {
    name: "🔗 Part 3A: Matching (4 câu)",
    description: "Nối người với quan điểm - Q21-24",
    icon: "🔗",
    color: "#9b59b6",
    section: {
      title: "Part 3A: Matching",
      instructions: "Match each speaker with their opinion, A-F.",
      questionType: "matching",
      questions: [{
        id: "q21-24",
        questionType: "matching",
        questionText: "Match each person with their opinion.",
        leftItems: ["21", "22", "23", "24"],
        rightItems: ["A. ", "B. ", "C. ", "D. ", "E. ", "F. "],
        correctAnswer: "",
      }],
    },
  },
  "part3-multi-select": {
    name: "✅ Part 3B: Multiple Select (6 câu)",
    description: "Chọn 2 đáp án - Q25-30",
    icon: "✅",
    color: "#e74c3c",
    section: {
      title: "Part 3B: Multiple Select",
      instructions: "Choose TWO letters, A-E, for each question.",
      questionType: "multi-select",
      questions: Array.from({ length: 3 }, (_, i) => ({
        id: `q${25 + i * 2}-${26 + i * 2}`,
        questionType: "multi-select",
        questionText: `Questions ${25 + i * 2}-${26 + i * 2}: Which TWO...?`,
        options: ["A. ", "B. ", "C. ", "D. ", "E. "],
        correctAnswer: "",
        requiredAnswers: 2,
      })),
    },
  },
  "part4-notes": {
    name: "📝 Part 4: Note Completion (10 câu)",
    description: "Điền ghi chú lecture - Q31-40",
    icon: "📝",
    color: "#1abc9c",
    section: {
      title: "Part 4: Note Completion",
      instructions: "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
      questionType: "fill",
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: `q${i + 31}`,
        questionType: "fill",
        questionText: `Question ${i + 31}: _____`,
        correctAnswer: "",
        wordLimit: 2,
      })),
    },
  },
};

// Category info for UI
const CATEGORY_INFO = {
  "form-completion": { icon: "📋", label: "Form/Table Completion", color: "#3b82f6" },
  "fill-blank": { icon: "📝", label: "Fill in Blank", color: "#06b6d4" },
  "multiple-choice": { icon: "🔘", label: "Multiple Choice", color: "#27ae60" },
  "matching": { icon: "🔗", label: "Matching", color: "#e67e22" },
  "multi-select": { icon: "✅", label: "Multi Select", color: "#e74c3c" },
  "note-completion": { icon: "📓", label: "Note Completion", color: "#1abc9c" },
  "map-labeling": { icon: "🗺️", label: "Map Labeling", color: "#9b59b6" },
  "flowchart": { icon: "📊", label: "Flowchart", color: "#f39c12" },
};

const ListeningTemplateLibrary = ({ 
  isOpen, 
  onClose, 
  onSelectTemplate,
  onSelectSectionTemplate,
  mode = "question" // "question" | "section"
}) => {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("form-completion");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(mode); // "question" | "section"

  if (!isOpen) return null;

  const handleSelectTemplate = (template) => {
    const clonedTemplate = JSON.parse(JSON.stringify(template.template));
    onSelectTemplate(clonedTemplate);
    onClose();
  };

  const handleSelectSectionTemplate = (templateKey) => {
    const template = SECTION_TEMPLATES[templateKey];
    const clonedSection = JSON.parse(JSON.stringify(template.section));
    if (onSelectSectionTemplate) {
      onSelectSectionTemplate(clonedSection);
    }
    onClose();
  };

  const filteredTemplates = QUESTION_TEMPLATES[selectedCategory]?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.template.questionText?.toLowerCase().includes(searchTerm.toLowerCase())
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
    maxWidth: "950px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
  };

  const tabStyle = (isActive) => ({
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: isActive 
      ? (isDarkMode ? "#1a1a2e" : "#ffffff")
      : "transparent",
    color: isActive ? "#667eea" : "rgba(255,255,255,0.7)",
    transition: "all 0.2s",
  });

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
                🎧 Thư viện mẫu IELTS Listening
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
              }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{ marginTop: "15px", display: "flex", gap: "5px" }}>
            <button
              style={tabStyle(activeTab === "question")}
              onClick={() => setActiveTab("question")}
            >
              📝 Câu hỏi đơn lẻ
            </button>
            <button
              style={tabStyle(activeTab === "section")}
              onClick={() => setActiveTab("section")}
            >
              📦 Section Template (IELTS)
            </button>
          </div>

          {/* Search - only for question tab */}
          {activeTab === "question" && (
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
          )}
        </div>

        {/* Body */}
        {activeTab === "question" ? (
          // QUESTION TEMPLATES TAB
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
                        ? isDarkMode ? "#3d3d5c" : info.color + "20"
                        : "transparent",
                    color: selectedCategory === key ? info.color : isDarkMode ? "#b0b0b0" : "#555",
                    fontWeight: selectedCategory === key ? "600" : "400",
                    fontSize: "14px",
                    textAlign: "left",
                    transition: "all 0.2s",
                    borderLeft: selectedCategory === key
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
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                        e.currentTarget.style.borderColor = categoryInfo.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = isDarkMode ? "#3d3d5c" : "#e0e0e0";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
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
                        {template.template.questionText || "Template cho " + categoryInfo.label}
                      </p>

                      <div style={{ marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: categoryInfo.color, fontWeight: "500" }}>
                          {categoryInfo.label}
                        </span>
                        <span style={{ fontSize: "12px", color: isDarkMode ? "#4a90d9" : "#667eea", fontWeight: "600" }}>
                          + Thêm câu hỏi →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTemplates.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: isDarkMode ? "#888" : "#999" }}>
                  <div style={{ fontSize: "48px", marginBottom: "15px" }}>🔍</div>
                  <p style={{ margin: 0 }}>Không tìm thấy mẫu phù hợp</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // SECTION TEMPLATES TAB
          <div style={{ flex: 1, padding: "25px", overflow: "auto", backgroundColor: isDarkMode ? "#1a1a2e" : "#fff" }}>
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: "0 0 10px", color: isDarkMode ? "#e8e8e8" : "#333", fontSize: "18px" }}>
                🎯 Thêm nhanh Section theo format IELTS
              </h3>
              <p style={{ margin: 0, color: isDarkMode ? "#b0b0b0" : "#666", fontSize: "14px" }}>
                Chọn một template để thêm cả section với câu hỏi đã setup sẵn
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {Object.entries(SECTION_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  onClick={() => handleSelectSectionTemplate(key)}
                  style={{
                    padding: "24px",
                    borderRadius: "16px",
                    border: `2px solid ${isDarkMode ? "#3d3d5c" : "#e0e0e0"}`,
                    backgroundColor: isDarkMode ? "#16213e" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 8px 25px ${template.color}30`;
                    e.currentTarget.style.borderColor = template.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = isDarkMode ? "#3d3d5c" : "#e0e0e0";
                  }}
                >
                  {/* Icon Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      right: "-10px",
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: template.color + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                    }}
                  >
                    {template.icon}
                  </div>

                  <h4
                    style={{
                      margin: "0 0 8px",
                      fontSize: "16px",
                      fontWeight: "700",
                      color: isDarkMode ? "#e8e8e8" : "#333",
                      paddingRight: "40px",
                    }}
                  >
                    {template.name}
                  </h4>

                  <p
                    style={{
                      margin: "0 0 15px",
                      fontSize: "14px",
                      color: isDarkMode ? "#b0b0b0" : "#666",
                    }}
                  >
                    {template.description}
                  </p>

                  {/* Section Info */}
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: isDarkMode ? "#0f3460" : "#f8f9fa",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: isDarkMode ? "#888" : "#666" }}>Loại câu hỏi:</span>
                      <span style={{ color: template.color, fontWeight: "600" }}>
                        {template.section.questionType.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: isDarkMode ? "#888" : "#666" }}>Số câu hỏi:</span>
                      <span style={{ color: isDarkMode ? "#e8e8e8" : "#333", fontWeight: "600" }}>
                        {template.section.questions.length} câu
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      textAlign: "center",
                      padding: "10px",
                      backgroundColor: template.color + "15",
                      borderRadius: "8px",
                      color: template.color,
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    + Thêm Section này →
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div
              style={{
                marginTop: "25px",
                padding: "20px",
                backgroundColor: isDarkMode ? "#0f3460" : "#fff3cd",
                borderRadius: "12px",
                border: `1px solid ${isDarkMode ? "#3d3d5c" : "#ffc107"}`,
              }}
            >
              <h4 style={{ margin: "0 0 10px", color: isDarkMode ? "#ffc107" : "#856404", fontSize: "15px" }}>
                💡 Mẹo sử dụng
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "20px",
                  color: isDarkMode ? "#b0b0b0" : "#856404",
                  fontSize: "14px",
                  lineHeight: "1.8",
                }}
              >
                <li>Chọn Section Template để thêm nhanh cả section với format IELTS chuẩn</li>
                <li>Sau khi thêm, bạn có thể chỉnh sửa nội dung từng câu hỏi</li>
                <li>Part 1 & 4 thường là Form/Note Completion (điền từ)</li>
                <li>Part 2 thường có Multiple Choice + Matching</li>
                <li>Part 3 thường có Matching + Multi-Select (chọn 2 đáp án)</li>
              </ul>
            </div>
          </div>
        )}

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
          <span>
            {activeTab === "question" 
              ? "💡 Click vào mẫu để thêm câu hỏi"
              : "📦 Click vào section template để thêm cả section"
            }
          </span>
          <span>
            {activeTab === "question"
              ? `Tổng: ${Object.values(QUESTION_TEMPLATES).flat().length} mẫu câu hỏi`
              : `Tổng: ${Object.keys(SECTION_TEMPLATES).length} section templates`
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListeningTemplateLibrary;
