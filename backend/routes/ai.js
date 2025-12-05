// routes/ai.js
const express = require("express");
require("dotenv").config();

const router = express.Router();

// POST /api/ai/generate-feedback
router.post("/generate-feedback", async (req, res) => {
  const { task1, task2 } = req.body;

  if (!task1 || !task2) {
    return res.status(400).json({ error: "❌ Thiếu nội dung Task 1 hoặc Task 2" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "❌ Chưa cấu hình GEMINI_API_KEY trong .env" });
  }

  const prompt = `
    Bạn là giáo viên IELTS Writing chuyên nghiệp. Hãy đánh giá bài làm của học sinh theo tiêu chí chấm điểm chính thức của IDP IELTS.

    Task 1:
    ${task1}

    Task 2:
    ${task2}

    TIÊU CHÍ CHẤM ĐIỂM IELTS WRITING (IDP):

    1. TASK ACHIEVEMENT / TASK RESPONSE (25% - cho mỗi task):
       - Hoàn thành được yêu cầu của task
       - Đáp ứng đủ thông tin/yêu cầu
       - Có ý kiến rõ ràng (Task 2)
       - Phát triển ý tưởng đầy đủ

    2. COHERENCE & COHESION (25%):
       - Sắp xếp ý tưởng logic, rõ ràng
       - Phân chia đoạn văn phù hợp
       - Sử dụng từ nối (linking words) chính xác
       - Mối liên kết giữa các câu mượt mà

    3. LEXICAL RANGE & ACCURACY (25%):
       - Phạm vi từ vựng rộng, phù hợp
       - Sử dụng cụm từ (phrases) chính xác
       - Ít lỗi từ vựng
       - Từ vựng phù hợp với ngữ cảnh học thuật

    4. GRAMMATICAL RANGE & ACCURACY (25%):
       - Sử dụng cấu trúc câu đa dạng (simple, complex, compound)
       - Ít lỗi ngữ pháp
       - Câu phức sử dụng chính xác
       - Dấu câu chính xác

    HƯỚNG DẪN ĐÁNH GIÁ:
    - Chấm điểm từ 0-9 cho mỗi tiêu chí
    - Giải thích chi tiết lỗi (ngữ pháp, từ vựng, tổ chức ý tưởng)
    - Cho ví dụ cụ thể cho từng lỗi
    - Gợi ý cải thiện cho từng tiêu chí
    - Tính điểm trung bình cuối cùng (làm tròn đến 0.5)

    VUI LÒNG CẤP ĐỘ CHI TIẾT:
    
    📝 TASK 1 ANALYSIS:
    - Task Achievement: [0-9] và giải thích
    - Coherence & Cohesion: [0-9] và giải thích
    - Lexical Range: [0-9] và giải thích
    - Grammatical Range: [0-9] và giải thích
    - Điểm Task 1 trung bình: [0-9]
    
    📝 TASK 2 ANALYSIS:
    - Task Achievement: [0-9] và giải thích
    - Coherence & Cohesion: [0-9] và giải thích
    - Lexical Range: [0-9] và giải thích
    - Grammatical Range: [0-9] và giải thích
    - Điểm Task 2 trung bình: [0-9]
    
    🎯 OVERALL SCORE: [0-9] (trung bình Task 1 + Task 2)
    
    ⚠️ LỖI CHÍNH:
    - Liệt kê 3-5 lỗi nghiêm trọng nhất
    - Giải thích tại sao nó lỗi
    - Cách sửa chính xác
    
    💡 GỢI Ý NÂNG CAO:
    - Cách cải thiện từ vựng học thuật
    - Cách sử dụng cấu trúc câu phức hơn
    - Cách tổ chức ý tưởng hiệu quả
    - Tài liệu/phương pháp ôn tập
  `;


  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Gemini API Error Status:", response.status);
      console.error("❌ Gemini API Response:", text);
      return res.status(response.status).json({ 
        error: "❌ Lỗi từ Gemini API", 
        detail: text,
        status: response.status
      });
    }

    const data = await response.json();
    const suggestion =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "❌ AI không thể tạo nhận xét.";

    res.json({ suggestion });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "❌ Không thể kết nối AI." });
  }
});

module.exports = router;
