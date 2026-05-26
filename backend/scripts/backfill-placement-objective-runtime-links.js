/*
  Maintenance: conservatively backfill missing placement runtime links for
  historical IX reading/listening submissions.

  This does not write phone numbers into submission rows. Instead, it restores
  PlacementAttemptItem.runtimeSubmissionModel/runtimeSubmissionId so the current
  review/admin response backfill can resolve placement student contact data.

  Dry-run by default.

  Usage:
    node scripts/backfill-placement-objective-runtime-links.js --dry-run
    node scripts/backfill-placement-objective-runtime-links.js --apply

  Optional:
    --skill=reading
    --skill=listening
    --submissionId=190
    --limit=100
    --maxHours=72

  Matching rules:
    - platform must be ix
    - skill must match
    - testId must match exactly
    - normalized submission.userName must exactly match normalized attempt.studentName
    - candidate must be unique within the configured time window
*/

const { Op } = require("sequelize");

const sequelize = require("../db");
const ReadingSubmission = require("../models/ReadingSubmission");
const ListeningSubmission = require("../models/ListeningSubmission");
const PlacementAttempt = require("../models/PlacementAttempt");
const PlacementAttemptItem = require("../models/PlacementAttemptItem");
const placementService = require("../modules/placement/service");

const SKILLS = {
  reading: {
    submissionModel: ReadingSubmission,
    runtimeSubmissionModel: "reading",
  },
  listening: {
    submissionModel: ListeningSubmission,
    runtimeSubmissionModel: "listening",
  },
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    dryRun: true,
    skill: null,
    submissionId: null,
    limit: null,
    maxHours: 72,
  };

  for (const arg of args) {
    if (arg === "--apply") {
      options.apply = true;
      options.dryRun = false;
      continue;
    }

    if (arg === "--dry-run") {
      options.apply = false;
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--skill=")) {
      const value = String(arg.split("=")[1] || "").trim().toLowerCase();
      options.skill = value || null;
      continue;
    }

    if (arg.startsWith("--submissionId=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        options.submissionId = value;
      }
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        options.limit = value;
      }
      continue;
    }

    if (arg.startsWith("--maxHours=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value >= 0) {
        options.maxHours = value;
      }
    }
  }

  if (options.skill && !SKILLS[options.skill]) {
    throw new Error(`Unsupported --skill value: ${options.skill}`);
  }

  return options;
};

const normalizeName = (value) =>
  String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toMillis = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : null;
};

const formatHours = (millis) => {
  if (!Number.isFinite(millis)) return "n/a";
  return (millis / (60 * 60 * 1000)).toFixed(2);
};

const selectCandidateTimestamp = (candidate) =>
  toMillis(
    candidate.item.submittedAt ||
      candidate.item.startedAt ||
      candidate.item.updatedAt ||
      candidate.item.createdAt ||
      candidate.attempt.completedAt ||
      candidate.attempt.startedAt ||
      candidate.attempt.updatedAt ||
      candidate.attempt.createdAt
  );

const summarizeCandidate = (candidate) => ({
  attemptId: candidate.attempt.id,
  attemptItemId: candidate.item.id,
  attemptItemToken: candidate.item.attemptItemToken,
  attemptStudentName: candidate.attempt.studentName,
  itemStatus: candidate.item.status,
  testId: candidate.item.testId,
  candidateHoursFromSubmission: formatHours(candidate.diffMs),
});

