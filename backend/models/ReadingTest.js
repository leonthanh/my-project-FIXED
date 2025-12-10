const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionNumber: Number,
  questionType: String, // e.g., 'multiple-choice', 'fill-in-the-blanks', 'matching'
  questionText: String,
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
});

const PassageSchema = new mongoose.Schema({
  passageNumber: Number,
  passageTitle: String,
  passageText: String,
  questions: [QuestionSchema]
});

const ReadingTestSchema = new mongoose.Schema({
  title: String,
  classCode: String, // ✅ Mã lớp
  teacherName: String, // ✅ Tên giáo viên ra đề
  passages: [PassageSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReadingTest', ReadingTestSchema);
