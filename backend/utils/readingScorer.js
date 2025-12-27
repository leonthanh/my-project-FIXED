function normalize(v) {
  if (v == null) return '';
  // Convert to string, lowercase
  let s = String(v).normalize('NFD');
  // Remove diacritics
  s = s.replace(/\p{Diacritic}/gu, '');
  // Remove punctuation (keep letters/numbers/space)
  s = s.replace(/[\p{P}\p{S}]/gu, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  return s;
}

function normalizeMulti(str) {
  return str ? String(str).split(',').map(s => normalize(s)).filter(Boolean).sort() : []; 
}

function bandFromCorrect(c) {
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
  return 3.5;
}

function scoreReadingTest(testData, answers = {}) {
  let qCounter = 1;
  let correct = 0;
  let total = 0;

  for (const p of (testData.passages || [])) {
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
          if (q.answers && typeof q.answers === 'object') Object.assign(correctMap, q.answers);
          if (q.blanks && Array.isArray(q.blanks)) {
            q.blanks.forEach((b) => {
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

        if (qType === 'cloze-test' || qType === 'summary-completion') {
          const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
          if (clozeText) {
            const blanks = clozeText.match(/\[BLANK\]/gi) || [];
            const baseKey = `q_${qCounter}`;
            for (let bi = 0; bi < blanks.length; bi++) {
              const student = normalize(answers[`${baseKey}_${bi}`] || '');
              let expected = '';
              if (q.blanks && q.blanks[bi]) expected = normalize(q.blanks[bi].correctAnswer || '');
              total++;
              if (expected && student && expected === student) correct++;
            }
            qCounter += blanks.length || 1;
            continue;
          }
        }

        if (qType === 'paragraph-matching') {
          const text = (q.questionText || '').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, ' ').replace(/<br\s*\/?/gi, ' ').trim();
          const parts = text ? text.split(/(\.{3,}|…+)/) : [];
          const blanks = parts.filter((p2) => p2 && p2.match(/\.{3,}|…+/));
          const baseKey = `q_${qCounter}`;
          if (blanks.length > 0) {
            for (let bi = 0; bi < blanks.length; bi++) {
              const student = normalize(answers[`${baseKey}_${bi}`] || '');
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

        // Default
        const key = `q_${qCounter}`;
        const studentVal = answers[key];
        const expected = q.correctAnswer || '';

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
  const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { total, correct, band, scorePercentage };
}

module.exports = { scoreReadingTest, bandFromCorrect };
