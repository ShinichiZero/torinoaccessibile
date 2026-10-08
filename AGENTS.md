# Engineering guide

## Purpose and boundaries

Torino Accessibile presents stop-level accessibility values from the published GTT static GTFS feed and separately loaded accessibility features from OpenStreetMap (OSM). A GTFS `wheelchair_boarding` value describes the feed field only; it does not establish that a vehicle, sidewalk, interchange, or complete trip is accessible. Do not add analytics, tracking, authentication, or unrelated product features in audit-remediation work.

## Structure and conventions

- `src/App.jsx`, `src/App.css`: page shell, summary and global styles.
- `src/components/`: map, searchable stop list, header and footer.
- `src/services/`: validated GTFS loading, stop filtering, and bounded Overpass requests.
- `scripts/`: download, validate, and generate the published stop GeoJSON.
- `public/data/gtt-stops.json`: checked-in public dataset; keep it source-derived.
- `tests/unit`, `tests/e2e`: deterministic service/generator and browser tests.
- `.github/workflows`: CI and reviewed GTFS refresh proposal.

Keep source labels with data. Keep OSM values visibly separate from GTFS values. Validate external data at ingestion boundaries; do not silently reinterpret unknown as inaccessible. Use stable source IDs as React keys.

## Commands

- `npm ci`: reproducible install.
- `npm run dev`: local Vite development server.
- `npm run lint`: Oxlint.
- `npm run test:unit`: Vitest unit suite.
- `npm run test:e2e`: Playwright Chromium suite (starts a local server).
- `npm run test:a11y`: focused axe scan.
- `npm run build`: production build.
- `npm run refresh:gtfs`: download and validate the current feed, then generate the artifact. Inspect the resulting diff before committing.

## Accessibility and testing requirements

Preserve Italian language metadata, landmarks, a skip link, visible focus, labelled controls, keyboard access to the non-map stop list, announced loading/results/errors, and focus restoration after detail dismissal. Map controls and markers must not obscure page controls. Treat axe as a regression check, not a conformance certification. Add deterministic tests for changed behavior; mock OSM in CI and do not depend on public Overpass availability.

Before proposing a release, run clean install, lint, unit tests, browser tests, build, dependency audit, and `git diff --check`. Record exact commands and outcomes in `docs/testing.md` and `docs/checkpoint.md`. Do not claim a check passed unless it ran.

## Git and security

Work on `fix/accessibility-audit` or a review branch based on it. Preserve existing edits. Never force-push or rewrite `main`; do not commit secrets, `.vercel/`, archives, build output, or local state. Keep GitHub workflow permissions scoped to each job and pin third-party actions to reviewed SHAs. Do not expose private environment values through Vite client variables. External links opened in a new tab need `rel="noreferrer"` (or stronger).

## Resuming work safely

Start with `pwd`, `git status --short`, current branch/SHA, remotes, and `docs/checkpoint.md`; inspect the repository rather than relying on this document alone. Check the actual remote/main and deployment state before release. Mark unverified items `NOT RUN` or `BLOCKED`. If the session is ending, update the checkpoint with current branch/SHA, modified files, exact check results, failures, blockers, and one concrete next action.

## Bugs and evidence

For each material defect, record user-visible symptom, reproduction, root cause, changed files, fix, regression coverage, verification result, and remaining risk in `docs/bug-fixes.md`. Separate observed facts from inference and assumptions; cite source/version or command output for data and operational claims. Record unresolved gaps in `docs/known-issues.md`.
