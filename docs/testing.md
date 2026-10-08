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
| CI on PR | NOT RUN | No remediation PR has been created yet. |
| Live Overpass / production / preview | NOT RUN | No live external requests or deployment verification performed. |
| Manual screen reader QA | NOT RUN | VoiceOver not exercised. |

Unit tests exercise GTFS parsing and normalization, CSV quoting/multiline/BOM/line endings and invalid input, atomic output preservation, search/filter behavior, and Overpass bounding boxes, aborts, timeouts, rate limits, and failover. E2E stubs all external map/Overpass traffic. Live public Overpass availability is intentionally not part of ordinary CI.
