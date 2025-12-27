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

          // Helper: convert various stored formats (roman label like 'i','ii' or numeric index '0'/'1' or numeric-as-1-based) to a canonical label string
          const romans = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx','xxi','xxii','xxiii','xxiv','xxv'];
          const toLabel = (val, headings) => {
            if (val === null || val === undefined) return '';
            const s = String(val).trim().toLowerCase();
            if (!s) return '';
            // already a roman-like label
            if (/^[ivxlcdm]+$/.test(s)) return s;
            // numeric index
            const m = s.match(/^\d+$/);
            if (m) {
              const n = Number(m[0]);
              if (Array.isArray(headings) && headings.length) {
                // try 0-based index
                if (n >= 0 && n < headings.length) return String((headings[n].label || headings[n].id || headings[n].text || '')).trim().toLowerCase();
                // try 1-based index
                if (n - 1 >= 0 && n - 1 < headings.length) return String((headings[n - 1].label || headings[n - 1].id || headings[n - 1].text || '')).trim().toLowerCase();
              }
              // fallback to roman array (treat number as 1-based)
              if (n > 0 && n <= romans.length) return romans[n - 1];
              if (n >= 0 && n < romans.length) return romans[n];
              return s;
            }
            return s;
          };

          const headingsArray = q.headings || [];

          for (let i = 0; i < (paragraphs.length || 0); i++) {
            const para = paragraphs[i];
            const paragraphId = typeof para === 'object' ? (para.id || para.paragraphId || '') : String(para);
            const expected = toLabel(correctMap[paragraphId] || '', headingsArray);
            const student = toLabel(studentObj[paragraphId] || '', headingsArray);
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

            // helper to find student answer robustly across different key naming conventions
            const findStudentBlank = (questionNumber, bi) => {
              // 1) direct: q_<qCounter>_<bi>
              const direct = answers[`${baseKey}_${bi}`];
              if (direct !== undefined) return normalize(direct);

              // 2) try q_<questionNumber> (for inputs that use q_<num> as base and blankIndex as suffix)
              const alt1 = answers[`q_${questionNumber}_${0}`]; // not likely but check

              // 3) search keys that include the questionNumber (e.g., '0_10_2' or '10_2' or 'q_11_0')
              for (const k of Object.keys(answers || {})) {
                if (!answers[k]) continue;
                const keyStr = String(k);
                const pattern = new RegExp(`(^|_)${questionNumber}(_|$)`);
                if (pattern.test(keyStr)) {
                  // if key ends with _<bi> or contains _<bi> after questionNumber we prefer it
                  if (new RegExp(`_${bi}($|_)`).test(keyStr) || keyStr.endsWith(`_${bi}`)) {
                    return normalize(answers[k]);
                  }
                  // fallback: if key contains the questionNumber, return its value
                  return normalize(answers[k]);
                }
              }

              // 4) fallback to empty
              return '';
            };

            for (let bi = 0; bi < blanks.length; bi++) {
              const questionNumber = (q.questionNumber || qCounter) + bi;
              const student = findStudentBlank(questionNumber, bi);
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

// Detailed per-question scoring utility
function getDetailedScoring(testData, answers = {}) {
  const details = [];
  let qCounter = 1;

  for (const p of (testData.passages || [])) {
    const sections = p.sections || [{ questions: p.questions }];
    for (const s of sections) {
      for (const q of (s.questions || [])) {
        const qType = (q.questionType || q.type || '').toLowerCase();
        // Default row
        const row = {
          questionNumber: q.questionNumber || qCounter,
          questionType: qType,
          expected: q.correctAnswer || q.answers || null,
          student: null,
          isCorrect: false
        };

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
          const romans = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx','xxi','xxii','xxiii','xxiv','xxv'];
          const toLabel = (val, headings) => {
            if (val === null || val === undefined) return '';
            const s = String(val).trim().toLowerCase();
            if (!s) return '';
            if (/^[ivxlcdm]+$/.test(s)) return s;
            const m = s.match(/^\d+$/);
            if (m) {
              const n = Number(m[0]);
              if (Array.isArray(headings) && headings.length) {
                if (n >= 0 && n < headings.length) return String((headings[n].label || headings[n].id || headings[n].text || '')).trim().toLowerCase();
                if (n - 1 >= 0 && n - 1 < headings.length) return String((headings[n - 1].label || headings[n - 1].id || headings[n - 1].text || '')).trim().toLowerCase();
              }
              if (n > 0 && n <= romans.length) return romans[n - 1];
              if (n >= 0 && n < romans.length) return romans[n];
              return s;
            }
            return s;
          };
          const headingsArray = q.headings || [];

          for (let i = 0; i < (paragraphs.length || 0); i++) {
            const para = paragraphs[i];
            const paragraphId = typeof para === 'object' ? (para.id || para.paragraphId || '') : String(para);
            const expectedLabel = toLabel(correctMap[paragraphId] || '', headingsArray);

            // find student raw value robustly using question number as hint
            const questionNum = (q.questionNumber || qCounter) + i;
            let studentRaw = studentObj[paragraphId] || '';
            if (!studentRaw) {
              // scan answers object for keys mentioning questionNum or ending with `_<questionNum>`
              for (const k of Object.keys((answers || {}))) {
                const keyStr = String(k);
                if (new RegExp(`(^|_)${questionNum}(_|$)`).test(keyStr)) {
                  studentRaw = (answers && answers[k]) || '';
                  break;
                }
              }
            }

            const studentLabel = toLabel(studentRaw || '', headingsArray);
            details.push({
              questionNumber: (q.questionNumber || qCounter) + i,
              paragraphId,
              expected: correctMap[paragraphId] || '',
              student: studentRaw || '',
              expectedLabel,
              studentLabel,
              isCorrect: expectedLabel && studentLabel && expectedLabel === studentLabel
            });
          }

          qCounter += (paragraphs.length || 0) || 1;
          continue;
        }

        // Cloze / summary-completion: break into blanks and find student answers
        if (qType === 'cloze-test' || qType === 'summary-completion') {
          const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
          if (clozeText) {
            const blanks = clozeText.match(/\[BLANK\]/gi) || [];

            const findStudentBlank = (questionNumber, bi) => {
              // 1) direct q_<base>_<bi>
              const baseKey = `q_${q.questionNumber || qCounter}`;
              const direct = answers[`${baseKey}_${bi}`];
              if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct);

              // 2) common frontend keys (e.g., '0_0_1', '0_1_2') which may include questionNumber
              for (const k of Object.keys(answers || {})) {
                const val = answers[k];
                if (val === undefined || val === null || String(val).trim() === '') continue;
                const keyStr = String(k);
                // exact match ending with _<bi>
                if (keyStr.endsWith(`_${bi}`) && keyStr.includes(String(questionNumber))) return String(val);
                // contains question number and blank index anywhere
                if (new RegExp(`(^|_)${questionNumber}(_|_)`).test(keyStr) && keyStr.includes(`_${bi}`)) return String(val);
                // contains question number alone -> fallback
                if (new RegExp(`(^|_)${questionNumber}(_|$)`).test(keyStr)) return String(val);
              }

              return '';
            };

            for (let bi = 0; bi < blanks.length; bi++) {
              const questionNumber = (q.questionNumber || qCounter) + bi;
              const studentRaw = findStudentBlank(questionNumber, bi) || '';
              const expectedRaw = (q.blanks && q.blanks[bi] && q.blanks[bi].correctAnswer) ? q.blanks[bi].correctAnswer : '';
              const expectedNorm = normalize(expectedRaw);
              const studentNorm = normalize(studentRaw);
              details.push({
                questionNumber: questionNumber,
                paragraphId: null,
                expected: expectedRaw || '',
                student: studentRaw || '',
                expectedLabel: expectedRaw || '',
                studentLabel: studentRaw || '',
                isCorrect: expectedNorm && studentNorm && expectedNorm === studentNorm
              });
            }

            qCounter += blanks.length || 1;
            continue;
          }
        }

        // default simple types
        const key = `q_${qCounter}`;
        const studentVal = answers[key];
        row.student = studentVal || '';
        if ((q.questionType || q.type) === 'multi-select') {
          const expArr = normalizeMulti(q.correctAnswer || '');
          const stuArr = normalizeMulti(studentVal);
          row.isCorrect = (expArr.length && stuArr.length && JSON.stringify(expArr) === JSON.stringify(stuArr));
        } else {
          const expectedNorm = normalize(q.correctAnswer || '');
          const studentNorm = normalize(studentVal || '');
          row.isCorrect = expectedNorm && studentNorm && expectedNorm === studentNorm;
        }
        details.push(row);

        qCounter++;
      }
    }
  }

  return details;
}

module.exports = { scoreReadingTest, bandFromCorrect, getDetailedScoring };
