const sequelize = require("../db");

const User = require("./User");
const WritingTest = require("./WritingTests");
const ReadingTest = require("./ReadingTest");
const KETReading = require("./KETReading");
const Submission = require("./Submission");
const CambridgeListening = require("./CambridgeListening");
const CambridgeReading = require("./CambridgeReading");
const CambridgeSubmission = require("./CambridgeSubmission");
const RefreshToken = require("./RefreshToken");

// Quan hệ WritingTest ↔ Submission
WritingTest.hasMany(Submission, { foreignKey: "testId" });
Submission.belongsTo(WritingTest, { foreignKey: "testId" });

// Quan hệ User ↔ Submission
User.hasMany(Submission, { foreignKey: "userId" });
Submission.belongsTo(User, { foreignKey: "userId" });

// Quan hệ CambridgeListening ↔ CambridgeSubmission
CambridgeListening.hasMany(CambridgeSubmission, { 
  foreignKey: "testId",
  constraints: false,
  scope: { testType: 'listening' }
});

// Quan hệ CambridgeReading ↔ CambridgeSubmission
CambridgeReading.hasMany(CambridgeSubmission, { 
  foreignKey: "testId",
  constraints: false,
  scope: { testType: 'reading' }
});

// Quan hệ User ↔ CambridgeSubmission
User.hasMany(CambridgeSubmission, { foreignKey: "userId" });
CambridgeSubmission.belongsTo(User, { foreignKey: "userId" });

// Refresh tokens
User.hasMany(RefreshToken, { foreignKey: "userId" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  sequelize,
  User,
  WritingTest,
  ReadingTest,
  KETReading,
  Submission,
  CambridgeListening,
  CambridgeReading,
  CambridgeSubmission,
  RefreshToken,
};
