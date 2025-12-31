const express = require("express");
const router = express.Router();
const ReadingSubmission = require("../models/ReadingSubmission");

// Helper to render compare HTML (exported via attaching to router)
const buildCompareHtml = (submission, results) => {
  let html = `<!doctype html><html><head><meta charset="utf-8"><title>Compare Submission ${
    submission.id
  }</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;padding:18px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#0e276f;color:#fff}tr:nth-child(even){background:#f9f9f9}.ok{background:#e6f4ea;color:#155724}.bad{background:#ffe6e6;color:#721c24}.small{font-size:0.9em;color:#333}</style></head><body>
  <h2>So sánh Submission #${submission.id} (Test ${submission.testId})</h2>
  <p><strong>Học sinh:</strong> ${
    submission.userName || "N/A"
  } &nbsp; <strong>Đúng :</strong> ${submission.correct} / ${
    submission.total
  } &nbsp; <strong>Score:</strong> ${
    submission.scorePercentage || submission.scorePercentage === 0
      ? submission.scorePercentage + "%"
      : "N/A"
  }</p>
  <table><thead><tr><th>Q</th><th>Question Context</th><th>Paragraph</th><th>Expected (raw)</th><th>Expected Label</th><th>Student (raw)</th><th>Student Label</th><th>Result</th></tr></thead><tbody>`;

  for (const r of results) {
    const isOk = r.isCorrect;
    const qText = r.questionText
      ? `<div><strong>${r.questionText}</strong></div>`
      : "";
    const headings =
      r.headings && r.headings.length
        ? `<div class="small">Headings: ${r.headings
            .map((h) => (h.label || h.id || h.text || h).toString())
            .join(" | ")}</div>`
        : "";
    const snippet = r.passageSnippet
      ? `<div class="small">${r.passageSnippet}</div>`
      : "";
    const studentRaw =
      r.student && typeof r.student === "object"
        ? JSON.stringify(r.student)
        : r.student || "";
    const expectedRaw =
      r.expected && typeof r.expected === "object"
        ? JSON.stringify(r.expected)
        : r.expected || "";
    html += `<tr class="${isOk ? "ok" : "bad"}"><td>${
      r.questionNumber
    }</td><td>${qText}${headings}${snippet}</td><td>${
      r.paragraphId || "-"
    }</td><td>${expectedRaw}</td><td>${(
      r.expectedLabel || ""
    ).toString()}</td><td>${studentRaw}</td><td>${(
      r.studentLabel || ""
    ).toString()}</td><td>${isOk ? "✓" : "✕"}</td></tr>`;
  }

  html += `</tbody></table><p style="margin-top:18px"><a href="/admin">Back to Admin</a></p></body></html>`;
  return html;
};

// attach helper to router so tests can use it
if (!router.buildCompareHtml) router.buildCompareHtml = buildCompareHtml;

// Emergency helpers (count questions + robust scorer loader) — used when scoring module missing on some deploys
function countQuestions(passages = []) {
  let qCounter = 0;
  for (const p of passages || []) {
    const sections = p.sections || [{ questions: p.questions }];
    for (const s of sections) {
      for (const q of s.questions || []) {
        const qType = (q.questionType || q.type || "").toLowerCase();
        if (
          qType === "ielts-matching-headings" ||
          qType === "matching-headings"
        ) {
          const paragraphs = q.paragraphs || q.answers || [];
          qCounter += paragraphs.length || 0;
          continue;
        }
        if (qType === "cloze-test" || qType === "summary-completion") {
          const clozeText =
            q.paragraphText ||
            q.passageText ||
            q.text ||
            q.paragraph ||
            (q.questionText && q.questionText.includes("[BLANK]")
              ? q.questionText
              : null);
          if (clozeText) {
            const blanks = clozeText.match(/\[BLANK\]/gi) || [];
            qCounter += blanks.length || 1;
            continue;
          }
        }
        if (qType === "paragraph-matching") {
          const text = (q.questionText || "")
            .replace(/<p[^>]*>/gi, "")
            .replace(/<\/p>/gi, " ")
            .replace(/<br\s*\/?/gi, " ")
            .trim();
          const parts = text ? text.split(/(\.{3,}|…+)/) : [];
          const blanks = parts.filter((p2) => p2 && p2.match(/\.{3,}|…+/));
          qCounter += blanks.length > 0 ? blanks.length : 1;
          continue;
        }
        qCounter += 1;
      }
    }
  }
  return qCounter;
}

