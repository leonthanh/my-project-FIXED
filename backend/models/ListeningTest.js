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
  mainAudioUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  partAudioUrls: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  partTypes: {
    type: DataTypes.JSON,
    allowNull: false
  },
  partInstructions: {
    type: DataTypes.JSON,
    allowNull: false
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false
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
