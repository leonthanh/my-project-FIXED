const { DataTypes } = require("sequelize");
const sequelize = require("../db");

module.exports = sequelize.define(
  "ExamLevelSubmission",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    levelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    testId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    skill: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    testType: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    testTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    studentName: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    studentPhone: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    studentEmail: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    classCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    detailedResults: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timeRemaining: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    responseFeedback: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("submitted", "reviewed", "archived"),
      allowNull: false,
      defaultValue: "submitted",
    },
    finished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSavedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    progressMeta: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "exam_level_submissions",
    timestamps: true,
    indexes: [
      { fields: ["levelId", "testId", "userId", "finished"] },
      { fields: ["testId", "testType"] },
      { fields: ["submittedAt"] },
    ],
  }
);