const findReliableCandidate = ({ submission, candidates, maxMillis }) => {
  const submissionNameKey = normalizeName(submission.userName);
  if (!submissionNameKey) {
    return { match: null, reason: "missing submission userName", candidates: [] };
  }

  const namedCandidates = candidates
    .map((candidate) => {
      const candidateNameKey = normalizeName(candidate.attempt.studentName);
      const submissionTime = toMillis(submission.createdAt);
      const candidateTime = selectCandidateTimestamp(candidate);

      return {
        ...candidate,
        candidateNameKey,
        diffMs:
          Number.isFinite(submissionTime) && Number.isFinite(candidateTime)
            ? Math.abs(submissionTime - candidateTime)
            : null,
      };
    })
    .filter((candidate) => candidate.candidateNameKey === submissionNameKey);

  if (!namedCandidates.length) {
    return { match: null, reason: "no exact placement name match", candidates: [] };
  }

  if (maxMillis === 0) {
    if (namedCandidates.length === 1) {
      return { match: namedCandidates[0], reason: "unique exact-name match", candidates: namedCandidates };
    }

    return {
      match: null,
      reason: "multiple exact-name matches",
      candidates: namedCandidates,
    };
  }

  const withinWindow = namedCandidates.filter(
    (candidate) => Number.isFinite(candidate.diffMs) && candidate.diffMs <= maxMillis
  );

  if (withinWindow.length === 1) {
    return {
      match: withinWindow[0],
      reason: "unique exact-name match within time window",
      candidates: withinWindow,
    };
  }

  if (withinWindow.length > 1) {
    return {
      match: null,
      reason: "multiple exact-name matches within time window",
      candidates: withinWindow,
    };
  }

  if (namedCandidates.length === 1) {
    return {
      match: null,
      reason: "single exact-name match outside time window",
      candidates: namedCandidates,
    };
  }

  return {
    match: null,
    reason: "multiple exact-name matches outside time window",
    candidates: namedCandidates,
  };
};

