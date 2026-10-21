jest.mock("../models", () => ({
  CambridgeSubmission: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  GatewaySubmission: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  GeneralSubmission: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  CambridgeReading: { findByPk: jest.fn() },
  CambridgeListening: { findByPk: jest.fn() },
  GatewayReading: { findByPk: jest.fn() },
  GatewayListening: { findByPk: jest.fn() },
  GeneralReading: { findByPk: jest.fn() },
  GeneralListening: { findByPk: jest.fn() },
}));

const { Op } = require("sequelize");
const {
  CambridgeSubmission,
  CambridgeReading,
  GatewaySubmission,
  GatewayReading,
  GeneralReading,
  GeneralListening,
} = require("../models");
const { getCambridgeModelByType } = require("../modules/cambridge/shared/submissionUtils");
const {
  listCambridgeSubmissions,
  listCambridgeSubmissionsByPhone,
} = require("../modules/cambridge/submissions/service");

describe("Cambridge submission platform filters", () => {
  beforeEach(() => {
    CambridgeSubmission.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: [],
    });
    CambridgeSubmission.findAll.mockResolvedValue([]);
    GatewaySubmission.findAll.mockResolvedValue([]);
    CambridgeReading.findByPk.mockReset();
    GatewayReading.findByPk.mockReset();
  });

  test("filters Gateway Reading-Writing submissions without including them in Orange", async () => {
    await listCambridgeSubmissions({
      query: {
        platform: "gateway",
        testType: "reading",
        includeActive: "1",
      },
    });

    const gatewayWhere = CambridgeSubmission.findAndCountAll.mock.calls[0][0].where;
    const gatewayConditions = gatewayWhere[Op.and];
    const readingTypeFilter = gatewayConditions.find((condition) =>
      Array.isArray(condition[Op.or])
    );
    expect(readingTypeFilter[Op.or]).toContainEqual({
      testType: "gateway-reading-writing",
    });
    expect(
      gatewayConditions.some((condition) => condition.logic?.[Op.like] === "gateway-%")
    ).toBe(true);

    await listCambridgeSubmissions({
      query: {
        platform: "general",
        includeActive: "1",
      },
    });

    const generalWhere = CambridgeSubmission.findAndCountAll.mock.calls[1][0].where;
    const generalPlatformFilter = generalWhere[Op.and].find(
      (condition) => condition.logic?.[Op.like] !== undefined
    );
    expect(generalPlatformFilter.logic[Op.like]).toBe("general-%");

    await listCambridgeSubmissions({
      query: {
        platform: "orange",
        includeActive: "1",
      },
    });

    const orangeWhere = CambridgeSubmission.findAndCountAll.mock.calls[2][0].where;
    const orangePlatformFilter = orangeWhere[Op.and].find(
      (condition) => Array.isArray(condition[Op.and])
    );
    expect(
      orangePlatformFilter[Op.and].map((condition) => condition.logic?.[Op.notLike])
    ).toEqual(["general-%", "gateway-%"]);
  });

  test("resolves General tests through the dedicated models", () => {
    expect(getCambridgeModelByType("general-reading-60", "general")).toBe(GeneralReading);
    expect(getCambridgeModelByType("general-listening", "general")).toBe(GeneralListening);
  });

  test("hides scores from the student submission list when the test is confirmation-only", async () => {
    const submission = {
      id: 10,
      testId: 26,
      testType: "gateway-reading-writing",
      score: 43,
      totalQuestions: 51,
      percentage: 84,
      toJSON() {
        return {
          id: this.id,
          testId: this.testId,
          testType: this.testType,
          score: this.score,
          totalQuestions: this.totalQuestions,
          percentage: this.percentage,
        };
      },
    };
    CambridgeSubmission.findAll.mockResolvedValue([submission]);
    CambridgeReading.findByPk.mockResolvedValue({
      studentResultVisibility: "confirmation",
      showResultModal: false,
    });

    const [result] = await listCambridgeSubmissionsByPhone({ phone: "123456789" });

    expect(result).toMatchObject({
      id: 10,
      studentResultVisibility: "confirmation",
    });
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("totalQuestions");
    expect(result).not.toHaveProperty("percentage");
  });

  test("uses detailed scored results for admin list summaries", async () => {
    CambridgeSubmission.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          toJSON() {
            return {
              id: 12,
              score: 8,
              totalQuestions: 10,
              percentage: 80,
              detailedResults: {
                first: { isCorrect: true },
                second: { isCorrect: false },
                third: { isCorrect: true },
                writing: { isCorrect: null },
              },
            };
          },
        },
      ],
    });

    const { submissions } = await listCambridgeSubmissions({
      query: { includeActive: "1" },
    });

    expect(submissions[0]).toMatchObject({
      id: 12,
      score: 2,
      totalQuestions: 3,
      percentage: 67,
    });
    expect(submissions[0]).not.toHaveProperty("detailedResults");
  });

  test("loads Gateway student submissions and visibility from the dedicated models", async () => {
    const submission = {
      id: 11,
      testId: 27,
      testType: "gateway-reading-writing",
      score: 43,
      totalQuestions: 51,
      percentage: 84,
      toJSON() {
        return {
          id: this.id,
          testId: this.testId,
          testType: this.testType,
          score: this.score,
          totalQuestions: this.totalQuestions,
          percentage: this.percentage,
        };
      },
    };
    GatewaySubmission.findAll.mockResolvedValue([submission]);
    GatewayReading.findByPk.mockResolvedValue({
      studentResultVisibility: "confirmation",
      showResultModal: false,
    });
    CambridgeSubmission.findAll.mockClear();

    const [result] = await listCambridgeSubmissionsByPhone({
      phone: "123456789",
      submissionModel: GatewaySubmission,
      platform: "gateway",
    });

    expect(GatewaySubmission.findAll).toHaveBeenCalled();
    expect(GatewayReading.findByPk).toHaveBeenCalledWith(27, {
      attributes: ["studentResultVisibility", "showResultModal"],
    });
    expect(CambridgeSubmission.findAll).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("totalQuestions");
  });
});
