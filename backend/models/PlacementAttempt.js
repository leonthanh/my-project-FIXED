const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PlacementAttempt = sequelize.define(
  "PlacementAttempt",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ownerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attemptToken: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    studentName: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    studentPhone: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "completed"),
      allowNull: false,
      defaultValue: "active",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "placement_attempts",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["attemptToken"] },
      { fields: ["packageId", "studentPhone", "status"] },
      { fields: ["ownerUserId"] },
    ],
  }
);

module.exports = PlacementAttempt;