const express = require("express");
const router = express.Router();
const ReadingTest = require("../models/ReadingTest");

// Build simple email summary HTML + text fallback for reading submissions (teacher requested minimal fields)
const buildReadingSummaryEmail = (sub, result, req, meta = {}) => {
  // Prefer explicit FRONTEND_URL (useful for deployments where frontend runs on separate host/port)
  const frontendHost =
    process.env.FRONTEND_URL &&
    String(process.env.FRONTEND_URL).trim().replace(/\/+$/, "");
  const host = frontendHost || `${req.protocol}://${req.get("host")}`;
  const detailsUrl = `${host}/reading-results/${sub.id}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.4">
      <p>👤 <strong>Học sinh:</strong> ${sub.userName || "N/A"}</p>
      <p>📞 <strong>Số điện thoại:</strong> ${meta.phone || "N/A"}</p>
      <p>📝 <strong>Mã đề:</strong> ${meta.testId || sub.testId || ""}</p>
      <p>🏫 <strong>Mã lớp:</strong> ${meta.classCode || ""}</p>
      <p>👨‍🏫 <strong>Giáo viên ra đề:</strong> ${meta.teacherName || ""}</p>
      <p>✅ <strong>Correct / Total:</strong> ${result.correct} / ${
    result.total
  }</p>
      <p>🔢 <strong>Band (IDP):</strong> ${result.band}</p>
      <p><strong>Submission ID:</strong> <b>${sub.id}</b></p>
      <p style="margin-top:8px"><a href="${detailsUrl}" style="display:inline-block;padding:8px 12px;background:#0e276f;color:#fff;border-radius:6px;text-decoration:none;">Xem chi tiết (UI)</a></p>
    </div>
  `;
  const text = `Học sinh: ${sub.userName || "N/A"}\nSố điện thoại: ${
    meta.phone || "N/A"
  }\nMã đề: ${meta.testId || sub.testId || ""}\nMã lớp: ${
    meta.classCode || ""
  }\nGiáo viên ra đề: ${meta.teacherName || ""}\nCorrect / Total: ${
    result.correct
  }/${result.total}\nBand (IDP): ${result.band}\nSubmission ID: ${
    sub.id
  }\nView: ${detailsUrl}`;
  return { html, text };
};

// Emergency helper: count total questions in test data (used by fallback scorer)
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

