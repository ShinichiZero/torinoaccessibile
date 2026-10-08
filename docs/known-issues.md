# Known issues and release gaps

- **GTFS date metadata differs:** aperTO CKAN reports resource `sourceUpdatedAt` as 2020-01-07, while the official feed's `feed_info.txt` declares `feed_version=20261007` and coverage beginning 2026-10-06. The app displays both; freshness uses the valid date-shaped feed version, which is current as of the audit date. Confirm the publisher's intended version semantics if this format changes.
- **Missing optional GTFS field:** only two of 7,054 refreshed features include `locationType`. The field is optional in this artifact and must not be inferred for the others.
- **Manual accessibility:** VoiceOver/screen-reader and human WCAG 2.2 AA review are not run. Axe reports no serious/critical issue, but does not replace manual review.
- **Deployment validation:** an existing Vercel preview is Ready for the previous `e3dfa72` commit, but no remediation PR/CI run or preview for the final head has been checked yet. Production remains on `main`; merge/release gates remain open.
- **Live external integrations:** Overpass behavior is covered with controlled Playwright mocks; no live Overpass request was made. Browser QA aborts remote OSM tiles to keep results deterministic.
- **Repository setting:** GitHub may require approval before workflows triggered by a `GITHUB_TOKEN`-created refresh PR run. If required checks remain pending, a repository maintainer must approve the run in Actions; do not weaken branch protection.

Do not merge while a required release gate is unverified. Update this list as each item is resolved.
