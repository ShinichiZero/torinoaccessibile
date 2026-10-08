# Testing and verification

Results below were executed locally on 2026-10-08 after `npm ci`.

| Check | Result | Evidence |
|---|---|---|
| `npm ci` | PASS | Installed 56 packages; npm warned that `fsevents@2.3.3` has an install script not covered by current allowScripts policy. |
| `npm run lint` | PASS | Oxlint exited 0. |
| `npm run test:unit` | PASS | 5 files, 29 tests passed, including corrupt/missing-stop ZIP, URL protocol validation, and feed-version freshness behavior. |
| `npm run test:e2e` | PASS | Playwright Chromium: 15/15. Covers app counts/search/filter/details/keyboard, mocked OSM, no runtime/console errors on initial load, and six responsive widths. Requires localhost permission in this environment. |
| `npm run test` | PASS | Final combined suite: 29 unit tests and 15 E2E tests passed against the refreshed official feed. |
| axe scan | PASS | Included in E2E; no serious/critical violations for WCAG 2.0/2.1/2.2 A/AA tags on main experience. |
| `npm run build` | PASS | Vite 8.2.2; JS 409.40 kB (122.65 kB gzip), CSS 28.19 kB (9.61 kB gzip). |
| `npm audit` | PASS | 0 vulnerabilities (full dependency tree). |
| GTFS structural validation | PASS | Refreshed official feed: 7,054 features, unique IDs, valid coordinates/geometries, expected value counts; see `data-sources.md`. |
| `git diff --check` | PASS | No whitespace errors after the final source, dataset, and documentation edits. |
| GitHub CI | PASS on `c7a7f18` | All job steps passed: install, lint, 29 unit tests, browser install, 14 E2E tests, and build. The first PR-head run had 13/14 E2E pass because a keyboard test depended on native select behavior; the test was simplified and the rerun passed. The added console/runtime smoke is pending CI on the next head. |
| Protected PR preview | PASS on `c7a7f18` | Vercel Ready deployment `torino-accessibile-fma5d4jgi-elle6.vercel.app`, exact PR head; Playwright ran 14/14 against deployed app using a short-lived Vercel token scoped only to that origin. Repeat after the added console/runtime smoke commit. |
| Live Overpass / production | NOT RUN | OSM requests are mocked in E2E. Production stays on main; no production smoke/deploy performed. |
| Manual screen reader QA | NOT RUN | VoiceOver not exercised. |

Unit tests exercise GTFS parsing and normalization, feed metadata, CSV quoting/multiline/BOM/line endings and invalid input, atomic output preservation, search/filter behavior, and Overpass bounding boxes, aborts, timeouts, rate limits, and failover. E2E stubs all external map/Overpass traffic. The Playwright config accepts `BASE_URL`; protected preview runs add the short-lived OIDC header only to that exact `.vercel.app` origin. Live public Overpass availability is intentionally not part of ordinary CI.
