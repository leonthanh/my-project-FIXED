const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PlacementPackageItem = sequelize.define(
  "PlacementPackageItem",
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
  },
  {
    tableName: "placement_package_items",
    timestamps: true,
    indexes: [{ fields: ["packageId", "sortOrder"] }],
  }
);

module.exports = PlacementPackageItem;