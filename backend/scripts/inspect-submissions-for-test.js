/* Quick inspect script: list submissions for a testId and print key fields */
const sequelize = require('../db');
const ListeningSubmission = require('../models/ListeningSubmission');

(async () => {
  try {
    await sequelize.authenticate();
    const subs = await ListeningSubmission.findAll({ where: { testId: 3 }, order: [['id','ASC']] });
    console.log(`Found ${subs.length} submissions for testId=3`);
    subs.forEach(s => {
      console.log(`#${s.id} createdAt=${s.createdAt} total=${s.total} correct=${s.correct} band=${s.band}`);
      console.log(' answers sample:', String(s.answers || '').slice(0,200).replace(/\n/g,' '));
      console.log(' details sample:', String(s.details || '').slice(0,200).replace(/\n/g,' '));
      console.log('---');
    });
    await sequelize.close();
  } catch (e) {
    console.error('Failed:', e);
    try{ await sequelize.close(); } catch(_){}
    process.exit(1);
  }
})();