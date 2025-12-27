const express = require('express');
const router = express.Router();
const ReadingTest = require('../models/ReadingTest');

// Get all reading tests
router.get('/', async (req, res) => {
  try {
    const tests = await ReadingTest.findAll({ order: [['createdAt', 'DESC']] });
    // Parse passages JSON if it's a string
    const parsed = tests.map(test => {
      const data = test.toJSON();
      if (typeof data.passages === 'string') {
        data.passages = JSON.parse(data.passages);
      }
      return data;
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single reading test by id
router.get('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    const data = test.toJSON();
    if (typeof data.passages === 'string') {
      data.passages = JSON.parse(data.passages);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new reading test
router.post('/', async (req, res) => {
  const { title, classCode, teacherName, passages } = req.body;

  try {
    const newTest = await ReadingTest.create({
      title,
      classCode,
      teacherName,
      passages
    });
    res.status(201).json({ message: '✅ Đã tạo đề Reading thành công!', test: newTest });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a reading test
router.put('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.update(req.body);
    const data = test.toJSON();
    if (typeof data.passages === 'string') {
      data.passages = JSON.parse(data.passages);
    }
    res.json({ message: '✅ Đã cập nhật đề Reading thành công!', test: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Submit answers for a reading test and compute score
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body && req.body.answers ? req.body.answers : {};

    const test = await ReadingTest.findByPk(id);
    if (!test) return res.status(404).json({ message: 'Cannot find test' });

    // Normalize test passages
    const data = test.toJSON();
    const passages = typeof data.passages === 'string' ? JSON.parse(data.passages) : data.passages || [];

    let qCounter = 1;
    let correct = 0;
    let total = 0;

    const normalize = (v) => (v == null ? '' : String(v).trim().toLowerCase());

    // Helper to map correctCount -> IELTS band (IDP table provided)
    const bandFromCorrect = (c) => {
      if (c >= 39) return 9;
      if (c >= 37) return 8.5;
      if (c >= 35) return 8;
      if (c >= 33) return 7.5;
      if (c >= 30) return 7;
      if (c >= 27) return 6.5;
      if (c >= 24) return 6;
      if (c >= 20) return 5.5;
      if (c >= 15) return 5;
      if (c >= 13) return 4.5;
      if (c >= 10) return 4;
      return 3.5; // below table
    };

    // Iterate through passages/sections/questions mapping to visual question numbers
    for (const p of passages) {
      const sections = p.sections || [{ questions: p.questions }];
      for (const s of sections) {
        for (const q of (s.questions || [])) {
          const qType = (q.questionType || q.type || '').toLowerCase();

          if (qType === 'ielts-matching-headings' || qType === 'matching-headings') {
            const paragraphs = q.paragraphs || q.answers || [];
            const baseKey = `q_${qCounter}`;
            const studentRaw = answers[baseKey];
            let studentObj = {};
            try { studentObj = studentRaw ? JSON.parse(studentRaw) : {}; } catch (e) { studentObj = {}; }

            const correctMap = {};
            // Expected answers: either q.answers mapping paragraphId->heading or blanks array
            if (q.answers && typeof q.answers === 'object') {
              Object.assign(correctMap, q.answers);
            }
            if (q.blanks && Array.isArray(q.blanks)) {
              q.blanks.forEach((b, idx) => {
                if (b && b.paragraphId) correctMap[b.paragraphId] = b.correctAnswer || '';
                if (b && b.id && !correctMap[b.id]) correctMap[b.id] = b.correctAnswer || '';
              });
            }

            for (let i = 0; i < (paragraphs.length || 0); i++) {
              const para = paragraphs[i];
              const paragraphId = typeof para === 'object' ? (para.id || para.paragraphId || '') : String(para);
              const expected = normalize(correctMap[paragraphId] || '');
              const student = normalize(studentObj[paragraphId] || '');
              total++;
              if (expected && student && expected === student) correct++;
            }

            qCounter += (paragraphs.length || 0) || 1;
            continue;
          }

          // Cloze/Summary: count each [BLANK] as individual
          if (qType === 'cloze-test' || qType === 'summary-completion') {
            const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
            if (clozeText) {
              const blanks = clozeText.match(/\[BLANK\]/gi) || [];
              const baseKey = `q_${qCounter}`;
              for (let bi = 0; bi < blanks.length; bi++) {
                const student = normalize(answers[`${baseKey}_${bi}`] || '');
                // expected from q.blanks[bi]?.correctAnswer or q.answers array
                let expected = '';
                if (q.blanks && q.blanks[bi]) expected = normalize(q.blanks[bi].correctAnswer || '');
                total++;
                if (expected && student && expected === student) correct++;
              }
              qCounter += blanks.length || 1;
              continue;
            }
          }

          // Paragraph matching: count ellipsis blanks
          if (qType === 'paragraph-matching') {
            const text = (q.questionText || '').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, ' ').replace(/<br\s*\/?/gi, ' ').trim();
            const parts = text ? text.split(/(\.{3,}|…+)/) : [];
            const blanks = parts.filter((p2) => p2 && p2.match(/\.{3,}|…+/));
            const baseKey = `q_${qCounter}`;
            if (blanks.length > 0) {
              for (let bi = 0; bi < blanks.length; bi++) {
                const student = normalize(answers[`${baseKey}_${bi}`] || '');
                // expected: q.blanks[bi]?.correctAnswer or q.correctAnswers?
                let expected = '';
                if (q.blanks && q.blanks[bi]) expected = normalize(q.blanks[bi].correctAnswer || '');
                total++;
                if (expected && student && expected === student) correct++;
              }
            } else {
              const student = normalize(answers[`${baseKey}_0`] || '');
              const expected = normalize(q.correctAnswer || '');
              total++;
              if (expected && student && expected === student) correct++;
            }

            qCounter += blanks.length > 0 ? blanks.length : 1;
            continue;
          }

          // Default: single visual question
          const key = `q_${qCounter}`;
          const studentVal = answers[key];
          const expected = q.correctAnswer || '';

          // Multi-select answers sometimes stored as comma-separated
          const normalizeMulti = (str) => (str ? String(str).split(',').map(s => s.trim().toLowerCase()).filter(Boolean).sort() : []);

          total++;
          if (expected) {
            if ((q.questionType || q.type) === 'multi-select') {
              const expArr = normalizeMulti(expected);
              const stuArr = normalizeMulti(studentVal);
              if (expArr.length && stuArr.length && JSON.stringify(expArr) === JSON.stringify(stuArr)) correct++;
            } else {
              if (normalize(expected) && normalize(studentVal) && normalize(expected) === normalize(studentVal)) correct++;
            }
          }

          qCounter++;
        }
      }
    }

    const band = bandFromCorrect(correct);

    return res.json({
      total,
      correct,
      band,
      scorePercentage: total > 0 ? Math.round((correct / total) * 100) : 0
    });
  } catch (err) {
    console.error('Error scoring reading test:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a reading test
router.delete('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.destroy();
    res.json({ message: 'Deleted Test' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
