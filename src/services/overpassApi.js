// Overpass instances can temporarily time out or return gateway errors. Keep a
// second community instance available so a transient outage does not hide all
// OSM accessibility data from the map.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const MAX_BBOX_WIDTH = 0.75;
const MAX_BBOX_HEIGHT = 0.75;
const MAX_BBOX_AREA = 0.35;

export function validateOverpassBbox(bbox) {
  const values = String(bbox).split(',').map(Number);
  if (values.length !== 4 || values.some((number) => !Number.isFinite(number))) {
    throw new Error('BBox non valida. Formato richiesto: minLon,minLat,maxLon,maxLat.');
  }
  const [minLon, minLat, maxLon, maxLat] = values;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon >= maxLon || minLat >= maxLat) {
    throw new Error('BBox non valida: coordinate fuori intervallo, invertite o area nulla.');
  }
  if (maxLon - minLon > MAX_BBOX_WIDTH || maxLat - minLat > MAX_BBOX_HEIGHT || (maxLon - minLon) * (maxLat - minLat) > MAX_BBOX_AREA) {
    throw new Error('Area troppo ampia per la richiesta OSM. Ingrandisci la zona che ti interessa e riprova.');
  }
  return [minLon, minLat, maxLon, maxLat];
}

function getElementCoordinates(element) {
  if (
    element.type === 'node' &&
    Number.isFinite(element.lat) &&
    Number.isFinite(element.lon)
  ) {
    return {
      lat: element.lat,
      lon: element.lon,
    };
  }

  if (
    element.center &&
    Number.isFinite(element.center.lat) &&
    Number.isFinite(element.center.lon)
  ) {
    return {
      lat: element.center.lat,
      lon: element.center.lon,
    };
  }

  return null;
}

function getWheelchairStatus(tags) {
  const value = tags?.wheelchair;

  if (value === 'yes') return 'yes';
  if (value === 'limited') return 'limited';
  if (value === 'no') return 'no';

  return 'unknown';
}

function getTactileStatus(tags) {
  const value = tags?.tactile_paving;

  if (value === 'yes') return 'yes';
  if (value === 'no') return 'no';
  if (value === 'contrasted') return 'contrasted';

  return 'unknown';
}

function getFeatureType(tags) {
  if (tags?.public_transport === 'platform') {
    return 'public-transport-platform';
  }

  if (tags?.public_transport === 'stop_position') {
    return 'public-transport-stop';
  }

  if (tags?.highway === 'crossing') {
    return 'tactile-crossing';
  }

  if (tags?.highway === 'traffic_signals') {
    return 'traffic-signal';
  }

  if (tags?.wheelchair) {
    return 'accessible-poi';
  }

  return 'accessibility-feature';
}

function buildNote(tags) {
  const notes = [];

  if (tags?.wheelchair) {
    notes.push(`Sedia a rotelle: ${tags.wheelchair}`);
  }

  if (tags?.tactile_paving) {
    notes.push(`Pavimentazione tattile: ${tags.tactile_paving}`);
  }

  if (tags?.kerb) {
    notes.push(`Cordolo: ${tags.kerb}`);
  }

  if (tags?.crossing) {
    notes.push(`Attraversamento: ${tags.crossing}`);
  }

  if (tags?.traffic_signals) {
    notes.push(`Semaforo: ${tags.traffic_signals}`);
  }

  return notes.length > 0 ? notes.join(' • ') : null;
}

export async function fetchOverpassAccessibility(bbox, { signal, fetchImpl = fetch, timeoutMs = 15_000, endpoints = OVERPASS_ENDPOINTS } = {}) {
  const [minLon, minLat, maxLon, maxLat] = validateOverpassBbox(bbox);

  const query = `
[out:json][timeout:20];

(
  nwr["wheelchair"~"^(yes|limited|no)$"](${minLat},${minLon},${maxLat},${maxLon});

  nwr[
    "highway"="crossing"
  ][
    "tactile_paving"
  ](${minLat},${minLon},${maxLat},${maxLon});
);

out center tags;
`;

  let data;
  let lastError;

  for (const endpoint of endpoints) {
    if (signal?.aborted) throw new DOMException('Richiesta annullata', 'AbortError');
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({ data: query }),
      });

      if (!response.ok) {
        const error = new Error(`Overpass HTTP ${response.status}`);
        // Retry transient server/gateway errors on the backup instance.
        if ([502, 503, 504].includes(response.status)) {
          lastError = error;
          continue;
        }
        throw error;
      }

      data = await response.json();
      lastError = null;
      break;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error.name === 'AbortError') {
        lastError = timedOut
          ? new Error('Overpass API: richiesta scaduta')
          : error;
        if (!timedOut) throw error;
      } else if (error instanceof TypeError) {
        // Fetch uses TypeError for network/CORS failures; try the other host.
        lastError = new Error('Overpass API non raggiungibile');
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  if (!data) {
    throw lastError ?? new Error('Overpass API non disponibile');
  }

  const features = [];

  for (const element of data.elements ?? []) {
    const coordinates = getElementCoordinates(element);

    if (!coordinates) {
      continue;
    }

    const tags = element.tags ?? {};

    const type = getFeatureType(tags);

    features.push({
      id: `osm-${element.type}-${element.id}`,

      lat: coordinates.lat,
      lon: coordinates.lon,

      properties: {
        type,

        name:
          tags.name ||
          tags.ref ||
          'Elemento senza nome',

        wheelchair:
          getWheelchairStatus(tags),

        tactilePaving:
          getTactileStatus(tags),

        kerb:
          tags.kerb ?? null,

        crossing:
          tags.crossing ?? null,

        highway:
          tags.highway ?? null,

        amenity:
          tags.amenity ?? null,

        shop:
          tags.shop ?? null,

        tourism:
          tags.tourism ?? null,

        publicTransport:
          tags.public_transport ?? null,

        note:
          buildNote(tags),

        source: 'OpenStreetMap',

        osmType: element.type,

        osmId: element.id,

        sourceUrl:
          `https://www.openstreetmap.org/${element.type}/${element.id}`,
      },
    });
  }

  return features;
}
