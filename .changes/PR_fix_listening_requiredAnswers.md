Title: fix(listening): scan/fix suspicious requiredAnswers and remove debug logs

Summary
-------
This patch does the following:

- Adds a maintenance script `backend/scripts/inspect-fix-requiredAnswers.js` that scans `ListeningTest.questions` for two issues:
  1. `requiredAnswers > 1` but `questionType !== 'multi-select'` (suspicious/misplaced)
  2. `questionType === 'multi-select'` but `requiredAnswers` is missing/invalid

  The script defaults to a dry-run (report only). Use `--apply` to modify DB and `--fill-missing` to set a default `requiredAnswers` of 2 on multi-select questions that lack one.

- Removes temporary debug `console.info('[LR] ...')` logs from `ListeningResults.jsx`.

- Improves section/part numbering logic to compute start/end numbers from section-level counts so mis-set `requiredAnswers` values on unrelated question types no longer shift the numbering.

- Adds unit test `doListeningNumbering.test.jsx` to cover cases where a question has `requiredAnswers` but `questionType` is `fill`/`abc` (simulates the earlier mis-specified data) and verifies correct rendering for Part 2 and Part 3.

Why
---
We observed real data where `requiredAnswers` had been set on ABC / fill questions, which caused downstream numbering errors in the student UI (e.g. a matching block that should be Questions 15-20 rendering as 19-24). The script allows finding and optionally cleaning these historical data issues safely.

How to run the script
---------------------
- Dry-run (report only):
  node backend/scripts/inspect-fix-requiredAnswers.js --testId=3

- Apply fixes (clear suspicious `requiredAnswers`):
  node backend/scripts/inspect-fix-requiredAnswers.js --apply --testId=3

- Also fill missing `requiredAnswers` on multi-select questions with default 2:
  node backend/scripts/inspect-fix-requiredAnswers.js --apply --fill-missing --testId=3

Notes
-----
- Please backup DB before running with `--apply`.
- I tested locally with `--testId=3` (dry-run) and it reported 11 suspicious entries; none were changed because dry-run was used.
- All frontend tests pass after removing debug logs and adding the new test.

Suggested next steps
--------------------
1. Review the `inspect-fix-requiredAnswers.js` output in dry-run for affected tests.
2. If acceptable, run the script with `--apply` (optionally with `--fill-missing`) for impacted test(s) or globally.
3. Open a PR and ask a reviewer (or run the repairs on a staging DB first).

---

If you want, I can run `--apply --testId=3` now (with your confirmation) and report the changes it makes.