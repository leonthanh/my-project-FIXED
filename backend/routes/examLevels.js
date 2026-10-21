const express = require("express");

const ExamLevel = require("../models/ExamLevel");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { EXAM_SKILL_TEMPLATES } = require("../utils/examSkillTemplates");
const { normalizeExamLevelPayload } = require("../utils/examLevelValidation");

const router = express.Router();
const requireAdmin = [requireAuth, requireRole("admin")];

const handleRouteError = (res, error, message) => {
  if (error.statusCode === 400) {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ message: "That level code is already in use." });
  }
  console.error(message, error);
  return res.status(500).json({ message });
};

router.get("/templates", (_req, res) => {
  res.json(EXAM_SKILL_TEMPLATES);
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const levels = await ExamLevel.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    return res.json(levels);
  } catch (error) {
    return handleRouteError(res, error, "Could not load exam levels.");
  }
});

router.get("/admin", ...requireAdmin, async (_req, res) => {
  try {
    const levels = await ExamLevel.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    return res.json(levels);
  } catch (error) {
    return handleRouteError(res, error, "Could not load exam levels.");
  }
});

router.post("/admin", ...requireAdmin, async (req, res) => {
  try {
    const attributes = normalizeExamLevelPayload(req.body, { isCreate: true });
    const level = await ExamLevel.create({
      ...attributes,
      createdByUserId: req.user?.id || null,
      updatedByUserId: req.user?.id || null,
    });
    return res.status(201).json(level);
  } catch (error) {
    return handleRouteError(res, error, "Could not create exam level.");
  }
});

router.put("/admin/:id", ...requireAdmin, async (req, res) => {
  try {
    const level = await ExamLevel.findByPk(req.params.id);
    if (!level) return res.status(404).json({ message: "Exam level not found." });

    const attributes = normalizeExamLevelPayload(req.body);
    await level.update({
      ...attributes,
      updatedByUserId: req.user?.id || null,
    });
    return res.json(level);
  } catch (error) {
    return handleRouteError(res, error, "Could not update exam level.");
  }
});

module.exports = router;
