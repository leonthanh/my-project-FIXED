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
      
      return {
        ...passage,
        audioFile
      };
    });

    // Create the listening test
    const listeningTest = await ListeningTest.create({
      classCode,
      teacherName,
      passages: processedPassages
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
    const tests = await ListeningTest.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
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

// API cập nhật đề thi
router.put('/:id', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'audioFile_part1', maxCount: 1 },
  { name: 'audioFile_part2', maxCount: 1 },
  { name: 'audioFile_part3', maxCount: 1 },
  { name: 'audioFile_part4', maxCount: 1 }
]), async (req, res) => {
  try {
    const test = await ListeningTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: '❌ Không tìm thấy đề thi' });
    }

    const { questions, partInstructions, partTypes } = req.body;
    
    // Process file updates if any
    let updates = {};
    if (req.files) {
      if (req.files.audioFile) {
        updates.mainAudioUrl = `/uploads/audio/${req.files.audioFile[0].filename}`;
      }
      
      const newPartAudioUrls = { ...test.partAudioUrls };
      ['part1', 'part2', 'part3', 'part4'].forEach(part => {
        const fileKey = `audioFile_${part}`;
        if (req.files[fileKey]) {
          newPartAudioUrls[part] = `/uploads/audio/${req.files[fileKey][0].filename}`;
        }
      });
      updates.partAudioUrls = newPartAudioUrls;
    }

    // Update other fields
    if (questions) updates.questions = JSON.parse(questions);
    if (partInstructions) updates.partInstructions = JSON.parse(partInstructions);
    if (partTypes) updates.partTypes = JSON.parse(partTypes);

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
