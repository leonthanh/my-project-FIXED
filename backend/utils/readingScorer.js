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

// Normalize multi-select answers (supports arrays, comma strings, letters, indices)
function normalizeMultiTokens(raw, options = []) {
  if (raw === undefined || raw === null) return [];

  const toToken = (val) => {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (!s) return '';

    const letterToOption = (ch) => {
      const idx = ch.toUpperCase().charCodeAt(0) - 65;
      if (Array.isArray(options) && options[idx] !== undefined) {
        const opt = options[idx];
        const optText = (typeof opt === 'object') ? (opt.text || opt.label || opt.id || '') : opt;
        if (optText) return normalize(optText);
      }
      return ch.toLowerCase();
    };

    // If teacher wrote combined letters like "de" (no separator), split and map each letter to option text
    if (/^[A-Za-z]{2,}$/.test(s)) {
      return s
        .split('')
        .map((ch) => letterToOption(ch))
        .filter(Boolean);
    }

    // Numeric index → map to option text if possible, else to letter A/B/...
    if (/^\d+$/.test(s)) {
      const idx = Number(s);
      if (Array.isArray(options) && options[idx] !== undefined) {
        const opt = options[idx];
        const optText = (typeof opt === 'object') ? (opt.text || opt.label || opt.id || '') : opt;
        if (optText) return normalize(optText);
      }
      if (idx >= 0 && idx < 26) return letterToOption(String.fromCharCode(65 + idx));
      return s.toLowerCase();
    }

    // Single letter choice → map to option text if available
    if (/^[A-Za-z]$/.test(s)) return letterToOption(s);

    // Fallback: normalize free text
    return normalize(s);
  };

  const parts = Array.isArray(raw) ? raw : String(raw).split(/[\s,;/]+/);
  const tokens = parts
    .flatMap((p) => toToken(p))
    .filter(Boolean)
    .map((t) => (Array.isArray(t) ? t : [t]))
    .flat();
  return Array.from(new Set(tokens));
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
          let studentRaw = answers[baseKey];

          // also accept student answers stored under the question's own questionNumber (editor may use q_<questionNumber>)
          const altBaseKey = `q_${q.questionNumber || qCounter}`;
          if (!studentRaw && answers[altBaseKey]) studentRaw = answers[altBaseKey];

          // If still not found or empty, scan all answers keys to find a JSON/object mapping that mentions paragraph ids
          let studentObj = {};
          const paragraphIds = ((q.paragraphs || q.answers || []) || []).map(p => (typeof p === 'object' ? (p.id || p.paragraphId || '') : String(p))).filter(Boolean);

          if (studentRaw && typeof studentRaw === 'object') {
            studentObj = studentRaw;
          } else if (studentRaw && typeof studentRaw === 'string') {
            try {
              studentObj = JSON.parse(studentRaw);
            } catch (e) {
              studentObj = {};
            }
          } else {
            // scan answers for an object whose keys intersect paragraphIds
            for (const k of Object.keys(answers || {})) {
              const val = answers[k];
              if (!val) continue;
              let parsed = null;
              if (typeof val === 'object') parsed = val;
              else if (typeof val === 'string') {
                try { parsed = JSON.parse(val); } catch (e) { parsed = null; }
              }
              if (parsed && typeof parsed === 'object') {
                const keys = Object.keys(parsed || {});
                const intersects = keys.some(kk => paragraphIds.includes(kk));
                if (intersects) {
                  studentObj = parsed;
                  break;
                }
              }
            }
          }

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
            const baseKey = `q_${q.questionNumber || qCounter}`;

            // helper to find student answer robustly across different key naming conventions
            const findStudentBlank = (questionNumber, bi) => {
              // 1) direct: q_<qQuestionNumber or qCounter>_<bi>
              const direct = answers[`${baseKey}_${bi}`];
              if (direct !== undefined) return normalize(direct);

              // check for single-blank stored as q_<base> (no suffix)
              const directBase = answers[baseKey];
              if (directBase !== undefined) return normalize(directBase);

              // 2) try q_<questionNumber>_<0> (for inputs that use q_<num> as base and blankIndex as suffix)
              const alt1 = answers[`q_${questionNumber}_0`]; // not likely but check
              if (alt1 !== undefined) return normalize(alt1);

              // 3) search keys that include the questionNumber (e.g., '0_10_2' or '10_2' or 'q_11_0')
              for (const k of Object.keys(answers || {})) {
                if (!answers[k]) continue;
                const keyStr = String(k);
                // Prefer keys that end with _<bi> (e.g., '0_0_0') regardless of questionNumber
                if (keyStr.endsWith(`_${bi}`) || new RegExp(`_${bi}($|_)`).test(keyStr)) {
                  return normalize(answers[k]);
                }
                const pattern = new RegExp(`(^|_)${questionNumber}(_|$)`);
                if (pattern.test(keyStr)) {
                  // if key contains questionNumber and ends with _<bi>, prefer it
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

            // helper: support multiple expected variants separated by |, /, or ;
            const expectedVariantsFromRaw = (raw) => {
              if (raw === null || raw === undefined) return [];
              // split on pipe, slash, semicolon (and commas too just in case), trim and normalize
              return String(raw).split(/\s*[|\/;,]\s*/).map(s => normalize(s)).filter(Boolean);
            };

            for (let bi = 0; bi < blanks.length; bi++) {
              const questionNumber = (q.questionNumber || qCounter) + bi;
              let student = findStudentBlank(questionNumber, bi);

              let expectedRaw = (q.blanks && q.blanks[bi] && q.blanks[bi].correctAnswer) ? q.blanks[bi].correctAnswer : '';

              // If summary-completion, map letter(s) to option texts (A->options[0], B->options[1], ...)
              let expectedVariants = [];
              if (qType === 'summary-completion') {
                const letters = String(expectedRaw).split(/\s*[|\/,;]\s*/).map(s => s.trim().toUpperCase()).filter(Boolean);
                expectedVariants = letters.map(l => {
                  const idx = l.charCodeAt(0) - 65;
                  return (Array.isArray(q.options) && q.options[idx]) ? normalize(q.options[idx]) : '';
                }).filter(Boolean);

                // If student entered a letter, map it to option text
                if (student && /^[A-Z]$/.test(student.toUpperCase())) {
                  const sidx = student.toUpperCase().charCodeAt(0) - 65;
                  student = (Array.isArray(q.options) && q.options[sidx]) ? normalize(q.options[sidx]) : student;
                }

              } else {
                expectedVariants = expectedVariantsFromRaw(expectedRaw);
              }

              total++;
              if (expectedVariants.length && student && expectedVariants.includes(student)) correct++;
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

        // Multi-select (treat each required answer as one mark)
        if ((q.questionType || q.type) === 'multi-select') {
          const key = `q_${qCounter}`;
          const studentVal = answers[key];
          const expectedTokens = normalizeMultiTokens(q.correctAnswer || q.answers || '', q.options || []);
          const studentTokens = normalizeMultiTokens(studentVal, q.options || []);
          const required = q.requiredAnswers || q.maxSelection || expectedTokens.length || 2;
          const matched = expectedTokens.filter(t => studentTokens.includes(t)).length;
          total += required;
          correct += matched;
          qCounter += required;
          continue;
        }

        // Default
        const key = `q_${qCounter}`;
        const studentVal = answers[key];
        const expected = q.correctAnswer || '';

        total++;
        if (expected) {
          const qBaseType = (q.questionType || q.type || '').toLowerCase();
          const isShortLike = (
            qBaseType === 'short-answer' ||
            qBaseType === 'sentence-completion' ||
            qBaseType === 'fill-in-the-blanks' ||
            qBaseType === 'fill-in-blank' ||
            qBaseType === 'fill-in'
          );

          if (isShortLike) {
            const expectedVariants = String(expected).split(/\s*[|\/;,]\s*/).map(s => normalize(s)).filter(Boolean);
            const studentNorm = normalize(studentVal || '');
            if (expectedVariants.length && studentNorm && expectedVariants.includes(studentNorm)) correct++;
          } else {
            if (normalize(expected) && normalize(studentVal) && normalize(expected) === normalize(studentVal)) correct++;
          }
        }

        qCounter++;
      }
    }
  }

  // Delegate to detailed scoring for consistent per-question handling
  const details = getDetailedScoring(testData, answers || {});
  const aggTotal = details.length;
  const aggCorrect = details.filter(d => d.isCorrect).length;
  const band = bandFromCorrect(aggCorrect);
  const scorePercentage = aggTotal > 0 ? Math.round((aggCorrect / aggTotal) * 100) : 0;
  return { total: aggTotal, correct: aggCorrect, band, scorePercentage };
}

// Detailed per-question scoring utility
function getDetailedScoring(testData, answers = {}) {
  const details = [];
  let qCounter = 1;
  let passageIndex = 0;

  // Accept answers stored as a JSON string (root) or with nested stringified JSON values
  const safeParse = (v) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (e) { return v; }
  };

  const safeString = (v) => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  // parse root if needed
  if (typeof answers === 'string') {
    try { answers = JSON.parse(answers); } catch (e) { answers = {}; }
  }

  // Parse nested JSON strings (e.g., q_1: "{\"A\":\"v\"}") into objects for easier lookup
  for (const k of Object.keys(answers || {})) {
    const v = answers[k];
    if (typeof v === 'string') {
      const parsed = safeParse(v);
      if (parsed !== v) answers[k] = parsed;
    }
  }

  for (const p of (testData.passages || [])) {
    let questionIndexInPassage = 0;
    const sections = p.sections || [{ questions: p.questions }];
    for (const s of sections) {
      for (const q of (s.questions || [])) {
        const qIndex = questionIndexInPassage++;
        const qType = (q.questionType || q.type || '').toLowerCase();
        // Default row (include question text, headings and a short passage snippet for context)
        const passageSnippet = (p.title || p.heading || p.passageText || p.text || '');
        const row = {
          questionNumber: q.questionNumber || qCounter,
          questionType: qType,
          questionText: q.questionText || q.question || q.text || '',
          headings: q.headings || [],
          passageSnippet: passageSnippet ? String(passageSnippet).slice(0, 200) : '',
          expected: q.correctAnswer || q.answers || null,
          expectedLabel: q.correctAnswer || '',
          student: null,
          studentLabel: '',
          isCorrect: false
        };

        if (qType === 'ielts-matching-headings' || qType === 'matching-headings') {
          // base key is the block base q_<qCounter>
          const baseKey = `q_${qCounter}`;
          let studentRaw = answers[baseKey];

          // also accept student answers stored under the question's own questionNumber (editor may use q_<questionNumber>)
          const altBaseKey = `q_${q.questionNumber || qCounter}`;
          if (!studentRaw && answers[altBaseKey]) studentRaw = answers[altBaseKey];

          // if still not found, scan answers keys for an object mapping that contains paragraph ids
          let studentObj = {};
          const paragraphs = q.paragraphs || q.answers || [];
          const paragraphIds = (paragraphs || []).map(p => (typeof p === 'object' ? (p.id || p.paragraphId || '') : String(p))).filter(Boolean);

          if (studentRaw && typeof studentRaw === 'object') {
            studentObj = studentRaw;
          } else if (studentRaw && typeof studentRaw === 'string') {
            try {
              studentObj = JSON.parse(studentRaw);
            } catch (e) {
              studentObj = {};
            }
          } else {
            for (const k of Object.keys(answers || {})) {
              const val = answers[k];
              if (!val) continue;
              let parsed = null;
              if (typeof val === 'object') parsed = val;
              else if (typeof val === 'string') {
                try { parsed = JSON.parse(val); } catch (e) { parsed = null; }
              }
              if (parsed && typeof parsed === 'object') {
                const keys = Object.keys(parsed || {});
                if (keys.some(kk => paragraphIds.includes(kk))) {
                  studentObj = parsed;
                  break;
                }
              }
            }
          }
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

            // Determine numeric base question number (handles cases like '11,12,130')
            const baseQuestionNumber = (() => {
              const qn = q.questionNumber || qCounter;
              if (typeof qn === 'number') return qn;
              if (typeof qn === 'string') {
                const m = qn.match(/(\d+)/);
                if (m) return Number(m[1]);
              }
              return Number(qn) || qCounter;
            })();

            // find student raw value robustly using question number as hint
            const questionNum = baseQuestionNumber + i;
            let studentRaw = studentObj[paragraphId] || '';
            if (!studentRaw) {
              // scan answers object for keys referencing this base question number and blank index
              for (const k of Object.keys((answers || {}))) {
                const keyStr = String(k);
                // exact form: q_<base>_<i>
                if (new RegExp(`(^|_)q_${baseQuestionNumber}_${i}($|_)`).test(keyStr)) {
                  studentRaw = (answers && answers[k]) || '';
                  break;
                }
                // contains both the base question number and the blank index (e.g., '0_11_0')
                if (keyStr.includes(`_${i}`) && new RegExp(`(^|_)${baseQuestionNumber}(_|_)`).test(keyStr)) {
                  studentRaw = (answers && answers[k]) || '';
                  break;
                }
                // fallback: key that explicitly contains the computed questionNum (e.g., '11' or '130')
                if (new RegExp(`(^|_)${questionNum}(_|$)`).test(keyStr)) {
                  studentRaw = (answers && answers[k]) || '';
                  break;
                }
              }
            }

            const studentLabel = toLabel(studentRaw || '', headingsArray);
            // ensure student is a readable string
            const studentValStr = (studentRaw && typeof studentRaw === 'object') ? JSON.stringify(studentRaw) : String(studentRaw || '');
            details.push({
              questionNumber: q.questionNumber || (qCounter + i),
              paragraphId,
              questionText: q.questionText || q.question || q.text || '',
              headings: headingsArray || [],
              passageSnippet: (p.title || p.heading || p.passageText || p.text || '').slice(0, 200),
              expected: correctMap[paragraphId] || '',
              student: studentValStr,
              expectedLabel,
              studentLabel,
              isCorrect: Boolean(expectedLabel && studentLabel && expectedLabel === studentLabel)
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

            const safeString = (v) => {
              if (v === undefined || v === null) return '';
              if (typeof v === 'object') return JSON.stringify(v);
              return String(v);
            };

            // derive a numeric base for question number (handles '11,12,130' style)
            const baseQuestionNumber = (() => {
              const qn = q.questionNumber || qCounter;
              if (typeof qn === 'number') return qn;
              if (typeof qn === 'string') {
                const m = qn.match(/(\d+)/);
                if (m) return Number(m[1]);
              }
              return Number(qn) || qCounter;
            })();

            const findStudentBlank = (baseNumber, bi) => {
              // 1) direct q_<base>_<bi>
              const baseKey = `q_${baseNumber}`;
              const direct = answers[`${baseKey}_${bi}`];
              if (direct !== undefined && direct !== null && String(direct).trim() !== '') return safeString(direct);

              // 1b) frontend DoReadingTest style: <passageIndex>_<questionIndex>_<blankIndex>
              const byPassageQuestion = answers[`${passageIndex}_${qIndex}_${bi}`];
              if (byPassageQuestion !== undefined && byPassageQuestion !== null && String(byPassageQuestion).trim() !== '') return safeString(byPassageQuestion);

              const byPassageQuestionPrefixed = answers[`q_${passageIndex}_${qIndex}_${bi}`];
              if (byPassageQuestionPrefixed !== undefined && byPassageQuestionPrefixed !== null && String(byPassageQuestionPrefixed).trim() !== '') return safeString(byPassageQuestionPrefixed);

              // check for single-blank stored as q_<base> (no suffix)
              const directBase = answers[baseKey];
              if (directBase !== undefined && directBase !== null && String(directBase).trim() !== '') return safeString(directBase);

              // 2) common frontend keys which may include baseNumber
              const alt1 = answers[`q_${baseNumber}_${bi}`];
              if (alt1 !== undefined && alt1 !== null && String(alt1).trim() !== '') return safeString(alt1);

              for (const k of Object.keys(answers || {})) {
                const val = answers[k];
                if (val === undefined || val === null) continue;
                // only accept primitive values or arrays as a blank answer; skip objects (object mappings shouldn't be treated as a single blank)
                if (typeof val === 'object' && !Array.isArray(val)) continue;
                if (String(val).trim() === '') continue;
                const keyStr = String(k);
                // Accept keys only when they include the baseNumber context and the blank index
                if ((new RegExp(`(^|_)q_${baseNumber}_${bi}($|_)`).test(keyStr)) || (keyStr.includes(`_${bi}`) && new RegExp(`(^|_)${baseNumber}(_|_)`).test(keyStr))) return safeString(val);
                // Accept <passageIndex>_<questionIndex>_<blankIndex> (or with separators)
                if (new RegExp(`(^|_)${passageIndex}(_|-)${qIndex}(_|-)+${bi}($|_)`).test(keyStr)) return safeString(val);
                // fallback: contains baseNumber alone (no blank index), use only as last resort
                if (new RegExp(`(^|_)${baseNumber}(_|$)`).test(keyStr)) return safeString(val);
              }

              return '';
            };

            for (let bi = 0; bi < blanks.length; bi++) {
              const displayedQuestionNumber = q.questionNumber || (qCounter + bi);
              const studentRaw = findStudentBlank(baseQuestionNumber, bi) || '';
              const expectedRaw = (q.blanks && q.blanks[bi] && q.blanks[bi].correctAnswer) ? q.blanks[bi].correctAnswer : '';
              const expectedVariants = String(expectedRaw).split(/\s*[|\/;,]\s*/).map(s => normalize(s)).filter(Boolean);
              const studentNorm = normalize(studentRaw);
              const isCorrect = Boolean(expectedVariants.length && studentNorm && expectedVariants.includes(studentNorm));
              details.push({
                questionNumber: displayedQuestionNumber,
                paragraphId: null,
                questionText: q.questionText || q.question || q.text || '',
                headings: q.headings || [],
                passageSnippet: (p.title || p.heading || p.passageText || p.text || '').slice(0, 200),
                expected: expectedRaw || '',
                student: studentRaw || '',
                expectedLabel: expectedVariants.join(' | '),
                studentLabel: studentNorm || '',
                isCorrect
              });
            }

            qCounter += blanks.length || 1;
            continue;
          }
        }

        // Paragraph matching (A-G style) — ensure we render per-paragraph details and accept answers like q_<base>_0 etc
        if (qType === 'paragraph-matching') {
          const text = (q.questionText || '').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, ' ').replace(/<br\s*\/?/gi, ' ').trim();
          const parts = text ? text.split(/(\.{3,}|…+)/) : [];
          const blanks = parts.filter((p2) => p2 && p2.match(/\.{3,}|…+/));
          const baseKey = `q_${qCounter}`;

          if (blanks.length > 0) {
            for (let bi = 0; bi < blanks.length; bi++) {
              const studentRaw = (answers[`${baseKey}_${bi}`] !== undefined) ? answers[`${baseKey}_${bi}`] : '';
              // Prefer blank-specific correctAnswer, fallback to question-level correctAnswer
              let expectedRaw = '';
              if (q.blanks && q.blanks[bi] && q.blanks[bi].correctAnswer) expectedRaw = q.blanks[bi].correctAnswer;
              else if (q.correctAnswer) expectedRaw = q.correctAnswer;

              const expectedLabel = normalize(expectedRaw || '');
              const studentLabel = normalize(studentRaw || '');
              details.push({
                questionNumber: q.questionNumber || (qCounter + bi),
                paragraphId: null,
                questionText: q.questionText || q.question || q.text || '',
                headings: q.headings || [],
                passageSnippet: (p.title || p.heading || p.passageText || p.text || '').slice(0, 200),
                expected: expectedRaw || '',
                student: studentRaw || '',
                expectedLabel,
                studentLabel,
                isCorrect: Boolean(expectedLabel && studentLabel && expectedLabel === studentLabel)
              });
            }
          } else {
            const studentRaw = (answers[`${baseKey}_0`] !== undefined) ? answers[`${baseKey}_0`] : '';
            const expectedRaw = q.correctAnswer || '';
            const expectedLabel = normalize(expectedRaw || '');
            const studentLabel = normalize(studentRaw || '');
            details.push({
              questionNumber: q.questionNumber || qCounter,
              paragraphId: null,
              questionText: q.questionText || q.question || q.text || '',
              headings: q.headings || [],
              passageSnippet: (p.title || p.heading || p.passageText || p.text || '').slice(0, 200),
              expected: expectedRaw || '',
              student: studentRaw || '',
              expectedLabel,
              studentLabel,
              isCorrect: Boolean(expectedLabel && studentLabel && expectedLabel === studentLabel)
            });
          }

          qCounter += blanks.length > 0 ? blanks.length : 1;
          continue;
        }

        // Helper: map a single-letter choice (A/B/C...) to option text (if available) and normalize
        const resolveChoiceText = (questionObj, value) => {
          if (!value && value !== 0) return '';
          const s = String(value).trim();
          // letter index
          if (/^[A-Za-z]$/.test(s)) {
            const idx = s.toUpperCase().charCodeAt(0) - 65;
            if (Array.isArray(questionObj.options) && questionObj.options[idx]) {
              const opt = questionObj.options[idx];
              if (typeof opt === 'object') return normalize(opt.text || opt.label || String(opt));
              return normalize(opt);
            }
            // fall back to answers lookup (some tests store answers mapping A->text)
            if (questionObj.answers && questionObj.answers[s.toUpperCase()]) return normalize(questionObj.answers[s.toUpperCase()]);
            return normalize(s);
          }
          // if already a text, normalize
          return normalize(s);
        };

        // Multi-select: expand into per-answer rows so numbering matches UI (e.g., 23-24)
        if (qType === 'multi-select') {
          const key = `q_${qCounter}`;
          const altKey = q.questionNumber ? `q_${q.questionNumber}` : null;
          const rawStudentVal = answers[key];
          const rawStudentAlt = altKey ? answers[altKey] : undefined;
          const expectedTokens = normalizeMultiTokens(q.correctAnswer || q.answers || '', q.options || []);
          const studentTokens = normalizeMultiTokens((rawStudentVal !== undefined ? rawStudentVal : rawStudentAlt), q.options || []);
          const required = q.requiredAnswers || q.maxSelection || expectedTokens.length || studentTokens.length || 2;
          const count = Math.max(required, expectedTokens.length || 0);

          for (let mi = 0; mi < count; mi++) {
            const questionNum = (q.questionNumber || qCounter) + mi;
            const expectedToken = expectedTokens[mi] || expectedTokens[0] || '';
            const studentHasExpected = expectedToken ? studentTokens.includes(expectedToken) : false;
            const studentToken = studentHasExpected ? expectedToken : (studentTokens[mi] || '');

            details.push({
              questionNumber: questionNum,
              questionType: qType,
              questionText: q.questionText || q.question || q.text || '',
              headings: q.headings || [],
              passageSnippet: (p.title || p.heading || p.passageText || p.text || '').slice(0, 200),
              expected: expectedToken,
              student: studentToken,
              expectedLabel: expectedToken,
              studentLabel: studentToken,
              isCorrect: studentHasExpected
            });
          }

          qCounter += count || 1;
          continue;
        }

        // Special handling for multiple-choice and sentence-completion where student may submit letters (A,B,...) or full text
        if (qType === 'multiple-choice' || qType === 'sentence-completion') {
          const key = `q_${qCounter}`;
          const altKey = q.questionNumber ? `q_${q.questionNumber}` : null;
          const rawStudentVal = (answers[key] !== undefined) ? answers[key] : (altKey ? answers[altKey] : undefined);
          const studentVal = rawStudentVal === undefined || rawStudentVal === null ? '' : rawStudentVal;

          let expectedRaw = q.correctAnswer || '';
          // If expected is a single letter, try to map to option text too
          const expectedNorm = /^[A-Za-z]$/.test(String(expectedRaw).trim()) ? resolveChoiceText(q, expectedRaw) : normalize(expectedRaw || '');
          const studentNorm = /^[A-Za-z]$/.test(String(studentVal).trim()) ? resolveChoiceText(q, studentVal) : normalize(studentVal || '');

          const rowCopy = Object.assign({}, row);
          rowCopy.student = (studentVal === null || studentVal === undefined) ? '' : String(studentVal);
          rowCopy.expected = expectedRaw || '';
          rowCopy.expectedLabel = expectedNorm;
          rowCopy.studentLabel = studentNorm;
          rowCopy.isCorrect = Boolean(expectedNorm && studentNorm && expectedNorm === studentNorm);
          details.push(rowCopy);

          qCounter++;
          continue;
        }

        // default simple types
        const key = `q_${qCounter}`;
        const altKey = q.questionNumber ? `q_${q.questionNumber}` : null;
        const rawStudentVal = (answers[key] !== undefined) ? answers[key] : (altKey ? answers[altKey] : undefined);
        // ignore object-mappings (these are likely matching-heading maps), accept primitives/arrays only
        const studentVal = (typeof rawStudentVal === 'object' && !Array.isArray(rawStudentVal)) ? '' : rawStudentVal;
        row.student = safeString(studentVal);
        // Short answers and sentence completions may have multiple acceptable variants separated by |,/ or ;
        const expectedRaw = q.correctAnswer || '';
        const isShortLike = (
          qType === 'short-answer' ||
          qType === 'sentence-completion' ||
          qType === 'fill-in-the-blanks' ||
          qType === 'fill-in-blank' ||
          qType === 'fill-in'
        );

        if (isShortLike) {
          const expectedVariants = String(expectedRaw).split(/\s*[|\/;,]\s*/).map(s => normalize(s)).filter(Boolean);
          const studentNorm = normalize(studentVal || '');
          row.expectedLabel = expectedVariants.join(' | ');
          row.studentLabel = studentNorm;
          row.isCorrect = Boolean(expectedVariants.length && studentNorm && expectedVariants.includes(studentNorm));
        } else if ((q.questionType || q.type) === 'multi-select') {
          const expArr = normalizeMulti(q.correctAnswer || '');
          const stuArr = normalizeMulti(studentVal);
          row.expectedLabel = normalize(q.correctAnswer || '');
          row.studentLabel = normalize(safeString(studentVal));
          row.isCorrect = (expArr.length && stuArr.length && JSON.stringify(expArr) === JSON.stringify(stuArr));
        } else {
          const expectedNorm = normalize(expectedRaw || '');
          const studentNorm = normalize(studentVal || '');
          row.expectedLabel = expectedNorm;
          row.studentLabel = studentNorm;
          row.isCorrect = Boolean(expectedNorm && studentNorm && expectedNorm === studentNorm);
        }
        details.push(row);

        qCounter++;
      }
    }

    passageIndex++;
  }

  return details;
}

