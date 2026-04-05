const express = require('express');
const router = express.Router();
const { Submission, WritingTest, User } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const { requireAuth, requireRole } = require('../middlewares/auth');
const {
  DEFAULT_EXTENSION_MINUTES,
  buildTimingPayload,
  extendDeadline,
  normalizeExtensionMinutes,
} = require('../utils/testTiming');

async function resolveSubmissionUser(userPayload) {
  const rawUserId = userPayload?.id;
  const userId = Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;

  let userName = userPayload?.name || userPayload?.username || userPayload?.email || 'N/A';
  let userPhone = userPayload?.phone || 'N/A';

  if (userId) {
    const dbUser = await User.findByPk(userId, { attributes: ['name', 'phone'] });
    if (dbUser) {
      userName = dbUser.name || userName;
      userPhone = dbUser.phone || userPhone;
    }
  }

  return { userId, userName, userPhone };
}

function buildMailTransporter() {
  if (process.env.SMTP_HOST) {
    const smtpOpts = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (process.env.SMTP_SECURE === 'true') || (process.env.SMTP_PORT == 465),
    };
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      smtpOpts.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
    }
    if (process.env.SMTP_TLS_REJECT === 'false') {
      smtpOpts.tls = { rejectUnauthorized: false };
    }
    return nodemailer.createTransport(smtpOpts);
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  return nodemailer.createTransport({ sendmail: true });
}

// Save/update writing draft (cross-device resume)
router.post('/draft/autosave', async (req, res) => {
  try {
    const { task1 = '', task2 = '', timeLeft = null, endAt = null, started = false, user, testId } = req.body || {};
    const numericTestId = Number(testId);
    if (!Number.isFinite(numericTestId) || numericTestId <= 0) {
      return res.status(400).json({ message: 'Invalid testId.' });
    }

    const { userId, userName, userPhone } = await resolveSubmissionUser(user);
    if (!userId) {
      return res.status(400).json({ message: 'Missing user id.' });
    }

    const now = new Date();
    const parsedEndAt = Number.isFinite(Number(endAt)) ? new Date(Number(endAt)) : null;

    const existingDraft = await Submission.findOne({
      where: { testId: numericTestId, userId, isDraft: true },
      order: [['updatedAt', 'DESC']],
    });

    if (existingDraft) {
      existingDraft.task1 = task1;
      existingDraft.task2 = task2;
      existingDraft.timeLeft = Number.isFinite(Number(timeLeft)) ? Number(timeLeft) : existingDraft.timeLeft;
      existingDraft.userName = userName;
      existingDraft.userPhone = userPhone;
      existingDraft.draftSavedAt = now;
      existingDraft.draftEndAt = parsedEndAt;
      existingDraft.draftStarted = Boolean(started);
      await existingDraft.save();
      return res.json({
        message: 'Draft saved.',
        draftId: existingDraft.id,
        savedAt: existingDraft.draftSavedAt,
        draftEndAt: existingDraft.draftEndAt,
        timeLeft: existingDraft.timeLeft,
        timing: buildTimingPayload(existingDraft.draftEndAt),
      });
    }

    const created = await Submission.create({
      testId: numericTestId,
      userId,
      userName,
      userPhone,
      task1,
      task2,
      timeLeft: Number.isFinite(Number(timeLeft)) ? Number(timeLeft) : null,
      feedbackSeen: false,
      isDraft: true,
      draftSavedAt: now,
      draftEndAt: parsedEndAt,
      draftStarted: Boolean(started),
      submittedAt: null,
    });

    return res.status(201).json({
      message: 'Draft created.',
      draftId: created.id,
      savedAt: created.draftSavedAt,
      draftEndAt: created.draftEndAt,
      timeLeft: created.timeLeft,
      timing: buildTimingPayload(created.draftEndAt),
    });
  } catch (err) {
    console.error('Draft autosave error:', err);
    return res.status(500).json({ message: 'Failed to autosave draft.' });
  }
});

// Get latest active draft by user (optionally scoped to testId)
router.get('/draft/active', async (req, res) => {
  try {
    const numericUserId = Number(req.query.userId);
    const numericTestId = Number(req.query.testId);

    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({ message: 'Invalid userId.' });
    }

    const where = { userId: numericUserId, isDraft: true };
    if (Number.isFinite(numericTestId) && numericTestId > 0) {
      where.testId = numericTestId;
    }

    const submission = await Submission.findOne({
      where,
      order: [['draftSavedAt', 'DESC'], ['updatedAt', 'DESC']],
    });

    return res.json({
      submission: submission ? submission.toJSON() : null,
      timing: submission ? buildTimingPayload(submission.draftEndAt) : buildTimingPayload(null),
    });
  } catch (err) {
    console.error('Get draft error:', err);
    return res.status(500).json({ message: 'Failed to get draft.' });
  }
});

