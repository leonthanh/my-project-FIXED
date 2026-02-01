const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ListeningTest = require('../models/ListeningTest');
const ListeningSubmission = require('../models/ListeningSubmission');

// Cấu hình multer cho việc upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store audio and images in separate folders
    const isImage = file.mimetype.startsWith('image/');
    cb(null, isImage ? 'uploads/images' : 'uploads/audio');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept both audio and images for map-labeling
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type!'), false);
    }
  }
});

// API tạo đề thi listening mới
const { requireAuth } = require('../middlewares/auth');
const { requireTestPermission } = require('../middlewares/testPermissions');

// Simple runtime debug helper - enable with DEBUG_LISTENING=1 or DEBUG=1
const DEBUG_LISTENING = process.env.DEBUG_LISTENING === '1' || process.env.DEBUG === '1';
const debug = (...args) => { if (DEBUG_LISTENING) console.log('[DEBUG]', ...args); };
router.post('/', requireAuth, requireTestPermission('listening'), upload.any(), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? Object.keys(req.files) : 'none');

    const { classCode, teacherName, passages, showResultModal } = req.body;
    
    if (!classCode || !teacherName) {
      return res.status(400).json({ message: '❌ Vui lòng nhập mã lớp và tên giáo viên' });
    }

    if (!passages) {
      return res.status(400).json({ message: '❌ Vui lòng nhập câu hỏi' });
    }

    // Parse passages if it's a string
    let parsedPassages = typeof passages === 'string' ? JSON.parse(passages) : passages;
    
    // Process file uploads
    let mainAudioUrl = null;
    if (req.files && req.files.audioFile) {
      mainAudioUrl = `/uploads/audio/${req.files.audioFile[0].filename}`;
    }

    // Add audio file URLs to passages
    const processedPassages = parsedPassages.map((passage, index) => {
      let audioFile = passage.audioFile || mainAudioUrl;
      
      if (req.files && Array.isArray(req.files)) {
        const f = req.files.find(fi => fi.fieldname === `audioFile_passage_${index}` || fi.fieldname === `audioFile_part_${index}` || fi.fieldname === 'audioFile');
        if (f) audioFile = `/uploads/audio/${f.filename}`;
      }
      
      return {
        ...passage,
        audioFile
      };
    });

    // Attach any uploaded map images to the corresponding question's mapImageUrl
    if (req.files && Array.isArray(req.files) && req.files.length) {
      req.files.forEach(file => {
        if (!file.fieldname || !file.filename) return;
        if (!file.fieldname.startsWith('mapImage')) return;

        // Expecting names like mapImage_part_1_section_0_q_0 or mapImage_part_1
        const m = file.fieldname.match(/mapImage_part_(\d+)_section_(\d+)_q_(\d+)/);
        if (m) {
          const partIdx = Number(m[1]); const sectionIdx = Number(m[2]); const qIdx = Number(m[3]);
          if (processedPassages[partIdx] && processedPassages[partIdx].sections && processedPassages[partIdx].sections[sectionIdx] && processedPassages[partIdx].sections[sectionIdx].questions && processedPassages[partIdx].sections[sectionIdx].questions[qIdx]) {
            processedPassages[partIdx].sections[sectionIdx].questions[qIdx].mapImageUrl = `/uploads/images/${file.filename}`;
          }
        } else {
          const m2 = file.fieldname.match(/mapImage_part_(\d+)/);
          if (m2) {
            const partIdx = Number(m2[1]);
            const secIdx = (processedPassages[partIdx]?.sections || []).findIndex(s => s.questionType === 'map-labeling');
            if (secIdx >= 0) {
              processedPassages[partIdx].sections[secIdx].questions[0].mapImageUrl = `/uploads/images/${file.filename}`;
            }
          }
        }
      });
    }

    // Transform passages to match database model structure
    // Model expects: partTypes, partInstructions, questions (JSON fields)
    const partTypes = processedPassages.map(part => {
      // Get all question types from all sections in this part
      const types = part.sections?.map(s => s.questionType || 'fill') || ['fill'];
      return types;
    });

    const partInstructions = processedPassages.map(part => ({
      title: part.title || '',
      instruction: part.instruction || '',
      transcript: part.transcript || '',
      audioFile: part.audioFile || null,
      sections: part.sections?.map(s => ({
        sectionTitle: s.sectionTitle || '',
        sectionInstruction: s.sectionInstruction || '',
        questionType: s.questionType || 'fill',
        startingQuestionNumber: s.startingQuestionNumber || null,
      })) || []
    }));

    // Flatten all questions from all parts/sections with proper indexing
    const questions = [];
    let globalQuestionNum = 1;
    
    processedPassages.forEach((part, partIndex) => {
      part.sections?.forEach((section, sectionIndex) => {
        section.questions?.forEach((q, qIndex) => {
          questions.push({
            partIndex,
            sectionIndex,
            questionIndex: qIndex,
            globalNumber: globalQuestionNum,
            questionType: q.questionType || section.questionType || 'fill',
            questionText: q.questionText || '',
            correctAnswer: q.correctAnswer || '',
            options: q.options || null,
            // Form completion specific
            formTitle: q.formTitle || null,
            formRows: q.formRows || null,
            questionRange: q.questionRange || null,
            answers: q.answers || null,
            // Table completion specific
            columns: q.columns || null,
            rows: q.rows || null,
            // Matching specific
            leftTitle: q.leftTitle || null,
            rightTitle: q.rightTitle || null,
            leftItems: q.leftItems || null,
            rightItems: q.rightItems || null,
            items: q.items || null,
            // Map image URL (if any)
            mapImageUrl: q.mapImageUrl || q.imageUrl || null,
          });

            // Calculate how many questions this item represents
            const qType = q.questionType || section.questionType || 'fill';

            if (qType === 'matching') {
              globalQuestionNum += (q.leftItems?.length || 1);
            } else if (qType === 'form-completion') {
              const blankCount = q.formRows?.filter(r => r.isBlank)?.length || 1;
              globalQuestionNum += blankCount;
            } else if (qType === 'table-completion') {
              const cols = q.columns || [];
              const rowsArr = q.rows || [];
              const BLANK_DETECT = /\[BLANK\]|_{2,}|[\u2026]+/g;
              let blanksCount = 0;
              rowsArr.forEach((row) => {
                const r = Array.isArray(row.cells)
                  ? row
                  : { cells: [row.vehicle || '', row.cost || '', Array.isArray(row.comments) ? row.comments.join('\n') : row.comments || ''] };
                for (let c = 0; c < cols.length; c++) {
                  const text = String(r.cells[c] || '');
                  const matches = text.match(BLANK_DETECT) || [];
                  blanksCount += matches.length;
                }
              });
              globalQuestionNum += blanksCount > 0 ? blanksCount : (q.rows?.length || 1);
            } else if (qType === 'notes-completion') {
              // Count blanks in notesText
              const notesText = q.notesText || '';
              const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
              globalQuestionNum += blanks.length || 1;
            } else if (qType === 'multi-select') {
              globalQuestionNum += (q.requiredAnswers || 2);
            } else {
              globalQuestionNum += 1;
            }
          });
        });
      });

    // Build part audio URLs object
    const partAudioUrls = {};
    processedPassages.forEach((part, idx) => {
      if (part.audioFile) {
        partAudioUrls[idx] = part.audioFile;
      }
    });

    // Create the listening test
    const listeningTest = await ListeningTest.create({
      classCode,
      teacherName,
      mainAudioUrl,
      partAudioUrls,
      partTypes,
      partInstructions,
      questions,
      showResultModal: showResultModal !== undefined ? showResultModal : true
    });

    res.status(201).json({
      message: '✅ Đã tạo đề thi Listening thành công!',
      submissionId: listeningTest.id,
      test: listeningTest
    });
  } catch (error) {
    console.error('Error creating listening test:', error);
    let errorMessage = '❌ Lỗi khi tạo đề thi';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = '❌ Dữ liệu không hợp lệ: ' + error.errors.map(e => e.message).join(', ');
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = '❌ Đã tồn tại đề thi với thông tin này';
    }
    res.status(500).json({
      message: errorMessage,
      error: error.message
    });
  }
});

