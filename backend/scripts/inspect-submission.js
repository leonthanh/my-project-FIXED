// Simple script to inspect a ListeningSubmission by ID
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sequelize = require('../db');
const ListeningSubmission = require('../models/ListeningSubmission');

async function run() {
  try {
    await sequelize.authenticate();
    const id = process.argv[2] || 29;
    const sub = await ListeningSubmission.findByPk(Number(id));
    if (!sub) return console.log('No submission found for id', id);
    const obj = sub.toJSON();
    console.log('Submission:', JSON.stringify(obj, null, 2));
    await sequelize.close();
  } catch (err) {
    console.error('Error inspecting submission:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run();