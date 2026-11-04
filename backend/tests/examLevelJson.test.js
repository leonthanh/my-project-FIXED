jest.mock("../middlewares/auth", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 1, role: "admin" };
    next();
  },
  optionalAuth: (req, _res, next) => {
    req.user = { id: 1, role: "admin" };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

const express = require("express");
const request = require("supertest");
const { ExamLevel, ExamLevelTest, ExamLevelSubmission } = require("../models");
const examLevelRoutes = require("../routes/examLevels");

const skills = ["listening", "reading-writing"];
const skillConfig = {
  listening: { templateId: "exam-listening-v1", weight: 1.01, durationMinutes: 30 },
  "reading-writing": { templateId: "gateway-reading-writing", weight: 1.01, durationMinutes: 60 },
};

const buildLevel = (values = {}) => ExamLevel.build({
  id: 1,
  code: "prepare",
  name: "Prepare",
  isActive: true,
  skills: JSON.stringify(skills),
  skillConfig: JSON.stringify(skillConfig),
  ...values,
}, { isNewRecord: false, raw: true });

describe("exam level JSON fields", () => {
  afterEach(() => jest.restoreAllMocks());

  test("normalizes database strings and already-decoded values", () => {
    for (const level of [
      buildLevel(),
      buildLevel({ skills, skillConfig }),
    ]) {
      expect(level.skills).toEqual(skills);
      expect(level.skillConfig).toEqual(skillConfig);
      expect(level.toJSON()).toEqual(expect.objectContaining({ skills, skillConfig }));
    }
  });

  test("keeps test and submission JSON usable after database reads", () => {
    const parts = [{ sections: [] }];
    const test = ExamLevelTest.build({ parts: JSON.stringify(parts) }, {
      isNewRecord: false,
      raw: true,
    });
    const submission = ExamLevelSubmission.build({
      answers: '{"1":"A"}',
      detailedResults: '{"1":{"isCorrect":true}}',
      responseFeedback: '{"1":"Good"}',
      progressMeta: '{"page":1}',
    }, { isNewRecord: false, raw: true });

    expect(test.parts).toEqual(parts);
    expect(test.toJSON().parts).toEqual(parts);
    expect(submission.toJSON()).toEqual(expect.objectContaining({
      answers: { 1: "A" },
      detailedResults: { 1: { isCorrect: true } },
      responseFeedback: { 1: "Good" },
      progressMeta: { page: 1 },
    }));
    submission.setDataValue("responseFeedback", null);
    expect(submission.responseFeedback).toBeNull();
  });

  test("reports invalid JSON and incorrect shapes instead of hiding corruption", () => {
    expect(() => buildLevel({ skills: "not JSON" }).skills).toThrow("Invalid JSON in ExamLevel.skills");
    expect(() => buildLevel({ skills: "{}" }).skills).toThrow("expected array");
    expect(() => buildLevel({ skillConfig: "[]" }).skillConfig).toThrow("expected object");
  });

  test("returns usable levels from registry, navigation, hub and skill-test APIs", async () => {
    const level = buildLevel();
    jest.spyOn(ExamLevel, "findAll").mockResolvedValue([level]);
    jest.spyOn(ExamLevel, "findOne").mockResolvedValue(level);
    jest.spyOn(ExamLevelTest, "findAll").mockResolvedValue([]);

    const app = express();
    app.use("/api/exam-levels", examLevelRoutes);

    for (const path of ["/api/exam-levels", "/api/exam-levels/admin"]) {
      const response = await request(app).get(path).expect(200);
      expect(response.body[0]).toEqual(expect.objectContaining({ skills, skillConfig }));
    }
    const hub = await request(app).get("/api/exam-levels/prepare").expect(200);
    expect(hub.body).toEqual(expect.objectContaining({ skills, skillConfig }));
    await request(app).get("/api/exam-levels/prepare/listening/tests").expect(200, []);
    await request(app).get("/api/exam-levels/prepare/reading-writing/tests").expect(200, []);
  });
});
