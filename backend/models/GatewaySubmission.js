const { DataTypes } = require('sequelize');
const sequelize = require('../db');

module.exports = sequelize.define(
  'GatewaySubmission',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    testId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    testTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    studentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    studentPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    studentEmail: {
      type: DataTypes.STRING,
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
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    percentage: {
      type: DataTypes.FLOAT,
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
    teacherName: {
      type: DataTypes.STRING,
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
    feedbackBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    feedbackAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feedbackSeen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('submitted', 'reviewed', 'archived'),
      defaultValue: 'submitted',
    },
    finished: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
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
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'gateway_submissions',
    timestamps: true,
    indexes: [
      { fields: ['testId', 'testType'] },
      { fields: ['studentName'] },
      { fields: ['classCode'] },
      { fields: ['userId'] },
      { fields: ['submittedAt'] },
    ],
  }
);