/**
 * Generate analysis breakdown by question type
 * Returns detailed statistics and improvement suggestions
 */
function generateAnalysisBreakdown(testData, answers = {}) {
  const details = getDetailedScoring(testData, answers);
  
  // Group by question type
  const byType = {};
  for (const d of details) {
    const type = d.questionType || 'unknown';
    if (!byType[type]) {
      byType[type] = { correct: 0, total: 0, questions: [] };
    }
    byType[type].total++;
    if (d.isCorrect) byType[type].correct++;
    byType[type].questions.push({
      questionNumber: d.questionNumber,
      isCorrect: d.isCorrect,
      expected: d.expectedLabel,
      student: d.studentLabel
    });
  }

  // Calculate percentages and generate suggestions
  const typeAnalysis = [];
  const questionTypeLabels = {
    'true-false-not-given': 'True/False/Not Given',
    'yes-no-not-given': 'Yes/No/Not Given',
    'ielts-matching-headings': 'Matching Headings',
    'matching-headings': 'Matching Headings',
    'multiple-choice': 'Multiple Choice',
    'cloze-test': 'Fill in the Blanks (Cloze)',
    'summary-completion': 'Summary Completion',
    'short-answer': 'Short Answer',
    'sentence-completion': 'Sentence Completion',
    'paragraph-matching': 'Paragraph Matching',
    'multi-select': 'Multi-Select',
    'unknown': 'Other'
  };

  const suggestions = {
    'true-false-not-given': {
      good: 'Bạn nắm vững kỹ năng phân biệt thông tin trong bài đọc.',
      improve: 'Chú ý phân biệt giữa FALSE (thông tin sai) và NOT GIVEN (không có thông tin). Đọc kỹ từng từ trong câu hỏi.'
    },
    'yes-no-not-given': {
      good: 'Bạn hiểu rõ quan điểm của tác giả trong bài.',
      improve: 'Tập trung vào quan điểm/ý kiến của tác giả, không phải sự thật. NOT GIVEN = tác giả không đề cập.'
    },
    'ielts-matching-headings': {
      good: 'Kỹ năng skimming và tìm ý chính của bạn tốt.',
      improve: 'Đọc câu đầu và câu cuối mỗi đoạn. Tìm từ khóa chính, bỏ qua chi tiết. Lưu ý các heading có thể gây nhầm lẫn.'
    },
    'matching-headings': {
      good: 'Kỹ năng skimming và tìm ý chính của bạn tốt.',
      improve: 'Đọc câu đầu và câu cuối mỗi đoạn. Tìm từ khóa chính, bỏ qua chi tiết. Lưu ý các heading có thể gây nhầm lẫn.'
    },
    'multiple-choice': {
      good: 'Bạn đọc hiểu tốt và chọn đáp án chính xác.',
      improve: 'Đọc kỹ tất cả các đáp án trước khi chọn. Loại trừ các đáp án sai trước. Chú ý các từ như "always", "never", "only".'
    },
    'cloze-test': {
      good: 'Bạn nắm vững từ vựng và ngữ pháp trong ngữ cảnh.',
      improve: 'Chú ý word form (noun/verb/adj/adv). Đọc cả câu trước và sau chỗ trống. Kiểm tra ngữ pháp của từ điền.'
    },
    'summary-completion': {
      good: 'Bạn tóm tắt thông tin tốt và chọn từ phù hợp.',
      improve: 'Scanning để tìm vị trí thông tin trong bài. Chú ý giới hạn số từ. Đảm bảo từ điền phù hợp ngữ pháp.'
    },
    'short-answer': {
      good: 'Bạn tìm và trích xuất thông tin chính xác.',
      improve: 'Chú ý giới hạn số từ trong câu trả lời. Sử dụng từ trong bài, không paraphrase. Kiểm tra spelling.'
    },
    'sentence-completion': {
      good: 'Bạn hoàn thành câu logic và chính xác.',
      improve: 'Đảm bảo câu hoàn chỉnh có nghĩa. Chú ý ngữ pháp khi ghép câu. Tìm đúng vị trí thông tin trong bài.'
    },
    'paragraph-matching': {
      good: 'Bạn liên kết thông tin giữa các đoạn tốt.',
      improve: 'Đọc kỹ yêu cầu từng câu hỏi. Scanning từ khóa trong các đoạn. Một đoạn có thể dùng nhiều lần hoặc không dùng.'
    },
    'default': {
      good: 'Bạn làm tốt dạng câu hỏi này.',
      improve: 'Tiếp tục luyện tập để cải thiện kỹ năng đọc hiểu.'
    }
  };

  for (const [type, data] of Object.entries(byType)) {
    const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    const label = questionTypeLabels[type] || type;
    const suggestionData = suggestions[type] || suggestions['default'];
    
    let status = 'good';
    let suggestion = suggestionData.good;
    
    if (percentage < 50) {
      status = 'weak';
      suggestion = suggestionData.improve;
    } else if (percentage < 70) {
      status = 'average';
      suggestion = suggestionData.improve;
    }

    typeAnalysis.push({
      type,
      label,
      correct: data.correct,
      total: data.total,
      percentage,
      status,
      suggestion,
      wrongQuestions: data.questions.filter(q => !q.isCorrect).map(q => q.questionNumber)
    });
  }

  // Sort by percentage (weakest first for improvement focus)
  typeAnalysis.sort((a, b) => a.percentage - b.percentage);

  // Build a lookup mapping keyed by human-readable label (frontend expects a `breakdown` map)
  const breakdown = {};
  for (const t of typeAnalysis) {
    const key = t.label || t.type;
    breakdown[key] = {
      correct: t.correct,
      total: t.total,
      percentage: t.percentage,
      status: t.status,
      suggestion: t.suggestion,
      wrongQuestions: t.wrongQuestions
    };
  }

  // Generate overall summary
  const totalCorrect = details.filter(d => d.isCorrect).length;
  const totalQuestions = details.length;
  const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const band = bandFromCorrect(totalCorrect);

  // Identify top 3 weak areas
  const weakAreas = typeAnalysis
    .filter(t => t.status !== 'good' && t.total >= 2)
    .slice(0, 3)
    .map(t => ({
      label: t.label,
      percentage: t.percentage,
      suggestion: t.suggestion
    }));

  // Identify strong areas
  const strongAreas = typeAnalysis
    .filter(t => t.status === 'good' && t.total >= 2)
    .map(t => ({
      label: t.label,
      percentage: t.percentage
    }));

  return {
    summary: {
      totalCorrect,
      totalQuestions,
      overallPercentage,
      band
    },
    byType: typeAnalysis,
    breakdown,
    weakAreas,
    strongAreas,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate human-readable analysis text (Vietnamese)
 */
function generateAnalysisText(breakdown) {
  if (!breakdown || !breakdown.summary) return '';
  
  const { summary, byType = [], weakAreas = [], strongAreas = [] } = breakdown;
  
  // Safely get summary values with defaults
  const totalCorrect = summary.totalCorrect || 0;
  const totalQuestions = summary.totalQuestions || 0;
  const overallPercentage = summary.overallPercentage || 0;
  const band = summary.band || 0;
  
  let text = `📊 KẾT QUẢ BÀI THI READING\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ Đúng: ${totalCorrect}/${totalQuestions} (${overallPercentage}%)\n`;
  text += `🎯 Band Score: ${band}\n\n`;
  
  if (byType && byType.length > 0) {
    text += `📈 PHÂN TÍCH THEO DẠNG CÂU HỎI:\n`;
    for (const t of byType) {
      const icon = t.status === 'good' ? '✓' : t.status === 'average' ? '⚠️' : '❌';
      const statusText = t.status === 'good' ? 'Tốt' : t.status === 'average' ? 'Trung bình' : 'Cần cải thiện';
      text += `• ${t.label || t.type}: ${t.correct || 0}/${t.total || 0} (${t.percentage || 0}%) ${icon} ${statusText}\n`;
    }
  }
  
  if (weakAreas && weakAreas.length > 0) {
    text += `\n💡 GỢI Ý CẢI THIỆN:\n`;
    weakAreas.forEach((area, idx) => {
      text += `${idx + 1}. ${area.label} (${area.percentage || 0}%):\n   ${area.suggestion || ''}\n`;
    });
  }
  
  if (strongAreas && strongAreas.length > 0) {
    text += `\n🌟 ĐIỂM MẠNH:\n`;
    strongAreas.forEach(area => {
      text += `• ${area.label} (${area.percentage || 0}%)\n`;
    });
  }
  
  return text;
}

module.exports = { scoreReadingTest, bandFromCorrect, getDetailedScoring, generateAnalysisBreakdown, generateAnalysisText };
