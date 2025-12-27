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
  scorePercentage: DataTypes.INTEGER
}, {
  tableName: 'reading_submissions',
  timestamps: true
});

User.hasMany(ReadingSubmission, { foreignKey: 'userId' });
ReadingSubmission.belongsTo(User, { foreignKey: 'userId' });

module.exports = ReadingSubmission;