const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// IELTS Listening submission (scored like ReadingSubmission but simpler)
const ListeningSubmission = sequelize.define(
  "ListeningSubmission",
  {
    testId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    answers: {
      // stores student's answers keyed by q<number>
      type: DataTypes.JSON,
      allowNull: true,
    },
    // optional per-question details for review pages
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    correct: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    scorePercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    band: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    // Teacher feedback (like Reading)
    feedback: {
      type: DataTypes.TEXT,
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

    // Autosave / resume fields
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastSavedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "listening_submissions",
    timestamps: true,
  }
);

module.exports = ListeningSubmission;