// API lấy danh sách đề thi
router.get('/', async (req, res) => {
  try {
    const tests = await ListeningTest.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(tests);
  } catch (error) {
    console.error('Error fetching listening tests:', error);
    res.status(500).json({
      message: '❌ Lỗi khi lấy danh sách đề thi',
      error: error.message
    });
  }
});

// API lấy chi tiết một đề thi
router.get('/:id', async (req, res) => {
  try {
    const test = await ListeningTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({
      message: '❌ Lỗi khi lấy thông tin đề thi',
      error: error.message
    });
  }
});

// API nộp bài thi listening - Calculate score and return results
router.post('/:id/submit', async (req, res) => {
  try {
    debug(`POST /api/listening-tests/${req.params.id}/submit - body:`, JSON.stringify(req.body).slice(0,2000));
    const { id } = req.params;
    const { answers, user, studentName, studentId } = req.body;

    // Get the test to check correct answers
    const test = await ListeningTest.findByPk(id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }

    const normalizedAnswers = answers && typeof answers === 'object' ? answers : {};

    const parseIfJsonString = (val) => {
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    };

    const normalizeText = (val) =>
      (val == null ? '' : String(val))
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const isNumericThousands = (s) => /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(String(s).trim());

    const explodeAccepted = (val) => {
      if (val == null) return [];
      if (Array.isArray(val)) return val;
      const s = String(val).trim();
      if (!s) return [];

      // Prioritize explicit variant separators.
      if (s.includes('|')) return s.split('|').map((x) => x.trim()).filter(Boolean);
      if (s.includes('/')) return s.split('/').map((x) => x.trim()).filter(Boolean);
      if (s.includes(';')) return s.split(';').map((x) => x.trim()).filter(Boolean);

      // Avoid splitting numeric thousands separators like "10,000".
      if (s.includes(',') && !isNumericThousands(s)) {
        return s.split(',').map((x) => x.trim()).filter(Boolean);
      }

      return [s];
    };

    const parseEnglishNumber = (raw) => {
      const s = normalizeText(raw)
        .replace(/-/g, ' ')
        .replace(/\band\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!s) return null;

      const small = {
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
      };
      const tens = {
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90,
      };
      const scales = {
        thousand: 1000,
        million: 1000000,
        billion: 1000000000,
      };

      const tokens = s.split(' ').filter(Boolean);
      let total = 0;
      let current = 0;
      let seenAny = false;

      for (const tok of tokens) {
        if (small[tok] != null) {
          current += small[tok];
          seenAny = true;
          continue;
        }
        if (tens[tok] != null) {
          current += tens[tok];
          seenAny = true;
          continue;
        }
        if (tok === 'hundred') {
          if (!seenAny) return null;
          current *= 100;
          continue;
        }
        if (scales[tok] != null) {
          if (!seenAny) return null;
          total += current * scales[tok];
          current = 0;
          continue;
        }
        return null;
      }

      if (!seenAny) return null;
      return total + current;
    };

    const tryParseNumber = (raw) => {
      if (raw == null) return null;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

      const s0 = normalizeText(raw);
      if (!s0) return null;

      const compactDigits = s0
        .replace(/,/g, '')
        .replace(/(?<=\d)\s+(?=\d)/g, '');

      if (/^\d+(\.\d+)?$/.test(compactDigits)) {
        const n = Number(compactDigits);
        return Number.isFinite(n) ? n : null;
      }

      const m = compactDigits.match(/^(\d+(?:\.\d+)?)\s*(thousand|million|billion)$/);
      if (m) {
        const base = Number(m[1]);
        if (!Number.isFinite(base)) return null;
        const unit = m[2];
        const mult = unit === 'thousand' ? 1000 : unit === 'million' ? 1000000 : 1000000000;
        return base * mult;
      }

      const words = parseEnglishNumber(compactDigits);
      return words != null ? words : null;
    };

    const candidateKeys = (raw) => {
      const text = normalizeText(raw);
      const keys = text ? [text] : [];
      const num = tryParseNumber(raw);
      if (num != null) keys.push(`#num:${num}`);
      return keys;
    };

    const isAnswerMatch = (student, expectedRaw) => {
      const studentKeys = new Set(candidateKeys(student));
      const variants = explodeAccepted(expectedRaw);
      for (const v of variants) {
        for (const k of candidateKeys(v)) {
          if (studentKeys.has(k)) return true;
        }
      }
      return false;
    };

    const setEq = (a, b) => {
      const A = new Set(a);
      const B = new Set(b);
      if (A.size !== B.size) return false;
      for (const v of A) if (!B.has(v)) return false;
      return true;
    };

    const bandFromCorrect = (c) => {
      if (c >= 39) return 9;
      if (c >= 37) return 8.5;
      if (c >= 35) return 8;
      if (c >= 32) return 7.5;
      if (c >= 30) return 7;
      if (c >= 26) return 6.5;
      if (c >= 23) return 6;
      if (c >= 18) return 5.5;
      if (c >= 16) return 5;
      if (c >= 13) return 4.5;
      if (c >= 11) return 4;
      return 3.5;
    };

    // Calculate score + build details for review
    let correctCount = 0;
    let totalCount = 0;
    const details = [];

    const questions = parseIfJsonString(test.questions);
    const passages = parseIfJsonString(test.passages) || [];
    const partInstructions = parseIfJsonString(test.partInstructions);

    const getSectionQuestions = (pIdx, sIdx) => {
      if (!Array.isArray(questions)) return [];
      return questions
        .filter((q) => Number(q?.partIndex) === Number(pIdx) && Number(q?.sectionIndex) === Number(sIdx))
        .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));
    };

    const parseLeadingNumber = (text) => {
      const s = String(text || '').trim();
      const m = s.match(/^(\d+)\b/);
      return m ? parseInt(m[1], 10) : null;
    };

    const scoreFromSections = () => {
      if (!Array.isArray(partInstructions) || !Array.isArray(questions)) return false;

      for (let pIdx = 0; pIdx < partInstructions.length; pIdx++) {
        const part = partInstructions[pIdx];
        const sections = Array.isArray(part?.sections) ? part.sections : [];

        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx] || {};
          const sectionType = String(section?.questionType || 'fill').toLowerCase();
          const sectionQuestions = getSectionQuestions(pIdx, sIdx);
          if (!sectionQuestions.length) continue;

          const firstQ = sectionQuestions[0];
          const firstAnswers = parseIfJsonString(firstQ?.answers);
          const firstFormRows = parseIfJsonString(firstQ?.formRows);
          const firstLeftItems = parseIfJsonString(firstQ?.leftItems);
          const firstItems = parseIfJsonString(firstQ?.items);

          // FORM COMPLETION
          if (sectionType === 'form-completion') {
            const q = firstQ;
            const map = firstAnswers && typeof firstAnswers === 'object' && !Array.isArray(firstAnswers) ? firstAnswers : null;
            const keys = map
              ? Object.keys(map)
                  .map((k) => parseInt(k, 10))
                  .filter((n) => Number.isFinite(n))
                  .sort((a, b) => a - b)
              : [];

            // Prefer answer-map numbering (e.g. 1..10)
            if (keys.length) {
              for (const num of keys) {
                totalCount++;
                const expected = map[String(num)];
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionType: sectionType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
              }
            } else {
              const rows = Array.isArray(firstFormRows) ? firstFormRows : [];
              const blanks = rows.filter((r) => r && r.isBlank);
              const start =
                typeof section?.startingQuestionNumber === 'number' && section.startingQuestionNumber > 0
                  ? section.startingQuestionNumber
                  : 1;

              if (blanks.length) {
                blanks.forEach((row, idx) => {
                  const num = row?.blankNumber ? Number(row.blankNumber) : start + idx;
                  if (!Number.isFinite(num)) return;
                  totalCount++;
                  const expected =
                    row?.correctAnswer ??
                    row?.answer ??
                    row?.correct ??
                    (map ? map[String(num)] : '') ??
                    '';
                  const student = normalizedAnswers[`q${num}`];
                  const ok = isAnswerMatch(student, expected);
                  if (ok) correctCount++;
                  details.push({
                    questionNumber: num,
                    partIndex: pIdx,
                    sectionIndex: sIdx,
                    questionType: sectionType,
                    studentAnswer: student ?? '',
                    correctAnswer: expected ?? '',
                    isCorrect: ok,
                  });
                });
              }
            }

            continue;
          }

          // NOTES COMPLETION
          if (sectionType === 'notes-completion') {
            const q = firstQ;
            const map = firstAnswers && typeof firstAnswers === 'object' && !Array.isArray(firstAnswers) ? firstAnswers : null;
            const keys = map
              ? Object.keys(map)
                  .map((k) => parseInt(k, 10))
                  .filter((n) => Number.isFinite(n))
                  .sort((a, b) => a - b)
              : [];

            // Prefer answer-map numbering (e.g. 31..40)
            if (keys.length) {
              for (const num of keys) {
                totalCount++;
                const expected = map[String(num)];
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionType: sectionType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
              }
            } else {
              // Fallback to parsing numbers from notesText
              const notesText = String(q?.notesText || '');
              const matches = notesText.match(/(\d+)\s*[_…]+/g) || [];
              for (const token of matches) {
                const m = token.match(/^(\d+)/);
                if (!m) continue;
                const num = parseInt(m[1], 10);
                if (!Number.isFinite(num)) continue;
                totalCount++;
                const expected = map ? map[String(num)] : q?.correctAnswer;
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionType: sectionType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
              }
            }
            continue;
          }

          // MATCHING
          if (sectionType === 'matching') {
            const q = firstQ;
            const map = firstAnswers && typeof firstAnswers === 'object' && !Array.isArray(firstAnswers) ? firstAnswers : null;
            const keys = map
              ? Object.keys(map)
                  .map((k) => parseInt(k, 10))
                  .filter((n) => Number.isFinite(n))
                  .sort((a, b) => a - b)
              : [];

            if (keys.length) {
              for (const num of keys) {
                totalCount++;
                const expected = map[String(num)];
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex: pIdx,
                  sectionIndex: sIdx,
                  questionType: sectionType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
              }
            } else {
              const start =
                typeof section?.startingQuestionNumber === 'number' && section.startingQuestionNumber > 0
                  ? section.startingQuestionNumber
                  : parseLeadingNumber(q?.questionText);
              const left = Array.isArray(firstLeftItems)
                ? firstLeftItems
                : Array.isArray(firstItems)
                  ? firstItems
                  : [];
              const count = left.length || 0;
              if (count > 0) {
                for (let idx = 0; idx < count; idx++) {
                  const num = Number.isFinite(start) ? start + idx : idx + 1;
                  totalCount++;
                  const expected = map ? map[String(num)] : '';
                  const student = normalizedAnswers[`q${num}`];
                  const ok = expected ? isAnswerMatch(student, expected) : false;
                  if (ok) correctCount++;
                  details.push({
                    questionNumber: num,
                    partIndex: pIdx,
                    sectionIndex: sIdx,
                    questionType: sectionType,
                    studentAnswer: student ?? '',
                    correctAnswer: expected ?? '',
                    isCorrect: ok,
                  });
                }
              }
            }
            continue;
          }

          // MULTI-SELECT
          if (sectionType === 'multi-select') {
            // Multi-select groups are stored as 1 question object per group.
            // Student answers are stored on q<groupStart> as an array of selected option indices.
            let groupStart =
              typeof section?.startingQuestionNumber === 'number' && section.startingQuestionNumber > 0
                ? section.startingQuestionNumber
                : parseLeadingNumber(sectionQuestions[0]?.questionText) || 1;

            for (const q of sectionQuestions) {
              const required = Number(q?.requiredAnswers) || 2;
              const student = normalizedAnswers[`q${groupStart}`];
              const expectedRaw = q?.correctAnswer ?? q?.answers;

              const studentIndices = Array.isArray(student)
                ? student.map((x) => Number(x)).filter((n) => Number.isFinite(n))
                : explodeAccepted(student)
                    .map((x) => {
                      const t = String(x).trim();
                      if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                      const n = Number(t);
                      return Number.isFinite(n) ? n : null;
                    })
                    .filter((n) => n != null);

              const expectedIndices = explodeAccepted(expectedRaw)
                .map((x) => {
                  const t = String(x).trim();
                  if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                  const n = Number(t);
                  return Number.isFinite(n) ? n : null;
                })
                .filter((n) => n != null);

              totalCount += required;
              const ok = expectedIndices.length ? setEq(studentIndices, expectedIndices) : false;
              if (ok) correctCount += required;
              details.push({
                questionNumber: groupStart,
                partIndex: pIdx,
                sectionIndex: sIdx,
                questionType: sectionType,
                studentAnswer: student ?? '',
                correctAnswer: expectedRaw ?? '',
                isCorrect: ok,
              });

              groupStart += required;
            }
            continue;
          }

          // DEFAULT (abc/abcd/fill): sequential numbering from startingQuestionNumber
          const start =
            typeof section?.startingQuestionNumber === 'number' && section.startingQuestionNumber > 0
              ? section.startingQuestionNumber
              : parseLeadingNumber(sectionQuestions[0]?.questionText);
          if (!Number.isFinite(start)) continue;

          sectionQuestions.forEach((q, idx) => {
            const num = start + idx;
            totalCount++;
            const expected = q?.correctAnswer;
            const student = normalizedAnswers[`q${num}`];
            const ok = isAnswerMatch(student, expected);
            if (ok) correctCount++;
            details.push({
              questionNumber: num,
              partIndex: pIdx,
              sectionIndex: sIdx,
              questionType: String(sectionType || q?.questionType || 'fill').toLowerCase(),
              studentAnswer: student ?? '',
              correctAnswer: expected ?? '',
              isCorrect: ok,
            });
          });
        }
      }

      return totalCount > 0;
    };

    // 0) Preferred when available: partInstructions + questions (aligns to 1..40)
    const scoredFromSections = scoreFromSections();

    // 1) Fallback/current format: flat array with globalNumber and answers keyed by q<number>
    if (!scoredFromSections && Array.isArray(questions) && questions.length > 0) {
      const sorted = [...questions].sort(
        (a, b) => (Number(a?.globalNumber) || 0) - (Number(b?.globalNumber) || 0)
      );

      for (const q of sorted) {
        let qType = String(q?.questionType || 'fill').toLowerCase();
        // Some saved tests store section-level objects with questionType='fill' but
        // include specialized fields (formRows/notesText/leftItems/requiredAnswers).
        // Derive a more accurate type from content to score correctly.
        if (qType === 'fill' || qType === 'single') {
          if (Array.isArray(q?.formRows) && q.formRows.length > 0) qType = 'form-completion';
          else if (q?.notesText) qType = 'notes-completion';
          else if ((Array.isArray(q?.leftItems) && q.leftItems.length > 0) || (Array.isArray(q?.items) && q.items.length > 0)) qType = 'matching';
        }
        const baseNum = Number(q?.globalNumber);
        const partIndex = q?.partIndex;
        const sectionIndex = q?.sectionIndex;

        // Matching: answers object keyed by question number ("11": "C")
        if (qType === 'matching') {
          const map = q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? q.answers : null;
          if (map) {
            const keys = Object.keys(map)
              .map((k) => parseInt(k, 10))
              .filter((n) => Number.isFinite(n))
              .sort((a, b) => a - b);
            for (const num of keys) {
              totalCount++;
              const expected = map[String(num)];
              const student = normalizedAnswers[`q${num}`];
              const ok = isAnswerMatch(student, expected);
              if (ok) correctCount++;
              details.push({
                questionNumber: num,
                partIndex,
                sectionIndex,
                questionType: qType,
                studentAnswer: student ?? '',
                correctAnswer: expected ?? '',
                isCorrect: ok,
              });
            }
          } else if (Number.isFinite(baseNum)) {
            // fallback to a single slot
            totalCount++;
            const student = normalizedAnswers[`q${baseNum}`];
            const expected = q?.correctAnswer;
            const ok = isAnswerMatch(student, expected);
            if (ok) correctCount++;
            details.push({
              questionNumber: baseNum,
              partIndex,
              sectionIndex,
              questionType: qType,
              studentAnswer: student ?? '',
              correctAnswer: expected ?? '',
              isCorrect: ok,
            });
          }
          continue;
        }

        // Form completion: formRows blanks
        if (qType === 'form-completion') {
          const rows = Array.isArray(q?.formRows) ? q.formRows : [];
          const blanks = rows.filter((r) => r && r.isBlank);
          const map =
            q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers)
              ? q.answers
              : null;
          if (Number.isFinite(baseNum)) {
            if (blanks.length > 0) {
              blanks.forEach((row, idx) => {
                const num = row?.blankNumber
                  ? baseNum + Number(row.blankNumber) - 1
                  : baseNum + idx;
                totalCount++;
                const expected =
                  row?.correctAnswer ??
                  row?.answer ??
                  row?.correct ??
                  (map ? map[String(num)] : '') ??
                  '';
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex,
                  sectionIndex,
                  questionType: qType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
              });
            } else {
              totalCount++;
              const expected = q?.correctAnswer ?? '';
              const student = normalizedAnswers[`q${baseNum}`];
              const ok = isAnswerMatch(student, expected);
              if (ok) correctCount++;
              details.push({
                questionNumber: baseNum,
                partIndex,
                sectionIndex,
                questionType: qType,
                studentAnswer: student ?? '',
                correctAnswer: expected ?? '',
                isCorrect: ok,
              });
            }
            continue;
          }
        }

        // Table completion: support multiple blanks per cell (ROW-major ordering)
        if (qType === 'table-completion') {
          const cols = q.columns || [];
          const rowsArr = Array.isArray(q?.rows) ? q.rows : [];
          const map = q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? q.answers : null;
          if (Number.isFinite(baseNum)) {
            let offset = 0;
            let foundAny = false;
            const BLANK_DETECT = /\[BLANK\]|_{2,}|[\u2026]+/g;

            for (let r = 0; r < rowsArr.length; r++) {
              const rawRow = rowsArr[r];
              const row = Array.isArray(rawRow.cells)
                ? rawRow
                : { cells: [rawRow.vehicle || '', rawRow.cost || '', Array.isArray(rawRow.comments) ? rawRow.comments.join('\n') : rawRow.comments || ''], cellBlankAnswers: rawRow.cellBlankAnswers || rawRow.commentBlankAnswers || [], commentBlankAnswers: rawRow.commentBlankAnswers || [] };

              for (let c = 0; c < cols.length; c++) {
                const text = String(row.cells[c] || '');
                let match;
                BLANK_DETECT.lastIndex = 0;
                let localIdx = 0;
                const isCommentsCol = /comment/i.test((q.columns || [])[c]);

                while ((match = BLANK_DETECT.exec(text)) !== null) {
                  foundAny = true;
                  const num = baseNum + offset;
                  totalCount++;

                  let expected = '';
                  if (map) {
                    expected = map[String(num)] ?? '';
                  } else {
                    if (isCommentsCol) {
                      // flatten per-line answers if present
                      const flat = (row.commentBlankAnswers || []).flat();
                      expected = flat[localIdx] || '';
                    } else {
                      expected = (row.cellBlankAnswers && row.cellBlankAnswers[c] && row.cellBlankAnswers[c][localIdx]) || '';
                      if (!expected && c === 1) expected = row.correct || row.cost || '';
                    }
                  }

                  const student = normalizedAnswers[`q${num}`];
                  const ok = isAnswerMatch(student, expected);
                  if (ok) correctCount++;
                  details.push({
                    questionNumber: num,
                    partIndex,
                    sectionIndex,
                    questionType: qType,
                    studentAnswer: student ?? '',
                    correctAnswer: expected ?? '',
                    isCorrect: ok,
                  });

                  localIdx++;
                  offset++;
                }
              }
            }

            // fallback: if no blanks detected, treat as one blank per row (legacy)
            if (!foundAny) {
              for (let r = 0; r < rowsArr.length; r++) {
                const num = baseNum + offset;
                totalCount++;
                const row = rowsArr[r];
                const expected = map ? (map[String(num)] ?? '') : (row?.cost ?? row?.correct ?? '');
                const student = normalizedAnswers[`q${num}`];
                const ok = isAnswerMatch(student, expected);
                if (ok) correctCount++;
                details.push({
                  questionNumber: num,
                  partIndex,
                  sectionIndex,
                  questionType: qType,
                  studentAnswer: student ?? '',
                  correctAnswer: expected ?? '',
                  isCorrect: ok,
                });
                offset++;
              }
            }

            continue;
          }
        }
        if (qType === 'notes-completion') {
          const notesText = String(q?.notesText || '');
          const matches = notesText.match(/(\d+)\s*[_…]+/g) || [];
          const map = q?.answers && typeof q.answers === 'object' && !Array.isArray(q.answers) ? q.answers : null;
          if (matches.length) {
            for (const token of matches) {
              const m = token.match(/^(\d+)/);
              if (!m) continue;
              const num = parseInt(m[1], 10);
              if (!Number.isFinite(num)) continue;
              totalCount++;
              const expected = map ? map[String(num)] : q?.correctAnswer;
              const student = normalizedAnswers[`q${num}`];
              const ok = isAnswerMatch(student, expected);
              if (ok) correctCount++;
              details.push({
                questionNumber: num,
                partIndex,
                sectionIndex,
                questionType: qType,
                studentAnswer: student ?? '',
                correctAnswer: expected ?? '',
                isCorrect: ok,
              });
            }
          } else if (Number.isFinite(baseNum)) {
            totalCount++;
            const expected = q?.correctAnswer ?? '';
            const student = normalizedAnswers[`q${baseNum}`];
            const ok = isAnswerMatch(student, expected);
            if (ok) correctCount++;
            details.push({
              questionNumber: baseNum,
              partIndex,
              sectionIndex,
              questionType: qType,
              studentAnswer: student ?? '',
              correctAnswer: expected ?? '',
              isCorrect: ok,
            });
          }
          continue;
        }

        // Multi-select (Choose TWO, etc.): one stored key q<base>, but counts as requiredAnswers questions
        if (qType === 'multi-select') {
          const required = Number(q?.requiredAnswers) || 2;
          if (!Number.isFinite(baseNum)) continue;

          const student = normalizedAnswers[`q${baseNum}`];
          const expectedRaw = q?.correctAnswer ?? q?.answers;

          const studentIndices = Array.isArray(student)
            ? student.map((x) => Number(x)).filter((n) => Number.isFinite(n))
            : explodeAccepted(student).map((x) => {
                const t = String(x).trim();
                if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                const n = Number(t);
                return Number.isFinite(n) ? n : null;
              }).filter((n) => n != null);

          const expectedIndices = Array.isArray(expectedRaw)
            ? expectedRaw.map((x) => {
                const t = String(x).trim();
                if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                const n = Number(t);
                return Number.isFinite(n) ? n : null;
              }).filter((n) => n != null)
            : explodeAccepted(expectedRaw).map((x) => {
                const t = String(x).trim();
                if (/^[A-Z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
                const n = Number(t);
                return Number.isFinite(n) ? n : null;
              }).filter((n) => n != null);

          const setEq = (a, b) => {
            const A = new Set(a);
            const B = new Set(b);
            if (A.size !== B.size) return false;
            for (const v of A) if (!B.has(v)) return false;
            return true;
          };

          // count as required answers (e.g., q25-q26)
          totalCount += required;
          const ok = expectedIndices.length ? setEq(studentIndices, expectedIndices) : false;
          if (ok) correctCount += required;
          details.push({
            questionNumber: baseNum,
            partIndex,
            sectionIndex,
            questionType: qType,
            studentAnswer: student ?? '',
            correctAnswer: expectedRaw ?? '',
            isCorrect: ok,
          });
          continue;
        }

        // Default (fill / abc / abcd)
        if (!Number.isFinite(baseNum)) continue;
        totalCount++;
        const expected = q?.correctAnswer;
        const student = normalizedAnswers[`q${baseNum}`];
        const ok = isAnswerMatch(student, expected);
        if (ok) correctCount++;
        details.push({
          questionNumber: baseNum,
          partIndex,
          sectionIndex,
          questionType: qType,
          studentAnswer: student ?? '',
          correctAnswer: expected ?? '',
          isCorrect: ok,
        });
      }
    } else if (questions && typeof questions === 'object' && Object.keys(questions).length > 0) {
      // 2) Legacy format: questions grouped by partKey, answers keyed by `${partKey}_${idx}`
      Object.entries(questions).forEach(([partKey, partQuestions]) => {
        if (!Array.isArray(partQuestions)) return;
        partQuestions.forEach((q, idx) => {
          const answerKey = `${partKey}_${idx}`;
          totalCount++;
          const studentAnswer = normalizedAnswers[answerKey] ?? '';
          const correctAnswer = q?.correctAnswer ?? '';
          const ok = isAnswerMatch(studentAnswer, correctAnswer);
          if (ok) correctCount++;
          details.push({
            questionNumber: totalCount,
            partIndex: null,
            sectionIndex: null,
            questionType: q?.questionType || 'fill',
            studentAnswer: studentAnswer ?? '',
            correctAnswer: correctAnswer ?? '',
            isCorrect: ok,
          });
        });
      });
    } else if (passages.length > 0) {
      // 3) Very old format
      passages.forEach((passage, pIdx) => {
        if (!passage.questions) return;
        passage.questions.forEach((q, qIdx) => {
          const answerKey = `passage${pIdx}_${qIdx}`;
          totalCount++;
          const studentAnswer = normalizedAnswers[answerKey] ?? '';
          const correctAnswer = q?.correctAnswer ?? '';
          const ok = isAnswerMatch(studentAnswer, correctAnswer);
          if (ok) correctCount++;
          details.push({
            questionNumber: totalCount,
            partIndex: pIdx,
            sectionIndex: null,
            questionType: q?.questionType || 'fill',
            studentAnswer: studentAnswer ?? '',
            correctAnswer: correctAnswer ?? '',
            isCorrect: ok,
          });
        });
      });
    }

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const band = bandFromCorrect(correctCount);

    const resolvedUserName =
      studentName ||
      user?.name ||
      user?.username ||
      user?.email ||
      null;
    const resolvedUserId = studentId || user?.id || null;

    // If an unfinished autosave attempt exists for this user and test, update it and mark finished
    let submission = null;
    if (resolvedUserId) {
      const existing = await ListeningSubmission.findOne({ where: { testId: Number(id), userId: resolvedUserId, finished: false }, order: [['updatedAt', 'DESC']] });
      if (existing) {
        existing.answers = normalizedAnswers;
        existing.details = details;
        existing.correct = correctCount;
        existing.total = totalCount;
        existing.scorePercentage = scorePercentage;
        existing.band = band;
        existing.finished = true;
        existing.expiresAt = null;
        existing.lastSavedAt = new Date();
        await existing.save();
        submission = existing;
      }
    }

    if (!submission) {
      submission = await ListeningSubmission.create({
        testId: Number(id),
        userId: resolvedUserId,
        userName: resolvedUserName,
        answers: normalizedAnswers,
        details,
        correct: correctCount,
        total: totalCount,
        scorePercentage,
        band,
        finished: true,
      });
      debug(`Created submission id=${submission.id} finished=${submission.finished}`);
    } else {
      debug(`Updated existing submission id=${submission.id} finished=${submission.finished}`);
    }

    debug(`Responding to submit for test ${id}: submissionId=${submission.id}, correct=${correctCount}, total=${totalCount}`);

    res.json({
      submissionId: submission.id,
      total: totalCount,
      correct: correctCount,
      scorePercentage,
      band,
    });
  } catch (error) {
    console.error('Error submitting listening test:', error);
    res.status(500).json({
      message: '❌ Lỗi khi nộp bài',
      error: error.message
    });
  }
});

