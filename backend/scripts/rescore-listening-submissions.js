/*
  One-time maintenance script: rescore Listening submissions that were saved with total=0.

  Usage:
    node scripts/rescore-listening-submissions.js --dry-run
    node scripts/rescore-listening-submissions.js --apply

  Optional:
    --limit=100
    --testId=1
    --submissionId=123
*/

const sequelize = require("../db");
const ListeningSubmission = require("../models/ListeningSubmission");
const ListeningTest = require("../models/ListeningTest");
const { Op } = require("sequelize");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { apply: false, dryRun: true, limit: null, testId: null, submissionId: null, force: false };
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
    } else if (a === "--force") {
      out.force = true;
    }
  }
  return out;
};

const parseIfJsonString = (val) => {
  // Be tolerant: allow values that are JSON strings, possibly encoded more than once.
  let v = val;
  let attempts = 0;
  while (typeof v === "string" && attempts < 3) {
    try {
      v = JSON.parse(v);
    } catch (e) {
      break;
    }
    attempts++;
  }
  return v;
};

const normalize = (val) => (val == null ? "" : String(val)).trim().toLowerCase();

const explodeAccepted = (val) => {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  const s = String(val);
  if (s.includes("|")) return s.split("|").map((x) => x.trim()).filter(Boolean);
  if (s.includes("/")) return s.split("/").map((x) => x.trim()).filter(Boolean);
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
  return [s];
};

const bandFromCorrect = (c) => {
  if (c >= 39) return 9;
  if (c >= 37) return 8.5;
  if (c >= 35) return 8;
  if (c >= 32) return 7.5;
  if (c >= 30) return 7;
  if (c >= 26) return 6.5;
  if (c >= 23) return 6;
  if (c >= 18) return 5.5;
  if (c >= 16) return 5;
  if (c >= 13) return 4.5;
  if (c >= 11) return 4;
  return 3.5;
};

const setEq = (a, b) => {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const v of A) if (!B.has(v)) return false;
  return true;
};

const { scoreListening } = require("../utils/listeningScorer");

// scoreListening imported from utils; keeps old parseIfJsonString/local helpers in place for compatibility.



(async () => {
  const opts = parseArgs();
  console.log("\nListening rescore (total=0)" + (opts.dryRun ? " [DRY RUN]" : " [APPLY]"));
  console.log("Options:", opts);

  await sequelize.authenticate();

  let where;
  if (opts.submissionId) {
    where = { id: opts.submissionId };
  } else {
    where = opts.force
      ? {}
      : {
          [Op.or]: [{ total: 0 }, { total: { [Op.is]: null } }],
        };
    if (opts.testId) where.testId = opts.testId;
  }

  const subs = await ListeningSubmission.findAll({
    where,
    order: [["id", "ASC"]],
    ...(opts.limit ? { limit: opts.limit } : {}),
  });

  console.log(`Found ${subs.length} submission(s) to check.`);

  let updated = 0;
  let skippedNoTest = 0;
  let skippedNoScore = 0;

  for (const s of subs) {
    const test = await ListeningTest.findByPk(s.testId);
    if (!test) {
      skippedNoTest++;
      continue;
    }

    const { correctCount, totalCount, scorePercentage, band, details } = scoreListening({
      test: test.toJSON ? test.toJSON() : test,
      answers: parseIfJsonString(s.answers),
    });

    if (!(Number.isFinite(totalCount) && totalCount > 0)) {
      skippedNoScore++;
      continue;
    }

    if (opts.dryRun) {
      console.log(
        `#${s.id} testId=${s.testId}: ${s.correct}/${s.total} -> ${correctCount}/${totalCount} (band ${band})`
      );
      continue;
    }

    await s.update({
      correct: correctCount,
      total: totalCount,
      scorePercentage,
      band,
      details,
    });

    updated++;
    console.log(
      `Updated #${s.id} testId=${s.testId}: ${correctCount}/${totalCount} (band ${band})`
    );
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
