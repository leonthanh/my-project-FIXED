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
  safeParseParts: jest.fn((parts) => typeof parts === "string" ? JSON.parse(parts) : parts),
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

  test("creates a combined Reading and Writing test using the Gateway template", async () => {
    ExamLevel.findOne.mockResolvedValue({
      ...level,
      skills: ["reading-writing", "listening"],
      skillConfig: {
        "reading-writing": {
          templateId: "gateway-reading-writing",
          durationMinutes: 60,
        },
        listening: level.skillConfig.listening,
      },
    });
    const createdTest = { id: 20, title: "Prepare Reading and Writing 1" };
    ExamLevelTest.create.mockResolvedValue(createdTest);

    const result = await service.createTest({
      code: "prepare",
      skill: "reading-writing",
      user: { id: 8, role: "teacher" },
      body: {
        title: "Prepare Reading and Writing 1",
        classCode: "P1",
        testType: "gateway-reading-writing",
        parts: [{ sections: [] }],
      },
    });

    expect(result).toBe(createdTest);
    expect(ExamLevelTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: "reading-writing",
        templateId: "gateway-reading-writing",
        testType: "gateway-reading-writing",
        duration: 60,
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

  test("rejects an invalid Prepare format rather than publishing it", async () => {
      ExamLevel.findOne.mockResolvedValue({
        ...level,
        skills: ["reading-writing"],
        skillConfig: { "reading-writing": { templateId: "gateway-reading-writing", durationMinutes: 60 } },
      });
      await expect(service.createTest({
        code: "prepare",
        skill: "reading-writing",
        body: {
          title: "Invalid",
          classCode: "P1",
          testType: "gateway-reading-writing",
          parts: [{ examFormat: "prepare-reading-writing-v1", sections: [] }],
        },
      })).rejects.toMatchObject({ statusCode: 400, message: "Invalid Prepare Reading & Writing test structure." });
      expect(ExamLevelTest.create).not.toHaveBeenCalled();
  });

  test("cannot remove Prepare format from an existing Prepare test", async () => {
      ExamLevel.findOne.mockResolvedValue({
        ...level,
        skills: ["reading-writing"],
        skillConfig: { "reading-writing": { templateId: "gateway-reading-writing", durationMinutes: 60 } },
      });
      ExamLevelTest.findOne.mockResolvedValue({ parts: [{ examFormat: "prepare-reading-writing-v1", sections: [] }] });
      await expect(service.updateTest({
        code: "prepare",
        skill: "reading-writing",
        id: 20,
        body: { parts: [{ sections: [] }] },
      })).rejects.toMatchObject({ statusCode: 400, message: "Invalid Prepare Reading & Writing test structure." });
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
