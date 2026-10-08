const GTFS_STOPS_URL = '/data/gtt-stops.json';

export function normalizeWheelchair(value) {
  if (value === 'yes') return 'yes';
  if (value === 'no') return 'no';

  return 'unknown';
}

export function normalizeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    // The published feed contains legacy HTTP links; upgrade only known GTT.
    if (url.protocol === 'http:' && url.hostname === 'www.gtt.to.it') url.protocol = 'https:';
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function isGtfsDatasetStale(metadata, now = Date.now(), maxAgeMs = 30 * 86400000) {
  const freshnessTimestamp = metadata?.feedVersionDate || metadata?.sourceUpdatedAt || metadata?.generatedAt;
  const freshnessMs = Date.parse(freshnessTimestamp ?? '');
  return !Number.isFinite(freshnessMs) || now - freshnessMs > maxAgeMs;
}

export function normalizeGtfsGeoJson(geojson) {
  if (!geojson || typeof geojson !== 'object' || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('gtt-stops.json non è una FeatureCollection GeoJSON valida.');
  }
  const metadata = geojson.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('gtt-stops.json non contiene metadata validi.');
  }
  if (typeof metadata.generatedAt !== 'string' || !Number.isFinite(Date.parse(metadata.generatedAt))) {
    throw new Error('La data di elaborazione GTFS non è valida.');
  }
  if (!Number.isInteger(metadata.totalStops) || metadata.totalStops !== geojson.features.length) {
    throw new Error('Conteggio metadata.totalStops incoerente con il dataset.');
  }
  if (typeof metadata.source !== 'string' || !metadata.source.trim()) throw new Error('Fonte metadata GTFS non valida.');
  if (metadata.sourceUpdatedAt != null && !Number.isFinite(Date.parse(metadata.sourceUpdatedAt))) {
    throw new Error('La data di aggiornamento della fonte GTFS non è valida.');
  }
  for (const key of ['feedVersionDate', 'feedStartDate', 'feedEndDate']) {
    if (metadata[key] != null) {
      const parsedDate = new Date(`${metadata[key]}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata[key]) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== metadata[key]) {
        throw new Error(`La data ${key} del feed GTFS non è valida.`);
      }
    }
  }

  const stops = [];
  const ids = new Set();
  let invalidFeatures = 0;

  for (let index = 0; index < geojson.features.length; index += 1) {
    const feature = geojson.features[index];
    if (!feature || typeof feature !== 'object' || !feature.geometry || !Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length < 2) {
      invalidFeatures += 1;
      continue;
    }
    const [rawLon, rawLat] = feature.geometry.coordinates;
    const lon = Number(rawLon);
    const lat = Number(rawLat);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      invalidFeatures += 1;
      continue;
    }
    const properties = feature.properties && typeof feature.properties === 'object' ? feature.properties : {};
    const id = feature.id || properties.stopId || `gtfs-${index}`;
    if (ids.has(id)) throw new Error(`gtt-stops.json contiene un identificatore duplicato: ${id}`);
    ids.add(id);
    stops.push({
      id,
      lat,
      lon,
      properties: {
        type: 'gtfs_stop',
        stopId: properties.stopId ?? null,
        stopCode: properties.stopCode ?? null,
        locationType: properties.locationType ?? null,
        name: properties.name || 'Fermata GTT',
        description: properties.description || '',
        url: normalizeExternalUrl(properties.url),
        wheelchair: normalizeWheelchair(properties.wheelchair),
        wheelchairBoardingRaw: properties.wheelchairBoardingRaw ?? null,
        source: properties.source || 'GTT/5T',
        sourceUrl: normalizeExternalUrl(properties.sourceUrl),
      },
    });
  }
  if (stops.length === 0) throw new Error('gtt-stops.json è valido ma non contiene fermate utilizzabili.');
  return { stops, metadata, invalidFeatures };
}

export async function parseGtfsStops({ fetchImpl = fetch, url = GTFS_STOPS_URL } = {}) {
  if (import.meta.env?.DEV) {
    console.info(
      `[Torino Accessibile] Caricamento fermate GTT: ${url}`
    );
  }

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `GTFS JSON HTTP ${response.status} (${response.statusText})`
    );
  }

  let geojson;
  try {
    geojson = await response.json();
  } catch {
    throw new Error(
      'Il file gtt-stops.json non contiene JSON valido.'
    );
  }

  const { stops, metadata, invalidFeatures } = normalizeGtfsGeoJson(geojson);

  if (import.meta.env.DEV) {
    console.info(
      `[Torino Accessibile] Fermate GTT caricate: ${stops.length}`
    );

    console.info(
      `[Torino Accessibile] Feature GeoJSON totali: ${geojson.features.length}`
    );

    if (invalidFeatures > 0) {
      console.warn(
        `[Torino Accessibile] Feature GTFS scartate: ${invalidFeatures}`
      );
    }
  }

  return { stops, metadata };
}
