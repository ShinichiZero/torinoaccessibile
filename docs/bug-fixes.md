# Bug fixes and regression evidence

## Map selection, search, and status interpretation

- **Symptoms/reproduction:** a user could not reliably find stops by name/code or use a non-map path to inspect them; selecting list data was not synchronized with the Leaflet marker/popup. Empty searches lacked clear feedback.
- **Root cause:** the original experience relied on map interactions and did not provide a searchable accessible list or shared selection state.
- **Fix/files:** added `src/services/stopSearch.js`, `src/components/StopSearch.jsx`, and integrated focus/popup synchronization and a viewport-aware list into `src/components/MapView.jsx`. Status labels explicitly describe GTFS field values; unknown is separate.
- **Why it works:** one validated feature collection powers list and markers; normalized filtering supports case, spacing, and diacritics; stable feature IDs and selection state synchronize the detail panel/map.
- **Regression/verification:** `tests/unit/stopSearch.test.js`; Playwright search, filter, empty-state, detail, focus, keyboard-only tests. Current results: unit suite 24/24, E2E 14/14.
- **Remaining risk:** manual screen-reader review is not run; list intentionally renders up to 60 results for usability.

## CSV ingestion and published artifact safety

- **Symptoms/reproduction:** a malformed CSV could be accepted despite misplaced quotes or inconsistent row widths, risking misleading output or overwriting good data.
- **Root cause:** the previous parser did not enforce CSV record/header structure and the publication path lacked validation-before-replacement.
- **Fix/files:** `scripts/generate-stops-json.mjs` parses quoted commas, embedded newlines, escaped quotes, BOM and LF/CRLF; validates required columns, widths, duplicates, IDs and coordinates; writes a temporary validated artifact and atomically renames only on success. `scripts/download-gtfs.mjs` validates ZIP contents and stages the archive.
- **Why it works:** malformed input fails before replacement; the previous good output remains in place. Output metadata/count/GeoJSON shape are validated before publication.
- **Regression/verification:** `tests/unit/gtfsGenerator.test.js` covers CSV edge cases, malformed/empty/invalid input and last-good preservation. Current unit results: 24/24 pass.
- **Remaining risk:** the checked-in data currently lacks `locationType`; no refreshed ZIP was available in this local verification.

## Unsafe feed URLs and corrupt GTFS archives

- **Symptoms/reproduction:** malformed or executable external URLs in a dataset could be rendered as clickable links, and ZIP corruption/missing `stops.txt` needed an explicit rejection path.
- **Root cause:** the client copied feed URL strings directly into popup anchors; ZIP validation had no isolated regression-tested helper.
- **Fix/files:** `src/services/gtfsParser.js` now accepts HTTPS URLs, upgrades only legacy `www.gtt.to.it` HTTP links to HTTPS, and rejects other insecure/executable URLs. `scripts/download-gtfs.mjs` exposes `validateGtfsArchive`, validates the staged data, and only runs its downloader as a CLI entry point. Added parser URL and ZIP tests.
- **Why it works:** anchors receive only normalized HTTPS links; an invalid archive or missing `stops.txt` fails before replacement of the prior archive.
- **Regression/verification:** the GTFS parser and ZIP unit tests are included in the 5-file/27-test passing unit run; final Playwright suite passed 14/14.
- **Remaining risk:** the trusted host list for automatic HTTP upgrade intentionally contains only the existing GTT hostname.

## Overpass request lifecycle and map occlusion

- **Symptoms/reproduction:** repeated viewport actions, stale requests, excessive area, timeout/failover and rate limits can degrade map use; the old overlay toolbar could obscure a top-right cluster and axe flagged the obscured target.
- **Root cause:** the external request lifecycle needed explicit bounds/cancellation/cooldowns, while overlaid controls competed with map targets.
- **Fix/files:** `src/services/overpassApi.js` validates bounded BBoxes, aborts/times out, handles 429 and transient gateway fallbacks. `MapView.jsx` requests only on user action, cancels stale work, ignores outdated responses, and uses a timed cooldown. `src/App.css` places toolbar/warnings in document flow.
- **Why it works:** current request IDs gate state updates; abort propagates; bounded requests and cooldown reduce service load; non-overlapping controls preserve targets.
- **Regression/verification:** `tests/unit/overpassApi.test.js` covers validation/abort/timeout/429/fallback; E2E mocks OSM success, rate limiting and transient failures. axe serious/critical scan passes; E2E 14/14.
- **Remaining risk:** no live Overpass integration check was made, by design; live provider behavior can vary.
