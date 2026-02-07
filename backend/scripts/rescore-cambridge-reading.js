/*
  Maintenance: rescore Cambridge Reading submissions.

  Usage:
    node scripts/rescore-cambridge-reading.js --dry-run --testType=pet-reading
    node scripts/rescore-cambridge-reading.js --apply --testType=pet-reading

  Optional:
    --limit=100
    --testId=1
    --submissionId=123
    --force (rescore even if totals look valid)
*/

const sequelize = require("../db");
const { Op } = require("sequelize");
const CambridgeSubmission = require("../models/CambridgeSubmission");
const CambridgeReading = require("../models/CambridgeReading");
const cambridgeRouter = require("../routes/cambridgeTests");

const scoreTest = cambridgeRouter.scoreTest;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { apply: false, dryRun: true, limit: null, testId: null, submissionId: null, testType: null, force: false };
  for (const a of args) {
    if (a === "--apply") {
      out.apply = true;
      out.dryRun = false;
    } else if (a === "--dry-run") {
      out.apply = false;
      out.dryRun = true;
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.split("=")[1]);
      if (Number.isFinite(n) && n > 0) out.limit = n;
    } else if (a.startsWith("--testId=")) {
      const n = Number(a.split("=")[1]);
      if (Number.isFinite(n) && n > 0) out.testId = n;
    } else if (a.startsWith("--submissionId=")) {
      const n = Number(a.split("=")[1]);
      if (Number.isFinite(n) && n > 0) out.submissionId = n;
    } else if (a.startsWith("--testType=")) {
      out.testType = a.split("=")[1] || null;
    } else if (a === "--force") {
      out.force = true;
    }
  }
  return out;
};

const parseIfJsonString = (val) => {
  if (val == null) return val;
  if (typeof val === "object") return val;
  try { return JSON.parse(String(val)); } catch (e) { return val; }
};

(async () => {
  const opts = parseArgs();
  console.log("\nCambridge Reading rescore" + (opts.dryRun ? " [DRY RUN]" : " [APPLY]"));
  console.log("Options:", opts);

  if (typeof scoreTest !== "function") {
    throw new Error("scoreTest not available. Ensure routes/cambridgeTests.js exposes router.scoreTest.");
  }

  await sequelize.authenticate();

  let where;
  if (opts.submissionId) {
    where = { id: opts.submissionId };
  } else {
    where = opts.testType
      ? { testType: opts.testType }
      : { testType: { [Op.like]: "%reading%" } };
    if (opts.testId) where.testId = opts.testId;
    if (!opts.force) {
      where = {
        ...where,
        [Op.or]: [{ totalQuestions: 0 }, { totalQuestions: { [Op.is]: null } }],
      };
    }
  }

  const subs = await CambridgeSubmission.findAll({
    where,
    order: [["id", "ASC"]],
    ...(opts.limit ? { limit: opts.limit } : {}),
  });

  console.log(`Found ${subs.length} submission(s) to check.`);

  let updated = 0;
  let skippedNoTest = 0;
  let skippedNoScore = 0;

  for (const s of subs) {
    const test = await CambridgeReading.findByPk(s.testId);
    if (!test) {
      skippedNoTest++;
      continue;
    }

    const { score, total, percentage, detailedResults } = scoreTest(
      test.toJSON ? test.toJSON() : test,
      parseIfJsonString(s.answers)
    );

    if (!(Number.isFinite(total) && total > 0)) {
      skippedNoScore++;
      continue;
    }

    if (opts.dryRun) {
      console.log(`#${s.id} testId=${s.testId}: ${s.score}/${s.totalQuestions} -> ${score}/${total} (${percentage}%)`);
      continue;
    }

    await s.update({
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
    });

    updated++;
    console.log(`Updated #${s.id} testId=${s.testId}: ${score}/${total} (${percentage}%)`);
  }

  console.log("\nDone.");
  console.log("Updated:", updated);
  console.log("Skipped (missing test):", skippedNoTest);
  console.log("Skipped (could not compute score):", skippedNoScore);

  await sequelize.close();
  process.exit(0);
})().catch(async (e) => {
  console.error("Rescore failed:", e);
  try {
    await sequelize.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
