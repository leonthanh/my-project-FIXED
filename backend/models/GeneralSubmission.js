const { createPlatformSubmissionModel } = require('./factories/createPlatformExamModels');

module.exports = createPlatformSubmissionModel({
  modelName: 'GeneralSubmission',
  tableName: 'general_submissions',
});
