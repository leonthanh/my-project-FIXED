const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ListeningTest = require('../models/ListeningTest');

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
    const { answers } = req.body;

    // Get the test to check correct answers
    const test = await ListeningTest.findByPk(id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }

    // Calculate score
    let correctCount = 0;
    let totalCount = 0;
    const results = {};

    // Handle both old format (passages) and new format (questions)
    const questions = test.questions || {};
    const passages = test.passages || [];

    if (Object.keys(questions).length > 0) {
      // New format with questions by part (part1, part2, etc.)
      Object.entries(questions).forEach(([partKey, partQuestions]) => {
        if (!Array.isArray(partQuestions)) return;
        
        partQuestions.forEach((q, idx) => {
          const answerKey = `${partKey}_${idx}`;
          totalCount++;
          
          const studentAnswer = (answers[answerKey] || '').toString().toLowerCase().trim();
          const correctAnswer = (q.correctAnswer || '').toString().toLowerCase().trim();
          
          const isCorrect = studentAnswer === correctAnswer;
          if (isCorrect) correctCount++;
          
          results[answerKey] = {
            studentAnswer: answers[answerKey] || '',
            correctAnswer: q.correctAnswer || '',
            isCorrect
          };
        });
      });
    } else if (passages.length > 0) {
      // Old format with passages array
      passages.forEach((passage, pIdx) => {
        if (!passage.questions) return;
        
        passage.questions.forEach((q, qIdx) => {
          const answerKey = `passage${pIdx}_${qIdx}`;
          totalCount++;
          
          const studentAnswer = (answers[answerKey] || '').toString().toLowerCase().trim();
          const correctAnswer = (q.correctAnswer || '').toString().toLowerCase().trim();
          
          const isCorrect = studentAnswer === correctAnswer;
          if (isCorrect) correctCount++;
          
          results[answerKey] = {
            studentAnswer: answers[answerKey] || '',
            correctAnswer: q.correctAnswer || '',
            isCorrect
          };
        });
      });
    }

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    res.json({
      message: '✅ Nộp bài thành công!',
      score: correctCount,
      total: totalCount,
      percentage: scorePercentage,
      answers: results
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
