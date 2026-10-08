# Release checklist

## Local evidence (2026-10-08)

- [x] Correct working branch and origin repository confirmed.
- [x] Lint, unit tests, Playwright, axe scan, build, dependency audit passed locally.
- [x] GTFS feature count, status distribution, IDs, geometry, coordinate extent validated.
- [x] No tracked secrets observed; inspect staged diff again before commit.
- [x] Main remediation committed/pushed; PR #1 created and its diff/file list reviewed.
- [ ] GitHub CI required checks pass on exact PR head (initial run failed one keyboard test; rerun after deterministic test fix).
- [x] Official feed refreshed and reviewed: feed_info version `20261007`, coverage 2026-10-06–2027-01-31; CKAN catalog timestamp discrepancy documented.
- [ ] Manual screen reader review completed or its gap accepted by the authorized release process.
- [x] Vercel preview Ready for `9c6294e`; protected preview smoke ran 14/14 through Playwright.
- [ ] Repeat preview smoke for latest PR head after test-harness commit.
- [ ] Browser smoke in preview: data, search, filters, map, mobile, console/network.
- [ ] Documentation and `git diff --check` rechecked after final edits.
- [ ] Merge only after all applicable gates above pass; no force-push.
- [ ] After merge, verify production deployment SHA, Ready status, public alias and anonymous smoke.

## Release state

**Status: NOT READY TO MERGE.** Local checks and the feed review pass. PR #1 is open; its first CI run failed the keyboard-only test, which has been corrected locally. New-head CI and exact-head preview are pending; manual screen-reader QA is outstanding.
