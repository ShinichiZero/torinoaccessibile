# Work checkpoint

Updated: 2026-10-08

- Branch: `docs/release-verification`, based on merged `main` commit `a1bdc5e77e36c4f37b91edc3ee0d3202c9cd0603`.
- Release PR: [#1](https://github.com/ShinichiZero/torinoaccessibile/pull/1), merged with squash. Working branch was `fix/accessibility-audit`; tested head `cbb24549132d3bd528b3bdd04bb28cff34d68a26`.
- Remote: `origin` = `https://github.com/ShinichiZero/torinoaccessibile.git`.
- Production deployment: `dpl_7YCt8vbH69TrLqdEL3NtLoAoMPUX`, state READY, deployed commit `a1bdc5e77e36c4f37b91edc3ee0d3202c9cd0603`, aliases include `torino-accessibile.vercel.app`.
- Anonymous production Chromium smoke: PASS, 15/15. The exact protected PR preview also passed 15/15; GitHub CI passed install, lint, unit, browser install, E2E, and build. Local lint, 29 unit tests, 15 E2E tests, build, dependency audit (0 vulnerabilities), GTFS validation, and `git diff --check` passed.

## Completed in this session

- Inspected mission brief and verified repository/branch/remote.
- Added generator/parser/search/Overpass regression suites and Playwright experience/accessibility tests; corrected E2E headline-load wait and exact code-search selector.
- Moved map toolbar to normal flow (from checkpointed prior work); axe scan now passes.
- Ran `npm ci` (56 packages installed; fsevents allowScripts warning), `npm run lint` (PASS), final configured `npm run test` (5 unit files/29 tests + 14 Playwright tests passed), `npm run build` (PASS, Vite 8.2.2), `npm audit` with network escalation (0 vulnerabilities), and GTFS structural inspection/refresh (7,054 features; counts and feed version in data-sources.md).
- E2E mocked OSM success, 429, and 503/504 failover; no live Overpass traffic.
- Ran `npm run refresh:gtfs` with approved network access; aperTO CKAN returned official 15.04 MB `gtt_gtfs.zip`, reported catalog timestamp 2020-01-07, and feed_info declared version `20261007` / coverage 2026-10-06–2027-01-31. Freshness follows a valid date-shaped feed version when available, retaining both other timestamps.

## Current follow-up

This branch updates only release documentation with the production deployment ID, SHA, public alias, and anonymous smoke result. It must be reviewed and merged through a separate documentation PR. No application code changes are pending.

## Remaining limitations

- VoiceOver/manual screen-reader QA was not run; no formal WCAG conformance claim is made.
- No live Overpass request was made; external OSM responses were mocked.
- aperTO's catalog timestamp differs from the GTFS feed version; both are documented and shown separately.

Next action: review and merge the documentation-only follow-up PR. No production redeploy is required for docs-only changes; verify that Vercel continues to point its production alias at the release deployment.
