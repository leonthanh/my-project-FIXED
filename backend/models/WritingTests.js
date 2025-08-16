// models/WritingTests.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const WritingTest = sequelize.define('WritingTest', {
  index: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  task1: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  task2: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  task1Image: {
    type: DataTypes.STRING, // đường dẫn ảnh
  },
  classCode: { // ✅ Mã lớp
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  teacherName: { // ✅ Tên giáo viên ra đề
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'writing_tests',
  timestamps: true,
});

module.exports = WritingTest;
