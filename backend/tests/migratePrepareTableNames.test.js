jest.mock("../db", () => ({
  getQueryInterface: jest.fn(),
  query: jest.fn(),
}));

const sequelize = require("../db");
const migratePrepareTableNames = require("../scripts/migrate-prepare-table-names");

describe("Prepare table-name migration", () => {
  const queryInterface = { showAllTables: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.getQueryInterface.mockReturnValue(queryInterface);
    queryInterface.showAllTables.mockResolvedValue([
      "exam_levels",
      "exam_level_tests",
      "exam_level_submissions",
    ]);
  });

  test("renames all legacy tables together without copying or dropping their data", async () => {
    await expect(migratePrepareTableNames()).resolves.toEqual([
      "prepare_levels",
      "prepare_tests",
      "prepare_submissions",
    ]);

    expect(sequelize.query).toHaveBeenCalledWith(
      "RENAME TABLE `exam_levels` TO `prepare_levels`, `exam_level_tests` TO `prepare_tests`, `exam_level_submissions` TO `prepare_submissions`"
    );
  });

  test("reports planned names without changing tables in dry-run mode", async () => {
    await expect(migratePrepareTableNames({ dryRun: true })).resolves.toEqual([
      "prepare_levels",
      "prepare_tests",
      "prepare_submissions",
    ]);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test("does not rename tables again after migration", async () => {
    queryInterface.showAllTables.mockResolvedValue([
      "prepare_levels",
      "prepare_tests",
      "prepare_submissions",
    ]);

    await expect(migratePrepareTableNames()).resolves.toEqual([]);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test("stops rather than overwrite when both source and destination exist", async () => {
    queryInterface.showAllTables.mockResolvedValue([
      "exam_levels",
      "prepare_levels",
    ]);

    await expect(migratePrepareTableNames()).rejects.toThrow(
      "both old and new tables exist: exam_levels and prepare_levels"
    );
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
