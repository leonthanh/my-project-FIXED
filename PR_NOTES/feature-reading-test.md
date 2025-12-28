Feature branch: feature/reading-test

Summary of important note for reviewers:

- Student preview modal and in-editor "Preview" button were intentionally removed per teacher request. The full student preview is available via the reading student page (open in new tab) instead of the in-editor modal.
- End-to-end tests referencing the removed preview were updated to reflect the new behavior (teacher-preview.spec.js now asserts preview button is absent).
- All frontend unit tests (7 suites, 17 tests) and Playwright e2e tests (3 tests) pass locally.

Suggested reviewer actions:
- Confirm that removing the in-editor preview matches expectations for teachers.
- Sanity-check CI logs for any test warnings (React Router future flags) — non-blocking.
- If you prefer restoring a modal preview, we can open a follow-up PR to implement a full DoReadingTest modal experience.

Notes by: luongkhiemdu (on behalf of PR author)
Date: 2025-12-28
