const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads/images nếu chưa tồn tại
const uploadDir = path.join(__dirname, '..', 'uploads', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Tạo thư mục uploads/audio nếu chưa tồn tại
const audioUploadDir = path.join(__dirname, '..', 'uploads', 'audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Cấu hình multer storage (images)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique: timestamp + random + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// Cấu hình multer storage (audio)
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  }
});

// File filter - chỉ cho phép hình ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file hình ảnh (JPEG, PNG, GIF, WebP)'), false);
  }
};

// File filter - chỉ cho phép audio
const audioFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file audio (mp3, wav, m4a, ogg, ...)'), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Giới hạn 50MB
  }
});

/**
 * POST /api/upload/image
 * Upload một hình ảnh
 * Body: FormData với field 'image'
 * Response: { url: '/uploads/images/filename.jpg' }
 */
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Trả về URL của hình ảnh
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    res.json({
      message: '✅ Upload hình ảnh thành công!',
      url: imageUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Lỗi khi upload hình ảnh' });
  }
});

/**
 * POST /api/upload/images
 * Upload nhiều hình ảnh (tối đa 10)
 * Body: FormData với field 'images'
 * Response: { urls: ['/uploads/images/file1.jpg', ...] }
 */
router.post('/images', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const urls = req.files.map(file => `/uploads/images/${file.filename}`);
    
    res.json({
      message: `✅ Upload ${req.files.length} hình ảnh thành công!`,
      urls: urls,
      files: req.files.map(f => ({
        url: `/uploads/images/${f.filename}`,
        filename: f.filename,
        originalname: f.originalname,
        size: f.size
      }))
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Lỗi khi upload hình ảnh' });
  }
});

/**
 * POST /api/upload/audio
 * Upload một file audio
 * Body: FormData với field 'audio'
 * Response: { url: '/uploads/audio/filename.mp3' }
 */
router.post('/audio', uploadAudio.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;

    res.json({
      message: '✅ Upload audio thành công!',
      url: audioUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ Upload audio error:', error);
    res.status(500).json({ message: 'Lỗi khi upload audio' });
  }
});

/**
 * DELETE /api/upload/image/:filename
 * Xóa một hình ảnh
 */
router.delete('/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: '✅ Đã xóa hình ảnh' });
    } else {
      res.status(404).json({ message: 'Không tìm thấy file' });
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa hình ảnh' });
  }
});

// Error handler cho multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File quá lớn. Vui lòng chọn file nhỏ hơn.' });
    }
    return res.status(400).json({ message: error.message });
  }
  
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  
  next();
});

module.exports = router;
