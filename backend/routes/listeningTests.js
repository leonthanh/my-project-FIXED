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
router.post('/listening-tests', upload.single('audioFile'), async (req, res) => {
  try {
    const { classCode, teacherName, instructions, questions } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: '❌ Vui lòng tải lên file audio' });
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;
    
    const parsedQuestions = JSON.parse(questions);

    const listeningTest = new ListeningTest({
      classCode,
      teacherName,
      audioUrl,
      instructions,
      questions: parsedQuestions
    });

    await listeningTest.save();

    res.status(201).json({
      message: '✅ Đã tạo đề thi thành công!',
      test: listeningTest
    });
  } catch (error) {
    console.error('Error creating listening test:', error);
    res.status(500).json({
      message: '❌ Lỗi khi tạo đề thi',
      error: error.message
    });
  }
});

// API lấy danh sách đề thi
router.get('/listening-tests', async (req, res) => {
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
router.get('/listening-tests/:id', async (req, res) => {
  try {
    const test = await ListeningTest.findById(req.params.id);
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

module.exports = router;
