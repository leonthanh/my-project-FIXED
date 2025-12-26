const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const KETReading = sequelize.define(
  "KETReading",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "Tên đề thi (VD: KET Reading Test 1)",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Mô tả đề thi",
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      comment: "Thời gian làm bài (phút)",
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: "Tổng số câu hỏi (KET Reading = 30 câu)",
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "archived"),
      defaultValue: "draft",
      comment:
        "Trạng thái: draft = nháp, published = đã xuất bản, archived = lưu trữ",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID giáo viên tạo đề",
      references: {
        model: "users",
        key: "id",
      },
    },

    // ===== PART 1: Signs and Notices (6 câu) =====
    part1_instruction: {
      type: DataTypes.TEXT,
      defaultValue: "For each question, choose the correct answer.",
      comment: "Hướng dẫn Part 1",
    },
    part1_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      {
        questionNumber: 1,
        prompt: "Go upstairs if you want to",
        image: "/uploads/ket-reading/sign1.jpg",
        options: [
          { label: "A", text: "buy a dress for a party." },
          { label: "B", text: "pay less for something to read." },
          { label: "C", text: "find a game for a teenager." }
        ],
        correctAnswer: "C"
      },
      ... (6 câu)
    ]
    `,
    },

    // ===== PART 2: Matching (7 câu) =====
    part2_instruction: {
      type: DataTypes.TEXT,
      defaultValue: "Match the people to the texts.",
      comment: "Hướng dẫn Part 2",
    },
    part2_texts: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      { label: "A", text: "Text A content..." },
      { label: "B", text: "Text B content..." },
      ... (8 texts: A-H)
    ]
    `,
    },
    part2_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      {
        questionNumber: 7,
        personDescription: "John wants to buy a book about cooking.",
        correctAnswer: "B"
      },
      ... (7 câu)
    ]
    `,
    },

    // ===== PART 3: Multiple Choice (5 câu) =====
    part3_instruction: {
      type: DataTypes.TEXT,
      defaultValue: "For each question, choose the correct answer.",
      comment: "Hướng dẫn Part 3",
    },
    part3_passage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Đoạn văn hoặc đoạn hội thoại cho Part 3",
    },
    part3_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      {
        questionNumber: 14,
        prompt: "What does Sarah want to do?",
        options: [
          { label: "A", text: "go swimming" },
          { label: "B", text: "play tennis" },
          { label: "C", text: "watch a film" }
        ],
        correctAnswer: "B"
      },
      ... (5 câu)
    ]
    `,
    },

    // ===== PART 4: True/False/Doesn't Say (6 câu) =====
    part4_instruction: {
      type: DataTypes.TEXT,
      defaultValue:
        'Read the text. Are the sentences "Right" (A) or "Wrong" (B)? If there is not enough information, choose "Doesn\'t say" (C).',
      comment: "Hướng dẫn Part 4",
    },
    part4_passage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Đoạn văn cho Part 4",
    },
    part4_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      {
        questionNumber: 19,
        statement: "The museum is closed on Mondays.",
        correctAnswer: "B",
        options: [
          { label: "A", text: "Right" },
          { label: "B", text: "Wrong" },
          { label: "C", text: "Doesn't say" }
        ]
      },
      ... (6 câu)
    ]
    `,
    },

    // ===== PART 5: Multiple Choice Cloze (6 câu) =====
    part5_instruction: {
      type: DataTypes.TEXT,
      defaultValue: "For each question, choose the correct answer.",
      comment: "Hướng dẫn Part 5",
    },
    part5_passage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Đoạn văn có chỗ trống cho Part 5",
    },
    part5_questions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: `
    Cấu trúc: [
      {
        questionNumber: 25,
        blankNumber: 1,
        options: [
          { label: "A", text: "about" },
          { label: "B", text: "with" },
          { label: "C", text: "for" }
        ],
        correctAnswer: "A"
      },
      ... (6 câu)
    ]
    `,
    },
  },
  {
    tableName: "ket_reading_tests",
    timestamps: true,
  }
);

module.exports = KETReading;
