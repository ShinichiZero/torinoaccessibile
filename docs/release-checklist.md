# Release checklist

## Local evidence (2026-10-08)

- [x] Correct working branch and origin repository confirmed.
- [x] Lint, unit tests, Playwright, axe scan, build, dependency audit passed locally.
- [x] GTFS feature count, status distribution, IDs, geometry, coordinate extent validated.
- [x] No tracked secrets observed; inspect staged diff again before commit.
- [ ] Changes committed and pushed; PR created and reviewed.
- [ ] GitHub CI required checks pass on exact PR head.
- [x] Official feed refreshed and reviewed: feed_info version `20261007`, coverage 2026-10-06–2027-01-31; CKAN catalog timestamp discrepancy documented.
- [ ] Manual screen reader review completed or its gap accepted by the authorized release process.
- [ ] Vercel preview Ready for exact PR head and protected preview smoke tested.
- [ ] Browser smoke in preview: data, search, filters, map, mobile, console/network.
- [ ] Documentation and `git diff --check` rechecked after final edits.
- [ ] Merge only after all applicable gates above pass; no force-push.
- [ ] After merge, verify production deployment SHA, Ready status, public alias and anonymous smoke.

## Release state

**Status: NOT READY TO MERGE.** Local checks and the official feed review pass, but there is no remediation PR, CI run, or preview for the final head, and manual screen-reader QA is outstanding. Continue with the checkpoint's next action and update this file from current GitHub/Vercel evidence before any merge.
