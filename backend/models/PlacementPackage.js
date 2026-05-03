const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PlacementPackage = sequelize.define(
  "PlacementPackage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ownerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
      defaultValue: "Placement Package",
    },
    shareToken: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastPublishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "placement_packages",
    timestamps: true,
    indexes: [
      { fields: ["ownerUserId"] },
      { unique: true, fields: ["shareToken"] },
    ],
  }
);

module.exports = PlacementPackage;