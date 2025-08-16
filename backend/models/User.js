const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('student', 'teacher', 'admin'),
    defaultValue: 'student',
  }
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