router.post('/draft/:draftId/extend-time', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { draftId } = req.params;
    const draft = await Submission.findByPk(draftId);
    if (!draft || !draft.isDraft) {
      return res.status(404).json({ message: 'Draft not found.' });
    }

    const extensionMinutes = normalizeExtensionMinutes(req.body?.extraMinutes, DEFAULT_EXTENSION_MINUTES);
    const { expiresAtMs } = extendDeadline(draft.draftEndAt, extensionMinutes);
    const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));

    draft.draftEndAt = new Date(expiresAtMs);
    draft.timeLeft = remainingSeconds;
    draft.draftSavedAt = new Date();
    await draft.save();

    return res.json({
      message: `Draft extended by ${extensionMinutes} minute(s).`,
      draftId: draft.id,
      extensionMinutes,
      draftEndAt: draft.draftEndAt,
      timeLeft: draft.timeLeft,
      timing: buildTimingPayload(draft.draftEndAt),
    });
  } catch (err) {
    console.error('Draft extend error:', err);
    return res.status(500).json({ message: 'Failed to extend draft.' });
  }
});

// Clear draft(s) after submit or manual reset
router.post('/draft/clear', async (req, res) => {
  try {
    const { user, testId } = req.body || {};
    const numericUserId = Number(user?.id);
    const numericTestId = Number(testId);

    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const where = { userId: numericUserId, isDraft: true };
    if (Number.isFinite(numericTestId) && numericTestId > 0) {
      where.testId = numericTestId;
    }

    const removed = await Submission.destroy({ where });
    return res.json({ message: 'Draft cleared.', removed });
  } catch (err) {
    console.error('Clear draft error:', err);
    return res.status(500).json({ message: 'Failed to clear draft.' });
  }
});

// Student submit writing answer
router.post('/submit', async (req, res) => {
  try {
    const { task1, task2, timeLeft, user, testId } = req.body || {};
    const numericTestId = Number(testId);

    if (!Number.isFinite(numericTestId) || numericTestId <= 0) {
      return res.status(400).json({ message: 'Missing or invalid test id.' });
    }

    const { userId, userName, userPhone } = await resolveSubmissionUser(user);
    const submittedAt = new Date();

    let submission = null;

    if (userId) {
      const existingDraft = await Submission.findOne({
        where: { testId: numericTestId, userId, isDraft: true },
        order: [['updatedAt', 'DESC']],
      });

      if (existingDraft) {
        existingDraft.task1 = task1;
        existingDraft.task2 = task2;
        existingDraft.timeLeft = Number.isFinite(Number(timeLeft)) ? Number(timeLeft) : null;
        existingDraft.userName = userName;
        existingDraft.userPhone = userPhone;
        existingDraft.feedbackSeen = false;
        existingDraft.isDraft = false;
        existingDraft.draftSavedAt = null;
        existingDraft.draftEndAt = null;
        existingDraft.draftStarted = false;
        existingDraft.submittedAt = submittedAt;
        await existingDraft.save();
        submission = existingDraft;
      }
    }

    if (!submission) {
      submission = await Submission.create({
        task1,
        task2,
        timeLeft: Number.isFinite(Number(timeLeft)) ? Number(timeLeft) : null,
        userName,
        userPhone,
        testId: numericTestId,
        userId,
        feedbackSeen: false,
        isDraft: false,
        draftSavedAt: null,
        draftEndAt: null,
        draftStarted: false,
        submittedAt,
      });
    }

    const writingTest = await WritingTest.findByPk(numericTestId);
    const index = writingTest?.index || 'N/A';
    const classCode = writingTest?.classCode || 'N/A';
    const teacherName = writingTest?.teacherName || 'N/A';
    const testType = writingTest?.testType || 'writing';
    const label = testType === 'pet-writing' ? 'PET Writing' : 'Writing';

    let emailWarning = null;
    try {
      const transporter = buildMailTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`,
        to: process.env.EMAIL_TO,
        subject: `New writing from ${userName || 'N/A'} - ${label} ${index} - ${classCode} - ${teacherName}`,
        html: `
          <p><strong>Student:</strong> ${userName || 'N/A'}</p>
          <p><strong>Phone:</strong> ${userPhone || 'N/A'}</p>
          <p><strong>Test:</strong> ${label} ${index}</p>
          <p><strong>Class:</strong> ${classCode}</p>
          <p><strong>Teacher:</strong> ${teacherName}</p>
          <h2>Task 1</h2>
          <p>${(task1 || '').replace(/\n/g, '<br>')}</p>
          <h2>Task 2</h2>
          <p>${(task2 || '').replace(/\n/g, '<br>')}</p>
          <p><b>Time left:</b> ${Math.floor((Number(timeLeft) || 0) / 60)}m ${(Number(timeLeft) || 0) % 60}s</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error('Email send error:', emailErr && (emailErr.stack || emailErr));
      emailWarning = emailErr && (emailErr.message || String(emailErr));
    }

    return res.json({
      message: 'Submission saved successfully.',
      submissionId: submission.id,
      warning: emailWarning,
    });
  } catch (err) {
    console.error('Submit writing error:', err);
    return res.status(500).json({ message: 'Server error while saving submission.' });
  }
});

