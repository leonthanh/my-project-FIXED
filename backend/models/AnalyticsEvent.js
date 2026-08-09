const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");

const AnalyticsEvent = sequelize.define(
  "AnalyticsEvent",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    eventType: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    pagePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "/",
    },
    sessionId: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "analytics_events",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["createdAt"] },
      { fields: ["eventType", "createdAt"] },
      { fields: ["userId", "createdAt"] },
      { fields: ["sessionId", "createdAt"] },
    ],
  }
);

module.exports = AnalyticsEvent;
