'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ReadingSubmission = require('../models/ReadingSubmission');
const ReadingTest = require('../models/ReadingTest');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || process.env.MONGO || 'mongodb://localhost:27017/myproject';

const normalize = (v) => (v == null ? '' : String(v).trim().toLowerCase());
const parseMaybeJson = (v) => {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try { return JSON.parse(String(v)); } catch (e) { return v; }
};

function countQuestionsForTest(test) {
  let total = 0;
  if (!test) return 0;
  const passages = Array.isArray(test.passages) ? test.passages : (Array.isArray(test.questions) ? [{ questions: test.questions }] : []);
  for (const p of passages) {
    const sections = Array.isArray(p.sections) ? p.sections : [{ questions: p.questions || p.questions }];
    for (const s of sections) {
      const questions = Array.isArray(s.questions) ? s.questions : (Array.isArray(p.questions) ? p.questions : []);
      for (const q of questions) {
        const t = String(q?.type || q?.questionType || '').toLowerCase();
        if (/matching.*headings|matching information/i.test(t)) {
          total += (q.paragraphs || q.items || q.leftItems || []).length || 1;
        } else if (/summary|cloze|completion|fill/i.test(t)) {
          const text = q.paragraphText || q.questionText || q.text || '';
          const blanks = (String(text).match(/_{2,}|\.{3,}|\[BLANK\]/gi) || []).length;
          if (blanks) total += blanks;
          else if (Array.isArray(q.answers) && q.answers.length) total += q.answers.length;
          else total += 1;
        } else if (/paragraph.*match/i.test(t) || /matching information/i.test(t)) {
          const text = q.questionText || '';
          const blanks = (String(text).match(/_{2,}|\.{3,}|\[BLANK\]/gi) || []).length;
          total += blanks || (Array.isArray(q.answers) ? q.answers.length : 1);
        } else if (/multi[- ]?select|multiple choice/i.test(t)) {
          total += q.requiredAnswers || q.maxSelections || 1;
        } else {
          total += 1;
        }
      }
    }
  }
  return total;
}