const path = require("path");
function loadReadingScorer() {
  const candidates = [
    path.join(__dirname, "..", "utils", "readingScorer"),
    path.join(__dirname, "..", "..", "utils", "readingScorer"),
    path.join(process.cwd(), "utils", "readingScorer"),
    path.join(__dirname, "..", "backend", "utils", "readingScorer"),
    path.join(__dirname, "..", "..", "backend", "utils", "readingScorer"),
    "../utils/readingScorer",
  ];
  for (const c of candidates) {
    try {
      const mod = require(c);
      if (mod) {
        console.log(`ℹ️ Loaded readingScorer from ${c}`);
        return mod;
      }
    } catch (e) {
      // ignore
    }
  }
  try {
    const mod = require("readingScorer");
    if (mod) {
      console.log("ℹ️ Loaded readingScorer from module readingScorer");
      return mod;
    }
  } catch (e) {}
  return null;
}

// POST: Submit reading test answers (deprecated - prefer /api/reading-tests/:id/submit)
router.post("/", async (req, res) => {
  try {
    const { testId, passages } = req.body;

    if (!testId || !passages) {
      return res.status(400).json({ message: "❌ Dữ liệu không hợp lệ" });
    }

    const submission = await ReadingSubmission.create({
      testId,
      answers: { passages },
      total: passages.reduce(
        (acc, p) => acc + ((p.questions && p.questions.length) || 0),
        0
      ),
      correct: 0,
      band: 0,
      scorePercentage: 0,
      userName: req.body.studentName || "Unknown",
    });

    res
      .status(201)
      .json({ message: "✅ Nộp bài thành công!", submissionId: submission.id });
  } catch (error) {
    console.error("Error submitting reading test (legacy):", error);
    res
      .status(500)
      .json({ message: "❌ Lỗi khi nộp bài", error: error.message });
  }
});

// GET: Get submission result by ID (from DB)
router.get("/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await ReadingSubmission.findByPk(submissionId);

    if (!submission)
      return res.status(404).json({ message: "❌ Không tìm thấy bài nộp" });

    res.json(submission);
  } catch (error) {
    console.error("Error fetching submission:", error);
    res
      .status(500)
      .json({ message: "❌ Lỗi khi lấy kết quả", error: error.message });
  }
});

// GET: Get all submissions for a test
router.get("/test/:testId", async (req, res) => {
  try {
    const { testId } = req.params;
    const testSubmissions = await ReadingSubmission.findAll({
      where: { testId },
      order: [["createdAt", "DESC"]],
    });

    res.json(testSubmissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      message: "❌ Lỗi khi lấy danh sách bài nộp",
      error: error.message,
    });
  }
});

// GET: Get all submissions across tests (admin listing) — include test metadata (classCode, teacherName)
router.get("/", async (req, res) => {
  try {
    const subs = await ReadingSubmission.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Attach test metadata to each submission for admin convenience
    const ReadingTest = require("../models/ReadingTest");
    const testIds = Array.from(
      new Set(subs.map((s) => s.testId).filter(Boolean))
    );
    const tests = testIds.length
      ? await ReadingTest.findAll({ where: { id: testIds } })
      : [];
    const testMap = {};
    tests.forEach((t) => {
      testMap[String(t.id)] = t;
    });

    const out = subs.map((s) => {
      const obj = s.toJSON();
      const t = testMap[String(s.testId)];
      obj.classCode = t ? t.classCode || "" : "";
      obj.teacherName = t ? t.teacherName || "" : "";
      return obj;
    });

    res.json(out);
  } catch (error) {
    console.error("Error fetching all submissions:", error);
    res.status(500).json({
      message: "❌ Lỗi khi lấy danh sách bài nộp",
      error: error.message,
    });
  }
});

// GET: Compare a submission against the test and return per-question details (useful for debugging mismatches)
router.get("/:submissionId/compare", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await ReadingSubmission.findByPk(submissionId);
    // Removed noisy debug log to avoid spamming the backend terminal
    if (!submission)
      return res.status(404).json({ message: "❌ Không tìm thấy bài nộp" });

    const ReadingTest = require("../models/ReadingTest");
    const test = await ReadingTest.findByPk(submission.testId);
    if (!test) return res.status(404).json({ message: "❌ Không tìm thấy đề" });

    const data = test.toJSON();
    const passages =
      typeof data.passages === "string"
        ? JSON.parse(data.passages)
        : data.passages || [];

    const scorerModule = loadReadingScorer();
    let results;
    if (scorerModule && scorerModule.getDetailedScoring) {
      results = scorerModule.getDetailedScoring(
        { passages },
        submission.answers || {}
      );
    } else {
      console.error(
        "❌ readingScorer missing — returning placeholder details (no scoring available)"
      );
      const total = countQuestions(passages || []);
      results = Array.from({ length: total }, (_, i) => ({
        questionNumber: i + 1,
        questionType: "unknown",
        questionText: "",
        headings: [],
        passageSnippet: "",
        expected: "",
        expectedLabel: "",
        student: "",
        studentLabel: "",
        isCorrect: false,
        paragraphId: null,
      }));
    }

    // Prevent caching so browsers won't reply 304 with empty body
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({ submissionId: submission.id, details: results });
  } catch (error) {
    console.error("Error comparing submission:", error);
    res
      .status(500)
      .json({ message: "❌ Lỗi khi so sánh bài nộp", error: error.message });
  }
});

