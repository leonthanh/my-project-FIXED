const { createPartTestModel } = require('./factories/createPlatformExamModels');

module.exports = createPartTestModel({
  modelName: 'GeneralListening',
  tableName: 'general_listening_tests',
  defaultDuration: 30,
  includeMainAudio: true,
});