const buildPlacementCandidatesLoader = () => {
  const cache = new Map();

  return async (skill, testId) => {
    const normalizedTestId = String(testId || "").trim();
    const cacheKey = `${skill}:${normalizedTestId}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const items = await PlacementAttemptItem.findAll({
      raw: true,
      where: {
        platform: "ix",
        skill,
        testId: normalizedTestId,
        runtimeSubmissionId: { [Op.is]: null },
      },
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });

    const attemptIds = Array.from(
      new Set(
        items
          .map((item) => Number(item.attemptId))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );

    const attempts = attemptIds.length
      ? await PlacementAttempt.findAll({
          raw: true,
          where: { id: { [Op.in]: attemptIds } },
        })
      : [];
    const attemptMap = new Map(attempts.map((attempt) => [String(attempt.id), attempt]));

    const candidates = items
      .map((item) => {
        const attempt = attemptMap.get(String(item.attemptId));
        if (!attempt) return null;
        return { item, attempt };
      })
      .filter(Boolean);

    cache.set(cacheKey, candidates);
    return candidates;
  };
};

const fetchUnlinkedSubmissions = async ({ skill, submissionId, limit }) => {
  const config = SKILLS[skill];
  const where = {
    userId: { [Op.is]: null },
  };

  if (submissionId) {
    where.id = submissionId;
  }

  const submissions = await config.submissionModel.findAll({
    raw: true,
    where,
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    ...(limit ? { limit } : {}),
  });

  if (!submissions.length) {
    return [];
  }

  const linkedRows = await PlacementAttemptItem.findAll({
    raw: true,
    attributes: ["runtimeSubmissionId"],
    where: {
      runtimeSubmissionModel: config.runtimeSubmissionModel,
      runtimeSubmissionId: {
        [Op.in]: submissions
          .map((submission) => Number(submission.id))
          .filter((value) => Number.isFinite(value) && value > 0),
      },
    },
  });

  const linkedIds = new Set(
    linkedRows
      .map((row) => Number(row.runtimeSubmissionId))
      .filter((value) => Number.isFinite(value) && value > 0)
  );

  return submissions.filter((submission) => !linkedIds.has(Number(submission.id)));
};

const processSkill = async ({ skill, options, loadPlacementCandidates }) => {
  const maxMillis = Number(options.maxHours) * 60 * 60 * 1000;
  const submissions = await fetchUnlinkedSubmissions({
    skill,
    submissionId: options.submissionId,
    limit: options.limit,
  });

  const result = {
    skill,
    scanned: submissions.length,
    matched: [],
    updated: 0,
    unrecoverable: [],
  };

  for (const submission of submissions) {
    const candidates = await loadPlacementCandidates(skill, submission.testId);

    if (!candidates.length) {
      result.unrecoverable.push({
        submissionId: submission.id,
        testId: submission.testId,
        userName: submission.userName,
        reason: "no placement attempt items for matching skill/testId",
      });
      continue;
    }

    const decision = findReliableCandidate({
      submission,
      candidates,
      maxMillis,
    });

    if (!decision.match) {
      result.unrecoverable.push({
        submissionId: submission.id,
        testId: submission.testId,
        userName: submission.userName,
        reason: decision.reason,
        candidates: decision.candidates.slice(0, 5).map(summarizeCandidate),
      });
      continue;
    }

    const matchSummary = {
      submissionId: submission.id,
      testId: submission.testId,
      userName: submission.userName,
      finished: Boolean(submission.finished),
      candidate: summarizeCandidate(decision.match),
    };

    result.matched.push(matchSummary);

    if (!options.apply) {
      continue;
    }

    await placementService.syncRuntimeSubmissionForAttemptItem({
      attemptItemToken: decision.match.item.attemptItemToken,
      platform: "ix",
      skill,
      testId: String(submission.testId),
      runtimeSubmissionModel: skill,
      runtimeSubmissionId: submission.id,
      status: submission.finished ? "submitted" : "started",
      correct: submission.correct,
      totalQuestions: submission.total,
      percentage: submission.scorePercentage,
      band: submission.band,
    });

    result.updated += 1;
  }

  return result;
};

const printSkillReport = (report, options) => {
  console.log(`\n[${report.skill}] scanned=${report.scanned} matched=${report.matched.length} updated=${report.updated}`);

  report.matched.forEach((match) => {
    console.log(
      `[MATCH] submission #${match.submissionId} test=${match.testId} user="${match.userName}" -> attemptItem ${match.candidate.attemptItemToken} attempt=${match.candidate.attemptId} diffHours=${match.candidate.candidateHoursFromSubmission}`
    );
  });

  report.unrecoverable.forEach((entry) => {
    console.log(
      `[SKIP] submission #${entry.submissionId} test=${entry.testId} user="${entry.userName || ""}" reason=${entry.reason}`
    );

    if (entry.candidates?.length) {
      console.log(`        candidates=${JSON.stringify(entry.candidates)}`);
    }
  });

  if (options.dryRun && report.matched.length) {
    console.log(`[${report.skill}] dry-run only. Re-run with --apply to persist ${report.matched.length} link(s).`);
  }
};

const main = async () => {
  const options = parseArgs();
  const skills = options.skill ? [options.skill] : Object.keys(SKILLS);
  const loadPlacementCandidates = buildPlacementCandidatesLoader();

  console.log(`\nPlacement objective runtime backfill ${options.dryRun ? "[DRY RUN]" : "[APPLY]"}`);
  console.log("Options:", options);

  await sequelize.authenticate();

  let totalScanned = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let totalUnrecoverable = 0;

  for (const skill of skills) {
    const report = await processSkill({ skill, options, loadPlacementCandidates });
    totalScanned += report.scanned;
    totalMatched += report.matched.length;
    totalUpdated += report.updated;
    totalUnrecoverable += report.unrecoverable.length;
    printSkillReport(report, options);
  }

  console.log("\nSummary:", {
    scanned: totalScanned,
    matched: totalMatched,
    updated: totalUpdated,
    unrecoverable: totalUnrecoverable,
  });
};

if (require.main === module) {
  main()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Backfill failed:", error);
      try {
        await sequelize.close();
      } catch (_error) {
        // ignore close errors
      }
      process.exit(1);
    });
}
