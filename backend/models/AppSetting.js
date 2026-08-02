const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const AppSetting = sequelize.define(
  "AppSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    settingKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    settingValue: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      defaultValue: "{}",
    },
    updatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "app_settings",
    timestamps: true,
    indexes: [{ unique: true, fields: ["settingKey"] }],
  }
);

module.exports = AppSetting;