// Robust loader for readingScorer: tries multiple candidate locations (helps when deploy copies only backend/ folder)
const path = require("path");
function loadReadingScorer() {
  const candidates = [
    path.join(__dirname, "..", "utils", "readingScorer"), // ../utils relative to backend/routes
    path.join(__dirname, "..", "..", "utils", "readingScorer"), // project-root utils when server cwd is backend/
    path.join(process.cwd(), "utils", "readingScorer"), // process cwd based
    path.join(__dirname, "..", "backend", "utils", "readingScorer"), // backend/utils if utils placed inside backend
    path.join(__dirname, "..", "..", "backend", "utils", "readingScorer"),
    "../utils/readingScorer",
  ];

  for (const c of candidates) {
    try {
      const mod = require(c);
      if (mod && mod.scoreReadingTest) {
        console.log(`ℹ️ Loaded readingScorer from ${c}`);
        return mod;
      }
    } catch (e) {
      // ignore and try next
    }
  }

  // as last resort, try require by module name (node_modules)
  try {
    const mod = require("readingScorer");
    if (mod && mod.scoreReadingTest) {
      console.log("ℹ️ Loaded readingScorer from module readingScorer");
      return mod;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

// Get all reading tests
router.get("/", async (req, res) => {
  try {
    const tests = await ReadingTest.findAll({ order: [["createdAt", "DESC"]] });
    // Parse passages JSON if it's a string
    const parsed = tests.map((test) => {
      const data = test.toJSON();
      if (typeof data.passages === "string") {
        data.passages = JSON.parse(data.passages);
      }
      return data;
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Email preview for a submission (renders the compact summary email HTML) — helpful for testing
router.get("/:id/email-preview", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `ℹ️ Email preview requested for submission=${id} from host=${req.get(
        "host"
      )}`
    );
    const ReadingSubmission = require("../models/ReadingSubmission");
    const submission = await ReadingSubmission.findByPk(id);
    if (!submission)
      return res.status(404).send("<h3>❌ Không tìm thấy bài nộp</h3>");

    const test = await ReadingTest.findByPk(submission.testId);
    if (!test) return res.status(404).send("<h3>❌ Không tìm thấy đề</h3>");

    const data = test.toJSON();
    const passages =
      typeof data.passages === "string"
        ? JSON.parse(data.passages)
        : data.passages || [];
    const scorerModule = loadReadingScorer();
    let scoreReadingTest;
    if (scorerModule && scorerModule.scoreReadingTest) {
      scoreReadingTest = scorerModule.scoreReadingTest;
    } else {
      console.error(
        "❌ readingScorer not found for email preview; using fallback"
      );
      scoreReadingTest = ({ passages } = {}, _answers = {}) => {
        const total = countQuestions(passages || []);
        return { total, correct: 0, band: 3.5, scorePercentage: 0 };
      };
    }
    const result = scoreReadingTest({ passages }, submission.answers || {});

    // Try to resolve phone from User if linked
    let phone = "N/A";
    if (submission.userId) {
      try {
        const User = require("../models/User");
        const u = await User.findByPk(submission.userId);
        phone = u ? u.phone || "N/A" : "N/A";
      } catch (e) {
        // ignore and fallback to N/A
        phone = "N/A";
      }
    }

    const meta = {
      testId: test.id,
      classCode: test.classCode || "",
      teacherName: test.teacherName || "",
      phone,
    };

    // Debug: show which frontend URL will be used for the UI link
    const frontendHost =
      process.env.FRONTEND_URL &&
      String(process.env.FRONTEND_URL).trim().replace(/\/+$/, "");
    const host = frontendHost || `${req.protocol}://${req.get("host")}`;
    const detailsUrl = `${host}/reading-results/${submission.id}`;
    console.log(
      `ℹ️ Email preview link -> FRONTEND_URL='${
        frontendHost || ""
      }' | resolved detailsUrl='${detailsUrl}'`
    );

    const { html } = buildReadingSummaryEmail(submission, result, req, meta);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Error rendering email preview:", err);
    res.status(500).send("<h3>❌ Lỗi khi tạo preview email</h3>");
  }
});

// Get a single reading test by id
router.get("/:id", async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: "Cannot find test" });
    }
    const data = test.toJSON();
    if (typeof data.passages === "string") {
      data.passages = JSON.parse(data.passages);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new reading test
router.post("/", async (req, res) => {
  const { title, classCode, teacherName, passages } = req.body;

  try {
    const newTest = await ReadingTest.create({
      title,
      classCode,
      teacherName,
      passages,
    });
    res
      .status(201)
      .json({ message: "✅ Đã tạo đề Reading thành công!", test: newTest });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a reading test
router.put("/:id", async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: "Cannot find test" });
    }
    await test.update(req.body);
    const data = test.toJSON();
    if (typeof data.passages === "string") {
      data.passages = JSON.parse(data.passages);
    }
    res.json({ message: "✅ Đã cập nhật đề Reading thành công!", test: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Submit answers for a reading test and compute score
router.post("/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body && req.body.answers ? req.body.answers : {};

    const test = await ReadingTest.findByPk(id);
    if (!test) return res.status(404).json({ message: "Cannot find test" });

    // Normalize test passages
    const data = test.toJSON();
    const passages =
      typeof data.passages === "string"
        ? JSON.parse(data.passages)
        : data.passages || [];

    // Use scorer helper (robust loader + fallback)
    const scorerModule = loadReadingScorer();
    let scoreReadingTest;
    if (scorerModule && scorerModule.scoreReadingTest) {
      scoreReadingTest = scorerModule.scoreReadingTest;
    } else {
      console.error(
        "❌ readingScorer module missing — using fallback scorer to avoid 500"
      );
      scoreReadingTest = ({ passages } = {}, _answers = {}) => {
        const total = countQuestions(passages || []);
        return { total, correct: 0, band: 3.5, scorePercentage: 0 };
      };
    }

    const result = scoreReadingTest({ passages }, answers || {});

    // Store submission to DB
    try {
      const ReadingSubmission = require("../models/ReadingSubmission");
      const sub = await ReadingSubmission.create({
        testId: id,
        userName:
          req.body.studentName ||
          (req.body.user && req.body.user.name) ||
          "Unknown",
        userId: req.body.user && req.body.user.id ? req.body.user.id : null,
        answers: answers || {},
        correct: result.correct,
        total: result.total,
        band: result.band,
        scorePercentage: result.scorePercentage,
      });

      console.log(
        `✅ Saved reading submission id=${sub.id} (test=${id}, user=${sub.userName})`
      );

      // Try sending notification email (non-blocking for response)
      try {
        const nodemailer = require("nodemailer");
        let transporter;
        if (process.env.SMTP_HOST) {
          const smtpOpts = {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 465,
            secure:
              process.env.SMTP_SECURE === "true" ||
              process.env.SMTP_PORT == 465,
          };
          if (process.env.SMTP_USER && process.env.SMTP_PASS)
            smtpOpts.auth = {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            };
          if (process.env.SMTP_TLS_REJECT === "false")
            smtpOpts.tls = { rejectUnauthorized: false };
          transporter = nodemailer.createTransport(smtpOpts);
          console.log("ℹ️ Using SMTP transport for reading submission email");
        } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
          console.log("ℹ️ Using Gmail transport for reading submission email");
        } else {
          transporter = nodemailer.createTransport({ sendmail: true });
          console.log(
            "ℹ️ Using sendmail transport (fallback) for reading submission email"
          );
        }

        const meta = {
          testId: id,
          classCode: test.classCode || "",
          teacherName: test.teacherName || "",
          phone: (req.body.user && req.body.user.phone) || "N/A",
        };
        const { html: emailHtml, text: emailText } = buildReadingSummaryEmail(
          sub,
          result,
          req,
          meta
        );

        const mailOptions = {
          from:
            process.env.EMAIL_FROM ||
            process.env.EMAIL_USER ||
            `no-reply@${req.hostname}`,
          to: process.env.EMAIL_TO,
          subject: `📨 Reading submission from ${sub.userName} — test ${id}`,
          html: emailHtml,
          text: emailText,
        };

        // Send email asynchronously (do not block response)
        transporter
          .sendMail(mailOptions)
          .then((info) =>
            console.log(
              "✅ Reading submission email sent",
              info && info.messageId ? info.messageId : "no-message-id"
            )
          )
          .catch((emailErr) =>
            console.error(
              "❌ Error sending reading submission email:",
              emailErr && (emailErr.stack || emailErr)
            )
          );
      } catch (emailErr) {
        console.error(
          "❌ Error preparing reading submission email:",
          emailErr && (emailErr.stack || emailErr)
        );
      }

      return res.json({ submissionId: sub.id, ...result });
    } catch (e) {
      console.error("Error saving submission:", e);
      // Still return result if DB save fails
      return res.json(result);
    }
  } catch (err) {
    console.error("Error scoring reading test:", err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a reading test
router.delete("/:id", async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: "Cannot find test" });
    }
    await test.destroy();
    res.json({ message: "Deleted Test" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
