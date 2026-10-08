# Release checklist

## Local evidence (2026-10-08)

- [x] Correct working branch and origin repository confirmed.
- [x] Lint, unit tests, Playwright, axe scan, build, dependency audit passed locally.
- [x] GTFS feature count, status distribution, IDs, geometry, coordinate extent validated.
- [x] No tracked secrets observed; inspect staged diff again before commit.
- [x] Main remediation committed/pushed; PR #1 created and its diff/file list reviewed.
- [ ] GitHub CI passes on final PR head (the `c7a7f18` run passed all steps; added console/runtime smoke awaits CI).
- [x] Official feed refreshed and reviewed: feed_info version `20261007`, coverage 2026-10-06–2027-01-31; CKAN catalog timestamp discrepancy documented.
- [x] Manual screen reader QA is NOT RUN; VoiceOver was unavailable. Gap is documented and no formal conformance claim is made; keyboard and automated axe checks passed.
- [x] Vercel preview Ready for exact head `c7a7f18`; protected preview smoke ran 14/14 through Playwright.
- [ ] Browser smoke in preview covered data, search, filters, map, mobile widths, and axe for final PR head (14/14 passed on `c7a7f18`; repeat after console/runtime test addition).
- [ ] Documentation and `git diff --check` rechecked after final edits.
- [ ] Merge only after all applicable gates above pass; no force-push.
- [ ] After merge, verify production deployment SHA, Ready status, public alias and anonymous smoke.

## Release state

**Status: NOT READY TO MERGE.** PR #1 is open. Local checks pass with 29 unit and 15 E2E tests. CI and preview passed on `c7a7f18` with 14 E2E tests; the added console/runtime smoke must be committed and both exact-head checks rerun. Manual screen-reader QA is documented as not run.
