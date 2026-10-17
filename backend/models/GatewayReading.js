const { DataTypes } = require('sequelize');
const sequelize = require('../db');

module.exports = sequelize.define(
  'GatewayReading',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teacherName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parts: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      comment: 'Duration in minutes',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
    },
    showResultModal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    studentResultVisibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'score',
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'gateway_reading_tests',
    timestamps: true,
  }
);
