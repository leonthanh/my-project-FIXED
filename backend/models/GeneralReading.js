const { createPartTestModel } = require('./factories/createPlatformExamModels');

module.exports = createPartTestModel({
  modelName: 'GeneralReading',
  tableName: 'general_reading_tests',
  defaultDuration: 60,
});
