const { DataTypes } = require("sequelize");
const sequelize = require("../db");

module.exports = sequelize.define(
  "ExamLevelTest",
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
    skill: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    templateId: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teacherName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    testType: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    mainAudioUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parts: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 45,
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "archived"),
      allowNull: false,
      defaultValue: "published",
    },
    showResultModal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    studentResultVisibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "score",
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "exam_level_tests",
    timestamps: true,
    indexes: [
      { fields: ["levelId", "skill", "status"] },
      { fields: ["templateId"] },
    ],
  }
);