// Get writing submissions (student feedback page)
router.get('/list', async (req, res) => {
  try {
    const includeDrafts = ['1', 'true', 'yes'].includes(String(req.query.includeDrafts || '').toLowerCase());
    const where = includeDrafts
      ? {}
      : { [Op.or]: [{ isDraft: false }, { isDraft: null }] };
    if (req.query.phone) {
      where.userPhone = req.query.phone;
    }

    let submissions;
    try {
      submissions = await Submission.findAll({
        where,
        include: [
          { model: WritingTest, attributes: ['index', 'classCode', 'teacherName', 'task1Image', 'task1', 'task2', 'testType'] },
          { model: User, attributes: ['name', 'phone'] },
        ],
        order: [['createdAt', 'DESC']],
      });
    } catch (includeErr) {
      console.error('GET /writing/list include failed; fallback query:', includeErr);
      submissions = await Submission.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });
    }

    const result = Array.isArray(submissions)
      ? submissions.map((s) => ({
          ...s.toJSON(),
          user: s.User || null,
          WritingTest: s.WritingTest || null,
          User: s.User || null,
        }))
      : [];

    return res.json(result);
  } catch (err) {
    console.error('Get writing list error:', err);
    return res.status(500).json({ message: 'Server error while fetching submissions.' });
  }
});

// Teacher saves feedback
router.post('/comment', async (req, res) => {
  try {
    const { submissionId, feedback, teacherName, bandTask1, bandTask2, bandOverall } = req.body;
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    submission.feedback = feedback;
    submission.feedbackBy = teacherName;
    submission.feedbackAt = new Date();
    submission.feedbackSeen = false;
    if (bandTask1 !== undefined) submission.bandTask1 = bandTask1 !== '' ? Number(bandTask1) : null;
    if (bandTask2 !== undefined) submission.bandTask2 = bandTask2 !== '' ? Number(bandTask2) : null;
    if (bandOverall !== undefined) submission.bandOverall = bandOverall !== '' ? Number(bandOverall) : null;
    await submission.save();

    return res.json({ message: 'Feedback saved.' });
  } catch (err) {
    console.error('Save feedback error:', err);
    return res.status(500).json({ message: 'Server error while saving feedback.' });
  }
});

// Student marks feedback as seen
router.post('/mark-feedback-seen', async (req, res) => {
  try {
    const { phone, ids } = req.body;

    const where = {
      [Op.or]: [{ isDraft: false }, { isDraft: null }],
    };
    if (phone) where.userPhone = phone;
    if (ids?.length > 0) where.id = { [Op.in]: ids };

    const updated = await Submission.update(
      { feedbackSeen: true },
      { where },
    );

    return res.json({ message: 'Marked as seen.', updated });
  } catch (err) {
    console.error('Mark feedback seen error:', err);
    return res.status(500).json({ message: 'Server error while updating feedback.' });
  }
});

// Debug route: verify SMTP/sendmail configuration
router.get('/email-test', async (req, res) => {
  try {
    const transporter = buildMailTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`,
      to: process.env.EMAIL_TO,
      subject: 'Email test from writing API',
      text: 'This is a mail transport test.',
    });

    return res.json({ ok: true, info });
  } catch (err) {
    console.error('Email test error:', err && (err.stack || err));
    return res.status(500).json({ ok: false, error: err && (err.message || err) });
  }
});

module.exports = router;
