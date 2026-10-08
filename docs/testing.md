# Testing and verification

Results below were executed locally on 2026-10-08 after `npm ci`.

| Check | Result | Evidence |
|---|---|---|
| `npm ci` | PASS | Installed 56 packages; npm warned that `fsevents@2.3.3` has an install script not covered by current allowScripts policy. |
| `npm run lint` | PASS | Oxlint exited 0. |
| `npm run test:unit` | PASS | 5 files, 29 tests passed, including corrupt/missing-stop ZIP, URL protocol validation, and feed-version freshness behavior. |
| `npm run test:e2e` | PASS | Playwright Chromium: 14/14 after final parser/URL-safety changes. Covers app counts/search/filter/details/keyboard, mocked OSM, six responsive widths. Requires localhost permission in this environment. |
| `npm run test` | PASS | Final combined suite: 29 unit tests and 14 E2E tests passed against the refreshed official feed. |
| axe scan | PASS | Included in E2E; no serious/critical violations for WCAG 2.0/2.1/2.2 A/AA tags on main experience. |
| `npm run build` | PASS | Vite 8.2.2; JS 409.40 kB (122.65 kB gzip), CSS 28.19 kB (9.61 kB gzip). |
| `npm audit` | PASS | 0 vulnerabilities (full dependency tree). |
| GTFS structural validation | PASS | Refreshed official feed: 7,054 features, unique IDs, valid coordinates/geometries, expected value counts; see `data-sources.md`. |
| `git diff --check` | PASS | No whitespace errors after the final source, dataset, and documentation edits. |
| GitHub CI | FAIL on initial PR head | 13/14 E2E passed; keyboard test relied on native select keyboard behavior and got no detail heading in CI. Simplified the test to avoid platform-dependent select interaction; local combined suite passes 29 + 14. New PR head CI is pending. |
| Protected PR preview | PASS on `9c6294e` | Vercel Ready deployment `torino-accessibile-avb0kc6fc-elle6.vercel.app`, exact previous PR head; Playwright ran 14/14 against deployed app using a short-lived Vercel token scoped only to that origin. Test-harness-only changes since then are locally verified; rerun preview after latest push. |
| Live Overpass / production | NOT RUN | OSM requests are mocked in E2E. Production stays on main; no production smoke/deploy performed. |
| Manual screen reader QA | NOT RUN | VoiceOver not exercised. |

Unit tests exercise GTFS parsing and normalization, feed metadata, CSV quoting/multiline/BOM/line endings and invalid input, atomic output preservation, search/filter behavior, and Overpass bounding boxes, aborts, timeouts, rate limits, and failover. E2E stubs all external map/Overpass traffic. The Playwright config accepts `BASE_URL`; protected preview runs add the short-lived OIDC header only to that exact `.vercel.app` origin. Live public Overpass availability is intentionally not part of ordinary CI.
