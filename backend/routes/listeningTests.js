const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ListeningTest = require('../models/ListeningTest');
const ListeningSubmission = require('../models/ListeningSubmission');

// Cấu hình multer cho việc upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/audio')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an audio file!'), false);
    }
  }
});

// API tạo đề thi listening mới
router.post('/', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'audioFile_passage_0', maxCount: 1 },
  { name: 'audioFile_passage_1', maxCount: 1 },
  { name: 'audioFile_passage_2', maxCount: 1 },
  { name: 'audioFile_passage_3', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? Object.keys(req.files) : 'none');

    const { classCode, teacherName, passages } = req.body;
    
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
      
      if (req.files && req.files[`audioFile_passage_${index}`]) {
        audioFile = `/uploads/audio/${req.files[`audioFile_passage_${index}`][0].filename}`;
      }
      
      // Also check for audioFile_part_X (frontend sends this)
      if (req.files && req.files[`audioFile_part_${index}`]) {
        audioFile = `/uploads/audio/${req.files[`audioFile_part_${index}`][0].filename}`;
      }
      
      return {
        ...passage,
        audioFile
      };
    });

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
            // Matching specific
            leftItems: q.leftItems || null,
            rightItems: q.rightItems || null,
            items: q.items || null,
            // Notes completion specific
            notesText: q.notesText || null,
            notesTitle: q.notesTitle || null,
            // Multi-select specific
            requiredAnswers: q.requiredAnswers || null,
            // Other
            wordLimit: q.wordLimit || null,
          });
          
          // Calculate how many questions this item represents
          const qType = q.questionType || section.questionType || 'fill';
          
          if (qType === 'matching') {
            globalQuestionNum += (q.leftItems?.length || 1);
          } else if (qType === 'form-completion') {
            const blankCount = q.formRows?.filter(r => r.isBlank)?.length || 1;
            globalQuestionNum += blankCount;
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
      questions
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

    const normalize = (val) => (val == null ? '' : String(val)).trim().toLowerCase();
    const explodeAccepted = (val) => {
      if (val == null) return [];
      if (Array.isArray(val)) return val;
      const s = String(val);
      if (s.includes('|')) return s.split('|').map((x) => x.trim()).filter(Boolean);
      if (s.includes('/')) return s.split('/').map((x) => x.trim()).filter(Boolean);
      if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
      return [s];
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

    // 1) Preferred/current format: flat array with globalNumber and answers keyed by q<number>
    if (Array.isArray(questions) && questions.length > 0) {
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
              const ok = normalize(student) === normalize(expected);
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
            const ok = normalize(student) === normalize(expected);
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
                const ok = normalize(student) === normalize(expected);
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
              const ok = normalize(student) === normalize(expected);
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
          }
          continue;
        }

        // Notes completion: numbered blanks in notesText, expected answers in q.answers["31"]
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
              const ok = normalize(student) === normalize(expected);
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
            const ok = normalize(student) === normalize(expected);
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
        const accepted = explodeAccepted(expected).map(normalize);
        const ok = accepted.length
          ? accepted.includes(normalize(student))
          : normalize(student) === normalize(expected);
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
          const ok = normalize(studentAnswer) === normalize(correctAnswer);
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
          const ok = normalize(studentAnswer) === normalize(correctAnswer);
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

    const submission = await ListeningSubmission.create({
      testId: Number(id),
      userId: resolvedUserId,
      userName: resolvedUserName,
      answers: normalizedAnswers,
      details,
      correct: correctCount,
      total: totalCount,
      scorePercentage,
      band,
    });

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
router.put('/:id', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'audioFile_part_0', maxCount: 1 },
  { name: 'audioFile_part_1', maxCount: 1 },
  { name: 'audioFile_part_2', maxCount: 1 },
  { name: 'audioFile_part_3', maxCount: 1 }
]), async (req, res) => {
  try {
    const test = await ListeningTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }

    console.log('Update request body:', req.body);
    console.log('Update request files:', req.files ? Object.keys(req.files) : 'none');

    const { classCode, teacherName, passages, title } = req.body;
    
    let updates = {};
    
    // Update basic fields
    if (classCode) updates.classCode = classCode;
    if (teacherName) updates.teacherName = teacherName;
    if (title) updates.title = title;
    
    // Process file updates if any
    if (req.files) {
      if (req.files.audioFile) {
        updates.mainAudioUrl = `/uploads/audio/${req.files.audioFile[0].filename}`;
      }
    }

    // If passages provided, transform like in POST route
    if (passages) {
      const parsedPassages = typeof passages === 'string' ? JSON.parse(passages) : passages;
      
      // Process audio files for each part
      const processedPassages = parsedPassages.map((passage, index) => {
        let audioFile = passage.audioFile || test.mainAudioUrl;
        
        if (req.files && req.files[`audioFile_part_${index}`]) {
          audioFile = `/uploads/audio/${req.files[`audioFile_part_${index}`][0].filename}`;
        }
        
        return { ...passage, audioFile };
      });

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
              leftItems: q.leftItems || null,
              rightItems: q.rightItems || null,
              items: q.items || null,
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
