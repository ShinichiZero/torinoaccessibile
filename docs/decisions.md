# Engineering decisions

1. **Keep the published GeoJSON checked in.** The site is static and the current dataset is a small operational artifact; refreshing generates a reviewable data-only diff.
2. **Unknown remains its own value.** Missing GTFS accessibility information is not evidence of inaccessibility.
3. **Offer a searchable list alongside the map.** Leaflet is not a practical keyboard-only interface to thousands of markers; the list provides search, filters, details, and focus handling.
4. **Make OSM opt-in.** Overpass is a public service and map movement can otherwise cause request storms. User-initiated bounded requests, cancellation, timeout, and cooldown are used.
5. **Refresh through PRs.** A scheduled workflow validates data in a read-only job and uses a separate minimal-write job to update one dedicated branch without force-push. Humans review the data before production changes.
6. **Automate regressions with Vitest, Playwright, and axe.** External requests are mocked in browser tests; automated accessibility results are a regression signal, not certification.
