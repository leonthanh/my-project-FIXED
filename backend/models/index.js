const sequelize = require("../db");

const User = require("./User");
const WritingTest = require("./WritingTests");
const ReadingTest = require("./ReadingTest");
const KETReading = require("./KETReading");
const Submission = require("./Submission");
const CambridgeListening = require("./CambridgeListening");
const CambridgeReading = require("./CambridgeReading");

// Quan hệ WritingTest ↔ Submission
WritingTest.hasMany(Submission, { foreignKey: "testId" });
Submission.belongsTo(WritingTest, { foreignKey: "testId" });

// Quan hệ User ↔ Submission
User.hasMany(Submission, { foreignKey: "userId" });
Submission.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  sequelize,
  User,
  WritingTest,
  ReadingTest,
  KETReading,
  Submission,
  CambridgeListening,
  CambridgeReading,
};
