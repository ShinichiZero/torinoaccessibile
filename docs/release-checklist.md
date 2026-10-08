# Release checklist

## Local evidence (2026-10-08)

- [x] Correct working branch and origin repository confirmed.
- [x] Lint, unit tests, Playwright, axe scan, build, dependency audit passed locally.
- [x] GTFS feature count, status distribution, IDs, geometry, coordinate extent validated.
- [x] No tracked secrets observed; inspect staged diff again before commit.
- [x] Main remediation committed/pushed; PR #1 reviewed and merged with squash as `a1bdc5e77e36c4f37b91edc3ee0d3202c9cd0603`.
- [x] GitHub CI passed on final tested PR head `cbb24549132d3bd528b3bdd04bb28cff34d68a26`: install, lint, unit, browser install, 15 E2E tests, and build.
- [x] Official feed refreshed and reviewed: feed_info version `20261007`, coverage 2026-10-06–2027-01-31; CKAN catalog timestamp discrepancy documented.
- [x] Manual screen reader QA is NOT RUN; VoiceOver was unavailable. Gap is documented and no formal conformance claim is made; keyboard and automated axe checks passed.
- [x] Vercel preview Ready for exact PR #1 head; protected preview smoke ran 15/15 through Playwright.
- [x] Browser smoke in preview covered data, search, filters, map, mobile widths, axe, and no console/runtime errors on initial load.
- [x] Documentation and `git diff --check` rechecked after final edits.
- [x] Merged only after release gates passed; no force-push.
- [x] Production deployment SHA, Ready status, public alias and anonymous smoke verified.

## Release state

**Status: RELEASED.** PR #1 merged as `a1bdc5e77e36c4f37b91edc3ee0d3202c9cd0603`; production deployment is READY and the public alias passed anonymous browser smoke. VoiceOver/manual screen-reader QA remains unperformed and is documented; no formal conformance claim is made.