function evaluateSubmission(submission, test) {
  const answers = parseMaybeJson(submission.answers) || {};
  let correct = 0;
  let qCounter = 1;

  const safeGet = (k) => {
    return answers[k] ?? answers[k.replace(/^q_?/, 'q')];
  };

  const passages = Array.isArray(test.passages) ? test.passages : (Array.isArray(test.questions) ? [{ questions: test.questions }] : []);
  for (const p of passages) {
    const sections = Array.isArray(p.sections) ? p.sections : [{ questions: p.questions || p.questions }];
    for (const s of sections) {
      const questions = Array.isArray(s.questions) ? s.questions : (Array.isArray(p.questions) ? p.questions : []);
      for (const q of questions) {
        const t = String(q?.type || q?.questionType || '').toLowerCase();

        if (/matching.*headings|matching information/i.test(t)) {
          const paragraphs = q.paragraphs || q.items || q.leftItems || [];
          const baseKey = `q_${qCounter}`;
          let map = {};
          try {
            const raw = safeGet(baseKey);
            if (typeof raw === 'string') map = JSON.parse(raw);
            else if (typeof raw === 'object') map = raw;
          } catch (e) { map = {}; }
          for (let i = 0; i < (paragraphs.length || 1); i++) {
            const paragraph = paragraphs[i];
            const paraId = paragraph && (paragraph.id || paragraph.paragraphId) ? (paragraph.id || paragraph.paragraphId) : String(i);
            const student = (map[paraId] ?? map[i] ?? map[String(i)]);
            const correctVal = Array.isArray(q.answers) ? q.answers[i] : (q.correctMap && q.correctMap[paraId]) ?? (Array.isArray(q.headings) ? q.headings[i] : null);
            if (student != null && correctVal != null) {
              if (normalize(student) === normalize(correctVal)) correct++;
            }
            qCounter++;
          }
          continue;
        }

        if (/summary|cloze|completion|fill/i.test(t)) {
          const text = q.paragraphText || q.questionText || q.text || '';
          const blanks = (String(text).match(/_{2,}|\.{3,}|\[BLANK\]/gi) || []).length;
          if (blanks > 0) {
            for (let bi = 0; bi < blanks; bi++) {
              const k = `q_${qCounter}_${bi}`;
              const student = safeGet(k);
              const correctAns = (Array.isArray(q.answers) && q.answers[bi] != null) ? q.answers[bi] : (Array.isArray(q.correct) ? q.correct[bi] : (q.answer ?? null));
              if (student != null && correctAns != null && normalize(student) === normalize(correctAns)) correct++;
              qCounter++;
            }
            continue;
          } else {
            const key = `q_${qCounter}`;
            const student = safeGet(key);
            const correctAns = q.answer || (Array.isArray(q.answers) ? q.answers[0] : q.correct);
            if (student != null && correctAns != null && normalize(student) === normalize(correctAns)) correct++;
            qCounter++;
            continue;
          }
        }

        if (/paragraph.*match/i.test(t)) {
          const text = q.questionText || '';
          const blanks = (String(text).match(/_{2,}|\.{3,}|\[BLANK\]/gi) || []).length || (Array.isArray(q.answers) ? q.answers.length : 1);
          for (let bi = 0; bi < blanks; bi++) {
            const key = `q_${qCounter}_${bi}`;
            const student = safeGet(key);
            const correctAns = (Array.isArray(q.answers) && q.answers[bi] != null) ? q.answers[bi] : (q.correct && q.correct[bi]);
            if (student != null && correctAns != null && normalize(student) === normalize(correctAns)) correct++;
            qCounter++;
          }
          continue;
        }

        if (/multi[- ]?select|multiple choice/i.test(t)) {
          const key = `q_${qCounter}`;
          const student = safeGet(key);
          if (Array.isArray(student) && Array.isArray(q.correct)) {
            for (const sel of student) {
              if (q.correct.some((c) => normalize(c) === normalize(sel))) correct++;
            }
            qCounter++;
            continue;
          } else if (typeof student === 'string' || typeof student === 'number') {
            const correctAns = Array.isArray(q.correct) ? q.correct[0] : q.answer || q.correct;
            if (normalize(student) === normalize(correctAns)) correct++;
            qCounter++;
            continue;
          } else {
            qCounter++;
            continue;
          }
        }

        // default single
        {
          const key = `q_${qCounter}`;
          const student = safeGet(key);
          const correctAns = q.answer || (Array.isArray(q.answers) ? q.answers[0] : q.correct);
          if (student != null && correctAns != null && normalize(student) === normalize(correctAns)) correct++;
          qCounter++;
        }
      }
    }
  }

  const total = countQuestionsForTest(test);
  const percentage = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percentage };
}

function computeBand(percentage) {
  if (percentage >= 90) return 9;
  if (percentage >= 80) return 8;
  if (percentage >= 70) return 7;
  if (percentage >= 60) return 6;
  if (percentage >= 50) return 5;
  if (percentage >= 40) return 4;
  return 3;
}

async function main() {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error('Usage: node recompute-reading-submission.js <submissionId1> [id2 ...]');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    for (const id of ids) {
      const sub = await ReadingSubmission.findById(id);
      if (!sub) { console.warn('Submission not found:', id); continue; }
      const test = await ReadingTest.findById(sub.testId);
      if (!test) { console.warn('Test not found for submission', id, 'testId:', sub.testId); continue; }

      const res = evaluateSubmission(sub.toObject(), test.toObject());
      const band = computeBand(res.percentage);

      sub.correct = res.correct;
      sub.total = res.total;
      sub.scorePercentage = res.percentage;
      sub.band = band;
      await sub.save();

      console.log(`Updated ${id}: correct=${res.correct}/${res.total} (${res.percentage}%) band=${band}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();