const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * CambridgeListening Model
 * Lưu trữ đề thi listening cho các bài thi Cambridge (KET, PET, FLYERS, etc.)
 */
const CambridgeListening = sequelize.define('CambridgeListening', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  classCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teacherName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  testType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ket-listening, pet-listening, flyers-listening, movers-listening, starters-listening'
  },
  parts: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of parts with sections and questions'
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Duration in minutes'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'cambridge_listening_tests',
  timestamps: true
});

module.exports = CambridgeListening;
