# Release checklist

## Local evidence (2026-10-08)

- [x] Correct working branch and origin repository confirmed.
- [x] Lint, unit tests, Playwright, axe scan, build, dependency audit passed locally.
- [x] GTFS feature count, status distribution, IDs, geometry, coordinate extent validated.
- [x] No tracked secrets observed; inspect staged diff again before commit.
- [x] Main remediation committed/pushed; PR #1 created and its diff/file list reviewed.
- [x] GitHub CI passes on exact code/test head `83b101c`: install, lint, unit, browser install, 15 E2E tests, and build.
- [x] Official feed refreshed and reviewed: feed_info version `20261007`, coverage 2026-10-06–2027-01-31; CKAN catalog timestamp discrepancy documented.
- [x] Manual screen reader QA is NOT RUN; VoiceOver was unavailable. Gap is documented and no formal conformance claim is made; keyboard and automated axe checks passed.
- [x] Vercel preview Ready for exact code/test head `83b101c`; protected preview smoke ran 15/15 through Playwright.
- [x] Browser smoke in preview covered data, search, filters, map, mobile widths, axe, and no console/runtime errors on initial load.
- [ ] Documentation and `git diff --check` rechecked after final edits.
- [ ] Merge only after all applicable gates above pass; no force-push.
- [ ] After merge, verify production deployment SHA, Ready status, public alias and anonymous smoke.

## Release state

**Status: READY FOR FINAL DOCUMENTATION-HEAD RECHECK.** PR #1 is open. Local checks, CI, and protected preview smoke pass on code/test head `83b101c`. Recheck the documentation-only follow-up head before merge. Manual screen-reader QA is documented as not run; no formal conformance claim is made.
