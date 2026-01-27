const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sequelize = require('../db');
const ListeningSubmission = require('../models/ListeningSubmission');

async function run() {
  try {
    await sequelize.authenticate();
    const subs = await ListeningSubmission.findAll({ where: { testId: 3, userId: 5000 }, order: [['updatedAt', 'DESC']] });
    if (!subs || !subs.length) return console.log('No submissions found for testId=3 userId=5000');
    for (const s of subs) {
      console.log('---');
      console.log(JSON.stringify(s.toJSON(), null, 2).slice(0, 4000));
    }
    await sequelize.close();
  } catch (err) {
    console.error('Error querying submissions:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run();