jest.mock("../models", () => ({
  ExamLevel: { findOne: jest.fn() },
  ExamLevelSubmission: { findOne: jest.fn(), create: jest.fn() },
  ExamLevelTest: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));
jest.mock("../utils/clozParser", () => ({
  processTestParts: jest.fn((parts) => parts),
}));
jest.mock("../utils/studentResultVisibility", () => ({
  normalizeStudentResultVisibility: jest.fn((visibility) => visibility || "score"),
}));
jest.mock("../modules/cambridge/shared/scoring", () => ({
  scoreTest: jest.fn(),
}));
jest.mock("../modules/cambridge/shared/readingTestUtils", () => ({
  countTotalQuestionsFromParts: jest.fn(() => 3),
}));

const { ExamLevel, ExamLevelTest } = require("../models");
const service = require("../modules/examLevels/service");

const level = {
  id: 4,
  code: "prepare",
  name: "Prepare",
  description: "",
  isActive: true,
  skills: ["reading", "listening"],
  skillConfig: {
    reading: {
      templateId: "exam-reading-v1",
      durationMinutes: 40,
    },
    listening: {
      templateId: "exam-listening-v1",
      durationMinutes: 30,
    },
  },
};

describe("exam level skill test adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ExamLevel.findOne.mockResolvedValue(level);
  });

  test("creates a test under the configured level, skill template, and duration", async () => {
    const createdTest = { id: 19, title: "Prepare Reading 1" };
    ExamLevelTest.create.mockResolvedValue(createdTest);

    const result = await service.createTest({
      code: "PREPARE",
      skill: "reading",
      user: { id: 8, role: "teacher" },
      body: {
        title: "Prepare Reading 1",
        classCode: "P1",
        testType: "exam-reading-v1",
        parts: [{ sections: [] }],
        studentResultVisibility: "details",
      },
    });

    expect(result).toBe(createdTest);
    expect(ExamLevelTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        levelId: 4,
        skill: "reading",
        templateId: "exam-reading-v1",
        testType: "exam-reading-v1",
        duration: 40,
        createdByUserId: 8,
      })
    );
  });

  test("rejects skill templates not configured for the selected level", async () => {
    await expect(
      service.createTest({
        code: "prepare",
        skill: "reading",
        user: { id: 8, role: "teacher" },
        body: {
          title: "Wrong template",
          classCode: "P1",
          testType: "ket-reading",
          parts: [{ sections: [] }],
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Test type does not match this level's configured skill template.",
    });
    expect(ExamLevelTest.create).not.toHaveBeenCalled();
  });

  test("does not expose non-published tests to students", async () => {
    ExamLevelTest.findAll.mockResolvedValue([]);

    await service.listTests({
      code: "prepare",
      skill: "reading",
      user: { id: 18, role: "student" },
    });

    expect(ExamLevelTest.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          levelId: 4,
          skill: "reading",
          status: "published",
        },
      })
    );
  });
});
