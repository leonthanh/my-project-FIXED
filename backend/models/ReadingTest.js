const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ReadingTest = sequelize.define('ReadingTest', {
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  classCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  teacherName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  passages: {
    type: DataTypes.JSON, // Store complex nested structure
    allowNull: false,
    defaultValue: [],
    comment: 'Array of passages with sections and questions'
  }
}, {
  tableName: 'reading_tests',
  timestamps: true,
});

module.exports = ReadingTest;
