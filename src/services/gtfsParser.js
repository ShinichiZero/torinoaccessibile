const GTFS_STOPS_URL = '/data/gtt-stops.json';

function isFiniteCoordinate(value) {
  return Number.isFinite(value);
}

function normalizeWheelchair(value) {
  if (value === 'yes') return 'yes';
  if (value === 'no') return 'no';

  return 'unknown';
}

export async function parseGtfsStops() {
  if (import.meta.env.DEV) {
    console.info(
      `[Torino Accessibile] Caricamento fermate GTT: ${GTFS_STOPS_URL}`
    );
  }

  const response = await fetch(GTFS_STOPS_URL, {
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

  if (
    !geojson ||
    typeof geojson !== 'object' ||
    !Array.isArray(geojson.features)
  ) {
    throw new Error(
      'gtt-stops.json non è una FeatureCollection GeoJSON valida.'
    );
  }

  const stops = [];
  let invalidFeatures = 0;

  for (let index = 0; index < geojson.features.length; index += 1) {
    const feature = geojson.features[index];

    if (
      !feature ||
      typeof feature !== 'object' ||
      !feature.geometry ||
      !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length < 2
    ) {
      invalidFeatures += 1;
      continue;
    }

    const [rawLon, rawLat] = feature.geometry.coordinates;

    const lon = Number(rawLon);
    const lat = Number(rawLat);

    if (
      !isFiniteCoordinate(lat) ||
      !isFiniteCoordinate(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      invalidFeatures += 1;
      continue;
    }

    const properties =
      feature.properties &&
      typeof feature.properties === 'object'
        ? feature.properties
        : {};

    const wheelchair = normalizeWheelchair(
      properties.wheelchair
    );

    stops.push({
      id:
        feature.id ||
        properties.stopId ||
        `gtfs-${index}`,

      lat,
      lon,

      properties: {
        type: 'gtfs_stop',

        stopId:
          properties.stopId ??
          null,

        stopCode:
          properties.stopCode ??
          null,

        name:
          properties.name ||
          'Fermata GTT',

        description:
          properties.description ||
          '',

        url:
          properties.url ||
          null,

        wheelchair,

        wheelchairBoardingRaw:
          properties.wheelchairBoardingRaw ??
          null,

        source:
          properties.source ||
          'GTT/5T',

        sourceUrl:
          properties.sourceUrl ||
          null,
      },
    });
  }

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

  if (stops.length === 0) {
    throw new Error(
      'gtt-stops.json è valido ma non contiene fermate utilizzabili.'
    );
  }

  return stops;
}