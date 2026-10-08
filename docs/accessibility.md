# Accessibility

The interface is Italian-language and provides a skip link, labelled search and status filter, an accessible stop results list, live result/loading/error messages, focus on the selected-detail heading, and return focus to the invoking result when details close. The map is named as a region. GTFS wheelchair values are text-labelled and unknown is distinct from “no”. The toolbar is in normal document flow so it does not cover map controls or clusters.

Automated evidence: Playwright Chromium ran axe with WCAG 2.0/2.1/2.2 A/AA tags and found no serious or critical violations on the initial experience. Browser tests cover a keyboard-only list journey and widths from 320 to 1440 px. This is not a WCAG conformance claim. VoiceOver/screen-reader manual testing and a full human WCAG review have not been performed in this run; see [known issues](known-issues.md).