// API cập nhật đề thi
router.put('/:id', requireAuth, requireTestPermission('listening'), upload.any(), async (req, res) => {
  try {
    const test = await ListeningTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }

    console.log('Update request body:', req.body);
    console.log('Update request files:', req.files ? Object.keys(req.files) : 'none');

    const { classCode, teacherName, passages, title, showResultModal } = req.body;
    
    let updates = {};
    
    // Update basic fields
    if (classCode) updates.classCode = classCode;
    if (teacherName) updates.teacherName = teacherName;
    if (title) updates.title = title;
    if (showResultModal !== undefined) updates.showResultModal = showResultModal;
    
    // Process file updates if any
    if (req.files) {
      if (req.files.audioFile) {
        updates.mainAudioUrl = `/uploads/audio/${req.files.audioFile[0].filename}`;
      }
    }

    // If passages provided, transform like in POST route
    if (passages) {
      const parsedPassages = typeof passages === 'string' ? JSON.parse(passages) : passages;
      
      // Debug: show a short preview of parsed passages to inspect map items/positions
      try { console.log('Parsed passages for update (preview):', JSON.stringify(parsedPassages).slice(0,2000)); } catch (e) { console.log('Parsed passages (could not stringify)'); }
      
      // Process audio files for each part
      const processedPassages = parsedPassages.map((passage, index) => {
        let audioFile = passage.audioFile || test.mainAudioUrl;
        
        if (req.files && Array.isArray(req.files)) {
          const f = req.files.find(fi => fi.fieldname === `audioFile_part_${index}` || fi.fieldname === `audioFile_passage_${index}` || fi.fieldname === 'audioFile');
          if (f) audioFile = `/uploads/audio/${f.filename}`;
        }
        
        return { ...passage, audioFile };
      });

      // Attach uploaded map images to questions
      if (req.files && Array.isArray(req.files) && req.files.length) {
        req.files.forEach(file => {
          if (!file.fieldname || !file.filename) return;
          if (!file.fieldname.startsWith('mapImage')) return;

          const m = file.fieldname.match(/mapImage_part_(\d+)_section_(\d+)_q_(\d+)/);
          if (m) {
            const partIdx = Number(m[1]); const sectionIdx = Number(m[2]); const qIdx = Number(m[3]);
            if (processedPassages[partIdx] && processedPassages[partIdx].sections && processedPassages[partIdx].sections[sectionIdx] && processedPassages[partIdx].sections[sectionIdx].questions && processedPassages[partIdx].sections[sectionIdx].questions[qIdx]) {
              processedPassages[partIdx].sections[sectionIdx].questions[qIdx].mapImageUrl = `/uploads/images/${file.filename}`;
            }
          } else {
            const m2 = file.fieldname.match(/mapImage_part_(\d+)/);
            if (m2) {
              const partIdx = Number(m2[1]);
              const secIdx = (processedPassages[partIdx]?.sections || []).findIndex(s => s.questionType === 'map-labeling');
              if (secIdx >= 0) {
                processedPassages[partIdx].sections[secIdx].questions[0].mapImageUrl = `/uploads/images/${file.filename}`;
              }
            }
          }
        });
      }

      // Transform to database format (same as POST)
      const partTypes = processedPassages.map(part => {
        const types = part.sections?.map(s => s.questionType || 'fill') || ['fill'];
        return types;
      });

      const partInstructions = processedPassages.map(part => ({
        title: part.title || '',
        instruction: part.instruction || '',
        transcript: part.transcript || '',
        audioFile: part.audioFile || null,
        sections: part.sections?.map(s => ({
          sectionTitle: s.sectionTitle || '',
          sectionInstruction: s.sectionInstruction || '',
          questionType: s.questionType || 'fill',
          startingQuestionNumber: s.startingQuestionNumber || null,
        })) || []
      }));

      // Flatten questions
      const questions = [];
      let globalQuestionNum = 1;
      
      processedPassages.forEach((part, partIndex) => {
        part.sections?.forEach((section, sectionIndex) => {
          section.questions?.forEach((q, qIndex) => {
            questions.push({
              partIndex,
              sectionIndex,
              questionIndex: qIndex,
              globalNumber: globalQuestionNum,
              questionType: q.questionType || section.questionType || 'fill',
              questionText: q.questionText || '',
              correctAnswer: q.correctAnswer || '',
              options: q.options || null,
              formTitle: q.formTitle || null,
              formRows: q.formRows || null,
              questionRange: q.questionRange || null,
              answers: q.answers || null,
              // Table completion specific
              columns: q.columns || null,
              rows: q.rows || null,
              leftTitle: q.leftTitle || null,
              rightTitle: q.rightTitle || null,
              leftItems: q.leftItems || null,
              rightItems: q.rightItems || null,
              items: q.items || null,
              // Map image URL (if any)
              mapImageUrl: q.mapImageUrl || q.imageUrl || null,
              wordLimit: q.wordLimit || null,
              // Notes completion fields
              notesText: q.notesText || null,
              notesTitle: q.notesTitle || null,
              // Multi-select fields
              requiredAnswers: q.requiredAnswers || null,
            });
            
            // Calculate question count based on question type
            const qType = q.questionType || section.questionType || 'fill';
            
            if (qType === 'matching') {
              globalQuestionNum += (q.leftItems?.length || 1);
            } else if (qType === 'form-completion') {
              const blankCount = q.formRows?.filter(r => r.isBlank)?.length || 1;
              globalQuestionNum += blankCount;
            } else if (qType === 'table-completion') {
              globalQuestionNum += (q.rows?.length || 1);
            } else if (qType === 'notes-completion') {
              // Count blanks in notesText
              const notesText = q.notesText || '';
              const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
              globalQuestionNum += blanks.length || 1;
            } else if (qType === 'multi-select') {
              globalQuestionNum += (q.requiredAnswers || 2);
            } else {
              globalQuestionNum += 1;
            }
          });
        });
      });

      // Build part audio URLs
      const partAudioUrls = {};
      processedPassages.forEach((part, idx) => {
        if (part.audioFile) {
          partAudioUrls[idx] = part.audioFile;
        }
      });

      updates.partTypes = partTypes;
      updates.partInstructions = partInstructions;
      updates.questions = questions;
      updates.partAudioUrls = partAudioUrls;
    }

    // Update the test
    await test.update(updates);
    // Reload to ensure we return the latest values (including updated JSON fields)
    await test.reload();

    res.json({
      message: '✅ Đã cập nhật đề thi thành công!',
      test: test
    });
  } catch (error) {
    console.error('Error updating listening test:', error);
    res.status(500).json({
      message: '❌ Lỗi khi cập nhật đề thi',
      error: error.message
    });
  }
});

module.exports = router;
