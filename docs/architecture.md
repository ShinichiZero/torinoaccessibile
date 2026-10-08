# Architecture

The Vite/React client loads `public/data/gtt-stops.json` through `src/services/gtfsParser.js`. The parser validates FeatureCollection shape, metadata, IDs, coordinates, and wheelchair values before `MapView` presents the records. `StopSearch` uses `src/services/stopSearch.js` to normalize accents, case, and whitespace and filter the same loaded stop collection used by the map.

The Leaflet map uses clustering above 500 features and renders GTFS stops from the current viewport. Choosing a list result synchronizes map position and popup selection. OSM is fetched only after a user action through `src/services/overpassApi.js`; the service validates bounds, limits request area, times out, respects cancellation, and retries configured alternate endpoints for transient gateway failures. OSM state and source labels remain independent from GTFS state.

The generator pipeline is `scripts/download-gtfs.mjs` followed by `scripts/generate-stops-json.mjs`. It validates the archive/input, parses CSV records, builds and validates GeoJSON, then atomically replaces the published artifact. Failed generation leaves the existing output intact. CI runs lint, unit tests, Chromium browser tests, and build. The scheduled refresh creates a data-only review PR; it must not deploy data directly to production.
