const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PlacementAttemptItem = sequelize.define(
  "PlacementAttemptItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    attemptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    packageItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    attemptItemToken: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    platform: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    skill: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    testId: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    testType: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    badge: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    questionsLabel: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    durationLabel: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("assigned", "started", "submitted"),
      allowNull: false,
      defaultValue: "assigned",
    },
    runtimeSubmissionModel: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    runtimeSubmissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    correct: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    band: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    tableName: "placement_attempt_items",
    timestamps: true,
    indexes: [
      { name: "placement_item_token_uq", unique: true, fields: ["attemptItemToken"] },
      { name: "placement_item_attempt_sort_idx", fields: ["attemptId", "sortOrder"] },
      {
        name: "placement_item_runtime_idx",
        fields: ["runtimeSubmissionModel", "runtimeSubmissionId"],
      },
    ],
  }
);

module.exports = PlacementAttemptItem;