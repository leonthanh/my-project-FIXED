/* Evaluate scoreListening for a single submission to see computed totals */
const sequelize = require('../db');
const ListeningSubmission = require('../models/ListeningSubmission');
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
  const submissionId = process.argv[2] ? Number(process.argv[2]) : null;
  if (!submissionId) {
    console.error('Usage: node eval-submission-score.js <submissionId>');
    process.exit(1);
  }

  await sequelize.authenticate();
  const s = await ListeningSubmission.findByPk(submissionId);
  if (!s) { console.error('submission not found'); process.exit(1); }
  const test = await ListeningTest.findByPk(s.testId);
  if (!test) { console.error('test not found'); process.exit(1); }

  const questions = parseIfJsonString(test.questions);
  const partInstructions = parseIfJsonString(test.partInstructions);
  const answers = parseIfJsonString(s.answers) || {};

  // Simplified scoring: reuse same code as rescore script for multi-select and defaults
  const explodeAccepted = (val) => {
    if (val == null) return [];
    if (Array.isArray(val)) return val;
    const s = String(val);
    if (s.includes('|')) return s.split('|').map(x => x.trim()).filter(Boolean);
    if (s.includes('/')) return s.split('/').map(x => x.trim()).filter(Boolean);
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
    return [s];
  };

  const normalize = (v) => (v == null ? '' : String(v)).trim().toLowerCase();
  const toIndices = (val) => {
    const parts = Array.isArray(val) ? val : explodeAccepted(val);
    return parts.map((x) => {
      const t = String(x).trim();
      if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0)-65;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }).filter(n => n != null);
  };
  const setEq = (a,b) => {
    const A = new Set(a); const B = new Set(b); if (A.size !== B.size) return false; for (const v of A) if (!B.has(v)) return false; return true;
  };

  let correctCount = 0; let totalCount = 0; const details = [];

  // Try scoring from sections
  if (Array.isArray(partInstructions) && Array.isArray(questions)) {
    for (let pIdx=0;pIdx<partInstructions.length;pIdx++){
      const part = partInstructions[pIdx];
      const sections = Array.isArray(part?.sections) ? part.sections : [];
      for (let sIdx=0;sIdx<sections.length;sIdx++){
        const section = sections[sIdx] || {};
        const sectionType = String(section?.questionType || 'fill').toLowerCase();
        const sectionQuestions = questions.filter((q) => Number(q?.partIndex) === Number(pIdx) && Number(q?.sectionIndex) === Number(sIdx))
          .sort((a,b)=>(Number(a?.questionIndex)||0)-(Number(b?.questionIndex)||0));
        if (!sectionQuestions.length) continue;

        const firstQ = sectionQuestions[0];
        if (sectionType === 'multi-select') {
          let groupStart = section.startingQuestionNumber || 1;
          for (const q of sectionQuestions) {
            const required = Number(q?.requiredAnswers) || 2;
            const student = answers[`q${groupStart}`];
            const expectedRaw = q?.correctAnswer ?? q?.answers;
            const studentIndices = toIndices(student);
            const expectedIndices = toIndices(expectedRaw);
            totalCount += required;
            const ok = expectedIndices.length ? setEq(studentIndices, expectedIndices) : false;
            if (ok) correctCount += required;
            details.push({ num: groupStart, required, ok });
            groupStart += required;
          }
          continue;
        }

        if (sectionType === 'matching') {
          const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
          if (map) {
            const keys = Object.keys(map).map(k=>parseInt(k,10)).filter(n=>Number.isFinite(n));
            totalCount += keys.length;
            continue;
          }
          const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : Array.isArray(firstQ?.items) ? firstQ.items : [];
          totalCount += left.length;
          continue;
        }

        if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
          const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
          if (map) {
            const keys = Object.keys(map).map(k=>parseInt(k,10)).filter(n=>Number.isFinite(n));
            totalCount += keys.length; continue;
          }
          continue;
        }

        // default
        totalCount += sectionQuestions.length;
      }
    }
  }

  console.log('Submission', submissionId, 'computed totalCount=', totalCount, 'correctCount=', correctCount);
  console.log('sample details (first 10):', details.slice(0,10));

  await sequelize.close();
})();