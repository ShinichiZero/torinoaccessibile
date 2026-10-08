# Data sources and interpretation

## GTFS

The published artifact identifies its source as “GTT GTFS statico (aperTO)” and links the source dataset at `https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt`. The source was downloaded from the official aperTO CKAN resource `https://www.gtt.to.it/open_data/gtt_gtfs.zip`. Its `feed_info.txt` declares version `20261007` and coverage 2026-10-06 through 2027-01-31. The current artifact has `generatedAt: 2026-10-08T10:19:46.657Z`; CKAN resource metadata separately reports `sourceUpdatedAt: 2020-01-07T12:58:13.954411`. The app uses a valid date-shaped GTFS `feed_version` as its freshness date and displays generation date, feed version/coverage, and CKAN catalog timestamp separately. For non-date-shaped versions, it falls back to the catalog timestamp and then generation time.

Validation of the checked-in artifact: 7,054 Point features; 7,054 unique stop IDs; 3,797 `yes`, 5 `no`, 3,252 `unknown`; no other wheelchair values, missing stop IDs, invalid coordinates, or malformed geometries. Coordinate extent is longitude 7.14396–8.45961 and latitude 44.3852–45.53567, inside the map's configured bounds. Two features contain `locationType`; the rest do not.

`wheelchair_boarding` is presented as the GTFS field value with caveats. Unknown is not counted as inaccessible; a stop-level value does not verify vehicles, lifts, paths, sidewalks, or an end-to-end journey. The CKAN timestamp is old and appears stale relative to the feed's declared version; these are different source metadata fields and both are retained. A date-shaped `feed_version` is treated as a date only when it is a valid YYYYMMDD calendar date; this interpretation is specific to the observed GTT feed format.

## OpenStreetMap

OSM accessibility features are requested separately from Overpass only after the user presses the map action. The UI identifies OSM provenance and reports the requested bounding box and load time. OSM features must never be added to GTFS headline counts. OSM and external tile requests expose the visitor's IP address to those providers; privacy copy should describe these third-party requests precisely.
