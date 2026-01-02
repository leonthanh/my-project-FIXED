const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const ReadingSubmission = sequelize.define('ReadingSubmission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  testId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userName: DataTypes.STRING,
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: true
  },
  correct: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  band: DataTypes.FLOAT,
  scorePercentage: DataTypes.INTEGER,
  // Analysis fields - auto-generated breakdown by question type
  analysisBreakdown: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Auto-generated analysis breakdown by question type'
  },
  // Feedback fields - similar to Writing
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Teacher feedback/comments'
  },
  feedbackBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Name of teacher who gave feedback'
  },
  feedbackAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When feedback was given'
  },
  feedbackSeen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether student has seen the feedback'
  }
}, {
  tableName: 'reading_submissions',
  timestamps: true
});

User.hasMany(ReadingSubmission, { foreignKey: 'userId' });
ReadingSubmission.belongsTo(User, { foreignKey: 'userId' });

module.exports = ReadingSubmission;