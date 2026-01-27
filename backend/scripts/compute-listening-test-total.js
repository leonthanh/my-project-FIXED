const sequelize = require('../db');
const ListeningTest = require('../models/ListeningTest');

const parseIfJsonString = (val) => {
  let v = val;
  let attempts = 0;
  while (typeof v === 'string' && attempts < 3) {
    try { v = JSON.parse(v); } catch (e) { break; }
    attempts++;
  }
  return v;
};

(async () => {
  const testId = 3;
  await sequelize.authenticate();
  const t = await ListeningTest.findByPk(testId);
  if (!t) { console.error('test not found'); process.exit(1); }
  const test = t.toJSON ? t.toJSON() : t;

  const questions = Array.isArray(parseIfJsonString(test.questions)) ? parseIfJsonString(test.questions) : [];
  const parts = Array.isArray(parseIfJsonString(test.partInstructions)) ? parseIfJsonString(test.partInstructions) : [];

  let runningStart = 1;
  let total = 0;

  const getSectionQuestions = (partIndex, sectionIndex) =>
    questions
      .filter((q) => Number(q?.partIndex) === Number(partIndex) && Number(q?.sectionIndex) === Number(sectionIndex))
      .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));

  for (let pIdx = 0; pIdx < parts.length; pIdx++) {
    const p = parts[pIdx];
    const sections = Array.isArray(p?.sections) ? p.sections : [];
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx] || {};
      const sectionType = String(section?.questionType || 'fill').toLowerCase();
      const sectionQuestions = getSectionQuestions(pIdx, sIdx);
      if (!sectionQuestions.length) continue;

      const firstQ = sectionQuestions[0];

      if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
        const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
        if (!map) continue;
        const keys = Object.keys(map).map(k => parseInt(k,10)).filter(n => Number.isFinite(n));
        total += keys.length;
        continue;
      }

      if (sectionType === 'matching') {
        const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
        if (map) {
          const keys = Object.keys(map).map(k => parseInt(k,10)).filter(n => Number.isFinite(n));
          total += keys.length;
        } else {
          const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : Array.isArray(firstQ?.items) ? firstQ.items : [];
          total += left.length;
        }
        continue;
      }

      if (sectionType === 'multi-select') {
        let groupStart = 0; let totalCount=0;
        for (const q of sectionQuestions) {
          const required = Number(q?.requiredAnswers) || 2;
          totalCount += required;
        }
        total += totalCount;
        continue;
      }

      // default
      total += sectionQuestions.length;
    }
  }

  console.log('Computed total for test', testId, '=>', total);
  await sequelize.close();
})();