// GET: Human-friendly HTML view for compare (open in browser for quick inspection)
router.get("/:submissionId/compare-html", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await ReadingSubmission.findByPk(submissionId);
    if (!submission)
      return res.status(404).send("<h3>❌ Không tìm thấy bài nộp</h3>");

    const ReadingTest = require("../models/ReadingTest");
    const test = await ReadingTest.findByPk(submission.testId);
    if (!test) return res.status(404).send("<h3>❌ Không tìm thấy đề</h3>");

    const data = test.toJSON();
    const passages =
      typeof data.passages === "string"
        ? JSON.parse(data.passages)
        : data.passages || [];

    const scorerModule = loadReadingScorer();
    let results;
    if (scorerModule && scorerModule.getDetailedScoring) {
      results = scorerModule.getDetailedScoring(
        { passages },
        submission.answers || {}
      );
    } else {
      console.error(
        "❌ readingScorer missing — generating placeholder details (no scoring available) for HTML view"
      );
      const total = countQuestions(passages || []);
      results = Array.from({ length: total }, (_, i) => ({
        questionNumber: i + 1,
        questionType: "unknown",
        questionText: "",
        headings: [],
        passageSnippet: "",
        expected: "",
        expectedLabel: "",
        student: "",
        studentLabel: "",
        isCorrect: false,
        paragraphId: null,
      }));
    }

    // Prevent caching so browser won't reply 304
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Build a simple HTML table via helper so we can test it
    const buildCompareHtml = (submission, results) => {
      let html = `<!doctype html><html><head><meta charset="utf-8"><title>Compare Submission ${
        submission.id
      }</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:18px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#0e276f;color:#fff}tr:nth-child(even){background:#f9f9f9}.ok{background:#e6f4ea;color:#155724}.bad{background:#ffe6e6;color:#721c24}.small{font-size:0.9em;color:#333}</style></head><body>
      <h2>So sánh Submission #${submission.id} (Test ${submission.testId})</h2>
      <p><strong>Học sinh:</strong> ${
        submission.userName || "N/A"
      } &nbsp; <strong>Đúng :</strong> ${submission.correct} / ${
        submission.total
      } &nbsp; <strong>Score:</strong> ${
        submission.scorePercentage || submission.scorePercentage === 0
          ? submission.scorePercentage + "%"
          : "N/A"
      }</p>
      <table><thead><tr><th>Q</th><th>Question Context</th><th>Paragraph</th><th>Expected (raw)</th><th>Expected Label</th><th>Student (raw)</th><th>Student Label</th><th>Result</th></tr></thead><tbody>`;

      for (const r of results) {
        const isOk = r.isCorrect;
        const qText = r.questionText
          ? `<div><strong>${r.questionText}</strong></div>`
          : "";
        const headings =
          r.headings && r.headings.length
            ? `<div class="small">Headings: ${r.headings
                .map((h) => (h.label || h.id || h.text || h).toString())
                .join(" | ")}</div>`
            : "";
        const snippet = r.passageSnippet
          ? `<div class="small">${r.passageSnippet}</div>`
          : "";
        const studentRaw =
          r.student && typeof r.student === "object"
            ? JSON.stringify(r.student)
            : r.student || "";
        const expectedRaw =
          r.expected && typeof r.expected === "object"
            ? JSON.stringify(r.expected)
            : r.expected || "";
        html += `<tr class="${isOk ? "ok" : "bad"}"><td>${
          r.questionNumber
        }</td><td>${qText}${headings}${snippet}</td><td>${
          r.paragraphId || "-"
        }</td><td>${expectedRaw}</td><td>${(
          r.expectedLabel || ""
        ).toString()}</td><td>${studentRaw}</td><td>${(
          r.studentLabel || ""
        ).toString()}</td><td>${isOk ? "✓" : "✕"}</td></tr>`;
      }

      html += `</tbody></table><p style="margin-top:18px"><a href="/admin">Back to Admin</a></p></body></html>`;
      return html;
    };

    // attach helper to router so tests can use it
    if (!router.buildCompareHtml) router.buildCompareHtml = buildCompareHtml;

    const html = router.buildCompareHtml(submission, results);

    html += `</tbody></table><p style="margin-top:18px"><a href="/admin">Back to Admin</a></p></body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Error generating compare HTML:", error);
    res.status(500).send("<h3>❌ Lỗi khi tạo trang so sánh</h3>");
  }
});

module.exports = router;
