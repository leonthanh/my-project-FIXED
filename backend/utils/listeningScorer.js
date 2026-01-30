// Lightweight listening scorer extracted from maintenance script.
// Exports: scoreListening({ test, answers }) => { correctCount, totalCount, scorePercentage, band, details }

const parseIfJsonString = (val) => {
  let v = val;
  let attempts = 0;
  while (typeof v === 'string' && attempts < 3) {
    try { v = JSON.parse(v); } catch (e) { break; }
    attempts++;
  }
  return v;
};

const normalize = (val) => (val == null ? '' : String(val)).trim().toLowerCase();

const explodeAccepted = (val) => {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  const s = String(val);
  if (s.includes('|')) return s.split('|').map((x) => x.trim()).filter(Boolean);
  if (s.includes('/')) return s.split('/').map((x) => x.trim()).filter(Boolean);
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  if (s.includes(';')) return s.split(';').map((x) => x.trim()).filter(Boolean);
  return [s];
};

const bandFromCorrect = (c) => {
  // Align thresholds with reading scorer
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
};

const scoreListening = ({ test, answers }) => {
  const normalizedAnswers = answers && typeof answers === 'object' ? answers : {};

  // Handle legacy stored payload: { passages: [...] }
  if (normalizedAnswers.passages && Array.isArray(normalizedAnswers.passages)) {
    let correctCount = 0;
    let totalCount = 0;
    const details = [];
    normalizedAnswers.passages.forEach((passage, pIdx) => {
      (passage?.questions || []).forEach((q, qIdx) => {
        totalCount++;
        const ok = !!q?.isCorrect;
        if (ok) correctCount++;
        details.push({
          questionNumber: totalCount,
          partIndex: pIdx,
          sectionIndex: null,
          questionType: q?.questionType || 'fill',
          studentAnswer: q?.studentAnswer ?? q?.answer ?? '',
          correctAnswer: q?.correctAnswer ?? '',
          isCorrect: ok,
        });
      });
    });

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const band = bandFromCorrect(correctCount);
    return { correctCount, totalCount, scorePercentage, band, details };
  }

  const questions = parseIfJsonString(test?.questions);
  const partInstructions = parseIfJsonString(test?.partInstructions);

  let correctCount = 0;
  let totalCount = 0;
  const details = [];

  const numericKeys = (obj) =>
    obj && typeof obj === 'object' && !Array.isArray(obj)
      ? Object.keys(obj).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
      : [];

  const getSectionQuestions = (pIdx, sIdx) =>
    Array.isArray(questions)
      ? questions.filter((q) => Number(q?.partIndex) === Number(pIdx) && Number(q?.sectionIndex) === Number(sIdx)).sort((a,b)=> (Number(a?.questionIndex)||0)-(Number(b?.questionIndex)||0))
      : [];

  const scoreFromSections = () => {
    if (!Array.isArray(partInstructions) || !Array.isArray(questions)) return false;

    let runningStart = 1;
    const advanceRunning = (count, sectionStart) => { runningStart = Math.max(runningStart, (Number.isFinite(sectionStart) ? sectionStart : runningStart) + count); };

    for (let pIdx = 0; pIdx < partInstructions.length; pIdx++) {
      const part = partInstructions[pIdx];
      const sections = Array.isArray(part?.sections) ? part.sections : [];
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx] || {};
        const sectionType = String(section?.questionType || 'fill').toLowerCase();
        const sectionQuestions = getSectionQuestions(pIdx, sIdx);
        if (!sectionQuestions.length) continue;

        const firstQ = sectionQuestions[0];
        const explicitSectionStart = Number(section?.startingQuestionNumber);
        const hasExplicitStart = Number.isFinite(explicitSectionStart) && explicitSectionStart > 0;
        const sectionStart = hasExplicitStart ? explicitSectionStart : runningStart;

        if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
          const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
          if (map) {
            const keys = numericKeys(map);
            for (const num of keys) {
              totalCount++;
              const expected = map[String(num)];
              const student = normalizedAnswers[`q${num}`];
              const accepted = explodeAccepted(expected).map(normalize);
              const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
              if (ok) correctCount++;
              details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
            }
            advanceRunning(keys.length, sectionStart);
            continue;
          }

          const rows = Array.isArray(firstQ?.formRows) ? firstQ.formRows : [];
          const blanks = rows.filter((r) => r && r.isBlank);
          blanks.forEach((row, idx) => {
            const num = row?.blankNumber ? sectionStart + Number(row.blankNumber) - 1 : sectionStart + idx;
            totalCount++;
            const expected = row?.correctAnswer ?? row?.answer ?? row?.correct ?? '';
            const student = normalizedAnswers[`q${num}`];
            const accepted = explodeAccepted(expected).map(normalize);
            const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
            if (ok) correctCount++;
            details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
          });
          advanceRunning(blanks.length, sectionStart);
          continue;
        }

        if (sectionType === 'matching') {
          const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
          if (map) {
            const keys = numericKeys(map);
            for (const num of keys) {
              totalCount++;
              const expected = map[String(num)];
              const student = normalizedAnswers[`q${num}`];
              const ok = normalize(student) === normalize(expected);
              if (ok) correctCount++;
              details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
            }
            advanceRunning(keys.length, sectionStart);
            continue;
          }

          const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : Array.isArray(firstQ?.items) ? firstQ.items : [];
          for (let i = 0; i < left.length; i++) {
            const num = sectionStart + i;
            totalCount++;
            const student = normalizedAnswers[`q${num}`];
            details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: '', isCorrect: false });
          }
          advanceRunning(left.length, sectionStart);
          continue;
        }

        if (sectionType === 'multi-select') {
          let groupStart = sectionStart;
          let totalCountForSection = 0;
          for (const q of sectionQuestions) {
            const required = Number(q?.requiredAnswers) || 2;
            const student = normalizedAnswers[`q${groupStart}`];
            const expectedRaw = q?.correctAnswer ?? q?.answers;
            const studentIndices = toIndicesSafe(student);
            const expectedIndices = toIndicesSafe(expectedRaw);
            const ok = expectedIndices.length ? setEq(new Set(studentIndices), new Set(expectedIndices)) : false;
            totalCount += required;
            if (ok) correctCount += required;
            details.push({ questionNumber: groupStart, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expectedRaw ?? '', isCorrect: ok });
            groupStart += required;
            totalCountForSection += required;
          }
          advanceRunning(totalCountForSection, sectionStart);
          continue;
        }

        // default
        const startNum = sectionStart;
        const fallbackStart = Number(sectionQuestions[0]?.globalNumber) || null;
        const finalStart = Number.isFinite(startNum) && startNum > 0 ? startNum : fallbackStart;
        if (!Number.isFinite(finalStart)) {
          totalCount += sectionQuestions.length;
          advanceRunning(sectionQuestions.length, sectionStart);
          continue;
        }

        sectionQuestions.forEach((q, idx) => {
          const num = finalStart + idx;
          totalCount++;
          const expected = q?.correctAnswer;
          const student = normalizedAnswers[`q${num}`];
          const accepted = explodeAccepted(expected).map(normalize);
          const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
          if (ok) correctCount++;
          details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: String(sectionType || q?.questionType || 'fill').toLowerCase(), studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
        });

        advanceRunning(sectionQuestions.length, sectionStart);
      }
    }

    return totalCount > 0;
  };

  if (scoreFromSections()) {
    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const band = bandFromCorrect(correctCount);
    return { correctCount, totalCount, scorePercentage, band, details };
  }

  // fallback: simple global questions array
  if (Array.isArray(questions) && questions.length > 0) {
    const sorted = [...questions].sort((a,b) => (Number(a?.globalNumber)||0) - (Number(b?.globalNumber)||0));
    for (const q of sorted) {
      let qType = String(q?.questionType || 'fill').toLowerCase();
      if (qType === 'fill' || qType === 'single') {
        if (Array.isArray(q?.formRows) && q.formRows.length > 0) qType = 'form-completion';
        else if (q?.notesText) qType = 'notes-completion';
        else if ((Array.isArray(q?.leftItems) && q.leftItems.length > 0) || (Array.isArray(q?.items) && q.items.length > 0)) qType = 'matching';
      }
      const baseNum = Number(q?.globalNumber);
      const partIndex = q?.partIndex;
      const sectionIndex = q?.sectionIndex;

      if (qType === 'matching') {
        const map = q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? q.answers : null;
        if (map) {
          const keys = Object.keys(map).map((k) => parseInt(k,10)).filter((n)=>Number.isFinite(n)).sort((a,b)=>a-b);
          for (const num of keys) {
            totalCount++;
            const expected = map[String(num)];
            const student = normalizedAnswers[`q${num}`];
            const ok = normalize(student) === normalize(expected);
            if (ok) correctCount++;
            details.push({ questionNumber: num, partIndex, sectionIndex, questionType: qType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
          }
        } else if (Number.isFinite(baseNum)) {
          totalCount++;
          const student = normalizedAnswers[`q${baseNum}`];
          const expected = q?.correctAnswer;
          const ok = normalize(student) === normalize(expected);
          if (ok) correctCount++;
          details.push({ questionNumber: baseNum, partIndex, sectionIndex, questionType: qType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
        }
        continue;
      }

      if (qType === 'form-completion') {
        const rows = Array.isArray(q?.formRows) ? q.formRows : [];
        const blanks = rows.filter((r) => r && r.isBlank);
        const map = q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? q.answers : null;
        if (Number.isFinite(baseNum)) {
          if (blanks.length > 0) {
            blanks.forEach((row, idx) => {
              const num = row?.blankNumber ? baseNum + Number(row.blankNumber) - 1 : baseNum + idx;
              totalCount++;
              const expected = row?.correctAnswer ?? row?.answer ?? row?.correct ?? (map ? map[String(num)] : '') ?? '';
              const student = normalizedAnswers[`q${num}`];
              const ok = normalize(student) === normalize(expected);
              if (ok) correctCount++;
              details.push({ questionNumber: num, partIndex, sectionIndex, questionType: qType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
            });
            continue;
          }
        }

        // Generic fallback: simple single/fill question with a globalNumber
        if (Number.isFinite(baseNum)) {
          totalCount++;
          const expected = q?.correctAnswer ?? q?.answer ?? '';
          const student = normalizedAnswers[`q${baseNum}`];
          const accepted = explodeAccepted(expected).map(normalize);
          const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
          if (ok) correctCount++;
          details.push({ questionNumber: baseNum, partIndex, sectionIndex, questionType: qType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
          continue;
        }
      }

      // Generic fallback for simple 'fill' or 'single' questions with a globalNumber
      if (Number.isFinite(baseNum) && (qType === 'fill' || qType === 'single')) {
        totalCount++;
        const expected = q?.correctAnswer ?? q?.answer ?? '';
        const student = normalizedAnswers[`q${baseNum}`];
        const accepted = explodeAccepted(expected).map(normalize);
        const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
        if (ok) correctCount++;
        details.push({ questionNumber: baseNum, partIndex, sectionIndex, questionType: qType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
        continue;
      }

    }

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const band = bandFromCorrect(correctCount);
    return { correctCount, totalCount, scorePercentage, band, details };
  }

  // fallback empty
  return { correctCount, totalCount, scorePercentage: 0, band: bandFromCorrect(0), details };
};

// Helpers used in multi-select
const toIndicesSafe = (val) => {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map(n=>Number(n)).filter(n=>Number.isFinite(n));
  const s = String(val);
  return s.split(/[^0-9A-Za-z]+/).map((x)=>Number(x)).filter(n=>Number.isFinite(n));
};

const setEq = (a,b) => {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const v of A) if (!B.has(v)) return false;
  return true;
};

module.exports = { scoreListening, bandFromCorrect };
