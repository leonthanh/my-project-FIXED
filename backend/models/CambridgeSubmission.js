const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * CambridgeSubmission Model
 * Lưu trữ bài làm của học sinh cho các bài thi Cambridge (KET, PET, FLYERS, etc.)
 * Hỗ trợ cả Listening và Reading
 */
const CambridgeSubmission = sequelize.define('CambridgeSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Test reference
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the Cambridge test (listening or reading)'
  },
  testType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ket-listening, ket-reading, pet-listening, pet-reading, etc.'
  },
  testTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Copy of test title for quick reference'
  },
  
  // Student info
  studentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studentPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  studentEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  classCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to User table if logged in'
  },
  
  // Answers and scoring
  answers: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Student answers as JSON object { "partIdx-secIdx-qIdx": "answer" }'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of correct answers'
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Score percentage (0-100)'
  },
  
  // Detailed results
  detailedResults: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed scoring for each question { "questionKey": { isCorrect, userAnswer, correctAnswer } }'
  },
  
  // Timing
  timeSpent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time spent in seconds'
  },
  timeRemaining: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time remaining when submitted (seconds)'
  },
  
  // Teacher review
  teacherName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  feedbackBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  feedbackAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  feedbackSeen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('submitted', 'reviewed', 'archived'),
    defaultValue: 'submitted'
  },
  
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'cambridge_submissions',
  timestamps: true,
  indexes: [
    { fields: ['testId', 'testType'] },
    { fields: ['studentName'] },
    { fields: ['classCode'] },
    { fields: ['userId'] },
    { fields: ['submittedAt'] }
  ]
});

module.exports = CambridgeSubmission;
