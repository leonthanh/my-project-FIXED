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
    Bạn là giáo viên IELTS Writing. Hãy đọc bài làm của học sinh và đưa ra nhận xét chi tiết:

    Task 1:
    ${task1}

    Task 2:
    ${task2}

    Yêu cầu:
    - Đưa ra nhận xét cụ thể cho từng task.
    - Chỉ ra lỗi ngữ pháp, từ vựng.
    - Gợi ý cải thiện.
    - Gợi ý nâng cao.
    - Cho điểm dự kiến theo thang IELTS Writing.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      console.error("Gemini API response:", text);
      return res.status(500).json({ error: "❌ Lỗi từ Gemini API", detail: text });
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
