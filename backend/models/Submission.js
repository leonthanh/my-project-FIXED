const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Submission = sequelize.define('Submission', {
  task1: DataTypes.TEXT,
  task2: DataTypes.TEXT,
  timeLeft: DataTypes.INTEGER,
  userName: DataTypes.STRING,
  userPhone: DataTypes.STRING,
  feedback: DataTypes.TEXT,
  teacherName: DataTypes.STRING,
  feedbackBy: DataTypes.STRING,
  feedbackAt: DataTypes.DATE,
  feedbackSeen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  tableName: 'submissions',
  timestamps: true,
});

module.exports = Submission;
