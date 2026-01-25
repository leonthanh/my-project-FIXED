const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sequelize = require('../db');
const ListeningSubmission = require('../models/ListeningSubmission');

async function run(id) {
  try {
    await sequelize.authenticate();
    const sid = Number(id);
    if (!sid) return console.error('Usage: node mark-submission-finished.js <id>');
    const s = await ListeningSubmission.findByPk(sid);
    if (!s) return console.log('No submission with id', sid);
    s.finished = true;
    s.lastSavedAt = new Date();
    await s.save();
    console.log('Marked submission', sid, 'finished');
    await sequelize.close();
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run(process.argv[2]);