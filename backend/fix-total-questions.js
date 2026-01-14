const sequelize = require('./db');
const { CambridgeReading } = require('./models');

(async () => {
  try {
    // Get KET reading test
    const test = await CambridgeReading.findOne({ where: { testType: 'ket-reading' } });
    if (!test) {
      console.log('❌ No test found');
      process.exit(0);
    }
    
    const parts = typeof test.parts === 'string' ? JSON.parse(test.parts) : test.parts;
    let totalQuestions = 0;
    
    // Calculate actual total questions (including nested)
    parts.forEach((part) => {
      part.sections?.forEach((sec) => {
        sec.questions?.forEach((q) => {
          if (sec.questionType === 'long-text-mc' && q.questions?.length) {
            totalQuestions += q.questions.length;
          } else if ((sec.questionType === 'cloze-mc' || sec.questionType === 'cloze-test') && q.blanks?.length) {
            totalQuestions += q.blanks.length;
          } else {
            totalQuestions += 1;
          }
        });
      });
    });
    
    console.log('📊 Current totalQuestions:', test.totalQuestions);
    console.log('✅ Actual total (with nested):', totalQuestions);
    
    // Update database
    await CambridgeReading.update(
      { totalQuestions },
      { where: { id: test.id } }
    );
    
    console.log('✅ Updated successfully!');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
