const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const ExamLevel = sequelize.define(
  "ExamLevel",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    skillConfig: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "exam_levels",
    timestamps: true,
    indexes: [{ unique: true, fields: ["code"] }],
  }
);

module.exports = ExamLevel;
