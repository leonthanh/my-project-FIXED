const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User'); // 👈 import model User để liên kết

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true, // 👈 Bắt buộc có primary key
  },
  // 👇 Foreign key (WritingTest)
  testId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'writing_tests',
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
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
  },
  // 👇 Foreign key
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  }
}, {
  tableName: 'submissions',
  timestamps: true,
});

// 👇 Định nghĩa quan hệ
User.hasMany(Submission, { foreignKey: 'userId' });
Submission.belongsTo(User, { foreignKey: 'userId' });

module.exports = Submission;
