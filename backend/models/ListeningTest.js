const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ListeningTest = sequelize.define('ListeningTest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  classCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teacherName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  audioUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  questions: {
    type: DataTypes.JSON,  // Lưu mảng câu hỏi dưới dạng JSON
    allowNull: false,
    validate: {
      isValidQuestions(value) {
        if (!Array.isArray(value)) throw new Error('Questions must be an array');
        value.forEach(q => {
          if (!q.questionType || !q.questionText || !q.correctAnswer) {
            throw new Error('Invalid question format');
          }
          if (!['radio', 'checkbox', 'fill', 'dropdown', 'dragdrop'].includes(q.questionType)) {
            throw new Error('Invalid question type');
          }
        });
      }
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'listening_tests',
  timestamps: true
});

module.exports = ListeningTest;
